/* ================= ziquest 纯引擎段（M1）：配额 / 节点解锁 / SRS / 经济 / 定级停止
   纪律：本段零 DOM、零 KIDS 依赖、零时钟读取（today 一律由调用方传入——确定性可测）。
   数据引用：ZQ_MAP/ZQ_CATALOG/ZQ_CHARS/ZQ_T（game-data.js 生成物，同 script 块前部）。
   M2 接入点：genLevel 关卡生成器/题型谱在此段扩展（SPEC §6.2 game-core 职责）。 */
'use strict';

/* ---------- 日限速（SPEC §1.4：只锁新字关；首日1/2-7日2/8日起3 封顶 + 家长 bonus） ---------- */
const ZQ_DAY_NEW = [1, 2, 2, 2, 2, 2, 2, 3];
function zqQuota(day, bonus) {           /* day=1-based；day≥8 恒取表尾 3 */
  day = Math.max(1, day | 0);
  return ZQ_DAY_NEW[Math.min(day, ZQ_DAY_NEW.length) - 1] + Math.max(0, bonus | 0);
}
function zqDayIndex(save, today) {       /* firstDay→today 的 1-based 天序（core 同式本地日） */
  const fd = save && save.firstDay;
  if (!fd) return 1;
  return Math.floor((new Date(today + 'T12:00:00') - new Date(fd + 'T12:00:00')) / 86400000) + 1;
}
function zqBonus(save, today) { return (save && save.bonus && save.bonus[today]) || 0; }
function zqNewSpent(save, today) {       /* 今日已完成新字关数（去重；M1 写档方维护 dayLog.newDone） */
  const dl = save && save.zq && save.zq.dayLog && save.zq.dayLog[today];
  return dl && dl.newDone ? dl.newDone.length : 0;
}
function zqDayDone(save, today) {        /* 今日新字关配额完（core calendar.dayDone 的本款自算版） */
  return zqNewSpent(save, today) >= zqQuota(zqDayIndex(save, today), zqBonus(save, today));
}

/* ---------- 地图索引（从 ZQ_MAP 派生：全局序=区域序展开，链前驱=数组前邻） ---------- */
const ZQ_REGIONS = ZQ_MAP.regions;
const ZQ_NODES = [];                      /* {key,region,type,label,x,y,next,prev} 全局序 */
const ZQ_NODE = {};                       /* key → node */
(function buildIndex() {
  ZQ_REGIONS.forEach(function (rg) {
    rg.nodes.forEach(function (nd, i) {
      const n = { key: nd.key, region: rg.id, type: nd.type, label: nd.label, x: nd.x, y: nd.y,
                  next: nd.next.slice(), prev: i ? rg.nodes[i - 1].key : null };
      ZQ_NODES.push(n); ZQ_NODE[nd.key] = n;
    });
  });
})();

/* ---------- 节点解锁纯函数（map.json meta.rules 真值：
   前节点完成→next 亮；本区全部 new 完成→boss 可进；击破前区 boss→区域迷雾消散） ---------- */
function zqNodeDone(save, key) {
  const m = save && save.zq && save.zq.map;
  return !!(m && m[key]);
}
function zqRegionOpen(save, r) {
  if (!(r > 0)) return true;
  const unlock = ZQ_REGIONS[r].unlock;
  if (unlock === 'first') return true;
  if (unlock.slice(-5) === '_boss') return zqNodeDone(save, ZQ_REGIONS[r - 1].boss);
  return zqNodeDone(save, unlock);
}
function zqRegionNewAllDone(save, r) {
  return ZQ_NODES.every(function (n) {
    return n.region !== r || n.type !== 'new' || zqNodeDone(save, n.key);
  });
}
/* 四态之一（不含 current——current=UI 层"兔子站位"语义，另由 curNodeKey 派生）：
   'done' 完成 / 'open' 可玩 / 'locked' 锁（前驱/区域/BOSS 门/新字日配额 四种锁因） */
function nodeState(save, key, today) {
  if (zqNodeDone(save, key)) return 'done';
  const n = ZQ_NODE[key];
  if (!n) return 'locked';
  if (!zqRegionOpen(save, n.region)) return 'locked';
  if (n.type === 'boss') {
    if (!zqRegionNewAllDone(save, n.region)) return 'locked';
  } else if (n.prev && !zqNodeDone(save, n.prev)) {
    return 'locked';
  }
  if (n.type === 'new' && today && zqDayDone(save, today)) return 'locked';
  return 'open';
}
/* 当前节点（兔子站位）：全局序第一个未完成且可达的节点；全图完成=终点 */
function curNodeKey(save, today) {
  for (let i = 0; i < ZQ_NODES.length; i++) {
    const n = ZQ_NODES[i];
    if (!zqNodeDone(save, n.key) && nodeState(save, n.key, today) === 'open') return n.key;
  }
  return ZQ_NODES[ZQ_NODES.length - 1].key;
}

