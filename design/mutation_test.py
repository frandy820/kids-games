# -*- coding: utf-8 -*-
"""款级断言表 mutation test（S4 审查 M3 修复件，2026-09-27）。

目的：断言表搬移/前移只保护产物字节，不保护断言检测力（S 键引用错/正则抄错=恒真）。
本脚本对指定款注入一个「断言明令禁止的字面」到源文件，验证 build.py 必 exit 非零
且报错指向该断言（traceback 回显断言行含注入字面），随后还原源文件并 md5 复核。

机制（三形态自动挑选，优先级 not-in 直书 > not-in 循环体 > count==N）：
  A. assert '<lit>' not in <var>            → 把 <lit> 追加到 var 对应源文件尾
  B. for name, s in [('data', data), ...]:  → 循环体 assert '<lit>' not in s，
     取首元组 var 对应文件注入
  C. for bad in ('lit', ...): assert bad not in <var>  → 取元组首字面注入 var 文件
  D. assert <var>.count('<lit>') == N       → 追加一份 <lit>（count 变 N+1 必不等）
var→文件：head→head.html(或 game-head.html) / data→game-data.js / engine→game-core.js
         / main→game-main.js / verify→game-verify.js。
跳过：clips 类断言（非文件产物，禁注入）；与 build_lib 库级检查重叠的字面
（</script、http:// 等——会被 hard_checks_pre 先拦，报错不指向款级断言）。

安全纪律：字节级备份（read_bytes）+改+跑+还原+md5 复核还原完整；构建失败必须
发生在 write_out 之前（pre_assemble 在写盘前）——另核 index.html md5 前后不变；
任一环节不符即该款 FAIL。全流程只动被测款源文件一字节组，结束即还原。

用法：
  python design/mutation_test.py                      # 默认 18 款（S4 修复批口径）
  python design/mutation_test.py --game batch26/calendar --game batch40/ins ...
  python design/mutation_test.py --out detail.json    # 明细落盘（仓库外）
退出码：全部 PASS=0，任一 FAIL/ERROR=1。
"""
import argparse
import hashlib
import json
import pathlib
import re
import subprocess
import sys

REPO = pathlib.Path(__file__).resolve().parent.parent

# S4 修复批默认 18 款：8 前移改写款（审查 M3 点名）+ 10 款补覆盖 b1-b11 各批
DEFAULT_GAMES = [
    # 8 前移改写款（断言前移=语义改写风险最高）
    'batch26/calendar', 'batch26/season', 'batch26/sign', 'batch27/coin',
    'batch27/notebird', 'batch40/ins', 'batch30/babylove', 'batch33/soundcount',
    # 补至 18 款，覆盖 b1-b11 各批与三种断言形态
    'batch2/memory', 'batch12/fraction', 'batch25/habitat', 'batch11/shadow',
    'batch17/area', 'batch22/hidden', 'batch31/chartread', 'batch28/shapecount',
    'batch38/libr', 'batch39/etm',
]

FILE_MAP = {'head': None, 'data': 'game-data.js', 'engine': 'game-core.js',
            'main': 'game-main.js', 'verify': 'game-verify.js', 'verif': 'game-verify.js'}
# 与 build_lib 库级检查重叠的字面（注入会被 lib 先拦，报错不指向款级断言表）
LIB_LEVEL = ('</script', '</style', 'http://', 'https://', '<link', ' src=', ' href=')

RE_DIRECT = re.compile(
    r"assert\s+(['\"])((?:\\.|(?!\1).)+?)\1\s+not\s+in\s+"
    r"(head|data|engine|main|verif|verify)\b")
RE_TUPLE_LOOP = re.compile(
    r"for\s+\w+\s*,\s*s\s+in\s*\[\s*\(\s*'([a-z]+)'\s*,\s*[a-z_]+\s*\)")
RE_LOOP_ASSERT = re.compile(
    r"assert\s+(['\"])((?:\\.|(?!\1).)+?)\1\s+not\s+in\s+s\b")
