/* ================= ?verify=1 自检（r13：仅 verify 分支加载执行；独立第 4 script 块）
   ① 静态 20 + 生成 20 关全量审计（flat 0-39）：确定性/章号 1 基+dch 域/structWhy
     （8×8 值域/墙互异不压端点/依序分段 BFS 可达 ≥2/opt 对账/句长 cap/exec 指令自证
     engRunSeq 无 bump 到箱/maze 死端格+绕行段）+章型（exec1 全 exec1；exec2 qi0 热身
     exec1 型；plan qi0 热身 exec 型；maze qi0 热身 plan 型）+相邻题互异（起点+首箱）
     +引擎直驱（exec 错配 1 次→全对执行；plan/maze 错序 take 1 次→依序走完；bump 探针
     出界/撞墙不移动不计 miss；undo 回退位置步数不减）+独立复算（本文件自带 DELTA_V/
     BFS_V/朝向回放——禁调引擎 engBfs/engRunSeq）
   ② 指令键单元（flat0 exec1）：钩子契约/DOM 对账 64 格/指令条 chip 序列/错配晃动
     零惩罚首错不 pulse/前进格点进度/答对推进
   ③ bump+undo+朝向单元：出界 bump 原地零惩罚/undo 回退位置步数不减/
     朝向机封闭（4×L=原朝向+箭头旋转角断言）
   ④ 错序单元（flat10 plan qi1）：先走到 2 号箱 take=order miss+方向 queue
     （gri_i_next+n+gri_i_box）/依序收集全序过关/非箱格 take=nope 不罚
   ⑤ sayW 三态：flat<3 每错必播 / flat≥3 10s 节流 / ===2 豁免恰一次
   ⑥ 教学链单元：tutorialWatch——watch clip→逐命令演示（demo 通道）→重发同关→
     turn clip→2000ms 接力题面 queue（全 clip 禁 key:null）→state 'help'
   ⑦ UI 冒烟 A：flat0 真实通路通关（首题先错一次 → 1 错=2 星，verify 页不弹层）
   ⑧ UI 冒烟 B：flat10（dch3）热身 exec+plan 自由规划真实通路通关 3 星
   ⑨ 布局：双 viewport（1280×800 / 800×1180 port 类通道）×（exec1/exec2/plan/maze）：
     格 64 格 ≥44（r13 delta 定死 8×8 触控下限）/指令键 4 枚 ≥96（主答案）/退一步 ≥64/
     兔子在格+箭头旋转角/宝箱徽章/石块计数/格落板容器/portStyle 锚
     （#play-row flex-direction=column）——竖屏三件套（M3 形态）
   ⑩ 分布与专项：VOICE 文案对账（含 r13 新 hint）/gri_* 26 条注入/开场链
     （gri_i_hint→OPEN_RELAY 3000ms 接力指令句 queue 全 clip）/生成关 dch 全覆盖/
     出界+撞墙两类 bump 均实测/朝向封闭
   ⑪ duration（r13 门禁）：40 关 modeled ≥40000+独立副本逐关对账+每步 DECIDE≥voiceWin
   ⑫ 源码断言：script[2]（data+engine+main）字面（estMs 家族/DECIDE_MS/GRID_N=8/
     OPEN_RELAY/句长 cap——b36 M1① 恢复判别力）
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
/* ---- 独立复算常量（文件顶层：runVerify 内单元与底部驱动辅助共用；禁引引擎——同源陷阱对策） ---- */
const DELTA_V = { N: [-1, 0], E: [0, 1], S: [1, 0], W: [0, -1] };
const TURN_L_V = { N: 'W', W: 'S', S: 'E', E: 'N' };
const NUM_V = { 1: '一', 2: '二', 3: '三' };
const inGridV = (r, c) => r >= 1 && r <= 8 && c >= 1 && c <= 8;
function bfsV(fr, fc, to, walls) {
  const wl = new Set(walls.map(w => w.r * 8 + w.c));
  const dist = {}; dist[fr * 8 + fc] = 0;
  const q = [[fr, fc]]; let head = 0;
  while (head < q.length) {
    const p = q[head++];
    if (p[0] === to[0] && p[1] === to[1]) return dist[p[0] * 8 + p[1]];
    const d0 = dist[p[0] * 8 + p[1]];
    for (const k of ['N', 'E', 'S', 'W']) {
      const nr = p[0] + DELTA_V[k][0], nc = p[1] + DELTA_V[k][1];
      if (!inGridV(nr, nc) || wl.has(nr * 8 + nc)) continue;
      const key = nr * 8 + nc;
      if (dist[key] != null) continue;
      dist[key] = d0 + 1;
      q.push([nr, nc]);
    }
  }
  return -1;
}

