/* ================= thanks 感谢的话 游戏数据（r12 难度改造 2026-09-15，SPEC-BATCH37 §7 真值源；
   v1 20 题好坏二分题库/§1 原文作历史存档）
   审计红款#37（AUDIT-56 行 49）：与 b36 comfort 同构双胞胎，概念 3-4 岁，
   实测 33.3s/关、净认知 1-2s/题（好坏二分+恒定一句「说声谢谢」）。r12 三 delta
   （AUDIT 行 85 建议逐条）：
   ① 场合适配三通道（对老师/祖辈/同伴同一帮助选不同表达——对象适配非恒定一句）：
      卡模型 v1 good:bool → r12 tier:'best'|'gray'|'bad'|'ok'+kind='fit'——ch1 对师长
      （鞠躬说谢谢 best）ch2 家人与同伴（抱抱奶奶/击掌/大声 best）；反启发式设计：
      同一 label 跨情景 tier 翻转——鞠躬说谢谢 best@题0-4（老师）/gray@题5,7,8,9
      （对奶奶同伴鞠躬太见外）；击掌说谢谢 gray@题1,4（老师随意）/best@题7,9（同伴）；
      大声说谢谢 gray@题0,3/best@题8；说声谢谢 gray@题2,6/best@题11,13（跨章翻转）
      ——「永远鞠躬/永远大声」策略必失分，须读对象线索。
   ② 强度匹配（大帮忙 vs 小帮忙选不同强度表达）：kind='size'——大帮忙（找回玩具球/
      陪等妈妈/分半块蛋糕）best=热烈（抱抱它/大声说谢谢）、gray=小声说谢谢（太轻了
      朋友会失落）；小帮忙（递一张纸/借一支蜡笔）best=小声说谢谢、gray=送朵小花/
      抱抱它（小题大做）——小声说谢谢 best@题11,13/gray@题10,12,14；抱抱它
      best@题10,14/gray@题13。bad=不回应/负面（v1 沿用形态）。
   ③ 不合时宜辨析反向题（kind='anti'，ch4）：题面 say 后串播反向框架锚 tha_not
      「哪一句，现在不该说」→点**不合时宜**的那句=对（answer=唯一 tier:'bad' 卡，
      senses anti 族先例：抑制「选合适」的占优反应）；比赛输了谢对手=合时宜（题15
      ok[对他说谢谢]——谢对手体育精神，审计示例）+被人抢了玩具还说谢谢=不合时宜
      （题16 bad[对他说谢谢]——审计示例）；点 ok 卡=wrong+miss+tha_ok
      「这句可以说，再找不该说的」（消除反馈不指认其余）。
   灰反馈（gray 卡，delta①②择优次档）=tha_gray「有点用，还有更合适的哦」+朋友半好
   meh 态（不哭了但还没开心——b36 comfort r11 同构）+豁免窗 GRAY_WIN 真时钟；
   情景句=题面 keyless TTS（say 非队列链——契约 N 不适用沿袭）；
   SEL 纪律：坏反馈恒指向行为后果（th_wrong「朋友会伤心的」）禁人身评价；
   反向题 aria 统一「做法 」前缀（不泄答案——tier 不进 DOM 可读层）。
   r12 时长模型（estMs 家族定版串长变体 s.length*345+600 四处同步：data 定义/main
   注释/verify 独立副本/build 字面——与 n*345+600 家族定版等价口径，禁 +300 变体）：
     DECIDE_MS：fit 10000（听情景+判对象+两方式适配评估）/ size 10000（判帮忙大小+
       强度匹配）/ anti 11500（反向框架抑制+逐句判合时宜）；
     ADV=CELE_WIN 2124（判对推进窗=朋友开心演出窗）；
     每题=max(voiceWin, DECIDE)+ADV，voiceWin=ENTER 400+estMs(say)+300+(fit/size 加
     PICK_WIN 3108 / anti 加 NOT_WIN 3060)；全 20 题验算 voiceWin 恒 ≤ DECIDE（语音窗
     从不撑时长：fit/size 最长 10 字 7858<10000 / anti 最长 10 字 7810<11500）；
     40 关 modeled 最低=fit/size 章 5×12124=60620 ≥ LEVEL_MIN_MS 40000（anti 章 68120）。
   题库封闭 20 题（4 章×5，SPEC §7 全表）：ch1 对老师说（fit 2 选）0-4 / ch2 家人和
   同伴（fit 2 选）5-9 / ch3 轻重刚刚好（size 3 选 best+gray+bad）10-14 / ch4 火眼金睛
   （anti 反向 3 选 ok+ok+bad）15-19；生成关池 kind-pure per-chapter（dch1→0-4/
   dch2→5-9/dch3→10-14/dch4→15-19——同关不混题型框架；卡数 2/2/3/3 沿 v1 章档）。
   语义先验：fit/size 恰 1 best（唯一解锚）+fit 恰 1 gray 0 bad+size 恰 1 gray 1 bad；
   anti 恰 1 bad+2 ok+0 best/gray（防双真值——senses anti 先例）。 */
'use strict';

const INK = '#4A3B2E';                       // 统一暖棕描边（家族基调）
const WARM = '#E8975A';                      // 暖橙主色

/* ---------- 演出时序常量（SPEC-BATCH37 §4 实长表+§7 r12 增补；浏览器 Audio 实测）
   th_tut_watch 2904 / th_tut_turn 1824 / th_hint 1944 / th_right 1824 / th_wrong 2040
   r12 新增 4 条（2026-09-15 实测）：tha_fit 2808 / tha_not 2760 / tha_gray 2880 / tha_ok 3192
   确认链窗 CELE_WIN=2124（=1824+300 精确）；错链豁免窗 WRONG_CHAIN_WIN=4434
   （=2040+150+1944+300）；r12 三窗：择优锚窗 PICK_WIN=3108（=2808+300 精确，
   fit/size 题面 say 后串播）/ 反向框架窗 NOT_WIN=3060（=2760+300 精确，anti 题）/
   灰链豁免窗 GRAY_WIN=3180（=2880+300，真时钟）/ 反向错反馈窗 ANTI_OK_WIN=3492
   （=3192+300，真时钟）；题面 say 窗=estMs(句长)+300（家族 T 动态，max 10 字
   '下雨小鹿老师给你撑伞'/'小松鼠抢走了你的玩具'→4050）；坏卡演出锁 SHAKE_MS=1100。 ---------- */
const ENTER_MS = 400;                        // 朋友期待出场动画窗（与题面 say 串行）
const CELE_WIN = 2124;                       // 朋友开心演出窗 = th_right 1824+300（精确）
const SHAKE_MS = 1100;                       // 坏卡摇头+朋友失落锁窗
const WRONG_CHAIN_WIN = 4434;                // 错链豁免窗=th_wrong 2040+150+th_hint 1944+300（真时钟）
const PICK_WIN = 3108;                       // 择优方向锚窗=tha_fit 2808+300（r12，fit/size 题面后串播）
const NOT_WIN = 3060;                        // 反向框架锚窗=tha_not 2760+300（r12，anti 题面后串播）
const GRAY_WIN = 3180;                       // 灰链豁免窗=tha_gray 2880+300（r12，真时钟）
const ANTI_OK_WIN = 3492;                    // 反向错反馈窗=tha_ok 3192+300（r12，真时钟）
const TUT_WATCH_WAIT = 3210;                 // ≥th_tut_watch 2904+300
const TUT_TURN_WAIT = 2124;                  // ≥th_tut_turn 1824+300
const estMs = s => s.length * 345 + 600;     // b25 定版：SAPI ~345ms/字+600（全字符口径，标点计入）

