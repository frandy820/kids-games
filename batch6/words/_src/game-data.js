/* ================= words 识字积木 游戏数据（字库 55 字 / 章配置 / 语音文案 / 图标）
   字库定稿原则（SPEC-BATCH6 §1 + SPEC-R28-WORDS）：
   - 55 字封闭（r28：48+7 声旁家族新字）；拆法全部取"部件本身是常用字/知名部首"的可靠拆法，禁止争议拆字
   - 拼音冲突字加序号后缀（河 he / 荷 he2 / 清 qing2 / 请 qing3 / 情 qing4 / 她 ta2 / 池 chi2 / 吗 ma2），
     55 个 clip key wrd_ch_<py> 全唯一、全 ASCII
   - 部件字符全部落在 CJK 统一表意文字基本区（U+4E00-U+9FFF），系统字体渲染无忧
     （笔 ⺮毛 的 ⺮=U+2EAE 属 CJK Radicals Supplement，字体覆盖不稳，剔除改用 纸=纟+氏；
      r28 新增部首部件 忄=U+5FC4 落在基本区，知名部首"竖心旁"）
   - gen_clips.py 从本表正则提取 {c,py,parts,w} 合成每字读音组词 clip
     （r28 提取数 48→55：voice/gen_clips.py 行 241-242 断言需主线同步 48→55，键清单见 SPEC-R28 §R10） */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（DESIGN-SPEC §8）

/* ---------- 章配置（章号 1 基；难度章号 (ch-1)%4+1 循环）
   dPart=正确部件数约束 / nDis=干扰块基础个数
   r28 有效干扰数 nDisEff(dch,lv) = lv>=2 ? max(3,nDis) : nDis（game-core.js）：
   ch1/ch3 章内 2→3 上探坡（lv0-1 两块、lv2 起三块），ch2/ch4 恒 3；全谱干扰恒 ≥2（audit：起步 1 干扰过易）
   hint=「完成本章后预告下一章」文案（与系列惯例一致；反方审查 M2：原四条写成本章描述，
   章末公式 CHAPTERS[ci+1].hint 在章 1 末会显示刚玩完的章 1 内容——已下移一位改写；
   r28 谱变更后四条对新谱依然逐章贴切：章1末预告ch2声旁形近辨析/ch2末预告ch3三部件/ch3末预告ch4家族） ---------- */
const CHAPTERS = {
  1: { name: '拼一拼',   dPart: 2, dPartMax: 2, nDis: 2, hint: '小心长得像的部件，分清它们哦' },
  2: { name: '找不同',   dPart: 2, dPartMax: 2, nDis: 3, hint: '三个部件的大字，像搭积木一样' },
  3: { name: '三块积木', dPart: 3, dPartMax: 3, nDis: 2, hint: '同一家族的部件，要看得仔仔细细' },
  4: { name: '字家族',   dPart: 2, dPartMax: 3, nDis: 3, hint: '新一轮拼字挑战' }
};
const GEN_HINTS = ['新的拼字挑战', '更多部件拼新字', '三块积木再来一轮', '字家族辨析新挑战'];
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 字库（55 字定稿；w = '<字>，<组词>的<字>' 读音组词文案） ----------
   章 1：2 部件简单组合（r28：干扰 2 起步、lv≥2 上探 3；池序不变=flat0 首题"明"教学锚）
   章 2：声旁家族（r28 重建，AUDIT-67 建议"同声旁家族辨析(清/请/晴)"）——
        青 族 晴/清/请/情、也 族 他/地/她/池、工 族 江/红、马 族 妈/吗，
        全 2 部件形声字；家族的形旁部件（日氵讠忄/亻土女王/纟/口）互为优先干扰 → 形旁辨析
   章 3：全 3 部件字（重复部件字 木木木/日日日 等天然多块拼搭；池序不变=flat13 首题"树"锚）
   章 4：混合 2/3 部件 + 同部首家族（r28：原 12 字 + 旧 ch2 七字 奶河好打吃沙拍 并入 = 19 字，
        氵族 河/洋/洗/沙、口族 听/叶/吃、扌族 打/拍、女族 好/奶、艹族 苗/草/花、木族 松/梦 同章干扰） ---------- */