async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;
  const genDch = { 1: 0, 2: 0, 3: 0, 4: 0 };
  let bumpEdgeN = 0, bumpWallN = 0;              // 出界/撞墙两类 bump 实测计数

  /* 独立指令序列回放（朝向+位置状态机复算）：exec 到达断言/plan 依序收集断言 */
  function replayV(q) {
    let r = q.fr, c = q.fc, h = q.h0, col = 0, fwd = 0;
    for (const cm of q.seq) {
      if (cm.t === 'L') h = TURN_L_V[h];
      else if (cm.t === 'R') h = { N: 'E', E: 'S', S: 'W', W: 'N' }[h];
      else if (cm.t === 'fwd') {
        for (let k = 0; k < cm.n; k++) {
          r += DELTA_V[h][0]; c += DELTA_V[h][1];
          if (!inGridV(r, c)) return null;
        }
        fwd += cm.n;
      } else {
        if (!q.chests[col] || q.chests[col].r !== r || q.chests[col].c !== c) return null;
        col++;
      }
    }
    return { r: r, c: c, h: h, col: col, fwd: fwd };
  }
  const sentenceV = q => q.seq.map(cm => cm.t === 'fwd' ? '向前' + NUM_V[cm.n] + '格'
    : (cm.t === 'L' ? '向左转' : (cm.t === 'R' ? '向右转' : '拿到宝箱'))).join('，');
  const optV = q => {
    let s = 0, ar = q.fr, ac = q.fc;
    for (const ch of q.chests) {
      const d = bfsV(ar, ac, [ch.r, ch.c], q.walls);
      if (d < 0) return -1;
      s += d; ar = ch.r; ac = ch.c;
    }
    return s;
  };
  /* plan 现算参考解（④/⑧/冒烟用——复用引擎 engPlanRef 属同源；此处只做驱动不禁断言口径） */

  /* ---- ① 40 关全量审计（flat 0-39） ---- */
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1.quizzes) === JSON.stringify(L2.quizzes);   // 确定性
    const chOk = L1.ch === Math.floor(flat / CH_LEN) + 1;
    const dchOk = flat < STATIC_LEVELS ? L1.dch === diffOfCh(L1.ch)
                                     : (L1.dch >= 1 && L1.dch <= 4);         // 生成关随机章参数
    if (flat >= STATIC_LEVELS) genDch[L1.dch]++;
    let structAll = true, ruleOk = true, adjOk = true, indepOk = true;
    for (let k = 0; k < L1.quizzes.length; k++) {
      const q = L1.quizzes[k];
      if (structWhy(q)) structAll = false;
      /* 章型：exec1 全 exec1；exec2 qi0 热身 exec1 型；plan qi0 热身 exec 型；maze qi0 热身 plan 型 */
      const want = L1.dch === 1 ? 'exec1'
        : L1.dch === 2 ? (k === 0 ? 'exec1' : 'exec2')
        : L1.dch === 3 ? (k === 0 ? 'exec1' : 'plan')
        : (k === 0 ? 'plan' : 'maze');
      if (q.kind !== want) ruleOk = false;
      if (L1.dch === 2 && k > 0 && q.walls.length > 2) ruleOk = false;       // exec2 墙 0-2
      /* 独立复算：指令回放到达/依序收集 + 独立 BFS opt 对账 */
      const rv = replayV(q);
      if (!rv) indepOk = false;
      else {
        if (q.kind === 'exec1' || q.kind === 'exec2') {
          if (rv.col !== 1 || rv.r !== q.chests[0].r || rv.c !== q.chests[0].c) indepOk = false;
        } else if (rv.col !== q.chests.length) indepOk = false;
        if (rv.fwd !== q.opt || optV(q) !== q.opt) indepOk = false;
      }
      if (k > 0) {                               // 相邻题互异（起点+首箱）
        const p = L1.quizzes[k - 1];
        if (p.fr === q.fr && p.fc === q.fc && p.chests[0].r === q.chests[0].r &&
            p.chests[0].c === q.chests[0].c) adjOk = false;
      }
    }
    /* 引擎直驱：每题先错 1 次（exec=错配 / plan·maze=错序 take）再依序解完；
       plan·maze 加 bump 探针（出界或撞墙不移动零惩罚）+ undo 探针（位置回退步数不减） */
    const Ld = genLevel(flat);
    let driveOk = true, expRetries = 0, expMiss = 0, lastR = null, guard = 0;
    while (!Ld.done && driveOk && guard++ < 400) {
      const q = Ld.quizzes[Ld.step];
      const isExec = q.kind === 'exec1' || q.kind === 'exec2';
      const drivePlan = plan => {                // 执行命令序列（fwd 逐格；段尾 T 跳过——
        for (let i = 0; i < plan.length; i++) {  // 由外层显式 engCmd('T') 收集并校验返回值，
          const cm = plan[i];                    // 否则错序走位到未来箱的 T 会提前触发 order）
          if (cm.t === 'T' && i === plan.length - 1) break;
          const n = cm.t === 'fwd' ? cm.n : 1;
          for (let j = 0; j < n; j++) lastR = engCmd(Ld, cm.t === 'fwd' ? 'fwd' : cm.t);
        }
      };
      if (isExec) {
        const act = q.seq[q._si];                // 错配 1 次：非当前命令类型
        const bad = act.t === 'fwd' ? 'L' : 'fwd';
        if (engCmd(Ld, bad) !== 'wrong' || q._miss !== 1) { driveOk = false; break; }
        expRetries++; expMiss++;
        drivePlan(q.seq);                        // 全对执行（段尾 T 跳过）
        lastR = engCmd(Ld, 'T');                 // 显式到访收集（校验 goal/done）
      } else {
        /* undo 探针：前进一格（合法时）→撤销→位置回退步数不减 */
        const st0 = { r: q._pr, c: q._pc, steps: q._steps };
        const ru = engCmd(Ld, 'fwd');
        if (ru === 'step') {
          if (engUndo(Ld) !== 'undo' || q._pr !== st0.r || q._pc !== st0.c || q._steps !== st0.steps + 1) {
            driveOk = false; break;
          }
          expRetries++;
        } else if (ru === 'bump') {              /* 起点朝向即受阻：bump 计数（出界/撞墙分类） */
          const d0 = DELTA_H[q._h];
          if (!inGrid(q._pr + d0[0], q._pc + d0[1])) bumpEdgeN++; else bumpWallN++;
          expRetries++;
        }
        /* bump 探针：邻墙方向优先（全 4 向扫描）→转向对齐→fwd=bump 原地零惩罚→R 转回
           （转回走合法转向零 retries；探针 retries 贡献恰 1=bump 本身） */
        const bp = bumpProbe(Ld);
        if (bp === 'edge') bumpEdgeN++;
        else if (bp === 'wall') bumpWallN++;
        else if (bp === 'FAIL') { driveOk = false; break; }
        if (bp) expRetries++;
        /* 错序 1 次：先走到末箱 take=order（miss+方向级反馈不罚死）。
           单箱 plan 热身题（ch4 qi0）无未来箱可错序——跳过该步（miss 贡献 0） */
        if (q.chests.length >= 2) {
          const far = q.chests[q.chests.length - 1];
          drivePlan(engPlanRef({ fr: q._pr, fc: q._pc, h0: q._h, chests: [far], walls: q.walls }));
          if (engCmd(Ld, 'T') !== 'order' || q._miss !== 1 || q._col !== 0) { driveOk = false; break; }
          expRetries++; expMiss++;
        }
        while (q._col < q.chests.length && driveOk) {   // 依序走完（现算参考解逐段）
          const nx = q.chests[q._col];
          drivePlan(engPlanRef({ fr: q._pr, fc: q._pc, h0: q._h, chests: [nx], walls: q.walls }));
          lastR = engCmd(Ld, 'T');
          if (lastR !== 'take' && lastR !== 'goal' && lastR !== 'done') { driveOk = false; break; }
        }
      }
      if (!driveOk || (lastR !== 'goal' && lastR !== 'done')) { driveOk = false; break; }
    }
    function bumpProbe(L) {                      // 邻墙优先全 4 向扫描→对齐→bump→转回（合法转向）
      const q = L.quizzes[L.step];
      const blocked = h => {
        const d = DELTA_H[h], nr = q._pr + d[0], nc = q._pc + d[1];
        if (!inGrid(nr, nc)) return 'edge';
        return q.walls.some(w => w.r === nr && w.c === nc) ? 'wall' : null;
      };
      let target = null, kind = null;
      for (const h of HEADS) if (blocked(h) === 'wall') { target = h; kind = 'wall'; break; }
      if (!target) for (const h of HEADS) { const b = blocked(h); if (b) { target = h; kind = b; break; } }
      if (!target) return null;                  // 内部格且无邻墙：本位无可撞
      let k = 0, hh = q._h;
      while (hh !== target && k < 4) { hh = TURN_L[hh]; k++; }
      for (let i = 0; i < k; i++) engCmd(L, 'L');
      const before = { r: q._pr, c: q._pc, miss: q._miss };
      const rr = engCmd(L, 'fwd');
      for (let i = 0; i < k; i++) engCmd(L, 'R');    /* 转回原朝向（合法转向零 retries，非 undo） */
      const ok = rr === 'bump' && q._pr === before.r && q._pc === before.c && q._miss === before.miss;
      return ok ? kind : 'FAIL';
    }
    const ok1 = Ld.done && Ld.step === CH_LEN && Ld.retries === expRetries &&
      engStars(Ld) === (expMiss === 0 ? 3 : (expMiss <= 2 ? 2 : 1));   // 星级按真错点（bump/undo 不扣）
    const L3 = genLevel(flat);                   // 全对通路 → 3 星（零错零试探）
    guard = 0;
    while (!L3.done && guard++ < 400) {
      const q = L3.quizzes[L3.step];
      if (q.kind === 'exec1' || q.kind === 'exec2') {
        q.seq.forEach(cm => { const n = cm.t === 'fwd' ? cm.n : 1;
          for (let i = 0; i < n; i++) engCmd(L3, cm.t === 'fwd' ? 'fwd' : cm.t); });
      } else {
        while (q._col < q.chests.length) {
          const nx = q.chests[q._col];
          const pl = engPlanRef({ fr: q._pr, fc: q._pc, h0: q._h, chests: [nx], walls: q.walls });
          for (let i = 0; i < pl.length; i++) {          /* 段尾 T 跳过——显式 T 收集
                                                             （防双 T 打到下一题触发 wrong） */
            if (pl[i].t === 'T' && i === pl.length - 1) break;
            const n = pl[i].t === 'fwd' ? pl[i].n : 1;
            for (let j = 0; j < n; j++) engCmd(L3, pl[i].t === 'fwd' ? 'fwd' : pl[i].t);
          }
          engCmd(L3, 'T');
        }
      }
    }
    const ok2 = L3.done && L3.retries === 0 && engStars(L3) === 3;
    const ok = det && chOk && dchOk && structAll && ruleOk && adjOk && indepOk &&
               driveOk && ok1 && ok2 && L1.quizzes.length === CH_LEN;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, structAll: structAll, ruleOk: ruleOk,
      adjOk: adjOk, indepOk: indepOk, driveOk: driveOk && ok1 && ok2,
      qs: L1.quizzes.map(q => q.kind + ':' + q.fr + ',' + q.fc + q.h0 + '>' +
        q.chests.map(ch => ch.r + ',' + ch.c).join('|') + (q.walls.length ? 'w' + q.walls.length : '')) };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }

  /* ---- ② 指令键单元（flat0 qi0=exec1 热身 [fwd1,T] 真实 UI 状态机） ---- */
  total++;
  startLevel(0);
  const q0 = GR.quiz;
  const hookOk = q0 && q0.kind === 'exec1' && q0.seq.length === 2 &&
    q0.seq[0].t === 'fwd' && q0.seq[1].t === 'T' && q0.seqIdx === 0 && q0.fwdLeft === 1 &&
    HEADS.indexOf(q0.heading) >= 0 && q0.pos.r >= 1 && q0.pos.r <= 8 && q0.pos.c >= 1 && q0.pos.c <= 8 &&
    q0.next === 0 && q0.collected === 0 && q0.steps === 0 && q0.optSteps === 1 && q0.walls.length === 0 &&
    q0.chests.length === 1 && q0.step === 0 && q0.miss === 0;
  const domOk = boardEl.querySelectorAll('.cell').length === 64 &&
    padEl.querySelectorAll('.cmdb').length === 4 && !!undoBtn &&
    chipEl.querySelectorAll('.schip').length === 2 &&
    chipEl.querySelector('.schip.cur .st').textContent === '向前一格' &&
    meterEl.textContent.indexOf('最短 1 步') >= 0 &&
    !!cellEl(q0.chests[0].r, q0.chests[0].c).querySelector('.chest');
  const rW = await GR.tapTurn('left');           // 错配（当前=fwd）：晃动+miss+首错不 pulse
  const wrongOk = rW === 'wrong' && GR.quiz.miss === 1 && GR.currentLevel.retries === 1 &&
    GR.currentLevel.step === 0 && cmdEl('L').classList.contains('wig') &&
    !cmdEl('fwd').classList.contains('pulse') && GR.quiz.seqIdx === 0;
  const rF = await GR.tapFwd();                  // 前进：pos 推进+格点进度+指令条推进
  const fwdOk = rF === 'step' && GR.quiz.seqIdx === 1 && GR.quiz.fwdLeft === 0 &&
    GR.quiz.steps === 1 && GR.quiz.pos.r === q0.pos.r + DELTA_V[q0.heading][0] &&
    GR.quiz.pos.c === q0.pos.c + DELTA_V[q0.heading][1] &&
    cellEl(GR.quiz.pos.r, GR.quiz.pos.c).classList.contains('here');
  /* exec 撤销回卷：位置回起点/步数留痕不减/指令条 _si/_fn 复位，再重走（错步可回退不罚） */
  const rU0 = await GR.tapUndo();
  const rollOk = rU0 === 'undo' && GR.quiz.seqIdx === 0 && GR.quiz.fwdLeft === 1 &&
    GR.quiz.pos.r === q0.pos.r && GR.quiz.pos.c === q0.pos.c && GR.quiz.steps === 1;
  const rF2 = await GR.tapFwd();
  const reOk = rF2 === 'step' && GR.quiz.seqIdx === 1 && GR.quiz.fwdLeft === 0 &&
    chipEl.querySelectorAll('.schip.went').length === 1;
  const rT = await GR.tapTake();                 // 到访：开箱推进换题
  const takeOk = (rT === 'goal' || rT === 'done') && GR.currentLevel.step === 1 &&
    GR.quiz && GR.quiz.step === 1 && GR.quiz.miss === 0;
  /* qi1 再错两次：miss=2 → 当前命令键 pulse 两遍（§0.7） */
  const q1 = GR.quiz;
  const act1 = q1.seq[q1.seqIdx].t;
  await GR.tapTurn(act1 === 'L' ? 'right' : 'left');
  const rW2 = await GR.tapTurn(act1 === 'L' ? 'right' : 'left');
  const pulse2 = rW2 === 'wrong' && GR.quiz.miss === 2 &&
    cmdEl(act1 === 'fwd' ? 'fwd' : act1).classList.contains('pulse');
  const tapOk = hookOk && domOk && wrongOk && fwdOk && rollOk && reOk && takeOk && pulse2;
  if (tapOk) npass++;
  units.tapCmd = { ok: tapOk, hook: hookOk, dom: domOk, wrong: wrongOk, fwd: fwdOk,
    rollback: rollOk, redo: reOk, take: takeOk, pulse2: pulse2, retVals: [rW, rF, rU0, rT] };

  /* ---- ③ bump+undo+朝向单元（flat10 plan qi1：自由转向期——exec1 无墙且指令锁死无法保证可撞向） ---- */
  total++;
  startLevel(10);
  await solveQuizV();                            // qi0 热身 exec → qi1 plan（自由转向/前进）
  const q3 = GR.quiz;
  const hook3 = q3 && q3.kind === 'plan';
  /* UI bump：转向至前方受阻（邻墙或出界，≤3 转）→fwd=bump 原地零惩罚不计 miss */
  let turned = 0, blocked = false;
  while (turned < 4) {
    const h = GR.quiz.heading, dd = DELTA_V[h];
    const nr = GR.quiz.pos.r + dd[0], nc = GR.quiz.pos.c + dd[1];
    const out = nr < 1 || nr > 8 || nc < 1 || nc > 8;
    const walled = GR.quiz.walls.some(w => w.r === nr && w.c === nc);
    if (out || walled) { blocked = true; break; }
    await GR.tapTurn('left');
    turned++;
  }
  const stB = { r: GR.quiz.pos.r, c: GR.quiz.pos.c };
  const rB = blocked ? await GR.tapFwd() : null;
  const bumpOk = blocked && rB === 'bump' && GR.quiz.pos.r === stB.r && GR.quiz.pos.c === stB.c &&
    GR.quiz.miss === 0 && GR.quiz.collected === 0 && GR.currentLevel.step === 1;
  for (let i = 0; i < turned; i++) await GR.tapUndo();   // 回退转向（undo 朝向反转；位置本未动）
  const undoTurnOk = GR.quiz.heading === q3.heading &&
    GR.quiz.pos.r === q3.pos.r && GR.quiz.pos.c === q3.pos.c;
  /* 朝向封闭：4×左转=原朝向；箭头旋转角=HEAD_DEG（可视化断言） */
  const h0c = GR.quiz.heading;
  for (let i = 0; i < 4; i++) await GR.tapTurn('left');
  const hw = rabbitEl.querySelector('.hwrap');
  const rotGot = hw && hw.style.transform;
  const closeOk = GR.quiz.heading === h0c &&
    rotGot === 'rotate(' + HEAD_DEG[GR.quiz.heading] + 'deg)';
  /* fwd+undo：转向至清向→前进→撤销=位置回退步数留痕（r13 delta③） */
  let kc = 0;
  while (kc < 4) {
    const h = GR.quiz.heading, dd = DELTA_V[h];
    const nr = GR.quiz.pos.r + dd[0], nc = GR.quiz.pos.c + dd[1];
    if (nr >= 1 && nr <= 8 && nc >= 1 && nc <= 8 &&
        !GR.quiz.walls.some(w => w.r === nr && w.c === nc)) break;
    await GR.tapTurn('left');
    kc++;
  }
  const stS = { r: GR.quiz.pos.r, c: GR.quiz.pos.c };
  const rS = await GR.tapFwd();
  const rU = await GR.tapUndo();
  const undoOk = rS === 'step' && rU === 'undo' &&
    GR.quiz.pos.r === stS.r && GR.quiz.pos.c === stS.c && GR.quiz.steps === 1;
  const undoUnitOk = hook3 && bumpOk && undoTurnOk && undoOk && closeOk;
  if (undoUnitOk) npass++;
  units.bumpUndo = { ok: undoUnitOk, hook: hook3, bump: bumpOk, undoTurn: undoTurnOk,
    undo: undoOk, headingClosed: closeOk, rot: rotGot };

  /* ---- ④ 错序单元（flat10=ch3：qi0 热身 exec → qi1 plan 2 箱） ---- */
  total++;
  startLevel(10);
  const warm10 = GR.quiz.kind === 'exec1';        // ch3 首题热身=exec 型（SPEC r13）
  await solveQuizV();
  const q4 = GR.quiz;
  const hook4 = q4 && q4.kind === 'plan' && q4.chests.length === 2 && q4.walls.length >= 2 &&
    q4.walls.length <= 4 && q4.next === 0 && q4.seq === null;
  const ordLog = [];
  const origQ4 = KIDS.voice.queue;
  KIDS.voice.queue = function (parts) { ordLog.push(parts); };
  /* 先走到 2 号箱 → take=order miss+方向反馈（不罚死：不弹不锁关）。
     包装器须包到 tapTake 之后（order 的 queue 在 uiCmd 内发出） */
  await walkToV(q4.chests[1]);
  const rOrd = await GR.tapTake();
  KIDS.voice.queue = origQ4;
  const orderOk = rOrd === 'order' && GR.quiz.miss === 1 && GR.quiz.collected === 0 &&
    GR.currentLevel.step === 1 &&
    ordLog.some(p => JSON.stringify(p) === JSON.stringify(['gri_i_next', 'gri_n_1', 'gri_i_box']));
  /* 非箱格 take=nope 不罚（走到普通格试） */
  const freeCell = findFreeCellV(q4);
  await walkToV(freeCell);
  const rNope = await GR.tapTake();
  const nopeOk = rNope === 'nope' && GR.quiz.miss === 1 && GR.quiz.collected === 0;
  /* 依序收集：1 号→take；2 号→goal 推进（collected=1 须在终箱推进前读——推进后 GR.quiz 已换题） */
  await walkToV(q4.chests[0]);
  const rC1 = await GR.tapTake();
  const col1 = GR.quiz.collected === 1 && GR.quiz.step === 1 &&
    cellEl(q4.chests[0].r, q4.chests[0].c).classList.contains('open');
  await walkToV(q4.chests[1]);
  const rC2 = await GR.tapTake();
  const collectOk = rC1 === 'take' && col1 &&
    (rC2 === 'goal' || rC2 === 'done') && GR.currentLevel.step === 2;
  const ordUnitOk = warm10 && hook4 && orderOk && nopeOk && collectOk;
  if (ordUnitOk) npass++;
  units.order = { ok: ordUnitOk, warm: warm10, hook: hook4, order: orderOk, nope: nopeOk,
    collect: collectOk, queues: ordLog.length };

  /* ---- ⑤ sayW 三态：flat<3 每错必播 / flat≥3 10s 节流 / ===2 豁免恰一次 ---- */
  total++;
  const wLog = [];
  const origPlay2 = KIDS.voice.play;
  KIDS.voice.play = function (key, text) { wLog.push([key, String(text).slice(0, 4)]); };
  const wrongPlays = () => wLog.filter(p => p[0] === 'gri_wrong').length;
  const mismatchTap = async () => {              // 当前命令的错配键
    const q = GR.quiz;
    const act = q.seq[q.seqIdx].t;
    return await GR.tapTurn(act === 'L' ? 'right' : 'left');
  };
  startLevel(0);                                  // flat0：每错必播
  await mismatchTap();
  await mismatchTap();
  const sayA = wrongPlays();                      // → 2
  startLevel(3);                                  // flat3：10s 节流
  lastWrongVoice = Date.now();                    /* flat0 分支不写时间戳，显式进入窗口内 */
  await mismatchTap();
  const sayB = wrongPlays() - 2;                  // 增量 → 0
  startLevel(3);                                  // 同关重发 fresh quiz：miss===2 → force 豁免恰一次
  lastWrongVoice = 0;
  await mismatchTap();                            // miss=1 → 播（窗口早已过）
  await mismatchTap();                            // miss=2 → force 播
  const sayC = wrongPlays() - 2 - sayB;           // 增量 → 2
  KIDS.voice.play = origPlay2;
  const sayWOk = sayA === 2 && sayB === 0 && sayC === 2;
  if (sayWOk) npass++;
  units.sayW = { ok: sayWOk, flat0Plays: sayA, flat3Throttle: sayB, flat3Force: sayC,
    note: '不灰化款 ===2；r13 miss 源=exec 指令错配+plan 错序（错序走方向 queue 单通道）' };

  /* ---- ⑥ 教学链单元：tutorialWatch（watch clip→逐命令演示→重发→turn clip→接力题面 queue） ---- */
  total++;
  const vLog = [];
  const origPlay3 = KIDS.voice.play, origQueue3 = KIDS.voice.queue;
  KIDS.voice.play = function (key) { vLog.push(['p', String(key)]); };
  KIDS.voice.queue = function (parts) { vLog.push(['q', JSON.stringify(parts)]); };
  startLevel(0);                                  // 干净起点（openingSpeak 走 stub 不入 vLog 顺序断言）
  await tutorialWatch();                          // SPEED=0.12 提速：演示很快完成
  const tutHelp = GR.tutorial === 'help' && GR.quiz && GR.quiz.step === 0 &&
    GR.quiz.miss === 0 && GR.currentLevel.retries === 0;   // 重发同关零污染
  await wait(2300);                               // 等 2000ms 接力题面 queue 落地
  const iw = vLog.findIndex(v => v[0] === 'p' && v[1] === 'gri_tut_watch');
  const it = vLog.findIndex(v => v[0] === 'p' && v[1] === 'gri_tut_turn');
  const iq = vLog.findIndex(v => v[0] === 'q' && v[1].indexOf('gri_i_fwd') >= 0);
  const parts = iq >= 0 ? JSON.parse(vLog[iq][1]) : null;
  const q0b = genLevel(0).quizzes[0];             // flat0 qi0 指令（确定性）
  const expParts = [];
  q0b.seq.forEach(cm => cmdClips(cm).forEach(k => expParts.push(k)));
  const partsOk = !!parts && parts.length === expParts.length &&
    expParts.every((k, i) => parts[i] === k);     // 全 clip 拼接（禁 key:null，§0.23）
  const chainOk = tutHelp && iw >= 0 && it >= 0 && iw < it && it < iq && iq >= 0 && partsOk;
  KIDS.voice.play = origPlay3; KIDS.voice.queue = origQueue3;
  startLevel(0);                                  // 还原正常状态（后续单元用）
  if (chainOk) npass++;
  units.tutChain = { ok: chainOk, help: tutHelp, partsOk: partsOk, expParts: expParts,
    seq: vLog.filter(v => String(v[1]).slice(0, 3) === 'gri').slice(0, 4) };

  /* ---- ⑦ UI 冒烟 A：flat0 真实通路通关（首题先错一次 → 1 错=2 星，verify 页不弹层） ---- */
  total++;
  startLevel(0);
  let smokeA = true, wrongOk2 = false, steps = 0;
  for (let s = 0; s < CH_LEN && smokeA; s++) {
    const q = GR.quiz;
    if (!q) { smokeA = false; break; }
    if (s === 0) {                               // 首错：错配晃动零惩罚；首错不 pulse 命令键
      const act = q.seq[q.seqIdx].t;
      const r = await GR.tapTurn(act === 'L' ? 'right' : 'left');
      wrongOk2 = r === 'wrong' && GR.currentLevel.retries === 1 && GR.currentLevel.step === 0 &&
        !cmdEl(act === 'fwd' ? 'fwd' : act).classList.contains('pulse');
    }
    const ok = await solveQuizV();
    if (!ok) smokeA = false;
    steps++;
  }
  const lvA = GR.currentLevel;
  const smokeOkA = smokeA && wrongOk2 && steps === CH_LEN && lvA.done && lvA.won &&
    lvA.retries === 1 && engStars(cur) === 2 && !document.querySelector('.k-celebrate');
  if (smokeOkA) npass++;
  smokes.flat0 = { ok: smokeOkA, wrongOk: wrongOk2, steps: steps, retries: lvA.retries, stars: engStars(cur) };

  /* ---- ⑧ UI 冒烟 B：flat10（ch3）热身 exec+plan 自由规划真实通路通关 3 星 ---- */
  total++;
  startLevel(10);
  let smokeB = true, stepsB = 0;
  for (let s = 0; s < CH_LEN && smokeB; s++) {
    if (!await solveQuizV()) { smokeB = false; break; }
    stepsB++;
  }
  const lvB = GR.currentLevel;
  const smokeOkB = smokeB && stepsB === CH_LEN && lvB.done && lvB.won &&
    lvB.retries === 0 && engStars(cur) === 3;
  if (smokeOkB) npass++;
  smokes.flat10 = { ok: smokeOkB, steps: stepsB, retries: lvB.retries, stars: engStars(cur) };

  /* ---- ⑨ 布局：双 viewport（port 类通道）×（exec1/exec2/plan/maze） ---- */
  async function simView(w, h, port) {
    const g = $id('game');
    document.body.classList.toggle('port', !!port);   // 竖屏类通道（与 @media 逐条等值——M3 三件之一）
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    renderQuiz();                                     // 按新场地尺寸重排
    await wait(750);                                  /* 等入场动画结束再量（§0.11 transform 中途陷阱） */
    const de = document.documentElement;
    const q = GR.quiz;
    const cells = Array.prototype.slice.call(boardEl.querySelectorAll('.cell'));
    const rects = cells.map(c => c.getBoundingClientRect());
    const cellOk = rects.length === 64 && rects.every(r => r.width >= 44 && r.height >= 44);  /* r13：8×8 ≥44 */
    const dirs = Array.prototype.slice.call(padEl.querySelectorAll('.cmdb')).map(b => b.getBoundingClientRect());
    const dirOkL = dirs.length === 4 && dirs.every(r => r.width >= 96 && r.height >= 96);    /* 主答案 ≥96 */
    const uR = undoBtn.getBoundingClientRect();
    const undoOkL = uR.width >= 64 && uR.height >= 64;
    let btnOk = true;                                 // 全部按钮 ≥64（.k-parentbtn 家长按钮豁免）
    document.querySelectorAll('button').forEach(b => {
      if (b.classList.contains('k-parentbtn')) return;
      const r = b.getBoundingClientRect();
      if (r.width > 4 && r.height > 4 && (r.width < 64 || r.height < 64)) btnOk = false;
    });
    const br = wrapEl.getBoundingClientRect();
    const insideOk = rects.every(r => r.left >= br.left - 2 && r.right <= br.right + 2 &&
      r.top >= br.top - 2 && r.bottom <= br.bottom + 2);       // 格不出板（M3 三件之二）
    const badges = boardEl.querySelectorAll('.bnum').length;
    const chestOk = badges === q.chests.length;
    const stoneOk = boardEl.querySelectorAll('.stone').length === q.walls.length;
    const rabR = rabbitEl.getBoundingClientRect();              /* 兔子在场上且真的渲染 */
    const rabOk = rabR.width >= 50 && rabR.height >= 50 && rabbitEl.innerHTML.length > 0;
    const rotOk = /rotate\((0|90|180|270)deg\)/.test(rabbitEl.querySelector('.hwrap').style.transform || '');
    /* M3 三件之三：portStyle 判别锚。真实竖屏视口下 @media 恒 column（类通道只能加竖不能减），
       故非 port 模拟的期望并集真实视口朝向；类通道的判别力由横屏真视口轮的 port 模拟承担 */
    const realPort = window.innerHeight > window.innerWidth;
    const portStyle = getComputedStyle($id('play-row')).flexDirection ===
      ((port || realPort) ? 'column' : 'row');
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    document.body.classList.remove('port');
    return { vp: w + 'x' + h + (port ? 'P' : ''), kind: q.kind, cellOk: cellOk, dir96: dirOkL,
      undo64: undoOkL, btn64: btnOk, insideOk: insideOk, chest: chestOk, stone: stoneOk,
      rab: rabOk, rot: rotOk, portStyle: portStyle, ox: ox,
      pass: cellOk && dirOkL && undoOkL && btnOk && insideOk && chestOk && stoneOk &&
            rabOk && rotOk && portStyle && ox <= 0 };
  }
  total++;
  const sims = [];
  startLevel(0);                                  // exec1
  sims.push(await simView(1280, 800, false)); sims.push(await simView(800, 1180, true));
  startLevel(6);                                  // exec2（qi0 热身答对 → qi1）
  await solveQuizV();
  sims.push(await simView(1280, 800, false)); sims.push(await simView(800, 1180, true));
  startLevel(10);                                 // plan（qi0 热身答对 → qi1）
  await solveQuizV();
  sims.push(await simView(1280, 800, false)); sims.push(await simView(800, 1180, true));
  startLevel(15);                                 // maze（qi0 热身答对 → qi1）
  await solveQuizV();
  sims.push(await simView(1280, 800, false)); sims.push(await simView(800, 1180, true));
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);                                  // 还原真实 viewport 布局
  const layoutOk = sims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims };

  /* ---- ⑩ 分布与专项：文案对账 / clips 注入 / 开场链 / 覆盖 / bump 双类 ---- */
  total++;
  /* VOICE 独立字面量对账（watch/turn/wrong=既有键一字不改 + hint=r13 新键；manifest 严格一致） */
  const voiceOk = VOICE.watch.key === 'gri_tut_watch' && VOICE.watch.text === '看！宝藏在格子里' &&
    VOICE.turn.key === 'gri_tut_turn' && VOICE.turn.text === '你来找一找' &&
    VOICE.hint.key === 'gri_i_hint' && VOICE.hint.text === '听一听，想好再走' &&
    VOICE.wrong.key === 'gri_wrong' && VOICE.wrong.text === '再想一想，听一听';
  /* gri_* 26 条 clips 注入对账（既有 17+r13 新 9；build 注入后 KIDS.voice.clips 应含全部） */
  const GRI_KEYS = ['gri_tut_watch', 'gri_tut_turn', 'gri_hint', 'gri_wrong',
    'gri_q1', 'gri_q2', 'gri_q3', 'gri_go',
    'gri_n_1', 'gri_n_2', 'gri_n_3', 'gri_n_4', 'gri_n_5',
    'gri_d_up', 'gri_d_down', 'gri_d_left', 'gri_d_right',
    'gri_i_fwd', 'gri_i_ge', 'gri_i_left', 'gri_i_right', 'gri_i_take',
    'gri_i_order', 'gri_i_next', 'gri_i_box', 'gri_i_hint'];
  const clipOk = GRI_KEYS.every(k => !!KIDS.voice.clips[k]) &&
    Object.keys(KIDS.voice.clips).filter(k => k.indexOf('gri_') === 0).length === 26;
  /* 开场顺序链（stub 记录）：play(gri_i_hint) 后 OPEN_RELAY 3000ms 接力指令句 queue（全 clip） */
  const origP = KIDS.voice.play, origQ = KIDS.voice.queue;
  const playLog = [], queueLog = [];
  KIDS.voice.play = function (key) { playLog.push(String(key)); };
  KIDS.voice.queue = function (parts) { queueLog.push(parts); };
  startLevel(0);
  const openHint = playLog.indexOf('gri_i_hint') >= 0;
  await wait(3400);                               // 等 3000ms 接力 queue 落地
  const q0c = genLevel(0).quizzes[0];             // flat0 qi0 指令（确定性）
  const expOpen = [];
  q0c.seq.forEach(cm => cmdClips(cm).forEach(k => expOpen.push(k)));
  const qParts = queueLog.find(p => p[0] === 'gri_i_fwd');
  const openQ = !!qParts && qParts.length === expOpen.length &&
    expOpen.every((k, i) => qParts[i] === k);     /* 全 clip 拼接（禁 key:null） */
  KIDS.voice.play = origP; KIDS.voice.queue = origQ;
  const distOk = voiceOk && clipOk && openHint && openQ &&
    genDch[1] >= 1 && genDch[2] >= 1 && genDch[3] >= 1 && genDch[4] >= 1 &&  /* 生成关随机章全覆盖 */
    bumpEdgeN >= 1 && bumpWallN >= 1;             /* 出界/撞墙两类 bump 均实测 */
  if (distOk) npass++;
  units.dist = { ok: distOk, voice: voiceOk, clips: clipOk, openHint: openHint, openQ: openQ,
    genDch: genDch, bumpEdge: bumpEdgeN, bumpWall: bumpWallN };

  /* ---- ⑪ duration（r13 门禁）：40 关 modeled ≥40000+逐关对账+每步 DECIDE≥voiceWin ---- */
  total++;
  const estMsV = s => s.length * 345 + 600;       // b25 定版：SAPI ~345ms/字+600（全字符口径）
  const V_DECIDE = { exec1: 7000, exec2: 8500, plan: 9000, maze: 10000 };   /* 独立副本常量（禁引引擎） */
  const V_ADV = 600, V_MIN = 40000, V_CHEST = 950, V_ENTER = 400, V_STAGE = 400;
  const vVoice = (q, k) => k === 0
    ? (V_ENTER + estMsV(q.kind.slice(0, 4) === 'exec' ? sentenceV(q) : '按顺序拿到宝箱') + 300)
    : V_STAGE;
  const vDur = L => L.quizzes.reduce((s, q) => {
    const na = q.seq.reduce((x, cm) => x + (cm.t === 'fwd' ? cm.n : 1), 0);
    let d = V_CHEST;
    for (let k = 0; k < na; k++) d += Math.max(vVoice(q, k), V_DECIDE[q.kind]) + V_ADV;
    return s + d;
  }, 0);
  let dMin = Infinity, dFlat = -1, parityOk = true, voiceOkD = true;
  for (let flat = 0; flat < 40; flat++) {
    const L = genLevel(flat);
    const d = vDur(L);
    if (d < dMin) { dMin = d; dFlat = flat; }
    if (levelDurMs(L) !== d) parityOk = false;             // 独立副本与源模型逐关对账
    for (const q of L.quizzes) {
      const na = q.seq.reduce((x, cm) => x + (cm.t === 'fwd' ? cm.n : 1), 0);
      for (let k = 0; k < na; k++)
        if (V_DECIDE[q.kind] < vVoice(q, k)) voiceOkD = false;   // 逐步：决策 ≥ 语音窗（认知主体）
    }
  }
  const durUnitOk = dMin >= V_MIN && parityOk && voiceOkD && dMin === 126350;   /* 防回漂：40 关 modeled 最低=126350（SPEC §3 r13 验算） */
  if (durUnitOk) npass++;
  units.duration = { ok: durUnitOk, minMs: dMin, minFlat: dFlat, want: V_MIN,
    parity: parityOk, voiceNeverDominates: voiceOkD,
    decide: V_DECIDE, adv: V_ADV };

  /* ---- ⑫ 源码断言：script[2]（data+engine+main）r13 字面（b36 M1① 判别力恢复） ---- */
  total++;
  const src2 = document.querySelectorAll('script')[2] ? document.querySelectorAll('script')[2].textContent : '';
  const src0 = document.querySelectorAll('script')[0] ? document.querySelectorAll('script')[0].textContent : '';
  const srcOk = src2.indexOf('const estMs = s => s.length * 345 + 600') >= 0 &&
    src2.indexOf('const DECIDE_MS = { exec1: 7000, exec2: 8500, plan: 9000, maze: 10000 }') >= 0 &&
    src2.indexOf('const LEVEL_MIN_MS = 40000') >= 0 &&
    src2.indexOf('const GRID_N = 8') >= 0 &&
    src2.indexOf('const OPEN_RELAY_MS = 3000') >= 0 &&
    src2.indexOf('const CAP_EXEC1 = 14, CAP_EXEC2 = 20') >= 0 &&
    src2.indexOf('const TURN_L = { N: ') >= 0 &&
    src2.indexOf('GEN_HINTS[genLevel(f + 1).dch - 1]') >= 0 &&
    src2.indexOf('CHAPTERS[(ci + 1) % 4]') < 0 &&          /* 家族 F：禁章序取模推进 */
    src2.indexOf('GEN_HINTS[(ci + 1) % 4]') < 0 &&
    src0.indexOf('settle()') >= 0 &&                       /* script[0]=core 源锚 */
    src2.indexOf('runVerify') < 0;                         /* script[2] 纯游戏逻辑（b37 R4 对称） */
  if (srcOk) npass++;
  units.srcLit = { ok: srcOk };

  const out = { game: 'grid', total: total, pass: npass, layoutOk: layoutOk,
    levels: levels, gen: gen, units: units, smokes: smokes };
  $id('verify-result').textContent = JSON.stringify(out);
  window.__grVlog = out;                          /* 外部断言挂点（selftest/Python verify） */
  document.title = (npass === total && layoutOk) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL';
}