/* ---------- r12 时长模型（SPEC §7；与 verify 独立副本/build 断言三方同步） ---------- */
const DECIDE_MS = { fit: 10000, size: 10000, anti: 11500 };   // 认知决策时长（5-6 岁试玩口径推算）
const ADV_MS = CELE_WIN;                     // 判对推进窗=朋友开心演出窗（2124）
const LEVEL_MIN_MS = 40000;                  // 单关 modeled 下限硬断言（r12 门禁）
const quizDurMs = q => Math.max(ENTER_MS + estMs(q.say) + 300 +
                                   (q.kind === 'anti' ? NOT_WIN : PICK_WIN),
                                DECIDE_MS[q.kind]) + ADV_MS;
const levelDurMs = L => L.quizzes.reduce((s, q) => s + quizDurMs(q), 0);

/* ---------- 章配置（SPEC §7：ch1-2 fit 2 选/ch3 size 3 选/ch4 anti 反向 3 选；
   进度章号单调递增、难度章号 dch=1+flat//5 静态四档；生成关 flat≥20 dch=ri(rnd,1,4) seeded）
   hint=章末预告**下一章**文案（hint[i] ↔ CHAPTERS[i+1]，家族 F 禁右移）；
   GEN_HINTS[k] ↔ dch=k+1（verify 双录断言） ---------- */
const CHAPTERS = {
  1: { name: '对老师说',     hint: '对奶奶和朋友，感谢会变哦' },   // 预告 ch2 对象翻转
  2: { name: '家人和朋友',   hint: '帮忙有大小，感谢有轻重' },     // 预告 ch3 强度匹配
  3: { name: '轻重刚刚好',   hint: '有的话现在不该说，找出来' },   // 预告 ch4 反向辨析
  4: { name: '火眼金睛',     hint: '新的情景来啦，样样考考你' }    // 预告生成关
};
const GEN_HINTS = ['想一想，对谁说，怎么说',      // dch1 fit 对师长
                   '对谁说，感谢会不一样哦',      // dch2 fit 家人同伴
                   '帮忙有大小，感谢有轻重',      // dch3 size 强度匹配
                   '哪一句不该说，找出来'];       // dch4 anti 反向辨析
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案（与 voice/clips/manifest.json 严格一致，禁自造；前缀=th_/tha_
   已核 manifest 无占用（SPEC §4 2026-09-12 实查+§7 r12 增 4 键 2026-09-15 再核）；
   r12 前 5 键文本一字不改（任务铁律） ---------- */
const VOICE = {
  watch: { key: 'th_tut_watch', text: '看！朋友来帮忙' },
  turn:  { key: 'th_tut_turn',  text: '你来试一试' },
  hint:  { key: 'th_hint',      text: '怎么说谢谢呢' },
  right: { key: 'th_right',     text: '你真有礼貌' },
  wrong: { key: 'th_wrong',     text: '朋友会伤心的' },
  fit:   { key: 'tha_fit',   text: '想一想，哪个最合适' },   // r12：fit/size 择优方向锚（不指认）
  not:   { key: 'tha_not',   text: '哪一句，现在不该说' },   // r12：anti 反向框架锚（题面后串播）
  gray:  { key: 'tha_gray',  text: '有点用，还有更合适的哦' }, // r12：灰卡反馈（择优次档）
  ok:    { key: 'tha_ok',   text: '这句可以说，再找不该说的' } // r12：anti 错反馈（消除不指认）
};
const Q_TEXT = '朋友帮了你，怎样回应';        // 纯文字装饰句（不播——题面真值=情景句 TTS）

/* ---------- 20 题封闭题库（SPEC §7 全表逐条；情景句=题面 keyless TTS 真值源，verify
   双录对账；kind='fit'|'size'|'anti'；cards[{tier,label,icon}]——tier 分布语义先验：
   fit=[best,gray] / size=[best,gray,bad] / anti=[ok,ok,bad]（answer=fit/size 唯一 best/
   anti 唯一 bad）；卡序 shuffle 后 best/bad 位置不恒定——禁位置学习。
   say 长度铁律：全部 ≤10 字（时长模型语音窗不撑时长前提：fit/size ≤7858<10000/
   anti ≤7810<11500）；题1（教学演示题）9 字控教学预算；全部 say 两两相异
   （v1 复现句同 say 异卡数机制不再需要，rowOfV 反查天然唯一）。 ---------- */
