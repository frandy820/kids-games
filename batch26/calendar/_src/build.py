# -*- coding: utf-8 -*-
"""calendar 日历小星 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch26/calendar/_src/build.py"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch26/calendar/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')

# ---------- R37-bis 键集定稿静态对账（SPEC-R37 §R6-bis；纯静态、先于 clips 注入——键未注册期
# 后置 n_clips==84 断言红=预期（段一声明：不伪造缺失键），本段绿=键文案+链拼接式与
# quizText/confirmText/dirText 全句面字面真。r34 M1 叠字族防复发：穷举全部链拼接×
# SPEC 生成式独立复算（非实现镜像）+ 禁叠字串属性断言 ----------
import json as _json
R37BIS_KEYS = {
    # 题面骨架 7（jump 四型尾段——前段复用在册 cal_q_dr1/mr1；dateq 连词/尾段；cbound 尾段）
    'cal_q_d2': '，后天是星期几？', 'cal_q_dm2': '，前天是星期几？',
    'cal_q_m2': '，下下个月是几月？', 'cal_q_mm2': '，上上个月是几月？',
    'cal_q_dq1': '是', 'cal_q_dq2': '是星期几？', 'cal_q_cb': '，明天是几月几号？',
    # 确认骨架 5
    'cal_cf_d2': '的后天是', 'cal_cf_dm2': '的前天是',
    'cal_cf_m2': '的下下个月是', 'cal_cf_mm2': '的上上个月是', 'cal_cf_cb': '明天是',
    # 数字号词 12（dateq 锚 1-8 号∪目标 3-10 号=1-10 号；cbound 月末三十/三十一号）
    'cal_num_1': '一号', 'cal_num_2': '二号', 'cal_num_3': '三号', 'cal_num_4': '四号',
    'cal_num_5': '五号', 'cal_num_6': '六号', 'cal_num_7': '七号', 'cal_num_8': '八号',
    'cal_num_9': '九号', 'cal_num_10': '十号', 'cal_num_30': '三十号', 'cal_num_31': '三十一号',
    # cbound d1 反馈 2（两段链=月词+此键：「十月」+「没有三十二号哦」→「十月没有三十二号哦」）
    'cal_fb_cb_31': '没有三十一号哦', 'cal_fb_cb_32': '没有三十二号哦',
    # jump/dateq 数数反馈 5（s=1 差一步 / s≥2 数过头——与 dirText 生成式同构）
    'cal_fb_j_p1d': '再多数一天哦', 'cal_fb_j_m1d': '再少数一天哦',
    'cal_fb_j_p1m': '再多数一个月哦', 'cal_fb_j_m1m': '再少数一个月哦',
    'cal_fb_j_over': '数过头啦，往回数一数',
    # hint 6（兔兔/空白轻提示——与 game-main playHint 分支文案严格一致）
    'cal_hint_p2': '数一数，往后数两天', 'cal_hint_m2': '数一数，往前数两天',
    'cal_hint_p2m': '数一数，往后数两个月', 'cal_hint_m2m': '数一数，往前数两个月',
    'cal_hint_dq': '日子过两天，星期也走两天', 'cal_hint_cb': '想一想，这个月过完是哪个月',
}
assert len(R37BIS_KEYS) == 37, '§R6-bis 键集应 37 键，实得 %d' % len(R37BIS_KEYS)
# 独立重列封闭表（SPEC-R37 §R2/§R3 文字；与下方 PY_DAYS/PY_MONTHS 同源不互引）
_RB_DAYS = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日']
_RB_MONTHS = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
_RB_CB = {'一月': 31, '三月': 31, '四月': 30, '五月': 31, '六月': 30, '七月': 31,
          '八月': 31, '九月': 30, '十月': 31, '十一月': 30, '十二月': 31}
_RB_DQ_A = ['一号', '二号', '三号', '四号', '五号', '六号', '七号', '八号']       # dateq 锚
_RB_DQ_T = ['三号', '四号', '五号', '六号', '七号', '八号', '九号', '十号']       # dateq 目标=锚+2
# 拼接用到的在册键文案（manifest 绑定契约：直读 manifest 对账防漂移——今天可跑=绿）
_RB_T46 = {'cal_q_dr1': '今天是', 'cal_q_mr1': '这个月是',
           'cal_cf_fwd': '的后面是', 'cal_cf_rev': '的前面是'}
_mf = _json.load(open('F:/claudecode/projects/active/kids-games/voice/clips/manifest.json', encoding='utf-8'))
for _k, _t in _RB_T46.items():
    assert _mf[_k]['text'] == _t, 'manifest 在册键文案漂移 %s：%r != %r' % (_k, _mf[_k]['text'], _t)
# 新键「在册即一致」对账（注册前不在册=跳过不红；注册后（段二）37/37 必须全一致）
_rb_in_mf = [k for k in R37BIS_KEYS if k in _mf]
for _k in _rb_in_mf:
    assert _mf[_k]['text'] == R37BIS_KEYS[_k], 'manifest R37-bis 新键文案不一致 %s：%r != %r' % (_k, _mf[_k]['text'], R37BIS_KEYS[_k])
def _rb_join(keys):
    def t(k):
        if k in R37BIS_KEYS: return R37BIS_KEYS[k]
        if k in _RB_T46: return _RB_T46[k]
        if k.startswith('cal_d_'): return _RB_DAYS[int(k[6:])]
        if k.startswith('cal_m_'): return _RB_MONTHS[int(k[6:])]
        raise KeyError(k)
    return ''.join(t(k) for k in keys)
_han = lambda s: ''.join(c for c in s if '\u4e00' <= c <= '\u9fff')
_RB_BAN = ['号号', '是是', '月月', '天天', '下上', '后后', '前前', '星期星期', '个月个月', '一号一']
_rb_chains = []   # (用途, 键链, 期望句, 是否含标点全等)
for i, b in enumerate(_RB_DAYS):
    a2, am2 = _RB_DAYS[(i + 2) % 7], _RB_DAYS[(i - 2) % 7]
    _rb_chains += [
        ('q.day_2',  ['cal_q_dr1', 'cal_d_%d' % i, 'cal_q_d2'],   '今天是%s，后天是星期几？' % b, True),
        ('c.day_2',  ['cal_d_%d' % i, 'cal_cf_d2', 'cal_d_%d' % _RB_DAYS.index(a2)], '%s的后天是%s' % (b, a2), True),
        ('q.day_m2', ['cal_q_dr1', 'cal_d_%d' % i, 'cal_q_dm2'],  '今天是%s，前天是星期几？' % b, True),
        ('c.day_m2', ['cal_d_%d' % i, 'cal_cf_dm2', 'cal_d_%d' % _RB_DAYS.index(am2)], '%s的前天是%s' % (b, am2), True)]
for i, b in enumerate(_RB_MONTHS):
    a2, am2 = _RB_MONTHS[(i + 2) % 12], _RB_MONTHS[(i - 2) % 12]
    _rb_chains += [
        ('q.month_2',  ['cal_q_mr1', 'cal_m_%d' % i, 'cal_q_m2'],  '这个月是%s，下下个月是几月？' % b, True),
        ('c.month_2',  ['cal_m_%d' % i, 'cal_cf_m2', 'cal_m_%d' % _RB_MONTHS.index(a2)], '%s的下下个月是%s' % (b, a2), True),
        ('q.month_m2', ['cal_q_mr1', 'cal_m_%d' % i, 'cal_q_mm2'], '这个月是%s，上上个月是几月？' % b, True),
        ('c.month_m2', ['cal_m_%d' % i, 'cal_cf_mm2', 'cal_m_%d' % _RB_MONTHS.index(am2)], '%s的上上个月是%s' % (b, am2), True)]
for dn in range(8):                       # dateq 8 锚×7 星期全穷举（56 组合；逗号=段间 150ms 停顿）
    for bi in range(7):
        ans = _RB_DAYS[(bi + 2) % 7]
        _rb_chains += [
            ('q.dateq', ['cal_num_%d' % (dn + 1), 'cal_q_dq1', 'cal_d_%d' % bi,
                         'cal_num_%d' % (dn + 3), 'cal_q_dq2'],
             '%s是%s，%s是星期几？' % (_RB_DQ_A[dn], _RB_DAYS[bi], _RB_DQ_T[dn]), False),
            ('c.dateq', ['cal_num_%d' % (dn + 3), 'cal_q_dq1', 'cal_d_%d' % _RB_DAYS.index(ans)],
             '%s是%s' % (_RB_DQ_T[dn], ans), False)]
for src, end in _RB_CB.items():           # cbound 11 行：题面/确认/d1 反馈链
    nxt = _RB_MONTHS[(_RB_MONTHS.index(src) + 1) % 12]
    _rb_chains += [
        ('q.cbound', ['cal_m_%d' % _RB_MONTHS.index(src),
                      'cal_num_31' if end == 31 else 'cal_num_30', 'cal_q_cb'],
         '%s%s号，明天是几月几号？' % (src, '三十一' if end == 31 else '三十'), True),
        ('c.cbound', ['cal_cf_cb', 'cal_m_%d' % _RB_MONTHS.index(nxt), 'cal_num_1'],
         '明天是%s一号' % nxt, False),
        ('fb.cbound_d1', ['cal_m_%d' % _RB_MONTHS.index(src),
                          'cal_fb_cb_%d' % (32 if end == 31 else 31)],
         '%s没有%s号哦' % (src, '三十二' if end == 31 else '三十一'), True)]
for use, ks, exp, exact in _rb_chains:
    got = _rb_join(ks)
    assert (got == exp) if exact else (_han(got) == _han(exp)), \
        'R37-bis 拼接对账失败 %s：%r != %r（键 %s）' % (use, got, exp, ks)
    for bad in _RB_BAN:
        assert bad not in got, 'R37-bis 拼接叠字禁串 %r in %s：%r' % (bad, use, got)
# jump/dateq dirKey 三路键轨×文案对齐（穷举 kind×base×word 位次；s=0 自指=在册键不在此列）
_RB_JK = [('day_2', _RB_DAYS, 2), ('day_m2', _RB_DAYS, -2),
          ('month_2', _RB_MONTHS, 2), ('month_m2', _RB_MONTHS, -2), ('dateq', _RB_DAYS, 2)]
for kind, fam, d in _RB_JK:
    mo = 'month' in kind
    for bi in range(len(fam)):
        for wi in range(len(fam)):
            s = (wi - bi) % len(fam) if d > 0 else (bi - wi) % len(fam)
            if s == 0: continue
            if s == 1:
                key = 'cal_fb_j_%s1%s' % ('p' if d > 0 else 'm', 'm' if mo else 'd')
                txt = ('再多数' if d > 0 else '再少数') + ('一个月' if mo else '一天') + '哦'
            else:
                key, txt = 'cal_fb_j_over', '数过头啦，往回数一数'
            assert R37BIS_KEYS[key] == txt, 'dirKey 键/文案错配 %s→%s' % (kind, key)
# hint 6 键文案必须在 game-main playHint 分支字符串里（改文字面漂移即 FAIL）
for k in [k for k in R37BIS_KEYS if k.startswith('cal_hint_')]:
    assert ("'" + R37BIS_KEYS[k] + "'") in main, 'playHint 缺 hint 文案 %s：%s' % (k, R37BIS_KEYS[k])
print('R37-bis 静态对账：37 键 +%d 链穷举（含禁叠字串 %d 项）+ dirKey 三路 + hint 6 键 + manifest 在册 %d/37'
      % (len(_rb_chains), len(_RB_BAN), len(_rb_in_mf)))

# 语音 clips 注入（cal_ 81 条（T46 44 + R37-bis 37）+ core_* 3 条，manifest 对账）
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('calendar')
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
# clips 注入断言：cal_ 81 条（44+§R6-bis 37）+ core 3 条 = 84 条（SPEC-BATCH26 §3/§4 +
# T46 阶段2 38 键 + SPEC-R37 §R6-bis 37 键——键未注册期本断言红=预期（段一声明），主线注册后必绿）
CAL_KEYS = ['cal_tut_watch', 'cal_tut_turn', 'cal_hint', 'cal_right', 'cal_wrong', 'cal_q']
CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
for k in CAL_KEYS + CORE_KEYS:
    assert '"%s"' % k in clips, 'clips 缺少 %s' % k
for k in R37BIS_KEYS:
    assert '"%s"' % k in clips, 'clips 缺少 R37-bis 键 %s（§R6-bis 键集）' % k
n_clips = clips.count('data:audio/mpeg;base64,')
assert n_clips == 84, 'clips 条数 %d != 84（cal 44+37 + core 3）' % n_clips

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 2b：游戏侧契约关键符号在场（防拼错文件/漏文件）
assert "KIDS.init({ game: 'calendar'" in main, 'main 缺 KIDS.init calendar（存档键 kidsgame_calendar）'
assert 'window.CA =' in main, 'main 缺 CA 钩子'
assert '__caDemoR' in main, 'main 缺教学演示实证 __caDemoR'
# 家族契约 A：启动 dayEnd 传 lim-1（winFlow dayEnd 传 nextHint(null)——b25 任务书定版两处等价语义）
assert main.count('nextHint(lim - 1)') == 1, '启动 dayEnd nextHint(lim-1) 必须恰 1 处，实得 %d' % main.count('nextHint(lim - 1)')
assert 'nextHint(null)' in main, 'winFlow dayEnd 缺 nextHint(null)（任务书定版）'
# 家族契约 B：救援双锚（lastDir 独立节流锚在场，不与 lastAct 共享）
assert 'lastDir' in main and 'lastAct' in main, 'main 缺救援双锚 lastAct/lastDir'
# 家族契约 D：吞输入轻叮必配容器 bump
assert "replayAnim(boardEl, 'bump')" in main, 'main 缺吞输入容器 bump（家族 D）'
# b25 M4 承接：主动读题重置 lastAct（renderQuiz/startLevel 两处）
assert main.count('lastAct = Date.now()') >= 4, '主动读题/正确选择重置 lastAct 不足（renderQuiz+startLevel+交互，实得 %d）' % main.count('lastAct = Date.now()')

# ---------- 语音窗静态断言（家族 G/H；clip 实长 SPEC-BATCH26 §4 量化，ms） ----------
CAL_MS = {'cal_tut_watch': 3312, 'cal_tut_turn': 1776, 'cal_hint': 2376,
          'cal_right': 2400, 'cal_wrong': 2088, 'cal_q': 2304}
CELEBRATE_MS = 2620   # core celebrate 2300+320
# 错窗 1000ms（batch21 §0 L9 防重入）；cal_wrong 保留注入（审查 M2 修复后错反馈全程方向语义句）
assert 'await wait(1000 * SPEED)' in main, 'main 缺错点防重入窗 1000ms'
# 教学演示延窗：900+2712=3612 ≥ cal_tut_watch 3312+300（禁撞头）
assert 'await wait(2712 * SPEED)' in main, 'main 教学演示延窗 2712 缺失（900+2712 ≥ %d+300）' % CAL_MS['cal_tut_watch']
# 教学 turn 后读题延：2100 ≥ cal_tut_turn 1776+300（防尾截）
assert '2100)' in main, 'main 教学 turn 后读题延 2100 缺失（≥ %d+300）' % CAL_MS['cal_tut_turn']
# winFlow celebrate 补窗：2620+400=3020 ≥ cal_right 2400+300（判对后窗 ≥2700）
assert 'await wait(400)' in main, 'main winFlow celebrate 后补窗 400 缺失（celebrate %d+400 ≥ %d+300）' % (CELEBRATE_MS, CAL_MS['cal_right'])
# 家族 G：救援方向级 queue 接力（cal_q 用途）在场
assert 'KIDS.voice.queue' in main, 'main 缺救援 queue 接力（cal_q 引导+题面）'

# ---------- TTS 拼句窗静态断言（b25 定版强制：窗≥estMs(最长句)，estMs=345ms/汉字+600）
# estMs 定义与系数在场（data 侧）；CONFIRM_PAD ≥300（data 侧常量）
m = re.search(r'const estMs = t => (\d+) \* [^\n]+\+ (\d+);', data)
assert m and m.group(1) == '345' and m.group(2) == '600', 'data 缺 estMs=345×汉字+600 定义'
assert re.search(r'const CONFIRM_PAD = (\d+);', data) and int(re.search(r'const CONFIRM_PAD = (\d+);', data).group(1)) >= 300, \
    'data CONFIRM_PAD < 300（b25 定版 +300 余量）'
# 判对窗=动态式（800 主窗 + estMs(confirmText)+CONFIRM_PAD 收尾窗）在场
assert 'await wait(800 * SPEED)' in main, 'main 判对演出主窗 800 缺失'
assert 'estMs(confirmText' in main, 'main 判对窗缺 estMs(confirmText) 动态式（b25 定版强制）'

# Python 独立重列封闭表（SPEC-R37 §R2/§R3 文字），静态算最长句窗需求（十型确认句全枚举）
PY_DAYS = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日']
PY_MONTHS = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
PY_TNUMS = ['三号', '四号', '五号', '六号', '七号', '八号', '九号', '十号']   # dateq 目标号（锚+2）
PY_CB = [('一月', '三十一'), ('三月', '三十一'), ('四月', '三十'), ('五月', '三十一'), ('六月', '三十'),
         ('七月', '三十一'), ('八月', '三十一'), ('九月', '三十'), ('十月', '三十一'), ('十一月', '三十'),
         ('十二月', '三十一')]                                                # cbound 11 源月（无二月）
def han(s):
    return len([c for c in s if '\u4e00' <= c <= '\u9fff'])
def est(text):
    return 345 * han(text) + 600
confirms = []
for i, b in enumerate(PY_DAYS):
    confirms.append(b + '的后面是' + PY_DAYS[(i + 1) % 7])   # 接龙
    confirms.append(b + '的前面是' + PY_DAYS[(i - 1) % 7])   # 反向
    confirms.append(b + '的后天是' + PY_DAYS[(i + 2) % 7])   # day_2
    confirms.append(b + '的前天是' + PY_DAYS[(i - 2) % 7])   # day_m2
for i, b in enumerate(PY_MONTHS):
    confirms.append(b + '的后面是' + PY_MONTHS[(i + 1) % 12])
    confirms.append(b + '的前面是' + PY_MONTHS[(i - 1) % 12])
    confirms.append(b + '的下下个月是' + PY_MONTHS[(i + 2) % 12])   # month_2
    confirms.append(b + '的上上个月是' + PY_MONTHS[(i - 2) % 12])   # month_m2
    confirms.append('明天是' + PY_MONTHS[(i + 1) % 12] + '一号')    # cbound 确认
for i, t in enumerate(PY_TNUMS):                              # dateq 确认（目标号+星期词）
    confirms.append(t + '是' + PY_DAYS[i % 7])
max_conf = max(confirms, key=est)
quizzes = [b + '的后面是星期几？' for b in PY_DAYS] + \
          [b + '的后面是几月？' for b in PY_MONTHS] + \
          ['今天是' + b + '，昨天是星期几？' for b in PY_DAYS] + \
          ['这个月是' + b + '，上个月是几月？' for b in PY_MONTHS] + \
          ['今天是' + b + '，后天是星期几？' for b in PY_DAYS] + \
          ['今天是' + b + '，前天是星期几？' for b in PY_DAYS] + \
          ['这个月是' + b + '，下下个月是几月？' for b in PY_MONTHS] + \
          ['这个月是' + b + '，上上个月是几月？' for b in PY_MONTHS] + \
          [PY_TNUMS[0] + '是' + b + '，' + PY_TNUMS[7] + '是星期几？' for b in PY_DAYS] + \
          [m + e + '号，明天是几月几号？' for m, e in PY_CB]
max_quiz = max(quizzes, key=est)
assert han(max_conf) == 11 and est(max_conf) == 4395, \
    '最长确认句静态核算漂移：%s（%d 字 %dms）' % (max_conf, han(max_conf), est(max_conf))
# 判对窗合计=800+estMs(最长确认句)+300 ≥ estMs+300 ✓（800 主窗≥300 余量，恒成立防回归）
# 教学演示确认句窗同式罩满（uiTapOpt 内）；错反馈链豁免=wrongChainUntil 守卫（审查 M4）
# r34 M1 同族防复发：模板拼接禁串断言（「下上」=「下下个月/上上个月」拼接事故特征串）
for name, s in [('data', data), ('main', main)]:
    assert '下上' not in s, '%s 含拼接事故禁串「下上」' % name
    assert '后天是几月' not in s and '前天是几月' not in s, '%s 存在星期/月份题面句错配' % name
print('TTS 窗静态核算：最长确认句=%s（%d 字 est=%dms，判对窗合计 ≥%dms）；最长题面句=%s（%d 字 est=%dms）'
      % (max_conf, han(max_conf), est(max_conf), 800 + est(max_conf) + 300, max_quiz, han(max_quiz), est(max_quiz)))

html = (head + '\n' +
        '<script>\n' + core + '\n</script>\n' +
        '<script>\n' + clips + '\n</script>\n' +
        '<script>\n' + data + engine + main + verif + '\n</script>\n' +
        '</body>\n</html>\n')

# 硬性检查 3：完全离线——除 SVG xmlns 命名空间标识符外无任何 http(s)/外链
stripped = html.replace('http://www.w3.org/2000/svg', 'NS-SVG')
for bad in ['http://', 'https://', '<link', ' src=', ' href=']:
    assert bad not in stripped, f'发现外部引用: {bad}'

OUT.write_text(html, encoding='utf-8')
print('OK written:', OUT, len(html), 'chars')

# ---------- 审查 M4 链豁免静态断言：wrongChainUntil ≥ estMs(最长方向句)+300 ----------
assert "wrongChainUntil = Date.now() + 4600" in main, 'main 缺错反馈链豁免窗 wrongChainUntil=4600'
# calendar estMs=345*汉字+600；dirText 最长句 ≤10 汉字（就是今天哦，找它后面的）→ 4050+300=4350 ≤ 4600
# rev 句已单对象化（试玩 P3-a，≤8 字），最长句仍为 fwd/base 10 字
assert 4600 >= 345 * 10 + 600 + 300, '链豁免窗 4600 < estMs(10字)+300'