/* ---- verify 内部驱动辅助（UI 层：走完当前一题——exec=按指令条；plan=现算参考解逐段） ---- */
async function solveQuizV() {
  const run = cur.step;
  let guard = 0;
  while (cur && !cur.done && cur.step === run && guard++ < 160) {
    const q = cur.quizzes[cur.step];
    let c;
    if (q.kind === 'exec1' || q.kind === 'exec2') {
      const act = q.seq[q._si];
      if (!act) break;
      c = act.t;
    } else {
      const p = engPlanRef({ fr: q._pr, fc: q._pc, h0: q._h,
        chests: q.chests.slice(q._col), walls: q.walls });
      if (!p || !p.length) break;
      c = p[0].t;
    }
    const r = await uiCmd(c);
    if (r === false || r === null) break;
  }
  return cur.step > run || cur.done;
}
async function walkToV(cell) {                    // plan 期走到指定格（现算参考解逐步驱动）
  let guard = 0;
  while (guard++ < 160) {
    const q = cur.quizzes[cur.step];
    if (q._pr === cell.r && q._pc === cell.c) return true;
    const p = engPlanRef({ fr: q._pr, fc: q._pc, h0: q._h, chests: [{ r: cell.r, c: cell.c }],
                           walls: q.walls });
    if (!p || !p.length) return false;
    const r = await uiCmd(p[0].t);
    if (r === false || r === null) return false;
  }
  return false;
}
function findFreeCellV(q) {                       // 找一个非箱非墙非当前位置的自由格（④ nope 用；
  for (let r = 1; r <= 8; r++) for (let c = 1; c <= 8; c++) {   // q=GR.quiz getter 契约字段 pos/walls）
    if (r === q.pos.r && c === q.pos.c) continue;
    if (q.chests.some(ch => ch.r === r && ch.c === c)) continue;
    if (q.walls.some(w => w.r === r && w.c === c)) continue;
    const d = bfsV(q.pos.r, q.pos.c, [r, c], q.walls);
    if (d >= 1) return { r: r, c: c };
  }
  return null;
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
