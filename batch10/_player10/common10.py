# -*- coding: utf-8 -*-
"""batch10 三款 6-7 岁游戏 · 6 岁半女孩视角试玩 — 公共驱动
硬性纪律：
- 无头独立实例：playwright chromium.launch()，不连接任何已有浏览器，不杀任何浏览器进程，不弹窗
- 禁一切视觉识别：游戏状态只靠 DOM/钩子断言（KIDS._save / window.CS / window.SI / window.HB / 类名 / 文案）；
  截图仅落盘存证，绝不识别
- 存档键 kidsgame_<game>；种子模板见 SEED_JS（__KEY__ 替换为 cs/simon/habit）
"""
import json, random, time, pathlib
from playwright.sync_api import sync_playwright

ROOT  = pathlib.Path(r'F:/claudecode/projects/active/kids-games/batch10')
OUT   = ROOT / '_player10'
SHOTS = OUT / 'shots'
LOGS  = OUT / 'logs'
for d in (OUT, SHOTS, LOGS):
    d.mkdir(parents=True, exist_ok=True)

def fresh_save(game):
    return {"v": "1.0", "game": game, "firstDay": "2026-09-07", "lastDay": "2026-09-07",
            "levels": {}, "dailyMin": {}, "settings": {"sound": False, "tts": False, "vol": 0.3},
            "restTip": {"day": "", "shown": 0}}

SEED_JS = ("(n) => { const sv = KIDS._save(); for (let i = 0; i < n; i++) "
           "sv.levels[(Math.floor(i/5)+1)+'-'+(i%5)] = { stars: 3 }; "
           "sv.__KEY__ = sv.__KEY__ || {}; sv.__KEY__.tutSeen = true; "
           "if (n >= 10) KIDS.calendar.bonusSet(10); KIDS.store.persist(); "
           "return Object.keys(sv.levels).length; }")

class Kid:
    """模拟 6 岁半女孩的点击行为 + DOM 证据采集"""
    def __init__(self, game, subkey, hook, seed=10):
        self.game, self.subkey, self.hook = game, subkey, hook
        self.rnd = random.Random(seed)
        self.log_f = open(LOGS / ('%s.log' % game), 'w', encoding='utf-8')
        self.t0 = time.time()
        self.errors = []

    # ---------- 基础 ----------
    def log(self, msg):
        line = '[%6.1fs] %s' % (time.time() - self.t0, msg)
        self.log_f.write(line + '\n'); self.log_f.flush()
        try:
            print(line, flush=True)
        except UnicodeEncodeError:
            print(line.encode('ascii', 'replace').decode('ascii'), flush=True)

    def snap(self, name):
        p = SHOTS / ('%s_%s.png' % (self.game, name))
        try:
            self.page.screenshot(path=str(p)); self.log('SNAP %s' % p.name)
        except Exception as e:
            self.log('SNAP-FAIL %s %s' % (name, e))

    def open(self):
        self.pw = sync_playwright().start()
        self.browser = self.pw.chromium.launch()          # 独立无头实例（不连不杀别的浏览器）
        self.ctx = self.browser.new_context(viewport={'width': 1280, 'height': 800}, locale='zh-CN')
        init = ("try{var k='kidsgame_%s';if(!localStorage.getItem(k))localStorage.setItem(k,%s);}catch(e){}"
                % (self.game, json.dumps(fresh_save(self.game), ensure_ascii=False)))
        self.ctx.add_init_script(init)
        self.page = self.ctx.new_page()
        self.page.on('pageerror', lambda e: self.errors.append('pageerror: %s' % e))
        self.page.on('console', lambda m: self.errors.append('console-error: %s' % m.text)
                     if m.type == 'error' else None)
        url = (ROOT / self.game / 'index.html').as_uri()
        self.log('OPEN %s' % url)
        self.page.goto(url)
        self.page.wait_for_function('() => window.%s' % self.hook, timeout=15000)
        return self.page

    def close(self):
        try:
            self.browser.close()
        except Exception:
            pass
        try:
            self.pw.stop()
        except Exception:
            pass
        self.log_f.close()

    # ---------- 读态（纯 DOM / 钩子） ----------
    def ev(self, js, arg=None):
        try:
            return self.page.evaluate(js, arg)
        except Exception as e:
            self.log('EV-FAIL %s | js=%s' % (e, (js or '')[:90])); return None

    def quiz(self):
        return self.ev('() => window.%s ? %s.quiz : null' % (self.hook, self.hook))

    def level(self):
        return self.ev('() => window.%s ? %s.currentLevel : null' % (self.hook, self.hook))

    def tut(self):
        return self.ev('() => window.%s ? %s.tutorial : null' % (self.hook, self.hook))

    def save(self):
        return self.ev('() => KIDS._save()')

    def stars_of(self, key):
        return self.ev('(k) => (KIDS._save().levels[k] || null)', key)

    # ---------- 真实点击（坐标 mouse 点按，最接近儿童手指） ----------
    def tap(self, sel, desc=''):
        try:
            bb = self.page.locator(sel).first.bounding_box(timeout=3000)
        except Exception:
            bb = None
        if not bb:
            self.log('TAP-FAIL no-element %s %s' % (sel, desc)); return False
        self.page.mouse.click(bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2)
        return True

    def tap_xy(self, x, y, desc=''):
        self.page.mouse.click(x, y)
        return True

    def think(self, lo=1.0, hi=2.2):
        time.sleep(self.rnd.uniform(lo, hi))

    def seed(self, n):
        js = SEED_JS.replace('__KEY__', self.subkey)
        return self.ev(js, n)

    def reload(self):
        self.page.reload()
        self.page.wait_for_function('() => window.%s' % self.hook, timeout=15000)
        time.sleep(1.2)   # 等开场演出稳定

    def dump_data(self, obj):
        (LOGS / ('%s_data.json' % self.game)).write_text(
            json.dumps(obj, ensure_ascii=False, indent=1), encoding='utf-8')

    def wait_celebrate(self, tag):
        """等过关庆祝层出现（.k-celebrate），记录星星数并截图"""
        try:
            self.page.wait_for_selector('.k-celebrate', timeout=9000)
            n = self.page.locator('.k-celebrate .k-star').count()
            txt = self.ev("() => document.querySelector('.k-celebrate') ? document.querySelector('.k-celebrate').innerText.replace(/\\n/g,'/') : ''")
            self.log('%s CELEBRATE 星星=%d 文案=%r' % (tag, n, txt))
            self.snap('celebrate_' + tag)
            return n
        except Exception as e:
            self.log('%s CELEBRATE-FAIL %s' % (tag, e))
            return None

    def dayend_check(self, tag):
        cnt = self.ev("() => document.querySelectorAll('.k-dayend').length")
        txt = self.ev("() => document.querySelector('.k-dayend') ? document.querySelector('.k-dayend').innerText.replace(/\\n/g,'/') : null")
        self.log('%s DAYEND overlay=%s 文案=%r' % (tag, cnt, txt))
        return cnt, txt
