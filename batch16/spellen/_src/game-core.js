/* ================= spellen 纯引擎：确定性关卡生成 + 三题型判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）
   r16 三题型（SPEC-BATCH16 §2-r16，7-8 岁难度锚=主动拼写回忆）：
   listen  听音拼词：喇叭+目标格+瓦片池（词全部字母+干扰 2-3 个），逐字母点选入格
   missing 缺字母填空：词卡亮出大半字母，缺 1-2 位（dch≤2 缺 1 非首位/≥3 缺 2 任意位）
           +字母选项卡 3/4 张（互异正确字母集+干扰，b/d 翻转对优先）
   meaning 中文释义→拼写：释义卡+瓦片池（同 listen 池规则；不自动播词音=主动回忆）
   难度章梯度：dch1 CVC+CVCe 起步 / dch2 CVCe / dch3 辅音簇 / dch4 双音节
   干扰字母硬约束（§2 verify 断言）：互异 + 不在目标词字母集内（⇒池必可拼出目标词）+
   干扰组本身不构成完整英文词 + 全池不 anagram 成另一同长完整英文词（WORDLIST 过滤）+
   b/d 同形翻转对（AUDIT-78 ④：词含 b∉d→干扰含 d；含 d∉b→干扰含 b）
   数据模型：listen/meaning q._bt[j]=入格瓦片索引或 -1；q._used[i]=瓦片是否已入格；
   依序入格=找最左空位；拼满即判：built 串===word → right（推进，唯一重置救援钟主路径）；
   ≠word → wrong（miss/retries 各 +1，字母留格可点退回，零惩罚）；退回=探索不计 miss。
   missing q.blanks=缺位索引升序，q.cur=当前待填空序，q.filled=已填字母数组；
   点选项：opts[i]===word[blanks[cur]] → 填入（最后一空填对=right/done 推进）；
   ≠ → wrong（miss +1 可重点，选项不消失零惩罚）。 */
function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function shuffled(arr, rnd) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}
const ri = (rnd, lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1)); // [lo,hi] 闭区间整数
/* 进度章号单调递增；难度章号：静态关 (ch-1)%4+1 循环，生成关随机 1-4（§0.3） */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % 4 + 1;
/* 每章干扰规模（§2-r16 定版：瓦片干扰 dch≤2 取 2、dch≥3 取 3；missing 选项 3/4 见 genQuiz） */
const distractorCount = dch => dch <= 2 ? 2 : 3;

/* ---------- 瓦片干扰字母挑选（确定性）：候选=常用字母−目标词字母集，洗牌后贪心过约束
   约束①互异（set 语义）②chosen 串本身≠词表词 ③word+chosen 不 anagram 成另一同长词
   b/d 同形翻转对（AUDIT-78 ④）：bdPairOf(word) 非 null 时排候选首位优先入选
   （翻转对字母同过全部约束，极少数组合被剔则贪心顺延——verify 80 关域断言兜底）
   候选 ≥15 个、约束仅剔除少量组合：贪心必足额（verify 80 关+全量域断言兜底） ---------- */
function pickDistractors(rnd, word, n) {
  const inW = {};
  for (const c of word) inW[c] = 1;
  const bd = bdPairOf(word);
  const cands = shuffled(COMMON_LETTERS.filter(c => !inW[c]), rnd);
  if (bd) {
    const k = cands.indexOf(bd);
    if (k >= 0) cands.splice(k, 1);
    cands.unshift(bd);
  }
  const chosen = [];
  for (const c of cands) {
    if (chosen.length >= n) break;
    const trial = chosen.concat([c]).join('');
    if (distractorIsWord(trial)) continue;                    /* 干扰组本身=完整词（如 on/at/cat） */
    if (poolAnagramOther(word + trial, word)) continue;       /* 全池可拼成另一完整词（如 cat+er=crate） */
    chosen.push(c);
  }
  return chosen;
}

/* ---------- missing 选项干扰挑选：候选=常用字母−词字母集−正确字母集（避免与可见字母
   重复弱化辨析）；b/d 翻转对（正确字母 b→干扰含 d；d→含 b；翻转对已在词内可见则放弃）
   ——单字母候选无"组构成词"约束（离散选项非池），仅互异 ---------- */
function pickOptDistractors(rnd, word, uniq, n) {
  const cands = COMMON_LETTERS.filter(c => word.indexOf(c) < 0 && uniq.indexOf(c) < 0);
  let bd = null;
  if (uniq.indexOf('b') >= 0 && uniq.indexOf('d') < 0) bd = 'd';
  else if (uniq.indexOf('d') >= 0 && uniq.indexOf('b') < 0) bd = 'b';
  if (bd && word.indexOf(bd) >= 0) bd = null;                 /* 翻转对=词内可见字母，无辨析价值 */
  const sh = shuffled(cands, rnd);
  const out = [];
  if (bd && n > 0) { out.push(bd); }
  for (const c of sh) {
    if (out.length >= n) break;
    if (out.indexOf(c) < 0) out.push(c);
  }
  return out;
}

