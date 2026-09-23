/* ================= worden 游戏数据（48 词封闭词库（r32 扩容 24→48）/ 每词简笔 SVG / 章配置 / 语音文案 / 图标）
   词库（SPEC-R32-WORDEN §R1 维度二）：原 24 词 + r32 新 24 词（全 4-5 字母=词长上探）——
   新 24 词 en 音 clip 走 r32 TODO 清单（SPEC §R10 主线 gen_clips 统一注册，禁自注册），
   注册前点对新词=静默（core speak 兜底已退役=静默+console.warn 非 pageerror）。
   SVG 铁律：笔画简、特征鲜明（cat 长须三角耳 / rabbit 长耳 / banana 弯月 / grape 一串圆）、
   主色贴实物（apple 红 banana 黄 grape 紫），统一暖棕描边 2.5-3.2（DESIGN-SPEC §8）；
   视觉诚实：SVG 纯具象物不泄拼写（r32 新词同理，零字母元素） */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（DESIGN-SPEC §8）

/* ---------- 词表 48（r32 扩容 24→48）：cat=类别（干扰词同类别优先取材）/ zh=中文名（aria 与注释用） ---------- */
const WORDS = {
  cat:    { cat: 'animal', zh: '猫' },
  dog:    { cat: 'animal', zh: '狗' },
  fish:   { cat: 'animal', zh: '鱼' },
  bird:   { cat: 'animal', zh: '鸟' },
  rabbit: { cat: 'animal', zh: '兔子' },
  sheep:  { cat: 'animal', zh: '绵羊' },      // r32 新词（下同：24 新词全部 4-5 字母=词长上探）
  duck:   { cat: 'animal', zh: '鸭子' },
  mouse:  { cat: 'animal', zh: '老鼠' },
  horse:  { cat: 'animal', zh: '马' },
  apple:  { cat: 'fruit',  zh: '苹果' },
  banana: { cat: 'fruit',  zh: '香蕉' },
  orange: { cat: 'fruit',  zh: '橙子' },
  grape:  { cat: 'fruit',  zh: '葡萄' },
  pear:   { cat: 'fruit',  zh: '梨' },
  peach:  { cat: 'fruit',  zh: '桃子' },
  lemon:  { cat: 'fruit',  zh: '柠檬' },
  melon:  { cat: 'fruit',  zh: '西瓜' },
  egg:    { cat: 'food',   zh: '鸡蛋' },
  milk:   { cat: 'food',   zh: '牛奶' },
  cake:   { cat: 'food',   zh: '蛋糕' },
  rice:   { cat: 'food',   zh: '米饭' },
  bread:  { cat: 'food',   zh: '面包' },
  soup:   { cat: 'food',   zh: '汤' },
  sun:    { cat: 'nature', zh: '太阳' },
  moon:   { cat: 'nature', zh: '月亮' },
  star:   { cat: 'nature', zh: '星星' },
  rain:   { cat: 'nature', zh: '雨' },
  cloud:  { cat: 'nature', zh: '云' },
  snow:   { cat: 'nature', zh: '雪花' },
  leaf:   { cat: 'nature', zh: '叶子' },
  wind:   { cat: 'nature', zh: '风' },
  book:   { cat: 'object', zh: '书' },
  ball:   { cat: 'object', zh: '球' },
  car:    { cat: 'object', zh: '汽车' },
  tree:   { cat: 'object', zh: '树' },
  boat:   { cat: 'object', zh: '小船' },
  train:  { cat: 'object', zh: '火车' },
  house:  { cat: 'object', zh: '房子' },
  plant:  { cat: 'object', zh: '植物' },
  brush:  { cat: 'object', zh: '刷子' },
  hand:   { cat: 'body',   zh: '手' },
  eye:    { cat: 'body',   zh: '眼睛' },
  ear:    { cat: 'body',   zh: '耳朵' },
  nose:   { cat: 'body',   zh: '鼻子' },
  face:   { cat: 'body',   zh: '脸' },
  hair:   { cat: 'body',   zh: '头发' },
  foot:   { cat: 'body',   zh: '脚' },
  tooth:  { cat: 'body',   zh: '牙齿' }
};
const WORD_KEYS = Object.keys(WORDS);
/* 形近干扰对（章 3 专用，r32 扩容 6→12 组）：干扰卡仅显示不发音（不在词库→永无对应 clip，
   构造层杜绝误播）；干扰词全 ∉48 词库（verify ③ 机检——12 值均为库外真词=辨析有真价值） */
const CONFUSE = { cat: 'cap', dog: 'dot', book: 'look', cake: 'lake', star: 'stop', hand: 'head',
  sheep: 'sheet', boat: 'coat', train: 'brain', snow: 'slow', rice: 'race', mouse: 'moose' };
const CONFUSE_KEYS = Object.keys(CONFUSE);

