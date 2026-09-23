# -*- coding: utf-8 -*-
"""batch13 · money 零钱管家（r15：数字键盘找零版）独立复验（不信 agent 自报，读实际产物）
①verify title+clips36(33 men+core3) ②钩子 MN 契约(r15 字段族含 digits/jiao/answer)
③mulberry32+四题型生成器 Python 全量复刻对账(flat0-39 逐题投影相等)
③b SPEC §1 r15 独立域审计(池/热身/角位奇偶/两件合计/最少解币数 DP/可凑性 DP/相邻价不同)
③c Python 复算 40 关 modeled 时长：最低=86900@flat10 精确防回漂
④真实通关 flat0(凑钱含角,先错一次=2星)/flat5(买两件)/flat10(键盘打字)/flat15(ch4 5角键)
⑤键盘 miss 语义(错确认计一次/空确认同口径/不灰化可调整)+sayW 两错两条
⑥救援 14s(键盘阶梯 breathe)+错确认不重置 ⑦教学吞输入+重玩门 ⑧双 viewport ⑨离线+截图+clips 对账"""
import asyncio, io, os, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(os.path.dirname(os.path.abspath(__file__)))
PASS, FAIL = [], []


def rec(name, ok, detail=''):
    (PASS if ok else FAIL).append(name)
    # r15：即时 flush——连跑负载下被 driver 捕获时 FAIL 行不丢（两轮 tail 被 stderr warning 遮蔽教训）
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, detail), flush=True)


HOOK = """(() => {
  window.__vlog = [];
  const _p = KIDS.voice.play.bind(KIDS.voice);
  KIDS.voice.play = (k, t) => { window.__vlog.push('P:' + k); return _p(k, t); };
  const _q = KIDS.voice.queue.bind(KIDS.voice);
  KIDS.voice.queue = parts => { window.__vlog.push('Q:' + parts.map(p => typeof p === 'string' ? p : 'K:' + p.key).join(',')); return _q(parts); };
  const _s = KIDS.voice.say.bind(KIDS.voice);
  KIDS.voice.say = t => { window.__vlog.push('T:' + String(t).slice(0, 6)); return _s(t); };
  const _a = KIDS.audio.sfx.bind(KIDS.audio);
  KIDS.audio.sfx = n => { window.__vlog.push('S:' + n); return _a(n); };
  return true;
})()"""

SEED = """const sv = KIDS._save() || { levels: {} };
  for (let i = 0; i < n; i++) sv.levels[(Math.floor(i/5)+1)+'-'+(i%5)] = { stars: 3 };
  sv.money = { tutSeen: true };
  if (n >= 10) KIDS.calendar.bonusSet(10);
  KIDS.store.persist();"""

# ================= Python 独立复刻：mulberry32（32 位补码）+ 四题型生成器 =================
def _i32(x):
    x &= 0xFFFFFFFF
    return x - 0x100000000 if x >= 0x80000000 else x


def mulberry32(a):
    a = _i32(a)

    def rnd():
        nonlocal a
        a = _i32(a + 0x6D2B79F5)
        t = _i32(_i32(a ^ ((a & 0xFFFFFFFF) >> 15)) * _i32(a | 1))          # imul(a^a>>>15, 1|a)
        u = _i32(t ^ ((t & 0xFFFFFFFF) >> 7))
        w = _i32((t & 0xFFFFFFFF) | 61)
        t = _i32(_i32(t + _i32(u * w)) ^ t)                                  # t + imul(t^t>>>7, 61|t) ^ t
        y = _i32(t ^ ((t & 0xFFFFFFFF) >> 14))
        return (y & 0xFFFFFFFF) / 4294967296
    return rnd


def shuffled(arr, rnd):
    a = list(arr)
    for i in range(len(a) - 1, 0, -1):
        j = int(rnd() * (i + 1))
        a[i], a[j] = a[j], a[i]
    return a


def ri(rnd, lo, hi):
    return lo + int(rnd() * (hi - lo + 1))


def pick(rnd, arr):
    return arr[int(rnd() * len(arr))]


