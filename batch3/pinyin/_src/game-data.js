/* ================= pinyin 游戏数据（拼音表 + 音节库 + 小图 + 干扰表） =================
   声母 23 / 韵母 24 / 整体认读 16 写死；两拼音节库 124（高频、代表字一年级常见）
   语音 key 统一 py_syl_<syl>（text=代表字）；声母呼读音 SM_READ / 韵母本音 YM_READ 全部落到库内音节，
   游戏内绝不使用系统 TTS 读拼音字母串（读不出来） */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（2.5px）

/* ---------- 拼音基础表 ---------- */
const SM = ['b','p','m','f','d','t','n','l','g','k','h','j','q','x','zh','ch','sh','r','z','c','s','y','w'];
const YM = ['a','o','e','i','u','ü','ai','ei','ui','ao','ou','iu','ie','üe','er','an','en','in','un','ün','ang','eng','ing','ong'];
const ZTR = ['zhi','chi','shi','ri','zi','ci','si','yi','wu','yu','ye','yue','yuan','yin','yun','ying'];
const SM_SET = {}; SM.forEach(s => { SM_SET[s] = 1; });
const YM_SET = {}; YM.forEach(s => { YM_SET[s] = 1; });
const ZTR_SET = {}; ZTR.forEach(s => { ZTR_SET[s] = 1; });

/* 声母呼读音（声母名称音=bo/po/mo...，全为合法音节且全在音节库内；y/w 走整体认读） */
const SM_READ = { b:'bo', p:'po', m:'mo', f:'fo', d:'de', t:'te', n:'ne', l:'le', g:'ge', k:'ke', h:'he',
  j:'ji', q:'qi', x:'xi', zh:'zhi', ch:'chi', sh:'shi', r:'ri', z:'zi', c:'ci', s:'si', y:'yi', w:'wu' };

/* 韵母本音（独立成音节的读法；eng/ong 无常用独立音节字 → null=不进听音目标池，仅作视觉干扰项） */
const YM_READ = { a:'a', o:'o', e:'e', i:'yi', u:'wu', ü:'yu', ai:'ai', ei:'ei', ui:'wei', ao:'ao',
  ou:'ou', iu:'you', ie:'ye', üe:'yue', er:'er', an:'an', en:'en', in:'yin', un:'wen', ün:'yun',
  ang:'ang', eng:null, ing:'ying', ong:null };