const SCENES = [
  /* ch1 对老师说·fit（题 0-4：对老师最合适=认真有礼的鞠躬致谢；gray=太随意/普通的方式） */
  { kind: 'fit', anim: 'deer', prop: 'crayon', say: '小鹿老师帮你捡蜡笔',
    cards: [{ tier: 'best', label: '鞠躬说谢谢', icon: 'bow' },
            { tier: 'gray', label: '大声说谢谢', icon: 'sayloud' }] },
  { kind: 'fit', anim: 'deer', prop: 'car', say: '小鹿老师帮你修小车',
    cards: [{ tier: 'best', label: '鞠躬说谢谢', icon: 'bow' },
            { tier: 'gray', label: '击掌说谢谢', icon: 'highfive' }] },
  { kind: 'fit', anim: 'deer', prop: 'book', say: '小鹿老师递给你一本书',
    cards: [{ tier: 'best', label: '鞠躬说谢谢', icon: 'bow' },
            { tier: 'gray', label: '说声谢谢',   icon: 'saythanks' }] },
  { kind: 'fit', anim: 'deer', prop: 'blocks', say: '小鹿老师帮你搬积木',
    cards: [{ tier: 'best', label: '鞠躬说谢谢', icon: 'bow' },
            { tier: 'gray', label: '大声说谢谢', icon: 'sayloud' }] },
  { kind: 'fit', anim: 'deer', prop: 'umbrella', say: '下雨小鹿老师给你撑伞',
    cards: [{ tier: 'best', label: '鞠躬说谢谢', icon: 'bow' },
            { tier: 'gray', label: '击掌说谢谢', icon: 'highfive' }] },
  /* ch2 家人和朋友·fit（题 5-9：对奶奶=亲昵抱抱/对同伴=击掌大声——鞠躬对亲近的人太见外=gray 翻转） */
  { kind: 'fit', anim: 'bear', prop: 'hat', say: '熊奶奶帮你找帽子',
    cards: [{ tier: 'best', label: '抱抱奶奶',   icon: 'hug' },
            { tier: 'gray', label: '鞠躬说谢谢', icon: 'bow' }] },
  { kind: 'fit', anim: 'bear', prop: 'cake', say: '熊奶奶给你留了蛋糕',
    cards: [{ tier: 'best', label: '抱抱奶奶',   icon: 'hug' },
            { tier: 'gray', label: '说声谢谢',   icon: 'saythanks' }] },
  { kind: 'fit', anim: 'monkey', prop: 'blocks', say: '小猴陪你搭好了积木',
    cards: [{ tier: 'best', label: '击掌说谢谢', icon: 'highfive' },
            { tier: 'gray', label: '鞠躬说谢谢', icon: 'bow' }] },
  { kind: 'fit', anim: 'dog', prop: 'swing', say: '小狗帮你推秋千',
    cards: [{ tier: 'best', label: '大声说谢谢', icon: 'sayloud' },
            { tier: 'gray', label: '鞠躬说谢谢', icon: 'bow' }] },
  { kind: 'fit', anim: 'monkey', prop: 'car', say: '小猴帮你修好了小车',
    cards: [{ tier: 'best', label: '击掌说谢谢', icon: 'highfive' },
            { tier: 'gray', label: '鞠躬说谢谢', icon: 'bow' }] },
  /* ch3 轻重刚刚好·size（题 10-14：大帮忙=热烈（抱抱/大声）/小帮忙=轻声（小声说谢谢）——
     小声说谢谢 gray@大/送朵小花·抱抱它 gray@小（小题大做）；bad=不回应/负面） */
  { kind: 'size', anim: 'rabbit', prop: 'ball', say: '小兔帮你找回了玩具球',
    cards: [{ tier: 'best', label: '抱抱它',     icon: 'hug' },
            { tier: 'gray', label: '小声说谢谢', icon: 'whisper' },
            { tier: 'bad',  label: '转身就走',   icon: 'walkoff' }] },
  { kind: 'size', anim: 'sheep', prop: 'paper', say: '小羊递给你一张纸',
    cards: [{ tier: 'best', label: '小声说谢谢', icon: 'whisper' },
            { tier: 'gray', label: '送朵小花',   icon: 'flower' },
            { tier: 'bad',  label: '一声不吭',   icon: 'shush' }] },
  { kind: 'size', anim: 'dog', prop: 'heart', say: '小狗陪你等到了妈妈',
    cards: [{ tier: 'best', label: '大声说谢谢', icon: 'sayloud' },
            { tier: 'gray', label: '小声说谢谢', icon: 'whisper' },
            { tier: 'bad',  label: '说好无聊',   icon: 'scorn' }] },
  { kind: 'size', anim: 'chick', prop: 'crayon', say: '小鸡借你一支蜡笔',
    cards: [{ tier: 'best', label: '小声说谢谢', icon: 'whisper' },
            { tier: 'gray', label: '抱抱它',     icon: 'hug' },
            { tier: 'bad',  label: '嫌它小气',   icon: 'scorn' }] },
  { kind: 'size', anim: 'pig', prop: 'cake', say: '小猪分给你半块蛋糕',
    cards: [{ tier: 'best', label: '抱抱它',     icon: 'hug' },
            { tier: 'gray', label: '小声说谢谢', icon: 'whisper' },
            { tier: 'bad',  label: '嫌蛋糕小',   icon: 'scorn' }] },
  /* ch4 火眼金睛·anti 反向辨析（题 15-19：点**不该说**的那句=对——answer=唯一 bad 卡；
     ok=此刻可以说的两句；题15 谢对手=合时宜（审计示例）/题16 被抢还说谢谢=不合时宜（审计示例）） */
  { kind: 'anti', anim: 'dog', prop: 'swing', say: '赛跑你输给了小狗',
    cards: [{ tier: 'ok',  label: '对他说谢谢', icon: 'saythanks' },
            { tier: 'ok',  label: '说恭喜你呀', icon: 'congrat' },
            { tier: 'bad', label: '说我不玩了', icon: 'sulk' }] },
  { kind: 'anti', anim: 'squirrel', prop: 'ball', say: '小松鼠抢走了你的玩具',
    cards: [{ tier: 'ok',  label: '大声说还给我', icon: 'sayloud' },
            { tier: 'ok',  label: '请老师帮忙',   icon: 'teacher' },
            { tier: 'bad', label: '对他说谢谢',   icon: 'saythanks' }] },
  { kind: 'anti', anim: 'horse', prop: 'bench', say: '小马排队插到你前面',
    cards: [{ tier: 'ok',  label: '说请你排队', icon: 'queue' },
            { tier: 'ok',  label: '请老师帮忙', icon: 'teacher' },
            { tier: 'bad', label: '说谢谢你呀', icon: 'saythanks' }] },
  { kind: 'anti', anim: 'pig', prop: 'crayon', say: '小猪弄脏了你的画',
    cards: [{ tier: 'ok',  label: '说没关系', icon: 'okay' },
            { tier: 'ok',  label: '和她再画', icon: 'together' },
            { tier: 'bad', label: '叫她小笨蛋', icon: 'mock' }] },
  { kind: 'anti', anim: 'cat', prop: 'blocks', say: '下棋小猫赢了你',
    cards: [{ tier: 'ok',  label: '说恭喜你呀', icon: 'congrat' },
            { tier: 'ok',  label: '约下次再玩', icon: 'again' },
            { tier: 'bad', label: '说她耍赖了', icon: 'accuse' }] }
];
/* T46 化（2026-09-19）：题面情景句 clip 键 th_sc_1..20（gen 侧按 SCENES 行序
   注册——文本已逐键全等核验；无重复句，重复守卫沿 comfort 范式保留取首现） */
const SAY_CLIP = {};
SCENES.forEach((sc, i) => { if (!(sc.say in SAY_CLIP)) SAY_CLIP[sc.say] = 'th_sc_' + (i + 1); });
const sayClipOf = q => SAY_CLIP[q.say];

/* ---------- 朋友动物 SVG（11 种，viewBox 0 0 140 130，头中心约 (70,78)；
   与家族视觉集一致（b36 comfort 同 11 种——跨款角色面孔连贯）
   表情组（容器类控 mood——契约 M DOM 类层锚）：
   .fx-sad=题面期待态（豆眼+微笑+头侧期待小星 .wish——朋友帮完你在看你）
   .fx-meh=r12 灰卡后果半好态（平眉+睁眼+小平笑——没那么开心但不算失落）
   .fx-happy=开心演出（弯眼+咧嘴笑+腮红）
   根组 g[data-anim="friend"]——verify 帧内容断言锚（渲染即引擎）。 ---------- */
const F_EY = 72;                              // 眼睛基线 y
const FX_SAD =
  '<g class="fx-sad">' +
  '<path d="M40 ' + (F_EY - 15) + ' q6 -4 12 -1 M100 ' + (F_EY - 15) + ' q-6 -4 -12 -1" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +   // 微挑眉（期待）
  '<circle cx="46" cy="' + F_EY + '" r="4.8" fill="' + INK + '"/><circle cx="94" cy="' + F_EY + '" r="4.8" fill="' + INK + '"/>' +                                       // 豆眼（睁着看你）
  '<circle cx="47.5" cy="' + (F_EY - 1.5) + '" r="1.5" fill="#FFF9EE"/><circle cx="95.5" cy="' + (F_EY - 1.5) + '" r="1.5" fill="#FFF9EE"/>' +                          // 眼高光
  '<path d="M62 ' + (F_EY + 20) + ' q8 7 16 0" stroke="' + INK + '" stroke-width="3.2" fill="none" stroke-linecap="round"/>' +                                           // 微笑（等你回应）
  '<g class="wish"><path d="M112 ' + (F_EY - 22) + ' l2.4 5.6 l6 .8 l-4.4 4.2 l1.1 6 l-5.1 -2.8 l-5.1 2.8 l1.1 -6 l-4.4 -4.2 l6 -.8 Z" fill="#F5C542" stroke="' + INK + '" stroke-width="1.8" stroke-linejoin="round"/></g>' +   // 期待小星
  '</g>';
