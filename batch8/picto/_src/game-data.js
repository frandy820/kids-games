/* ================= picto 象形字 游戏数据（封闭字库 40 字 / 形近族表 / 章配置 / 语音文案 / 图标 / 甲骨文 SVG / 字源演变 SVG）
   r12 难度改造（2026-09-15，AUDIT-67 #8 红款：20 字图字配对=中班识字卡活动低 ≥2 岁、ch1 两选 1 蒙对 50%、
   纯视觉辨别无「想」）——delta 三条（AUDIT-67:62 定稿）：
   ① 字库 20→40 含形近系：原 20 字键序/SVG/组词文案零改动，追加 20 字（乌未末本白天大太刀力三川王玉小少手毛甲由）；
     NEAR 直邻对 5→19（新 14：鸟/乌、未/末、木/未、木/本、日/白、大/天、大/太、刀/力、三/川、王/玉、小/少、手/毛、田/甲、田/由）。
   ② ch2 起干扰恒形近（同形近族 sameFam=直邻或共伙伴，非随机字）：蒙对率 50%→25-33%，辨别维度从「任意字」升「形近字」；
     候选恒 3-4 选（ch1 入门保持 2→3 渐进、非同族干扰）。
   ③ 字源推演题（ch4+生成关）：演变序列 [古形 svg0 → 甲骨形 svg → ?] 推「这个图变成的字是哪个」——从匹配升到推演
     （题面只给两段图形+问号，不给答案字形；干扰=同形近族字——演变链辅助作答：
       第二段=标准字形，末段匹配亦可解，r12 审查 m6 措辞对齐）。
   字库定稿原则（承 SPEC-BATCH8 §2）：
   - 每字一段简笔甲骨文风内联 SVG（viewBox 0 0 100 100，笔画 stroke-width ≥6 暖棕 #5A4632，与楷体形近可溯源）；
     EVO 池 12 字另有 ev=更古形态 SVG（圆转/具象，与 svg 两段可辨——verify 断言 ev!==svg）。
   - clip key 全 ASCII：pic_ch_<k> 与 voice/clips 预合成产物严格对齐（拼音冲突加序号：mu=木/mu2=目、yu=鱼/yu2=雨/yu3=玉、
     he2=禾、tian=田/tian2=天）；组词文案 = '字，组词的字'（manifest 同源，零手抄） */
'use strict';

const INK = '#4A3B2E';      // 统一暖棕描边（DESIGN-SPEC §8）
const PIC_INK = '#5A4632';  // 象形图笔画（赭石深棕，古画感）
const PIC_PAPER = '#EFE0BC'; // 纸色填色
const PIC_GOLD = '#F2D8A8';  // 淡金填色（日月）
const PIC_OCHRE = '#D9B98A'; // 赭石填色（山）
const PIC_FIRE = '#E8975A';  // 火焰暖橙（唯一强点缀）
const PIC_RAIN = '#9FB9C8';  // 雨点青灰（适度填色）

/* ---------- 象形字库（k=clip 后缀 / ch=汉字 / wd=组词词根；svg=甲骨文风简笔图；ev=字源演变古形（仅 EVO 池））
   前 20 = b8 定稿序（零改动）；后 20 = r12 追加 ---------- */
