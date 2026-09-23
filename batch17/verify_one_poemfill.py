# -*- coding: utf-8 -*-
"""batch17 独立复验 r13：poemfill（断言从 SPEC-BATCH17 §1-r13 推导；Python 侧独立 30 首
诗库双写对账+关诗映射+章题构成+干扰句规则+飞花令含字域+40 关时长模型独立复算对账+
行为+语音分源断言；r13=整句回忆四型 F/R/O/FF）
P-1 VERIFY 自检前置 / P1 确定性 / P2-P4 静态 20 关真实通路逐题推进+独立审计 /
P0 pageerror / P5 入槽判错/退回/对选 / P6 重听说题面句+开场链单通道 / P7 flat<3 错播
pf_wrong / P9 40 关结构+时长独立复算（最低 70625@flat0）/ P8 救援 14s（真实页）"""
import asyncio, io, os, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(os.path.dirname(os.path.abspath(__file__)))
URL = 'file:///' + (BASE / 'poemfill' / 'index.html').as_posix() + '?verify=1'
PASS, FAIL = [], []

def rec(name, ok, detail=''):
    (PASS if ok else FAIL).append(name)
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, detail))

# ---- Python 独立诗库（第二写；与游戏侧 game-data.js 分源对账）----
POEMS = {
    'yie':   ('咏鹅', '骆宾王', ['鹅，鹅，鹅', '曲项向天歌', '白毛浮绿水', '红掌拨清波']),
    'jys':   ('静夜思', '李白', ['床前明月光', '疑是地上霜', '举头望明月', '低头思故乡']),
    'cx':    ('春晓', '孟浩然', ['春眠不觉晓', '处处闻啼鸟', '夜来风雨声', '花落知多少']),
    'mn':    ('悯农', '李绅', ['锄禾日当午', '汗滴禾下土', '谁知盘中餐', '粒粒皆辛苦']),
    'dgjl':  ('登鹳雀楼', '王之涣', ['白日依山尽', '黄河入海流', '欲穷千里目', '更上一层楼']),
    'cs':    ('池上', '白居易', ['小娃撑小艇', '偷采白莲回', '不解藏踪迹', '浮萍一道开']),
    'jx':    ('江雪', '柳宗元', ['千山鸟飞绝', '万径人踪灭', '孤舟蓑笠翁', '独钓寒江雪']),
    'wlsbp': ('望庐山瀑布', '李白', ['日照香炉生紫烟', '遥看瀑布挂前川', '飞流直下三千尺', '疑是银河落九天']),
    'zwl':   ('赠汪伦', '李白', ['李白乘舟将欲行', '忽闻岸上踏歌声', '桃花潭水深千尺', '不及汪伦送我情']),
    'jgsh':  ('绝句', '杜甫', ['两个黄鹂鸣翠柳', '一行白鹭上青天', '窗含西岭千秋雪', '门泊东吴万里船']),
    'hua':   ('画', '佚名', ['远看山有色', '近听水无声', '春去花还在', '人来鸟不惊']),
    'glyx':  ('古朗月行', '李白', ['小时不识月', '呼作白玉盘', '又疑瑶台镜', '飞在青云端']),
    'feng':  ('风', '李峤', ['解落三秋叶', '能开二月花', '过江千尺浪', '入竹万竿斜']),
    'xyze':  ('寻隐者不遇', '贾岛', ['松下问童子', '言师采药去', '只在此山中', '云深不知处']),
    'xich':  ('小池', '杨万里', ['泉眼无声惜细流', '树阴照水爱晴柔', '小荷才露尖尖角', '早有蜻蜓立上头']),
    'huaj':  ('画鸡', '唐寅', ['头上红冠不用裁', '满身雪白走将来', '平生不敢轻言语', '一叫千门万户开']),
    'yess':  ('夜宿山寺', '李白', ['危楼高百尺', '手可摘星辰', '不敢高声语', '恐惊天上人']),
    'meih':  ('梅花', '王安石', ['墙角数枝梅', '凌寒独自开', '遥知不是雪', '为有暗香来']),
    'xec':   ('小儿垂钓', '胡令能', ['蓬头稚子学垂纶', '侧坐莓苔草映身', '路人借问遥招手', '怕得鱼惊不应人']),
    'cunj':  ('村居', '高鼎', ['草长莺飞二月天', '拂堤杨柳醉春烟', '儿童散学归来早', '忙趁东风放纸鸢']),
    'yl':    ('咏柳', '贺知章', ['碧玉妆成一树高', '万条垂下绿丝绦', '不知细叶谁裁出', '二月春风似剪刀']),
    'cao':   ('草', '白居易', ['离离原上草', '一岁一枯荣', '野火烧不尽', '春风吹又生']),
    'xjc':   ('晓出净慈寺送林子方', '杨万里', ['毕竟西湖六月中', '风光不与四时同', '接天莲叶无穷碧', '映日荷花别样红']),
    'mnq':   ('悯农·其一', '李绅', ['春种一粒粟', '秋收万颗子', '四海无闲田', '农夫犹饿死']),
    'zys':   ('舟夜书所见', '查慎行', ['月黑见渔灯', '孤光一点萤', '微微风簇浪', '散作满河星']),
    'sjian': ('所见', '袁枚', ['牧童骑黄牛', '歌声振林樾', '意欲捕鸣蝉', '忽然闭口立']),
    'zlj':   ('赠刘景文', '苏轼', ['荷尽已无擎雨盖', '菊残犹有傲霜枝', '一年好景君须记', '最是橙黄橘绿时']),
    'shx':   ('山行', '杜牧', ['远上寒山石径斜', '白云生处有人家', '停车坐爱枫林晚', '霜叶红于二月花']),
    'sxg':   ('宿新市徐公店', '杨万里', ['篱落疏疏一径深', '树头新绿未成阴', '儿童急走追黄蝶', '飞入菜花无处寻']),
    'jj2':   ('绝句·迟日', '杜甫', ['迟日江山丽', '春风花草香', '泥融飞燕子', '沙暖睡鸳鸯']),
}
LIB_LINES = [ln for _, _, ls in POEMS.values() for ln in ls]
LIB_SET = set(LIB_LINES)
assert len(LIB_SET) == 120, '库 120 句应全互异'

