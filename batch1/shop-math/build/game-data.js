/* ================= shop-math 游戏数据与 SVG 资产 =================
   全部内联 SVG，圆润描边风（2.5px 暖棕 #4A3B2E），无外部请求
   r6 难度改造（2026-09-13）：GOODS 加 price（SPEC-P：2/3/5/7），
   订单升级为 rounds 数组（count 数域 6-20 / sum 合成总价 / budget 预算找零）。
   价格表与章域封闭表真值源 = README「SPEC r6」块；game-verify.js 独立重列对账。 */
'use strict';

/* ---------- 商品（颜色/形状差异大：红圆/黄弯/绿葫芦/橙球；price=r6 SPEC-P） ---------- */
const GOODS = {
  apple:  { name: '苹果', unit: '个', price: 2, color: '#E86A5E',
    svg: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M32 14 Q30 8 24 7" stroke="#4A3B2E" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<path d="M33 10 Q42 4 48 10 Q42 17 33 13 Z" fill="#8FBF7F" stroke="#4A3B2E" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M32 15 C18 8 8 20 12 36 C15 49 24 57 32 55 C40 57 49 49 52 36 C56 20 46 8 32 15 Z" fill="#E86A5E" stroke="#4A3B2E" stroke-width="2.5"/>' +
      '<ellipse cx="22" cy="26" rx="5" ry="8" fill="#FFF" opacity=".35" transform="rotate(-18 22 26)"/></svg>' },
  banana: { name: '香蕉', unit: '根', price: 3, color: '#F2C94C',
    svg: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M12 16 C10 34 22 52 46 53 C52 53 56 50 57 46 C50 49 40 48 33 42 C24 35 20 26 20 17 Z" fill="#F2C94C" stroke="#4A3B2E" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M11 12 L20 12 L20 18 L13 19 Z" fill="#B98A5E" stroke="#4A3B2E" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M55 45 C58 47 59 50 57 52" stroke="#4A3B2E" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<path d="M24 24 C22 32 27 41 34 46" stroke="#FFF" stroke-width="3.5" fill="none" stroke-linecap="round" opacity=".45"/></svg>' },
  pear:   { name: '梨', unit: '个', price: 5, color: '#A8C97F',
    svg: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M33 8 Q32 4 28 4" stroke="#4A3B2E" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<ellipse cx="36" cy="10" rx="7" ry="4" fill="#8FBF7F" stroke="#4A3B2E" stroke-width="2.5" transform="rotate(24 36 10)"/>' +
      '<path d="M33 12 C28 14 26 18 27 23 C28 26 30 28 30 31 C22 33 15 40 15 48 C15 56 23 61 32 61 C41 61 49 56 49 48 C49 40 42 33 34 31 C34 28 36 26 37 23 C38 18 38 14 33 12 Z" fill="#A8C97F" stroke="#4A3B2E" stroke-width="2.5"/>' +
      '<ellipse cx="26" cy="46" rx="4" ry="6" fill="#FFF" opacity=".35" transform="rotate(-15 26 46)"/></svg>' },
  orange: { name: '橙子', unit: '个', price: 7, color: '#F2994A',
    svg: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
      '<circle cx="32" cy="36" r="22" fill="#F2994A" stroke="#4A3B2E" stroke-width="2.5"/>' +
      '<path d="M32 14 Q31 8 26 7" stroke="#4A3B2E" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<path d="M33 11 Q41 6 46 11 Q40 17 33 14 Z" fill="#8FBF7F" stroke="#4A3B2E" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<circle cx="24" cy="30" r="2.2" fill="#FFF" opacity=".55"/><circle cx="30" cy="25" r="1.6" fill="#FFF" opacity=".5"/><circle cx="21" cy="36" r="1.6" fill="#FFF" opacity=".5"/>' +
      '<circle cx="40" cy="44" r="1.4" fill="#C77A42" opacity=".6"/><circle cx="25" cy="46" r="1.4" fill="#C77A42" opacity=".6"/></svg>' }
};
const GOOD_KEYS = Object.keys(GOODS);
const COIN_DENOMS = [1, 2, 5];          /* 付钱/找零面额（SPEC-C，r6） */
const GROUP_AT = 10;                    /* 按群阈值：目标 ≥10 出策略条+分组点亮（SPEC r6） */
const STRATEGIES = [1, 2, 5];           /* 按群档位：一个一个/两个两个/五个五个（teach r5 先例） */

/* ---------- 数词（组末报数/兜底 TTS 用，r6 扩到 20） ---------- */
function numCn(n) {
  const D = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  if (n < 10) return D[n];
  if (n === 10) return '十';
  if (n < 20) return '十' + D[n - 10];
  return D[Math.floor(n / 10)] + '十' + (n % 10 ? D[n % 10] : '');
}

/* ---------- 顾客动物（8 种，大头圆润风；happy=开心表情双编码） ---------- */
const STK = '#4A3B2E'; // 统一描边暖棕
const EYES = happy =>
  (happy ? '<path d="M50 62 q6 -8 12 0" stroke="' + STK + '" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
           '<path d="M78 62 q6 -8 12 0" stroke="' + STK + '" stroke-width="3.5" fill="none" stroke-linecap="round"/>'
         : '<circle cx="56" cy="62" r="4.6" fill="' + STK + '"/><circle cx="84" cy="62" r="4.6" fill="' + STK + '"/>');
const MOUTH = happy =>
  (happy ? '<path d="M64 78 q7 8 14 0" stroke="' + STK + '" stroke-width="3" fill="none" stroke-linecap="round"/>'
         : '<path d="M62 77 q3 4 6 0 q3 4 6 0" stroke="' + STK + '" stroke-width="2.5" fill="none" stroke-linecap="round"/>');
const BLUSH = '<ellipse cx="42" cy="74" rx="7" ry="4.5" fill="#F2B8C6" opacity=".75"/><ellipse cx="98" cy="74" rx="7" ry="4.5" fill="#F2B8C6" opacity=".75"/>';
const HEAD = fill => '<circle cx="70" cy="66" r="42" fill="' + fill + '" stroke="' + STK + '" stroke-width="2.5"/>';
const SHADOW = '<ellipse cx="70" cy="122" rx="34" ry="10" fill="#EFE3CD"/>';
const wrapPet = inner => '<svg viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg" fill="none">' + SHADOW + inner + '</svg>';

const ANIMALS = {
  cat: happy => wrapPet(
    '<path d="M36 42 Q30 18 48 26 L52 28 Z" fill="#F5C89A" stroke="' + STK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M104 42 Q110 18 92 26 L88 28 Z" fill="#F5C89A" stroke="' + STK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M41 36 Q39 26 47 30 Z" fill="#F2B8C6"/><path d="M99 36 Q101 26 93 30 Z" fill="#F2B8C6"/>' +
    HEAD('#F5C89A') + BLUSH +
    '<path d="M66 70 l4 4 4 -4" stroke="' + STK + '" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M24 66 h12 M25 74 h11" stroke="' + STK + '" stroke-width="2" stroke-linecap="round" opacity=".55"/>' +
    '<path d="M104 66 h12 M104 74 h11" stroke="' + STK + '" stroke-width="2" stroke-linecap="round" opacity=".55"/>' +
    EYES(happy) + MOUTH(happy)),
  dog: happy => wrapPet(
    '<ellipse cx="32" cy="62" rx="12" ry="22" fill="#B98A5E" stroke="' + STK + '" stroke-width="2.5" transform="rotate(14 32 62)"/>' +
    '<ellipse cx="108" cy="62" rx="12" ry="22" fill="#B98A5E" stroke="' + STK + '" stroke-width="2.5" transform="rotate(-14 108 62)"/>' +
    HEAD('#E8C9A8') +
    '<ellipse cx="70" cy="80" rx="20" ry="14" fill="#FBF7F0" stroke="none"/>' +
    '<circle cx="70" cy="72" r="6" fill="' + STK + '"/>' + BLUSH + EYES(happy) + MOUTH(happy)),
  rabbit: happy => wrapPet(
    '<ellipse cx="52" cy="24" rx="10" ry="24" fill="#FBF7F0" stroke="' + STK + '" stroke-width="2.5" transform="rotate(-8 52 24)"/>' +
    '<ellipse cx="52" cy="26" rx="4.5" ry="16" fill="#F2B8C6" transform="rotate(-8 52 26)"/>' +
    '<ellipse cx="88" cy="23" rx="10" ry="25" fill="#FBF7F0" stroke="' + STK + '" stroke-width="2.5" transform="rotate(10 88 23)"/>' +
    '<ellipse cx="88" cy="25" rx="4.5" ry="17" fill="#F2B8C6" transform="rotate(10 88 25)"/>' +
    HEAD('#FBF7F0') + BLUSH + EYES(happy) + MOUTH(happy)),
  bear: happy => wrapPet(
    '<circle cx="38" cy="34" r="13" fill="#C99B6F" stroke="' + STK + '" stroke-width="2.5"/>' +
    '<circle cx="102" cy="34" r="13" fill="#C99B6F" stroke="' + STK + '" stroke-width="2.5"/>' +
    '<circle cx="38" cy="34" r="6" fill="#E8C9A8"/><circle cx="102" cy="34" r="6" fill="#E8C9A8"/>' +
    HEAD('#C99B6F') +
    '<ellipse cx="70" cy="80" rx="19" ry="13" fill="#EFD9BC" stroke="none"/>' +
    '<ellipse cx="70" cy="73" rx="5.5" ry="4" fill="' + STK + '"/>' + BLUSH + EYES(happy) + MOUTH(happy)),
  elephant: happy => wrapPet(
    '<ellipse cx="28" cy="66" rx="17" ry="24" fill="#CFC5E3" stroke="' + STK + '" stroke-width="2.5" transform="rotate(12 28 66)"/>' +
    '<ellipse cx="112" cy="66" rx="17" ry="24" fill="#CFC5E3" stroke="' + STK + '" stroke-width="2.5" transform="rotate(-12 112 66)"/>' +
    HEAD('#CFC5E3') +
    '<path d="M62 70 Q60 92 70 98 Q78 101 82 94" stroke="' + STK + '" stroke-width="17" fill="none" stroke-linecap="round" opacity=".999"/>' +
    '<path d="M62 70 Q60 92 70 98 Q78 101 82 94" stroke="#CFC5E3" stroke-width="12" fill="none" stroke-linecap="round"/>' +
    '<path d="M60 68 Q58 90 68 96 Q76 99 80 92" stroke="' + STK + '" stroke-width="2" fill="none" stroke-linecap="round" opacity=".4"/>' +
    BLUSH + EYES(happy) + MOUTH(happy)),
  frog: happy => wrapPet(
    '<circle cx="44" cy="30" r="13" fill="#B5D99C" stroke="' + STK + '" stroke-width="2.5"/>' +
    '<circle cx="96" cy="30" r="13" fill="#B5D99C" stroke="' + STK + '" stroke-width="2.5"/>' +
    '<circle cx="44" cy="29" r="5" fill="' + STK + '"/><circle cx="96" cy="29" r="5" fill="' + STK + '"/>' +
    '<circle cx="46" cy="27" r="1.6" fill="#FFF"/><circle cx="98" cy="27" r="1.6" fill="#FFF"/>' +
    HEAD('#B5D99C') + BLUSH +
    (happy ? '<path d="M52 74 q18 14 36 0" stroke="' + STK + '" stroke-width="3" fill="none" stroke-linecap="round"/>'
           : '<path d="M58 76 q12 6 24 0" stroke="' + STK + '" stroke-width="3" fill="none" stroke-linecap="round"/>') +
    '<circle cx="34" cy="52" r="2" fill="#8FBF7F" opacity=".8"/><circle cx="106" cy="52" r="2" fill="#8FBF7F" opacity=".8"/>'),
  panda: happy => wrapPet(
    '<circle cx="40" cy="34" r="14" fill="#5A4A3C" stroke="' + STK + '" stroke-width="2.5"/>' +
    '<circle cx="100" cy="34" r="14" fill="#5A4A3C" stroke="' + STK + '" stroke-width="2.5"/>' +
    HEAD('#FBF7F0') +
    '<ellipse cx="52" cy="63" rx="11" ry="13" fill="#5A4A3C" transform="rotate(-12 52 63)"/>' +
    '<ellipse cx="88" cy="63" rx="11" ry="13" fill="#5A4A3C" transform="rotate(12 88 63)"/>' +
    '<circle cx="54" cy="62" r="4" fill="#FBF7F0"/><circle cx="86" cy="62" r="4" fill="#FBF7F0"/>' +
    '<circle cx="55.5" cy="60.5" r="1.8" fill="' + STK + '"/><circle cx="87.5" cy="60.5" r="1.8" fill="' + STK + '"/>' +
    '<ellipse cx="70" cy="80" rx="12" ry="9" fill="#FBF7F0" stroke="none"/>' +
    '<ellipse cx="70" cy="76" rx="4.5" ry="3.2" fill="' + STK + '"/>' + BLUSH + MOUTH(happy)),
  pig: happy => wrapPet(
    '<path d="M40 40 Q34 24 48 28 Z" fill="#F5C6CE" stroke="' + STK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M100 40 Q106 24 92 28 Z" fill="#F5C6CE" stroke="' + STK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    HEAD('#F5C6CE') +
    '<ellipse cx="70" cy="74" rx="17" ry="12" fill="#E8A0B0" stroke="' + STK + '" stroke-width="2.5"/>' +
    '<ellipse cx="63" cy="74" rx="3.2" ry="4.2" fill="' + STK + '"/><ellipse cx="77" cy="74" rx="3.2" ry="4.2" fill="' + STK + '"/>' +
    BLUSH + EYES(happy) + MOUTH(happy))
};

/* ---------- 通用图标 ---------- */
const ICONS = {
  cart: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M8 12 h8 l7 30 h26 l7 -22 H20" stroke="#FFF" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>' +
    '<circle cx="26" cy="54" r="5.5" fill="#FFF"/><circle cx="46" cy="54" r="5.5" fill="#FFF"/></svg>',
  check: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<circle cx="32" cy="32" r="28" fill="#8FBF7F" stroke="#4A3B2E" stroke-width="2.5"/>' +
    '<path d="M19 33 l9 9 L46 23" stroke="#FFF" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  retry: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M48 26 a19 19 0 1 0 3 14" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M44 10 L52 26 L34 27 Z" fill="#8A9BAE"/></svg>',
  coin: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<circle cx="32" cy="32" r="26" fill="#F2C94C" stroke="#4A3B2E" stroke-width="2.5"/>' +
    '<circle cx="32" cy="32" r="18" fill="none" stroke="#C99B2E" stroke-width="3"/>' +
    '<path d="M32 22 l3 7 8 1 -6 5 2 8 -7 -4 -7 4 2 -8 -6 -5 8 -1 Z" fill="#C99B2E"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>',
  basketEmpty: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M12 28 h40 l-5 24 a4 4 0 0 1 -4 4 H21 a4 4 0 0 1 -4 -4 Z" stroke="#C9B99F" stroke-width="3.5" stroke-linejoin="round" fill="#FFF9EE"/>' +
    '<path d="M22 28 a10 10 0 0 1 20 0" stroke="#C9B99F" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  shopSign: '<svg viewBox="0 0 44 44" width="34" height="34">' +
    '<circle cx="22" cy="24" r="13" fill="#E86A5E" stroke="#FFF" stroke-width="2.5"/>' +
    '<path d="M22 11 Q21 5 16 4" stroke="#FFF" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
    '<path d="M23 7 Q29 3 33 7 Q28 12 23 9 Z" fill="#8FBF7F" stroke="#FFF" stroke-width="2"/></svg>'
};
/* 面额硬币（v 元：金色币+居中数字，颜色区分弱化、数字为主编码） */
function coinSvg(v, size) {
  return '<svg viewBox="0 0 64 64" width="' + (size || 64) + '" height="' + (size || 64) +
    '" xmlns="http://www.w3.org/2000/svg">' +
    '<circle cx="32" cy="32" r="27" fill="' + (v >= 5 ? '#F2C94C' : v >= 2 ? '#E8B98A' : '#C9D7E8') +
    '" stroke="#4A3B2E" stroke-width="2.5"/>' +
    '<circle cx="32" cy="32" r="21" fill="none" stroke="rgba(74,59,46,.35)" stroke-width="2"/>' +
    '<text x="32" y="41" text-anchor="middle" font-size="26" font-weight="800" fill="#4A3B2E">' + v + '</text></svg>';
}

/* ================= r6 关卡表：20 关 = 4 章 × 5，每关 1-2 轮 =================
   轮型（README SPEC r6 封闭表）：
   C(k,n)  count   单件计数 n∈[6,10]（ch1）/[11,14]（ch4 生成域 6-14）；n≥10 按群
   S(ks)   sum     2-3 种各 1 件，总价=Σprice（5-15），点硬币付整
   B(w,B)  budget  买 w 样（可同款重复），Σprice≤B 才可行；(w,B)∈{(2,8),(2,10),(3,12),(3,14)}
           —— 四组均多解≥2 且 买不起组合≥1（game-verify 独立枚举对账）
   1-0 = 教学关（看-帮-独，apple×1 单轮，教学框架不动） */
const LEVELS = [
  /* 第 1 章：计数域 6-10 单件（含三个 n=10 按群轮） */
  { who: 'cat',      rounds: [{ m: 'count', k: 'apple', n: 1 }] },
  { who: 'dog',      rounds: [{ m: 'count', k: 'banana', n: 6 }, { m: 'count', k: 'apple', n: 7 }] },
  { who: 'rabbit',   rounds: [{ m: 'count', k: 'pear', n: 8 }, { m: 'count', k: 'apple', n: 10 }] },
  { who: 'bear',     rounds: [{ m: 'count', k: 'orange', n: 9 }, { m: 'count', k: 'banana', n: 10 }] },
  { who: 'elephant', rounds: [{ m: 'count', k: 'pear', n: 10 }, { m: 'count', k: 'orange', n: 6 }] },
  /* 第 2 章：两件/三件合成总价（点硬币付整） */
  { who: 'frog',     rounds: [{ m: 'sum', ks: ['apple', 'banana'] }, { m: 'sum', ks: ['pear', 'orange'] }] },
  { who: 'panda',    rounds: [{ m: 'sum', ks: ['banana', 'pear'] }, { m: 'sum', ks: ['apple', 'banana', 'orange'] }] },
  { who: 'pig',      rounds: [{ m: 'sum', ks: ['apple', 'orange'] }, { m: 'sum', ks: ['banana', 'orange'] }] },
  { who: 'cat',      rounds: [{ m: 'sum', ks: ['apple', 'banana', 'pear'] }, { m: 'sum', ks: ['apple', 'pear'] }] },
  { who: 'dog',      rounds: [{ m: 'sum', ks: ['apple', 'pear', 'orange'] }, { m: 'sum', ks: ['banana', 'pear', 'orange'] }] },
  /* 第 3 章：预算+找零（先选后算减法，付整找零） */
  { who: 'rabbit',   rounds: [{ m: 'budget', want: 2, B: 8 }, { m: 'budget', want: 2, B: 10 }] },
  { who: 'bear',     rounds: [{ m: 'budget', want: 3, B: 12 }, { m: 'budget', want: 2, B: 8 }] },
  { who: 'elephant', rounds: [{ m: 'budget', want: 3, B: 14 }, { m: 'budget', want: 3, B: 12 }] },
  { who: 'frog',     rounds: [{ m: 'budget', want: 2, B: 10 }, { m: 'budget', want: 3, B: 14 }] },
  { who: 'panda',    rounds: [{ m: 'budget', want: 2, B: 8 }, { m: 'budget', want: 3, B: 12 }] },
  /* 第 4 章：混出+多解（count 11-14 按群 / sum / budget 混排） */
  { who: 'pig',      rounds: [{ m: 'count', k: 'orange', n: 12 }, { m: 'budget', want: 2, B: 10 }] },
  { who: 'cat',      rounds: [{ m: 'sum', ks: ['apple', 'banana', 'pear'] }, { m: 'count', k: 'banana', n: 11 }] },
  { who: 'dog',      rounds: [{ m: 'budget', want: 3, B: 12 }, { m: 'sum', ks: ['pear', 'orange'] }] },
  { who: 'rabbit',   rounds: [{ m: 'count', k: 'apple', n: 14 }, { m: 'budget', want: 2, B: 8 }] },
  { who: 'bear',     rounds: [{ m: 'sum', ks: ['banana', 'pear', 'orange'] }, { m: 'count', k: 'pear', n: 13 }] }
];
const CH_LEN = 5, N_CHAPTERS = Math.ceil(LEVELS.length / CH_LEN);
const LEVEL_KEYS = LEVELS.map((_, i) => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN)); // 章号 1 基，与 spec §3 / pipe / kitchen 一致