const PICTO = [
  { k: 'ri',    ch: '日', wd: '太阳',
    ev: '<circle cx="50" cy="50" r="33" fill="' + PIC_GOLD + '" stroke="' + PIC_INK + '" stroke-width="7"/>' +
        '<circle cx="50" cy="50" r="8" fill="' + PIC_INK + '"/>',
    svg: '<rect x="18" y="18" width="64" height="64" rx="18" fill="' + PIC_GOLD + '" stroke="' + PIC_INK + '" stroke-width="7.5"/>' +
         '<circle cx="50" cy="50" r="7.5" fill="' + PIC_INK + '"/>' },
  { k: 'yue',   ch: '月', wd: '月亮',
    svg: '<path d="M65 8 C34 14 14 32 14 50 C14 68 34 86 65 92 C44 80 36 66 36 50 C36 34 44 20 65 8 Z" fill="' + PIC_GOLD + '" stroke="' + PIC_INK + '" stroke-width="6.5" stroke-linejoin="round"/>' +
         '<path d="M44 38 v16" fill="none" stroke="' + PIC_INK + '" stroke-width="6" stroke-linecap="round"/>' },
  { k: 'shan',  ch: '山', wd: '大山',
    svg: '<path d="M6 84 L24 30 L38 62 L50 20 L62 62 L76 30 L94 84 Z" fill="' + PIC_OCHRE + '" stroke="' + PIC_INK + '" stroke-width="6.5" stroke-linejoin="round"/>' },
  { k: 'shui',  ch: '水', wd: '河水',
    svg: '<path d="M50 8 q12 14 0 28 q-12 14 0 28 q12 14 0 28" fill="none" stroke="' + PIC_INK + '" stroke-width="7" stroke-linecap="round"/>' +
         '<path d="M28 24 q-9 8 -6 19 M28 54 q-9 8 -6 19 M72 24 q9 8 6 19 M72 54 q9 8 6 19" fill="none" stroke="' + PIC_INK + '" stroke-width="6.5" stroke-linecap="round"/>' },
  { k: 'huo',   ch: '火', wd: '火焰',
    svg: '<path d="M50 8 Q64 26 60 44 Q57 62 50 88 Q43 62 40 44 Q36 26 50 8 Z" fill="' + PIC_FIRE + '" stroke="' + PIC_INK + '" stroke-width="6" stroke-linejoin="round"/>' +
         '<path d="M24 34 q-2 12 6 22 M76 34 q2 12 -6 22" fill="none" stroke="' + PIC_INK + '" stroke-width="6.5" stroke-linecap="round"/>' },
  { k: 'mu',    ch: '木', wd: '树木',
    ev: '<path d="M52 6 C46 34 56 64 50 94" fill="none" stroke="' + PIC_INK + '" stroke-width="7.5" stroke-linecap="round"/>' +
        '<path d="M50 34 Q32 24 24 8 M50 34 Q68 24 76 8 M50 60 Q32 72 24 90 M50 60 Q68 72 76 90" fill="none" stroke="' + PIC_INK + '" stroke-width="6.5" stroke-linecap="round"/>' +
        '<path d="M24 8 q-8 2 -10 10 M76 8 q8 2 10 10" fill="none" stroke="' + PIC_INK + '" stroke-width="6" stroke-linecap="round"/>',
    svg: '<path d="M50 8 V92" fill="none" stroke="' + PIC_INK + '" stroke-width="7.5" stroke-linecap="round"/>' +
         '<path d="M50 42 Q32 30 24 14 M50 42 Q68 30 76 14 M50 58 Q32 70 24 86 M50 58 Q68 70 76 86" fill="none" stroke="' + PIC_INK + '" stroke-width="6.5" stroke-linecap="round"/>' },
  { k: 'ren',   ch: '人', wd: '大人',
    svg: '<path d="M38 10 Q56 24 46 88" fill="none" stroke="' + PIC_INK + '" stroke-width="8" stroke-linecap="round"/>' +
         '<path d="M42 26 Q66 36 78 58" fill="none" stroke="' + PIC_INK + '" stroke-width="8" stroke-linecap="round"/>' },
  { k: 'kou',   ch: '口', wd: '开口',
    ev: '<path d="M14 40 Q50 72 86 40 Q50 88 14 40 Z" fill="' + PIC_PAPER + '" stroke="' + PIC_INK + '" stroke-width="7" stroke-linejoin="round"/>',
    svg: '<rect x="20" y="20" width="60" height="60" rx="10" fill="' + PIC_PAPER + '" stroke="' + PIC_INK + '" stroke-width="8"/>' },
  { k: 'tian',  ch: '田', wd: '水田',
    ev: '<rect x="14" y="14" width="72" height="72" rx="18" fill="' + PIC_PAPER + '" stroke="' + PIC_INK + '" stroke-width="7"/>' +
        '<path d="M50 14 Q44 50 50 86 M14 50 Q50 44 86 50" fill="none" stroke="' + PIC_INK + '" stroke-width="6.5" stroke-linecap="round"/>',
    svg: '<rect x="18" y="18" width="64" height="64" rx="8" fill="' + PIC_PAPER + '" stroke="' + PIC_INK + '" stroke-width="8"/>' +
         '<path d="M50 18 V82 M18 50 H82" fill="none" stroke="' + PIC_INK + '" stroke-width="6.5" stroke-linecap="round"/>' },
  { k: 'niao',  ch: '鸟', wd: '小鸟',
    ev: '<path d="M14 34 Q22 12 44 16 Q56 8 62 18 L74 24 L62 30 Q66 44 58 54 Q48 68 30 62 Q16 54 14 34 Z" fill="' + PIC_PAPER + '" stroke="' + PIC_INK + '" stroke-width="6.5" stroke-linejoin="round"/>' +
        '<circle cx="46" cy="26" r="4" fill="' + PIC_INK + '"/>' +
        '<path d="M40 66 V84 M56 66 V84" fill="none" stroke="' + PIC_INK + '" stroke-width="6" stroke-linecap="round"/>' +
        '<path d="M58 52 Q76 58 82 74" fill="none" stroke="' + PIC_INK + '" stroke-width="6" stroke-linecap="round"/>',
    svg: '<path d="M10 30 L26 24 Q40 10 50 26 Q76 20 82 42 Q84 58 64 62 Q40 66 28 50 Q18 40 10 30 Z" fill="' + PIC_PAPER + '" stroke="' + PIC_INK + '" stroke-width="6" stroke-linejoin="round"/>' +
         '<circle cx="34" cy="28" r="4.5" fill="' + PIC_INK + '"/>' +
         '<path d="M40 14 q-2 -6 -8 -8" fill="none" stroke="' + PIC_INK + '" stroke-width="6" stroke-linecap="round"/>' +
         '<path d="M78 52 Q92 66 88 86" fill="none" stroke="' + PIC_INK + '" stroke-width="6.5" stroke-linecap="round"/>' +
         '<path d="M42 64 V82 M56 64 V82" fill="none" stroke="' + PIC_INK + '" stroke-width="6" stroke-linecap="round"/>' },
  { k: 'ma',    ch: '马', wd: '小马',
    ev: '<ellipse cx="55" cy="52" rx="26" ry="16" fill="' + PIC_PAPER + '" stroke="' + PIC_INK + '" stroke-width="6.5"/>' +
        '<path d="M36 46 Q28 30 34 16 L46 20 Q46 34 44 44" fill="' + PIC_PAPER + '" stroke="' + PIC_INK + '" stroke-width="6.5" stroke-linejoin="round"/>' +
        '<circle cx="38" cy="18" r="3" fill="' + PIC_INK + '"/>' +
        '<path d="M34 20 Q26 30 28 40" fill="none" stroke="' + PIC_INK + '" stroke-width="6" stroke-linecap="round"/>' +
        '<path d="M42 66 V88 M54 68 V90 M66 66 V88" fill="none" stroke="' + PIC_INK + '" stroke-width="6.5" stroke-linecap="round"/>' +
        '<path d="M80 50 Q94 40 90 26" fill="none" stroke="' + PIC_INK + '" stroke-width="6" stroke-linecap="round"/>',
    svg: '<path d="M30 14 Q44 6 50 16 Q52 28 49 38 L44 50 L38 48 Q34 34 30 14 Z" fill="' + PIC_PAPER + '" stroke="' + PIC_INK + '" stroke-width="6.5" stroke-linejoin="round"/>' +
         '<path d="M33 12 L30 6" fill="none" stroke="' + PIC_INK + '" stroke-width="6" stroke-linecap="round"/>' +
         '<circle cx="41" cy="16" r="3.5" fill="' + PIC_INK + '"/>' +
         '<path d="M31 16 Q24 26 26 38 M35 24 Q30 32 31 42" fill="none" stroke="' + PIC_INK + '" stroke-width="6" stroke-linecap="round"/>' +
         '<ellipse cx="58" cy="54" rx="24" ry="15" fill="' + PIC_PAPER + '" stroke="' + PIC_INK + '" stroke-width="6.5"/>' +
         '<path d="M42 66 V90 M54 68 V92 M66 66 V90 M76 62 V86" fill="none" stroke="' + PIC_INK + '" stroke-width="6.5" stroke-linecap="round"/>' +
         '<path d="M80 46 Q94 56 90 74" fill="none" stroke="' + PIC_INK + '" stroke-width="6" stroke-linecap="round"/>' },
  { k: 'yu',    ch: '鱼', wd: '小鱼',
    svg: '<path d="M10 50 Q26 32 50 32 Q72 34 78 50 Q72 66 50 68 Q26 68 10 50 Z" fill="' + PIC_PAPER + '" stroke="' + PIC_INK + '" stroke-width="6.5" stroke-linejoin="round"/>' +
         '<path d="M78 50 L96 34 Q92 50 96 66 Z" fill="' + PIC_PAPER + '" stroke="' + PIC_INK + '" stroke-width="6" stroke-linejoin="round"/>' +
         '<circle cx="24" cy="46" r="4.5" fill="' + PIC_INK + '"/>' +
         '<path d="M34 38 Q40 50 34 62" fill="none" stroke="' + PIC_INK + '" stroke-width="6" stroke-linecap="round"/>' +
         '<path d="M46 32 Q52 22 62 30 M48 68 Q54 78 62 66" fill="none" stroke="' + PIC_INK + '" stroke-width="6" stroke-linecap="round"/>' },
  { k: 'yu2',   ch: '雨', wd: '下雨',
    svg: '<path d="M12 20 H88" fill="none" stroke="' + PIC_INK + '" stroke-width="8" stroke-linecap="round"/>' +
         '<path d="M26 34 Q31 44 26 49 Q21 44 26 34 Z M50 34 Q55 44 50 49 Q45 44 50 34 Z M74 34 Q79 44 74 49 Q69 44 74 34 Z M26 60 Q31 70 26 75 Q21 70 26 60 Z M50 60 Q55 70 50 75 Q45 70 50 60 Z M74 60 Q79 70 74 75 Q69 70 74 60 Z" fill="' + PIC_RAIN + '"/>' },
  { k: 'yun',   ch: '云', wd: '白云',
    svg: '<path d="M30 18 H72" fill="none" stroke="' + PIC_INK + '" stroke-width="7.5" stroke-linecap="round"/>' +
         '<path d="M22 38 H80" fill="none" stroke="' + PIC_INK + '" stroke-width="7.5" stroke-linecap="round"/>' +
         '<path d="M34 58 Q52 74 70 58 Q62 72 44 68" fill="none" stroke="' + PIC_INK + '" stroke-width="7" stroke-linecap="round"/>' },
  { k: 'men',   ch: '门', wd: '大门',
    svg: '<path d="M26 14 H74" fill="none" stroke="' + PIC_INK + '" stroke-width="8" stroke-linecap="round"/>' +
         '<path d="M30 16 V84 M70 16 V84" fill="none" stroke="' + PIC_INK + '" stroke-width="8" stroke-linecap="round"/>' +
         '<circle cx="30" cy="88" r="4.5" fill="' + PIC_INK + '"/><circle cx="70" cy="88" r="4.5" fill="' + PIC_INK + '"/>' },
  { k: 'shi',   ch: '石', wd: '石头',
    svg: '<path d="M12 20 H66 L38 54" fill="none" stroke="' + PIC_INK + '" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>' +
         '<rect x="40" y="58" width="40" height="28" rx="9" fill="' + PIC_PAPER + '" stroke="' + PIC_INK + '" stroke-width="8"/>' },
  { k: 'mu2',   ch: '目', wd: '眼睛',
    ev: '<circle cx="50" cy="50" r="36" fill="' + PIC_PAPER + '" stroke="' + PIC_INK + '" stroke-width="7"/>' +
        '<circle cx="50" cy="50" r="15" fill="none" stroke="' + PIC_INK + '" stroke-width="6"/>' +
        '<circle cx="50" cy="50" r="5.5" fill="' + PIC_INK + '"/>',
    svg: '<path d="M16 50 Q28 26 50 26 Q72 26 84 50 Q72 74 50 74 Q28 74 16 50 Z" fill="' + PIC_PAPER + '" stroke="' + PIC_INK + '" stroke-width="7" stroke-linejoin="round"/>' +
         '<circle cx="50" cy="50" r="13" fill="none" stroke="' + PIC_INK + '" stroke-width="6"/>' +
         '<circle cx="50" cy="50" r="5" fill="' + PIC_INK + '"/>' },
  { k: 'he2',   ch: '禾', wd: '禾苗',
    ev: '<path d="M50 30 V92" fill="none" stroke="' + PIC_INK + '" stroke-width="7.5" stroke-linecap="round"/>' +
        '<path d="M50 30 Q62 22 68 8" fill="none" stroke="' + PIC_INK + '" stroke-width="7" stroke-linecap="round"/>' +
        '<circle cx="68" cy="8" r="3.5" fill="' + PIC_INK + '"/><circle cx="61" cy="16" r="3.5" fill="' + PIC_INK + '"/><circle cx="73" cy="16" r="3.5" fill="' + PIC_INK + '"/>' +
        '<path d="M50 56 Q36 48 28 34 M50 56 Q64 48 72 34" fill="none" stroke="' + PIC_INK + '" stroke-width="6.5" stroke-linecap="round"/>' +
        '<path d="M50 78 Q38 86 32 92 M50 78 Q62 86 68 92" fill="none" stroke="' + PIC_INK + '" stroke-width="6" stroke-linecap="round"/>',
    svg: '<path d="M50 24 V92" fill="none" stroke="' + PIC_INK + '" stroke-width="7.5" stroke-linecap="round"/>' +
         '<path d="M50 56 Q34 46 26 30 M50 56 Q66 46 74 30 M50 56 Q34 66 26 84 M50 56 Q66 66 74 84" fill="none" stroke="' + PIC_INK + '" stroke-width="6.5" stroke-linecap="round"/>' +
         '<path d="M50 24 Q38 12 26 16 M50 24 Q62 12 74 16" fill="none" stroke="' + PIC_INK + '" stroke-width="6.5" stroke-linecap="round"/>' +
         '<path d="M38 14 l-5 9 M30 15 l-6 8 M62 14 l5 9 M70 15 l6 8" fill="none" stroke="' + PIC_INK + '" stroke-width="6" stroke-linecap="round"/>' },
  { k: 'zhu',   ch: '竹', wd: '竹子',
    svg: '<path d="M32 12 V88 M68 12 V88" fill="none" stroke="' + PIC_INK + '" stroke-width="7.5" stroke-linecap="round"/>' +
         '<path d="M32 18 Q20 26 12 24 M32 18 Q42 28 50 26 M68 18 Q56 26 50 26 M68 18 Q80 26 88 24" fill="none" stroke="' + PIC_INK + '" stroke-width="6.5" stroke-linecap="round"/>' },
  { k: 'zhou',  ch: '舟', wd: '小船',
    svg: '<path d="M8 40 L92 40 Q88 70 50 80 Q12 70 8 40 Z" fill="' + PIC_PAPER + '" stroke="' + PIC_INK + '" stroke-width="7" stroke-linejoin="round"/>' +
         '<path d="M36 42 V66 M64 42 V66" fill="none" stroke="' + PIC_INK + '" stroke-width="6" stroke-linecap="round"/>' +
         '<path d="M10 38 Q4 30 8 22 M90 38 Q96 30 92 22" fill="none" stroke="' + PIC_INK + '" stroke-width="6" stroke-linecap="round"/>' },
  /* ---- r12 追加 20 字（形近系）---- */
  { k: 'wu',    ch: '乌', wd: '乌鸦',
    ev: '<path d="M12 32 Q20 12 42 18 Q52 8 60 20 L74 26 L60 32 Q66 46 58 56 Q46 68 28 62 Q14 54 12 32 Z" fill="' + PIC_PAPER + '" stroke="' + PIC_INK + '" stroke-width="6.5" stroke-linejoin="round"/>' +
        '<path d="M38 66 V84 M54 66 V84" fill="none" stroke="' + PIC_INK + '" stroke-width="6" stroke-linecap="round"/>' +
        '<path d="M58 52 Q78 58 84 74" fill="none" stroke="' + PIC_INK + '" stroke-width="6" stroke-linecap="round"/>',
    svg: '<path d="M10 30 L26 24 Q40 10 50 26 Q76 20 82 42 Q84 58 64 62 Q40 66 28 50 Q18 40 10 30 Z" fill="' + PIC_PAPER + '" stroke="' + PIC_INK + '" stroke-width="6" stroke-linejoin="round"/>' +
         '<path d="M40 14 q-2 -6 -8 -8" fill="none" stroke="' + PIC_INK + '" stroke-width="6" stroke-linecap="round"/>' +
         '<path d="M78 52 Q92 66 88 86" fill="none" stroke="' + PIC_INK + '" stroke-width="6.5" stroke-linecap="round"/>' +
         '<path d="M42 64 V82 M56 64 V82" fill="none" stroke="' + PIC_INK + '" stroke-width="6" stroke-linecap="round"/>' },
  { k: 'wei',   ch: '未', wd: '未来',
    ev: '<path d="M50 10 V92" fill="none" stroke="' + PIC_INK + '" stroke-width="7.5" stroke-linecap="round"/>' +
        '<path d="M50 26 Q36 18 30 6 M50 26 Q64 18 70 6" fill="none" stroke="' + PIC_INK + '" stroke-width="6" stroke-linecap="round"/>' +
        '<path d="M50 46 Q34 38 26 24 M50 46 Q66 38 74 24" fill="none" stroke="' + PIC_INK + '" stroke-width="6.5" stroke-linecap="round"/>' +
        '<path d="M50 66 Q36 58 28 44 M50 66 Q64 58 72 44" fill="none" stroke="' + PIC_INK + '" stroke-width="6.5" stroke-linecap="round"/>' +
        '<path d="M50 82 Q40 88 34 94 M50 82 Q60 88 66 94" fill="none" stroke="' + PIC_INK + '" stroke-width="6" stroke-linecap="round"/>',
    svg: '<path d="M50 12 V92" fill="none" stroke="' + PIC_INK + '" stroke-width="7.5" stroke-linecap="round"/>' +
         '<path d="M50 32 Q34 22 26 8 M50 32 Q66 22 74 8" fill="none" stroke="' + PIC_INK + '" stroke-width="6.5" stroke-linecap="round"/>' +
         '<path d="M50 58 Q34 48 26 34 M50 58 Q66 48 74 34" fill="none" stroke="' + PIC_INK + '" stroke-width="6.5" stroke-linecap="round"/>' +
         '<path d="M50 76 Q38 84 30 92 M50 76 Q62 84 70 92" fill="none" stroke="' + PIC_INK + '" stroke-width="6" stroke-linecap="round"/>' },
  { k: 'mo',    ch: '末', wd: '末尾',
    ev: '<path d="M50 10 V92" fill="none" stroke="' + PIC_INK + '" stroke-width="7.5" stroke-linecap="round"/>' +
        '<circle cx="50" cy="6" r="5" fill="' + PIC_INK + '"/>' +
        '<path d="M50 44 Q34 36 26 22 M50 44 Q66 36 74 22" fill="none" stroke="' + PIC_INK + '" stroke-width="6.5" stroke-linecap="round"/>' +
        '<path d="M50 76 Q38 84 30 92 M50 76 Q62 84 70 92" fill="none" stroke="' + PIC_INK + '" stroke-width="6" stroke-linecap="round"/>',
    svg: '<path d="M32 10 H68" fill="none" stroke="' + PIC_INK + '" stroke-width="8" stroke-linecap="round"/>' +
         '<path d="M50 10 V92" fill="none" stroke="' + PIC_INK + '" stroke-width="7.5" stroke-linecap="round"/>' +
         '<path d="M50 48 Q34 38 26 24 M50 48 Q66 38 74 24" fill="none" stroke="' + PIC_INK + '" stroke-width="6.5" stroke-linecap="round"/>' +
         '<path d="M50 76 Q38 84 30 92 M50 76 Q62 84 70 92" fill="none" stroke="' + PIC_INK + '" stroke-width="6" stroke-linecap="round"/>' },
  { k: 'ben',   ch: '本', wd: '本领',
    svg: '<path d="M50 8 V92" fill="none" stroke="' + PIC_INK + '" stroke-width="7.5" stroke-linecap="round"/>' +
         '<path d="M50 42 Q32 30 24 14 M50 42 Q68 30 76 14 M50 58 Q32 70 24 86 M50 58 Q68 70 76 86" fill="none" stroke="' + PIC_INK + '" stroke-width="6.5" stroke-linecap="round"/>' +
         '<path d="M28 76 H72" fill="none" stroke="' + PIC_INK + '" stroke-width="8" stroke-linecap="round"/>' },
  { k: 'bai',   ch: '白', wd: '白色',
    svg: '<path d="M44 24 Q46 12 58 12" fill="none" stroke="' + PIC_INK + '" stroke-width="7" stroke-linecap="round"/>' +
         '<rect x="24" y="28" width="54" height="54" rx="10" fill="' + PIC_PAPER + '" stroke="' + PIC_INK + '" stroke-width="7.5"/>' +
         '<circle cx="51" cy="55" r="7" fill="' + PIC_INK + '"/>' },
  { k: 'tian2', ch: '天', wd: '天空',
    svg: '<path d="M28 10 H72" fill="none" stroke="' + PIC_INK + '" stroke-width="7" stroke-linecap="round"/>' +
         '<circle cx="50" cy="28" r="7" fill="' + PIC_INK + '"/>' +
         '<path d="M50 22 V60" fill="none" stroke="' + PIC_INK + '" stroke-width="8" stroke-linecap="round"/>' +
         '<path d="M50 36 Q30 30 18 18 M50 36 Q70 30 82 18" fill="none" stroke="' + PIC_INK + '" stroke-width="7" stroke-linecap="round"/>' +
         '<path d="M50 60 Q36 76 30 92 M50 60 Q64 76 70 92" fill="none" stroke="' + PIC_INK + '" stroke-width="7" stroke-linecap="round"/>' },
  { k: 'da',    ch: '大', wd: '大人',
    svg: '<path d="M50 10 V58" fill="none" stroke="' + PIC_INK + '" stroke-width="8" stroke-linecap="round"/>' +
         '<path d="M50 30 Q28 24 14 12 M50 30 Q72 24 86 12" fill="none" stroke="' + PIC_INK + '" stroke-width="8" stroke-linecap="round"/>' +
         '<path d="M50 58 Q36 74 30 92 M50 58 Q64 74 70 92" fill="none" stroke="' + PIC_INK + '" stroke-width="8" stroke-linecap="round"/>' },
  { k: 'tai',   ch: '太', wd: '太空',
    svg: '<path d="M50 8 V56" fill="none" stroke="' + PIC_INK + '" stroke-width="8" stroke-linecap="round"/>' +
         '<path d="M50 28 Q28 22 14 10 M50 28 Q72 22 86 10" fill="none" stroke="' + PIC_INK + '" stroke-width="8" stroke-linecap="round"/>' +
         '<path d="M50 56 Q36 72 30 90 M50 56 Q64 72 70 90" fill="none" stroke="' + PIC_INK + '" stroke-width="8" stroke-linecap="round"/>' +
         '<circle cx="52" cy="78" r="6.5" fill="' + PIC_INK + '"/>' },
  { k: 'dao',   ch: '刀', wd: '小刀',
    svg: '<path d="M32 14 Q66 14 68 48 Q69 72 54 90 Z" fill="' + PIC_PAPER + '" stroke="' + PIC_INK + '" stroke-width="7" stroke-linejoin="round"/>' },
  { k: 'li',    ch: '力', wd: '力气',
    svg: '<path d="M32 12 Q66 12 68 46 Q69 66 58 82" fill="none" stroke="' + PIC_INK + '" stroke-width="7" stroke-linecap="round"/>' +
         '<path d="M32 12 L46 90" fill="none" stroke="' + PIC_INK + '" stroke-width="7" stroke-linecap="round"/>' },
  { k: 'san',   ch: '三', wd: '三个',
    svg: '<path d="M22 26 H78" fill="none" stroke="' + PIC_INK + '" stroke-width="8" stroke-linecap="round"/>' +
         '<path d="M16 50 H84" fill="none" stroke="' + PIC_INK + '" stroke-width="8" stroke-linecap="round"/>' +
         '<path d="M22 74 H78" fill="none" stroke="' + PIC_INK + '" stroke-width="8" stroke-linecap="round"/>' },
  { k: 'chuan', ch: '川', wd: '山川',
    svg: '<path d="M30 12 Q25 50 30 88" fill="none" stroke="' + PIC_INK + '" stroke-width="8" stroke-linecap="round"/>' +
         '<path d="M52 10 V90" fill="none" stroke="' + PIC_INK + '" stroke-width="8" stroke-linecap="round"/>' +
         '<path d="M70 12 Q75 50 70 88" fill="none" stroke="' + PIC_INK + '" stroke-width="8" stroke-linecap="round"/>' },
  { k: 'wang',  ch: '王', wd: '国王',
    svg: '<path d="M26 22 H74" fill="none" stroke="' + PIC_INK + '" stroke-width="8" stroke-linecap="round"/>' +
         '<path d="M18 50 H82" fill="none" stroke="' + PIC_INK + '" stroke-width="8" stroke-linecap="round"/>' +
         '<path d="M26 78 H74" fill="none" stroke="' + PIC_INK + '" stroke-width="8" stroke-linecap="round"/>' +
         '<path d="M50 12 V88" fill="none" stroke="' + PIC_INK + '" stroke-width="8" stroke-linecap="round"/>' },
  { k: 'yu3',   ch: '玉', wd: '玉石',
    svg: '<path d="M26 22 H74" fill="none" stroke="' + PIC_INK + '" stroke-width="8" stroke-linecap="round"/>' +
         '<path d="M18 50 H82" fill="none" stroke="' + PIC_INK + '" stroke-width="8" stroke-linecap="round"/>' +
         '<path d="M26 78 H74" fill="none" stroke="' + PIC_INK + '" stroke-width="8" stroke-linecap="round"/>' +
         '<path d="M50 12 V88" fill="none" stroke="' + PIC_INK + '" stroke-width="8" stroke-linecap="round"/>' +
         '<circle cx="67" cy="63" r="6" fill="' + PIC_INK + '"/>' },
  { k: 'xiao',  ch: '小', wd: '大小',
    svg: '<path d="M50 20 V80" fill="none" stroke="' + PIC_INK + '" stroke-width="8" stroke-linecap="round"/>' +
         '<path d="M26 38 Q33 45 39 52 M74 38 Q67 45 61 52" fill="none" stroke="' + PIC_INK + '" stroke-width="7" stroke-linecap="round"/>' },
  { k: 'shao',  ch: '少', wd: '多少',
    svg: '<path d="M62 12 Q46 16 34 28" fill="none" stroke="' + PIC_INK + '" stroke-width="7" stroke-linecap="round"/>' +
         '<path d="M50 30 V84" fill="none" stroke="' + PIC_INK + '" stroke-width="8" stroke-linecap="round"/>' +
         '<path d="M27 46 Q34 53 40 60 M73 46 Q66 53 60 60" fill="none" stroke="' + PIC_INK + '" stroke-width="7" stroke-linecap="round"/>' },
  { k: 'shou',  ch: '手', wd: '小手',
    svg: '<path d="M31 50 Q31 40 40 40 H60 Q69 40 69 50 L65 76 Q63 90 50 90 Q37 90 35 76 Z" fill="' + PIC_PAPER + '" stroke="' + PIC_INK + '" stroke-width="7" stroke-linejoin="round"/>' +
         '<path d="M35 40 V22 M47 40 V14 M59 40 V18 M67 46 V28" fill="none" stroke="' + PIC_INK + '" stroke-width="7" stroke-linecap="round"/>' },
  { k: 'mao',   ch: '毛', wd: '毛衣',
    svg: '<path d="M50 8 Q61 24 50 40 Q39 56 50 72 Q58 84 51 94" fill="none" stroke="' + PIC_INK + '" stroke-width="8" stroke-linecap="round"/>' +
         '<path d="M30 26 Q25 42 30 58 M70 26 Q75 42 70 58" fill="none" stroke="' + PIC_INK + '" stroke-width="6.5" stroke-linecap="round"/>' },
  { k: 'jia',   ch: '甲', wd: '甲虫',
    ev: '<ellipse cx="50" cy="56" rx="28" ry="24" fill="' + PIC_PAPER + '" stroke="' + PIC_INK + '" stroke-width="7"/>' +
        '<path d="M50 32 V80 M26 56 H74" fill="none" stroke="' + PIC_INK + '" stroke-width="6" stroke-linecap="round"/>' +
        '<path d="M50 80 V94" fill="none" stroke="' + PIC_INK + '" stroke-width="7" stroke-linecap="round"/>',
    svg: '<rect x="26" y="20" width="48" height="46" rx="8" fill="' + PIC_PAPER + '" stroke="' + PIC_INK + '" stroke-width="7.5"/>' +
         '<path d="M50 20 V66 M26 43 H74" fill="none" stroke="' + PIC_INK + '" stroke-width="6.5" stroke-linecap="round"/>' +
         '<path d="M50 66 V92" fill="none" stroke="' + PIC_INK + '" stroke-width="7.5" stroke-linecap="round"/>' },
  { k: 'you',   ch: '由', wd: '理由',
    svg: '<path d="M50 8 V24" fill="none" stroke="' + PIC_INK + '" stroke-width="7.5" stroke-linecap="round"/>' +
         '<rect x="26" y="24" width="48" height="46" rx="8" fill="' + PIC_PAPER + '" stroke="' + PIC_INK + '" stroke-width="7.5"/>' +
         '<path d="M50 24 V70 M26 47 H74" fill="none" stroke="' + PIC_INK + '" stroke-width="6.5" stroke-linecap="round"/>' }
];

