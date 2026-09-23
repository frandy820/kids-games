/* ================= comfort 安慰选择 游戏数据（r11 难度改造 2026-09-14，SPEC-BATCH36 §6 真值源）
   审计红款#36（AUDIT-56 行 48）：v1 好坏二分选卡，SPEC 自述不做模糊陷阱=天花板被设计压死
   （估 35-45s/关）。r11 三 delta（AUDIT 行 84 建议逐条）：
   ① 好卡排序：卡模型 v1 good:bool → r11 tier:'best'|'gray'|'bad'——ch1-2 择优二选
      [best,gray]（两个都是好选择，哪个「此刻最合适」——情境适配度比较）；反启发式设计：
      同一 label 跨情景 tier 翻转（抱抱它 gray@题0/best@题6/gray@题8；说没关系 gray@题2/
      best@题7/gray@题8/gray@题15）——「永远抱抱/永远讲道理」策略必失分，须读情景线索。
   ② 灰色中间选项：干扰项从「坏选择」升「有点用但不是最好」（梯度干扰非二分）——
      ch3-4 梯度三选 [best,gray,bad]：bad 淘汰后真正的认知负荷在 best vs gray 比较。
   ③ 后果预测（选择-后果因果链）：选完播后续情景——best→朋友破涕为笑+#outcome
      [data-out=best] 问题解决小动画（CELE_WIN 窗内）；gray→朋友「半好」态 meh（不哭了
      但还没开心）+#outcome[data-out=gray] 部分缓解+co_gray；bad→sadder 更难过+错链
      [co_wrong,co_hint]（v1 沿用）。三层后果 DOM 锚=verify 帧断言依据。
   情景句=题面 keyless TTS（say 非队列链——SPEC §1 契约 N 不适用沿袭）；best2 题题面
   后播方向锚 co_pick「都很好，哪个现在最好」（不指认——锚文本与全部卡 label 无子串
   交集，verify 断言）；错答零惩罚（卡回可重点，探索不罚）；miss 口径星级沿 v1。
   题库封闭 20 题（4 章×5）：ch1 择优入门（此刻实物需求）0-4 / ch2 择优进阶（情感↔行动
   翻转）5-9 / ch3 梯度三选 10-14 / ch4 梯度混合 15-19；生成关池 dch≤2→题 0-9 /
   dch≥3→题 10-19（引擎取材不变）。语义先验：每题恰一张 best（唯一解锚=best 下标
   verify 独立推导）+ best2 无 bad + grad3 恰 1 gray 恰 1 bad。
   r11 时长模型（estMs 家族定版 n*345+600——data 定义/main 注释/verify 独立副本/build
   字面四处同步，禁 +300 变体；语音窗与决策重叠取大者不重复计，dressup r10 先例）：
     DECIDE_MS：best2 10000（情境线索定位 3000+两候选适配评估 2×3000+择优比较 1000）/
       grad3 11000（三卡梯度分层扫描 3×2200+best/gray 择优 2400+确认 2000）；
     ADV=CELE_WIN 2940（判对推进窗=后果演出窗，r11 后果链认知内容）；
     每题=max(voiceWin, DECIDE)+ADV，voiceWin=ENTER 400+estMs(say)+300+(best2 加
     PICK_WIN 3252)；全 20 题验算 voiceWin 恒 ≤ DECIDE（语音窗从不撑时长：best2 最长
     13 字 9037<10000 / grad3 最长 12 字 5440<11000，审查 m-2 勘正）；40 关 modeled 最低
     =best2 章 5×12940=64700 ≥ LEVEL_MIN_MS 40000（grad3 章 69700）。 */
'use strict';

const INK = '#4A3B2E';                       // 统一暖棕描边（家族基调）
const WARM = '#E8975A';                      // 暖橙主色

/* ---------- 演出时序常量（SPEC-BATCH36 §4/§6 实长表；浏览器 Audio 实测） ----------
   co_tut_watch 2880 / co_tut_turn 1824 / co_hint 2904 / co_right 2640 / co_wrong 2544
   r11 新增：co_pick 2952（方向锚）/ co_gray 3240（灰色次优反馈）
   确认链窗 CELE_WIN=2940（=2640+300 精确）；坏卡错链豁免窗 WRONG_CHAIN_WIN=5898
   （=2544+150+2904+300）；灰卡反馈链豁免窗 GRAY_WIN=3540（=3240+300，r11）；
   择优题面锚窗 PICK_WIN=3252（=2952+300，r11——best2 题面 say 后串播）；
   题面 say 窗=estMs(句长)+300（家族 T 动态，max 13 字 '小猫的积木塔塌了，好想搭好'/
   '小狗的风筝挂树上了，够不到'→5085+300+400=5785）；坏卡演出锁 SHAKE_MS=1100。 ---------- */
const ENTER_MS = 400;                        // 朋友伤心出场动画窗（与题面 say 串行）
const CELE_WIN = 2940;                       // 破涕为笑演出窗 = co_right 2640+300（精确）
const SHAKE_MS = 1100;                       // 坏卡摇头+朋友更难过锁窗
const WRONG_CHAIN_WIN = 5898;                // 坏卡错链豁免窗=wrong 2544+150+hint 2904+300（真时钟）
const PICK_WIN = 3252;                       // 择优题面锚窗=co_pick 2952+300（r11，真时钟串播）
const GRAY_WIN = 3540;                       // 灰卡反馈链豁免窗=co_gray 3240+300（r11，真时钟）
const TUT_WATCH_WAIT = 3180;                 // ≥co_tut_watch 2880+300
const TUT_TURN_WAIT = 2124;                  // ≥co_tut_turn 1824+300
const estMs = s => s.length * 345 + 600;     // b25 定版：SAPI ~345ms/字+600（全字符口径，标点计入）

/* ---------- r11 时长模型（SPEC §6；与 verify 独立副本/build 断言三方同步） ---------- */
const DECIDE_MS = { best2: 10000, grad3: 11000 };   // 认知决策时长（5-6 岁试玩口径推算）
const ADV_MS = CELE_WIN;                     // 判对推进窗=后果演出窗（2940）
const LEVEL_MIN_MS = 40000;                  // 单关 modeled 下限硬断言（r11 门禁）
const quizDurMs = q => Math.max(ENTER_MS + estMs(q.say) + 300 +
                                   (q.kind === 'best2' ? PICK_WIN : 0),
                                DECIDE_MS[q.kind]) + ADV_MS;
