/* ================= piano 纯引擎：确定性序列生成 + 逐音比对（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）。
   章型（SPEC-BATCH23 §0.54/§3 + SPEC-R23 §R2；进度章号单调递增、难度章号 (ch-1)%4+1 循环）：
   dch1 两音 / dch2 三音（基线不动）/ dch3 五音（r23 长度上探）/ dch4 题型谱 D4_KINDS
   =[echo,rhythm,echo,chord,echo]——echo 长曲 6/5/5（qi0 首两音重复+qi4 尾 dosi 教学点保留）+
   qi1 rhythm 节奏听辨（4 互异音恰 1 长音）+ qi3 chord 和弦听辨（2 音间距≥2）。
   生成律：旋律步进 ±1..±3（ch1-3 无同音连弹——重复音是 ch4 的教学点）；ch4 echo 腿允许步 0；
   同章内 5 序列有序签名互异（禁同序列重复）。flat0 seq0 恒 [0,4] 教学定值不动。
   比对铁律（§0.54 防挫败定版）：弹对=该音位 +1；弹错=miss+1 且 pos 不进（序列不重头，当前音重试）。
   r23 作答面（§R4）：rhythm=点长音键作答；chord=选两键集合判定（pick/same 见 engTapKey）。 */
function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const pi_ri = (rnd, lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1)); // [lo,hi] 闭区间整数
/* 进度章号单调递增（与 keyOf/写档一致）；难度章号四章循环取材 */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % 4 + 1;

/* ---------- 单序列生成（音符存 0-7 索引，UI 层经 NOTE_IDS 还原音名）
   start 起音 0-6（不从 dosi 起）；步进池 dch4 含 0（重复音），其余不含；越界镜像折回 ---------- */
function genSeq(rnd, len, dch, forceRepeat, forceHigh) {
  const seq = [];
  let cur = pi_ri(rnd, 0, 6);
  seq.push(cur);
  for (let i = 1; i < len; i++) {
    if (forceRepeat && i === 1) { seq.push(cur); continue; }        // dch4 seq0：首两音重复（do-do-sol 型）
    if (forceHigh && i === len - 1) { seq.push(7); cur = 7; continue; } // dch4 seq4：尾音跨八度 dosi
    const pool = dch === 4 ? [-3, -2, -1, 0, 1, 2, 3] : [-3, -2, -1, 1, 2, 3];
    let nxt = cur + pool[pi_ri(rnd, 0, pool.length - 1)];
    if (nxt < 0 || nxt > 7) nxt = cur - (nxt - cur);                 // 镜像折回 [0,7]
    if (nxt < 0) nxt = 0;
    if (nxt > 7) nxt = 7;
    seq.push(nxt); cur = nxt;
  }
  if (forceHigh && seq.indexOf(7) < 0) seq[seq.length - 1] = 7;      // 兜底（理论不可达）
  return seq;
}

/* ---------- rhythm 题面生成（r23 §R3）：域 0-7 洗牌取前 RHY_LEN 个互异音 + 长音位 seeded
   互异性=「哪个音最长」答案唯一性的结构性保证（同名音不同时值会让作答歧义） ---------- */
function genRhythm(rnd) {
  const pool = [0, 1, 2, 3, 4, 5, 6, 7];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = pi_ri(rnd, 0, i);
    const t = pool[i]; pool[i] = pool[j]; pool[j] = t;
  }
  return { seq: pool.slice(0, RHY_LEN), longIdx: pi_ri(rnd, 0, RHY_LEN - 1) };
}
/* ---------- chord 题面生成（r23 §R3）：a∈[0,5]，b=a+ri(2,3)（>7 折 a+2）——间距 ≥2
   （禁相邻音程：小/大二度同发人耳难分，非 6 岁可判域——SPEC-R23 §R1 选型理由） ---------- */