LEVEL_POEMS = ['jys', 'cx', 'mn', 'glyx', 'hua', 'wlsbp', 'zwl', 'jgsh', 'xich', 'cunj',
               'yie', 'dgjl', 'cs', 'jx', 'cao']
FIVE = ['yie', 'jys', 'cx', 'mn', 'dgjl', 'cs', 'jx', 'hua', 'glyx', 'feng', 'xyze',
        'yess', 'meih', 'cao', 'mnq', 'zys', 'sjian', 'jj2']
SEVEN = ['wlsbp', 'zwl', 'jgsh', 'xich', 'huaj', 'xec', 'cunj', 'yl', 'xjc', 'zlj', 'shx', 'sxg']
ALLP = FIVE + SEVEN
COMPOSE = {
    1: [('F', 0), ('F', 1), ('F', 2), ('R', 3), ('R', 2)],
    2: [('F', 0), ('F', 1), ('F', 2), ('R', 3), ('R', 2)],
    3: [('F', 0), ('F', 1), ('F', 2), ('R', 3), ('O', None)],
    4: [('FF', None)] * 5,
}
def DISTRACT_N(dch, t):
    return 1 if t == 'O' else (3 if t == 'FF' else (2 if dch == 1 else 3))
FF_CHARS = ['飞', '春', '花']
FF_LINES = {c: [ln for ln in LIB_LINES if c in ln] for c in FF_CHARS}
assert all(len(v) >= 5 for v in FF_LINES.values()), '飞花令出题域应 ≥5'

# ---- Python 独立时长模型（SPEC §1-r13 常量与公式；与页面 levelDurMs 对账） ----
DECIDE = {'F': 9000, 'R': 10000, 'O': 11000, 'FF': 12000}
def est(n):
    return n * 345 + 600
def quiz_dur(m):
    if m['type'] == 'FF':
        cue_len = len('找一找有「' + m['char'] + '」字的诗句')
    else:
        cue_len = len(POEMS[m['pid']][2][m['cueIdx']])
    steps = sum(max((400 + est(cue_len) + 300) if k == 0 else 400, DECIDE[m['type']])
                for k in range(len(m['ans'])))
    return steps + 2000 + est(len(m['ans'][0])) + 400

def distract_of(m):
    dis = list(m['tiles'])
    for a in m['ans']:
        dis.remove(a)
    return dis

