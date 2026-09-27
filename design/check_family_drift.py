# -*- coding: utf-8 -*-
"""family.css 三段一致性只读巡检（S4 审查 M2-2 修复件，2026-09-27）。

对全仓 121 款（batch*/<game>/index.html）做 family.css 三段（reset/ghost/verify）
状态快照，输出 JSON 供「改段前后对账」。只读，不写仓库任何文件（快照 stdout 或 --out）。

三态口径（与 family.css 头注释、docs/decision-log.md 决策条目一致）：
  ① placeholder —— 薄壳款 head（_src/head.html 或 _src/game-head.html）内含
     <!--FAMILY_CSS:段名--> 占位符（family.css 该段改动会波及该款产物）；
  ② absent     —— 该款 head 无此占位符（跳段款：该款本无此公共段，family.css 改动不波及）；
  ③ inline-*   —— 自持构建款（11 款，非薄壳）：段在 index.html 内自持。
     inline-identical=与 family.css 段原文逐字节一致（LF/CRLF 两态任一）；
     inline-variant=异形段（同功能不同形，如 color 的 #verify-result 单行简版），
     记录指纹 md5 = 探针首命中处起 len(族段)+256 字符窗口（仅作漂移对账，非语义提取）。

探针：reset='*{margin:0'  ghost='#ghost'  verify='#verify-result'。
用法：
  python design/check_family_drift.py                # 人读摘要 + 全量 JSON 到 stdout
  python design/check_family_drift.py --out a.json   # JSON 落盘（摘要仍打 stdout）
  python design/check_family_drift.py --baseline design/family-drift-baseline.json
      # 与基线对账：family 段 md5 / 各款分类 / 段态 / 自持异形指纹 / index.html md5
      # 任一漂移即 DIFF FAIL（rc=1）；对账模式不打全量 JSON。
判定纪律（decision-log 口径）：改 family.css 段后预期=占位款(placeholder)受影响、
跳段款(absent)与自持款(inline-*)段态与指纹不变；本脚本不 rebuild、不改文件，
只回答「谁处于哪态、有没有人自己动了」。
"""
import argparse
import hashlib
import json
import pathlib
import re
import sys

REPO = pathlib.Path(__file__).resolve().parent.parent   # design/ 的上级 = 仓库根
FAMILY = pathlib.Path(__file__).resolve().parent / 'family.css'
SEG_RE = re.compile(r'/\*==SEG:([A-Za-z0-9_-]+)==\*/\n(.*?)\n/\*==SEG-END==\*/\n', re.S)
MARKER = '<!--FAMILY_CSS:%s-->'

# 自持构建款 11 款（决策见 docs/decision-log.md；改动此名单须走决策条目）
EXPECTED_SELF = {
    'batch3/pinyin', 'batch2/color', 'batch2/tangram', 'batch3/math', 'batch3/pattern',
    'batch4/clock', 'batch4/sudoku', 'batch4/times', 'batch5/connect',
    'batch1/pipe-rabbit', 'batch1/shop-math',
}

# 段探针（自持款 inline 检测用；改段/加段时同步维护）
PROBES = {'reset': '*{margin:0', 'ghost': '#ghost', 'verify': '#verify-result'}

FILE_MAP = {'head': 'head.html', 'data': 'game-data.js', 'engine': 'game-core.js',
            'main': 'game-main.js', 'verify': 'game-verify.js'}


def md5_bytes(b):
    return hashlib.md5(b).hexdigest()


def read_text_safe(p):
    return p.read_text(encoding='utf-8', errors='replace')


def load_segments():
    text = FAMILY.read_text(encoding='utf-8')
    segs = {}
    for m in SEG_RE.finditer(text):
        segs[m.group(1)] = m.group(2)
    assert segs, 'family.css 解析出 0 段（格式损坏？）'
    return segs


def enum_games():
    """全仓 batch*/<game>/index.html 两层枚举（不进 _src/shots 等辅助目录）。"""
    games = []
    for b in sorted(REPO.glob('batch*')):
        if not b.is_dir():
            continue
        for g in sorted(b.iterdir()):
            if g.is_dir() and (g / 'index.html').is_file():
                games.append('%s/%s' % (b.name, g.name))
    return games


