/* ================= ziquest M2a 流程层一：关卡生成纯引擎 + 关卡循环（level.js）
   拼接序（build _assemble_flow 定稿）：game-main.js → level.js → calib.js → camp.js →
   qtypes/t*.js——game-main 尾部建 window.ZQ 后本文件增补 QT/registerQ/Level 等属性（不覆盖），
   qtypes 在 level 之后加载即同步自注册（契约「无顺序耦合」达成；若按字面把 qtypes 拼在
   game-main 之前，其顶层 ZQ.registerQ 调用时 window.ZQ 尚未创建必炸——以可运行为准）。
   运行时引用 wait/sfx/toast/finishNode/burst/zqSave/SAVE/zqToday 均在 game-main（本段顶层
   仅定义，交互时 game-main 已执行完毕）。
   ---- 纯引擎（无 DOM，verify 直驱；SPEC §3.3 编排律） ----
   新字关：开场 T2 逐字亮相（judge:false 0 判定演出位）+ 5 新字 ×2 判定位交错编排
     T1(a),T4(a),T1(b),T6(b),T1(c),T4(c),T1(d),T6(d),T1(e),T4(e)
     —— 相邻不同型 / 每字认识层(T1)先于辨认层(T4/T6) / 首判定必认识层 / 运用层 0 个。
   节点字组（zqNodeChars）=区域池序剔除 cal 已知字后 floor 均分（与日期无关——昨日
   newDone 节点重算同字组，早安营地 recap 依据稳定）。
   boss：本区字综合 HP 制（catalog hp clamp 8-12），答对 1 击，miss3=「喝口水休息」
     半进度重试永不失败（zqBossRest），题尽确定性续题（zqBossMore），击破=3★ 永不掉星。
   错题重入队：判定位 miss → 关尾同字不同型（认识位错→T4 / 辨认位错→T1）重现一次。
   星判定：miss0=3★ / miss≤2=2★ / 其余 1★（boss 固定 3★）。
   ---- 关卡循环（UI） ----
   ZQ.QT 注册表 + ZQ.registerQ（M2b qtypes 同步自注册）；未注册型=占位卡「题型加载中」
   可跳过不崩。题型渲染契约（M2b 共守）：render(q,box,api) 自建 .zq-stem+.zq-opts>
   button.zq-opt[data.v]（wirePick 全权反馈阶梯+救援双锚，api.right 延 rightMs 后进）；
   onShow(q,api)=题面音（错2 replay/听键均回转此处）；level 仅占位路径自担反馈。
   纪律：动画只用 transform/opacity；语音一律单 key（缺 clip=core 静默）；禁 Math.random
   裸调（确定性=zqMulberry32(zqHash(firstDay|today|key))）；触摸目标 ≥96×96。 */
'use strict';

const ZQ_VERIFY = /[?&]verify=1/.test(location.search);
const ZQ_SPEED = ZQ_VERIFY ? 0.12 : 1;             /* verify 页演出提速（zilearn 家族口径） */

/* ---------- A. 确定性工具（zilearn mulberry32 家族式；zq 前缀防跨款冲突） ---------- */
function zqMulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function zqHash(s) {                               /* 字符串 → 32 位种子（FNV 变体） */
  let h = 1779033703;
  for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; }
  return h >>> 0;
}
function zqShuffled(arr, rnd) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

/* ---------- B. 数据索引（纯派生，顶层一次建齐；只依赖 data/engine 块） ---------- */
const ZQ_CH_ENT = {};                              /* ch → 教研条目（首见=低区优先） */
const ZQ_NEWIDX = {};                              /* new 节点 key → {region, idx, total} */
(function zqBuildIdx() {
  ZQ_REGIONS.forEach(function (rg) {
    let idx = 0;
    rg.nodes.forEach(function (nd) {
      if (nd.type === 'new') { ZQ_NEWIDX[nd.key] = { region: rg.id, idx: idx, total: 0 }; idx++; }
    });
    rg.nodes.forEach(function (nd) {                /* 全区 new 节点回填 total（首版只填 first=除零 NaN bug） */
      if (nd.type === 'new') ZQ_NEWIDX[nd.key].total = idx;
    });
  });
  Object.keys(ZQ_CHARS).sort(function (a, b) { return a - b; }).forEach(function (r) {
    ZQ_CHARS[r].chars.forEach(function (c) { if (!(c.ch in ZQ_CH_ENT)) ZQ_CH_ENT[c.ch] = c; });
  });
})();
function zqRegionChars(r) { return ZQ_CHARS[String(r)].chars; }
/* 节点目标字：区域池剔除定级已知字后 **cat 子主题聚簇**（簇序=区内 cat 首见序，簇内保 order）
   再按节点序 floor 均分（4-5 字/关）——同主题字相邻入同关（v4 P1 分类识字：水果关/餐具关体感；
   纯存档态函数——同存档态永远同字组，跨日重算不变=早安营地依据稳定） */
function zqClusterPool(region, pool) {
  const withCat = pool.map(function (c) {
    return { c: c, k: (ZQ_CH_ENT[c.ch] && ZQ_CH_ENT[c.ch].cat) || '\x7f' };
  });
  const ord = {}; let nx = 0;
  withCat.forEach(function (x) { if (!(x.k in ord)) ord[x.k] = nx++; });
  withCat.sort(function (a, b) { return ord[a.k] - ord[b.k] || a.c.order - b.c.order; });
  return withCat.map(function (x) { return x.c; });
}
function zqNodeChars(key, save) {
  const m = ZQ_NEWIDX[key];
  if (!m) return [];
  const cal = save && save.zq && save.zq.cal && save.zq.cal.done || [];
  const ks = {}; cal.forEach(function (c) { ks[c] = 1; });
  const pool = zqClusterPool(m.region, zqRegionChars(m.region).filter(function (c) { return !ks[c.ch]; }));
  /* v58 编排律：words[0] 相同的相邻字=词原子（葡+萄=「葡萄」）不拆关——floor 均分切点落在
     order 相邻的词组字中间会拆进两关（R4 葡萄实证，同词次日重教=重复感）。切点右吸附原子
     边界（词组字整体归右桶）；纯切点计算=确定性保持（同存档态两跑同组，早安营地依据稳定） */
  const bounds = { '0': 1 };
  let acc = 0, lastW = null, curN = 0;
  pool.forEach(function (c, i) {
    const w = ZQ_CH_ENT[c.ch].words[0][0];
    if (w === lastW) curN++; else { acc += curN; curN = 1; lastW = w; }
    if (i === pool.length - 1 || (pool[i + 1] && ZQ_CH_ENT[pool[i + 1].ch].words[0][0] !== w)) {
      bounds[String(acc + curN)] = 1;
    }
  });
  function cut(idx) {                               /* 节点切点：floor 位置→右侧最近原子边界 */
    if (idx >= m.total) return pool.length;
    let x = Math.floor(idx * pool.length / m.total);
    while (x < pool.length && !bounds[String(x)]) x++;
    return x;
  }
  const a = cut(m.idx), b = Math.max(cut(m.idx + 1), a + 1);
  return pool.slice(a, Math.min(b, pool.length)).map(function (c) { return c.ch; });
}

