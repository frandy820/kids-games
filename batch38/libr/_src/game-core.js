/* ================= libr 纯引擎：确定性关卡生成 + 点格/点卡判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 837)（本款常量 837，SPEC-BATCH38 §0.92/§2 定版，
   R48 沿用不变——rnd 流变化仅因 R48 消耗序列扩程，见 SPEC-R48 §R3）：
   同 flat 永远同关（重玩一致、verify 可检）。
   取题（SPEC-R48 §R4 题库封闭 20 题=4 章×5；每关 5 题）：
     静态关 flat<20：章 ch 的 5 题按关内偏移 rotate——row=(ch-1)*5+((lv+qi)%5)
     （20 静态关覆盖全 20 题各 5 次）；
     生成关 flat≥20：dch=ri(rnd,1,4) seeded 随机（域全档成立型——SPEC §0.92
     生成关策略=b33 硬性②显式声明：mulberry32 第一个随机数，先取数保确定性），
     从**本章题池** seeded 无放回抽 5（R48：池按 dch 分章 rows[(dch-1)*5..dch*5-1]
     ——ch1 普通/ch2 维度句/ch3 冲突/ch4 pick 四型池各自封闭）。
   书架格序：R48 恒四格（THEMES 全 4）——每关 seeded shuffle 一次、关内 5 题
   恒同序（书架=物理归档载体，格序稳定；跨关换序——禁位置学习，孩子须读主题
   标签牌=信息素养核心锚）。
   rnd 消耗顺序恒定（SPEC-R48 §R3 pycheck 位级复刻依据）：生成关先抽 dch →
   （抽题，仅生成关）→ 格序 shuffle（4 元素 3 次）→ pick 题盘序 shuffle
   （按题序每 pick 题 3 元素 2 次）。
   answer：sort 题=正确格下标（=shelf.indexOf(本题主题)——SPEC §2 唯一解锚，
   verify 从 shelf+卡主题独立推导复算，禁读 quiz.answer 直比）；pick 题=盘内
   正确卡下标（cards.indexOf(唯一属目标格的卡)——verify 独立推导）。
   quiz 结构：{ row(0-19), kind('sort'|'pick'),
     sort: { card(卡 id), label(卡名), theme(唯一归属主题 id),
             hint('none'|'farm'|'eat'|'pet'|'wear'——维度行 DIM2_TARGET 定约),
             say/sayKey(普通句 lb_hint|维度句 lb_d2_*) },
     pick: { target(目标格主题 id), theme(=target), cards(盘序 3 卡 id),
             hint:'none', say/sayKey(挑书句 lb_pick_*) },
     共: shelf(格序主题 id 数组·关内共享), answer, _miss, _answered }
   铁律：每关 5 题；每题唯一解（sort=唯一归属格/pick=候选集恰一张属目标格
   ——structWhy 校验）；miss 在本判定层计（b34 坑①：UI guard 判定前拦+预判
   与 core 严格同构——engTapShelf/engTapCard 双入口同构）。 */
function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const ri = (rnd, lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1)); // [lo,hi] 闭区间整数
function shuffled(arr, rnd) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}
/* 进度章号单调递增（与 keyOf/写档一致）；难度章号四章取材（§0.4） */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % 4 + 1;

/* ---------- 单题构建：sort 题（题库行 + 关内格序）；answer=shelf.indexOf(主题)
   维度行 say/sayKey=DIM2 表（R48 去泄漏句+新键 lb_d2_*，普通句复用 lb_hint） ---------- */
function buildQuiz(row, shelfOrder) {
  const qs = QUESTIONS[row];
  const card = CARDS[qs.card];
  const answer = shelfOrder.indexOf(card.theme);
  return { row: row, kind: 'sort', card: qs.card, label: card.label, theme: card.theme,
           say: qs.hint === 'none' ? NORM_HINT : DIM2_HINTS[qs.hint],
           sayKey: qs.hint === 'none' ? VOICE.hint.key : DIM2_KEYS[qs.hint],
           hint: qs.hint, shelf: shelfOrder, answer: answer,
           _miss: 0, _answered: false };
}
/* ---------- pick 题构建（R48 跨维二级题）：tray=表内候选集 seeded 盘序；
   answer=盘内唯一属目标格卡的下标（独立推导锚——恰一张，structWhy 校验） ---------- */