CH_LEN, STATIC_LEVELS = 5, 20
G1_HALF_POOL = [5, 7, 11, 13, 15]
G1_INT_POOL = [6, 8, 12, 14, 16]
PAIR_SPLIT_POOL = [16, 17, 18, 20, 21, 22, 23, 24, 25, 26, 30, 31, 32, 33, 34]
PAIR_TEN_POOL = [24, 25, 26, 27, 28, 30, 31, 32, 33, 34]


def pick_price(rnd, pool, used, avoid):
    p = [v for v in pool if v not in used and v != avoid]
    if not p:
        p = [v for v in pool if v != avoid]
    if not p:
        p = list(pool)
    return pick(rnd, p)


def cap_coins(coins, max_n, max_sum):
    while len(coins) > max_n or sum(coins) > max_sum:
        if len(coins) <= 1:
            break
        coins.pop()


def finish_gather(price, coins, rnd):
    extra = ri(rnd, 0, 2)
    for _ in range(extra):
        coins.append(pick(rnd, [1, 2, 10]))
    cap_coins(coins, 7, 40)
    while len(coins) < 3:
        coins.append(pick(rnd, [1, 2, 10]))
    return {'kind': 'gather', 'price': price, 'coins': shuffled(coins, rnd),
            'priceA': None, 'priceB': None, 'pay': None, 'ans': None, 'warm': False}


def base_coins(p):
    coins = []
    if p >= 10:
        coins.append(10)
    r = p - (10 if p >= 10 else 0)
    while r >= 2:
        coins.append(2)
        r -= 2
    if r == 1:
        coins.append(1)
    return coins


def gen_gather_half(rnd, used, avoid, want_half):
    pool = G1_HALF_POOL if want_half else G1_INT_POOL
    price = pick_price(rnd, pool, used, avoid)
    return finish_gather(price, base_coins(price), rnd)


def split_two(rnd, T):
    lo, hi = max(5, T - 19), min(19, T - 5)
    a = ri(rnd, lo, hi)
    return [a, T - a]


def finish_pair(T, coins, rnd):
    q = finish_gather(T, coins, rnd)
    q['kind'] = 'pair'
    ab = split_two(rnd, T)
    q['priceA'], q['priceB'] = ab
    return q


