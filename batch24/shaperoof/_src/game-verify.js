/* ================= ?verify=1 自检（仅 verify 分支加载执行）——5.5-6.5 段 v2 契约
   ① 静态 20 + 生成 20 关全量审计（flat 0-39）：确定性（同 flat 两次生成 JSON 一致）/
     章型规则（structWhy 全 null）/ 章号映射 / 引擎分离交互直驱（选瓦→转到位→放置→right/done；
     combo=half→right 两段；全关零失败尝试=3 星）
   ② 封闭集独立对账（SPEC v2 delta 文字独立重列，不引用引擎 DIR4/CHIRAL6/MIRROR/SLABS 表）×
     40 关全题：ch1=rot 且洞∈有向 4 形+偏转 1-3 / ch2=mirror 且洞∈手性 6+镜像陷阱在场 /
     ch3=combo 且洞∈L/T/Z+瓦=分解 2+干扰 2∈板瓦表 / ch4+生成关=三型混合各 ≥1
   ③ 章型专项：ch2 镜像陷阱 flat5-9 全题 / ch3 分解表 flat10-14 全题 / ch4 三型 flat15-19 /
     生成关四 dch 全现
   ④ 分离交互单元（flat0 真实 UI 状态机）：非法下标 false；错形='wrong'；对形朝向错='rot'；
     过转+回转（mod 4）后放对='right'；miss 口径=失败尝试总数；1000ms 防重入窗
   ⑤ 镜像单元（flat5）：镜像瓦放置='mir'+语音 spy 含 sr_mir_wrong；旋转任意次仍 'mir'
     （手性：旋转永不等于镜像）
   ⑥ 组合单元（flat10）：干扰='wrong'；第一块='half'+used；重复放已用=false；第二块='right'；
     combo 无朝向（tapRotate=false）；题面映射 quizVoice=combo
   ⑦ 教学链：tutorialWatch() 真实走完（stub 存档）→ __srDemoR==='right' 且 __srDemoRot===1
     （演示=旋转一次+放置）且 tut='help'，watch 折算真实时长 ≤16s；flat0 题0 锚点
   ⑧ 吞输入轻叮+可见回应：demo/locked 门拦三入口钩子输入 + 瓦片排容器 bump（家族 D）
   ⑨ UI 冒烟 A：flat0 autoSolve 通关（taps=5，恒 3 星，verify 页不弹层）
   ⑩ UI 冒烟 B：flat10（combo）先 1 次失败尝试再 autoSolve（miss=1 → 2 星）
   ⑪ 布局：双 viewport ×（ch1 旋转/ch3 组合/ch4 混合）：瓦片卡 ≥96×96、房子 ≥64、
     旋转钮 ≥72、overflowX ≤0、描边对比度 ≥3:1
   ⑫ clips：shr_ 6 + sr_ 3 + core 3 = 12 条全注入（dataURI 前缀在场）
   ⑬ 星级规则：0=3★ / 1-2=2★ / ≥3=1★（失败尝试口径）
   ⑭ 章末预告 C7 关键词断言：CHAPTERS[i].hint ↔ 下一章特征；GEN_HINTS[k] ↔ dch=k+1（家族 F）
   ⑮ verify 提速断言：SPEED=0.12
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;

  /* SPEC v2 delta 文字独立重列（禁抄页面 DIR4/CHIRAL6/MIRROR/SLABS/HOLE_DECOMP） */
  const SPEC_DIR4 = ['triangle', 'arrow', 'crescent', 'flag'];                    // 有向 4 形
  const SPEC_MIRROR = { flag: 'flagm', flagm: 'flag', bsh: 'dsh', dsh: 'bsh',     // 镜像对 3 对
                        fish: 'fishm', fishm: 'fish' };
  const SPEC_CHIRAL6 = Object.keys(SPEC_MIRROR);
  const SPEC_SLABS = ['bar2v', 'bar2h', 'bar3v', 'bar3h', 'sq2'];                 // 板瓦 5 型
  const SPEC_DECOMP = { L: ['bar3v', 'bar2h'], T: ['bar3h', 'bar2v'], Z: ['bar2h', 'bar2v'] };  // 分解唯一
  const vAt = arr => arr.length;                                                  // spy 游标工具

  /* 引擎分离交互直驱一关（独立于 autoSolve：纯 engTap* 链） */
  function driveLevel(L) {
    for (let k = 0; k < L.quizzes.length; k++) {
      const q = L.quizzes[k];
      if (q.kind === 'combo') {
        const i1 = correctIdx(q);
        if (i1 < 0 || engTapPlace(L, i1) !== 'half') return false;
        const i2 = correctIdx(q);
        if (i2 < 0) return false;
        const exp = k === L.quizzes.length - 1 ? 'done' : 'right';
        if (engTapPlace(L, i2) !== exp) return false;
      } else {
        const i = correctIdx(q);
        if (i < 0 || engTapPiece(L, i) !== 'sel') return false;
        const turns = (q.dir - q.tiles[i].dir + 4) % 4;
        if (turns < 1 || turns > 3) return false;               // 偏转恒 1-3（永不预解）
        for (let t = 0; t < turns; t++) if (engRotate(L) === null) return false;
        const exp = k === L.quizzes.length - 1 ? 'done' : 'right';
        if (engTapPlace(L, i) !== exp) return false;
      }
      if (q._miss !== 0) return false;
    }
    return L.done && L.step === CH_LEN && L.retries === 0 && engStars(L) === 3;
  }

  /* ---- ① 40 关全量审计（flat 0-39） ---- */
  const ch1Seen = [], kindAgg = { 1: {}, 2: {}, 3: {}, 4: {} }, genDch = {};
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1.quizzes) === JSON.stringify(L2.quizzes);
    let ruleOk = true;
    for (let k = 0; k < L1.quizzes.length; k++) {
      const why = structWhy(L1.quizzes[k], L1.dch, flat, k, k > 0 ? L1.quizzes[k - 1] : null);
      if (why) ruleOk = false;
    }
    if (L1.quizzes.length !== CH_LEN) ruleOk = false;
    const chOk = L1.ch === Math.floor(flat / CH_LEN) + 1;
    const dchOk = flat < STATIC_LEVELS ? L1.dch === diffOfCh(L1.ch)
                                       : (L1.dch >= 1 && L1.dch <= 4);       // 生成关 seeded 章参数
    const driveOk = driveLevel(genLevel(flat));
    /* 章分布聚合（③ 数据源；kindAgg 只统计静态 20 关——生成关 dch 随机不并入章纯度口径） */
    if (L1.dch === 1) ch1Seen.push(L1.quizzes.map(q => q.shape));
    if (flat < STATIC_LEVELS) L1.quizzes.forEach(q => { kindAgg[L1.dch][q.kind] = (kindAgg[L1.dch][q.kind] || 0) + 1; });
    if (flat >= STATIC_LEVELS) genDch[L1.dch] = (genDch[L1.dch] || 0) + 1;
    const ok = det && ruleOk && chOk && dchOk && driveOk;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, ruleOk: ruleOk, chOk: chOk, dchOk: dchOk,
                  driveOk: driveOk,
                  kinds: L1.quizzes.map(q => q.kind + ':' + q.shape + (q.kind === 'combo' ? '' : '@' + q.dir)) };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }
  total++;
  const dch1AggOk = ch1Seen.every(arr => {                       // 有向 4 形池：每关取材 3-4 形且全 ∈ 表
    const d = arr.filter((v, i, a) => a.indexOf(v) === i);
    return d.length >= 3 && d.length <= 4 && arr.every(s => SPEC_DIR4.indexOf(s) >= 0);
  });
  const distOk = dch1AggOk &&
                 kindAgg[1].rot === 25 &&                                    // 静态 dch1 全 rot
                 kindAgg[2].mirror === 25 &&                                 // 静态 dch2 全 mirror
                 kindAgg[3].combo === 25 &&                                  // 静态 dch3 全 combo
                 genDch[1] > 0 && genDch[2] > 0 && genDch[3] > 0 && genDch[4] > 0;  // 生成关四型全现
  if (distOk) npass++;
  units.dist = { ok: distOk, dch1All4: dch1AggOk, kindAgg: kindAgg, genDch: genDch };

  /* ---- ② 封闭集独立对账（独立表 × 40 关全题） ---- */
  total++;
  let tableOk = true, badCase = null;
  const offOf = (q) => {
    const r = q.tiles.filter(t => t.right)[0];
    return r ? (q.dir - r.dir + 4) % 4 : -1;
  };
  const checkQuiz = (q, dch, flat, k) => {
    if (['rot', 'mirror', 'combo'].indexOf(q.kind) < 0) return 'kind ' + flat + '/' + k;
    if (dch === 1 && q.kind !== 'rot') return 'dch1kind ' + flat + '/' + k;
    if (dch === 2 && q.kind !== 'mirror') return 'dch2kind ' + flat + '/' + k;
    if (dch === 3 && q.kind !== 'combo') return 'dch3kind ' + flat + '/' + k;
    if (q.tiles.length !== 4) return 'len ' + flat + '/' + k;
    const shp = q.tiles.map(t => t.shape);
    if (shp.filter((v, i, a) => a.indexOf(v) === i).length !== 4) return 'dup ' + flat + '/' + k;
    if (q.kind === 'combo') {
      if (SPEC_DECOMP[q.shape] === undefined) return 'holeLib ' + flat + '/' + k;
      const need = SPEC_DECOMP[q.shape];
      if (!shp.every(v => SPEC_SLABS.indexOf(v) >= 0)) return 'slabLib ' + flat + '/' + k;
      for (let j = 0; j < 4; j++) {
        if (q.tiles[j].right !== (need.indexOf(shp[j]) >= 0)) return 'rightFlag ' + flat + '/' + k + '/' + j;
      }
      if (q.tiles.filter(t => t.right).length !== 2) return 'rightN ' + flat + '/' + k;
      const ds = shp.filter(v => need.indexOf(v) < 0);
      if (ds.some(v => SPEC_SLABS.indexOf(v) < 0)) return 'distrLib ' + flat + '/' + k;
    } else {
      const pool = q.kind === 'rot' ? SPEC_DIR4 : SPEC_CHIRAL6;
      if (pool.indexOf(q.shape) < 0) return 'shapeLib ' + flat + '/' + k;
      if (!(q.dir >= 0 && q.dir <= 3)) return 'holeDir ' + flat + '/' + k;
      if (!shp.every(v => pool.indexOf(v) >= 0)) return 'tilesLib ' + flat + '/' + k;
      for (let j = 0; j < 4; j++) {
        if (q.tiles[j].right !== (shp[j] === q.shape)) return 'rightFlag ' + flat + '/' + k + '/' + j;
        if (!(q.tiles[j].dir >= 0 && q.tiles[j].dir <= 3)) return 'tileDir ' + flat + '/' + k + '/' + j;
      }
      if (q.tiles.filter(t => t.right).length !== 1) return 'rightN ' + flat + '/' + k;
      const off = offOf(q);
      if (off < 1 || off > 3) return 'offPre ' + flat + '/' + k;              // 90/180/270 随机偏转
      if (q.kind === 'mirror' && shp.indexOf(SPEC_MIRROR[q.shape]) < 0) return 'mirMissing ' + flat + '/' + k;
    }
    return null;
  };
  outer:
  for (let flat = 0; flat < 40; flat++) {
    const L = genLevel(flat);
    for (let k = 0; k < L.quizzes.length; k++) {
      const bad = checkQuiz(L.quizzes[k], L.dch, flat, k);
      if (bad) { badCase = bad; tableOk = false; break outer; }
    }
    if (L.dch === 4) {                        // ch4：三型各 ≥1（混合轮换）
      const ks = L.quizzes.map(q => q.kind);
      if (ks.indexOf('rot') < 0 || ks.indexOf('mirror') < 0 || ks.indexOf('combo') < 0) {
        badCase = 'mixMissing ' + flat; tableOk = false; break;
      }
    }
  }
  if (tableOk) npass++;
  units.table = { ok: tableOk, bad: badCase };

  /* ---- ③ 章型专项：ch2 镜像陷阱 / ch3 分解表 / ch4 三型 ---- */
  total++;
  const mirDetail = [], decompDetail = [], mixDetail = [];
  let specOk = true;
  for (let flat = 5; flat < 10; flat++) {                    // ch2：镜像陷阱逐题在场
    const L = genLevel(flat);
    if (L.dch !== 2) { specOk = false; break; }
    const pr = L.quizzes.map(q => q.shape + '>' + SPEC_MIRROR[q.shape] + ':' +
      (q.tiles.some(t => t.shape === SPEC_MIRROR[q.shape]) ? 'in' : 'MISS'));
    if (!pr.every(p => p.endsWith(':in'))) specOk = false;
    mirDetail.push(pr);
  }
  for (let flat = 10; flat < 15; flat++) {                   // ch3：分解=SPEC 表（两块都判定）
    const L = genLevel(flat);
    if (L.dch !== 3) { specOk = false; break; }
    const pr = L.quizzes.map(q => {
      const need = SPEC_DECOMP[q.shape];
      const have = q.tiles.filter(t => t.right).map(t => t.shape).sort().join('+');
      return q.shape + '=' + need.slice().sort().join('+') + ':' + (have === need.slice().sort().join('+') ? 'ok' : 'BAD');
    });
    if (!pr.every(p => p.endsWith(':ok'))) specOk = false;
    decompDetail.push(pr);
  }
  for (let flat = 15; flat < 20; flat++) {                   // ch4：三型各 ≥1
    const L = genLevel(flat);
    if (L.dch !== 4) { specOk = false; break; }
    const c = { rot: 0, mirror: 0, combo: 0 };
    L.quizzes.forEach(q => { c[q.kind]++; });
    if (c.rot < 1 || c.mirror < 1 || c.combo < 1) specOk = false;
    mixDetail.push(c);
  }
  if (specOk) npass++;
  units.chapters = { ok: specOk, mirror: mirDetail, decomp: decompDetail, mix: mixDetail };

  /* ---- ④ 分离交互单元（flat0 真实 UI 状态机：锚点题 rot/triangle/dir1/off1） ---- */
  total++;
  startLevel(0);
  const q4 = SR.quiz;
  const rightIdx0 = q4.tiles.findIndex(t => t.right);
  const wrongIdx0 = q4.tiles.findIndex(t => !t.right);
  const initOk = q4 && q4.kind === 'rot' && q4.hole === 'triangle' &&
                 q4.need.shape === 'triangle' && q4.need.dir === 1 &&
                 q4.tiles.length === 4 && q4.tiles.filter(t => t.right).length === 1 &&
                 q4.step === 0 && q4.miss === 0 && q4.sel === -1 && q4.tiles[0].id === 'w0';
  const badPiece = (await SR.tapPiece(99)) === false;
  const badPlace = (await SR.tapPlace(99)) === false;
  const selW = (await SR.tapPiece(wrongIdx0)) === 'sel' && SR.quiz.sel === wrongIdx0;
  const pW = SR.tapPlace(wrongIdx0);                        // 错形 → wrong（窗内先发不等待）
  const pRej = SR.tapPlace(wrongIdx0);                      // 窗内紧邻再放=被拦 false
  const rW = await pW;
  const rejW = await pRej;
  const sW = rW === 'wrong' && rejW === false &&
             SR.quiz.miss === 1 && SR.currentLevel.miss === 1;
  const selR = (await SR.tapPiece(rightIdx0)) === 'sel';
  const rRot0 = await SR.tapPlace(rightIdx0);               // 对形朝向错（dir0≠1）→ rot
  const sRot = rRot0 === 'rot' && SR.quiz.miss === 2;
  await wait(1200 * SPEED);                                 // 防重入窗过
  const rot1 = SR.tapRotate();                              // 0→1
  const rot2 = SR.tapRotate();                              // 1→2（过转）
  const rot3 = SR.tapRotate();                              // 2→3（过转）
  const rot4 = SR.tapRotate();                              // 3→0（回转 mod4）
  const rotOk = rot1 === 1 && rot2 === 2 && rot3 === 3 && rot4 === 0;
  const rRot1 = await SR.tapPlace(rightIdx0);               // 仍朝向错
  const overOk = rRot1 === 'rot' && SR.quiz.miss === 3;
  await wait(1200 * SPEED);
  SR.tapRotate();                                           // 0→1=洞向
  const rR = await SR.tapPlace(rightIdx0);
  const sR = rR === 'right' && SR.quiz.step === 1 && SR.quiz.miss === 0 && SR.quiz.kind !== undefined;
  const tapOk = initOk && badPiece && badPlace && selW && sW && selR && sRot && rotOk && overOk && sR;
  if (tapOk) npass++;
  units.tap = { ok: tapOk, init: initOk, bad: badPiece && badPlace, wrong: sW, winReject: rejW,
                rotWrong: sRot, rotCycle: rotOk, overRotate: overOk, right: sR };

  /* ---- ⑤ 镜像单元（flat5）：'mir' + sr_mir_wrong + 手性（旋转救不回） ---- */
  total++;
  startLevel(5);
  const v0 = vAt(window.__vspy);
  const q5 = SR.quiz;
  const mirOk1 = q5.kind === 'mirror' && SPEC_CHIRAL6.indexOf(q5.hole) >= 0;
  const mirIdx = q5.tiles.findIndex(t => t.shape === SPEC_MIRROR[q5.hole]);
  const selM = mirIdx >= 0 && (await SR.tapPiece(mirIdx)) === 'sel';
  const rM0 = await SR.tapPlace(mirIdx);                    // 镜像错放 → mir
  const clipM = window.__vspy.slice(v0).indexOf('sr_mir_wrong') >= 0;
  let chiralityOk = rM0 === 'mir' && SR.quiz.miss === 1 && clipM;
  await wait(1200 * SPEED);
  for (let t = 0; t < 3; t++) {                             // 转满 3 次仍放不上（旋转≠镜像）
    SR.tapRotate();
    const r = await SR.tapPlace(mirIdx);
    if (r !== 'mir') { chiralityOk = false; }
    await wait(1200 * SPEED);
  }
  const mirOk = mirOk1 && selM && chiralityOk;
  if (mirOk) npass++;
  units.mirror = { ok: mirOk, hole: q5.hole, first: rM0, clip: clipM, chirality: chiralityOk };

  /* ---- ⑥ 组合单元（flat10）：half/used/right + 无朝向 + 题面映射 ---- */
  total++;
  startLevel(10);
  const q6 = SR.quiz;
  const need6 = q6.need.map(n => n.shape);
  const dis6 = q6.tiles.findIndex(t => !t.right);
  const libOk = q6.kind === 'combo' && SPEC_DECOMP[q6.hole] !== undefined &&
                need6.slice().sort().join('+') === SPEC_DECOMP[q6.hole].slice().sort().join('+');
  const rD6 = await SR.tapPlace(dis6);                      // 干扰板瓦 → wrong
  await wait(1200 * SPEED);
  const i61 = q6.tiles.findIndex(t => t.right);
  const sel61 = (await SR.tapPiece(i61)) === 'sel';
  const rotC6 = SR.tapRotate();                             // combo 无朝向 → false
  const rH6 = await SR.tapPlace(i61);                       // 第一块 → half
  const used6 = SR.quiz.tiles[i61].used === true;           // 钩子拷贝须重读（快照不随后续更新）
  const again6 = await SR.tapPlace(i61);                    // 已用瓦 → false
  const halfOk = rD6 === 'wrong' && sel61 && rotC6 === false && rH6 === 'half' &&
                 SR.quiz.placedN === 1 && used6 && again6 === false;
  const i62 = SR.quiz.tiles.findIndex(t => t.right && !t.used);
  const rR6 = await SR.tapPlace(i62);                       // 第二块 → right（两块都判定）
  const faceOk = quizVoice({ kind: 'combo' }).key === 'sr_combo_hint' &&
                 quizVoice({ kind: 'rot' }).key === 'shr_q';
  const comboOk = libOk && halfOk && rR6 === 'right' && SR.quiz.step === 1 && faceOk;
  if (comboOk) npass++;
  units.combo = { ok: comboOk, hole: q6.hole, need: need6, distractor: rD6, half: rH6,
                  reuse: again6, second: rR6, face: faceOk };

  /* ---- ⑦ 教学链：演示=旋转一次+放置（__srDemoR/__srDemoRot 实证） ---- */
  total++;
  KIDS._save = function () { return { levels: {} }; };       // verify 页存档 stub
  KIDS.store.persist = function () {};
  startLevel(0);
  const t0 = Date.now();
  await tutorialWatch();
  const tw = (Date.now() - t0) / SPEED;                      // 折算真实页时长
  const tutOk = window.__srDemoR === 'right' && window.__srDemoRot === 1 &&
                state.tut === 'help' && cur.flat === 0 &&
                cur.quizzes[0].kind === 'rot' && cur.quizzes[0].shape === 'triangle' &&
                cur.quizzes[0].dir === 1 && tw <= 16000;
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, demoR: window.__srDemoR, demoRot: window.__srDemoRot,
                     tut: state.tut, watchMs: Math.round(tw) };

  /* ---- ⑧ 吞输入轻叮+可见回应：demo/locked 门拦三入口 + 容器 bump ---- */
  total++;
  startLevel(0);
  state.demo = true; state.locked = true;                    // 模拟教学"看"演示期
  const sw1 = (await SR.tapPiece(0)) === false && boardEl.classList.contains('bump');
  const sw2 = SR.tapRotate() === false;
  const sw3 = (await SR.tapPlace(0)) === false;
  state.demo = false; state.locked = true;                   // 演出窗口（locked）
  const sw4 = (await SR.tapPiece(0)) === false;
  const sw5 = (await SR.tapPlace(0)) === false;
  state.locked = false;                                      // 还原
  const swallowOk = sw1 && sw2 && sw3 && sw4 && sw5 &&
                    SR.quiz.step === 0 && SR.quiz.miss === 0;
  if (swallowOk) npass++;
  units.swallow = { ok: swallowOk, demoPiece: sw1, demoRotate: sw2, demoPlace: sw3,
                    lockedPiece: sw4, lockedPlace: sw5 };

  /* ---- ⑨ UI 冒烟 A：flat0 autoSolve 通关（5 题全一放，taps=5，恒 3 星） ---- */
  total++;
  startLevel(0);
  const a0 = await SR.autoSolve();
  const lv0 = SR.currentLevel;
  const smokeA = a0.done && a0.taps === 5 && lv0.done && lv0.won &&
                 lv0.kind === 'rot' && engStars(cur) === 3 && !document.querySelector('.k-celebrate');
  if (smokeA) npass++;
  smokes.flat0 = { ok: smokeA, taps: a0.taps, stars: engStars(cur) };

  /* ---- ⑩ UI 冒烟 B：flat10（combo）先 1 次失败尝试再 autoSolve（1 错=2 星） ---- */
  total++;
  startLevel(10);
  const q8 = SR.quiz;
  const wrongC = q8.tiles.findIndex(t => !t.right);
  const r8 = await SR.tapPlace(wrongC);
  const a10 = await SR.autoSolve();
  const lv10 = SR.currentLevel;
  const smokeB = r8 === 'wrong' && a10.done && a10.taps === 10 && lv10.done && lv10.won &&
                 lv10.kind === 'combo' && lv10.miss === 1 && engStars(cur) === 2;
  if (smokeB) npass++;
  smokes.flat10 = { ok: smokeB, r8: r8, taps: a10.taps, miss: lv10.miss, stars: engStars(cur) };

  /* ---- ⑪ 布局：双 viewport ×（flat0 旋转/flat10 组合/flat17 混合）量测+对比度 ---- */
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
    const cards = Array.prototype.map.call(boardEl.querySelectorAll('.card'), b => ({
      w: b.offsetWidth, h: b.offsetHeight }));
    const sc = { w: sceneEl.offsetWidth, h: sceneEl.offsetHeight };
    const rb = { w: rotateBtn.offsetWidth, h: rotateBtn.offsetHeight };
    const hitOk = cards.length === 4 && cards.every(b => b.w >= 96 && b.h >= 96);
    const sceneOk = sc.w >= 64 && sc.h >= 64;
    const rotOk = rb.w >= 72 && rb.h >= 72;                  // 旋转钮=高频操作钮 ≥72
    const cB = ratioOf('#4A3B2E', '#FBF6EC') >= 3 &&
               ratioOf(cssToHex(getComputedStyle(boardEl.querySelector('.card')).borderLeftColor), '#FFF9EE') >= 3;
    const cS = ratioOf(cssToHex(getComputedStyle(sceneEl).borderLeftColor), '#FBF6EC') >= 3;
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, cards: cards.length, hitOk: hitOk, sceneOk: sceneOk, rotOk: rotOk,
             contrast: cB && cS, ox: ox, pass: hitOk && sceneOk && rotOk && cB && cS && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const flat of [0, 10, 17]) {
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

  /* ---- ⑫ clips：shr_ 6 + sr_ 3 + core 3 = 12 条全注入 + sr_ 3 条实长断言（2026-09-13 重合成后 ffprobe 实测 ±60ms） ---- */
  total++;
  const keys = Object.keys(KIDS.voice.clips);
  const need = ['shr_tut_watch', 'shr_tut_turn', 'shr_hint', 'shr_right', 'shr_wrong', 'shr_q',
                'sr_rot_hint', 'sr_mir_wrong', 'sr_combo_hint',
                'core_chapter_end', 'core_day_end', 'core_rest'];
  const SPEC_DUR = { sr_rot_hint: 3264, sr_mir_wrong: 3216, sr_combo_hint: 3192 };
  const durs = await Promise.all(Object.keys(SPEC_DUR).map(k => new Promise(res => {
    let done = false;
    const t = setTimeout(() => { if (!done) { done = true; res(-1); } }, 8000);
    const a = new Audio(KIDS.voice.clips[k]);
    a.onloadedmetadata = () => { if (!done) { done = true; clearTimeout(t); res(Math.round(a.duration * 1000)); } };
    a.load();
  })));
  const clipsOk = keys.length === 12 &&
    need.every(k => keys.indexOf(k) >= 0 && KIDS.voice.clips[k].indexOf('data:audio/mpeg;base64,') === 0) &&
    durs.every((d, i) => Math.abs(d - Object.values(SPEC_DUR)[i]) <= 60);
  if (clipsOk) npass++;
  units.clips = { ok: clipsOk, n: keys.length, durs: durs };

  /* ---- ⑬ 星级规则（引擎级构造直测：0=3★ / 1-2=2★ / ≥3=1★，永不 0 星） ---- */
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

  /* ---- ⑭ 章末预告 C7 关键词断言（hint[i] ↔ 下一章特征；GEN_HINTS[k] ↔ dch=k+1） ---- */
  total++;
  const hintOk = CHAPTERS[1].hint.indexOf('镜子') >= 0 &&                          // 预告 ch2 镜像辨向
                 CHAPTERS[2].hint.indexOf('两块') >= 0 &&                          // 预告 ch3 组合瓦
                 CHAPTERS[3].hint.indexOf('转一转') >= 0 && CHAPTERS[3].hint.indexOf('镜') >= 0 &&   // 预告 ch4 三型混合
                 CHAPTERS[4].hint.indexOf('挑战') >= 0 &&                          // 预告生成关
                 GEN_HINTS[0].indexOf('转') >= 0 &&                                // dch1 旋转
                 GEN_HINTS[1].indexOf('镜') >= 0 &&                                // dch2 镜像
                 GEN_HINTS[2].indexOf('拼') >= 0 &&                                // dch3 组合
                 GEN_HINTS[3].indexOf('挑战') >= 0;                                // dch4 混合
  if (hintOk) npass++;
  units.hints = { ok: hintOk, chapters: [1, 2, 3, 4].map(i => CHAPTERS[i].hint), gen: GEN_HINTS };

  /* ---- ⑮ verify 提速断言 ---- */
  total++;
  const speedOk = SPEED === 0.12;
  if (speedOk) npass++;
  units.speed = { ok: speedOk, SPEED: SPEED };

  /* ---- ⑯ M1 防回退（2026-09-13 审查）：镜像瓦视觉=洞视觉（变换序一致） ----
     渲染契约：卡上瓦 CSS 角 = (SHAPES[].mir ? (4-dir)%4 : dir)*90（mir 变体取负角，
     使瓦视觉=Rot_-t∘Flip=Flip∘Rot_t 与洞 SVG 内 Flip∘Rot_q 同序——奇 dir 原 180° 脱节已修）；
     洞渲染：内层 transform 含 matrix(-1…) 当且仅当洞形为 mir 变体。 */
  total++;
  let m1Ok = true; const m1Detail = [];
  for (let flat = 5; flat < 10; flat++) {
    startLevel(flat);
    const q16 = SR.quiz;
    const holeEl = sceneEl.querySelector('.hole');
    const holeShape = holeEl ? holeEl.getAttribute('data-shape') : null;
    const holeDir = holeEl ? +(holeEl.getAttribute('data-dir') || -1) : -1;
    const inner16 = holeEl && holeEl.firstElementChild ? (holeEl.firstElementChild.getAttribute('transform') || '') : '';
    const holeMir = holeShape && !!SHAPES[holeShape].mir;
    if (!holeEl || holeShape !== q16.hole || holeDir !== q16.need.dir ||
        holeMir !== (inner16.indexOf('matrix(-1 0 0 1 100 0)') >= 0)) m1Ok = false;
    const cards16 = boardEl.querySelectorAll('.card');
    if (cards16.length !== 4) m1Ok = false;
    cards16.forEach((c, i) => {
      const t = q16.tiles[i];
      const gw = c.querySelector('.gwrap');
      const expDeg = (SHAPES[t.shape].mir ? (4 - t.dir) % 4 : t.dir) * 90;
      if (!gw || gw.style.transform !== 'rotate(' + expDeg + 'deg)') m1Ok = false;   // 渲染角公式（防回退核心）
    });
    if (holeMir && holeDir % 2 === 1) m1Detail.push(flat + ':' + holeShape + '@' + holeDir);  // M1 原触发条件采样
  }
  if (m1Ok) npass++;
  units.m1mirror = { ok: m1Ok, oddMirHoles: m1Detail };

  const out = { game: 'shaperoof', total: total, pass: npass, layoutOk: layoutOk,
                levels: levels, gen: gen, units: units, smokes: smokes };
  $id('verify-result').textContent = JSON.stringify(out);
  document.title = (npass === total && layoutOk) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL';
}

if (VERIFY) {
  /* verify 模式：stub 发声 API 并记录播放键（语音 spy——⑤ 分型反馈断言用） */
  window.__vspy = [];
  KIDS.audio.note = function () {};
  KIDS.audio.sfx = function () {};
  KIDS.speak = function () {};
  KIDS.voice.play = function (k) { window.__vspy.push(k); };
  KIDS.voice.queue = function () {};
  runVerify();
}
