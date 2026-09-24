/* ================= zilearn 识字小课堂 游戏数据（batch41，第 151 款）
   字表 150 字 = 静态 100（4 章×5 关×5 新字）+ genPool 50（生成关每关 +2 渐进引入）。
   本表由 _src/chars.json 定稿经 _r_zi_gen_data.py 转写生成（零手抄）——
   字段与 chars.json 一一同名（py 无调拼音+同音序号/clip key=zi_ch_<py> 全表唯一 ASCII）；
   build.py 每次构建跑双向对账门禁（node 提取本表 ↔ chars.json 深比较全等），防转写笔误。
   PICTO 26 字象形 SVG 自 batch8/picto PICTO 表按汉字字面映射复制（勿引用），8 字含 ev 古形。
   语音键账（SPEC-ZILEARN §R，r41 两段制——段一只接线不注册）：
   zi_ch_<py> 150 键（文案=字，首词的字——chText 同式）+ zi_st_<flat> 20 键（句子朗读，
   答对确认链尾段）+ 通用 8 键（VOICE 表）= 178 键；clip 未注册=静音（core v1.0 TTS 通道
   已删），段二主线 gen_clips 中央登记后自动有声。 */
'use strict';

const INK = '#4A3B2E';            // 家族暖棕描边（DESIGN-SPEC §8）

/* ---------- 关卡框架：5 题位=1 关；静态 20 关=4 章 ---------- */
const CH_LEN = 5;
const STATIC_LEVELS = 20;

/* ---------- 句子虚词白名单（子集铁律：这些字永不挖空做目标） ---------- */
const WHITELIST = "的了是我你在他有和就不啊吧呀嗯啦好";

/* ---------- 章配置：hint=本章内容预告文案（契约 C7：章 ci 结束时显示 CHAPTERS[ci+1].hint
   ——hint[n] 写第 n 章自己的内容，禁右移成第 n+1 章描述；ch1.hint 仅存档从不显示（无第 0 章） ---------- */
const CHAPTERS = {
  1: { name: "天地山水", hint: "天地日月山和水，先认识大自然" },
  2: { name: "我的家", hint: "去我的家，认识小动物和家里人" },
  3: { name: "吃喝玩乐", hint: "吃喝玩乐，认识吃饭做游戏的动作字" },
  4: { name: "字的家族", hint: "字的家族，长得像的字要分清" },
};

/* ---------- 生成关预告（家族 F：实算下一关，禁 (ci+1)%%4 章序推进） ---------- */
const GEN_HINT_MORE = "生字池还有新朋友等你认";
const GEN_HINT_DONE = "生字全部认完啦，你是识字小达人";

/* ---------- 字库（150 字定稿转写；words=[词,全拼]；distract=[干扰字,理由]；
   pic=true ⟺ glyph 非空 ⟺ PICTO 有象形 SVG（三表同键 26 字，构建期断言） ---------- */
