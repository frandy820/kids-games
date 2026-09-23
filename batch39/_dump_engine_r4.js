// cir r4 引擎转储（node vm 跑 _src/game-data.js+game-core.js，无 DOM）：
// 输出 SPEC_TABLE 原文 + 常量 + flat0-39 全题最小字段 JSON——供 python 独立对账
const fs = require('fs'), vm = require('vm');
const SRC = 'F:/claudecode/projects/active/kids-games/batch39/cir/_src/';
const ctx = vm.createContext({ console });
vm.runInContext(fs.readFileSync(SRC + 'game-data.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync(SRC + 'game-core.js', 'utf8'), ctx);
const out = vm.runInContext(`(() => {
  const CONST = { LIT_MS, FLOW_MS, FULL_WIN, WRONG_CHAIN_WIN, WRONG_LOCK_1,
    PRED_CHAIN_WIN, PRED_LOCK_1, BRIGHT_CHAIN_WIN, BRIGHT_LOCK_1, WRONG_LOCK_2,
    PRED_OK_MS, REVEAL_MS, CUT_MS, BUNNY_MS, NIGH_MS, SPAN, CH_LEN, STATIC_LEVELS,
    PRED_KINDS, PRED_LABELS, GEN_HINTS };
  const chapters = {};
  for (const k of [1, 2, 3, 4]) chapters[k] = CHAPTERS[k];
  const flats = [];
  for (let f = 0; f < 40; f++) {
    const L = genLevel(f);
    flats.push({ flat: f, ch: L.ch, dch: L.dch, lv: L.lv, rows: L.rows,
      quizzes: L.quizzes.map(q => ({ kind: q.kind, layout: q.layout,
        blank: q.blank, blankAt: q.blankAt, need: q.need,
        second: q.second, branch: q.branch ? { bridge: q.branch.bridge, sw: q.branch.sw } : null,
        short: q.short, sw: q.sw, litAns: q.litAns, brightAns: q.brightAns, predAns: q.predAns,
        picks: q.picks, answer: q.answer, deadIdx: q.deadIdx,
        slots: q.slots.map(s => ({ k: s.k, type: s.type, part: s.part, on: s.on })) })) });
  }
  return JSON.stringify({ CONST, CHAPTERS: chapters, SPEC_TABLE, VOICE, flats });
})()`, ctx);
process.stdout.write(out);