def classify(game_rel):
    """(kind, head_path|None)；kind: thin=薄壳（_src/build.py 用 build_lib） self=自持。"""
    bp = REPO / game_rel / '_src' / 'build.py'
    if bp.is_file() and 'build_lib' in read_text_safe(bp)[:4000]:
        head = None
        for cand in ('head.html', 'game-head.html'):
            p = REPO / game_rel / '_src' / cand
            if p.is_file():
                head = p
                break
        return 'thin', head
    return 'self', None


def snapshot():
    segs = load_segments()
    games = enum_games()
    out = {
        'tool': 'design/check_family_drift.py',
        'repo_root': str(REPO),
        'family_css_md5': md5_bytes(FAMILY.read_bytes()),
        'segments': {name: {'md5': md5_bytes(seg.encode('utf-8')), 'chars': len(seg)}
                     for name, seg in segs.items()},
        'probes': PROBES,
        'expected_self_count': len(EXPECTED_SELF),
        'games': {}, 'summary': {},
    }
    n_thin = n_self = 0
    seg_counts = {name: {'placeholder': 0, 'absent': 0, 'inline-identical': 0,
                         'inline-variant': 0, 'absent-self': 0} for name in segs}
    roster_mismatch = []
    for rel in games:
        kind, head = classify(rel)
        entry = {'class': kind, 'segments': {}}
        entry['index_md5'] = md5_bytes((REPO / rel / 'index.html').read_bytes())
        if kind == 'thin':
            n_thin += 1
            entry['head'] = head.name
            entry['head_md5'] = md5_bytes(head.read_bytes())
            htext = read_text_safe(head)
            for name in segs:
                marker = MARKER % name
                cnt = htext.count(marker)
                if cnt == 1:
                    entry['segments'][name] = {'state': 'placeholder'}
                    seg_counts[name]['placeholder'] += 1
                elif cnt == 0:
                    entry['segments'][name] = {'state': 'absent'}
                    seg_counts[name]['absent'] += 1
                else:
                    entry['segments'][name] = {'state': 'BAD-marker-count-%d' % cnt}
            if rel in EXPECTED_SELF:
                roster_mismatch.append('%s 实测薄壳但名单列自持' % rel)
        else:
            n_self += 1
            if rel not in EXPECTED_SELF:
                roster_mismatch.append('%s 实测自持但名单未列' % rel)
            itext = read_text_safe(REPO / rel / 'index.html')
            for name, seg in segs.items():
                probe = PROBES.get(name)
                if seg in itext or seg.replace('\n', '\r\n') in itext:
                    entry['segments'][name] = {'state': 'inline-identical'}
                    seg_counts[name]['inline-identical'] += 1
                elif probe and probe in itext:
                    i = itext.index(probe)
                    window = itext[i:i + len(seg) + 256]
                    entry['segments'][name] = {
                        'state': 'inline-variant',
                        'fingerprint_md5': md5_bytes(window.encode('utf-8')),
                        'window': len(window)}
                    seg_counts[name]['inline-variant'] += 1
                else:
                    entry['segments'][name] = {'state': 'absent-self'}
                    seg_counts[name]['absent-self'] += 1
        out['games'][rel] = entry
    bad_states = [g for g, e in out['games'].items()
                  for s in e['segments'].values() if str(s['state']).startswith('BAD')]
    out['summary'] = {
        'total': len(games), 'thin': n_thin, 'self': n_self,
        'per_segment': seg_counts,
        'bad_marker_counts': bad_states,
        'roster_mismatch': roster_mismatch,
    }
    return out


