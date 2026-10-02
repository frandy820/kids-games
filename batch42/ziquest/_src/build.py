# -*- coding: utf-8 -*-
"""ziquest 小兔子识字闯世界 单文件拼接：_src/game-head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch42/ziquest/_src/build.py
结构（家族 b36 M1 布局硬性）：script[0]=core / script[1]=clips / script[2]=data+engine+main（纯游戏
逻辑，无 verify 字面）/ script[3]=verify——verify ① 读 script 块数==4 与离线字面断言。
语音两段制（M1=段一）：zq_ 0 键=静音可玩（core v1.0 缺 clip 静默兜底）；段二 M5 gen_clips 注册后
断言自动收紧为全量。键账 EXPECT 从 data 推导（0c 教研代理并行改 chars-r*.json——只依赖 ch 在场，
禁断言教研字段 words/glyph 完整性）：字键 Σchars + UI36(ui-voice) + comp28(catalog×4) + story行数
+ sentences(未存在=0)。两态：n_zq in (0, EXPECT)。
数据转写对账门禁（坑13 铁律）：build 先跑 _gen_data.py 再 node 提取 game-data.js 各表 ↔ data/*.json
深比较全等，防转写笔误/防单侧漂移。"""
import json, pathlib, re, subprocess, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[3]))  # 仓库根（禁绝对路径）
from design import build_lib

ROOT = pathlib.Path(__file__).resolve().parent          # _src/


def _gen_data():
    """构建第一步：重跑数据生成器（真值源 data/*.json → game-data.js，零手抄）"""
    r = subprocess.run([sys.executable, str(ROOT / '_gen_data.py')],
                       capture_output=True, text=True, encoding='utf-8', timeout=60)
    assert r.returncode == 0, '_gen_data.py 失败: %s%s' % (r.stdout[-200:], r.stderr[-300:])
    print('gen:', r.stdout.strip())


def _assemble_flow(S):
    """M2a 流程层拼装（pre_assemble 钩子内，assemble 之前）：
    1. main 块尾拼 game-main 之后：level.js → calib.js → camp.js → qtypes/t*.js（数字序）。
       顺序依据（可运行性 > 任务书字面）：game-main 尾部 `window.ZQ = {...}` 创建钩子对象，
       level.js 随后增补 QT/registerQ/Level/Calib/Camp 属性（覆盖会丢，前置会炸）；
       qtypes 在 level 之后加载即同步自注册（「无顺序耦合」契约达成）。
       qtypes 目录不存在/为空 = 容错跳过（M2b 并行未就位时 build 仍过，运行时占位卡兜底）。
    2. data 块尾注入 ZQ_CAL（data/calib-pool.json 零手抄——_gen_data.py 不在 M2a 文件域，
       构建期注入与 game-data.js 同源同纪律，每次构建幂等重注入）。"""
    def _rd(n):
        return (ROOT / n).read_text(encoding='utf-8')
    parts = [_rd('level.js'), _rd('calib.js'), _rd('camp.js'), _rd('storycard.js'),
             _rd('dex.js'), _rd('home.js'), _rd('comp.js'), _rd('readaloud.js')]
    qdir = ROOT / 'qtypes'
    n_qt = 0
    if qdir.is_dir():
        def _tk(p):
            m = re.search(r't(\d+)', p.stem)
            return (int(m.group(1)) if m else 99, p.stem)
        for p in sorted(qdir.glob('t*.js'), key=_tk):
            parts.append(p.read_text(encoding='utf-8'))
            n_qt += 1
    for t in parts:
        assert '</script' not in t, '流程层/qtypes 含字面 </script>'
        assert 'runVerify' not in t, '流程层/qtypes 不得含 verify 字面（b36 M1①）'
    S['main'] = S['main'] + '\n' + '\n'.join(parts) + '\n'
    cal = json.loads((ROOT / 'data' / 'calib-pool.json').read_text(encoding='utf-8'))
    cal_js = json.dumps(cal, ensure_ascii=False, separators=(',', ':'))
    assert '</script' not in cal_js
    S['data'] = S['data'] + ('\n/* calib 三带池（build 注入自 data/calib-pool.json，零手抄；'
                             '_gen_data.py 无此表——M2a build 域内注入） */\nconst ZQ_CAL = ' + cal_js + ';\n')
    # P2 实物配图（data/pics/<ch>.webp 存在才注入；条件化=生图未跑/部分跑 build 仍过，
    # t2 运行时 typeof ZQ_PICS 守卫缺图字自动降级无图路径）
    import base64 as _b64
    pics_dir = ROOT / 'data' / 'pics'
    n_pics = 0
    if pics_dir.is_dir():
        pics = {}
        for p in sorted(pics_dir.glob('*.webp')):
            pics[p.stem] = 'data:image/webp;base64,' + _b64.b64encode(p.read_bytes()).decode('ascii')
        if pics:
            pics_js = json.dumps(pics, ensure_ascii=False, separators=(',', ':'))
            assert '</script' not in pics_js
            S['data'] = S['data'] + ('\n/* P2 实物配图（build 注入自 data/pics/*.webp 键=字；'
                                     '真值源图目录，零手抄） */\nvar ZQ_PICS = ' + pics_js + ';\n')
            n_pics = len(pics)
    return n_qt


