# -*- coding: utf-8 -*-
"""batch36 分龄试玩公共件（b35 口径）：独立 chromium + 真实写档 + 语音链在 Audio/TTS 层捕获
（不改任何游戏对象——KIDS.voice 替换会触发 playwright 管道挂起，实证 2026-09-12）
禁 analyze_image；截图仅作像素统计辅助。禁写 .last_artifact。"""
import asyncio, json, math, random, re, sys, time
from datetime import date
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(r'F:/claudecode/projects/active/kids-games/batch36')
TODAY = date.today().isoformat()

# 无头页被 Windows 判遮挡→~5min 后 timer 节流/页面冻结→Runtime.evaluate 永久挂起
# （py-spy 实证：事件循环活着、裸 await 永等 CDP 响应；tictac ~8min 卡/探针短跑全活）
LAUNCH_ARGS = ['--mute-audio', '--disable-background-timer-throttling',
               '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding',
               '--disable-features=IntensiveWakeUpThrottling,CalculateNativeWinOcclusion']

# ---------- 页内注入（t=0 起）：Audio 构造器捕获 + speechSynthesis 捕获 + Date.now 偏移 ----------
INIT_JS = r"""
(() => {
  window.__ttsLog = [];   // {text, t}
  window.__audioLog = []; // {src, t}
  const OA = window.Audio;
  function WA(src) {
    const a = new OA(src);
    try { if (typeof src === 'string' && src) window.__audioLog.push({ src: src.slice(0, 120), t: performance.now() }); } catch (e) {}
    /* headless 自动播放策略会拒 play()→onended 永不触发→queue 拼播链停在第1段。
       合成 ended（80ms）保链形态可捕获；游戏等待窗全为固定常数不受影响 */
    try {
      a.play = function () {
        try { setTimeout(() => { try { a.dispatchEvent(new Event('ended')); } catch (e) {} }, 80); } catch (e) {}
        return Promise.resolve();
      };
    } catch (e) {}
    return a;
  }
  WA.prototype = OA.prototype; window.Audio = WA;
  try {
    const ss = window.speechSynthesis;
    ss.speak = u => { try { window.__ttsLog.push({ text: String((u && u.text) || ''), t: performance.now() }); } catch (e) {} };
    ss.cancel = () => {};
  } catch (e) {}
  const rn = Date.now.bind(Date); let __off = 0;
  Date.now = () => rn() + __off;
  window.__addTime = ms => { __off += ms; };
  window.__timeOff = () => __off;
})();
"""

VSEQ_JS = r"""
(() => {
  const rev = {};
  try { for (const k in KIDS.voice.clips) { const u = KIDS.voice.clips[k]; if (u) rev[String(u).slice(0, 120)] = k; } } catch (e) {}
  const clips = (window.__audioLog || []).map(e => ({ t: Math.round(e.t), key: rev[e.src] || ('?:' + e.src.slice(0, 16)) }));
  const tts = (window.__ttsLog || []).map(e => ({ t: Math.round(e.t), text: e.text }));
  return { clips, tts };
})()
"""