const CHARS = {
  1: [
    { c: '明', py: 'ming',    parts: ['日', '月'], w: '明，明天的明' },
    { c: '林', py: 'lin',     parts: ['木', '木'], w: '林，树林的林' },
    { c: '双', py: 'shuang',  parts: ['又', '又'], w: '双，双手的双' },
    { c: '男', py: 'nan',     parts: ['田', '力'], w: '男，男孩的男' },
    { c: '岩', py: 'yan',     parts: ['山', '石'], w: '岩，岩石的岩' },
    { c: '尘', py: 'chen',    parts: ['小', '土'], w: '尘，灰尘的尘' },
    { c: '尖', py: 'jian',    parts: ['小', '大'], w: '尖，笔尖的尖' },
    { c: '灶', py: 'zao',     parts: ['火', '土'], w: '灶，灶台的灶' },
    { c: '鲜', py: 'xian',    parts: ['鱼', '羊'], w: '鲜，新鲜的鲜' },
    { c: '汗', py: 'han',     parts: ['氵', '干'], w: '汗，汗水的汗' },
    { c: '村', py: 'cun',     parts: ['木', '寸'], w: '村，村庄的村' },
    { c: '看', py: 'kan',     parts: ['手', '目'], w: '看，看见的看' }
  ],
  2: [
    { c: '晴', py: 'qing',    parts: ['日', '青'], w: '晴，晴天的晴' },
    { c: '清', py: 'qing2',   parts: ['氵', '青'], w: '清，清水的清' },
    { c: '请', py: 'qing3',   parts: ['讠', '青'], w: '请，请坐的请' },
    { c: '情', py: 'qing4',   parts: ['忄', '青'], w: '情，心情的情' },
    { c: '他', py: 'ta',      parts: ['亻', '也'], w: '他，他们的他' },
    { c: '地', py: 'di',      parts: ['土', '也'], w: '地，土地的地' },
    { c: '她', py: 'ta2',     parts: ['女', '也'], w: '她，她们的她' },
    { c: '池', py: 'chi2',    parts: ['氵', '也'], w: '池，水池的池' },
    { c: '江', py: 'jiang',   parts: ['氵', '工'], w: '江，长江的江' },
    { c: '红', py: 'hong',    parts: ['纟', '工'], w: '红，红色的红' },
    { c: '妈', py: 'ma',      parts: ['女', '马'], w: '妈，妈妈的妈' },
    { c: '吗', py: 'ma2',     parts: ['口', '马'], w: '吗，好吗的吗' }
  ],
  3: [
    { c: '森', py: 'sen',     parts: ['木', '木', '木'], w: '森，森林的森' },
    { c: '晶', py: 'jing',    parts: ['日', '日', '日'], w: '晶，亮晶晶的晶' },
    { c: '品', py: 'pin',     parts: ['口', '口', '口'], w: '品，物品的品' },
    { c: '众', py: 'zhong',   parts: ['人', '人', '人'], w: '众，人群的众' },
    { c: '想', py: 'xiang',   parts: ['木', '目', '心'], w: '想，想法的想' },
    { c: '树', py: 'shu',     parts: ['木', '又', '寸'], w: '树，大树的树' },
    { c: '湖', py: 'hu',      parts: ['氵', '古', '月'], w: '湖，湖水的湖' },
    { c: '唱', py: 'chang',   parts: ['口', '日', '日'], w: '唱，唱歌的唱' },
    { c: '意', py: 'yi',      parts: ['立', '日', '心'], w: '意，意思的意' },
    { c: '淡', py: 'dan',     parts: ['氵', '火', '火'], w: '淡，淡水的淡' },
    { c: '落', py: 'luo',     parts: ['艹', '氵', '各'], w: '落，落下的落' },
    { c: '荷', py: 'he2',     parts: ['艹', '亻', '可'], w: '荷，荷花的荷' }
  ],
  4: [
    { c: '纸', py: 'zhi',     parts: ['纟', '氏'], w: '纸，白纸的纸' },
    { c: '苗', py: 'miao',    parts: ['艹', '田'], w: '苗，禾苗的苗' },
    { c: '松', py: 'song',    parts: ['木', '公'], w: '松，松树的松' },
    { c: '星', py: 'xing',    parts: ['日', '生'], w: '星，星星的星' },
    { c: '听', py: 'ting',    parts: ['口', '斤'], w: '听，听故事的听' },
    { c: '叶', py: 'ye',      parts: ['口', '十'], w: '叶，树叶的叶' },
    { c: '洋', py: 'yang',    parts: ['氵', '羊'], w: '洋，海洋的洋' },
    { c: '洗', py: 'xi',      parts: ['氵', '先'], w: '洗，洗手的洗' },
    { c: '草', py: 'cao',     parts: ['艹', '早'], w: '草，小草的草' },
    { c: '花', py: 'hua',     parts: ['艹', '化'], w: '花，花朵的花' },
    { c: '谢', py: 'xie',     parts: ['讠', '身', '寸'], w: '谢，谢谢的谢' },
    { c: '梦', py: 'meng',    parts: ['木', '木', '夕'], w: '梦，做梦的梦' },
    { c: '奶', py: 'nai',     parts: ['女', '乃'], w: '奶，牛奶的奶' },
    { c: '河', py: 'he',      parts: ['氵', '可'], w: '河，小河的河' },
    { c: '好', py: 'hao',     parts: ['女', '子'], w: '好，好孩子的好' },
    { c: '打', py: 'da',      parts: ['扌', '丁'], w: '打，打球的打' },
    { c: '吃', py: 'chi',     parts: ['口', '乞'], w: '吃，吃饭的吃' },
    { c: '沙', py: 'sha',     parts: ['氵', '少'], w: '沙，沙子的沙' },
    { c: '拍', py: 'pai',     parts: ['扌', '白'], w: '拍，拍手的拍' }
  ]
};