/* ---------- C. 题目构造（q 对象=接口契约；选项乱序种子驱动） ---------- */
function zqPadChars(ch, region, need, out, seen) { /* 干扰不足 → 区域池序确定性补位 */
  const cand = zqRegionChars(region);
  for (let i = 0; i < cand.length && out.length < need; i++) {
    const c = cand[i].ch;
    if (c !== ch && !seen[c] && ZQ_CH_ENT[c]) { seen[c] = 1; out.push(c); }
  }
  return out;
}
function zqCharOpts(ch, region, rnd) {             /* 字选项：目标+distract 3（不足区域字补） */
  const seen = {}, dis = [];
  seen[ch] = 1;
  (ZQ_CH_ENT[ch].distract || []).forEach(function (d) {
    if (!seen[d[0]] && dis.length < 3) { seen[d[0]] = 1; dis.push(d[0]); }
  });
  zqPadChars(ch, region, 3, dis, seen);
  const opts = zqShuffled([ch].concat(dis.slice(0, 3)), rnd);
  return { opts: opts, ans: opts.indexOf(ch) };
}
function zqWordOpts(ch, region, rnd) {             /* 词选项：words[0] 正确+3 干扰词（禁含目标字，互异） */
  const correct = ZQ_CH_ENT[ch].words[0][0];
  const seen = {}, dis = [];
  seen[correct] = 1;
  const cand = zqShuffled(zqRegionChars(region), rnd);
  for (let i = 0; i < cand.length && dis.length < 3; i++) {
    const c = cand[i].ch;
    if (c === ch || !ZQ_CH_ENT[c] || !ZQ_CH_ENT[c].words) continue;
    const w = ZQ_CH_ENT[c].words[0][0];
    if (w === correct || w.indexOf(ch) >= 0 || seen[w]) continue;
    seen[w] = 1; dis.push(w);
  }
  const opts = zqShuffled([correct].concat(dis), rnd);
  return { opts: opts, ans: opts.indexOf(correct) };
}
function zqMkQ(type, ch, region, rnd, save) {
  const ent = ZQ_CH_ENT[ch];
  const q = { type: type, ch: ch, py: ent.py, pyKey: ent.pyKey, words: ent.words,
              glyph: ent.glyph, distract: ent.distract, options: [], answer: 0,
              seedIdx: 0, region: region, challenge: 0, judge: type !== 't2',
              parts: ent.parts || null };            /* v4：补 parts（t2 C1 部件拼摆复活——91 字有数据主线从未触发） */
  if (type === 't1' || type === 't6') {
    const o = zqCharOpts(ch, region, rnd);
    q.options = o.opts; q.answer = o.ans;
  } else if (type === 't4') {
    const o = zqWordOpts(ch, region, rnd);
    q.options = o.opts; q.answer = o.ans;
  } else if (type === 't3') {                      /* 词挖空：display=首词挖本字；选项=字 */
    const o = zqCharOpts(ch, region, rnd);
    q.options = o.opts; q.answer = o.ans;
    q.display = ent.words[0][0].split(ch).join('＿');
  } else if (type === 't5') {                      /* 句子题首试版不入编排（sentences M2b 运行时读） */
    q.display = null;
  }
  return q;
}
/* 关内题序（seedIdx=M2b 选项乱序种子：每关从 1 起，关内确定——全局计数会破坏两跑全等） */
function zqPushQ(qs, q) { q.seedIdx = qs.length + 1; qs.push(q); return q; }

/* ---------- D. 关卡生成（new / boss；camp/morning 由 camp.js 同引擎产题） ---------- */
const ZQ_NEW_L2 = { t1: 1, t4: 2, t6: 3, t3: 2 };  /* 认知通道难度档（编排律 6 断言依据） */
function zqHasSent(ch) {                           /* R2+ 末字句题 debut：ZQ_SENTENCES 有句才出 t5 */
  var S = (typeof ZQ_SENTENCES !== 'undefined') && ZQ_SENTENCES;
  if (!S) return false;
  for (var i = 0; i < S.length; i++) {
    if (S[i] && String(S[i].text != null ? S[i].text : S[i]).indexOf(ch) >= 0) return true;
  }
  return false;
}
/* v58 编排律：同字判定位禁背靠背（t1 刚教马上考=零间隔提取，测量失真+重复感主源）。
   两轮分段（t1 段 chars 序 / L2 段反向）+ L2 末位换回末字（t5 关尾运用位语义不变）。
   注：相邻异型交替与「t1 先 L2 后」不可兼得（交替结构下 L2 序唯一解=恒等序=背靠背），
   故律2 断言升级为同字间隔律（verify ⑨ 同步）。 */
function zqL2Order(n) {
  const ord = [];
  for (let i = n - 1; i >= 0; i--) ord.push(i);    /* 反向：同字最小间隔最大化（≥2） */
  const li = ord.indexOf(n - 1);
  if (li !== n - 1) { const t = ord[n - 1]; ord[n - 1] = n - 1; ord[li] = t; }
  return ord;
}
function zqGenNew(key, save, today, rnd) {
  const n = ZQ_NODE[key], m = ZQ_NEWIDX[key];
  const chars = zqNodeChars(key, save);
  if (!chars.length) return null;                  /* 池尽（已知字全剔除的极端兜底=不生成 */
  const qs = [];
  chars.forEach(function (ch) {                    /* 开场 T2 逐字亮相（judge:false 演出位） */
    const q = zqMkQ('t2', ch, n.region, rnd, save); q.judge = false; zqPushQ(qs, q);
  });
  chars.forEach(function (ch) {                    /* 认识 T1 段（同型块=指令稳定，大班低负荷热身） */
    zqPushQ(qs, zqMkQ('t1', ch, n.region, rnd, save));
  });
  zqL2Order(chars.length).forEach(function (ci, k) { /* 辨认 T4/T6 段（反向错开，同字隔 ≥2 题）；R2+ 末字有句=T5（运用层关后半，律5 ≤2） */
    const ch = chars[ci];
    var L2 = k % 2 ? 't6' : 't4';
    if (n.region >= 2 && k === chars.length - 1 && zqHasSent(ch)) L2 = 't5';
    zqPushQ(qs, zqMkQ(L2, ch, n.region, rnd, save));
  });
  return { key: key, node: n, kind: 'new', region: n.region, chars: chars, qs: qs, qi: 0,
           miss: 0, retry: [], perf: {}, done: false, hp: 0, hpMax: 0, bossMiss: 0,
           restTaken: 0, save: save, today: today, rnd: rnd, newIdx: m };
}
function zqGenBoss(key, save, today, rnd) {
  const n = ZQ_NODE[key];
  const b = ZQ_CATALOG.bosses[n.region - 1];
  const hpMax = Math.max(8, Math.min(12, b.hp));
  const pool = zqShuffled(zqRegionChars(n.region).map(function (c) { return c.ch; }), rnd);
  const types = ['t1', 't4', 't3', 't6'];          /* 轮转=相邻不同型（R2 boss 词挖空在场） */
  const qs = [];
  for (let i = 0; i < hpMax; i++) zqPushQ(qs, zqMkQ(types[i % 4], pool[i % pool.length], n.region, rnd, save));
  return { key: key, node: n, kind: 'boss', region: n.region, chars: [], qs: qs, qi: 0,
           miss: 0, retry: [], perf: {}, done: false, hp: hpMax, hpMax: hpMax, bossMiss: 0,
           restTaken: 0, boss: b, save: save, today: today, rnd: rnd };
}
function zqGenLevel(key, save, today) {
  const n = ZQ_NODE[key];
  if (!n || !save) return null;
  const fd = save.firstDay || today;
  const rnd = zqMulberry32(zqHash(fd + '|' + today + '|' + key));
  if (n.type === 'new') return zqGenNew(key, save, today, rnd);
  if (n.type === 'boss') return zqGenBoss(key, save, today, rnd);
  return null;                                     /* camp/calib 由各模块生成；story 等占位 */
}
function zqBossMore(L) {                           /* boss 题尽 hp 未尽 → 确定性续题（永不失败） */
  const pool = zqRegionChars(L.region);
  const i = L.qs.length;
  const ch = pool[(i * 7 + 3) % pool.length].ch;
  zqPushQ(L.qs, zqMkQ(['t1', 't4', 't3', 't6'][i % 4], ch, L.region, L.rnd, L.save));
}

