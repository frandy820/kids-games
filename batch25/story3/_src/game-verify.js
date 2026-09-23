/* ================= ?verify=1 自检（仅 verify 分支加载执行）——r34 难度谱版
   ① 静态 20 + 生成 20 关全量审计（flat 0-39）：确定性 / 章型规则（structWhy 全
     null）/ 章号映射 / 引擎直驱（逐槽点正确帧→right；why 题先答傻选项=wrong 不推
     step、再答真因果→right/末题 done→全关 3 星）
   ② 封闭集独立对账（SPEC_STORIES+SPEC_FRAMES 帧数表从 SPEC-R34 §R2 文字独立重列）：
     故事 ∈ 封闭 12 / 章池 / 自有帧=0..N-1 置换且自有子列非恒等 / dch≥2 恰 1 干扰帧
     （pos=-1、源故事≠本题、帧号<源 N、id 互异）/ why 开关律（dch3/4 且恰 qi1/qi3；
     dch1/2 全零）/ opts=['a','b'] 置换 / 相邻题互异 / **flat0 谱=baseline 逐字节锚**
   ③ 故事库完整性：12 故事帧数=表值 / s 句数=N 且互异 4-12 字 / art 互异≥150 字 /
     why{q0,a,b} 三字段互异非空 / 复述逐字拼装（连接词按 N）+ recapKeyOf 键律
   ④ 槽位状态机（flat0 v1 语义保持：错点 miss+1 不清已对、已放帧 null、对点推进、
     新题干净）+ 干扰帧引擎单元（flat5：pos=-1 点=wrong+miss+不放置）+ why 引擎单元
     （flat10 qi1：末槽 right 不推 step；傻选项 wrong 不推；真因果 right 推 step）
   ⑤ 去泄序反馈（r34 维度二）：自有帧错点→vlog sto_hint；**全 vlog 无 sto_w_first/
     sto_w_mid**（反断言）；干扰帧错点→sto_w_out（⑰ 细化）
   ⑥ ch3 时间线时间词：TIME_HINT 含 先/再/最后
   ⑦ 教学链：tutorialWatch 真实走完（stub 存档）→ __stDemoR==='right' 且 tut='help'，
     watch 折算真实时长 ≤16s；flat0 题0 自有帧呈现非恒等（乱序锚点）
   ⑧ 吞输入轻叮+可见回应：demo/locked 门拦钩子输入 + 帧卡排容器 bump（家族 D）
   ⑨ UI 冒烟 A：flat0 autoSolve 通关（taps=15=5 故事×3 帧，恒 3 星，verify 页不弹层）
   ⑩ UI 冒烟 B：flat10（dch3 5 帧+why×2）先点 1 次错帧再 autoSolve（taps=27=
     25 帧+2 why；miss=1 → 2 星）
   ⑪ 复述句触发（flat5 dch2 4 帧格式）：vlog recap=recapOf 逐字（含 接着 连接词）
     + recapKey=sto_recap4_* + 其后紧跟 sto_right + 已切下一题
   ⑫ 布局：双 viewport ×（flat0 ch1 3 卡 / flat12 dch3 5 槽 6 卡两行）+ why 面板
     （flat10 进 qi1：选项卡 2 张 ≥96×96）：帧卡 ≥96×96、槽位 ≥64×64、
     overflowX ≤0、描边对底色对比度 ≥3:1
   ⑬ clips：旧 23 + r34 新 23 全注入（主线注册后 n=46）
   ⑭ 星级规则：0 错=3★ / 1-2 错=2★ / ≥3 错=1★（永不 0 星）
   ⑮ 章末预告 C7 关键词断言（CHAPTERS[i].hint ↔ 下一章特征；GEN_HINTS[k] ↔ dch=k+1）
   ⑯ verify 提速断言：SPEED=0.12
   ⑰ 干扰帧 UI 专项（flat5）：在场/错点 wrong+miss+不放置+不清已对/sto_w_out 反馈/
     救援 correctIdx 永不指认干扰帧（引擎层 40 关扫描）
   ⑱ 因果问句 UI 专项（flat10 qi1）：面板 2 张文字选项卡（文本=why.a/why.b 集合）/
     错选=wrong+miss+step 不推+sto_why_w/对选=step 推进+sto_why_right/槽1 why-first
     pulse 存在/dch1-2 零 why（引擎层 40 关扫描）
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;
  const lastOf = k => { for (let i = VLOG.length - 1; i >= 0; i--) if (VLOG[i].k === k) return VLOG[i]; return null; };
  const countKey = k => VLOG.filter(v => v.k === k).length;
  /* play 捕获（sayR/sayW/speakQuiz/speakWhy 通道；recap play 在 verify 页被 !VERIFY
     门拦——键走 vlog('recapKey') 记录，SPEC §R8⑪） */
  const PKS = [];
  const opk = KIDS.voice.play.bind(KIDS.voice);
  KIDS.voice.play = (k, t) => { PKS.push(String(k)); return opk(k, t); };

  /* SPEC-R34 §R2/§R10-B 文字独立重列（禁抄页面 STORY_LIB）：12 故事 × 章归属 × 帧数 */
  const SPEC_STORIES = { wake: 1, meal: 1, laundry: 1, night: 1,
                         seed: 2, cate: 2, rain: 2, chick: 2,
                         sunwalk: 3, bird: 3, meals: 3, shadow: 3 };
  const SPEC_FRAMES = { wake: 3, meal: 3, laundry: 3, night: 3,
                        seed: 4, cate: 4, rain: 4, chick: 4,
                        sunwalk: 5, bird: 5, meals: 5, shadow: 5 };
  /* flat0 谱=改造前 baseline 逐字节锚（r34-baseline.json；教学链/驱动兼容实证） */
  const FLAT0_ANCHOR = [['wake', [1, 2, 0]], ['meal', [2, 0, 1]], ['night', [2, 0, 1]],
                        ['laundry', [1, 2, 0]], ['night', [2, 0, 1]]];
  const SPEC_WHY_QI = [1, 3];                    /* dch3/4 因果问句触发位（固定谱） */

  /* ---- ① 40 关全量审计（flat 0-39） ---- */
  const dchSeen = {};
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
                                       : (L1.dch >= 1 && L1.dch <= 4);
    /* 引擎直驱：逐槽点正确帧 → 'right'；why 题：先点傻选项='wrong'（step 不推），
       再点真因果='right'/末题='done'；全关零错=3 星 */
    const L3 = genLevel(flat);
    let driveOk = true;
    for (let k = 0; k < L3.quizzes.length && driveOk; k++) {
      const q = L3.quizzes[k];
      const nF = SPEC_FRAMES[q.story];
      for (let s = 0; s < nF && driveOk; s++) {
        const i = correctIdx(q);
        const isFinalNoWhy = (k === L3.quizzes.length - 1 && s === nF - 1 && !q.why);
        const r = engTapFrame(L3, i);
        if (r !== (isFinalNoWhy ? 'done' : 'right') || q._miss !== 0) { driveOk = false; break; }
      }
      if (!driveOk) break;
      if (!q._answered) { driveOk = false; break; }
      if (q.why) {
        const good = q.why.opts.indexOf('a');            /* ①全对驱动直答真因果（零 miss=3★）；
                                                           傻选项 wrong 路径=④e13/⑱ 实体断言 */
        const exp = (k === L3.quizzes.length - 1) ? 'done' : 'right';
        const rw = engTapWhy(L3, good);
        if (rw !== exp || q._miss !== 0) { driveOk = false; break; }
      }
    }
    const solvedAll = L3.done && L3.step === CH_LEN && L3.retries === 0 && engStars(L3) === 3;
    dchSeen[L1.dch + ''] = (dchSeen[L1.dch + ''] || 0) + 1;
    const ok = det && ruleOk && chOk && dchOk && driveOk && solvedAll;
    if (ok) npass++;
    const rec1 = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, ruleOk: ruleOk, chOk: chOk, dchOk: dchOk,
                   driveOk: driveOk, solvedAll: solvedAll,
                   stories: L1.quizzes.map(q => q.story),
                   order: L1.quizzes.map(q => q.frames.map(f => f.pos).join('|')) };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec1;
    else gen[flat] = rec1;
  }
  total++;
  const distOk = dchSeen['1'] > 0 && dchSeen['2'] > 0 && dchSeen['3'] > 0 && dchSeen['4'] > 0;
  if (distOk) npass++;
  units.dist = { ok: distOk, dchSeen: dchSeen };

  /* ---- ② 封闭集独立对账（SPEC_STORIES/SPEC_FRAMES/SPEC_WHY_QI 独立重列 × 40 关全题） ---- */
  total++;
  let tableOk = true, badCase = null;
  outer:
  for (let flat = 0; flat < 40; flat++) {
    const L = genLevel(flat);
    for (let k = 0; k < L.quizzes.length; k++) {
      const q = L.quizzes[k];
      if (!(q.story in SPEC_STORIES)) { badCase = 'story ' + flat + '/' + k; tableOk = false; break outer; }
      if (L.dch !== 4 && SPEC_STORIES[q.story] !== L.dch) { badCase = 'chPool ' + flat + '/' + k; tableOk = false; break outer; }
      const N = SPEC_FRAMES[q.story];
      const own = q.frames.filter(f => f.pos >= 0);
      const dis = q.frames.filter(f => f.pos === -1);
      if (q.frames.length !== N + (L.dch >= 2 ? 1 : 0) || own.length !== N) { badCase = 'len ' + flat + '/' + k; tableOk = false; break outer; }
      if (dis.length !== (L.dch >= 2 ? 1 : 0)) { badCase = 'distractN ' + flat + '/' + k; tableOk = false; break outer; }
      const seq = own.map(f => f.pos);
      if (seq.slice().sort().join() !== Array.from({ length: N }, (_, j) => j).join()) { badCase = 'perm ' + flat + '/' + k; tableOk = false; break outer; }
      if (seq.every((v, j) => v === j)) { badCase = 'identity ' + flat + '/' + k; tableOk = false; break outer; }
      for (const f of own) {
        if (f.id !== q.story + '-f' + f.pos) { badCase = 'id ' + flat + '/' + k; tableOk = false; break outer; }
      }
      if (dis.length === 1) {
        const m = /^(.*)-f(\d+)$/.exec(dis[0].id);
        if (!m || m[1] === q.story || !(m[1] in SPEC_STORIES) || +m[2] >= SPEC_FRAMES[m[1]]) { badCase = 'distractSrc ' + flat + '/' + k; tableOk = false; break outer; }
        if (new Set(q.frames.map(f => f.id)).size !== q.frames.length) { badCase = 'idDup ' + flat + '/' + k; tableOk = false; break outer; }
      }
      /* why 开关律：dch3/4 恰 qi∈{1,3}；dch1/2 全零 */
      const wantWhy = (L.dch === 3 || L.dch === 4) && SPEC_WHY_QI.indexOf(k) >= 0;
      if (wantWhy !== !!q.why) { badCase = 'whyFlag ' + flat + '/' + k; tableOk = false; break outer; }
      if (q.why && (q.why.opts.length !== 2 || q.why.opts.slice().sort().join() !== 'a,b' || q.why.done)) { badCase = 'whyOpts ' + flat + '/' + k; tableOk = false; break outer; }
      if (k > 0 && L.quizzes[k - 1].story === q.story) { badCase = 'adjacent ' + flat + '/' + k; tableOk = false; break outer; }
    }
    /* flat0 谱=baseline 逐字节锚（教学链兼容实证） */
    if (flat === 0) {
      const got = L.quizzes.map(q => [q.story, q.frames.map(f => f.pos)]);
      if (JSON.stringify(got) !== JSON.stringify(FLAT0_ANCHOR)) { badCase = 'flat0Anchor'; tableOk = false; }
    }
  }
  if (tableOk) npass++;
  units.table = { ok: tableOk, bad: badCase };

  /* ---- ③ 故事库完整性（帧数表对账；why 文案；复述逐字拼装+键律） ---- */
  total++;
  const libIds = Object.keys(STORY_LIB).sort();
  const specIds = Object.keys(SPEC_STORIES).sort();
  let libOk = libIds.length >= 12 && libIds.join() === specIds.join();
  let libBad = '';
  const libDetail = {};
  if (libOk) {
    for (const id of libIds) {
      const st = STORY_LIB[id];
      const N = SPEC_FRAMES[id];
      if (SPEC_STORIES[id] !== st.ch) { libOk = false; libBad = 'ch ' + id; break; }
      if (st.s.length !== N || st.art.length !== N) { libOk = false; libBad = 'len ' + id; break; }
      if (new Set(st.s).size !== N || st.s.some(x => x.length < 4 || x.length > 12)) { libOk = false; libBad = 'sent ' + id; break; }
      for (let a = 0; a < N; a++) for (let b = a + 1; b < N; b++) {
        if (st.art[a] === st.art[b]) { libOk = false; libBad = 'artDup ' + id; break; }
      }
      if (!libOk) break;
      if (st.art.some(a => a.length < 150)) { libOk = false; libBad = 'artTiny ' + id; break; }
      const w = st.why;
      if (!w || !w.q0 || !w.a || !w.b || w.a === w.b || w.q0 === w.a ||
          [w.q0, w.a, w.b].some(x => typeof x !== 'string' || x.length < 3 || x.length > 10)) { libOk = false; libBad = 'why ' + id; break; }
      const rc = recapOf(id);
      const conn = { 3: ['先', '然后', '最后'], 4: ['先', '然后', '接着', '最后'],
                     5: ['先', '然后', '再', '接着', '最后'] }[N];
      const want = st.s.map((t, j) => conn[j] + t).join('，');
      if (rc !== want || rc.slice(0, 1) !== '先' || rc.indexOf('，最后' + st.s[N - 1]) < 0) { libOk = false; libBad = 'recap ' + id; break; }
      const rk = recapKeyOf(id);
      if (rk !== (N === 3 ? 'sto_recap_' + id : 'sto_recap' + N + '_' + id)) { libOk = false; libBad = 'recapKey ' + id; break; }
      libDetail[id] = { n: st.n, ch: st.ch, frames: N };
    }
  }
  if (libOk) npass++;
  units.library = { ok: libOk, bad: libBad, n: libIds.length, stories: libDetail };

  /* ---- ④ 槽位状态机（flat0 v1 语义 + flat5 干扰帧引擎 + flat10 why 引擎） ---- */
  total++;
  const L4 = genLevel(0);
  const q4 = L4.quizzes[0];
  const w1 = q4.frames.findIndex(f => f.pos !== 0);
  const e1 = engTapFrame(L4, w1) === 'wrong' && q4._miss === 1 && L4.retries === 1 && q4.slot === 0 &&
             !q4.frames.some(f => f.placed);
  const c0 = q4.frames.findIndex(f => f.pos === 0);
  const e2 = engTapFrame(L4, c0) === 'right' && q4.frames[c0].placed === true && q4.slot === 1 && !q4._answered;
  const e3 = engTapFrame(L4, c0) === null;                        // 已放置帧再点=null
  const w2 = q4.frames.findIndex(f => !f.placed && f.pos !== 1);
  const e4 = engTapFrame(L4, w2) === 'wrong' && q4._miss === 2 && q4.slot === 1 &&
             q4.frames[c0].placed === true;                        // 错点不清已对
  const e5 = engTapFrame(L4, q4.frames.findIndex(f => !f.placed && f.pos === 1)) === 'right' && q4.slot === 2;
  const e6 = engTapFrame(L4, q4.frames.findIndex(f => !f.placed && f.pos === 2)) === 'right' &&
             q4.slot === 3 && q4._answered === true && L4.step === 1 && !q4.why;
  const q4b = L4.quizzes[1];
  const e7 = q4b.slot === 0 && q4b._miss === 0 && !q4b._answered && !q4b.frames.some(f => f.placed) &&
             q4b.story !== q4.story;                               // 新题初始干净
  /* 干扰帧引擎（flat5 dch2 qi0） */
  const L5e = genLevel(5);
  const q5e = L5e.quizzes[0];
  const di = q5e.frames.findIndex(f => f.pos === -1);
  const e8 = di >= 0 && q5e.frames.length === SPEC_FRAMES[q5e.story] + 1;
  const e9 = engTapFrame(L5e, di) === 'wrong' && q5e._miss === 1 && q5e.slot === 0 &&
             !q5e.frames.some(f => f.placed) && q5e.frames[di].placed === false;
  /* why 引擎（flat10 dch3 qi0 无 why 直接推 / qi1 有 why 收尾推） */
  const L10e = genLevel(10);
  const q10a = L10e.quizzes[0], q10b = L10e.quizzes[1];
  let e10b = !q10a.why && !!q10b.why;
  for (let s = 0; s < SPEC_FRAMES[q10a.story]; s++) engTapFrame(L10e, correctIdx(q10a));
  const e11 = q10a._answered && L10e.step === 1;                  /* qi0 无 why：完成即推 step */
  e10b = e10b && e11;
  for (let s = 0; s < SPEC_FRAMES[q10b.story]; s++) engTapFrame(L10e, correctIdx(q10b));
  const e12 = q10b._answered && L10e.step === 1;                  /* qi1 有 why：完成不推 step */
  const badI = q10b.why.opts.indexOf('b');
  const e13 = engTapWhy(L10e, badI) === 'wrong' && L10e.step === 1 && q10b._miss === 1;
  const goodI = q10b.why.opts.indexOf('a');
  const e14 = engTapWhy(L10e, goodI) === 'right' && L10e.step === 2 && q10b.why.done;
  const smOk = e1 && e2 && e3 && e4 && e5 && e6 && e7 && e8 && e9 && e10b && e12 && e13 && e14;
  if (smOk) npass++;
  units.slotMachine = { ok: smOk, wrong: e1, right: e2, placedNull: e3, wrongKeeps: e4, done: e6,
                        fresh: e7, distract: e8 && e9, whyNoAdvance: e12, whyWrong: e13, whyRight: e14 };

  /* ---- ⑤ 去泄序反馈（自有帧错点=sto_hint；全 vlog 无 wFirst/wMid 反断言） ---- */
  total++;
  startLevel(1);
  const q5 = ST.quiz;
  const wA = q5.frames.findIndex(f => f.pos !== 0);
  const rA = await ST.tapFrame(wA);
  const fA = rA === 'wrong' && ST.quiz.miss === 1 && ST.quiz.slot === 0 &&
            lastOf('sto_hint') !== null;
  const noLeak = VLOG.every(v => v.k !== 'sto_w_first' && v.k !== 'sto_w_mid');   /* r29 反断言：退休键零出现 */
  const fbOk = fA && noLeak;
  if (fbOk) npass++;
  units.fbNonLeak = { ok: fbOk, hintOnWrong: fA, noRetiredKeys: noLeak };

  /* ---- ⑥ ch3 时间线时间词点名（先/再/最后 在反馈 TTS 文案中） ---- */
  total++;
  const tOk = TIME_HINT.indexOf('先') >= 0 && TIME_HINT.indexOf('再') >= 0 && TIME_HINT.indexOf('最后') >= 0;
  if (tOk) npass++;
  units.time3 = { ok: tOk, text: TIME_HINT };

  /* ---- ⑦ 教学链：tutorialWatch 真实走完（演示排完一个故事）→ __stDemoR='right' ---- */
  total++;
  KIDS._save = function () { return { levels: {} }; };       // verify 页存档 stub
  KIDS.store.persist = function () {};
  startLevel(0);
  const anchorOrder = cur.quizzes[0].frames.map(f => f.pos).join('');
  const t0 = Date.now();
  await tutorialWatch();
  const tw = (Date.now() - t0) / SPEED;                      // 折算真实页时长
  const tutOk = window.__stDemoR === 'right' && state.tut === 'help' &&
                cur.flat === 0 && cur.quizzes[0].frames.every(f => !f.placed) &&
                !(anchorOrder === '012') && tw <= 16000;
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, demoR: window.__stDemoR, tut: state.tut, watchMs: Math.round(tw), order: anchorOrder };

  /* ---- ⑧ 吞输入轻叮+可见回应：demo/locked 门拦钩子输入 + 帧卡排容器 bump ---- */
  total++;
  startLevel(0);
  state.demo = true; state.locked = true;                    // 模拟教学"看"演示期
  const swallow1 = (await ST.tapFrame(0)) === false && boardEl.classList.contains('bump');
  state.demo = false; state.locked = true;                   // 演出窗口（locked）
  const swallow2 = (await ST.tapFrame(0)) === false;
  state.locked = false;                                      // 还原
  const swallowOk = swallow1 && swallow2 && ST.quiz.step === 0 && ST.quiz.slot === 0 && ST.quiz.miss === 0;
  if (swallowOk) npass++;
  units.swallow = { ok: swallowOk, demo: swallow1, locked: swallow2 };

  /* ---- ⑨ UI 冒烟 A：flat0 autoSolve 通关（5 故事×3 帧 taps=15，恒 3 星） ---- */
  total++;
  startLevel(0);
  const a0 = await ST.autoSolve();
  const lv0 = ST.currentLevel;
  const smokeA = a0.done && a0.taps === 15 && lv0.done && lv0.won &&
                 engStars(cur) === 3 && !document.querySelector('.k-celebrate');
  if (smokeA) npass++;
  smokes.flat0 = { ok: smokeA, taps: a0.taps, stars: engStars(cur) };

  /* ---- ⑩ UI 冒烟 B：flat10（dch3 5 帧+why×2）先点 1 次错帧再 autoSolve（1 错=2 星） ---- */
  total++;
  startLevel(10);
  const q10 = ST.quiz;
  const wrongC = q10.frames.findIndex(f => f.pos !== 0);
  const r10 = await ST.tapFrame(wrongC);
  const a10 = await ST.autoSolve();
  const lv10 = ST.currentLevel;
  const smokeB = r10 === 'wrong' && a10.done && a10.taps === 27 && lv10.done && lv10.won &&
                 lv10.miss === 1 && engStars(cur) === 2;
  if (smokeB) npass++;
  smokes.flat10 = { ok: smokeB, r10: r10, taps: a10.taps, miss: lv10.miss, stars: engStars(cur) };

  /* ---- ⑪ 复述句触发（flat5 dch2 4 帧格式：先/然后/接着/最后 + 键 sto_recap4_*） ---- */
  total++;
  startLevel(5);
  const q11 = ST.quiz;
  const story11 = q11.story;
  const recapWant = recapOf(story11);
  const N11 = SPEC_FRAMES[story11];
  const beforeRecap = countKey('recap');
  for (let s = 0; s < N11; s++) {
    const qq = ST.quiz;
    const i = qq.frames.findIndex(f => !f.placed && f.pos === qq.slot);
    await ST.tapFrame(i);
  }
  const recapEntry = lastOf('recap');
  const recIdx = VLOG.lastIndexOf(recapEntry);
  const afterRight = recIdx >= 0 && VLOG[recIdx + 1] && VLOG[recIdx + 1].k === 'recapKey' &&
                     VLOG[recIdx + 2] && VLOG[recIdx + 2].k === 'sto_right';   /* 家族 H 窗序：recap→recapKey→right→下一题 */
  const recapOk = countKey('recap') === beforeRecap + 1 && recapEntry !== null &&
                  recapEntry.t === recapWant &&
                  recapEntry.t.slice(0, 1) === '先' &&
                  recapEntry.t.indexOf('，然后') > 0 && recapEntry.t.indexOf('，最后') > 0 &&
                  (N11 >= 4 ? recapEntry.t.indexOf('，接着') > 0 : true) &&
                  (N11 === 5 ? recapEntry.t.indexOf('，再') > 0 : true) &&
                  lastOf('recapKey') !== null && lastOf('recapKey').t === recapKeyOf(story11) &&
                  afterRight && ST.quiz && ST.quiz.story !== story11;      // 已切下一题
  if (recapOk) npass++;
  units.recap = { ok: recapOk, story: story11, n: N11, text: recapWant, key: recapKeyOf(story11), rightAfter: afterRight };

  /* ---- ⑫ 布局：双 viewport ×（flat0 ch1 / flat12 dch3 5 槽 6 卡）+ why 面板 ---- */
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
    const slots = Array.prototype.map.call(sceneEl.querySelectorAll('.slot'), b => ({
      w: b.offsetWidth, h: b.offsetHeight }));
    const nWant = g._simFlat === 12 ? 6 : 3;                 /* flat12=dch3：6 卡（5 自有+1 干扰） */
    const hitOk = cards.length === nWant && cards.every(b => b.w >= 96 && b.h >= 96);
    const slotOk = slots.length === (g._simFlat === 12 ? 5 : 3) && slots.every(b => b.w >= 64 && b.h >= 64);
    const cB = ratioOf('#4A3B2E', '#FBF6EC') >= 3 &&
               ratioOf(cssToHex(getComputedStyle(boardEl.querySelector('.card')).borderLeftColor), '#FFF9EE') >= 3;
    const cS = ratioOf(cssToHex(getComputedStyle(sceneEl).borderLeftColor), '#FBF6EC') >= 3;
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, cards: cards.length, hitOk: hitOk, slotOk: slotOk,
             contrast: cB && cS, ox: ox, pass: hitOk && slotOk && cB && cS && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const flat of [0, 12]) {
    $id('game')._simFlat = flat;
    sims.push(simView(1280, 800));
    sims.push(simView(800, 1180));
  }
  /* why 面板（flat10 推进至 qi1 完成：2 张选项卡 ≥96、5 槽 ≥64） */
  $id('game')._simFlat = 10;
  const whySims = [];
  for (const vp of [[1280, 800], [800, 1180]]) {
    const g = $id('game');
    g.style.width = vp[0] + 'px';
    g.style.height = vp[1] + 'px';
    startLevel(10);
    for (let qi = 0; qi <= 1; qi++) {                        /* 排完 qi0+qi1 两故事 → why 面板 */
      const q = cur.quizzes[cur.step];
      for (let s = 0; s < SPEC_FRAMES[q.story]; s++) {
        const qq = cur.quizzes[cur.step];
        const i = qq.frames.findIndex(f => !f.placed && f.pos === qq.slot);
        await ST.tapFrame(i);
      }
    }
    const opts = Array.prototype.map.call(boardEl.querySelectorAll('.optcard'), b => ({
      w: b.offsetWidth, h: b.offsetHeight, t: b.textContent }));
    const slots = sceneEl.querySelectorAll('.slot').length;
    const pulse = !!sceneEl.querySelector('.slot[data-k="0"].why-first');
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    whySims.push({ vp: vp.join('x'), n: opts.length, ok: opts.length === 2 &&
      opts.every(b => b.w >= 96 && b.h >= 96) && slots === 5 && pulse && ox <= 0, texts: opts.map(o => o.t) });
  }
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);                                            // 还原真实 viewport 布局
  const layoutOk = sims.every(s => s.pass) && whySims.every(s => s.ok);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims, whySims: whySims };

  /* ---- ⑬ clips：旧 23 + r34 新 23 = 46 全注入（主线注册后；旧已扩帧 8 键零调用保留注入，t46ok 13 前缀锚含旧 12） ---- */
  total++;
  const keys = Object.keys(KIDS.voice.clips);
  const need = ['sto_tut_watch', 'sto_tut_turn', 'sto_hint', 'sto_right', 'sto_w_first', 'sto_w_mid', 'sto_q',
                'core_chapter_end', 'core_day_end', 'core_rest'];
  const t46ok = keys.filter(k => k.indexOf('sto_recap_') === 0 || k === 'sto_hint3').length === 13;
  const clipsOk = keys.length === 46 && t46ok &&
    need.every(k => keys.indexOf(k) >= 0 && KIDS.voice.clips[k].indexOf('data:audio/mpeg;base64,') === 0);
  if (clipsOk) npass++;
  units.clips = { ok: clipsOk, n: keys.length };

  /* ---- ⑭ 星级规则（引擎级构造直测：0=3★ / 1-2=2★ / ≥3=1★，永不 0 星） ---- */
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

  /* ---- ⑮ 章末预告 C7 关键词断言（hint[i] ↔ CHAPTERS[i+1]；GEN_HINTS[k] ↔ dch=k+1） ---- */
  total++;
  const hintOk = CHAPTERS[1].hint.indexOf('自然') >= 0 && CHAPTERS[1].hint.indexOf('顺序') >= 0 &&
                 CHAPTERS[2].hint.indexOf('早上') >= 0 && CHAPTERS[2].hint.indexOf('时间') >= 0 &&
                 CHAPTERS[3].hint.indexOf('混') >= 0 && CHAPTERS[3].hint.indexOf('挑战') >= 0 &&
                 CHAPTERS[4].hint.indexOf('挑战') >= 0 &&
                 GEN_HINTS[0].indexOf('生活') >= 0 &&
                 GEN_HINTS[1].indexOf('自然') >= 0 && GEN_HINTS[1].indexOf('种子') >= 0 &&
                 GEN_HINTS[2].indexOf('先') >= 0 && GEN_HINTS[2].indexOf('后') >= 0 &&
                 GEN_HINTS[3].indexOf('混') >= 0;
  if (hintOk) npass++;
  units.hints = { ok: hintOk, chapters: [1, 2, 3, 4].map(i => CHAPTERS[i].hint), gen: GEN_HINTS };

  /* ---- ⑯ verify 提速断言 ---- */
  total++;
  const speedOk = SPEED === 0.12;
  if (speedOk) npass++;
  units.speed = { ok: speedOk, SPEED: SPEED };

  /* ---- ⑰ 干扰帧 UI 专项（flat5 dch2：错点+成员反馈+不清已对+correctIdx 免疫扫描） ---- */
  total++;
  startLevel(5);
  const q17 = ST.quiz;
  const di17 = q17.frames.findIndex(f => f.pos === -1);
  const pk17a = countKey('sto_w_out');
  const r17 = await ST.tapFrame(di17);
  const q17b = ST.quiz;
  const ownPlaced0 = q17b.frames.filter(f => f.pos >= 0 && f.placed).length;
  const d17 = r17 === 'wrong' && q17b.miss === 1 && q17b.slot === 0 && ownPlaced0 === 0 &&
              countKey('sto_w_out') === pk17a + 1 && PKS.indexOf('sto_w_out') >= 0;
  /* 自有帧错点→sto_hint（r34 去泄序：与干扰反馈分流——r29 交叉断言双向；
     miss 读数走 getter 新拷贝——旧快照不随引擎变） */
  const wi17 = q17b.frames.findIndex(f => f.pos >= 0 && f.pos !== q17b.slot);
  const pk17h = countKey('sto_hint');
  const r17b = await ST.tapFrame(wi17);
  const d17b = r17b === 'wrong' && ST.quiz.miss === 2 && countKey('sto_hint') === pk17h + 1;
  /* correctIdx 全 40 关永不指认干扰帧（救援/帮指免疫面，§R4） */
  let idxImmune = true;
  for (let flat = 0; flat < 40; flat++) {
    const L = genLevel(flat);
    for (const q of L.quizzes) {
      const ii = correctIdx(q);
      if (ii >= 0 && q.frames[ii].pos === -1) idxImmune = false;
      for (const f of q.frames) { f.placed = f.pos >= 0; q.slot = q.frames.filter(x => x.pos >= 0).length; }
      if (correctIdx(q) !== -1) idxImmune = false;             /* 全放完=-1（含 why 前） */
    }
  }
  const disOk = d17 && d17b && idxImmune;
  if (disOk) npass++;
  units.distract = { ok: disOk, wrongUi: d17, hintSplit: d17b, idxImmune: idxImmune };

  /* ---- ⑱ 因果问句 UI 专项（flat10 qi1 面板：文本/错选不推进/对选推进+dch1-2 零 why） ---- */
  total++;
  startLevel(10);
  for (let qi = 0; qi <= 1; qi++) {                            /* 排完 qi0+qi1 → why 面板 */
    const q = cur.quizzes[cur.step];
    for (let s = 0; s < SPEC_FRAMES[q.story]; s++) {
      const qq = cur.quizzes[cur.step];
      const i = qq.frames.findIndex(f => !f.placed && f.pos === qq.slot);
      await ST.tapFrame(i);
    }
  }
  const q18 = ST.quiz;                                         /* why 待答：quiz 恒返 qi1 同题 */
  const optEls = boardEl.querySelectorAll('.optcard');
  const lib18 = STORY_LIB[q18.story].why;
  const texts = Array.prototype.map.call(optEls, b => b.textContent);
  const textOk = optEls.length === 2 && texts.slice().sort().join() === [lib18.a, lib18.b].sort().join();
  const getterOk = q18.answered === true && q18.why && q18.why.on === true && q18.why.done === false &&
                   q18.why.opts.length === 2 && q18.step === 1;
  const badI18 = q18.why.opts.indexOf('b');
  const pkW = countKey('sto_why_w');
  const r18w = await ST.tapWhy(badI18);
  const wrongOk = r18w === 'wrong' && ST.currentLevel.step === 1 && ST.quiz.why.done === false &&
                  countKey('sto_why_w') === pkW + 1;
  const whyQSeen = lastOf('sto_why_' + q18.story) !== null;     /* 问句播报 vlog（TODO 注册前静默仍记录） */
  const goodI18 = ST.quiz.why.opts.indexOf('a');
  const r18g = await ST.tapWhy(goodI18);
  const rightOk = r18g === 'right' && ST.currentLevel.step === 2 && lastOf('sto_why_right') !== null;
  /* dch1/2 零 why + dch3/4 恰 qi1/qi3（40 关引擎扫描，r31：断言实体非条件跳过） */
  let whyLaw = true;
  for (let flat = 0; flat < 40; flat++) {
    const L = genLevel(flat);
    for (let k = 0; k < L.quizzes.length; k++) {
      const want = (L.dch === 3 || L.dch === 4) && (k === 1 || k === 3);
      if (want !== !!L.quizzes[k].why) whyLaw = false;
    }
  }
  const whyOk = textOk && getterOk && wrongOk && rightOk && whyQSeen && whyLaw;
  if (whyOk) npass++;
  units.whyPanel = { ok: whyOk, texts: textOk, getter: getterOk, wrongNoAdvance: wrongOk,
                     rightAdvance: rightOk, quizPlayed: whyQSeen, lawScan: whyLaw };

  /* ---- ⑲ 收尾卫生（r34 审查 M1/m4）：退休键全 VLOG 复检（⑤ 时点后 ⑨-⑱ 真实错点路径不再漏检）+
     why 文案禁「先先」叠字（q0 前导先 × 模板「为什么要先」——注册链+运行时双防） ---- */
  total++;
  const noLeakAll = VLOG.every(v => v.k !== 'sto_w_first' && v.k !== 'sto_w_mid');
  const whyClean = Object.keys(STORY_LIB).every(id => whyClipOf(id).text.indexOf('先先') < 0);
  if (noLeakAll && whyClean) npass++;
  units.finalHygiene = { ok: noLeakAll && whyClean, noRetiredKeys: noLeakAll, whyNoDoubleXian: whyClean };

  const out = { game: 'story3', total: total, pass: npass, layoutOk: layoutOk,
                levels: levels, gen: gen, units: units, smokes: smokes };
  $id('verify-result').textContent = JSON.stringify(out);
  document.title = (npass === total && layoutOk) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL';
}

if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 未 init，audio.ctx 为 null，双保险） */
  KIDS.audio.note = function () {};
  KIDS.audio.sfx = function () {};
  KIDS.speak = function () {};
  KIDS.voice.play = function () {};
  KIDS.voice.queue = function () {};
  runVerify();
}