const FX_MEH =
  '<g class="fx-meh">' +
  '<path d="M40 ' + (F_EY - 15) + ' h12 M88 ' + (F_EY - 15) + ' h12" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +                    // 平眉（不期待也不失落）
  '<path d="M43 ' + F_EY + ' h8 M89 ' + F_EY + ' h8" stroke="' + INK + '" stroke-width="3.4" fill="none" stroke-linecap="round"/>' +                                  // 睁眼平视（短横）
  '<path d="M63 ' + (F_EY + 20) + ' q7 4 14 0" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +                                           // 小平笑（浅弧）
  '</g>';
const FX_HAPPY =
  '<g class="fx-happy">' +
  '<path d="M41 ' + (F_EY + 1) + ' q5.5 -7 11 0 M88 ' + (F_EY + 1) + ' q5.5 -7 11 0" stroke="' + INK + '" stroke-width="3.4" fill="none" stroke-linecap="round"/>' + // 弯眼
  '<path d="M60 ' + (F_EY + 18) + ' q10 9 20 0" stroke="' + INK + '" stroke-width="3.2" fill="none" stroke-linecap="round"/>' +                                       // 咧嘴笑
  '<ellipse cx="36" cy="' + (F_EY + 10) + '" rx="7" ry="4.8" fill="#F2B8C6" opacity=".85"/>' +
  '<ellipse cx="104" cy="' + (F_EY + 10) + '" rx="7" ry="4.8" fill="#F2B8C6" opacity=".85"/>' +                                                                      // 腮红
  '</g>';
const FRIEND_EL = {
  bear:   /* 小熊：圆耳+口鼻（题 5/6） */
    '<circle cx="36" cy="34" r="15" fill="#B98A5D" stroke="' + INK + '" stroke-width="3.4"/>' +
    '<circle cx="36" cy="34" r="6.5" fill="#E9D3B3"/>' +
    '<circle cx="104" cy="34" r="15" fill="#B98A5D" stroke="' + INK + '" stroke-width="3.4"/>' +
    '<circle cx="104" cy="34" r="6.5" fill="#E9D3B3"/>' +
    '<circle cx="70" cy="80" r="42" fill="#C89A6B" stroke="' + INK + '" stroke-width="3.4"/>' +
    '<ellipse cx="70" cy="95" rx="19" ry="14" fill="#E9D3B3" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<ellipse cx="70" cy="88" rx="6" ry="4.6" fill="' + INK + '"/>',
  rabbit: /* 小兔：长耳粉内耳（题 10） */
    '<ellipse cx="50" cy="26" rx="12" ry="27" fill="#FBF7F0" stroke="' + INK + '" stroke-width="3.4" transform="rotate(-9 50 26)"/>' +
    '<ellipse cx="50" cy="28" rx="5.6" ry="17" fill="#F2B8C6" transform="rotate(-9 50 28)"/>' +
    '<ellipse cx="90" cy="24" rx="12" ry="28" fill="#FBF7F0" stroke="' + INK + '" stroke-width="3.4" transform="rotate(11 90 24)"/>' +
    '<ellipse cx="90" cy="26" rx="5.6" ry="18" fill="#F2B8C6" transform="rotate(11 90 26)"/>' +
    '<circle cx="70" cy="82" r="40" fill="#FBF7F0" stroke="' + INK + '" stroke-width="3.4"/>' +
    '<ellipse cx="70" cy="96" rx="5.6" ry="4.2" fill="#E8A0A8"/>',
  cat:    /* 小猫：三角耳+条纹额（题 19） */
    '<path d="M36 52 L40 16 L64 38 Z" fill="#F5B26B" stroke="' + INK + '" stroke-width="3.4" stroke-linejoin="round"/>' +
    '<path d="M104 52 L100 16 L76 38 Z" fill="#F5B26B" stroke="' + INK + '" stroke-width="3.4" stroke-linejoin="round"/>' +
    '<path d="M44 26 L52 34 M96 26 L88 34" stroke="' + INK + '" stroke-width="2.4" stroke-linecap="round"/>' +
    '<circle cx="70" cy="82" r="40" fill="#F5B26B" stroke="' + INK + '" stroke-width="3.4"/>' +
    '<path d="M60 46 l5 9 M70 44 v10 M80 46 l-5 9" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>' +
    '<path d="M66 92 l4 4 l4 -4" fill="#E8837A" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>',
  dog:    /* 小狗：垂耳+额头白斑（题 8/12/15） */
    '<ellipse cx="32" cy="72" rx="13" ry="24" fill="#A9744B" stroke="' + INK + '" stroke-width="3.4" transform="rotate(-13 32 72)"/>' +
    '<ellipse cx="108" cy="72" rx="13" ry="24" fill="#A9744B" stroke="' + INK + '" stroke-width="3.4" transform="rotate(13 108 72)"/>' +
    '<circle cx="70" cy="80" r="40" fill="#D9A56D" stroke="' + INK + '" stroke-width="3.4"/>' +
    '<path d="M61 44 q9 -9 18 0 q-2 13 -9 15 q-7 -2 -9 -15 Z" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<ellipse cx="70" cy="96" rx="7" ry="5.2" fill="' + INK + '"/>',
  sheep:  /* 小羊：云朵卷毛（题 11） */
    '<circle cx="38" cy="46" r="13" fill="#F3EDE2" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="102" cy="46" r="13" fill="#F3EDE2" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="48" cy="34" r="14" fill="#F3EDE2" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="92" cy="34" r="14" fill="#F3EDE2" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="70" cy="28" r="15" fill="#F3EDE2" stroke="' + INK + '" stroke-width="3"/>' +
    '<ellipse cx="70" cy="84" rx="36" ry="33" fill="#F6EFE4" stroke="' + INK + '" stroke-width="3.4"/>' +
    '<ellipse cx="70" cy="96" rx="6" ry="4.6" fill="#D98A8A"/>',
  monkey: /* 小猴：大圆耳+桃形脸（题 7/9） */
    '<circle cx="30" cy="66" r="14" fill="#9A6B45" stroke="' + INK + '" stroke-width="3.4"/>' +
    '<circle cx="30" cy="66" r="7" fill="#E9C9A8"/>' +
    '<circle cx="110" cy="66" r="14" fill="#9A6B45" stroke="' + INK + '" stroke-width="3.4"/>' +
    '<circle cx="110" cy="66" r="7" fill="#E9C9A8"/>' +
    '<circle cx="70" cy="76" r="40" fill="#9A6B45" stroke="' + INK + '" stroke-width="3.4"/>' +
    '<path d="M46 68 q24 -26 48 0 q-6 26 -24 26 q-18 0 -24 -26 Z" fill="#F0D9BC" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<ellipse cx="70" cy="93" rx="6" ry="4.6" fill="' + INK + '"/>',
  chick:  /* 小鸡：黄圆头呆毛（题 13） */
    '<circle cx="70" cy="78" r="40" fill="#F7D154" stroke="' + INK + '" stroke-width="3.4"/>' +
    '<path d="M64 38 q4 -13 13 -11 M73 38 q2 -9 9 -9" stroke="' + INK + '" stroke-width="2.8" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="70" cy="96" rx="11" ry="6" fill="#F0933F" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M60 96 h20" stroke="' + INK + '" stroke-width="2.2"/>',
  pig:    /* 小猪：粉头折耳+猪鼻（题 14/18） */
    '<path d="M36 50 q-14 2 -12 16 q8 8 18 2 Z" fill="#F0AEB2" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M104 50 q14 2 12 16 q-8 8 -18 2 Z" fill="#F0AEB2" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<circle cx="70" cy="80" r="40" fill="#F0AEB2" stroke="' + INK + '" stroke-width="3.4"/>' +
    '<ellipse cx="70" cy="94" rx="19" ry="13" fill="#E98F95" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<circle cx="62" cy="94" r="3.4" fill="' + INK + '"/><circle cx="78" cy="94" r="3.4" fill="' + INK + '"/>',
  deer:   /* 小鹿：枝角+瓜子脸（题 0-4 小鹿老师） */
    '<path d="M44 38 v-14 m0 6 h-9 m9 4 h8 M96 38 v-14 m0 6 h-9 m9 4 h8" stroke="' + INK + '" stroke-width="3.2" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="52" cy="40" rx="10" ry="13" fill="#E8CFA8" stroke="' + INK + '" stroke-width="3" transform="rotate(-14 52 40)"/>' +
    '<ellipse cx="88" cy="40" rx="10" ry="13" fill="#E8CFA8" stroke="' + INK + '" stroke-width="3" transform="rotate(14 88 40)"/>' +
    '<ellipse cx="70" cy="82" rx="36" ry="38" fill="#E8CFA8" stroke="' + INK + '" stroke-width="3.4"/>' +
    '<ellipse cx="70" cy="95" rx="14" ry="10" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<ellipse cx="70" cy="90" rx="5.4" ry="4.2" fill="' + INK + '"/>',
  squirrel: /* 松鼠：尖耳+蓬颊（题 16） */
    '<path d="M40 46 L36 18 L60 36 Z" fill="#E1974F" stroke="' + INK + '" stroke-width="3.4" stroke-linejoin="round"/>' +
    '<path d="M100 46 L104 18 L80 36 Z" fill="#E1974F" stroke="' + INK + '" stroke-width="3.4" stroke-linejoin="round"/>' +
    '<circle cx="70" cy="82" r="40" fill="#E1974F" stroke="' + INK + '" stroke-width="3.4"/>' +
    '<ellipse cx="48" cy="88" rx="11" ry="14" fill="#F2C89A" opacity=".9"/>' +
    '<ellipse cx="92" cy="88" rx="11" ry="14" fill="#F2C89A" opacity=".9"/>' +
    '<ellipse cx="70" cy="96" rx="6" ry="4.4" fill="' + INK + '"/>',
  horse:  /* 小马：鬃毛+长脸（题 17） */
    '<path d="M34 44 q-10 22 2 44 q8 4 12 -2 q-12 -18 -4 -40 Z" fill="#8A6248" stroke="' + INK + '" stroke-width="3"/>' +
    '<ellipse cx="70" cy="80" rx="34" ry="40" fill="#C99B6B" stroke="' + INK + '" stroke-width="3.4"/>' +
    '<path d="M104 46 q10 22 -2 44 q-8 4 -12 -2 q12 -18 4 -40 Z" fill="#8A6248" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M56 36 q14 -12 28 0 l-4 12 h-20 Z" fill="#8A6248" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<ellipse cx="70" cy="97" rx="13" ry="9" fill="#E9D3B3" stroke="' + INK + '" stroke-width="2.6"/>'
};
function friendSvg(kind) {
  const el = FRIEND_EL[kind] || FRIEND_EL.rabbit;
  return '<svg viewBox="0 0 140 130" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<g data-anim="friend">' + el + FX_SAD + FX_MEH + FX_HAPPY + '</g></svg>';
}