const PICTO_KEYS = PICTO.map(e => e.k);                 // 40 键（前 20 = b8 定稿序，后 20 = r12 追加序）
const PIC_BY = {}; PICTO.forEach(e => { PIC_BY[e.k] = e; });
/* 组词文案：与 manifest pic_ch_<k> 严格同源（'字，组词的字'） */
const picW = k => { const e = PIC_BY[k]; return e ? e.ch + '，' + e.wd + '的' + e.ch : ''; };
const chKeyOf = k => 'pic_ch_' + k;

/* ---------- 形近族表（r12：直邻 19 对 = b8 旧 5 对 + 新 14 对；邻接表单向列出，查两边）
   sameFam=同形近族（直邻或共伙伴，dist≤2）——ch2 起干扰的准入口径（delta②「干扰为形近字」）：
   干扰与真值必同族（防双真值：随机字进不了候选）；famOf≥2 的字才能当 ch2+ 目标（DEEP 池） ---------- */
const NEAR = {
  ri: ['mu2', 'tian', 'bai'], yue: [], shan: [], shui: [], huo: [],
  mu: ['he2', 'ben', 'wei'], ren: [], kou: ['tian'], tian: ['kou', 'ri', 'jia', 'you'],
  niao: ['ma', 'wu'], ma: ['niao'], yu: [], yu2: [], yun: [],
  men: [], shi: [], mu2: ['ri'], he2: ['mu'], zhu: [], zhou: [],
  wu: ['niao'], wei: ['mo', 'mu'], mo: ['wei'], ben: ['mu'], bai: ['ri'],
  tian2: ['da'], da: ['tian2', 'tai'], tai: ['da'], dao: ['li'], li: ['dao'],
  san: ['chuan'], chuan: ['san'], wang: ['yu3'], yu3: ['wang'],
  xiao: ['shao'], shao: ['xiao'], shou: ['mao'], mao: ['shou'],
  jia: ['tian'], you: ['tian']
};
const nearOf = k => NEAR[k] || [];
const isNearPair = (a, b) => nearOf(a).indexOf(b) >= 0 || nearOf(b).indexOf(a) >= 0;
const sameFam = (a, b) => a !== b && (isNearPair(a, b) ||
  nearOf(a).some(c => isNearPair(c, b)));               // 直邻或共形近伙伴（同族）