const levelDurMs = L => L.quizzes.reduce((s, q) => s + quizDurMs(q), 0);

/* ---------- 章配置（SPEC §6：ch1-2 择优二选/ch3-4 梯度三选；进度章号单调递增、
   难度章号 dch=1+flat//5 静态四档；生成关 flat≥20 dch=ri(rnd,1,4) seeded）
   hint=章末预告**下一章**文案（hint[i] ↔ CHAPTERS[i+1]，家族 F 禁右移）；
   GEN_HINTS[k] ↔ dch=k+1（verify 双录断言） ---------- */
const CHAPTERS = {
  1: { name: '两个都很好', hint: '有时候最好的办法会变，想一想' },   // 预告 ch2 情境翻转
  2: { name: '哪个最合适', hint: '三个做法里，哪个最有用呢' },       // 预告 ch3 梯度三选
  3: { name: '有点用和最好', hint: '新老情景都来啦，帮朋友想到最好' }, // 预告 ch4 混合
  4: { name: '暖心小达人', hint: '新的难过情景来啦，继续帮朋友' }    // 预告生成关
};
const GEN_HINTS = ['两个做法都很好，哪个现在最好',   // dch1 择优二选
                   '帮法会变，想一想哪个最合适',     // dch2 择优进阶（翻转）
                   '三种做法，哪个最有用',           // dch3 梯度三选
                   '三个里挑最好的，帮朋友开心'];    // dch4 梯度混合
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案（与 voice/clips/manifest.json 严格一致，禁自造；前缀=co_
   已核 manifest 无占用（SPEC §4 2026-09-12 实查；r11 增 2 键 2026-09-14 再核）；
   r11 前 5 键文本一字不改（任务铁律） ---------- */
const VOICE = {
  watch: { key: 'co_tut_watch', text: '看！朋友伤心了' },
  turn:  { key: 'co_tut_turn',  text: '你来试一试' },
  hint:  { key: 'co_hint',      text: '想想怎样朋友会开心' },
  right: { key: 'co_right',     text: '朋友开心啦，真好' },
  wrong: { key: 'co_wrong',     text: '这样朋友会更难过哦' },
  pick:  { key: 'co_pick',      text: '都很好，哪个现在最好' },      // r11：择优题方向锚（不指认）
  gray:  { key: 'co_gray',      text: '这样有点用，还有更好的办法' } // r11：灰色次优反馈（部分缓解）
};
const Q_TEXT = '朋友难过了，帮帮它';          // 纯文字装饰句（不播——题面真值=情景句 TTS）

/* ---------- 20 题封闭题库（SPEC §6 全表逐条；情景句=题面 keyless TTS 真值源，verify
   双录对账；tier=best 唯一 / best2 恰 1 gray 0 bad / grad3 恰 1 gray 1 bad；
   卡序 shuffle 后 best 位置不恒定——禁位置学习）
   cards[{tier,label,icon}]——label ≤4 字为主（沿 v1 先例两条 5 字照录=真值优先）；
   icon=做法卡图标 id（三 tier 同构描线风，不靠颜色歧视档位——语义承载在图+语音）。
   say 长度铁律：best2 ≤13 字（voiceWin≤9037<DECIDE 10000）/ grad3 ≤12 字（≤5440<11000，审查 m-2 勘正）
   ——题4（教学演示题）恒 8 字控教学预算。 ---------- */