function genChord(rnd) {
  const a = pi_ri(rnd, 0, 5);
  let b = a + pi_ri(rnd, 2, 3);
  if (b > 7) b = a + 2;
  return [a, b];
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道）
   flat0 序列0 恒 ['do','sol']（两音跨度大好记——教学演示题面稳定） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  const seqs = [];
  const sigs = {};
  const mk = (s, extra) => Object.assign(
    { seq: s.slice(), pos: 0, solved: false, miss: 0, mode: 'echo' }, extra || {});
  let guard = 0;
  while (seqs.length < CH_LEN && guard++ < 600) {
    const qi = seqs.length;
    let kind = 'echo', s, extra;
    if (dch === 4) {
      kind = D4_KINDS[qi];                            // 题型谱：echo/rhythm/echo/chord/echo
      const eIdx = D4_KINDS.slice(0, qi + 1).filter(k => k === 'echo').length - 1;
      if (kind === 'rhythm') {
        const r = genRhythm(rnd);                     // 洗牌+longIdx 同 rnd 通道（确定性）
        s = r.seq; extra = { mode: 'rhythm', longIdx: r.longIdx };
      } else if (kind === 'chord') {
        s = genChord(rnd); extra = { mode: 'chord', sel: [] };
      } else {
        const forceRepeat = qi === 0;                 // qi0：重复音保证（承旧 seq0 教学点）
        const forceHigh = qi === CH_LEN - 1;          // qi4：跨八度保证（承旧 seq4 教学点）
        s = genSeq(rnd, D4_ECHO_LEN[eIdx], dch, forceRepeat, forceHigh);
        extra = { mode: 'echo' };
      }
    } else {
      s = (flat === 0 && qi === 0) ? [0, 4]           // 教学题面定值 do-sol（零改动）
        : genSeq(rnd, CHAPTERS[dch].len, dch, false, false);
      extra = { mode: 'echo' };
    }
    let sig = s.join(',');
    if (sigs[sig]) {                                  // 签名撞车：微扰再试（确定性）
      if (guard > 400) { s = s.map(v => (v + 1) % 8); sig = s.join(','); }
      if (sigs[sig]) continue;
    }
    sigs[sig] = 1;
    seqs.push(mk(s, extra));
  }
  /* 兜底：极端种子下不足 5 条互异（实际不可达）——顺序基型补齐（echo 长度按谱） */
  let bk = 0;
  while (seqs.length < CH_LEN) {
    const kind = dch === 4 ? D4_KINDS[seqs.length] : 'echo';
    const eIdx = dch === 4 ? D4_KINDS.slice(0, seqs.length + 1).filter(k => k === 'echo').length - 1 : 0;
    const len = dch === 4 ? (kind === 'rhythm' ? RHY_LEN : kind === 'chord' ? 2 : D4_ECHO_LEN[eIdx])
                          : CHAPTERS[dch].len;
    const s = [];
    for (let i = 0; i < len; i++) s.push((bk + i * 3) % 8);
    bk++;
    if (sigs[s.join(',')]) continue;
    sigs[s.join(',')] = 1;
    seqs.push(mk(s, kind === 'rhythm' ? { mode: 'rhythm', longIdx: 0 }
                                      : kind === 'chord' ? { mode: 'chord', sel: [] } : null));
  }
  return { flat: flat, ch: ch, dch: dch, lv: lv,
           seqs: seqs, step: 0, done: false, missTotal: 0 };
}

/* ---------- 弹键引擎（无 DOM）：engTapKey(L, 音名) —— 三 mode 分支（r23 §R5）
   echo（跟弹逐音比对，§0.54 定版）：
   'right'  弹对且序列未完（pos+1）
   'done'   弹对且序列完成（还有后续序列）
   'won'    末序列完成 = 通关
   'wrong'  弹错：miss+1，pos 不进（序列不重头，当前音重试）
   rhythm（节奏听辨作答，§R4）：
   点中长音键 → right/done/won；其他键 → wrong（miss+1 不换题可重选——探索≠错）
   chord（和弦听辨作答，选择集聚合）：
   'pick'   选中第 1 键（sel=[i]，不判不罚不占 busy）
   'same'   点已选键=取消该键（sel 移除，不判不罚）
   sel 满 2：集合与 seq 相等 → right/done/won（推进）；不等 → sel 清空+miss+1 'wrong'
   null     非法音名 / 关已结束（三 mode 通用） ---------- */
