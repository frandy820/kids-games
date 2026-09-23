# -*- coding: utf-8 -*-
"""6 岁半女孩视角试玩公共库（batch9 三款）
纪律：无头 chromium.launch() 独立启动；只用 DOM 断言；截图仅存文件不识别。
模拟儿童行为：bbox 中心附近随机偏移点击、点击间隔 0.7-1.5s、偶尔点空白/兔子。
"""
import json, os, random, sys, time
from playwright.sync_api import sync_playwright
try: sys.stdout.reconfigure(encoding='utf-8')
except Exception: pass

BASE = os.path.dirname(os.path.abspath(__file__))
GAMES = {
    'wis':  os.path.join(BASE, '..', 'whereistand', 'index.html'),
    'mir':  os.path.join(BASE, '..', 'mirror', 'index.html'),
    'memg': os.path.join(BASE, '..', 'memgrid', 'index.html'),
}
GNAME = {'wis': 'whereistand', 'mir': 'mirror', 'memg': 'memgrid'}
TODAY = '2026-09-07'
YDAY = '2026-09-06'

def url(gk):
    return 'file:///' + os.path.abspath(GAMES[gk]).replace('\\', '/')

# 预置档（防音频自动播放与首日弹窗；仅当无档时写入，不覆盖种档）
INIT_SAVE = """(() => {
  const k = 'kidsgame_%s';
  try { if (!localStorage.getItem(k)) localStorage.setItem(k, JSON.stringify(
    {v:'1.0',game:'%s',firstDay:'%s',lastDay:'%s',levels:{},dailyMin:{},
     settings:{sound:false,tts:false,vol:0.3},restTip:{day:'',shown:0}})); } catch(e) {}
})()"""

# 语音 spy（KIDS 加载后包装；记录 key/文本；救援与纠错语音的 DOM 可观测证据）
VOICE_HOOK = """(() => {
  if (window.__spy) return true; window.__spy = 1;
  window.__vlog = [];
  const _p = KIDS.voice.play.bind(KIDS.voice);
  KIDS.voice.play = (k, t) => { window.__vlog.push('K:' + k + '|' + (t || '')); return _p(k, t); };
  const _s = KIDS.speak.bind(KIDS);
  KIDS.speak = t => { window.__vlog.push('TTS:' + t); return _s(t); };
  const _q = KIDS.voice.queue.bind(KIDS.voice);
  KIDS.voice.queue = parts => { window.__vlog.push('Q:' + parts.map(p => typeof p === 'string' ? p : p.key).join(',')); return _q(parts); };
  return true;
})()"""

SEED_JS = """(o) => {
  const sv = KIDS._save();
  for (let i = 0; i < o.n; i++) sv.levels[(Math.floor(i/5)+1)+'-'+(i%5)] = { stars: 3 };
  sv.__KEY__ = sv.__KEY__ || {}; sv.__KEY__.tutSeen = true;
  if (o.firstDay) sv.firstDay = o.firstDay;  // 模拟"昨天开始玩"→第 2 天 limit=12
  if (o.n >= 10) KIDS.calendar.bonusSet(10);
  KIDS.store.persist();
  return true;
}"""

class Kid:
    """模拟 6 岁半女孩的操作层"""
    def __init__(self, browser, gk, viewport={'width': 1024, 'height': 768}):
        self.gk = gk
        self.ctx = browser.new_context(viewport=viewport)
        self.ctx.add_init_script(INIT_SAVE % (GNAME[gk], GNAME[gk], TODAY, TODAY))
        self.pg = self.ctx.new_page()
        self.errs = []
        self.pg.on('pageerror', lambda e: self.errs.append(str(e)))
        self.log = {'events': [], 'errs_ref': self.errs}

    def ev(self, name, **kw):
        rec = {'t': round(time.time() % 1e6, 2), 'ev': name}
        rec.update(kw)
        self.log['events'].append(rec)
        print('  [%s] %s %s' % (self.gk, name, {k: v for k, v in kw.items() if k != 'js'}))

    def goto(self, query=''):
        self.pg.goto(url(self.gk) + query)
        self.pg.wait_for_timeout(700)

    def hook_voice(self):
        self.pg.evaluate(VOICE_HOOK)
        self.pg.evaluate('window.__vlog = []')

    def vlog(self):
        return self.pg.evaluate('window.__vlog || []')

    def tap(self, sel, wait=None, timeout=3500, note=''):
        """儿童点击：元素 bbox 内随机偏移（不是正中心，像小手指）"""
        try:
            loc = self.pg.locator(sel).first
            loc.wait_for(state='visible', timeout=timeout)
            bb = loc.bounding_box()
            if not bb:
                self.ev('tap_fail', sel=sel, why='no_bbox')
                return False
            x = bb['x'] + bb['width'] * random.uniform(0.35, 0.65)
            y = bb['y'] + bb['height'] * random.uniform(0.35, 0.65)
            self.pg.mouse.click(x, y)
            self.ev('tap', sel=sel, note=note)
            time.sleep(wait if wait else random.uniform(0.7, 1.4))
            return True
        except Exception as e:
            self.ev('tap_fail', sel=sel, why=str(e)[:80])
            return False

    def tap_blank(self, x=60, y=60):
        self.pg.mouse.click(x, y)
        self.ev('tap_blank', x=x, y=y)
        time.sleep(0.6)

    def js(self, expr, *args):
        return self.pg.evaluate(expr, *args) if args else self.pg.evaluate(expr)

    def idle(self, secs, note='静置'):
        self.ev('idle_start', secs=secs, note=note)
        self.pg.wait_for_timeout(secs * 1000)
        self.ev('idle_end')

    def shot(self, name):
        p = os.path.join(BASE, 'shots', '%s_%s.png' % (self.gk, name))
        self.pg.screenshot(path=p)
        self.ev('shot', path=p)
        return p

    def save_levels(self):
        return self.js("(() => { const s = KIDS._save(); return JSON.parse(JSON.stringify(s.levels)); })()")

    def close(self):
        try: self.ctx.close()
        except Exception: pass


def star_line(gk, scen, events, levels_key, stars, extra=''):
    return {'game': gk, 'scen': scen, 'events_n': len(events), 'key': levels_key,
            'stars': stars, 'extra': extra}