/* ---------- E. 判定引擎（zilearn engPick 式；verify 直驱同口） ----------
   返回：'right' 推进 / 'wrong' 错（miss+1，boss 计 bossMiss）/ 'rest' boss miss3 休息流 /
        'done' 通关 / false 拒收（演出题判错/已完/越界）。演出题 ok=纯推进不进 perf 账。 */
function zqEngAnswer(L, ok) {
  if (!L || L.done) return false;
  const q = L.qs[L.qi];
  if (!q) return false;
  if (!ok) {
    if (q.judge === false) return false;
    L.miss++;
    const p = L.perf[q.ch] = L.perf[q.ch] || { ok: 0, miss: 0 };
    p.miss++;
    if (L.kind === 'boss') {
      L.bossMiss++;
      if (L.bossMiss >= 3) {                       /* 喝口水休息：保留一半进度，永不失败 */
        L.bossMiss = 0; L.restTaken++;
        L.hp = L.hpMax - Math.ceil((L.hpMax - L.hp) / 2);
        return 'rest';
      }
    } else if (L.kind === 'new' && !q.retried) {
      L.retry.push({ ch: q.ch, avoid: q.type });   /* 错题重入队（每判定位一次） */
    }
    return 'wrong';
  }
  if (q.judge === false) { q.solved = true; L.qi++; return zqEngTail(L); }
  const p = L.perf[q.ch] = L.perf[q.ch] || { ok: 0, miss: 0 };
  p.ok++;
  q.solved = true;
  if (L.kind === 'boss') {
    L.hp--;
    if (L.hp <= 0) { L.done = true; return 'done'; }
    L.qi++;
    if (L.qi >= L.qs.length) zqBossMore(L);
    return 'right';
  }
  L.qi++;
  return zqEngTail(L);
}
function zqEngTail(L) {                            /* 关尾：重入队 append 或收卷 */
  if (L.qi < L.qs.length) return 'right';
  if (L.kind === 'new' && L.retry.length) {
    const r = L.retry.shift();
    const rq = zqMkQ(r.avoid === 't1' ? 't4' : 't1', r.ch, L.region, L.rnd, L.save);
    rq.retried = true;
    zqPushQ(L.qs, rq);
    return 'right';
  }
  L.done = true;
  return 'done';
}
function zqEngPick(L, i) {                         /* verify/autoSolve 直驱口（下标判定） */
  if (!L) return false;
  const q = L.qs[L.qi];
  return q ? zqEngAnswer(L, i === q.answer) : false;
}
const zqStars = L => !L ? 1 : (L.kind === 'boss' ? 3 : (L.miss === 0 ? 3 : (L.miss <= 2 ? 2 : 1)));

/* ================= M2a 流程层二：关卡循环 UI（覆盖层/注册表/渲染/反馈阶梯/救援/墙/结算）
    运行时依赖 game-main（wait/sfx/toast/finishNode/burst/zqSave/SAVE/zqToday/nodeLabel/KIDS）
    ——拼接序 game-main → level → calib → camp → qtypes（build _assemble_flow）。 ================= */

