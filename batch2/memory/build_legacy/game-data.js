/* ================= memory 游戏数据与纯引擎 =================
   12 种内嵌 SVG 图案（描边 2.5px 暖棕，圆润无尖角）+ 确定性关卡生成 + 无 DOM 引擎
   纯引擎（makeLevel/engFlip/engJudge/engStars/engKnownPair/perfectSequence）
   由 UI 与 ?verify=1 共用同一代码路径，防两套逻辑漂移 */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边

/* ---------- 图案池：12 种（5 动物 + 4 水果 + 花/星/心） ---------- */
const PATTERNS = {
  cat: { name: '小猫', svg: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M17 24 Q9 7 28 13 Z" fill="#F5C89A" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M47 24 Q55 7 36 13 Z" fill="#F5C89A" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M19 20 Q16 12 24 15 Z" fill="#F2B8C6"/><path d="M45 20 Q48 12 40 15 Z" fill="#F2B8C6"/>' +
    '<circle cx="32" cy="39" r="19" fill="#F5C89A" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="25" cy="37" r="2.7" fill="' + INK + '"/><circle cx="39" cy="37" r="2.7" fill="' + INK + '"/>' +
    '<path d="M30 44 q2 2.5 4 0" stroke="' + INK + '" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
    '<path d="M32 41 l-2 2.5 h4 Z" fill="#E8837B" stroke="none"/>' +
    '<ellipse cx="17" cy="43" rx="4" ry="2.6" fill="#F2B8C6" opacity=".8"/><ellipse cx="47" cy="43" rx="4" ry="2.6" fill="#F2B8C6" opacity=".8"/></svg>' },
  dog: { name: '小狗', svg: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<ellipse cx="14" cy="37" rx="9" ry="15" fill="#B98A5E" stroke="' + INK + '" stroke-width="2.5" transform="rotate(14 14 37)"/>' +
    '<ellipse cx="50" cy="37" rx="9" ry="15" fill="#B98A5E" stroke="' + INK + '" stroke-width="2.5" transform="rotate(-14 50 37)"/>' +
    '<circle cx="32" cy="37" r="19" fill="#E8C9A8" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<ellipse cx="32" cy="46" rx="10" ry="7" fill="#FBF7F0" stroke="none"/>' +
    '<ellipse cx="32" cy="41" rx="3.6" ry="2.8" fill="' + INK + '"/>' +
    '<circle cx="24.5" cy="35" r="2.7" fill="' + INK + '"/><circle cx="39.5" cy="35" r="2.7" fill="' + INK + '"/>' +
    '<ellipse cx="16" cy="43" rx="4" ry="2.6" fill="#F2B8C6" opacity=".7"/><ellipse cx="48" cy="43" rx="4" ry="2.6" fill="#F2B8C6" opacity=".7"/></svg>' },
  bear: { name: '小熊', svg: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<circle cx="17" cy="19" r="8.5" fill="#C99B6F" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="47" cy="19" r="8.5" fill="#C99B6F" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="17" cy="19" r="3.8" fill="#E8C9A8"/><circle cx="47" cy="19" r="3.8" fill="#E8C9A8"/>' +
    '<circle cx="32" cy="39" r="19" fill="#C99B6F" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<ellipse cx="32" cy="46" rx="9.5" ry="6.5" fill="#EFD9BC" stroke="none"/>' +
    '<ellipse cx="32" cy="42" rx="3.4" ry="2.6" fill="' + INK + '"/>' +
    '<circle cx="25" cy="36" r="2.7" fill="' + INK + '"/><circle cx="39" cy="36" r="2.7" fill="' + INK + '"/>' +
    '<ellipse cx="16" cy="43" rx="4" ry="2.6" fill="#F2B8C6" opacity=".7"/><ellipse cx="48" cy="43" rx="4" ry="2.6" fill="#F2B8C6" opacity=".7"/></svg>' },
  elephant: { name: '小象', svg: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<ellipse cx="13" cy="36" rx="10" ry="16" fill="#CFC5E3" stroke="' + INK + '" stroke-width="2.5" transform="rotate(10 13 36)"/>' +
    '<ellipse cx="51" cy="36" rx="10" ry="16" fill="#CFC5E3" stroke="' + INK + '" stroke-width="2.5" transform="rotate(-10 51 36)"/>' +
    '<circle cx="32" cy="36" r="19" fill="#CFC5E3" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<path d="M26 44 Q25 55 33 56 Q39 57 40 51" stroke="' + INK + '" stroke-width="9" fill="none" stroke-linecap="round" opacity=".999"/>' +
    '<path d="M26 44 Q25 55 33 56 Q39 57 40 51" stroke="#CFC5E3" stroke-width="5.5" fill="none" stroke-linecap="round"/>' +
    '<circle cx="24.5" cy="34" r="2.7" fill="' + INK + '"/><circle cx="39.5" cy="34" r="2.7" fill="' + INK + '"/>' +
    '<ellipse cx="15" cy="42" rx="4" ry="2.6" fill="#F2B8C6" opacity=".7"/><ellipse cx="49" cy="42" rx="4" ry="2.6" fill="#F2B8C6" opacity=".7"/></svg>' },
  frog: { name: '小青蛙', svg: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<circle cx="19" cy="21" r="9" fill="#B5D99C" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="45" cy="21" r="9" fill="#B5D99C" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="19" cy="21" r="4" fill="' + INK + '"/><circle cx="45" cy="21" r="4" fill="' + INK + '"/>' +
    '<circle cx="20.5" cy="19.5" r="1.4" fill="#FFF"/><circle cx="46.5" cy="19.5" r="1.4" fill="#FFF"/>' +
    '<ellipse cx="32" cy="41" rx="21" ry="17" fill="#B5D99C" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<path d="M23 42 q9 8 18 0" stroke="' + INK + '" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
    '<circle cx="13" cy="47" r="1.8" fill="#8FBF7F" opacity=".85"/><circle cx="51" cy="47" r="1.8" fill="#8FBF7F" opacity=".85"/></svg>' },
  apple: { name: '苹果', svg: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M32 14 Q30 8 24 7" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<path d="M33 10 Q42 4 48 10 Q42 17 33 13 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M32 15 C18 8 8 20 12 36 C15 49 24 57 32 55 C40 57 49 49 52 36 C56 20 46 8 32 15 Z" fill="#E86A5E" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<ellipse cx="22" cy="26" rx="5" ry="8" fill="#FFF" opacity=".35" transform="rotate(-18 22 26)"/></svg>' },
  banana: { name: '香蕉', svg: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M12 16 C10 34 22 52 46 53 C52 53 56 50 57 46 C50 49 40 48 33 42 C24 35 20 26 20 17 Z" fill="#F2C94C" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M11 12 L20 12 L20 18 L13 19 Z" fill="#B98A5E" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M55 45 C58 47 59 50 57 52" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<path d="M24 24 C22 32 27 41 34 46" stroke="#FFF" stroke-width="3.5" fill="none" stroke-linecap="round" opacity=".45"/></svg>' },
  pear: { name: '梨', svg: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M33 8 Q32 4 28 4" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="36" cy="10" rx="7" ry="4" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.5" transform="rotate(24 36 10)"/>' +
    '<path d="M33 12 C28 14 26 18 27 23 C28 26 30 28 30 31 C22 33 15 40 15 48 C15 56 23 61 32 61 C41 61 49 56 49 48 C49 40 42 33 34 31 C34 28 36 26 37 23 C38 18 38 14 33 12 Z" fill="#A8C97F" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<ellipse cx="26" cy="46" rx="4" ry="6" fill="#FFF" opacity=".35" transform="rotate(-15 26 46)"/></svg>' },
  orange: { name: '橙子', svg: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<circle cx="32" cy="36" r="22" fill="#F2994A" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<path d="M32 14 Q31 8 26 7" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<path d="M33 11 Q41 6 46 11 Q40 17 33 14 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<circle cx="24" cy="30" r="2.2" fill="#FFF" opacity=".55"/><circle cx="30" cy="25" r="1.6" fill="#FFF" opacity=".5"/><circle cx="21" cy="36" r="1.6" fill="#FFF" opacity=".5"/>' +
    '<circle cx="40" cy="44" r="1.4" fill="#C77A42" opacity=".6"/><circle cx="25" cy="46" r="1.4" fill="#C77A42" opacity=".6"/></svg>' },
  flower: { name: '花', svg: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<circle cx="32" cy="14" r="8.5" fill="#F2B8C6" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="46" cy="24" r="8.5" fill="#F2B8C6" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="41" cy="41" r="8.5" fill="#F2B8C6" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="23" cy="41" r="8.5" fill="#F2B8C6" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="18" cy="24" r="8.5" fill="#F2B8C6" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="32" cy="29" r="9" fill="#F2C94C" stroke="' + INK + '" stroke-width="2.5"/></svg>' },
  star: { name: '星星', svg: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M32 7 Q36 25 57 32 Q36 39 32 57 Q28 39 7 32 Q28 25 32 7 Z" fill="#F2C94C" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<circle cx="32" cy="32" r="3.6" fill="#FFF" opacity=".7"/></svg>' },
  heart: { name: '爱心', svg: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M32 54 C10 40 8 24 18 16 C25 11 31 15 32 20 C33 15 39 11 46 16 C56 24 54 40 32 54 Z" fill="#E86A5E" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<ellipse cx="22" cy="24" rx="4.5" ry="6" fill="#FFF" opacity=".35" transform="rotate(-24 22 24)"/></svg>' }
};
const PATTERN_KEYS = Object.keys(PATTERNS);

/* ---------- 卡背：奶油色小兔子剪影（暖橙底） ---------- */
const CARD_BACK = '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
  '<ellipse cx="25" cy="24" rx="6" ry="13" fill="#FFF9EE" transform="rotate(-12 25 24)"/>' +
  '<ellipse cx="39" cy="24" rx="6" ry="13" fill="#FFF9EE" transform="rotate(12 39 24)"/>' +
  '<circle cx="32" cy="41" r="13" fill="#FFF9EE"/>' +
  '<circle cx="27.5" cy="39" r="1.8" fill="#E8975A"/><circle cx="36.5" cy="39" r="1.8" fill="#E8975A"/></svg>';

/* ---------- 通用图标 ---------- */
const ICONS = {
  logo: '<svg viewBox="0 0 44 44" width="34" height="34" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="7" y="10" width="20" height="26" rx="5" fill="#FFF9EE" stroke="#FFF" stroke-width="2.5" transform="rotate(-9 17 23)"/>' +
    '<rect x="18" y="9" width="20" height="26" rx="5" fill="#FFF9EE" stroke="#FFF" stroke-width="2.5" transform="rotate(9 28 22)"/>' +
    '<path d="M28 18 l2.2 4.4 4.8.6 -3.5 3.4.9 4.8 -4.4 -2.3 -4.4 2.3.9 -4.8 -3.5 -3.4 4.8 -.6 Z" fill="#E8975A"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>'
};

/* ---------- 关卡网格表：静态 20 关（4 章 × 5） ----------
   第 1 章 2×3→2×3→2×4→2×4→3×4（3/3/4/4/6 对）
   第 2 章 3×4/4×4 交替；第 3-4 章与生成关一致：偶数关 4×4、奇数关 4×5 */
const LEVEL_SPECS = [
  { r: 2, c: 3 }, { r: 2, c: 3 }, { r: 2, c: 4 }, { r: 2, c: 4 }, { r: 3, c: 4 },
  { r: 3, c: 4 }, { r: 4, c: 4 }, { r: 3, c: 4 }, { r: 4, c: 4 }, { r: 4, c: 4 },
  { r: 4, c: 4 }, { r: 4, c: 5 }, { r: 4, c: 4 }, { r: 4, c: 5 }, { r: 4, c: 4 },
  { r: 4, c: 5 }, { r: 4, c: 4 }, { r: 4, c: 5 }, { r: 4, c: 4 }, { r: 4, c: 5 }
];
const CH_LEN = 5; // 5 关 = 1 章

/* ---------- 确定性随机（与 pipe 同实现） ---------- */
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

/* ---------- 关卡生成（静态与生成关同一确定性通道）
   种子 = mulberry32(flat * 7919 + 13)：图案子集选取 + 洗牌全走它，
   同 flat 永远同关（重玩一致、verify 可检）；每图案恰好 2 张 */
function makeLevel(flat) {
  flat = Math.max(0, flat | 0);
  const spec = flat < LEVEL_SPECS.length ? LEVEL_SPECS[flat]
    : { r: 4, c: (flat % 2 === 0 ? 4 : 5) }; // 生成关：4×4 与 4×5 交替
  const pairs = spec.r * spec.c / 2;
  const rnd = mulberry32(flat * 7919 + 13);
  const pick = shuffled(PATTERN_KEYS, rnd).slice(0, pairs);
  const deck = [];
  pick.forEach(p => { deck.push(p, p); });
  const order = shuffled(deck, rnd);
  return {
    flat, grid: { r: spec.r, c: spec.c }, pairs,
    misses: 0, streak: 0, matched: 0,
    cards: order.map((p, i) => ({ id: i, pattern: p, state: 'down' })),
    seen: [], donePats: []
  };
}

/* ---------- 纯引擎（无 DOM） ---------- */
function engFlip(L, i) { // 翻牌：down→up；其余状态拒绝
  const c = L.cards[i];
  if (!c || c.state !== 'down') return false;
  c.state = 'up';
  if (L.seen.indexOf(c.pattern) < 0) L.seen.push(c.pattern); // 记忆脚印：支架依据
  return true;
}
function engUps(L) { return L.cards.filter(c => c.state === 'up'); }
function engJudge(L) { // 两张朝上时判定：同图案→gone（配对收走）/ 不同→盖回计失误。否则返回 null
  const ups = engUps(L);
  if (ups.length !== 2) return null;
  if (ups[0].pattern === ups[1].pattern) {
    ups[0].state = 'gone'; ups[1].state = 'gone';
    L.streak = 0; L.matched++;
    if (L.donePats.indexOf(ups[0].pattern) < 0) L.donePats.push(ups[0].pattern);
    return 'match';
  }
  ups[0].state = 'down'; ups[1].state = 'down';
  L.misses++; L.streak++;
  return 'miss';
}
function engWon(L) { return L.cards.every(c => c.state === 'gone'); }
/* 星级：失误 ≤ 对数×1.5 = 3 星；≤ 对数×2.5 = 2 星；否则 1 星。永不 0 星 */
function engStars(L) {
  return L.misses <= L.pairs * 1.5 ? 3 : (L.misses <= L.pairs * 2.5 ? 2 : 1);
}
/* 已知配对：该图案被翻过（seen）且两张当前都盖着 → 支架指向候选 */
function engKnownPair(L) {
  const byPat = {};
  L.cards.forEach(c => { (byPat[c.pattern] = byPat[c.pattern] || []).push(c); });
  for (let k = 0; k < L.seen.length; k++) {
    const cs = byPat[L.seen[k]];
    if (cs && cs.length === 2 && cs[0].state === 'down' && cs[1].state === 'down') {
      return { pattern: L.seen[k], cards: cs };
    }
  }
  return null;
}
function engPartner(L, i) { // 第 i 张的配对牌下标
  const p = L.cards[i].pattern;
  for (let j = 0; j < L.cards.length; j++) if (j !== i && L.cards[j].pattern === p) return j;
  return -1;
}
/* 完美记忆序列：按牌序逐张翻，遇未见过的牌先翻它再翻其配对（0 失误） */
function perfectSequence(L) {
  const pos = {};
  L.cards.forEach((c, i) => { (pos[c.pattern] = pos[c.pattern] || []).push(i); });
  const down = L.cards.map(c => c.state === 'down');
  const seq = [];
  for (let i = 0; i < L.cards.length; i++) {
    if (!down[i]) continue;
    const j = pos[L.cards[i].pattern].find(x => x !== i && down[x]);
    if (j == null) continue;
    seq.push(i, j);
    down[i] = false; down[j] = false;
  }
  return seq;
}
