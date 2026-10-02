/* ================= ziquest M2a 流程层四：复习营地 + 早安营地（camp.js）
   复习营地节点（camp）：srsDue 池（dueDate 升序→miss 降序→字序，engine 定序）取 6 字，
   T4/T1/T6 轮转 6 题（相邻不同型）；完成=finishNode 收口（camp 币 6，首通一次）；
   dayLog.campPaid 日次账（「日一次+之后无限玩 0 币」的扩展依据——首试版 done 节点
   重进受 game-main tapNode done 分支锁死，无限重玩留主线 M3 决策，报告已声明）。
   早安营地（morning，设计 §2.5 通道①）：进图 1.2s 后自动检查——今日未做且昨日有新字
   →弹昨日新字 recap 3 题（T1/T4/T1），morning 币 3+dayLog.morningDone 日一次；
   回忆喂 SRS（昨日新字 due=今日 到期→对=srsNext 进阶——+1 日间隔刚性执行）。
   两营均复用 level.js 关卡循环（静态 qs+zqEngAnswer/zqFinishFlow 覆盖点）。 */
'use strict';

const ZQ_CAMP_N = 6;                                /* 营地 6 题（SPEC 独立表对账） */
const ZQ_MORNING_N = 3;                             /* 早安 recap 3 题 */

/* ---------- 营地字池：due 池优先 → 薄弱池补 → 本区已学 → 本区字兜底（确定性链）
   v58 编排律：今日新学字（dayLog.newChars）当日不进营地——当天刚学当天营地里重教
   =「怎么又是这个字」重复感最大来源；SRS 语义=隔天起复现（早安营地 recap 昨日字） ---------- */
function zqCampPool(save, today, region, n) {
  const z = save && save.zq || { dex: {}, weak: [] };
  const fresh = (save && save.zq && save.zq.dayLog && save.zq.dayLog[today] && save.zq.dayLog[today].newChars) || [];
  const notFresh = function (ch) { return fresh.indexOf(ch) < 0; };
  let pool = srsDue(z.dex, today).filter(notFresh).slice(0, n);   /* engine 定序快照 */
  if (pool.length < n) {
    z.weak.forEach(function (ch) { if (pool.length < n && notFresh(ch) && pool.indexOf(ch) < 0 && z.dex[ch]) pool.push(ch); });
  }
  if (pool.length < n) {                            /* 本区已学字（dex 有档）兜底 */
    const learned = zqRegionChars(region).map(function (c) { return c.ch; })
      .filter(function (ch) { return notFresh(ch) && z.dex[ch] && pool.indexOf(ch) < 0; });
    pool = pool.concat(learned.slice(0, n - pool.length));
  }
  if (pool.length < n) {                            /* 全新档极端兜底=本区字 */
    zqRegionChars(region).forEach(function (c) {
      if (pool.length < n && pool.indexOf(c.ch) < 0) pool.push(c.ch);
    });
  }
  return pool.slice(0, n);
}