/* ---------- F. 关卡覆盖层（CSS+DOM 懒注入；动画只用 transform/opacity；触摸 ≥96） ---------- */
const ZQ_LV_CSS = [
'#zq-lv{position:fixed;inset:0;z-index:90;display:flex;flex-direction:column;background:#FBF6EC;',
'  animation:zq-lv-in .28s ease}',
'#zq-lv.hide{display:none}',
'@keyframes zq-lv-in{from{opacity:0;transform:translateY(26px)}to{opacity:1;transform:translateY(0)}}',
/* v3 改单1 派蒙场景框：顶弧云+底草条装饰（pointer-events:none 不挡交互；内容层 relative 提层） */
'.zq-lv-deco-top{position:absolute;left:-6%;right:-6%;top:-44px;height:116px;border-radius:50%;pointer-events:none;',
'  background:radial-gradient(50% 100% at 50% 100%,rgba(255,255,255,.8),rgba(255,255,255,0) 72%)}',
'.zq-lv-deco-grass{position:absolute;left:-2%;right:-2%;bottom:-22px;height:84px;pointer-events:none;',
'  background:linear-gradient(180deg,#A5D38C,#7CBF68);border-radius:46% 46% 0 0 / 44px 44px 0 0;',
'  box-shadow:inset 0 4px 0 rgba(255,255,255,.6),inset 0 -8px 0 rgba(74,59,46,.08)}',
'.zq-lv-deco-grass::after{content:"";position:absolute;left:8%;right:8%;bottom:26px;height:26px;',
'  border-radius:50% 50% 0 0 / 22px 22px 0 0;background:linear-gradient(180deg,#BCE3A6,#9BD486);',
'  box-shadow:inset 0 3px 0 rgba(255,255,255,.5)}',
'.zq-lv-top,.zq-lv-steps,.zq-lv-qwrap{position:relative;z-index:1}',
'.zq-lv-top{flex:0 0 auto;display:flex;align-items:center;gap:10px;padding:10px 16px 4px}',
'.zq-lv-btn{min-width:96px;min-height:96px;border-radius:24px;background:linear-gradient(180deg,#FFFDF6,#FFF1D8);',
'  border:2.5px solid #4A3B2E;box-shadow:inset 0 2px 0 rgba(255,255,255,.95),0 5px 0 #D8C9B4;',
'  font-size:19px;font-weight:800;display:flex;align-items:center;',
'  justify-content:center;gap:4px;transition:transform .15s}',
'.zq-lv-btn:active{transform:translateY(3px);box-shadow:inset 0 2px 0 rgba(255,255,255,.95),0 2px 0 #D8C9B4}',
'.zq-lv-title-wrap{flex:1 1 auto;min-width:0;text-align:center}',
'.zq-lv-title{font-size:21px;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
'.zq-lv-sub{font-size:14px;color:#8A7B6C;min-height:18px}',
'.zq-lv-steps{flex:0 0 auto;display:flex;align-items:center;justify-content:center;gap:7px;',
'  padding:6px 12px;min-height:26px;flex-wrap:wrap}',
'.zq-step{width:15px;height:15px;border-radius:50% 50% 50% 4px;background:#E5D5BC;border:2px solid #4A3B2E;',
'  transform:rotate(-45deg)}',
'.zq-step.done{background:linear-gradient(180deg,#A8D29A,#8FBF7F);box-shadow:inset 0 1.5px 0 rgba(255,255,255,.6)}',
'.zq-step.cur{background:linear-gradient(180deg,#FBE08A,#F5C445);animation:zq-step-pulse 1.6s ease-in-out infinite}',
'@keyframes zq-step-pulse{0%,100%{transform:rotate(-45deg) scale(1)}50%{transform:rotate(-45deg) scale(1.28)}}',
'.zq-hp-wrap,.zq-drop-wrap{display:flex;align-items:center;gap:5px}',
'.zq-hp{width:20px;height:14px;border-radius:5px;background:#E5D5BC;border:2px solid #4A3B2E}',
'.zq-hp.on{background:linear-gradient(180deg,#F2AC72,#E8975A)}',
'.zq-drop{width:13px;height:13px;border-radius:50% 50% 50% 4px;background:#E5D5BC;border:2px solid #4A3B2E;',
'  transform:rotate(-45deg)}',
'.zq-drop.on{background:linear-gradient(180deg,#A3CDEE,#7FB3E0)}',
'.zq-lv-qwrap{flex:1 1 auto;position:relative;overflow:hidden;padding:6px 16px 14px}',
'#zq-qbox{position:absolute;inset:6px 16px 14px;display:flex;flex-direction:column}',
/* 选项/题面 CSS 归 M2b qtypes（.zq-stem/.zq-opts/.zq-opt 全套）；level 仅保占位卡 .zq-ph——
   禁 #zq-qbox .zq-opt 前缀（特异性 1,1,0 会反向覆盖 M2b 字卡样式，b42 并行整合教训） */
'.zq-ph{flex:1 1 auto;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px}',
'.zq-ph-t{font-size:17px;color:#8A7B6C}',
'.zq-ph-zi{font-size:96px;font-weight:800;line-height:1.2}',
'.zq-ph-py{font-size:20px;color:#E8975A}',
'.zq-ph-g{font-size:16px;color:#8A7B6C;max-width:30em;text-align:center}',
'.zq-ph-btn{min-width:96px;min-height:96px;border-radius:24px;background:linear-gradient(180deg,#F2AC72,#E8975A);',
'  color:#FFF9EE;border:none;box-shadow:inset 0 2.5px 0 rgba(255,255,255,.5),0 5px 0 #C77A42;',
'  font-size:20px;font-weight:800}',
'.zq-ph-btn:active{transform:translateY(3px);box-shadow:inset 0 2.5px 0 rgba(255,255,255,.5),0 2px 0 #C77A42}',
'#zq-wall{position:absolute;inset:0;background:linear-gradient(180deg,#FDF9EF,#FBF3E2);display:flex;flex-direction:column;',
'  align-items:center;justify-content:center;gap:16px;z-index:3}',
'#zq-wall.hide{display:none}',
'.zq-wall-t{font-size:24px;font-weight:800}',
'.zq-wall-cards{display:flex;flex-wrap:wrap;justify-content:center;gap:14px;max-width:88vw}',
'.zq-wall-card{min-width:96px;min-height:96px;border-radius:20px;background:linear-gradient(180deg,#FFFDF6,#FFF1D8);',
'  border:2.5px solid #4A3B2E;box-shadow:inset 0 2px 0 rgba(255,255,255,.95),0 5px 0 #D8C9B4;',
  'display:flex;flex-direction:column;align-items:center;justify-content:center;',
'  gap:2px;transition:transform .2s}',
'.zq-wall-card.lit{background:linear-gradient(180deg,#FDE9AE,#F8D978);transform:scale(1.06);',
'  box-shadow:inset 0 2px 0 rgba(255,255,255,.95),0 5px 0 #D9B95E}',
'.zq-w-zi{font-size:42px;font-weight:800;line-height:1.1}',
'.zq-w-py{font-size:13px;color:#E8975A}',
'.zq-wall-sub{font-size:15px;color:#8A7B6C}',
'.zq-lv-rest{position:fixed;inset:0;z-index:96;background:rgba(74,59,46,.42);display:flex;',
'  align-items:center;justify-content:center;animation:zq-ov-in .3s ease}',
'@keyframes zq-ov-in{from{opacity:0}to{opacity:1}}',
'.zq-lv-rest .zq-box{background:linear-gradient(180deg,#FFFDF6,#FFF1D8);border:3px solid #4A3B2E;border-radius:28px;',
'  box-shadow:inset 0 3px 0 rgba(255,255,255,.95),0 6px 0 #D8C9B4,0 14px 28px rgba(74,59,46,.16);',
'  padding:26px 34px;display:flex;flex-direction:column;align-items:center;',
'  gap:12px;max-width:86vw}',
'.zq-rest-t{font-size:25px;font-weight:800}',
'.zq-rest-s{font-size:16px;color:#8A7B6C;text-align:center}',
'.zq-rest-btn{min-width:96px;min-height:96px;border-radius:24px;background:linear-gradient(180deg,#F2AC72,#E8975A);',
'  color:#FFF9EE;border:none;box-shadow:inset 0 2.5px 0 rgba(255,255,255,.5),0 5px 0 #C77A42;',
'  font-size:20px;font-weight:800}',
'@media (orientation:portrait){',
'  .zq-lv-title{font-size:18px}}'                   /* 触摸目标 ≥96 全向无例外（家族红线）；选项尺寸归 M2b */
].join('\n');
let ZQ_LV = null, ZQ_LV_CSS_DONE = false;
function zqLvEnsure() {
  if (!ZQ_LV_CSS_DONE) {
    const s = document.createElement('style');
    s.textContent = ZQ_LV_CSS;
    document.head.appendChild(s);
    ZQ_LV_CSS_DONE = true;
  }
  if (document.getElementById('zq-lv')) return;
  const el = document.createElement('div');
  el.id = 'zq-lv';
  el.className = 'hide';
  el.setAttribute('aria-label', '关卡');
  el.innerHTML = '<div class="zq-lv-deco-top" aria-hidden="true"></div>' +
    '<div class="zq-lv-deco-grass" aria-hidden="true"></div>' +
    '<div class="zq-lv-top">' +
    '<button class="zq-lv-btn" id="zq-lv-back" aria-label="回到地图">◂ 地图</button>' +
    '<div class="zq-lv-title-wrap"><div class="zq-lv-title" id="zq-lv-title"></div>' +
    '<div class="zq-lv-sub" id="zq-lv-sub"></div></div>' +
    '<button class="zq-lv-btn" id="zq-lv-hear" aria-label="再听一遍">🔊 听</button></div>' +
    '<div class="zq-lv-steps" id="zq-lv-steps"></div>' +
    '<div class="zq-lv-qwrap"><div id="zq-qbox"></div>' +
    '<div id="zq-wall" class="hide"><div class="zq-wall-t">本关新字</div>' +
    '<div class="zq-wall-cards"></div><div class="zq-wall-sub">点一点字卡，听听它的声音</div></div></div>';
  document.body.appendChild(el);
  document.getElementById('zq-lv-back').addEventListener('click', function () {
    if (!ZQ_LV) return;
    ZQ_LV = null;
    el.classList.add('hide');
    sfx('pop');
  });
  document.getElementById('zq-lv-hear').addEventListener('click', function () {
    if (!ZQ_LV) return;
    lastAct = Date.now();
    const q = ZQ_LV.qs[ZQ_LV.qi], d = q && ZQ_QT[q.type];
    if (d && d.onShow) d.onShow(q, ZQ_LV._api);     /* 注册型：重播归题型 */
    else zqSayQuestion(q);                          /* 占位兜底 */
  });
}

/* ---------- G. 题型注册表（M2b qtypes 同步自注册；未注册=占位卡兜底不崩） ---------- */
const ZQ_QT = {};
function zqRegisterQ(type, def) { ZQ_QT[type] = def; }