/* ---------- 回应卡图标库（viewBox 0 0 104 76 描线风，各 tier 同构——不靠颜色歧视档位；
   根组 g[data-anim=<icon>]，verify 单元①断言全定义。
   r12 图标集：best 族（bow 鞠躬/highfive 击掌/sayloud 大声/whisper 小声/hug 抱抱/
   saythanks 说声谢谢/flower 送花）+gray 复用 best 族图标（择优次档=方式本身没错，
   不做视觉贬低）+bad 族（walkoff 走开/shush 沉默/scorn 嫌弃）+anti 族（saythanks/
   congrat 恭喜/sulk 赌气/teacher 找老师/queue 排队/mock 骂人/accuse 冤枉/again 再玩/
   okay 没关系/together 一起/说没关系）——好坏同构描线风，语义承载在图+语音。 ---------- */
const CARD_EL = {
  /* ---- 择优/正向族 ---- */
  saythanks: /* 说声谢谢/对他说谢谢/说谢谢你呀：笑脸说+对话气泡+爱心 */
    '<path d="M24 14 h50 a9 9 0 0 1 9 9 v18 a9 9 0 0 1 -9 9 h-32 l-13 11 v-11 h-5 a9 9 0 0 1 -9 -9 v-18 a9 9 0 0 1 9 -9 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="42" cy="32" r="2.6" fill="' + INK + '"/><circle cx="54" cy="32" r="2.6" fill="' + INK + '"/>' +
    '<path d="M42 39 q6 5 12 0" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    '<path d="M78 18 q5 -4 9 0 q4 -4 8 0 q0 6 -8 11 q-8 -5 -8 -11 Z" transform="scale(.9) translate(10 0)" fill="#F2A0B5" stroke="' + INK + '" stroke-width="2.6"/>',
  bow:      /* 鞠躬说谢谢：弯腰小人+星（对师长认真致谢） */
    '<circle cx="66" cy="28" r="9" fill="#FBF7F0" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M52 62 q-2 -18 10 -24 q10 8 8 24 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="3.2" stroke-linejoin="round"/>' +
    '<path d="M38 62 h52" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M80 36 q8 8 0 16 M88 32 q12 12 0 24" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    '<path d="M28 20 l3 6 l7 1 l-5 5 l1.4 7 l-6.4 -3.4 l-6.4 3.4 l1.4 -7 l-5 -5 l7 -1 Z" fill="#F5C542" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>',
  highfive: /* 击掌说谢谢：两手相击+星花（同伴式热烈） */
    '<path d="M22 58 q-2 -18 12 -22 l5 9 q10 -3 14 6 q5 10 -3 14 Z" fill="#FBF7F0" stroke="' + INK + '" stroke-width="3.2" stroke-linejoin="round"/>' +
    '<path d="M82 58 q2 -18 -12 -22 l-5 9 q-10 -3 -14 6 q-5 10 3 14 Z" fill="#FBF7F0" stroke="' + INK + '" stroke-width="3.2" stroke-linejoin="round"/>' +
    '<path d="M52 14 l2.4 5.8 l6.2 .8 l-4.4 4.2 l1 6 l-5.2 -2.8 l-5.2 2.8 l1 -6 l-4.4 -4.2 l6.2 -.8 Z" fill="#F5C542" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<path d="M74 20 l3 5 M30 24 l-3 5" stroke="' + INK + '" stroke-width="2.4" stroke-linecap="round"/>',
  sayloud:  /* 大声说谢谢/大声说还给我：对话气泡+声波（热烈外放） */
    '<path d="M14 16 h50 a9 9 0 0 1 9 9 v16 a9 9 0 0 1 -9 9 h-28 l-12 10 v-10 h-10 a9 9 0 0 1 -9 -9 v-16 a9 9 0 0 1 9 -9 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M26 30 h26 M26 40 h16" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M80 26 q7 11 0 22 M90 20 q11 17 0 34" stroke="' + WARM + '" stroke-width="3" fill="none" stroke-linecap="round"/>',
  whisper:  /* 小声说谢谢：小气泡+省略号+掩口小手（轻轻地说） */
    '<path d="M12 20 h32 a7 7 0 0 1 7 7 v12 a7 7 0 0 1 -7 7 h-20 l-9 8 v-8 h-3 a7 7 0 0 1 -7 -7 v-12 a7 7 0 0 1 7 -7 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<circle cx="23" cy="33" r="2.4" fill="' + INK + '"/><circle cx="32" cy="33" r="2.4" fill="' + INK + '"/><circle cx="41" cy="33" r="2.4" fill="' + INK + '"/>' +
    '<path d="M62 44 q-2 -22 10 -26 l4 8 q10 -2 14 8 q6 10 0 14" fill="#FBF7F0" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M86 18 q4 -4 7 0" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linecap="round"/>',
  hug:      /* 抱抱它/抱抱奶奶：两条环抱手臂+大心 */
    '<path d="M52 40 C 30 20 14 44 34 58 M52 40 C 74 20 90 44 70 58" stroke="' + INK + '" stroke-width="3.4" fill="none" stroke-linecap="round"/>' +
    '<path d="M52 58 q-16 -14 -16 -26 q0 -10 10 -10 q6 0 10 6 q4 -6 10 -6 q10 0 10 10 q0 12 -24 42 Z" transform="scale(.62) translate(32 18)" fill="#F2A0B5" stroke="' + INK + '" stroke-width="3.6"/>',
  flower:   /* 送朵小花：花茎+大花+叶 */
    '<path d="M52 62 v-16" stroke="#8FBF7F" stroke-width="3.2" stroke-linecap="round"/>' +
    '<circle cx="52" cy="24" r="7" fill="#F5C542" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="38" cy="32" r="7" fill="#F2A0B5" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="66" cy="32" r="7" fill="#F2A0B5" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="43" cy="44" r="7" fill="#A8CBEA" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="61" cy="44" r="7" fill="#A8CBEA" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M52 46 q-2 6 -8 8 q-2 -6 4 -9" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>',
  teacher:  /* 请老师帮忙：圆帽老师+星徽 */
    '<circle cx="46" cy="26" r="11" fill="#FBF7F0" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M30 62 q0 -22 16 -22 q16 0 16 22 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M20 22 h52 l-26 -14 Z" fill="' + INK + '"/>' +
    '<path d="M78 30 l3.5 7 l8 1 l-6 5.5 l1.5 8 l-7 -4 l-7 4 l1.5 -8 l-6 -5.5 l8 -1 Z" fill="#F5C542" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>',
  congrat: /* 说恭喜你呀：奖杯+彩带（为朋友高兴） */
    '<path d="M36 14 h28 v14 a14 11 0 0 1 -28 0 Z" fill="#F5C542" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<path d="M36 18 h-7 a7 7 0 0 0 7 11 M64 18 h7 a7 7 0 0 1 -7 11" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    '<path d="M50 40 v7 M40 47 h20 M44 52 h12" stroke="' + INK + '" stroke-width="2.8" stroke-linecap="round"/>' +
    '<path d="M18 10 q6 10 0 20 M86 10 q-6 10 0 20" stroke="#F2A0B5" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<path d="M28 54 l2.6 5 l6 .8 l-4.4 4 l1 6 l-5.2 -2.8 l-5.2 2.8 l1 -6 l-4.4 -4 l6 -.8 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.2" stroke-linejoin="round"/>',
  queue:    /* 说请你排队：三个排队小人+插队者+归位箭头 */
    '<circle cx="24" cy="30" r="7" fill="#F5C542" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<circle cx="44" cy="30" r="7" fill="#A8CBEA" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<circle cx="64" cy="30" r="7" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<path d="M16 44 h56" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>' +
    '<circle cx="86" cy="56" r="7" fill="#F2A0B5" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<path d="M86 46 v-9 m0 0 l-4 4 m4 -4 l4 4" stroke="' + WARM + '" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  okay:     /* 说没关系：对话气泡+绿色对勾 */
    '<path d="M22 18 h60 a10 10 0 0 1 10 10 v22 a10 10 0 0 1 -10 10 h-38 l-14 12 v-12 h-8 a10 10 0 0 1 -10 -10 v-22 a10 10 0 0 1 10 -10 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M38 42 l9 9 l19 -19" stroke="#8FBF7F" stroke-width="4.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  together: /* 和她再画：两个小人并肩（重画和好） */
    '<circle cx="36" cy="24" r="10" fill="#F5C542" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M24 60 q0 -22 12 -22 q12 0 12 22 Z" fill="#F5C542" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<circle cx="70" cy="24" r="10" fill="#A8CBEA" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M58 60 q0 -22 12 -22 q12 0 12 22 Z" fill="#A8CBEA" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M48 34 q5 -4 10 0" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>',
  again:    /* 约下次再玩：回旋箭头+小日历（下再约） */
    '<rect x="18" y="24" width="30" height="26" rx="4" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<path d="M18 32 h30 M26 24 v-5 M40 24 v-5" stroke="' + INK + '" stroke-width="2.4" stroke-linecap="round"/>' +
    '<circle cx="27" cy="40" r="2.4" fill="#F2A0B5"/><circle cx="36" cy="40" r="2.4" fill="#8FBF7F"/>' +
    '<path d="M76 30 a16 16 0 1 0 4 14" stroke="#8A9BAE" stroke-width="4" fill="none" stroke-linecap="round"/>' +
    '<path d="M72 24 L84 28 L76 40 Z" fill="#8A9BAE"/>',
  /* ---- bad 族（不合时宜/不回应——anti 的 bad=此刻不该说的话，同构描线） ---- */
  walkoff:  /* 转身就走：转身背影+速度线 */
    '<circle cx="64" cy="20" r="9" fill="#EDE3D2" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M64 29 l-10 12 l8 8 l-4 16 M64 29 l10 8 l8 -4 M64 29 l-2 18" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M18 26 h16 M12 38 h18 M16 50 h12" stroke="' + INK + '" stroke-width="2.8" stroke-linecap="round"/>' +
    '<path d="M78 14 q6 -4 10 0 M84 24 q6 -4 10 0" stroke="' + INK + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>',
  shush:    /* 一声不吭：闭唇手势+静音点 */
    '<path d="M34 60 q-2 -26 10 -30 l4 8 q12 -2 18 8 q8 12 2 16" fill="#FBF7F0" stroke="' + INK + '" stroke-width="3.2" stroke-linejoin="round"/>' +
    '<path d="M58 26 q10 -2 16 4" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<circle cx="86" cy="18" r="3" fill="' + INK + '"/><circle cx="94" cy="12" r="4.6" fill="none" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<circle cx="82" cy="40" r="2.2" fill="' + INK + '"/><circle cx="88" cy="34" r="2.2" fill="' + INK + '"/>',
  scorn:    /* 嫌它小气/嫌蛋糕小/说好无聊：撇嘴斜眼+下巴点 */
    '<circle cx="48" cy="40" r="26" fill="#EDE3D2" stroke="' + INK + '" stroke-width="3.2"/>' +
    '<path d="M34 30 q7 -4 13 0 M62 34 q7 -4 12 2" stroke="' + INK + '" stroke-width="2.8" fill="none" stroke-linecap="round"/>' +
    '<path d="M36 32 l10 4 M60 36 l10 -2" stroke="' + INK + '" stroke-width="2.2" stroke-linecap="round"/>' +
    '<path d="M36 50 q10 -5 18 1 q4 3 8 -1" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<path d="M84 26 l3.5 7 l8 1 l-6 5.5 l1.5 8 l-7 -4 l-7 4 l1.5 -8 l-6 -5.5 l8 -1 Z" fill="#C9BBAA" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>',
  sulk:     /* 说我不玩了：背身赌气+哼气泡 */
    '<circle cx="60" cy="22" r="10" fill="#EDE3D2" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M48 60 q0 -20 12 -20 q12 0 12 20 Z" fill="#EDE3D2" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M70 20 q4 -2 7 0 M72 26 h6" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    '<path d="M28 30 h14 M24 40 h12 M28 50 h9" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>' +
    '<path d="M82 34 q6 4 0 8 q-6 -4 0 -8 Z" fill="#9CC8E8" stroke="' + INK + '" stroke-width="1.8"/>',
  mock:     /* 叫她小笨蛋：嘲笑脸+叉 */
    '<circle cx="44" cy="38" r="24" fill="#EDE3D2" stroke="' + INK + '" stroke-width="3.2"/>' +
    '<path d="M30 30 q6 -5 12 -2 M58 30 q-5 -5 -11 -2" stroke="' + INK + '" stroke-width="2.8" fill="none" stroke-linecap="round"/>' +
    '<path d="M32 42 q8 -5 13 0 q7 6 13 0" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<path d="M76 24 l12 12 M88 24 l-12 12" stroke="#D98A8A" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M84 46 l3 6 l6.4 .8 l-4.8 4.4 l1.2 6.4 l-5.8 -3.2 l-5.8 3.2 l1.2 -6.4 l-4.8 -4.4 l6.4 -.8 Z" fill="#C9BBAA" stroke="' + INK + '" stroke-width="2.2" stroke-linejoin="round"/>',
  accuse:   /* 说她耍赖了：怒气泡+大红叉（无据指责） */
    '<path d="M14 14 h56 a9 9 0 0 1 9 9 v14 a9 9 0 0 1 -9 9 h-32 l-12 10 v-10 h-12 a9 9 0 0 1 -9 -9 v-14 a9 9 0 0 1 9 -9 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M32 24 l18 14 M50 24 l-18 14" stroke="#D98A8A" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M88 12 l3 6 l6.4 .8 l-4.8 4.4 l1.2 6.4 l-5.8 -3.2 l-5.8 3.2 l1.2 -6.4 l-4.8 -4.4 l6.4 -.8 Z" fill="' + WARM + '" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>'
};
function cardIconSvg(icon) {
  const el = CARD_EL[icon] || CARD_EL.saythanks;
  return '<svg viewBox="0 0 104 76" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<g data-anim="' + icon + '">' + el + '</g></svg>';
}