def _asserts(S):
    n_qt = _assemble_flow(S)
    head, data, engine = S['head'], S['data'], S['engine']
    main, verif, clips = S['main'], S['verify'], S['clips']

    # ===== 数据对账（坑13 铁律）：node 提取 game-data.js 表 ↔ data/*.json 双向深比较全等 =====
    DUMP_JS = r'''
const fs = require('fs'), vm = require('vm');
const src = fs.readFileSync(process.argv[1], 'utf8');
const ctx = { JSON: JSON, Math: Math };
vm.createContext(ctx);
vm.runInContext(src + ';this.__T = { ZQ_MAP: ZQ_MAP, ZQ_CATALOG: ZQ_CATALOG, ZQ_CHARS: ZQ_CHARS, ZQ_FN: ZQ_FN, ZQ_STORY: (typeof ZQ_STORY !== "undefined" ? ZQ_STORY : null), ZQ_UIV: (typeof ZQ_UIV !== "undefined" ? ZQ_UIV : null), ZQ_SENTENCES: (typeof ZQ_SENTENCES !== "undefined" ? ZQ_SENTENCES : null), ZQ_T: ZQ_T };', ctx);
process.stdout.write(JSON.stringify(ctx.__T));
'''
    dump = subprocess.run(['node', '-e', DUMP_JS, str(ROOT / 'game-data.js')],
                          capture_output=True, text=True, encoding='utf-8', timeout=60)
    assert dump.returncode == 0, 'node 提取 game-data.js 失败: %s' % dump.stderr[:300]
    T = json.loads(dump.stdout)
    jl = lambda n: json.loads((ROOT / 'data' / n).read_text(encoding='utf-8'))
    MAP, CAT, FN = jl('map.json'), jl('catalog.json'), jl('chars-function.json')
    CHARS = {str(r): jl('chars-r%d.json' % r) for r in range(1, 8)}
    assert T['ZQ_MAP'] == MAP, 'ZQ_MAP 对账失败（130 节点 ↔ map.json）'
    assert T['ZQ_CATALOG'] == CAT, 'ZQ_CATALOG 对账失败（↔ catalog.json）'
    assert T['ZQ_CHARS'] == CHARS, 'ZQ_CHARS 对账失败（r1..r7 结构键+教研字段透传）'
    assert T['ZQ_FN'] == FN, 'ZQ_FN 对账失败'
    STORY = jl('story.json')
    assert T['ZQ_STORY'] == STORY, 'ZQ_STORY 对账失败'
    assert T['ZQ_UIV'] == jl('ui-voice.json'), 'ZQ_UIV 对账失败'
    SENT = ROOT / 'data' / 'sentences.json'
    if SENT.exists():
        assert T['ZQ_SENTENCES'] == jl('sentences.json')['sentences'], 'ZQ_SENTENCES 对账失败（↔ sentences.json）'
    else:
        assert T['ZQ_SENTENCES'] is None, 'sentences.json 缺失但 ZQ_SENTENCES 非空'
    for k, v in {'HOP_MS': 420, 'CENTER_MS': 800, 'FOG_FADE_MS': 800, 'SHAKE_MS': 520,
                 'OVERLAY_MS': 1600, 'STAR_POP_MS': 700, 'PULSE_S': 2.4, 'FLOAT_S': 3.2,
                 'PARALLAX_S': 90}.items():
        assert T['ZQ_T'].get(k) == v, 'ZQ_T.%s 对账失败（时序常量漂移）' % k

    # ===== 地图结构断言（python 侧早失败；verify ② 运行时再做全套） =====
    keys = set()
    for rg in MAP['regions']:
        n_new = sum(1 for nd in rg['nodes'] if nd['type'] == 'new')
        assert rg['levels'] == n_new, 'R%s levels=%s != new 节点 %d' % (rg['id'], rg['levels'], n_new)
        for nd in rg['nodes']:
            assert nd['key'] not in keys, '节点 key 重复 %s' % nd['key']
            keys.add(nd['key'])
    assert len(keys) == 130, '节点数 %d != 130' % len(keys)
    for rg in MAP['regions']:
        for nd in rg['nodes']:
            for nx in nd['next']:
                assert nx in keys, 'map 断链 %s→%s' % (nd['key'], nx)

    # ===== 语音 clips 注入（M1 段一：0 键=静音兜底；段二 M5 全量） =====
    _inj_keys = re.findall(r'"([a-z0-9_]+)":"data:audio', clips)
    n_zq = sum(1 for k in _inj_keys if k.startswith('zq_'))
    n_chars = sum(len(d['chars']) for d in CHARS.values())
    n_story = sum(len(sc.get('lines', [])) for sc in STORY['scenes'])
    _sent_f = ROOT / 'data' / 'sentences.json'
    n_sent = len(jl('sentences.json')['sentences']) if _sent_f.exists() else 0
    EXPECT = n_chars + len(jl('ui-voice.json')['keys']) + len(CAT['companions']) * 4 + n_story + n_sent
    bad_prefix = [k for k in _inj_keys if not (k.startswith('zq_') or k.startswith('core_'))]
    assert not bad_prefix, 'clips 出现非 zq_/core_ 键: %s' % sorted(set(bad_prefix))
    assert n_zq in (0, EXPECT), 'zq_ clips %d 条（段一须 0=未注册，段二须 %d=全量，禁部分注册）' % (n_zq, EXPECT)
    # 段二键名级对账（zq_ch_<无调拼音+同音序号>）M5 落地——键名依赖 0c 机扫 py 字段定稿
    stage = 2 if n_zq else 1

    # ===== P2 配图键账+对账：ZQ_PICS 键集 == data/pics/*.webp 文件名集合（双向）；≤200 =====
    pics_dir = ROOT / 'data' / 'pics'
    pic_files = {p.stem for p in pics_dir.glob('*.webp')} if pics_dir.is_dir() else set()
    m2 = re.search(r'var ZQ_PICS = \{(.*?)\};', S['data'], re.S)
    pic_keys = set(re.findall(r'"([^"]+)":"data:image/webp', m2.group(1))) if m2 else set()
    assert pic_keys == pic_files, 'ZQ_PICS 键账失败（注入 %d vs 文件 %d）' % (len(pic_keys), len(pic_files))
    assert len(pic_keys) <= 200, '配图超预算 200：当前 %d（体积红线）' % len(pic_keys)
    all_chars_set = {c['ch'] for d in CHARS.values() for c in d['chars']}
    bad_pic = pic_keys - all_chars_set
    assert not bad_pic, '配图文件名非字表字: %s' % sorted(bad_pic)

    # ===== 体积门禁（≤17MB 硬红线；P2 配图后实收） =====
    total_chars = sum(len(x) for x in (head, data, engine, main, verif, clips, S.get('ghost', '')))
    assert total_chars < 17 * 1024 * 1024, '产物 %d chars 超 17MB 红线' % total_chars

    # ===== head 硬性：title / 按钮显式 color（契约 O）/ FAMILY_CSS 三占位 / 五段横幅 =====
    assert '<title>小兔子识字闯世界</title>' in head, 'head 缺标题 小兔子识字闯世界'
    assert 'button{font-family:inherit;cursor:pointer;border:none;background:none;color:#4A3B2E}' in head, \
        'head 缺自建 button 显式 color（契约 O）'
    # 占位断言须在 inject_family_css 之后（build_lib 已替换为段原文）→ 改查三段特征选择器
    for feat in ('*{margin:0;padding:0;box-sizing:border-box}',          # reset 段
                 '#ghost{position:fixed;z-index:80',                     # ghost 段
                 'body.verify #verify-result{display:block}'):           # verify 段
        assert feat in head, 'head 缺 FAMILY_CSS 段特征（占位未注入或段漂移）: %s' % feat[:40]
    for seg in ('一·基式与家族公共段', '二·冒险地图', '三·关卡占位', '四·M4 收集三页', '五·弹层'):
        assert seg in head, 'head 缺五段横幅分区: %s' % seg

    # ===== engine 硬性：核心常量锚 + 纯函数锚 + 经济表同步 =====
    assert 'const ZQ_DAY_NEW = [1, 2, 2, 2, 2, 2, 2, 3];' in engine, 'engine 缺配额表 ZQ_DAY_NEW（SPEC §1.4）'
    for fn in ('function zqQuota', 'function nodeState', 'function curNodeKey', 'function srsNext',
               'function srsDue', 'function calStop', 'function zqNodeReward'):
        assert fn in engine, 'engine 缺纯函数 %s' % fn
    assert 'const ZQ_ECON = ZQ_CATALOG.meta.economy;' in engine, 'engine 经济表须引用 catalog meta（禁手抄）'
    for ek in CAT['meta']['economy']:
        assert "'%s'" % ek in engine, 'engine 经济 fail-fast 缺 catalog 键 %s' % ek
    assert 'const SRS_IV = [1, 3, 7, 14, 30];' in engine, 'engine 缺 SRS 阶梯表（SPEC §2.5）'

    # ===== main 硬性：core 接线锚 / ZQ 钩子 / M2 接入点契约 =====
    assert "KIDS.init({ game: 'ziquest'" in main, 'main 缺 KIDS.init ziquest（存档键 kidsgame_ziquest）'
    assert 'window.ZQ =' in main, 'main 缺 ZQ 钩子'
    assert 'M2 关卡系统接入点' in main and 'function finishNode' in main, 'main 缺 M2 接入点契约注释/finishNode'
    assert "title: '小兔子识字闯世界'" in main, 'main 缺 init title'
    # 存档救援：旧档无 zq = 首进序章（§6.4 兼容语义）
    assert 'function zqEnsure' in main and 'SAVE = KIDS._save()' in main, 'main 缺 zq 存档命名空间接线'
    # 静音纪律：语音一律单 key 调用（缺 clip 静默；禁 TTS 回退文本参数——家族 ziquest 声明）
    assert not re.search(r"KIDS\.voice\.play\([^)]*,", main + engine + verif), 'voice.play 带 text 参数（TTS 回退泄露）'

    # ===== M2a 流程层硬性：level/calib/camp 锚 + ZQ_CAL 注入对账 + 救援源码级断言 =====
    for fn, anchors in [
        ('level.js', ['function zqGenLevel', 'function zqGenNew', 'function zqEngAnswer', 'window.ZQ.QT = ZQ_QT',
                      'function zqRegisterQ', 'ZQ_LEVEL = {', 'zq_ch_', 'zq_wall', 'RESCUE_DIR_MS',
                      'RESCUE_ANS_MS', 'zqNodeChars', 'zqStars']),
        ('calib.js', ['ZQ_CALIB =', 'zq_calib_start', 'zq_calib_done', 'calibRight', 'ZQ_CAL_BAND_LIM']),
        ('camp.js', ['ZQ.Camp =', 'zq_camp_go', 'zq_morning', 'morningDone', 'campPaid']),
        ('dex.js', ['ZQ.Dex', 'zq_ch_', 'ZQ_PICS', 'zq-dex-grid']),
        ('home.js', ['ZQ.Home', 'zq-dress-slot', 'ZQ_CATALOG.items', 'syncMapDress']),
        ('comp.js', ['ZQ.Comp', 'grant', 'zq-pet', 'zq-comp-grid']),
        ('readaloud.js', ['ZQ.RA', 'webkitSpeechRecognition', 'zq_ra_go', 'zq_ra_good', 'zq_ra_retry', 'zq-ra-skip']),
    ]:
        src = (ROOT / fn).read_text(encoding='utf-8')
        for a in anchors:
            assert a in src, '%s 缺锚 %s' % (fn, a)
    lv = (ROOT / 'level.js').read_text(encoding='utf-8')
    m = re.search(r'RESCUE_DIR_MS = (\d+)', lv), re.search(r'RESCUE_ANS_MS = (\d+)', lv)
    assert m[0] and m[0].group(1) == '14000' and m[1] and m[1].group(1) == '30000', \
        'rescue anchor drift (family 14s/30s)'
    seg = lv[lv.index('function zqRescueCore'):lv.index('function zqRescueTick')]
    assert 'lastAct =' not in seg, '救援刷 lastAct=违反 keepIdle 纪律（zilearn 家族坑）'
    assert 'Math.random(' not in lv + (ROOT / 'calib.js').read_text(encoding='utf-8') + \
        (ROOT / 'camp.js').read_text(encoding='utf-8'), 'flow layer calls Math.random (determinism)'
    CAL = jl('calib-pool.json')
    assert 'const ZQ_CAL = ' + json.dumps(CAL, ensure_ascii=False, separators=(',', ':')) in data, \
        'ZQ_CAL 注入与 data/calib-pool.json 不等'
    if n_qt:
        assert main.count('ZQ.registerQ(') >= n_qt, 'qtypes 文件数 %d 与注册调用不符' % n_qt
    # boss 永不失败/星判定锚（verify 运行时深测，此处源码在场合）
    assert 'zqBossRest' in lv and 'zqEngAnswer' in lv, 'level.js 缺 boss 休息流/判定引擎锚'

    # ===== verify 素材（独立硬编码表 + script 块数断言；M2a 扩锚） =====
    for lit in ('SPEC_DAY_NEW', "document.querySelectorAll('script')", 'runVerify', 'VERIFY PASS',
                'SPEC_ECON', 'zqCalibSim', 'ZQ_CAL', 'bossFirst: 45', '_renderQSim', '_idleHack'):
        assert lit in verif, 'verify 缺素材 %s' % lit
    assert '[1, 2, 2, 2, 2, 2, 2, 3]' in verif, 'verify 缺 SPEC_DAY_NEW 独立硬编码表（坑4 铁律）'
    assert 'runVerify' not in (data + engine + main), 'b36 M1①：script[2]（data+engine+main）不得含 verify 字面'

    print('对账: ZQ_MAP/CATALOG/CHARS/FN/STORY/UIV/T ↔ data/*.json 双向全等；节点 130、链无断')
    print('流程: level+calib+camp+qtypes(%d) 拼入 main 块；ZQ_CAL 注入 data 块（三带 %d/%d/%d）' % (
        n_qt, len(CAL['meta']['bands']['easy']), len(CAL['meta']['bands']['mid']),
        len(CAL['meta']['bands']['hard'])))
    print('键账: EXPECT=%d（字%d+UI%d+comp%d+story%d+st%d）；clips stage-%d（zq_ %d 键）' % (
        EXPECT, n_chars, len(jl('ui-voice.json')['keys']), len(CAT['companions']) * 4, n_story, n_sent, stage, n_zq))