/* ---------- H. 语音键账（verify 防泄露断言依据；wrap 一次幂等） ---------- */
const ZQ_VLOG = [];
(function zqWireVoice() {
  if (typeof KIDS === 'undefined' || !KIDS.voice || !KIDS.voice.play) return;
  if (KIDS.voice._zqWrapped) return;
  const op = KIDS.voice.play, oq = KIDS.voice.queue;
  KIDS.voice.play = function (key) { ZQ_VLOG.push(['p', key]); return op.call(this, key); };
  KIDS.voice.queue = function (parts) {
    ZQ_VLOG.push(['q', parts.map(function (p) { return typeof p === 'string' ? p : (p && p.key); })]);
    return oq.call(this, parts);
  };
  KIDS.voice._zqWrapped = true;
})();

/* ---------- I. 关卡循环（渲染/api/判定 UI 化） ---------- */
let lastAct = 0, lastDir = 0, lastAns = 0, zqWrongChainUntil = 0;
const ZQ_RIGHT_WIN = 2400;                          /* 对题确认窗（2026-09-30 语音前移实长回填：zq_right=2280ms mutagen 实测+余量 120） */
function zqSayQuestion(q) {                         /* 题面语音（防泄露：视觉题禁播目标音；
                                                       无 VERIFY 守卫——救援路径 verify 直驱可测键账，KIDS 未 init 自静默） */
  if (!q || typeof KIDS === 'undefined') return;
  if (q.type === 't1') KIDS.voice.queue(['zq_listen', 'zq_ch_' + q.pyKey]);
  else if (q.type === 't2') KIDS.voice.play('zq_ch_' + q.pyKey);
  else if (q.type === 't5') KIDS.voice.play('zq_read_hint');
  else KIDS.voice.play('zq_word');
}
function zqRenderPlaceholder(q, box) {              /* M2b 未就位兜底：占位卡可跳过不崩 */
  const d = document.createElement('div');
  d.className = 'zq-ph';
  d.innerHTML = '<div class="zq-ph-t">题型加载中，先看一眼这个字</div>' +
    '<div class="zq-ph-zi">' + q.ch + '</div><div class="zq-ph-py">' + q.py + '</div>' +
    '<div class="zq-ph-g">' + (q.glyph || '') + '</div>';
  const b = document.createElement('button');
  b.className = 'zq-ph-btn';
  b.textContent = q.judge === false ? '继续' : '先跳过';
  b.addEventListener('click', function () { zqUiRight(); });
  d.appendChild(b);
  box.appendChild(d);
}
function zqLvProgress() {
  const L = ZQ_LV, box = document.getElementById('zq-lv-steps');
  if (!L || !box) return;
  if (L.kind === 'boss') {
    let h = '';
    for (let i = 0; i < L.hpMax; i++) h += '<i class="zq-hp' + (i < L.hp ? ' on' : '') + '"></i>';
    let w = '';
    for (let i = 0; i < 3; i++) w += '<i class="zq-drop' + (i < L.bossMiss ? ' on' : '') + '"></i>';
    box.innerHTML = '<span class="zq-hp-wrap">' + h + '</span><span class="zq-drop-wrap">' + w + '</span>';
    return;
  }
  let h = '';
  for (let i = 0; i < L.qs.length; i++) {
    h += '<i class="zq-step' + (i < L.qi ? ' done' : (i === L.qi ? ' cur' : '')) + '"></i>';
  }
  box.innerHTML = h;
}
function zqMakeApi(q, own) {                     /* own=反馈归属（未注册型 level 自担；M2b 注册型其 wirePick 全权） */
  return {
    right: function () { return zqUiRight(); },
    wrong: function () { return zqUiWrong(); },
    replay: function () {
      lastAct = Date.now();
      const d = ZQ_QT[q.type];
      if (d && d.onShow) d.onShow(q, ZQ_LV && ZQ_LV._api);   /* 错2/救援重播 → 题面音归题型 */
      else zqSayQuestion(q);                                  /* 占位兜底 */
    },
    lock: function (on) { if (ZQ_LV) ZQ_LV.qLock = !!on; },
    voice: function (k) { if (!ZQ_VERIFY && typeof KIDS !== 'undefined') KIDS.voice.play(k); },
    hint: function () { if (own) zqBreatheAns(q); },
    progress: function (cur, total) {
      const el = document.getElementById('zq-lv-sub');
      if (el) el.textContent = total > 1 ? (cur + ' / ' + total) : '';
    }
  };
}
/* v5 异常护栏（2026-10-01 用户 v4.1 死机教训：undefined.slice 炸断推进链，teardown 已清旧题
   +无新渲染=永久死机——「认完最后一个字画面不动」）。三级恢复：原样重渲染→跳题→强制结算；
   console.error 留 stack（playwright/家长控制台可取证根因） */
function zqCrashGuard(e, where) {
  try { console.error('[zq-crash:' + where + ']', e && e.stack || e); } catch (_) {}
  const L = ZQ_LV;
  if (!L) return;
  L.uiLock = false; L.qLock = false;                /* 双闸释放（锁死=死机体感主因） */
  try { zqRenderQRaw(); return; } catch (_) {}
  try {
    if (L.qi < L.qs.length - 1) { L.qi++; zqRenderQRaw(); return; }
  } catch (_) {}
  try { zqFinishFlow(L); } catch (_) {              /* 永不死机兜底：结算+解锁下一关 */
    const el = document.getElementById('zq-lv');
    if (el) el.classList.add('hide');
    try { finishNode(L.key, 1); } catch (_) {}
  }
}
function zqRenderQ() {
  try { zqRenderQRaw(); }
  catch (e) { zqCrashGuard(e, 'render'); }
}
function zqRenderQRaw() {
  const L = ZQ_LV;
  if (!L) return;
  const q = L.qs[L.qi];
  if (!q) return;
  zqLvProgress();
  const box = document.getElementById('zq-qbox');
  box.innerHTML = '';
  const sub = document.getElementById('zq-lv-sub');
  if (sub) sub.textContent = '';
  L.roundMiss = 0;
  const def = ZQ_QT[q.type];
  if (!def) {                                       /* 未注册=占位卡：题面音 level 自担（verify 也记键账） */
    zqRenderPlaceholder(q, box);
    zqSayQuestion(q);
  } else {
    const api = zqMakeApi(q, false);
    L._api = api;                                   /* replay/听键 回转 onShow 用 */
    def.render(q, box, api);
    if (def.onShow) def.onShow(q, api);             /* 注册型：题面音归题型（M2b 契约 onShow(q,api)） */
  }
  lastAct = Date.now(); lastDir = Date.now();
}
/* v4 P1：new 关标题主题化——关字组 cat 众数 ≥max(3, 60%) 显示「水果关/小厨房关」（具象类映射，
   动作/形容/虚词等抽象类不映射=回落默认「新字关N」；孩子不识字名由家长念，分类体感由标题直接给） */
const ZQ_CAT_TITLE = { '水果': '水果关', '蔬菜': '蔬菜关', '食物饮品': '好吃的关',
  '餐具厨具': '小厨房关', '身体': '身体关', '家人': '家人关', '动物': '动物关',
  '植物': '花草关', '自然天象': '天气关', '衣物': '衣服关', '文具': '文具关',
  '玩具': '玩具关', '学校': '幼儿园关', '场所': '去处关', '出行': '出门关',
  '方位': '方向关', '数字': '数字关' };
