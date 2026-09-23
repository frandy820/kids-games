# -*- coding: utf-8 -*-
"""habitat r4 独立复验（SPEC-BATCH25 §0.60 r4 版本块分源）——断言从 SPEC 推导，禁从实现行为归纳
Python 侧独立真值（SPEC §0.60 r4 版本块文字重列；非游戏侧取）：
  动物 24 标签 [home,diet,hib,swim,egg,fly,food]；ENV7；NEAR 三对；FOOD6；CHAINS 4；
  冬眠集 4={bear,snake,turtle,frog}；STRUCTS 4；DUALS 5（谓词独立实现）
  章型：dch1 [home,feed×3,chain] / dch2 [hib,struct,hib,struct,hib] / dch3 [dual×5 五对覆盖]
        / dch4 [home,feed,chain|struct,hib,dual]；flat≥20 生成关 dch 以钩子为准
T1 六族封闭表对拍（40 关全量按 kind 分派：home=表值+ENV7+ch1 常见池+ch4 近对在场 /
   feed=food 表+candy 恒在场 / chain=链位+干扰非链成员+up 禁 food==base / hib=冬眠集两向 /
   struct=能力 4 全集 / dual=双满足恰 1+双干扰在场）+kind 分布独立判+4 卡互异恰 1 对
T2 dch3 交集专项：五对全覆盖+答案互异（flat10-14）
T3 反馈绑定：home=所点环境 hab_w_<env>（flat<3 必播通道）/ 新题型=hab_w_<kind>（chain 直驱）
T4 确定性 / T6 星级三档 / T8 双错防重入 fire-and-forget / T10 家族 A+B 源码级 / T11 C7 结构"""
import json, sys, os, io, re
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

BASE = os.path.dirname(os.path.abspath(__file__))
URL = 'file:///' + os.path.join(BASE, 'habitat', 'index.html').replace(chr(92), '/') + '?verify=1'

results = []
def chk(name, ok, note=''):
    results.append((name, bool(ok)))
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, note))

# ---- Python 独立封闭表（SPEC §0.60 r4 版本块文字逐条转译，禁抄页面表） ----
ENV7 = {'forest', 'grassland', 'ocean', 'desert', 'pond', 'sky', 'farm'}
NEAR = {'pond': 'ocean', 'ocean': 'pond', 'grassland': 'desert', 'desert': 'grassland',
        'forest': 'farm', 'farm': 'forest'}
COMMON6 = {'fish', 'frog', 'bird', 'hen', 'pig', 'rabbit'}
COMMON_ENVS4 = {'pond', 'sky', 'farm', 'forest'}
# id: (home, diet, hib, swim, egg, fly, food)  food=None → 非 feed 题面
A = {
    'fish': ('pond', 'carn', 0, 1, 1, 0, None), 'frog': ('pond', 'carn', 1, 1, 1, 0, 'bug'),
    'bird': ('sky', 'carn', 0, 0, 1, 1, 'bug'), 'hen': ('farm', 'omni', 0, 0, 1, 0, None),
    'pig': ('farm', 'omni', 0, 0, 0, 0, None), 'rabbit': ('forest', 'herb', 0, 0, 0, 0, 'grass'),
    'lion': ('grassland', 'carn', 0, 0, 0, 0, 'meat'), 'elephant': ('grassland', 'herb', 0, 0, 0, 0, 'grass'),
    'zebra': ('grassland', 'herb', 0, 0, 0, 0, 'grass'), 'monkey': ('forest', 'omni', 0, 0, 0, 0, 'fruit'),
    'woodpecker': ('forest', 'carn', 0, 0, 1, 1, 'bug'), 'dolphin': ('ocean', 'carn', 0, 1, 0, 0, 'fish'),
    'whale': ('ocean', 'carn', 0, 1, 0, 0, 'fish'), 'camel': ('desert', 'herb', 0, 0, 0, 0, 'grass'),
    'scorpion': ('desert', 'carn', 0, 0, 1, 0, 'bug'), 'bear': ('forest', 'omni', 1, 0, 0, 0, 'fish'),
    'snake': ('grassland', 'carn', 1, 0, 1, 0, None), 'turtle': ('pond', 'omni', 1, 1, 1, 0, None),
    'fox': ('forest', 'carn', 0, 0, 0, 0, 'meat'), 'eagle': ('sky', 'carn', 0, 0, 1, 1, 'meat'),
    'duck': ('pond', 'omni', 0, 1, 1, 1, None), 'squirrel': ('forest', 'herb', 0, 0, 0, 0, 'fruit'),
    'cow': ('farm', 'herb', 0, 0, 0, 0, 'grass'), 'tiger': ('forest', 'carn', 0, 0, 0, 0, 'meat'),
}
FOOD6 = {'grass', 'meat', 'bug', 'fish', 'fruit', 'candy'}
CHAINS = {'c1': ('grass', 'rabbit', 'eagle'), 'c2': ('grass', 'zebra', 'lion'),
          'c3': ('bug', 'frog', 'snake'), 'c4': ('fruit', 'monkey', 'tiger')}