/* ---------- 单题生成（三型） ---------- */
function genQuiz(type, dch, word, rnd) {
  if (type === 'missing') {
    const nBlanks = dch <= 2 ? 1 : 2;
    /* dch≤2 缺 1 位非首位（保首字母线索起步）；dch≥3 缺 2 位任意（可含首字母=更难） */
    const pos = [];
    for (let j = (dch <= 2 ? 1 : 0); j < word.length; j++) pos.push(j);
    const blanks = shuffled(pos, rnd).slice(0, nBlanks).sort((a, b) => a - b);
    const uniq = [];                                          /* 缺位正确字母互异集合 */
    for (const j of blanks) if (uniq.indexOf(word[j]) < 0) uniq.push(word[j]);
    const nOpts = dch <= 2 ? 3 : 4;
    const dis = pickOptDistractors(rnd, word, uniq, nOpts - uniq.length);
    return { kind: 'spellen', type: 'missing', word: word, blanks: blanks, cur: 0,
      filled: [], opts: shuffled(uniq.concat(dis), rnd),
      face: VOICE.missing.text, miss: 0, solved: false };
  }
  const dis = pickDistractors(rnd, word, distractorCount(dch));
  const tiles = shuffled(word.split('').concat(dis), rnd);
  return { kind: 'spellen', type: type, word: word, tiles: tiles,
    _bt: word.split('').map(function () { return -1; }),
    _used: tiles.map(function () { return false; }),
    face: type === 'listen' ? VOICE.hint.text : VOICE.mean.text,
    mean: type === 'meaning' ? MEANS[word] : undefined,
    miss: 0, solved: false };
}

/* ---------- 题型序列：q0 恒 listen（教学演示=听音拼词范式，r16 定版）；
   后 7 题按 TYPE_MIX[dch] 配比洗牌（同关配比恒定、顺序确定性） ---------- */
function typeSeq(dch, rnd) {
  const rest = [];
  ['listen', 'missing', 'meaning'].forEach(function (t) {
    for (let k = 0; k < TYPE_MIX[dch][t]; k++) rest.push(t);
  });
  return ['listen'].concat(shuffled(rest, rnd));
}

/* ---------- 关卡生成（静态 40 关与生成关同一确定性通道；同关 8 词互异）
   15 词池洗牌取 8（CH_LEN）；flat≥STATIC 生成关 dch=ri(rnd,1,4)（§0.3 batch11 M1 定版） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  const dch = flat < STATIC_LEVELS ? diffOfCh(ch) : ri(rnd, 1, 4);
  const words = shuffled(WORDS60[dch], rnd).slice(0, CH_LEN);
  const seq = typeSeq(dch, rnd);
  const quizzes = words.map(function (w, k) { return genQuiz(seq[k], dch, w, rnd); });
  return { flat: flat, ch: ch, dch: dch, lv: lv, quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 拼词引擎（无 DOM；listen/missing/meaning 三型） ---------- */
const builtOf = q => q._bt.map(t => t >= 0 ? q.tiles[t] : null);
const stepOf = q => q._bt.reduce((s, t) => s + (t >= 0 ? 1 : 0), 0);

/* engTapTile(L, i)：点池中第 i 块瓦片（listen/meaning）→ 入最左空格；返回
   'placed'（未满）/ 'right'|'done'（拼满且对，step 推进）/ 'wrong'（拼满且错，miss 计一次）
   / null（非法：越界、瓦片已用、missing 题、关已结束）。放瓦片=探索不重置救援钟（§0.7a） */
function engTapTile(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (q.type === 'missing') return null;                     /* missing 走 engTapOption */
  if (typeof i !== 'number' || Math.floor(i) !== i || i < 0 || i >= q.tiles.length) return null;
  if (q._used[i]) return null;
  const j = q._bt.indexOf(-1);
  if (j < 0) return null;
  q._bt[j] = i;
  q._used[i] = true;
  if (stepOf(q) === q.word.length) {
    if (builtOf(q).join('') === q.word) {
      q.solved = true;
      L.step++;
      if (L.step >= L.quizzes.length) L.done = true;
      return L.done ? 'done' : 'right';
    }
    q.miss++;
    L.retries++;
    return 'wrong';
  }
  return 'placed';
}
/* engTapBuilt(L, j)：点第 j 格已拼字母退回池（该瓦片复活）→ 返回新 step；
   非法下标/空格 → null。退回=探索不计 miss 不重置救援钟（§0.7a） */
function engTapBuilt(L, j) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (q.type === 'missing') return null;
  if (typeof j !== 'number' || Math.floor(j) !== j || j < 0 || j >= q.word.length) return null;
  if (q._bt[j] < 0) return null;
  q._used[q._bt[j]] = false;
  q._bt[j] = -1;
  return stepOf(q);
}
/* engTapOption(L, i)：missing 题点第 i 张选项卡 → 对=填入当前空（'placed'，末空='right'/'done'）；
   错='wrong'（miss +1，选项不消失零惩罚）；非法（瓦片题型/越界/已解）=null */