/* ---------- 轮规范化：count/sum/budget → 统一 {m, items, k, n, ks, want, B, total, grouped} ---------- */
function normRound(r) {
  if (r.m === 'count') {
    return { m: 'count', k: r.k, n: r.n, items: [{ k: r.k, n: r.n }], grouped: r.n >= GROUP_AT };
  }
  if (r.m === 'sum') {
    return { m: 'sum', ks: r.ks, items: r.ks.map(k => ({ k, n: 1 })),
             total: r.ks.reduce((s, k) => s + GOODS[k].price, 0), grouped: false };
  }
  return { m: 'budget', want: r.want, B: r.B, items: [], total: 0, grouped: false };
}

/* ---------- 无限订单：静态 20 关用完后程序生成（确定性 seed=idx，参数域与静态表一致） ---------- */
function mulberry32(a) { return function() { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; } }
const GEN_WHOS = ['cat', 'dog', 'rabbit', 'bear', 'elephant', 'frog', 'panda', 'pig'];
const GEN_GOODS = ['apple', 'banana', 'pear', 'orange'];
const GEN_BUDGET = [{ want: 2, B: 8 }, { want: 2, B: 10 }, { want: 3, B: 12 }, { want: 3, B: 14 }]; /* 封闭集同静态 */
function genRound(rnd, mode) {
  if (mode === 'count') {
    return { m: 'count', k: GEN_GOODS[Math.floor(rnd() * 4)], n: 6 + Math.floor(rnd() * 9) }; /* 6-14 */
  }
  if (mode === 'sum') {
    const n = 2 + Math.floor(rnd() * 2); /* 2-3 种 */
    const ks = GEN_GOODS.slice();
    for (let i = 3; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = ks[i]; ks[i] = ks[j]; ks[j] = t; }
    return { m: 'sum', ks: ks.slice(0, n) };
  }
  return { m: 'budget', want: 0, B: 0, ...GEN_BUDGET[Math.floor(rnd() * GEN_BUDGET.length)] };
}
function getOrder(i) { /* 关级（含 who + rounds[]，轮已规范化） */
  if (i < LEVELS.length) {
    const L = LEVELS[i];
    return { who: L.who, rounds: L.rounds.map(normRound) };
  }
  const rnd = mulberry32(i * 7919 + 13); /* 确定性：同 idx 永远同关 */
  const who = GEN_WHOS[Math.floor(rnd() * GEN_WHOS.length)];
  const modes = ['count', 'sum', 'budget'];
  const m1 = Math.floor(rnd() * 3);
  const m2 = (m1 + 1 + Math.floor(rnd() * 2)) % 3; /* 两轮异型混排 */
  return { who, rounds: [genRound(rnd, modes[m1]), genRound(rnd, modes[m2])].map(normRound) };
}
const TOTAL_STATIC = LEVELS.length;

