/* ================= ziquest M2a 流程层三：冷启动定级（calib.js）
   「和兔子玩认字游戏」（包装成游戏而非测验，设计 §2.4）：
   - 探针=T1 听音找字（与正式玩法零学习成本）；三带池=ZQ_CAL.meta.bands（easy40/mid30/hard30，
     build 注入自 data/calib-pool.json），带内 ≤10 题，全对/达晋级线升带（calStop 规则），
     上限 30 题 ≈3-4 分钟。
   - 对=+ZQ_ECON.calibRight 币（即时入账）+zq_calib_right；错=零惩罚（不标记不扣不进薄弱池），
     2026-09-30 改单2：错后当页纠错窗再推进（level zqCalibTeach——正确项金色 breathe+
     queue[zq_calib_wrong,zq_ch_讲解] 讲完再走；摸底记录第一时间落 bandAns 不受影响）；
     收口=zq_calib_done+写 SAVE.zq.cal（knownSet 供新字关目标剔除，
     zqNodeChars 已实现）+finishNode 写 map（calib 节点 0 结算币——定级另按对题数计）。
   - 动态自适应流走 level.js 关卡循环覆盖点（L.onAnswer/L.finishFlow）——演出锁/救援/
     反馈阶梯全套复用，零重写。
   - zqCalibSim=纯模拟器（verify 定级停止模拟直驱，无 DOM）。 */
'use strict';

const ZQ_CAL_BAND_LIM = 5;                          /* 每带 ≤5 题（v5 收紧 2026-10-01 用户 v4.1 试玩反馈
                                                       「一关 20 多个字太长」——实为定级 30 题长流程体感；
                                                       5×3 带=上限 15 题约 2 分钟，三带粗筛+SRS 复盘兜底） */
const ZQ_CAL_TOTAL_LIM = 15;
const ZQ_CAL_NAMES = ['easy', 'mid', 'hard'];

/* ---------- 纯模拟器（verify 直驱：patterns=每带答案序列 → 停止点/known/n） ---------- */
function zqCalibSim(patterns) {
  const bands = [], known = [];
  let n = 0;
  for (let b = 1; b <= 3; b++) {
    const answers = (patterns[b - 1] || []).slice(0, ZQ_CAL_BAND_LIM);
    const pool = ZQ_CAL.meta.bands[ZQ_CAL_NAMES[b - 1]];
    bands.push({ band: b, answers: answers });
    answers.forEach(function (a, i) {               /* 答对=池序第 i 字已知（收集口径=运行时一致） */
      if (a && known.indexOf(pool[i]) < 0) known.push(pool[i]);
    });
    n += answers.length;
    if (n >= ZQ_CAL_TOTAL_LIM) return { stop: true, why: 'cap', band: b, n: n, known: known };
    if (answers.length < ZQ_CAL_BAND_LIM) return { stop: true, why: 'band-cut', band: b, n: n, known: known };
    const st = calStop(bands);
    if (st.stop) return { stop: true, why: 'calStop', band: b, n: n, known: known };
    if (st.next === 0) return { stop: true, why: 'band3-done', band: b, n: n, known: known };
  }
  return { stop: true, why: 'all-done', band: 3, n: n, known: known };
}