def audit_level(flat, dch, metas):
    """逐题独立审计（期望全部从本文件 REF 推导；metas=归一化题视图：
    type/cueIdx/pid/char/ans/tiles/title/author）"""
    bad = []
    lv = flat % 5
    if dch == 4:
        want_pid = None
    elif flat < 20:
        want_pid = LEVEL_POEMS[flat]
    else:
        pool = FIVE if dch == 1 else (SEVEN if dch == 2 else ALLP)
        want_pid = pool[flat % len(pool)]
    if dch == 1 and want_pid is not None and want_pid not in FIVE:
        bad.append('flat%d dch1 诗 %s 非五言池' % (flat, want_pid))
    if dch == 2 and want_pid is not None and want_pid not in SEVEN:
        bad.append('flat%d dch2 诗 %s 非七言池' % (flat, want_pid))
    for k, q in enumerate(metas):
        t, spec = COMPOSE[dch][k]
        if q['type'] != t:
            bad.append('flat%d q%d 型 %s!=%s' % (flat, k, q['type'], t)); continue
        if q['title'] != POEMS[q['pid']][0] or q['author'] != POEMS[q['pid']][1]:
            bad.append('flat%d q%d 题/作者≠库' % (flat, k))
        if t in ('F', 'R'):
            if q['cueIdx'] != spec:
                bad.append('flat%d q%d cueIdx=%s!=%s' % (flat, k, q['cueIdx'], spec)); continue
            want = q['cueIdx'] + 1 if t == 'F' else q['cueIdx'] - 1
            if q['pid'] != want_pid or q['ans'][0] != POEMS[want_pid][2][want]:
                bad.append('flat%d q%d 答案句≠诗库对应句' % (flat, k))
        elif t == 'O':
            if q['pid'] != want_pid or list(q['ans']) != POEMS[want_pid][2][1:]:
                bad.append('flat%d q%d O 答案三句≠库 li1-3' % (flat, k))
        else:  # FF：pid=答案句所属诗（跨诗），title/author 对该诗核对
            ch = FF_CHARS[(lv + k) % 3]
            if q['char'] != ch:
                bad.append('flat%d q%d 指定字 %s!=%s' % (flat, k, q['char'], ch))
            if q['ans'][0] not in FF_LINES[ch]:
                bad.append('flat%d q%d FF 答案句不含指定字/非库句' % (flat, k))
        # 干扰句规则（全型通用）
        dis = distract_of(q)
        if len(dis) != DISTRACT_N(dch, t):
            bad.append('flat%d q%d 干扰数 %d!=%d' % (flat, k, len(dis), DISTRACT_N(dch, t)))
        if len(set(q['tiles'])) != len(q['tiles']):
            bad.append('flat%d q%d 句卡重复' % (flat, k))
        if any(x not in LIB_SET for x in q['tiles']):
            bad.append('flat%d q%d 非库句卡' % (flat, k))
        if t == 'FF':
            if any(q['char'] in d for d in dis):
                bad.append('flat%d q%d FF 干扰句含指定字' % (flat, k))
        else:
            plines = POEMS[q['pid']][2]
            if any(d == plines[q['cueIdx']] for d in dis):
                bad.append('flat%d q%d 干扰=题面句' % (flat, k))
            if any(d in q['ans'] for d in dis):
                bad.append('flat%d q%d 干扰=答案句' % (flat, k))
            inpoem = [d for d in dis if d in plines]
            if t == 'O' and inpoem:
                bad.append('flat%d q%d O 干扰应为纯他诗句' % (flat, k))
            if t != 'O' and len(inpoem) != 1:
                bad.append('flat%d q%d 同诗干扰数 %d!=1' % (flat, k, len(inpoem)))
            others = [d for d in dis if d not in plines]
            if any(len(d) != len(q['ans'][0]) for d in others):
                bad.append('flat%d q%d 他诗干扰句长≠答案句' % (flat, k))
    # 同关 5 题互异（题型+诗+cue+指定字+答案句全同才算重复——严于源 sig）
    sigs = [(q['type'], q.get('pid'), q.get('cueIdx'), q.get('char'), tuple(q['ans'])) for q in metas]
    if len(set(sigs)) != 5:
        bad.append('flat%d 同关题重复' % flat)
    if dch == 4:
        ans5 = [q['ans'][0] for q in metas]
        if len(set(ans5)) != 5:
            bad.append('flat%d FF 答案句关内重复' % flat)
    return bad

async def solve_cur_pf(pg):
    """当前题全对推进：按答案序逐槽点对卡（cards 在题内不重排）；轮询关级 step+1/done"""
    q0 = await pg.evaluate('PF.quiz')
    if q0 is None:
        return None
    s0 = (await pg.evaluate('PF.currentLevel'))['step']
    for j in range(len(q0['slots'])):
        ti = q0['cards'].index(q0['slots'][j])
        await pg.evaluate('PF.tapCard(%d)' % ti)
        await pg.wait_for_timeout(150)
    for _ in range(90):
        await pg.wait_for_timeout(120)
        lv = await pg.evaluate('PF.currentLevel')
        if lv['done']:
            return None
        if lv['step'] == s0 + 1:
            return await pg.evaluate('PF.quiz')
    return 'STUCK'