/* ---------- 每词简笔 SVG（viewBox 0 0 100 100；渲染尺寸由外层卡片控制 ≥64px） ---------- */
function wordSvg(w) {
  const S = [];
  const open = '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">';
  switch (w) {
    case 'cat': // 猫：三角耳+长须+粉鼻
      S.push('<path d="M28 42 L19 14 L44 29 Z" fill="#F5A75B" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>',
        '<path d="M72 42 L81 14 L56 29 Z" fill="#F5A75B" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>',
        '<circle cx="50" cy="58" r="30" fill="#F5A75B" stroke="' + INK + '" stroke-width="3.2"/>',
        '<path d="M8 54 H22 M8 64 H22 M92 54 H78 M92 64 H78" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>',
        '<circle cx="40" cy="52" r="3.6" fill="' + INK + '"/><circle cx="60" cy="52" r="3.6" fill="' + INK + '"/>',
        '<path d="M46 62 L54 62 L50 68 Z" fill="#E8888A" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>',
        '<path d="M50 68 q-3 6 -9 3 M50 68 q3 6 9 3" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>');
      break;
    case 'dog': // 狗：垂耳+吻部+吐舌
      S.push('<path d="M27 34 Q10 38 14 58 Q16 70 29 65 Z" fill="#8A6B4F" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>',
        '<path d="M73 34 Q90 38 86 58 Q84 70 71 65 Z" fill="#8A6B4F" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>',
        '<circle cx="50" cy="52" r="28" fill="#C89B6F" stroke="' + INK + '" stroke-width="3.2"/>',
        '<ellipse cx="50" cy="65" rx="13" ry="10" fill="#FBF3E4" stroke="' + INK + '" stroke-width="2.8"/>',
        '<ellipse cx="50" cy="59" rx="5.5" ry="4.5" fill="' + INK + '"/>',
        '<path d="M50 63 v5" stroke="' + INK + '" stroke-width="2.4" stroke-linecap="round"/>',
        '<circle cx="39" cy="44" r="3.6" fill="' + INK + '"/><circle cx="61" cy="44" r="3.6" fill="' + INK + '"/>',
        '<path d="M45 74 q5 9 10 0 Z" fill="#E8888A" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>');
      break;
    case 'fish': // 鱼：蓝身+尾鳍+吐泡
      S.push('<path d="M32 50 L9 33 Q17 50 9 67 Z" fill="#2F7CC0" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>',
        '<path d="M52 31 q8 -10 16 -1 Z" fill="#2F7CC0" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>',
        '<ellipse cx="58" cy="50" rx="28" ry="20" fill="#4E9BDD" stroke="' + INK + '" stroke-width="3.2"/>',
        '<path d="M64 37 q-4 13 0 26" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
        '<ellipse cx="46" cy="54" rx="10" ry="6" fill="#2F7CC0" stroke="' + INK + '" stroke-width="2.4" transform="rotate(-14 46 54)"/>',
        '<circle cx="72" cy="44" r="4.6" fill="#FFF" stroke="' + INK + '" stroke-width="2"/><circle cx="73.4" cy="44" r="2.2" fill="' + INK + '"/>',
        '<circle cx="89" cy="28" r="4" stroke="#8FC3DE" stroke-width="2.4"/><circle cx="94" cy="15" r="2.6" stroke="#8FC3DE" stroke-width="2.2"/>');
      break;
    case 'bird': // 鸟：圆身+橙喙+细腿
      S.push('<path d="M28 50 L8 42 L13 58 Z" fill="#2F7CC0" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>',
        '<circle cx="48" cy="56" r="23" fill="#4E9BDD" stroke="' + INK + '" stroke-width="3.2"/>',
        '<circle cx="69" cy="39" r="14" fill="#4E9BDD" stroke="' + INK + '" stroke-width="3.2"/>',
        '<ellipse cx="43" cy="58" rx="10" ry="7" fill="#2F7CC0" stroke="' + INK + '" stroke-width="2.4" transform="rotate(-18 43 58)"/>',
        '<path d="M82 36 L96 41 L82 46 Z" fill="#F5A63B" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>',
        '<circle cx="70" cy="36" r="4.2" fill="#FFF" stroke="' + INK + '" stroke-width="1.8"/><circle cx="71.2" cy="36" r="2" fill="' + INK + '"/>',
        '<path d="M42 79 v9 M56 79 v9" stroke="#8A6B4F" stroke-width="3" stroke-linecap="round"/>',
        '<path d="M37 88 h10 M51 88 h10" stroke="#8A6B4F" stroke-width="3" stroke-linecap="round"/>');
      break;
    case 'rabbit': // 兔：长耳（粉内耳）+圆脸
      S.push('<ellipse cx="37" cy="26" rx="9.5" ry="25" fill="#FBF7F0" stroke="' + INK + '" stroke-width="3" transform="rotate(-8 37 26)"/>',
        '<ellipse cx="63" cy="26" rx="9.5" ry="25" fill="#FBF7F0" stroke="' + INK + '" stroke-width="3" transform="rotate(8 63 26)"/>',
        '<ellipse cx="37" cy="28" rx="4.2" ry="17" fill="#F2B8C6" transform="rotate(-8 37 28)"/>',
        '<ellipse cx="63" cy="28" rx="4.2" ry="17" fill="#F2B8C6" transform="rotate(8 63 28)"/>',
        '<circle cx="50" cy="66" r="26" fill="#FBF7F0" stroke="' + INK + '" stroke-width="3.2"/>',
        '<circle cx="41" cy="62" r="3.6" fill="' + INK + '"/><circle cx="59" cy="62" r="3.6" fill="' + INK + '"/>',
        '<ellipse cx="50" cy="70" rx="3.6" ry="2.8" fill="#E8888A"/>',
        '<path d="M50 73 q-3 5 -8 3 M50 73 q3 5 8 3" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
        '<ellipse cx="34" cy="72" rx="5" ry="3.5" fill="#F2B8C6" opacity=".8"/><ellipse cx="66" cy="72" rx="5" ry="3.5" fill="#F2B8C6" opacity=".8"/>');
      break;
    case 'apple': // 苹果：红果+绿叶+果柄
      S.push('<path d="M50 30 Q31 25 26 47 Q21 72 50 83 Q79 72 74 47 Q69 25 50 30 Z" fill="#E8543F" stroke="' + INK + '" stroke-width="3.2" stroke-linejoin="round"/>',
        '<path d="M50 30 q-1 -8 4 -13" stroke="#8A6B4F" stroke-width="3.5" fill="none" stroke-linecap="round"/>',
        '<path d="M55 20 q11 -9 19 1 q-9 9 -19 -1 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>',
        '<path d="M35 48 q-3 8 1 15" stroke="#FBF3E4" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>');
      break;
    case 'banana': // 香蕉：黄弯月+褐端点
      S.push('<path d="M20 25 Q12 58 42 78 Q72 97 90 63 Q66 80 42 60 Q24 44 26 23 Z" fill="#F7D24E" stroke="' + INK + '" stroke-width="3.2" stroke-linejoin="round"/>',
        '<ellipse cx="22" cy="24" rx="6.5" ry="5.5" fill="#B98A4A" stroke="' + INK + '" stroke-width="2.6"/>',
        '<ellipse cx="88" cy="64" rx="5" ry="4" fill="#B98A4A" stroke="' + INK + '" stroke-width="2.6"/>',
        '<path d="M40 66 Q58 78 72 72" stroke="#E2B420" stroke-width="2.6" fill="none" stroke-linecap="round"/>');
      break;
    case 'orange': // 橙子：橙圆+麻点+绿叶
      S.push('<circle cx="50" cy="58" r="30" fill="#F5A63B" stroke="' + INK + '" stroke-width="3.2"/>',
        '<circle cx="38" cy="52" r="1.7" fill="#DC8818"/><circle cx="47" cy="64" r="1.7" fill="#DC8818"/>',
        '<circle cx="57" cy="52" r="1.7" fill="#DC8818"/><circle cx="63" cy="66" r="1.7" fill="#DC8818"/>',
        '<circle cx="44" cy="72" r="1.7" fill="#DC8818"/><circle cx="59" cy="42" r="1.7" fill="#DC8818"/>',
        '<path d="M50 28 v-7" stroke="#8A6B4F" stroke-width="3.5" stroke-linecap="round"/>',
        '<path d="M52 22 q10 -12 22 -5 q-8 11 -22 5 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>');
      break;
    case 'grape': // 葡萄：一串紫圆+叶柄
      S.push('<path d="M50 30 v-11" stroke="#8A6B4F" stroke-width="3.5" stroke-linecap="round"/>',
        '<path d="M50 20 q-13 -11 -24 -2 q9 9 24 2 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>',
        '<circle cx="38" cy="40" r="10.5" fill="#A572D4" stroke="' + INK + '" stroke-width="2.8"/>',
        '<circle cx="62" cy="40" r="10.5" fill="#A572D4" stroke="' + INK + '" stroke-width="2.8"/>',
        '<circle cx="26" cy="60" r="10.5" fill="#8752B5" stroke="' + INK + '" stroke-width="2.8"/>',
        '<circle cx="50" cy="60" r="10.5" fill="#A572D4" stroke="' + INK + '" stroke-width="2.8"/>',
        '<circle cx="74" cy="60" r="10.5" fill="#8752B5" stroke="' + INK + '" stroke-width="2.8"/>',
        '<circle cx="38" cy="80" r="10.5" fill="#A572D4" stroke="' + INK + '" stroke-width="2.8"/>',
        '<circle cx="62" cy="80" r="10.5" fill="#A572D4" stroke="' + INK + '" stroke-width="2.8"/>');
      break;
    case 'egg': // 鸡蛋：煎蛋白边+黄芯
      S.push('<path d="M30 34 Q42 21 60 25 Q80 27 82 46 Q84 63 67 71 Q51 80 35 72 Q17 64 21 47 Q23 37 30 34 Z" fill="#FFFDF6" stroke="' + INK + '" stroke-width="3.2" stroke-linejoin="round"/>',
        '<circle cx="52" cy="49" r="13.5" fill="#F7D24E" stroke="' + INK + '" stroke-width="3"/>',
        '<circle cx="47.5" cy="44.5" r="3.4" fill="#FBF3E4"/>');
      break;
    case 'milk': // 牛奶：屋形奶盒+蓝盖
      S.push('<path d="M28 42 L50 23 L72 42 Z" fill="#DCEAF4" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>',
        '<rect x="44" y="14" width="12" height="9" rx="2" fill="#4E9BDD" stroke="' + INK + '" stroke-width="2.6"/>',
        '<rect x="28" y="42" width="44" height="42" rx="4" fill="#FFFDF6" stroke="' + INK + '" stroke-width="3.2"/>',
        '<path d="M28 42 h44" stroke="' + INK + '" stroke-width="2.6"/>',
        '<path d="M35 60 q8 -9 15 0 q8 9 15 0" stroke="#4E9BDD" stroke-width="4" fill="none" stroke-linecap="round"/>',
        '<circle cx="50" cy="73" r="4.5" fill="#4E9BDD" stroke="' + INK + '" stroke-width="2.2"/>');
      break;
    case 'cake': // 蛋糕：双层+淋面+樱桃
      S.push('<rect x="28" y="62" width="44" height="21" rx="5" fill="#F2B8C6" stroke="' + INK + '" stroke-width="3"/>',
        '<rect x="34" y="44" width="32" height="19" rx="5" fill="#FBF3E4" stroke="' + INK + '" stroke-width="3"/>',
        '<path d="M34 44 h32 v5 q-4 9 -8 1 q-4 9 -8 1 q-4 9 -8 1 q-4 7 -8 -1 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>',
        '<circle cx="50" cy="35" r="7" fill="#E8543F" stroke="' + INK + '" stroke-width="2.8"/>',
        '<path d="M50 28 q2 -6 7 -8" stroke="#8A6B4F" stroke-width="3" fill="none" stroke-linecap="round"/>',
        '<ellipse cx="50" cy="86" rx="35" ry="6" fill="#EFE3CD" stroke="' + INK + '" stroke-width="2.6"/>');
      break;
    case 'sun': // 太阳：黄圆+八射线+笑脸
      S.push('<path d="M86 50 H96 M76 76 L83 83 M50 86 V96 M24 76 L17 83 M14 50 H4 M24 24 L17 17 M50 14 V4 M76 24 L83 17" stroke="#F5A63B" stroke-width="5" stroke-linecap="round"/>',
        '<circle cx="50" cy="50" r="25" fill="#F7D24E" stroke="' + INK + '" stroke-width="3.2"/>',
        '<path d="M41 46 q3 -4.5 6 0 M53 46 q3 -4.5 6 0" stroke="' + INK + '" stroke-width="2.8" fill="none" stroke-linecap="round"/>',
        '<path d="M41 56 q9 8 18 0" stroke="' + INK + '" stroke-width="2.8" fill="none" stroke-linecap="round"/>');
      break;
    case 'moon': // 月亮：黄弯月+小星
      S.push('<path d="M64 10 Q28 26 28 52 Q28 78 64 94 Q44 76 44 52 Q44 28 64 10 Z" fill="#F7D24E" stroke="' + INK + '" stroke-width="3.2" stroke-linejoin="round"/>',
        '<path d="M80 30 l3.2 8.4 8.4 3.2 -8.4 3.2 -3.2 8.4 -3.2 -8.4 -8.4 -3.2 8.4 -3.2 Z" fill="#F5C445" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>',
        '<circle cx="47" cy="42" r="2.6" fill="' + INK + '"/><circle cx="47" cy="58" r="2.6" fill="' + INK + '"/>',
        '<path d="M45 66 q4 4 8 0" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>');
      break;
    case 'star': // 星星：五角星+笑脸
      S.push('<polygon points="50,20 58.5,42.3 82.3,43.5 63.8,58.5 70,81.5 50,68.5 30,81.5 36.2,58.5 17.7,43.5 41.5,42.3" fill="#F5C445" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>',
        '<circle cx="44" cy="50" r="2.8" fill="' + INK + '"/><circle cx="56" cy="50" r="2.8" fill="' + INK + '"/>',
        '<path d="M45 56 q5 5 10 0" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>');
      break;
    case 'rain': // 雨：灰云+三滴雨
      S.push('<path d="M29 58 Q14 58 16 45 Q18 33 32 35 Q36 20 52 22 Q68 22 71 36 Q85 34 85 46 Q85 58 72 58 Z" fill="#B8C7D8" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>',
        '<path d="M32 66 q7 9 0 15 q-7 -6 0 -15 Z" fill="#4E9BDD" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>',
        '<path d="M50 66 q7 9 0 15 q-7 -6 0 -15 Z" fill="#4E9BDD" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>',
        '<path d="M68 66 q7 9 0 15 q-7 -6 0 -15 Z" fill="#4E9BDD" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>');
      break;
    case 'book': // 书：橙封+翻开双页
      S.push('<path d="M50 30 Q30 21 13 28 V73 Q30 65 50 74 Q70 65 87 73 V28 Q70 21 50 30 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="3.2" stroke-linejoin="round"/>',
        '<path d="M50 34 Q33 26 18 32 V68 Q33 62 50 69 Z" fill="#FFFDF6" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>',
        '<path d="M50 34 Q67 26 82 32 V68 Q67 62 50 69 Z" fill="#FFFDF6" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>',
        '<path d="M50 34 V69" stroke="' + INK + '" stroke-width="2.6"/>',
        '<path d="M25 41 q10 -3.5 18 0 M25 49 q10 -3.5 18 0 M57 41 q10 -3.5 18 0 M57 49 q10 -3.5 18 0" stroke="#C9BDA8" stroke-width="2.4" fill="none" stroke-linecap="round"/>');
      break;
    case 'ball': // 球：沙滩球三瓣+高光
      S.push('<path d="M50 20 A32 32 0 0 0 50 84 Q26 52 50 20 Z" fill="#4E9BDD"/>',
        '<path d="M50 20 Q26 52 50 84 Q74 52 50 20 Z" fill="#E8543F"/>',
        '<path d="M50 20 A32 32 0 0 1 50 84 Q74 52 50 20 Z" fill="#F7D24E"/>',
        '<circle cx="50" cy="52" r="32" fill="none" stroke="' + INK + '" stroke-width="3.2"/>',
        '<circle cx="38" cy="37" r="5.5" fill="#FFF" opacity=".85"/>');
      break;
    case 'car': // 汽车：红车身+双轮+车窗
      S.push('<path d="M14 65 Q12 51 27 49 L35 35 Q37 31 43 31 H64 Q70 31 74 37 L80 49 Q92 51 90 63 Q90 69 82 69 H20 Q14 69 14 65 Z" fill="#E8543F" stroke="' + INK + '" stroke-width="3.2" stroke-linejoin="round"/>',
        '<path d="M39 36 L34 47 H49 V36 Z" fill="#D8ECE8" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>',
        '<path d="M53 36 V47 H73 L66 37 Q64 36 61 36 Z" fill="#D8ECE8" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>',
        '<circle cx="33" cy="71" r="10.5" fill="#3A3633" stroke="' + INK + '" stroke-width="3"/><circle cx="33" cy="71" r="4" fill="#FFFDF6"/>',
        '<circle cx="71" cy="71" r="10.5" fill="#3A3633" stroke="' + INK + '" stroke-width="3"/><circle cx="71" cy="71" r="4" fill="#FFFDF6"/>',
        '<circle cx="84" cy="57" r="3" fill="#F7D24E" stroke="' + INK + '" stroke-width="2"/>');
      break;
    case 'tree': // 树：绿冠团+棕干
      S.push('<path d="M22 54 Q17 35 34 31 Q36 16 52 16 Q68 16 70 31 Q85 35 79 54 Q65 64 50 62 Q35 64 22 54 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="3.2" stroke-linejoin="round"/>',
        '<rect x="45" y="60" width="10" height="22" rx="3" fill="#8A6B4F" stroke="' + INK + '" stroke-width="2.8"/>',
        '<path d="M30 86 h40" stroke="#C9BDA8" stroke-width="3.4" stroke-linecap="round"/>',
        '<circle cx="38" cy="38" r="3" fill="#6FA063"/><circle cx="60" cy="46" r="3" fill="#6FA063"/>',
        '<circle cx="52" cy="27" r="3" fill="#6FA063"/>');
      break;
    case 'hand': // 手：四指+掌+侧拇指
      S.push('<rect x="32" y="27" width="11" height="27" rx="5.5" fill="#F5C9A5" stroke="' + INK + '" stroke-width="2.8"/>',
        '<rect x="44" y="19" width="11" height="35" rx="5.5" fill="#F5C9A5" stroke="' + INK + '" stroke-width="2.8"/>',
        '<rect x="56" y="22" width="11" height="32" rx="5.5" fill="#F5C9A5" stroke="' + INK + '" stroke-width="2.8"/>',
        '<rect x="68" y="30" width="11" height="24" rx="5.5" fill="#F5C9A5" stroke="' + INK + '" stroke-width="2.8"/>',
        '<path d="M30 47 Q27 44 30 38" stroke="' + INK + '" stroke-width="2.8" fill="none"/>',
        '<rect x="28" y="48" width="53" height="34" rx="16" fill="#F5C9A5" stroke="' + INK + '" stroke-width="3"/>',
        '<ellipse cx="22" cy="62" rx="8.5" ry="14" fill="#F5C9A5" stroke="' + INK + '" stroke-width="3" transform="rotate(-38 22 62)"/>',
        '<path d="M42 58 q4 5 9 0" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>');
      break;
    case 'eye': // 眼睛：杏形+蓝虹膜+睫毛
      S.push('<path d="M8 50 Q50 13 92 50 Q50 87 8 50 Z" fill="#FFFDF6" stroke="' + INK + '" stroke-width="3.2" stroke-linejoin="round"/>',
        '<circle cx="50" cy="50" r="17" fill="#4E9BDD" stroke="' + INK + '" stroke-width="2.6"/>',
        '<circle cx="50" cy="50" r="8" fill="#3A3633"/><circle cx="45" cy="45" r="3.4" fill="#FFF"/>',
        '<path d="M20 33 l-7 -8 M36 21 l-4 -9 M64 21 l4 -9 M80 33 l7 -8" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>');
      break;
    case 'ear': // 耳朵：C 形耳廓+内耳曲线
      S.push('<path d="M31 14 Q71 8 74 42 Q77 74 58 84 Q42 91 36 73 Q32 59 44 55 Q58 50 56 37 Q54 25 35 27 Z" fill="#F5C9A5" stroke="' + INK + '" stroke-width="3.2" stroke-linejoin="round"/>',
        '<path d="M45 35 Q52 34 52 41 Q52 49 44 57" stroke="#C98A5A" stroke-width="3.5" fill="none" stroke-linecap="round"/>',
        '<path d="M47 68 q4 4 8 1" stroke="#C98A5A" stroke-width="3" fill="none" stroke-linecap="round"/>');
      break;
    case 'nose': // 鼻子：鼻梁+鼻头+双鼻孔
      S.push('<path d="M35 18 Q50 9 65 18 Q72 45 60 62 Q50 74 40 62 Q28 45 35 18 Z" fill="#F5C9A5" stroke="' + INK + '" stroke-width="3.2" stroke-linejoin="round"/>',
        '<ellipse cx="43" cy="57" rx="3.4" ry="4.4" fill="#B97A54" transform="rotate(-18 43 57)"/>',
        '<ellipse cx="57" cy="57" rx="3.4" ry="4.4" fill="#B97A54" transform="rotate(18 57 57)"/>',
        '<path d="M46 24 q4 -3 8 0" stroke="#E8B58C" stroke-width="3" fill="none" stroke-linecap="round"/>');
      break;
    /* ---------- r32 新 24 词（风格同上：暖棕描线/主色贴实物/特征鲜明/不泄拼写） ---------- */
    case 'sheep': // 绵羊：白云蓬身+灰脸+垂耳
      S.push('<circle cx="26" cy="52" r="13" fill="#FFFDF6" stroke="' + INK + '" stroke-width="2.8"/>',
        '<circle cx="40" cy="42" r="15" fill="#FFFDF6" stroke="' + INK + '" stroke-width="2.8"/>',
        '<circle cx="58" cy="40" r="15" fill="#FFFDF6" stroke="' + INK + '" stroke-width="2.8"/>',
        '<circle cx="72" cy="50" r="13" fill="#FFFDF6" stroke="' + INK + '" stroke-width="2.8"/>',
        '<circle cx="64" cy="62" r="12" fill="#FFFDF6" stroke="' + INK + '" stroke-width="2.8"/>',
        '<circle cx="44" cy="63" r="12" fill="#FFFDF6" stroke="' + INK + '" stroke-width="2.8"/>',
        '<path d="M34 68 v10 M30 78 h8 M54 68 v10 M50 78 h8 M64 66 v12 M60 78 h8" stroke="' + INK + '" stroke-width="2.8" stroke-linecap="round"/>',
        '<ellipse cx="24" cy="36" rx="7" ry="11" fill="#8A7B6C" stroke="' + INK + '" stroke-width="2.6" transform="rotate(18 24 36)"/>',
        '<ellipse cx="40" cy="35" rx="12" ry="14" fill="#B8AFA2" stroke="' + INK + '" stroke-width="3"/>',
        '<circle cx="36" cy="32" r="2.8" fill="' + INK + '"/><circle cx="44" cy="32" r="2.8" fill="' + INK + '"/>',
        '<path d="M37 41 q3 3 6 0" stroke="' + INK + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>');
      break;
    case 'duck': // 鸭子：黄身+橙扁嘴+小翅
      S.push('<ellipse cx="46" cy="66" rx="32" ry="20" fill="#F7D24E" stroke="' + INK + '" stroke-width="3.2"/>',
        '<circle cx="68" cy="42" r="15" fill="#F7D24E" stroke="' + INK + '" stroke-width="3.2"/>',
        '<path d="M82 42 L96 45 L82 50 Z" fill="#F5822B" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>',
        '<circle cx="70" cy="38" r="3.8" fill="' + INK + '"/>',
        '<path d="M30 60 q-10 6 -2 14 q10 4 16 -4" fill="#E2B420" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>',
        '<path d="M36 79 v9 M52 79 v9" stroke="#E2B420" stroke-width="3.4" stroke-linecap="round"/>',
        '<path d="M30 88 h12 M46 88 h12" stroke="#E2B420" stroke-width="3.4" stroke-linecap="round"/>');
      break;
    case 'mouse': // 老鼠：灰圆身+两大圆耳+细尾+粉鼻
      S.push('<path d="M14 62 Q4 58 8 50 Q2 48 6 42" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>',
        '<circle cx="24" cy="30" r="12" fill="#C9BDA8" stroke="' + INK + '" stroke-width="3"/>',
        '<circle cx="24" cy="30" r="5.5" fill="#F2B8C6" stroke="' + INK + '" stroke-width="2"/>',
        '<circle cx="46" cy="28" r="12" fill="#C9BDA8" stroke="' + INK + '" stroke-width="3"/>',
        '<circle cx="46" cy="28" r="5.5" fill="#F2B8C6" stroke="' + INK + '" stroke-width="2"/>',
        '<ellipse cx="48" cy="58" rx="30" ry="24" fill="#C9BDA8" stroke="' + INK + '" stroke-width="3.2"/>',
        '<circle cx="38" cy="52" r="3.2" fill="' + INK + '"/><circle cx="58" cy="52" r="3.2" fill="' + INK + '"/>',
        '<circle cx="48" cy="62" r="3.8" fill="#E8888A" stroke="' + INK + '" stroke-width="2"/>',
        '<path d="M42 68 q6 5 12 0" stroke="' + INK + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>');
      break;
    case 'horse': // 马：棕头+鬃毛+浅吻部
      S.push('<path d="M34 16 Q40 8 48 14 Q56 6 60 18 Q66 12 66 24 Q60 34 58 40 L38 40 Q34 28 34 16 Z" fill="#6B4F3A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>',
        '<ellipse cx="48" cy="56" rx="22" ry="22" fill="#C89B6F" stroke="' + INK + '" stroke-width="3.2"/>',
        '<ellipse cx="48" cy="68" rx="13" ry="10" fill="#FBF3E4" stroke="' + INK + '" stroke-width="2.8"/>',
        '<ellipse cx="48" cy="60" rx="5" ry="4" fill="' + INK + '"/>',
        '<circle cx="38" cy="48" r="3.4" fill="' + INK + '"/><circle cx="58" cy="48" r="3.4" fill="' + INK + '"/>',
        '<path d="M30 30 Q20 44 30 56" fill="none" stroke="' + INK + '" stroke-width="2.8" stroke-linecap="round"/>',
        '<path d="M48 72 v4 M48 76 q-3 5 -8 3 M48 76 q3 5 8 3" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>');
      break;
    case 'pear': // 梨：绿黄梨形+柄+小叶
      S.push('<path d="M50 30 q-2 -8 3 -13" stroke="#8A6B4F" stroke-width="3.5" fill="none" stroke-linecap="round"/>',
        '<path d="M54 20 q10 -8 18 0 q-8 9 -18 0 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>',
        '<path d="M50 30 Q38 36 34 50 Q28 72 40 82 Q50 90 60 82 Q72 72 66 50 Q62 36 50 30 Z" fill="#B5D48A" stroke="' + INK + '" stroke-width="3.2" stroke-linejoin="round"/>',
        '<path d="M46 44 Q40 60 44 74" stroke="#8FBF7F" stroke-width="2.6" fill="none" stroke-linecap="round"/>');
      break;
    case 'peach': // 桃：粉桃+中沟+双叶
      S.push('<path d="M50 32 v-10" stroke="#8A6B4F" stroke-width="3.5" stroke-linecap="round"/>',
        '<path d="M50 22 q-8 -12 -20 -8 q6 12 20 8 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>',
        '<path d="M52 22 q8 -12 20 -8 q-6 12 -20 8 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>',
        '<circle cx="50" cy="60" r="27" fill="#F2A0B4" stroke="' + INK + '" stroke-width="3.2"/>',
        '<path d="M50 35 Q42 55 48 85" stroke="#E2849C" stroke-width="3" fill="none" stroke-linecap="round"/>');
      break;
    case 'lemon': // 柠檬：黄椭圆两端凸+高光
      S.push('<ellipse cx="12" cy="52" rx="8" ry="6" fill="#F7D24E" stroke="' + INK + '" stroke-width="2.8"/>',
        '<ellipse cx="88" cy="52" rx="8" ry="6" fill="#F7D24E" stroke="' + INK + '" stroke-width="2.8"/>',
        '<ellipse cx="50" cy="52" rx="34" ry="24" fill="#F7DE6E" stroke="' + INK + '" stroke-width="3.2"/>',
        '<path d="M36 42 q-5 8 -2 16" stroke="#FBF3E4" stroke-width="3.4" fill="none" stroke-linecap="round" opacity=".8"/>',
        '<circle cx="44" cy="48" r="1.6" fill="#DCB93A"/><circle cx="56" cy="58" r="1.6" fill="#DCB93A"/><circle cx="62" cy="44" r="1.6" fill="#DCB93A"/>');
      break;
    case 'melon': // 西瓜：绿圆+深绿条纹
      S.push('<circle cx="50" cy="54" r="32" fill="#9CCB74" stroke="' + INK + '" stroke-width="3.2"/>',
        '<path d="M50 22 Q42 54 50 86" stroke="#5E9440" stroke-width="4.5" fill="none" stroke-linecap="round"/>',
        '<path d="M30 26 Q24 54 30 82" stroke="#5E9440" stroke-width="4" fill="none" stroke-linecap="round"/>',
        '<path d="M70 26 Q76 54 70 82" stroke="#5E9440" stroke-width="4" fill="none" stroke-linecap="round"/>',
        '<path d="M56 20 v-7" stroke="#8A6B4F" stroke-width="3.4" stroke-linecap="round"/>',
        '<path d="M58 14 q9 -10 19 -4 q-7 10 -19 4 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>');
      break;
    case 'rice': // 米饭：蓝碗+三团白饭
      S.push('<circle cx="36" cy="42" r="10" fill="#FFFDF6" stroke="' + INK + '" stroke-width="2.8"/>',
        '<circle cx="52" cy="38" r="11" fill="#FFFDF6" stroke="' + INK + '" stroke-width="2.8"/>',
        '<circle cx="66" cy="44" r="9.5" fill="#FFFDF6" stroke="' + INK + '" stroke-width="2.8"/>',
        '<path d="M18 56 Q50 74 82 56 L78 70 Q50 86 22 70 Z" fill="#4E9BDD" stroke="' + INK + '" stroke-width="3.2" stroke-linejoin="round"/>',
        '<path d="M18 56 h64" stroke="' + INK + '" stroke-width="2.6"/>',
        '<ellipse cx="50" cy="66" rx="5" ry="3.5" fill="#DCEAF4" stroke="' + INK + '" stroke-width="2"/>');
      break;
    case 'bread': // 面包：吐司片+浅芯+热气
      S.push('<path d="M22 44 Q12 44 14 56 Q15 66 24 64 L24 76 Q24 84 34 84 H66 Q76 84 76 76 L76 64 Q85 66 86 56 Q88 44 78 44 Q74 30 50 30 Q26 30 22 44 Z" fill="#D9A05B" stroke="' + INK + '" stroke-width="3.2" stroke-linejoin="round"/>',
        '<path d="M30 52 Q28 40 50 40 Q72 40 70 52 Q74 56 72 62 L28 62 Q26 56 30 52 Z" fill="#FBEBD3" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>',
        '<circle cx="42" cy="52" r="2" fill="#D9A05B"/><circle cx="56" cy="50" r="2" fill="#D9A05B"/><circle cx="50" cy="57" r="2" fill="#D9A05B"/>',
        '<path d="M36 18 q3 -5 0 -8 M50 16 q3 -5 0 -8 M64 18 q3 -5 0 -8" stroke="#C9BDA8" stroke-width="2.6" fill="none" stroke-linecap="round"/>');
      break;
    case 'soup': // 汤：碗+热气三缕
      S.push('<path d="M14 54 H86 Q84 78 62 82 L62 88 H38 L38 82 Q16 78 14 54 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="3.2" stroke-linejoin="round"/>',
        '<path d="M14 54 h72" stroke="' + INK + '" stroke-width="2.8"/>',
        '<ellipse cx="50" cy="54" rx="36" ry="6" fill="#F7D9A8" stroke="' + INK + '" stroke-width="2.4"/>',
        '<path d="M34 42 q-6 -8 0 -16 M50 40 q-6 -8 0 -16 M66 42 q-6 -8 0 -16" stroke="#B8C7D8" stroke-width="3.2" fill="none" stroke-linecap="round"/>',
        '<ellipse cx="40" cy="54" rx="3" ry="1.8" fill="#E8975A"/><ellipse cx="58" cy="55" rx="3.4" ry="2" fill="#E8975A"/>');
      break;
    case 'cloud': // 云：三团圆+底平
      S.push('<circle cx="30" cy="52" r="16" fill="#FFF" stroke="' + INK + '" stroke-width="3.2"/>',
        '<circle cx="52" cy="42" r="19" fill="#FFF" stroke="' + INK + '" stroke-width="3.2"/>',
        '<circle cx="72" cy="54" r="14" fill="#FFF" stroke="' + INK + '" stroke-width="3.2"/>',
        '<path d="M14 58 H88" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>',
        '<circle cx="44" cy="44" r="2.4" fill="' + INK + '"/><circle cx="58" cy="44" r="2.4" fill="' + INK + '"/>',
        '<path d="M45 52 q5 5 10 0" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>');
      break;
    case 'snow': // 雪花：六枝+端点叉
      S.push('<path d="M50 12 V88 M18 31 L82 69 M82 31 L18 69" stroke="#7FB3D5" stroke-width="5" stroke-linecap="round"/>',
        '<path d="M50 12 L42 20 M50 12 L58 20 M50 88 L42 80 M50 88 L58 80 M18 31 L30 31 M18 31 L22 43 M82 69 L70 69 M82 69 L78 57 M82 31 L74 39 M82 31 L74 23 M18 69 L26 61 M18 69 L26 77" stroke="#7FB3D5" stroke-width="3.6" fill="none" stroke-linecap="round"/>',
        '<circle cx="50" cy="50" r="5.5" fill="#B8DCEE" stroke="' + INK + '" stroke-width="2.4"/>');
      break;
    case 'leaf': // 叶子：绿叶+主侧脉+短柄
      S.push('<path d="M20 78 Q30 62 46 50" stroke="#8A6B4F" stroke-width="3.4" fill="none" stroke-linecap="round"/>',
        '<path d="M18 78 Q14 44 40 28 Q66 14 82 20 Q82 48 60 66 Q38 84 18 78 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="3.2" stroke-linejoin="round"/>',
        '<path d="M22 74 Q44 52 76 24" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>',
        '<path d="M38 58 L44 42 M52 46 L60 32 M64 34 L68 26" stroke="#6FA063" stroke-width="2.2" fill="none" stroke-linecap="round"/>');
      break;
    case 'wind': // 风：三条飘带线+小叶
      S.push('<path d="M10 34 H54 Q64 34 64 26" stroke="#8FC3DE" stroke-width="4.5" fill="none" stroke-linecap="round"/>',
        '<path d="M10 52 H68 Q78 52 78 42" stroke="#8FC3DE" stroke-width="4.5" fill="none" stroke-linecap="round"/>',
        '<path d="M10 70 H48 Q58 70 58 62" stroke="#8FC3DE" stroke-width="4.5" fill="none" stroke-linecap="round"/>',
        '<path d="M70 66 Q76 54 90 54 Q86 68 72 68 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>',
        '<path d="M74 66 Q82 60 88 56" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linecap="round"/>');
      break;
    case 'boat': // 小船：船体+桅杆+双帆+水线
      S.push('<path d="M50 12 V64" stroke="#8A6B4F" stroke-width="3.6" stroke-linecap="round"/>',
        '<path d="M52 16 L84 56 L52 56 Z" fill="#FFF" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>',
        '<path d="M48 22 L20 54 L48 54 Z" fill="#F5A75B" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>',
        '<path d="M8 58 L12 70 Q50 82 88 70 L92 58 Q50 70 8 58 Z" fill="#C89B6F" stroke="' + INK + '" stroke-width="3.2" stroke-linejoin="round"/>',
        '<path d="M16 84 q6 4 12 0 M60 86 q6 4 12 0" stroke="#8FC3DE" stroke-width="3" fill="none" stroke-linecap="round"/>');
      break;
    case 'train': // 火车：车头+烟囱+双轮+车厢钩
      S.push('<rect x="22" y="38" width="46" height="30" rx="6" fill="#E8543F" stroke="' + INK + '" stroke-width="3.2"/>',
        '<rect x="30" y="20" width="12" height="18" rx="2" fill="#3A3633" stroke="' + INK + '" stroke-width="2.8"/>',
        '<rect x="34" y="44" width="20" height="14" rx="3" fill="#D8ECE8" stroke="' + INK + '" stroke-width="2.4"/>',
        '<circle cx="34" cy="74" r="9" fill="#3A3633" stroke="' + INK + '" stroke-width="2.8"/><circle cx="34" cy="74" r="3.4" fill="#FFFDF6"/>',
        '<circle cx="58" cy="74" r="9" fill="#3A3633" stroke="' + INK + '" stroke-width="2.8"/><circle cx="58" cy="74" r="3.4" fill="#FFFDF6"/>',
        '<path d="M68 54 H84 M80 48 L88 54 L80 60" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
        '<circle cx="36" cy="12" r="5" fill="none" stroke="#B8C7D8" stroke-width="2.4"/><circle cx="30" cy="5" r="3.4" fill="none" stroke="#B8C7D8" stroke-width="2.2"/>');
      break;
    case 'house': // 房子：红顶+墙+门+窗
      S.push('<path d="M12 46 L50 16 L88 46 Z" fill="#E8543F" stroke="' + INK + '" stroke-width="3.2" stroke-linejoin="round"/>',
        '<rect x="20" y="46" width="60" height="38" rx="3" fill="#FFFDF6" stroke="' + INK + '" stroke-width="3.2"/>',
        '<rect x="42" y="60" width="16" height="24" rx="2" fill="#8A6B4F" stroke="' + INK + '" stroke-width="2.8"/>',
        '<circle cx="54" cy="72" r="1.8" fill="#F7D24E"/>',
        '<rect x="26" y="52" width="12" height="12" rx="2" fill="#D8ECE8" stroke="' + INK + '" stroke-width="2.4"/>',
        '<rect x="62" y="52" width="12" height="12" rx="2" fill="#D8ECE8" stroke="' + INK + '" stroke-width="2.4"/>',
        '<path d="M50 16 v-8" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>');
      break;
    case 'plant': // 植物：花盆+茎+双叶+顶芽
      S.push('<path d="M50 52 V20" stroke="#6FA063" stroke-width="3.6" stroke-linecap="round"/>',
        '<path d="M50 20 q-2 -8 6 -10 q2 8 -6 10 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>',
        '<path d="M50 44 Q34 42 28 30 Q44 28 50 40 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>',
        '<path d="M50 50 Q66 48 72 36 Q56 34 50 46 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>',
        '<path d="M32 56 H68 L63 84 Q50 90 37 84 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="3.2" stroke-linejoin="round"/>',
        '<path d="M32 56 h36" stroke="' + INK + '" stroke-width="2.6"/>');
      break;
    case 'brush': // 刷子：斜柄+金属箍+扇形毛
      S.push('<rect x="52" y="10" width="14" height="42" rx="5" fill="#F5A75B" stroke="' + INK + '" stroke-width="3" transform="rotate(14 59 31)"/>',
        '<path d="M40 46 L72 54 L68 64 L36 56 Z" fill="#B8C7D8" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>',
        '<path d="M38 56 L32 86 M46 58 L44 88 M54 60 L56 88 M62 62 L68 86" stroke="#E8975A" stroke-width="4" stroke-linecap="round"/>',
        '<path d="M32 86 Q50 94 68 86" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>');
      break;
    case 'face': // 脸：圆脸+眼两点+微笑+腮红
      S.push('<circle cx="50" cy="52" r="34" fill="#F7D9A8" stroke="' + INK + '" stroke-width="3.2"/>',
        '<path d="M28 34 Q30 18 46 22 M54 22 Q70 18 72 34" stroke="#8A6B4F" stroke-width="3.2" fill="none" stroke-linecap="round"/>',
        '<circle cx="38" cy="48" r="3.6" fill="' + INK + '"/><circle cx="62" cy="48" r="3.6" fill="' + INK + '"/>',
        '<path d="M40 62 q10 9 20 0" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>',
        '<ellipse cx="28" cy="58" rx="5" ry="3.5" fill="#F2B8C6" opacity=".8"/><ellipse cx="72" cy="58" rx="5" ry="3.5" fill="#F2B8C6" opacity=".8"/>');
      break;
    case 'hair': // 头发：侧头影+顶部发浪三条
      S.push('<path d="M22 84 Q12 60 22 40 Q30 20 52 18 Q74 16 82 34 Q90 50 84 66 Q80 76 72 80 L70 84 Z" fill="#F5C9A5" stroke="' + INK + '" stroke-width="3.2" stroke-linejoin="round"/>',
        '<path d="M24 42 Q30 24 50 20 Q40 30 44 38 Q52 24 66 24 Q56 32 58 40 Q68 28 80 32 Q70 38 70 46" fill="#6B4F3A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>',
        '<circle cx="42" cy="58" r="3.2" fill="' + INK + '"/>',
        '<path d="M36 70 q6 5 12 0" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>',
        '<path d="M70 84 v-4" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>');
      break;
    case 'foot': // 脚：脚印（脚掌+五趾）
      S.push('<ellipse cx="30" cy="26" r="6" fill="#F5C9A5" stroke="' + INK + '" stroke-width="2.6"/>',
        '<ellipse cx="20" cy="38" rx="5.5" ry="6.5" fill="#F5C9A5" stroke="' + INK + '" stroke-width="2.6"/>',
        '<ellipse cx="18" cy="52" rx="5.5" ry="7" fill="#F5C9A5" stroke="' + INK + '" stroke-width="2.6"/>',
        '<ellipse cx="22" cy="66" rx="6" ry="7" fill="#F5C9A5" stroke="' + INK + '" stroke-width="2.6"/>',
        '<path d="M30 34 Q22 56 28 72 Q34 88 52 88 Q70 88 76 76 Q80 64 68 58 Q54 50 46 38 Q40 30 30 34 Z" fill="#F5C9A5" stroke="' + INK + '" stroke-width="3.2" stroke-linejoin="round"/>',
        '<path d="M44 72 q8 6 16 2" stroke="#E8B58C" stroke-width="2.6" fill="none" stroke-linecap="round"/>');
      break;
    case 'tooth': // 牙齿：白齿冠+双根+亮星
      S.push('<path d="M26 22 Q50 8 74 22 Q80 26 78 40 Q76 56 70 62 Q64 68 62 84 Q61 92 56 92 Q51 92 51 82 L50 66 L49 82 Q49 92 44 92 Q39 92 38 84 Q36 68 30 62 Q24 56 22 40 Q20 26 26 22 Z" fill="#FFFDF6" stroke="' + INK + '" stroke-width="3.2" stroke-linejoin="round"/>',
        '<path d="M32 30 q4 -3 7 0" stroke="#DCEAF4" stroke-width="3" fill="none" stroke-linecap="round"/>',
        '<path d="M72 30 l2.4 5.6 5.6 2.4 -5.6 2.4 -2.4 5.6 -2.4 -5.6 -5.6 -2.4 5.6 -2.4 Z" fill="#F7D24E" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>');
      break;
  }
  return open + S.join('') + '</svg>';
}

/* ---------- 章配置（hint=预告"下一章"文案，GEN 文案不带"明天："前缀，core 模板自带）
   r32 谱变更显式声明（SPEC §R2）：CHAPTERS[2].hint+GEN_HINTS[2] 因 ch3 混入 blank 产出题改文案；
   其余 hint 对新谱仍贴切零改动 */
const CHAPTERS = {
  1: { name: '图配词', hint: '接下来听英语发音，选出你听到的单词' },
  2: { name: '听音选图', hint: '接下来有长得很像的单词，还要补上缺少的字母' },
  3: { name: '像词分清', hint: '接下来自己读单词啦，请爸爸妈妈陪宝宝一起读' },   /* ch4 认读零起点陪读提示（6 岁试玩 P1④） */
  4: { name: '读词选图', hint: '新一轮英语单词大挑战' }
};
const GEN_HINTS = ['看图认单词的新一轮', '听音选图的新一轮', '很像的单词要分清，还要补字母', '读单词选图片的新一轮'];
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案（key+text 与 voice/clips/manifest.json 严格一致，禁自造；
   wrong 无 clip→动态文案 TTS 兜底（§0.13）；wen_w_<word> en 童声见词库表（r32 扩 48 条中
   新 24 条走 TODO 清单 SPEC §R10 注册前静默）；q3=blank 题面指令（r32 新键，TODO 注册前静默） ---------- */
const VOICE = {
  watch: { key: 'wen_tut_watch', text: '看！小动物们有英语名字' },
  turn:  { key: 'wen_tut_turn',  text: '你来点一点' },
  hint:  { key: 'wen_hint',      text: '听一听，再想一想' },
  q1:    { key: 'wen_q1', text: '找一找，它的英语是哪一个' },   /* pic2word */
  q2:    { key: 'wen_q2', text: '听一听，点出你听到的单词' },   /* sound2pic */
  q3:    { key: 'wen_q3', text: '看图，补上缺少的字母吧' },     /* blank 缺字母补全（r32 新键=TODO） */
  q4:    { key: 'wen_q4', text: '读一读，点出它的图片' },       /* word2pic */
  wrong: { key: 'wen_wrong', text: '' }                          /* 动态纠错，见 wrongText */
};
/* 模式→题面指令 clip（题面指令全语音承载 §0.19；sound2pic 另播 en 单词 clip 见 qSpeech） */
const MODE_Q = { pic2word: 'q1', sound2pic: 'q2', word2pic: 'q4', blank: 'q3' };
const MODE_NAME = { pic2word: '图配词', sound2pic: '听音选图', word2pic: '读词选图', blank: '补字母' };
const wrongText = q => q.mode === 'sound2pic' ? '不对哦，再听一听' :
  (q.mode === 'word2pic' ? '不对哦，再读一读' :
  (q.mode === 'blank' ? '不对哦，看看缺哪个字母' : '不对哦，再找一找它的英语'));

/* ---------- 图标（内嵌 SVG，暖棕描线） ---------- */
const ICONS = {
  logo: '<svg viewBox="0 0 44 44" width="32" height="32" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="5" y="8" width="34" height="28" rx="7" fill="#FFF9EE" stroke="#4A3B2E" stroke-width="2.6"/>' +
    '<path d="M22 14 v16 M15 21 h14" stroke="#E8975A" stroke-width="4" stroke-linecap="round"/>' +
    '<circle cx="33" cy="15" r="4" fill="#F5C445" stroke="#4A3B2E" stroke-width="2"/>' +
    '</svg>',
  hear: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M11 25 h10 l13 -11 v36 l-13 -11 h-10 Z" fill="#E8975A" stroke="#4A3B2E" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M43 23 q6 9 0 18 M50 16 q11 16 0 32" stroke="#4A3B2E" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  sndBig: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M16 40 h14 l18 -15 v50 l-18 -15 h-14 Z" fill="#E8975A" stroke="#4A3B2E" stroke-width="4" stroke-linejoin="round"/>' +
    '<path class="wave" d="M60 38 q8 12 0 24" stroke="#4A3B2E" stroke-width="5" stroke-linecap="round"/>' +
    '<path class="wave" d="M72 30 q14 20 0 40" stroke="#4A3B2E" stroke-width="5" stroke-linecap="round"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>',
  check: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M13 34 L27 48 L51 18" stroke="#FFF" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};