const famOf = k => PICTO_KEYS.filter(x => sameFam(x, k));
const PAIR_KEYS = PICTO_KEYS.filter(k => nearOf(k).length > 0);   // 直邻对字 28（M4 复核：前 20 中 8+后 20 全 20；含冗余双向列出）
const DEEP_KEYS = PICTO_KEYS.filter(k => famOf(k).length >= 2);   // 形近组≥2 → ch2/3/4 目标池（18）
/* 字源推演池（r12 delta③）：12 字配 ev 古形 SVG，演变序列 ev→svg→? 推字 */
const EVO_KEYS = ['ri', 'mu', 'tian', 'kou', 'niao', 'ma', 'mu2', 'wei', 'mo', 'he2', 'wu', 'jia'];

/* ---------- estMs 家族定版字面（r12 启用；四处同步=本定义 / game-main 注释 /
   game-verify 独立副本断言 / build.py 字面 assert；禁 +300 变体）
   SAPI 拼句/clip 时长估计：n=码点数 */
const estMs = n => n * 345 + 600;

/* ---------- r12 单关推算时长模型（6-7 岁试玩口径，保守下界；AUDIT-67 时长判定用）
   LOOK_MS   观察思考窗（认知步主体：非演出）——按章型/题型分档：
             m1=图→字入门(非形近干扰 2-3 选) / m2=字→图形近 3-4 选 / m3=形近双模式辨析(峰) /
             m4=ch4 混合匹配 / evo=字源推演(两段演变比对+趋势投影，认知步最重)
   MOTOR_MS  点选动作窗（演出） / RIGHT_MS 答对演出窗（=game-main 实际 await 1900ms）
   LEVEL_MIN_MS 单关推算下限（verify 独立副本对账 + 硬断言 ≥40s）
   单题=题面语音 estMs(qText) + LOOK + MOTOR + RIGHT；ch1（最低档）= 5×(5430+4800+800+1900)=64650ms，
   认知步（语音+观察）占比 79%——时长由认知步撑，非演出窗 */