const CHARS = {
"天": { py: "tian", pyFull: "tiān", chNo: 1, words: [["天空", "tiān kōng"], ["白天", "bái tiān"], ["明天", "míng tiān"]], pic: true, glyph: "大字头顶加一横，头顶上面就是天空", known: true, distract: [["大", "形近"], ["太", "形近"]] },
"日": { py: "ri", pyFull: "rì", chNo: 1, words: [["日出", "rì chū"], ["生日", "shēng rì"], ["日子", "rì zi"]], pic: true, glyph: "方方一块中间一点，圆圆的太阳", known: true, distract: [["目", "形近"], ["白", "形近"]] },
"上": { py: "shang", pyFull: "shàng", chNo: 1, words: [["上学", "shàng xué"], ["早上", "zǎo shang"], ["上面", "shàng miàn"]], pic: false, glyph: null, known: true, distract: [["下", "同题"], ["卡", "形近"]] },
"下": { py: "xia", pyFull: "xià", chNo: 1, words: [["下雨", "xià yǔ"], ["下山", "xià shān"], ["下面", "xià miàn"]], pic: false, glyph: null, known: true, distract: [["上", "同题"], ["卡", "形近"]] },
"晴": { py: "qing", pyFull: "qíng", chNo: 1, words: [["晴天", "qíng tiān"], ["放晴", "fàng qíng"]], pic: false, glyph: null, known: true, distract: [["清", "形近"], ["情", "形近"]] },
"月": { py: "yue", pyFull: "yuè", chNo: 1, words: [["月亮", "yuè liang"], ["月光", "yuè guāng"], ["一月", "yī yuè"]], pic: true, glyph: "弯弯的像小船，天上的月亮", known: true, distract: [["日", "形近"], ["朋", "形近"]] },
"水": { py: "shui", pyFull: "shuǐ", chNo: 1, words: [["喝水", "hē shuǐ"], ["水果", "shuǐ guǒ"], ["河水", "hé shuǐ"]], pic: true, glyph: "中间一条大河，两边溅起小水花", known: true, distract: [["火", "同题"], ["永", "形近"]] },
"火": { py: "huo", pyFull: "huǒ", chNo: 1, words: [["火车", "huǒ chē"], ["大火", "dà huǒ"], ["火山", "huǒ shān"]], pic: true, glyph: "像跳动的火苗，中间是火心", known: true, distract: [["水", "同题"], ["灭", "形近"]] },
"山": { py: "shan", pyFull: "shān", chNo: 1, words: [["大山", "dà shān"], ["山上", "shān shàng"], ["火山", "huǒ shān"]], pic: true, glyph: "三个尖尖的山峰站在大地上", known: true, distract: [["出", "形近"], ["石", "同题"]] },
"人": { py: "ren", pyFull: "rén", chNo: 1, words: [["大人", "dà rén"], ["人口", "rén kǒu"], ["人们", "rén men"]], pic: true, glyph: "两条腿站着走路，就是我们人", known: true, distract: [["入", "形近"], ["大", "形近"]] },
"口": { py: "kou", pyFull: "kǒu", chNo: 1, words: [["开口", "kāi kǒu"], ["门口", "mén kǒu"], ["口水", "kǒu shuǐ"]], pic: true, glyph: "张开的大嘴巴，方方一个口", known: false, distract: [["日", "形近"], ["田", "形近"]] },
"木": { py: "mu", pyFull: "mù", chNo: 1, words: [["木头", "mù tou"], ["树木", "shù mù"], ["木马", "mù mǎ"]], pic: true, glyph: "上长枝下生根，一棵小树是木", known: false, distract: [["本", "形近"], ["禾", "形近"]] },
"大": { py: "da", pyFull: "dà", chNo: 1, words: [["大人", "dà rén"], ["大小", "dà xiǎo"], ["大家", "dà jiā"]], pic: true, glyph: "张开手臂叉开腿，我就是大", known: false, distract: [["天", "形近"], ["太", "形近"], ["小", "同题"]] },
"小": { py: "xiao", pyFull: "xiǎo", chNo: 1, words: [["大小", "dà xiǎo"], ["小雨", "xiǎo yǔ"], ["小鸟", "xiǎo niǎo"]], pic: true, glyph: "中间小竖钩，两边小点点，小小的", known: false, distract: [["少", "形近"], ["大", "同题"]] },
"云": { py: "yun", pyFull: "yún", chNo: 1, words: [["白云", "bái yún"], ["乌云", "wū yún"], ["云朵", "yún duǒ"]], pic: true, glyph: "天上一卷一卷飘着的，就是云", known: false, distract: [["去", "形近"], ["天", "同题"]] },
"田": { py: "tian2", pyFull: "tián", chNo: 1, words: [["水田", "shuǐ tián"], ["田里", "tián lǐ"], ["种田", "zhòng tián"]], pic: true, glyph: "方框画十字，一块块小农田", known: false, distract: [["由", "形近"], ["甲", "形近"], ["日", "形近"]] },
"石": { py: "shi", pyFull: "shí", chNo: 1, words: [["石头", "shí tou"], ["石子", "shí zǐ"], ["石桥", "shí qiáo"]], pic: true, glyph: "山崖下吊着一块大石头", known: false, distract: [["右", "形近"], ["十", "同音"]] },
"马": { py: "ma", pyFull: "mǎ", chNo: 1, words: [["小马", "xiǎo mǎ"], ["马车", "mǎ chē"], ["马上", "mǎ shàng"]], pic: true, glyph: "有头有鬃有四腿，一匹小马", known: false, distract: [["鸟", "形近"], ["妈", "同音"]] },
"鸟": { py: "niao", pyFull: "niǎo", chNo: 1, words: [["小鸟", "xiǎo niǎo"], ["鸟窝", "niǎo wō"], ["飞鸟", "fēi niǎo"]], pic: true, glyph: "圆脑袋尖嘴巴，还有小爪子", known: false, distract: [["乌", "形近"], ["马", "形近"]] },
"鱼": { py: "yu", pyFull: "yú", chNo: 1, words: [["小鱼", "xiǎo yú"], ["钓鱼", "diào yú"], ["鱼儿", "yú ér"]], pic: true, glyph: "尖头摆尾巴，水里游的就是鱼", known: false, distract: [["雨", "同音"], ["龟", "形近"]] },
"雨": { py: "yu2", pyFull: "yǔ", chNo: 1, words: [["下雨", "xià yǔ"], ["雨点", "yǔ diǎn"], ["雨水", "yǔ shuǐ"]], pic: true, glyph: "天上落下小水点，滴滴答答下雨", known: false, distract: [["鱼", "同音"], ["雪", "同题"]] },
"门": { py: "men", pyFull: "mén", chNo: 1, words: [["大门", "dà mén"], ["开门", "kāi mén"], ["门口", "mén kǒu"]], pic: true, glyph: "两扇门板关起来，就是大门", known: false, distract: [["们", "形近"], ["问", "形近"]] },
"手": { py: "shou", pyFull: "shǒu", chNo: 1, words: [["小手", "xiǎo shǒu"], ["洗手", "xǐ shǒu"], ["拍手", "pāi shǒu"]], pic: true, glyph: "五根手指头，张开的小手", known: false, distract: [["毛", "形近"], ["足", "同题"]] },
"力": { py: "li", pyFull: "lì", chNo: 1, words: [["力气", "lì qi"], ["用力", "yòng lì"], ["大力士", "dà lì shì"]], pic: true, glyph: "胳膊一弯，使劲用力气", known: false, distract: [["刀", "形近"], ["立", "同音"]] },
"毛": { py: "mao", pyFull: "máo", chNo: 1, words: [["羊毛", "yáng máo"], ["毛巾", "máo jīn"], ["毛衣", "máo yī"]], pic: true, glyph: "弯弯的细细的，软软的毛", known: false, distract: [["手", "形近"], ["猫", "同音"]] },
"狗": { py: "gou", pyFull: "gǒu", chNo: 2, words: [["小狗", "xiǎo gǒu"], ["狗窝", "gǒu wō"]], pic: false, glyph: null, known: false, distract: [["猫", "同题"], ["羊", "同题"]] },
"猫": { py: "mao2", pyFull: "māo", chNo: 2, words: [["小猫", "xiǎo māo"], ["花猫", "huā māo"], ["猫叫", "māo jiào"]], pic: false, glyph: null, known: false, distract: [["狗", "同题"], ["毛", "同音"]] },
"牛": { py: "niu", pyFull: "niú", chNo: 2, words: [["小牛", "xiǎo niú"], ["牛奶", "niú nǎi"], ["老牛", "lǎo niú"]], pic: false, glyph: null, known: false, distract: [["午", "形近"], ["羊", "同题"]] },
"羊": { py: "yang", pyFull: "yáng", chNo: 2, words: [["小羊", "xiǎo yáng"], ["山羊", "shān yáng"], ["羊毛", "yáng máo"]], pic: false, glyph: null, known: false, distract: [["牛", "同题"], ["半", "形近"]] },
"虫": { py: "chong", pyFull: "chóng", chNo: 2, words: [["小虫", "xiǎo chóng"], ["虫子", "chóng zi"], ["毛毛虫", "máo máo chóng"]], pic: false, glyph: null, known: false, distract: [["中", "形近"], ["鱼", "同题"]] },
"目": { py: "mu2", pyFull: "mù", chNo: 2, words: [["耳目", "ěr mù"], ["目光", "mù guāng"], ["节目", "jié mù"]], pic: true, glyph: "眼睛长长的，中间圆圆瞳孔", known: false, distract: [["日", "形近"], ["木", "同音"]] },
"耳": { py: "er", pyFull: "ěr", chNo: 2, words: [["耳朵", "ěr duo"], ["耳机", "ěr jī"]], pic: false, glyph: null, known: false, distract: [["目", "同题"], ["二", "同音"]] },
"足": { py: "zu", pyFull: "zú", chNo: 2, words: [["手足", "shǒu zú"], ["远足", "yuǎn zú"]], pic: false, glyph: null, known: false, distract: [["走", "形近"], ["手", "同题"]] },
"头": { py: "tou", pyFull: "tóu", chNo: 2, words: [["头上", "tóu shàng"], ["点头", "diǎn tóu"], ["大头", "dà tóu"]], pic: false, glyph: null, known: false, distract: [["买", "形近"], ["发", "同题"]] },
"牙": { py: "ya", pyFull: "yá", chNo: 2, words: [["牙齿", "yá chǐ"], ["刷牙", "shuā yá"], ["门牙", "mén yá"]], pic: false, glyph: null, known: false, distract: [["耳", "同题"], ["芽", "形近"]] },
"爸": { py: "ba", pyFull: "bà", chNo: 2, words: [["爸爸", "bà ba"], ["老爸", "lǎo bà"]], pic: false, glyph: null, known: false, distract: [["妈", "同题"], ["爷", "同题"]] },
"妈": { py: "ma2", pyFull: "mā", chNo: 2, words: [["妈妈", "mā ma"], ["大妈", "dà mā"]], pic: false, glyph: null, known: false, distract: [["马", "形近"], ["爸", "同题"]] },
"爷": { py: "ye", pyFull: "yé", chNo: 2, words: [["爷爷", "yé ye"], ["老爷", "lǎo yé"]], pic: false, glyph: null, known: false, distract: [["爸", "同题"], ["妈", "同题"]] },
"奶": { py: "nai", pyFull: "nǎi", chNo: 2, words: [["奶奶", "nǎi nai"], ["牛奶", "niú nǎi"], ["奶糖", "nǎi táng"]], pic: false, glyph: null, known: false, distract: [["妈", "同题"], ["爷", "同题"]] },
"家": { py: "jia", pyFull: "jiā", chNo: 2, words: [["大家", "dà jiā"], ["回家", "huí jiā"], ["家人", "jiā rén"]], pic: false, glyph: null, known: false, distract: [["爸", "同题"], ["象", "形近"]] },
"哥": { py: "ge", pyFull: "gē", chNo: 2, words: [["哥哥", "gē ge"], ["大哥", "dà gē"]], pic: false, glyph: null, known: false, distract: [["姐", "同题"], ["歌", "同音"]] },
"姐": { py: "jie", pyFull: "jiě", chNo: 2, words: [["姐姐", "jiě jie"], ["大姐", "dà jiě"]], pic: false, glyph: null, known: false, distract: [["哥", "同题"], ["妹", "同题"]] },
"弟": { py: "di", pyFull: "dì", chNo: 2, words: [["弟弟", "dì di"], ["兄弟", "xiōng dì"]], pic: false, glyph: null, known: false, distract: [["第", "形近"], ["哥", "同题"]] },
"妹": { py: "mei", pyFull: "mèi", chNo: 2, words: [["妹妹", "mèi mei"], ["小妹", "xiǎo mèi"]], pic: false, glyph: null, known: false, distract: [["姐", "同题"], ["味", "形近"]] },
"我": { py: "wo", pyFull: "wǒ", chNo: 2, words: [["我们", "wǒ men"], ["我家", "wǒ jiā"]], pic: false, glyph: null, known: false, distract: [["找", "形近"], ["们", "形近"]] },
"竹": { py: "zhu", pyFull: "zhú", chNo: 2, words: [["竹子", "zhú zi"], ["竹叶", "zhú yè"]], pic: true, glyph: "两根小竹竿，长着尖尖叶", known: false, distract: [["草", "同题"], ["木", "同题"]] },
"草": { py: "cao", pyFull: "cǎo", chNo: 2, words: [["小草", "xiǎo cǎo"], ["草地", "cǎo dì"], ["花草", "huā cǎo"]], pic: false, glyph: null, known: false, distract: [["早", "形近"], ["花", "同题"]] },
"花": { py: "hua", pyFull: "huā", chNo: 2, words: [["小花", "xiǎo huā"], ["花朵", "huā duǒ"], ["开花", "kāi huā"]], pic: false, glyph: null, known: false, distract: [["化", "形近"], ["草", "同题"]] },
"米": { py: "mi", pyFull: "mǐ", chNo: 2, words: [["大米", "dà mǐ"], ["米饭", "mǐ fàn"], ["玉米", "yù mǐ"]], pic: false, glyph: null, known: false, distract: [["来", "形近"], ["面", "同题"]] },
"禾": { py: "he", pyFull: "hé", chNo: 2, words: [["禾苗", "hé miáo"], ["禾田", "hé tián"]], pic: true, glyph: "上面垂着穗，一棵庄稼苗", known: false, distract: [["木", "形近"], ["米", "形近"]] },
"吃": { py: "chi", pyFull: "chī", chNo: 3, words: [["吃饭", "chī fàn"], ["好吃", "hǎo chī"], ["小吃", "xiǎo chī"]], pic: false, glyph: null, known: false, distract: [["喝", "同题"], ["乞", "形近"]] },
"喝": { py: "he2", pyFull: "hē", chNo: 3, words: [["喝水", "hē shuǐ"], ["喝奶", "hē nǎi"]], pic: false, glyph: null, known: false, distract: [["吃", "同题"], ["渴", "形近"]] },
"看": { py: "kan", pyFull: "kàn", chNo: 3, words: [["看见", "kàn jiàn"], ["看书", "kàn shū"], ["好看", "hǎo kàn"]], pic: false, glyph: null, known: false, distract: [["着", "形近"], ["目", "同题"]] },
"听": { py: "ting", pyFull: "tīng", chNo: 3, words: [["听话", "tīng huà"], ["好听", "hǎo tīng"]], pic: false, glyph: null, known: false, distract: [["近", "形近"], ["耳", "同题"]] },
"说": { py: "shuo", pyFull: "shuō", chNo: 3, words: [["说话", "shuō huà"], ["听说", "tīng shuō"]], pic: false, glyph: null, known: false, distract: [["话", "形近"], ["读", "同题"]] },
"走": { py: "zou", pyFull: "zǒu", chNo: 3, words: [["走路", "zǒu lù"], ["走开", "zǒu kāi"]], pic: false, glyph: null, known: false, distract: [["足", "形近"], ["跑", "同题"]] },
"跑": { py: "pao", pyFull: "pǎo", chNo: 3, words: [["跑步", "pǎo bù"], ["快跑", "kuài pǎo"]], pic: false, glyph: null, known: false, distract: [["路", "形近"], ["走", "同题"]] },
"坐": { py: "zuo", pyFull: "zuò", chNo: 3, words: [["坐下", "zuò xià"], ["请坐", "qǐng zuò"]], pic: false, glyph: null, known: false, distract: [["座", "形近"], ["立", "同题"]] },
"立": { py: "li2", pyFull: "lì", chNo: 3, words: [["起立", "qǐ lì"], ["站立", "zhàn lì"], ["立正", "lì zhèng"]], pic: false, glyph: null, known: false, distract: [["力", "同音"], ["坐", "同题"]] },
"飞": { py: "fei", pyFull: "fēi", chNo: 3, words: [["飞机", "fēi jī"], ["飞鸟", "fēi niǎo"], ["飞走", "fēi zǒu"]], pic: false, glyph: null, known: false, distract: [["气", "形近"], ["走", "同题"]] },
"读": { py: "du", pyFull: "dú", chNo: 3, words: [["读书", "dú shū"], ["读一读", "dú yi dú"]], pic: false, glyph: null, known: false, distract: [["卖", "形近"], ["看", "同题"]] },
"写": { py: "xie", pyFull: "xiě", chNo: 3, words: [["写字", "xiě zì"], ["书写", "shū xiě"]], pic: false, glyph: null, known: false, distract: [["与", "形近"], ["字", "同题"]] },
"画": { py: "hua2", pyFull: "huà", chNo: 3, words: [["画画", "huà huà"], ["图画", "tú huà"]], pic: false, glyph: null, known: false, distract: [["田", "形近"], ["花", "同音"]] },
"书": { py: "shu", pyFull: "shū", chNo: 3, words: [["看书", "kàn shū"], ["读书", "dú shū"], ["书本", "shū běn"]], pic: false, glyph: null, known: false, distract: [["本", "形近"], ["画", "同题"]] },
"字": { py: "zi", pyFull: "zì", chNo: 3, words: [["写字", "xiě zì"], ["数字", "shù zì"], ["名字", "míng zi"]], pic: false, glyph: null, known: false, distract: [["子", "形近"], ["文", "同题"]] },
"开": { py: "kai", pyFull: "kāi", chNo: 3, words: [["开门", "kāi mén"], ["开心", "kāi xīn"], ["开车", "kāi chē"]], pic: false, glyph: null, known: false, distract: [["关", "同题"], ["井", "形近"]] },
"关": { py: "guan", pyFull: "guān", chNo: 3, words: [["关门", "guān mén"], ["开关", "kāi guān"], ["关上", "guān shàng"]], pic: false, glyph: null, known: false, distract: [["开", "同题"], ["天", "形近"]] },
"来": { py: "lai", pyFull: "lái", chNo: 3, words: [["来了", "lái le"], ["回来", "huí lái"], ["来去", "lái qù"]], pic: false, glyph: null, known: false, distract: [["米", "形近"], ["去", "同题"]] },
"去": { py: "qu", pyFull: "qù", chNo: 3, words: [["回去", "huí qù"], ["出去", "chū qù"], ["来去", "lái qù"]], pic: false, glyph: null, known: false, distract: [["云", "形近"], ["来", "同题"]] },
"回": { py: "hui", pyFull: "huí", chNo: 3, words: [["回家", "huí jiā"], ["回来", "huí lái"], ["回去", "huí qù"]], pic: false, glyph: null, known: false, distract: [["面", "形近"], ["去", "同题"]] },
"玩": { py: "wan", pyFull: "wán", chNo: 3, words: [["玩具", "wán jù"], ["好玩", "hǎo wán"]], pic: false, glyph: null, known: false, distract: [["完", "形近"], ["晚", "同音"]] },
"笑": { py: "xiao2", pyFull: "xiào", chNo: 3, words: [["大笑", "dà xiào"], ["笑声", "xiào shēng"], ["玩笑", "wán xiào"]], pic: false, glyph: null, known: false, distract: [["哭", "同题"], ["校", "同音"]] },
"哭": { py: "ku", pyFull: "kū", chNo: 3, words: [["大哭", "dà kū"], ["哭声", "kū shēng"], ["哭笑", "kū xiào"]], pic: false, glyph: null, known: false, distract: [["笑", "同题"], ["器", "形近"]] },
"睡": { py: "shui2", pyFull: "shuì", chNo: 3, words: [["睡觉", "shuì jiào"], ["睡着", "shuì zháo"]], pic: false, glyph: null, known: false, distract: [["垂", "形近"], ["水", "同音"]] },
"梦": { py: "meng", pyFull: "mèng", chNo: 3, words: [["做梦", "zuò mèng"], ["梦里", "mèng lǐ"], ["美梦", "měi mèng"]], pic: false, glyph: null, known: false, distract: [["晚", "同题"], ["床", "同题"]] },
"明": { py: "ming", pyFull: "míng", chNo: 4, words: [["明天", "míng tiān"], ["明白", "míng bai"], ["光明", "guāng míng"]], pic: false, glyph: null, known: false, distract: [["朋", "形近"], ["名", "同音"]] },
"林": { py: "lin", pyFull: "lín", chNo: 4, words: [["树林", "shù lín"], ["竹林", "zhú lín"], ["林子", "lín zi"]], pic: false, glyph: null, known: false, distract: [["森", "形近"], ["木", "同题"]] },
"森": { py: "sen", pyFull: "sēn", chNo: 4, words: [["森林", "sēn lín"], ["大森林", "dà sēn lín"]], pic: false, glyph: null, known: false, distract: [["林", "形近"], ["木", "同题"]] },
"从": { py: "cong", pyFull: "cóng", chNo: 4, words: [["从前", "cóng qián"], ["从来", "cóng lái"]], pic: false, glyph: null, known: false, distract: [["众", "形近"], ["丛", "形近"]] },
"众": { py: "zhong", pyFull: "zhòng", chNo: 4, words: [["大众", "dà zhòng"], ["众人", "zhòng rén"]], pic: false, glyph: null, known: false, distract: [["从", "形近"], ["中", "同音"]] },
"清": { py: "qing2", pyFull: "qīng", chNo: 4, words: [["清水", "qīng shuǐ"], ["清凉", "qīng liáng"]], pic: false, glyph: null, known: false, distract: [["晴", "形近"], ["请", "形近"]] },
"河": { py: "he3", pyFull: "hé", chNo: 4, words: [["小河", "xiǎo hé"], ["河水", "hé shuǐ"], ["江河", "jiāng hé"]], pic: false, glyph: null, known: false, distract: [["湖", "同题"], ["何", "同音"]] },
"湖": { py: "hu", pyFull: "hú", chNo: 4, words: [["湖水", "hú shuǐ"], ["大湖", "dà hú"]], pic: false, glyph: null, known: false, distract: [["河", "同题"], ["胡", "同音"]] },
"星": { py: "xing", pyFull: "xīng", chNo: 4, words: [["星星", "xīng xing"], ["星光", "xīng guāng"], ["火星", "huǒ xīng"]], pic: false, glyph: null, known: false, distract: [["生", "形近"], ["云", "同题"]] },
"亮": { py: "liang", pyFull: "liàng", chNo: 4, words: [["月亮", "yuè liang"], ["光亮", "guāng liàng"], ["明亮", "míng liàng"]], pic: false, glyph: null, known: false, distract: [["高", "形近"], ["光", "同题"]] },
"请": { py: "qing3", pyFull: "qǐng", chNo: 4, words: [["请坐", "qǐng zuò"], ["请问", "qǐng wèn"], ["请客", "qǐng kè"]], pic: false, glyph: null, known: false, distract: [["清", "形近"], ["情", "形近"]] },
"他": { py: "ta", pyFull: "tā", chNo: 4, words: [["他们", "tā men"], ["他家", "tā jiā"]], pic: false, glyph: null, known: false, distract: [["她", "形近"], ["地", "形近"]] },
"男": { py: "nan", pyFull: "nán", chNo: 4, words: [["男孩", "nán hái"], ["男生", "nán shēng"], ["男女", "nán nǚ"]], pic: false, glyph: null, known: false, distract: [["女", "同题"], ["儿", "同题"]] },
"女": { py: "nv", pyFull: "nǚ", chNo: 4, words: [["女孩", "nǚ hái"], ["女生", "nǚ shēng"]], pic: false, glyph: null, known: false, distract: [["男", "同题"], ["子", "同题"]] },
"地": { py: "di2", pyFull: "dì", chNo: 4, words: [["大地", "dà dì"], ["地上", "dì shàng"], ["土地", "tǔ dì"]], pic: false, glyph: null, known: false, distract: [["他", "形近"], ["她", "形近"], ["弟", "同音"]] },
"情": { py: "qing4", pyFull: "qíng", chNo: 4, words: [["心情", "xīn qíng"], ["事情", "shì qíng"], ["友情", "yǒu qíng"]], pic: false, glyph: null, known: false, distract: [["晴", "形近"], ["请", "形近"]] },
"她": { py: "ta2", pyFull: "tā", chNo: 4, words: [["她们", "tā men"], ["是她", "shì tā"]], pic: false, glyph: null, known: false, distract: [["他", "形近"], ["地", "形近"]] },
"光": { py: "guang", pyFull: "guāng", chNo: 4, words: [["月光", "yuè guāng"], ["灯光", "dēng guāng"], ["阳光", "yáng guāng"]], pic: false, glyph: null, known: false, distract: [["亮", "同题"], ["晃", "形近"]] },
"早": { py: "zao", pyFull: "zǎo", chNo: 4, words: [["早上", "zǎo shang"], ["早晚", "zǎo wǎn"], ["早安", "zǎo ān"]], pic: false, glyph: null, known: false, distract: [["草", "形近"], ["晚", "同题"]] },
"晚": { py: "wan2", pyFull: "wǎn", chNo: 4, words: [["晚上", "wǎn shang"], ["晚安", "wǎn ān"], ["早晚", "zǎo wǎn"]], pic: false, glyph: null, known: false, distract: [["玩", "同音"], ["早", "同题"]] },
"老": { py: "lao", pyFull: "lǎo", chNo: 4, words: [["老师", "lǎo shī"], ["老人", "lǎo rén"], ["老牛", "lǎo niú"]], pic: false, glyph: null, known: false, distract: [["考", "形近"], ["师", "同题"]] },
"师": { py: "shi2", pyFull: "shī", chNo: 4, words: [["老师", "lǎo shī"], ["大师", "dà shī"]], pic: false, glyph: null, known: false, distract: [["帅", "形近"], ["石", "同音"]] },
"学": { py: "xue", pyFull: "xué", chNo: 4, words: [["上学", "shàng xué"], ["学习", "xué xí"], ["学校", "xué xiào"]], pic: false, glyph: null, known: false, distract: [["校", "同题"], ["字", "同题"]] },
"校": { py: "xiao3", pyFull: "xiào", chNo: 4, words: [["学校", "xué xiào"], ["校长", "xiào zhǎng"], ["校园", "xiào yuán"]], pic: false, glyph: null, known: false, distract: [["学", "同题"], ["笑", "同音"]] },
"孩": { py: "hai", pyFull: "hái", chNo: 4, words: [["孩子", "hái zi"], ["小孩", "xiǎo hái"], ["女孩", "nǚ hái"]], pic: false, glyph: null, known: false, distract: [["子", "同题"], ["娃", "同题"]] },
"一": { py: "yi", pyFull: "yī", chNo: 5, words: [["一起", "yì qǐ"], ["一个", "yí gè"], ["第一", "dì yī"]], pic: false, glyph: null, known: false, distract: [["二", "同题"], ["十", "同题"]] },
"二": { py: "er2", pyFull: "èr", chNo: 5, words: [["二十", "èr shí"], ["第二", "dì èr"]], pic: false, glyph: null, known: false, distract: [["三", "同题"], ["耳", "同音"]] },
"三": { py: "san", pyFull: "sān", chNo: 5, words: [["三个", "sān gè"], ["三十", "sān shí"]], pic: true, glyph: "三根长横线，数到三就是它", known: false, distract: [["二", "同题"], ["川", "形近"]] },
"四": { py: "si", pyFull: "sì", chNo: 5, words: [["四个", "sì gè"], ["四十", "sì shí"]], pic: false, glyph: null, known: false, distract: [["西", "形近"], ["五", "同题"]] },
"五": { py: "wu", pyFull: "wǔ", chNo: 5, words: [["五个", "wǔ gè"], ["五十", "wǔ shí"]], pic: false, glyph: null, known: false, distract: [["四", "同题"], ["六", "同题"]] },
"六": { py: "liu", pyFull: "liù", chNo: 5, words: [["六个", "liù gè"], ["六十", "liù shí"]], pic: false, glyph: null, known: false, distract: [["四", "同题"], ["大", "形近"]] },
"七": { py: "qi", pyFull: "qī", chNo: 5, words: [["七个", "qī gè"], ["七十", "qī shí"]], pic: false, glyph: null, known: false, distract: [["十", "形近"], ["八", "同题"]] },
"八": { py: "ba2", pyFull: "bā", chNo: 5, words: [["八个", "bā gè"], ["八十", "bā shí"]], pic: false, glyph: null, known: false, distract: [["人", "形近"], ["爸", "同音"]] },
"九": { py: "jiu", pyFull: "jiǔ", chNo: 5, words: [["九个", "jiǔ gè"], ["九十", "jiǔ shí"]], pic: false, glyph: null, known: false, distract: [["丸", "形近"], ["久", "同音"]] },
"十": { py: "shi3", pyFull: "shí", chNo: 5, words: [["十个", "shí gè"], ["十一", "shí yī"]], pic: false, glyph: null, known: false, distract: [["七", "形近"], ["石", "同音"]] },
"里": { py: "li3", pyFull: "lǐ", chNo: 5, words: [["里面", "lǐ miàn"], ["田里", "tián lǐ"], ["里头", "lǐ tou"]], pic: false, glyph: null, known: false, distract: [["外", "同题"], ["力", "同音"]] },
"外": { py: "wai", pyFull: "wài", chNo: 5, words: [["外面", "wài miàn"], ["门外", "mén wài"]], pic: false, glyph: null, known: false, distract: [["处", "形近"], ["里", "同题"]] },
"前": { py: "qian", pyFull: "qián", chNo: 5, words: [["前面", "qián miàn"], ["门前", "mén qián"], ["从前", "cóng qián"]], pic: false, glyph: null, known: false, distract: [["后", "同题"], ["剪", "形近"]] },
"后": { py: "hou", pyFull: "hòu", chNo: 5, words: [["后面", "hòu miàn"], ["后头", "hòu tou"], ["后来", "hòu lái"]], pic: false, glyph: null, known: false, distract: [["前", "同题"], ["向", "形近"]] },
"中": { py: "zhong2", pyFull: "zhōng", chNo: 5, words: [["中间", "zhōng jiān"], ["心中", "xīn zhōng"], ["水中", "shuǐ zhōng"]], pic: false, glyph: null, known: false, distract: [["虫", "形近"], ["众", "同音"]] },
"风": { py: "feng", pyFull: "fēng", chNo: 5, words: [["大风", "dà fēng"], ["风雨", "fēng yǔ"]], pic: false, glyph: null, known: false, distract: [["凤", "形近"], ["飞", "同题"]] },
"雪": { py: "xue2", pyFull: "xuě", chNo: 5, words: [["下雪", "xià xuě"], ["雪人", "xuě rén"], ["雪花", "xuě huā"]], pic: false, glyph: null, known: false, distract: [["雷", "形近"], ["雨", "同题"]] },
"海": { py: "hai2", pyFull: "hǎi", chNo: 5, words: [["大海", "dà hǎi"], ["海水", "hǎi shuǐ"], ["海边", "hǎi biān"]], pic: false, glyph: null, known: false, distract: [["每", "形近"], ["孩", "同音"]] },
"春": { py: "chun", pyFull: "chūn", chNo: 5, words: [["春天", "chūn tiān"], ["春风", "chūn fēng"]], pic: false, glyph: null, known: false, distract: [["夏", "同题"], ["秋", "同题"]] },
"夏": { py: "xia2", pyFull: "xià", chNo: 5, words: [["夏天", "xià tiān"], ["夏夜", "xià yè"]], pic: false, glyph: null, known: false, distract: [["春", "同题"], ["冬", "同题"], ["下", "同音"]] },
"秋": { py: "qiu", pyFull: "qiū", chNo: 5, words: [["秋天", "qiū tiān"], ["秋风", "qiū fēng"], ["中秋", "zhōng qiū"]], pic: false, glyph: null, known: false, distract: [["伙", "形近"], ["春", "同题"]] },
"冬": { py: "dong", pyFull: "dōng", chNo: 5, words: [["冬天", "dōng tiān"], ["过冬", "guò dōng"]], pic: false, glyph: null, known: false, distract: [["夏", "同题"], ["秋", "同题"]] },
"鸡": { py: "ji", pyFull: "jī", chNo: 5, words: [["小鸡", "xiǎo jī"], ["公鸡", "gōng jī"], ["母鸡", "mǔ jī"]], pic: false, glyph: null, known: false, distract: [["鸟", "同题"], ["鸭", "同题"]] },
"鸭": { py: "ya2", pyFull: "yā", chNo: 5, words: [["鸭子", "yā zi"], ["小鸭", "xiǎo yā"]], pic: false, glyph: null, known: false, distract: [["鸡", "同题"], ["甲", "形近"]] },
"兔": { py: "tu", pyFull: "tù", chNo: 5, words: [["兔子", "tù zi"], ["小白兔", "xiǎo bái tù"]], pic: false, glyph: null, known: false, distract: [["免", "形近"], ["猫", "同题"]] },
"象": { py: "xiang", pyFull: "xiàng", chNo: 5, words: [["大象", "dà xiàng"], ["小象", "xiǎo xiàng"]], pic: false, glyph: null, known: false, distract: [["像", "形近"], ["家", "形近"]] },
"龙": { py: "long", pyFull: "lóng", chNo: 5, words: [["小龙", "xiǎo lóng"], ["恐龙", "kǒng lóng"], ["龙船", "lóng chuán"]], pic: false, glyph: null, known: false, distract: [["尤", "形近"], ["凤", "同题"]] },
"儿": { py: "er3", pyFull: "ér", chNo: 5, words: [["儿子", "ér zi"], ["儿童", "ér tóng"], ["花儿", "huā ér"]], pic: false, glyph: null, known: false, distract: [["几", "形近"], ["二", "同音"]] },
"友": { py: "you", pyFull: "yǒu", chNo: 5, words: [["朋友", "péng you"], ["好友", "hǎo yǒu"], ["友爱", "yǒu ài"]], pic: false, glyph: null, known: false, distract: [["反", "形近"], ["有", "同音"]] },
"名": { py: "ming2", pyFull: "míng", chNo: 5, words: [["名字", "míng zi"], ["有名", "yǒu míng"], ["名人", "míng rén"]], pic: false, glyph: null, known: false, distract: [["各", "形近"], ["明", "同音"]] },
"问": { py: "wen", pyFull: "wèn", chNo: 5, words: [["问好", "wèn hǎo"], ["学问", "xué wèn"], ["问一问", "wèn yi wèn"]], pic: false, glyph: null, known: false, distract: [["门", "形近"], ["间", "形近"]] },
"答": { py: "da2", pyFull: "dá", chNo: 5, words: [["回答", "huí dá"], ["问答", "wèn dá"]], pic: false, glyph: null, known: false, distract: [["塔", "形近"], ["大", "同音"]] },
"找": { py: "zhao", pyFull: "zhǎo", chNo: 5, words: [["找到", "zhǎo dào"], ["找一找", "zhǎo yi zhǎo"]], pic: false, glyph: null, known: false, distract: [["我", "形近"], ["打", "形近"]] },
"给": { py: "gei", pyFull: "gěi", chNo: 5, words: [["给你", "gěi nǐ"], ["送给", "sòng gěi"]], pic: false, glyph: null, known: false, distract: [["结", "形近"], ["细", "形近"]] },
"送": { py: "song", pyFull: "sòng", chNo: 5, words: [["送花", "sòng huā"], ["送给", "sòng gěi"]], pic: false, glyph: null, known: false, distract: [["关", "形近"], ["远", "形近"]] },
"拿": { py: "na", pyFull: "ná", chNo: 5, words: [["拿走", "ná zǒu"], ["拿来", "ná lái"], ["拿起", "ná qǐ"]], pic: false, glyph: null, known: false, distract: [["合", "形近"], ["盒", "形近"]] },
"帮": { py: "bang", pyFull: "bāng", chNo: 5, words: [["帮忙", "bāng máng"], ["帮手", "bāng shǒu"]], pic: false, glyph: null, known: false, distract: [["邦", "形近"], ["拉", "同题"]] },
"车": { py: "che", pyFull: "chē", chNo: 5, words: [["火车", "huǒ chē"], ["马车", "mǎ chē"], ["开车", "kāi chē"]], pic: false, glyph: null, known: false, distract: [["东", "形近"], ["轮", "同题"]] },
"衣": { py: "yi2", pyFull: "yī", chNo: 5, words: [["衣服", "yī fu"], ["大衣", "dà yī"], ["毛衣", "máo yī"]], pic: false, glyph: null, known: false, distract: [["农", "形近"], ["一", "同音"]] },
"饭": { py: "fan", pyFull: "fàn", chNo: 5, words: [["吃饭", "chī fàn"], ["米饭", "mǐ fàn"], ["早饭", "zǎo fàn"]], pic: false, glyph: null, known: false, distract: [["板", "形近"], ["吃", "同题"]] },
"菜": { py: "cai", pyFull: "cài", chNo: 5, words: [["青菜", "qīng cài"], ["买菜", "mǎi cài"]], pic: false, glyph: null, known: false, distract: [["茶", "形近"], ["彩", "同音"]] },
"灯": { py: "deng", pyFull: "dēng", chNo: 5, words: [["电灯", "diàn dēng"], ["开灯", "kāi dēng"], ["灯笼", "dēng long"]], pic: false, glyph: null, known: false, distract: [["登", "形近"], ["光", "同题"]] },
"高": { py: "gao", pyFull: "gāo", chNo: 5, words: [["高大", "gāo dà"], ["高兴", "gāo xìng"], ["高山", "gāo shān"]], pic: false, glyph: null, known: false, distract: [["亮", "形近"], ["矮", "同题"]] },
"长": { py: "chang", pyFull: "cháng", chNo: 5, words: [["长江", "cháng jiāng"], ["长长", "cháng cháng"], ["长大", "zhǎng dà"]], pic: false, glyph: null, known: false, distract: [["张", "同音"], ["短", "同题"]] },
"快": { py: "kuai", pyFull: "kuài", chNo: 5, words: [["快跑", "kuài pǎo"], ["快乐", "kuài lè"], ["飞快", "fēi kuài"]], pic: false, glyph: null, known: false, distract: [["块", "同音"], ["慢", "同题"]] },
"多": { py: "duo", pyFull: "duō", chNo: 5, words: [["多少", "duō shǎo"], ["很多", "hěn duō"]], pic: false, glyph: null, known: false, distract: [["夜", "形近"], ["少", "同题"]] },
"今": { py: "jin", pyFull: "jīn", chNo: 5, words: [["今天", "jīn tiān"], ["今年", "jīn nián"]], pic: false, glyph: null, known: false, distract: [["令", "形近"], ["斤", "同音"]] },
"年": { py: "nian", pyFull: "nián", chNo: 5, words: [["今年", "jīn nián"], ["新年", "xīn nián"], ["过年", "guò nián"]], pic: false, glyph: null, known: false, distract: [["今", "同题"], ["岁", "同题"]] },
"床": { py: "chuang", pyFull: "chuáng", chNo: 5, words: [["上床", "shàng chuáng"], ["小床", "xiǎo chuáng"], ["起床", "qǐ chuáng"]], pic: false, glyph: null, known: false, distract: [["麻", "形近"], ["梦", "同题"]] },
"伞": { py: "san2", pyFull: "sǎn", chNo: 5, words: [["雨伞", "yǔ sǎn"], ["打伞", "dǎ sǎn"], ["小伞", "xiǎo sǎn"]], pic: false, glyph: null, known: false, distract: [["个", "形近"], ["三", "形近"]] },
};

