# -*- coding: utf-8 -*-
"""cipher 独立复验（SPEC-BATCH19 §1+§0.40 分源）——断言从 SPEC 推导，禁从实现行为归纳
C1 确定性（抽 4 flat 双读全量 JSON 对比）/ C2 双射（可见表符号/像无重；ch3 恢复表无重无漏）
C3 Python 独立解密器逐符解码===answer（dict 构建，与游戏侧对象索引+verify 字符串正则三分源）
C4 章约束（dch 口径：1=数字 4-5 对+3-4 符/2=词 2-3 符在 WORDS/3=缺 1-2 行+例覆盖缺符号+3-5 符/4=5-6 对+4-5 符+干扰 2-3）
C5 干扰 ∉ answer 像值集 / C6 池=answer 多重集∪干扰 / C7 同关 5 题 sig 体验互异
C8 引擎直驱：错误序列拼满=miss 恰一次+零惩罚（built 清空可重选）→正确重拼推进
纪律：先等 title=VERIFY PASS（selftest 与外部审计互踩——b17）；推进轮询等 locked 消（b18）
"""
import json, os, re, sys
from collections import Counter
from playwright.sync_api import sync_playwright
sys.stdout.reconfigure(encoding='utf-8')  # GBK 控制台防崩

BASE = os.path.dirname(os.path.abspath(__file__))
URL = 'file:///' + os.path.join(BASE, 'cipher', 'index.html').replace('\\', '/') + '?verify=1'

# 词库零手抄：从 game-data.js 正则提取（Python 侧独立对账源）
src = open(os.path.join(BASE, 'cipher', '_src', 'game-data.js'), encoding='utf-8').read()
mword = re.search(r"const WORDS = \[([^\]]+)\]", src)
WORDS = set(re.findall(r"'([^']+)'", mword.group(1)))
assert len(WORDS) == 12, 'WORDS 提取异常: %d' % len(WORDS)

def is_num(s):
    return bool(re.fullmatch(r'\d', s))

def sig_of(q):  # 体验维度：孩子看到的符号集（含缺行——表全展示）+密文序+答案串
    return '|'.join([''.join(sorted(t['sym'] for t in q['table'])),
                     ''.join(q['cipher']), ''.join(q['answer'])])

def ref_decrypt(q):
    """Python 独立解密器（§0.40 分源第三实现）：dict 映射+双射校验+逐符解码。
    ch3 缺行由情报例恢复：同符号同像；恢复表与可见表合并须无冲突。"""
    full = {}
    for t in q['table']:                       # 可见行
        if t['img'] is None:
            continue
        if t['sym'] in full and full[t['sym']] != t['img']:
            return None, '可见表符号重复像'
        full[t['sym']] = t['img']
    ex = q.get('example')
    if ex:                                     # 情报例恢复缺行
        for s, p in zip(ex['cipher'], ex['plain']):
            if s in full and full[s] != p:
                return None, '情报例与表冲突'
            full[s] = p
    # 双射：符号无重（dict 天然）+像无重
    imgs = list(full.values())
    if len(set(imgs)) != len(imgs):
        return None, '像重复（非双射）'
    if any(t['img'] is not None and t['sym'] not in full for t in q['table']):
        return None, '表行缺失'
    out = []
    for s in q['cipher']:
        if s not in full:
            return None, '密文符号 %s 无映射' % s
        out.append(full[s])
    return out, None

results = []
def chk(name, ok, note=''):
    results.append((name, bool(ok), note))
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, note))