const LOOK_MS = { m1: 4800, m2: 6200, m3: 6800, m4: 6200, evo: 8400 };
const MOTOR_MS = 800, RIGHT_MS = 1900;
const LEVEL_MIN_MS = 40000;
function quizDurMs(q, dch) {                       // 单题推算（dch 决定观察档位）
  const look = q.mode === 'evo' ? LOOK_MS.evo
    : dch === 1 ? LOOK_MS.m1 : dch === 2 ? LOOK_MS.m2 : dch === 3 ? LOOK_MS.m3 : LOOK_MS.m4;
  return estMs(qTextOf(q).length) + look + MOTOR_MS + RIGHT_MS;
}
const levelDurMs = L => L.quizzes.reduce((s, q) => s + quizDurMs(q, L.dch), 0);

/* ---------- 章配置（章号 1 基；难度章号 (ch-1)%4+1 循环）
   r12 章型：ch1 图→字入门（非同族干扰 2→3 选）→ ch2 字→图恒 3-4 选全形近 →
   ch3 形近辨析（双模式交替，fam 富恒 4 选）→ ch4 混合+字源推演（[图→字,字→图,evo,图→字,evo]）
   hint=「预告下一章」文案（存于本章条目，nextHint 取 CHAPTERS[floor(f/5)+1]——bridge 家族契约 M1 口径）；
   GEN 文案按 dch 索引不带"明天："前缀 ---------- */