/* ---------- 静态 20 关谱（flat 0-19；review=确定性复习字；sentence=本关句子） ---------- */
const LEVELS = [
  { flat: 0, ch: 1, lv: 0, newChars: ["天", "日", "上", "下", "晴"], review: [], sentence: {"text": "你是我的，我是你的", "charsUsed": ["你", "我", "是", "的"]} },
  { flat: 1, ch: 1, lv: 1, newChars: ["月", "水", "火", "山", "人"], review: [], sentence: {"text": "天上有日就是晴天", "charsUsed": ["上", "天", "就", "日", "是", "晴", "有"]} },
  { flat: 2, ch: 1, lv: 2, newChars: ["口", "木", "大", "小", "云"], review: ["月", "水", "山"], sentence: {"text": "天上有日，山上有火", "charsUsed": ["上", "天", "山", "日", "有", "火"]} },
  { flat: 3, ch: 1, lv: 3, newChars: ["田", "石", "马", "鸟", "鱼"], review: ["木", "大", "云", "天", "日"], sentence: {"text": "天上有云，山下有水", "charsUsed": ["上", "下", "云", "天", "山", "有", "水"]} },
  { flat: 4, ch: 1, lv: 4, newChars: ["雨", "门", "手", "力", "毛"], review: ["马", "鸟", "鱼", "水", "火"], sentence: {"text": "山上有小马和小鸟", "charsUsed": ["上", "和", "小", "山", "有", "马", "鸟"]} },
  { flat: 5, ch: 2, lv: 0, newChars: ["狗", "猫", "牛", "羊", "虫"], review: [], sentence: {"text": "下雨啦，天上有云", "charsUsed": ["上", "下", "云", "啦", "天", "有", "雨"]} },
  { flat: 6, ch: 2, lv: 1, newChars: ["目", "耳", "足", "头", "牙"], review: [], sentence: {"text": "小牛和小马在山上", "charsUsed": ["上", "和", "在", "小", "山", "牛", "马"]} },
  { flat: 7, ch: 2, lv: 2, newChars: ["爸", "妈", "爷", "奶", "家"], review: ["目", "耳", "头"], sentence: {"text": "大手和小手", "charsUsed": ["和", "大", "小", "手"]} },
  { flat: 8, ch: 2, lv: 3, newChars: ["哥", "姐", "弟", "妹", "我"], review: ["爸", "妈", "家", "牛", "羊"], sentence: {"text": "我家有爸和妈", "charsUsed": ["和", "妈", "家", "我", "有", "爸"]} },
  { flat: 9, ch: 2, lv: 4, newChars: ["竹", "草", "花", "米", "禾"], review: ["哥", "弟", "我", "足", "牙", "口", "小"], sentence: {"text": "哥哥和我在家", "charsUsed": ["和", "哥", "在", "家", "我"]} },
  { flat: 10, ch: 3, lv: 0, newChars: ["吃", "喝", "看", "听", "说"], review: [], sentence: {"text": "山上有花有草", "charsUsed": ["上", "山", "有", "花", "草"]} },
  { flat: 11, ch: 3, lv: 1, newChars: ["走", "跑", "坐", "立", "飞"], review: [], sentence: {"text": "我看小鱼喝水", "charsUsed": ["喝", "小", "我", "水", "看", "鱼"]} },
  { flat: 12, ch: 3, lv: 2, newChars: ["读", "写", "画", "书", "字"], review: ["走", "坐", "飞"], sentence: {"text": "小鸟飞，小马跑", "charsUsed": ["小", "跑", "飞", "马", "鸟"]} },
  { flat: 13, ch: 3, lv: 3, newChars: ["开", "关", "来", "去", "回"], review: ["读", "书", "字", "吃", "喝"], sentence: {"text": "哥哥写字，我看书", "charsUsed": ["书", "写", "哥", "字", "我", "看"]} },
  { flat: 14, ch: 3, lv: 4, newChars: ["玩", "笑", "哭", "睡", "梦"], review: ["开", "来", "去", "跑", "立", "爷", "奶"], sentence: {"text": "爸爸回家，我开门", "charsUsed": ["回", "家", "开", "我", "爸", "门"]} },
  { flat: 15, ch: 4, lv: 0, newChars: ["明", "林", "森", "从", "众"], review: [], sentence: {"text": "我和妹妹在家玩", "charsUsed": ["和", "在", "妹", "家", "我", "玩"]} },
  { flat: 16, ch: 4, lv: 1, newChars: ["清", "河", "湖", "星", "亮"], review: [], sentence: {"text": "云在天上飞", "charsUsed": ["上", "云", "在", "天", "飞"]} },
  { flat: 17, ch: 4, lv: 2, newChars: ["请", "他", "男", "女", "地"], review: ["清", "河", "湖"], sentence: {"text": "山下有小河", "charsUsed": ["下", "小", "山", "有", "河"]} },
  { flat: 18, ch: 4, lv: 3, newChars: ["情", "她", "光", "早", "晚"], review: ["他", "男", "女", "明", "林"], sentence: {"text": "他的马好大", "charsUsed": ["他", "大", "好", "的", "马"]} },
  { flat: 19, ch: 4, lv: 4, newChars: ["老", "师", "学", "校", "孩"], review: ["光", "早", "晚", "星", "亮", "写", "画"], sentence: {"text": "晚上，天上有星星", "charsUsed": ["上", "天", "星", "晚", "有"]} },
];

