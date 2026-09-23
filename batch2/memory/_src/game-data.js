/* ================= memory 游戏数据 r19（老结构重建·难度改造）
   真值源：batch2/SPEC-R19-MEMORY.md（本文件 §1 图案族 / §2 关表 / §5 时长模型与其逐值一致；
   复算工具 _src/_spec_calc.py 同公式同序，modeled 双钉 python 侧）。
   delta（AUDIT-56 黄款三条）：图案相似化干扰（8 近形族×2+3 单身）/ 数字对改「和为 10」
   （补数封闭域 {1..9}）/ 短时记忆模式「先看后翻」（亮出窗=800+对数×750）。
   章爬升：ch1 同图+相似化渐进 → ch2 补数 → ch3 先看后翻 → ch4 综合；生成关 flat≥24（种子 1056）。 */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（家族基调）

/* ---------- estMs 定版（b25 家族 T 全字符口径；四方同步之一：data 定义/verify 独立定义/
   build est_ms 字面断言/_selftest est_ms 运行时对账；main 不重复声明直接使用）。
   estMs 吃字符串——传数字=NaN 窗（r18 坑④），一律传 .length 前的原文 ---------- */
const estMs = s => s.length * 345 + 600;     // SAPI ~345ms/字 + 600 落定余量（全字符含标点）

/* ---------- 图案池 19 种：8 近形族×2 + 3 单身（SPEC §1 近形对构造表）
   fam=近形族键（同族两员恰差一个可辨维度——防轮廓匹配捷径）；单身图案 fam:null ---------- */