const CHAPTERS = {
  1: { name: '看图找字', hint: '反过来啦，看汉字找出它古时候的画' },
  2: { name: '看字找画', hint: '小心长得像的字，火眼金睛分清它们' },
  3: { name: '火眼金睛', hint: '字的演变小剧场来啦，猜猜画变成了什么字' },
  4: { name: '字图大会', hint: '新一轮字和古画大挑战' }
};
const GEN_HINTS = ['新一轮看图猜字挑战', '看字找古画，小心形近字', '形近字火眼金睛', '字和古画的演变大挑战'];
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案（key/clip 与 voice/manifest.json 严格一致，禁自造）
   watch/turn/hint/q1/q2 既有五键 r12 一字不改；q3=r12 新增字源推演题面（gen_clips.py r12 块注册）
   wrong 无 clip → 动态 TTS 兜底（§0.13） ---------- */
const VOICE = {
  watch: { key: 'pic_tut_watch', text: '看！古时候的人画图造字' },
  turn:  { key: 'pic_tut_turn',  text: '你来找一找' },
  hint:  { key: 'pic_hint',      text: '听一听，找一找' },
  wrong: { key: 'pic_wrong',     text: '不对哦，再找一找' }
};
/* 题面指令（三模式各一条 clip，题面全语音承载 §0.19；零识字可玩） */
const qKeyOf = q => q.mode === 'toChar' ? 'pic_q1' : (q.mode === 'evo' ? 'pic_q3' : 'pic_q2');
const qTextOf = q => q.mode === 'toChar' ? '看一看，古时候的画是哪个字呀'
  : (q.mode === 'evo' ? '看一看，它一步一步变成了什么字' : '看一看，哪个是它古时候的画');