/* ---------- 生成关引入池（50 字，flat≥20 每关引入前 2 个未引入字） ---------- */
const GEN_POOL = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "里", "外", "前", "后", "中", "风", "雪", "海", "春", "夏", "秋", "冬", "鸡", "鸭", "兔", "象", "龙", "儿", "友", "名", "问", "答", "找", "给", "送", "拿", "帮", "车", "衣", "饭", "菜", "灯", "高", "长", "快", "多", "今", "年", "床", "伞"];

/* ---------- 20 句（afterFlat=0-19 与 LEVELS[].sentence 同源对账） ---------- */
const SENTENCES = [{"text": "你是我的，我是你的", "afterFlat": 0, "charsUsed": ["你", "我", "是", "的"]}, {"text": "天上有日就是晴天", "afterFlat": 1, "charsUsed": ["上", "天", "就", "日", "是", "晴", "有"]}, {"text": "天上有日，山上有火", "afterFlat": 2, "charsUsed": ["上", "天", "山", "日", "有", "火"]}, {"text": "天上有云，山下有水", "afterFlat": 3, "charsUsed": ["上", "下", "云", "天", "山", "有", "水"]}, {"text": "山上有小马和小鸟", "afterFlat": 4, "charsUsed": ["上", "和", "小", "山", "有", "马", "鸟"]}, {"text": "下雨啦，天上有云", "afterFlat": 5, "charsUsed": ["上", "下", "云", "啦", "天", "有", "雨"]}, {"text": "小牛和小马在山上", "afterFlat": 6, "charsUsed": ["上", "和", "在", "小", "山", "牛", "马"]}, {"text": "大手和小手", "afterFlat": 7, "charsUsed": ["和", "大", "小", "手"]}, {"text": "我家有爸和妈", "afterFlat": 8, "charsUsed": ["和", "妈", "家", "我", "有", "爸"]}, {"text": "哥哥和我在家", "afterFlat": 9, "charsUsed": ["和", "哥", "在", "家", "我"]}, {"text": "山上有花有草", "afterFlat": 10, "charsUsed": ["上", "山", "有", "花", "草"]}, {"text": "我看小鱼喝水", "afterFlat": 11, "charsUsed": ["喝", "小", "我", "水", "看", "鱼"]}, {"text": "小鸟飞，小马跑", "afterFlat": 12, "charsUsed": ["小", "跑", "飞", "马", "鸟"]}, {"text": "哥哥写字，我看书", "afterFlat": 13, "charsUsed": ["书", "写", "哥", "字", "我", "看"]}, {"text": "爸爸回家，我开门", "afterFlat": 14, "charsUsed": ["回", "家", "开", "我", "爸", "门"]}, {"text": "我和妹妹在家玩", "afterFlat": 15, "charsUsed": ["和", "在", "妹", "家", "我", "玩"]}, {"text": "云在天上飞", "afterFlat": 16, "charsUsed": ["上", "云", "在", "天", "飞"]}, {"text": "山下有小河", "afterFlat": 17, "charsUsed": ["下", "小", "山", "有", "河"]}, {"text": "他的马好大", "afterFlat": 18, "charsUsed": ["他", "大", "好", "的", "马"]}, {"text": "晚上，天上有星星", "afterFlat": 19, "charsUsed": ["上", "天", "星", "晚", "有"]}];