def norm_quiz(q):
    """PF.quiz 钩子视图 → 归一化题 meta（与 P9 genLevel 直读同键名）"""
    return {'type': q['type'], 'cueIdx': q['cueIdx'], 'pid': q['pid'],
            'char': q['targetChar'], 'ans': q['slots'], 'tiles': q['cards'],
            'title': q['poem'], 'author': q['author']}

RESUME_SEED = ("(() => { const sv = KIDS._save(); sv.levels = {}; "
               "sv.poemfill = { tutSeen: true }; KIDS.store.persist(); })()")

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        title = ''
        for _ in range(240):                     # 等 VERIFY 自检跑完（时序教训）
            title = await pg.evaluate('document.title')
            if 'VERIFY' in title:
                break
            await pg.wait_for_timeout(500)
        rec('P-1 VERIFY 自检前置', 'VERIFY PASS' in title, 'title=%r' % title)
        await pg.wait_for_timeout(800)

        # P1 确定性（同 flat 双开题面一致）
        a = await pg.evaluate('PF.start(7), PF.quiz')
        bb = await pg.evaluate('PF.start(7), PF.quiz')
        rec('P1 确定性', a == bb, '')

        # P2-P4 静态 20 关真实通路逐题推进 + 独立审计
        allbad = []
        for flat in range(20):
            await pg.evaluate('PF.start(%d)' % flat)
            lv = await pg.evaluate('PF.currentLevel')
            dch = lv['dch']
            if flat < 15 and lv['pid'] != LEVEL_POEMS[flat]:
                allbad.append('flat%d 关诗 %s!=%s' % (flat, lv['pid'], LEVEL_POEMS[flat]))
            if flat >= 15 and lv['pid'] is not None:
                allbad.append('flat%d 飞花令关 pid 应空' % flat)
            if (flat // 5) % 4 + 1 != dch:
                allbad.append('flat%d 静态档 %s' % (flat, dch))
            metas = []
            for qi in range(5):
                q = await pg.evaluate('PF.quiz')
                if q is None:
                    allbad.append('flat%d q%d None' % (flat, qi)); break
                metas.append(norm_quiz(q))
                r = await solve_cur_pf(pg)
                if r == 'STUCK':
                    allbad.append('flat%d q%d 推进卡死' % (flat, qi))
            allbad.extend(audit_level(flat, dch, metas))
            if not (await pg.evaluate('PF.currentLevel'))['done']:
                allbad.append('flat%d 未通关' % flat)
        rec('P2 诗库双写对账+答案句=库对应句+关诗映射',
            not [x for x in allbad if '答案句' in x or '题/作者' in x or '关诗' in x
                 or '应空' in x or 'O 答' in x],
            [x for x in allbad if '答案句' in x or '题/作者' in x or '关诗' in x
             or '应空' in x or 'O 答' in x][:3])
        rec('P3 干扰句规则（同诗恰1+他诗同长+互异+库内+FF不含字）',
            not [x for x in allbad if '干扰' in x or '句卡重复' in x or '非库句' in x],
            [x for x in allbad if '干扰' in x or '句卡重复' in x or '非库句' in x][:3])
        rec('P4 章题构成+指定字轮换+同关互异+推进通关',
            not [x for x in allbad if '型 ' in x or 'cueIdx' in x or '指定字' in x
                 or '同关题重复' in x or '卡死' in x or 'None' in x or '未通关' in x
                 or '静态档' in x or 'FF 答' in x or '言池' in x],
            [x for x in allbad if '型 ' in x or 'cueIdx' in x or '指定字' in x
             or '同关题重复' in x or '卡死' in x or '未通关' in x][:3])
        rec('P0 页面零 pageerror', not errs, '%s' % errs[:2])

        # P5 入槽即判/退回/对选推进（flat0 单槽 F 题）
        await pg.evaluate('PF.start(0)')
        q = await pg.evaluate('PF.quiz')
        wrong_t = next(i for i, t in enumerate(q['cards']) if t not in q['slots'])
        m0 = q['miss']
        await pg.evaluate('PF.tapCard(%d)' % wrong_t)
        await pg.wait_for_timeout(400)
        q1 = await pg.evaluate('PF.quiz')
        ok_in = q1['built'][0] == q['cards'][wrong_t] and q1['miss'] == m0 + 1   # 单槽入槽即判
        await pg.evaluate('PF.tapBuilt(0)')
        await pg.wait_for_timeout(300)
        q2 = await pg.evaluate('PF.quiz')
        ok_out = all(x is None for x in q2['built']) and q2['miss'] == m0 + 1   # 退回=探索零计数
        right_t = q2['cards'].index(q2['slots'][0])
        await pg.evaluate('PF.tapCard(%d)' % right_t)
        await pg.wait_for_timeout(1200)
        ok_adv = (await pg.evaluate('PF.currentLevel'))['step'] == 1
        rec('P5 入槽即判/退回/对选推进', ok_in and ok_out and ok_adv,
            'in=%s out=%s adv=%s' % (ok_in, ok_out, ok_adv))

        # P6 重听=读题面句（TTS）+开场链单通道无整首朗读
        vlog = await pg.evaluate("""(() => {
          const log = [];
          KIDS.voice.play = k => log.push('P:' + k);
          KIDS.voice.queue = ps => log.push('Q:' + ps.join(','));
          KIDS.voice.say = t => log.push('S:' + t);
          PF.start(2);
          PF.hear();
          return { log: log, quiz: PF.quiz };
        })()""")
        await pg.wait_for_timeout(500)
        qz = vlog['quiz']
        cue_want = qz['lines'][qz['cueIdx']]
        rec('P6 重听说题面句+开场链单通道无整首',
            any(x == 'S:' + cue_want for x in vlog['log']) and
            not any('pf_poem_' in x for x in vlog['log']) and
            any(x == 'Q:pf_hint' for x in vlog['log']), '%s' % vlog['log'][:5])

        # P7 flat<3 每错必播 pf_wrong
        vlog3 = await pg.evaluate("""(() => {
          PF.start(1);
          const log = [];
          KIDS.voice.play = k => log.push('P:' + k);
          const q = PF.quiz;
          const w = q.cards.findIndex(t => !q.slots.includes(t));
          PF.tapCard(w);
          return log;
        })()""")
        await pg.wait_for_timeout(500)
        rec('P7 flat<3 错播 pf_wrong', any('pf_wrong' in x for x in vlog3), '%s' % vlog3[:3])

        # P9 40 关结构+时长独立复算（Python REF 常量公式 vs 页面 levelDurMs 逐关对账）
        dur_bad, dmin, dmin_flat = [], None, None
        for flat in range(40):
            row = await pg.evaluate("""(flat => {
              const L = genLevel(flat);
              return { dch: L.dch, modeled: levelDurMs(L),
                metas: L.quizzes.map(q => ({ type: q.type, cueIdx: q.cueIdx, pid: q.pid,
                  char: q.targetChar, ans: q.ans.slice(), tiles: q.tiles.slice(),
                  title: q.title, author: q.author })) };
            })(%d)""" % flat)
            for x in audit_level(flat, row['dch'], row['metas']):
                dur_bad.append('flat%d %s' % (flat, x))
            py_total = sum(quiz_dur(m) for m in row['metas'])
            if py_total != row['modeled']:
                dur_bad.append('flat%d 时长 %d!=%d' % (flat, py_total, row['modeled']))
            if dmin is None or py_total < dmin:
                dmin, dmin_flat = py_total, flat
        rec('P9 40 关结构+时长独立复算（最低 %d@flat%d）' % (dmin, dmin_flat),
            not dur_bad and dmin == 70625 and dmin >= 40000, dur_bad[:3])

        await ctx.close()

        # P8 救援 14s 计数（真实页；seed tutSeen 跳教学防 PF.start 被 demo 态拒绝）
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs2 = []
        pg.on('pageerror', lambda e: errs2.append(str(e)))
        await pg.goto('file:///' + (BASE / 'poemfill' / 'index.html').as_posix())
        await pg.wait_for_timeout(1500)
        await pg.evaluate(RESUME_SEED)
        await pg.reload()
        await pg.wait_for_timeout(2000)
        r0 = await pg.evaluate('PF.rescues')
        await pg.evaluate('PF.start(1)')
        await pg.wait_for_timeout(16500)
        r1 = await pg.evaluate('PF.rescues')
        rec('P8 救援 14s 计数（真实页）', r1 >= r0 + 1 and not errs2,
            'rescues=%s→%s errs=%s' % (r0, r1, errs2[:1]))
        await ctx.close()
        await b.close()
    print('')
    print('TOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
