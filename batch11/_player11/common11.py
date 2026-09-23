# -*- coding: utf-8 -*-
"""batch11 三款 5-6 岁游戏 · 5 岁半大班女孩视角试玩 — 公共驱动
铁律：
- 无头独立实例：playwright chromium.launch()，不连接任何已有浏览器，不杀任何浏览器进程，不弹有头窗口
- 禁一切视觉识别（截图仅落盘存证）：游戏状态只靠 DOM/钩子断言
  （KIDS._save() 存档 / SH·SP·SO 钩子 / 类名 breathe·pulse·wig·lit·wrong·gone·dim / innerText / getBoundingClientRect）
- 存档键 kidsgame_<game>；种档开局用 n=5（batch10 实证：n=6 撞首日 6 关日限弹日末层）
- 语音 HOOK 五件套：voice.play→P:key#text4 / voice.queue→Q:keys / voice.say→T:text6 /
  audio.sfx→S:name（core 的 say 无头下兜底走 play(null,text) 会双记同一次播报，计数按语义前缀过滤）
"""
import io, json, sys, time, pathlib, random

try:
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
except Exception:
    pass

from playwright.sync_api import sync_playwright

ROOT  = pathlib.Path(r'F:/claudecode/projects/active/kids-games/batch11')
OUT   = ROOT / '_player11'
SHOTS = OUT / 'shots'
LOGS  = OUT / 'logs'
for d in (OUT, SHOTS, LOGS):
    d.mkdir(parents=True, exist_ok=True)

# 09-19 r19 审查 s-minor-4：player 驱动零静音=复跑真实外放（用户实证外放事故）——
# SILENCE 下沉 common11（1500ms ended 版与 verify_one_shp_so 同型：data:audio 返回真实 Audio
# 仅覆写 play/pause，每 play 恰补发一个 ended 保 core 队列链推进；__sndLog 记录供断言）
SILENCE = """(() => {
  const noop = () => {};
  window.__sndLog = [];
  try { window.speechSynthesis = { speak: u => window.__sndLog.push('tts'), cancel: noop, pause: noop, resume: noop, getVoices: () => [] }; } catch (e) {}
  try {
    const OA = window.Audio;
    window.Audio = function (src) {
      if (OA && typeof src === 'string' && src.indexOf('data:audio/') === 0) {
        const a = new OA(src);
        a.play = () => { window.__sndLog.push('clip');
          setTimeout(() => { try { a.dispatchEvent(new Event('ended')); } catch (e) {} }, 1500);
          return Promise.resolve(); };
        a.pause = () => {};
        return a;
      }
      this.__src = src || ''; this.play = () => { window.__sndLog.push('audio'); return Promise.resolve(); };
      this.pause = noop; this.load = noop; this.addEventListener = noop; this.removeEventListener = noop;
      return this;
    };
  } catch (e) {}
  try {
    const OC = window.AudioContext || window.webkitAudioContext;
    if (OC) { const S = function () { this.state = 'suspended'; this.destination = {}; this.listener = {};
      this.createOscillator = () => ({ connect: noop, start: noop, stop: noop, frequency: { value: 0, setValueAtTime: noop, exponentialRampToValueAtTime: noop, linearRampToValueAtTime: noop }, type: '' });
      this.createGain = () => ({ connect: noop, gain: { value: 0, setValueAtTime: noop, exponentialRampToValueAtTime: noop } });
      this.resume = () => Promise.resolve(); this.close = () => Promise.resolve(); };
      window.AudioContext = S; window.webkitAudioContext = S; }
  } catch (e) {}
})();"""

def fresh_save(game):
    # tts/sound 关（无头无音频）——vlog 五件套在 wrapper 层记录，tts=false 时 play() 早退但仍被记
    return {"v": "1.0", "game": game, "firstDay": "2026-09-07", "lastDay": "2026-09-07",
            "levels": {}, "dailyMin": {}, "settings": {"sound": False, "tts": False, "vol": 0.3},
            "restTip": {"day": "", "shown": 0}}

SEED_JS = ("(n) => { const sv = KIDS._save(); for (let i = 0; i < n; i++) "
           "sv.levels[(Math.floor(i/5)+1)+'-'+(i%5)] = { stars: 3 }; "
           "sv.__KEY__ = sv.__KEY__ || {}; sv.__KEY__.tutSeen = true; "
           "KIDS.store.persist(); return Object.keys(sv.levels).length; }")