function buildPick(row, shelfOrder, tray) {
  const qs = QUESTIONS[row];
  let answer = -1;
  for (let k = 0; k < tray.length; k++)
    if (CARDS[tray[k]].theme === qs.pick) { answer = k; break; }
  return { row: row, kind: 'pick', target: qs.pick, theme: qs.pick,
           cards: tray, label: '',
           say: PICK_HINTS[qs.pick], sayKey: PICK_KEYS[qs.pick],
           hint: 'none', shelf: shelfOrder, answer: answer,
           _miss: 0, _answered: false };
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道）
   生成关 seeded 无放回抽 5（顺序即题序）；R48 池按 dch 分章（四型池各自封闭） ---------- */
function pickRows(dch, rnd) {
  const pool = [];
  for (let r = (dch - 1) * 5; r < dch * 5; r++) pool.push(r);
  const a = pool.slice(), out = [];
  for (let k = 0; k < CH_LEN; k++) out.push(a.splice(ri(rnd, 0, a.length - 1), 1)[0]);
  return out;
}
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch0 = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 837);
  const dch = flat < STATIC_LEVELS ? dch0 : ri(rnd, 1, 4);   // 生成关随机章参数（先取数保确定性）
  let rows;
  if (flat < STATIC_LEVELS) {
    const base = (dch - 1) * 5;                              // 静态关 dch===ch：章池 rotate
    rows = [];
    for (let k = 0; k < CH_LEN; k++) rows.push(base + (lv + k) % 5);
  } else {
    rows = pickRows(dch, rnd);                               // 生成关：本章池 seeded 抽 5
  }
  const shelfOrder = shuffled(THEMES.slice(0, 4).map(t => t.id), rnd);   // R48 恒四格；关内格序一次定
  const quizzes = [];
  for (let qi = 0; qi < CH_LEN; qi++) {
    const qrow = rows[qi];
    quizzes.push(QUESTIONS[qrow].pick
      ? buildPick(qrow, shelfOrder, shuffled(QUESTIONS[qrow].cards, rnd))   // pick 题：盘序 seeded（rnd 序=题序）
      : buildQuiz(qrow, shelfOrder));
  }
  return { flat: flat, ch: ch, dch: dch, lv: lv, rows: rows, shelf: shelfOrder,
           quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 点格/点卡引擎（无 DOM，R48 双入口同构——b34 坑①判定层唯一真值）
   engTapShelf(L, i) —— sort 题：点书架第 i 格归档当前卡（pick 题格非作答面=null）
   engTapCard(L, i)  —— pick 题：点挑书盘第 i 张卡（sort 题盘非作答面=null）
   返回值两入口同构：'shelved' 对且非末题推进 / 'done' 对且末题=通关
   'wrong' 错（该题 miss+1——retries 全关累计=星级口径；可重点，探索不罚）
   null    非法下标 / 关卡已结束 / 本题已答 / 题型不匹配 ---------- */
function engTapShelf(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q._answered) return null;
  if (q.kind === 'pick') return null;                         // pick 题：格非作答面
  if (!Number.isInteger(i) || i < 0 || i >= q.shelf.length) return null;
  if (i === q.answer) {
    q._answered = true;
    L.step++;
    if (L.step >= L.quizzes.length) { L.done = true; return 'done'; }
    return 'shelved';
  }
  q._miss++;
  L.retries++;
  return 'wrong';
}
function engTapCard(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q._answered) return null;
  if (q.kind !== 'pick') return null;                        // sort 题：盘非作答面
  if (!Number.isInteger(i) || i < 0 || i >= q.cards.length) return null;
  if (i === q.answer) {
    q._answered = true;
    L.step++;
    if (L.step >= L.quizzes.length) { L.done = true; return 'done'; }
    return 'shelved';
  }
  q._miss++;
  L.retries++;
  return 'wrong';
}
const engWon = L => !!L && L.done;
/* 星级（SPEC §0.92 miss 口径：归错计）：全关归错 0=3 星 / 1-2=2 星 / ≥3=1 星。永不 0 星 */
const engStars = L => !L ? 1 : (L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1));
/* 答案级救援/教学帮指用：当前题答案体下标（sort=正确格/pick=正确卡；独立函数供 verify 复核） */
const correctIdx = q => !q ? -1 : q.answer;

/* ---------- 结构校验（verify 用，返回失败原因或 null）：row 域 / 恒四格 /
   格序=主题集排列 / answer 独立复算（sort=shelf.indexOf(主题)；pick=盘内
   唯一目标卡下标）/ 字段与题库行一致（含 DIM2_TARGET 定约）/ 初始态干净 ---------- */
function structWhy(q, dch) {
  if (!q) return 'quiz';
  if (!Number.isInteger(q.row) || q.row < 0 || q.row >= QUESTIONS.length) return 'row';
  const qs = QUESTIONS[q.row];
  if (q.shelf.length !== 4) return 'shelfN';                  // R48 恒四格
  const expSet = THEMES.slice(0, 4).map(t => t.id).sort().join('|');
  if (q.shelf.slice().sort().join('|') !== expSet) return 'shelfPerm';   // 格序=主题集排列
  if (q.kind === 'pick') {
    if (!qs.pick) return 'kind';                              // 行非 pick 而题 pick=表行错位
    if (q.target !== qs.pick || q.theme !== qs.pick) return 'target';
    if (!Array.isArray(q.cards) || q.cards.length !== 3) return 'cards';
    const sameSet = q.cards.slice().sort().join('|') === qs.cards.slice().sort().join('|');
    if (!sameSet) return 'cards';
    let hit = -1, n = 0;                                      // 恰一张属目标格（SPEC-R48 §R4 定约）
    for (let k = 0; k < q.cards.length; k++)
      if (CARDS[q.cards[k]].theme === qs.pick) { hit = k; n++; }
    if (n !== 1 || q.answer !== hit) return 'answer';
    if (q.say !== PICK_HINTS[qs.pick]) return 'say';
    if (q.hint !== 'none' || q.label !== '') return 'hint';
  } else {
    if (q.kind !== 'sort') return 'kind';
    if (qs.pick) return 'kind';                               // 行 pick 而题 sort=表行错位
    const card = CARDS[qs.card];
    let exp = q.shelf.indexOf(card.theme);
    if (q.answer !== exp) return 'answer';                    // answer=shelf.indexOf(主题) 复算
    if (q.card !== qs.card || q.theme !== card.theme || q.label !== card.label) return 'card';
    if (q.hint !== qs.hint) return 'hint';                    // hint 维度与题库行一致
    if (qs.hint !== 'none' && card.theme !== DIM2_TARGET[qs.hint]) return 'dimtarget';   // 维度裁定定约
    const expSay = qs.hint === 'none' ? NORM_HINT : DIM2_HINTS[qs.hint];
    if (q.say !== expSay) return 'say';                       // 提示句与句表一致
  }
  if (q._miss !== 0 || q._answered) return 'dirty';
  return null;
}