HIBSET = {'bear', 'snake', 'turtle', 'frog'}
ABILITY4 = {'swim', 'fly', 'run', 'dig'}
STRUCTS = {'web': 'swim', 'wing': 'fly', 'legs': 'run', 'claws': 'dig'}
DUALS = {'swim_hib': ('swim', 'hib'), 'water_nowegg': ('water', 'nowegg'),
         'hib_egg': ('hib', 'egg'), 'swim_egg': ('swim', 'egg'), 'farm_herb': ('farm', 'herb')}

def tcond(cond, a):
    """交集谓词独立实现（禁引用页面 CONDS）"""
    home, diet, hib, swim, egg, fly, food = A[a]
    return {'swim': swim, 'hib': hib, 'egg': egg, 'nowegg': 1 - egg,
            'water': 1 if home in ('pond', 'ocean') else 0,
            'farm': 1 if home == 'farm' else 0,
            'herb': 1 if diet == 'herb' else 0}[cond]

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL)
    for _ in range(240):
        t = pg.title()
        if 'VERIFY' in t and t != 'VERIFY':
            break
        pg.wait_for_timeout(500)
    chk('T0 selftest 全绿+0 pageerror', 'VERIFY PASS' in t and not errs, t)

    # 语音捕获（play/say/queue 三通道；habitat 错反馈走 play(clip)）
    pg.evaluate('''() => { window.__pks = [];
        const op = KIDS.voice.play.bind(KIDS.voice);
        KIDS.voice.play = (k) => { window.__pks.push(String(k)); return op(k); };
        const os = KIDS.voice.say.bind(KIDS.voice);
        KIDS.voice.say = (s) => { window.__pks.push('TTS:'+String(s)); return os(s); };
        const oq = KIDS.voice.queue ? KIDS.voice.queue.bind(KIDS.voice) : null;
        if (oq) KIDS.voice.queue = (arr) => { (arr||[]).forEach(x => window.__pks.push(String(x.key||x))); return oq(arr); }; }''')

    def read_q():
        return pg.evaluate('() => HB.quiz')
    def read_lv():
        return pg.evaluate('() => HB.currentLevel ? {step: HB.currentLevel.step, done: HB.currentLevel.done, stars: HB.currentLevel.stars} : null')
    def tap(i):
        return pg.evaluate('(i) => (async () => { try { return await HB.tapScene(i) } catch(e){ return "ERR" } })()', i)
    def wait_quiz(timeout_ms=12000):
        for _ in range(int(timeout_ms / 30)):
            q = read_q()
            if q:
                return q
            pg.wait_for_timeout(30)
        return None
    def stepped(k):
        lv = read_lv()
        return (lv and lv['step'] > k) or bool(lv and lv['done'])
    def wait_step(k, timeout_ms=20000):
        for _ in range(int(timeout_ms / 60)):
            if stepped(k):
                return True
            pg.wait_for_timeout(60)
        return False

    animal_seen = set()
    table_fail, dual3_fail, fb_fail, drive_fail, star3_fail = [], [], [], [], []
    PROBE = {3, 9}          # 1 错=2★ 探测
    DW = {1, 2}             # 双错防重入+home 反馈绑定（flat<3 必播通道，无 10s 节流竞态）
    for flat in range(40):
        pg.evaluate('(f) => { HB.start(f) }', flat)
        dch = pg.evaluate('() => HB.currentLevel ? HB.currentLevel.dch : null')   # 生成关随机章型以钩子为准
        kind_cnt, dch3_pairs, dch3_ans = {}, set(), []
        ok_break = False
        for k in range(5):
            q = wait_quiz()
            if not q:
                drive_fail.append((flat, k, 'quiz 不可读'))
                ok_break = True
                break
            kd, animal, home, scenes = q['kind'], q['animal'], q['home'], q['scenes']
            kinds = [s['kind'] for s in scenes]
            kind_cnt[kd] = kind_cnt.get(kd, 0) + 1
            if animal:
                animal_seen.add(animal)
            # T1a 通用形状：4 卡互异 + 恰 1 正确
            if len(set(kinds)) != 4 or kinds.count(home) != 1:
                table_fail.append((flat, k, '卡形状', kd, kinds, home))
            # T1b 按 kind 分派独立对账（断言从 SPEC r4 六族语义推导）
            if kd == 'home':
                if home != A.get(animal, (None,))[0] or animal not in A:
                    table_fail.append((flat, k, 'home≠表', animal, home))
                if not set(kinds) <= ENV7:
                    table_fail.append((flat, k, 'home 环境∉7', kinds))
                if dch == 1 and (animal not in COMMON6 or set(kinds) != COMMON_ENVS4):
                    table_fail.append((flat, k, 'ch1 常见池/环境4', animal, kinds))
                if dch != 1 and NEAR.get(home) and NEAR[home] not in kinds:
                    table_fail.append((flat, k, '近对不在场', home, kinds))
            elif kd == 'feed':
                if animal not in A or A[animal][6] is None or home != A[animal][6]:
                    table_fail.append((flat, k, 'feed≠food 表', animal, home))
                if not set(kinds) <= FOOD6 or 'candy' not in kinds:
                    table_fail.append((flat, k, 'feed∉6/无candy', kinds))
            elif kd == 'chain':
                ch = q.get('chain') or {}
                c = CHAINS.get((ch.get('base'), ch.get('mid'), ch.get('top')) and
                               next((cid for cid, v in CHAINS.items()
                                     if (v[0], v[1], v[2]) == (ch.get('base'), ch.get('mid'), ch.get('top'))), None))
                want = ch.get('top') if ch.get('dir') == 'up' else ch.get('mid')
                if not c or home != want:
                    table_fail.append((flat, k, 'chain 链位', ch, home))
                else:
                    for v in kinds:
                        if v != home and v in (c[1], c[2]):
                            table_fail.append((flat, k, '干扰=链成员', v))
                        if ch.get('dir') == 'up' and v != home and A.get(v, ('',)*7)[6] == c[0]:
                            table_fail.append((flat, k, 'up 干扰 food==base', v))
                    if not set(kinds) <= set(A):
                        table_fail.append((flat, k, 'chain∉24', kinds))
            elif kd == 'hib':
                in_hib = home in HIBSET
                others = [v for v in kinds if v != home]
                if in_hib != (q.get('hibDir') == 'sleep') or \
                   any((v in HIBSET) == in_hib for v in others):
                    table_fail.append((flat, k, 'hib 集', q.get('hibDir'), home, kinds))
            elif kd == 'struct':
                if STRUCTS.get(q.get('feat')) != home or set(kinds) != ABILITY4:
                    table_fail.append((flat, k, 'struct 集', q.get('feat'), home, kinds))
            elif kd == 'dual':
                cd = q.get('conds') or {}
                pair = str(cd.get('a', '')) + '_' + str(cd.get('b', ''))
                dd = DUALS.get(pair)
                if not dd:
                    table_fail.append((flat, k, 'dual 对∉5', pair))
                else:
                    both = [v for v in kinds if tcond(dd[0], v) and tcond(dd[1], v)]
                    onlyA = [v for v in kinds if tcond(dd[0], v) and not tcond(dd[1], v)]
                    onlyB = [v for v in kinds if not tcond(dd[0], v) and tcond(dd[1], v)]
                    never = [v for v in kinds if not tcond(dd[0], v) and not tcond(dd[1], v)]
                    if len(both) != 1 or both[0] != home or not onlyA or not onlyB or not never:
                        table_fail.append((flat, k, 'dual 四分类', pair, kinds))
                if dch == 3:
                    dch3_pairs.add(pair)
                    dch3_ans.append(home)
            else:
                table_fail.append((flat, k, '未知 kind', kd))
            # T8+T3 双错防重入+home 反馈绑定（DW 关题0——flat<3 每错必播）
            if flat in DW and k == 0:
                pk0 = pg.evaluate('() => window.__pks.length')
                m0 = q['miss']
                wi = next((i for i, s in enumerate(scenes) if s['kind'] != home), None)
                wkind = scenes[wi]['kind']
                pg.evaluate('(i) => { HB.tapScene(i); return 1; }', wi)   # 首击 fire-and-forget
                pg.wait_for_timeout(40)
                r2 = tap(wi)                                              # 窗内二击应被吞
                pg.wait_for_timeout(1100)
                qd = read_q()
                if not (r2 in (False, None, 'hold') and qd and qd['miss'] == m0 + 1):
                    drive_fail.append((flat, '双错 miss 应只+1', r2, m0, qd and qd['miss']))
                pk1 = pg.evaluate('() => window.__pks.length')
                seg = [str(x) for x in pg.evaluate('() => window.__pks.slice(%s, %s)' % (pk0, pk1))]
                clips = [x for x in seg if x and x != 'None' and not x.startswith('TTS:')]
                want = 'hab_w_' + wkind
                if not (kd == 'home' and clips and clips[0] == want):
                    fb_fail.append((flat, '反馈≠所点环境', wkind, clips[:3]))
            # 推进：点对
            ri = next((i for i, s in enumerate(scenes) if s['kind'] == home), None)
            if not stepped(k):
                r = tap(ri)
                if r not in ('right', 'done'):
                    drive_fail.append((flat, k, '点对返回非 right', r))
                if not wait_step(k):
                    drive_fail.append((flat, k, '驱动未推进'))
                    ok_break = True
                    break
        # T1c 章型 kind 分布独立判（SPEC r4 章型文字）
        want_cnt = {1: {'home': 1, 'feed': 3, 'chain': 1},
                    2: {'hib': 3, 'struct': 2},
                    3: {'dual': 5}}.get(dch)
        if want_cnt and kind_cnt != want_cnt:
            table_fail.append((flat, 'kind 分布', dch, kind_cnt))
        if dch == 4 and not (kind_cnt.get('home') == 1 and kind_cnt.get('feed') == 1 and
                             kind_cnt.get('hib') == 1 and kind_cnt.get('dual') == 1 and
                             kind_cnt.get('chain', 0) + kind_cnt.get('struct', 0) == 1):
            table_fail.append((flat, 'dch4 分布', kind_cnt))
        # T2 dch3 交集专项：五对全覆盖+答案互异（近对章已换代）
        if dch == 3 and not ok_break and (len(dch3_pairs) != 5 or len(set(dch3_ans)) != 5):
            dual3_fail.append((flat, sorted(dch3_pairs), dch3_ans))
        lv = read_lv()
        if lv and lv.get('done') and flat not in PROBE and flat not in DW and not ok_break:
            st = -1
            for _ in range(6):
                pg.wait_for_timeout(150)
                st = pg.evaluate('() => HB.currentLevel && HB.currentLevel.stars != null ? HB.currentLevel.stars : -1')
                if st != -1: break
            if st not in (3, -1):
                star3_fail.append((flat, '全最优非3★', st))

    chk('T1 六族封闭表对拍+kind 分布（40 关全量）', not table_fail, str(table_fail[:4]))
    chk('T2 dch3 交集专项（五对全覆盖+答案互异+双干扰在场）', not dual3_fail, str(dual3_fail[:3]))
    chk('T3 home 反馈绑定所点环境（flat<3 必播通道）', not fb_fail, str(fb_fail[:3]))
    chk('T8 驱动+双错防重入', not drive_fail, str(drive_fail[:4]))
    chk('T6a 星级全最优=3★（排探测）', not star3_fail, str(star3_fail[:3]))
    print('    # 动物覆盖 %d/24' % len(animal_seen & set(A)))

    # T3b 新题型错反馈绑定题型（flat1<3 必播通道直驱 chain 题）
    pg.evaluate('HB.start(1)')
    pg.evaluate('cur.step = 4; renderQuiz();')
    pk0 = pg.evaluate('() => window.__pks.length')
    qch = read_q()
    wi = next(i for i, s in enumerate(qch['scenes']) if s['kind'] != qch['home'])
    pg.evaluate('(i) => { HB.tapScene(i); return 1; }', wi)
    pg.wait_for_timeout(1100)
    pk1 = pg.evaluate('() => window.__pks.length')
    seg = [str(x) for x in pg.evaluate('() => window.__pks.slice(%s, %s)' % (pk0, pk1))]
    clips = [x for x in seg if x and x != 'None' and not x.startswith('TTS:')]
    chk('T3b 新题型反馈绑定 hab_w_<kind>（chain）',
        qch['kind'] == 'chain' and clips and clips[0] == 'hab_w_chain', str(clips[:3]))

    # T4 确定性
    det_fail = []
    for flat in (0, 12, 27, 39):
        pg.evaluate('(f) => { HB.start(f) }', flat)
        a = json.dumps(read_q(), sort_keys=True)
        pg.evaluate('(f) => { HB.start(f) }', flat)
        c = json.dumps(read_q(), sort_keys=True)
        if a != c:
            det_fail.append(flat)
    chk('T4 确定性（双读 sig 相同）', not det_fail, str(det_fail))

    # T6b 1 错=2★（探测关）
    s2 = []
    for flat in (3, 9):
        pg.evaluate('(f) => { HB.start(f) }', flat)
        wronged = False
        for k in range(5):
            q = wait_quiz()
            if not q: break
            if not wronged:
                wi = next((i for i, s in enumerate(q['scenes']) if s['kind'] != q['home']), None)
                tap(wi); wronged = True
                pg.wait_for_timeout(1100)
            if not stepped(k):
                ri = next((i for i, s in enumerate(q['scenes']) if s['kind'] == q['home']), None)
                tap(ri); wait_step(k)
        st = -1
        for _ in range(8):
            pg.wait_for_timeout(200)
            st = pg.evaluate('() => HB.currentLevel && HB.currentLevel.stars != null ? HB.currentLevel.stars : -1')
            if st != -1: break
        if st != 2: s2.append((flat, st))
    chk('T6b 1 错=2★', not s2, str(s2))
    pg.close(); b.close()

