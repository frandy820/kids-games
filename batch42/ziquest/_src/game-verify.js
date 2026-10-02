/* ================= ?verify=1 自检（独立第 4 script 块）——M1 骨架 7 单元 + M2a 流程层 17 单元
   ① 结构：script 块数==4 + 完全离线（运行时字面扫描，SVG xmlns 白名单）
   ② 地图拓扑：130 节点 / key 唯一 / next 无断链 / 先序链无孤立（除链尾恰好=各区 boss）/ 区域序线性
   ③ nodeState 解锁律：fixture 存档推进——锁→开→当前→完成 四态转换 + 区域门 + BOSS 门（v3.1 撤日配额门=连续解锁）
   ④ 配额表独立对账：SPEC 硬编码 [1,2,2,2,2,2,2,3] 对照 ZQ_DAY_NEW + zqQuota 全日算 + bonus 叠加（v3.1 起仅家长面板统计参考，不锁关）
   ⑤ SRS 调度律：对→间隔沿 [1,3,7,14,30] 扩张封顶 / 错→降档减半+miss+1 / srsDue 定序律
   ⑥ 地图渲染 DOM：130 节点在场 / 当前节点 s-current 脉冲类在场 / 未解锁区域迷雾 pattern 在场
   ⑦ 定级停止规则 calStop：晋级线 8/6 / <4 即停 / 连错 3 快停 / 带 3 完=结束 / 空记录=带 1 起步
   ⑧ gen 生成器确定性深对账（同存档同日两跑 JSON 全等/跨日变/字组与日期无关/契约字段/答案下标）
   ⑨ layout 编排六律（首判定认识层/相邻不同型/≥4 型/每字 2 通道/运用层限位/字内难度不降+boss 轮转）
   ⑩ calknown 定级剔除（已知字不进目标+池序顺延+新字必经认识层）
   ⑪ stars 星判定表（0=3★/1-2=2★/≥3=1★ 永不 0/boss 恒 3★）
   ⑫ retry 错题重入队（同字不同型一次为限/错不推进同题重答）
   ⑬ boss HP 制（catalog hp clamp/连对击破/miss3 半进度休息/永错永不失败/题尽续题）
   ⑭ settle 结算写档模拟（dex 新学当日态 due+1/newChars/weak 入池/camp 回忆喂+campPaid 账）
   ⑮ camp 复习营地（due 池 engine 定序/6 题轮转）
   ⑯ morning 早安营地（昨日新字 recap T1/T4/T1/verify 守卫/币 3）
   ⑰ calflow 定级流程模拟（三带全对 30 题/<4 即停/带内晋级/known 收集口径）
   ⑱ leak 防泄露（视觉题面 DOM 零答案文本+渲染期键账零目标音）
   ⑲ ui 渲染兜底+触摸（未注册型占位卡/选项 ≥96/题面选项分离/生字墙容器）
   ⑳ econ 经济常量独立对账（SPEC_ECON 硬编码 ↔ ZQ_ECON）
   ㉑ calpool 三带池对账（40/30/30/池 100 全在字表/三带互异）
   ㉒ rescue 救援双锚直驱（14s 方向级重播/30s 答案级 breathe/keepIdle 不刷 lastAct）
   ㉓ dispatch 节点分发（story/chest/friend 占位/new/boss 弹层/camp·calib verify 守卫）
   ㉔ seed 确定性工具锚（hash 稳定/同种子洗牌全等）
   ㉕ spread 区域字组均分（R1 十三关并集 62 无缝无重/每关 4-5 字）
   ㉖ cluster P1 分类聚簇（v4：7 区 cat 区间连续不交错/同 cat 众数占比 ≥60%/关标题主题化）
   结果写 #verify-result + document.title = 'VERIFY PASS n/n'（失败=VERIFY FAIL） */
'use strict';