HOOK_JS = """(() => {
  window.__vlog = [];
  const _p = KIDS.voice.play.bind(KIDS.voice);
  KIDS.voice.play = (k, t) => { window.__vlog.push('P:' + k + '#' + String(t || '').slice(0, 4)); return _p(k, t); };
  const _q = KIDS.voice.queue.bind(KIDS.voice);
  KIDS.voice.queue = parts => { window.__vlog.push('Q:' + parts.map(p => typeof p === 'string' ? p : p.key).join(',')); return _q(parts); };
  const _sy = KIDS.voice.say.bind(KIDS.voice);
  KIDS.voice.say = t => { window.__vlog.push('T:' + String(t).slice(0, 6)); return _sy(t); };
  const _s = KIDS.audio.sfx.bind(KIDS.audio);
  KIDS.audio.sfx = n => { window.__vlog.push('S:' + n); return _s(n); };
  return true;
})()"""

EMOJI_RE = ("[\\u2190-\\u21FF\\u2300-\\u27BF\\u2B00-\\u2BFF\\u{1F000}-\\u{1FAFF}\\u{1F1E6}-\\u{1F1FF}"
            "\\uFE0E\\uFE0F\\u200D\\u25A0-\\u25FF\\u2600-\\u26FF]")

class Kid:
    """模拟 5 岁半大班女孩（几乎不识字/会点大按钮/专注 ~8 分钟）的点击 + DOM 证据采集"""
    def __init__(self, game, subkey, hook, seed=11):
        self.game, self.subkey, self.hook = game, subkey, hook
        self.rnd = random.Random(seed)
        self.log_f = open(LOGS / ('%s.log' % game), 'a', encoding='utf-8')
        self.t0 = time.time()
        self.errors = []
        self.vlog_on = False

    # ---------- 基础 ----------
    def log(self, msg):
        line = '[%6.1fs] %s' % (time.time() - self.t0, msg)
        try:
            self.log_f.write(line + '\n'); self.log_f.flush()
        except ValueError:
            pass
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

    def open(self, vp=None):
        self.pw = sync_playwright().start()
        self.browser = self.pw.chromium.launch()          # 独立无头实例（不连不杀别的浏览器）
        self.ctx = self.browser.new_context(viewport=vp or {'width': 1280, 'height': 800}, locale='zh-CN')
        self.ctx.add_init_script(SILENCE)   # 09-19 s-minor-4：ctx 级静音（不碰 localStorage，不抹 seed 档）
        self.page = self.ctx.new_page()
        self.page.on('pageerror', lambda e: self.errors.append('pageerror: %s' % e))
        url = (ROOT / self.game / 'index.html').as_uri()
        self.log('OPEN(fresh) %s' % url)
        # 清存档只在首次 goto 后显式做（add_init_script 会在 reload 再跑=抹掉 seed，batch11 实证）
        self.page.goto(url)
        self.page.evaluate("() => { try { localStorage.removeItem('kidsgame_%s'); } catch(e){} }" % self.game)
        self.page.reload()
        self.page.wait_for_function('() => window.%s' % self.hook, timeout=15000)
        self.install_hook()
        time.sleep(0.5)
        return self.page

    def install_hook(self):
        self.ev(HOOK_JS)
        self.vlog_on = True

    def close(self):
        try: self.browser.close()
        except Exception: pass
        try: self.pw.stop()
        except Exception: pass
        self.log_f.close()

    # ---------- 读态（纯 DOM / 钩子） ----------
    def ev(self, js, arg=None):
        try:
            return self.page.evaluate(js, arg)
        except Exception as e:
            self.log('EV-FAIL %s | js=%s' % (e, (js or '')[:80])); return None

    def quiz(self):
        return self.ev('() => window.%s ? %s.quiz : null' % (self.hook, self.hook))

    def level(self):
        return self.ev('() => window.%s ? %s.currentLevel : null' % (self.hook, self.hook))

    def tut(self):
        return self.ev('() => window.%s ? %s.tutorial : null' % (self.hook, self.hook))

    def stars_of(self, key):
        return self.ev('(k) => (KIDS._save().levels[k] || null)', key)

    def vlog(self):
        return self.ev('() => window.__vlog || []') or []

    def vcount(self, pred):
        return len([x for x in self.vlog() if pred(x)])

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

    def tap_card(self, i, desc=''):
        return self.tap('.card[data-i="%d"]' % i, desc)

    def think(self, lo=1.2, hi=2.4):
        time.sleep(self.rnd.uniform(lo, hi))              # 5 岁半决策节拍

    def seed(self, n=5):
        js = SEED_JS.replace('__KEY__', self.subkey)
        return self.ev(js, n)

    def reload(self):
        self.page.reload()
        self.page.wait_for_function('() => window.%s' % self.hook, timeout=15000)
        self.install_hook()
        time.sleep(1.2)

    def dump_data(self, obj):
        (LOGS / ('%s_data.json' % self.game)).write_text(
            json.dumps(obj, ensure_ascii=False, indent=1), encoding='utf-8')

    # ---------- 等待 ----------
    def wait_quiz(self, timeout=15):
        t0 = time.time()
        while time.time() - t0 < timeout:
            q = self.quiz()
            if q: return q
            time.sleep(0.15)
        return None

    def wait_step(self, step, timeout=20):
        t0 = time.time()
        while time.time() - t0 < timeout:
            q = self.quiz()
            if q and q['step'] == step: return q
            time.sleep(0.15)
        return None

    def wait_celebrate(self, tag, timeout=12000):
        """等过关庆祝层（.k-celebrate 2.3s 自动收起）；返回 {stars, text}"""
        try:
            self.page.wait_for_selector('.k-celebrate', timeout=timeout)
            n = self.page.locator('.k-celebrate .k-star').count()
            txt = self.ev("() => document.querySelector('.k-celebrate') ? document.querySelector('.k-celebrate').innerText.replace(/\\n/g,'/') : ''")
            self.log('%s CELEBRATE 星星=%d 文案=%r' % (tag, n, txt))
            self.snap('celebrate_' + tag)
            return {'stars': n, 'text': txt}
        except Exception as e:
            self.log('%s CELEBRATE-FAIL %s' % (tag, e))
            return None

    def overlay_check(self, tag):
        return self.ev("""() => { const s = ['.k-celebrate','.k-chapterend','.k-dayend','.k-panel']
          .map(c => c + ':' + document.querySelectorAll(c).length).join(' ');
          const d = document.querySelector('.k-dayend'); const ch = document.querySelector('.k-chapterend');
          return { sel: s, dayend: d ? d.innerText.replace(/\\n/g,'/') : null,
                   chapterend: ch ? ch.innerText.replace(/\\n/g,'/') : null }; }""")

    def dismiss_overlays(self):
        """点掉章末/日末层的按钮（真实孩子会点大按钮）"""
        for sel in ('.k-chapterend .k-btn', '.k-dayend .k-btn'):
            btn = self.page.locator(sel).first
            try:
                if btn.count() and btn.is_visible():
                    btn.click(); time.sleep(0.6); self.log('DISMISS %s' % sel)
            except Exception as e:
                self.log('DISMISS-FAIL %s %s' % (sel, e))

    # ---------- 零文字审计 ----------
    def text_audit(self):
        return self.ev("""() => {
          const em = s => String(s||'').replace(/%s/gu,'').replace(/\\s+/g,' ').trim();
          const chip = document.querySelector('#prompt-chip, #home, #prompt');
          const cards = [...document.querySelectorAll('.card')];
          const body = document.body.innerText.split('\\n').map(x=>x.trim()).filter(Boolean);
          return {
            chip_text: chip ? em(chip.innerText) : null,
            chip_aria: chip ? chip.getAttribute('aria-label') : null,
            card_texts: cards.map(c => em(c.innerText)),
            card_aria: cards.length ? cards[0].getAttribute('aria-label') : null,
            card_px: cards.map(c => { const r = c.getBoundingClientRect(); return Math.round(r.width)+'x'+Math.round(r.height); }),
            body_texts_nopict: body.map(em).filter(x => x && !/^\\d+$/.test(x)).slice(0, 12),
            badge_html: document.querySelector('#dir-badge') ? document.querySelector('#dir-badge').innerHTML.length : null,
            badge_text: document.querySelector('#dir-badge') ? em(document.querySelector('#dir-badge').innerText) : null
          };
        }""" % EMOJI_RE)