function engTapOption(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (q.type !== 'missing' || q.solved) return null;
  if (typeof i !== 'number' || Math.floor(i) !== i || i < 0 || i >= q.opts.length) return null;
  if (q.opts[i] === q.word[q.blanks[q.cur]]) {
    q.filled.push(q.opts[i]);
    q.cur++;
    if (q.cur >= q.blanks.length) {
      q.solved = true;
      L.step++;
      if (L.step >= L.quizzes.length) L.done = true;
      return L.done ? 'done' : 'right';
    }
    return 'placed';
  }
  q.miss++;
  L.retries++;
  return 'wrong';
}
/* 星级：0 错=3★ / 1-2 错=2★ / 更多=1★（拼满/选项判错口径，退回不计，永不 0 星） */
const engStars = L => L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1);

/* ---------- 救援/教学"帮"目标（§2）：
   listen/meaning：自左向右第一处"未拼对"的格——该格有错字母 → {act:'undo', j}（先退回）；
   空 → {act:'tile', i, j}（点目标字母瓦片）；目标字母无空闲瓦片但被错放在后格 →
   {act:'undo', k}（先退回后格释放该瓦片——覆盖"错位字母需前移"态，保证步进恒收敛）。
   missing：当前待填空的正确字母选项 → {act:'opt', i, j}。
   已解题 → null ---------- */
function rescueTarget(q) {
  if (!q || q.solved) return null;
  if (q.type === 'missing') {
    if (q.cur >= q.blanks.length) return null;
    const need = q.word[q.blanks[q.cur]];
    for (let i = 0; i < q.opts.length; i++) {
      if (q.opts[i] === need) return { act: 'opt', i: i, j: q.blanks[q.cur] };
    }
    return null;
  }
  for (let j = 0; j < q.word.length; j++) {
    const b = q._bt[j] >= 0 ? q.tiles[q._bt[j]] : null;
    if (b === q.word[j]) continue;
    if (b !== null) return { act: 'undo', j: j };
    for (let i = 0; i < q.tiles.length; i++) {
      /* b16 审查 S2：tile 分支须带 j（doHint/applyRescueVisual 取 t.j 点亮首未对格 breathe） */
      if (!q._used[i] && q.tiles[i] === q.word[j]) return { act: 'tile', i: i, j: j };
    }
    for (let k = 0; k < q.word.length; k++) {       // 所需字母错放在"错格"（≠其正确位）：先退回释放；
      if (k !== j && q._bt[k] >= 0 &&               // 只动错格不动已对格（moon 双 o 教训：牺牲对格=死循环）
          q.tiles[q._bt[k]] === q.word[j] && q.tiles[q._bt[k]] !== q.word[k]) {
        return { act: 'undo', j: k };
      }
    }
    return null;                                   // 理论不可达（池 ⊇ 词字母）
  }
  return null;                                     // 拼满即判，不可达
}

/* ---------- 结构校验（verify 用）：三型域+池约束（词表语义由 verify 分源复算，此处只查结构） ---------- */
function structOk(q) {
  if (!q || q.kind !== 'spellen') return false;
  if (typeof q.word !== 'string' || !/^[a-z]{3,6}$/.test(q.word)) return false;
  if (q.type === 'missing') {
    if (!Array.isArray(q.blanks) || q.blanks.length !== (dchOfWord(q.word) <= 2 ? 1 : 2)) return false;
    for (let k = 0; k < q.blanks.length; k++) {              // 缺位升序互异域内
      const j = q.blanks[k];
      if (Math.floor(j) !== j || j < 0 || j >= q.word.length) return false;
      if (k > 0 && j <= q.blanks[k - 1]) return false;
    }
    if (q.cur !== 0 || q.filled.length !== 0) return false;
    if (!Array.isArray(q.opts) || q.opts.some(t => !/^[a-z]$/.test(t))) return false;
    if (q.opts.length !== (dchOfWord(q.word) <= 2 ? 3 : 4)) return false;
    const uniq = [];                                         // 每空正确字母须有对应选项
    for (const j of q.blanks) if (uniq.indexOf(q.word[j]) < 0) uniq.push(q.word[j]);
    return uniq.every(c => q.opts.indexOf(c) >= 0) &&
      q.opts.every((c, k) => q.opts.indexOf(c) === k);       // 选项互异
  }
  if (q.type !== 'listen' && q.type !== 'meaning') return false;
  if (!Array.isArray(q.tiles) || q.tiles.some(t => !/^[a-z]$/.test(t))) return false;
  if (q.tiles.length !== q.word.length + distractorCount(dchOfWord(q.word))) return false;
  const need = letterCounts(q.word), have = letterCounts(q.tiles.join(''));
  return Object.keys(need).every(k => (have[k] || 0) >= need[k]);   // 池必可拼出目标词
}
function dchOfWord(word) {                                  // 词→难度章（域校验辅助）
  for (let d = 1; d <= 4; d++) if (WORDS60[d].indexOf(word) >= 0) return d;
  return 0;
}
