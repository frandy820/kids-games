/* ================= ?verify=1 自检（仅 verify 分支加载执行）——r17
   ① 静态 32 + 生成 8 关全量审计（flat 0-39）：确定性（同 flat 两次 JSON 一致）/
     章型规则（structWhy 全 null）/ 章号映射（ch=flat/8+1，dch 静态 1+flat//8+生成 1-4）/
     引擎直驱三族（findexact/reverse 1 tap→right·末题 done；findall 勾满→submit→right·done）/
     40 关×8 题对账（每关恰 8 题）+ 同关去重（结论互异+卡集合签名互异）
   ② SPEC 表独立对账（SPEC_BANK——verify 内从 SPEC-BATCH32 §-r17-evidence 文字独立重列，
     不引用页面 EV_BANK）× 40 关全题：结论 ⊆封闭 20 / EV_BANK 深度相等 /
     findexact 候选 4=恰 1 真+3 干扰（dch1 全 none/dch≥2 weak≥1+none≥1——档位律独立表）/
     findall 候选 4=真 3+干扰 1（answers 独立复算升序）/ reverse 候选 4=真 3+非真 1
     （answer=非真卡复算）/ 屏显问句逐字 / flat0q0=rainwet findexact puddle（教学锚）
   ③ 题库封闭专项：20 结论 id 互异+真证据 3×20=60 全局互异+干扰 5×20（weak2+none3）/
     全库 img 唯一数 114 钉死
   ④ 聚合独占票：dch1/2 全 findexact / dch3 全 findall / dch4 三族都在场 /
     生成关 dch1-4 全现（flat 32-39）
   ⑤ tapFindexact 单元（flat0 rainwet puddle）：越界=null；首错=wrong+miss1+
     错链 [evi_wrong, TTS「能证明吗」keyless 尾]+结论卡 pulse；窗内二错吞 false；
     窗后二错 miss2+正确卡 breathe（答案级 miss≥2 才亮）；对=right+确认链 [evi_right]
     单段；重听链=[evi_c_<concl>, evi_q1]
   ⑥ tapFindall 单元（flat16 ch3 全 findall）：shape（answers 升序 len3/picked 空/
     提交钮在场）；空选提交=false；勾干扰→armed；提交=wrong（F17：错选位清除 picked∩answers
     =空）+错链；窗内勾选中性不吞+窗内提交吞；勾满三张→ready；提交=right+step+1+
     确认链 [evi_right]；pick/unpick 往返=零惩罚
   ⑥b tapReverse 单元（flat24 ch4 遍历寻 reverse）：shape（answer=非真卡/answers null）；
     点真值卡=wrong+miss1；点非真卡=right+确认链
   ⑦ findall 末题通关分流（引擎级）：末题 findall 勾满提交='done' 且 L.done
   ⑧ 帧内容断言（契约 M）：结论卡 data-concl/c-text==结论句逐字、证据卡 data-img==opts、
     每卡 SVG g[data-img] 存在+标签逐字、q-text==三族屏显问句逐字、
     提交钮随题型显隐（findexact/reverse=hidden/findall=在场）
   ⑨ 教学链：tutorialWatch() 真实走完（stub 存档）→ __evDemoR==='right' 且 tut='help'，
     watch 折算真实时长 ≤16s
   ⑩ 吞输入轻叮+可见回应：demo/locked 门拦钩子输入 + 卡排容器 bump（家族 D）
   ⑪ UI 冒烟：flat0 autoSolve（taps=8 判定步口径，恒 3★）/ flat16 autoSolve（taps=8——
     勾选不计步提交计 1）/ flat16 先 1 错（勾干扰提交）再 autoSolve（miss=1 → 2★）
   ⑫ 布局：双 viewport（1280×800/800×1180）×（flat0/16/24）：证据卡 ≥96×96、
     结论卡高 ≥56px、描边对比度 ≥3:1、overflowX ≤0、提交钮（在场时）≥48px
   ⑬ clips：evi_ 28 条 + core 3 条全注入 + duration 辨别器（实测 ±60ms 全表）
   ⑭ 星级三档：0=3★/1-2=2★/≥3=1★（永不 0 星）
   ⑮ 契约 A/B/E/F/I/J/K+I17/F17/MIG 源码断言（读自身合并 script 文本；检索串拼接防自匹配）
   ⑯ 章末预告 C7 独立硬编码对账（hint[i]↔CHAPTERS[i+1]）+ 生成关 nextHint 实算对账
   ⑰ estMs 语音窗动态断言：判对窗 2900 ≥ evi_right 2472+300=2772；错链豁免窗
     4242==2112+150+evi_again 1680+300（T46 实长口径）；题面链长（findexact max=5514/findall max=6402/
     reverse max=5658，知识断言）；watch 延 3300 ≥ 2928+300；结论句窗 3200 ≥
     evi_c_rainwet 1776+300；turn 延 2300 ≥ 1920+300；celebrate 3020 ≥ 2772
   ⑱ 时长模型 r17：modeled(0)===88100 精确钉死 + 40 关 min===88100/max 实测 +
     全关 ≥LEVEL_MIN_MS 40000 + 逐题 voiceWin≤DECIDE（语音从不撑时长）+
     DECIDE_MS 三族字面（8000/11500/9000）
   ⑲ SPEED=0.12 提速断言
   结果写 #verify-result + window.__evVlog + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;

  /* SPEC-BATCH32 §-r17-evidence §1 文字独立重列（禁抄页面 EV_BANK/CONCLS20/Q1-Q3/VOICE）
     ——20 结论逐字：真 3（t）+干扰 5（d：[img,label,weak|none]） */
  const SPEC_BANK = {
    rainwet: { text: '刚下过雨',
      t: [['puddle', '地上有水洼'], ['umbrella2', '路上好多人打伞'], ['wetground', '地面湿湿']],
      d: [['cloudy', '天上有云', 'weak'], ['wetdog', '小狗淋湿', 'weak'], ['flowerbed', '花坛开着花', 'none'],
          ['toycar', '玩具车放地上', 'none'], ['tvon', '电视放着动画片', 'none']] },
    snowplay: { text: '下过雪',
      t: [['snowman', '雪人立在门口'], ['icicle', '屋檐挂冰柱'], ['snowground', '地上盖着厚雪']],
      d: [['coldboy', '小朋友穿外套', 'weak'], ['mittens', '手套搭在暖气边', 'weak'], ['toycar', '玩具车放地上', 'none'],
          ['birdfly', '天上有小鸟飞', 'none'], ['calendar', '墙上挂着日历', 'none']] },
    birthday: { text: '今天有人过生日',
      t: [['cake', '桌上有大蛋糕'], ['gift', '手里拿礼物盒'], ['candles', '插蜡烛的蛋糕']],
      d: [['balloon', '房间里有气球', 'weak'], ['snackplate', '果盘摆着水果', 'weak'], ['tvon', '电视放着动画片', 'none'],
          ['storybook', '桌上摆着书', 'none'], ['plant', '窗台摆着绿植', 'none']] },
    cooked: { text: '妈妈刚做过饭',
      t: [['steam', '锅还在冒热气'], ['smell', '香味飘满厨房'], ['dishes', '碗还没洗']],
      d: [['apron', '围裙挂在钩上', 'weak'], ['basket', '菜篮装满蔬菜', 'weak'], ['fridge', '冰箱门开着', 'none'],
          ['calendar', '墙上挂着日历', 'none'], ['flowerpot', '花盆摆着', 'none']] },
    doghere: { text: '小狗来过',
      t: [['paw', '地上有狗爪印'], ['doghair', '沙发上有狗毛'], ['bonebone', '地上有啃过的骨头']],
      d: [['leash', '门口挂着牵狗绳', 'weak'], ['dogbowl', '地上摆着狗粮碗', 'weak'], ['ball', '地上有球', 'none'],
          ['catsleep', '小猫在睡觉', 'none'], ['bench', '公园长椅空着', 'none']] },
    windbig: { text: '刮过大风',
      t: [['treebend', '小树吹弯了'], ['leaves', '落叶铺了一地'], ['hatfly', '帽子被吹跑挂在树上']],
      d: [['cloudy2', '天上有乌云', 'weak'], ['scarfman', '有人围着围巾', 'weak'], ['flowerpot', '花盆摆着', 'none'],
          ['trafficlight', '路口的红绿灯', 'none'], ['stone', '草地上有大石头', 'none']] },
    paintday: { text: '刚画过画',
      t: [['painthand', '手上有颜料'], ['paintjar', '颜料罐开着没盖'], ['paper', '桌上摆着画好的画']],
      d: [['brush', '洗干净的笔挂起来', 'weak'], ['watercup', '桌上放着水杯', 'weak'], ['storybook', '桌上摆着书', 'none'],
          ['plant', '窗台摆着绿植', 'none'], ['catsleep', '小猫在睡觉', 'none']] },
    nightowl: { text: '昨晚很晚还有人醒着',
      t: [['lamp', '深夜台灯亮着'], ['cup', '桌上有喝了一半的热牛奶'], ['nightnoodles', '深夜泡面还冒着热气']],
      d: [['clock', '钟指向很晚', 'weak'], ['curtain', '窗帘拉着', 'weak'], ['plant', '窗台摆着绿植', 'none'],
          ['snail', '叶子上停着蜗牛', 'none'], ['bench', '公园长椅空着', 'none']] },
    washhands: { text: '刚洗过手',
      t: [['wettowel', '毛巾湿湿还在滴水'], ['sinkdrops', '洗手池边一滩水'], ['soapbub', '洗手台上还留着肥皂泡']],
      d: [['sleeves', '袖子卷得高高的', 'weak'], ['towelneat', '毛巾挂得整整齐齐', 'weak'], ['tvon', '电视放着动画片', 'none'],
          ['flowerbed', '花坛开着花', 'none'], ['trafficlight', '路口的红绿灯', 'none']] },
    ateorange: { text: '刚吃过橘子',
      t: [['peelings', '桌上堆着橘子皮'], ['halforange', '盘子里有剥了一半的橘子'], ['trashpeel', '垃圾桶里露出橘子皮']],
      d: [['orangeplate', '桌上摆着一盘橘子', 'weak'], ['napkins', '纸巾抽出来好几张', 'weak'], ['ball', '地上有球', 'none'],
          ['bench', '公园长椅空着', 'none'], ['calendar', '墙上挂着日历', 'none']] },
    haircut: { text: '刚剪过头发',
      t: [['hairfloor', '地上落了一层碎头发'], ['haircollar', '肩上还粘着小碎发'], ['broomhair', '扫帚边扫拢一堆碎发']],
      d: [['scissors', '剪刀摆在小台上', 'weak'], ['barberchair', '理发转椅摆在镜子前', 'weak'], ['tvon', '电视放着动画片', 'none'],
          ['plant', '窗台摆着绿植', 'none'], ['stone', '草地上有大石头', 'none']] },
    waterplant: { text: '刚浇过花',
      t: [['drops', '叶片上挂着小水珠'], ['traywater', '花盆托盘渗出了水'], ['soilwet', '盆土颜色深深发亮']],
      d: [['wateringcan', '喷壶立在花盆边', 'weak'], ['blooming', '花开得正艳', 'weak'], ['toycar', '玩具车放地上', 'none'],
          ['storybook', '桌上摆着书', 'none'], ['trafficlight', '路口的红绿灯', 'none']] },
    mopped: { text: '刚拖过地',
      t: [['wetshine', '地面亮亮的反着光'], ['mopdrip', '拖把头湿湿靠在墙边'], ['watertrail', '地上一道没干的水痕']],
      d: [['dooropen', '房门敞开通着风', 'weak'], ['slippers', '拖鞋整整齐齐摆成排', 'weak'], ['birdfly', '天上有小鸟飞', 'none'],
          ['flowerpot', '花盆摆着', 'none'], ['snail', '叶子上停着蜗牛', 'none']] },
    brushed: { text: '刚刷过牙',
      t: [['brushwet', '牙刷毛湿湿的'], ['pasteopen', '牙膏帽还没盖上'], ['cupdrain', '漱口杯倒扣着控水']],
      d: [['toothlay', '牙刷牙膏插在杯子里', 'weak'], ['mirrorspots', '镜子上溅了小水点', 'weak'], ['ball', '地上有球', 'none'],
          ['calendar', '墙上挂着日历', 'none'], ['bench', '公园长椅空着', 'none']] },
    fedfish: { text: '刚喂过鱼',
      t: [['feedcan', '鱼食罐开着没盖'], ['feedfloat', '水面漂着几粒鱼食'], ['feedspill', '鱼缸边撒了几粒鱼食']],
      d: [['fishup', '小鱼都游到水面上', 'weak'], ['tanklight', '鱼缸的小灯亮着', 'weak'], ['flowerbed', '花坛开着花', 'none'],
          ['storybook', '桌上摆着书', 'none'], ['stone', '草地上有大石头', 'none']] },
    playedblocks: { text: '刚搭过积木',
      t: [['blocksout', '积木摊了一地'], ['towerhalf', '桌上立着搭一半的积木塔'], ['sortbox', '积木箱的盖子开着']],
      d: [['blockbox', '积木箱摆在墙边', 'weak'], ['playmat', '游戏垫铺在地上', 'weak'], ['tvon', '电视放着动画片', 'none'],
          ['snail', '叶子上停着蜗牛', 'none'], ['trafficlight', '路口的红绿灯', 'none']] },
    drankmilk: { text: '刚喝过牛奶',
      t: [['milkring', '杯壁挂着一圈奶渍'], ['milkdrop', '桌上滴了两滴牛奶'], ['milkhalf', '插着吸管喝了一半的牛奶盒']],
      d: [['fridge', '冰箱门开着', 'weak'], ['milkcup', '桌上摆着小杯子', 'weak'], ['birdfly', '天上有小鸟飞', 'none'],
          ['catsleep', '小猫在睡觉', 'none'], ['plant', '窗台摆着绿植', 'none']] },
    wrotehomework: { text: '刚写过作业',
      t: [['notebookopen', '作业本摊开没合上'], ['eraserdust', '桌角堆着橡皮屑'], ['pencilrest', '铅笔搁在作业本上']],
      d: [['bagopen', '书包拉链敞开着', 'weak'], ['pencilcase', '文具盒开着盖', 'weak'], ['bench', '公园长椅空着', 'none'],
          ['stone', '草地上有大石头', 'none'], ['snail', '叶子上停着蜗牛', 'none']] },
    fixedbike: { text: '刚修过自行车',
      t: [['greasehand', '指缝里黑黑的油泥'], ['toolslay', '螺丝扳手摊在垫布上'], ['chainoff', '链条拆下搭在车架上']],
      d: [['toolbox', '工具箱开着盖', 'weak'], ['pump', '打气筒立在旁边', 'weak'], ['birdfly', '天上有小鸟飞', 'none'],
          ['flowerbed', '花坛开着花', 'none'], ['calendar', '墙上挂着日历', 'none']] },
    playedsandbox: { text: '刚玩过沙子',
      t: [['sandcastle', '沙坑里立着新堆的沙堡'], ['bucket', '沙坑里插着小桶和铲子'], ['sandshoes', '鞋边上撒着沙粒']],
      d: [['toybox', '沙滩玩具箱开着盖', 'weak'], ['dustypants', '裤脚上蹭了土', 'weak'], ['tvon', '电视放着动画片', 'none'],
          ['trafficlight', '路口的红绿灯', 'none'], ['plant', '窗台摆着绿植', 'none']] }
  };
  const SPEC_CONCLS = ['rainwet', 'snowplay', 'birthday', 'cooked', 'doghere', 'windbig', 'paintday', 'nightowl',
                       'washhands', 'ateorange', 'haircut', 'waterplant', 'mopped', 'brushed', 'fedfish',
                       'playedblocks', 'drankmilk', 'wrotehomework', 'fixedbike', 'playedsandbox'];
  const SPEC_Q1 = '哪张能证明它呀？';
  const SPEC_Q2 = '找出能证明它的三张图';
  const SPEC_Q3 = '哪张不能证明它呀？';
  const SPEC_WRONG_AGAIN = '能证明吗';            // 错链 TTS 尾段（4 字）
  const SPEC_DUR = { evi_tut_watch: 2928, evi_tut_turn: 1920, evi_hint: 2016, evi_right: 2472,
                     evi_wrong: 2112, evi_q1: 2232, evi_q2: 3120, evi_q3: 2376,
                     evi_c_rainwet: 1776, evi_c_snowplay: 1656, evi_c_birthday: 2256,
                     evi_c_cooked: 2040, evi_c_doghere: 1824, evi_c_windbig: 1728,
                     evi_c_paintday: 1704, evi_c_nightowl: 2832, evi_c_washhands: 1752,
                     evi_c_ateorange: 1920, evi_c_haircut: 1920, evi_c_waterplant: 1728,
                     evi_c_mopped: 1752, evi_c_brushed: 1752, evi_c_fedfish: 1752,
                     evi_c_playedblocks: 1896, evi_c_drankmilk: 1968, evi_c_wrotehomework: 1968,
                     evi_c_fixedbike: 2160, evi_c_playedsandbox: 1896,   // §-r17 §5 实测表
                     evi_again: 1680 };   // T46 阶段2 语义句「能证明吗」
  const SPEC_CHAPTER_HINTS = { 1: '有的证据在骗人，要看仔细', 2: '有的题要找齐三张证据',
                               3: '反过来想想哪张是假的', 4: '新一轮找证据' };
  const SPEC_GEN_HINTS = ['找一张真证据', '再挑一挑真假', '找齐三张证据', '找证据大集合'];
  const SPEC_DECIDE = { findexact: 8000, findall: 11500, reverse: 9000 };   // §-r17 §4（verify 独立钉）
  const SPEC_MODELED_MIN = 88100;                 // §-r17 §4：900+8*(8000+2900)（禁约数）
  const estMs = n => n * 345 + 600;               // b25 定版：SAPI ~345ms/字 + 600 落定余量（四方同步之 verify 侧）
  const unlocked = async () => {                  // 等错防重入/演出窗结束（verify 提速后 ≤1s）
    let wg = 0;
    while ((state.locked || state.demo) && wg++ < 900) await wait(50);
    return !(state.locked || state.demo);
  };
  /* Mj-1 语义句 clip 化（T46 阶段2）：错链尾段=evi_again 键段（text=TTS 兜底），
     全款拼播链无 keyless 段——链尾断言改键段直断 */
  /* SPEC_BANK 对账 helper：每题候选先验独立复算（不引用页面结构；档位律独立表） */
  const specCheck = (q, dch, flat, qi) => {
    const b = SPEC_BANK[q.concl];
    if (!b) return 'concl ' + flat + '/' + qi;
    const imgs = q.opts.map(o => o.img);
    const labels = q.opts.map(o => o.label);
    if (q.opts.length !== 4) return 'optLen ' + flat + '/' + qi;
    if (new Set(imgs).size !== 4) return 'optDup ' + flat + '/' + qi;
    const pool = b.t.map(e => e[0]).concat(b.d.map(e => e[0]));
    for (const v of imgs) if (pool.indexOf(v) < 0) return 'optPool ' + flat + '/' + qi;
    for (let j = 0; j < 4; j++) {                 // 标签逐字对账（含类型归属）
      const inT = b.t.find(e => e[0] === imgs[j]);
      const inD = b.d.find(e => e[0] === imgs[j]);
      const src = inT || inD;
      if (!src) return 'src ' + flat + '/' + qi;
      if (src[1] !== labels[j]) return 'label ' + flat + '/' + qi;
    }
    const tImgs = b.t.map(e => e[0]);
    const tCnt = imgs.filter(v => tImgs.indexOf(v) >= 0).length;
    const dImgs = imgs.filter(v => tImgs.indexOf(v) < 0);
    const tier = v => { const d = b.d.find(e => e[0] === v); return d ? d[2] : null; };
    if (dch <= 2 && q.kind !== 'findexact') return 'dch12 ' + flat + '/' + qi;   // 章型域
    if (dch === 3 && q.kind !== 'findall') return 'dch3 ' + flat + '/' + qi;
    if (q.kind === 'findexact') {
      if (tCnt !== 1) return 'truth1 ' + flat + '/' + qi;        // 防双真值：真池恰 1 在场
      if (q.text !== SPEC_Q1) return 'text1 ' + flat + '/' + qi;
      let expAns = -1;                            // answer 独立复算
      for (let j = 0; j < 4; j++) if (tImgs.indexOf(imgs[j]) >= 0) expAns = j;
      if (q.answer !== expAns) return 'ans ' + flat + '/' + qi;
      if (dImgs.length !== 3) return 'd3 ' + flat + '/' + qi;
      const w = dImgs.filter(v => tier(v) === 'weak').length;
      const n = dImgs.filter(v => tier(v) === 'none').length;
      if (dch === 1 && (w !== 0 || n !== 3)) return 'tier1 ' + flat + '/' + qi;   // 二分章：全 none
      if (dch >= 2 && !(w >= 1 && n >= 1)) return 'tier2 ' + flat + '/' + qi;    // 三档章：混合
    } else if (q.kind === 'findall') {
      if (tCnt !== 3) return 'truth3 ' + flat + '/' + qi;        // 三真值全在场
      if (q.text !== SPEC_Q2) return 'text2 ' + flat + '/' + qi;
      let exp = [];
      for (let j = 0; j < 4; j++) if (tImgs.indexOf(imgs[j]) >= 0) exp.push(j);
      if (q.answers.length !== 3 || q.answers[0] !== exp[0] || q.answers[1] !== exp[1] ||
          q.answers[2] !== exp[2]) return 'ans3 ' + flat + '/' + qi;              // answers 复算（升序）
      if (dImgs.length !== 1 || !tier(dImgs[0])) return 'd1 ' + flat + '/' + qi;
    } else {                                                     // reverse
      if (tCnt !== 3) return 'truth3 ' + flat + '/' + qi;
      if (q.text !== SPEC_Q3) return 'text3 ' + flat + '/' + qi;
      if (dImgs.length !== 1 || !tier(dImgs[0])) return 'd1 ' + flat + '/' + qi;
      let expR = -1;                              // answer=非真卡下标独立复算
      for (let j = 0; j < 4; j++) if (tImgs.indexOf(imgs[j]) < 0) expR = j;
      if (q.answer !== expR) return 'ansR ' + flat + '/' + qi;
    }
    if (flat === 0 && qi === 0) {                                 // 教学演示锚
      if (q.concl !== 'rainwet' || q.kind !== 'findexact' ||
          imgs[q.answer] !== 'puddle') return 'anchor ' + flat;
    }
    return null;
  };
  /* 遍历推进直到目标题型出现（在场保证：dch4 三族都在场） */
  const seekKind = async kind => {
    for (let g = 0; g < 10; g++) {
      const q = window.EV.quiz;
      if (!q) return null;
      if (q.kind === kind) return q;
      if (!(await unlocked())) return null;
      const qs = window.EV.quiz;
      let r;
      if (qs.kind === 'findall') {
        for (const a of qs.answers) await window.EV.tapOpt(a);
        r = await window.EV.tapSubmit();
      } else r = await window.EV.tapOpt(qs.answer);
      if (r === 'done' && window.EV.currentLevel.done) return null;
      if (r === false) return null;
    }
    return null;
  };

  /* ---- ①② 40 关全量审计 + SPEC 表独立对账 + 同关去重 ---- */
  const genDch = {}, missBad = [], tableOk = true, lenBad = [], dupBad = [];
  let badCase = null;
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1.quizzes) === JSON.stringify(L2.quizzes);      // 确定性
    if (L1.quizzes.length !== 8) lenBad.push(flat);                             // 40 关×8 题对账
    let ruleOk = true;
    for (let k = 0; k < L1.quizzes.length; k++) {
      const why = structWhy(L1.quizzes[k], L1.dch, flat, k);
      if (why) ruleOk = false;
    }
    /* 同关去重（§-r17 §3）：结论互异+卡集合签名互异 */
    const cs = L1.quizzes.map(q => q.concl);
    const sigs = L1.quizzes.map(q => q.concl + ':' + q.opts.map(o => o.img).sort().join(','));
    if (new Set(cs).size !== 8 || new Set(sigs).size !== 8) dupBad.push(flat);
    const expCh = Math.floor(flat / 8) + 1;                        // 章号独立复算
    const chOk = L1.ch === expCh;
    const dchOk = flat < 32 ? L1.dch === Math.floor(flat / 8) + 1  // 静态四档
                            : (L1.dch >= 1 && L1.dch <= 4);       // 生成关随机章参数
    /* 引擎直驱三族：findexact/reverse 1 tap→right·末 done；findall 勾满→submit→right·done */
    const L3 = genLevel(flat);
    let driveOk = true;
    for (let k = 0; k < L3.quizzes.length && driveOk; k++) {
      const q = L3.quizzes[k];
      const exp = k === 7 ? 'done' : 'right';
      if (q.kind === 'findexact' || q.kind === 'reverse') {
        const r = engTapOpt(L3, q.answer);
        if (r !== exp || q._miss !== 0) { driveOk = false; break; }
      } else {
        for (const a of q.answers) {
          if (engTapOpt(L3, a) !== 'pick') { driveOk = false; break; }
        }
        if (!driveOk) break;
        const r = engSubmit(L3);
        if (r !== exp || q._miss !== 0) { driveOk = false; break; }
      }
    }
    const solvedAll = L3.done && L3.step === 8 && L3.retries === 0 && engStars(L3) === 3;

    /* SPEC 表独立对账（每题：池/标签/真值数/档位律/answer 复算/问句逐字） */
    let specOk = true;
    const kindSeen = {};
    for (let k = 0; k < L1.quizzes.length; k++) {
      const q = L1.quizzes[k];
      kindSeen[q.kind] = (kindSeen[q.kind] || 0) + 1;
      const bad = specCheck(q, L1.dch, flat, k);
      if (bad) { badCase = bad; specOk = false; break; }
    }
    if (!specOk) tableOk = false;
    /* 聚合素材：dch1/2 只 findexact / dch3 只 findall / dch4 三族在场（§-r17 §3 章型域） */
    const needKinds = L1.dch <= 2 ? ['findexact'] : (L1.dch === 3 ? ['findall'] : ['findexact', 'findall', 'reverse']);
    for (const k of needKinds) if (!kindSeen[k]) missBad.push(flat + ':' + k);
    if (L1.dch <= 2 && kindSeen.findall) missBad.push(flat + ':earlyFA');
    if (L1.dch === 3 && kindSeen.findexact) missBad.push(flat + ':ch3FX');
    if (flat >= 32) genDch[L1.dch] = (genDch[L1.dch] || 0) + 1;
    const ok = det && ruleOk && chOk && dchOk && driveOk && solvedAll && specOk &&
               new Set(cs).size === 8 && new Set(sigs).size === 8;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, ruleOk: ruleOk, chOk: chOk,
                  dchOk: dchOk, driveOk: driveOk, solvedAll: solvedAll, specOk: specOk,
                  n: L1.quizzes.length, kinds: L1.quizzes.map(q => q.kind),
                  concls: L1.quizzes.map(q => q.concl) };
    if (flat < 32) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }

  /* ---- ③④ 聚合独占票 + 题库封闭专项 ---- */
  total++;
  let bankOk = true;
  const seenImg = new Set();
  for (const cid of SPEC_CONCLS) {
    const b = EV_BANK[cid];
    if (!b || b.text !== SPEC_BANK[cid].text) { bankOk = false; break; }
    if (!(b.true.length === 3 && b.dstr.length === 5)) { bankOk = false; break; }   // r17 池律：真3+干扰5
    const w = b.dstr.filter(d => d.type === 'weak').length;
    const n = b.dstr.filter(d => d.type === 'none').length;
    if (w !== 2 || n !== 3) { bankOk = false; break; }             // weak2+none3（档位入数据结构）
    for (const e of b.true) {                                     // 真场景全局互异（防真值歧义）
      if (seenImg.has(e.img)) { bankOk = false; }
      seenImg.add(e.img);
    }
    if (!bankOk) break;
    /* SPEC 逐字对账（真全量+干扰全量：img/label/type） */
    const tOk = b.true.every((e, i) => e.img === SPEC_BANK[cid].t[i][0] && e.label === SPEC_BANK[cid].t[i][1]);
    const dOk = b.dstr.every((e, i) => e.img === SPEC_BANK[cid].d[i][0] && e.label === SPEC_BANK[cid].d[i][1] &&
                                     e.type === SPEC_BANK[cid].d[i][2]);
    if (!tOk || !dOk) { bankOk = false; break; }
  }
  const dstrImgs = new Set();
  for (const cid of SPEC_CONCLS) for (const e of EV_BANK[cid].dstr) dstrImgs.add(e.img);
  const imgN = seenImg.size + dstrImgs.size;                       // 真 60 互异+干扰复用 54=114
  const aggOk = tableOk && bankOk && missBad.length === 0 && lenBad.length === 0 &&
    dupBad.length === 0 && imgN === 114 &&
    genDch[1] > 0 && genDch[2] > 0 && genDch[3] > 0 && genDch[4] > 0;
  if (aggOk) npass++;
  units.audit = { ok: aggOk, bad: badCase, missBad: missBad.slice(0, 5), lenBad: lenBad,
                  dupBad: dupBad, genDch: genDch, bankOk: bankOk, imgN: imgN };

  /* ---- ⑤ tapFindexact 单元（flat0 rainwet findexact puddle）---- */
  total++;
  startLevel(0);
  const q4 = window.EV.quiz;
  const initOk = q4 && q4.kind === 'findexact' && q4.concl === 'rainwet' &&
                 q4.opts.length === 4 &&
                 q4.opts[q4.answer].img === 'puddle' &&
                 q4.opts.every(o => typeof o.img === 'string' && typeof o.label === 'string') &&
                 q4.step === 0 && q4.miss === 0 && q4.picked.length === 0;
  const sbHiddenF = submitBtn.classList.contains('hidden');        // findexact 题提交钮隐藏
  const badTap = (await window.EV.tapOpt(99)) === null;           // 非法下标=null（不炸）
  const wA = q4.opts.findIndex((o, i) => i !== q4.answer);        // 干扰卡
  const pW = window.EV.tapOpt(wA);                                // → wrong（1000ms 防重入窗，fire-and-forget）
  const rejW = await window.EV.tapOpt(wA);                        // 窗内紧邻再点=被拦 false
  const rW = await pW;
  const chainA = window.__lastQueue && window.__lastQueue.length === 2 &&   // 错链=wrong clip+语义句 clip 键段（T46）
                window.__lastQueue[0] === 'evi_wrong' &&
                window.__lastQueue[1] && window.__lastQueue[1].key === 'evi_again' &&
                window.__lastQueue[1].text === SPEC_WRONG_AGAIN;
  const pulseOk = conclEl.classList.contains('pulse');            // 首错方向级=结论卡再 pulse
  const s1 = rW === 'wrong' && rejW === false && chainA && pulseOk &&
             window.EV.quiz.miss === 1 && window.EV.currentLevel.miss === 1;
  await unlocked();                              // locked 窗（1000×SPEED）开——错链豁免窗（4242 真时钟，T46）仍在
  const guardTap = await window.EV.tapOpt(wA);   // 错链窗内二错=guard 吞（pop+bump，不计 miss——契约 I 补）
  const guardOk = guardTap === false && window.EV.quiz.miss === 1;
  await new Promise(w => setTimeout(w, 5000));   // 等错链豁免窗（4242）过——窗后二错照计 miss=2
  const wB = q4.opts.findIndex((o, i) => i !== q4.answer && i !== wA);   // 另一干扰卡（二错）
  const rB = await window.EV.tapOpt(wB);
  await unlocked();
  const ansCard = cardEl(q4.answer);
  const litOk = rB === 'wrong' && window.EV.quiz.miss === 2 &&
                !!ansCard && ansCard.classList.contains('breathe');   // 答案级线索 miss≥2 才亮
  const rR = await window.EV.tapOpt(q4.answer);
  const chainR = window.__lastQueue && window.__lastQueue.length === 1 &&
                 window.__lastQueue[0] === 'evi_right';           // 确认链=right 单段
  const qNext = window.EV.quiz;                   // 对账当前题（flat0 全 findexact）
  replayQuiz(false);                              // 重听路径：题面链
  const chainQ = window.__lastQueue && window.__lastQueue.length === 2 &&
                 window.__lastQueue[0] === 'evi_c_' + qNext.concl &&
                 window.__lastQueue[1] === 'evi_q1';
  const s2 = rR === 'right' && chainR && chainQ && window.EV.quiz.step === 1 && window.EV.quiz.miss === 0;
  const tapOk = initOk && sbHiddenF && badTap && s1 && guardOk && litOk && s2;
  if (tapOk) npass++;
  units.tapFindexact = { ok: tapOk, init: initOk, submitHidden: sbHiddenF, badTap: badTap,
                         wrongA: s1, guard: guardOk, chain: chainA, pulse: pulseOk,
                         lit: litOk, right: s2, chainR: chainR, chainReplay: chainQ };

  /* ---- ⑥ tapFindall 单元（flat16 ch3 全 findall：F17 判分契约+提交钮状态机+豁免窗守卫） ---- */
  total++;
  startLevel(16);
  const qf = window.EV.quiz;
  const fShape = qf && qf.kind === 'findall' &&
                 Array.isArray(qf.answers) && qf.answers.length === 3 &&
                 qf.answers[0] < qf.answers[1] && qf.answers[1] < qf.answers[2] &&   // 升序
                 qf.picked.length === 0 && qf.opts.length === 4;
  const sbShown = !submitBtn.classList.contains('hidden');         // findall 题提交钮在场
  const emptySub = await window.EV.tapSubmit();                    // 空选不判（false 不计 miss）
  const emptyOk = emptySub === false && window.EV.quiz.miss === 0;
  const wI = qf.opts.findIndex((o, i) => qf.answers.indexOf(i) < 0);   // 干扰卡
  const rPk = await window.EV.tapOpt(wI);                          // 勾干扰='pick'（零惩罚）
  const armedOk = rPk === 'pick' && submitBtn.classList.contains('armed') &&
                  !submitBtn.classList.contains('ready') &&
                  window.EV.quiz.miss === 0 && window.EV.quiz.picked.length === 1;
  const rWf = await window.EV.tapSubmit();                         // 提交=wrong（F17：错选位清除）
  await unlocked();
  const f17a = rWf === 'wrong' && window.EV.quiz.miss === 1 &&
               window.EV.quiz.picked.length === 0 &&               // picked∩answers=空（干扰清除）
               window.__lastQueue && window.__lastQueue.length === 2 &&
               window.__lastQueue[0] === 'evi_wrong' &&
               window.__lastQueue[1] && window.__lastQueue[1].key === 'evi_again';   // T46 键段尾
  /* 契约 I r17：豁免窗内勾选中性不吞 / 窗内提交吞 */
  const pkWin = await window.EV.tapOpt(qf.answers[0]);             // 窗内勾真值='pick'（不吞）
  const subWin = await window.EV.tapSubmit();                      // 窗内提交=false（吞）
  const subWinOk = pkWin === 'pick' && subWin === false && window.EV.quiz.miss === 1;
  await new Promise(w => setTimeout(w, 5000));                     // 等豁免窗（4242，T46）过
  const pk1 = await window.EV.tapOpt(qf.answers[1]);
  const pk2 = await window.EV.tapOpt(qf.answers[2]);
  const readyOk = pk1 === 'pick' && pk2 === 'pick' &&
                  submitBtn.classList.contains('ready') &&
                  window.EV.quiz.picked.length === 3;
  const rRf = await window.EV.tapSubmit();                         // 勾满提交=right
  const chainD = window.__lastQueue && window.__lastQueue.length === 1 &&
                 window.__lastQueue[0] === 'evi_right';
  const rightOk = rRf === 'right' && window.EV.quiz.step === qf.step + 1 &&
                  window.EV.quiz.miss === 0 && chainD;
  /* pick/unpick 往返零惩罚（新题上） */
  const qf2 = window.EV.quiz;
  const pkA = await window.EV.tapOpt(qf2.answers[0]);
  const unA = await window.EV.tapOpt(qf2.answers[0]);              // 再点同卡=unpick
  const subE = await window.EV.tapSubmit();                        // 回到空选=不判
  const unpickOk = pkA === 'pick' && unA === 'unpick' &&
                   window.EV.quiz.picked.length === 0 && subE === false;
  const fOk = fShape && sbShown && emptyOk && armedOk && f17a && subWinOk && readyOk && rightOk && unpickOk;
  if (fOk) npass++;
  units.tapFindall = { ok: fOk, shape: fShape, submitShown: sbShown, empty: emptyOk,
                       armed: armedOk, f17wrong: f17a, guardWin: subWinOk, ready: readyOk,
                       right: rightOk, unpick: unpickOk };

  /* ---- ⑥b tapReverse 单元（flat24 ch4 遍历寻 reverse：点真=wrong/点非真=right） ---- */
  total++;
  startLevel(24);
  const qr = await seekKind('reverse');
  const rShape = qr && qr.kind === 'reverse' && qr.answer >= 0 && qr.answer < 4 &&
                 qr.answers === null && qr.picked.length === 0 &&
                 qr.text === SPEC_Q3;
  const tI = qr ? [0, 1, 2, 3].find(i => i !== qr.answer) : -1;    // 真值卡（reverse 点真=错）
  const rWrong = qr ? await window.EV.tapOpt(tI) : null;
  await unlocked();
  const rRight = qr ? await window.EV.tapOpt(qr.answer) : null;    // 非真卡=对
  const chainRv = window.__lastQueue && window.__lastQueue.length === 1 &&
                  window.__lastQueue[0] === 'evi_right';
  const rOk = rShape && rWrong === 'wrong' && window.EV.quiz && rRight === 'right' &&
              window.EV.quiz.step === qr.step + 1 && chainRv;
  if (rOk) npass++;
  units.tapReverse = { ok: rOk, shape: rShape, wrongTrue: rWrong, rightNonTrue: rRight };

  /* ---- ⑦ findall 末题通关分流（引擎级：末题勾满提交='done' 且 L.done） ---- */
  total++;
  let endFlat = -1;
  for (let flat = 16; flat < 24 && endFlat < 0; flat++) {
    if (genLevel(flat).quizzes[7].kind === 'findall') endFlat = flat;
  }
  let endOk = false, endR = null;
  if (endFlat >= 0) {
    const LE = genLevel(endFlat);
    for (let k = 0; k < 7; k++) {
      const q = LE.quizzes[k];
      for (const a of q.answers) engTapOpt(LE, a);
      engSubmit(LE);
    }
    const qE = LE.quizzes[7];
    if (qE.kind === 'findall') {
      for (const a of qE.answers) engTapOpt(LE, a);
      endR = engSubmit(LE);
      endOk = endR === 'done' && LE.done && LE.step === 8;
    }
  }
  if (endOk) npass++;
  units.findallEnd = { ok: endOk, flat: endFlat, r: endR };

  /* ---- ⑧ 帧内容断言（契约 M：渲染即引擎——结论卡/证据卡 DOM 与 quiz 对账） ---- */
  total++;
  const frameCheck = q => {
    const cOk = conclEl.dataset.concl === q.concl &&
                conclEl.dataset.kind === q.kind &&
                conclEl.querySelector('.c-text').textContent === SPEC_BANK[q.concl].text;
    const cards = Array.from(boardEl.querySelectorAll('.card'));
    const domOk = cards.length === q.opts.length &&
      cards.every((c, i) => c.dataset.img === q.opts[i].img &&
        c.querySelectorAll('svg > g[data-img]').length === 1 &&
        c.querySelector('svg > g[data-img]').dataset.img === q.opts[i].img &&
        c.querySelector('.nm').textContent === q.opts[i].label);
    const txtOk = qbarEl.querySelector('.q-text').textContent ===
                  (q.kind === 'findexact' ? SPEC_Q1 : (q.kind === 'findall' ? SPEC_Q2 : SPEC_Q3));
    const sbOk = submitBtn.classList.contains('hidden') === (q.kind !== 'findall');
    return cOk && domOk && txtOk && sbOk;
  };
  startLevel(0);                                        // ch1 findexact
  const fA = frameCheck(window.EV.quiz) && boardEl.querySelectorAll('.card').length === 4;
  startLevel(16);                                       // ch3 全 findall（含提交钮在场）
  const fB = frameCheck(window.EV.quiz) && !submitBtn.classList.contains('hidden');
  startLevel(24);                                       // ch4 混合（首题帧按其题型断言）
  const fC = frameCheck(window.EV.quiz);
  const frameOk = fA && fB && fC;
  if (frameOk) npass++;
  units.frame = { ok: frameOk, ch1: fA, ch3: fB, ch4: fC };

  /* ---- ⑨ 教学链：tutorialWatch 真实走完 → __evDemoR='right'（演示点水洼卡） ---- */
  total++;
  KIDS._save = function () { return { levels: {} }; };       // verify 页存档 stub
  KIDS.store.persist = function () {};
  startLevel(0);
  const t0 = Date.now();
  await tutorialWatch();
  const tw = (Date.now() - t0) / SPEED;                      // 折算真实页时长
  const tutOk = window.__evDemoR === 'right' && state.tut === 'help' &&
                cur.flat === 0 && cur.quizzes[0].concl === 'rainwet' && tw <= 16000;
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, demoR: window.__evDemoR, tut: state.tut, watchMs: Math.round(tw) };

  /* ---- ⑩ 吞输入轻叮+可见回应：demo/locked 门拦钩子输入 + 卡排容器 bump ---- */
  total++;
  startLevel(0);
  state.demo = true; state.locked = true;                    // 模拟教学"看"演示期
  const swallow1 = (await window.EV.tapOpt(0)) === false && boardEl.classList.contains('bump');
  state.demo = false; state.locked = true;                   // 演出窗口（locked）
  const swallow2 = (await window.EV.tapOpt(0)) === false;
  state.locked = false;                                      // 还原
  const swallowOk = swallow1 && swallow2 && window.EV.quiz.step === 0 && window.EV.quiz.miss === 0;
  if (swallowOk) npass++;
  units.swallow = { ok: swallowOk, demo: swallow1, locked: swallow2 };

  /* ---- ⑪ UI 冒烟 A：flat0 autoSolve 通关（全 findexact taps=8 判定步口径，恒 3 星） ---- */
  total++;
  startLevel(0);
  const a0 = await window.EV.autoSolve();
  const lv0 = window.EV.currentLevel;
  const smokeA = a0.done && a0.taps === 8 && lv0.done && lv0.won &&
                 engStars(cur) === 3 && !document.querySelector('.k-celebrate');
  if (smokeA) npass++;
  smokes.flat0 = { ok: smokeA, taps: a0.taps, stars: engStars(cur) };

  /* ---- ⑪ UI 冒烟 B：flat16（dch3 全 findall）autoSolve 通关（taps=8——勾选不计步） ---- */
  total++;
  startLevel(16);
  const faCnt = cur.quizzes.filter(q => q.kind === 'findall').length;
  const a16 = await window.EV.autoSolve();
  const smokeB = a16.done && a16.taps === 8 && faCnt === 8 && window.EV.currentLevel.done;
  if (smokeB) npass++;
  smokes.flat16 = { ok: smokeB, taps: a16.taps, findallN: faCnt };

  /* ---- ⑪ UI 冒烟 C：flat16 先 1 错（勾干扰提交）再 autoSolve（1 错=2 星） ---- */
  total++;
  startLevel(16);
  await unlocked();
  const qC = window.EV.quiz;
  const wrongC = qC.opts.findIndex((o, i) => qC.answers.indexOf(i) < 0);
  await window.EV.tapOpt(wrongC);
  const rC = await window.EV.tapSubmit();                     // F17 wrong（miss 1）
  const aC = await window.EV.autoSolve();
  const lvC = window.EV.currentLevel;
  const smokeC = rC === 'wrong' && aC.done && lvC.done && lvC.won &&
                 lvC.miss === 1 && engStars(cur) === 2;
  if (smokeC) npass++;
  smokes.flat16wrong = { ok: smokeC, r: rC, taps: aC.taps, miss: lvC.miss, stars: engStars(cur) };

  /* ---- ⑫ 布局：双 viewport ×（flat0 / flat16 / flat24） ---- */
  function lum(hexStr) {
    const m = hexStr.match(/#?([0-9a-f]{6})/i);
    if (!m) return null;
    const n = [0, 2, 4].map(i => parseInt(m[1].substr(i, 2), 16) / 255)
      .map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    return 0.2126 * n[0] + 0.7152 * n[1] + 0.0722 * n[2];
  }
  const ratioOf = (a, b) => { const x = lum(a), y = lum(b);
    return x == null || y == null ? 0 : (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const cssToHex = c => { const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    return m ? '#' + [1, 2, 3].map(i => ('0' + (+m[i]).toString(16)).slice(-2)).join('') : c; };
  function simView(w, h) {
    const g = $id('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    startLevel(g._simFlat);
    const need = window.EV.quiz ? window.EV.quiz.opts.length : 4;
    const cards = Array.prototype.map.call(boardEl.querySelectorAll('.card'), b => ({
      w: b.offsetWidth, h: b.offsetHeight }));
    const cH = conclEl.offsetHeight;
    const hitOk = cards.length === need && cards.every(b => b.w >= 96 && b.h >= 96);   // 证据卡=主答案按钮
    const conclOk = cH >= 56;                                       // 结论卡触摸目标
    const sbShown = !submitBtn.classList.contains('hidden');
    const sbOk = !sbShown || (submitBtn.offsetWidth >= 48 && submitBtn.offsetHeight >= 48);
    const cB = ratioOf('#4A3B2E', '#FBF6EC') >= 3 &&
               ratioOf(cssToHex(getComputedStyle(boardEl.querySelector('.card')).borderLeftColor), '#FFF9EE') >= 3;
    const cS = ratioOf(cssToHex(getComputedStyle(conclEl).borderLeftColor), '#FBF6EC') >= 3;
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, flat: g._simFlat, cards: cards.length, cardH: Math.min.apply(null, cards.map(c => c.h)),
             conclH: cH, hitOk: hitOk, conclOk: conclOk, sbOk: sbOk, contrast: cB && cS, ox: ox,
             pass: hitOk && conclOk && sbOk && cB && cS && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const flat of [0, 16, 24]) {
    $id('game')._simFlat = flat;
    sims.push(simView(1280, 800));
    sims.push(simView(800, 1180));
  }
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);                                            // 还原真实 viewport 布局
  const layoutOk = sims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims };

  /* ---- ⑬ clips：evi_ 29 条（r17 28+T46 语义句 1）+ core 3 条全注入 + duration 辨别器（±60ms 全表） ---- */
  total++;
  const keys = Object.keys(KIDS.voice.clips);
  const eviKeys = ['evi_tut_watch', 'evi_tut_turn', 'evi_hint', 'evi_right', 'evi_wrong',
                   'evi_q1', 'evi_q2', 'evi_q3', 'evi_again'].concat(SPEC_CONCLS.map(c => 'evi_c_' + c));
  const needAll = eviKeys.concat(['core_chapter_end', 'core_day_end', 'core_rest']);
  const preOk = keys.length === 32 &&
    needAll.every(k => keys.indexOf(k) >= 0 && KIDS.voice.clips[k].indexOf('data:audio/mpeg;base64,') === 0);
  const durKeys = Object.keys(SPEC_DUR);
  const durs = await Promise.all(durKeys.map(k => new Promise(res => {
    let done = false;
    const a = new Audio(KIDS.voice.clips[k]);
    const t = setTimeout(() => { if (!done) { done = true; res(-2); } }, 3000);
    a.onloadedmetadata = () => { if (!done) { done = true; clearTimeout(t); res(Math.round(a.duration * 1000)); } };
    a.onerror = () => { if (!done) { done = true; clearTimeout(t); res(-1); } };
  })));
  const durOk = durs.every((d, i) => Math.abs(d - SPEC_DUR[durKeys[i]]) <= 60);
  const clipsOk = preOk && durOk;
  if (clipsOk) npass++;
  units.clips = { ok: clipsOk, n: keys.length, durs: durs };

  /* ---- ⑭ 星级规则（引擎级构造直测：0=3★ / 1-2=2★ / ≥3=1★，永不 0 星） ---- */
  total++;
  const LA = genLevel(16);
  LA.retries = 0; const st3 = engStars(LA) === 3;
  LA.retries = 1; const st2a = engStars(LA) === 2;
  LA.retries = 2; const st2b = engStars(LA) === 2;
  LA.retries = 3; const st1 = engStars(LA) === 1;
  LA.retries = 9; const stFloor = engStars(LA) === 1;   // 永不 0 星
  const starsOk = st3 && st2a && st2b && st1 && stFloor;
  if (starsOk) npass++;
  units.stars = { ok: starsOk, st3: st3, st2: st2a && st2b, st1: st1, floor: stFloor };

  /* ---- ⑮ 契约 A/B/E/F/I/J/K+I17/F17/MIG 源码断言（读第 3 script 块=游戏块 data+engine+main
     ——verify 独立第 4 块源码不自匹配；E-M1/E-M2 修复后未拼接串恢复真断言效力） ---- */
  total++;
  const src = document.querySelectorAll('script')[2].textContent;
  const nLim = src.split('nextHint(lim - 1)').length - 1;
  const srcA = nLim === 2 &&                                   // A（r17 双 lim-1）：winFlow+启动两处实算
               src.indexOf('Math.max(0, lim - 1)') >= 0 &&      // 日末停留今日末关
               src.indexOf('nextHint(null)') < 0;               // 旧 null 实参禁再现（含注释）
  const srcB = src.indexOf('lastDir') >= 0 && src.indexOf('lastAct') >= 0 &&
               src.indexOf('if (idle > 14000 && Date.now() - lastDir > 14000)') >= 0 &&
               src.indexOf('idle > 30000') >= 0;   // B：救援双锚（14s 方向级独立节流/30s 答案级）
  const srcE = src.indexOf('sv.evidence && sv.evidence.tutSeen') >= 0;   // E：行为分流先查教学特例
  const srcF = src.indexOf('GEN_HINTS[genLevel(f + 1).dch - 1]') >= 0 &&   // F：生成关实算 dch-1
               src.indexOf('(ci + 1)' + ' % 4') < 0;   // 禁章序右移（检索串拼接防 verify 源码自匹配）
  const srcI = src.indexOf('wrongChainUntil = Date.now() + WRONG_CHAIN_WIN') >= 0 &&
               src.indexOf('if (Date.now() < wrongChainUntil) return;') >= 0 &&
               src.indexOf('lastWrongVoice = 0; wrongChainUntil = 0;') >= 0 &&
               src.indexOf('2112 + 150 + 1680 + 300') >= 0;   // I：豁免窗常量=4242（T46）+救援守卫+重置
  const srcJ = src.indexOf('now - lastWrongVoice > 10000') >= 0;          // J：语义句 10s 节流在场
  const srcK = src.indexOf("if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;") >= 0 &&
               src.indexOf('function rescueTick()') >= 0;   // K：面板守卫+命名函数
  const sigI17 = 'if (!demo && wrongChainUntil' + ' && Date.now() < wrongChainUntil)';
  const srcI17 = src.indexOf(sigI17) >= 0;                 // I r17：findall 豁免窗守卫挂 uiSubmit
  const sigF17 = 'picked.filter(i => q.ans' + 'wers.indexOf(i) >= 0)';
  const srcF17 = src.indexOf('function eng' + 'Submit(') >= 0 && src.indexOf(sigF17) >= 0;   // F17 判分契约实码
  const sigMIG = "getItem('kids" + "game_evidence')";
  const srcMIG = src.indexOf(sigMIG) >= 0 &&
                 src.indexOf("lv[(c - 1) + '-5'") >= 0 &&
                 src.indexOf('> CH_LEN - 1') >= 0;          // MIG：键基迁移 IIFE（矛盾态+脏键守卫）
  const srcOk = srcA && srcB && srcE && srcF && srcI && srcJ && srcK && srcI17 && srcF17 && srcMIG;
  if (srcOk) npass++;
  units.contract = { ok: srcOk, A: srcA, nLim: nLim, B: srcB, E: srcE, F: srcF, I: srcI, J: srcJ, K: srcK,
                     I17: srcI17, F17: srcF17, MIG: srcMIG };

  /* ---- ⑯ 章末预告 C7 独立硬编码对账 + 生成关 nextHint 实算对账 ---- */
  total++;
  const hintOk = CHAPTERS[1].hint === SPEC_CHAPTER_HINTS[1] &&   // hint[i] ↔ CHAPTERS[i+1]（家族 F）
                 CHAPTERS[2].hint === SPEC_CHAPTER_HINTS[2] &&
                 CHAPTERS[3].hint === SPEC_CHAPTER_HINTS[3] &&
                 CHAPTERS[4].hint === SPEC_CHAPTER_HINTS[4] &&
                 GEN_HINTS[0] === SPEC_GEN_HINTS[0] && GEN_HINTS[1] === SPEC_GEN_HINTS[1] &&
                 GEN_HINTS[2] === SPEC_GEN_HINTS[2] && GEN_HINTS[3] === SPEC_GEN_HINTS[3] &&
                 nextHint(7) === SPEC_CHAPTER_HINTS[1] &&        // 章末（ch1 打完 flat7）预告 ch2 文案
                 nextHint(15) === SPEC_CHAPTER_HINTS[2] &&
                 nextHint(23) === SPEC_CHAPTER_HINTS[3] &&
                 nextHint(31) === SPEC_CHAPTER_HINTS[4];
  const genOk = [32, 35, 38, 39].every(f => nextHint(f) === GEN_HINTS[genLevel(f + 1).dch - 1]);   // F：实算
  if (hintOk && genOk) npass++;
  units.hints = { ok: hintOk && genOk, chapters: [1, 2, 3, 4].map(i => CHAPTERS[i].hint), gen: GEN_HINTS };

  /* ---- ⑰ estMs 语音窗动态断言（b25 定版：窗 ≥ estMs/链实长；clip 实长 §-r17 §5 表）
     判对确认链=evi_right 2472 单段 → 演出窗 1600+1300=2900 ≥ 2772；
     错链豁免窗=2112+150+evi_again 1680+300=4242（T46 clip 实长口径——estMs 字数口径退役）；
     题面链（知识断言）：findexact max=2832+150+2232+300=5514 / findall max=2832+150+3120+300=6402
     / reverse max=2832+150+2376+300=5658 ---- */
  total++;
  const maxConcl = SPEC_DUR.evi_c_nightowl;                   // 结论句 max 2832（§-r17 §5）
  const winOk = (1600 + 1300) >= SPEC_DUR.evi_right + 300 &&                          // 判对窗 2900 ≥ 2772
                (2112 + 150 + SPEC_DUR.evi_again + 300) === 4242 &&                    // 错链窗=4242（T46）
                WRONG_CHAIN_WIN === 4242 &&                                             // 常量自证
                (maxConcl + 150 + SPEC_DUR.evi_q1 + 300) === 5514 &&                   // findexact 题面链 max
                (maxConcl + 150 + SPEC_DUR.evi_q2 + 300) === 6402 &&                   // findall 题面链 max
                (maxConcl + 150 + SPEC_DUR.evi_q3 + 300) === 5658 &&                   // reverse 题面链 max
                3300 >= SPEC_DUR.evi_tut_watch + 300 &&                                 // 教学 watch 演示延 ≥ 3228
                3200 >= SPEC_DUR.evi_c_rainwet + 300 &&                                 // 教学结论句窗 ≥ 2076
                2300 >= SPEC_DUR.evi_tut_turn + 300 &&                                  // turn 后读题延 ≥ 2220
                (2620 + 400) >= SPEC_DUR.evi_right + 300;                               // winFlow ≥ 2772
  const estData = { confirmWin: 1600 + 1300, confirmNeed: SPEC_DUR.evi_right + 300,
                    wrongChain: 4242, q1ChainMax: maxConcl + 150 + SPEC_DUR.evi_q1 + 300,
                    q2ChainMax: maxConcl + 150 + SPEC_DUR.evi_q2 + 300,
                    q3ChainMax: maxConcl + 150 + SPEC_DUR.evi_q3 + 300,
                    watchT: 3300, conclWin: 3200, turnDelay: 2300, rightFlow: 3020 };
  if (winOk) npass++;
  units.estWin = { ok: winOk, est: estData };

  /* ---- ⑱ 时长模型 r17（§-r17 §4）：modeled(0)===88100 精确钉死 + 40 关 min===88100
     + 全关 ≥LEVEL_MIN_MS + 逐题 voiceWin≤DECIDE（语音从不撑时长）+ DECIDE 三族字面 ---- */
  total++;
  const decOk = DECIDE_MS.findexact === SPEC_DECIDE.findexact &&
                DECIDE_MS.findall === SPEC_DECIDE.findall &&
                DECIDE_MS.reverse === SPEC_DECIDE.reverse;
  const m0Ok = modeled(0) === SPEC_MODELED_MIN;
  let mdMin = Infinity, mdMax = 0, minBad = 0, vwBad = 0;
  for (let f = 0; f < 40; f++) {
    const L = genLevel(f);
    const m = modeled(f);
    mdMin = Math.min(mdMin, m);
    mdMax = Math.max(mdMax, m);
    if (m < LEVEL_MIN_MS) minBad++;
    for (const q of L.quizzes) if (voiceWinMs(q) > DECIDE_MS[q.kind]) vwBad++;
  }
  const mdOk = m0Ok && decOk && mdMin === SPEC_MODELED_MIN && minBad === 0 && vwBad === 0;
  if (mdOk) npass++;
  units.modeled = { ok: mdOk, flat0: modeled(0), min: mdMin, max: mdMax,
                    minBad: minBad, voiceWinBad: vwBad, decide: decOk };

  /* ---- ⑲ verify 提速断言 ---- */
  total++;
  const speedOk = SPEED === 0.12;
  if (speedOk) npass++;
  units.speed = { ok: speedOk, SPEED: SPEED };

  const out = { game: 'evidence', total: total, pass: npass, layoutOk: layoutOk,
                levels: levels, gen: gen, units: units, smokes: smokes };
  $id('verify-result').textContent = JSON.stringify(out);
  window.__evVlog = out;                          // 外部断言挂点（任务书钩子）
  document.title = (npass === total && layoutOk) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL';
}

if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 未 init，audio.ctx 为 null，双保险）
     voice.play 记录 key+text（__lastVoiceKey/__lastVoiceText）；
     voice.queue 记录拼播链（__lastQueue）供反馈链/确认链绑定断言 */
  KIDS.audio.note = function () {};
  KIDS.audio.sfx = function () {};
  KIDS.speak = function () {};
  KIDS.voice.play = function (k, t) { window.__lastVoiceKey = k || null; window.__lastVoiceText = t || null; };
  KIDS.voice.say = function (t) { window.__lastSayText = t || null; };
  KIDS.voice.queue = function (parts) {
    window.__lastQueue = parts;
    window.__lastVoiceKey = parts && parts.length ? parts[0] : null;
  };
  runVerify();
}
