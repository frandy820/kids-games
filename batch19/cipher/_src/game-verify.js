/* ================= ?verify=1 自检（仅 verify 分支加载执行）
   ① 40 关全量审计（flat 0-39，每关一记）：确定性（同 flat 双生成 JSON 一致）/
     结构 structOk（表 4-6 行、密文 3-5、answer 等长、池=answer 多重集+干扰 2-3）/
     章约束（ch1 数字 4-5 对+3-4 符；ch2 词在 WORDS；ch3 缺 1-2 行+情报例覆盖缺符号；
     ch4 5-6 对+4-5 符+干扰 2-3）/ §0.40 分源独立解密器 refDecrypt 对账
     （字符串 map 构建+冲突检测+双射校验+密文逐符解码===answer，禁复用游戏侧逻辑）/
     ch3 无歧义（每个缺符号在情报例中恰一像；恢复表仍双射）/ 干扰 ∉ answer 像
     / 同关 5 题签名互异 / 手解安全网 FALLBACKS 双写对账
   ①b 引擎直驱：非法下标/空槽退回/未满判定拒绝；错误序列拼满=miss 恰一次+槽清空
     可重选；正确序列拼满=right/done 推进；星级三档独立驱动（3/1/0 错）
   ①c 救援目标闭环：干扰卡起步 → rescueTarget 步进逐位填 → 独立解密器复算 →
     收敛 solved；已解题无救援目标
   ② tapOpt/tapSlot 单元（flat0 真实 UI）：入槽 DOM 同步（池卡 .gone+槽 .full+值）+
     退回复活+非法下标 false
   ②b sayW 三态（flat<3 每错必播 / flat≥3 10s 节流 / miss===2 force 豁免恰一次）
   ③ UI 冒烟 A：flat0 真实通路通关（首题错误序列拼满=1 miss+晃动+槽清空零惩罚
     卡回池可重选 → 重拼 answer 到达；autoSolve 余题；1 错=2 星；verify 页不弹层）
   ④ UI 冒烟 B：flat10（ch3 缺表推理）autoSolve 全对通关 3 星（情报推缺路径走通）
   ⑦ 教学链（verify 直驱 tutorialWatch）：watch clip → demo 查表+逐卡解码+拼满判对
     __ciDemoR==='right'（§0.27）→ 数字词 TTS 豁免在场 → 重发同关 → 交接链
     queue([ci_tut_turn]) → tut='help' 解锁
   ⑤ 布局：双 viewport（1280×800 / 800×1180）×（flat0/5/10/15）
     表行/解码槽/候选卡 ≥64、全按钮 ≥64（.k-parentbtn 豁免）、密文符号可见、
     overflowX ≤0
   ⑥ 分布与专项：VOICE 文案独立字面量对账（SPEC §1 定稿）/ 8 条 clips
     （ci_ 5+core 3）clipOk / 开场链 queue([ci_hint]) 单通道 / 填卡数字词 TTS
     豁免 / 读题面 hint+符号名 / 查表闪联映射句
   结果写 #verify-result + document.title='VERIFY PASS n/n'（全部单元完成后才设 title） */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;

  /* ---- verify 侧独立复算实现（SPEC §0.40 分源：字符串 map 构建+正则取值，
     禁复用游戏侧 truth/对象索引——同语义不同实现，笔误即 fail） ---- */
  function refDecrypt(q) {
    let pairs = '';
    for (let k = 0; k < q.table.length; k++) {
      if (q.table[k].img == null) continue;                  // 可见行
      pairs += q.table[k].sym + '>' + q.table[k].img + ';';
    }
    if (q.example) {                                          // 情报例补缺行（冲突=非双射）
      for (let k = 0; k < q.example.cipher.length; k++) {
        const s = q.example.cipher[k], v = q.example.plain[k];
        const m = pairs.match(new RegExp(s + '>([^;]*);'));
        if (m) { if (m[1] !== v) return null; }
        else pairs += s + '>' + v + ';';
      }
    }
    const seg = pairs.split(';').filter(x => x);
    const ps = seg.map(x => x.split('>')[0]), pi = seg.map(x => x.split('>')[1]);
    if (new Set(ps).size !== ps.length) return null;          // 符号无重（双射左唯一）
    if (new Set(pi).size !== pi.length) return null;          // 像无重（双射右唯一，含补值冲突）
    const out = [];
    for (const s of q.cipher) {
      const m = pairs.match(new RegExp(s + '>([^;]*);'));
      if (!m) return null;                                    // 解不出=缺映射=非法题
      out.push(m[1]);
    }
    return { plain: out, nPairs: seg.length };
  }
  /* ch3 无歧义专项（§0.40：同符号可映射多像=该题非法重生成）：每个缺行符号
     在情报例中出现 ≥1 次且所有出现像一致（可唯一推出） */
  function refAmbiguityOk(q) {
    const hid = q.hidden || [];
    if (!hid.length) return q.example == null;                // 非 ch3 不得有情报例
    if (!q.example) return false;
    for (const r of hid) {
      const sym = q.table[r].sym;
      let seen = null, times = 0;
      for (let k = 0; k < q.example.cipher.length; k++) {
        if (q.example.cipher[k] !== sym) continue;
        times++;
        if (seen == null) seen = q.example.plain[k];
        else if (seen !== q.example.plain[k]) return false;   // 同符号多像=歧义
      }
      if (times < 1) return false;                            // 例中不出现=推不出
    }
    return true;
  }
  /* 章约束分源复算（SPEC §1 题型定稿） */
  function refChapOk(dch, q) {
    const nTab = q.table.length, nCip = q.cipher.length;
    const extra = q.opts.length - q.answer.length;
    const isNum = v => v >= '1' && v <= '9';
    const ansStr = q.answer.join('');
    if (dch === 1) {
      if (nTab < 4 || nTab > 5 || nCip < 3 || nCip > 4) return false;
      if (extra !== 2 || q.hidden.length || q.example) return false;
      if (!q.table.every(t => t.img != null && isNum(t.img))) return false;
    } else if (dch === 2) {
      if (nTab < 4 || nTab > 6 || extra !== 2) return false;
      if (nCip < 2 || nCip > 3) return false;                 // 词长 2-3（SPEC §1「太阳」）
      if (q.hidden.length || q.example) return false;
      if (WORDS.indexOf(ansStr) < 0) return false;            // 解码=词库词
    } else if (dch === 3) {
      if (nTab < 5 || nTab > 6 || nCip < 3 || nCip > 5) return false;
      if (q.hidden.length < 1 || q.hidden.length > 2 || extra !== 2) return false;
      if (!q.table.every(t => t.img == null || isNum(t.img))) return false;
      if (!refAmbiguityOk(q)) return false;
    } else {
      if (nTab < 5 || nTab > 6 || nCip < 4 || nCip > 5) return false;
      if (extra < 2 || extra > 3 || q.hidden.length || q.example) return false;
      if (q.table.every(t => t.img != null && isNum(t.img))) return true;   // 数字版
      for (let cut = 2; cut < ansStr.length - 1; cut++) {                    // 双词拼接版
        if (WORDS.indexOf(ansStr.slice(0, cut)) >= 0 &&
            WORDS.indexOf(ansStr.slice(cut)) >= 0) return true;
      }
      return false;
    }
    return true;
  }
  /* 手解安全网双写字面量（与 game-core FALLBACKS 分源对账；genLevel 极端防御路） */
  const REF_FALLBACKS = {
    1: { tab: ['star>3', 'moon>5', 'sun>7', 'cloud>2'], cip: ['star', 'moon', 'star'], dis: ['6', '8'] },
    2: { tab: ['star>太', 'moon>阳', 'cloud>水', 'flower>果'], cip: ['star', 'moon'], dis: ['山', '白'] },
    3: { tab: ['star>3', 'moon>5', 'sun>7', 'cloud>2', 'fish>?'], cip: ['fish', 'moon', 'fish'], dis: ['6', '8'],
         hidden: [4], ex: ['fish>4', 'star>3'] },
    4: { tab: ['star>3', 'moon>5', 'sun>7', 'cloud>2', 'fish>4', 'tree>6'], cip: ['sun', 'tree', 'moon', 'sun'], dis: ['1', '8', '9'] }
  };
  function fallbackDualityOk() {
    for (let d = 1; d <= 4; d++) {
      const a = FALLBACKS[d], b = REF_FALLBACKS[d];
      if (!a || !b) return false;
      if (a.table.length !== b.tab.length ||
          a.table.some((p, i) => p[0] !== b.tab[i].split('>')[0] ||
            (p[1] == null ? '?' : p[1]) !== b.tab[i].split('>')[1])) return false;
      if (a.cipher.length !== b.cip.length || a.cipher.some((s, i) => s !== b.cip[i])) return false;
      if (a.distract.length !== b.dis.length ||
          a.distract.some((v, i) => v !== b.dis[i])) return false;
      const hid = a.hidden || [];
      if (hid.length !== (b.hidden || []).length) return false;
      if (a.example) {
        if (a.example.cipher.length !== b.ex.length) return false;
        if (a.example.cipher.some((s, i) => s + '>' + a.example.plain[i] !== b.ex[i])) return false;
      } else if (b.ex) return false;
    }
    return true;
  }
  /* 独立工具：干扰卡索引（禁复用游戏侧；干扰=池中 ∉ answer 像的卡） */
  function vDistrIdx(q) {
    const ansSet = {};
    q.answer.forEach(v => { ansSet[v] = 1; });
    for (let i = 0; i < q.opts.length; i++) if (!ansSet[q.opts[i].v]) return i;
    return -1;
  }
  function vFreeIdx(q, v) {
    for (let i = 0; i < q.opts.length; i++) if (!q._used[i] && q.opts[i].v === v) return i;
    return -1;
  }
  /* 引擎直驱：错误序列拼满（位 0 换干扰卡，其余按 answer）——错一次 */
  function vFillWrong(L, q) {
    const di = vDistrIdx(q);
    if (di < 0) return false;
    engTapOpt(L, di);
    for (let k = 1; k < q.answer.length; k++) {
      const i = vFreeIdx(q, q.answer[k]);
      if (i < 0) return false;
      engTapOpt(L, i);
    }
    return true;
  }
  function vClearBuilt(L, q) {
    for (let k = q._built.length - 1; k >= 0; k--) {
      if (q._built[k] != null) engTapSlot(L, k);
    }
  }
  /* 引擎直驱：按 answer 正确填满 */
  function vSolve(L, q) {
    vClearBuilt(L, q);
    for (let k = 0; k < q.answer.length; k++) {
      const i = vFreeIdx(q, q.answer[k]);
      if (i < 0 || engTapOpt(L, i) === null) return false;
    }
    return true;
  }

  /* ---- ① 40 关全量审计 + ①b 引擎直驱 + ①c 救援闭环（flat 0-39） ---- */
  const fbOk = fallbackDualityOk();
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1) === JSON.stringify(L2);
    let rangeAll = true, structAll = true, driveOk = true, rescueOk = true;
    const seen = {};
    if (flat < STATIC_LEVELS && L1.dch !== diffOfCh(chOfFlat(flat))) rangeAll = false;  // 静态关=循环章
    if (L1.dch < 1 || L1.dch > 4) rangeAll = false;
    if (L1.quizzes.length !== CH_LEN) rangeAll = false;
    for (let k = 0; k < L1.quizzes.length; k++) {
      const q = L1.quizzes[k];
      if (!refChapOk(L1.dch, q)) rangeAll = false;                        // 章约束
      if (!structOk(q)) structAll = false;
      const dec = refDecrypt(q);                                          // §0.40 独立解密器
      if (!dec || dec.nPairs !== q.table.length) rangeAll = false;        // 恢复全表（无漏）
      if (dec && (dec.plain.length !== q.answer.length ||
        dec.plain.some((v, i) => v !== q.answer[i]))) rangeAll = false;   // 密文解码===answer
      const sig = sigOf(q);                                               // 同关 5 题签名互异
      if (seen[sig]) rangeAll = false;
      seen[sig] = 1;
    }
    if (!fbOk) structAll = false;                                         // 安全网双写并入结构档

    /* ①b 引擎直驱 */
    const Ld = genLevel(flat);
    if (engTapOpt(Ld, -1) !== null || engTapOpt(Ld, 99) !== null) driveOk = false;   // 非法下标
    if (engTapSlot(Ld, 0) !== null) driveOk = false;                      // 空槽退回=拒绝
    if (engJudge(Ld) !== null) driveOk = false;                           // 未满判定=拒绝
    for (let k = 0; k < Ld.quizzes.length && driveOk; k++) {
      const q = Ld.quizzes[k];
      const base = Ld.retries;
      if (!vFillWrong(Ld, q)) { driveOk = false; break; }                 // 错误序列拼满
      const p1 = engJudge(Ld);
      if (!p1 || p1.win) { driveOk = false; break; }
      if (engCommitJudge(Ld, p1) !== 'wrong') { driveOk = false; break; }
      if (q.miss !== 1 || Ld.retries !== base + 1) { driveOk = false; break; }   // 错一次=1 miss
      vClearBuilt(Ld, q);                                                 // 引擎无清空语义（UI 层错后自动清，直驱手动）
      if (!vSolve(Ld, q)) { driveOk = false; break; }                     // 正确重填
      const p2 = engJudge(Ld);
      if (!p2 || !p2.win) { driveOk = false; break; }
      if (engCommitJudge(Ld, p2) !== (k === Ld.quizzes.length - 1 ? 'done' : 'right')) { driveOk = false; break; }
      if (Ld.step !== k + 1) { driveOk = false; break; }
    }
    if (Ld.done !== true) driveOk = false;                                // 5 题全解=关完成
    /* 星级三档独立驱动（3/1/0 错 → 1★/2★/3★） */
    const La = genLevel(flat);
    const qa = La.quizzes[0];
    for (let g = 0; g < 3; g++) {                                         // 首题连错 3 次
      if (!vFillWrong(La, qa)) break;
      engCommitJudge(La, engJudge(La));
      vClearBuilt(La, qa);
    }
    let g2 = 0;
    while (!La.done && g2++ < 30) { vSolve(La, La.quizzes[La.step]); engCommitJudge(La, engJudge(La)); }
    const s1 = La.done && La.retries === 3 && engStars(La) === 1;
    const Lb = genLevel(flat);
    const qb = Lb.quizzes[0];
    if (vFillWrong(Lb, qb)) { engCommitJudge(Lb, engJudge(Lb)); vClearBuilt(Lb, qb); }  // 仅首题错一次
    let g3 = 0;
    while (!Lb.done && g3++ < 30) { vSolve(Lb, Lb.quizzes[Lb.step]); engCommitJudge(Lb, engJudge(Lb)); }
    const s2 = Lb.done && Lb.retries === 1 && engStars(Lb) === 2;
    const Lc = genLevel(flat);
    let g4 = 0;
    while (!Lc.done && g4++ < 30) { vSolve(Lc, Lc.quizzes[Lc.step]); engCommitJudge(Lc, engJudge(Lc)); }
    const s3 = Lc.done && Lc.retries === 0 && engStars(Lc) === 3;
    if (!s1 || !s2 || !s3) driveOk = false;

    /* ①c 救援目标闭环：干扰起步 rescueTarget 仍指首空槽（位 1）→ 清空（UI 错后自动
       清空语义）→ rescueTarget 步进逐位填（独立解密器语义=answer 顺序）→ 满判对收敛；
       已解题无救援目标 */
    const Lr = genLevel(flat);
    const qr = Lr.quizzes[0];
    const dr = vDistrIdx(qr);
    let chainOk = true, steps = 0;
    if (dr >= 0) {
      engTapOpt(Lr, dr);                                                  // 干扰卡起步
      const t1 = rescueTarget(qr);
      if (!t1 || t1.act !== 'opt' || t1.j !== 1) chainOk = false;
      vClearBuilt(Lr, qr);
    }
    while (chainOk && !qr.solved && steps++ < 40) {
      const t = rescueTarget(qr);
      if (!t) { chainOk = false; break; }
      if (qr._used[t.i] || engTapOpt(Lr, t.i) === null) { chainOk = false; break; }
      const plan = engJudge(Lr);
      if (plan) {                                                          // 满：按 rescueTarget 填=必对
        if (!plan.win) { chainOk = false; break; }
        engCommitJudge(Lr, plan);
        break;
      }
    }
    if (!qr.solved) chainOk = false;
    if (rescueTarget(qr) !== null) chainOk = false;                        // 已解题无救援目标
    rescueOk = chainOk;

    const ok = det && rangeAll && structAll && driveOk && rescueOk;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, rangeAll: rangeAll,
      structAll: structAll, driveOk: driveOk, rescueOk: rescueOk,
      stars: { many1: engStars(La), wrong1: engStars(Lb), clean: engStars(Lc) },
      qs: L1.quizzes.map(q => q.table.map(t => t.sym[0] + (t.img == null ? '?' : t.img)).join('') +
        '|' + q.cipher.map(s => s[0]).join('') + '>' + q.answer.join('')) };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }

  /* ---- ② tapOpt/tapSlot 单元（flat0 真实 UI）：入槽/退回 DOM 同步 + 非法下标 ---- */
  total++;
  startLevel(0);
  const q0 = cur.quizzes[0];
  let domOk = true;
  const seq = [];
  for (let k = 0; k < 2; k++) {                                           // 填 answer 前 2 张
    const i = vFreeIdx(q0, q0.answer[k]);
    seq.push(i);
    const r = await CI.tapOpt(i);
    if (r !== 'placed') domOk = false;
    const qz = CI.quiz;
    if (qz.built[k] !== i || qz.built.filter(x => x != null).length !== k + 1) domOk = false;
    const cEl = cardEl(i);
    if (!cEl || !cEl.classList.contains('gone')) domOk = false;          // 池卡 .gone
    const pEl = slotEl(k);
    if (!pEl || !pEl.classList.contains('full') || pEl.dataset.j !== String(k)) domOk = false;  // 槽 .full
    if (pEl && pEl.textContent !== q0.answer[k]) domOk = false;          // 槽值=answer[k]
  }
  if (CI.tapSlot(0) !== 'emptied') domOk = false;                        // 退回槽 0（按位）
  const c0 = cardEl(seq[0]);
  if (c0 && c0.classList.contains('gone')) domOk = false;                // 首卡复活
  const p0 = slotEl(0);
  if (!p0 || p0.classList.contains('full')) domOk = false;               // 槽 0 已空
  if (CI.quiz.built[0] !== null || CI.quiz.built[1] !== seq[1]) domOk = false;
  const badIdx = (await CI.tapOpt(-1)) === false && (await CI.tapOpt(99)) === false &&
    CI.tapSlot(-1) === false && CI.tapSlot(99) === false;                // 非法下标
  const reUse = (await CI.tapOpt(seq[0])) !== false;                     // 复位后再点同卡（此刻未用）应成功
  startLevel(0);                                                         // 重发还原 DOM
  const selfOk = domOk && badIdx && reUse;
  if (selfOk) npass++;
  units.tapOpt = { ok: selfOk, domOk: domOk, badIdx: badIdx, reUse: reUse,
    ans: q0.answer.join(''), opts: q0.opts.map(o => o.v).join(',') };

  /* ---- ②b sayW 三态（flat<3 每错必播 / flat≥3 10s 节流 / miss===2 force 豁免恰一次） ---- */
  total++;
  const wLog = [];
  const origPlay2 = KIDS.voice.play, origQueue2 = KIDS.voice.queue, origSay2 = KIDS.voice.say;
  KIDS.voice.play = function (key) { wLog.push(['p', String(key)]); };
  KIDS.voice.queue = function (parts) { wLog.push(['q'].concat(parts)); };
  KIDS.voice.say = function (t) { wLog.push(['s', String(t)]); };
  const cnt = k => wLog.filter(p => p.indexOf(k) >= 0).length;
  async function wrongOnce() {
    const q = cur.quizzes[0];
    const di = vDistrIdx(q);
    if (di >= 0) await CI.tapOpt(di);
    for (let k = 1; k < q.answer.length; k++) {
      await CI.tapOpt(vFreeIdx(q, q.answer[k]));
    }
  }
  startLevel(0);                                                         // flat0：每错必播
  await wrongOnce();                                                     // 错 1
  await wrongOnce();                                                     // 错 2（错后 UI 已清空可再拼）
  const sayA = cnt('ci_wrong');                                          // → 2
  startLevel(3);                                                         // flat3：10s 节流
  lastWrongVoice = Date.now();                                           /* 显式进入节流窗口内 */
  await wrongOnce();
  const sayB = cnt('ci_wrong') - 2;                                      // 增量 → 0
  startLevel(3);                                                         // 同关重发 fresh：force 豁免链
  lastWrongVoice = 0;                                                    /* 隔离上一子用例时间戳 */
  const qc3 = cur.quizzes[0];
  const base3 = qc3.miss;
  await wrongOnce();                                                     // miss=1 窗口外 → 播
  await wrongOnce();                                                     // miss=2 → force → 播
  const sayC = cnt('ci_wrong') - 2 - sayB;                               // 增量 → 2
  const missOk = qc3.miss === base3 + 2;
  KIDS.voice.play = origPlay2; KIDS.voice.queue = origQueue2; KIDS.voice.say = origSay2;
  const sayWOk = sayA === 2 && sayB === 0 && sayC === 2 && missOk;
  if (sayWOk) npass++;
  units.sayW = { ok: sayWOk, flat0Plays: sayA, flat3Throttle: sayB, flat3Force: sayC, missOk: missOk };

  /* ---- ③ UI 冒烟 A：flat0 真实通路通关（首题错误序列拼满=1 miss+错位清空对位保留
     零惩罚卡可重选 → 重拼 answer 到达；1 错=2 星；verify 页不弹层） ---- */
  total++;
  startLevel(0);
  const qA = cur.quizzes[0];
  let smokeA = true, failOk = false;
  const dA2 = vDistrIdx(qA);
  await CI.tapOpt(dA2);                                                  // 位 0=干扰卡
  for (let k = 1; k < qA.answer.length; k++) {
    await CI.tapOpt(vFreeIdx(qA, qA.answer[k]));
  }
  await wait(1300 * SPEED);                                              /* 等 1000ms 防重入窗+清空动画 */
  const stAfter = CI.quiz;
  failOk = stAfter.miss === 1 && CI.currentLevel.retries === 1;
  const clearedOk = stAfter.built[0] === null &&                        // 错位（位 0 干扰）清空回池
    stAfter.built.every((x, k) => x === null || qA.opts[x].v === qA.answer[k]);  // 对位保留（试玩 P1）
  const keptIdx = stAfter.built.filter(x => x != null);
  const poolBack = qA.opts.every((o, i) => {
    const el = cardEl(i);
    return !el || keptIdx.indexOf(i) >= 0 || !el.classList.contains('gone');   // 非保留卡必回池
  }) && keptIdx.length === qA.answer.length - 1;                        // 恰保留 answer-1 张（位 0 错）
  for (let k = 0; k < qA.answer.length; k++) {                           // 半程重拼（P1 对位保留：只补空位）
    if (stAfter.built[k] != null) continue;
    const r = await CI.tapOpt(vFreeIdx(qA, qA.answer[k]));
    if (r !== 'placed' && r !== 'right' && r !== 'done') smokeA = false;  // 末空位补上即拼满判对
  }
  const rest = await CI.autoSolve();                                     // 余 4 题自动通关
  await wait(900 * SPEED);
  const lvA = CI.currentLevel;
  const smokeOkA = smokeA && failOk && clearedOk && poolBack &&
    rest.done && rest.ok && rest.quizzes >= 1 &&
    lvA.done && lvA.won && lvA.retries === 1 && engStars(cur) === 2 &&
    !document.querySelector('.k-celebrate');                             // verify 页不弹层
  if (smokeOkA) npass++;
  smokes.flat0 = { ok: smokeOkA, failOk: failOk, clearedOk: clearedOk, poolBack: poolBack,
    autoSolve: rest, retries: lvA.retries, stars: engStars(cur) };

  /* ---- ④ UI 冒烟 B：flat10（ch3 缺表推理）autoSolve 全对通关 3 星 ---- */
  total++;
  startLevel(10);
  const q10 = CI.quiz;
  const shapeOk = q10 && cur.dch === 3 && q10.hidden.length >= 1 && q10.hidden.length <= 2 &&
    !!q10.example && q10.table.length >= 5;
  const restB = await CI.autoSolve();
  await wait(900 * SPEED);
  const lv10 = CI.currentLevel;
  const smokeOkB = shapeOk && restB.done && restB.ok && restB.quizzes === CH_LEN &&
    lv10.done && lv10.won && lv10.retries === 0 && engStars(cur) === 3;
  if (smokeOkB) npass++;
  smokes.flat10 = { ok: smokeOkB, shapeOk: shapeOk, hidden: q10 ? q10.hidden.length : -1,
    autoSolve: restB, stars: engStars(cur) };

  /* ---- ⑦ 教学链（verify 直驱 tutorialWatch；真实页看-帮-独链路由无头自测覆盖） ---- */
  total++;
  const origQ7 = KIDS.voice.queue, origP7 = KIDS.voice.play, origS7 = KIDS.voice.say;
  const qLog7 = [], pLog7 = [], sLog7 = [];
  KIDS.voice.queue = function (parts) { qLog7.push(parts.slice()); };
  KIDS.voice.play = function (key) { pLog7.push(String(key)); };
  KIDS.voice.say = function (t) { sLog7.push(String(t)); };
  startLevel(0);
  await tutorialWatch();                        // 看：watch clip → 看密文 → 查表 → demo 解码 → 判对 → 重发同关 → 帮
  KIDS.voice.queue = origQ7; KIDS.voice.play = origP7; KIDS.voice.say = origS7;
  const lastQ7 = qLog7[qLog7.length - 1];
  const q0t = CI.quiz;
  const tutOk = pLog7.indexOf('ci_tut_watch') >= 0 &&                    /* 看=演示配 watch clip */
    window.__ciDemoR === 'right' &&                                     /* §0.27 演示判对真实生效 */
    state.tut === 'help' && !state.demo && !state.locked &&              /* 帮：解锁等孩子动手 */
    CI.currentLevel && CI.currentLevel.flat === 0 &&                     /* 重发同关 */
    q0t && q0t.step === 0 && q0t.miss === 0 &&                           /* 新题面初态 */
    q0t.built.every(x => x === null) &&
    qLog7.some(p => p.length === 1 && p[0] === valKey(q0t.answer[0])) && /* 值词=ci_v_* 单段链（T46 阶段2） */
    lastQ7 && lastQ7.length === 1 && lastQ7[0] === 'ci_tut_turn';        /* 交接链单通道 */
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, watchClip: pLog7.indexOf('ci_tut_watch') >= 0,
    demoR: window.__ciDemoR, handoff: !!lastQ7, parts: lastQ7,
    valSaid: qLog7.filter(p => p.length === 1 && /^ci_v_/.test(p[0])).length, tut: state.tut };

  /* ---- ⑤ 布局：双 viewport ×（flat0/5/10/15）
     量测前等入场 stagger 动画结束（§0.11 transform 中途陷阱：card-in scale(0) 起帧） ---- */
  async function simLayout(w, h, flat) {
    startLevel(flat);
    const g = document.getElementById('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    await wait(620);                            // 卡入场动画 .4s+delay .12s（真实 ms，不吃 SPEED）
    const rows = Array.prototype.slice.call(tableEl.querySelectorAll('.trow'));
    const rowOk = rows.length >= 4 &&
      rows.every(b => { const r = b.getBoundingClientRect(); return r.height >= 64 && r.width >= 60; });
    const slots = Array.prototype.slice.call(cipherRowEl.querySelectorAll('.cslot'));
    const slotOk = slots.length >= 2 &&                                      // ch2 词域密文 2 符（SPEC §1）
      slots.every(b => { const r = b.getBoundingClientRect(); return r.width >= 64 && r.height >= 64; });
    const syms = Array.prototype.slice.call(cipherRowEl.querySelectorAll('.csym'));
    const symOk = syms.length >= 2 &&
      syms.every(b => { const r = b.getBoundingClientRect(); return r.width >= 64 && r.height >= 64; });
    const cards = Array.prototype.slice.call(cardPoolEl.querySelectorAll('.card'));
    const cardOk = cards.length > 0 &&
      cards.every(b => { const r = b.getBoundingClientRect(); return r.width >= 64 && r.height >= 64; });
    const intel = document.getElementById('intel');
    let intelOk = true;                         // 情报例卡（ch3 在场）≥64 高
    if (cur.dch === 3) {
      const r = intel.getBoundingClientRect();
      intelOk = intel.classList.contains('show') && r.height >= 64;
    }
    let btnOk = true;                           // 全部按钮 ≥64（.k-parentbtn 家长按钮豁免）
    document.querySelectorAll('button').forEach(b => {
      if (b.classList.contains('k-parentbtn')) return;
      const r = b.getBoundingClientRect();
      if (r.width > 4 && r.height > 4 && (r.width < 64 || r.height < 64)) btnOk = false;
    });
    const de = document.documentElement;
    const ox = Math.max(document.getElementById('game').scrollWidth - document.getElementById('game').clientWidth,
      de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, flat: flat, rowOk: rowOk, slotOk: slotOk, symOk: symOk,
      cardOk: cardOk, intelOk: intelOk, btnOk: btnOk, ox: ox,
      pass: rowOk && slotOk && symOk && cardOk && intelOk && btnOk && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const f of [0, 5, 10, 15]) {
    sims.push(await simLayout(1280, 800, f));
    sims.push(await simLayout(800, 1180, f));
  }
  const g0 = document.getElementById('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);                                // 还原真实 viewport 布局
  const layoutOk = sims.length === 8 && sims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims };

  /* ---- ⑥ 分布与专项：文案对账 / clip 注入 / 开场链 / TTS 豁免 / 读题面 / 查表闪联 ---- */
  total++;
  /* SPEC §1 定稿文案独立字面量（manifest 一致，禁改） */
  const refVoice = VOICE.watch.text === '看！破译小密码' &&
    VOICE.turn.text === '你来破一破' && VOICE.hint.text === '查查密码表' &&
    VOICE.right.text === '破译成功，真聪明' && VOICE.wrong.text === '再对对密码表';
  /* 42 条 clips 注入对账（ci_ 39=5 句+T46 阶段2 34 段 + core 3，manifest games:['cipher']）
     T46 段族：ci_sym_*10（SYM_IDS 全集）/ci_v_d1-9/ci_v_<字>（WORDS 全集）/ci_repr/ci_look1/2 */
  const CI_KEYS = ['ci_tut_watch', 'ci_tut_turn', 'ci_hint', 'ci_right', 'ci_wrong',
    'ci_repr', 'ci_look1', 'ci_look2']
    .concat(SYM_IDS.map(s => 'ci_sym_' + s))
    .concat(WORDS.map(w => 'ci_v_' + w))
    .concat(Array.from({ length: 9 }, (_, i) => 'ci_v_d' + (i + 1)));
  const coreKeys = Object.keys(KIDS.voice.clips).filter(k => k.indexOf('core_') === 0);
  const nClips = Object.keys(KIDS.voice.clips).length;
  const clipOk = nClips === 42 && CI_KEYS.every(k => !!KIDS.voice.clips[k]) && coreKeys.length === 3;
  /* 开场链 / 填卡值词段 / 读题面 / 查表闪联（stub 记录；T46 阶段2：say 通道清零，全走 queue 段链） */
  const origQ = KIDS.voice.queue, origP = KIDS.voice.play, origS = KIDS.voice.say;
  const qLog = [], playLog = [], sayLog = [];
  KIDS.voice.queue = function (parts) { qLog.push(parts.slice()); };
  KIDS.voice.play = function (key, text) { playLog.push([String(key), text === undefined ? null : String(text)]); };
  KIDS.voice.say = function (t) { sayLog.push(String(t)); };
  startLevel(0);                                // verify 页恒走开场链
  const lastQ = qLog[qLog.length - 1];
  const openChain = qLog.length >= 1 && lastQ.length === 1 && lastQ[0] === 'ci_hint';   // 开场=[hint] 单通道
  const qw0 = cur.quizzes[0];
  await CI.tapOpt(vFreeIdx(qw0, qw0.answer[0]));                       // 填首卡
  const valSaid = qLog.some(p => p.length === 1 && p[0] === valKey(qw0.answer[0]));   // 值词单段链
  const symOk2 = uiTapSym(0) === true &&
    qLog.some(p => p.length === 3 && p[0] === 'ci_sym_' + qw0.cipher[0] &&
      p[1] === 'ci_repr' && p[2] === valKey(qw0.table[rowIndexOf(qw0, qw0.cipher[0])].img || ''));   // 查表闪联映射句（主动学习）
  const rowOk2 = uiTapRow(0) === true;                                 // 表行朗读（主动学习）
  const hearOk = uiHear() === true &&
    qLog.some(p => p.length === 1 + qw0.cipher.length && p[0] === 'ci_hint' &&
      p.slice(1).every((k, i) => k === 'ci_sym_' + qw0.cipher[i]));    // 读题面=hint+符号名段链
  KIDS.voice.queue = origQ; KIDS.voice.play = origP; KIDS.voice.say = origS;
  startLevel(0);                                // 还原
  const specOk = refVoice && clipOk && openChain && valSaid && symOk2 && rowOk2 && hearOk;
  if (specOk) npass++;
  units.dist = { ok: specOk, refVoice: refVoice, clips: clipOk, nClips: nClips,
    openChain: openChain, valSaid: valSaid, symFlash: symOk2, rowSpeak: rowOk2, hearOk: hearOk,
    missing: CI_KEYS.filter(k => !KIDS.voice.clips[k]) };

  const out = { game: 'cipher', total: total, pass: npass, layoutOk: layoutOk,
    levels: levels, gen: gen, units: units, smokes: smokes };
  document.getElementById('verify-result').textContent = JSON.stringify(out);
  document.title = (npass === total && layoutOk) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL';
}

if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 未 init，audio.ctx 为 null，双保险） */
  KIDS.audio.note = function () {};
  KIDS.audio.sfx = function () {};
  KIDS.speak = function () {};
  KIDS.voice.play = function () {};
  KIDS.voice.queue = function () {};
  KIDS.voice.say = function () {};
  runVerify();
}