_gen_data()


def _clips32(clips):
    """v53 瘦身：clips 基 64 换 clips32/<key>.mp3 重编码版（48→32kbps，647 键省 ~3.7MB base64）。
    源 voice/clips/ 与 manifest 是家族共享真值源禁改——只在此（内存中）替换。
    clips32 缺键=保持原 clip（老键兜底）；缓存由 tools/gen_clips32.py 生成（进 git，免 ffmpeg 幂等）。"""
    import base64 as _b64
    C32 = ROOT / 'data' / 'clips32'
    if not C32.exists():
        print('clips32: cache dir missing, skip (run tools/gen_clips32.py)')
        return clips
    import re as _re
    n = 0

    def _sub(m):
        nonlocal n
        key, body = m.group(1), m.group(2)
        p32 = C32 / (key + '.mp3')
        if not p32.exists() or p32.stat().st_size < 800:
            return m.group(0)
        n += 1
        return '"%s":"data:audio/mpeg;base64,%s"' % (key, _b64.b64encode(p32.read_bytes()).decode('ascii'))

    out = _re.sub(r'"([a-z0-9_]+)":"data:audio/mpeg;base64,([A-Za-z0-9+/=]+)"', _sub, clips)
    print('clips32: %d keys swapped to 32kbps' % n)
    return out