/* ---------- 复习曲线表（1/3/7 关隔适用关清单；各关实际复习字在 LEVELS[].review） ---------- */
const REVIEW_SCHED = {"1": [2, 3, 4, 7, 8, 9, 12, 13, 14, 17, 18, 19], "3": [3, 4, 8, 9, 13, 14, 18, 19], "7": [9, 14, 19]};

/* ---------- 象形 SVG（26 字，自 batch8/picto 按字面复制；ev=更古形态，8 字有） ---------- */
const PICTO = {
"天": { ev: null, svg: "<path d=\"M28 10 H72\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"7\" stroke-linecap=\"round\"/><circle cx=\"50\" cy=\"28\" r=\"7\" fill=\"#5A4632\"/><path d=\"M50 22 V60\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"8\" stroke-linecap=\"round\"/><path d=\"M50 36 Q30 30 18 18 M50 36 Q70 30 82 18\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"7\" stroke-linecap=\"round\"/><path d=\"M50 60 Q36 76 30 92 M50 60 Q64 76 70 92\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"7\" stroke-linecap=\"round\"/>" },
"日": { ev: "<circle cx=\"50\" cy=\"50\" r=\"33\" fill=\"#F2D8A8\" stroke=\"#5A4632\" stroke-width=\"7\"/><circle cx=\"50\" cy=\"50\" r=\"8\" fill=\"#5A4632\"/>", svg: "<rect x=\"18\" y=\"18\" width=\"64\" height=\"64\" rx=\"18\" fill=\"#F2D8A8\" stroke=\"#5A4632\" stroke-width=\"7.5\"/><circle cx=\"50\" cy=\"50\" r=\"7.5\" fill=\"#5A4632\"/>" },
"月": { ev: null, svg: "<path d=\"M65 8 C34 14 14 32 14 50 C14 68 34 86 65 92 C44 80 36 66 36 50 C36 34 44 20 65 8 Z\" fill=\"#F2D8A8\" stroke=\"#5A4632\" stroke-width=\"6.5\" stroke-linejoin=\"round\"/><path d=\"M44 38 v16\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6\" stroke-linecap=\"round\"/>" },
"水": { ev: null, svg: "<path d=\"M50 8 q12 14 0 28 q-12 14 0 28 q12 14 0 28\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"7\" stroke-linecap=\"round\"/><path d=\"M28 24 q-9 8 -6 19 M28 54 q-9 8 -6 19 M72 24 q9 8 6 19 M72 54 q9 8 6 19\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6.5\" stroke-linecap=\"round\"/>" },
"火": { ev: null, svg: "<path d=\"M50 8 Q64 26 60 44 Q57 62 50 88 Q43 62 40 44 Q36 26 50 8 Z\" fill=\"#E8975A\" stroke=\"#5A4632\" stroke-width=\"6\" stroke-linejoin=\"round\"/><path d=\"M24 34 q-2 12 6 22 M76 34 q2 12 -6 22\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6.5\" stroke-linecap=\"round\"/>" },
"山": { ev: null, svg: "<path d=\"M6 84 L24 30 L38 62 L50 20 L62 62 L76 30 L94 84 Z\" fill=\"#D9B98A\" stroke=\"#5A4632\" stroke-width=\"6.5\" stroke-linejoin=\"round\"/>" },
"人": { ev: null, svg: "<path d=\"M38 10 Q56 24 46 88\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"8\" stroke-linecap=\"round\"/><path d=\"M42 26 Q66 36 78 58\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"8\" stroke-linecap=\"round\"/>" },
"口": { ev: "<path d=\"M14 40 Q50 72 86 40 Q50 88 14 40 Z\" fill=\"#EFE0BC\" stroke=\"#5A4632\" stroke-width=\"7\" stroke-linejoin=\"round\"/>", svg: "<rect x=\"20\" y=\"20\" width=\"60\" height=\"60\" rx=\"10\" fill=\"#EFE0BC\" stroke=\"#5A4632\" stroke-width=\"8\"/>" },
"木": { ev: "<path d=\"M52 6 C46 34 56 64 50 94\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"7.5\" stroke-linecap=\"round\"/><path d=\"M50 34 Q32 24 24 8 M50 34 Q68 24 76 8 M50 60 Q32 72 24 90 M50 60 Q68 72 76 90\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6.5\" stroke-linecap=\"round\"/><path d=\"M24 8 q-8 2 -10 10 M76 8 q8 2 10 10\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6\" stroke-linecap=\"round\"/>", svg: "<path d=\"M50 8 V92\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"7.5\" stroke-linecap=\"round\"/><path d=\"M50 42 Q32 30 24 14 M50 42 Q68 30 76 14 M50 58 Q32 70 24 86 M50 58 Q68 70 76 86\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6.5\" stroke-linecap=\"round\"/>" },
"大": { ev: null, svg: "<path d=\"M50 10 V58\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"8\" stroke-linecap=\"round\"/><path d=\"M50 30 Q28 24 14 12 M50 30 Q72 24 86 12\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"8\" stroke-linecap=\"round\"/><path d=\"M50 58 Q36 74 30 92 M50 58 Q64 74 70 92\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"8\" stroke-linecap=\"round\"/>" },
"小": { ev: null, svg: "<path d=\"M50 20 V80\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"8\" stroke-linecap=\"round\"/><path d=\"M26 38 Q33 45 39 52 M74 38 Q67 45 61 52\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"7\" stroke-linecap=\"round\"/>" },
"云": { ev: null, svg: "<path d=\"M30 18 H72\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"7.5\" stroke-linecap=\"round\"/><path d=\"M22 38 H80\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"7.5\" stroke-linecap=\"round\"/><path d=\"M34 58 Q52 74 70 58 Q62 72 44 68\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"7\" stroke-linecap=\"round\"/>" },
"田": { ev: "<rect x=\"14\" y=\"14\" width=\"72\" height=\"72\" rx=\"18\" fill=\"#EFE0BC\" stroke=\"#5A4632\" stroke-width=\"7\"/><path d=\"M50 14 Q44 50 50 86 M14 50 Q50 44 86 50\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6.5\" stroke-linecap=\"round\"/>", svg: "<rect x=\"18\" y=\"18\" width=\"64\" height=\"64\" rx=\"8\" fill=\"#EFE0BC\" stroke=\"#5A4632\" stroke-width=\"8\"/><path d=\"M50 18 V82 M18 50 H82\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6.5\" stroke-linecap=\"round\"/>" },
"石": { ev: null, svg: "<path d=\"M12 20 H66 L38 54\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><rect x=\"40\" y=\"58\" width=\"40\" height=\"28\" rx=\"9\" fill=\"#EFE0BC\" stroke=\"#5A4632\" stroke-width=\"8\"/>" },
"马": { ev: "<ellipse cx=\"55\" cy=\"52\" rx=\"26\" ry=\"16\" fill=\"#EFE0BC\" stroke=\"#5A4632\" stroke-width=\"6.5\"/><path d=\"M36 46 Q28 30 34 16 L46 20 Q46 34 44 44\" fill=\"#EFE0BC\" stroke=\"#5A4632\" stroke-width=\"6.5\" stroke-linejoin=\"round\"/><circle cx=\"38\" cy=\"18\" r=\"3\" fill=\"#5A4632\"/><path d=\"M34 20 Q26 30 28 40\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6\" stroke-linecap=\"round\"/><path d=\"M42 66 V88 M54 68 V90 M66 66 V88\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6.5\" stroke-linecap=\"round\"/><path d=\"M80 50 Q94 40 90 26\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6\" stroke-linecap=\"round\"/>", svg: "<path d=\"M30 14 Q44 6 50 16 Q52 28 49 38 L44 50 L38 48 Q34 34 30 14 Z\" fill=\"#EFE0BC\" stroke=\"#5A4632\" stroke-width=\"6.5\" stroke-linejoin=\"round\"/><path d=\"M33 12 L30 6\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6\" stroke-linecap=\"round\"/><circle cx=\"41\" cy=\"16\" r=\"3.5\" fill=\"#5A4632\"/><path d=\"M31 16 Q24 26 26 38 M35 24 Q30 32 31 42\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6\" stroke-linecap=\"round\"/><ellipse cx=\"58\" cy=\"54\" rx=\"24\" ry=\"15\" fill=\"#EFE0BC\" stroke=\"#5A4632\" stroke-width=\"6.5\"/><path d=\"M42 66 V90 M54 68 V92 M66 66 V90 M76 62 V86\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6.5\" stroke-linecap=\"round\"/><path d=\"M80 46 Q94 56 90 74\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6\" stroke-linecap=\"round\"/>" },
"鸟": { ev: "<path d=\"M14 34 Q22 12 44 16 Q56 8 62 18 L74 24 L62 30 Q66 44 58 54 Q48 68 30 62 Q16 54 14 34 Z\" fill=\"#EFE0BC\" stroke=\"#5A4632\" stroke-width=\"6.5\" stroke-linejoin=\"round\"/><circle cx=\"46\" cy=\"26\" r=\"4\" fill=\"#5A4632\"/><path d=\"M40 66 V84 M56 66 V84\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6\" stroke-linecap=\"round\"/><path d=\"M58 52 Q76 58 82 74\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6\" stroke-linecap=\"round\"/>", svg: "<path d=\"M10 30 L26 24 Q40 10 50 26 Q76 20 82 42 Q84 58 64 62 Q40 66 28 50 Q18 40 10 30 Z\" fill=\"#EFE0BC\" stroke=\"#5A4632\" stroke-width=\"6\" stroke-linejoin=\"round\"/><circle cx=\"34\" cy=\"28\" r=\"4.5\" fill=\"#5A4632\"/><path d=\"M40 14 q-2 -6 -8 -8\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6\" stroke-linecap=\"round\"/><path d=\"M78 52 Q92 66 88 86\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6.5\" stroke-linecap=\"round\"/><path d=\"M42 64 V82 M56 64 V82\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6\" stroke-linecap=\"round\"/>" },
"鱼": { ev: null, svg: "<path d=\"M10 50 Q26 32 50 32 Q72 34 78 50 Q72 66 50 68 Q26 68 10 50 Z\" fill=\"#EFE0BC\" stroke=\"#5A4632\" stroke-width=\"6.5\" stroke-linejoin=\"round\"/><path d=\"M78 50 L96 34 Q92 50 96 66 Z\" fill=\"#EFE0BC\" stroke=\"#5A4632\" stroke-width=\"6\" stroke-linejoin=\"round\"/><circle cx=\"24\" cy=\"46\" r=\"4.5\" fill=\"#5A4632\"/><path d=\"M34 38 Q40 50 34 62\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6\" stroke-linecap=\"round\"/><path d=\"M46 32 Q52 22 62 30 M48 68 Q54 78 62 66\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6\" stroke-linecap=\"round\"/>" },
"雨": { ev: null, svg: "<path d=\"M12 20 H88\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"8\" stroke-linecap=\"round\"/><path d=\"M26 34 Q31 44 26 49 Q21 44 26 34 Z M50 34 Q55 44 50 49 Q45 44 50 34 Z M74 34 Q79 44 74 49 Q69 44 74 34 Z M26 60 Q31 70 26 75 Q21 70 26 60 Z M50 60 Q55 70 50 75 Q45 70 50 60 Z M74 60 Q79 70 74 75 Q69 70 74 60 Z\" fill=\"#9FB9C8\"/>" },
"门": { ev: null, svg: "<path d=\"M26 14 H74\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"8\" stroke-linecap=\"round\"/><path d=\"M30 16 V84 M70 16 V84\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"8\" stroke-linecap=\"round\"/><circle cx=\"30\" cy=\"88\" r=\"4.5\" fill=\"#5A4632\"/><circle cx=\"70\" cy=\"88\" r=\"4.5\" fill=\"#5A4632\"/>" },
"手": { ev: null, svg: "<path d=\"M31 50 Q31 40 40 40 H60 Q69 40 69 50 L65 76 Q63 90 50 90 Q37 90 35 76 Z\" fill=\"#EFE0BC\" stroke=\"#5A4632\" stroke-width=\"7\" stroke-linejoin=\"round\"/><path d=\"M35 40 V22 M47 40 V14 M59 40 V18 M67 46 V28\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"7\" stroke-linecap=\"round\"/>" },
"力": { ev: null, svg: "<path d=\"M32 12 Q66 12 68 46 Q69 66 58 82\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"7\" stroke-linecap=\"round\"/><path d=\"M32 12 L46 90\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"7\" stroke-linecap=\"round\"/>" },
"毛": { ev: null, svg: "<path d=\"M50 8 Q61 24 50 40 Q39 56 50 72 Q58 84 51 94\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"8\" stroke-linecap=\"round\"/><path d=\"M30 26 Q25 42 30 58 M70 26 Q75 42 70 58\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6.5\" stroke-linecap=\"round\"/>" },
"目": { ev: "<circle cx=\"50\" cy=\"50\" r=\"36\" fill=\"#EFE0BC\" stroke=\"#5A4632\" stroke-width=\"7\"/><circle cx=\"50\" cy=\"50\" r=\"15\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6\"/><circle cx=\"50\" cy=\"50\" r=\"5.5\" fill=\"#5A4632\"/>", svg: "<path d=\"M16 50 Q28 26 50 26 Q72 26 84 50 Q72 74 50 74 Q28 74 16 50 Z\" fill=\"#EFE0BC\" stroke=\"#5A4632\" stroke-width=\"7\" stroke-linejoin=\"round\"/><circle cx=\"50\" cy=\"50\" r=\"13\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6\"/><circle cx=\"50\" cy=\"50\" r=\"5\" fill=\"#5A4632\"/>" },
"竹": { ev: null, svg: "<path d=\"M32 12 V88 M68 12 V88\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"7.5\" stroke-linecap=\"round\"/><path d=\"M32 18 Q20 26 12 24 M32 18 Q42 28 50 26 M68 18 Q56 26 50 26 M68 18 Q80 26 88 24\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6.5\" stroke-linecap=\"round\"/>" },
"禾": { ev: "<path d=\"M50 30 V92\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"7.5\" stroke-linecap=\"round\"/><path d=\"M50 30 Q62 22 68 8\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"7\" stroke-linecap=\"round\"/><circle cx=\"68\" cy=\"8\" r=\"3.5\" fill=\"#5A4632\"/><circle cx=\"61\" cy=\"16\" r=\"3.5\" fill=\"#5A4632\"/><circle cx=\"73\" cy=\"16\" r=\"3.5\" fill=\"#5A4632\"/><path d=\"M50 56 Q36 48 28 34 M50 56 Q64 48 72 34\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6.5\" stroke-linecap=\"round\"/><path d=\"M50 78 Q38 86 32 92 M50 78 Q62 86 68 92\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6\" stroke-linecap=\"round\"/>", svg: "<path d=\"M50 24 V92\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"7.5\" stroke-linecap=\"round\"/><path d=\"M50 56 Q34 46 26 30 M50 56 Q66 46 74 30 M50 56 Q34 66 26 84 M50 56 Q66 66 74 84\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6.5\" stroke-linecap=\"round\"/><path d=\"M50 24 Q38 12 26 16 M50 24 Q62 12 74 16\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6.5\" stroke-linecap=\"round\"/><path d=\"M38 14 l-5 9 M30 15 l-6 8 M62 14 l5 9 M70 15 l6 8\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6\" stroke-linecap=\"round\"/>" },
"三": { ev: null, svg: "<path d=\"M22 26 H78\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"8\" stroke-linecap=\"round\"/><path d=\"M16 50 H84\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"8\" stroke-linecap=\"round\"/><path d=\"M22 74 H78\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"8\" stroke-linecap=\"round\"/>" },
};