const PATTERNS = {
  /* 族 cat：耳形 尖三角 vs 圆 */
  cat: { name: '小猫', fam: 'cat', svg: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M17 24 Q9 7 28 13 Z" fill="#F5C89A" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M47 24 Q55 7 36 13 Z" fill="#F5C89A" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M19 20 Q16 12 24 15 Z" fill="#F2B8C6"/><path d="M45 20 Q48 12 40 15 Z" fill="#F2B8C6"/>' +
    '<circle cx="32" cy="39" r="19" fill="#F5C89A" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="25" cy="37" r="2.7" fill="' + INK + '"/><circle cx="39" cy="37" r="2.7" fill="' + INK + '"/>' +
    '<path d="M30 44 q2 2.5 4 0" stroke="' + INK + '" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
    '<path d="M32 41 l-2 2.5 h4 Z" fill="#E8837B" stroke="none"/>' +
    '<ellipse cx="17" cy="43" rx="4" ry="2.6" fill="#F2B8C6" opacity=".8"/><ellipse cx="47" cy="43" rx="4" ry="2.6" fill="#F2B8C6" opacity=".8"/></svg>' },
  cat2: { name: '圆耳猫', fam: 'cat', svg: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<circle cx="19" cy="20" r="7.5" fill="#F5C89A" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="45" cy="20" r="7.5" fill="#F5C89A" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="19" cy="20" r="3.2" fill="#F2B8C6"/><circle cx="45" cy="20" r="3.2" fill="#F2B8C6"/>' +
    '<circle cx="32" cy="39" r="19" fill="#F5C89A" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="25" cy="37" r="2.7" fill="' + INK + '"/><circle cx="39" cy="37" r="2.7" fill="' + INK + '"/>' +
    '<path d="M30 44 q2 2.5 4 0" stroke="' + INK + '" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
    '<path d="M32 41 l-2 2.5 h4 Z" fill="#E8837B" stroke="none"/>' +
    '<ellipse cx="17" cy="43" rx="4" ry="2.6" fill="#F2B8C6" opacity=".8"/><ellipse cx="47" cy="43" rx="4" ry="2.6" fill="#F2B8C6" opacity=".8"/></svg>' },
  /* 族 bear：体色 深棕 vs 蜜色 */
  bear: { name: '小熊', fam: 'bear', svg: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<circle cx="17" cy="19" r="8.5" fill="#C99B6F" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="47" cy="19" r="8.5" fill="#C99B6F" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="17" cy="19" r="3.8" fill="#E8C9A8"/><circle cx="47" cy="19" r="3.8" fill="#E8C9A8"/>' +
    '<circle cx="32" cy="39" r="19" fill="#C99B6F" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<ellipse cx="32" cy="46" rx="9.5" ry="6.5" fill="#EFD9BC" stroke="none"/>' +
    '<ellipse cx="32" cy="42" rx="3.4" ry="2.6" fill="' + INK + '"/>' +
    '<circle cx="25" cy="36" r="2.7" fill="' + INK + '"/><circle cx="39" cy="36" r="2.7" fill="' + INK + '"/>' +
    '<ellipse cx="16" cy="43" rx="4" ry="2.6" fill="#F2B8C6" opacity=".7"/><ellipse cx="48" cy="43" rx="4" ry="2.6" fill="#F2B8C6" opacity=".7"/></svg>' },
  bear2: { name: '蜜色熊', fam: 'bear', svg: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<circle cx="17" cy="19" r="8.5" fill="#E8C9A8" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="47" cy="19" r="8.5" fill="#E8C9A8" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="17" cy="19" r="3.8" fill="#FBF3E4"/><circle cx="47" cy="19" r="3.8" fill="#FBF3E4"/>' +
    '<circle cx="32" cy="39" r="19" fill="#E8C9A8" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<ellipse cx="32" cy="46" rx="9.5" ry="6.5" fill="#FBF3E4" stroke="none"/>' +
    '<ellipse cx="32" cy="42" rx="3.4" ry="2.6" fill="' + INK + '"/>' +
    '<circle cx="25" cy="36" r="2.7" fill="' + INK + '"/><circle cx="39" cy="36" r="2.7" fill="' + INK + '"/>' +
    '<ellipse cx="16" cy="43" rx="4" ry="2.6" fill="#F2B8C6" opacity=".7"/><ellipse cx="48" cy="43" rx="4" ry="2.6" fill="#F2B8C6" opacity=".7"/></svg>' },
  /* 族 apple：带叶 vs 光苹果（只有梗） */
  apple: { name: '苹果', fam: 'apple', svg: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M32 14 Q30 8 24 7" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<path d="M33 10 Q42 4 48 10 Q42 17 33 13 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M32 15 C18 8 8 20 12 36 C15 49 24 57 32 55 C40 57 49 49 52 36 C56 20 46 8 32 15 Z" fill="#E86A5E" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<ellipse cx="22" cy="26" rx="5" ry="8" fill="#FFF" opacity=".35" transform="rotate(-18 22 26)"/></svg>' },
  apple2: { name: '光苹果', fam: 'apple', svg: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M32 14 Q30 8 24 7" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<path d="M32 15 C18 8 8 20 12 36 C15 49 24 57 32 55 C40 57 49 49 52 36 C56 20 46 8 32 15 Z" fill="#E86A5E" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<ellipse cx="22" cy="26" rx="5" ry="8" fill="#FFF" opacity=".35" transform="rotate(-18 22 26)"/></svg>' },
  /* 族 flower：花瓣数 5 vs 6（可数维度） */
  flower: { name: '五瓣花', fam: 'flower', svg: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<circle cx="32" cy="14" r="8.5" fill="#F2B8C6" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="46" cy="24" r="8.5" fill="#F2B8C6" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="41" cy="41" r="8.5" fill="#F2B8C6" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="23" cy="41" r="8.5" fill="#F2B8C6" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="18" cy="24" r="8.5" fill="#F2B8C6" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="32" cy="29" r="9" fill="#F2C94C" stroke="' + INK + '" stroke-width="2.5"/></svg>' },
  flower6: { name: '六瓣花', fam: 'flower', svg: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<circle cx="45" cy="29" r="8.5" fill="#F2B8C6" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="38.5" cy="40.3" r="8.5" fill="#F2B8C6" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="25.5" cy="40.3" r="8.5" fill="#F2B8C6" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="19" cy="29" r="8.5" fill="#F2B8C6" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="25.5" cy="17.8" r="8.5" fill="#F2B8C6" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="38.5" cy="17.8" r="8.5" fill="#F2B8C6" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="32" cy="29" r="9" fill="#F2C94C" stroke="' + INK + '" stroke-width="2.5"/></svg>' },
  /* 族 star：角数 5 vs 4（可数维度） */
  star: { name: '五角星', fam: 'star', svg: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M32 7 Q36 25 57 32 Q36 39 32 57 Q28 39 7 32 Q28 25 32 7 Z" fill="#F2C94C" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<circle cx="32" cy="32" r="3.6" fill="#FFF" opacity=".7"/></svg>' },
  star4: { name: '四角星', fam: 'star', svg: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M32 7 Q35 28 57 32 Q35 36 32 57 Q29 36 7 32 Q29 28 32 7 Z" fill="#F2C94C" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<circle cx="32" cy="32" r="3.6" fill="#FFF" opacity=".7"/></svg>' },
  /* 族 pear：梨形 高瘦 vs 矮胖（比例维度） */
  pear: { name: '高梨', fam: 'pear', svg: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M33 8 Q32 4 28 4" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="36" cy="10" rx="7" ry="4" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.5" transform="rotate(24 36 10)"/>' +
    '<path d="M33 12 C28 14 26 18 27 23 C28 26 30 28 30 31 C22 33 15 40 15 48 C15 56 23 61 32 61 C41 61 49 56 49 48 C49 40 42 33 34 31 C34 28 36 26 37 23 C38 18 38 14 33 12 Z" fill="#A8C97F" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<ellipse cx="26" cy="46" rx="4" ry="6" fill="#FFF" opacity=".35" transform="rotate(-15 26 46)"/></svg>' },
  pear2: { name: '胖梨', fam: 'pear', svg: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M32 10 Q31 5 27 5" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="35" cy="12" rx="7" ry="4" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.5" transform="rotate(24 35 12)"/>' +
    '<path d="M32 14 C28 15 26 18 26 21 C27 23 28 24 28 26 C19 28 11 37 11 46 C11 55 20 61 32 61 C44 61 53 55 53 46 C53 37 45 28 36 26 C36 24 37 23 38 21 C38 18 36 15 32 14 Z" fill="#A8C97F" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<ellipse cx="24" cy="45" rx="4" ry="5" fill="#FFF" opacity=".35" transform="rotate(-15 24 45)"/></svg>' },
  /* 族 frog：眼形 圆睁 vs 眯眼笑（结构维度） */
  frog: { name: '圆眼蛙', fam: 'frog', svg: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<circle cx="19" cy="21" r="9" fill="#B5D99C" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="45" cy="21" r="9" fill="#B5D99C" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="19" cy="21" r="4" fill="' + INK + '"/><circle cx="45" cy="21" r="4" fill="' + INK + '"/>' +
    '<circle cx="20.5" cy="19.5" r="1.4" fill="#FFF"/><circle cx="46.5" cy="19.5" r="1.4" fill="#FFF"/>' +
    '<ellipse cx="32" cy="41" rx="21" ry="17" fill="#B5D99C" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<path d="M23 42 q9 8 18 0" stroke="' + INK + '" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
    '<circle cx="13" cy="47" r="1.8" fill="#8FBF7F" opacity=".85"/><circle cx="51" cy="47" r="1.8" fill="#8FBF7F" opacity=".85"/></svg>' },
  frog2: { name: '眯眼蛙', fam: 'frog', svg: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<circle cx="19" cy="21" r="9" fill="#B5D99C" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="45" cy="21" r="9" fill="#B5D99C" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<path d="M15.5 21 q3.5 -4.5 7 0" stroke="' + INK + '" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
    '<path d="M41.5 21 q3.5 -4.5 7 0" stroke="' + INK + '" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="32" cy="41" rx="21" ry="17" fill="#B5D99C" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<path d="M23 42 q9 8 18 0" stroke="' + INK + '" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
    '<circle cx="13" cy="47" r="1.8" fill="#8FBF7F" opacity=".85"/><circle cx="51" cy="47" r="1.8" fill="#8FBF7F" opacity=".85"/></svg>' },
  /* 族 orange：带叶光皮 vs 无叶麻点（存在性维度） */
  orange: { name: '橙子', fam: 'orange', svg: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<circle cx="32" cy="36" r="22" fill="#F2994A" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<path d="M32 14 Q31 8 26 7" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<path d="M33 11 Q41 6 46 11 Q40 17 33 14 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<circle cx="24" cy="30" r="2.2" fill="#FFF" opacity=".55"/><circle cx="30" cy="25" r="1.6" fill="#FFF" opacity=".5"/><circle cx="21" cy="36" r="1.6" fill="#FFF" opacity=".5"/>' +
    '<circle cx="40" cy="44" r="1.4" fill="#C77A42" opacity=".6"/><circle cx="25" cy="46" r="1.4" fill="#C77A42" opacity=".6"/></svg>' },
  orange2: { name: '麻点橙', fam: 'orange', svg: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<circle cx="32" cy="36" r="22" fill="#F2994A" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<path d="M32 14 Q31 8 26 7" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<circle cx="22" cy="28" r="2.2" fill="#C77A42" opacity=".75"/><circle cx="31" cy="24" r="2.2" fill="#C77A42" opacity=".75"/>' +
    '<circle cx="41" cy="27" r="2.2" fill="#C77A42" opacity=".75"/><circle cx="18" cy="38" r="2.2" fill="#C77A42" opacity=".75"/>' +
    '<circle cx="45" cy="39" r="2.2" fill="#C77A42" opacity=".75"/><circle cx="27" cy="47" r="2.2" fill="#C77A42" opacity=".75"/>' +
    '<circle cx="38" cy="48" r="2.2" fill="#C77A42" opacity=".75"/><circle cx="32" cy="36" r="2.2" fill="#C77A42" opacity=".75"/></svg>' },
  /* ---------- 单身图案（无近形干扰，fam:null） ---------- */
  dog: { name: '小狗', fam: null, svg: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<ellipse cx="14" cy="37" rx="9" ry="15" fill="#B98A5E" stroke="' + INK + '" stroke-width="2.5" transform="rotate(14 14 37)"/>' +
    '<ellipse cx="50" cy="37" rx="9" ry="15" fill="#B98A5E" stroke="' + INK + '" stroke-width="2.5" transform="rotate(-14 50 37)"/>' +
    '<circle cx="32" cy="37" r="19" fill="#E8C9A8" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<ellipse cx="32" cy="46" rx="10" ry="7" fill="#FBF7F0" stroke="none"/>' +
    '<ellipse cx="32" cy="41" rx="3.6" ry="2.8" fill="' + INK + '"/>' +
    '<circle cx="24.5" cy="35" r="2.7" fill="' + INK + '"/><circle cx="39.5" cy="35" r="2.7" fill="' + INK + '"/>' +
    '<ellipse cx="16" cy="43" rx="4" ry="2.6" fill="#F2B8C6" opacity=".7"/><ellipse cx="48" cy="43" rx="4" ry="2.6" fill="#F2B8C6" opacity=".7"/></svg>' },
  elephant: { name: '小象', fam: null, svg: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<ellipse cx="13" cy="36" rx="10" ry="16" fill="#CFC5E3" stroke="' + INK + '" stroke-width="2.5" transform="rotate(10 13 36)"/>' +
    '<ellipse cx="51" cy="36" rx="10" ry="16" fill="#CFC5E3" stroke="' + INK + '" stroke-width="2.5" transform="rotate(-10 51 36)"/>' +
    '<circle cx="32" cy="36" r="19" fill="#CFC5E3" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<path d="M26 44 Q25 55 33 56 Q39 57 40 51" stroke="' + INK + '" stroke-width="9" fill="none" stroke-linecap="round" opacity=".999"/>' +
    '<path d="M26 44 Q25 55 33 56 Q39 57 40 51" stroke="#CFC5E3" stroke-width="5.5" fill="none" stroke-linecap="round"/>' +
    '<circle cx="24.5" cy="34" r="2.7" fill="' + INK + '"/><circle cx="39.5" cy="34" r="2.7" fill="' + INK + '"/>' +
    '<ellipse cx="15" cy="42" rx="4" ry="2.6" fill="#F2B8C6" opacity=".7"/><ellipse cx="49" cy="42" rx="4" ry="2.6" fill="#F2B8C6" opacity=".7"/></svg>' },
  banana: { name: '香蕉', fam: null, svg: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M12 16 C10 34 22 52 46 53 C52 53 56 50 57 46 C50 49 40 48 33 42 C24 35 20 26 20 17 Z" fill="#F2C94C" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M11 12 L20 12 L20 18 L13 19 Z" fill="#B98A5E" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M55 45 C58 47 59 50 57 52" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<path d="M24 24 C22 32 27 41 34 46" stroke="#FFF" stroke-width="3.5" fill="none" stroke-linecap="round" opacity=".45"/></svg>' }
};
/* 近形族索引（8 族×2）与单身池（build/verify 对账 SPEC §1） */
const FAM_KEYS = ['cat', 'bear', 'apple', 'flower', 'star', 'pear', 'frog', 'orange'];
const FAM_MEMBERS = {
  cat: ['cat', 'cat2'], bear: ['bear', 'bear2'], apple: ['apple', 'apple2'],
  flower: ['flower', 'flower6'], star: ['star', 'star4'], pear: ['pear', 'pear2'],
  frog: ['frog', 'frog2'], orange: ['orange', 'orange2']
};
const SINGLE_KEYS = ['dog', 'elephant', 'banana'];
const patFam = k => (PATTERNS[k] && PATTERNS[k].fam) || null;

/* ---------- 数字脸（补数模式用）：大数字 + 十格点阵（前 n 格填充——双重编码可点数） ---------- */
function numFaceSvg(n) {
  let dots = '';
  for (let k = 0; k < 10; k++) {
    const x = 12 + (k % 5) * 10, y = 42 + Math.floor(k / 5) * 11, filled = k < n;
    dots += '<circle cx="' + x + '" cy="' + y + '" r="3.4" fill="' + (filled ? '#E8975A' : 'none') +
            '" stroke="' + (filled ? 'none' : '#D8C9B4') + '" stroke-width="1.6"/>';
  }
  return '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<text x="32" y="32" text-anchor="middle" font-size="30" font-weight="800" fill="' + INK +
    '" font-family="system-ui,sans-serif">' + n + '</text>' + dots + '</svg>';
}
const NUM_FACES = {};
for (let n = 1; n <= 9; n++) NUM_FACES[String(n)] = numFaceSvg(n);

/* ---------- 补数封闭域 {1..9}（SPEC §3）：恰 5 组，(5,5) 为同面桥接对 ---------- */
const COMP_PAIRS = [[5, 5], [4, 6], [3, 7], [2, 8], [1, 9]];
const COMP_PAIRS_NO5 = COMP_PAIRS.filter(p => p[0] !== p[1]);
const SUM10_TAKE = [2, 3, 4, 5, 5, 5];   // ch2 lv0-5 取前 n 组（渐进到全域）

/* ---------- 卡背：奶油色小兔子剪影（暖橙底，沿用老款） ---------- */
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
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>',
  /* 规则章徽：同图配对=两张一样的小卡 / 补数=十格点阵（零文字规则提示） */
  pair: '<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="6" y="10" width="16" height="22" rx="4" fill="#E8975A" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<rect x="22" y="12" width="16" height="22" rx="4" fill="#E8975A" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<path d="M12 18 h4 M12 23 h4" stroke="#FFF9EE" stroke-width="2.2" stroke-linecap="round"/>' +
    '<path d="M28 20 h4 M28 25 h4" stroke="#FFF9EE" stroke-width="2.2" stroke-linecap="round"/></svg>',
  ten: '<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="5" y="12" width="34" height="20" rx="5" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<circle cx="11.5" cy="19" r="2.5" fill="#E8975A"/><circle cx="18.5" cy="19" r="2.5" fill="#E8975A"/>' +
    '<circle cx="25.5" cy="19" r="2.5" fill="#E8975A"/><circle cx="32.5" cy="19" r="2.5" fill="none" stroke="#D8C9B4" stroke-width="1.6"/>' +
    '<circle cx="11.5" cy="26" r="2.5" fill="#E8975A"/><circle cx="18.5" cy="26" r="2.5" fill="none" stroke="#D8C9B4" stroke-width="1.6"/>' +
    '<circle cx="25.5" cy="26" r="2.5" fill="none" stroke="#D8C9B4" stroke-width="1.6"/>' +
    '<circle cx="32.5" cy="26" r="2.5" fill="none" stroke="#D8C9B4" stroke-width="1.6"/></svg>'
};

/* ---------- 关卡结构（SPEC §2）：CH_LEN 5→6（v1 键基迁移 IIFE 见 game-main） ---------- */
const CH_LEN = 6;                 // 每章 6 关（r19；v1=5 → 启动 IIFE 迁移）
const STATIC_LEVELS = 24;         // 静态 24 关 = 4 章
const MEM_SEED = 1056;            // 本批种子常量（扫描定值：flat24-39 四 dch 全 4/4/4/4、双模式 8/8）
const LEVEL_SPECS = [
  /* ch1 同图配对+相似化渐进（twins=近形族共现数） */
  { r: 2, c: 3, mode: 'same', twins: 0, peek: 0 },
  { r: 2, c: 3, mode: 'same', twins: 1, peek: 0 },
  { r: 2, c: 4, mode: 'same', twins: 1, peek: 0 },
  { r: 2, c: 4, mode: 'same', twins: 2, peek: 0 },
  { r: 3, c: 4, mode: 'same', twins: 2, peek: 0 },
  { r: 3, c: 4, mode: 'same', twins: 3, peek: 0 },
  /* ch2 补数配对「和为 10」（2→5 对渐进到全域） */
  { r: 2, c: 2, mode: 'sum10', twins: 0, peek: 0 },
  { r: 2, c: 3, mode: 'sum10', twins: 0, peek: 0 },
  { r: 2, c: 4, mode: 'sum10', twins: 0, peek: 0 },
  { r: 2, c: 5, mode: 'sum10', twins: 0, peek: 0 },
  { r: 2, c: 5, mode: 'sum10', twins: 0, peek: 0 },
  { r: 2, c: 5, mode: 'sum10', twins: 0, peek: 0 },
  /* ch3 先看后翻（亮出窗=800+对数×750）+相似化 */
  { r: 2, c: 3, mode: 'same', twins: 1, peek: 1 },
  { r: 2, c: 4, mode: 'same', twins: 2, peek: 1 },
  { r: 3, c: 4, mode: 'same', twins: 2, peek: 1 },
  { r: 3, c: 4, mode: 'same', twins: 3, peek: 1 },
  { r: 4, c: 4, mode: 'same', twins: 3, peek: 1 },
  { r: 4, c: 4, mode: 'same', twins: 4, peek: 1 },
  /* ch4 综合：peek+补数+大阵（ch3+ 反退化——仍需工作记忆） */
  { r: 4, c: 4, mode: 'same', twins: 4, peek: 1 },
  { r: 2, c: 5, mode: 'sum10', twins: 0, peek: 1 },
  { r: 4, c: 4, mode: 'same', twins: 4, peek: 1 },
  { r: 2, c: 5, mode: 'sum10', twins: 0, peek: 1 },
  { r: 4, c: 5, mode: 'same', twins: 4, peek: 1 },
  { r: 4, c: 5, mode: 'same', twins: 5, peek: 1 }
];
const CH_LVS = [0, 1, 2, 3, 4, 5];
const CHAPTERS = {
  1: { name: '找朋友', hint: '数字朋友要来啦，两张合起来是十' },   // 预告 ch2 补数
  2: { name: '凑十好朋友', hint: '下一章要先看清楚再翻哦' },       // 预告 ch3 先看后翻
  3: { name: '看清楚再翻', hint: '更大的挑战等着你' },             // 预告 ch4 综合
  4: { name: '记忆大挑战', hint: '新一轮记忆挑战来啦' }            // 预告生成关
};
const GEN_HINTS = ['更多图案的大挑战哦',   // dch1 档（4×4/3 近形族）
                   '双胞胎图案更多啦',     // dch2（4×4/4 近形族）
                   '大牌阵记忆挑战哦',     // dch3（4×5 或去桥接对）
                   '超强记忆王挑战哦'];    // dch4（4×5/5 近形族）

/* ---------- r19 时长模型（SPEC §5；estMs 四方同步之一，modeled 双钉 verify+_selftest）
   DECIDE_MIN=每翻一张的最小认知间隔（模式档：补数须心算求补>同图匹配）；
   modeled = OPEN 1000 + peekWin + 对数×2×DECIDE_MIN[mode] + END 2000（整数精确 ms，
   JS 与 _spec_calc.py/_selftest.py 同公式同序位级一致）。
   SPEC_MODELED_MIN = m0 = 12000（flat0，禁约数）；LEVEL_MIN_MS=12000（本款口径）。 ---------- */
const DECIDE_MIN = { same: 1500, sum10: 2400 };
const PEEK_BASE = 800, PEEK_PER_PAIR = 750;   // 亮出窗=800+对数×750（SPEC §4 数学先验）
const OPEN_MS = 1000, END_MS = 2000;
const LEVEL_MIN_MS = 12000;
const peekMs = pairs => PEEK_BASE + pairs * PEEK_PER_PAIR;
const modeled = flat => {
  const g = genLevel(flat | 0);
  const pairs = g.r * g.c / 2;
  return Math.round(OPEN_MS + (g.peek ? peekMs(pairs) : 0) + pairs * 2 * DECIDE_MIN[g.mode] + END_MS);
};

/* ---------- 语音文案（与 voice/clips/manifest.json 严格一致，禁自造；
   mem_tut_watch/mem_tut_turn/mem_hint 老键沿用（实测 4104/2256/2160ms）+
   r19 新键 mem_peek/mem_sum10/mem_twin/mem_missmore（已报主线 gen_clips.py 登记，
   clip 落地前 voice.play(key,text) 走 TTS 兜底，窗按 estMs(text) 实算） ---------- */
const VOICE = {
  tutWatch: { key: 'mem_tut_watch', text: '看！翻一翻，找到一样的两张' },
  tutTurn:  { key: 'mem_tut_turn',  text: '现在你来试一试' },
  hint:     { key: 'mem_hint',      text: '找到一样的两张' },
  missmore: { key: 'mem_missmore',  text: '没关系，再想一想' },
  sum10:    { key: 'mem_sum10',     text: '找一找，两张合起来是十' },
  peek:     { key: 'mem_peek',      text: '先看仔细，记住它们的位置哦' },
  twin:     { key: 'mem_twin',      text: '它们长得很像，要看清楚哦' }
};