const SCENES = [
  /* ch1 择优入门·best2（题 0-4：此刻实物需求 vs 也有用但不解决此刻） */
  { anim: 'bear', prop: 'drop', say: '小熊的冰淇淋掉了，好想吃',
    cards: [{ tier: 'best', label: '递自己的', icon: 'give' },
            { tier: 'gray', label: '抱抱它',   icon: 'hug' }] },
  { anim: 'rabbit', prop: 'bandage', say: '小兔摔了一跤，膝盖流血了',
    cards: [{ tier: 'best', label: '找老师帮', icon: 'teacher' },
            { tier: 'gray', label: '扶它起来', icon: 'helpup' }] },
  { anim: 'cat', prop: 'blocks', say: '小猫的积木塔塌了，好想搭好',
    cards: [{ tier: 'best', label: '一起搭',   icon: 'together' },
            { tier: 'gray', label: '说没关系', icon: 'comfort' }] },
  { anim: 'dog', prop: 'tree', say: '小狗的风筝挂树上了，够不到',
    cards: [{ tier: 'best', label: '找大人帮', icon: 'teacher' },
            { tier: 'gray', label: '换样玩',   icon: 'playball' }] },
  { anim: 'sheep', prop: 'cup', say: '小羊的水杯打翻了',
    cards: [{ tier: 'best', label: '拿纸巾', icon: 'tissue' },
            { tier: 'gray', label: '等水干', icon: 'waitdry' }] },
  /* ch2 择优进阶·best2（题 5-9：情感↔行动翻转——同 label 跨情景 tier 翻转防启发式） */
  { anim: 'monkey', prop: 'photo', say: '小猴想妈妈了，眼泪汪汪',
    cards: [{ tier: 'best', label: '陪它等', icon: 'together' },
            { tier: 'gray', label: '给块糖', icon: 'candy' }] },
  { anim: 'bear', prop: 'cloud', say: '小熊害怕打雷声，躲起来了',
    cards: [{ tier: 'best', label: '抱抱它', icon: 'hug' },       // 抱抱它在此=best（题0 为 gray）
            { tier: 'gray', label: '陪它玩', icon: 'playball' }] },
  { anim: 'rabbit', prop: 'medal', say: '小兔跑步输了，好难过',
    cards: [{ tier: 'best', label: '说没关系', icon: 'comfort' }, // 说没关系在此=best（题2 为 gray）
            { tier: 'gray', label: '再跑一次', icon: 'rerun' }] },
  { anim: 'cat', prop: 'car', say: '小猫的小汽车不见了',
    cards: [{ tier: 'best', label: '一起找',   icon: 'together' },
            { tier: 'gray', label: '抱抱它',   icon: 'hug' }] },
  { anim: 'dog', prop: 'paper', say: '小狗把画画坏了，想哭',
    cards: [{ tier: 'best', label: '夸它努力', icon: 'comfort' },
            { tier: 'gray', label: '陪它再画', icon: 'repaint' }] },
  /* ch3 梯度三选·grad3（题 10-14：best+gray+bad——淘汰 bad 后 best vs gray 才是负荷） */
  { anim: 'bear', prop: 'drop', say: '小熊的冰淇淋掉了，好想吃',
    cards: [{ tier: 'best', label: '递自己的', icon: 'give' },
            { tier: 'gray', label: '抱抱它',   icon: 'hug' },
            { tier: 'bad',  label: '笑话它',   icon: 'laugh' }] },
  { anim: 'monkey', prop: 'photo', say: '小猴想妈妈了，眼泪汪汪',
    cards: [{ tier: 'best', label: '陪它等', icon: 'together' },
            { tier: 'gray', label: '给块糖', icon: 'candy' },
            { tier: 'bad',  label: '催别哭', icon: 'urge' }] },
  { anim: 'chick', prop: 'balloon', say: '小鸡的气球飞走了',
    cards: [{ tier: 'best', label: '再送一个', icon: 'give' },
            { tier: 'gray', label: '陪它玩',   icon: 'playball' },
            { tier: 'bad',  label: '说活该',   icon: 'laugh' }] },
  { anim: 'rabbit', prop: 'medal', say: '小兔跑步输了，好难过',
    cards: [{ tier: 'best', label: '说没关系', icon: 'comfort' },
            { tier: 'gray', label: '再跑一次', icon: 'rerun' },
            { tier: 'bad',  label: '嘲笑它',   icon: 'laugh' }] },
  { anim: 'pig', prop: 'moon', say: '小猪午睡被吵醒了',
    cards: [{ tier: 'best', label: '轻声说话', icon: 'whisper' },
            { tier: 'gray', label: '拍拍它',   icon: 'pat' },
            { tier: 'bad',  label: '大声吵',   icon: 'shout' }] },
  /* ch4 梯度混合·grad3（题 15-19：新情景+复现，gray 语义更贴近 best） */
  { anim: 'deer', prop: 'shoe', say: '小鹿的新鞋踩脏了',
    cards: [{ tier: 'best', label: '帮它擦', icon: 'helpup' },
            { tier: 'gray', label: '说没关系', icon: 'comfort' },
            { tier: 'bad',  label: '踩一脚',   icon: 'grab' }] },
  { anim: 'cat', prop: 'car', say: '小猫的小汽车不见了',
    cards: [{ tier: 'best', label: '帮着找',     icon: 'together' },
            { tier: 'gray', label: '抱抱它',     icon: 'hug' },
            { tier: 'bad',  label: '藏起来偷笑', icon: 'laugh' }] },
  { anim: 'squirrel', prop: 'puzzle', say: '小松鼠的拼图少一块',
    cards: [{ tier: 'best', label: '一起找',   icon: 'together' },
            { tier: 'gray', label: '夸它努力', icon: 'comfort' },
            { tier: 'bad',  label: '推乱拼图', icon: 'grab' }] },
  { anim: 'bear', prop: 'cloud', say: '小熊害怕打雷声',
    cards: [{ tier: 'best', label: '抱抱它',   icon: 'hug' },
            { tier: 'gray', label: '陪它玩',   icon: 'playball' },
            { tier: 'bad',  label: '关灯吓它', icon: 'scare' }] },
  { anim: 'horse', prop: 'bandage', say: '小马摔破了膝盖，流血了',
    cards: [{ tier: 'best', label: '找老师帮', icon: 'teacher' },
            { tier: 'gray', label: '扶它起来', icon: 'helpup' },
            { tier: 'bad',  label: '说娇气',   icon: 'laugh' }] }
];

/* ---------- T46 化（2026-09-19）：题面情景句 clip 化——voice.say→voice.play（键
   co_sc_1..20 与 SCENES 顺序一一对应注册于 manifest；重复句 4 组取首现键——同文同音
   无损）。窗口径保留 estMs 上界：20 句实测 clip 实长全部 ≤ estMs（保守成立，
   窗不动——verify SPEC_CO_SC 逐句对账；max=co_sc_3 3624）。 ---------- */
const SAY_CLIP = {};
SCENES.forEach((sc, i) => { if (!(sc.say in SAY_CLIP)) SAY_CLIP[sc.say] = 'co_sc_' + (i + 1); });
const sayClipOf = q => SAY_CLIP[q.say];          // 题面情景句键（play(key, text)——零 keyless）

/* ---------- 朋友动物 SVG（11 种，viewBox 0 0 140 130，头中心约 (70,78)）
   表情组（容器类控 mood——契约 M DOM 类层锚）：
   .fx-sad=伤心态（八字眉+闭眼下弯+嘴下弯+两滴泪 .tear 下落循环）
   .fx-meh=半好态（r11 灰卡后果：平眉+睁眼+小平笑+无泪——不哭了但还没开心）
   .fx-happy=破涕为笑（弯眼+咧嘴笑+腮红）
   根组 g[data-anim="friend"]——verify 帧内容断言锚（渲染即引擎）。 ---------- */
const F_EY = 72;                              // 眼睛基线 y
const FX_SAD =
  '<g class="fx-sad">' +
  '<path d="M40 ' + (F_EY - 16) + ' q6 4 12 6 M100 ' + (F_EY - 16) + ' q-6 4 -12 6" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +   // 八字眉
  '<path d="M41 ' + F_EY + ' q5.5 6 11 0 M88 ' + F_EY + ' q5.5 6 11 0" stroke="' + INK + '" stroke-width="3.4" fill="none" stroke-linecap="round"/>' +                // 闭眼下弯
  '<path d="M62 ' + (F_EY + 21) + ' q8 -7 16 0" stroke="' + INK + '" stroke-width="3.2" fill="none" stroke-linecap="round"/>' +                                       // 嘴下弯
  '<g class="tear"><path d="M46 ' + (F_EY + 7) + ' q4 6 0 9 q-4 -3 0 -9 Z" fill="#9CC8E8" stroke="' + INK + '" stroke-width="1.6"/></g>' +                           // 泪 1
  '<g class="tear t2"><path d="M94 ' + (F_EY + 7) + ' q4 6 0 9 q-4 -3 0 -9 Z" fill="#9CC8E8" stroke="' + INK + '" stroke-width="1.6"/></g>' +                        // 泪 2
  '</g>';