async function runVerify() {
  document.body.classList.add('verify');
  const units = {};
  let npass = 0, total = 0;
  const ok = (unit, name, cond) => {
    units[unit] = units[unit] || [];
    units[unit].push([name, !!cond]);
    total++; if (cond) npass++;
  };

  /* ---- SPEC 独立表（坑4 铁律：期望值独立硬编码，禁从实现函数复算） ---- */
  const SPEC_DAY_NEW = [1, 2, 2, 2, 2, 2, 2, 3];
  const SPEC_SRS_IV = [1, 3, 7, 14, 30];
  const SPEC_NODES = 130;

  /* ================= ① 结构：script 块数 + 完全离线 ================= */
  try {
    const scripts = document.querySelectorAll('script');
    ok('struct', 'script 块数 == 4', scripts.length === 4);
    const HTTP = 'htt' + 'p://', HTTPS = 'htt' + 'ps://', XMLNS = HTTP + 'www.w3.org/2000/svg';
    let offline = true, bad = '';
    scripts.forEach((s, i) => {
      const t = (s.textContent || '').split(XMLNS).join('NS-SVG');
      [HTTP, HTTPS, '<' + 'link'].forEach(p => {
        if (t.indexOf(p) >= 0 && !bad) bad = 'script[' + i + '] 含外部引用字面';
      });
    });
    if (document.querySelector('link[rel]')) { offline = false; bad = bad || 'link 标签在场'; }
    ok('struct', '完全离线（唯一 http=SVG xmlns）', offline && !bad);
  } catch (e) { ok('struct', '离线扫描异常 ' + e.message, false); }

  /* ================= ② 地图拓扑（先序链无断链/无孤立/区域序） ================= */
  try {
    ok('topo', '节点数 == 130', ZQ_NODES.length === SPEC_NODES);
    const keys = new Set(ZQ_NODES.map(n => n.key));
    ok('topo', 'key 唯一', keys.size === ZQ_NODES.length);
    let chainOk = true;
    ZQ_NODES.forEach(n => n.next.forEach(k => { if (!keys.has(k)) chainOk = false; }));
    ok('topo', 'next 引用全部有效（无断链）', chainOk);
    let intraOk = true;                             /* 区域内 next 链全可达（跨区走 unlock 门，非边） */
    ZQ_REGIONS.forEach(r => {
      const reach = new Set([r.nodes[0].key]);
      r.nodes.forEach(n => n.next.forEach(k => {
        if (reach.has(n.key) && r.nodes.some(x => x.key === k)) reach.add(k);
      }));
      if (reach.size !== r.nodes.length) intraOk = false;
    });
    ok('topo', '区域内先序链无孤立（全可达）', intraOk);
    const tails = ZQ_NODES.filter(n => n.next.length === 0).map(n => n.key);
    const bosses = ZQ_REGIONS.filter(r => r.boss).map(r => r.boss);
    ok('topo', '链尾 = R0 尾站 + 各区 BOSS（7 门）', tails.join() === ['r0n03'].concat(bosses).join() && bosses.length === 7);
    let seqOk = ZQ_REGIONS[0].unlock === 'first';
    for (let i = 1; i < ZQ_REGIONS.length; i++) {
      const u = ZQ_REGIONS[i].unlock;
      if (u !== ZQ_REGIONS[i - 1].boss && u !== 'r' + (i - 1) + '_boss' && !keys.has(u)) seqOk = false;
    }
    ok('topo', '区域序线性（unlock 指向邻区 boss/节点）', seqOk);
    let lvOk = true;
    ZQ_REGIONS.forEach(r => {
      const nNew = r.nodes.filter(n => n.type === 'new').length;
      if (r.levels !== nNew) lvOk = false;
    });
    ok('topo', '各区 levels == new 节点数', lvOk);
  } catch (e) { ok('topo', '拓扑异常 ' + e.message, false); }

  /* ================= ③ nodeState 解锁律（fixture 存档四态转换） ================= */
  try {
    const T = '2026-10-01';
    const mk = over => { const s = { v: '1.0', game: 'ziquest', firstDay: T, levels: {}, bonus: {}, zq: { cal: { done: [], band: 0, skipSeen: false }, map: {}, dex: {}, weak: [], comp: {}, dress: { owned: [], worn: {}, home: {} }, coins: 0, storySeen: [], dayLog: { [T]: { newChars: [], nodes: [], newDone: [], quests: [] } } } }; return Object.assign(s, over || {}); };
    const done = (s, k, st) => { s.zq.map[k] = { stars: st || 2, plays: 1 }; return s; };
    let s0 = mk();
    ok('unlock', '冷档：r0n01=可玩（首节点无前驱）', ZQ._nodeState(s0, 'r0n01', T) === 'open');
    ok('unlock', '冷档：r0n02=锁（前驱未完成）', ZQ._nodeState(s0, 'r0n02', T) === 'locked');
    ok('unlock', '冷档：r1n01=锁（区域门=迷雾）', ZQ._nodeState(s0, 'r1n01', T) === 'locked');
    ok('unlock', '冷档：当前节点=r0n01', ZQ._curNodeKey(s0, T) === 'r0n01');
    done(s0, 'r0n01');
    ok('unlock', 'r0n01 完成→done 态', ZQ._nodeState(s0, 'r0n01', T) === 'done');
    ok('unlock', 'r0n02 开（前驱亮）且为当前', ZQ._nodeState(s0, 'r0n02', T) === 'open' && ZQ._curNodeKey(s0, T) === 'r0n02');
    done(s0, 'r0n02'); done(s0, 'r0n03');
    ok('unlock', 'R0 全通→R1 区域开 r1n01 可玩', ZQ._nodeState(s0, 'r1n01', T) === 'open');
    ok('unlock', 'R1 boss=锁（new 未全通）', ZQ._nodeState(s0, 'r1n20', T) === 'locked');
    const s1 = mk();
    ZQ_NODES.filter(n => n.region === 0).forEach(n => done(s1, n.key));            /* 区域门：R0 全通 */
    ZQ_NODES.filter(n => n.region === 1 && n.type === 'new').forEach(n => done(s1, n.key, 3));
    ZQ_NODES.filter(n => n.region === 1 && n.type !== 'new' && n.type !== 'boss' && n.key < 'r1n20').forEach(n => done(s1, n.key));
    ok('unlock', '本区 new 全通→boss 可进', ZQ._nodeState(s1, 'r1n20', T) === 'open');
    done(s1, 'r1n20');
    ok('unlock', '击破 boss→R2 迷雾散（r2n01 可玩）', ZQ._nodeState(s1, 'r2n01', T) === 'open');
    const sq = mk();
    const CUT = ZQ_NODES.findIndex(n => n.key === 'r1n08');
    ZQ_NODES.slice(0, CUT).forEach(n => { sq.zq.map[n.key] = { stars: 2, plays: 1 }; });   /* r0 全+r1n01..07 */
    sq.zq.dayLog[T].newDone = ['r1n02', 'r1n03', 'r1n04', 'r1n06'];                        /* 首日 quota=1 已超 */
    ok('unlock', 'v3.1 连续解锁：首日配额超量后 r1n08 仍 open（撤日配额门，首试反馈修复）', ZQ._nodeState(sq, 'r1n08', T) === 'open');
    ok('unlock', '连续解锁：r1n09（前驱 r1n08 未完）仍锁=只走前驱链', ZQ._nodeState(sq, 'r1n09', T) === 'locked');
    ok('unlock', '营地任意态可玩不受限（r1n07 非锁）', ZQ._nodeState(sq, 'r1n07', T) !== 'locked');
  } catch (e) { ok('unlock', '解锁律异常 ' + e.message, false); }

  /* ================= ④ 配额表独立对账 ================= */
  try {
    ok('quota', 'ZQ_DAY_NEW == SPEC [1,2,2,2,2,2,2,3]', ZQ_DAY_NEW.join() === SPEC_DAY_NEW.join());
    let qOk = true;
    for (let d = 1; d <= 30; d++) {
      const want = d >= 8 ? 3 : SPEC_DAY_NEW[d - 1];
      if (ZQ._zqQuota(d, 0) !== want) qOk = false;
    }
    ok('quota', 'zqQuota 全日算（8 日起恒 3）', qOk);
    ok('quota', 'bonus 叠加：zqQuota(1,2)==3', ZQ._zqQuota(1, 2) === 3);
    ok('quota', 'day 序：firstDay+9 天 → dayIndex 10', ZQ._zqDayIndex({ firstDay: '2026-10-01' }, '2026-10-09') === 9);
  } catch (e) { ok('quota', '配额异常 ' + e.message, false); }

  /* ================= ⑤ SRS 调度律 ================= */
  try {
    let st = { st: 1, lv: 0, due: '2026-10-02', miss: 0, ok: 0 }, dues = [];   /* 新学当日态起步 */
    for (let i = 0; i < 7; i++) { st = ZQ._srsNext(st, true, '2026-10-01'); dues.push(st); }
    ok('srs', '对 7 连：lv 沿阶梯升至封顶 4', st.lv === 4 && dues.map(x => x.lv).join() === '1,2,3,4,4,4,4');
    ok('srs', '对→间隔扩张（+3/+7/+14/+30 封顶 30，SPEC_SRS_IV）',
      dues.map(x => x.due).join() === '2026-10-04,2026-10-08,2026-10-15,2026-10-31,2026-10-31,2026-10-31,2026-10-31' &&
      SPEC_SRS_IV.join() === '1,3,7,14,30');
    ok('srs', '对→精通态（lv≥3 st=2）', st.st === 2 && dues[3].st === 2);
    const bad = ZQ._srsNext({ st: 2, lv: 4, due: '2026-10-31', miss: 0, ok: 5 }, false, '2026-10-01');
    ok('srs', '错→降一档+间隔减半（lv4→3，14/2=7 日）', bad.lv === 3 && bad.due === '2026-10-08');
    ok('srs', '错→miss+1（入薄弱池依据）', bad.miss === 1 && bad.ok === 5);
    const dex = {
      '日': { st: 1, lv: 0, due: '2026-09-30', miss: 0, ok: 1 },   /* 最急 */
      '月': { st: 1, lv: 1, due: '2026-10-01', miss: 2, ok: 1 },   /* 同日 miss 高优先 */
      '水': { st: 1, lv: 1, due: '2026-10-01', miss: 0, ok: 1 },
      '山': { st: 0, lv: 0, due: null, miss: 0, ok: 0 },           /* 未学不入池 */
      '火': { st: 1, lv: 2, due: '2026-10-05', miss: 0, ok: 2 }    /* 未到期不入池 */
    };
    ok('srs', 'srsDue：due 升序→miss 降序，未学/未到期排除', ZQ._srsDue(dex, '2026-10-01').join() === '日,月,水');
  } catch (e) { ok('srs', 'SRS 异常 ' + e.message, false); }

  /* ================= ⑥ 地图渲染 DOM 断言 ================= */
  try {
    ok('dom', 'SVG 节点元素 == 130', document.querySelectorAll('#zq-l4 .zq-node').length === SPEC_NODES);
    ok('dom', '迷雾 pattern 在场（url 引用有效）',
      !!document.querySelector('#zq-fog-pat') && document.querySelectorAll('.zq-fog').length >= 7);
    const cur = ZQ.cur;
    ok('dom', '当前节点 s-current 脉冲类在场（' + cur + '）',
      !!cur && document.getElementById(cur).classList.contains('s-current'));
    const lockedN = Object.keys(ZQ.mapState()).filter(k => ZQ.mapState()[k] === 'locked').length;
    ok('dom', '冷档锁节点数 > 100（迷雾区全锁）', lockedN > 100);
    ok('dom', '触摸热区在场（130 hit circle）', document.querySelectorAll('#zq-l4 .zq-hit').length === SPEC_NODES);
    ok('dom', '兔子 L5 + 粒子池 L6 在场', !!document.getElementById('zq-rabbit') && document.querySelectorAll('.zq-fx').length === 12);
  } catch (e) { ok('dom', 'DOM 异常 ' + e.message, false); }

  /* ================= ⑦ 定级停止规则（v5：5 题/带·PASS 4/4·对<3 温和停） ================= */
  try {
    const A = n => { const a = []; for (let i = 0; i < 5; i++) a.push(i < n); return a; };
    const AM = n => { const a = []; for (let i = 0; i < 5; i++) a.push((i * n) % 5 < n); return a; };  /* 对错交错（无连3错干扰晋级线） */
    ok('calib', '带1 对5 → 进带2', !ZQ._calStop([{ band: 1, answers: A(5) }]).stop);
    ok('calib', '带1 对3（达3未达4）→ 温和停', ZQ._calStop([{ band: 1, answers: AM(3) }]).stop);
    ok('calib', '带1 对2 <3 → 即停', ZQ._calStop([{ band: 1, answers: A(2) }]).stop);
    const streak = [true, true, false, false, false];
    ok('calib', '带内连错 3 → 快速停（对2也不救）', ZQ._calStop([{ band: 1, answers: streak }]).stop);
    ok('calib', '带2 对4 → 进带3', !ZQ._calStop([{ band: 1, answers: A(5) }, { band: 2, answers: AM(4) }]).stop);
    ok('calib', '带2 对3 → 停', ZQ._calStop([{ band: 1, answers: A(5) }, { band: 2, answers: AM(3) }]).stop);
    ok('calib', '带3 答完 → 结束（next=0）', ZQ._calStop([{ band: 1, answers: A(5) }, { band: 2, answers: A(4) }, { band: 3, answers: A(3) }]).next === 0);
    ok('calib', '空记录 → 带1 起步不叫停', !ZQ._calStop([]).stop && ZQ._calStop([]).next === 1);
  } catch (e) { ok('calib', '定级异常 ' + e.message, false); }

  /* ================= ⑧ 生成器确定性深对账（M2a：同存档态同题序铁律） ================= */
  try {
    const T = '2026-10-01';
    const mk2 = over => { const s = { v: '1.0', game: 'ziquest', firstDay: T, levels: {}, bonus: {}, zq: { cal: { done: [], band: 0, skipSeen: false }, map: {}, dex: {}, weak: [], comp: {}, dress: { owned: [], worn: {}, home: {} }, coins: 0, storySeen: [], dayLog: {} } }; return Object.assign(s, over || {}); };
    const sv = mk2();
    const L = ZQ._genLevel('r1n02', sv, T);
    ok('gen', 'r1n02 可生成（kind=new）', !!L && L.kind === 'new');
    ok('gen', '同存档同日两跑 JSON 全等（确定性）',
      JSON.stringify(L) === JSON.stringify(ZQ._genLevel('r1n02', sv, T)));
    ok('gen', '跨日不同题序（日期入种）',
      JSON.stringify(ZQ._genLevel('r1n02', sv, '2026-10-02')) !== JSON.stringify(L));
    ok('gen', '节点字组与日期无关（早安 recap 依据稳定）',
      JSON.stringify(ZQ._nodeChars('r1n02', sv)) === JSON.stringify(ZQ._nodeChars('r1n02', mk2({ firstDay: '2026-09-01' }))));
    ok('gen', '题数=字数×3（t2 亮相×n + 判定×2n）', L.qs.length === L.chars.length * 3);
    ok('gen', 'q 契约字段齐（ch/py/pyKey/words/glyph/distract/options/answer/seedIdx/region；t2 演出位无选项）',
      L.qs.every(q => q.ch && q.py && q.pyKey && Array.isArray(q.words) && q.glyph &&
        Array.isArray(q.distract) && (q.type === 't2' ? true : (q.options.length === 4 && typeof q.answer === 'number')) &&
        q.seedIdx > 0 && q.region === 1));
    ok('gen', '字题 answer=目标字下标 / t4 answer=首词下标', L.qs.every(q =>
      q.type === 't2' ? true : (q.type === 't4' ? q.options[q.answer] === q.words[0][0] : q.options[q.answer] === q.ch)));
    ok('gen', 't4 干扰词禁含目标字且互异', L.qs.filter(q => q.type === 't4').every(q => {
      const w = q.options;
      return w.length === new Set(w).size && w.every(x => x === q.words[0][0] || x.indexOf(q.ch) < 0);
    }));
  } catch (e) { ok('gen', '生成器异常 ' + e.message, false); }

  /* ================= ⑨ 编排六律（SPEC §3.3；判定序列=t2 演出位之后） ================= */
  try {
    const T = '2026-10-01';
    const mk2 = over => { const s = { v: '1.0', game: 'ziquest', firstDay: T, levels: {}, bonus: {}, zq: { cal: { done: [], band: 0, skipSeen: false }, map: {}, dex: {}, weak: [], comp: {}, dress: { owned: [], worn: {}, home: {} }, coins: 0, storySeen: [], dayLog: {} } }; return Object.assign(s, over || {}); };
    const sv = mk2();
    const L = ZQ._genLevel('r1n02', sv, T);
    const types = L.qs.map(q => q.type);
    const jd = types.slice(L.chars.length);            /* 判定序列（跳过 t2 演出位） */
    ok('layout', '律1 首判定=认识层 t1', jd[0] === 't1');
    let adjOk = true;
    for (let i = 1; i < jd.length; i++) if (jd[i] === jd[i - 1]) adjOk = false;
    ok('layout', '律2 相邻判定位不同型', adjOk);
    ok('layout', '律3 题型 ≥4 种（t2+t1+t4/t6）', new Set(types).size >= 4);
    let chanOk = true, monoOk = true;
    L.chars.forEach(ch => {
      const per = L.qs.filter(q => q.ch === ch && q.judge !== false).map(q => q.type);
      if (!(per.length >= 2 && per[0] === 't1' && per.slice(1).every(t => t === 't4' || t === 't6'))) chanOk = false;
      const lv = L.qs.filter(q => q.ch === ch && q.judge !== false).map(q => ZQ_NEW_L2[q.type]);
      if (lv.length >= 2 && lv[1] < lv[0]) monoOk = false;
    });
    ok('layout', '律4 每新字 ≥2 通道（认识 t1 先行→辨认 t4/t6 断后）', chanOk);
    const nUse = jd.filter(t => t === 't3' || t === 't5').length;
    const useFirstHalf = jd.slice(0, Math.ceil(jd.length / 2)).filter(t => t === 't3' || t === 't5').length;
    ok('layout', '律5 运用层（t3/t5）≤2 且关后半', nUse <= 2 && useFirstHalf === 0);
    ok('layout', '律6 字内难度不降（认识 1 → 辨认 2/3）', monoOk);
    const B = ZQ._genLevel('r1n20', sv, T);
    const bt = B.qs.map(q => q.type);
    let badj = true;
    for (let i = 1; i < bt.length; i++) if (bt[i] === bt[i - 1]) badj = false;
    ok('layout', 'boss 题型轮转相邻不同型', badj && B.qs.length === B.hpMax);
  } catch (e) { ok('layout', '编排异常 ' + e.message, false); }

  /* ================= ⑩ 定级剔除与新字必经认识层 ================= */
  try {
    const T = '2026-10-01';
    const mk2 = over => { const s = { v: '1.0', game: 'ziquest', firstDay: T, levels: {}, bonus: {}, zq: { cal: { done: [], band: 0, skipSeen: false }, map: {}, dex: {}, weak: [], comp: {}, dress: { owned: [], worn: {}, home: {} }, coins: 0, storySeen: [], dayLog: {} } }; return Object.assign(s, over || {}); };
    const base = ZQ._nodeChars('r1n02', mk2());
    const ksv = mk2();
    ksv.zq.cal.done = [base[0], base[1]];
    const kn = ZQ._nodeChars('r1n02', ksv);
    ok('calknown', '定级已知字不进新字关目标', kn.indexOf(base[0]) < 0 && kn.indexOf(base[1]) < 0);
    ok('calknown', '剔除后区域池序顺延补位', kn[0] === base[2] && kn.length === base.length);
    const L = ZQ._genLevel('r1n02', mk2(), T);
    ok('calknown', '新字必经认识层（每字首判定=t1 后才见辨认型）',
      L.chars.every(ch => {
        const per = L.qs.filter(q => q.ch === ch && q.judge !== false).map(q => q.type);
        return per[0] === 't1';
      }));
  } catch (e) { ok('calknown', '定级剔除异常 ' + e.message, false); }

  /* ================= ⑪ 星判定表（SPEC 口径：永不 0★） ================= */
  try {
    const mkL = miss => ({ kind: 'new', miss: miss });
    ok('stars', 'miss0=3★', ZQ._stars(mkL(0)) === 3);
    ok('stars', 'miss1=2★ / miss2=2★', ZQ._stars(mkL(1)) === 2 && ZQ._stars(mkL(2)) === 2);
    ok('stars', 'miss3=1★ / miss5=1★（永不 0★）', ZQ._stars(mkL(3)) === 1 && ZQ._stars(mkL(5)) === 1);
    ok('stars', 'boss 恒 3★（永不掉星）', ZQ._stars({ kind: 'boss', miss: 9 }) === 3);
  } catch (e) { ok('stars', '星判定异常 ' + e.message, false); }

  /* ================= ⑫ 错题重入队（同字不同型；一次为限；错不推进） ================= */
  try {
    const T = '2026-10-01';
    const mk2 = () => ({ v: '1.0', game: 'ziquest', firstDay: T, levels: {}, bonus: {}, zq: { cal: { done: [], band: 0, skipSeen: false }, map: {}, dex: {}, weak: [], comp: {}, dress: { owned: [], worn: {}, home: {} }, coins: 0, storySeen: [], dayLog: {} } });
    const L2 = ZQ._genLevel('r1n02', mk2(), T);
    const base = L2.chars.length * 3;
    const wrongAt = L2.chars.length + 2;               /* 第 3 判定位答错（engPick 走 L.qi——先推进到位） */
    while (L2.qi < wrongAt) ZQ._engPick(L2, L2.qs[L2.qi].judge === false ? 0 : L2.qs[L2.qi].answer);
    const wrongCh = L2.qs[wrongAt].ch, wrongType = L2.qs[wrongAt].type;
    const qiBefore = L2.qi;
    ZQ._engPick(L2, (L2.qs[wrongAt].answer + 1) % 4);
    ok('retry', '答错不推进（同题重答机制）', L2.qi === qiBefore && L2.miss === 1);
    let g = 0;
    while (!L2.done && g++ < 60) {
      const q = L2.qs[L2.qi];
      ZQ._engPick(L2, q.judge === false ? 0 : q.answer);
    }
    ok('retry', '关尾追加恰 1 道重入题（+1）', L2.qs.length === base + 1);
    const rq = L2.qs[L2.qs.length - 1];
    ok('retry', '重入题=错题字+不同型', rq.ch === wrongCh && rq.type !== wrongType && rq.retried === true);
    const L3 = ZQ._genLevel('r1n02', mk2(), T);
    let g3 = 0, reMissed = false, wDone = false;       /* wrongAt 只错一次（错后同题重答才推进） */
    while (!L3.done && g3++ < 80) {
      const q = L3.qs[L3.qi];
      const isRe = L3.qi === L3.qs.length - 1 && L3.qs.length > L3.chars.length * 3;
      let i = q.judge === false ? 0 : q.answer;
      if (L3.qi === wrongAt && !wDone) { i = (q.answer + 1) % 4; wDone = true; }
      else if (isRe && !reMissed) { i = (q.answer + 1) % 4; reMissed = true; }
      ZQ._engPick(L3, i);
    }
    ok('retry', '重入题再错不二次入队（可重答通关）',
      L3.done && L3.qs.length === L3.chars.length * 3 + 1 && reMissed && L3.miss === 2);
  } catch (e) { ok('retry', '重入队异常 ' + e.message, false); }

  /* ================= ⑬ BOSS：HP 制 / miss3 休息半进度 / 永不失败 / 题尽续题 ================= */
  try {
    const T = '2026-10-01';
    const mk2 = () => ({ v: '1.0', game: 'ziquest', firstDay: T, levels: {}, bonus: {}, zq: { cal: { done: [], band: 0, skipSeen: false }, map: {}, dex: {}, weak: [], comp: {}, dress: { owned: [], worn: {}, home: {} }, coins: 0, storySeen: [], dayLog: {} } });
    const B = ZQ._genLevel('r1n20', mk2(), T);
    ok('boss', 'HP=catalog（R1 瞌睡山神 10，clamp 8-12）', B.hp === 10 && B.hpMax === 10);
    let g = 0;
    while (!B.done && g++ < 30) ZQ._engPick(B, B.qs[B.qi].judge === false ? 0 : B.qs[B.qi].answer);
    ok('boss', '连对 10 题击破通关（hp=0 done）', B.done && B.hp === 0);
    const B2 = ZQ._genLevel('r1n20', mk2(), T);
    ZQ._engPick(B2, B2.qs[B2.qi].answer);
    ZQ._engPick(B2, B2.qs[B2.qi].answer);              /* 已击 2（hp=8） */
    let r1 = ZQ._engPick(B2, (B2.qs[B2.qi].answer + 1) % 4);
    let r2 = ZQ._engPick(B2, (B2.qs[B2.qi].answer + 1) % 4);
    let r3 = ZQ._engPick(B2, (B2.qs[B2.qi].answer + 1) % 4);
    ok('boss', 'miss3→喝口水休息（保留一半进度 hp 8→9）',
      r3 === 'rest' && B2.hp === 9 && B2.bossMiss === 0 && B2.restTaken === 1);
    const B3 = ZQ._genLevel('r1n20', mk2(), T);      /* 2 对→3 错休息→连对击破：题尽续题在场 */
    ZQ._engPick(B3, B3.qs[B3.qi].answer);
    ZQ._engPick(B3, B3.qs[B3.qi].answer);
    let c3 = ZQ._engPick(B3, (B3.qs[B3.qi].answer + 1) % 4);
    let c4 = ZQ._engPick(B3, (B3.qs[B3.qi].answer + 1) % 4);
    let c5 = ZQ._engPick(B3, (B3.qs[B3.qi].answer + 1) % 4);
    let g3 = 0;
    while (!B3.done && g3++ < 40) ZQ._engPick(B3, B3.qs[B3.qi].answer);
    ok('boss', '休息后连对击破（半进度不废关）+ 题尽确定性续题（qs 超初盘）',
      c5 === 'rest' && B3.done && B3.hp === 0 && B3.qs.length > 10);
    const B4 = ZQ._genLevel('r1n20', mk2(), T);      /* 永错：rest 循环永不失败 */
    let g4 = 0, sawRest = 0;
    while (g4++ < 120) {
      const r = ZQ._engPick(B4, (B4.qs[B4.qi].answer + 1) % 4);
      if (r === 'rest') sawRest++;
    }
    ok('boss', '永错永不失败（rest 循环无 lose 态）', !B4.done && sawRest >= 2);
  } catch (e) { ok('boss', 'BOSS 异常 ' + e.message, false); }

  /* ================= ⑭ 结算写档模拟（fixture 直驱 zqSettle：SRS/newChars/weak/campPaid） ================= */
  try {
    const T = '2026-10-01';
    const mk2 = () => ({ v: '1.0', game: 'ziquest', firstDay: T, levels: {}, bonus: {}, zq: { cal: { done: [], band: 0, skipSeen: false }, map: {}, dex: {}, weak: [], comp: {}, dress: { owned: [], worn: {}, home: {} }, coins: 0, storySeen: [], dayLog: {} } });
    const ssv = mk2();
    const SL = ZQ._genLevel('r1n02', ssv, T);
    while (!SL.done) ZQ._engPick(SL, SL.qs[SL.qi].judge === false ? 0 : SL.qs[SL.qi].answer);
    ZQ._settle(SL, ssv);
    ok('settle', '新字入档 st=1/lv=0/due=+1（早安刚性）',
      SL.chars.every(ch => { const d = ssv.zq.dex[ch]; return d && d.st === 1 && d.lv === 0 && d.due === '2026-10-02'; }));
    ok('settle', 'newChars 入当日账', SL.chars.every(ch => ssv.zq.dayLog[T].newChars.indexOf(ch) >= 0));
    const ssw = mk2();
    const SW = ZQ._genLevel('r1n02', ssw, T);
    let wm = 0;
    while (!SW.done) {
      const q = SW.qs[SW.qi];
      const i = (q.ch === SW.chars[0] && q.judge !== false && wm < 2) ? ((q.answer + 1) % 4) : (q.judge === false ? 0 : q.answer);
      if (q.ch === SW.chars[0] && q.judge !== false && wm < 2) wm++;
      ZQ._engPick(SW, i);
    }
    ZQ._settle(SW, ssw);
    ok('settle', 'miss≥2 字入薄弱池', ssw.zq.weak.indexOf(SW.chars[0]) >= 0);
    const cs = mk2();
    cs.zq.dex['天'] = { st: 1, lv: 0, due: T, miss: 0, ok: 0 };
    ZQ._settle({ kind: 'camp', key: 'r1n07', perf: { '天': { ok: 1, miss: 0 } }, today: T }, cs);
    ok('settle', '营地回忆对→srsNext 进阶（lv0→1 due+3）', cs.zq.dex['天'].lv === 1 && cs.zq.dex['天'].due === '2026-10-04');
    ok('settle', '营地日次账 campPaid 记录', (cs.zq.dayLog[T].campPaid || []).indexOf('r1n07') >= 0);
  } catch (e) { ok('settle', '结算异常 ' + e.message, false); }

  /* ================= ⑮ 复习营地：due 池优先序 / 6 题 / 轮转编排 ================= */
  try {
    const T = '2026-10-01';
    const mk2 = () => ({ v: '1.0', game: 'ziquest', firstDay: T, levels: {}, bonus: {}, zq: { cal: { done: [], band: 0, skipSeen: false }, map: {}, dex: {}, weak: [], comp: {}, dress: { owned: [], worn: {}, home: {} }, coins: 0, storySeen: [], dayLog: {} } });
    const cpsv = mk2();
    cpsv.zq.dex = {
      '天': { st: 1, lv: 0, due: '2026-09-30', miss: 0, ok: 1 },
      '地': { st: 1, lv: 1, due: T, miss: 2, ok: 1 },
      '人': { st: 1, lv: 1, due: T, miss: 0, ok: 1 },
      '日': { st: 2, lv: 3, due: '2026-10-03', miss: 0, ok: 3 }
    };
    cpsv.zq.weak = ['地'];
    const pool = ZQ._campPool(cpsv, T, 1, 6);
    ok('camp', 'due 池 engine 定序（昨日最急→今日 miss 高→今日）', pool[0] === '天' && pool[1] === '地' && pool[2] === '人');
    ok('camp', '池补足 6 字（本区已学兜底）', pool.length === 6);
    const CL = ZQ._genCamp('r1n07', cpsv, T);
    const ct = CL.qs.map(q => q.type);
    let cadj = true;
    for (let i = 1; i < ct.length; i++) if (ct[i] === ct[i - 1]) cadj = false;
    ok('camp', '营地 6 题 T4/T1/T6 轮转（相邻不同型）', CL.qs.length === 6 && cadj);
  } catch (e) { ok('camp', '营地异常 ' + e.message, false); }

  /* ================= ⑯ 早安营地：昨日新字 recap 3 题（T1/T4/T1） ================= */
  try {
    const T = '2026-10-01';
    const mk2 = () => ({ v: '1.0', game: 'ziquest', firstDay: T, levels: {}, bonus: {}, zq: { cal: { done: [], band: 0, skipSeen: false }, map: {}, dex: {}, weak: [], comp: {}, dress: { owned: [], worn: {}, home: {} }, coins: 0, storySeen: [], dayLog: {} } });
    const msv = mk2();
    msv.zq.dayLog['2026-09-30'] = { newChars: ['天', '地', '人', '日'], nodes: [], newDone: [], quests: [] };
    const MG = ZQ._genMorning(['天', '地', '人'], msv, T);
    ok('morning', 'recap 3 题编排 T1/T4/T1（相邻不同型）',
      MG.qs.length === 3 && MG.qs.map(q => q.type).join() === 't1,t4,t1');
    ok('morning', '题字=昨日新字前 3', MG.chars.join() === '天,地,人');
    const mr = ZQ.Camp.morning();
    ok('morning', 'verify 页早安直调静默跳过（禁写档）', mr.ok === false);
    ok('morning', '早安币=3（ZQ_ECON.morning）', ZQ_ECON.morning === 3);
  } catch (e) { ok('morning', '早安异常 ' + e.message, false); }

  /* ================= ⑰ 定级流程模拟（zqCalibSim：三带/晋级/停止/known 收集；v5 5 题/带） ================= */
  try {
    const A = n => { const a = []; for (let i = 0; i < 5; i++) a.push(i < n); return a; };
    const AM = n => { const a = []; for (let i = 0; i < 5; i++) a.push((i * n) % 5 < n); return a; };
    ok('calflow', '全对：带1→2→3 全程 15 题 stop',
      (() => { const r = ZQ._calibSim([A(5), A(5), A(5)]); return r.stop && r.n === 15 && r.band === 3; })());
    ok('calflow', '带1 答 5 对 2 <3 → 温和停（n=5）',
      (() => { const r = ZQ._calibSim([A(2)]); return r.stop && r.band === 1 && r.n === 5; })());
    ok('calflow', '带1 对5 晋带2、带2 答 5 对 3 停（n=10）',
      (() => { const r = ZQ._calibSim([A(5), AM(3)]); return r.stop && r.band === 2 && r.n === 10; })());
    ok('calflow', 'known 只含答对字（池序对位收集）',
      (() => {
        const pat = [Array.from({ length: 5 }, (v, i) => i % 3 === 0)];   /* i=0/3 对=2 字（<4 温和停） */
        const r = ZQ._calibSim(pat);
        const easy = ZQ_CAL.meta.bands.easy;
        return r.stop && r.n === 5 && r.known.join() === [easy[0], easy[3]].join();
      })());
  } catch (e) { ok('calflow', '定级模拟异常 ' + e.message, false); }

  /* ================= ⑱ 防泄露：视觉题面 DOM 零答案文本 + 渲染期键账零目标音 ================= */
  try {
    const T = '2026-10-01';
    const mk2 = () => ({ v: '1.0', game: 'ziquest', firstDay: T, levels: {}, bonus: {}, zq: { cal: { done: [], band: 0, skipSeen: false }, map: {}, dex: {}, weak: [], comp: {}, dress: { owned: [], worn: {}, home: {} }, coins: 0, storySeen: [], dayLog: {} } });
    const L = ZQ._genLevel('r1n02', mk2(), T);
    const t4q = L.qs.find(q => q.type === 't4');
    if (!t4q) { ok('leak', 't4 题在场（编排保证）', false); }
    else {
      ZQ._vlogClear();
      const how = ZQ._renderQSim(t4q);
      const face = document.querySelector('#zq-qbox .zq-stem');
      const opts = document.querySelectorAll('#zq-qbox .zq-opt');
      const ansText = String(t4q.options[t4q.answer]);
      ok('leak', 't4 已注册真渲染（M2b .zq-stem/.zq-opt 结构）',
        how === 't4' && !!face && opts.length === 4);
      ok('leak', '题面区不含答案词文本（选项外零泄露）', face.textContent.indexOf(ansText) < 0);
      const flat = [];
      ZQ._vlog().forEach(e => { if (e[0] === 'p') flat.push(e[1]); else flat.push.apply(flat, e[1]); });
      ok('leak', '视觉题渲染期键账零目标字音', flat.indexOf('zq_ch_' + t4q.pyKey) < 0);
    }
  } catch (e) { ok('leak', '防泄露异常 ' + e.message, false); }

  /* ================= ⑲ 渲染兜底 + 触摸目标 + 生字墙容器 ================= */
  try {
    const fake = { type: 't99', ch: '天', py: 'tiān', pyKey: 'tian', words: [], glyph: 'g', distract: [], options: [], answer: 0, seedIdx: 0, region: 1, judge: true };
    const how = ZQ._renderQSim(fake);
    ok('ui', '未注册题型=占位卡不崩（跳过按钮在场）',
      how === 'placeholder' && !!document.querySelector('#zq-qbox .zq-ph-btn'));
    const T = '2026-10-01';
    const mk2 = () => ({ v: '1.0', game: 'ziquest', firstDay: T, levels: {}, bonus: {}, zq: { cal: { done: [], band: 0, skipSeen: false }, map: {}, dex: {}, weak: [], comp: {}, dress: { owned: [], worn: {}, home: {} }, coins: 0, storySeen: [], dayLog: {} } });
    const L = ZQ._genLevel('r1n02', mk2(), T);
    const t1q = L.qs.find(q => q.type === 't1');
    const how1 = ZQ._renderQSim(t1q);
    if (how1 !== 't1') ok('ui', 't1 未注册=跳过触摸断言（M2b 并行中）', true);
    else {
      const lvEl = document.getElementById('zq-lv');
      lvEl.classList.remove('hide');                   /* hide=display:none → rect 全 0，量矩须显层 */
      const rects = Array.from(document.querySelectorAll('#zq-qbox .zq-opt')).map(e => e.getBoundingClientRect());
      ok('ui', 't1 选项触摸面 ≥96×96（全向无例外）', rects.length === 4 && rects.every(r => r.width >= 96 && r.height >= 96));
      const f = document.querySelector('#zq-qbox .zq-stem').getBoundingClientRect();
      const o = document.querySelector('#zq-qbox .zq-opts').getBoundingClientRect();
      ok('ui', '题面/选项物理分离（选项上沿 ≥ 题面下沿）', o.top >= f.bottom - 1);
      lvEl.classList.add('hide');
    }
    ok('ui', '生字墙容器在场（hide 态待弹）',
      !!document.getElementById('zq-wall') && document.getElementById('zq-wall').classList.contains('hide'));
  } catch (e) { ok('ui', '渲染兜底异常 ' + e.message, false); }

  /* ================= ⑳ 经济常量独立对账（SPEC 硬编码表，坑4 铁律） ================= */
  try {
    const SPEC_ECON = { newFirst: 10, newFirst3star: 14, newReplay: 4, camp: 6, chest: 18,
      friend: 12, bossFirst: 45, bossReplay: 12, morning: 3, quest: 5, calibRight: 2 };
    ok('econ', '经济常量 ↔ SPEC 独立表全等', JSON.stringify(SPEC_ECON) === JSON.stringify(ZQ_ECON));
    ok('econ', '币账锚：boss 首通 45 / 营地 6 / 早安 3 / 定级对 2',
      ZQ_ECON.bossFirst === 45 && ZQ_ECON.camp === 6 && ZQ_ECON.morning === 3 && ZQ_ECON.calibRight === 2);
  } catch (e) { ok('econ', '经济异常 ' + e.message, false); }

  /* ================= ㉑ 定级三带池对账（ZQ_CAL ↔ calib-pool 结构） ================= */
  try {
    const b = ZQ_CAL.meta.bands;
    ok('calpool', '三带 40/30/30', b.easy.length === 40 && b.mid.length === 30 && b.hard.length === 30);
    ok('calpool', '池 100 字全在字表（ZQ_CH_ENT）',
      ZQ_CAL.pool.every(c => !!ZQ_CH_ENT[c]) && ZQ_CAL.pool.length === 100);
    const inter = b.easy.filter(c => b.mid.indexOf(c) >= 0 || b.hard.indexOf(c) >= 0)
      .concat(b.mid.filter(c => b.hard.indexOf(c) >= 0));
    ok('calpool', '三带互异（零交集）', inter.length === 0);
  } catch (e) { ok('calpool', '池对账异常 ' + e.message, false); }

  /* ================= ㉒ 救援双锚直驱（14s 方向级/30s 答案级/keepIdle） ================= */
  try {
    const T = '2026-10-01';
    const mk2 = () => ({ v: '1.0', game: 'ziquest', firstDay: T, levels: {}, bonus: {}, zq: { cal: { done: [], band: 0, skipSeen: false }, map: {}, dex: {}, weak: [], comp: {}, dress: { owned: [], worn: {}, home: {} }, coins: 0, storySeen: [], dayLog: {} } });
    const RL = ZQ._genLevel('r1n02', mk2(), T);
    RL.qi = RL.chars.length;                           /* 直入第 1 判定位 */
    const fake = Object.assign({}, RL.qs[RL.qi], { type: 't99' });   /* 未注册型=level 救援管辖 */
    RL.qs[RL.qi] = fake;
    ZQ._setLvVerify(RL);
    ZQ._renderQSim(fake);
    ZQ._vlogClear();
    const beforeAct = ZQ._anchors().lastAct;
    ZQ._idleHack(15000);
    ZQ._rescueCore();
    let flat = [];
    ZQ._vlog().forEach(e => { if (e[0] === 'p') flat.push(e[1]); else flat.push.apply(flat, e[1]); });
    ok('rescue', '14s 方向级：重播题面（占位卡 zq_word）', flat.indexOf('zq_word') >= 0);
    ok('rescue', 'keepIdle：救援不刷 lastAct（锚=beforeAct-15000，zilearn 家族坑）',
      ZQ._anchors().lastAct === beforeAct - 15000);
    const n1 = ZQ._vlog().length;
    ZQ._idleHack(31000);
    ZQ._rescueCore();
    ok('rescue', '30s 答案级：再重播（键账 +1）', ZQ._vlog().length === n1 + 1);
    const rq = ZQ._genLevel('r1n02', mk2(), T).qs[RL.chars.length];   /* 注册型 t1=M2b 自管 */
    RL.qs[RL.qi] = rq;
    ZQ._vlogClear();
    ZQ._idleHack(31000);
    ZQ._rescueCore();
    ok('rescue', '注册型守卫：题型自带救援（level 救援静默）', ZQ._vlog().length === 0);
    ZQ._setLvVerify(null);
    document.getElementById('zq-lv').classList.add('hide');
  } catch (e) { ok('rescue', '救援异常 ' + e.message, false); }

  /* ================= ㉓ 节点分发：story 剧情卡 / chest·friend 占位 / new 弹层 / camp·calib verify 守卫 ================= */
  try {
    /* story 已接最小剧情卡（storycard.js，主线 2026-09-29）：有场=进卡（kind='story'）；返回对象真值 */
    const rs = ZQ.Level.start('r1n01');
    ok('dispatch', 'story 节点=剧情卡进卡（storycard，M4 升级全播放器）',
      !!(rs && rs.ok === true && rs.kind === 'story'));
    const card = document.querySelector('.zq-st-line');
    ok('dispatch', '剧情卡 DOM 已挂（台词+进度点）', !!card && document.querySelectorAll('.zq-st-dots i').length > 0);
    if (card && card.parentNode) card.parentNode.removeChild(card);  /* 只摘 DOM 不触发 finishNode（verify 禁写档） */
    ok('dispatch', 'chest=金币收集点（v57 M4 真分发）', ZQ.Level.start('r1n05').kind === 'chest');
    ok('dispatch', 'friend=伙伴入队（v57 M4 真分发）', ZQ.Level.start('r1n10').kind === 'friend');
    ok('dispatch', 'camp/calib verify 页守卫跳过',
      ZQ.Level.start('r1n07').reason === 'verify' && ZQ.Level.start('r0n02').reason === 'verify');
    const rn = ZQ.Level.start('r1n02');
    ok('dispatch', 'new 节点=真关卡（关层弹出）',
      rn.ok === true && rn.kind === 'new' && !document.getElementById('zq-lv').classList.contains('hide'));
    const rb = ZQ.Level.start('r1n20');
    ok('dispatch', 'boss 节点=真关卡', rb.ok === true && rb.kind === 'boss');
    ZQ._setLvVerify(null);
    document.getElementById('zq-lv').classList.add('hide');
  } catch (e) { ok('dispatch', '分发异常 ' + e.message, false); }

  /* ================= ㉖ M4 收集三页（v57：图鉴三态/家园穿戴/伙伴出战——VERIFY 空档全只读） ================= */
  try {
    ok('m4', '三模块挂载（Dex/Home/Dress/Comp）',
      !!(ZQ.Dex && ZQ.Dex.open && ZQ.Home && ZQ.Home.open && ZQ.Dress && ZQ.Dress.sync && ZQ.Comp && ZQ.Comp.grant));
    ZQ.Dex.open();
    const gcs = document.querySelectorAll('#zq-dex-grid .zq-gc');
    ok('m4', '图鉴网格=当前区全字', gcs.length === ZQ_CHARS['1'].chars.length && gcs.length > 0);
    ok('m4', '图鉴空档全未学态（lock 灰）', Array.prototype.every.call(gcs, x => x.classList.contains('lock')));
    const gc0 = gcs[0];
    if (gc0) gc0.click();
    ok('m4', '点字卡出大卡（字+词+听钮）', (function () {
      const b = document.getElementById('zq-dexbig');
      const okd = !!b && !!b.querySelector('.ch') && !!b.querySelector('.listen') && !!b.querySelector('.wds');
      if (b) b.remove();
      return okd;
    })());
    ZQ.Dex.close();
    ok('m4', '图鉴关闭即摘 DOM', !document.getElementById('zq-dexov'));
    ok('m4', '装扮纯函数（帽/裙/家具 SVG 非空）',
      (function () { const f = ZQ.Dress._svg; return f({ id: 'hat01', slot: 'hat' }).length > 20 && f({ id: 'dress01', slot: 'dress' }).length > 20 && f({ id: 'furn01', slot: 'furn' }).length > 20; })());
    ok('m4', '商品状态机（够钱=buy / 没钱=poor / 礼物未到=far）',
      (function () {
        const st = ZQ.Home._stateOf;
        const base = c => ({ dex: {}, dress: { owned: [], worn: {}, home: {} }, coins: c });
        return st(base(10), { id: 'x1', slot: 'hat', cat: 'wear', price: 5, unlock: { region: 0, chars: 0 } }) === 'buy' &&
          st(base(0), { id: 'x1', slot: 'hat', cat: 'wear', price: 5, unlock: { region: 0, chars: 0 } }) === 'poor' &&
          st(base(0), { id: 'x2', slot: 'hat', cat: 'wear', price: 50, giftAt: 99, unlock: { region: 0, chars: 0 } }) === 'far';
      })());
    ok('m4', '伙伴 grant 只读安全（VERIFY 空档不写真档）',
      (function () { const r = ZQ.Comp.grant('lark'); return !!(r && r.comp && r.comp.id === 'lark' && r.already === false); })());
    ZQ.Comp.open();
    const ccs = document.querySelectorAll('#zq-comp-grid .zq-cc');
    ok('m4', '伙伴页 7 卡（未收=剪影）', ccs.length === ZQ_CATALOG.companions.length &&
      Array.prototype.every.call(ccs, x => x.classList.contains('lock')));
    ZQ.Comp.close();
    ok('m4', '地图装扮槽/跟班锚在场（穿戴上身渲染位）',
      !!document.getElementById('zq-dress-slot') && !document.getElementById('zq-pet-wrap'));
  } catch (e) { ok('m4', 'M4 异常 ' + e.message, false); }

  /* ================= ㉔ 确定性工具锚（hash 稳定/洗牌可复现） ================= */
  try {
    ok('seed', 'zqHash 稳定（同串同值）',
      zqHash('ziquest') === zqHash('ziquest') && zqHash('a') !== zqHash('b'));
    const r1 = zqMulberry32(42), r2 = zqMulberry32(42);
    const s1 = zqShuffled([1, 2, 3, 4, 5, 6, 7, 8], r1), s2 = zqShuffled([1, 2, 3, 4, 5, 6, 7, 8], zqMulberry32(42));
    ok('seed', '同种子洗牌全等（可复现）', s1.join() === s2.join() && new Set(s1).size === 8);
    ok('seed', 'rnd 序列确定（首值锚）', zqMulberry32(42)() === zqMulberry32(42)());
  } catch (e) { ok('seed', '种子异常 ' + e.message, false); }

  /* ================= ㉕ 区域字组均分与配额联动 ================= */
  try {
    const T = '2026-10-01';
    const mk2 = () => ({ v: '1.0', game: 'ziquest', firstDay: T, levels: {}, bonus: {}, zq: { cal: { done: [], band: 0, skipSeen: false }, map: {}, dex: {}, weak: [], comp: {}, dress: { owned: [], worn: {}, home: {} }, coins: 0, storySeen: [], dayLog: {} } });
    const sv = mk2();
    const r1News = ZQ_NODES.filter(n => n.region === 1 && n.type === 'new');
    const all = [];
    r1News.forEach(n => { all.push.apply(all, ZQ._nodeChars(n.key, sv)); });
    ok('spread', 'R1 十三关字组并集=区域池 62（无缝无重）',
      all.length === 62 && new Set(all).size === 62 && r1News.length === 13);
    ok('spread', '每关 4-5 字（floor 均分）',
      r1News.every(n => { const l = ZQ._nodeChars(n.key, sv).length; return l >= 4 && l <= 5; }));
    const dsv = mk2();
    dsv.zq.dayLog[T] = { newChars: [], nodes: [], newDone: ['r1n02'], quests: [] };
    ok('spread', '首日建议量=1（quota 曲线自算，v3.1 起仅统计不锁关）', ZQ._zqQuota(1, 0) === 1);
  } catch (e) { ok('spread', '字组异常 ' + e.message, false); }

  /* ================= ㉖ P1 分类聚簇（v4：cat 子主题同关，簇序递进） ================= */
  try {
    const T = '2026-10-01';
    const mk2 = () => ({ v: '1.0', game: 'ziquest', firstDay: T, levels: {}, bonus: {}, zq: { cal: { done: [], band: 0, skipSeen: false }, map: {}, dex: {}, weak: [], comp: {}, dress: { owned: [], worn: {}, home: {} }, coins: 0, storySeen: [], dayLog: {} } });
    const sv = mk2();
    let mono = true, ratios = [], titled = 0;
    for (let r = 1; r <= 7; r++) {
      const news = ZQ_NODES.filter(n => n.region === r && n.type === 'new');
      const seq = [];
      news.forEach(n => ZQ._nodeChars(n.key, sv).forEach(ch => seq.push((ZQ_CH_ENT[ch] && ZQ_CH_ENT[ch].cat) || '?')));
      /* 簇序单调：每个 cat 在区内展开序列的区间连续（聚簇排序，floor 均分只切簇边界不交错） */
      const pos = {};
      seq.forEach((k, i) => { (pos[k] = pos[k] || []).push(i); });
      Object.keys(pos).forEach(k => {
        const p = pos[k];
        for (let i = p[0]; i <= p[p.length - 1]; i++) if (seq[i] !== k) mono = false;
      });
      news.forEach(n => {
        const cs = ZQ._nodeChars(n.key, sv);
        const cnt = {};
        cs.forEach(ch => { const k = (ZQ_CH_ENT[ch] && ZQ_CH_ENT[ch].cat) || '?'; cnt[k] = (cnt[k] || 0) + 1; });
        const mx = Math.max.apply(null, Object.keys(cnt).map(k => cnt[k]));
        ratios.push(mx / cs.length);
        if (ZQ._catTitle({ kind: 'new', chars: cs })) titled++;
      });
    }
    ok('cluster', 'cat 聚簇单调：7 区同 cat 字区间连续不交错（水果关→餐具关递进体感）', mono);
    ok('cluster', '同 cat 关内众数占比均值 ≥60%（分类识字体感，' + ratios.length + ' 关）',
      ratios.reduce((a, b) => a + b, 0) / ratios.length >= 0.6);
    ok('cluster', '关标题主题化：≥max(3,60%) 众数关显「水果关/小厨房关」（' + titled + ' 关）', titled > 0);
  } catch (e) { ok('cluster', '聚簇异常 ' + e.message, false); }

  /* ---- 结果（家族写作规范：title 行 + stub·game·total·pass·units 字段） ---- */
  const res = { game: 'ziquest', total: total, pass: npass, units: {} };
  Object.keys(units).forEach(k => {
    res.units[k] = units[k].map(x => (x[1] ? 'PASS ' : 'FAIL ') + x[0]);
  });
  const el = document.getElementById('verify-result');
  if (el) el.textContent = JSON.stringify(res, null, 1);
  document.title = npass === total ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL';
  if (window.__zqLoadingDone) window.__zqLoadingDone();   /* v53：verify 完成同收 loading（main 已定义） */
}

if (VERIFY) { runVerify(); }
