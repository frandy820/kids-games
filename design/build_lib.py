# -*- coding: utf-8 -*-
"""kids-games 共享构建库（引擎抽取 S4 阶段1）
从各款 _src/build.py 提炼的共同骨架：
  读五件套（head + game-data/game-core/game-main/game-verify + design/core.js）
  + 语音 clips 注入（voice/inject_clips.py）
  + 三硬检查（禁字面 </script> / core 契约版 / 完全离线 + script 块数）
  + 4 块（verify 独立）或 3 块（verify 并入）拼接
  + 幂等写出 index.html（utf-8，write_text 同旧脚本语义，保证产物逐字节等价）。
款级差异全部参数化：head 文件名 / clips 游戏名与兜底 / verify 分块 / 款级断言回调。
路径一律相对仓库根解析（__file__ 向上定位），禁绝对路径——跨机/换目录可跑。

薄壳用法（款级 build.py 全文即此样板）：
    import pathlib, sys
    sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[3]))  # 仓库根
    from design import build_lib

    ROOT = pathlib.Path(__file__).resolve().parent  # _src/

    def _asserts(S):
        head, data, main, verif, clips = S['head'], S['data'], S['main'], S['verify'], S['clips']
        ...  # 款级断言表（原文搬移，变量绑定后零改动）

    build_lib.build(ROOT, game='xxx', pre_assemble=_asserts)
"""
import pathlib
import sys

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent   # design/ 的上级 = 仓库根
CORE_JS_PATH = REPO_ROOT / 'design' / 'core.js'
VOICE_DIR = REPO_ROOT / 'voice'

# 完全离线白名单：SVG xmlns 命名空间标识符是唯一允许的 http 字面
_OFFLINE_ALLOW = ('http://www.w3.org/2000/svg',)
_OFFLINE_BAD = ('http://', 'https://', '<link', ' src=', ' href=')


def _reconfigure_stdout():
    """Windows GBK 控制台下中文 print 防炸（幂等，可重复调用）"""
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass


def load_sources(src_dir, *, head_name='head.html'):
    """读款级源文件 → dict(head, core, data, engine, main, verify)。
    src_dir = 款级 _src/ 目录；core 恒为仓库 design/core.js 全文原样（禁手抄改写）。"""
    src_dir = pathlib.Path(src_dir)
    return {
        'head': (src_dir / head_name).read_text(encoding='utf-8'),
        'core': CORE_JS_PATH.read_text(encoding='utf-8'),
        'data': (src_dir / 'game-data.js').read_text(encoding='utf-8'),
        'engine': (src_dir / 'game-core.js').read_text(encoding='utf-8'),
        'main': (src_dir / 'game-main.js').read_text(encoding='utf-8'),
        'verify': (src_dir / 'game-verify.js').read_text(encoding='utf-8'),
    }


def load_clips(game):
    """语音 clips 注入：voice/inject_clips.py clips_js(game)。
    注入失败禁静默降级（缺 clip=残缺交付），exit(3) 暴露——与旧款级脚本同语义。"""
    sys.path.insert(0, str(VOICE_DIR))
    try:
        from inject_clips import clips_js
        return clips_js(game)
    except (Exception, SystemExit) as e:
        print('CLIPS-INJECT-FAIL:', repr(e)[:200])
        sys.exit(3)


def clips_core_fallback(clips, core_keys=('core_chapter_end', 'core_day_end', 'core_rest')):
    """core 共享 3 条兜底注入（maze 范式）：manifest games 未含本款时按 key 显式补
    （同源 voice/clips/*.mp3）；已含则原样返回。禁改 manifest——任务书红线。"""
    if all('"%s"' % k in clips for k in core_keys):
        return clips
    import base64
    parts = []
    for k in core_keys:
        p = VOICE_DIR / 'clips' / (k + '.mp3')
        if not p.exists() or p.stat().st_size < 800:
            print('CLIPS-INJECT-FAIL: core clip %s' % k)
            sys.exit(3)
        b = base64.b64encode(p.read_bytes()).decode('ascii')
        assert '</script' not in b
        parts.append('"%s":"data:audio/mpeg;base64,%s"' % (k, b))
    return clips.replace('};/*CLIPS-END*/', ',' + ','.join(parts) + '};/*CLIPS-END*/')


def hard_checks_pre(S):
    """硬检查 1：各 JS 段禁字面 </script>（会提前闭合标签）。
    硬检查 2：core.js 必须是最新契约版（防旧版混入）。"""
    for name in ('core', 'data', 'engine', 'main', 'verify', 'clips'):
        assert '</script' not in S[name], '%s 含字面 </script>，需写 <\\/script>' % name
    assert 'settle()' in S['core'], 'core.js 非最新版（缺 session.settle）'
    assert 'queue(parts)' in S['core'], 'core.js 非最新版（缺 voice.queue）'


def assemble(S, *, verify_block='separate'):
    """拼接单文件。verify_block='separate' → 4 块（verify 独立第 4 块）；
    'merged' → 3 块（verify 并入第 3 块）。拼接模板与旧款级脚本逐字节一致。"""
    third = S['data'] + S['engine'] + S['main']
    if verify_block == 'merged':
        blocks = [S['core'], S['clips'], third + S['verify']]
    else:
        blocks = [S['core'], S['clips'], third, S['verify']]
    html = S['head'] + '\n'
    for b in blocks:
        html += '<script>\n' + b + '\n</script>\n'
    return html + '</body>\n</html>\n'


def hard_checks_post(html, *, n_scripts=4):
    """硬检查 3（拼接后实际产物）：script 块数开=闭=n + 完全离线。"""
    n_open, n_close = html.count('<script>'), html.count('</script>')
    assert n_open == n_scripts and n_close == n_scripts, \
        'script 块数异常: 开 %d / 闭 %d != %d' % (n_open, n_close, n_scripts)
    stripped = html
    for allow in _OFFLINE_ALLOW:
        stripped = stripped.replace(allow, 'NS-SVG')
    for bad in _OFFLINE_BAD:
        assert bad not in stripped, '发现外部引用: %s' % bad


def write_out(html, out_path):
    """幂等写出（utf-8）。与旧款级脚本 write_text 同参数=同 newline 语义，保证逐字节等价。"""
    out_path = pathlib.Path(out_path)
    out_path.write_text(html, encoding='utf-8')
    return out_path


def build(src_dir, *, game, head_name='head.html', verify_block='separate',
          clips_prep=None, pre_assemble=None, out_name='index.html'):
    """标准构建主流程。src_dir=款级 _src/ 目录，产物写 src_dir.parent/out_name。
    - game：clips 注入游戏名（manifest 对账键）
    - head_name：head 文件名（head.html / game-head.html 两态）
    - verify_block：'separate'=4 块 / 'merged'=3 块
    - clips_prep(S['clips']) -> clips：注入后、硬检查前的兜底加工（maze core 3 条范式）
    - pre_assemble(S)：款级断言表回调（S 含 head/core/data/engine/main/verify/clips 七键）
    返回 (html, out_path)。"""
    _reconfigure_stdout()
    S = load_sources(src_dir, head_name=head_name)
    S['clips'] = load_clips(game)
    if clips_prep is not None:
        S['clips'] = clips_prep(S['clips'])
    hard_checks_pre(S)
    if pre_assemble is not None:
        pre_assemble(S)
    html = assemble(S, verify_block=verify_block)
    hard_checks_post(html, n_scripts=4 if verify_block == 'separate' else 3)
    out = write_out(html, pathlib.Path(src_dir).parent / out_name)
    print('OK written:', out, len(html), 'chars')
    return html, out