/* ---------- SRS 调度纯函数骨架（SPEC §2.5：六态阶梯，对→进阶，错→减半+入薄弱） ---------- */
const SRS_IV = [1, 3, 7, 14, 30];        /* 见习+1 → 学徒+3 → 学者+7 → 精通+14 → 大师+30（日） */
function zqAddDays(today, d) {
  const t = new Date(today + 'T12:00:00');
  t.setDate(t.getDate() + d);
  return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
}
/* state: {st:0未学/1已学/2精通, lv:0..4 档, due:'YYYY-MM-DD', miss, ok}；ok=本次回忆成败 */
function srsNext(state, ok, today) {
  const s = state || { st: 0, lv: 0, due: null, miss: 0, ok: 0 };
  if (!ok) {                             /* 错：降一档且间隔减半（下界1日）、miss+1 → main 侧入 weak 池 */
    const lv = Math.max(0, s.lv - 1);
    return { st: Math.max(1, s.st), lv: lv, due: zqAddDays(today, Math.max(1, Math.floor(SRS_IV[lv] / 2))),
             miss: s.miss + 1, ok: s.ok };
  }
  const lv = Math.min(s.lv + 1, SRS_IV.length - 1);
  return { st: lv >= 3 ? 2 : Math.max(1, s.st), lv: lv, due: zqAddDays(today, SRS_IV[lv]),
           miss: s.miss, ok: s.ok + 1 };
}
/* due 池（确定性定序：dueDate 升序 → miss 降序 → 字全局序 region*1000+order） */
const ZQ_CH_NO = {};                      /* ch → 全局序（ZQ_CHARS 派生，M2 换 chNo 课标序仍走此表） */
(function buildChNo() {
  Object.keys(ZQ_CHARS).sort(function (a, b) { return a - b; }).forEach(function (r) {
    ZQ_CHARS[r].chars.forEach(function (c) {
      if (!(c.ch in ZQ_CH_NO)) ZQ_CH_NO[c.ch] = (+r) * 1000 + (c.order || 0);
    });
  });
})();
function srsDue(dex, today) {
  const out = [];
  Object.keys(dex).forEach(function (ch) {
    const s = dex[ch];
    if (s.st > 0 && s.due && s.due <= today) out.push(ch);
  });
  out.sort(function (a, b) {
    const A = dex[a], B = dex[b];
    return A.due < B.due ? -1 : A.due > B.due ? 1
      : B.miss - A.miss || (ZQ_CH_NO[a] || 0) - (ZQ_CH_NO[b] || 0) || (a < b ? -1 : 1);
  });
  return out;
}

/* ---------- 经济常量（catalog.json meta.economy 同步——单一真值源引用，禁手抄漂移） ---------- */
const ZQ_ECON = ZQ_CATALOG.meta.economy;
/* fail-fast：catalog 键集漂移即炸（build 侧另有独立对账） */
['newFirst', 'newFirst3star', 'newReplay', 'camp', 'chest', 'friend', 'bossFirst', 'bossReplay',
 'morning', 'quest', 'calibRight'].forEach(function (k) {
  if (typeof ZQ_ECON[k] !== 'number') throw new Error('ZQ_ECON missing ' + k);
});
function zqNodeReward(type, first) {     /* 节点完成入账（M1 写档通道用；M2 关卡结算同走此表） */
  if (type === 'new') return first ? ZQ_ECON.newFirst : ZQ_ECON.newReplay;
  if (type === 'camp') return ZQ_ECON.camp;
  if (type === 'chest') return ZQ_ECON.chest;
  if (type === 'friend') return ZQ_ECON.friend;
  if (type === 'boss') return first ? ZQ_ECON.bossFirst : ZQ_ECON.bossReplay;
  return 0;                              /* story/calib 无结算币（定级另按对题数计） */
}

/* ---------- 定级三带停止规则（SPEC §2.4：40/30/30 三带，晋级线 8/6，<4 即停，连错3 快停） ---------- */
const ZQ_CAL_BANDS = [40, 30, 30];
const ZQ_CAL_PASS = { 1: 8, 2: 6 };       /* 带1→带2 需对≥8；带2→带3 需对≥6；带3=末带 */
function zqHasStreak3(a) {
  let n = 0;
  for (let i = 0; i < a.length; i++) { n = a[i] ? 0 : n + 1; if (n >= 3) return true; }
  return false;
}
/* bandResults: [{band:1, answers:[true,false,…]}, …] 按带序已答记录（每带 ≤10 题）
   → {stop, band, next}：stop=定级应结束；next=0 结束 / k 下一带号（band=刚完成的带） */
function calStop(bandResults) {
  for (let i = 0; i < bandResults.length; i++) {
    const b = bandResults[i], right = b.answers.filter(Boolean).length;
    if (right < 4 || zqHasStreak3(b.answers)) return { stop: true, band: b.band, next: 0 };
    if (ZQ_CAL_PASS[b.band] === undefined) return { stop: true, band: b.band, next: 0 }; /* 带3 答完=结束 */
    if (right < ZQ_CAL_PASS[b.band]) return { stop: true, band: b.band, next: 0 };      /* 未达晋级线=温和停 */
    if (i === bandResults.length - 1) return { stop: false, band: b.band, next: b.band + 1 };
  }
  return { stop: false, band: 0, next: 1 }; /* 空记录=尚未作答：从带 1 起步（stop=false） */
}