/* ---------- 运行时（复用 level.js 关卡循环：zqLvRun/zqRenderQ/zqUiRight/Wrong） ---------- */
function zqCalibNext(L) {                           /* 带池洗牌序出 1 题（T1 包装） */
  const ch = L.bandPool[L.bi % L.bandPool.length];
  L.bi++;
  return zqMkQ('t1', ch, 1, L.rnd, L.save);
}
function zqCalibFinishFlow(L, stars) {              /* 收口：写 cal 档+celebrate+finishNode
   （v5：形参 (L, stars) 对齐 zqFinishFlow 覆盖点新契约——旧单参实收星级数字，
   L.known.slice() 炸=新档定级收口死机根因，2026-10-01 e2e CDP 栈坐实） */
  const today = zqToday();
  if (!ZQ_VERIFY && SAVE) {
    const z = SAVE.zq;
    z.cal = { done: L.known.slice(), band: L.band, skipSeen: !!z.cal.skipSeen };
    if (typeof KIDS !== 'undefined') KIDS.voice.play('zq_calib_done');
    KIDS.store.persist();
  }
  ZQ_LV = null;
  document.getElementById('zq-lv').classList.add('hide');
  document.getElementById('zq-qbox').innerHTML = '';   /* v5：收口清题面（与 zqFinishFlow 同防御——层 hide 后残留 opt 招误触） */
  finishNode(L.key, stars || 1);                    /* calib 完成=1★过点（0 结算币，定级币已即时入账） */
  if (L.onDone) L.onDone(L.known.slice());
}
const ZQ_CALIB = {
  /* start(onDone(knownSet))：定级节点 r0n02 入口（ZQ.Level.start 分发）。
     L/onAnswer 构造抽到 zqCalibMkL（v572：verify 直驱答错重试断言用——UI 层此前零断言=漏网根因） */
  start: function (onDone) {
    if (ZQ_VERIFY) return { ok: false, reason: 'verify' };   /* verify 页走 zqCalibSim 直驱 */
    const today = zqToday(), sv = zSave();
    const L = zqCalibMkL(sv, today, onDone);
    zqPushQ(L.qs, zqCalibNext(L));                  /* 首题 */
    if (!ZQ_VERIFY && typeof KIDS !== 'undefined') KIDS.voice.play('zq_calib_start');
    zqLvRun(L);
    return { ok: true, key: 'r0n02', kind: 'calib' };
  }
};
function zqCalibMkL(sv, today, onDone) {
    const n = ZQ_NODE['r0n02'];
    const rnd = zqMulberry32(zqHash((sv.firstDay || today) + '|' + today + '|calib'));
    const L = { key: 'r0n02', node: n, kind: 'calib', region: 0, chars: [], qs: [], qi: 0,
                miss: 0, retry: [], perf: {}, done: false, hp: 0, hpMax: 0, bossMiss: 0,
                restTaken: 0, band: 1, bi: 0, bandAns: [], bands: [], n: 0, known: [],
                bandPool: zqShuffled(ZQ_CAL.meta.bands.easy, rnd),
                save: sv, today: today, rnd: rnd, onDone: onDone || null,
                finishFlow: zqCalibFinishFlow };
    L.onAnswer = function (ok) {
      const q = L.qs[L.qi];
      if (!q) return false;
      /* v572 热修（用户实测「选错直接跳下一页」）：定级答错不推进——同题重答，与 zqEngAnswer
         六题型「错不推进」纪律对齐（改单2 当时只做了先教再走，漏了重答位）。首错落账一次
         （_missed 旗子），重试答对不再记账（防 bandAns 混入补答污染升带/总量判定）。 */
      if (!ok) {
        if (!q._missed) { q._missed = 1; L.bandAns.push(false); L.n++; }
        if (L.n >= ZQ_CAL_TOTAL_LIM) { L.done = true; return 'done'; }
        return 'right';    /* 'right'→zqCalibTeach 纠错窗照走；qi 未动，窗尾 zqRenderQ 重挂原题 */
      }
      if (!q._missed) { L.bandAns.push(true); L.n++; }
      if (L.known.indexOf(q.ch) < 0) L.known.push(q.ch);
      if (SAVE) { SAVE.zq.coins += ZQ_ECON.calibRight; refreshHud(); }   /* 每对+2 币即时（不 persist，收口一并落盘） */
      if (!ZQ_VERIFY && typeof KIDS !== 'undefined') KIDS.voice.play('zq_calib_right');
      if (L.n >= ZQ_CAL_TOTAL_LIM) { L.done = true; return 'done'; }
      if (L.bandAns.length >= ZQ_CAL_BAND_LIM) {    /* 带满 → calStop 升带/停止 */
        L.bands.push({ band: L.band, answers: L.bandAns.slice() });
        const st = calStop(L.bands);
        if (st.stop || !st.next || st.next > 3) { L.done = true; return 'done'; }
        L.band = st.next;
        L.bandAns = [];
        L.bi = 0;
        L.bandPool = zqShuffled(ZQ_CAL.meta.bands[ZQ_CAL_NAMES[L.band - 1]], L.rnd);
      }
      L.qi++;
      zqPushQ(L.qs, zqCalibNext(L));
      return 'right';
    };
    return L;
}
window.ZQ._calibL = zqCalibMkL;
window.ZQ.Calib = ZQ_CALIB;
window.ZQ._calibSim = zqCalibSim;
window.ZQ.CalibStart = ZQ_CALIB.start;              /* level.js ZQ_LEVEL 分发引用（跨段常量） */