/* ---------- 两拼音节库（124，按韵母分组；r=代表字 p=小图 key 可选） ---------- */
const SYL = [
  /* a 组 10 */
  {s:'ba',r:'爸'},{s:'pa',r:'爬'},{s:'ma',r:'马',p:'horse'},{s:'fa',r:'发'},{s:'da',r:'大'},
  {s:'ta',r:'他'},{s:'la',r:'拉'},{s:'ha',r:'哈'},{s:'sha',r:'沙'},{s:'ca',r:'擦'},
  /* o 组 4（o 只拼 b p m f） */
  {s:'bo',r:'波'},{s:'po',r:'坡'},{s:'mo',r:'摸'},{s:'fo',r:'佛'},
  /* e 组 7（含 t/n 呼读音 te/ne） */
  {s:'de',r:'的'},{s:'te',r:'特'},{s:'ne',r:'呢'},{s:'le',r:'乐'},{s:'ge',r:'哥'},
  {s:'ke',r:'科'},{s:'he',r:'河'},{s:'re',r:'热'},
  /* i 组 9 */
  {s:'bi',r:'笔',p:'pen'},{s:'pi',r:'皮'},{s:'mi',r:'米'},{s:'di',r:'弟'},{s:'ni',r:'你'},
  {s:'li',r:'里'},{s:'ji',r:'鸡',p:'hen'},{s:'qi',r:'七'},{s:'xi',r:'西'},
  /* u 组 13 */
  {s:'bu',r:'步'},{s:'pu',r:'扑'},{s:'mu',r:'木'},{s:'fu',r:'父'},{s:'du',r:'读'},
  {s:'tu',r:'兔',p:'rabbit'},{s:'lu',r:'路'},{s:'gu',r:'姑'},{s:'ku',r:'哭'},{s:'hu',r:'虎',p:'tiger'},
  {s:'zhu',r:'竹'},{s:'chu',r:'出'},{s:'shu',r:'树',p:'tree'},
  /* ai 组 6 */
  {s:'bai',r:'白'},{s:'dai',r:'带'},{s:'tai',r:'台'},{s:'nai',r:'奶'},{s:'lai',r:'来'},{s:'hai',r:'海'},
  /* ei 组 3 */
  {s:'bei',r:'背'},{s:'mei',r:'美'},{s:'fei',r:'飞'},
  /* ui 组 4 */
  {s:'dui',r:'对'},{s:'hui',r:'会'},{s:'shui',r:'水',p:'water'},{s:'zui',r:'嘴'},
  /* ao 组 7 */
  {s:'bao',r:'包',p:'bun'},{s:'pao',r:'跑'},{s:'mao',r:'猫',p:'cat'},{s:'lao',r:'老'},{s:'gao',r:'高'},
  {s:'hao',r:'好'},{s:'zhao',r:'找'},
  /* ou 组 6 */
  {s:'dou',r:'豆',p:'bean'},{s:'tou',r:'头'},{s:'gou',r:'狗',p:'dog'},{s:'kou',r:'口'},{s:'hou',r:'猴'},
  {s:'shou',r:'手'},
  /* iu 组 3 */
  {s:'jiu',r:'九'},{s:'qiu',r:'球',p:'ball'},{s:'liu',r:'六'},
  /* ie 组 4 */
  {s:'jie',r:'姐'},{s:'qie',r:'切'},{s:'xie',r:'写'},{s:'bie',r:'别'},
  /* üe 组 3（j q x + üe 省两点） */
  {s:'jue',r:'决'},{s:'que',r:'缺'},{s:'xue',r:'雪'},
  /* an 组 8 */
  {s:'ban',r:'班'},{s:'man',r:'慢'},{s:'fan',r:'反'},{s:'dan',r:'蛋'},{s:'gan',r:'干'},
  {s:'kan',r:'看'},{s:'shan',r:'山',p:'mountain'},{s:'zhan',r:'站'},
  /* en 组 5 */
  {s:'ben',r:'本'},{s:'men',r:'门'},{s:'fen',r:'粉'},{s:'hen',r:'很'},{s:'zhen',r:'真'},
  /* in 组 4 */
  {s:'pin',r:'拼'},{s:'min',r:'民'},{s:'jin',r:'金'},{s:'xin',r:'心'},
  /* un 组 4 */
  {s:'lun',r:'轮'},{s:'gun',r:'滚'},{s:'hun',r:'混'},{s:'chun',r:'春'},
  /* ün 组 1 */
  {s:'jun',r:'军'},
  /* ang 组 6 */
  {s:'bang',r:'帮'},{s:'mang',r:'忙'},{s:'fang',r:'房'},{s:'tang',r:'糖'},{s:'zhang',r:'张'},
  {s:'chang',r:'长'},
  /* eng 组 5 */
  {s:'feng',r:'风'},{s:'deng',r:'灯',p:'lamp'},{s:'zheng',r:'正'},{s:'cheng',r:'城'},{s:'sheng',r:'生'},
  /* ing 组 5 */
  {s:'bing',r:'冰'},{s:'ming',r:'名'},{s:'jing',r:'京'},{s:'qing',r:'青'},{s:'xing',r:'星',p:'star'},
  /* ong 组 6 */
  {s:'dong',r:'冬'},{s:'tong',r:'同'},{s:'gong',r:'工'},{s:'kong',r:'空'},{s:'hong',r:'红'},
  {s:'zhong',r:'中'}
];

/* ---------- 整体认读 16（key/代表字；yu/yue/yun/ri 带小图） ---------- */
const ZTR_LIB = [
  {s:'zhi',r:'知'},{s:'chi',r:'吃'},{s:'shi',r:'十'},{s:'ri',r:'日',p:'sun'},
  {s:'zi',r:'字'},{s:'ci',r:'词'},{s:'si',r:'四'},
  {s:'yi',r:'一'},{s:'wu',r:'五'},{s:'yu',r:'鱼',p:'fish'},{s:'ye',r:'夜'},
  {s:'yue',r:'月',p:'moon'},{s:'yuan',r:'圆'},{s:'yin',r:'音'},{s:'yun',r:'云',p:'cloud'},
  {s:'ying',r:'鹰'}
];