function zqLvCatTitle(L) {
  if (L.kind !== 'new' || !L.chars || !L.chars.length) return null;
  const cnt = {};
  L.chars.forEach(function (ch) {
    const k = ZQ_CH_ENT[ch] && ZQ_CH_ENT[ch].cat;
    if (k) cnt[k] = (cnt[k] || 0) + 1;
  });
  let best = null, bn = 0;
  Object.keys(cnt).forEach(function (k) { if (cnt[k] > bn) { bn = cnt[k]; best = k; } });
  if (!best || bn < Math.max(3, Math.ceil(L.chars.length * 0.6))) return null;
  return ZQ_CAT_TITLE[best] || null;
}
function zqLvTitle(L) {
  if (L.kind === 'boss') return L.boss ? L.boss.name : 'BOSS';
  if (L.kind === 'camp') return '复习营地';
  if (L.kind === 'morning') return '早安营地';
  return zqLvCatTitle(L) || nodeLabel(L.node);
}
function zqLvRun(L) {
  zqLvEnsure();
  ZQ_LV = L;
  L.uiLock = false; L.qLock = false; L.roundMiss = 0;
  zqWrongChainUntil = 0;
  lastAct = Date.now(); lastDir = Date.now(); lastAns = Date.now();
  const el = document.getElementById('zq-lv');
  el.classList.remove('hide');
  /* v3 改单1 派蒙场景底色：区色顶部晕染→暖米（boss 加深一档=对峙氛围；calib=暖橙） */
  const ac = zqAccent(L.region || 0);
  el.style.background = L.kind === 'boss'
    ? 'linear-gradient(180deg,' + zqLighten(ac, .18) + ' 0%,#FDF4E4 42%,#F9ECD6 100%)'
    : 'linear-gradient(180deg,' + zqLighten(ac, .58) + ' 0%,#FDF9EF 34%,#FBF3E2 100%)';
  document.getElementById('zq-lv-title').textContent = zqLvTitle(L);
  if (typeof KIDS !== 'undefined' && !ZQ_VERIFY) {
    if (L.kind === 'boss' && L.boss) KIDS.voice.play('zq_boss_' + L.boss.id);
    else if (L.kind === 'camp') KIDS.voice.play('zq_camp_go');
    else if (L.kind === 'morning') KIDS.voice.play('zq_morning');
  }
  zqRenderQ();
}