/* ---------- 语音链与兜底文案（r6：clip 拼接优先，缺 clip 整句 TTS 兜底） ---------- */
function roundChain(round, firstGrouped) { /* 返回 clip key 数组（非 verify 时用） */
  if (round.m === 'count') {
    const ks = ['shop_want', 'shop_g_' + round.k + '_' + round.n];
    if (round.grouped && firstGrouped) ks.push('shop_group_hint');
    return ks;
  }
  if (round.m === 'sum') {
    const ks = ['shop_want'];
    round.ks.forEach((k, i) => { if (i) ks.push('shop_and'); ks.push('shop_name_' + k); });
    ks.push('shop_ask_total');
    return ks;
  }
  return ['shop_have', 'shop_n_' + round.B, round.want === 2 ? 'shop_buy2' : 'shop_buy3'];
}
function roundSpeech(round) { /* 兜底 TTS 全句（与 clip 文案严格同文） */
  if (round.m === 'count') return '我要' + numCn(round.n) + GOODS[round.k].unit + GOODS[round.k].name;
  if (round.m === 'sum') return '我要' + round.ks.map(k => GOODS[k].name).join('和') + '，一共几元呀，点点硬币付钱吧';
  return '我有' + numCn(round.B) + '元，想买' + (round.want === 2 ? '两' : '三') + '样';
}
function changeAskChain(round) { /* 找零阶段句：付了B元，买了w样，找他几元呀 */
  return ['shop_paid', 'shop_n_' + round.B, round.want === 2 ? 'shop_chg_q2' : 'shop_chg_q3'];
}
function nextChapterHint(idx) { /* 明日预告：下一章第一位顾客（超出静态表走 getOrder 生成） */
  const next = getOrder((Math.floor(idx / CH_LEN) + 1) * CH_LEN);
  const W = { cat: '小猫', dog: '小狗', rabbit: '小兔子', bear: '小熊', elephant: '小象', frog: '小青蛙', panda: '熊猫', pig: '小猪' };
  if (!next) return '所有客人都买到水果啦';
  const r = next.rounds[0];
  const it = r.items[0];
  if (r.m === 'budget') return '明天' + W[next.who] + '要带' + numCn(r.B) + '元来买东西哦';
  return '明天' + W[next.who] + '要来买' + GOODS[it.k].name + '哦';
}