const FX_MEH =
  '<g class="fx-meh">' +
  '<path d="M40 ' + (F_EY - 15) + ' h12 M88 ' + (F_EY - 15) + ' h12" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +                    // 平眉（不再耷拉）
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
  bear:   /* 小熊：圆耳+口鼻（题 0/6/10/18） */
    '<circle cx="36" cy="34" r="15" fill="#B98A5D" stroke="' + INK + '" stroke-width="3.4"/>' +
    '<circle cx="36" cy="34" r="6.5" fill="#E9D3B3"/>' +
    '<circle cx="104" cy="34" r="15" fill="#B98A5D" stroke="' + INK + '" stroke-width="3.4"/>' +
    '<circle cx="104" cy="34" r="6.5" fill="#E9D3B3"/>' +
    '<circle cx="70" cy="80" r="42" fill="#C89A6B" stroke="' + INK + '" stroke-width="3.4"/>' +
    '<ellipse cx="70" cy="95" rx="19" ry="14" fill="#E9D3B3" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<ellipse cx="70" cy="88" rx="6" ry="4.6" fill="' + INK + '"/>',
  rabbit: /* 小兔：长耳粉内耳（题 1/7/13/19） */
    '<ellipse cx="50" cy="26" rx="12" ry="27" fill="#FBF7F0" stroke="' + INK + '" stroke-width="3.4" transform="rotate(-9 50 26)"/>' +
    '<ellipse cx="50" cy="28" rx="5.6" ry="17" fill="#F2B8C6" transform="rotate(-9 50 28)"/>' +
    '<ellipse cx="90" cy="24" rx="12" ry="28" fill="#FBF7F0" stroke="' + INK + '" stroke-width="3.4" transform="rotate(11 90 24)"/>' +
    '<ellipse cx="90" cy="26" rx="5.6" ry="18" fill="#F2B8C6" transform="rotate(11 90 26)"/>' +
    '<circle cx="70" cy="82" r="40" fill="#FBF7F0" stroke="' + INK + '" stroke-width="3.4"/>' +
    '<ellipse cx="70" cy="96" rx="5.6" ry="4.2" fill="#E8A0A8"/>',
  cat:    /* 小猫：三角耳+条纹额（题 2/8/16） */
    '<path d="M36 52 L40 16 L64 38 Z" fill="#F5B26B" stroke="' + INK + '" stroke-width="3.4" stroke-linejoin="round"/>' +
    '<path d="M104 52 L100 16 L76 38 Z" fill="#F5B26B" stroke="' + INK + '" stroke-width="3.4" stroke-linejoin="round"/>' +
    '<path d="M44 26 L52 34 M96 26 L88 34" stroke="' + INK + '" stroke-width="2.4" stroke-linecap="round"/>' +
    '<circle cx="70" cy="82" r="40" fill="#F5B26B" stroke="' + INK + '" stroke-width="3.4"/>' +
    '<path d="M60 46 l5 9 M70 44 v10 M80 46 l-5 9" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>' +
    '<path d="M66 92 l4 4 l4 -4" fill="#E8837A" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>',
  dog:    /* 小狗：垂耳+额头白斑（题 3/9） */
    '<ellipse cx="32" cy="72" rx="13" ry="24" fill="#A9744B" stroke="' + INK + '" stroke-width="3.4" transform="rotate(-13 32 72)"/>' +
    '<ellipse cx="108" cy="72" rx="13" ry="24" fill="#A9744B" stroke="' + INK + '" stroke-width="3.4" transform="rotate(13 108 72)"/>' +
    '<circle cx="70" cy="80" r="40" fill="#D9A56D" stroke="' + INK + '" stroke-width="3.4"/>' +
    '<path d="M61 44 q9 -9 18 0 q-2 13 -9 15 q-7 -2 -9 -15 Z" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<ellipse cx="70" cy="96" rx="7" ry="5.2" fill="' + INK + '"/>',
  sheep:  /* 小羊：云朵卷毛（题 4） */
    '<circle cx="38" cy="46" r="13" fill="#F3EDE2" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="102" cy="46" r="13" fill="#F3EDE2" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="48" cy="34" r="14" fill="#F3EDE2" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="92" cy="34" r="14" fill="#F3EDE2" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="70" cy="28" r="15" fill="#F3EDE2" stroke="' + INK + '" stroke-width="3"/>' +
    '<ellipse cx="70" cy="84" rx="36" ry="33" fill="#F6EFE4" stroke="' + INK + '" stroke-width="3.4"/>' +
    '<ellipse cx="70" cy="96" rx="6" ry="4.6" fill="#D98A8A"/>',
  monkey: /* 小猴：大圆耳+桃形脸（题 5/11） */
    '<circle cx="30" cy="66" r="14" fill="#9A6B45" stroke="' + INK + '" stroke-width="3.4"/>' +
    '<circle cx="30" cy="66" r="7" fill="#E9C9A8"/>' +
    '<circle cx="110" cy="66" r="14" fill="#9A6B45" stroke="' + INK + '" stroke-width="3.4"/>' +
    '<circle cx="110" cy="66" r="7" fill="#E9C9A8"/>' +
    '<circle cx="70" cy="76" r="40" fill="#9A6B45" stroke="' + INK + '" stroke-width="3.4"/>' +
    '<path d="M46 68 q24 -26 48 0 q-6 26 -24 26 q-18 0 -24 -26 Z" fill="#F0D9BC" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<ellipse cx="70" cy="93" rx="6" ry="4.6" fill="' + INK + '"/>',
  chick:  /* 小鸡：黄圆头呆毛（题 12） */
    '<circle cx="70" cy="78" r="40" fill="#F7D154" stroke="' + INK + '" stroke-width="3.4"/>' +
    '<path d="M64 38 q4 -13 13 -11 M73 38 q2 -9 9 -9" stroke="' + INK + '" stroke-width="2.8" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="70" cy="96" rx="11" ry="6" fill="#F0933F" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M60 96 h20" stroke="' + INK + '" stroke-width="2.2"/>',
  pig:    /* 小猪：粉头折耳+猪鼻（题 14） */
    '<path d="M36 50 q-14 2 -12 16 q8 8 18 2 Z" fill="#F0AEB2" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M104 50 q14 2 12 16 q-8 8 -18 2 Z" fill="#F0AEB2" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<circle cx="70" cy="80" r="40" fill="#F0AEB2" stroke="' + INK + '" stroke-width="3.4"/>' +
    '<ellipse cx="70" cy="94" rx="19" ry="13" fill="#E98F95" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<circle cx="62" cy="94" r="3.4" fill="' + INK + '"/><circle cx="78" cy="94" r="3.4" fill="' + INK + '"/>',
  deer:   /* 小鹿：枝角+瓜子脸（题 15） */
    '<path d="M44 38 v-14 m0 6 h-9 m9 4 h8 M96 38 v-14 m0 6 h-9 m9 4 h8" stroke="' + INK + '" stroke-width="3.2" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="52" cy="40" rx="10" ry="13" fill="#E8CFA8" stroke="' + INK + '" stroke-width="3" transform="rotate(-14 52 40)"/>' +
    '<ellipse cx="88" cy="40" rx="10" ry="13" fill="#E8CFA8" stroke="' + INK + '" stroke-width="3" transform="rotate(14 88 40)"/>' +
    '<ellipse cx="70" cy="82" rx="36" ry="38" fill="#E8CFA8" stroke="' + INK + '" stroke-width="3.4"/>' +
    '<ellipse cx="70" cy="95" rx="14" ry="10" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<ellipse cx="70" cy="90" rx="5.4" ry="4.2" fill="' + INK + '"/>',
  squirrel: /* 松鼠：尖耳+蓬颊（题 17） */
    '<path d="M40 46 L36 18 L60 36 Z" fill="#E1974F" stroke="' + INK + '" stroke-width="3.4" stroke-linejoin="round"/>' +
    '<path d="M100 46 L104 18 L80 36 Z" fill="#E1974F" stroke="' + INK + '" stroke-width="3.4" stroke-linejoin="round"/>' +
    '<circle cx="70" cy="82" r="40" fill="#E1974F" stroke="' + INK + '" stroke-width="3.4"/>' +
    '<ellipse cx="48" cy="88" rx="11" ry="14" fill="#F2C89A" opacity=".9"/>' +
    '<ellipse cx="92" cy="88" rx="11" ry="14" fill="#F2C89A" opacity=".9"/>' +
    '<ellipse cx="70" cy="96" rx="6" ry="4.4" fill="' + INK + '"/>',
  horse:  /* 小马：鬃毛+长脸（题 19） */
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