/* ---------- J. 判定 UI 化（题型经 api.right/wrong 进；演出锁 uiLock/qLock 双闸） ---------- */
function zqOptEl(i) { return document.querySelector('#zq-qbox [data-v="' + i + '"]'); }  /* M2b data.v=原始下标 */
function zqRefx(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
function zqBreatheAns(q) { const el = zqOptEl(q.answer); if (el) zqRefx(el, 'breathe'); }
function zqShakeOpts() {
  const c = document.querySelector('#zq-qbox .zq-opts');
  if (c) zqRefx(c, 'shake');
}
function zqDimOne(q) {                             /* 阶梯 3：摘 1 干扰（alive>3 才摘，不删 DOM） */
  const alive = document.querySelectorAll('#zq-qbox .zq-opt:not(.dimmed)');
  if (alive.length <= 3) return;
  for (let k = 0; k < alive.length; k++) {
    if (Number(alive[k].dataset.v) !== q.answer) { alive[k].classList.add('dimmed'); return; }
  }
}
async function zqUiRight() {
  try { return await zqUiRightRaw(); }
  catch (e) { zqCrashGuard(e, 'right'); return false; }
}
async function zqUiRightRaw() {
  const L = ZQ_LV;
  if (!L || L.uiLock || L.qLock) return false;
  const q = L.qs[L.qi], run = L;
  const ret = L.onAnswer ? L.onAnswer(true) : zqEngAnswer(L, true);   /* calib 动态流覆盖点 */
  if (ret === false) return false;
  lastAct = Date.now(); lastDir = Date.now(); lastAns = Date.now();
  if (ZQ_QT[q.type]) {                              /* M2b 已反馈（good/sfx/zq_right+rightMs 窗）→ 仅推进清场 */
    if (ret === 'done') { zqFinishFlow(run); return ret; }
    zqRenderQ();
    return ret;
  }
  L.uiLock = true;                                  /* 占位路径：level 自担反馈 */
  sfx('coin');
  const good = zqOptEl(q.answer);
  if (good) good.classList.add('good');
  if (!ZQ_VERIFY && q.judge !== false && typeof KIDS !== 'undefined') {
    KIDS.voice.queue(['zq_right', 'zq_ch_' + q.pyKey]);
  }
  await wait(ZQ_RIGHT_WIN * ZQ_SPEED);
  if (ZQ_LV !== run) return ret;
  L.uiLock = false;
  if (ret === 'done') { zqFinishFlow(run); return ret; }
  zqRenderQ();
  return ret;
}
async function zqUiWrong() {
  try { return await zqUiWrongRaw(); }
  catch (e) { zqCrashGuard(e, 'wrong'); return false; }
}
async function zqUiWrongRaw() {                     /* 错误反馈阶梯（zilearn F2 全套） */
  const L = ZQ_LV;
  if (!L || L.uiLock || L.qLock) return false;
  const q = L.qs[L.qi], run = L;
  const ret = L.onAnswer ? L.onAnswer(false) : zqEngAnswer(L, false); /* calib 动态流覆盖点 */
  if (ret === false) return false;
  lastAct = Date.now();
  L.roundMiss++;
  if (ret === 'rest') {                             /* boss miss3 休息流（两路径共通） */
    L.uiLock = true;
    await zqBossRestShow(run);
    if (ZQ_LV !== run) return ret;
    L.uiLock = false;
    zqRenderQ();
    return ret;
  }
  if (ZQ_QT[q.type]) {                              /* M2b 阶梯已反馈（wig/shake/鼓励/breathe/摘干扰）→ 仅状态 */
    if (ret === 'done') {                           /* calib 错在末题=先纠错窗再收口（改单2） */
      if (L.kind === 'calib') { await zqCalibTeach(run, q, true); return ret; }
      zqFinishFlow(run); return ret;
    }
    if (ret === 'right') {                          /* calib 动态流：错后当页纠错再推进（改单2，不再直跳） */
      if (L.kind === 'calib') { await zqCalibTeach(run, q, false); return ret; }
      zqRenderQ();
    }
    return ret;
  }
  L.uiLock = true;                                  /* 占位路径：level 自担错误阶梯（zilearn F2） */
  zqShakeOpts();
  sfx('fail');
  if (L.roundMiss >= 2) {
    if (!ZQ_VERIFY && typeof KIDS !== 'undefined') KIDS.voice.queue(['zq_wrong', 'zq_ch_' + q.pyKey]);
    zqBreatheAns(q);
    if (L.roundMiss === 3) zqDimOne(q);
    zqWrongChainUntil = Date.now() + 2600 * ZQ_SPEED + 400;
  } else {
    if (!ZQ_VERIFY && typeof KIDS !== 'undefined') KIDS.voice.play('zq_wrong');
    zqWrongChainUntil = Date.now() + 1300 * ZQ_SPEED + 200;
  }
  await wait(900 * ZQ_SPEED + 140);
  if (ZQ_LV !== run) return ret;
  L.uiLock = false;
  if (ret === 'done') { zqFinishFlow(run); return ret; }   /* calib 错在末题=收口 */
  if (ret === 'right') zqRenderQ();                 /* calib 动态流：错后推进下一题 */
  return ret;
}

/* ---------- K0. 定级错后当页纠错窗（改单2 2026-09-30：「当页纠正、不跳页」硬要求）
   摸底语义不变（bandAns 在 onAnswer 第一时间已记），此处只接管推进节奏：
   正确项金色 breathe 点亮 + queue[安抚, zq_ch 讲解「X，word的X」] 讲完再走。
   qLock 双保险：wirePick 错后 800ms 自解锁，窗内再点经 api.wrong→qLock 拒收防重复推进。 */
async function zqCalibTeach(L, q, finish) {
  L.qLock = true;
  const ok = zqOptEl(q.answer);
  if (ok) { zqRefx(ok, 'breathe'); ok.classList.add('lit'); }
  if (ZQ_VERIFY) {                                    /* verify 页键账可测（queue 分支 VERIFY 不走） */
    if (L._api) L._api.voice('zq_ch_' + q.pyKey);
  } else if (typeof KIDS !== 'undefined') {
    KIDS.voice.queue(['zq_calib_wrong', 'zq_ch_' + q.pyKey]);
  }
  await wait(4000 * ZQ_SPEED + 200);                  /* 串播实长≈3.6-4s（calib_wrong~1.4s+ch~2.3s）+余量 */
  if (ZQ_LV !== L) return;
  L.qLock = false;
  if (finish) { zqFinishFlow(L); return; }
  zqRenderQ();
}

/* ---------- K. boss 休息流（miss3=喝口水休息；半进度重试；永不失败） ---------- */
async function zqBossRestShow(L) {
  sfx('pop');
  if (ZQ_VERIFY) return;
  if (typeof KIDS !== 'undefined') KIDS.voice.play('zq_boss_rest');
  const ov = document.createElement('div');
  ov.className = 'zq-lv-rest';
  ov.innerHTML = '<div class="zq-box"><div class="zq-rest-t">喝口水，休息一下</div>' +
    '<div class="zq-rest-s">' + (L.boss ? L.boss.name : '它') + '累啦，我们保留一半进度，再来一次！</div>' +
    '<button class="zq-rest-btn">继续</button></div>';
  document.body.appendChild(ov);
  await new Promise(function (res) {
    ov.querySelector('.zq-rest-btn').addEventListener('click', res);
    setTimeout(res, 4200 * ZQ_SPEED);               /* 超时自动继续（家长侧不堵流程） */
  });
  ov.remove();
}

/* ---------- L. 无操作看护：14s 方向级 / 30s 答案级（keepIdle：救援均不刷 lastAct） ---------- */
const RESCUE_DIR_MS = 14000, RESCUE_ANS_MS = 30000, RESCUE_ANS_REPEAT = 15000;
function zqRescueCore() {
  const L = ZQ_LV;
  if (!L || L.done || L.uiLock || L.qLock) return;
  const now = Date.now();
  if (now < zqWrongChainUntil) return;              /* 错反馈链豁免窗（zilearn 契约 I） */
  if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel,.k-ov,.zq-lv-rest')) return;
  if (!document.getElementById('zq-wall') || !document.getElementById('zq-wall').classList.contains('hide')) return;
  const q = L.qs[L.qi];
  if (!q || q.judge === false) return;
  if (ZQ_QT[q.type]) return;                        /* 注册型：题型自带救援双锚（keepIdle 各自记账） */
  const idle = now - lastAct;
  if (idle > RESCUE_ANS_MS && now - lastAns > RESCUE_ANS_REPEAT) {
    zqBreatheAns(q);
    zqSayQuestion(q);
    lastAns = now;
    return;
  }
  if (idle > RESCUE_DIR_MS && now - lastDir > RESCUE_DIR_MS && idle <= RESCUE_ANS_MS) {
    zqSayQuestion(q);
    lastDir = now;
  }
}
function zqRescueTick() { if (!ZQ_VERIFY) zqRescueCore(); }
setInterval(zqRescueTick, 1000);

/* ---------- M. 生字墙（zilearn F1 式翻牌收字：点卡播字音=主动回忆） ---------- */
async function zqWallShow(L) {
  if (ZQ_VERIFY || !L.chars || !L.chars.length) return;
  zqLvEnsure();
  const wall = document.getElementById('zq-wall');
  const tray = wall.querySelector('.zq-wall-cards');
  tray.innerHTML = '';
  wall.classList.remove('hide');
  if (typeof KIDS !== 'undefined') KIDS.voice.play('zq_wall');
  await new Promise(function (resolve) {
    let lit = 0, over = false;
    const finish = function () { if (over) return; over = true; wall.classList.add('hide'); resolve(); };
    const timer = setTimeout(finish, 12000);        /* 家长侧超时兜底 */
    L.chars.forEach(function (ch) {
      const ent = ZQ_CH_ENT[ch];
      const card = document.createElement('button');
      card.className = 'zq-wall-card';
      card.innerHTML = '<span class="zq-w-zi">' + ch + '</span><span class="zq-w-py">' + ent.py + '</span>';
      card.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        if (typeof KIDS !== 'undefined') KIDS.voice.play('zq_ch_' + ent.pyKey);
        if (!card.classList.contains('lit')) {
          card.classList.add('lit');
          if (++lit === L.chars.length) {
            clearTimeout(timer);
            if (typeof KIDS !== 'undefined') KIDS.voice.play('zq_wall_done');
            setTimeout(finish, 700);
          }
        }
      });
      tray.appendChild(card);
    });
  });
}

