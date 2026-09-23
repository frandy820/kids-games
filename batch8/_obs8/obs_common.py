# -*- coding: utf-8 -*-
"""6 岁人设试玩评估公共库（batch8/_obs8 · 2026-09-07）
独立 chromium.launch() 无头；绝不 connect 已有浏览器、绝不杀浏览器进程。
语音取证=monkey-patch KIDS.voice.play/say/queue + KIDS.speak 记录调用（不依赖真实发声，
无头下 AudioContext/speechSynthesis 静默，调用层记录即证据）。"""
import asyncio, json, os, sys, time
from playwright.async_api import async_playwright

BASE7 = os.path.dirname(os.path.abspath(__file__))
SHOT = os.path.join(BASE7, 'shots')
os.makedirs(SHOT, exist_ok=True)

# init script：页面任何脚本执行前注入，轮询 hook KIDS 语音调用（开场任务语音在 load 时即播，事后 patch 会漏）
# 注意：①add_init_script 需要纯语句脚本（非函数表达式）②core 的 KIDS 是顶层 const（不挂 window，
# window.KIDS 永远 undefined）——轮询回调里直接引用 KIDS 标识符（全局词法环境可见）
INIT_SCRIPT = """
window.__vlog = [];
window.__hookKids = function() {
  let K = null;
  try { K = (typeof KIDS !== 'undefined') ? KIDS : null; } catch (e) { K = null; }
  if (!K || !K.voice) return false;          // KIDS 未就绪：继续轮询
  if (K.__obs_hooked) return true;
  K.__obs_hooked = true;
  const wrap = function(obj, name) {
    const orig = obj[name];
    if (typeof orig !== 'function') return;
    obj[name] = function() {
      const args = [];
      for (let i = 0; i < arguments.length; i++) {
        let a = arguments[i];
        try { if (a && typeof a === 'object') a = JSON.parse(JSON.stringify(a)); } catch (e) { a = String(a); }
        args.push(a);
      }
      window.__vlog.push({t: Date.now(), f: name, a: args});
      try { return orig.apply(this, arguments); } catch (e) {}
    };
  };
  wrap(K.voice, 'play'); wrap(K.voice, 'say'); wrap(K.voice, 'queue');
  if (typeof K.speak === 'function') wrap(K, 'speak');
  return true;
};
(function() {
  const timer = setInterval(function() { if (window.__hookKids()) clearInterval(timer); }, 20);
})();
// 底层捕获（覆盖页面同步 script 执行期=开场任务语音窗口，KIDS const 声明 hook 不及）：
// Audio 包装记录 clip dataURI 指纹（前 80 字符+总长，事后反查 KIDS.voice.clips 得 key）
window.__alog = [];
const __OrigAudio = window.Audio;
window.Audio = function(u) {
  const a = new __OrigAudio(u);
  window.__alog.push({t: Date.now(), f: 'audio', src: String(u).slice(0, 80), len: String(u).length});
  return a;
};
window.Audio.prototype = __OrigAudio.prototype;
// TTS 兜底路径：speechSynthesis.speak 记录 utterance 文本
window.__slog = [];
if (window.speechSynthesis) {
  const __origSpeak = window.speechSynthesis.speak.bind(window.speechSynthesis);
  window.speechSynthesis.speak = function(u) {
    window.__slog.push({t: Date.now(), f: 'speak', text: u && u.text});
    try { return __origSpeak(u); } catch (e) {}
  };
}
"""

async def opening_evidence(pg):
    """开场语音聚合证据：vlog（hook 后调用层）+ alog 反查（Audio 指纹→clip key）+ slog（TTS 文本）"""
    out = list(await vlog(pg))
    r = await pg.evaluate("""() => {
      const alog = (window.__alog || []).slice();
      const slog = (window.__slog || []).slice();
      const clips = (typeof KIDS !== 'undefined' && KIDS && KIDS.voice && KIDS.voice.clips) ? KIDS.voice.clips : {};
      const fp = {};
      for (const k in clips) fp[k] = String(clips[k]).slice(0, 80) + '#' + String(clips[k]).length;
      const resolve = a => {
        const sig = a.src + '#' + a.len;
        for (const k in fp) if (fp[k] === sig) return k;
        return 'clip?';
      };
      return {audio: alog.map(a => 'AUDIO:' + resolve(a)), tts: slog.map(s => 'TTS:' + (s.text || ''))};
    }""")
    out.extend(r['audio'])
    out.extend(r['tts'])
    return out

# 兜底手动安装（幂等，__obs_hooked 防双包）
INSTALL_LOGGER = """() => { window.__vlog = window.__vlog || []; window.__hookKids ? window.__hookKids() : 0; return true; }"""

# 种档：种 0..nDone-1 全 3 星 + tutSeen；nDone>=10 时 bonusSet(10) 提 lim（DAY_CAP=2·6=12 上限，种 15 关全通触发 dayEnd 落回 flat0 的坑）
SEED_SAVE = """(o) => {
  const sv = KIDS._save();
  for (let f = 0; f < o.n; f++) sv.levels[(Math.floor(f/5)+1)+'-'+(f%5)] = {stars: 3, plays: 1};
  sv[o.g] = sv[o.g] || {}; sv[o.g].tutSeen = true;
  if (o.n >= 10) KIDS.calendar.bonusSet(10);
  KIDS.store.persist();
  return KIDS.calendar.limit(Infinity);
}"""

CENTER_OF = """sel => {
  const el = typeof sel === 'string' ? document.querySelector(sel) : sel;
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return [r.left + r.width/2, r.top + r.height/2];
}"""

async def install_logger(pg):
    await pg.evaluate(INSTALL_LOGGER)

async def vlog(pg):
    return await pg.evaluate('window.__vlog ? window.__vlog.slice() : []')

async def center(pg, sel):
    return await pg.evaluate(CENTER_OF, sel)

async def click_sel(pg, sel):
    """真实 pointer 点击选择器首个元素中心；返回是否点到位"""
    pos = await center(pg, sel)
    if not pos:
        return False
    await pg.mouse.click(pos[0], pos[1])
    return True

async def shot(pg, name):
    await pg.screenshot(path=os.path.join(SHOT, name))

def save_result(game, data):
    p = os.path.join(BASE7, game + '_result.json')
    with open(p, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    print('[saved]', p)

def fmt_v(entries):
    """vlog 摘要行（queue 的数组参数拍平；数组元素兼容对象与字符串两形态——
    worden sound2pic 的 queue(['wen_w_cat', {q2}]) 字符串元素也要留痕）"""
    out = []
    for e in entries:
        a = e.get('a', [])
        flat = []
        for x in a:
            if isinstance(x, list):
                for i in x:
                    if isinstance(i, dict):
                        flat.append('%s|%s' % (i.get('key', ''), i.get('text', '')))
                    else:
                        flat.append(str(i))
            else:
                flat.append(str(x))
        out.append('%s(%s)' % (e['f'], ','.join(flat)[:90]))
    return out