RE_VAR_LOOP = re.compile(
    r"for\s+(\w+)\s+in\s*\(\s*(['\"])((?:\\.|(?!\2).)+?)\2")
RE_COUNT = re.compile(
    r"assert\s+(head|data|engine|main|verif|verify)\.count\(\s*"
    r"(['\"])((?:\\.|(?!\2).)+?)\2\s*\)\s*==\s*(\d+)")


def _unquote(lit):
    """断言里的 Python 字面还原为注入用文本（仅处理 \\n \\\\ 等常见转义）。"""
    try:
        return bytes(lit, 'utf-8').decode('unicode_escape').encode('latin-1', 'ignore').decode('utf-8', 'ignore') \
            if '\\' in lit else lit
    except Exception:
        return lit


def _usable(lit, target_bytes):
    """not-in 形态候选可用性：长度≥2（汉字 2 字禁串有效）、非库级字面、当前不在文件内。"""
    if not lit or len(lit) < 2:
        return False
    if any(bad in lit for bad in LIB_LEVEL):
        return False
    return lit.encode('utf-8') not in target_bytes   # 已在文件内=注入无效


def _usable_count(lit, target_bytes, n):
    """count==N 形态候选可用性：字面本应在文件内恰 N 次（注入 1 份变 N+1 必不等）。"""
    if not lit or any(bad in lit for bad in LIB_LEVEL):
        return False
    return target_bytes.count(lit.encode('utf-8')) == n


def _head_file(src):
    for cand in ('head.html', 'game-head.html'):
        if (src / cand).is_file():
            return src / cand
    return None


def _target_file(src_dir, var):
    if var == 'head':
        return _head_file(src_dir)
    name = FILE_MAP.get(var)
    return src_dir / name if name else None


def pick_mutation(build_py_text, src_dir):
    """返回 (form, var, file, literal, line_hint) 或 None。"""
    lines = build_py_text.splitlines()
    # A. 直书 not in
    for m in RE_DIRECT.finditer(build_py_text):
        lit = _unquote(m.group(2))
        f = _target_file(src_dir, m.group(3))
        if f and _usable(lit, f.read_bytes()):
            ln = build_py_text[:m.start()].count('\n') + 1
            return 'not-in', m.group(3), f, lit, ln
    # B. 元组循环 for name, s in [('data', data),...]: assert .. not in s
    for m in RE_TUPLE_LOOP.finditer(build_py_text):
        var = m.group(1)
        f = _target_file(src_dir, var)
        if not f:
            continue
        tail = build_py_text[m.end():m.end() + 700]
        ma = RE_LOOP_ASSERT.search(tail)
        if ma:
            lit = _unquote(ma.group(2))
            if _usable(lit, f.read_bytes()):
                ln = build_py_text[:m.end()].count('\n') + tail[:ma.start()].count('\n') + 1
                return 'not-in-loop', var, f, lit, ln
    # C. 变量循环 for bad in ('lit',...): assert bad not in var
    for m in RE_VAR_LOOP.finditer(build_py_text):
        v, lit = m.group(1), _unquote(m.group(3))
        tail = build_py_text[m.end():m.end() + 700]
        ma = re.search(r"assert\s+%s\s+not\s+in\s+(head|data|engine|main|verif|verify)\b"
                       % re.escape(v), tail)
        if ma:
            f = _target_file(src_dir, ma.group(1))
            if f and _usable(lit, f.read_bytes()):
                ln = build_py_text[:m.end()].count('\n') + tail[:ma.start()].count('\n') + 1
                return 'not-in-varloop', ma.group(1), f, lit, ln
    # D. count == N（追加一份使计数漂移）
    for m in RE_COUNT.finditer(build_py_text):
        lit = _unquote(m.group(3))
        f = _target_file(src_dir, m.group(1))
        if f and _usable_count(lit, f.read_bytes(), int(m.group(4))):
            ln = build_py_text[:m.start()].count('\n') + 1
            return 'count-eq', m.group(1), f, lit, ln
    return None