/* ---------- 复习营地节点（ZQ.Camp.start(key)，ZQ.Level.start 分发） ---------- */
function zqGenCamp(key, save, today) {
  const n = ZQ_NODE[key];
  if (!n) return null;
  const rnd = zqMulberry32(zqHash((save.firstDay || today) + '|' + today + '|' + key));
  const chars = zqCampPool(save, today, n.region, ZQ_CAMP_N);
  if (!chars.length) return null;
  const cyc = ['t4', 't1', 't6', 't4', 't1', 't6'];
  const qs = [];
  for (let i = 0; i < chars.length; i++) zqPushQ(qs, zqMkQ(cyc[i % cyc.length], chars[i], n.region, rnd, save));
  return { key: key, node: n, kind: 'camp', region: n.region, chars: chars, qs: qs, qi: 0,
           miss: 0, retry: [], perf: {}, done: false, hp: 0, hpMax: 0, bossMiss: 0,
           restTaken: 0, save: save, today: today, rnd: rnd };
}
const ZQ_CAMP = {
  start: function (key) {
    if (ZQ_VERIFY) return { ok: false, reason: 'verify' };
    const L = zqGenCamp(key, zSave(), zqToday());
    if (!L) return { ok: false, reason: 'no-gen' };
    zqLvRun(L);                                     /* kind='camp'：zq_camp_go 开场语音 */
    return { ok: true, key: key, kind: 'camp' };
  },
  /* 早安营地（进图自动触发，非地图节点——morning 币自结不走 finishNode） */
  morning: function () {
    if (ZQ_VERIFY || !SAVE) return { ok: false, reason: 'skip' };
    const today = zqToday(), z = SAVE.zq;
    const yest = zqAddDays(today, -1);
    const yd = z.dayLog[yest] || {};
    const chars = (yd.newChars || []).slice(0, ZQ_MORNING_N);
    if (!chars.length) return { ok: false, reason: 'no-yest' };
    const dl = z.dayLog[today] = z.dayLog[today] || { newChars: [], nodes: [], newDone: [], quests: [] };
    if (dl.morningDone) return { ok: false, reason: 'done-today' };
    const L = zqGenMorning(chars, SAVE, today);
    L.finishFlow = zqMorningFinish;
    zqLvRun(L);                                     /* kind='morning'：zq_morning 开场语音 */
    return { ok: true, kind: 'morning', chars: chars.slice() };
  }
};
/* 早安关生成（纯函数，verify 直驱）：昨日新字前 N 字 T1/T4/T1 交错 recap */
function zqGenMorning(chars, save, today) {
  const rnd = zqMulberry32(zqHash((save.firstDay || today) + '|' + today + '|morning'));
  const cyc = ['t1', 't4', 't1'];
  const region = zqCampRegionOf(chars);
  const qs = [];
  for (let i = 0; i < chars.length; i++) zqPushQ(qs, zqMkQ(cyc[i % cyc.length], chars[i], region, rnd, save));
  return { key: 'morning', node: null, kind: 'morning', region: region, chars: chars.slice(), qs: qs, qi: 0,
           miss: 0, retry: [], perf: {}, done: false, hp: 0, hpMax: 0, bossMiss: 0,
           restTaken: 0, save: save, today: today, rnd: rnd };
}
function zqCampRegionOf(chars) {                    /* 字→所在区（ZQ_CH_NO 全局序 r*1000） */
  const no = ZQ_CH_NO[chars[0]] || 0;
  return Math.max(1, Math.min(7, Math.floor(no / 1000) || 1));
}
function zqMorningFinish() {                        /* 早安收口：币 3+日次标记+SRS 喂+persist */
  const today = zqToday(), z = SAVE.zq;
  zqFeedRecall(z, ZQ_LV.perf, today);
  z.coins += ZQ_ECON.morning;
  z.dayLog[today].morningDone = true;
  refreshHud();
  if (typeof KIDS !== 'undefined') KIDS.store.persist();
  const chars = ZQ_LV.chars;
  ZQ_LV = null;
  document.getElementById('zq-lv').classList.add('hide');
  toast('早安营地完成，+' + ZQ_ECON.morning + ' 金币');
  if (typeof KIDS !== 'undefined') KIDS.ui.celebrate(3);
  return chars;
}
/* 进图自动检查（延迟 1.2s——game-main 启动段完成后；今日已做/昨日无新字=静默跳过） */
function zqMorningCheck() {
  if (ZQ_VERIFY || !SAVE) return;
  ZQ_CAMP.morning();
}
setTimeout(zqMorningCheck, 1200);

window.ZQ.Camp = ZQ_CAMP;
window.ZQ.CampStart = ZQ_CAMP.start;                /* level.js ZQ_LEVEL 分发引用（跨段常量） */
window.ZQ._genCamp = zqGenCamp;
window.ZQ._genMorning = zqGenMorning;
window.ZQ._campPool = zqCampPool;