def gen_pair_split(rnd, used, avoid):
    T = pick_price(rnd, PAIR_SPLIT_POOL, used, avoid)
    coins = []
    k = min(T // 10, 3)
    coins.extend([10] * k)
    r = T - k * 10
    while r >= 2:
        coins.append(2)
        r -= 2
    if r == 1:
        coins.append(1)
    if ri(rnd, 0, 1):
        coins.append(pick(rnd, [1, 2, 10]))
    return finish_pair(T, coins, rnd)


def gen_pair_ten(rnd, used, avoid):
    T = pick_price(rnd, PAIR_TEN_POOL, used, avoid)
    coins = [20]
    r = T - 20
    if r >= 10:
        coins.append(10)
        r -= 10
    while r >= 2:
        coins.append(2)
        r -= 2
    if r == 1:
        coins.append(1)
    if ri(rnd, 0, 1):
        coins.append(pick(rnd, [1, 2, 10]))
    return finish_pair(T, coins, rnd)


def gen_change_whole(rnd, used, avoid):
    pay = 20 if rnd() < .5 else 40
    pool = [6, 8, 10, 12, 14, 16] if pay == 20 else [6 + i * 2 for i in range(16)]
    price = pick_price(rnd, pool, used, avoid)
    return {'kind': 'jiao' if price % 2 == 1 else 'change', 'price': price, 'coins': None,
            'priceA': None, 'priceB': None, 'pay': pay, 'ans': pay - price, 'warm': False}


def gen_change_jiao(rnd, used, avoid):
    pay = 20 if rnd() < .5 else 40
    price = pick_price(rnd, [5, 7, 9, 11, 13, 15, 17], used, avoid)
    return {'kind': 'jiao' if price % 2 == 1 else 'change', 'price': price, 'coins': None,
            'priceA': None, 'priceB': None, 'pay': pay, 'ans': pay - price, 'warm': False}


def gen_one(dch, qi, rnd, used, avoid):
    if dch == 1:
        q = gen_gather_half(rnd, used, avoid, qi % 2 == 0)
    elif dch == 2:
        q = gen_gather_half(rnd, used, avoid, True) if qi == 0 else (
            gen_pair_split(rnd, used, avoid) if qi <= 2 else gen_pair_ten(rnd, used, avoid))
    elif dch == 3:
        q = gen_change_whole(rnd, used, avoid)
    else:
        q = gen_change_whole(rnd, used, avoid) if qi == 0 else gen_change_jiao(rnd, used, avoid)
    q['warm'] = qi == 0 and dch in (2, 4)
    return q


def gen_level_py(flat):
    ch, lv = flat // CH_LEN + 1, flat % CH_LEN
    rnd = mulberry32(flat * 7919 + 13)
    dch = (ch - 1) % 4 + 1 if flat < STATIC_LEVELS else ri(rnd, 1, 4)
    used, avoid, quizzes = [], -1, []
    for qi in range(CH_LEN):
        q = gen_one(dch, qi, rnd, used, avoid)
        used.append(q['price'])
        avoid = q['price']
        quizzes.append(q)
    return {'dch': dch, 'quizzes': quizzes}


# ================= SPEC §1 r15 独立域审计 + modeled 时长复算（Python 侧） =================
def can_reach(avail, target):
    if target < 0:
        return False
    dp = [False] * (target + 1)
    dp[0] = True
    for v in avail:
        for t in range(target, v - 1, -1):
            if dp[t - v]:
                dp[t] = True
    return dp[target]


def min_coins(avail, target):
    INF = 99
    if target < 0:
        return INF
    dp = [INF] * (target + 1)
    dp[0] = 0
    for v in avail:
        for t in range(target, v - 1, -1):
            if dp[t - v] + 1 < dp[t]:
                dp[t] = dp[t - v] + 1
    return dp[target]


def spec_range_ok(dch, qi, q):
    if q['kind'] in ('gather', 'pair'):
        P = q['price']
        if not (3 <= len(q['coins']) <= 7) or sum(q['coins']) < P:
            return False
        if q['kind'] == 'gather':
            if dch != 1 and not (dch == 2 and qi == 0):
                return False
            half = P % 2 == 1
            if P not in (G1_HALF_POOL if half else G1_INT_POOL):
                return False
            if any(v not in (1, 2, 10) for v in q['coins']):
                return False
            if dch == 1 and ((qi % 2 == 0) != half):
                return False
            return min_coins(q['coins'], P) <= 4 and can_reach(q['coins'], P)
        if dch != 2 or qi == 0:
            return False
        if q['priceA'] + q['priceB'] != P or not (5 <= q['priceA'] <= 19) or not (5 <= q['priceB'] <= 19):
            return False
        has_ten = 20 in q['coins']
        if P not in (PAIR_TEN_POOL if has_ten else PAIR_SPLIT_POOL):
            return False
        if (qi <= 2) == has_ten:      # qi1/2 拆型无 10 元币 / qi3/4 含 10 元币
            return False
        return min_coins(q['coins'], P) <= 5 and can_reach(q['coins'], P)
    if q['kind'] == 'change':
        if dch != 3 and not (dch == 4 and qi == 0):
            return False
        if q['pay'] not in (20, 40) or q['price'] % 2 != 0 or not (6 <= q['price'] <= 36):
            return False
        if q['pay'] == 20 and q['price'] > 16:
            return False
        return q['ans'] == q['pay'] - q['price'] and 4 <= q['ans'] <= 34
    if q['kind'] == 'jiao':
        if dch != 4 or qi == 0:
            return False
        if q['pay'] not in (20, 40) or q['price'] % 2 != 1 or not (5 <= q['price'] <= 17):
            return False
        if q['ans'] != q['pay'] - q['price']:
            return False
        if q['pay'] == 20 and not (3 <= q['ans'] <= 15):
            return False
        if q['pay'] == 40 and not (23 <= q['ans'] <= 35):
            return False
        return True
    return False


def want_kind(dch, qi):
    if dch == 1:
        return 'gather'
    if dch == 2:
        return 'gather' if qi == 0 else 'pair'
    if dch == 3:
        return 'change'
    return 'change' if qi == 0 else 'jiao'


NUM_CN = [ '零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三',
           '十四', '十五', '十六', '十七', '十八', '十九', '二十']
V_TXT = {'qbuy': '买', 'qbuy2': '元的东西，点出正好的钱', 'buyj': '元五角的东西，点出正好的钱',
         'and': '元的和', 'andj': '元五角的和', 'qpay': '付了', 'qpay2': '元，买',
         'qpay3': '元的东西，找回几元呀', 'qjiao': '元五角的东西，找回几元呀'}
V_DECIDE = {'gather': 12000, 'pair': 15000, 'change': 13000, 'jiao': 16000}


def v_speech(q):
    if q['kind'] == 'gather':
        h = q['price'] % 2 == 1
        return V_TXT['qbuy'] + NUM_CN[(q['price'] - (1 if h else 0)) // 2] + (V_TXT['buyj'] if h else V_TXT['qbuy2'])
    if q['kind'] == 'pair':
        ha, hb = q['priceA'] % 2 == 1, q['priceB'] % 2 == 1
        return (V_TXT['qbuy'] + NUM_CN[(q['priceA'] - (1 if ha else 0)) // 2] + (V_TXT['andj'] if ha else V_TXT['and']) +
                NUM_CN[(q['priceB'] - (1 if hb else 0)) // 2] + (V_TXT['buyj'] if hb else V_TXT['qbuy2']))
    h = q['price'] % 2 == 1
    return (V_TXT['qpay'] + NUM_CN[q['pay'] // 2] + V_TXT['qpay2'] +
            NUM_CN[(q['price'] - (1 if h else 0)) // 2] + (V_TXT['qjiao'] if h else V_TXT['qpay3']))


def v_n_input(q):
    if q['kind'] in ('gather', 'pair'):
        return min_coins(q['coins'], q['price'])
    return len(str(q['ans'] // 2)) + (1 if q['kind'] == 'jiao' else 0)


def v_level_ms(L):
    return sum(max(400 + (len(v_speech(q)) * 345 + 600) + 300, V_DECIDE[q['kind']]) +
               v_n_input(q) * 1500 + 2000 + 880 for q in L['quizzes'])


async def newpage(b, n, vp={'width': 1280, 'height': 800}, verify=False, delay=1500):
    ctx = await b.new_context(viewport=vp)
    pg = await ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto('file:///' + (BASE / 'money' / 'index.html').as_posix() + ('?verify=1' if verify else ''))
    await pg.wait_for_timeout(delay)
    if n is not None:
        await pg.evaluate('(n) => {%s}' % SEED, n)
        await pg.reload()
        await pg.wait_for_timeout(delay)
    return ctx, pg, errs


SUBSET_JS = """(a) => {
  const coins = a[0], price = a[1];
  const pick = new Array(coins.length).fill(false);
  const rec = (i, s) => {
    if (s === price) return true;
    if (i >= coins.length || s > price) return false;
    pick[i] = true; if (rec(i + 1, s + coins[i])) return true;
    pick[i] = false; return rec(i + 1, s);
  };
  rec(0, 0); return pick;
}"""


async def drive_gather(pg):
    """真实点币凑价+提交（gather/pair 共用，半元整数对账）"""
    clicks = 0
    for _ in range(30):
        q = await pg.evaluate('MN.quiz')
        if not q or q['kind'] not in ('gather', 'pair'):
            return clicks
        pick = await pg.evaluate(SUBSET_JS, ([[int(c * 2) for c in q['coins']], int(q['price'] * 2)]))
        for i, use in enumerate(pick):
            if not use:
                continue
            await pg.locator('.coin[data-i="%d"]' % i).first.click(force=True)
            clicks += 1
            await pg.wait_for_timeout(300)
        await pg.locator('#pay-btn').click(force=True)
        clicks += 1
        await pg.wait_for_timeout(950)
    raise RuntimeError('gather 30 轮未完成')


async def type_and_confirm(pg, q, skip_jiao=False, wrong=False):
    """真实键盘：清空→元位数字→（带角题）5 角键→算好啦；wrong=True 键入恒错的一位数字"""
    await pg.locator('.key[data-k="clr"]').first.click(force=True)
    await pg.wait_for_timeout(120)
    if wrong:
        wd = '8' if str(int(q['answer']))[0] == '9' else '9'      # 域 ≤17：非前缀恒错
        await pg.locator('.key[data-k="%s"]' % wd).first.click(force=True)
        await pg.wait_for_timeout(120)
    else:
        for ch in str(int(q['answer'])):
            await pg.locator('.key[data-k="%s"]' % ch).first.click(force=True)
            await pg.wait_for_timeout(120)
        if q['kind'] == 'jiao' and not skip_jiao:
            await pg.locator('#jiao-chip').first.click(force=True)
            await pg.wait_for_timeout(120)
    await pg.locator('#confirm-btn').first.click(force=True)


async def play_level(pg):
    """真实点击通关整关（gather/pair 贪心子集点币；change/jiao 键盘打字）"""
    clicks = 0
    for _ in range(60):
        q = await pg.evaluate('MN.quiz')
        if not q:
            break
        if q['kind'] in ('gather', 'pair'):
            clicks += await drive_gather(pg)
        else:
            await type_and_confirm(pg, q)
            clicks += 1
            await pg.wait_for_timeout(950)
    return clicks


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()

        # ① verify title + clips
        ctx, pg, errs = await newpage(b, None, verify=True)
        title = ''
        for _ in range(25):
            title = await pg.title()
            if 'VERIFY' in title:
                break
            await pg.wait_for_timeout(1000)
        rec('M1 verify title', 'VERIFY PASS' in title and 'FAIL' not in title, title + ' errs=%s' % errs[:1])
        nclips = await pg.evaluate('Object.keys(KIDS.voice.clips).length')
        n_men = await pg.evaluate("Object.keys(KIDS.voice.clips).filter(k => k.indexOf('men_') === 0).length")
        rec('M1b clips 注入(men33+core3=36)', nclips >= 36 and n_men == 33,
            'clips=%d men=%d' % (nclips, n_men))
        await ctx.close()

        # ③ mulberry32+生成器 Python 全量复刻对账 + ③b SPEC 域审计 + ③c modeled 时长
        ctx, pg, errs = await newpage(b, None, delay=800)
        proj_bad, spec_bad, kind_bad, warm_bad, adj_bad = [], [], [], [], []
        d_min, d_flat = None, -1
        for flat in range(40):
            Ljs = await pg.evaluate("""(f) => { const L = genLevel(f); return { dch: L.dch,
              quizzes: L.quizzes.map(q => ({ kind: q.kind, price: q.price,
                coins: (q.kind === 'gather' || q.kind === 'pair') ? q.coins : null,
                priceA: q.priceA !== undefined ? q.priceA : null,
                priceB: q.priceB !== undefined ? q.priceB : null,
                pay: q.pay !== undefined ? q.pay : null,
                ans: q.ans !== undefined ? q.ans : null, warm: q.warm })) }; }""", flat)
            Lpy = gen_level_py(flat)
            if Ljs != Lpy:
                proj_bad.append((flat, Ljs['dch'], Lpy['dch']))
            prev = -1
            for qi, q in enumerate(Lpy['quizzes']):
                if q['kind'] != want_kind(Lpy['dch'], qi):
                    kind_bad.append((flat, qi))
                if not spec_range_ok(Lpy['dch'], qi, q):
                    spec_bad.append((flat, qi, q['kind']))
                want_warm = qi == 0 and Lpy['dch'] in (2, 4)
                if q['warm'] != want_warm:
                    warm_bad.append((flat, qi))
                if q['price'] == prev:
                    adj_bad.append((flat, qi))
                prev = q['price']
            d = v_level_ms(Lpy)
            if d_min is None or d < d_min:
                d_min, d_flat = d, flat
        n_q = sum(len(gen_level_py(f)['quizzes']) for f in range(40))
        rec('M3 Python 复刻 genLevel 40 关逐题对账', not proj_bad and not errs,
            'bad=%s errs=%s' % (proj_bad[:3], errs[:1]))
        rec('M3b SPEC §1 r15 域审计(200 题)', not spec_bad and not kind_bad and not warm_bad and
            not adj_bad and n_q == 200,
            'spec=%s kind=%s warm=%s adj=%s n=%d' % (spec_bad[:3], kind_bad[:3], warm_bad[:3], adj_bad[:3], n_q))
        rec('M3c Python 复算 modeled 最低=86900@flat10', d_min == 86900 and d_flat == 10 and d_min >= 40000,
            'min=%s@%s' % (d_min, d_flat))
        await ctx.close()

        # ② 钩子契约（flat0 gather）
        ctx, pg, errs = await newpage(b, 0, delay=2600)
        hk = await pg.evaluate("""(() => ({ has: !!window.MN, coin: typeof MN.tapCoin, tray: typeof MN.tapTray,
          ok: typeof MN.tapOK, key: typeof MN.tapKey, conf: typeof MN.tapConfirm,
          auto: typeof MN.autoSolve, rescues: typeof (Object.getOwnPropertyDescriptor(MN, 'rescues').get) }))()""")
        q = await pg.evaluate('MN.quiz')
        contract = q and q['kind'] == 'gather' and all(k in q for k in (
            'kind,price,priceA,priceB,pay,coins,tray,sum,digits,jiao,answer,step,miss'.split(',')))
        rec('M2 钩子 MN 契约(r15 字段族)', all(hk.values()) and contract,
            'hk=%s contract=%s' % (hk, bool(contract)))

        # ④a flat0：先错一次（空篮提交=miss+零惩罚可调整）再通关=2 星
        await pg.locator('#pay-btn').click(force=True)
        await pg.wait_for_timeout(800)
        st = await pg.evaluate("""() => { const x = MN.quiz; return { miss: x.miss, retries: MN.currentLevel.retries,
          step: MN.currentLevel.step, wig: document.getElementById('basket').classList.contains('wig'),
          pe: getComputedStyle(document.querySelector('#coin-tray .coin:not(.gone)')).pointerEvents !== 'none' }; }""")
        rec('M4a 空篮提交=miss 晃动零惩罚', st['miss'] == 1 and st['retries'] == 1 and st['step'] == 0 and
            st['wig'] and st['pe'], str(st))
        clicks = await play_level(pg)
        await pg.wait_for_timeout(6200)
        stars = await pg.evaluate("(KIDS._save().levels['1-0'] || {}).stars || 0")
        rec('M4b 真实通关 flat0(凑钱含角)', stars == 2 and not errs,
            'clicks=%d stars=%s errs=%s' % (clicks, stars, errs[:1]))
        await ctx.close()

        # ④b flat5(ch2 买两件) / flat10(ch3 键盘) / flat15(ch4 5 角键)
        for n, key, tag in ((5, '2-0', '买两件'), (10, '3-0', '键盘找零'), (15, '4-0', '带角找零')):
            ctx, pg, errs = await newpage(b, n, delay=2600)
            clicks = await play_level(pg)
            await pg.wait_for_timeout(6200)
            stars = await pg.evaluate("(KIDS._save().levels['%s'] || {}).stars || 0" % key)
            rec('M4c 真实通关 flat%d(%s)' % (n, tag), stars == 3 and not errs,
                'clicks=%d stars=%s errs=%s' % (clicks, stars, errs[:1]))
            await ctx.close()

        # ⑤ 键盘 miss 语义 + sayW（flat10：错确认→空确认→正确推进；两错两条语音）
        ctx, pg, errs = await newpage(b, 10, delay=2600)
        await pg.evaluate(HOOK)
        await pg.wait_for_timeout(600)
        await pg.evaluate('window.__vlog = []')
        q = await pg.evaluate('MN.quiz')
        await type_and_confirm(pg, q, wrong=True)         # 错确认 1（恒错一位数字）
        await pg.wait_for_timeout(1200)
        st1 = await pg.evaluate("""() => { const x = MN.quiz; return { miss: x.miss, retries: MN.currentLevel.retries,
          step: MN.currentLevel.step, wig: document.getElementById('ans-display').classList.contains('wig'),
          pe: getComputedStyle(document.querySelector('.key[data-k=\\'1\\']')).pointerEvents !== 'none' }; }""")
        v1 = await pg.evaluate("window.__vlog.filter(x => x === 'P:men_wrong').length")
        await pg.locator('.key[data-k="clr"]').first.click(force=True)   # 清空→空输入确认
        await pg.wait_for_timeout(300)
        await pg.locator('#confirm-btn').first.click(force=True)         # 错确认 2（空输入同口径）
        await pg.wait_for_timeout(1200)
        st2 = await pg.evaluate('(MN.quiz ? MN.quiz.miss : -1)')
        v2 = await pg.evaluate("window.__vlog.filter(x => x === 'P:men_wrong').length")
        await type_and_confirm(pg, await pg.evaluate('MN.quiz'))         # 正确→推进
        await pg.wait_for_timeout(1200)
        st3 = await pg.evaluate('(MN.quiz ? MN.quiz.step : -1)')
        rec('M5 键盘 miss 语义(错/空确认各计一次·不灰化可调整)',
            st1['miss'] == 1 and st1['retries'] == 1 and st1['step'] == 0 and st1['wig'] and st1['pe'] and
            st2 == 2 and st3 > 0, 'st1=%s st2=%s step->%s' % (st1, st2, st3))
        rec('M5b sayW 两错两条(flat≥3 miss=2 force)', v1 == 1 and v2 == 2, 'v1=%d v2=%d' % (v1, v2))
        await ctx.close()

        # ⑥ 救援：键盘期静置 14s→正确键 breathe+重读题面；错确认不重置
        ctx, pg, errs = await newpage(b, 10, delay=3200)
        await pg.evaluate(HOOK)
        await pg.evaluate('window.__vlog = []')
        vis, resc, rqs = False, 0, []
        for _ in range(22):
            vis = await pg.evaluate("!!document.querySelector('.key.breathe, #confirm-btn.breathe, #ans-display.breathe')")
            resc = await pg.evaluate('MN.rescues')
            rqs = await pg.evaluate("window.__vlog.filter(x => x.indexOf('Q:men_') === 0)")
            if vis and resc >= 1 and rqs:
                break
            await pg.wait_for_timeout(1000)
        rec('M6 救援(键盘阶梯 breathe+重读题面 queue)', vis and resc >= 1 and bool(rqs) and not errs,
            'vis=%s rescues=%s q=%s' % (vis, resc, rqs[:1]))
        await pg.evaluate('window.__vlog = []')
        resc0 = await pg.evaluate('MN.rescues')
        q = await pg.evaluate('MN.quiz')
        await type_and_confirm(pg, q, wrong=True)         # 错确认（不重置救援钟）
        await pg.wait_for_timeout(500)
        resc2, vis2 = resc0, False
        for _ in range(20):
            await pg.wait_for_timeout(1000)
            resc2 = await pg.evaluate('MN.rescues')
            vis2 = await pg.evaluate("!!document.querySelector('.key.breathe, #confirm-btn.breathe')")
            if resc2 > resc0 and vis2:
                break
        rec('M6b 错确认不重置救援钟(救援再次触发)', resc2 > resc0 and vis2 and not errs,
            'rescues=%s->%s vis=%s' % (resc0, resc2, vis2))
        await ctx.close()

        # ⑦ 教学吞输入 + 重玩门
        ctx, pg, errs = await newpage(b, None, delay=800)
        await pg.evaluate(HOOK)
        tut = await pg.evaluate('MN.tutorial')
        pops0 = await pg.evaluate("window.__vlog.filter(x => x === 'S:pop').length")
        tray0 = await pg.evaluate('(MN.quiz ? MN.quiz.tray.length : -1)')
        await pg.locator('.coin').first.click(force=True)
        await pg.wait_for_timeout(600)
        pops1 = await pg.evaluate("window.__vlog.filter(x => x === 'S:pop').length")
        tray1 = await pg.evaluate('(MN.quiz ? MN.quiz.tray.length : -1)')
        rec('M7 教学期点击被吞+轻叮', tut == 'watch' and tray1 == tray0 and pops1 > pops0,
            'tut=%s tray=%s->%s pops+%d' % (tut, tray0, tray1, pops1 - pops0))
        await pg.locator('#btn-replay').dispatch_event('pointerdown')
        seen = False
        for _ in range(18):
            await pg.wait_for_timeout(1000)
            seen = await pg.evaluate("!!(KIDS._save().money && KIDS._save().money.tutSeen)")
            if seen:
                break
        rec('M7b 教学窗重玩门', seen and not errs, 'seen=%s errs=%s' % (seen, errs[:1]))
        await ctx.close()

        # ⑧ 双 viewport：gather 期币 ≥64 / 键盘期键 ≥64+显示与确认 ≥96 + 无 <64 按钮 + ox==0
        for vp in ({'width': 1280, 'height': 800}, {'width': 800, 'height': 1180}):
            ctx, pg, errs = await newpage(b, 0, vp=vp, delay=2200)
            m = await pg.evaluate("""(() => {
              const de = document.documentElement;
              const coins = [...document.querySelectorAll('#coin-tray .coin')].map(e => e.getBoundingClientRect());
              const cMin = coins.length ? Math.min(...coins.map(r => Math.min(r.width, r.height))) : 0;
              const small = [...document.querySelectorAll('button')].filter(e => {
                if (e.classList.contains('k-parentbtn')) return false;
                const b = e.getBoundingClientRect();
                return b.width > 4 && b.height > 4 && Math.min(b.width, b.height) < 64;
              }).length;
              const pay = document.querySelector('#pay-btn');
              return { ox: de.scrollWidth - de.clientWidth, n: coins.length, cMin: Math.round(cMin),
                       small: small, payOk: !!pay && pay.getBoundingClientRect().height >= 96 };
            })()""")
            await pg.evaluate('startLevel(10)')          # 键盘期量测（真实关状态）
            await pg.wait_for_timeout(1400)
            k = await pg.evaluate("""(() => {
              const keys = [...document.querySelectorAll('#keypad .key')].map(e => e.getBoundingClientRect());
              const kMin = keys.length ? Math.min(...keys.map(r => Math.min(r.width, r.height))) : 0;
              const disp = document.querySelector('#ans-display'), conf = document.querySelector('#confirm-btn');
              return { n: keys.length, kMin: Math.round(kMin), shown: document.getElementById('keypad').classList.contains('show'),
                       dispOk: !!disp && disp.getBoundingClientRect().height >= 96,
                       confOk: !!conf && conf.getBoundingClientRect().height >= 96 };
            })()""")
            rec('M8 viewport %dx%d' % (vp['width'], vp['height']),
                m['ox'] == 0 and m['n'] >= 3 and m['cMin'] >= 64 and m['small'] == 0 and m['payOk'] and
                k['n'] == 12 and k['kMin'] >= 64 and k['shown'] and k['dispOk'] and k['confOk'] and not errs,
                'gather=%s kb=%s' % (m, k))
            await ctx.close()

        # ⑨ 离线+截图+data:audio 对账
        ctx, pg, errs = await newpage(b, 5)
        src = await pg.evaluate('document.documentElement.outerHTML')
        rec('M9a 离线断言', 'http://' not in src.replace('http://www.w3.org', '') and 'https://' not in src, '')
        import statistics
        from PIL import Image
        shot = await pg.screenshot()
        img = Image.open(io.BytesIO(shot)).convert('L')
        sd = statistics.pstdev(list(img.resize((160, 100)).getdata()))
        rec('M9b 截图非空白', sd > 5, 'stdev=%.1f' % sd)
        await ctx.close()
        html = (BASE / 'money' / 'index.html').read_text(encoding='utf-8')
        n_audio = html.count('data:audio')
        rec('M9c 语音注入对账(36 data:audio)', n_audio == 36, 'audio=%d' % n_audio)

        await b.close()
    print('')
    print('TOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    if FAIL:
        print('FAIL-UNITS: ' + ' | '.join(FAIL), flush=True)   # r15：FAIL 单元清单置尾（driver tail 必见）
    sys.exit(0 if not FAIL else 1)


asyncio.run(main())