/* ---------- N. 结算（SRS 写档/早安账/celebrate→墙→finishNode 收口） ---------- */
function zqFeedRecall(z, perf, today) {             /* boss/camp 回忆喂 srsNext（camp.js 复用） */
  Object.keys(perf).forEach(function (ch) {
    const p = perf[ch];
    if (!z.dex[ch]) return;
    for (let k = 0; k < p.ok; k++) z.dex[ch] = srsNext(z.dex[ch], true, today);
    for (let k = 0; k < p.miss; k++) z.dex[ch] = srsNext(z.dex[ch], false, today);
    if (z.dex[ch].miss >= 2) { if (z.weak.indexOf(ch) < 0) z.weak.push(ch); }
    else { const i = z.weak.indexOf(ch); if (i >= 0) z.weak.splice(i, 1); }
  });
}
function zqSettle(L, saveArg) {
  const sv = saveArg || SAVE;
  if (!sv || !sv.zq) return;                        /* VERIFY 空档视图禁写；verify 传 fixture 纯驱 */
  const z = sv.zq, today = sv === SAVE ? zqToday() : (L.today || zqToday());
  if (!z.dayLog[today]) z.dayLog[today] = { newChars: [], nodes: [], newDone: [], quests: [] };
  if (L.kind === 'new') {
    L.chars.forEach(function (ch) {
      const p = L.perf[ch] || { ok: 0, miss: 0 };
      z.dex[ch] = { st: 1, lv: 0, due: zqAddDays(today, 1), miss: p.miss, ok: p.ok };  /* 新学当日态：次日 due=早安 recap 刚性 */
      if (p.miss >= 2 && z.weak.indexOf(ch) < 0) z.weak.push(ch);
      if (z.dayLog[today].newChars.indexOf(ch) < 0) z.dayLog[today].newChars.push(ch);
    });
  } else {
    zqFeedRecall(z, L.perf, today);
    if (L.kind === 'camp') {                        /* 营地日次账（日一次+无限玩 0 币扩展依据） */
      const dl = z.dayLog[today];
      if (!dl.campPaid) dl.campPaid = [];
      if (dl.campPaid.indexOf(L.key) < 0) dl.campPaid.push(L.key);
    }
  }
}
async function zqFinishFlow(L, stars) {
  const st = arguments.length > 1 ? stars : zqStars(L);
  L.uiLock = true;
  sfx('win');
  if (ZQ_VERIFY) return;                            /* verify 页：引擎判定即止（不弹层不写档） */
  if (L.finishFlow) { L.finishFlow(L, st); return; } /* calib 等动态流自定义收口覆盖点
     （v5 契约修复 2026-10-01：此处旧传 st 单参——zqCalibFinishFlow(L) 形参当关卡对象用，
     实收数字→L.known.slice() 炸→新档定级收口死机「认完最后字卡住」；verify 页 VERIFY 提前
     return 测不出，真页 e2e 复现 CDP 栈坐实） */
  /* v58 关尾集中跟读：本关字逐字大声读（不可跳过），读完才进星结算屏——开口练习+仪式感；
     跟读表现不进星级判定（星级仍由答题 miss 定）。仅 new 关（boss=战斗节奏/营地自有收口） */
  if (L.kind === 'new' && window.ZQ && ZQ.RA && L.chars && L.chars.length) {
    await new Promise(function (done) { ZQ.RA.round(L.chars, done); });
  }
  zqSettle(L);
  await KIDS.ui.celebrate(st);
  await zqWallShow(L);
  document.getElementById('zq-lv').classList.add('hide');
  document.getElementById('zq-qbox').innerHTML = '';   /* v5：收口清题面（层 hide 后残留 opt 会招自动化/辅助工具误触） */
  ZQ_LV = null;
  finishNode(L.key, st);                            /* M1 收口：map/币/解锁/迷雾/兔子 hop/persist */
  burst(L.key);
}

/* ---------- O. 关卡入口（节点分发：new/boss 本层；camp/calib 转发；story 等占位） ---------- */
const ZQ_LEVEL = {
  start: function (key) {
    const today = zqToday(), n = ZQ_NODE[key];
    if (!n) return { ok: false, reason: 'no-node' };
    if (n.type === 'story') {
      if (window.ZQ && ZQ.Story && ZQ.Story.start(key)) return { ok: true, key: key, kind: 'story' };
      toast('这一站要等 M3/M4 开放，先去前面闯关吧');
      sfx('fail');
      return { ok: false, reason: 'm3m4' };
    }
    if (n.type === 'chest' || n.type === 'friend') {
      /* v57 M4 真分发：宝箱=金币收集点；friend=伙伴入队（comp.js grant+仪式弹层）。
         金币走 finishNode→zqNodeReward 统一入账（chest/friend 在表——此处不手动加，防双计）。
         VERIFY 空档：grant/finishNode 自守卫禁写，返回值供 verify 断言 */
      const isFriend = n.type === 'friend';
      const c = isFriend ? (window.ZQ && ZQ.Comp ? ZQ.Comp.grant(n.label) : null) : null;
      showBuild(n, isFriend
        ? ((c && !c.already) ? c.comp.name + ' 加入啦！' + c.comp.lines[0] : (c ? c.comp.name + ' 一直陪着你说：' + c.comp.lines[3] : '小伙伴加入啦！'))
        : '宝箱打开！+' + ZQ_ECON.chest + ' 金币，攒起来装扮家园吧');
      finishNode(key, isFriend ? 3 : 1);
      return { ok: true, key: key, kind: n.type };
    }
    if (n.type === 'calib') return ZQ_CALIB.start();
    if (n.type === 'camp') return ZQ_CAMP.start(key);
    const L = zqGenLevel(key, zSave(), today);
    if (!L) return { ok: false, reason: 'no-gen' };
    zqLvRun(L);
    return { ok: true, key: key, kind: L.kind };
  },
  next: function () { zqRenderQ(); },
  finish: function (stars) { if (ZQ_LV) zqFinishFlow(ZQ_LV, stars); }
};

/* ---------- P. 验收钩子（增补进 game-main 已建的 window.ZQ；getter 拷贝非活引用） ---------- */
window.ZQ.QT = ZQ_QT;
window.ZQ.registerQ = zqRegisterQ;
window.ZQ.Level = ZQ_LEVEL;
window.ZQ._genLevel = zqGenLevel;
window.ZQ._engPick = zqEngPick;
window.ZQ._engAnswer = zqEngAnswer;
window.ZQ._stars = zqStars;
window.ZQ._nodeChars = zqNodeChars;
window.ZQ._l2Order = zqL2Order;                    /* v58 编排律：verify 段式编排直驱钩子 */
window.ZQ._catTitle = zqLvCatTitle;                 /* v4 P1：verify 聚簇/主题化断言钩子 */
window.ZQ._mkQ = zqMkQ;
window.ZQ._lvState = function () {
  if (!ZQ_LV) return null;
  const L = ZQ_LV;
  return { key: L.key, kind: L.kind, qi: L.qi, n: L.qs.length, miss: L.miss, done: L.done,
           hp: L.hp, hpMax: L.hpMax, bossMiss: L.bossMiss, restTaken: L.restTaken,
           chars: L.chars.slice(), types: L.qs.map(function (q) { return q.type; }),
           retry: L.retry.map(function (r) { return r.ch + ':' + r.avoid; }) };
};
window.ZQ._curQ = function () {
  const L = ZQ_LV;
  if (!L) return null;
  const q = L.qs[L.qi];
  return q ? { type: q.type, ch: q.ch, judge: q.judge !== false } : null;
};
window.ZQ._renderQSim = function (q) {              /* verify 渲染直驱（占位卡/已注册型同口） */
  zqLvEnsure();
  const box = document.getElementById('zq-qbox');
  box.innerHTML = '';
  if (!q) return null;
  lastAct = Date.now(); lastDir = Date.now(); lastAns = Date.now();   /* 与 zqRenderQ 同锚（救援直驱起点） */
  const def = ZQ_QT[q.type];
  if (!def) { zqRenderPlaceholder(q, box); zqSayQuestion(q); return 'placeholder'; }
  const api = zqMakeApi(q, false);
  def.render(q, box, api);
  if (def.onShow) def.onShow(q, api);
  return q.type;
};
window.ZQ._vlog = function () { return ZQ_VLOG.slice(); };
window.ZQ._vlogClear = function () { ZQ_VLOG.length = 0; };
window.ZQ._settle = zqSettle;
window.ZQ._setLvVerify = function (L) { if (ZQ_VERIFY) ZQ_LV = L; };   /* verify 直驱专用（真页无效） */
window.ZQ._anchors = function () { return ZQ_VERIFY ? { lastAct: lastAct, lastDir: lastDir, lastAns: lastAns } : null; };
window.ZQ._idleHack = function (ms) {
  if (!ZQ_VERIFY) return;
  lastAct -= ms; lastDir -= ms; lastAns -= ms;
};
window.ZQ._rescueCore = function () { if (ZQ_VERIFY) zqRescueCore(); };
window.ZQ._uiRight = zqUiRight;
window.ZQ._uiWrong = zqUiWrong;