/* ---------- 零声母/韵母本音库 14（韵母听音用；显示层只出韵母字母，代表字仅供合成 text） ---------- */
const ZERO = [
  {s:'a',r:'啊'},{s:'o',r:'喔'},{s:'e',r:'鹅'},{s:'ai',r:'爱'},{s:'ei',r:'欸'},
  {s:'ao',r:'奥'},{s:'ou',r:'欧'},{s:'er',r:'耳'},{s:'an',r:'安'},{s:'en',r:'恩'},
  {s:'ang',r:'昂'},{s:'wei',r:'威'},{s:'you',r:'优'},{s:'wen',r:'温'}
];
/* 零声母拼写变体拆分表（wei=w+ei 等，供 verify 拼合校验） */
const ZERO_SPLIT = { wei:['w','ei'], you:['y','ou'], wen:['w','en'] };
/* 正字法省写：j/q/x + üe/ün 省两点写作 jue/que/xue/jun（M2 修复：jun 韵母=ün 非 un） */
const SPELL_ALT = { jue:['j','üe'], que:['q','üe'], xue:['x','üe'], jun:['j','ün'] };

/* ---------- 干扰表：形近声母（b/d/p/q 四胞胎、m/n、f/t、平翘舌） ---------- */
const SM_CONFUSE = {
  b:['d','p','q'], d:['b','q','p'], p:['q','b','d'], q:['d','p','b'],
  m:['n','w'], n:['m','h'], f:['t','j'], t:['f','l'], l:['h','n'],
  g:['q','h'], k:['h','g'], h:['n','k'], j:['q','g'], q:['g','p'], x:['k','s'],
  zh:['z','ch'], ch:['c','zh'], sh:['s','zh'], r:['n','c'],
  z:['zh','c'], c:['ch','s'], s:['sh','c'], y:['w','j'], w:['m','y']
};
/* 形近韵母（SPEC 点名 a/o、iu/ui、ie/ei；前后鼻音 an/ang 族互为干扰） */
const YM_CONFUSE = {
  a:['o','e'], o:['a','e'], e:['o','a'],
  i:['ü','u'], u:['ü','i'], ü:['i','u'],
  ai:['ei','ao'], ei:['ai','ie'], ui:['iu','ie'], iu:['ui','ei'], ie:['ei','üe'], üe:['ie','ü'],
  ao:['ou','ai'], ou:['ao','iu'], er:['ei','e'],
  an:['ang','en'], en:['an','in'], in:['ing','en'], un:['ün','in'], ün:['un','in'],
  ang:['an','eng'], eng:['ang','ong'], ing:['in','eng'], ong:['eng','ang']
};
/* 整体认读分组（同组互为干扰：翘舌/平舌/y 系/w 系） */
const ZTR_GROUPS = [
  ['zhi','chi','shi','ri'],
  ['zi','ci','si'],
  ['yi','yin','ying','yu','yue','yuan','yun'],
  ['wu']
];
const ZTR_CONFUSE = {};
ZTR_GROUPS.forEach(g => { g.forEach(z => { ZTR_CONFUSE[z] = g.filter(x => x !== z); }); });

/* ---------- 池（生成器材料，供 game-core 引用） ---------- */
const YM_SINGLE = ['a','o','e','i','u','ü'];
const YM_TARGET = YM.filter(m => YM_READ[m]);              // 有本音的韵母才可作听音目标（22，排除 eng/ong）
const SM_EASY = ['b','p','m','f','d','t','n','l'];          // 章 1 前期：经典形近组
const CH_LEN = 5;