/* ---------- 象形图 SVG 包装（data-k/data-k0 供验收同源断言） ---------- */
function picSvg(k, cls) {
  const e = PIC_BY[k];
  if (!e) return '';
  return '<svg class="' + (cls || 'pic') + '" viewBox="0 0 100 100" data-k="' + k + '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + e.svg + '</svg>';
}
/* 字源演变古形（r12 delta③ 题面第一段；与 svg 两段可辨——verify 断言 ev!==svg） */
function picSvg0(k, cls) {
  const e = PIC_BY[k];
  if (!e || !e.ev) return '';
  return '<svg class="' + (cls || 'pic p0') + '" viewBox="0 0 100 100" data-k0="' + k + '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + e.ev + '</svg>';
}

/* ---------- 图标（全部内嵌 SVG，描线风，INK 暖棕 / 暖橙点缀） ---------- */
const ICONS = {
  logo: '<svg viewBox="0 0 44 44" width="32" height="32" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="7" y="7" width="30" height="30" rx="9" fill="#F2D8A8" stroke="#4A3B2E" stroke-width="2.6"/>' +
    '<circle cx="22" cy="22" r="4" fill="#4A3B2E"/></svg>',
  hear: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M11 25 h10 l13 -11 v36 l-13 -11 h-10 Z" fill="#E8975A" stroke="#4A3B2E" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M43 23 q6 9 0 18 M50 16 q11 16 0 32" stroke="#4A3B2E" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>',
  /* 题面角标：toChar=找汉字（毛笔）/ toPic=找古画（画框）/ evo=演变（毛笔——答案域是字）——非文字依赖的模式线索 */
  tagChar: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M4 20 L8 21 L7 17 L18 5 Q20 3 22 5 Q23 7 21 9 L9 20 Z" fill="#FFF9EE" stroke="#FFF9EE" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  tagPic: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3" y="4" width="18" height="16" rx="3" fill="none" stroke="#FFF9EE" stroke-width="2.5"/>' +
    '<path d="M6 16 L10 10 L13 13 L16 9 L20 15" stroke="#FFF9EE" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<circle cx="9" cy="8.5" r="1.6" fill="#FFF9EE"/></svg>',
  /* 演变序列箭头（r12 evo 题面段间） */
  arrow: '<svg viewBox="0 0 34 34" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M4 17 H26 M19 9 L28 17 L19 25" stroke="#C9A87C" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};
