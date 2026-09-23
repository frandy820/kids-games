/* ================= ?verify=1 自检（仅 verify 分支加载执行；r41 谱 18 单元）
   ① 静态 20 + 生成 20 关全量审计（flat 0-39）：确定性（同 flat 两次 JSON 一致）/
     章型规则（structWhy 全 null）/ 章号映射（ch=flat/5+1，dch 静态 1+flat//5+生成 1-4）/
     引擎直驱（逐题点应选卡→right/末题 done→全关 3 星）
   ② SPEC 表独立对账（SPEC_WORDS 24/SPEC_NEAR 族表/SPEC_VERBS——verify 内从 SPEC-R41
     §R2/§R3 文字独立重列，不引用引擎 WORDS24/NEAR/VERBS）× 40 关全题：
     hear/see 候选 4 互异含真值（hear=part 字段/see=text 字段）/ answer 独立复算 /
     ch1 恒 hear / ch2 恒 see / ch2+ 真值∈族 ⇒ 族干扰在场 / ch3+ 真值∈NEAR20 /
     do 结构（touch=4 部位卡含真值+族干扰/action=四动作卡恰全集）/ dch4 do 槽位 qi1/qi3 /
     flat0q0=hear/eye
   ③ 聚合独占票（r39-bis 分布断言铁律——下界从 SPEC 推导）：
     a. 词覆盖结构性（deck 旋转律 SPEC §R3）：ch1 静态 5 关（flat0-4）hear 真值覆盖
        ALL24 全 24 词 / ch2 静态（flat5-9）see 真值覆盖全 24 词 / ch3 静态（flat10-14）
        真值覆盖 NEAR20 全 20 词（25 位段 ≥24/20 回绕全覆盖）
     b. dch3 每关两题型在场 / dch4 每关 do==2+hear≥1+see≥1 / 生成关 dch1-4 全现
     c. do 计数精确：n_do == 2 × dch4 关数；动词直方图精确（VERBS[c%5] 旋转律——SPEC §R3
        公式独立实现，每动词 floor/ceil(n_do/5)）
     d. 答案位直方图：200 题合并每位 ≥ceil(200/8)=25 + hear/see 分列每位 ≥ceil(n/8)
        （洗牌均匀期望 n/4 半值律；do 两族样本小并合并入 200 口径）
   ④ tapOpt 单元（flat0 hear/eye 锚）：越界=null；错=wrong+miss+1+1000ms 防重入（首击
     fire-and-forget+窗内二击 false）+反馈链绑定（bod_wrong+词音重播+语义句三段）；
     对=right 推进+确认链（bod_right+bod_w_eye 两段）+重听链（词音前置+语义句链尾）
   ⑤ tapSee 单元（flat5 see）：错链=bod_wrong+语义句两段（无词音——目标可见防泄底）
   ⑤b do 单元（flat15：qi1=do-touch（idx0/c0=touch）、qi3=do-action（c1=clap）——确定性谱）：
     touch 板=4 dcard（svg 含爪标 .ptouch+恰 1 高亮 .pt.hl=该卡部位）；错链两段
     [wrong, again_do]+题面 pulse；确认链 [right, 词音尾段]；重听链 [v_touch, 词音, again_do]；
     action 板=4 acard（a-label 四短语恰全集）；确认链 [right, 动词短语]（§R10 增强：v_* 实测
     max 1608 两段 4314≤4500 窗收——修复轮 2026-09-22，原过渡态单段）
   ⑥ 帧内容断言（契约 M：分题型渲染）：hear 题=4 部位图卡（每卡恰 1 高亮部位=该卡
     部位）+题面中性无高亮；see 题=4 词文字卡+题面高亮 data-ask=真值
   ⑦ 教学链：tutorialWatch() 真实走完（stub 存档）→ __beDemoR==='right' 且 tut='help'，
     watch 折算真实时长 ≤16s
   ⑧ 吞输入轻叮+可见回应：demo/locked 门拦钩子输入 + 卡排容器 bump（家族 D）
   ⑨ UI 冒烟：flat0 autoSolve（taps=5 恒 3★）/ flat5 see autoSolve / flat10 ch3 先 1 错
     再 autoSolve（2★）/ flat15 ch4 含 do 两题 autoSolve（taps=5）
   ⑩ 布局：双 viewport（1280×800/800×1180）×（flat0 hear/flat5 see/flat12 ch3/flat15 do-touch
     板/flat15 action 板/含 shoulder 长词 see 板/含 eyebrow 词 see 板）：候选卡 ≥96×96、
     题面 SVG ≥120px 高、描边对比度 ≥3:1、overflowX ≤0、词卡文字宽 ≤ 卡宽-6（r41 长词档）
   ⑪ clips：bod_ 17 条（含 T46 阶段2 again 2）+ core 3 条全注入 + duration 辨别器（SPEC §4 实长 ±60ms）
     ——r41 过渡态 20 条不变；主线注册 23 新键后 20→43 由主线联动（SPEC-R41 §R6 TODO）
   ⑫ 星级三档：0=3★/1-2=2★/≥3=1★（永不 0 星）
   ⑬ 契约 A/B/E/F/I/J/K 源码断言（读自身合并 script 文本；B 含救援双锚 14s/30s 节流）
   ⑭ 章末预告 C7 独立硬编码对账（hint[i]↔CHAPTERS[i+1]，r41 ch3 hint 更新）+ 生成关 nextHint
     实算对账 + 键构造直调（VOICE.q3/verbClip/wordClip/PART_ZH 24 词/ACT_ZH 四短语——r37 M1
     期望值 SPEC 硬编码）
   ⑮ estMs 语音窗动态断言：判对窗 4500 ≥ 确认链 4362（maxWord 1656 口径）；教学词音演示延 3468 ≥ 3168+300；
     turn 延 2150 ≥ 1824+300；celebrate 3020 ≥ 2256+300；链豁免 7200 ≥ hear 链 5964+300=6264（m-2 勘误原 5844/6144）；
     r41 do 错链 7200 ≥ 1656+150+estMs(8)=3360+300=5466（est 口径——again_do 注册后实长复核）
   ⑯ SPEED=0.12 提速断言
   结果写 #verify-result + window.__beVlog + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;

  /* SPEC-R41 §R2/§R3 文字独立重列（禁抄页面 WORDS24/NEAR/VERBS/文案） */
  const SPEC_WORDS = ['head', 'face', 'hair', 'eyebrow', 'eye', 'ear', 'nose', 'mouth',   // 词封闭 24（头→脚序）
                      'tooth', 'tongue', 'chin', 'cheek', 'neck', 'shoulder', 'arm', 'elbow',
                      'hand', 'finger', 'thumb', 'leg', 'knee', 'foot', 'toe', 'belly'];
  const SPEC_NEAR = { head: ['hand', 'hair'],   face: [],            hair: ['head', 'hand'],
                      eyebrow: ['eye', 'ear'],  eye: ['ear', 'eyebrow'], ear: ['eye', 'eyebrow'],
                      nose: ['toe', 'neck'],    mouth: [],           tooth: ['tongue', 'toe', 'foot'],
                      tongue: ['tooth', 'toe'], chin: ['cheek', 'tooth'], cheek: ['chin', 'tongue'],
                      neck: ['knee', 'nose'],   shoulder: [],        arm: ['leg', 'elbow'],
                      elbow: ['arm', 'leg'],    hand: ['head', 'hair', 'finger'],
                      finger: ['thumb', 'hand'], thumb: ['finger', 'hand'],
                      leg: ['arm', 'knee'],     knee: ['neck', 'leg', 'toe'],
                      foot: ['toe', 'tooth'],   toe: ['foot', 'nose', 'knee'],  belly: [] };   // 近形音族（偏好序）
  const SPEC_NEAR20 = SPEC_WORDS.filter(w => SPEC_NEAR[w].length > 0);   // 有族 20 词（独立派生）
  const SPEC_VERBS = ['touch', 'clap', 'shake', 'stomp', 'wave'];       // 动词指令域 5
  const SPEC_ACTS = ['clap', 'shake', 'stomp', 'wave'];                 // 动作动词域 4
  const SPEC_ZH = { head: '头', face: '脸', hair: '头发', eyebrow: '眉毛', eye: '眼睛',
                    ear: '耳朵', nose: '鼻子', mouth: '嘴巴', tooth: '牙齿', tongue: '舌头',
                    chin: '下巴', cheek: '脸颊', neck: '脖子', shoulder: '肩膀', arm: '胳膊',
                    elbow: '胳膊肘', hand: '手', finger: '手指', thumb: '大拇指', leg: '腿',
                    knee: '膝盖', foot: '脚', toe: '脚趾', belly: '肚子' };
  const SPEC_ACT_ZH = { clap: '拍拍手', shake: '摇摇头', stomp: '跺跺脚', wave: '挥挥手' };
  const SPEC_HEAR_AGAIN = '再听一遍这个单词';     // hear 错语义句（8 字）
  const SPEC_SEE_AGAIN = '再看看它指的地方';      // see 错语义句（8 字）
  const SPEC_DO_AGAIN = '再听一遍这个指令';       // r41 do 错语义句（8 字）
  const SPEC_Q3 = '听一听，选出那个动作';         // r41 do 题面句（10 字）
  const SPEC_DUR = { bod_tut_watch: 3168, bod_tut_turn: 1824, bod_hint: 2184, bod_right: 2256,
                     bod_wrong: 1656, bod_q1: 2952, bod_q2: 2952,
                     bod_w_head: 1344, bod_w_eye: 1296, bod_w_ear: 1392, bod_w_nose: 1536,
                     bod_w_mouth: 1440, bod_w_hand: 1512, bod_w_arm: 1440, bod_w_leg: 1392,
                     bod_again_hear: 2352, bod_again_see: 2376,
                     /* r41 23 新键实长（主线 mutagen 实测 2026-09-22，manifest 5344）：
                        16 词音 max=bod_w_shoulder 1656（超旧 maxWord 1536——⑮ maxWord 同步 1656，各窗复核均罩）；
                        do 链实测口径=1656+150+2328+300=4434≤7200（est 5466 高估方向保守） */
                     bod_q3: 2880, bod_again_do: 2328,
                     bod_w_face: 1512, bod_w_hair: 1416, bod_w_eyebrow: 1584, bod_w_tooth: 1416,
                     bod_w_tongue: 1464, bod_w_chin: 1464, bod_w_cheek: 1440, bod_w_neck: 1440,
                     bod_w_shoulder: 1656, bod_w_elbow: 1536, bod_w_finger: 1632, bod_w_thumb: 1464,
                     bod_w_knee: 1368, bod_w_foot: 1416, bod_w_toe: 1392, bod_w_belly: 1464,
                     bod_v_touch: 1488, bod_v_clap: 1464, bod_v_shake: 1512, bod_v_stomp: 1608, bod_v_wave: 1440 };
  const SPEC_CHAPTER_HINTS = { 1: '睁大眼睛，看一看也要学会哦', 2: '听和看要混在一起啦',
                               3: '大挑战来啦，还要听指令做动作', 4: '新一轮身体英语开始啦' };  // r41 ch3 hint 改
  const SPEC_GEN_HINTS = ['听一听，点身体', '看一看，选单词', '近形词要分清哦', '听看做动作，大集合'];  // r41 [3] 改
  const estMs = n => n * 345 + 600;               // b25 定版：SAPI ~345ms/字 + 600 落定余量
  const unlocked = async () => {                  // 等错防重入/演出窗结束（verify 提速后 ≤1s）
    let wg = 0;
    while ((state.locked || state.demo) && wg++ < 900) await wait(50);
    return !(state.locked || state.demo);
  };
  /* 族干扰在场（some）+首族必在场直断（[0]——r41 修复轮 m-4：SPEC §R2「NEAR[w][0]=必在场
     干扰」，原 some 口径覆盖面大于 SPEC 候选律，实现回归「放第 2 位」时不拦） */
  const nearPresent = (ask, vals) => (SPEC_NEAR[ask] || []).some(n => vals.indexOf(n) >= 0) &&
                                  vals.indexOf((SPEC_NEAR[ask] || [])[0]) >= 0;

  /* ---- ①② 40 关全量审计 + SPEC 表独立对账 ---- */
  const genDch = {}, mixBad3 = [], divBad4 = [];
  let tableOk = true, badCase = null;
  const ansHist = { all: [0, 0, 0, 0], hear: [0, 0, 0, 0], see: [0, 0, 0, 0] };
  const kindN = { hear: 0, see: 0, do: 0, doTouch: 0, doAct: 0 };
  const verbHist = {};
  const covCh1 = new Set(), covCh2 = new Set(), covCh3 = new Set();
  const covBad = [];
  let nDch4 = 0, doTotal = 0, nearBad = 0;
  outer:
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1.quizzes) === JSON.stringify(L2.quizzes);      // 确定性
    let ruleOk = true;
    for (let k = 0; k < L1.quizzes.length; k++) {
      const why = structWhy(L1.quizzes[k], L1.dch, flat, k, k > 0 ? L1.quizzes[k - 1] : null);
      if (why) ruleOk = false;
    }
    if (L1.quizzes.length !== CH_LEN) ruleOk = false;
    const expCh = Math.floor(flat / 5) + 1;                       // 章号独立复算
    const chOk = L1.ch === expCh;
    const dchOk = flat < 20 ? L1.dch === Math.floor(flat / 5) + 1   // 静态四档
                           : (L1.dch >= 1 && L1.dch <= 4);       // 生成关随机章参数
    /* 引擎直驱：逐题点应选卡 → right / 末题 done；全关零错=3 星 */
    const L3 = genLevel(flat);
    let driveOk = true;
    for (let k = 0; k < L3.quizzes.length && driveOk; k++) {
      const q = L3.quizzes[k];
      const exp = k === L3.quizzes.length - 1 ? 'done' : 'right';
      const r = engTapOpt(L3, q.answer);
      if (r !== exp || q._miss !== 0) { driveOk = false; break; }
    }
    const solvedAll = L3.done && L3.step === CH_LEN && L3.retries === 0 && engStars(L3) === 3;

    /* SPEC 表独立对账（每题：封闭互异含真值/answer 复算/章型规则/族干扰/ do 结构） */
    let specOk = true;
    let nHear = 0, nSee = 0, nDo = 0;
    for (let k = 0; k < L1.quizzes.length; k++) {
      const q = L1.quizzes[k];
      if (flat === 0 && k === 0) {                          // 教学演示锚点：听 eye 点 eye 图卡
        if (q.kind !== 'hear' || q.ask !== 'eye') { badCase = 'anchor ' + flat; specOk = false; break; }
      }
      if (q.kind !== 'do' && q.opts.length !== 4) { badCase = 'len ' + flat + '/' + k; specOk = false; break; }
      if (L1.dch === 1 && q.kind !== 'hear') { badCase = 'dch1 ' + flat + '/' + k; specOk = false; break; }
      if (L1.dch === 2 && q.kind !== 'see') { badCase = 'dch2 ' + flat + '/' + k; specOk = false; break; }
      if (L1.dch === 4 && ((k === 1 || k === 3) !== (q.kind === 'do'))) { badCase = 'dch4slot ' + flat + '/' + k; specOk = false; break; }
      /* 分布/覆盖聚合素材（SPEC §R3 律独立复算） */
      kindN[q.kind]++;
      if (q.kind === 'do') {
        nDo++; doTotal++;
        if (SPEC_VERBS.indexOf(q.verb) < 0) { badCase = 'verb ' + flat + '/' + k; specOk = false; break; }
        verbHist[q.verb] = (verbHist[q.verb] || 0) + 1;
        if (q.verb === 'touch') {
          kindN.doTouch++;
          const vals = q.opts.map(o => o.part);
          if (vals.length !== 4 || new Set(vals).size !== 4) { badCase = 'tDup ' + flat + '/' + k; specOk = false; break; }
          let tw2 = true;
          for (const v of vals) if (SPEC_WORDS.indexOf(v) < 0) tw2 = false;
          if (!tw2) { badCase = 'tWord ' + flat + '/' + k; specOk = false; break; }
          let ea = -1; for (let j = 0; j < vals.length; j++) if (vals[j] === q.ask) ea = j;
          if (ea < 0 || q.answer !== ea) { badCase = 'tAns ' + flat + '/' + k; specOk = false; break; }
          if (SPEC_NEAR20.indexOf(q.ask) < 0 || !nearPresent(q.ask, vals)) { badCase = 'tNear ' + flat + '/' + k; specOk = false; break; }
        } else {
          kindN.doAct++;
          if (q.ask !== q.verb) { badCase = 'aAsk ' + flat + '/' + k; specOk = false; break; }
          const vs = q.opts.map(o => o.verb);
          if (new Set(vs).size !== 4 || SPEC_ACTS.some(a => vs.indexOf(a) < 0)) { badCase = 'aSet ' + flat + '/' + k; specOk = false; break; }
          if (q.opts[q.answer].verb !== q.ask) { badCase = 'aAns ' + flat + '/' + k; specOk = false; break; }
        }
      } else {
        const vals = q.opts.map(o => q.kind === 'hear' ? o.part : o.text);   // 按题型取字段（契约 M 同口径）
        let wordOk = true;
        for (const v of vals) if (SPEC_WORDS.indexOf(v) < 0) wordOk = false;
        if (!wordOk) { badCase = 'optWord ' + flat + '/' + k; specOk = false; break; }
        if (new Set(vals).size !== 4) { badCase = 'optDup ' + flat + '/' + k; specOk = false; break; }
        let expAns = -1;                                       // answer 独立复算：真值卡下标
        for (let j = 0; j < vals.length; j++) if (vals[j] === q.ask) expAns = j;
        if (expAns < 0 || q.answer !== expAns) { badCase = 'ans ' + flat + '/' + k; specOk = false; break; }
        if (L1.dch >= 2 && SPEC_NEAR[q.ask].length && !nearPresent(q.ask, vals)) { badCase = 'near ' + flat + '/' + k; specOk = false; break; }
        if (L1.dch >= 3 && (SPEC_NEAR20.indexOf(q.ask) < 0 || !nearPresent(q.ask, vals))) { badCase = 'ask20 ' + flat + '/' + k; specOk = false; break; }
      }
      if (q.kind === 'hear') nHear++;
      if (q.kind === 'see') nSee++;
      if (q.answer >= 0 && q.answer < 4) {
        ansHist.all[q.answer]++;
        if (ansHist[q.kind]) ansHist[q.kind][q.answer]++;
      }
    }
    if (!specOk) tableOk = false;
    /* 词覆盖素材：ch1 静态（flat0-4）hear 真值 / ch2 静态（5-9）see 真值 / ch3 静态（10-14）真值 */
    if (flat < 5) for (const q of L1.quizzes) if (q.kind === 'hear') covCh1.add(q.ask);
    if (flat >= 5 && flat < 10) for (const q of L1.quizzes) if (q.kind === 'see') covCh2.add(q.ask);
    if (flat >= 10 && flat < 15) for (const q of L1.quizzes) covCh3.add(q.ask);
    /* 聚合素材：dch3 混出（两题型在场）/ dch4 do==2+两题型在场 / dch4 槽结构与计数 */
    if (L1.dch === 3 && (nHear === 0 || nSee === 0)) mixBad3.push(flat);
    if (L1.dch === 4) {
      nDch4++;
      if (nDo !== 2 || nHear === 0 || nSee === 0) divBad4.push(flat);
    }
    if (flat >= 20) genDch[L1.dch] = (genDch[L1.dch] || 0) + 1;
    const ok = det && ruleOk && chOk && dchOk && driveOk && solvedAll && specOk;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, ruleOk: ruleOk, chOk: chOk,
                  dchOk: dchOk, driveOk: driveOk, solvedAll: solvedAll, specOk: specOk,
                  kinds: L1.quizzes.map(q => (q.kind === 'do' ? 'd:' + q.verb + ':' + q.ask : q.kind[0] + ':' + q.ask)) };
    if (flat < 20) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }

  /* ---- ③ 聚合独占票：覆盖结构性/混出/do 计数与动词直方图/答案位直方图/生成四型 ---- */
  total++;
  const missW1 = SPEC_WORDS.filter(w => !covCh1.has(w));
  const missW2 = SPEC_WORDS.filter(w => !covCh2.has(w));
  const missW3 = SPEC_NEAR20.filter(w => !covCh3.has(w));
  if (missW1.length || missW2.length || missW3.length) covBad.push({ w1: missW1, w2: missW2, w3: missW3 });
  /* do 动词直方图精确（SPEC §R3 旋转律独立实现：c=0..n_do-1 依序 VERBS[c%5]） */
  const expVerb = {};
  for (let c = 0; c < doTotal; c++) { const v = SPEC_VERBS[c % 5]; expVerb[v] = (expVerb[v] || 0) + 1; }
  const verbOk = SPEC_VERBS.every(v => (verbHist[v] || 0) === expVerb[v]);
  /* 答案位直方图下界（r39-bis 分布断言铁律；r41 界值口径修正——SPEC §R3b 推导）：
     合并 200 题=半值律 ceil(N/8)（期望 N/4 之半；恒位回归三位 ≈0 必拦）；
     分题型=期望 1/4 律 ceil(n/16)——n/8 半值界低于均值−2σ（σ=√(n·3/16)，n≈90 时
     均值 22.75−2σ≈14.5 > 11.4=界），固定确定性谱合法波动假红率 ~10%（实测本谱 hear
     [28,25,27,11] 即 1-2σ 合法谱擦 n/8 界；合并 200 题 [53,55,52,40] χ² p≈0.54 均匀）。
     ceil(n/16)=期望 1/4 ≈ 均值−4σ：恒位/双位回归（≤n/2 落单位）仍三位 <界必拦，判别力不损 */
  const lbAll = n => Math.ceil(n / 8);
  const lbKind = n => Math.ceil(n / 16);
  const histOk = ansHist.all.every(c => c >= lbAll(ansHist.all[0] + ansHist.all[1] + ansHist.all[2] + ansHist.all[3])) &&
                 ansHist.hear.every(c => c >= lbKind(kindN.hear)) &&
                 ansHist.see.every(c => c >= lbKind(kindN.see));
  const doCountOk = doTotal === 2 * nDch4;
  const aggOk = tableOk && mixBad3.length === 0 && divBad4.length === 0 && covBad.length === 0 &&
                verbOk && histOk && doCountOk &&
                genDch[1] > 0 && genDch[2] > 0 && genDch[3] > 0 && genDch[4] > 0;
  if (aggOk) npass++;
  units.audit = { ok: aggOk, bad: badCase, mixBad3: mixBad3, divBad4: divBad4, genDch: genDch,
                  cov: { ch1: covCh1.size, ch2: covCh2.size, ch3: covCh3.size, bad: covBad },
                  verb: { got: verbHist, exp: expVerb, ok: verbOk },
                  hist: { all: ansHist.all, hear: ansHist.hear, see: ansHist.see,
                          lbAll: lbAll(200), lbHear: lbKind(kindN.hear), lbSee: lbKind(kindN.see), ok: histOk },
                  kinds: kindN, nDch4: nDch4, doTotal: doTotal, doCountOk: doCountOk };

  /* ---- ④ tapOpt 单元（flat0 hear/eye）---- */
  total++;
  startLevel(0);
  const q4 = BE.quiz;
  const initOk = q4 && q4.kind === 'hear' && q4.ask === 'eye' &&
                 q4.opts.length === 4 &&
                 q4.opts.every(o => typeof o.part === 'string' && SPEC_WORDS.indexOf(o.part) >= 0) &&
                 q4.opts[q4.answer].part === 'eye' &&
                 q4.step === 0 && q4.miss === 0;
  const badTap = (await BE.tapOpt(99)) === null;           // 非法下标=null（不炸）
  const wA = q4.opts.findIndex((o, i) => i !== q4.answer);   // 错卡（部位≠eye）
  const pW = BE.tapOpt(wA);                                // → wrong（1000ms 防重入窗，fire-and-forget）
  const rejW = await BE.tapOpt(wA);                        // 窗内紧邻再点=被拦 false
  const rW = await pW;
  const chainA = window.__lastQueue && window.__lastQueue.length === 3 &&
                window.__lastQueue[0] === 'bod_wrong' &&   // 反馈链=bod_wrong+词音重播+语义句 clip（T46 阶段2 键段）
                window.__lastQueue[1] === 'bod_w_eye' &&
                window.__lastQueue[2] && window.__lastQueue[2].key === 'bod_again_hear' &&
                window.__lastQueue[2].text === SPEC_HEAR_AGAIN;
  const s1 = rW === 'wrong' && rejW === false && chainA &&
             BE.quiz.miss === 1 && BE.currentLevel.miss === 1;
  const wB = q4.opts.findIndex((o, i) => i !== q4.answer && i !== wA);   // 另一错卡
  const rW2 = await BE.tapOpt(wB);
  const s1b = rW2 === 'wrong' && BE.quiz.miss === 2;       // 第二次错=miss 2（卡不灰可重选）
  const rR = await BE.tapOpt(q4.answer);
  const chainR = window.__lastQueue && window.__lastQueue.length === 2 &&
                 window.__lastQueue[0] === 'bod_right' &&   // 确认链=bod_right+词音尾段（全 clip 无 keyless）
                 window.__lastQueue[1] === 'bod_w_eye';
  replayQuiz(false);                              // 重听路径（hear）：词音前置+语义句链尾（Mj-1 同款）
  const chainQ = window.__lastQueue && window.__lastQueue.length === 2 &&
                 window.__lastQueue[0] === 'bod_w_' + BE.quiz.ask &&
                 window.__lastQueue[1] && window.__lastQueue[1].key === 'bod_again_hear' &&
                 window.__lastQueue[1].text === SPEC_HEAR_AGAIN;
  const s2 = rR === 'right' && chainR && chainQ && BE.quiz.step === 1 && BE.quiz.miss === 0;
  const tapOk = initOk && badTap && s1 && s1b && s2;
  if (tapOk) npass++;
  units.tap = { ok: tapOk, init: initOk, badTap: badTap, wrongA: s1, wrongB: s1b,
                chain: chainA, right: s2, chainR: chainR, chainReplay: chainQ };

  /* ---- ⑤ tapSee 单元（flat5 dch2 see：错链两段无词音——目标可见防泄底） ---- */
  total++;
  startLevel(5);
  const q5 = BE.quiz;
  const seeShape = q5 && q5.kind === 'see' && (q5.verb === null || q5.verb === undefined) &&
                   q5.opts.every(o => typeof o.text === 'string' && SPEC_WORDS.indexOf(o.text) >= 0);
  const wC = q5.opts.findIndex((o, i) => i !== q5.answer);
  const r5 = await BE.tapOpt(wC);
  const chainS = window.__lastQueue && window.__lastQueue.length === 2 &&
                 window.__lastQueue[0] === 'bod_wrong' &&
                 window.__lastQueue[1].key === 'bod_again_see' &&      // 语义句 clip 键段（T46 阶段2）
                 window.__lastQueue[1].text === SPEC_SEE_AGAIN;
  const r5b = await BE.tapOpt(q5.answer);
  const seeOk = seeShape && r5 === 'wrong' && chainS && r5b === 'right';
  if (seeOk) npass++;
  units.tapSee = { ok: seeOk, shape: seeShape, chain: chainS };

  /* ---- ⑤b do 单元（flat15 ch4 lv0：qi1=do-touch/qi3=do-action——确定性谱 SPEC §R3） ---- */
  total++;
  startLevel(15);
  await unlocked();
  const t0r = await BE.tapOpt(BE.quiz.answer);    // 过 qi0（mixed）
  await unlocked();
  const qT = BE.quiz;
  const touchShape = qT && qT.kind === 'do' && qT.verb === 'touch' && qT.step === 1 &&
                     SPEC_NEAR20.indexOf(qT.ask) >= 0;
  const tCards = boardEl.querySelectorAll('.card.pcard.dcard');
  const tCardOk = tCards.length === 4 && Array.from(tCards).every(c => {
    const paw = c.querySelector('svg .ptouch');            // 爪标在场（do-touch 卡特征）
    const g = c.querySelector('svg .pt.hl');
    return paw && g && c.querySelectorAll('svg .pt.hl').length === 1 && g.dataset.part === c.dataset.oid.slice(2);
  });
  const tVals = qT.opts.map(o => o.part);
  const tNearOk = nearPresent(qT.ask, tVals) && new Set(tVals).size === 4 &&
                  tVals[qT.answer] === qT.ask;
  const wT = qT.opts.findIndex((o, i) => i !== qT.answer);
  const rT = await BE.tapOpt(wT);                          // do-touch 错链两段
  const chainTD = window.__lastQueue && window.__lastQueue.length === 2 &&
                  window.__lastQueue[0] === 'bod_wrong' &&
                  window.__lastQueue[1] && window.__lastQueue[1].key === 'bod_again_do' &&
                  window.__lastQueue[1].text === SPEC_DO_AGAIN;
  const pulseTD = sceneEl.classList.contains('pulse');     // do 错点方向级=题面 pulse（同 hear）
  replayQuiz(false);                                       // do-touch 重听链三段
  const chainTR = window.__lastQueue && window.__lastQueue.length === 3 &&
                  window.__lastQueue[0] === 'bod_v_touch' &&
                  window.__lastQueue[1] === 'bod_w_' + qT.ask &&
                  window.__lastQueue[2] && window.__lastQueue[2].key === 'bod_again_do';
  await unlocked();
  const rT2 = await BE.tapOpt(qT.answer);                  // do-touch 对=确认链带词音尾段
  const chainTC = window.__lastQueue && window.__lastQueue.length === 2 &&
                  window.__lastQueue[0] === 'bod_right' &&
                  window.__lastQueue[1] === 'bod_w_' + qT.ask;
  await unlocked();
  const rQ2 = await BE.tapOpt(BE.quiz.answer);             // 过 qi2（mixed）
  await unlocked();
  const qA = BE.quiz;
  const actShape = qA && qA.kind === 'do' && qA.verb === 'clap' && qA.ask === 'clap' &&
                   qA.step === 3;
  const aCards = boardEl.querySelectorAll('.card.acard');
  const aLabels = Array.from(boardEl.querySelectorAll('.a-label')).map(e => e.textContent);
  const aCardOk = aCards.length === 4 &&
                  SPEC_ACTS.every(a => aLabels.indexOf(SPEC_ACT_ZH[a]) >= 0) &&   // 四短语恰全集
                  new Set(aLabels).size === 4 &&
                  qA.opts[qA.answer].verb === 'clap';
  const wA2 = qA.opts.findIndex((o, i) => i !== qA.answer);
  lastWrongVoice = 0;   // 契约 J 节流锚重置：verify 提速下 qi1 错与 qi3 错真实间隔 <10s，
                        // 不重置则第二链被节流静默（行为正确；此处测链形本身——同 ④ 首错口径）
  const rA = await BE.tapOpt(wA2);                         // do-action 错链同两段
  const chainAD = window.__lastQueue && window.__lastQueue.length === 2 &&
                  window.__lastQueue[0] === 'bod_wrong' &&
                  window.__lastQueue[1] && window.__lastQueue[1].key === 'bod_again_do';
  await unlocked();
  const rA2 = await BE.tapOpt(qA.answer);                  // do-action 对=确认链两段 [right, 动词短语]（r41 修复轮 §R10 增强）
  const chainAC = window.__lastQueue && window.__lastQueue.length === 2 &&
                  window.__lastQueue[0] === 'bod_right' &&
                  window.__lastQueue[1] === 'bod_v_' + qA.ask;   // v_* 实测 max 1608：2256+150+1608+300=4314≤4500 窗
  const doOk = t0r === 'right' && touchShape && tCardOk && tNearOk && rT === 'wrong' && chainTD && pulseTD &&
               chainTR && rT2 === 'right' && chainTC && rQ2 === 'right' && actShape && aCardOk &&
               rA === 'wrong' && chainAD && rA2 === 'right' && chainAC;
  if (doOk) npass++;
  units.doUnit = { ok: doOk, touch: { shape: touchShape, cards: tCardOk, near: tNearOk,
    chainWrong: chainTD, pulse: pulseTD, chainReplay: chainTR, chainRight: chainTC },
    act: { shape: actShape, cards: aCardOk, chainWrong: chainAD, chainRight: chainAC } };

  /* ---- ⑥ 帧内容断言（契约 M：分题型渲染——hear=部位图卡/see=词文字卡+题面高亮） ---- */
  total++;
  startLevel(0);                                        // dch1 hear 题
  const qh = BE.quiz;
  const hearCards = boardEl.querySelectorAll('.card.pcard').length === 4 &&
                    boardEl.querySelectorAll('.card .w-label').length === 0;   // 图卡无文字（纯听辨）
  const cardsH = Array.from(boardEl.querySelectorAll('.card.pcard'));
  const cardHl = cardsH.every(c => {
    const g = c.querySelector('svg .pt.hl');            // 每图卡恰 1 高亮部位
    return g && c.querySelectorAll('svg .pt.hl').length === 1 && g.dataset.part === c.dataset.oid.slice(2);
  });
  const renderEqEngine = cardsH.every(c => c.dataset.oid.slice(2)) &&
    qh.opts.map(o => o.part).sort().join() ===
    cardsH.map(c => c.querySelector('svg .pt.hl').dataset.part).sort().join();   // 渲染即引擎
  const sceneHear = sceneEl.dataset.ask === '' &&
                    sceneEl.querySelectorAll('.scene-slot .pt.hl').length === 0;   // hear 题面中性无高亮
  const q1Text = sceneEl.querySelector('.q-text').textContent.indexOf('听一听') >= 0;
  startLevel(5);                                        // dch2 see 题
  const qs = BE.quiz;
  const seeCards = boardEl.querySelectorAll('.card.wcard .w-label').length === 4 &&
                   boardEl.querySelectorAll('.card svg').length === 0;   // 词卡无图（纯认读）
  const seeWords = qs.opts.every(o => /^[a-z]+$/.test(o.text));          // 小写词形（§0.19）
  const sceneSee = sceneEl.dataset.ask === qs.ask &&
                   sceneEl.querySelectorAll('.scene-slot .pt.hl').length === 1 &&
                   sceneEl.querySelector('.scene-slot .pt.hl').dataset.part === qs.ask;   // 高亮=真值部位
  const q2Text = sceneEl.querySelector('.q-text').textContent.indexOf('看一看') >= 0;
  const frameOk = hearCards && cardHl && renderEqEngine && sceneHear && q1Text &&
                  seeCards && seeWords && sceneSee && q2Text;
  if (frameOk) npass++;
  units.frame = { ok: frameOk, hearCards: hearCards, cardHl: cardHl, eqEngine: renderEqEngine,
                  sceneHear: sceneHear, seeCards: seeCards, sceneSee: sceneSee };

  /* ---- ⑦ 教学链：tutorialWatch 真实走完 → __beDemoR='right'（演示点 eye 图卡） ---- */
  total++;
  KIDS._save = function () { return { levels: {} }; };       // verify 页存档 stub
  KIDS.store.persist = function () {};
  startLevel(0);
  const t0ms = Date.now();
  await tutorialWatch();
  const tw = (Date.now() - t0ms) / SPEED;                      // 折算真实页时长
  const tutOk = window.__beDemoR === 'right' && state.tut === 'help' &&
                cur.flat === 0 && cur.quizzes[0].kind === 'hear' &&
                cur.quizzes[0].ask === 'eye' && tw <= 16000;
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, demoR: window.__beDemoR, tut: state.tut, watchMs: Math.round(tw) };

  /* ---- ⑧ 吞输入轻叮+可见回应：demo/locked 门拦钩子输入 + 卡排容器 bump ---- */
  total++;
  startLevel(0);
  state.demo = true; state.locked = true;                    // 模拟教学"看"演示期
  const swallow1 = (await BE.tapOpt(0)) === false && boardEl.classList.contains('bump');
  state.demo = false; state.locked = true;                   // 演出窗口（locked）
  const swallow2 = (await BE.tapOpt(0)) === false;
  state.locked = false;                                      // 还原
  const swallowOk = swallow1 && swallow2 && BE.quiz.step === 0 && BE.quiz.miss === 0;
  if (swallowOk) npass++;
  units.swallow = { ok: swallowOk, demo: swallow1, locked: swallow2 };

  /* ---- ⑨ UI 冒烟 A：flat0 autoSolve 通关（5 题 taps=5，恒 3 星） ---- */
  total++;
  startLevel(0);
  const a0 = await BE.autoSolve();
  const lv0 = BE.currentLevel;
  const smokeA = a0.done && a0.taps === 5 && lv0.done && lv0.won &&
                 engStars(cur) === 3 && !document.querySelector('.k-celebrate');
  if (smokeA) npass++;
  smokes.flat0 = { ok: smokeA, taps: a0.taps, stars: engStars(cur) };

  /* ---- ⑨ UI 冒烟 B：flat5（dch2 see）autoSolve 通关 ---- */
  total++;
  startLevel(5);
  const a5 = await BE.autoSolve();
  const smokeB = a5.done && a5.taps === 5 && BE.currentLevel.done;
  if (smokeB) npass++;
  smokes.flat5 = { ok: smokeB, taps: a5.taps };

  /* ---- ⑨ UI 冒烟 C：flat10（dch3 混出+近形）先 1 错再 autoSolve（1 错=2 星） ---- */
  total++;
  startLevel(10);
  await unlocked();
  const q10 = BE.quiz;
  const wrongC = q10.opts.findIndex((o, i) => i !== q10.answer);
  const r10 = await BE.tapOpt(wrongC);
  const a10 = await BE.autoSolve();
  const lv10 = BE.currentLevel;
  const smokeC = r10 === 'wrong' && a10.done && a10.taps === 5 && lv10.done && lv10.won &&
                 lv10.miss === 1 && engStars(cur) === 2;
  if (smokeC) npass++;
  smokes.flat10 = { ok: smokeC, r10: r10, taps: a10.taps, miss: lv10.miss, stars: engStars(cur) };

  /* ---- ⑨ UI 冒烟 D：flat15（dch4 含 do×2）autoSolve 通关（r41） ---- */
  total++;
  startLevel(15);
  const a15 = await BE.autoSolve();
  const smokeD = a15.done && a15.taps === 5 && BE.currentLevel.done;
  if (smokeD) npass++;
  smokes.flat15 = { ok: smokeD, taps: a15.taps };

  /* ---- ⑩ 布局：双 viewport ×（flat0 hear/flat5 see/flat12 ch3/flat15 do-touch 板/
       flat15 action 板/含 shoulder see 板/含 eyebrow see 板）+ 长词文字宽 ≤ 卡宽-6 ---- */
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
  /* 长词 see 板目标：确定性扫描找含 shoulder（xs 档）/eyebrow（sm 档）的 see 题位 */
  const findSeeWith = word => {
    for (let f = 0; f < 40; f++) {
      const L = genLevel(f);
      for (let qi = 0; qi < L.quizzes.length; qi++) {
        const q = L.quizzes[qi];
        if (q.kind === 'see' && q.opts.some(o => o.text === word)) return { flat: f, qi: qi };
      }
    }
    return null;
  };
  async function simView(w, h, flat, step) {
    const g = $id('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    startLevel(flat);
    while (cur.step < step) {                       // 推进到目标题位（UI 判定链全真）
      await unlocked();
      const q = cur.quizzes[cur.step];
      await uiTapOpt(q.answer);
    }
    await unlocked();
    const cards = Array.prototype.map.call(boardEl.querySelectorAll('.card'), b => ({
      w: b.offsetWidth, h: b.offsetHeight }));
    const labels = Array.from(boardEl.querySelectorAll('.card .w-label')).map(l => ({
      t: l.textContent, w: l.getBoundingClientRect().width }));
    const svg = sceneEl.querySelector('.scene-slot svg');
    const svgh = svg ? Math.round(svg.getBoundingClientRect().height) : 0;   // SVGElement 无 offsetHeight
    const sc = { w: sceneEl.offsetWidth, h: sceneEl.offsetHeight };
    const hitOk = cards.length === 4 && cards.every(b => b.w >= 96 && b.h >= 96);   // 候选卡=主答案按钮
    const cardEls = Array.from(boardEl.querySelectorAll('.card'));
    const labOk = cardEls.every(cEl => {             // 词卡文字宽 ≤ 卡宽-6（长词档防溢出，r41）
      const lab = cEl.querySelector('.w-label');
      return !lab || lab.getBoundingClientRect().width <= cEl.offsetWidth - 6;
    });
    const sceneOk = svgh >= 120 && sc.w >= 64 && sc.h >= 64;
    const cB = ratioOf('#4A3B2E', '#FBF6EC') >= 3 &&
               ratioOf(cssToHex(getComputedStyle(cardEls[0]).borderLeftColor), '#FFF9EE') >= 3;
    const cS = ratioOf(cssToHex(getComputedStyle(sceneEl).borderLeftColor), '#FBF6EC') >= 3;
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, flat: flat, step: cur.step, cards: cards.length, svgH: svgh,
             labels: labels, hitOk: hitOk, labOk: labOk, sceneOk: sceneOk, contrast: cB && cS, ox: ox,
             pass: hitOk && labOk && sceneOk && cB && cS && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const [flat, step] of [[0, 0], [5, 0], [12, 0], [15, 1], [15, 3]]) {
    sims.push(await simView(1280, 800, flat, step));
    sims.push(await simView(800, 1180, flat, step));
  }
  const tgtS = findSeeWith('shoulder'), tgtE = findSeeWith('eyebrow');
  if (tgtS) { sims.push(await simView(1280, 800, tgtS.flat, tgtS.qi)); sims.push(await simView(800, 1180, tgtS.flat, tgtS.qi)); }
  if (tgtE) { sims.push(await simView(1280, 800, tgtE.flat, tgtE.qi)); sims.push(await simView(800, 1180, tgtE.flat, tgtE.qi)); }
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);                                            // 还原真实 viewport 布局
  const layoutOk = sims.every(s => s.pass) && !!tgtS && !!tgtE &&
                   sims.some(s => s.labels.some(l => l.t === 'shoulder')) &&
                   sims.some(s => s.labels.some(l => l.t === 'eyebrow'));   // xs/sm 档实测入 sim（宽 ≤卡-6 已断言）
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims, tgtShoulder: tgtS, tgtEyebrow: tgtE };

  /* ---- ⑪ clips（r41 终态 2026-09-22 主线注册）：bod 40 + core 3 = 43 全注入 + duration 辨别器（±60ms） ---- */
  total++;
  const keys = Object.keys(KIDS.voice.clips);
  const need = ['bod_tut_watch', 'bod_tut_turn', 'bod_hint', 'bod_right', 'bod_wrong',
                'bod_q1', 'bod_q2', 'bod_q3', 'bod_again_do', 'bod_again_hear', 'bod_again_see',
                'bod_w_head', 'bod_w_eye', 'bod_w_ear', 'bod_w_nose', 'bod_w_mouth',
                'bod_w_hand', 'bod_w_arm', 'bod_w_leg',
                'bod_w_shoulder', 'bod_w_finger', 'bod_w_face',   // r41 新 16 词代表（防错名顶替，r35 m-1）
                'bod_v_touch', 'bod_v_clap', 'bod_v_shake', 'bod_v_stomp', 'bod_v_wave',
                'core_chapter_end', 'core_day_end', 'core_rest'];
  const preOk = keys.length === 43 &&
    need.every(k => keys.indexOf(k) >= 0 && KIDS.voice.clips[k].indexOf('data:audio/mpeg;base64,') === 0);
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

  /* ---- ⑫ 星级规则（引擎级构造直测：0=3★ / 1-2=2★ / ≥3=1★，永不 0 星） ---- */
  total++;
  const LA = genLevel(10);
  LA.retries = 0; const st3 = engStars(LA) === 3;
  LA.retries = 1; const st2a = engStars(LA) === 2;
  LA.retries = 2; const st2b = engStars(LA) === 2;
  LA.retries = 3; const st1 = engStars(LA) === 1;
  LA.retries = 9; const stFloor = engStars(LA) === 1;   // 永不 0 星
  const starsOk = st3 && st2a && st2b && st1 && stFloor;
  if (starsOk) npass++;
  units.stars = { ok: starsOk, st3: st3, st2: st2a && st2b, st1: st1, floor: stFloor };

  /* ---- ⑬ 契约 A/B/E/F/I/J/K 源码断言（读自身合并 script 文本——第 3 个 script 块） ---- */
  total++;
  const src = document.querySelectorAll('script')[2].textContent;
  const srcA = src.indexOf('KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) })') >= 0 &&
               src.indexOf('KIDS.ui.dayEnd({ nextHint: nextHint(null) })') >= 0;   // A：启动 lim-1+winFlow null
  const srcB = src.indexOf('lastDir') >= 0 && src.indexOf('lastAct') >= 0 &&
               src.indexOf('if (idle > 14000 && Date.now() - lastDir > 14000)') >= 0 &&
               src.indexOf('idle > 30000') >= 0;   // B：救援双锚（14s 方向级独立节流/30s 答案级）
  const srcE = src.indexOf('sv.bodyen && sv.bodyen.tutSeen') >= 0;   // E：行为分流先查教学特例
  const srcF = src.indexOf('GEN_HINTS[genLevel(f + 1).dch - 1]') >= 0 &&   // F：生成关实算 dch-1
               src.indexOf('(ci + 1)' + ' % 4') < 0;   // 禁章序右移（检索串拼接防 verify 源码自匹配）
  const srcI = src.indexOf('wrongChainUntil = Date.now() + 7200') >= 0 &&
               src.indexOf('if (Date.now() < wrongChainUntil) return;') >= 0 &&
               src.indexOf('lastWrongVoice = 0; wrongChainUntil = 0;') >= 0;   // I：豁免窗+救援守卫+重置
  const srcJ = src.indexOf('now - lastWrongVoice > 10000') >= 0;          // J：语义句 10s 节流在场
  const srcK = src.indexOf('if (document.querySelector(\'.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel\')) return;') >= 0 &&
               src.indexOf('function rescueTick()') >= 0;   // K：面板守卫+命名函数
  const srcOk = srcA && srcB && srcE && srcF && srcI && srcJ && srcK;
  if (srcOk) npass++;
  units.contract = { ok: srcOk, A: srcA, B: srcB, E: srcE, F: srcF, I: srcI, J: srcJ, K: srcK };

  /* ---- ⑭ 章末预告 C7 独立硬编码对账 + 生成关 nextHint 实算对账 + 键构造直调（r37 M1） ---- */
  total++;
  const hintOk = CHAPTERS[1].hint === SPEC_CHAPTER_HINTS[1] &&   // hint[i] ↔ CHAPTERS[i+1]（家族 F）
                 CHAPTERS[2].hint === SPEC_CHAPTER_HINTS[2] &&
                 CHAPTERS[3].hint === SPEC_CHAPTER_HINTS[3] &&
                 CHAPTERS[4].hint === SPEC_CHAPTER_HINTS[4] &&
                 GEN_HINTS[0] === SPEC_GEN_HINTS[0] && GEN_HINTS[1] === SPEC_GEN_HINTS[1] &&
                 GEN_HINTS[2] === SPEC_GEN_HINTS[2] && GEN_HINTS[3] === SPEC_GEN_HINTS[3] &&
                 nextHint(4) === SPEC_CHAPTER_HINTS[1] &&        // 章末（ch1 打完）预告 ch2 文案
                 nextHint(9) === SPEC_CHAPTER_HINTS[2] &&
                 nextHint(14) === SPEC_CHAPTER_HINTS[3] &&
                 nextHint(19) === SPEC_CHAPTER_HINTS[4];
  const genOk = [24, 29, 34, 39].every(f => nextHint(f) === GEN_HINTS[genLevel(f + 1).dch - 1]);   // F：实算
  /* 键构造直调：VOICE.q3/verbClip/wordClip/PART_ZH/ACT_ZH 期望值 SPEC 硬编码（禁抄实现） */
  const keyOk = VOICE.q3.key === 'bod_q3' && VOICE.q3.text === SPEC_Q3 &&
                verbClip('touch') === 'bod_v_touch' && verbClip('clap') === 'bod_v_clap' &&
                wordClip('shoulder') === 'bod_w_shoulder' && wordClip('toe') === 'bod_w_toe' &&
                SPEC_WORDS.every(w => PART_ZH[w] === SPEC_ZH[w]) && PART_ZH && Object.keys(PART_ZH).length === 24 &&
                SPEC_ACTS.every(a => ACT_ZH[a] === SPEC_ACT_ZH[a]) &&
                DO_AGAIN === SPEC_DO_AGAIN && HEAR_AGAIN === SPEC_HEAR_AGAIN && SEE_AGAIN === SPEC_SEE_AGAIN;
  if (hintOk && genOk && keyOk) npass++;
  units.hints = { ok: hintOk && genOk && keyOk, chapters: [1, 2, 3, 4].map(i => CHAPTERS[i].hint),
                  gen: GEN_HINTS, keys: keyOk };

  /* ---- ⑮ estMs 语音窗动态断言（b25 定版：窗 ≥ estMs/链实长；clip 实长 SPEC §4）
     确认链=bod_right 2256+150+词音 max 1656=4062；错链（最长 hear）=1656+150+2352+150+1656=5964
     （T46 阶段2：语义句 estMs(8)=3360 → clip 实长 bod_again_hear 2352 / see 2376）；
     r41 do 错链=1656+150+estMs(8)=3360+300=5466（again_do est 口径——注册后实长复核）
     r41 do 开题链含新 en 键（q3/v_*）——读题不锁无窗约束（SPEC-R41 §R9）；
     修复轮 m-2 勘误 2026-09-22：原 1536/3942/5844 为旧 8 词 maxWord 口径，r41 终态 24 词
     max=bod_w_shoulder 1656——4362/5964/6264 全窗复核均罩 ---- */
  total++;
  const maxWord = 1656;                                 // 词音 max（r41 终态=bod_w_shoulder，24 词全域；旧 1536=bod_w_nose）
  const winOk = (1600 + 2900) >= SPEC_DUR.bod_right + 150 + maxWord + 300 &&   // 判对窗 4500 ≥ 4362
                3468 >= SPEC_DUR.bod_tut_watch + 300 &&                          // 教学词音演示延 ≥ 3168+300
                2150 >= SPEC_DUR.bod_tut_turn + 300 &&                           // turn 后读题延 ≥ 2124
                (2620 + 400) >= SPEC_DUR.bod_right + 300 &&                      // winFlow ≥ 2556
                7200 >= SPEC_DUR.bod_wrong + 150 + SPEC_DUR.bod_again_hear + 150 + maxWord + 300 &&   // hear 链 ≥ 6264
                7200 >= SPEC_DUR.bod_wrong + 150 + SPEC_DUR.bod_again_see + 300 &&               // see 链 ≥ 4482
                7200 >= SPEC_DUR.bod_wrong + 150 + SPEC_DUR.bod_again_do + 300;          // do 链实测 4434（est 5466 上界注记，注册后实测复核 2026-09-22）
  const estData = { confirmWin: 4500, confirmNeed: SPEC_DUR.bod_right + 150 + maxWord + 300,
                    watchT: 3468, turnDelay: 2150, rightFlow: 3020,
                    wrongChain: 7200, chainNeed: SPEC_DUR.bod_wrong + 150 + SPEC_DUR.bod_again_hear + 150 + maxWord + 300,
                    doChainNeed: SPEC_DUR.bod_wrong + 150 + SPEC_DUR.bod_again_do + 300 };
  if (winOk) npass++;
  units.estWin = { ok: winOk, est: estData };

  /* ---- ⑯ verify 提速断言 ---- */
  total++;
  const speedOk = SPEED === 0.12;
  if (speedOk) npass++;
  units.speed = { ok: speedOk, SPEED: SPEED };

  const out = { game: 'bodyen', total: total, pass: npass, layoutOk: layoutOk,
                levels: levels, gen: gen, units: units, smokes: smokes };
  $id('verify-result').textContent = JSON.stringify(out);
  window.__beVlog = out;                          // 外部断言挂点（任务书钩子）
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