function engTapKey(L, name) {
  if (!L || L.done) return null;
  const q = L.seqs[L.step];
  if (!q || q.solved) return null;
  const idx = NOTE_IDS.indexOf(name);
  if (idx < 0) return null;
  const advance = () => {
    q.solved = true;
    L.step++;
    if (L.step >= L.seqs.length) { L.done = true; return 'won'; }
    return 'done';
  };
  if (q.mode === 'rhythm') {
    if (idx === q.seq[q.longIdx]) return advance();
    q.miss++; L.missTotal++;
    return 'wrong';
  }
  if (q.mode === 'chord') {
    const si = q.sel.indexOf(idx);
    if (si >= 0) { q.sel.splice(si, 1); return 'same'; }   // 取消选择（不判不罚）
    q.sel.push(idx);
    if (q.sel.length < 2) return 'pick';
    const hit = q.sel.indexOf(q.seq[0]) >= 0 && q.sel.indexOf(q.seq[1]) >= 0;
    if (hit) return advance();                           // 集合相等（互异 ⇒ 无序对）
    q.sel.length = 0;                                      // 清空可重选
    q.miss++; L.missTotal++;
    return 'wrong';
  }
  /* echo：原样逐音比对（§0.54 定版） */
  if (q.seq[q.pos] === idx) {
    q.pos++;
    if (q.pos >= q.seq.length) return advance();
    return 'right';
  }
  q.miss++;
  L.missTotal++;
  return 'wrong';
}
const engWon = L => !!L && L.done;

/* ---------- 星级（SPEC §3 定版 + r23 §R4 口径论证）：弹错次数口径 0=3★ / 1-2=2★ / ≥3=1★。
   永不 0 星。rhythm/chord 的探索性错选与 echo 弹错同档计 1 miss——单次错误成本等价，分档不动 ---------- */
const engStars = L => {
  const m = !L ? 0 : (L.missTotal || 0);
  return m === 0 ? 3 : (m <= 2 ? 2 : 1);
};

/* ---------- 结构校验（verify 用，返回失败原因或 null）
   dch1-3：长度按章（dch3=5）/ 域 0-7 / 无同音连弹 / 初始 pos0 未解。
   dch4（r23 §R5）：mode↔qi 按题型谱 / rhythm=len4+互异+longIdx 域 / chord=len2+互异+
   间距≥2+sel 空 / echo=len 按谱+qi0 首两音重复+qi4 尾 7。 ---------- */
function structWhy(q, dch, flat, qi) {
  if (!q || !Array.isArray(q.seq) || !q.seq.length) return 'shape';
  const len = q.seq.length;
  for (let i = 0; i < len; i++) if (!(q.seq[i] >= 0 && q.seq[i] <= 7)) return 'range@' + i;
  if (dch === 4) {
    const kind = D4_KINDS[qi];
    if ((q.mode || 'echo') !== kind) return 'mode@' + qi;
    if (kind === 'rhythm') {
      if (len !== RHY_LEN) return 'len:' + len + '!=' + RHY_LEN;
      if (new Set(q.seq).size !== RHY_LEN) return 'rhydup';        // 互异（答案唯一性）
      if (!(q.longIdx >= 0 && q.longIdx < RHY_LEN)) return 'longidx';
    } else if (kind === 'chord') {
      if (len !== 2) return 'len:' + len + '!=2';
      if (q.seq[0] === q.seq[1]) return 'chodup';
      if (Math.abs(q.seq[1] - q.seq[0]) < 2) return 'chogap';      // 间距 ≥2（禁相邻音程）
      if (!Array.isArray(q.sel) || q.sel.length !== 0) return 'init';
    } else {
      const eIdx = D4_KINDS.slice(0, qi + 1).filter(k => k === 'echo').length - 1;
      const want = D4_ECHO_LEN[eIdx];
      if (len !== want) return 'len:' + len + '!=' + want;
      if (qi === 0 && q.seq[1] !== q.seq[0]) return 'norepeat0';
      if (qi === CH_LEN - 1 && q.seq[len - 1] !== 7) return 'nohi4';
    }
  } else {
    const want = CHAPTERS[dch].len;
    if (len !== want) return 'len:' + len + '!=' + want;
    for (let i = 1; i < len; i++) if (q.seq[i] === q.seq[i - 1]) return 'repeat:' + dch;
  }
  if (q.pos !== 0 || q.solved || q.miss !== 0) return 'init';
  return null;
}