def diff_baseline(snap, base_path):
    base = json.loads(pathlib.Path(base_path).read_text(encoding='utf-8'))
    problems = []
    if base.get('family_css_md5') != snap['family_css_md5']:
        # family.css 段字节变更是「有意变更」，本工具不判对错，只列明并核对段态联动
        problems.append('NOTE family.css md5 变化: %s -> %s（若为有意改段，预期仅 placeholder 款 index_md5 变）'
                        % (base.get('family_css_md5'), snap['family_css_md5']))
        for name, info in base.get('segments', {}).items():
            now = snap['segments'].get(name, {}).get('md5')
            if info.get('md5') != now:
                problems.append('NOTE 段 %s md5: %s -> %s' % (name, info.get('md5'), now))
    gset = set(base['games']) | set(snap['games'])
    for g in sorted(gset):
        b, s = base['games'].get(g), snap['games'].get(g)
        if b is None or s is None:
            problems.append('DIFF %s 款增减: base=%s now=%s' % (g, bool(b), bool(s)))
            continue
        if b['class'] != s['class']:
            problems.append('DIFF %s class: %s -> %s' % (g, b['class'], s['class']))
            continue
        if b['class'] == 'thin':
            if b.get('head_md5') != s.get('head_md5'):
                problems.append('DIFF %s head_md5: %s -> %s（占位符状态须复核）'
                                % (g, b.get('head_md5'), s.get('head_md5')))
        for name in base['segments']:
            bs, ss = b['segments'].get(name, {}), s['segments'].get(name, {})
            if bs.get('state') != ss.get('state'):
                problems.append('DIFF %s 段 %s state: %s -> %s'
                                % (g, name, bs.get('state'), ss.get('state')))
            elif bs.get('state') == 'inline-variant' and \
                    bs.get('fingerprint_md5') != ss.get('fingerprint_md5'):
                problems.append('DIFF %s 段 %s 自持异形指纹漂移: %s -> %s（自持款段被改动，须走款级 rebuild+对拍）'
                                % (g, name, bs.get('fingerprint_md5'), ss.get('fingerprint_md5')))
        if b.get('index_md5') != s.get('index_md5'):
            tag = '（无段变更时=意外漂移；有意改段时=预期内受影响款）' \
                  if any(v['state'] == 'placeholder' for v in s['segments'].values()) else '（该款无占位段，产物不应漂移）'
            problems.append('DIFF %s index_md5: %s -> %s%s'
                            % (g, b.get('index_md5'), s.get('index_md5'), tag))
    return problems


def main():
    ap = argparse.ArgumentParser(description='family.css 三段一致性只读巡检')
    ap.add_argument('--out', help='快照 JSON 落盘路径')
    ap.add_argument('--baseline', help='与既有快照对账（漂移即 rc=1）')
    ap.add_argument('--quiet', action='store_true', help='只打摘要，不打全量 JSON')
    args = ap.parse_args()

    snap = snapshot()
    s = snap['summary']
    print('== family.css 三态巡检：total %d = thin %d + self %d ==' % (s['total'], s['thin'], s['self']))
    for name, c in s['per_segment'].items():
        print('段 %-6s placeholder %3d | absent(跳段) %3d | inline-identical %d | inline-variant %d | absent-self %d'
              % (name, c['placeholder'], c['absent'], c['inline-identical'],
                 c['inline-variant'], c['absent-self']))
    if s['roster_mismatch'] or s['bad_marker_counts']:
        print('!! 名单/占位异常: %s' % (s['roster_mismatch'] + s['bad_marker_counts']))
    else:
        print('roster 自洽：thin/self 与 11 款自持名单一致；占位符均 count==1')

    if args.baseline:
        problems = diff_baseline(snap, args.baseline)
        hard = [p for p in problems if not p.startswith('NOTE')]
        for p in problems:
            print(p)
        print('BASELINE %s（硬差异 %d 条）' % ('PASS' if not hard else 'FAIL', len(hard)))
        if args.out:
            pathlib.Path(args.out).write_text(json.dumps(snap, ensure_ascii=False, indent=1),
                                              encoding='utf-8')
        sys.exit(1 if hard or s['roster_mismatch'] else 0)

    payload = json.dumps(snap, ensure_ascii=False, indent=1)
    if args.out:
        pathlib.Path(args.out).write_text(payload, encoding='utf-8')
        print('snapshot -> %s（%d bytes）' % (args.out, len(payload.encode("utf-8"))))
    elif not args.quiet:
        print(payload)
    sys.exit(1 if (s['roster_mismatch'] or s['bad_marker_counts']) else 0)


if __name__ == '__main__':
    main()