# 静音纪律（T46 阶段2 2026-09-19）：goto 前页级挂规范 INIT_SND——?verify=1 页内 stub
# 在第 4 script 块才装，加载窗口期 opening 链若触发 clip→play 拒绝→speak 回退=外放。
INIT_SND = """(() => {
  try {
    if (window.speechSynthesis) {
      speechSynthesis.speak = function () {}; speechSynthesis.cancel = function () {};
    }
  } catch (e) {}
  try {
    const proto = window.Audio.prototype;
    proto.play = function () {
      const self = this;
      setTimeout(() => { try { self.dispatchEvent(new Event('ended')); } catch (e) {} }, 5);
      return Promise.resolve();
    };
    proto.pause = function () {};
  } catch (e) {}
})();"""

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context()
    ctx.add_init_script(INIT_SND)
    pg = ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL)
    # b17 纪律：等 selftest 跑完（title 出现）才动 cur
    for _ in range(240):
        t = pg.title()
        if 'VERIFY' in t:
            break
        pg.wait_for_timeout(500)
    chk('C0 selftest 全绿+0 pageerror', 'VERIFY PASS' in pg.title() and not errs, pg.title())

    def read_quiz():
        return pg.evaluate("() => CI.quiz")

    def level_state():
        return pg.evaluate("() => CI.currentLevel ? {done:CI.currentLevel.done, step:CI.currentLevel.step, locked:CI.currentLevel.locked} : null")

    def wait_playable(tag):
        for _ in range(160):
            st = level_state()
            if st and not st['locked'] and not st['done']:
                return True
            pg.wait_for_timeout(50)
        return False

    def fill_answer(q):
        """按 answer 逐位 tapOpt 正确卡（干扰值 ∉ answer 值集 → 同值卡必属答案序）。
        tapOpt 是 async——evaluate 侧必须 await promise（promise===false 恒 false 会吞已用卡拒绝，
        answer 含重复值时拼不满=假卡死，本批实锤）。
        P1 修复后判错保留对位（built[k]=卡 idx，值恰等 answer[k] 跳过）——重拼从半程续"""
        for k in range(len(q['answer'])):
            cur = read_quiz()
            if cur and cur['built'][k] is not None and cur['opts'][cur['built'][k]]['v'] == q['answer'][k]:
                continue
            val = q['answer'][k]
            done = False
            for i, o in enumerate(q['opts']):
                if o['v'] != val:
                    continue
                r = pg.evaluate("(i) => (async () => { try { const r = await CI.tapOpt(i); return r !== false && r != null } catch(e){ return false } })()", i)
                if r:
                    done = True
                    break
            if not done:
                return False
        return True

    # ---- 全量审计：40 关 × 5 题 ----
    all_levels = {}
    c2 = c3 = c4 = c5 = c6 = c7 = 0
    bij_fail, dec_fail, ch_fail, dis_fail, pool_fail, sig_fail = [], [], [], [], [], []
    for flat in range(40):
        pg.evaluate("(f) => CI.start(f)", flat)
        if not wait_playable(flat):
            chk('C-start flat%d 可玩态' % flat, False)
            break
        qs, sigs = [], set()
        for k in range(5):
            q = read_quiz()
            qs.append(q)
            # C2+C3 双射+独立解码
            dec, err = ref_decrypt(q)
            if err:
                bij_fail.append((flat, k, err))
            if dec is None or dec != q['answer']:
                dec_fail.append((flat, k, dec, q['answer']))
            else:
                c3 += 1
            # C4 章约束（dch 口径）
            vis = [t for t in q['table'] if t['img'] is not None]
            hid = [t for t in q['table'] if t['img'] is None]
            d, bad = q['dch'], []
            if d == 1:
                if not (4 <= len(vis) <= 5) or hid: bad.append('ch1 表')
                if not (3 <= len(q['cipher']) <= 4): bad.append('ch1 密文长')
                if not all(is_num(t['img']) for t in vis): bad.append('ch1 非数字')
            elif d == 2:
                if hid: bad.append('ch2 有缺行')
                if not (2 <= len(q['cipher']) <= 3): bad.append('ch2 密文长')
                if ''.join(q['answer']) not in WORDS: bad.append('ch2 非词库')
            elif d == 3:
                if not (1 <= len(hid) <= 2): bad.append('ch3 缺行数')
                if not (3 <= len(q['cipher']) <= 5): bad.append('ch3 密文长')
                ex = q.get('example')
                exmap = dict(zip(ex['cipher'], ex['plain'])) if ex else {}
                if not all(h['sym'] in exmap for h in hid): bad.append('ch3 例未覆盖缺符号')
            elif d == 4:
                if not (5 <= len(vis) <= 6): bad.append('ch4 表')
                if not (4 <= len(q['cipher']) <= 5): bad.append('ch4 密文长')
            if bad:
                ch_fail.append((flat, k, d, bad))
            else:
                c4 += 1
            # C5+C6 干扰与池
            ans_cnt = Counter(q['answer'])
            opt_cnt = Counter(o['v'] for o in q['opts'])
            ans_vals = set(q['answer'])
            extras = opt_cnt - ans_cnt
            short = ans_cnt - opt_cnt
            if any(v in ans_vals for v in extras.elements()):
                dis_fail.append((flat, k, sorted(extras.elements())))
            else:
                c5 += 1
            if short:
                pool_fail.append((flat, k, dict(short)))
            else:
                c6 += 1
            # C7 sig 互异
            s = sig_of(q)
            if s in sigs:
                sig_fail.append((flat, k))
            sigs.add(s)
            # 推进（最后一题后 done）
            if k < 4:
                if not fill_answer(q):
                    chk('C-推进 flat%d q%d 填卡失败' % (flat, k), False)
                    break
                ok_adv = False
                for _ in range(160):
                    st = level_state()
                    if st and st['step'] == k + 1:
                        ok_adv = True
                        break
                    pg.wait_for_timeout(50)
                if not ok_adv:
                    chk('C-推进 flat%d q%d 未换题' % (flat, k), False)
                    break
                if not wait_playable(flat):
                    chk('C-推进 flat%d q%d 庆祝窗锁死' % (flat, k), False)
                    break
        all_levels[flat] = qs
        c7 += len(sigs) == 5
    chk('C2 双射+恢复无冲突（200 题）', not bij_fail, str(bij_fail[:3]))
    chk('C3 独立解密器===answer（200 题）', not dec_fail and c3 == 200, 'c3=%d %s' % (c3, dec_fail[:2]))
    chk('C4 章约束（200 题）', not ch_fail and c4 == 200, 'c4=%d %s' % (c4, ch_fail[:2]))
    chk('C5 干扰 ∉ answer 像', not dis_fail and c5 == 200, str(dis_fail[:3]))
    chk('C6 池=answer 多重集∪干扰', not pool_fail and c6 == 200, str(pool_fail[:3]))
    chk('C7 同关 5 题 sig 体验互异（40 关）', not sig_fail and c7 == 40, str(sig_fail[:3]))

    # ---- C1 确定性：抽 4 flat 双读对比 ----
    diff = []
    for flat in (0, 12, 27, 39):
        pg.evaluate("(f) => CI.start(f)", flat)
        if not wait_playable(flat):
            diff.append((flat, 'start 失败'))
            continue
        qs2 = []
        for k in range(5):
            qs2.append(read_quiz())
            if k < 4:
                q = qs2[k]
                if not fill_answer(q):
                    diff.append((flat, k, '填卡失败'))
                    break
                for _ in range(160):
                    st = level_state()
                    if st and st['step'] == k + 1:
                        break
                    pg.wait_for_timeout(50)
                wait_playable(flat)
        if [json.dumps(x, sort_keys=True) for x in qs2] != [json.dumps(x, sort_keys=True) for x in all_levels[flat]]:
            diff.append((flat, '双读不一致'))
    chk('C1 确定性（flat 0/12/27/39 双读全量一致）', not diff, str(diff[:3]))

    # ---- C8 引擎直驱：flat0 首题错误序列→零惩罚→正确重拼推进 ----
    pg.evaluate("(f) => CI.start(f)", 0)
    wait_playable(0)
    q0 = read_quiz()
    # 找一张干扰卡
    dist_i = None
    ans_vals = set(q0['answer'])
    for i, o in enumerate(q0['opts']):
        if o['v'] not in ans_vals:
            dist_i = i
            break
    seq_ok, notes = True, []
    if dist_i is not None:
        # 位 0 放干扰，其余按 answer（agent verify 同思路但此为 Python 独立驱动）
        pg.evaluate("(i) => (async () => { await CI.tapOpt(i) })()", dist_i)
        for kk in range(1, len(q0['answer'])):
            val = q0['answer'][kk]
            hit = False
            for i, o in enumerate(q0['opts']):
                if o['v'] == val and pg.evaluate("(i) => (async () => { try { const r = await CI.tapOpt(i); return r !== false && r != null } catch(e){ return false } })()", i):
                    hit = True
                    break
            if not hit:
                seq_ok = False
                notes.append('位 %d 填不进' % kk)
                break
        pg.wait_for_timeout(400)
        q1 = read_quiz()
        if not (q1 and q1['miss'] == 1):
            seq_ok = False
            notes.append('miss!=1 got %s' % (q1 and q1['miss']))
        # 1000ms 防重入窗后：错位清空、对位保留（试玩 P1 修复后新行为：built=卡 idx→值恰等）
        def cleaned(qq):
            return qq and all(b is None or qq['opts'][b]['v'] == q0['answer'][k]
                              for k, b in enumerate(qq['built']))
        for _ in range(60):
            q1 = read_quiz()
            if cleaned(q1):
                break
            pg.wait_for_timeout(50)
        if not cleaned(q1):
            seq_ok = False
            notes.append('错位未清空=%s' % (q1 and q1['built']))
        if seq_ok and fill_answer(q1 or q0):
            adv = False
            for _ in range(160):
                st = level_state()
                if st and st['step'] == 1:
                    adv = True
                    break
                pg.wait_for_timeout(50)
            if not adv:
                seq_ok = False
                notes.append('重拼后未推进')
        elif seq_ok:
            seq_ok = False
            notes.append('重拼失败')
    chk('C8 错误拼满=miss 恰一次+built 清零惩罚+重拼推进', seq_ok, ';'.join(notes))
    chk('C-end 0 pageerror（复验全程）', not errs, str(errs[:2]))
    b.close()

fails = [r for r in results if not r[1]]
print('\nTOTAL %d/%d PASS' % (len(results) - len(fails), len(results)))
sys.exit(1 if fails else 0)