/* ---------- 内嵌小图（20 个，圆润 2.5px 暖棕描边） ---------- */
function _pic(body, vb) {
  return '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' + body + '</svg>';
}
const PIC = {
  horse: _pic('<ellipse cx="30" cy="40" rx="22" ry="14" fill="#E8C9A8" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<path d="M46 33 q14 -4 12 -16 q8 12 -4 21 Z" fill="#E8C9A8" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M52 15 q-2 -6 3 -8 q1 6 4 7 Z" fill="#C77A42" stroke="' + INK + '" stroke-width="2"/>' +
    '<rect x="14" y="48" width="5" height="12" rx="2.5" fill="#C99B6F" stroke="' + INK + '" stroke-width="2"/>' +
    '<rect x="26" y="50" width="5" height="10" rx="2.5" fill="#C99B6F" stroke="' + INK + '" stroke-width="2"/>' +
    '<rect x="38" y="50" width="5" height="10" rx="2.5" fill="#C99B6F" stroke="' + INK + '" stroke-width="2"/>' +
    '<path d="M12 32 q8 -8 18 -6 l2 5 Z" fill="#C77A42" stroke="' + INK + '" stroke-width="2"/>' +
    '<circle cx="53" cy="20" r="1.8" fill="' + INK + '"/>'),
  rabbit: _pic('<ellipse cx="20" cy="20" rx="6" ry="14" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2.5" transform="rotate(-12 20 20)"/>' +
    '<ellipse cx="33" cy="19" rx="6" ry="14" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2.5" transform="rotate(10 33 19)"/>' +
    '<circle cx="30" cy="43" r="16" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="25" cy="41" r="2.2" fill="' + INK + '"/><circle cx="35" cy="41" r="2.2" fill="' + INK + '"/>' +
    '<path d="M29 46 q1.5 2 3 0" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linecap="round"/>' +
    '<circle cx="45" cy="52" r="5" fill="#FFF" stroke="' + INK + '" stroke-width="2.5"/>'),
  fish: _pic('<ellipse cx="28" cy="33" rx="20" ry="13" fill="#8FBFBE" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<path d="M46 33 L58 22 L58 44 Z" fill="#8FBFBE" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<circle cx="16" cy="30" r="2.6" fill="' + INK + '"/>' +
    '<path d="M24 24 q6 9 0 18 M36 24 q6 9 0 18" stroke="' + INK + '" stroke-width="2" fill="none" opacity=".45"/>'),
  hen: _pic('<ellipse cx="30" cy="42" rx="18" ry="14" fill="#F5E3C3" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="46" cy="30" r="10" fill="#F5E3C3" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<path d="M45 20 q-2 -6 3 -6 q1 4 4 4 q3 0 2 5 Z" fill="#E86A5E" stroke="' + INK + '" stroke-width="2"/>' +
    '<path d="M55 31 l7 2 l-7 3 Z" fill="#F2C94C" stroke="' + INK + '" stroke-width="2"/>' +
    '<circle cx="48" cy="28" r="1.8" fill="' + INK + '"/>' +
    '<path d="M20 28 Q34 20 40 30" stroke="' + INK + '" stroke-width="2.5" fill="none"/>' +
    '<path d="M26 55 l0 6 M34 55 l0 6" stroke="' + INK + '" stroke-width="2.5" stroke-linecap="round"/>'),
  cat: _pic('<circle cx="32" cy="38" r="19" fill="#F5C89A" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<path d="M18 26 Q13 12 26 17 Z" fill="#F5C89A" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M46 26 Q51 12 38 17 Z" fill="#F5C89A" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<circle cx="25" cy="36" r="2.6" fill="' + INK + '"/><circle cx="39" cy="36" r="2.6" fill="' + INK + '"/>' +
    '<path d="M32 41 l-2.5 3 h5 Z" fill="#E8837B"/>' +
    '<path d="M30 46 q2 2.5 4 0" stroke="' + INK + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
    '<path d="M10 38 h8 M10 44 h8 M46 38 h8 M46 44 h8" stroke="' + INK + '" stroke-width="1.8" stroke-linecap="round" opacity=".7"/>'),
  dog: _pic('<ellipse cx="15" cy="35" rx="8" ry="14" fill="#B98A5E" stroke="' + INK + '" stroke-width="2.5" transform="rotate(12 15 35)"/>' +
    '<ellipse cx="49" cy="35" rx="8" ry="14" fill="#B98A5E" stroke="' + INK + '" stroke-width="2.5" transform="rotate(-12 49 35)"/>' +
    '<circle cx="32" cy="36" r="18" fill="#E8C9A8" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="25" cy="33" r="2.6" fill="' + INK + '"/><circle cx="39" cy="33" r="2.6" fill="' + INK + '"/>' +
    '<ellipse cx="32" cy="44" rx="7" ry="5" fill="#FBF7F0"/>' +
    '<ellipse cx="32" cy="41" rx="3" ry="2.4" fill="' + INK + '"/>'),
  tiger: _pic('<circle cx="17" cy="20" r="8" fill="#F2C94C" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="47" cy="20" r="8" fill="#F2C94C" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="32" cy="38" r="19" fill="#F2C94C" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<path d="M28 24 h8 M32 20 v8" stroke="' + INK + '" stroke-width="2.5" stroke-linecap="round"/>' +
    '<circle cx="25" cy="38" r="2.6" fill="' + INK + '"/><circle cx="39" cy="38" r="2.6" fill="' + INK + '"/>' +
    '<path d="M32 43 l-2.5 3 h5 Z" fill="#E8837B"/>' +
    '<path d="M13 47 h8 M43 47 h8 M15 53 h6 M43 53 h6" stroke="' + INK + '" stroke-width="2.2" stroke-linecap="round" opacity=".8"/>' +
    '<path d="M14 28 q-2 4 1 7 M50 28 q2 4 -1 7" stroke="' + INK + '" stroke-width="2" fill="none" opacity=".6"/>'),
  tree: _pic('<rect x="28" y="38" width="8" height="20" rx="3" fill="#B98A5E" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="32" cy="26" r="16" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="21" cy="34" r="10" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="43" cy="34" r="10" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="32" cy="21" r="2.4" fill="#E86A5E"/><circle cx="24" cy="30" r="2.2" fill="#E86A5E" opacity=".8"/><circle cx="41" cy="31" r="2.2" fill="#E86A5E" opacity=".8"/>'),
  mountain: _pic('<path d="M6 54 L24 16 L38 42 L46 28 L58 54 Z" fill="#B5D99C" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M24 16 L30 27 L26 30 L33 40" stroke="' + INK + '" stroke-width="2" fill="none" opacity=".55"/>' +
    '<circle cx="46" cy="24" r="6" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2"/>' +
    '<path d="M50 20 q6 -4 10 2" stroke="' + INK + '" stroke-width="2.5" fill="none" stroke-linecap="round"/>'),
  water: _pic('<path d="M32 8 C32 8 14 32 14 43 a18 14 0 0 0 36 0 C50 32 32 8 32 8 Z" fill="#8FBFBE" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<path d="M22 42 a10 8 0 0 0 8 8" stroke="#FFF" stroke-width="3.5" fill="none" stroke-linecap="round" opacity=".6"/>'),
  moon: _pic('<path d="M40 8 a24 24 0 1 0 14 42 a20 20 0 1 1 -14 -42 Z" fill="#F2C94C" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<circle cx="36" cy="30" r="2.6" fill="' + INK + '"/><path d="M30 40 q3 3 6 0" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linecap="round"/>'),
  star: _pic('<path d="M32 6 Q36 24 57 31 Q36 38 32 56 Q28 38 7 31 Q28 24 32 6 Z" fill="#F2C94C" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<circle cx="32" cy="31" r="3.4" fill="#FFF" opacity=".75"/>'),
  cloud: _pic('<ellipse cx="22" cy="40" rx="13" ry="10" fill="#E3ECF2" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<ellipse cx="38" cy="34" rx="13" ry="11" fill="#E3ECF2" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<ellipse cx="47" cy="42" rx="11" ry="9" fill="#E3ECF2" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<ellipse cx="31" cy="43" rx="14" ry="9" fill="#E3ECF2" stroke="' + INK + '" stroke-width="2.5"/>'),
  sun: _pic('<circle cx="32" cy="33" r="14" fill="#F2C94C" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<g stroke="' + INK + '" stroke-width="2.5" stroke-linecap="round">' +
    '<path d="M32 9 v6"/><path d="M32 51 v6"/><path d="M8 33 h6"/><path d="M50 33 h6"/>' +
    '<path d="M15 16 l4 4"/><path d="M45 46 l4 4"/><path d="M49 16 l-4 4"/><path d="M19 46 l-4 4"/></g>' +
    '<circle cx="27" cy="31" r="2.2" fill="' + INK + '"/><circle cx="37" cy="31" r="2.2" fill="' + INK + '"/>' +
    '<path d="M27 38 q5 4 10 0" stroke="' + INK + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>'),
  bean: _pic('<path d="M12 40 Q32 18 52 40 Q32 58 12 40 Z" fill="#A8C97F" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="26" cy="39" r="4" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2"/>' +
    '<circle cx="38" cy="39" r="4" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2"/>' +
    '<path d="M20 34 Q32 26 44 34" stroke="' + INK + '" stroke-width="1.8" fill="none" opacity=".5"/>'),
  peach: _pic('<circle cx="32" cy="38" r="17" fill="#F2B8C6" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<path d="M32 21 q-1 -8 -8 -10" stroke="' + INK + '" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="40" cy="13" rx="8" ry="4.5" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.5" transform="rotate(24 40 13)"/>' +
    '<path d="M32 21 L26 27 L32 30 L38 27 Z" fill="#F2B8C6" stroke="' + INK + '" stroke-width="2"/>' +
    '<path d="M22 36 q6 -4 10 2" stroke="#FFF" stroke-width="3" fill="none" stroke-linecap="round" opacity=".5"/>'),
  bun: _pic('<path d="M12 44 a20 16 0 0 1 40 0 Z" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M10 44 h44 v6 a4 4 0 0 1 -4 4 H14 a4 4 0 0 1 -4 -4 Z" fill="#F5E3C3" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<path d="M26 29 q2 5 -2 8 M34 28 q-1 5 3 8" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linecap="round" opacity=".7"/>' +
    '<circle cx="24" cy="37" r="2.4" fill="#E8837B" opacity=".8"/><circle cx="40" cy="37" r="2.4" fill="#E8837B" opacity=".8"/>'),
  lamp: _pic('<path d="M32 10 a14 14 0 0 1 8 25 v4 H24 v-4 a14 14 0 0 1 8 -25 Z" fill="#F2C94C" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<rect x="27" y="41" width="10" height="5" fill="#B98A5E" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<rect x="22" y="48" width="20" height="5" rx="2.5" fill="#B98A5E" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<path d="M14 18 l4 3 M50 18 l-4 3 M32 2 v5" stroke="' + INK + '" stroke-width="2.5" stroke-linecap="round"/>'),
  ball: _pic('<circle cx="32" cy="33" r="20" fill="#E86A5E" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<path d="M12 33 a20 20 0 0 0 40 0" stroke="#FFF" stroke-width="3" fill="none" opacity=".5"/>' +
    '<path d="M32 13 a30 30 0 0 1 0 40 M32 13 a30 30 0 0 0 0 40" stroke="' + INK + '" stroke-width="2.5" fill="none" opacity=".8"/>' +
    '<path d="M16 20 q8 8 0 20" stroke="#FFF" stroke-width="3" fill="none" opacity=".4"/>'),
  pen: _pic('<path d="M18 50 L12 56 l8 -2 Z" fill="' + INK + '"/>' +
    '<path d="M18 50 L40 16 L48 22 L26 54 Z" fill="#F2C94C" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M40 16 L44 12 Q48 9 51 13 T48 22" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M33 27 L41 33" stroke="' + INK + '" stroke-width="2" opacity=".6"/>')
};

/* ---------- 通用图标 ---------- */
const ICONS = {
  logo: '<svg viewBox="0 0 44 44" width="34" height="34" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3" y="16" width="26" height="18" rx="6" fill="#E8975A" stroke="#FFF" stroke-width="2.5"/>' +
    '<rect x="26" y="10" width="15" height="24" rx="5" fill="#FFF9EE" stroke="#FFF" stroke-width="2.5"/>' +
    '<circle cx="12" cy="36" r="4" fill="#4A3B2E"/><circle cx="28" cy="36" r="4" fill="#4A3B2E"/>' +
    '<path d="M31 16 h5 M31 21 h5 M31 26 h5" stroke="#E8975A" stroke-width="2" stroke-linecap="round"/></svg>',
  hear: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M12 25 h10 L38 12 v40 L22 39 H12 Z" fill="#E8975A" stroke="#4A3B2E" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M44 22 q7 10 0 20 M50 16 q11 16 0 32" stroke="#4A3B2E" stroke-width="3" fill="none" stroke-linecap="round"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  check: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M14 34 l12 12 L50 18" stroke="#FFF" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>',
  loco: '<svg viewBox="0 0 64 44" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="2" y="10" width="30" height="24" rx="6" fill="#E8975A" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<rect x="26" y="2" width="20" height="32" rx="5" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<rect x="31" y="7" width="10" height="9" rx="2.5" fill="#B5D9F2"/>' +
    '<circle cx="12" cy="37" r="5" fill="' + INK + '"/><circle cx="30" cy="37" r="5" fill="' + INK + '"/><circle cx="46" cy="37" r="5" fill="' + INK + '"/>' +
    '<path d="M6 17 h8 M6 23 h8" stroke="#FFF" stroke-width="2.5" stroke-linecap="round"/></svg>'
};
