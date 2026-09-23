# -*- coding: utf-8 -*-
"""subbug _selftest — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程）
r30 谱（SPEC-R30-SUBBUG）：ch1 支架章（点虫放飞数剩）/ch2-4 盲飞章（先答后飞，答前点虫不计数，
miss≥2 解锁支架；答对 autoFly 验证演出）/ch4 一步题数绿虫自得 n + 两步加减混合 qi1(A)/qi3(B)
1. ?verify=1 → title=VERIFY PASS + JSON pass==total + layoutOk + dual=20
2a. 预置存档(跳过教学) → ch1 支架：真实 pointer 点虫放飞（角标逐只+k/M 计数）→ 真实点"重新飞"清零
    → 首错(晃+灰+不pulse正确项+零惩罚) → 答对通关 → .k-celebrate 2星 → 推进 flat=1 → 写档
2b. 全新存档 → 教学 看(吞输入)→帮→独 真实链路 → sub.tutSeen 持久化
2c. 章 4 盲飞混养（flat15）：瓢虫在场+真实点不计数 + 答前点虫不计数（盲飞）+ 子行"数绿虫" +
    qi1 两步 A 题真实链（中间态 s 错选零惩罚不 pulse → 答对 autoFly 演出）→ 真实通关 → flat16
2d. 章 2 盲飞（flat5）：答前点虫不计数+引导 → miss1 不解锁不 pulse → miss2 解锁支架（真实点击链）→
    支架恢复点虫放飞+重新飞清零 → 答对 autoFly → 通关 → flat6
3. 双 viewport(1280x800/800x1180)：overflowX==0、触摸目标 ≥64（家长按钮豁免）、虫 ≥64、
    答案按钮 ≥96、场上动物两两中心距 ≥90px
4. 全页截图非空白（PIL 像素 stdev>10）
5. 完全离线（运行时无 http(s) 请求）+ 全程 0 pageerror + MUTE 静音双保险（r19 红线，r28 function 版）
"""
import json, sys, time
from datetime import date, timedelta
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri()
SHOTS = HERE / '_shots'
SHOTS.mkdir(exist_ok=True)
TODAY = time.strftime('%Y-%m-%d')
OLD = (date.today() - timedelta(days=3)).strftime('%Y-%m-%d')   # dayIndex≥3 → 日限 12
RESULTS = []

# MUTE 静音双保险之一：页面级 init_script（r28 定稿 function 版照抄——任务书原文有括号失衡语法错）
MUTE_INIT = """Object.defineProperty(HTMLMediaElement.prototype,'muted',{set:function(){},get:function(){return true}});
window.__sfx=0;window.__spk=0;
window.speechSynthesis && (speechSynthesis.speak = function(){}, speechSynthesis.cancel = function(){});
const _aplay = Audio.prototype.play;
Audio.prototype.play = function(){ try { this.dispatchEvent(new Event('ended')); } catch(e){} return Promise.resolve(); };
const _ac = window.AudioContext || window.webkitAudioContext;
if (_ac) window.AudioContext = function(){ return {
  state:'closed',
  resume:function(){},
  createOscillator:function(){ return {
    connect:function(){ return { connect:function(){} }; },
    start:function(){}, stop:function(){}, onended:null,
    frequency:{ value:0, setValueAtTime:function(){}, linearRampToValueAtTime:function(){}, exponentialRampToValueAtTime:function(){} }
  }; },
  createGain:function(){ return {
    connect:function(){},
    gain:{ value:0, setValueAtTime:function(){}, linearRampToValueAtTime:function(){}, exponentialRampToValueAtTime:function(){} }
  }; },
  destination:{}, currentTime:0, sampleRate:44100
}; };"""


def check(name, ok, detail=''):
    RESULTS.append((name, ok, detail))
    print(('PASS' if ok else 'FAIL'), '|', name, ('| ' + str(detail) if detail else ''))
    return ok