# mulberry32 Python 复刻（与页内实现位级对齐后用于独立推导；先校准再使用）
def mulberry32(seed):
    a = seed & 0xFFFFFFFF
    def rnd():
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xFFFFFFFF
        t = ((a ^ (a >> 15)) * (a | 1)) & 0xFFFFFFFF
        imul2 = ((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF
        t = ((t + imul2) ^ t) & 0xFFFFFFFF   # JS 优先级：(t + imul) ^ t
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296.0
    return rnd

def ri(rnd, lo, hi):
    return lo + int(math.floor(rnd() * (hi - lo + 1)))

# 独立硬编码预告表（SPEC/源码读得，非运行时取——防同源自证）
CH_HINTS = {
    'comfort':  {1: '陪一陪抱一抱，朋友会好起来', 2: '三种做法里，只有一个好朋友',
                 3: '新老情景都来啦，样样考考你', 4: '新的难过情景来啦，继续帮朋友'},
    'quickcmp': {1: '有时候两边一样多哦', 2: '圆点变多啦，要看得快',
                 3: '全都混在一起，大挑战', 4: '新一轮快速比大小'},
    'tictac':   {1: '兔子学会防守啦', 2: '兔子会动脑筋啦',
                 3: '最厉害的兔子来啦', 4: '新一轮井字棋开始'},
}
NUMCN = {1: '一', 2: '两', 3: '三', 4: '四', 5: '五', 6: '六', 7: '七', 8: '八', 9: '九', 10: '十'}

def key_of(i):
    return f"{i // 5 + 1}-{i % 5}"

def preset_save(game, flats_done, stars_default=3, bonus=5, daily_min=10):
    """预置存档（b22 坑⑥：JSON.stringify 包装）；flats_done=已完成 flat 列表"""
    levels = {}
    for f in flats_done:
        levels[key_of(f)] = {'stars': stars_default, 'plays': 1}
    return {
        'v': '1.0', 'game': game, 'firstDay': TODAY, 'lastDay': TODAY,
        'levels': levels, 'dailyMin': {TODAY: daily_min},
        'settings': {'sound': True, 'tts': True, 'vol': 0.6},
        'restTip': {'day': TODAY, 'shown': 0},
        'bonus': {TODAY: bonus},
        game: {'tutSeen': True},
    }

class Session:
    def __init__(self, browser, game, log):
        self.browser = browser
        self.game, self.log = game, log
        self.url = (BASE / game / 'index.html').as_uri()
        self.errors, self.console_err = [], []
        self.results = []

    async def setup(self):
        self.ctx = await self.browser.new_context(viewport={'width': 900, 'height': 760})
        await self.ctx.add_init_script(INIT_JS)
        self.page = await self.ctx.new_page()
        self.page.set_default_timeout(12000)
        self.page.set_default_navigation_timeout(30000)
        self.page.on('pageerror', lambda e: self.errors.append(str(e)))
        self.page.on('console', lambda m: self.console_err.append(m.text) if m.type == 'error' else None)
        await self.page.goto(self.url, wait_until='domcontentloaded')
        for _ in range(300):
            if await self.page.evaluate('(typeof KIDS !== "undefined" && KIDS.voice && KIDS.voice.clips) ? 1 : 0'):
                break
            await asyncio.sleep(0.02)
        return self

    # ---- 断言记账 ----
    def rec(self, ok, name, detail=''):
        self.results.append({'ok': bool(ok), 'name': name, 'detail': str(detail)[:400]})
        self.log(f"[{'PASS' if ok else 'FAIL'}] {name} :: {str(detail)[:200]}")
        # 增量落盘（传输瞬断可致永久挂起——已证 click/evaluate 均可中招；先落盘保结果）
        try:
            p = BASE / '_player36' / f'{self.game}_result.json'
            p.write_text(json.dumps({'game': self.game, 'results': self.results,
                                     'console_err': self.console_err[:10]}, ensure_ascii=False, indent=1),
                         encoding='utf-8')
        except Exception:
            pass

    async def js(self, expr, arg=None):
        return await self.page.evaluate(expr, arg) if arg is not None else await self.page.evaluate(expr)

    def harden(self, logf):
        """传输加固：全部 evaluate 走 wait_for+重试（实证卡死=CDP 响应丢失而非页面忙：
        renderer 13% CPU 正常动画中 evaluate 永不返回；重试轮询形态已证可穿透存活）"""
        async def js2(expr, arg=None):
            last_e = None
            for i in range(10):
                try:
                    return await asyncio.wait_for(
                        self.page.evaluate(expr, arg) if arg is not None else self.page.evaluate(expr), 3.5)
                except Exception as e:
                    last_e = e
                    logf(f'js-retry#{i + 1} {type(e).__name__} {str(expr)[:50]}')
                    await asyncio.sleep(0.3)
            raise TimeoutError(f'evaluate 持续无响应: {str(expr)[:60]} ({last_e})')

        async def poll2(expr, timeout=15.0, desc=''):
            t0 = time.time()
            while time.time() - t0 < timeout:
                try:
                    if await asyncio.wait_for(self.page.evaluate(expr), 3.5):
                        return True
                except Exception:
                    pass
                await asyncio.sleep(0.1)
            return False

        self.js, self.poll = js2, poll2

    async def poll(self, expr, timeout=15.0, desc=''):
        t0 = time.time()
        while time.time() - t0 < timeout:
            try:
                if await self.page.evaluate(expr):
                    return True
            except Exception:
                pass
            await asyncio.sleep(0.1)
        return False

    async def nap(self, seconds):
        """分片睡眠（≤2.5s 片，管道保险）"""
        t0 = time.time()
        while True:
            remain = seconds - (time.time() - t0)
            if remain <= 0:
                return
            await asyncio.sleep(min(2.5, remain))

    async def idle(self, seconds):
        """无输入等待但保持管道活性：0.15s 高频轻触 evaluate（不产生游戏输入，
        不重置救援钟）——实证：演出期静默/低频触会挂起 playwright 管道；
        tictac 0.12s 轮询形态 5+ 分钟零挂起，此处对齐该频率"""
        t0 = time.time()
        while time.time() - t0 < seconds:
            await asyncio.sleep(min(0.15, max(0.02, seconds - (time.time() - t0))))
            try:
                await asyncio.wait_for(self.page.evaluate('1'), 2)
            except Exception:
                pass

    async def touch(self):
        try:
            await asyncio.wait_for(self.page.evaluate('1'), 3)
        except Exception:
            pass

    async def tap(self, sel, timeout=6):
        """force 点击（跳过 actionability——breathe/pop 无限动画会永等 not-stable）"""
        try:
            await asyncio.wait_for(self.page.click(sel, timeout=timeout * 1000, force=True), timeout + 3)
            return True
        except Exception:
            return False

    async def shot(self, name):
        p = BASE / '_player36' / f'{self.game}_{name}.png'
        try:
            await self.page.screenshot(path=str(p))
            return f'{p.name}:{p.stat().st_size}B'
        except Exception as e:
            return f'shot-fail:{e}'

    # ---- 语音链（Audio/TTS 层，t=0 起全程） ----
    async def vseq(self):
        return await self.page.evaluate(VSEQ_JS)

    async def clip_keys(self):
        v = await self.vseq()
        return [c['key'] for c in v['clips']]

    async def tts_texts(self):
        v = await self.vseq()
        return [x['text'] for x in v['tts']]

    async def chain_gap(self, key_a, key_b):
        """返回最近一对 a→b 的间隔 ms（拼播链段间 150ms 级）"""
        v = await self.vseq()
        clips = v['clips']
        for i in range(len(clips) - 2, -1, -1):
            if clips[i]['key'] == key_a:
                for j in range(i + 1, len(clips)):
                    if clips[j]['key'] == key_b:
                        return clips[j]['t'] - clips[i]['t']
                return None
        return None

    # ---- 覆盖层守卫（restTip 自然触发时收口；celebrate 等待） ----
    async def settle_overlays(self, timeout=10):
        t0 = time.time()
        while time.time() - t0 < timeout:
            if await self.js("document.querySelector('.k-resttip') ? 1 : 0"):
                try:
                    await self.page.click('.k-resttip .k-btn', timeout=3000)
                    await asyncio.sleep(0.4)
                    continue
                except Exception:
                    pass
            if await self.js("document.querySelector('.k-celebrate') ? 1 : 0"):
                await asyncio.sleep(0.5)
                continue
            return True
        return False

    # ---- 家长门 ----
    async def parent_gate(self, wrong_first=True):
        await self.page.click('.k-parentbtn')
        await self.page.wait_for_selector('.k-panel', timeout=3000)
        qtxt = await self.page.eval_on_selector('.k-panel div[style*="17px"]', 'e => e.textContent')
        m = re.search(r'(\d+)\s*\+\s*(\d+)', qtxt)
        a, b = int(m.group(1)), int(m.group(2))
        async def enter(n):
            for ch in str(n):
                await self.page.click(f'.k-numrow button:nth-child({int(ch)+1})')
        if wrong_first:
            wrong = (a + b + 7) % 100
            if wrong == a + b:
                wrong = 1
            await enter(wrong)
            await self.page.click('.k-panel .row .mbtn')
            ph = await self.page.eval_on_selector('.k-panel input', 'e => e.placeholder')
            self.rec(ph == '再试一次', '家长门错答一次', f'placeholder={ph}')
        await enter(a + b)
        await self.page.click('.k-panel .row .mbtn')
        await self.page.wait_for_selector('.k-panel .box h3', timeout=3000)

    async def bonus_set(self, n=5):
        await self.page.fill('.k-panel input[type=number]', str(n))
        ok_btns = self.page.locator('.k-panel button.mbtn', has_text='确定')
        await ok_btns.first.click()
        await asyncio.sleep(0.4)
        return await self.js(f"KIDS.calendar.bonusToday() === {n} && KIDS.calendar.limit(Infinity)")

    async def close_panel(self):
        try:
            await self.page.click('.k-panel .k-close', timeout=2000)
        except Exception:
            await self.page.keyboard.press('Escape')
        await asyncio.sleep(0.3)

    # ---- 存档 ----
    async def save(self):
        raw = await self.js("localStorage.getItem('kidsgame_" + self.game + "')")
        return json.loads(raw) if raw else None

    async def write_save(self, sv):
        await self.js("sv => localStorage.setItem('kidsgame_" + self.game + "', JSON.stringify(sv))", sv)

    async def finish(self, label):
        errs = self.errors
        self.rec(len(errs) == 0, f'{label} pageerror=0', f'errors={errs[:3]}')
        out = {'game': self.game, 'results': self.results, 'console_err': self.console_err[:10]}
        p = BASE / '_player36' / f'{self.game}_result.json'
        p.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')
        n_pass = sum(1 for r in self.results if r['ok'])
        self.log(f'== {self.game}: {n_pass}/{len(self.results)} PASS, pageerror={len(errs)} ==')
        return out

async def calibrate_mulberry(page, seeds):
    """页内 mulberry32 vs Python 复刻——位级对齐校准（仅校准用，不参与断言真值）"""
    for s in seeds:
        page_v = await page.evaluate(f"(typeof mulberry32 !== 'undefined') ? (mulberry32({s})()) : null")
        if page_v is None:
            return True, '页内 mulberry32 非全局可达（跳过校准）'
        py_v = mulberry32(s)()
        if abs(page_v - py_v) > 1e-12:
            return False, f'seed{s}: page={page_v} py={py_v}'
    return True, 'aligned'