_html, _out = build_lib.build(ROOT, game='ziquest', head_name='game-head.html',
                              verify_block='separate', pre_assemble=_asserts, clips_prep=_clips32)

# ===== v53 体积硬门禁（用户实测国内 Pages 80KB/s：13.7MB 手机白屏 3-5 分钟打不开 → 顶 10.5MB） =====
import shutil as _sh
_nbytes = len(_html.encode('utf-8'))
assert _nbytes <= 10_500_000, 'SIZE GATE FAIL: index.html %.2fMB > 10.5MB（查 clips32/pics 体积）' % (_nbytes / 1048576)
_pics_b = sum(len(v) for v in re.findall(r'"data:image/webp;base64,([A-Za-z0-9+/=]+)"', _html))
assert _pics_b * 3 / 4 <= 1_300_000, 'PICS BUDGET FAIL: webp 总量 %.0fKB > 1300KB（138 张×~6KB 预算）' % (_pics_b * 3 / 4 / 1024)
print('SIZE GATE: %.2fMB ≤ 10.5MB ✓  pics %.0fKB ≤ 1300KB ✓' % (_nbytes / 1048576, _pics_b * 3 / 4 / 1024))
_sh.copy(ROOT / 'sw.js', _out.parent / 'sw.js')          # SW 随产物落同目录（scope=目录级）