def preset_save(tut_seen=True, done_flats=(), bonus=0):
    save = {
        'v': '1.0', 'game': 'subbug', 'firstDay': OLD, 'lastDay': TODAY,
        'levels': {}, 'dailyMin': {}, 'bonus': {TODAY: bonus},
        'settings': {'sound': False, 'tts': False, 'vol': 0},          # MUTE 双保险之二（r19）
        'restTip': {'day': '', 'shown': 0},
        'sub': {'tutSeen': tut_seen},
    }
    for f in done_flats:
        save['levels']['%d-%d' % (f // 5 + 1, f % 5)] = {'stars': 3, 'plays': 1}
    return 'localStorage.setItem("kidsgame_subbug", ' + json.dumps(json.dumps(save)) + ')'


def png_nonblank(path, floor=10.0):
    try:
        from PIL import Image
        import statistics
        im = Image.open(str(path)).convert('L').resize((160, 100))
        px = list(im.getdata())
        sd = statistics.pstdev(px)
        return sd > floor, 'PIL pixel stdev=%.1f' % sd
    except ImportError:
        n = path.stat().st_size
        return n >= 40000, 'PNG %d bytes (PIL 不可用，按体积判定)' % n


def bug_box(page, i):
    loc = page.locator('.animal[data-k="b"][data-i="%d"]' % i)
    box = loc.bounding_box()
    return loc, box


def fly_all(page, q, assert_badges=True):
    """支架章（ch1）真实 pointer 放飞：点 m 只未飞的虫，断言角标 1..M 逐只出现+flyCount 递增"""
    start = page.evaluate('SUB.currentLevel.flyCount')
    remaining = [i for i in range(q['n']) if not q['flown'][i]]
    for k in range(q['m'] - start):
        i = remaining[k]
        loc, box = bug_box(page, i)
        page.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] * 0.6)
        page.wait_for_timeout(130)
        if assert_badges:
            cls = loc.locator('.badge').get_attribute('class') or ''
            txt = loc.locator('.badge').text_content()
            if 'on' not in cls or txt != str(start + k + 1):
                check('bug #%d badge=%s' % (start + k + 1, txt), False, cls)
                return False
        fc = page.evaluate('SUB.currentLevel.flyCount')
        if fc != start + k + 1:
            check('flyCount after tap %d' % (start + k + 1), False, str(fc))
            return False
    return True


def answer_current(page, q):
    """点当前题正确答案，等推进（盲飞章 autoFly 窗自适应轮询；模型 step++ 早于 renderQuiz，
    须连 chip/按钮重渲一起等——.opt.right 清空 = 新题面已上屏）"""
    blind = q.get('mode') == 'blind'
    prev = q['step']
    page.click('.opt[data-i="%d"]' % q['answerIdx'])
    if blind:
        page.wait_for_function(
            'SUB.quiz === null || (SUB.quiz.step > %d && !document.querySelector(".opt.right"))' % prev,
            timeout=12000)
        page.wait_for_timeout(250)
    else:
        page.wait_for_timeout(1100)              # > 答对推进窗口 880ms


def play_level(page, first_wrong=False):
    """真实点击打完当前关：r30 分型——支架章每题先放飞 m 只；盲飞章直接选答案（autoFly 在页内演）
    （首题可选先错一次：晃+灰+不 pulse 正确项零惩罚）"""
    wrong_done = not first_wrong
    answered = 0
    while answered < 30:
        q = page.evaluate('SUB.quiz')
        if q is None:
            break
        if q.get('mode') != 'blind' and q['flyCount'] < q['m']:
            fly_all(page, q)                     # 支架章（ch1）：放飞后再答
        if not wrong_done:
            widx = next(i for i, v in enumerate(q['items']) if i != q['answerIdx'])
            page.click('.opt[data-i="%d"]' % widx)
            page.wait_for_timeout(700)
            grayed = page.evaluate('!!document.querySelector(".opt[data-i=\\"%d\\"].wrong")' % widx)
            pulsed = page.evaluate('!!document.querySelector(".opt[data-i=\\"%d\\"].pulse")' % q['answerIdx'])
            check('wrong pick: shake+gray / no pulse on correct (zero penalty)', grayed and not pulsed,
                  'grayed=%s pulsed=%s' % (grayed, pulsed))
            wrong_done = True
            continue
        answer_current(page, q)
        answered += 1
    page.wait_for_selector('.k-celebrate', timeout=15000)
    return answered