def run_one(game_rel, timeout):
    src_dir = REPO / game_rel / '_src'
    build_py = src_dir / 'build.py'
    rec = {'game': game_rel}
    if not build_py.is_file():
        rec.update(ok=False, stage='locate', err='no _src/build.py')
        return rec
    text = build_py.read_text(encoding='utf-8')
    pick = pick_mutation(text, src_dir)
    if not pick:
        rec.update(ok=False, stage='pick', err='无可注入的款级禁字面（断言表无文件级 not-in/count 断言）')
        return rec
    form, var, target, lit, ln = pick
    prod = REPO / game_rel / 'index.html'
    rec.update(form=form, var=var, file=target.name, literal=lit,
               assert_line=ln, target=str(target.relative_to(REPO)))
    backup = target.read_bytes()
    prod_before = prod.read_bytes()
    rec['src_md5_before'] = hashlib.md5(backup).hexdigest()
    rec['index_md5_before'] = hashlib.md5(prod_before).hexdigest()
    try:
        # 注入（字节级追加，行尾零扰动）
        target.write_bytes(backup + b'\n' + lit.encode('utf-8'))
        try:
            cp = subprocess.run([sys.executable, str(build_py)], capture_output=True,
                                timeout=timeout, cwd=str(src_dir))
            out = (cp.stdout.decode('utf-8', 'replace') + cp.stderr.decode('utf-8', 'replace'))
            rec.update(rc=cp.returncode, output_tail=out[-1500:])
            rec['fail_nonzero'] = cp.returncode != 0
            rec['assertion_fired'] = ('AssertionError' in out) or ('FATAL' in out) or ('Traceback' in out)
            rec['points_to_literal'] = lit in out
            rec['index_untouched'] = prod.read_bytes() == prod_before
            rec['ok'] = bool(rec['fail_nonzero'] and rec['assertion_fired']
                             and rec['points_to_literal'] and rec['index_untouched'])
        finally:
            target.write_bytes(backup)
    except subprocess.TimeoutExpired:
        rec.update(ok=False, stage='build', err='timeout %ss' % timeout)
        target.write_bytes(backup)
    restored = hashlib.md5(target.read_bytes()).hexdigest()
    rec['src_restored_md5'] = restored
    rec['restore_verified'] = restored == rec['src_md5_before']
    rec['ok'] = bool(rec.get('ok')) and rec['restore_verified']
    return rec


def main():
    ap = argparse.ArgumentParser(description='款级断言表 mutation test')
    ap.add_argument('--game', action='append', help='batchN/xxx（可多次；缺省=默认 18 款）')
    ap.add_argument('--out', help='明细 JSON 落盘路径（建议仓库外）')
    ap.add_argument('--timeout', type=int, default=300, help='单款构建超时秒（默认 300）')
    args = ap.parse_args()
    games = args.game or DEFAULT_GAMES

    results = []
    for g in games:
        rec = run_one(g, args.timeout)
        results.append(rec)
        flag = 'PASS' if rec.get('ok') else 'FAIL'
        print('[%s] %-22s form=%-13s var=%-6s lit=%r -> rc=%s 点名=%s 还原=%s'
              % (flag, g, rec.get('form', '-'), rec.get('var', '-'),
                 rec.get('literal', rec.get('err', ''))[:40], rec.get('rc', '-'),
                 rec.get('points_to_literal', '-'), rec.get('restore_verified', '-')))
    n_ok = sum(1 for r in results if r.get('ok'))
    print('MUTATION %s：%d/%d' % ('PASS' if n_ok == len(results) else 'FAIL', n_ok, len(results)))
    if args.out:
        pathlib.Path(args.out).write_text(json.dumps(results, ensure_ascii=False, indent=1),
                                          encoding='utf-8')
        print('detail -> %s' % args.out)
    sys.exit(0 if n_ok == len(results) else 1)


if __name__ == '__main__':
    main()