# T10 家族 A+B 源码级
src = io.open(os.path.join(BASE, 'habitat', '_src', 'game-main.js'), encoding='utf-8').read()
s10 = []
if src.count('nextHint(lim - 1)') < 1:
    s10.append('启动 dayEnd 无 lim-1')
if 'dayEnd({ nextHint: nextHint(null) })' not in src and src.count('nextHint(lim - 1)') < 2:
    s10.append('winFlow dayEnd 非定版形态')
if 'lastDir' not in src:
    s10.append('无方向级独立节流锚')
m = re.search(r'lastDir[\s\S]{0,400}', src)
if m and 'lastAct = ' in m.group(0)[:400]:
    s10.append('方向级段 400 字内重置 lastAct')
chk('T10 家族 A+B 源码级', not s10, str(s10))

# T11 C7 结构（game-data.js）
data_src = io.open(os.path.join(BASE, 'habitat', '_src', 'game-data.js'), encoding='utf-8').read()
s11 = []
if not re.search(r'CHAPTERS\s*[:=]', data_src):
    s11.append('无 CHAPTERS')
if data_src.count('hint:') < 4:
    s11.append('章对象 hint 字段不足 4')
if not re.search(r'GEN_HINTS\s*[:=]\s*\[', data_src):
    s11.append('无 GEN_HINTS')
if 'WVOICE_KIND' not in data_src or 'HINT_VOICE' not in data_src:
    s11.append('无 r4 题型化反馈/提示表')
chk('T11 hint/CHAPTERS/GEN_HINTS/WVOICE_KIND 结构（C7 细判交审查）', not s11, str(s11))

fails = [r for r in results if not r[1]]
print('\nTOTAL %d/%d PASS' % (len(results) - len(fails), len(results)))
sys.exit(1 if fails else 0)