/* ---------- 情景道具小图标（viewBox 0 0 56 56，舞台右下角点景）
   r12 情景全集（SPEC §7 各题帮助物/场景物：蜡笔/小车/书/积木/伞/帽子/蛋糕/秋千/
   玩具球/纸/陪伴爱心/长椅/奖牌）+v1 库留存（hands glove sticker signpost bag 未用保留） ---------- */
const PROP_EL = {
  hat:     '<path d="M16 36 q0 -18 12 -18 q12 0 12 18 Z" fill="#A8CBEA" stroke="' + INK + '" stroke-width="2.6"/>' +
           '<path d="M10 36 h36 q2 0 2 3 q0 3 -2 3 h-36 q-2 0 -2 -3 q0 -3 2 -3 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="2.4"/>' +
           '<path d="M28 18 q3 -5 7 -2" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linecap="round"/>',
  hands:   '<path d="M14 40 q-4 -18 10 -22 l6 10 q12 -2 18 8 q6 10 0 16" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
           '<path d="M34 22 q-8 -6 -2 -12 q7 1 8 8" fill="#F2B8C6" stroke="' + INK + '" stroke-width="2.2" stroke-linejoin="round"/>' +
           '<path d="M24 46 q10 4 20 -2" stroke="' + INK + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
           '<path d="M46 36 q4 -3 7 1" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linecap="round"/>',
  glove:   '<path d="M18 44 v-16 q0 -5 5 -5 q5 0 5 5 v-6 q0 -5 5 -5 q5 0 5 5 v6 q0 -5 5 -5 q5 0 5 5 v12 q0 8 -7 8 h-11 q-7 0 -7 -8 Z" fill="#F2A0B5" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
           '<path d="M18 40 h-6 q-3 0 -3 -4 q0 -3 3 -3 h6" fill="#F2A0B5" stroke="' + INK + '" stroke-width="2.4"/>' +
           '<path d="M44 14 q4 -4 7 0" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linecap="round"/>',
  swing:   '<path d="M10 12 h36 M14 12 v34 M42 12 v34" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
           '<path d="M22 14 v20 M34 14 v20" stroke="#8A9BAE" stroke-width="2.2"/>' +
           '<rect x="18" y="34" width="20" height="6" rx="3" fill="#E8975A" stroke="' + INK + '" stroke-width="2.4"/>' +
           '<path d="M46 22 q4 -3 6 0" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linecap="round"/>',
  car:     '<rect x="8" y="26" width="34" height="14" rx="6" fill="#A8CBEA" stroke="' + INK + '" stroke-width="2.6"/>' +
           '<path d="M16 26 l4 -8 h12 l5 8" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
           '<circle cx="17" cy="42" r="4" fill="' + INK + '"/><circle cx="34" cy="42" r="4" fill="' + INK + '"/>' +
           '<path d="M46 22 q4 -3 6 0" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linecap="round"/>',
  sticker: '<rect x="12" y="12" width="30" height="30" rx="6" fill="#F5C542" stroke="' + INK + '" stroke-width="2.6" transform="rotate(-6 27 27)"/>' +
           '<path d="M27 19 l3 6.5 l7 1 l-5 5 l1.2 7 l-6.2 -3.4 l-6.2 3.4 l1.2 -7 l-5 -5 l7 -1 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round" transform="rotate(-6 27 27)"/>' +
           '<path d="M40 40 q4 4 0 8 q-4 -4 0 -8 Z" fill="#9CC8E8" stroke="' + INK + '" stroke-width="1.8"/>',
  umbrella:'<path d="M6 28 a22 22 0 0 1 44 0 Z" fill="#A8CBEA" stroke="' + INK + '" stroke-width="2.6"/>' +
           '<path d="M6 28 q11 -14 22 0 q11 -14 22 0" stroke="' + INK + '" stroke-width="2.2" fill="none"/>' +
           '<path d="M28 28 v18 q0 5 -5 5 q-4 0 -5 -4" fill="none" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>' +
           '<path d="M46 44 q3 3 0 6 q-3 -3 0 -6 Z" fill="#9CC8E8" stroke="' + INK + '" stroke-width="1.6"/>',
  cake:    '<path d="M12 34 h32 v10 q0 4 -4 4 h-24 q-4 0 -4 -4 Z" fill="#F2A0B5" stroke="' + INK + '" stroke-width="2.6"/>' +
           '<ellipse cx="28" cy="34" rx="16" ry="5" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.4"/>' +
           '<path d="M28 28 v-10" stroke="' + INK + '" stroke-width="2.4" stroke-linecap="round"/>' +
           '<ellipse cx="28" cy="15" rx="2.6" ry="4" fill="#F5C542" stroke="' + INK + '" stroke-width="1.8"/>' +
           '<path d="M18 30 q2 3 4 0 M34 30 q2 3 4 0" stroke="' + INK + '" stroke-width="1.8" fill="none" stroke-linecap="round"/>',
  blocks:  '<rect x="8" y="30" width="16" height="14" rx="3" fill="#A8CBEA" stroke="' + INK + '" stroke-width="2.4"/>' +
           '<rect x="27" y="34" width="15" height="12" rx="3" fill="#F2A0B5" stroke="' + INK + '" stroke-width="2.4" transform="rotate(12 34 40)"/>' +
           '<path d="M14 26 v-6 M38 28 l4 -5" stroke="' + INK + '" stroke-width="2.2" stroke-linecap="round"/>',
  signpost:'<path d="M26 14 v34" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
           '<path d="M10 18 h30 l8 6 l-8 6 h-30 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
           '<circle cx="18" cy="24" r="2.4" fill="#FFF9EE"/>' +
           '<path d="M40 40 q3 4 0 8 q-3 -4 0 -8 Z" fill="#9CC8E8" stroke="' + INK + '" stroke-width="1.8"/>',
  bench:   '<path d="M8 24 h40 M8 30 h40" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
           '<path d="M12 30 v14 M44 30 v14 M12 38 h32" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>' +
           '<rect x="8" y="20" width="40" height="6" rx="3" fill="#E8975A" stroke="' + INK + '" stroke-width="2.4"/>' +
           '<path d="M48 14 q4 -3 6 0" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linecap="round"/>',
  book:    '<path d="M28 14 q-8 -4 -18 -2 v30 q10 -2 18 2 q8 -4 18 -2 v-30 q-10 -2 -18 2 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
           '<path d="M28 14 v30" stroke="' + INK + '" stroke-width="2.4"/>' +
           '<path d="M14 20 q6 -1 10 1 M14 27 q6 -1 10 1 M32 21 q6 -2 10 -1" stroke="' + INK + '" stroke-width="1.8" fill="none" stroke-linecap="round"/>' +
           '<path d="M44 38 q3 3 0 7 q-3 -4 0 -7 Z" fill="#9CC8E8" stroke="' + INK + '" stroke-width="1.6"/>',
  ball:    '<circle cx="28" cy="30" r="17" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
           '<path d="M28 13 v34 M11 30 h34 M16 18 q12 10 24 0 M16 42 q12 -10 24 0" stroke="' + INK + '" stroke-width="2" fill="none"/>' +
           '<circle cx="28" cy="30" r="4.5" fill="' + INK + '"/>' +
           '<path d="M48 16 q4 -3 6 0" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linecap="round"/>',
  bag:     '<path d="M14 22 h28 l3 24 q1 5 -4 5 h-26 q-5 0 -4 -5 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
           '<path d="M22 22 v-6 q0 -5 6 -5 q6 0 6 5 v6" fill="none" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>' +
           '<path d="M20 34 q8 5 16 0" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linecap="round"/>' +
           '<path d="M48 14 q4 -3 6 0" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linecap="round"/>',
  crayon:  '<g transform="rotate(-18 20 34)"><rect x="8" y="28" width="26" height="12" rx="4" fill="#F2A0B5" stroke="' + INK + '" stroke-width="2.4"/><path d="M34 28 h5 l4 3 v6 l-4 3 h-5 Z" fill="#E9D3B3" stroke="' + INK + '" stroke-width="2.2" stroke-linejoin="round"/></g>' +
           '<g transform="rotate(20 38 44)"><rect x="26" y="38" width="26" height="12" rx="4" fill="#A8CBEA" stroke="' + INK + '" stroke-width="2.4"/><path d="M52 38 h5 l4 3 v6 l-4 3 h-5 Z" fill="#E9D3B3" stroke="' + INK + '" stroke-width="2.2" stroke-linejoin="round"/></g>' +
           '<path d="M46 18 q3 3 0 6 q-3 -3 0 -6 Z" fill="#F5C542" stroke="' + INK + '" stroke-width="1.8"/>',
  heart:   '<path d="M28 44 q-16 -13 -16 -24 q0 -9 9 -9 q5 0 7 5 q2 -5 7 -5 q9 0 9 9 q0 11 -16 24 Z" fill="#F2A0B5" stroke="' + INK + '" stroke-width="2.6"/>' +
           '<path d="M46 12 q5 -4 9 0 q4 -4 8 0 q0 6 -8 11 q-8 -5 -8 -11 Z" transform="scale(.8) translate(14 0)" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.4"/>' +
           '<path d="M12 14 q3 3 0 6 q-3 -3 0 -6 Z" fill="#9CC8E8" stroke="' + INK + '" stroke-width="1.6"/>',
  paper:   '<path d="M14 12 h20 l8 8 v24 a4 4 0 0 1 -4 4 h-24 a4 4 0 0 1 -4 -4 v-28 a4 4 0 0 1 4 -4 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
           '<path d="M34 12 v8 h8" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linejoin="round"/>' +
           '<path d="M19 26 h14 M19 32 h14 M19 38 h9" stroke="' + INK + '" stroke-width="2" stroke-linecap="round"/>' +
           '<path d="M40 44 q4 4 0 8 q-4 -4 0 -8 Z" fill="#9CC8E8" stroke="' + INK + '" stroke-width="1.6"/>',
  medal:   '<path d="M18 10 l6 14 M38 10 l-6 14" stroke="#E8975A" stroke-width="3" stroke-linecap="round"/>' +
           '<circle cx="28" cy="34" r="12" fill="#F5C542" stroke="' + INK + '" stroke-width="2.6"/>' +
           '<path d="M28 27 l3 6 l7 1 l-5 5 l1 7 l-6 -3 l-6 3 l1 -7 l-5 -5 l7 -1 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="1.8" stroke-linejoin="round"/>' +
           '<path d="M44 20 q3 4 0 7 q-3 -3 0 -7 Z" fill="#9CC8E8" stroke="' + INK + '" stroke-width="1.6"/>'
};
function propSvg(kind) {
  const el = PROP_EL[kind] || PROP_EL.heart;
  return '<svg viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<g data-anim="prop-' + kind + '">' + el + '</g></svg>';
}