def main():
    offline_bad = []
    page_errors = []

    def watch(pg, tag):
        pg.on('pageerror', lambda e: page_errors.append(tag + ': ' + str(e)))
        pg.on('request', lambda r: offline_bad.append(tag + ': ' + r.url)
              if r.url.startswith('http') else None)

    with sync_playwright() as p:
        browser = p.chromium.launch()
        try:
            # ---- 1. verify=1 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(MUTE_INIT)
            pg = ctx.new_page(); watch(pg, 'verify')
            pg.goto(URL + '?verify=1')
            pg.wait_for_function("document.title.startsWith('VERIFY')", timeout=15000)
            title = pg.title()
            check('verify title', title.startswith('VERIFY PASS'), title)
            vj = json.loads(pg.locator('#verify-result').text_content())
            check('verify JSON pass==total', vj['pass'] == vj['total'] and vj['layoutOk'],
                  'pass=%s/%s dist=%s' % (vj['pass'], vj['total'], vj['dist']))
            check('verify dual-quiz census = 20 (A10/B10)',
                  vj['units']['dual']['total'] == 20 and vj['units']['dual']['ok'],
                  str(vj['units']['dual']))
            check('verify dual-viewport sims all pass',
                  all(s['pass'] for s in vj['smokes']['layout']['sims']),
                  str(vj['smokes']['layout']['sims']))
            check('verify 40-level audit all ok',
                  all(v['ok'] for v in vj['levels'].values()) and all(v['ok'] for v in vj['gen'].values()))
            check('verify smoke C (flat5 blind assist chain)', vj['smokes']['flat5']['ok'],
                  str(vj['smokes']['flat5']))
            ctx.close()

            # ---- 2a. ch1 支架章：放飞角标链路 + 重新飞清零 + 错题零惩罚 + 真实点击通关（2 星） ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(MUTE_INIT)
            ctx.add_init_script(preset_save(tut_seen=True, bonus=30))
            pg = ctx.new_page(); watch(pg, '2a')
            pg.goto(URL)
            pg.wait_for_function('window.SUB && SUB.currentLevel', timeout=8000)
            lv = pg.evaluate('SUB.currentLevel')
            check('start at 1-0 (ch 1-based, scaffold)', lv and lv['ch'] == 1 and lv['lv'] == 0, str(lv))
            q = pg.evaluate('SUB.quiz')
            check('ch1 quiz mode=scaffold', q and q['mode'] == 'scaffold' and q['type'] == 'sub', str(q)[:80])
            ok_fly = fly_all(pg, q)              # 真实 pointer：角标逐只出现
            check('real pointer taps -> badges 1..M + flyCount', ok_fly)
            cnt = pg.evaluate('SUB.currentLevel.flyCount')
            check('flyCount == m after flying all', cnt == q['m'], 'flyCount=%s m=%s' % (cnt, q['m']))
            fc_chip = pg.locator('#flycount').text_content()
            check('flycount chip shows k/M', fc_chip.replace(' ', '') == '%d/%d' % (q['m'], q['m']), fc_chip)
            pg.click('#btn-refly')               # 真实点"重新飞"：清零还原
            pg.wait_for_timeout(250)
            rc = pg.evaluate('[SUB.currentLevel.flyCount, document.querySelectorAll(".badge.on").length, document.querySelectorAll(".animal.gone").length]')
            check('refly button clears fly state', rc == [0, 0, 0], str(rc))
            n = play_level(pg, first_wrong=True)
            check('answered 5 quizzes by real click', n == 5, 'answered=%d' % n)
            stars = pg.locator('.k-celebrate .k-star').count()
            check('real-click win -> .k-celebrate 2 stars (1 retry)', stars == 2, 'stars=%d' % stars)
            pg.wait_for_timeout(3400)            # celebrate 收起+写档+推进
            lv2 = pg.evaluate('SUB.currentLevel')
            check('auto-proceed to flat=1', lv2 and lv2['flat'] == 1, str(lv2))
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_subbug")'))
            check('save 1-0 recorded (2 stars)', saved['levels'].get('1-0', {}).get('stars') == 2,
                  str(saved['levels']))
            ctx.close()

            # ---- 2b. 全新存档：教学 看(吞输入)→帮→独 真实链路 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(MUTE_INIT)
            ctx.add_init_script(preset_save(tut_seen=False, bonus=30))
            pg = ctx.new_page(); watch(pg, '2b')
            pg.goto(URL)
            pg.wait_for_function('window.SUB && SUB.currentLevel', timeout=8000)
            pg.wait_for_function("SUB.tutorial === 'watch'", timeout=5000)
            swallowed = pg.evaluate('SUB.tapBug(0)') is False    # 演示期真实/hook 输入全吞
            check('tutorial watch swallows input (locked demo)', swallowed)
            pg.wait_for_function("SUB.tutorial === 'help'", timeout=30000)   # 等"看"演示完成（放飞+答对）
            q = pg.evaluate('SUB.quiz')
            check('tutorial watch done -> level reset to quiz 0', q and q['step'] == 0 and q['flyCount'] == 0, str(q)[:60])
            try:
                pg.wait_for_function("document.getElementById('ghost').classList.contains('show')", timeout=4000)
                ghost_shown = True
            except Exception:
                ghost_shown = False
            check('tutorial help ghost -> next unflown bug / answer', ghost_shown)
            n = play_level(pg)                   # "帮"首次答对→"独"，继续通关
            check('tutorial level playable -> .k-celebrate (5 quizzes)', n == 5, 'answered=%d' % n)
            pg.wait_for_timeout(3400)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_subbug")'))
            check('sub.tutSeen persisted', (saved.get('sub') or {}).get('tutSeen') is True, str(saved.get('sub')))
            check('tutorial level 1-0 saved', '1-0' in saved['levels'], str(saved['levels']))
            ctx.close()

            # ---- 2c. 章 4 盲飞混养（flat15）：瓢虫 + 盲飞不计数 + 数绿虫子行 + 两步 A 真实链 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(MUTE_INIT)
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(15), bonus=30))
            pg = ctx.new_page(); watch(pg, '2c')
            pg.goto(URL)
            pg.wait_for_function('window.SUB && SUB.currentLevel', timeout=8000)
            lv = pg.evaluate('SUB.currentLevel')
            check('ch4 level start at flat=15', lv and lv['flat'] == 15 and lv['dch'] == 4, str(lv))
            q = pg.evaluate('SUB.quiz')          # quiz0：一步题（瓢虫在场、n 不播报）
            check('ch4 quiz0 = blind one-step',
                  q and q['mode'] == 'blind' and q['type'] == 'sub', str(q)[:80])
            others = pg.evaluate('document.querySelectorAll(".animal[data-k=\\"o\\"]").length')
            check('ch4: ladybugs on field (2-4)',
                  others == len(q['ladybugs']) and 2 <= others <= 4, 'dom=%s model=%s' % (others, len(q['ladybugs'])))
            check('ch4 prompt says count green bugs first',
                  '绿' in pg.locator('#prompt-chip .sub').text_content())
            box = pg.locator('.animal[data-k="o"]').first.bounding_box()   # 真实点瓢虫：摆动不计数
            pg.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] * 0.6)
            pg.wait_for_timeout(300)
            cnt = pg.evaluate('SUB.currentLevel.flyCount')
            check('tap ladybug: wiggle, no count (zero penalty)', cnt == 0, 'flyCount=%s' % cnt)
            loc0, box0 = bug_box(pg, 0)          # 真实点绿虫（盲飞答前）：摆动不计数
            pg.mouse.click(box0['x'] + box0['width'] / 2, box0['y'] + box0['height'] * 0.6)
            pg.wait_for_timeout(300)
            inert = pg.evaluate('[SUB.currentLevel.flyCount, document.querySelectorAll(".badge.on").length]')
            check('blind ch: tap bug pre-answer -> no fly, no badge', inert == [0, 0], str(inert))
            answer_current(pg, q)                # 盲飞：直接答对 quiz0（autoFly 验证演出页内完成）
            q1 = pg.evaluate('SUB.quiz')         # quiz1：两步 A（先减后加）
            check('ch4 qi1 = dual form A',
                  q1 and q1['type'] == 'dual' and q1['form'] == 'A' and q1['mode'] == 'blind', str(q1)[:90])
            check('dual A formula: answer == n-b+c, s == n-b',
                  q1['answer'] == q1['n'] - q1['b'] + q1['c'] and q1['s'] == q1['n'] - q1['b'],
                  'n=%s b=%s c=%s s=%s ans=%s' % (q1['n'], q1['b'], q1['c'], q1['s'], q1['answer']))
            check('dual distractors contain intermediate s', q1['s'] in q1['items'] and q1['s'] != q1['answer'],
                  'items=%s s=%s' % (q1['items'], q1['s']))
            check('dual chip shows two steps', '飞来' in pg.locator('#prompt-chip .big').text_content())
            sidx = q1['items'].index(q1['s'])    # 真实点中间态 s（经典"忘第二步"错）：零惩罚
            pg.click('.opt[data-i="%d"]' % sidx)
            pg.wait_for_timeout(700)
            wst = pg.evaluate("""idx => [!!document.querySelector('.opt[data-i="' + idx + '"].wrong'),
              !!document.querySelector('.opt.pulse'), SUB.currentLevel.retries, SUB.currentLevel.step]""", sidx)
            check('dual pick intermediate s: gray + zero penalty + no pulse (blind>=3)',
                  wst[0] and not wst[1] and wst[2] == 1 and wst[3] == 1, str(wst))
            # 两步题救援链：miss2（点另一错项）→ 解锁 → 650ms 后自动演示故事 → 重按"重新飞"=重演
            # （af 基线在演示armed前取——650ms 演示可能早于 miss2 后的读取）
            af0 = pg.evaluate('window.__autoFlyN || 0')
            d2idx = next(i for i, v in enumerate(q1['items']) if i != q1['answerIdx'] and i != sidx)
            pg.click('.opt[data-i="%d"]' % d2idx)
            pg.wait_for_timeout(700)
            u1 = pg.evaluate('[SUB.quiz.assist, SUB.currentLevel.retries]')
            check('dual miss2: assist unlocked (demo scheduled)', u1 == [True, 2], str(u1))
            pg.wait_for_function('(window.__autoFlyN || 0) > %d' % af0, timeout=8000)   # 演出计数+1=故事开演
            pg.wait_for_timeout(3200)            # 等演示收尾（b×170+420+c×170+520+650 延迟余量）
            afm = pg.evaluate('window.__autoFlyN || 0')
            pg.click('#btn-refly')               # 重按"重新飞"=重演一遍故事
            pg.wait_for_function('(window.__autoFlyN || 0) > %d' % afm, timeout=8000)
            pg.wait_for_timeout(3200)
            af2 = pg.evaluate('window.__autoFlyN || 0')
            check('dual assist: auto demo + refly replay (2 shows)', af2 == af0 + 2, 'autoFly %s->%s' % (af0, af2))
            af1 = pg.evaluate('window.__autoFlyN || 0')
            answer_current(pg, q1)               # 答对两步题：autoFly 先放 b 再飞来 c（验证演出）
            af3 = pg.evaluate('window.__autoFlyN || 0')
            check('dual right answer -> autoFly verification played', af3 == af1 + 1, 'autoFly %s->%s' % (af1, af3))
            n = play_level(pg)                   # 余下 3 题（qi2/3/4，qi3=dual B）真实通关
            check('ch4 real-click win (3 remaining quizzes)', n == 3, 'answered=%d' % n)
            pg.wait_for_timeout(3400)
            lv2 = pg.evaluate('SUB.currentLevel')
            check('ch4 win proceeds to flat=16', lv2 and lv2['flat'] == 16, str(lv2))
            ctx.close()

            # ---- 2d. 章 2 盲飞（flat5）：答前不计数 + miss2 解锁支架 + 支架放飞/重新飞 + 通关 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(MUTE_INIT)
            ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(5), bonus=30))
            pg = ctx.new_page(); watch(pg, '2d')
            pg.goto(URL)
            pg.wait_for_function('window.SUB && SUB.currentLevel', timeout=8000)
            lv = pg.evaluate('SUB.currentLevel')
            check('ch2 level start at flat=5', lv and lv['flat'] == 5 and lv['dch'] == 2, str(lv))
            q = pg.evaluate('SUB.quiz')
            check('ch2 quiz mode=blind, sub-line says calc first',
                  q and q['mode'] == 'blind' and '算' in pg.locator('#prompt-chip .sub').text_content(), str(q)[:60])
            loc0, box0 = bug_box(pg, 0)          # 答前真实点虫：摆动提示不计数
            pg.mouse.click(box0['x'] + box0['width'] / 2, box0['y'] + box0['height'] * 0.6)
            pg.wait_for_timeout(300)
            inert = pg.evaluate('[SUB.currentLevel.flyCount, document.querySelectorAll(".badge.on").length]')
            check('blind ch2: pre-answer tap inert', inert == [0, 0], str(inert))
            # miss1：真实点错（首个非答案）→ 不解锁不 pulse
            w1 = next(i for i, v in enumerate(q['items']) if i != q['answerIdx'])
            pg.click('.opt[data-i="%d"]' % w1)
            pg.wait_for_timeout(700)
            m1 = pg.evaluate('[SUB.quiz.assist, !!document.querySelector(".opt.pulse"), SUB.currentLevel.retries]')
            check('miss1: assist not unlocked, no pulse', m1 == [False, False, 1], str(m1))
            # miss2：再点另一错项 → 解锁支架（盲飞 pulse 延至 miss3，仍不 pulse）
            w2 = next(i for i, v in enumerate(q['items']) if i != q['answerIdx'] and i != w1)
            pg.click('.opt[data-i="%d"]' % w2)
            pg.wait_for_timeout(700)
            m2 = pg.evaluate('[SUB.quiz.assist, !!document.querySelector(".opt.pulse")]')
            check('miss2: assist unlocked, still no pulse (blind pulse>=3)', m2 == [True, False], str(m2))
            # r30fix minor1：miss3 尝试=重按已灰错项 → engPick 返 again 不涨 miss（3 选项题面错项仅 2 个，
            # 结构性 miss 极限=2；若误把 again 计 miss 或 pulse 阈值写 >2，正确项将 pulse——判别力断言）
            again = pg.evaluate('SUB.pick(%d)' % w1)
            pg.wait_for_timeout(400)
            m3 = pg.evaluate('[SUB.quiz.assist, !!document.querySelector(".opt.pulse"), '
                             'SUB.currentLevel.retries, SUB.currentLevel.step]')
            check('miss3 attempt: again does not raise miss, still no pulse (struct miss<=2)',
                  again == 'again' and m3 == [True, False, 2, 0], 'again=%s %s' % (again, m3))
            # 支架恢复：真实点虫放飞（角标 1）→ 重新飞清零
            loc0, box0 = bug_box(pg, 0)
            pg.mouse.click(box0['x'] + box0['width'] / 2, box0['y'] + box0['height'] * 0.6)
            pg.wait_for_timeout(300)
            flown = pg.evaluate('[SUB.currentLevel.flyCount, document.querySelectorAll(".badge.on").length]')
            check('assist unlocked: real tap flies bug (badge 1)', flown == [1, 1], str(flown))
            pg.click('#btn-refly')
            pg.wait_for_timeout(250)
            rc = pg.evaluate('[SUB.currentLevel.flyCount, document.querySelectorAll(".badge.on").length]')
            check('refly clears assist fly state', rc == [0, 0], str(rc))
            n = play_level(pg)                   # 答对当前题+余下 4 题真实通关（autoFly 页内演）
            check('ch2 real-click win (5 quizzes)', n == 5, 'answered=%d' % n)
            pg.wait_for_timeout(3400)
            lv2 = pg.evaluate('SUB.currentLevel')
            check('ch2 win proceeds to flat=6', lv2 and lv2['flat'] == 6, str(lv2))
            afn = pg.evaluate('window.__autoFlyN || 0')
            check('autoFly played once per blind quiz (5)', afn == 5, 'autoFlyN=%s' % afn)
            ctx.close()

            # ---- 3+4. 双 viewport：overflowX==0、触摸目标、距离 ≥90、答案 ≥96、截图非空白 ----
            for vp in [(1280, 800), (800, 1180)]:
                ctx = browser.new_context(viewport={'width': vp[0], 'height': vp[1]})
                ctx.add_init_script(MUTE_INIT)
                ctx.add_init_script(preset_save(tut_seen=True, done_flats=range(10), bonus=30))
                pg = ctx.new_page(); watch(pg, 'vp%d' % vp[0])
                pg.goto(URL)
                pg.wait_for_function('window.SUB && SUB.currentLevel', timeout=8000)
                pg.wait_for_timeout(900)
                m = pg.evaluate('''() => {
                  const de = document.documentElement;
                  const bad = [];
                  document.querySelectorAll('button, [data-i], .k-btn').forEach(e => {
                    if (e.classList.contains('k-parentbtn')) return;
                    const r = e.getBoundingClientRect();
                    if (r.width > 4 && r.height > 4 && (r.width < 64 || r.height < 64))
                      bad.push((e.className || e.tagName) + ':' + Math.round(r.width) + 'x' + Math.round(r.height));
                  });
                  const ans = [...document.querySelectorAll('.opt')].map(b => b.getBoundingClientRect());
                  const animals = [...document.querySelectorAll('.animal')].map(b => {
                    const r = b.getBoundingClientRect();
                    return {x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height};
                  });
                  let minD = 1e9;
                  for (let i = 0; i < animals.length; i++)
                    for (let j = i + 1; j < animals.length; j++) {
                      const d = Math.hypot(animals[i].x - animals[j].x, animals[i].y - animals[j].y);
                      if (d < minD) minD = d;
                    }
                  return {ox: de.scrollWidth - de.clientWidth, bad: bad,
                          animals: animals.length, minD: Math.round(minD),
                          hitMin: animals.length ? Math.round(Math.min(...animals.map(a => Math.min(a.w, a.h)))) : 0,
                          optW: ans.length ? Math.round(Math.min(...ans.map(r => r.width))) : 0,
                          optH: ans.length ? Math.round(Math.min(...ans.map(r => r.height))) : 0};
                }''')
                check('vp %dx%d overflowX==0' % vp, m['ox'] == 0, 'ox=%s' % m['ox'])
                check('vp %dx%d touch targets >=64' % vp, not m['bad'], str(m['bad'][:4]))
                check('vp %dx%d bugs >=64 & center-dist >=90 (dense ch3)' % vp,
                      m['hitMin'] >= 64 and m['minD'] >= 90 and m['animals'] >= 12,
                      'animals=%d hitMin=%d minD=%d' % (m['animals'], m['hitMin'], m['minD']))
                check('vp %dx%d answer opts >=96x96' % vp, m['optW'] >= 96 and m['optH'] >= 96,
                      'opt=%dx%d' % (m['optW'], m['optH']))
                shot = SHOTS / ('subbug-vp%dx%d.png' % vp)
                pg.screenshot(path=str(shot))
                ok, detail = png_nonblank(shot, floor=10.0)
                check('screenshot %dx%d non-blank (stdev>10)' % vp, ok, detail)
                if ok:
                    shot.unlink()
                ctx.close()
        finally:
            browser.close()

    # ---- 5. 完全离线 + 0 pageerror ----
    check('fully offline (no http(s) requests at runtime)', not offline_bad, str(offline_bad[:4]))
    check('zero pageerror across all scenarios', not page_errors, str(page_errors[:4]))

    n_ok = sum(1 for _, ok, _ in RESULTS if ok)
    print('\n==== SELFTEST %d/%d PASS ====' % (n_ok, len(RESULTS)))
    sys.exit(0 if n_ok == len(RESULTS) else 1)


if __name__ == '__main__':
    main()