/* ---------- 后果气泡 SVG（r11 选择-后果因果链演出层；#outcome 容器 data-out 控显隐）
   best=问题解决（太阳+星+笑脸弧）/ gray=部分缓解（半云后小太阳——有点用但没全好）
   根组 g[data-anim=out-best|out-gray]——verify 后果断言锚（渲染即引擎）。 ---------- */
const OUTCOME_EL = {
  best:
    '<circle cx="46" cy="48" r="20" fill="#F5C542" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M46 20 v-8 M46 84 v-8 M18 48 h-8 M82 48 h-8 M26 28 l-6 -6 M66 68 l-6 -6 M66 28 l6 -6 M26 68 l6 -6" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M38 46 q3 4 6 0 M50 46 q3 4 6 0" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    '<path d="M40 54 q6 6 12 0" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    '<path d="M76 26 l3.5 7 l8 1 l-6 5.5 l1.5 8 l-7 -4 l-7 4 l1.5 -8 l-6 -5.5 l8 -1 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>',
  gray:
    '<path d="M20 52 a14 14 0 0 1 9 -24 a15 15 0 0 1 28 -2 a13 13 0 0 1 10 26 h-40 a12 12 0 0 1 -7 0 Z" fill="#C9D3DC" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="70" cy="52" r="14" fill="#F5C542" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M64 52 q2.6 3.4 5.2 0 M71 52 q2.6 3.4 5.2 0" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    '<path d="M64 58 q5 4 10 0" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    '<path d="M28 70 q3 6 0 10 M40 72 q2.6 5 0 8" stroke="#9CC8E8" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linecap="round"/>'
};
function outcomeSvg(kind) {
  const el = OUTCOME_EL[kind] || OUTCOME_EL.gray;
  return '<svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<g data-anim="out-' + kind + '">' + el + '</g></svg>';
}

/* ---------- 做法卡图标库（viewBox 0 0 104 76 描线风，三 tier 同构——不靠颜色歧视档位；
   根组 g[data-anim=<icon>]，verify 单元①断言全定义） ---------- */
