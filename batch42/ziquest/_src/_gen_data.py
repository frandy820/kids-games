# -*- coding: utf-8 -*-
"""ziquest 游戏数据生成器：_src/data/*.json（真值源）→ _src/game-data.js（零手抄转写）
用法: python batch42/ziquest/_src/_gen_data.py（build.py 每次构建先跑本脚本再深比较对账——坑13 铁律）
产出表: ZQ_MAP（地图130节点）/ ZQ_CATALOG（伙伴/BOSS/装扮+经济）/ ZQ_CHARS（区域字表 r1..r7）/
        ZQ_FN（虚词白名单）/ ZQ_STORY（剧情文案）/ ZQ_UIV（UI/BOSS 语音键账 36）/ ZQ_T（时序常量表）
0c 并行约定（2026-09-29）：教研代理正在给 chars-r*.json 加字段（words/glyph/parts 等）——
本脚本与 build 对账只依赖结构性字段（ch/src/order + meta），教研字段原样透传、完整性不断言（M2 的事）。
可选文件缺失容忍：sentences.json 尚不存在（M2），缺文件→不产出对应表（对账同步跳过）。
"""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
DATA = ROOT / 'data'


def _load(name):
    p = DATA / name
    if not p.exists():
        return None
    return json.loads(p.read_text(encoding='utf-8'))


def _js(obj):
    """json → JS 字面量（JSON 是 JS 子集；ensure_ascii=False 保中文原字）"""
    return json.dumps(obj, ensure_ascii=False, separators=(',', ':'))


def main():
    m = _load('map.json')
    cat = _load('catalog.json')
    fn = _load('chars-function.json')
    story = _load('story.json')
    uiv = _load('ui-voice.json')
    sents = _load('sentences.json')
    chars = {str(r): _load('chars-r%d.json' % r) for r in range(1, 8)}
    assert m and cat and fn and all(chars.values()), '核心真值源缺失: map/catalog/chars-function/chars-r1..7'

    # ---- 结构自检（只查 M1 依赖面：ch/src/order + 区域字段 + map 拓扑键） ----
    n_chars = 0
    for r, d in sorted(chars.items()):
        assert d['meta'].get('region') == int(r), 'chars-r%s meta.region 不一致' % r
        for c in d['chars']:
            assert set(c) >= {'ch', 'src', 'order'}, 'chars-r%s 缺结构性字段: %s' % (r, sorted(c))
        assert len({c['ch'] for c in d['chars']}) == len(d['chars']), 'chars-r%s ch 重复' % r
        n_chars += len(d['chars'])
    keys, n_nodes = set(), 0
    for rg in m['regions']:
        for nd in rg['nodes']:
            assert nd['key'] not in keys, 'map 节点 key 重复: %s' % nd['key']
            keys.add(nd['key'])
            assert set(nd) >= {'key', 'region', 'type', 'x', 'y', 'next'}, 'map 节点缺字段: %s' % nd['key']
            n_nodes += 1
    for rg in m['regions']:
        for nd in rg['nodes']:
            for nx in nd['next']:
                assert nx in keys, 'map 断链: %s→%s' % (nd['key'], nx)

    # ---- 时序常量表（ZQ_T）：M1 地图动效时序真值源（build 锚定，禁散落手改） ----
    T = {
        'HOP_MS': 420,          # 兔子节点间单跳时长（§5.1 L5 hop 300-500ms 取中）
        'CENTER_MS': 800,       # 跳关后地图平移居中时长（§5.1）
        'FOG_FADE_MS': 800,     # 迷雾消散动画（§5.2）
        'SHAKE_MS': 520,        # 锁节点摇一摇提示
        'OVERLAY_MS': 1600,     # 建设中占位 overlay 自动收起
        'STAR_POP_MS': 700,     # 节点完成插旗/星弹出
        'PULSE_S': 2.4,         # 当前节点脉冲环周期
        'FLOAT_S': 3.2,         # 可玩节点 idle 浮动周期（2-4s 错相由 CSS nth-child 承担）
        'PARALLAX_S': 90,       # L1 远景视差平移循环（60-90s 取上界，极慢）
    }

    out = []
    out.append('/* ================= ziquest 小兔子识字闯世界 游戏数据（batch42，第 152 款）\n'
               '   本文件由 _src/_gen_data.py 从 _src/data/*.json 转写生成（零手抄，禁手改）——\n'
               '   build.py 每次构建先重跑生成再做 node 提取双向深比较对账（坑13 铁律）。\n'
               '   ZQ_MAP 地图130节点（meta.rules=解锁规则真值）/ ZQ_CATALOG 伙伴·BOSS·装扮+经济 /\n'
               '   ZQ_CHARS 区域字表 r1..r7（0c 教研字段原样透传，M1 只依赖 ch/src/order）/\n'
               '   ZQ_FN 虚词白名单 / ZQ_STORY 剧情文案 / ZQ_UIV UI·BOSS 语音键账 / ZQ_T 时序常量。 */')
    out.append("'use strict';")
    out.append('')
    out.append('const ZQ_MAP = ' + _js(m) + ';')
    out.append('')
    out.append('const ZQ_CATALOG = ' + _js(cat) + ';')
    out.append('')
    out.append('const ZQ_CHARS = ' + _js(chars) + ';')
    out.append('')
    out.append('const ZQ_FN = ' + _js(fn) + ';')
    out.append('')
    if story is not None:
        out.append('const ZQ_STORY = ' + _js(story) + ';')
        out.append('')
    if uiv is not None:
        out.append('const ZQ_UIV = ' + _js(uiv) + ';')
        out.append('')
    if sents is not None:
        # t5/M3 阅读剧场消费：元素 {id,region,text,focus,py,len}；t5 按含 q.ch 探测确定性选句
        out.append('/* ---------- 句子库（data/sentences.json 透传；子集铁律校验 _audit_sentences.py） ---------- */')
        out.append('const ZQ_SENTENCES = ' + _js(sents['sentences']) + ';')
        out.append('')
    out.append('/* ---------- 时序常量表（M1 地图动效；SPEC-ZIQUEST §0 常量） ---------- */')
    out.append('const ZQ_T = ' + _js(T) + ';')
    out.append('')
    (ROOT / 'game-data.js').write_text('\n'.join(out), encoding='utf-8')
    n_story = sum(len(sc.get('lines', [])) for sc in story['scenes']) if story else 0
    print('gen game-data.js: nodes=%d chars=%d story_lines=%d uiv_keys=%d items=%d' % (
        n_nodes, n_chars, n_story, len(uiv['keys']) if uiv else 0, len(cat['items'])))


if __name__ == '__main__':
    main()