/* ---------- 语音文案（key=clip 名，text=TTS 兜底；仅前 3 关播 sayP，救援走 sayR）
   每字读音组词 clip = wrd_ch_<py>（text=CHARS.w），clip 缺失自动整句 TTS 兜底
   （r28 新 7 字 clip 未注册前由 TTS 兜底，主线 gen_clips 注册后自动换真 clip） ---------- */
const VOICE = {
  watch: { key: 'wrd_tut_watch', text: '看！拼出这个字' },
  turn:  { key: 'wrd_tut_turn',  text: '你来拼一拼' },
  hint:  { key: 'wrd_hint',      text: '想一想，拼一拼' },
  wrong: { key: 'wrd_wrong',     text: '这块不对哦，再找一找' },   /* 6 岁试玩共性 P1：flat≥3 纠错轻语音（10s 节流） */
  fam:   { key: 'wrd_fam',       text: '小心长得像的部件，分清它们哦' }   /* 章 2/4 首次错播家族辨析（r28：声旁家族章扩到 dch2） */
};
const chKey = q => 'wrd_ch_' + q.py;

/* ---------- 图标（全部内嵌 SVG，描线风，INK 暖棕 / 暖橙点缀） ---------- */
const ICONS = {
  logo: '<svg viewBox="0 0 44 44" width="32" height="32" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="5" y="22" width="16" height="16" rx="4" fill="#E8975A" stroke="#FFF" stroke-width="2.5"/>' +
    '<rect x="22" y="22" width="16" height="16" rx="4" fill="#8FBF7F" stroke="#FFF" stroke-width="2.5"/>' +
    '<rect x="13" y="5" width="17" height="15" rx="4" fill="#F7CE55" stroke="#FFF" stroke-width="2.5"/>' +
    '<text x="21" y="17" font-size="10" font-weight="800" text-anchor="middle" fill="#4A3B2E" font-family="inherit">字</text></svg>',
  hear: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M11 25 h10 l13 -11 v36 l-13 -11 h-10 Z" fill="#E8975A" stroke="#4A3B2E" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M43 23 q6 9 0 18 M50 16 q11 16 0 32" stroke="#4A3B2E" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>'
};