const CARD_EL = {
  /* best 族 */
  give:     /* 递自己的/再送一个：小手托礼物 */
    '<path d="M16 50 q36 -26 72 0" stroke="' + INK + '" stroke-width="3.4" fill="none" stroke-linecap="round"/>' +
    '<path d="M52 50 v-8" stroke="' + INK + '" stroke-width="3"/>' +
    '<rect x="38" y="20" width="28" height="22" rx="5" fill="' + WARM + '" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M52 20 v22 M38 30 h28" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<circle cx="52" cy="30" r="4.5" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2"/>' +
    '<path d="M20 58 q6 8 16 10 M84 58 q-6 8 -16 10" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
  helpup:   /* 扶它起来/帮它擦：伸手+向上箭头+心 */
    '<path d="M30 62 q-4 -30 12 -34 l6 10 q14 -2 22 8 q10 12 4 22" fill="#FBF7F0" stroke="' + INK + '" stroke-width="3.2" stroke-linejoin="round"/>' +
    '<path d="M52 26 l6 -10 l6 10 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M46 52 q6 -7 12 0 q6 -7 12 0 q0 9 -12 15 q-12 -6 -12 -15 Z" fill="#F2A0B5" stroke="' + INK + '" stroke-width="2.4"/>',
  together: /* 一起搭/陪它等/一起找：两个小人并肩 */
    '<circle cx="36" cy="24" r="10" fill="#F5C542" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M24 60 q0 -22 12 -22 q12 0 12 22 Z" fill="#F5C542" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<circle cx="70" cy="24" r="10" fill="#A8CBEA" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M58 60 q0 -22 12 -22 q12 0 12 22 Z" fill="#A8CBEA" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M48 34 q5 -4 10 0" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>',
  hug:      /* 抱抱它：两条环抱手臂+大心 */
    '<path d="M52 40 C 30 20 14 44 34 58 M52 40 C 74 20 90 44 70 58" stroke="' + INK + '" stroke-width="3.4" fill="none" stroke-linecap="round"/>' +
    '<path d="M52 58 q-16 -14 -16 -26 q0 -10 10 -10 q6 0 10 6 q4 -6 10 -6 q10 0 10 10 q0 12 -24 42 Z" transform="scale(.62) translate(32 18)" fill="#F2A0B5" stroke="' + INK + '" stroke-width="3.6"/>',
  comfort:  /* 说没关系/夸它努力：对话气泡+星 */
    '<path d="M22 18 h60 a10 10 0 0 1 10 10 v22 a10 10 0 0 1 -10 10 h-38 l-14 12 v-12 h-8 a10 10 0 0 1 -10 -10 v-22 a10 10 0 0 1 10 -10 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M52 26 l4 8 l9 1 l-6.5 6 l1.5 9 l-8 -4.5 l-8 4.5 l1.5 -9 l-6.5 -6 l9 -1 Z" fill="#F5C542" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>',
  tissue:   /* 拿纸巾：纸巾盒+抽出的一片 */
    '<rect x="18" y="34" width="68" height="28" rx="7" fill="' + WARM + '" stroke="' + INK + '" stroke-width="3"/>' +
    '<ellipse cx="52" cy="34" rx="17" ry="6.5" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M46 28 q-8 -12 2 -18 q9 5 8 12" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>',
  whisper:  /* 轻声说话：手指竖唇嘘+小音符 */
    '<path d="M34 60 q-2 -26 10 -30 l4 8 q12 -2 18 8 q8 12 2 16" fill="#FBF7F0" stroke="' + INK + '" stroke-width="3.2" stroke-linejoin="round"/>' +
    '<path d="M70 34 q10 -6 16 2" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<path d="M78 14 v18" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>' +
    '<circle cx="75" cy="34" r="4" fill="' + INK + '"/>',
  teacher:  /* 找老师帮/找大人帮：圆帽人+星徽 */
    '<circle cx="46" cy="26" r="11" fill="#FBF7F0" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M30 62 q0 -22 16 -22 q16 0 16 22 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M20 22 h52 l-26 -14 Z" fill="#4A3B2E"/>' +
    '<path d="M78 30 l3.5 7 l8 1 l-6 5.5 l1.5 8 l-7 -4 l-7 4 l1.5 -8 l-6 -5.5 l8 -1 Z" fill="#F5C542" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>',
  /* gray 族（有点用但不是最好——r11 梯度干扰） */
  playball: /* 换样玩/陪它玩：皮球+小跳人 */
    '<circle cx="36" cy="46" r="18" fill="#A8CBEA" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M36 28 q-8 18 0 36 M36 28 q8 18 0 36 M18 46 h36" stroke="' + INK + '" stroke-width="2.2" fill="none"/>' +
    '<circle cx="72" cy="24" r="8" fill="#F5C542" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<path d="M64 60 q0 -18 16 -18 q10 0 10 18 Z" fill="#F5C542" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<path d="M80 46 l10 -8 M80 52 l12 -4" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>',
  waitdry:  /* 等水干：水洼+太阳慢晒 */
    '<path d="M22 56 a14 8 0 0 1 28 0 a14 8 0 0 1 -28 0 Z" fill="#9CC8E8" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M56 58 a10 6 0 0 1 20 0 a10 6 0 0 1 -20 0 Z" fill="#9CC8E8" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<circle cx="52" cy="26" r="12" fill="#F5C542" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<path d="M52 8 v-5 M52 44 v-4 M34 26 h-5 M75 26 h-5 M39 13 l-4 -4 M69 39 l-4 -4 M69 13 l4 -4 M39 39 l4 -4" stroke="' + INK + '" stroke-width="2.4" stroke-linecap="round"/>' +
    '<path d="M36 50 q8 4 16 0" stroke="#FFF9EE" stroke-width="2" fill="none" stroke-linecap="round"/>',
  candy:    /* 给块糖：糖果+包装 twist */
    '<ellipse cx="52" cy="40" rx="18" ry="13" fill="#F2A0B5" stroke="' + INK + '" stroke-width="3" transform="rotate(-8 52 40)"/>' +
    '<path d="M34 32 l-12 -8 v14 Z M70 48 l12 8 v-14 Z" fill="#F5C542" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M44 36 q4 -4 8 0 q4 -4 8 0" stroke="#FFF9EE" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
  rerun:    /* 再跑一次：跑步小人+回旋箭头 */
    '<circle cx="42" cy="18" r="8" fill="#F5C542" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<path d="M38 28 l-6 14 l8 4 M38 28 l10 6 l8 -4 M38 28 l4 12 M30 46 l-6 10 M34 50 l6 8" stroke="' + INK + '" stroke-width="2.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M78 30 a16 16 0 1 0 4 14" stroke="#8A9BAE" stroke-width="4" fill="none" stroke-linecap="round"/>' +
    '<path d="M74 24 L86 28 L78 40 Z" fill="#8A9BAE"/>',
  repaint:  /* 陪它再画：画笔+新画纸 */
    '<rect x="14" y="22" width="34" height="30" rx="4" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<path d="M20 44 q6 -12 10 -2 q4 8 8 -6" stroke="#A8CBEA" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    '<path d="M62 14 l16 16 l-22 22 l-16 -4 l4 -16 Z" fill="#F5C542" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<path d="M62 14 l16 16" stroke="' + INK + '" stroke-width="2" stroke-linecap="round"/>' +
    '<circle cx="52" cy="44" r="3" fill="' + INK + '"/>',
  pat:      /* 拍拍它：轻拍手掌+小睡帽 */
    '<path d="M34 34 q-6 12 2 24 q10 8 22 0 q8 -10 2 -24" fill="#FBF7F0" stroke="' + INK + '" stroke-width="3.2" stroke-linejoin="round"/>' +
    '<path d="M30 30 q6 -8 14 -6 q8 -8 16 0 q6 8 -2 12" fill="#FBF7F0" stroke="' + INK + '" stroke-width="3.2" stroke-linejoin="round"/>' +
    '<path d="M20 28 q8 -2 12 2" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    '<path d="M66 20 h22 l-4 12 h-14 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<circle cx="88" cy="36" r="3.4" fill="' + INK + '"/>',
  /* bad 族 */
  laugh:    /* 笑话它/嘲笑它/说活该/说娇气/藏起来偷笑：坏笑面具 */
    '<circle cx="52" cy="38" r="26" fill="#EDE3D2" stroke="' + INK + '" stroke-width="3.2"/>' +
    '<path d="M36 30 q6 -6 12 -2 M68 30 q-6 -6 -12 -2" stroke="' + INK + '" stroke-width="2.8" fill="none" stroke-linecap="round"/>' +
    '<path d="M38 44 q8 -6 14 0 q8 8 14 0" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<path d="M44 50 q8 6 16 0" fill="#D98A8A" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<path d="M84 22 l4 8 l9 1 l-6.5 6 l1.5 9 l-8 -4.5 l-8 4.5 l1.5 -9 l-6.5 -6 l9 -1 Z" fill="#C9BBAA" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>',
  grab:     /* 抢走积木/推乱拼图/踩一脚：抓夺之手+断星 */
    '<path d="M22 40 q0 -16 16 -16 h14 v-6 l16 10 l-16 10 v-6 h-12 q-6 0 -6 6 v10 Z" fill="#EDE3D2" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M62 44 l4 8 l9 1 l-6.5 6 l1.5 9 l-8 -4.5 l-8 4.5 l1.5 -9 l-6.5 -6 l9 -1 Z" fill="none" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round" stroke-dasharray="5 4"/>',
  urge:     /* 催别哭：闹钟+感叹 */
    '<circle cx="46" cy="42" r="24" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3.2"/>' +
    '<path d="M46 30 v12 l9 7" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<path d="M32 22 l-7 -7 M60 22 l7 -7" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M82 28 v14 M82 50 v3" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>',
  shout:    /* 大声吵：张嘴喊+声波 */
    '<circle cx="40" cy="40" r="22" fill="#EDE3D2" stroke="' + INK + '" stroke-width="3.2"/>' +
    '<ellipse cx="40" cy="46" rx="9" ry="7.5" fill="#D98A8A" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M70 26 q8 14 0 28 M80 18 q13 22 0 44" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>',
  scare:    /* 关灯吓它：黑灯泡+闪电 */
    '<circle cx="44" cy="36" r="22" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3.2"/>' +
    '<rect x="36" y="56" width="16" height="9" rx="3" fill="' + INK + '"/>' +
    '<path d="M44 16 v-6 M30 20 l-4 -5 M58 20 l4 -5" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>' +
    '<path d="M78 22 l-8 12 h7 l-9 14 l14 -16 h-8 l6 -10 Z" fill="#F5C542" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>'
};
function cardIconSvg(icon) {
  const el = CARD_EL[icon] || CARD_EL.helpup;
  return '<svg viewBox="0 0 104 76" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<g data-anim="' + icon + '">' + el + '</g></svg>';
}