/* ---------- 图标（内嵌 SVG 描线风，主色 INK 暖棕） ---------- */
const ICONS = {
  /* logo：暖底圆牌 + 挑眉小熊头+一颗爱心（感恩主题锚） */
  logo: '<svg viewBox="0 0 44 44" width="28" height="28" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="13" cy="15" r="4.5" fill="#C89A6B" stroke="' + INK + '" stroke-width="2"/>' +
    '<circle cx="31" cy="15" r="4.5" fill="#C89A6B" stroke="' + INK + '" stroke-width="2"/>' +
    '<circle cx="22" cy="24" r="11" fill="#C89A6B" stroke="' + INK + '" stroke-width="2"/>' +
    '<path d="M17 23 q2.5 3 5 0 M24.5 23 q2.5 3 5 0" stroke="' + INK + '" stroke-width="1.8" fill="none" stroke-linecap="round"/>' +
    '<path d="M22 40 q-6 -4 -6 -8 q0 -3.4 3 -3.4 q3 0 3 3.4 q0 -3.4 3 -3.4 q3 0 3 3.4 q0 4 -6 8 Z" fill="#F2A0B5" stroke="' + INK + '" stroke-width="1.6"/></svg>',
  hear: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M11 25 h10 l13 -11 v36 l-13 -11 h-10 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M43 23 q6 9 0 18 M50 16 q11 16 0 32" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>'
};