/* ---------- 通用语音（8 键；chText=每字读音组词文案=zi_ch_<py> 键文本，与 wrd 范式同式） ---------- */
const VOICE = {
  watch:  { key: 'zi_tut_watch', text: '看！来认识新字啦' },
  turn:   { key: 'zi_tut_turn',  text: '你来点一点' },
  hint:   { key: 'zi_hint',      text: '想一想，再选一选' },
  right:  { key: 'zi_right',     text: '答对啦，真棒' },
  wrong:  { key: 'zi_wrong',     text: '不对哦，再想一想' },
  listen: { key: 'zi_listen',    text: '听一听，找一找' },
  word:   { key: 'zi_word',      text: '选一选' },
  quiz:   { key: 'zi_quiz',      text: '小测时间到' },
};
const chKey = ch => 'zi_ch_' + CHARS[ch].py;
const chText = ch => ch + '，' + CHARS[ch].words[0][0] + '的' + ch;
const stKey = flat => 'zi_st_' + flat;

/* ---------- 图标（内嵌 SVG，家族描线风：INK 暖棕 / 暖橙点缀） ---------- */
const ICONS = {
  logo: '<svg viewBox="0 0 44 44" width="32" height="32" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="4" y="4" width="36" height="36" rx="10" fill="#E8975A" stroke="#FFF" stroke-width="2.5"/>' +
    '<text x="22" y="31" font-size="22" font-weight="800" text-anchor="middle" fill="#FFF9EE" font-family="inherit">字</text></svg>',
  hear: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M11 25 h10 l13 -11 v36 l-13 -11 h-10 Z" fill="#E8975A" stroke="#4A3B2E" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M43 23 q6 9 0 18 M50 16 q11 16 0 32" stroke="#4A3B2E" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  pen: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<rect x="10" y="10" width="44" height="44" rx="9" fill="none" stroke="#4A3B2E" stroke-width="3.5"/>' +
    '<path d="M20 42 l4 -12 12 -4 -4 12 Z" fill="#E8975A" stroke="#4A3B2E" stroke-width="3" stroke-linejoin="round"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>'
};

/* ---------- 时序常量（段一 estMs 估值口径；段二 gen_clips 注册后按实长回填——SPEC §R9） ---------- */
const estMs = s => s.length * 345 + 600;
const LOOK_MS = 2800;        // qi0 每字亮相窗（5 字总窗 ~14s，SPEED 缩放）
const WATCH_P1 = 1100;       // 亮相第一段（ev 古形/svg/glyph 文案）
const WATCH_P2 = 1100;       // 亮相第二段（svg 现形/glyph 保持）
const WRONG_CHAIN_WIN = estMs("不对哦，再想一想") + 300;
const RESCUE_DIR_MS = 14000;   // 救援方向级（重播题面语音；不刷 lastAct——keepIdle 纪律）
const RESCUE_ANS_MS = 30000;   // 救援答案级（breathe 正确卡+重播；不刷 lastAct）
const RESCUE_ANS_REPEAT = 15000;  // 答案级重复节流（lastAns 独立锚）