/* ---------- 情景道具小图标（viewBox 0 0 56 56，舞台右下角点景） ---------- */
const PROP_EL = {
  drop:    '<path d="M20 16 v22 a8 8 0 0 0 16 0 v-14 l-6 -8 Z" fill="#F5C542" stroke="' + INK + '" stroke-width="2.6"/>' +
           '<path d="M40 40 q5 5 0 9 q-5 -4 0 -9 Z" fill="#9CC8E8" stroke="' + INK + '" stroke-width="2"/>',
  bandage: '<rect x="8" y="20" width="40" height="16" rx="8" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6" transform="rotate(-18 28 28)"/>' +
           '<circle cx="24" cy="26" r="2" fill="' + INK + '"/><circle cx="31" cy="30" r="2" fill="' + INK + '"/>',
  blocks:  '<rect x="8" y="30" width="16" height="14" rx="3" fill="#A8CBEA" stroke="' + INK + '" stroke-width="2.4"/>' +
           '<rect x="27" y="34" width="15" height="12" rx="3" fill="#F2A0B5" stroke="' + INK + '" stroke-width="2.4" transform="rotate(12 34 40)"/>' +
           '<path d="M14 26 v-6 M38 28 l4 -5" stroke="' + INK + '" stroke-width="2.2" stroke-linecap="round"/>',
  tree:    '<path d="M18 34 a10 10 0 0 1 6 -18 a9 9 0 0 1 16 4 a8 8 0 0 1 -2 14 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.6"/>' +
           '<path d="M28 34 v14" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
           '<path d="M40 12 q8 -6 12 2 q-6 8 -12 -2 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="2.2"/><path d="M40 12 q-8 2 -6 8" stroke="' + INK + '" stroke-width="1.8" fill="none"/>',
  cup:     '<path d="M14 20 h26 l-4 18 a8 8 0 0 1 -8 6 h-2 a8 8 0 0 1 -8 -6 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
           '<path d="M40 24 q8 2 6 8 q-2 4 -8 2" fill="none" stroke="' + INK + '" stroke-width="2.4"/>' +
           '<path d="M44 38 q4 5 0 9 q-4 -4 0 -9 Z" fill="#9CC8E8" stroke="' + INK + '" stroke-width="2"/><path d="M50 44 q3 4 0 7 q-3 -3 0 -7 Z" fill="#9CC8E8" stroke="' + INK + '" stroke-width="1.8"/>',
  photo:   '<rect x="12" y="12" width="32" height="28" rx="4" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
           '<circle cx="24" cy="24" r="5" fill="#F2A0B5" stroke="' + INK + '" stroke-width="2"/>' +
           '<path d="M14 36 q6 -8 12 -2 q5 -6 12 2" stroke="' + INK + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
           '<path d="M36 10 q4 -5 8 0 q4 -5 8 0 q0 6 -8 11 q-8 -5 -8 -11 Z" transform="scale(.6) translate(36 4)" fill="#F2A0B5" stroke="' + INK + '" stroke-width="3"/>',
  cloud:   '<path d="M14 34 a8 8 0 0 1 5 -14 a9 9 0 0 1 17 -1 a8 8 0 0 1 6 15 q-2 4 -8 4 h-14 q-6 0 -6 -4 Z" fill="#C9D3DC" stroke="' + INK + '" stroke-width="2.6"/>' +
           '<path d="M28 42 l-5 8 h5 l-4 7" fill="none" stroke="#F5C542" stroke="' + INK + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  medal:   '<path d="M18 10 l6 14 M38 10 l-6 14" stroke="#E8975A" stroke-width="3" stroke-linecap="round"/>' +
           '<circle cx="28" cy="34" r="12" fill="#F5C542" stroke="' + INK + '" stroke-width="2.6"/>' +
           '<path d="M28 27 l3 6 l7 1 l-5 5 l1 7 l-6 -3 l-6 3 l1 -7 l-5 -5 l7 -1 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="1.8" stroke-linejoin="round"/>' +
           '<path d="M44 20 q3 4 0 7 q-3 -3 0 -7 Z" fill="#9CC8E8" stroke="' + INK + '" stroke-width="1.6"/>',
  car:     '<rect x="8" y="26" width="34" height="14" rx="6" fill="#A8CBEA" stroke="' + INK + '" stroke-width="2.6"/>' +
           '<path d="M16 26 l4 -8 h12 l5 8" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
           '<circle cx="17" cy="42" r="4" fill="' + INK + '"/><circle cx="34" cy="42" r="4" fill="' + INK + '"/>' +
           '<path d="M46 22 q4 -3 6 0" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linecap="round"/>',
  paper:   '<path d="M14 12 h20 l8 8 v24 a4 4 0 0 1 -4 4 h-24 a4 4 0 0 1 -4 -4 v-28 a4 4 0 0 1 4 -4 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
           '<path d="M34 12 v8 h8" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linejoin="round"/>' +
           '<path d="M19 26 h14 M19 32 h14 M19 38 h9" stroke="' + INK + '" stroke-width="2" stroke-linecap="round"/>' +
           '<path d="M40 44 q4 4 0 8 q-4 -4 0 -8 Z" fill="#9CC8E8" stroke="' + INK + '" stroke-width="1.6"/>',
  balloon: '<path d="M30 8 a13 13 0 0 1 13 13 a13 13 0 0 1 -26 0 a13 13 0 0 1 13 -13 Z" fill="#F2A0B5" stroke="' + INK + '" stroke-width="2.6"/>' +
           '<path d="M30 34 q-2 3 0 5 q2 2 0 5" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linecap="round"/>' +
           '<path d="M8 44 q10 -6 18 0" stroke="' + INK + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
           '<path d="M46 12 q4 -4 7 0" stroke="' + INK + '" stroke-width="1.8" fill="none" stroke-linecap="round"/>',
  moon:    '<path d="M34 8 a16 16 0 1 0 10 26 a13 13 0 0 1 -10 -26 Z" fill="#F5C542" stroke="' + INK + '" stroke-width="2.6"/>' +
           '<path d="M14 18 h6 l2 -5 l2 5 h6 l-5 4 l2 6 l-5 -4 l-5 4 l2 -6 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="1.8" stroke-linejoin="round"/>' +
           '<path d="M12 36 q4 3 0 7 M18 42 q3 2 0 6" stroke="' + INK + '" stroke-width="1.8" fill="none" stroke-linecap="round"/>',
  shoe:    '<path d="M10 36 q0 -10 10 -10 h6 l6 8 h10 q8 0 8 8 v2 h-40 Z" fill="#A8CBEA" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
           '<path d="M12 44 h34" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>' +
           '<path d="M42 18 q4 3 0 7 q-4 -4 0 -7 Z" fill="#8A7059" stroke="' + INK + '" stroke-width="1.8"/>',
  puzzle:  '<rect x="10" y="16" width="16" height="16" rx="3" fill="#F5C542" stroke="' + INK + '" stroke-width="2.4"/>' +
           '<rect x="28" y="30" width="16" height="16" rx="3" fill="#A8CBEA" stroke="' + INK + '" stroke-width="2.4"/>' +
           '<rect x="28" y="12" width="13" height="13" rx="3" fill="#F2A0B5" stroke="' + INK + '" stroke-width="2.4" transform="rotate(14 34 18)"/>' +
           '<path d="M20 40 h8" stroke="' + INK + '" stroke-width="2.4" stroke-dasharray="3 3" stroke-linecap="round"/>'
};
function propSvg(kind) {
  const el = PROP_EL[kind] || PROP_EL.cloud;
  return '<svg viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<g data-anim="prop-' + kind + '">' + el + '</g></svg>';
}

/* ---------- 图标（内嵌 SVG 描线风，主色 INK 暖棕） ---------- */
const ICONS = {
  /* logo：暖底圆牌 + 泪眼小熊头+一颗心（安慰主题锚） */
  logo: '<svg viewBox="0 0 44 44" width="28" height="28" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="13" cy="15" r="4.5" fill="#C89A6B" stroke="' + INK + '" stroke-width="2"/>' +
    '<circle cx="31" cy="15" r="4.5" fill="#C89A6B" stroke="' + INK + '" stroke-width="2"/>' +
    '<circle cx="22" cy="24" r="11" fill="#C89A6B" stroke="' + INK + '" stroke-width="2"/>' +
    '<path d="M17 23 q2.5 3 5 0 M24.5 23 q2.5 3 5 0" stroke="' + INK + '" stroke-width="1.8" fill="none" stroke-linecap="round"/>' +
    '<path d="M22 36 q-6 -4 -6 -8 q0 -3.4 3 -3.4 q3 0 3 3.4 q0 -3.4 3 -3.4 q3 0 3 3.4 q0 4 -6 8 Z" fill="#F2A0B5" stroke="' + INK + '" stroke-width="1.6"/></svg>',
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
