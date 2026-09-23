/* ================= memgrid 游戏数据（章规格 / 语音文案 / 图标 / HUD 文案）
   语音文案与 voice/clips/manifest.json 的 mg_* 四条严格一致（§0.18 零手抄，build 注入）：
   mg_tut_watch'看！亮起来的格子要记住哦'/mg_tut_turn'你来点一点'/
   mg_hint'想一想，刚才哪里亮过呀'/mg_q'记住亮起来的格子哦'（闪现前播）
   wrong 无 clip → 动态文案 TTS 兜底（§0.13） */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（DESIGN-SPEC §8）

/* ---------- 章规格（SPEC-BATCH9 §3）：N×N 网格 / k 个闪亮格 / 闪现时长 ms
   章 1 3×3 k=2 → 章 2 3×3 k=3 → 章 3 4×4 k=3 → 章 4 4×4 k=4（闪现 2.5s→2s 缩短） */
const SPECS = {
  1: { N: 3, k: 2, show: 2500 },
  2: { N: 3, k: 3, show: 2500 },
  3: { N: 4, k: 3, show: 2500 },
  4: { N: 4, k: 4, show: 2000 }
};
/* 生成关（flat≥20）档位：随机规格 + 该规格档内随机 k（§3"规格对应档位"） */
const TIERS = { 3: [2, 3], 4: [3, 4] };
const GEN_SHOW = 2000;                        // 生成关闪现取最难档 2s

/* ---------- 章配置（hint=预告"下一章"文案；GEN 文案不带"明天："前缀，core 模板自带） ---------- */
const CHAPTERS = {
  1: { name: '两个亮格子', hint: '接下来会亮起三个格子，更多啦' },
  2: { name: '三个亮格子', hint: '接下来是四乘四的大格子阵' },
  3: { name: '大格子阵',   hint: '接下来要记住四个亮格子，看仔细哦' },
  4: { name: '四个亮格子', hint: '新一轮记忆矩阵大挑战' }
};
const GEN_HINTS = ['更大的记忆矩阵挑战', '亮格子更多的新一轮', '超强记性大考验', '记忆矩阵的新一轮'];
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- HUD 两态文案（§3 两态机制：show=记住 / input=复点） ---------- */
const TIP_SHOW = '记住亮起来的格子';
const TIP_INPUT = '点出刚才亮过的';

/* ---------- 语音文案（key+text 与 manifest 严格一致，禁自造） ---------- */
const VOICE = {
  watch: { key: 'mg_tut_watch', text: '看！亮起来的格子要记住哦' },
  turn:  { key: 'mg_tut_turn',  text: '你来点一点' },
  hint:  { key: 'mg_hint',      text: '想一想，刚才哪里亮过呀' },
  q:     { key: 'mg_q',         text: '记住亮起来的格子哦' },   /* 闪现前播 */
  wrong: { key: 'mg_wrong',     text: '' }                      /* 动态纠错，见 wrongText（无 clip 走 TTS 兜底） */
};
const wrongText = () => '不对哦，想一想刚才哪里亮过';

/* ---------- 图标（内嵌 SVG，暖棕描线） ---------- */
const ICONS = {
  logo: '<svg viewBox="0 0 44 44" width="30" height="30" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="5" y="5" width="34" height="34" rx="7" fill="#FFF9EE" stroke="#4A3B2E" stroke-width="2.6"/>' +
    '<rect x="10" y="10" width="10" height="10" rx="2.6" fill="#F7D24E" stroke="#4A3B2E" stroke-width="2.2"/>' +
    '<rect x="24" y="24" width="10" height="10" rx="2.6" fill="#F7D24E" stroke="#4A3B2E" stroke-width="2.2"/>' +
    '</svg>',
  hear: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M11 25 h10 l13 -11 v36 l-13 -11 h-10 Z" fill="#E8975A" stroke="#4A3B2E" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M43 23 q6 9 0 18 M50 16 q11 16 0 32" stroke="#4A3B2E" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>',
  check: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M13 34 L27 48 L51 18" stroke="#6FA063" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};
