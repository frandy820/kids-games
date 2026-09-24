# -*- coding: utf-8 -*-
"""批量合成游戏语音 clips（edge-tts 晓晓：rate -8% / pitch +18Hz）
产物: clips/<key>.mp3 + manifest.json（key → text/games）
文案与游戏内字符串严格一致（shop 量词短语从 game-data.js GOODS 表正则提取，零手抄偏差）。
"""
import asyncio, json, os, re, sys, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # kids-games/
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'clips')
os.makedirs(OUT, exist_ok=True)
VOICE, RATE, PITCH = 'zh-CN-XiaoxiaoNeural', '-8%', '+18Hz'

def goods_table():
    src = open(os.path.join(ROOT, 'batch1', 'shop-math', 'build', 'game-data.js'), encoding='utf-8').read()
    pairs = re.findall(r"(\w+):\s*\{\s*name:\s*'([^']+)',\s*unit:\s*'([^']+)'", src)
    d = {k: {'name': n, 'unit': u} for k, n, u in pairs}
    assert len(d) == 4, 'GOODS 提取异常: %s' % list(d)
    return d

NUM_CN = ['一', '二', '三', '四', '五']
def num_cn(n):
    if n <= 10: return ['零','一','二','三','四','五','六','七','八','九','十'][n]
    if n < 20: return '十' + num_cn(n - 10)
    return num_cn(n // 10) + '十' + ('' if n % 10 == 0 else num_cn(n % 10))
# 2026-09-07 修：n%10==0 时原三元式丢'十'（20→'二'，men_n_20/wor_n_20 文本+音频双坏，money 开发对账抓出）

def build_manifest():
    G = goods_table()
    m = {}
    ALL = ['pipe', 'shop', 'kitchen', 'memory', 'tangram', 'color', 'math', 'pinyin', 'pattern', 'clock', 'times', 'sudoku', 'countchick', 'spotdiff', 'connect', 'words', 'compare', 'subbug', 'fishcolor', 'fruitsplit', 'hopscotch', 'neighbors', 'picto', 'worden', 'whereistand', 'mirror', 'memgrid', 'chainsum', 'simon', 'habit', 'shadow', 'shapeshome', 'sortsize', 'divide', 'fraction', 'column', 'money', 'wordprob', 'grid', 'blocks', 'multibattle', 'numberdet', 'cashier', 'logicwho', 'matchstick', 'read', 'spellen', 'idiom', 'poemfill', 'area', 'mirrormaze', 'coder2', 'stack', 'bounce', 'cipher', 'gomoku4', 'sudokunum',
           # batch20（timecalc/memduel/quiz——2026-09-13 r2 补登：quiz rebuild 曾因 core 三条 games 缺标签 5/8 FATAL，
           # agent 手改 manifest.json 只是运行时修复，真根因=ALL 漏登 batch20 三款，此处补齐防 gen_clips 重跑再冲掉）
           'timecalc', 'memduel', 'quiz',
           'feed', 'bubble', 'bridge', 'hidden', 'slide', 'colormix', 'weather', 'share', 'piano', 'shaperoof', 'trace', 'dressup', 'story3', 'emo', 'habitat', 'sign', 'season', 'calendar',
           # 2026-09-10 补：b27 agent 曾手改 manifest 加 games，gen_clips 重跑即冲掉（shapecount agent 抓出）——新批游戏一律在此登记
           'ruler', 'coin', 'notebird', 'coder', 'shapecount', 'conserve',
           # batch29（前缀 bod_/poe_/wpu_ 已核全 84 前缀无占用——b28 撞前缀双事故立规先查再用）
           'bodyen', 'poem', 'wordpuz',
           # batch30（前缀 bab_/stb_/maz_ 已核无占用；5-6 岁收官批 90/90）
           'babylove', 'storybed', 'maze',
           # batch31（前缀 anm_/rai_/chr_ 已核无占用；120 扩容批 1）
           'animalmenu', 'iftrain', 'chartread',
           # batch32（前缀 sen_/rbd_/evi_ 已核无占用；120 扩容批 2）
           'senses', 'robotdance', 'evidence', 'soundcount', 'position', 'robotpaint',
           # batch34（前缀 hc_/so_/dc_ 已核无占用；120 扩容批 4）
           'hidecup', 'sentorder', 'datacollect',
           'turntake', 'maketen', 'errdoc',
           # batch36（前缀 co_/qc_/tk_ 已核无占用——tc_/cs_ 被占实测；120 扩容批 6）
           'comfort', 'quickcmp', 'tictac',
           # batch38（前缀 st_/lb_/gr_ 已核无占用 2026-09-12 实查；120 扩容批 8）
           # st_=stamp 规律画画/lb_=libr 分类归档/gr_=gear 齿轮
           'thanks', 'plant', 'teach',
           'stamp', 'libr', 'gear',
           # batch39（前缀 crd_/etm_/cir_ 已核无占用 2026-09-12 实查——emo_ 被 b25 占 11 键改 etm_；120 扩容批 9）
           # crd_=card 贺卡工坊/etm_=etm 表情温度计/cir_=circuit 电路小灯泡
           'crd', 'etm', 'cir',
           # batch40（前缀 ins_/cbx_/brk_ 已核无占用 2026-09-12 实查——cal_ 被 b26 calendar 占 5 同名键改 cbx_；120 扩容收官批）
           # ins_=insectspider 昆虫还是蜘蛛/cbx_=coolbox 冷静工具箱/brk_=break 问题拆解小博士
           'ins', 'cbx', 'brk',
           # batch41（前缀 zi_ 已核 manifest 5517 无占用 2026-09-24 实查；第 151 款——识字小课堂主线认字）
           'zilearn']
    # core（三款共用）
    m['core_chapter_end'] = {'text': '这一章完成啦，明天还有新关卡哦', 'games': ALL}
    m['core_day_end'] = {'text': '今天的新关卡玩完啦，明天见', 'games': ALL}
    m['core_rest'] = {'text': '我的眼睛要休息啦，我们去看看远处的大树吧，明天再一起玩', 'games': ALL}
    # pipe
    m['pipe_tut_watch'] = {'text': '看！水龙头打开啦，水顺着水管流呀流，花花就开了', 'games': ['pipe']}
    m['pipe_tut_turn'] = {'text': '现在轮到你啦！点一点水管，让它转一转', 'games': ['pipe']}
    m['pipe_hint_tut'] = {'text': '点一点水管，让它转一转', 'games': ['pipe']}
    m['pipe_start'] = {'text': '把水管转一转，让水流到花盆里吧', 'games': ['pipe']}
    # shop：固定句 + 订单拼接单元
    m['shop_want'] = {'text': '我要', 'games': ['shop']}
    m['shop_and'] = {'text': '和', 'games': ['shop']}
    m['shop_recount'] = {'text': '再数一数呀', 'games': ['shop']}
    m['shop_full'] = {'text': '篮子里已经齐啦，按结账吧', 'games': ['shop']}
    m['shop_over'] = {'text': '篮子里多啦，点一点篮子里的水果，放回去一个吧', 'games': ['shop']}
    for k, g in G.items():
        m['shop_help_' + k] = {'text': '先拿一个' + g['name'] + '试试吧', 'games': ['shop']}
        for n in range(1, 21):   # r6：计数域升到 20（1-5 文案不变，幂等跳过不重合成）
            m['shop_g_%s_%d' % (k, n)] = {'text': num_cn(n) + g['unit'] + g['name'], 'games': ['shop']}
    # r6 难度改造（2026-09-13）：多件合成总价 + 预算找零 + 按群 + 方向锚反馈（新 36 固定键；
    # shop_ 前缀全量核无占用——新后缀 name_/n_/ask_total 等与既有 want/and/recount 等不撞）
    for k, g in G.items():
        m['shop_name_' + k] = {'text': g['name'], 'games': ['shop']}
    for n in range(6, 21):   # 数词元副本（预算 B/总价/找零 reveal；1-5 元用不到故从 6 起）
        m['shop_n_%d' % n] = {'text': num_cn(n) + '元', 'games': ['shop']}
    m['shop_ask_total'] = {'text': '一共几元呀，点点硬币付钱吧', 'games': ['shop']}
    m['shop_total_all'] = {'text': '一共', 'games': ['shop']}
    m['shop_group_hint'] = {'text': '大数字来啦，可以两个两个数，也可以五个五个数哦', 'games': ['shop']}
    m['shop_have'] = {'text': '我有', 'games': ['shop']}
    m['shop_buy2'] = {'text': '，想买两样', 'games': ['shop']}
    m['shop_buy3'] = {'text': '，想买三样', 'games': ['shop']}
    m['shop_paid'] = {'text': '付了', 'games': ['shop']}
    m['shop_chg_q2'] = {'text': '，买了两样，找他几元呀', 'games': ['shop']}
    m['shop_chg_q3'] = {'text': '，买了三样，找他几元呀', 'games': ['shop']}
    m['shop_need2'] = {'text': '他想买两样哦', 'games': ['shop']}
    m['shop_need3'] = {'text': '他想买三样哦', 'games': ['shop']}
    m['shop_cheap'] = {'text': '钱不够哦，换一样试试', 'games': ['shop']}
    m['shop_notwant'] = {'text': '这个不是它想要的哦', 'games': ['shop']}
    m['shop_pay_less'] = {'text': '还差一点点，再放一枚', 'games': ['shop']}
    m['shop_pay_more'] = {'text': '付多了，拿回去一枚', 'games': ['shop']}
    m['shop_chg_less'] = {'text': '少找了，再给他一枚', 'games': ['shop']}
    m['shop_chg_more'] = {'text': '多找了，拿回去一枚', 'games': ['shop']}
    # kitchen：教学 + 结算拼接
    m['kitchen_tut'] = {'text': '先看小刀切四个，然后你来试一试', 'games': ['kitchen']}
    m['kitchen_cut'] = {'text': '你切了', 'games': ['kitchen']}
    m['kitchen_cat'] = {'text': '小猫收走了', 'games': ['kitchen']}
    for n in range(1, 31):
        m['kitchen_n_%d' % n] = {'text': num_cn(n) + '个', 'games': ['kitchen']}
    # kitchen r18 难度改造（SPEC-R18-KITCHEN §6；前缀 kr_ 已核 manifest 无占用）
    m['kr_hint'] = {'text': '跟着节拍，到圈就切', 'games': ['kitchen']}
    m['kr_missmore'] = {'text': '小猫要叼走啦，跟上节拍', 'games': ['kitchen']}
    m['kr_dual'] = {'text': '左手一下，右手一下', 'games': ['kitchen']}
    # batch2 三款（文案=SPEC-BATCH2.md 定稿）
    m['mem_tut_watch'] = {'text': '看！翻一翻，找到一样的两张', 'games': ['memory']}
    m['mem_tut_turn'] = {'text': '现在你来试一试', 'games': ['memory']}
    m['mem_hint'] = {'text': '找到一样的两张', 'games': ['memory']}
    # r19 难度改造（2026-09-18，AUDIT-56 #4）：先看后翻模式/补数配对/近形干扰/错反馈句
    m['mem_peek'] = {'text': '先看仔细，记住它们的位置哦', 'games': ['memory']}
    m['mem_sum10'] = {'text': '找一找，两张合起来是十', 'games': ['memory']}
    m['mem_twin'] = {'text': '它们长得很像，要看清楚哦', 'games': ['memory']}
    m['mem_missmore'] = {'text': '没关系，再想一想', 'games': ['memory']}
    m['tan_tut_watch'] = {'text': '看！把图形放到虚线里', 'games': ['tangram']}
    m['tan_tut_turn'] = {'text': '你来试一试，转一转放进去', 'games': ['tangram']}
    m['tan_hint'] = {'text': '转一转，放到一样的形状里', 'games': ['tangram']}
    # r6 审查 m-6：col_ 前缀与 batch22 colormix 撞名（colormix 后写覆盖→color 注入拿不到走 TTS 兜底）。
    # color 侧改名 clr_ 同族（col_ 归 colormix 独占）；文本一字未动。
    m['clr_tut_watch'] = {'text': '看！点颜色，再点图画', 'games': ['color']}
    m['clr_tut_turn'] = {'text': '你来挑一个颜色吧', 'games': ['color']}
    m['clr_hint'] = {'text': '点颜色，再点图画', 'games': ['color']}
    # 2026-09-13 r6 难度改造：color 三新题型（参考图记忆配色/三原色调色/规律涂色）
    # clr_ 前缀已核 manifest 无占用（col_ 前缀 games 字段已被 batch22 colormix 覆盖占用——
    # col_* 三键 color 侧走 TTS 兜底照旧；r6 新键独立 clr_ 命名防同名键 mp3 幂等跳过错拿）
    m['clr_match_intro'] = {'text': '看看小图，涂出一模一样的', 'games': ['color']}
    m['clr_match_wrong'] = {'text': '这一格的颜色不一样哦', 'games': ['color']}
    m['clr_mix_intro'] = {'text': '两个颜色抱一抱，变出它', 'games': ['color']}
    m['clr_mix_wrong'] = {'text': '再试试别的两个颜色', 'games': ['color']}
    m['clr_pat_intro'] = {'text': '看看前面的顺序，接着涂', 'games': ['color']}
    m['clr_pat_wrong'] = {'text': '看看前面几格的顺序', 'games': ['color']}
    # batch3：math（voice-manifest.md 定稿）
    m['mat_tut_watch'] = {'text': '看！算一算，点出答案', 'games': ['math']}
    m['mat_tut_turn'] = {'text': '你来算一算', 'games': ['math']}
    m['mat_hint'] = {'text': '数一数，再选答案', 'games': ['math']}
    # batch3：pinyin 教学提示 + 音节库（SYL/ZTR_LIB/ZERO 三表全文提取 {s,r} 对，零手抄）
    m['pyi_tut_watch'] = {'text': '看！找到正确的车厢', 'games': ['pinyin']}
    m['pyi_tut_turn'] = {'text': '你来点一点', 'games': ['pinyin']}
    m['pyi_hint'] = {'text': '找一找一样的拼音', 'games': ['pinyin']}
    py_src = open(os.path.join(ROOT, 'batch3', 'pinyin', '_src', 'game-data.js'), encoding='utf-8').read()
    pairs = re.findall(r"\{s:'([^']+)',r:'([^']+)'", py_src)
    seen = set()
    for s, r in pairs:
        if s in seen: continue
        seen.add(s)
        m['py_syl_' + s] = {'text': r, 'games': ['pinyin']}
    assert len(seen) >= 150, 'pinyin 音节库提取异常: %d' % len(seen)
    # batch3：pattern（voice-manifest.md 定稿）
    m['pat_tut_watch'] = {'text': '看！找一找图案的秘密', 'games': ['pattern']}
    m['pat_tut_turn'] = {'text': '你来接着摆', 'games': ['pattern']}
    m['pat_hint'] = {'text': '看看前面的图案', 'games': ['pattern']}
    # batch4：clock（voice-manifest.md 定稿）
    m['clk_tut_watch'] = {'text': '看！读一读钟面上的时间', 'games': ['clock']}
    m['clk_tut_turn'] = {'text': '你来点一点', 'games': ['clock']}
    m['clk_hint'] = {'text': '看看长针指在哪里', 'games': ['clock']}
    # batch5：5-6 岁三款（SPEC-BATCH5.md 定稿 + 5 岁半试玩修复轮 09-06）
    m['chk_tut_watch'] = {'text': '看！数一数有几只小鸡', 'games': ['countchick']}
    m['chk_tut_turn'] = {'text': '你来数一数', 'games': ['countchick']}
    m['chk_hint'] = {'text': '点一点，数一数', 'games': ['countchick']}
    # r19 难度改造（2026-09-18，AUDIT-56 #7）：量域 11-20 十加几/两群比较/限时快数
    m['chk_ten'] = {'text': '满10只啦，接着数', 'games': ['countchick']}
    m['chk_cmp_more'] = {'text': '小鸡比小鸭多几只', 'games': ['countchick']}
    m['chk_cmp_less'] = {'text': '小鸭比小鸡少几只', 'games': ['countchick']}
    m['chk_cmp_hint'] = {'text': '先数小鸡，再数小鸭', 'games': ['countchick']}
    m['chk_flash_q'] = {'text': '看一眼，有几只小鸡', 'games': ['countchick']}
    m['chk_flash_hint'] = {'text': '别急着数，看一眼猜一猜', 'games': ['countchick']}
    m['chk_rec'] = {'text': '好，我们重新数一数', 'games': ['countchick']}
    m['spd_tut_watch'] = {'text': '看！两幅图哪里不一样', 'games': ['spotdiff']}
    m['spd_tut_turn'] = {'text': '你来点一点', 'games': ['spotdiff']}
    m['spd_hint'] = {'text': '两幅图比一比，找一找', 'games': ['spotdiff']}   # 09-06 改文案（原"再仔细看看"）
    m['spd_top'] = {'text': '用下面那幅图找一找哦', 'games': ['spotdiff']}
    m['con_tut_watch'] = {'text': '看！小动物饿了', 'games': ['connect']}
    m['con_tut_turn'] = {'text': '你来连一连', 'games': ['connect']}
    m['con_hint'] = {'text': '想一想它爱吃什么', 'games': ['connect']}
    m['con_rev'] = {'text': '从左边的小动物那里开始拖哦', 'games': ['connect']}
    # r6 难度改造新增 5 条（2026-09-13，SPEC-BATCH5 §3 r6）：题型错连锚+集合漏连救援+反向方向 hint
    m['con_w_food'] = {'text': '它不吃这个哦，再想想', 'games': ['connect']}
    m['con_w_share'] = {'text': '别的动物也爱吃它哦', 'games': ['connect']}
    m['con_w_chain'] = {'text': '想一想，谁会吃掉它', 'games': ['connect']}
    m['con_hint_anti'] = {'text': '找只有它一个爱吃的', 'games': ['connect']}
    m['con_less'] = {'text': '还差一个，再连一连', 'games': ['connect']}
    # connect 配对知识语音：从 game-data.js PAIR_VOICE 表正则提取（零手抄，与游戏内文案严格一致）
    con_src = open(os.path.join(ROOT, 'batch5', 'connect', '_src', 'game-data.js'), encoding='utf-8').read()
    kv = re.findall(r"\{\s*key:\s*'(con_pair_\w+)',\s*text:\s*'([^']+)'", con_src)
    assert len(kv) == 7, 'PAIR_VOICE 提取异常: %d' % len(kv)
    for k, t in kv:
        m[k] = {'text': t, 'games': ['connect']}
    # batch6：6-7 岁三款通用 3 条（SPEC-BATCH6.md 定稿；words 每字读音组词 clip wrd_ch_* 在
    # words agent 交付 CHARS 表后二次追加——同 pinyin py_syl 模式正则提取）
    m['wrd_tut_watch'] = {'text': '看！拼出这个字', 'games': ['words']}
    m['wrd_tut_turn'] = {'text': '你来拼一拼', 'games': ['words']}
    m['wrd_hint'] = {'text': '想一想，拼一拼', 'games': ['words']}
    m['cmp_tut_watch'] = {'text': '看！哪一边多', 'games': ['compare']}
    m['cmp_tut_turn'] = {'text': '你来比一比', 'games': ['compare']}
    m['cmp_hint'] = {'text': '数一数，比一比', 'games': ['compare']}
    m['cmp_rec'] = {'text': '好，我们重新数一数', 'games': ['compare']}   # 反方审查 m5：原复用 cmp_hint 致死文案
    m['sub_tut_watch'] = {'text': '看！小虫飞走了', 'games': ['subbug']}
    m['sub_tut_turn'] = {'text': '你来算一算', 'games': ['subbug']}
    m['sub_hint'] = {'text': '数一数，还剩几只', 'games': ['subbug']}
    # 6 岁试玩修复（REPORT-PLAYER-6yo.md）：三款 flat≥3 纠错轻语音（共性 P1）+
    # words 章4 家族辨析 / subbug 瓢虫解释与过半鼓励（P2）
    m['wrd_wrong'] = {'text': '这块不对哦，再找一找', 'games': ['words']}
    m['wrd_fam'] = {'text': '小心长得像的部件，分清它们哦', 'games': ['words']}
    m['cmp_wrong'] = {'text': '不对哦，再数一数', 'games': ['compare']}
    m['sub_wrong'] = {'text': '不对哦，再数一数', 'games': ['subbug']}
    m['sub_lady'] = {'text': '红色瓢虫不算哦，只数绿色的小虫', 'games': ['subbug']}
    m['sub_cheer'] = {'text': '快飞完啦，加油', 'games': ['subbug']}
    # batch7：5-6 岁三款通用 3 条（SPEC-BATCH7.md；颜色词/报数走 TTS say，不建 clip）
    m['fis_tut_watch'] = {'text': '看！钓指定颜色的小鱼', 'games': ['fishcolor']}
    m['fis_tut_turn'] = {'text': '你来钓一钓', 'games': ['fishcolor']}
    m['fis_hint'] = {'text': '听一听，钓什么颜色的鱼', 'games': ['fishcolor']}
    # fishcolor r7 难度改造（2026-09-13，AUDIT-56 #10）：纠错方向锚×2（不泄答案）+游散提示；
    # 两步序/间色题面句含颜色词仍走 TTS say 拼句（同 subbug 数词先例）
    m['fis_wrong'] = {'text': '不对哦，再看看颜色', 'games': ['fishcolor']}
    m['fis_wrong_seq'] = {'text': '不对哦，先钓前面说的颜色', 'games': ['fishcolor']}
    m['fis_wait'] = {'text': '小鱼游开啦，等一等再钓', 'games': ['fishcolor']}
    m['fru_tut_watch'] = {'text': '看！切水果啦', 'games': ['fruitsplit']}
    m['fru_tut_turn'] = {'text': '你来切一切', 'games': ['fruitsplit']}
    m['fru_hint'] = {'text': '听一听，想一想', 'games': ['fruitsplit']}
    # fruitsplit r7 难度改造（2026-09-13，AUDIT-56 #11）：等分选择/公平判断/切分两段判定
    # 新 5 键（与 batch7/fruitsplit/_src/game-data.js VOICE 表文本一字一致）
    m['fru_choose'] = {'text': '想一想，几个人分，就切成一样大的几块', 'games': ['fruitsplit']}
    m['fru_fair_q'] = {'text': '看一看，这样分公平吗？', 'games': ['fruitsplit']}
    m['fru_fair_yes'] = {'text': '对啦，一样大，很公平', 'games': ['fruitsplit']}
    m['fru_fair_no'] = {'text': '一边大一边小，不公平', 'games': ['fruitsplit']}
    m['fru_recut'] = {'text': '重切一下，一样大才公平', 'games': ['fruitsplit']}
    m['hop_tut_watch'] = {'text': '看！跳格子数数', 'games': ['hopscotch']}
    m['hop_tut_turn'] = {'text': '你来跳一跳', 'games': ['hopscotch']}
    m['hop_hint'] = {'text': '听一听，跳到几', 'games': ['hopscotch']}
    # r7 难度改造（AUDIT-56 #12）：mode2（跳两格章）纠错轻语音；hop_ 前缀独占，新键沿用
    m['hop_wrong2'] = {'text': '两块两块跳', 'games': ['hopscotch']}
    # words 每字读音组词 clip：从 game-data.js CHARS 表正则提取 {c,py,parts,w}（零手抄，与 chKey='wrd_ch_'+py 一致）
    wrd_src = open(os.path.join(ROOT, 'batch6', 'words', '_src', 'game-data.js'), encoding='utf-8').read()
    wrd = re.findall(r"\{\s*c:\s*'([^']+)',\s*py:\s*'([^']+)',\s*parts:\s*\[[^\]]*\],\s*w:\s*'([^']+)'", wrd_src)
    assert len(wrd) == 55, 'CHARS 提取异常: %d' % len(wrd)  # r28 扩库 48→55（声旁家族章+ch4 并章）
    assert len({p for _, p, _ in wrd}) == 55, 'py 冲突（clip key 不唯一）'
    for _, py, w in wrd:
        m['wrd_ch_' + py] = {'text': w, 'games': ['words']}
    # batch4：times（voice-manifest.md 定稿；读音单元与 game-data.js numParts/题面拼接一致）
    m['tim_tut_watch'] = {'text': '看！数一数有几条鱼', 'games': ['times']}
    m['tim_tut_turn'] = {'text': '你来算一算', 'games': ['times']}
    m['tim_hint'] = {'text': '数一数，再选答案', 'games': ['times']}
    m['tim_also'] = {'text': '也可以说', 'games': ['times']}
    m['tim_miss_hint'] = {'text': '想一想，几个几能凑成它，数一数呀', 'games': ['times']}
    NUM_CN9 = ['一', '二', '三', '四', '五', '六', '七', '八', '九']
    for i, w in enumerate(NUM_CN9, 1):
        m['tim_n%d' % i] = {'text': w, 'games': ['times']}
    m['tim_shi'] = {'text': '十', 'games': ['times']}
    m['tim_plus'] = {'text': '加', 'games': ['times']}
    m['tim_eq'] = {'text': '等于', 'games': ['times']}
    m['tim_howmuch'] = {'text': '几', 'games': ['times']}
    m['tim_times'] = {'text': '乘', 'games': ['times']}
    # batch4：sudoku（voice-manifest.md 定稿）
    m['sud_tut_watch'] = {'text': '看！每行每列都要不一样', 'games': ['sudoku']}
    m['sud_tut_turn'] = {'text': '你来填一填', 'games': ['sudoku']}
    m['sud_hint'] = {'text': '每行每列都不能重复哦', 'games': ['sudoku']}
    # batch8：neighbors（SPEC-BATCH8.md 定稿；题面数字走 TTS 拼句式）
    m['neb_tut_watch'] = {'text': '看！空房子要挂门牌号', 'games': ['neighbors']}
    m['neb_tut_turn'] = {'text': '你来挂一挂', 'games': ['neighbors']}
    m['neb_hint'] = {'text': '听一听，想一想，比几多一呀', 'games': ['neighbors']}
    m['neb_q1'] = {'text': '的邻居是几呀？比它多一', 'games': ['neighbors']}
    m['neb_q2'] = {'text': '的邻居是几呀？比它少一', 'games': ['neighbors']}
    m['neb_q4'] = {'text': '中间住的是几号呀', 'games': ['neighbors']}
    # batch8：picto（字库从 game-data.js PICTO 表正则提取——§0.18 零手抄；clip 文案='字，组词的字'）
    # r12 难度改造（2026-09-15，AUDIT-67 #8）：字库 20→40（原 20 键文案零改动幂等跳过，
    # 新 20 字音合成）+ 新增 pic_q3 字源推演题面；既有 pic_* 键文本一字不改
    m['pic_tut_watch'] = {'text': '看！古时候的人画图造字', 'games': ['picto']}
    m['pic_tut_turn'] = {'text': '你来找一找', 'games': ['picto']}
    m['pic_hint'] = {'text': '听一听，找一找', 'games': ['picto']}
    m['pic_q1'] = {'text': '看一看，古时候的画是哪个字呀', 'games': ['picto']}
    m['pic_q2'] = {'text': '看一看，哪个是它古时候的画', 'games': ['picto']}
    m['pic_q3'] = {'text': '看一看，它一步一步变成了什么字', 'games': ['picto']}   # r12 evo 题面
    pic_src = open(os.path.join(ROOT, 'batch8', 'picto', '_src', 'game-data.js'), encoding='utf-8').read()
    PICTO = re.findall(r"k:\s*'(\w+)',\s*ch:\s*'([^']+)',\s*wd:\s*'([^']+)'", pic_src)
    assert len(PICTO) == 40 and len(set(k for k, _, _ in PICTO)) == 40, 'PICTO 提取应 40 字互异: %d' % len(PICTO)
    for k, ch, wd in PICTO:
        m['pic_ch_' + k] = {'text': ch + '，' + wd + '的' + ch, 'games': ['picto']}
    # batch8：worden（词库从 game-data.js WORDS 表正则提取——§0.18 零手抄；en 发音=en-US-AnaNeural 女童声）
    m['wen_tut_watch'] = {'text': '看！小动物们有英语名字', 'games': ['worden']}
    m['wen_tut_turn'] = {'text': '你来点一点', 'games': ['worden']}
    m['wen_hint'] = {'text': '听一听，再想一想', 'games': ['worden']}
    m['wen_q1'] = {'text': '找一找，它的英语是哪一个', 'games': ['worden']}
    m['wen_q2'] = {'text': '听一听，点出你听到的单词', 'games': ['worden']}
    m['wen_q4'] = {'text': '读一读，点出它的图片', 'games': ['worden']}
    wen_src = open(os.path.join(ROOT, 'batch8', 'worden', '_src', 'game-data.js'), encoding='utf-8').read()
    # r32 难度改造（2026-09-20，SPEC-R32-WORDEN）：词库 24→48（旧 24 键文本不变幂等跳过，
    # 新 24 词 en 音合成——表提取零手抄）；断言随库扩 48
    WORDS = re.findall(r"^\s{2}(\w+):\s*\{\s*cat:\s*'[^']+',\s*zh:\s*'[^']+'", wen_src, re.M)
    assert len(WORDS) == 48 and len(set(WORDS)) == 48, 'WORDS 提取应 48 词互异: %d' % len(WORDS)
    for w in WORDS:
        m['wen_w_' + w] = {'text': w, 'games': ['worden'], 'voice': 'en-US-AnaNeural'}
    # batch9：whereistand/mirror/memgrid（SPEC-BATCH9 §1/2/3 定稿；ordinal 题面走整句 TTS 不建 clip；
    # 文案为固定指令句=与各款 game-data VOICE 表严格同文——无表提取需求，复验时 grep 比对）
    m['wis_tut_watch'] = {'text': '看！小动物们排好队啦', 'games': ['whereistand']}
    m['wis_tut_turn'] = {'text': '你来点一点', 'games': ['whereistand']}
    m['wis_hint'] = {'text': '听一听，想一想', 'games': ['whereistand']}
    m['wis_q_up'] = {'text': '谁在最上面呀', 'games': ['whereistand']}
    m['wis_q_down'] = {'text': '谁在最下面呀', 'games': ['whereistand']}
    m['wis_q_left'] = {'text': '谁在最左边呀', 'games': ['whereistand']}
    m['wis_q_right'] = {'text': '谁在最右边呀', 'games': ['whereistand']}
    m['mir_tut_watch'] = {'text': '看！镜子里的图画', 'games': ['mirror']}
    m['mir_tut_turn'] = {'text': '你来贴一贴', 'games': ['mirror']}
    m['mir_hint'] = {'text': '想一想，镜子里是什么样子', 'games': ['mirror']}
    m['mir_q_v'] = {'text': '镜子右边该贴哪一张呀', 'games': ['mirror']}
    m['mir_q_h'] = {'text': '镜子下面该贴哪一张呀', 'games': ['mirror']}
    m['mg_tut_watch'] = {'text': '看！亮起来的格子要记住哦', 'games': ['memgrid']}
    m['mg_tut_turn'] = {'text': '你来点一点', 'games': ['memgrid']}
    m['mg_hint'] = {'text': '想一想，刚才哪里亮过呀', 'games': ['memgrid']}
    m['mg_q'] = {'text': '记住亮起来的格子哦', 'games': ['memgrid']}
    # batch10：chainsum/simon/habit（SPEC-BATCH10 §1/2/3 定稿；chainsum 题面=动态数词 TTS 拼句不建 clip；
    # habit 流程名 6 条静态 clip；simon 键音=Web Audio 合成无 clip）
    m['cs_tut_watch'] = {'text': '看！小火车接数字啦', 'games': ['chainsum']}
    m['cs_tut_turn'] = {'text': '你来接一接', 'games': ['chainsum']}
    m['cs_hint'] = {'text': '算一算，下一节是几', 'games': ['chainsum']}
    m['si_tut_watch'] = {'text': '看！小兔子敲小鼓啦', 'games': ['simon']}
    m['si_tut_turn'] = {'text': '你来敲一敲', 'games': ['simon']}
    m['si_hint'] = {'text': '听一听，跟着敲一敲', 'games': ['simon']}
    m['si_replay'] = {'text': '再看一遍哦', 'games': ['simon']}
    m['hb_tut_watch'] = {'text': '看！这些事情有先后哦', 'games': ['habit']}
    m['hb_tut_turn'] = {'text': '你来排一排', 'games': ['habit']}
    m['hb_hint'] = {'text': '想一想，先做什么', 'games': ['habit']}
    m['hb_q_xishou'] = {'text': '洗手', 'games': ['habit']}
    m['hb_q_qichuang'] = {'text': '起床', 'games': ['habit']}
    m['hb_q_shuaya'] = {'text': '刷牙', 'games': ['habit']}
    m['hb_q_chuanyi'] = {'text': '穿衣', 'games': ['habit']}
    m['hb_q_guomal'] = {'text': '过马路', 'games': ['habit']}
    m['hb_q_shuijiao'] = {'text': '睡觉', 'games': ['habit']}
    # r5 难度改造：流程库 6→12，新序列题面 clip（batch10 habit r5）
    m['hb_q_baojiaozi'] = {'text': '包饺子', 'games': ['habit']}
    m['hb_q_zhonghua'] = {'text': '种花', 'games': ['habit']}
    m['hb_q_jixin'] = {'text': '寄信', 'games': ['habit']}
    m['hb_q_kaodangao'] = {'text': '烤蛋糕', 'games': ['habit']}
    m['hb_q_xizao'] = {'text': '洗澡', 'games': ['habit']}
    m['hb_q_xiyi'] = {'text': '洗衣服', 'games': ['habit']}
    # batch11：shadow/shapeshome/sortsize（SPEC-BATCH11 §1/2/3 定稿；三款题面=动态 TTS 拼句
    # （物品名/颜色形状词/方向词）不建 clip，承 batch7 颜色词先例）
    m['sha_tut_watch'] = {'text': '看！小影子和它的小伙伴', 'games': ['shadow']}
    m['sha_tut_turn'] = {'text': '你来连一连', 'games': ['shadow']}
    m['sha_hint'] = {'text': '找一找一样的影子', 'games': ['shadow']}
    m['shp_tut_watch'] = {'text': '看！图形要回自己的家', 'games': ['shapeshome']}
    m['shp_tut_turn'] = {'text': '你来送一送', 'games': ['shapeshome']}
    m['shp_hint'] = {'text': '看一看，和家一样的图形', 'games': ['shapeshome']}
    m['sor_tut_watch'] = {'text': '看！大个小个排排队', 'games': ['sortsize']}
    m['sor_tut_turn'] = {'text': '你来排一排', 'games': ['sortsize']}
    m['sor_hint'] = {'text': '比一比大小，排一排试试哦', 'games': ['sortsize']}   # 试玩 P2④：原"听一听"静音场景自相矛盾，改中性
    # batch11 题面句 clip 化（真机反馈 2026-09-07：题面动态 TTS=浏览器系统合成音机械无情感——
    # 封闭库全组合 clip 化走晓晓，系统 TTS 仅留缺 clip 兜底）：shadow 15 / shp 6×4+4 / sor 2 / 规则句 2
    sha_src = open(os.path.join(ROOT, 'batch11', 'shadow', '_src', 'game-data.js'), encoding='utf-8').read()
    LIBS = re.findall(r"^  (\w+):\s*\{ e: '[^']+', n: '([^']+)', g: '\w+' \}", sha_src, re.M)
    assert len(LIBS) == 15, 'shadow LIB 提取异常: %d' % len(LIBS)
    for sid, n in LIBS:
        m['sha_q_' + sid] = {'text': '找一找，谁的影子是' + n + '呀', 'games': ['shadow']}
    # r8 难度改造新增（2026-09-14，AUDIT-56 #13）：overlap 重叠双选题面 + 教学/提示句新键。
    # 旧 sha_tut_watch/tut_turn/hint 三键在下方 batch23/share 段被同名覆盖（games=['share']，
    # 2026-09-10 撞车事故登记）——shadow 侧改用新键且文本一字未改；share 段与其游戏不动。
    # 4 新键已核 manifest 无占用（sha_teach_*/sha_help/sha_q_pair 不与 share 的 sha_right/plate 撞）。
    m['sha_q_pair'] = {'text': '这两个影子叠在一起啦，找一找是谁的影子呀', 'games': ['shadow']}
    m['sha_teach_watch'] = {'text': '看！小影子和它的小伙伴', 'games': ['shadow']}
    m['sha_teach_turn'] = {'text': '你来连一连', 'games': ['shadow']}
    m['sha_help'] = {'text': '找一找一样的影子', 'games': ['shadow']}
    shp_src = open(os.path.join(ROOT, 'batch11', 'shapeshome', '_src', 'game-data.js'), encoding='utf-8').read()
    CS = re.findall(r"^  (\w+):\s*\{ name: '([^']+)', hex:", shp_src, re.M)
    SS = re.findall(r"^  (\w+):\s*\{ name: '([^']+)', draw", shp_src, re.M)
    assert len(CS) == 6 and len(SS) == 4, 'shp 颜色/形状表提取异常: %d/%d' % (len(CS), len(SS))
    for cid, cn in CS:
        for sid, sn in SS:
            m['shp_q_%s_%s' % (cid, sid)] = {'text': '找一找，' + cn + '的' + sn, 'games': ['shapeshome']}
    for sid, sn in SS:
        m['shp_q_shape_' + sid] = {'text': '找一找，' + sn, 'games': ['shapeshome']}
    m['sor_q_big'] = {'text': '从最大的开始，排一排', 'games': ['sortsize']}
    m['sor_q_small'] = {'text': '从最小的开始，排一排', 'games': ['sortsize']}
    # r19 难度改造（2026-09-18，AUDIT-56 #15）：双属性排序（一样大时红/蓝在前）+序数题「第 N 个」
    m['sor_q_dbr'] = {'text': '从最大的开始排，一样大的，红皮球排在前面', 'games': ['sortsize']}
    m['sor_q_dbb'] = {'text': '从最大的开始排，一样大的，蓝皮球排在前面', 'games': ['sortsize']}
    m['sor_q_dsr'] = {'text': '从最小的开始排，一样大的，红皮球排在前面', 'games': ['sortsize']}
    m['sor_q_dsb'] = {'text': '从最小的开始排，一样大的，蓝皮球排在前面', 'games': ['sortsize']}
    for n, cn in [(2, '二'), (3, '三'), (4, '四'), (5, '五')]:
        m['sor_q_ob%d' % n] = {'text': '从最大的开始数，第%s个，是哪一个呀' % cn, 'games': ['sortsize']}
        m['sor_q_os%d' % n] = {'text': '从最小的开始数，第%s个，是哪一个呀' % cn, 'games': ['sortsize']}
    m['shp_rule2'] = {'text': '这一章只看形状哦，颜色不一样也没关系', 'games': ['shapeshome']}
    m['shp_rule3'] = {'text': '这一章要颜色和形状都一样哦', 'games': ['shapeshome']}
    # r8 难度改造（2026-09-14，AUDIT-56 #14）：三维(色+形+大小)/否定条件/九宫格缺格 三新题型
    # 题面句 clip 化（源表正则提取零手抄；既有 33 键文本一字不改不删注册，旧 shp_q_*/rule2/3 留存）
    SZ = re.findall(r"^  (\w+):\s*\{ name: '([^']+)', scale:", shp_src, re.M)
    assert len(SZ) == 2, 'shp 大小表提取异常: %d' % len(SZ)
    for cid, cn in CS:
        for sid, sn in SS:
            for zid, zn in SZ:
                m['shp_q3_%s_%s_%s' % (cid, sid, zid)] = {'text': '找一找，' + cn + '的' + zn + sn, 'games': ['shapeshome']}
    for cid, cn in CS:
        for sid, sn in SS:
            m['shp_nq_%s_%s' % (cid, sid)] = {'text': '找一找，不是' + cn + '、也不是' + sn + '的', 'games': ['shapeshome']}
    m['shp_gq'] = {'text': '看一看，每行形状一样，每列颜色一样，问号是哪一个', 'games': ['shapeshome']}
    m['shp_rule_neg'] = {'text': '这一章要反过来找，不是红色、也不是圆形的，才是答案哦', 'games': ['shapeshome']}
    m['shp_rule_grid'] = {'text': '这一章要看规律，每一行形状一样，每一列颜色一样，找出问号', 'games': ['shapeshome']}
    m['shp_rule_mix'] = {'text': '这一章什么题都有，还有很像的颜色，要看仔细哦', 'games': ['shapeshome']}
    # batch12：divide/fraction/column（SPEC-BATCH12 §1/2/3 定稿；§0.23 题面拼接单元走 queue，
    # tim_n_* 数词模式——各游戏 clips 按 games 注入，须建本游戏自己的数词副本）
    m['div_tut_watch'] = {'text': '看！糖果分一分', 'games': ['divide']}
    m['div_tut_turn'] = {'text': '你来分一分', 'games': ['divide']}
    m['div_hint'] = {'text': '一人一颗轮着分', 'games': ['divide']}
    m['div_q1'] = {'text': '颗糖，平均分给', 'games': ['divide']}
    m['div_q2'] = {'text': '个小朋友', 'games': ['divide']}
    m['div_q3'] = {'text': '每人几颗呀', 'games': ['divide']}
    m['div_rem1'] = {'text': '剩下一颗不够分啦', 'games': ['divide']}
    m['div_rem2'] = {'text': '剩下两颗不够分啦', 'games': ['divide']}
    DIV_CN = {2: '二', 3: '三', 4: '四', 5: '五', 6: '六', 7: '七', 8: '八', 9: '九', 10: '十', 11: '十一', 12: '十二'}
    for n, w in DIV_CN.items():
        m['div_n_%d' % n] = {'text': w, 'games': ['divide']}
    m['fra_tut_watch'] = {'text': '看！披萨切一切', 'games': ['fraction']}
    m['fra_tut_turn'] = {'text': '你来挑一挑', 'games': ['fraction']}
    m['fra_hint'] = {'text': '看一看，每份一样大', 'games': ['fraction']}
    m['fra_f_1_2'] = {'text': '二分之一', 'games': ['fraction']}
    m['fra_f_1_3'] = {'text': '三分之一', 'games': ['fraction']}
    m['fra_f_1_4'] = {'text': '四分之一', 'games': ['fraction']}
    m['fra_f_2_3'] = {'text': '三分之二', 'games': ['fraction']}
    m['fra_f_2_4'] = {'text': '四分之二', 'games': ['fraction']}
    m['fra_f_3_4'] = {'text': '四分之三', 'games': ['fraction']}
    m['fra_q_cut'] = {'text': '哪一个平均分成了', 'games': ['fraction']}
    m['fra_q_cut2'] = {'text': '份', 'games': ['fraction']}
    m['fra_q_read'] = {'text': '涂色部分是几分之几', 'games': ['fraction']}
    m['fra_q_cmp'] = {'text': '哪一块大', 'games': ['fraction']}
    # 审查 M1（batch12）：A 型题面数词段 clip 化（原 key:null TTS 兜底=§0.23 违约，正常游玩触达系统合成音）
    m['fra_num_2'] = {'text': '两', 'games': ['fraction']}
    m['fra_num_3'] = {'text': '三', 'games': ['fraction']}
    m['fra_num_4'] = {'text': '四', 'games': ['fraction']}
    # 审查 m5：答错轻语音 clip 化（高频路径禁系统 TTS 音色跳变；column 已复用 clm_hint 无跳变不动）
    m['div_wrong'] = {'text': '再想一想，数一数盘子里的糖', 'games': ['divide']}
    m['fra_wrong'] = {'text': '再想一想，看一看每份', 'games': ['fraction']}
    # fraction r15 难度改造（2026-09-16，AUDIT-78:78）：ch5 一样大章 eq 等值题面句 clip 化（§0.23；
    # 既有 fra_ 17 键一字不改；cmp 同分母对复用 fra_q_cmp、eq 答案反馈复用六分数词——仅此 1 新键）
    m['fra_q_eq'] = {'text': '哪一块和它一样大', 'games': ['fraction']}
    # column 键前缀=clm_（col_ 已被 batch2 color 占用——同名键 mp3 幂等跳过会拿到 color 旧音频，2026-09-07 对账抓出）
    m['clm_tut_watch'] = {'text': '看！竖式算一算', 'games': ['column']}
    m['clm_tut_turn'] = {'text': '你来填一填', 'games': ['column']}
    m['clm_hint'] = {'text': '先算个位，再算十位', 'games': ['column']}
    m['clm_q_add'] = {'text': '加法竖式，算一算', 'games': ['column']}
    m['clm_q_sub'] = {'text': '减法竖式，算一算', 'games': ['column']}
    # column r15 难度改造（2026-09-16，AUDIT-78:79 黄款定案：每关 8 题+自己点亮进位小 1/退位点
    # 操作步+ch4 两步竖式+三位数扩位）：进退位标记句×2+方向锚×2+两步题面/换步句×2。
    # 既有 5 键一字不改零重合成（幂等跳过）；新 6 键已核 manifest 无占用（2026-09-16 实查）；
    # 文案与 batch12/column/_src/game-data.js VOICE 表严格一致。
    m['clm_q_two'] = {'text': '两步竖式，算一算', 'games': ['column']}
    m['clm_q_step2'] = {'text': '第二步，接着算', 'games': ['column']}
    m['clm_carry_go'] = {'text': '满十啦，点亮小 1', 'games': ['column']}
    m['clm_borrow_go'] = {'text': '不够减，点亮退位点', 'games': ['column']}
    m['clm_no_carry'] = {'text': '这题不用进位哦', 'games': ['column']}
    m['clm_no_borrow'] = {'text': '这题不用退位哦', 'games': ['column']}
    # batch13：money/wordprob/grid（SPEC-BATCH13 §1/2/3 定稿；wordprob 模板段待 agent 交付模板表后二次提取
    # ——同 words wrd_ch 先例；数词各游戏自建副本 §0.25）
    m['men_tut_watch'] = {'text': '看！钱币点一点', 'games': ['money']}
    m['men_tut_turn'] = {'text': '你来付一付', 'games': ['money']}
    m['men_hint'] = {'text': '算一算，正好的钱', 'games': ['money']}
    m['men_wrong'] = {'text': '再想一想，算一算多少钱', 'games': ['money']}
    m['men_q_buy'] = {'text': '买', 'games': ['money']}
    m['men_q_buy2'] = {'text': '元的东西，点出正好的钱', 'games': ['money']}
    m['men_q_pay'] = {'text': '付了', 'games': ['money']}
    m['men_q_pay2'] = {'text': '元，买', 'games': ['money']}
    m['men_q_pay3'] = {'text': '元的东西，找回几元呀', 'games': ['money']}
    # ch4 带角价段：整条尾句（审查 m2：原'元五角'+qpay3 拼"元五角元的东西"病句，clip 链与 TTS 兜底同根）
    m['men_q_jiao'] = {'text': '元五角的东西，找回几元呀', 'games': ['money']}
    for n in range(1, 21):
        m['men_n_%d' % n] = {'text': num_cn(n), 'games': ['money']}
    # money r15 难度改造（2026-09-16，AUDIT-78:80 黄款定案：ch1 起步含 5 角/找零改数字键盘/
    # 加「买两件合计」/多币组合）：题面段新 3 键——ch1 角价尾句（整条含指令，照 men_q_jiao
    # 病句教训）+ ch2 买两件接续段两态；既有 30 键一字不改零重合成（幂等跳过）。新键已核
    # manifest 无占用；文案与 SPEC-BATCH13 §1 r15 真值现行版一致。
    m['men_q_buy_j'] = {'text': '元五角的东西，点出正好的钱', 'games': ['money']}
    m['men_q_and'] = {'text': '元的和', 'games': ['money']}
    m['men_q_and_j'] = {'text': '元五角的和', 'games': ['money']}
    m['wor_tut_watch'] = {'text': '看！听一听算一算', 'games': ['wordprob']}
    m['wor_tut_turn'] = {'text': '你来算一算', 'games': ['wordprob']}
    m['wor_hint'] = {'text': '听一听题目再算', 'games': ['wordprob']}
    m['wor_wrong'] = {'text': '再想一想，听一听题目', 'games': ['wordprob']}
    for n in range(1, 21):
        m['wor_n_%d' % n] = {'text': num_cn(n), 'games': ['wordprob']}
    m['gri_tut_watch'] = {'text': '看！宝藏在格子里', 'games': ['grid']}
    m['gri_tut_turn'] = {'text': '你来找一找', 'games': ['grid']}
    m['gri_hint'] = {'text': '听一听，行和列', 'games': ['grid']}
    m['gri_wrong'] = {'text': '再想一想，听一听', 'games': ['grid']}
    m['gri_q1'] = {'text': '宝藏在第', 'games': ['grid']}
    m['gri_q2'] = {'text': '行，第', 'games': ['grid']}
    m['gri_q3'] = {'text': '列', 'games': ['grid']}
    m['gri_go'] = {'text': '帮小兔子走到宝藏那里', 'games': ['grid']}
    for n in range(1, 6):
        m['gri_n_%d' % n] = {'text': num_cn(n), 'games': ['grid']}
    m['gri_d_up'] = {'text': '上', 'games': ['grid']}
    m['gri_d_down'] = {'text': '下', 'games': ['grid']}
    m['gri_d_left'] = {'text': '左', 'games': ['grid']}
    m['gri_d_right'] = {'text': '右', 'games': ['grid']}
    # batch13 grid r13（2026-09-15 难度改造：AUDIT-78 #39 红款——5×5 行列点选改 8×8 相对导航；
    # 新 9 键 gri_i_* 已核 manifest 无占用（既有 gri_ 17 键一字不改，正向行列题面 gri_q*/gri_go
    # 随题型下线保留不删）。指令族句段=向前/格/向左转/向右转/拿到宝箱（queue 拼接全 clip §0.23）；
    # plan 题面句/错序方向反馈（先拿+N+号宝箱）/救援 hint 句（替 gri_hint——其"行和列"文案
    # 随行列题型下线语义失配，gri_hint 本体保留不删）。文案与 SPEC-BATCH13 §3 r13 真值现行版一致。）
    m['gri_i_fwd'] = {'text': '向前', 'games': ['grid']}
    m['gri_i_ge'] = {'text': '格', 'games': ['grid']}
    m['gri_i_left'] = {'text': '向左转', 'games': ['grid']}
    m['gri_i_right'] = {'text': '向右转', 'games': ['grid']}
    m['gri_i_take'] = {'text': '拿到宝箱', 'games': ['grid']}
    m['gri_i_order'] = {'text': '按顺序拿到宝箱', 'games': ['grid']}
    m['gri_i_next'] = {'text': '先拿', 'games': ['grid']}
    m['gri_i_box'] = {'text': '号宝箱', 'games': ['grid']}
    m['gri_i_hint'] = {'text': '听一听，想好再走', 'games': ['grid']}
    # batch14：blocks/multibattle/numberdet（SPEC-BATCH14 §1/2/3 定稿；数词自建副本 §0.25；
    # numberdet 无 wrong（§0.24 显式豁免：每猜必有 big/small 信息反馈，无错点路径））
    m['blo_tut_watch'] = {'text': '看！方块叠叠高', 'games': ['blocks']}
    m['blo_tut_turn'] = {'text': '你来数一数', 'games': ['blocks']}
    m['blo_hint'] = {'text': '看不见的也要数一数', 'games': ['blocks']}
    m['blo_wrong'] = {'text': '再想一想，数一数', 'games': ['blocks']}
    m['blo_q_count'] = {'text': '数一数，一共有几个方块', 'games': ['blocks']}
    m['blo_q_fill'] = {'text': '数一数，还缺几个方块', 'games': ['blocks']}
    m['blo_q_front'] = {'text': '从前面看，是哪一个呀', 'games': ['blocks']}
    m['blo_q_top'] = {'text': '从上面往下看，是哪一个呀', 'games': ['blocks']}
    for n in range(1, 13):
        m['blo_n_%d' % n] = {'text': num_cn(n), 'games': ['blocks']}
    m['mul_tut_watch'] = {'text': '看！和兔子比一比', 'games': ['multibattle']}
    m['mul_tut_turn'] = {'text': '你来抢答', 'games': ['multibattle']}
    m['mul_hint'] = {'text': '算一算，几个几', 'games': ['multibattle']}
    m['mul_wrong'] = {'text': '再想一想，算一算', 'games': ['multibattle']}
    m['mul_q1'] = {'text': '乘', 'games': ['multibattle']}
    m['mul_q2'] = {'text': '等于多少呀', 'games': ['multibattle']}
    m['mul_win'] = {'text': '答对啦，冲呀', 'games': ['multibattle']}
    m['mul_lose'] = {'text': '兔子先答完啦，下一题追上它', 'games': ['multibattle']}
    for n in range(2, 10):
        m['mul_n_%d' % n] = {'text': num_cn(n), 'games': ['multibattle']}
    m['num_tut_watch'] = {'text': '看！猜一猜神秘数', 'games': ['numberdet']}
    m['num_tut_turn'] = {'text': '你来当侦探', 'games': ['numberdet']}
    m['num_q1'] = {'text': '神秘数藏在1到', 'games': ['numberdet']}   # 审查 m5：补'1到'防'藏在二十之间'病句
    m['num_q2'] = {'text': '之间', 'games': ['numberdet']}
    m['num_big'] = {'text': '太大啦', 'games': ['numberdet']}
    m['num_small'] = {'text': '太小啦', 'games': ['numberdet']}
    m['num_got'] = {'text': '猜中啦', 'games': ['numberdet']}
    m['num_gone'] = {'text': '这个数已经排除啦', 'games': ['numberdet']}
    m['num_hint'] = {'text': '试一试中间的数', 'games': ['numberdet']}
    for n in (10, 20, 30, 50, 99):
        m['num_n_%d' % n] = {'text': num_cn(n), 'games': ['numberdet']}
    # batch15：cashier/logicwho/matchstick（SPEC-BATCH15 §1/2/3 定稿；数词自建副本 §0.25；
    # logicwho 无 wrong 之外数词=动物/色/物词；matchstick=ms_ 前缀（SPEC §0.24 统一））
    m['cas_tut_watch'] = {'text': '看！顾客买东西啦', 'games': ['cashier']}
    m['cas_tut_turn'] = {'text': '你来当收银员', 'games': ['cashier']}
    m['cas_hint'] = {'text': '算一算，要找多少钱', 'games': ['cashier']}
    m['cas_right'] = {'text': '找对啦', 'games': ['cashier']}
    m['cas_wrong'] = {'text': '再算一算找零', 'games': ['cashier']}
    m['cas_q_more'] = {'text': '多找啦，拿回去一枚', 'games': ['cashier']}
    m['cas_q_less'] = {'text': '还差一点点', 'games': ['cashier']}
    m['cas_q1'] = {'text': '付了', 'games': ['cashier']}
    m['cas_q2'] = {'text': '元，买了', 'games': ['cashier']}
    m['cas_q3'] = {'text': '元的东西，找他多少呀', 'games': ['cashier']}
    m['cas_q3j'] = {'text': '元五角的东西，找他多少呀', 'games': ['cashier']}
    for n in range(1, 36):
        m['cas_n_%d' % n] = {'text': num_cn(n), 'games': ['cashier']}
    m['lgw_tut_watch'] = {'text': '看！小线索有大秘密', 'games': ['logicwho']}
    m['lgw_tut_turn'] = {'text': '你来想一想', 'games': ['logicwho']}
    m['lgw_hint'] = {'text': '听一听线索想一想', 'games': ['logicwho']}
    m['lgw_wrong'] = {'text': '再听一听线索', 'games': ['logicwho']}
    m['lgw_q_red'] = {'text': '戴红帽子的是谁呀', 'games': ['logicwho']}
    m['lgw_q_yellow'] = {'text': '戴黄帽子的是谁呀', 'games': ['logicwho']}
    m['lgw_q_blue'] = {'text': '戴蓝帽子的是谁呀', 'games': ['logicwho']}
    m['lgw_q_ball'] = {'text': '拿着球的是谁呀', 'games': ['logicwho']}
    m['lgw_q_book'] = {'text': '拿着书的是谁呀', 'games': ['logicwho']}
    m['lgw_q_umbrella'] = {'text': '拿着雨伞的是谁呀', 'games': ['logicwho']}
    m['lgw_c_a'] = {'text': '戴', 'games': ['logicwho']}
    m['lgw_c_b'] = {'text': '帽子的是', 'games': ['logicwho']}
    m['lgw_c_nb'] = {'text': '帽子的不是', 'games': ['logicwho']}
    m['lgw_c_l'] = {'text': '住在', 'games': ['logicwho']}
    m['lgw_c_left'] = {'text': '左边', 'games': ['logicwho']}
    m['lgw_c_ll'] = {'text': '最左边的是', 'games': ['logicwho']}
    m['lgw_c_rr'] = {'text': '最右边的是', 'games': ['logicwho']}
    m['lgw_c_h'] = {'text': '拿', 'games': ['logicwho']}
    m['lgw_c_i'] = {'text': '的是', 'games': ['logicwho']}
    m['lgw_red'] = {'text': '红', 'games': ['logicwho']}
    m['lgw_yellow'] = {'text': '黄', 'games': ['logicwho']}
    m['lgw_blue'] = {'text': '蓝', 'games': ['logicwho']}
    m['lgw_ball'] = {'text': '球', 'games': ['logicwho']}
    m['lgw_book'] = {'text': '书', 'games': ['logicwho']}
    m['lgw_umbrella'] = {'text': '雨伞', 'games': ['logicwho']}
    m['lgw_n_tu'] = {'text': '小兔', 'games': ['logicwho']}
    m['lgw_n_mao'] = {'text': '小猫', 'games': ['logicwho']}
    m['lgw_n_xiong'] = {'text': '小熊', 'games': ['logicwho']}
    m['ms_tut_watch'] = {'text': '看！火柴动一动', 'games': ['matchstick']}
    m['ms_tut_turn'] = {'text': '你来移一移', 'games': ['matchstick']}
    m['ms_hint'] = {'text': '想一想，动哪一根', 'games': ['matchstick']}
    m['ms_q'] = {'text': '移一根火柴，让算式成立', 'games': ['matchstick']}
    m['ms_right'] = {'text': '成立啦，你真聪明', 'games': ['matchstick']}
    m['ms_wrong'] = {'text': '再移一移试试', 'games': ['matchstick']}
    m['ms_pick'] = {'text': '拿起了一根', 'games': ['matchstick']}
    m['ms_drop'] = {'text': '放好啦', 'games': ['matchstick']}
    # batch16：read/spellen/idiom（SPEC-BATCH16 §1/2/3 定稿；read 正文/字母反馈 TTS 兜底豁免；
    # spellen 单词发音=en-US-AnaNeural（worden 同声先例）；idiom 读音=idm_t_<idx> 1 基 30 条）
    m['rd_tut_watch'] = {'text': '看！读一读小故事', 'games': ['read']}
    m['rd_tut_turn'] = {'text': '你来当小侦探', 'games': ['read']}
    m['rd_hint'] = {'text': '读一读故事想一想', 'games': ['read']}
    m['rd_right'] = {'text': '答对啦，你真会读', 'games': ['read']}
    m['rd_wrong'] = {'text': '再读一读故事', 'games': ['read']}
    m['rd_listen'] = {'text': '我读给你听', 'games': ['read']}
    m['rd_q1'] = {'text': '小兔子的', 'games': ['read']}
    m['rd_q1b'] = {'text': '是什么颜色呀', 'games': ['read']}
    m['rd_q2'] = {'text': '小兔子先去了哪里呀', 'games': ['read']}
    m['rd_q2b'] = {'text': '然后小兔子去了哪里呀', 'games': ['read']}
    m['rd_q3a'] = {'text': '天为什么会变暗呀', 'games': ['read']}
    m['rd_q3b'] = {'text': '小兔子为什么不高兴呀', 'games': ['read']}
    m['rd_q3c'] = {'text': '小兔子为什么跑回家呀', 'games': ['read']}
    m['rd_q4a'] = {'text': '小兔子为什么笑了呀', 'games': ['read']}
    m['rd_q4b'] = {'text': '小兔子心里是怎么想的呀', 'games': ['read']}
    RD_WORDS = {'red': '红色', 'blue': '蓝色', 'yellow': '黄色', 'green': '绿色',
      'park': '公园', 'school': '学校', 'shop': '商店', 'river': '河边', 'yard': '操场', 'home': '家里',
      'rabbit': '小兔子', 'cat': '小猫', 'bear': '小熊',
      'happy': '开心', 'sad': '难过', 'angry': '生气', 'worried': '着急',
      'umbrella': '雨伞', 'hat': '帽子', 'boots': '雨鞋', 'carrot': '萝卜', 'kite': '风筝', 'book': '书'}
    for k, t in RD_WORDS.items():
        m['rd_w_' + k] = {'text': t, 'games': ['read']}
    m['sp_tut_watch'] = {'text': '看！听一听拼一拼', 'games': ['spellen']}
    m['sp_tut_turn'] = {'text': '你来拼一拼', 'games': ['spellen']}
    m['sp_hint'] = {'text': '再听一听这个单词', 'games': ['spellen']}
    m['sp_right'] = {'text': '拼对啦，你真棒', 'games': ['spellen']}
    m['sp_wrong'] = {'text': '听一听再拼一拼', 'games': ['spellen']}
    m['sp_first'] = {'text': '第一个字母亮啦', 'games': ['spellen']}
    # r16 难度改造（2026-09-16 AUDIT-78）：新题型开场句+词库 24→60+中文释义 60 条
    m['sp_missing'] = {'text': '看一看，少了哪个字母', 'games': ['spellen']}
    m['sp_mean'] = {'text': '看一看中文，拼一拼单词', 'games': ['spellen']}
    SP_WORDS = ['cat', 'dog', 'sun', 'hat', 'map', 'bed', 'pig', 'bus',
      'cake', 'make', 'bike', 'kite', 'home', 'nose', 'rope',
      'lake', 'gate', 'name', 'game', 'five', 'nine', 'time', 'bone',
      'rose', 'cute', 'wave', 'ride', 'note', 'rice', 'safe',
      'fish', 'tree', 'star', 'frog', 'milk', 'grass', 'bread', 'black',
      'green', 'snake', 'brush', 'sleep', 'cloud', 'plant', 'small',
      'apple', 'tiger', 'water', 'happy', 'pencil', 'orange', 'yellow', 'rabbit',
      'flower', 'monkey', 'seven', 'paper', 'sister', 'robot', 'garden']
    SP_MEANS = {'cat': '小猫', 'dog': '小狗', 'sun': '太阳', 'hat': '帽子', 'map': '地图', 'bed': '床',
      'pig': '小猪', 'bus': '公共汽车', 'cake': '蛋糕', 'make': '制作', 'bike': '自行车',
      'kite': '风筝', 'home': '家', 'nose': '鼻子', 'rope': '绳子',
      'lake': '湖', 'gate': '大门', 'name': '名字', 'game': '游戏', 'five': '五', 'nine': '九',
      'time': '时间', 'bone': '骨头', 'rose': '玫瑰', 'cute': '可爱', 'wave': '波浪',
      'ride': '骑', 'note': '笔记', 'rice': '米饭', 'safe': '安全',
      'fish': '鱼', 'tree': '树', 'star': '星星', 'frog': '青蛙', 'milk': '牛奶', 'grass': '草',
      'bread': '面包', 'black': '黑色', 'green': '绿色', 'snake': '蛇', 'brush': '刷子',
      'sleep': '睡觉', 'cloud': '云', 'plant': '植物', 'small': '小的',
      'apple': '苹果', 'tiger': '老虎', 'water': '水', 'happy': '开心的', 'pencil': '铅笔',
      'orange': '橙子', 'yellow': '黄色', 'rabbit': '兔子', 'flower': '花', 'monkey': '猴子',
      'seven': '七', 'paper': '纸', 'sister': '姐妹', 'robot': '机器人', 'garden': '花园'}
    for w in SP_WORDS:
        m['sp_word_' + w] = {'text': w, 'games': ['spellen'], 'voice': 'en-US-AnaNeural'}
    for w, t in SP_MEANS.items():
        m['sp_mean_' + w] = {'text': t, 'games': ['spellen']}
    # r16 难度改造（2026-09-16 AUDIT-78）：图意配对→情境句填成语。旧 35 键（5 句+idm_t_1..30
    # 读音）语义随玩法退役，文本一字不改冻结 games=[]（mp3 留底幂等跳过、不再注入 idiom 页
    # ——wordprob r13 wor_tpl 先例）；新键走 idm_*2/idm_q_/idm_w_ 前缀（2026-09-16 实查
    # manifest 无占用）
    m['idm_tut_watch'] = {'text': '看！猜猜成语的意思', 'games': []}
    m['idm_tut_turn'] = {'text': '你来连一连', 'games': []}
    m['idm_hint'] = {'text': '听一听想一想', 'games': []}
    m['idm_right'] = {'text': '配对啦，真厉害', 'games': []}
    m['idm_wrong'] = {'text': '再看一看图片', 'games': []}
    IDIOMS = ['画蛇添足', '井底之蛙', '守株待兔', '对牛弹琴', '狐假虎威', '鸡飞狗跳', '如鱼得水', '惊弓之鸟',
      '掩耳盗铃', '拔苗助长', '亡羊补牢', '自相矛盾', '滥竽充数', '买椟还珠', '刻舟求剑', '叶公好龙',
      '水滴石穿', '雪中送炭', '锦上添花', '瓜熟蒂落', '水到渠成', '风和日丽', '春暖花开', '电闪雷鸣',
      '助人为乐', '拾金不昧', '万众一心', '半途而废', '一心一意', '三心二意']
    for i, t in enumerate(IDIOMS, 1):
        m['idm_t_%d' % i] = {'text': t, 'games': []}
    # r16 新 7 句（语义随新玩法定稿——mirrormaze r14 mm_hint2 同例）+ 两题型指令句
    m['idm_tut_watch2'] = {'text': '看！读句子选成语', 'games': ['idiom']}
    m['idm_tut_turn2'] = {'text': '你来选一选', 'games': ['idiom']}
    m['idm_hint2'] = {'text': '读一读句子想一想', 'games': ['idiom']}
    m['idm_right2'] = {'text': '选对啦，真厉害', 'games': ['idiom']}
    m['idm_wrong2'] = {'text': '再读一读句子', 'games': ['idiom']}
    m['idm_q_fill'] = {'text': '空格里该填哪个成语呀', 'games': ['idiom']}
    m['idm_q_near'] = {'text': '这两个成语很像，哪个更合适', 'games': ['idiom']}
    # r16 成语读音=idm_w_<idx> 1 基 80 条（从 idiom game-data.js IDIOMS 正则提取，零手抄——
    # wor_tpl2 先例；库即真值源，顺序=显示 idx 定稿）
    idm_src = open(os.path.join(ROOT, 'batch16', 'idiom', '_src', 'game-data.js'), encoding='utf-8').read()
    IDM80 = re.findall(r"id: '([^']+)'", idm_src)
    assert len(IDM80) == 80, 'idm_w_ 提取应 80 条: %d' % len(IDM80)
    for i, t in enumerate(IDM80, 1):
        m['idm_w_%d' % i] = {'text': t, 'games': ['idiom']}

    # ================= batch17：poemfill / area / mirrormaze =================
    POEMS = [
        ('yie', '咏鹅', '鹅，鹅，鹅，曲项向天歌。白毛浮绿水，红掌拨清波。'),
        ('jys', '静夜思', '床前明月光，疑是地上霜。举头望明月，低头思故乡。'),
        ('cx', '春晓', '春眠不觉晓，处处闻啼鸟。夜来风雨声，花落知多少。'),
        ('mn', '悯农', '锄禾日当午，汗滴禾下土。谁知盘中餐，粒粒皆辛苦。'),
        ('dgjl', '登鹳雀楼', '白日依山尽，黄河入海流。欲穷千里目，更上一层楼。'),
        ('cs', '池上', '小娃撑小艇，偷采白莲回。不解藏踪迹，浮萍一道开。'),
        ('jx', '江雪', '千山鸟飞绝，万径人踪灭。孤舟蓑笠翁，独钓寒江雪。'),
        ('wlsbp', '望庐山瀑布', '日照香炉生紫烟，遥看瀑布挂前川。飞流直下三千尺，疑是银河落九天。'),
        ('zwl', '赠汪伦', '李白乘舟将欲行，忽闻岸上踏歌声。桃花潭水深千尺，不及汪伦送我情。'),
        ('jgsh', '绝句', '两个黄鹂鸣翠柳，一行白鹭上青天。窗含西岭千秋雪，门泊东吴万里船。'),
        # r42 扩容 7 首【禁入本表】：POEMS 循环会给 poemfill 连锁生成 pf_poem_<pid> 整诗键（games=['poemfill']），
        # poemfill（r13 收官）游戏库无此 7 首→注入即破其 verify ⑨ 计数断言。r42 行键走 R42_LINES+R42_FULL 独立表（下方）。
    ]
    for pid, ptitle, ptext in POEMS:
        m['pf_poem_' + pid] = {'text': ptitle + '。' + ptext, 'games': ['poemfill']}
    m['pf_tut_watch'] = {'text': '看！读一读古诗', 'games': ['poemfill']}
    m['pf_tut_turn'] = {'text': '你来填一填', 'games': ['poemfill']}
    m['pf_hint'] = {'text': '听一听想一想', 'games': ['poemfill']}
    m['pf_right'] = {'text': '填对啦，你真棒', 'games': ['poemfill']}
    m['pf_wrong'] = {'text': '再读一读这句诗', 'games': ['poemfill']}
    m['pf_first'] = {'text': '第一个字亮啦', 'games': ['poemfill']}
    # r13 难度改造（2026-09-15，AUDIT-78 poemfill 行）：诗库 10→30——既有 10 键文本一字不改
    # （幂等跳过），新 20 首一二年级课标诗整首朗读（键前缀 pf_poem_ 续用，全库无撞名已核
    # 2026-09-15 实查；出处逐首登记 SPEC-BATCH17 §1-r13 诗目表；r13 用途=关末奖励）
    POEMS_R13 = [
        ('hua', '画', '远看山有色，近听水无声。春去花还在，人来鸟不惊。'),
        ('glyx', '古朗月行', '小时不识月，呼作白玉盘。又疑瑶台镜，飞在青云端。'),
        ('feng', '风', '解落三秋叶，能开二月花。过江千尺浪，入竹万竿斜。'),
        ('xyze', '寻隐者不遇', '松下问童子，言师采药去。只在此山中，云深不知处。'),
        ('xich', '小池', '泉眼无声惜细流，树阴照水爱晴柔。小荷才露尖尖角，早有蜻蜓立上头。'),
        ('huaj', '画鸡', '头上红冠不用裁，满身雪白走将来。平生不敢轻言语，一叫千门万户开。'),
        ('yess', '夜宿山寺', '危楼高百尺，手可摘星辰。不敢高声语，恐惊天上人。'),
        ('meih', '梅花', '墙角数枝梅，凌寒独自开。遥知不是雪，为有暗香来。'),
        ('xec', '小儿垂钓', '蓬头稚子学垂纶，侧坐莓苔草映身。路人借问遥招手，怕得鱼惊不应人。'),
        ('cunj', '村居', '草长莺飞二月天，拂堤杨柳醉春烟。儿童散学归来早，忙趁东风放纸鸢。'),
        ('yl', '咏柳', '碧玉妆成一树高，万条垂下绿丝绦。不知细叶谁裁出，二月春风似剪刀。'),
        ('cao', '草', '离离原上草，一岁一枯荣。野火烧不尽，春风吹又生。'),
        ('xjc', '晓出净慈寺送林子方', '毕竟西湖六月中，风光不与四时同。接天莲叶无穷碧，映日荷花别样红。'),
        ('mnq', '悯农·其一', '春种一粒粟，秋收万颗子。四海无闲田，农夫犹饿死。'),
        ('zys', '舟夜书所见', '月黑见渔灯，孤光一点萤。微微风簇浪，散作满河星。'),
        ('sjian', '所见', '牧童骑黄牛，歌声振林樾。意欲捕鸣蝉，忽然闭口立。'),
        ('zlj', '赠刘景文', '荷尽已无擎雨盖，菊残犹有傲霜枝。一年好景君须记，最是橙黄橘绿时。'),
        ('shx', '山行', '远上寒山石径斜，白云生处有人家。停车坐爱枫林晚，霜叶红于二月花。'),
        ('sxg', '宿新市徐公店', '篱落疏疏一径深，树头新绿未成阴。儿童急走追黄蝶，飞入菜花无处寻。'),
        ('jj2', '绝句·迟日', '迟日江山丽，春风花草香。泥融飞燕子，沙暖睡鸳鸯。'),
    ]
    for pid, ptitle, ptext in POEMS_R13:
        m['pf_poem_' + pid] = {'text': ptitle + '。' + ptext, 'games': ['poemfill']}

    for i in range(1, 11):
        m['ar_count_%d' % i] = {'text': '%d 格' % i, 'games': ['area']}
    m['ar_tut_watch'] = {'text': '看！数一数格子', 'games': ['area']}
    m['ar_tut_turn'] = {'text': '你来铺一铺', 'games': ['area']}
    m['ar_hint'] = {'text': '数一数格子想一想', 'games': ['area']}
    m['ar_right'] = {'text': '铺好啦，真整齐', 'games': ['area']}
    m['ar_wrong'] = {'text': '再数一数格子', 'games': ['area']}
    m['ar_tip'] = {'text': '数数格子再选砖', 'games': ['area']}

    m['mm_tut_watch'] = {'text': '看！照镜子拼一拼', 'games': ['mirrormaze']}
    m['mm_tut_turn'] = {'text': '你来拼一拼', 'games': ['mirrormaze']}
    m['mm_hint'] = {'text': '看看左边想一想', 'games': ['mirrormaze']}
    m['mm_right'] = {'text': '拼好啦，真对称', 'games': ['mirrormaze']}
    m['mm_wrong'] = {'text': '照照左边再看看', 'games': ['mirrormaze']}
    # r14 难度改造（2026-09-15，AUDIT-78 mirrormaze 行）：轴向族（水平/斜45°/双镜）上线，
    # 非 v 轴题不再说「左边」——轴向语义修正新 2 键（既有 mm_ 5 键一字不改）。
    # 文案与 SPEC-BATCH17 §6-r14 严格一致。
    m['mm_hint2'] = {'text': '看看镜子那一边', 'games': ['mirrormaze']}
    m['mm_wrong2'] = {'text': '照照镜子再看看', 'games': ['mirrormaze']}

    # ---- batch18（coder2 循环指令 / stack 搭高楼 / bounce 弹球角度）----
    m['cd2_tut_watch'] = {'text': '看！排好指令走一走', 'games': ['coder2']}
    m['cd2_tut_turn'] = {'text': '你来排一排', 'games': ['coder2']}
    m['cd2_hint'] = {'text': '想一想小兔怎么走', 'games': ['coder2']}
    m['cd2_right'] = {'text': '到达啦，真厉害', 'games': ['coder2']}
    m['cd2_wrong'] = {'text': '再看看路线改一改', 'games': ['coder2']}
    m['cd2_run'] = {'text': '出发喽', 'games': ['coder2']}
    m['cd2_wall'] = {'text': '前面走不通啦', 'games': ['coder2']}
    m['st_tut_watch'] = {'text': '看！把高楼搭起来', 'games': ['stack']}
    m['st_tut_turn'] = {'text': '你来搭一搭', 'games': ['stack']}
    m['st_hint'] = {'text': '对整齐就不倒啦', 'games': ['stack']}
    m['st_right'] = {'text': '搭好啦，真稳', 'games': ['stack']}
    m['st_wrong'] = {'text': '歪了歪了，再来一次', 'games': ['stack']}
    m['st_wind'] = {'text': '风来了，放另一边', 'games': ['stack']}
    m['st_place'] = {'text': '放好一层', 'games': ['stack']}
    m['bc_tut_watch'] = {'text': '看！小球弹弹弹', 'games': ['bounce']}
    m['bc_tut_turn'] = {'text': '你猜它进哪个洞', 'games': ['bounce']}
    m['bc_hint'] = {'text': '想想球会怎么弹', 'games': ['bounce']}
    m['bc_right'] = {'text': '进洞啦，猜对了', 'games': ['bounce']}
    m['bc_wrong'] = {'text': '再想想弹的方向', 'games': ['bounce']}
    m['bc_boing'] = {'text': '弹到墙上啦', 'games': ['bounce']}

    # ---- batch19（cipher 密码破译 / gomoku4 四子棋 / sudokunum 数独数字版）----
    m['ci_tut_watch'] = {'text': '看！破译小密码', 'games': ['cipher']}
    m['ci_tut_turn'] = {'text': '你来破一破', 'games': ['cipher']}
    m['ci_hint'] = {'text': '查查密码表', 'games': ['cipher']}
    m['ci_right'] = {'text': '破译成功，真聪明', 'games': ['cipher']}
    m['ci_wrong'] = {'text': '再对对密码表', 'games': ['cipher']}
    m['gk_tut_watch'] = {'text': '看！连成四个子', 'games': ['gomoku4']}
    m['gk_tut_turn'] = {'text': '你来下一局', 'games': ['gomoku4']}
    m['gk_hint'] = {'text': '想想哪里能连四个', 'games': ['gomoku4']}
    m['gk_right'] = {'text': '四个连上啦，你赢了', 'games': ['gomoku4']}
    m['gk_lose'] = {'text': '兔子赢啦，再来一局', 'games': ['gomoku4']}
    m['gk_draw'] = {'text': '平局，再来一局', 'games': ['gomoku4']}
    m['sn_tut_watch'] = {'text': '看！每行每列不重复', 'games': ['sudokunum']}
    m['sn_tut_turn'] = {'text': '你来填一填', 'games': ['sudokunum']}
    m['sn_hint'] = {'text': '看看这一行少了谁', 'games': ['sudokunum']}
    m['sn_right'] = {'text': '全部填对啦', 'games': ['sudokunum']}
    m['sn_wrong'] = {'text': '这个数字不对哦', 'games': ['sudokunum']}
    # ---- batch20（timecalc/memduel/quiz）----
    m['tc_tut_watch'] = {'text': '看！算一算时间', 'games': ['timecalc']}
    m['tc_tut_turn'] = {'text': '你来算一算', 'games': ['timecalc']}
    m['tc_hint'] = {'text': '想想过了几天', 'games': ['timecalc']}
    m['tc_hint2'] = {'text': '看看表，算一算', 'games': ['timecalc']}   # r16 时刻类分型（clock5/elapse/comp/compd/night/sched）
    m['tc_right'] = {'text': '算对啦，真棒', 'games': ['timecalc']}
    m['tc_wrong'] = {'text': '再想想日历', 'games': ['timecalc']}
    m['tc_wrong2'] = {'text': '再想一想时间', 'games': ['timecalc']}   # r16 时刻类分型
    m['md_tut_watch'] = {'text': '看！记住小数字', 'games': ['memduel']}
    m['md_tut_turn'] = {'text': '你来背一背', 'games': ['memduel']}
    m['md_hint'] = {'text': '从第一位开始想', 'games': ['memduel']}
    m['md_right'] = {'text': '全背对啦，记性真好', 'games': ['memduel']}
    m['md_wrong'] = {'text': '再想一想刚才的数', 'games': ['memduel']}
    # r17 难度改造（2026-09-17，SPEC-BATCH20 §1-r17-memduel）新增 4 键
    # （md_ 前缀新增后缀已核 manifest 无占用 2026-09-17 实查）：
    # 方向指令（dx 检索期语音+文字双通道）/倒背提示分流/延迟干扰窗提示
    m['md_dir_fwd'] = {'text': '顺着背', 'games': ['memduel']}
    m['md_dir_rev'] = {'text': '倒着背', 'games': ['memduel']}
    m['md_hint_rev'] = {'text': '从最后一位开始想', 'games': ['memduel']}
    m['md_gap'] = {'text': '先点一下小兔子', 'games': ['memduel']}
    m['qz_tut_watch'] = {'text': '看！小小百科题', 'games': ['quiz']}
    m['qz_tut_turn'] = {'text': '你来答一答', 'games': ['quiz']}
    m['qz_hint'] = {'text': '想一想再说', 'games': ['quiz']}
    m['qz_right'] = {'text': '答对啦，知识小达人', 'games': ['quiz']}
    m['qz_wrong'] = {'text': '再想一想哦', 'games': ['quiz']}
    # ---- batch21（feed/bubble/bridge，5-6 岁 P1 收尾批）----
    m['fed_tut_watch'] = {'text': '看！喂小兔子吃东西', 'games': ['feed']}
    m['fed_tut_turn'] = {'text': '你来喂一喂', 'games': ['feed']}
    m['fed_hint'] = {'text': '数一数，喂给它', 'games': ['feed']}
    m['fed_right'] = {'text': '喂好啦，小兔子吃得真香', 'games': ['feed']}
    m['fed_wrong'] = {'text': '再数一数有几根', 'games': ['feed']}
    # r8 难度改造（2026-09-14 AUDIT-56 #16）：left 剩题真心算（吃掉不清屏问还剩几根）
    # 既有 5 键一字不改；新键沿用 fed_ 前缀
    m['fed_left_q'] = {'text': '小兔子吃掉啦，数一数，还剩几根', 'games': ['feed']}
    m['fed_left_do'] = {'text': '拿一样多的，喂给小兔子', 'games': ['feed']}
    # v2 改造（2026-09-13 家长审计：去计数器+颜色子集+提交制）——改 3 句+新增 2 句
    m['bub_tut_watch'] = {'text': '看！点蓝色的小泡泡', 'games': ['bubble']}
    m['bub_tut_turn'] = {'text': '你来点一点，点够了按大对勾', 'games': ['bubble']}
    m['bub_hint'] = {'text': '数着数，点够了就按大对勾', 'games': ['bubble']}
    m['bub_right'] = {'text': '数对啦，泡泡真好玩', 'games': ['bubble']}
    m['bub_wrong_more'] = {'text': '多点了，重新数一数', 'games': ['bubble']}
    m['bub_wrong_less'] = {'text': '还差几个，再点点', 'games': ['bubble']}
    # r9 难度改造（2026-09-14 AUDIT-56 #17）：倒计时收尾超时温和重来引导——既有 6 键一字不改，新键沿用 bub_ 前缀
    m['bub_timeup'] = {'text': '泡泡睡着啦，不着急，再数一次', 'games': ['bubble']}
    m['brg_tut_watch'] = {'text': '看！踩着石头过河', 'games': ['bridge']}
    m['brg_tut_turn'] = {'text': '你来走一走', 'games': ['bridge']}
    m['brg_hint'] = {'text': '看看前面的规律', 'games': ['bridge']}
    m['brg_right'] = {'text': '过河啦，你真棒', 'games': ['bridge']}
    m['brg_wrong'] = {'text': '看看前面踩了什么', 'games': ['bridge']}
    # r9 难度改造（2026-09-14 AUDIT-56 #18）：规律纠错式（埋错石找错+修对双步）——
    # 既有 5 键一字不改；新键沿用 brg_ 前缀
    m['brg_fix_q'] = {'text': '小桥上有一块石头放错啦，找一找', 'games': ['bridge']}
    m['brg_fix_do'] = {'text': '选一块对的石头，补上去', 'games': ['bridge']}
    m['brg_found'] = {'text': '找到啦，就是这块', 'games': ['bridge']}
    # ---- batch22（hidden/slide/colormix，5-6 岁 P2 批）----
    m['hid_tut_watch'] = {'text': '看！小动物藏起来啦', 'games': ['hidden']}
    m['hid_tut_turn'] = {'text': '你来找一找', 'games': ['hidden']}
    m['hid_hint'] = {'text': '看看叶子后面', 'games': ['hidden']}
    m['hid_right'] = {'text': '全找到啦，眼睛真亮', 'games': ['hidden']}
    m['sli_tut_watch'] = {'text': '看！滑一滑拼照片', 'games': ['slide']}
    m['sli_tut_turn'] = {'text': '你来拼一拼', 'games': ['slide']}
    m['sli_hint'] = {'text': '看看空格旁边', 'games': ['slide']}
    m['sli_right'] = {'text': '拼好啦，照片真好看', 'games': ['slide']}
    m['sli_wrong'] = {'text': '这块动不了，试试空格旁边的', 'games': ['slide']}
    m['col_tut_watch'] = {'text': '看！颜料变魔法', 'games': ['colormix']}
    m['col_tut_turn'] = {'text': '你来调一调', 'games': ['colormix']}
    m['col_hint'] = {'text': '想想哪两个颜色是好朋友', 'games': ['colormix']}
    m['col_right'] = {'text': '调对啦，颜色真漂亮', 'games': ['colormix']}
    m['col_wrong'] = {'text': '不一样，再试试', 'games': ['colormix']}
    # ---- batch23（weather/share/piano，5-6 岁 P2 批）----
    m['wea_tut_watch'] = {'text': '看！下雨要穿雨衣', 'games': ['weather']}
    m['wea_tut_turn'] = {'text': '你来选一选', 'games': ['weather']}
    m['wea_hint'] = {'text': '看看天上的雨', 'games': ['weather']}
    m['wea_right'] = {'text': '穿得刚刚好，出门啦', 'games': ['weather']}
    m['wea_w_sun'] = {'text': '天热穿这么多会出汗哦', 'games': ['weather']}
    m['wea_w_rain'] = {'text': '下雨穿这个会淋湿哦', 'games': ['weather']}
    m['wea_w_snow'] = {'text': '天冷穿这个会冻着哦', 'games': ['weather']}
    m['wea_w_wind'] = {'text': '刮风啦，穿件小外套正合适', 'games': ['weather']}   # 审查M3：不否定干扰物属性
    m['wea_q_sun'] = {'text': '太阳晒晒，穿什么', 'games': ['weather']}
    m['wea_q_rain'] = {'text': '下雨啦，穿什么', 'games': ['weather']}
    m['wea_q_snow'] = {'text': '下雪啦，穿什么', 'games': ['weather']}
    m['wea_q_wind'] = {'text': '刮风啦，穿什么', 'games': ['weather']}
    # weather v2 条件推理改造（2026-09-13 家长审计）：4 条件 hint——前缀 wea_ 沿用款内既有（已核 manifest 无占用）
    m['wea_multi_hint'] = {'text': '两个条件都要想到哦', 'games': ['weather']}
    m['wea_temp_hint'] = {'text': '看看温度计，几度呀', 'games': ['weather']}
    m['wea_who_hint'] = {'text': '想一想，谁更怕冷呀', 'games': ['weather']}
    m['wea_anti_hint'] = {'text': '找一找，哪件用不上', 'games': ['weather']}
    m['sha_tut_watch'] = {'text': '看！一人分一颗', 'games': ['share']}
    m['sha_tut_turn'] = {'text': '你来分一分', 'games': ['share']}
    m['sha_hint'] = {'text': '数数每只碗里几颗', 'games': ['share']}
    m['sha_right'] = {'text': '每只一样多，真公平', 'games': ['share']}
    m['sha_plate'] = {'text': '剩下的放小盘子吧', 'games': ['share']}
    m['pia_tut_watch'] = {'text': '看！兔子弹什么你弹什么', 'games': ['piano']}
    m['pia_tut_turn'] = {'text': '你来弹一弹', 'games': ['piano']}
    m['pia_hint'] = {'text': '先听兔子弹哦', 'games': ['piano']}
    m['pia_right'] = {'text': '弹对啦，真好听', 'games': ['piano']}
    m['pia_wrong'] = {'text': '再听一次这个音', 'games': ['piano']}

    # ---- batch24（shaperoof/trace/dressup，5-6 岁 P2 批）----
    m['shr_tut_watch'] = {'text': '看！屋顶缺了一块', 'games': ['shaperoof']}
    m['shr_tut_turn'] = {'text': '你来补一补', 'games': ['shaperoof']}
    m['shr_hint'] = {'text': '看看洞的形状', 'games': ['shaperoof']}
    m['shr_right'] = {'text': '补好啦，房子真漂亮', 'games': ['shaperoof']}
    m['shr_wrong'] = {'text': '这块的边对不上哦', 'games': ['shaperoof']}
    m['shr_q'] = {'text': '补屋顶咯', 'games': ['shaperoof']}
    # 2026-09-13 shaperoof 段基线升级（5.5-6.5 空间操作三阶）：旋转/镜像/组合反馈句
    # sr_ 前缀已核 manifest 无占用（1562 键零冲突）
    m['sr_rot_hint'] = {'text': '转一转，方向要对上洞洞', 'games': ['shaperoof']}
    m['sr_mir_wrong'] = {'text': '照照镜子哦，方向反过来啦', 'games': ['shaperoof']}
    m['sr_combo_hint'] = {'text': '这个大洞要两块瓦一起拼', 'games': ['shaperoof']}
    m['tra_tut_watch'] = {'text': '看！从发亮的点开始点', 'games': ['trace']}
    m['tra_tut_turn'] = {'text': '你来连一连', 'games': ['trace']}
    m['tra_hint'] = {'text': '点发亮的小圆点', 'games': ['trace']}
    m['tra_right'] = {'text': '写好啦，真棒', 'games': ['trace']}
    m['tra_wrong'] = {'text': '回到发亮的点哦', 'games': ['trace']}
    for i in range(1, 11):
        m['tra_n_%d' % i] = {'text': num_cn(i), 'games': ['trace']}   # §0.25 数词自建副本（完成朗读）
    # 2026-09-13 trace r5 难度改造（自推笔顺+听数选字+镜像辨析）：方向反馈/新题面/新 hint
    # 新 10 键已核 manifest 无占用（tra_ 既有 15 键不含下列名）
    m['tra_hint2'] = {'text': '从发亮的起点开始，想一想下一笔', 'games': ['trace']}
    m['tra_l_q'] = {'text': '听一听，它是几', 'games': ['trace']}
    m['tra_m_q'] = {'text': '哪个是正的', 'games': ['trace']}
    m['tra_w_pick'] = {'text': '再听一听，是几呀', 'games': ['trace']}
    m['tra_w_mir'] = {'text': '转一转，再看看', 'games': ['trace']}
    m['tra_w_wait'] = {'text': '这一笔要等一等', 'games': ['trace']}
    m['tra_w_down'] = {'text': '从上往下写哦', 'games': ['trace']}
    m['tra_w_right'] = {'text': '从左往右写哦', 'games': ['trace']}
    m['tra_w_up'] = {'text': '从下往上写哦', 'games': ['trace']}
    m['tra_w_left'] = {'text': '从右往左写哦', 'games': ['trace']}
    m['dru_tut_watch'] = {'text': '看！给小兔子穿上雨衣', 'games': ['dressup']}   # b24 勘误：教学锚=雨天主题，文案与演示动作一致
    m['dru_tut_turn'] = {'text': '你来装扮它', 'games': ['dressup']}
    m['dru_hint'] = {'text': '再看看要带什么', 'games': ['dressup']}
    m['dru_right'] = {'text': '装扮好啦，真好看', 'games': ['dressup']}
    m['dru_wrong'] = {'text': '现在不用这个哦', 'games': ['dressup']}
    m['dru_free'] = {'text': '自由装扮时间', 'games': ['dressup']}
    # 2026-09-14 dressup r10 难度改造（主题冲突池/装备预算/反向排除）：预算引导+反向重定向+反向判对
    # 新 3 键已核 manifest 无占用（dru_ 既有 6 键不含下列名）
    m['dru_budget_hint'] = {'text': '只能带三样，放回去再挑一挑', 'games': ['dressup']}
    m['dru_anti_hint'] = {'text': '要找不用带的一样哦', 'games': ['dressup']}
    m['dru_anti_right'] = {'text': '找对啦，它不用带', 'games': ['dressup']}

    # ---- batch25（story3/emo/habitat，6-7 岁批）----
    m['sto_tut_watch'] = {'text': '看！先找第一张', 'games': ['story3']}
    m['sto_tut_turn'] = {'text': '你来排一排', 'games': ['story3']}
    m['sto_hint'] = {'text': '想想先发生了什么', 'games': ['story3']}
    m['sto_right'] = {'text': '故事讲完啦，真好听', 'games': ['story3']}
    m['sto_w_first'] = {'text': '这一步还不是开头哦', 'games': ['story3']}
    m['sto_w_mid'] = {'text': '这一步已经讲过啦', 'games': ['story3']}
    m['sto_q'] = {'text': '按顺序讲讲这个故事', 'games': ['story3']}
    m['emo_tut_watch'] = {'text': '看！小兔子怎么了', 'games': ['emo']}
    m['emo_tut_turn'] = {'text': '你来选一选', 'games': ['emo']}
    m['emo_hint'] = {'text': '再看看发生了什么', 'games': ['emo']}
    m['emo_right'] = {'text': '你说对啦，抱抱小兔子', 'games': ['emo']}
    m['emo_wrong'] = {'text': '再看看小兔子发生了什么呀', 'games': ['emo']}
    for ek, et in (('happy', '开心'), ('sad', '难过'), ('angry', '生气'),
                   ('scared', '害怕'), ('surprised', '惊讶'), ('worried', '担心')):
        m['emo_w_%s' % ek] = {'text': et, 'games': ['emo']}   # 选对情绪词朗读
    m['hab_tut_watch'] = {'text': '看！送小动物回家', 'games': ['habitat']}
    m['hab_tut_turn'] = {'text': '你来送一送', 'games': ['habitat']}
    m['hab_hint'] = {'text': '想想它住在哪里', 'games': ['habitat']}
    m['hab_right'] = {'text': '到家啦，真开心', 'games': ['habitat']}
    for hk, ht in (('forest', '森林里有好多大树，它不住在这里哦'),
                   ('grassland', '草原上一望无际，它不住在这里哦'),
                   ('ocean', '大海全是咸咸的海水，它不住在这里哦'),
                   ('desert', '沙漠里又干又热没有水，它不住在这里哦'),
                   ('pond', '池塘的水太少啦，它不住在这里哦'),
                   ('sky', '天上飞不到底，它不住在这里哦'),
                   ('farm', '农场是家养动物的地方，它不住在这里哦')):
        m['hab_w_%s' % hk] = {'text': ht, 'games': ['habitat']}   # 反馈绑定所点环境（同环境统一文案）
    # 2026-09-13 habitat r4 段基线升级（6-7 习性与食物链推理）：题型化 hint（兔子按钮按题型选播）
    # + 题型化错反馈（非 home 题不再用环境反馈）；hab_ 前缀自查无占用（habitat 专属）
    for tk, tt in (('feed', '想想它爱吃什么'),
                   ('chain', '顺着想，谁吃谁'),
                   ('hib', '想想冬天谁在睡觉'),
                   ('struct', '想想这个特点有什么用'),
                   ('dual', '两个条件都要满足哦')):
        m['hab_hint_%s' % tk] = {'text': tt, 'games': ['habitat']}
    for tk, tt in (('feed', '它不爱吃这个哦'),
                   ('chain', '再顺着想一遍，谁吃谁'),
                   ('hib', '再想想，冬天谁在睡觉'),
                   ('struct', '再看看这个身体特点'),
                   ('dual', '再看看，两个条件都要满足')):
        m['hab_w_%s' % tk] = {'text': tt, 'games': ['habitat']}


    # ---- batch26（sign/season/calendar，6-7 岁批）----
    m['sgn_tut_watch'] = {'text': '看！这个标志告诉你什么', 'games': ['sign']}
    m['sgn_tut_turn'] = {'text': '你来选一选', 'games': ['sign']}
    m['sgn_hint'] = {'text': '再看看标志的样子', 'games': ['sign']}
    m['sgn_right'] = {'text': '认对啦，真安全', 'games': ['sign']}
    m['sgn_wrong'] = {'text': '再看看它的颜色和形状', 'games': ['sign']}
    m['sgn_q'] = {'text': '这个标志是什么意思', 'games': ['sign']}
    m['sea_tut_watch'] = {'text': '看！这个季节穿什么', 'games': ['season']}
    m['sea_tut_turn'] = {'text': '你来挑一挑', 'games': ['season']}
    m['sea_hint'] = {'text': '想想现在是什么季节', 'games': ['season']}
    m['sea_right'] = {'text': '穿好啦，正合适', 'games': ['season']}
    m['sea_wrong'] = {'text': '这个季节不合适哦', 'games': ['season']}
    m['sea_q'] = {'text': '这个季节要穿什么', 'games': ['season']}
    # r4 难度改造新增（2026-09-13）：双约束整套装——方向 hint 按题型选播（outfit=双约束/anti=反向）
    m['sea_hint_outfit'] = {'text': '看看温度，再想去哪儿', 'games': ['season']}
    m['sea_hint_anti'] = {'text': '哪件穿上会发抖呀', 'games': ['season']}
    m['cal_tut_watch'] = {'text': '看！星期几排排队', 'games': ['calendar']}
    m['cal_tut_turn'] = {'text': '你来想一想', 'games': ['calendar']}
    m['cal_hint'] = {'text': '想想它的后面是谁', 'games': ['calendar']}
    m['cal_right'] = {'text': '答对啦，你真棒', 'games': ['calendar']}
    m['cal_wrong'] = {'text': '再想一想顺序', 'games': ['calendar']}
    m['cal_q'] = {'text': '它的后面是哪一个', 'games': ['calendar']}

    # ---- batch27（ruler/coin/notebird，6-7 岁批）----
    m['rul_tut_watch'] = {'text': '看！用回形针量一量', 'games': ['ruler']}
    m['rul_tut_turn'] = {'text': '你来数一数', 'games': ['ruler']}
    m['rul_hint'] = {'text': '摆整齐再数一数', 'games': ['ruler']}
    m['rul_right'] = {'text': '量对啦，真厉害', 'games': ['ruler']}
    m['rul_wrong'] = {'text': '一头对齐再数一数', 'games': ['ruler']}
    m['rul_q'] = {'text': '它有几根回形针长', 'games': ['ruler']}
    m['coi_tut_watch'] = {'text': '看！这是多少钱', 'games': ['coin']}
    m['coi_tut_turn'] = {'text': '你来认一认', 'games': ['coin']}
    m['coi_hint'] = {'text': '看看上面的数字', 'games': ['coin']}
    m['coi_right'] = {'text': '认对啦，真能干', 'games': ['coin']}
    m['coi_wrong'] = {'text': '再看看数字和颜色', 'games': ['coin']}
    m['coi_q'] = {'text': '这是多少钱', 'games': ['coin']}
    m['not_tut_watch'] = {'text': '听！小鸟在唱歌', 'games': ['notebird']}
    m['not_tut_turn'] = {'text': '你来听一听', 'games': ['notebird']}
    m['not_hint'] = {'text': '再听一遍它的声音', 'games': ['notebird']}
    m['not_right'] = {'text': '听对啦，耳朵真灵', 'games': ['notebird']}
    m['not_wrong'] = {'text': '再听一听，谁的声音', 'games': ['notebird']}
    m['not_q'] = {'text': '是哪只小鸟在唱', 'games': ['notebird']}

    # ---- batch28（coder/shapecount/conserve，6-7 岁批）----
    m['cod_tut_watch'] = {'text': '看！小兔子要去找萝卜', 'games': ['coder']}
    m['cod_tut_turn'] = {'text': '你来指一指', 'games': ['coder']}
    m['cod_hint'] = {'text': '想想先往哪边走', 'games': ['coder']}
    m['cod_right'] = {'text': '走到啦，真聪明', 'games': ['coder']}
    m['cod_wrong'] = {'text': '再想想往哪边走', 'games': ['coder']}
    m['cod_q'] = {'text': '帮小兔子走到萝卜', 'games': ['coder']}
    # sha_ 前缀与 batch11/shadow + batch23/share 两方撞车（2026-09-10 实测：sha_tut_watch/tut_turn/hint=shadow 旧音频、
    # sha_right=share 旧音频被 shapecount 错拿，duration 辨别器同源自证未拦）——本批 shapecount 用 shc_
    m['shc_tut_watch'] = {'text': '看！图形里有几个', 'games': ['shapecount']}
    m['shc_tut_turn'] = {'text': '你来数一数', 'games': ['shapecount']}
    m['shc_hint'] = {'text': '一个一个指着数', 'games': ['shapecount']}
    m['shc_right'] = {'text': '数对啦，真棒', 'games': ['shapecount']}
    m['shc_wrong'] = {'text': '再一个一个数', 'games': ['shapecount']}
    m['shc_q'] = {'text': '数一数有几个', 'games': ['shapecount']}
    # r3 难度改造新增（2026-09-13）：hint 按题型选播——阵列/缺格=分组策略、双维=两步过滤
    m['shc_hint_grid'] = {'text': '两个两个数，按行数更快', 'games': ['shapecount']}
    m['shc_hint_dual'] = {'text': '先找颜色，再找形状', 'games': ['shapecount']}
    # con_ 前缀与 batch5/connect 冲突（con_tut_watch/turn/hint 已被占用，2026-09-10 实测覆盖）——本批 conserve 用 cnv_
    m['cnv_tut_watch'] = {'text': '看！哪一边多', 'games': ['conserve']}
    m['cnv_tut_turn'] = {'text': '你来比一比', 'games': ['conserve']}
    m['cnv_hint'] = {'text': '先数一数再比', 'games': ['conserve']}
    m['cnv_right'] = {'text': '比对啦，真厉害', 'games': ['conserve']}
    m['cnv_wrong'] = {'text': '先数一数再说', 'games': ['conserve']}
    m['cnv_q'] = {'text': '哪一边多', 'games': ['conserve']}

    # ---- batch29（bodyen/poem/wordpuz，6-7 岁收尾批）----
    # bod_ 已核无占用；词音=en-US-AnaNeural（worden wen_w/spellen sp_word 先例）
    m['bod_tut_watch'] = {'text': '看！听英语点身体', 'games': ['bodyen']}
    m['bod_tut_turn'] = {'text': '你来点一点', 'games': ['bodyen']}
    m['bod_hint'] = {'text': '再听一遍想一想', 'games': ['bodyen']}
    m['bod_right'] = {'text': '点对啦，真棒', 'games': ['bodyen']}
    m['bod_wrong'] = {'text': '再想一想', 'games': ['bodyen']}
    m['bod_q1'] = {'text': '听一听，点出它的英语', 'games': ['bodyen']}
    m['bod_q2'] = {'text': '看一看，选出它的英语', 'games': ['bodyen']}
    for w in ['head', 'eye', 'ear', 'nose', 'mouth', 'hand', 'arm', 'leg']:
        m['bod_w_' + w] = {'text': w, 'games': ['bodyen'], 'voice': 'en-US-AnaNeural'}
    # r41 新 23 键（2026-09-22 主线注册；SPEC-R41-BODYEN §R6 键清单——库 8→24 词音 16 + do 族 7）
    m['bod_q3'] = {'text': '听一听，选出那个动作', 'games': ['bodyen']}
    m['bod_again_do'] = {'text': '再听一遍这个指令', 'games': ['bodyen']}
    for w in ['face', 'hair', 'eyebrow', 'tooth', 'tongue', 'chin', 'cheek', 'neck',
              'shoulder', 'elbow', 'finger', 'thumb', 'knee', 'foot', 'toe', 'belly']:
        m['bod_w_' + w] = {'text': w, 'games': ['bodyen'], 'voice': 'en-US-AnaNeural'}
    for v in ['touch', 'clap', 'shake', 'stomp', 'wave']:   # 动词指令音（en 童声单词，verbClip 同式）
        m['bod_v_' + v] = {'text': v, 'games': ['bodyen'], 'voice': 'en-US-AnaNeural'}
    # poe_ 已核无占用（pf_=poemfill 不撞）；行音=晓晓读单行（禁复用 pf_poem 整诗——跟读题需要逐句）
    m['poe_tut_watch'] = {'text': '看！听一句古诗', 'games': ['poem']}
    m['poe_tut_turn'] = {'text': '你来找一找', 'games': ['poem']}
    m['poe_hint'] = {'text': '读读上一行，想想下一句', 'games': ['poem']}
    m['poe_right'] = {'text': '找对啦，真厉害', 'games': ['poem']}
    m['poe_wrong'] = {'text': '再读一读想一想', 'games': ['poem']}
    m['poe_q_next'] = {'text': '下一句是哪一句', 'games': ['poem']}
    m['poe_q_hear'] = {'text': '听一听，是哪一句', 'games': ['poem']}
    # r42 新题面键（SPEC-R42-POEM §R-键清单；与 game-data.js VOICE.qFill/qOrder 一字一致）
    m['poe_q_fill'] = {'text': '缺了哪个字呀', 'games': ['poem']}
    m['poe_q_order'] = {'text': '听一听，排出这首诗', 'games': ['poem']}
    POEM29_LINES = {   # 行文本以 POEMS 表为源校验（下方 assert 逐行 in 诗全文——零手抄偏差）
        'yie': ['鹅，鹅，鹅', '曲项向天歌', '白毛浮绿水', '红掌拨清波'],
        'jys': ['床前明月光', '疑是地上霜', '举头望明月', '低头思故乡'],
        'cx': ['春眠不觉晓', '处处闻啼鸟', '夜来风雨声', '花落知多少'],
        'mn': ['锄禾日当午', '汗滴禾下土', '谁知盘中餐', '粒粒皆辛苦'],
        'dgjl': ['白日依山尽', '黄河入海流', '欲穷千里目', '更上一层楼'],
        # r42 扩容 7 诗行键（poe_line_<pid>_<0-3>×28；与 game-data.js POEMS 表 lines 逐字一致）
        'yqesl': ['一去二三里', '烟村四五家', '亭台六七座', '八九十枝花'],
        'clg': ['敕勒川，阴山下', '天似穹庐，笼盖四野', '天苍苍，野茫茫', '风吹草低见牛羊'],
        'yhs': ['只有天在上', '更无山与齐', '举头红日近', '回首白云低'],
        'jsyz': ['江上往来人', '但爱鲈鱼美', '君看一叶舟', '出没风波里'],
        'dlyy': ['向晚意不适', '驱车登古原', '夕阳无限好', '只是近黄昏'],
        'lc': ['空山不见人', '但闻人语响', '返景入深林', '复照青苔上'],
        'xs': ['红豆生南国', '春来发几枝', '愿君多采撷', '此物最相思'],
    }
    # r42 诗全文独立表（供上方 assert 校验；不进 POEMS 循环防 poemfill pf_poem_ 连锁——2026-09-22 实测教训）
    R42_FULL = {
        'yqesl': '一去二三里，烟村四五家。亭台六七座，八九十枝花。',
        'clg': '敕勒川，阴山下。天似穹庐，笼盖四野。天苍苍，野茫茫。风吹草低见牛羊。',
        'yhs': '只有天在上，更无山与齐。举头红日近，回首白云低。',
        'jsyz': '江上往来人，但爱鲈鱼美。君看一叶舟，出没风波里。',
        'dlyy': '向晚意不适，驱车登古原。夕阳无限好，只是近黄昏。',
        'lc': '空山不见人，但闻人语响。返景入深林，复照青苔上。',
        'xs': '红豆生南国，春来发几枝。愿君多采撷，此物最相思。',
    }
    _poem_full = {p: t for p, _, t in POEMS}
    _poem_full.update(R42_FULL)   # r42 7 诗全文并入校验域（行键在册，pf_poem_ 整诗键不在——见 R42_FULL 注释）
    for pid, lines in POEM29_LINES.items():
        assert len(lines) == 4 and all(ln in _poem_full[pid] for ln in lines), 'poem29 行表与诗全文不一致: %s' % pid
        for n, ln in enumerate(lines):
            m['poe_line_%s_%d' % (pid, n)] = {'text': ln, 'games': ['poem']}
    # wpu_ 已核无占用（wrd_/wen_/wor_ 近邻不撞）；词音=en-US-AnaNeural
    m['wpu_tut_watch'] = {'text': '看！拼出小单词', 'games': ['wordpuz']}
    m['wpu_tut_turn'] = {'text': '你来拼一拼', 'games': ['wordpuz']}
    m['wpu_hint'] = {'text': '看图想一想', 'games': ['wordpuz']}
    m['wpu_right'] = {'text': '拼对啦，真聪明', 'games': ['wordpuz']}
    m['wpu_wrong'] = {'text': '看看图画想一想', 'games': ['wordpuz']}
    m['wpu_q'] = {'text': '看图拼单词', 'games': ['wordpuz']}
    for w in ['cat', 'dog', 'sun', 'hat', 'bed', 'pen', 'ten', 'map', 'cup', 'car',
              'bus', 'box', 'fox', 'egg', 'ant', 'eye', 'arm', 'leg', 'hand', 'star']:
        m['wpu_w_' + w] = {'text': w, 'games': ['wordpuz'], 'voice': 'en-US-AnaNeural'}

    # ---- batch30（babylove/storybed/maze，5-6 岁收官批 → 90/90）----
    # bab_ 已核无占用；名音=晓晓读中文名（12 互异：幼体 6+成体 6）
    m['bab_tut_watch'] = {'text': '看！帮宝宝找妈妈', 'games': ['babylove']}
    m['bab_tut_turn'] = {'text': '你来点一点', 'games': ['babylove']}
    m['bab_hint'] = {'text': '再看看想一想', 'games': ['babylove']}
    m['bab_right'] = {'text': '找对啦，真棒', 'games': ['babylove']}
    m['bab_wrong'] = {'text': '再想一想', 'games': ['babylove']}
    m['bab_q1'] = {'text': '它的妈妈是谁呀', 'games': ['babylove']}
    m['bab_q2'] = {'text': '这是谁的宝宝呀', 'games': ['babylove']}
    for aid, cn in [('tadpole', '蝌蚪'), ('frog', '青蛙'), ('caterpillar', '毛毛虫'), ('butterfly', '蝴蝶'),
                    ('chick', '小鸡'), ('hen', '母鸡'), ('puppy', '小狗'), ('dog', '大狗'),
                    ('kitten', '小猫'), ('cat', '大猫'), ('calf', '牛犊'), ('cow', '奶牛')]:
        m['bab_n_' + aid] = {'text': cn, 'games': ['babylove']}
    # ---- r10 难度改造（2026-09-14，AUDIT-56 #28）：12 对扩容+发育链+生境双维 ----
    # 既有 bab_ 19 键文本一字不改；新键沿用 bab_ 前缀（前缀占用已核）
    for aid, cn in [('fishfry', '鱼苗'), ('fish', '大鱼'), ('duckling', '小鸭'), ('duck', '大鸭'),
                    ('grub', '甲虫幼虫'), ('beetle', '甲虫'), ('lamb', '小羊'), ('sheep', '大羊'),
                    ('piglet', '小猪'), ('pig', '大猪'), ('foal', '小马'), ('horse', '大马')]:
        m['bab_n_' + aid] = {'text': cn, 'games': ['babylove']}
    for aid, cn in [('egg_frog', '青蛙卵'), ('egg_butterfly', '蝴蝶卵'), ('egg_beetle', '甲虫卵'),
                    ('egg_fish', '鱼卵'), ('egg_hen', '鸡蛋'), ('egg_duck', '鸭蛋')]:
        m['bab_n_' + aid] = {'text': cn, 'games': ['babylove']}
    m['bab_q3'] = {'text': '它小时候是什么样呀', 'games': ['babylove']}        # grow 题面句
    m['bab_grow_next'] = {'text': '然后呢', 'games': ['babylove']}             # grow 步进句
    m['bab_h_water'] = {'text': '住在水里', 'games': ['babylove']}             # 生境名（habitat 拼句头）
    m['bab_h_forest'] = {'text': '住在树林里', 'games': ['babylove']}
    m['bab_h_grass'] = {'text': '住在草原上', 'games': ['babylove']}
    m['bab_q4_mom'] = {'text': '妈妈是哪一个呀', 'games': ['babylove']}        # habitat want=mom
    m['bab_q4_baby'] = {'text': '宝宝是哪一个呀', 'games': ['babylove']}       # habitat want=baby
    # stb_ 已核无占用；流程表从 SPEC-BATCH30 §0.74 正则提取（零手抄，与 SPEC 严格一致——poem POEM29_LINES 同范式）
    m['stb_tut_watch'] = {'text': '看！把事情排排队', 'games': ['storybed']}
    m['stb_tut_turn'] = {'text': '你来排一排', 'games': ['storybed']}
    m['stb_hint'] = {'text': '想想先做什么', 'games': ['storybed']}
    m['stb_right'] = {'text': '排对啦，真厉害', 'games': ['storybed']}
    m['stb_wrong'] = {'text': '再想想先做什么', 'games': ['storybed']}
    m['stb_q'] = {'text': '先做什么呀', 'games': ['storybed']}
    m['stb_next'] = {'text': '然后呢', 'games': ['storybed']}
    # r10 难度改造（2026-09-14，SPEC-BATCH30 §6）：条件分支题面+缺步题面+条件步音（既有 31 键一字不改）
    m['stb_q_rain'] = {'text': '明天下雨，出门记得带伞', 'games': ['storybed']}
    m['stb_q_miss'] = {'text': '少了哪一步呀', 'games': ['storybed']}
    m['stb_s_out_4'] = {'text': '带小伞', 'games': ['storybed']}
    spec30 = open(os.path.join(ROOT, 'batch30', 'SPEC-BATCH30.md'), encoding='utf-8').read()
    seg = re.search(r'流程封闭 6\*\*（(.*?)）；\*\*玩法=逐点制', spec30, re.S)
    assert seg, 'SPEC30 流程表段未定位'
    FLOWS30 = re.findall(r'([a-z]+) [一-龥]+?=([一-龥→]+?)(?:/|$)', seg.group(1))
    assert len(FLOWS30) == 6, '流程提取应 6: %d' % len(FLOWS30)
    for fid, chain in FLOWS30:
        steps = chain.split('→')
        assert len(steps) == 4, '%s 步数=%d' % (fid, len(steps))
        for n, st in enumerate(steps):
            m['stb_s_%s_%d' % (fid, n)] = {'text': st, 'games': ['storybed']}
    # maz_ 已核无占用；纯方向款无数字/名音
    m['maz_tut_watch'] = {'text': '看！帮小兔子走迷宫', 'games': ['maze']}
    m['maz_tut_turn'] = {'text': '你来走一走', 'games': ['maze']}
    m['maz_hint'] = {'text': '看看旁边的格子', 'games': ['maze']}
    m['maz_right'] = {'text': '走到啦，真聪明', 'games': ['maze']}
    m['maz_wrong'] = {'text': '看看旁边能走的格子', 'games': ['maze']}
    m['maz_q'] = {'text': '帮小兔子吃到萝卜', 'games': ['maze']}
    m['maz_key'] = {'text': '先找钥匙哦', 'games': ['maze']}

    # wordprob 模板段——r13 难度改造（2026-09-15，AUDIT-78 定案）：
    # 旧 24 条 wor_tpl_（一步小数值题面）已随题库升级退役出注入——文案/音频一字不改（冻结为
    # 字面量防源表删除后 manifest 丢键；games=[] = 不再内嵌 wordprob 页，省 ~300KB 死重）
    for k, t in [
        ('wor_tpl_bus_add_1', '公交车上已经有'), ('wor_tpl_bus_add_2', '人，到站又上来了'),
        ('wor_tpl_bus_add_3', '人，现在车上有多少人呀'),
        ('wor_tpl_fruit_add_1', '小猴子摘了'), ('wor_tpl_fruit_add_2', '个苹果，又摘了'),
        ('wor_tpl_fruit_add_3', '个，一共摘了多少个苹果呀'),
        ('wor_tpl_cookie_sub_1', '盘子里有'), ('wor_tpl_cookie_sub_2', '块饼干，小兔子吃掉了'),
        ('wor_tpl_cookie_sub_3', '块，还剩多少块呀'),
        ('wor_tpl_bus_sub_1', '公交车上有'), ('wor_tpl_bus_sub_2', '人，到站下去了'),
        ('wor_tpl_bus_sub_3', '人，车上还有多少人呀'),
        ('wor_tpl_plate_mul_1', '野餐桌上摆了'), ('wor_tpl_plate_mul_2', '盘草莓，每盘都有'),
        ('wor_tpl_plate_mul_3', '个，一共有多少个草莓呀'),
        ('wor_tpl_row_mul_1', '小花园里种了'), ('wor_tpl_row_mul_2', '行向日葵，每行都有'),
        ('wor_tpl_row_mul_3', '棵，一共有多少棵呀'),
        ('wor_tpl_candy_div_1', '袋子里有'), ('wor_tpl_candy_div_2', '颗糖，平均分给'),
        ('wor_tpl_candy_div_3', '个小朋友，每人分到几颗呀'),
        ('wor_tpl_orange_div_1', '篮子里有'), ('wor_tpl_orange_div_2', '个橘子，平均分给'),
        ('wor_tpl_orange_div_3', '个小伙伴，每人分到几个呀')]:
        m[k] = {'text': t, 'games': []}
    # r13 新题库：两步模板段 wor_tpl2_ 38 条（从 game-data.js TPL_VOICE 表正则提取，零手抄；
    # 末条行尾可无逗号 ',? 双保险）+ 数词扩 21-35（操作数域升两位数口语）
    wor2_src = open(os.path.join(ROOT, 'batch13', 'wordprob', '_src', 'game-data.js'), encoding='utf-8').read()
    TPL2 = re.findall(r"^\s{2}(wor_tpl2_\w+):\s*'([^']+)',?", wor2_src, re.M)
    assert len(TPL2) == 38, 'wor_tpl2_ 提取应 38 段: %d' % len(TPL2)
    for k, t in TPL2:
        m[k] = {'text': t, 'games': ['wordprob']}
    for n in range(21, 36):
        m['wor_n_%d' % n] = {'text': num_cn(n), 'games': ['wordprob']}

    # ---- batch31（animalmenu/iftrain/chartread，120 扩容批 1：每段各 1 款）----
    # anm_ 已核无占用；名音=晓晓读中文名（16 互异：动物 8+食物 8）——SPEC-BATCH31 §0.76
    m['anm_tut_watch'] = {'text': '看！帮小动物点餐', 'games': ['animalmenu']}
    m['anm_tut_turn'] = {'text': '你来点一点', 'games': ['animalmenu']}
    m['anm_hint'] = {'text': '再看看想一想', 'games': ['animalmenu']}
    m['anm_right'] = {'text': '点对啦，真棒', 'games': ['animalmenu']}
    m['anm_wrong'] = {'text': '再想一想', 'games': ['animalmenu']}
    m['anm_q1'] = {'text': '它爱吃什么呀', 'games': ['animalmenu']}
    m['anm_q2'] = {'text': '谁爱吃这个呀', 'games': ['animalmenu']}
    for aid, cn in [('rabbit', '兔子'), ('carrot', '胡萝卜'), ('panda', '熊猫'), ('bamboo', '竹子'),
                    ('monkey', '猴子'), ('banana', '香蕉'), ('cat', '小猫'), ('fish', '小鱼'),
                    ('dog', '小狗'), ('bone', '骨头'), ('mouse', '老鼠'), ('cheese', '奶酪'),
                    ('bear', '小熊'), ('honey', '蜂蜜'), ('squirrel', '松鼠'), ('pinecone', '松果')]:
        m['anm_n_' + aid] = {'text': cn, 'games': ['animalmenu']}
    # r11 难度改造新增 16 条（2026-09-14，多食全选/食性分类/食物链方向；既有 23 条文案
    # 零改动零重合成——幂等跳过，实长不动）；新名音 9（动物 2+食物 7）
    m['anm_q_multi'] = {'text': '它爱吃的都要呀', 'games': ['animalmenu']}
    m['anm_q_diet'] = {'text': '它该吃哪一盘呀', 'games': ['animalmenu']}
    m['anm_q_chain'] = {'text': '谁吃谁呀', 'games': ['animalmenu']}
    m['anm_less'] = {'text': '还差一样，再找一找哦', 'games': ['animalmenu']}
    m['anm_more'] = {'text': '多选了一样，重新挑一挑哦', 'games': ['animalmenu']}
    m['anm_h_diet'] = {'text': '想一想，它爱吃什么', 'games': ['animalmenu']}
    m['anm_h_chain'] = {'text': '想一想，谁吃谁', 'games': ['animalmenu']}
    for aid, cn in [('wolf', '大灰狼'), ('sheep', '小绵羊'), ('apple', '苹果'), ('greens', '青菜'),
                    ('berry', '小浆果'), ('meat', '肉肉'), ('grass', '青草'), ('corn', '玉米'),
                    ('acorn', '橡果')]:
        m['anm_n_' + aid] = {'text': cn, 'games': ['animalmenu']}
    # rai_ 已核无占用；名音=晓晓读中文名（12 互异：情境 6+装备 6）——SPEC-BATCH31 §0.77
    m['rai_tut_watch'] = {'text': '看！如果下雨带把伞', 'games': ['iftrain']}
    m['rai_tut_turn'] = {'text': '你来选一选', 'games': ['iftrain']}
    m['rai_hint'] = {'text': '再看看想一想', 'games': ['iftrain']}
    m['rai_right'] = {'text': '选对啦，真厉害', 'games': ['iftrain']}
    m['rai_wrong'] = {'text': '再想一想', 'games': ['iftrain']}
    m['rai_q1'] = {'text': '要带什么呀', 'games': ['iftrain']}
    m['rai_q2'] = {'text': '什么时候用它呀', 'games': ['iftrain']}
    for cid, cn in [('rain', '下雨'), ('umbrella', '雨伞'), ('sun', '大太阳'), ('sunhat', '太阳帽'),
                    ('snow', '下雪'), ('scarf', '围巾'), ('cold', '天冷冷'), ('coat', '外套'),
                    ('hot', '天热热'), ('fan', '小扇子'), ('wind', '刮大风'), ('kite', '小风筝')]:
        m['rai_n_' + cid] = {'text': cn, 'games': ['iftrain']}
    # r3 难度改造新增 6 条（2026-09-13，SPEC-BATCH31 §0.77 v2：复合/优先级/提交制反馈；
    # 既有 19 条文案零改动——幂等跳过不重合成，实长不动）
    m['rai_q_two'] = {'text': '要带两样呀', 'games': ['iftrain']}
    m['rai_multi_hint'] = {'text': '两个天气都要想到哦', 'games': ['iftrain']}
    m['rai_best_hint'] = {'text': '要带两样才够哦', 'games': ['iftrain']}
    m['rai_conflict_hint'] = {'text': '先想一定要带的哦', 'games': ['iftrain']}
    m['rai_less'] = {'text': '还差一样，再找一找哦', 'games': ['iftrain']}
    m['rai_more'] = {'text': '多带了一样，重新挑一挑哦', 'games': ['iftrain']}
    # chr_ 已核无占用；howmany/compare 题面=类目名音 clip+TTS 拼段（无 clip）；类目名音×6——SPEC-BATCH31 §0.78
    m['chr_tut_watch'] = {'text': '看！看图找答案', 'games': ['chartread']}
    m['chr_tut_turn'] = {'text': '你来读一读', 'games': ['chartread']}
    m['chr_hint'] = {'text': '再看看这张图', 'games': ['chartread']}
    m['chr_right'] = {'text': '读对啦，真聪明', 'games': ['chartread']}
    m['chr_wrong'] = {'text': '再看看想一想', 'games': ['chartread']}
    m['chr_q_most'] = {'text': '谁最多呀', 'games': ['chartread']}
    m['chr_q_least'] = {'text': '谁最少呀', 'games': ['chartread']}
    m['chr_q_howmany'] = {'text': '有几只呀', 'games': ['chartread']}
    m['chr_q_compare'] = {'text': '比它多几只呀', 'games': ['chartread']}
    # r17 难度改造新增 2 条（SPEC-BATCH31 §4 r17 增补段；既有 15 条零改动零重合成）
    m['chr_q_second'] = {'text': '谁第二多呀', 'games': ['chartread']}
    m['chr_q_total'] = {'text': '一共有几只呀', 'games': ['chartread']}
    for tid, cn in [('rabbit', '兔子'), ('cat', '猫'), ('dog', '狗'),
                    ('bird', '小鸟'), ('fish', '鱼'), ('chick', '小鸡')]:
        m['chr_n_' + tid] = {'text': cn, 'games': ['chartread']}

    # ---- batch32（senses/robotdance/evidence，120 扩容批 2：每段各 1 款）----
    # sen_ 已核无占用；名音=晓晓读中文名（15 互异：感官 5+物品 10）——SPEC-BATCH32 §0.76
    m['sen_tut_watch'] = {'text': '看！用什么呢', 'games': ['senses']}
    m['sen_tut_turn'] = {'text': '你来点一点', 'games': ['senses']}
    m['sen_hint'] = {'text': '再想一想', 'games': ['senses']}
    m['sen_right'] = {'text': '点对啦，真棒', 'games': ['senses']}
    m['sen_wrong'] = {'text': '再想一想', 'games': ['senses']}
    m['sen_q1'] = {'text': '用什么呢', 'games': ['senses']}
    m['sen_q2'] = {'text': '什么用它呀', 'games': ['senses']}
    for sid, cn in [('eye', '眼睛'), ('ear', '耳朵'), ('nose', '鼻子'), ('hand', '小手'), ('mouth', '嘴巴'),
                    ('rainbow', '彩虹'), ('star', '星星闪闪'), ('bell', '闹钟响响'), ('birdsong', '小鸟唱歌'),
                    ('flower', '花儿香香'), ('cookie', '饼干香香'), ('softtoy', '毛绒软软'), ('ice', '冰块凉凉'),
                    ('lemon', '柠檬酸酸'), ('candy', '糖果甜甜')]:
        m['sen_n_' + sid] = {'text': cn, 'games': ['senses']}
    # r11 难度改造（2026-09-14，SPEC-BATCH32 §6 r11）：多感官/通感排除/失能代偿三题型新句 6+名音×5；
    # sen_ 前缀已核 manifest 无占用（沿用 b32 登记段，键名新增不改旧键）
    m['sen_q3'] = {'text': '都用什么呢，找全哦', 'games': ['senses']}
    m['sen_q_not'] = {'text': '哪个不是用', 'games': ['senses']}
    m['sen_q_not2'] = {'text': '的呀', 'games': ['senses']}
    m['sen_q_cov1'] = {'text': '捂住了', 'games': ['senses']}
    m['sen_q_cov2'] = {'text': '还能用什么呀', 'games': ['senses']}
    m['sen_mw'] = {'text': '没有找全哦', 'games': ['senses']}
    for sid, cn in [('popcorn', '爆米花'), ('watermelon', '西瓜'), ('kitten', '小猫咪'),
                    ('soup', '热汤'), ('drum', '小鼓')]:
        m['sen_n_' + sid] = {'text': cn, 'games': ['senses']}
    # rbd_ 已核无占用；名音=晓晓读动作名（5 互异）——SPEC-BATCH32 §0.77
    m['rbd_tut_watch'] = {'text': '看！机器人跳舞啦', 'games': ['robotdance']}
    m['rbd_tut_turn'] = {'text': '你来拼一拼', 'games': ['robotdance']}
    m['rbd_hint'] = {'text': '再想一想，下一步', 'games': ['robotdance']}
    m['rbd_right'] = {'text': '跳对啦，真棒', 'games': ['robotdance']}
    m['rbd_wrong'] = {'text': '再想一想', 'games': ['robotdance']}
    m['rbd_q'] = {'text': '按顺序点一点', 'games': ['robotdance']}
    m['rbd_replay'] = {'text': '再看一遍舞', 'games': ['robotdance']}
    for aid, cn in [('jump', '跳一跳'), ('spin', '转一圈'), ('clap', '拍拍手'),
                    ('stomp', '跺跺脚'), ('wave', '挥挥手')]:
        m['rbd_n_' + aid] = {'text': cn, 'games': ['robotdance']}
    # r43 新 6 键（2026-09-22 主线注册；SPEC-R43 §R7 键清单——动作池 5→10 名音 5 + fix 题键 1；
    # 文案与 batch32/robotdance/_src/game-data.js ITEMS 表 n 字段/VOICE.fix 一字一致）
    for aid, cn in [('nod', '点点头'), ('kick', '踢踢腿'), ('shake', '摇一摇'),
                    ('bow', '鞠个躬'), ('stretch', '伸伸手')]:
        m['rbd_n_' + aid] = {'text': cn, 'games': ['robotdance']}
    m['rbd_q_fix'] = {'text': '有一跳错啦，找一找', 'games': ['robotdance']}
    # evi_ 已核无占用；结论句=晓晓读（8 互异）——SPEC-BATCH32 §0.78；证据标签不读名音（7-8 识字+卡面小字）
    m['evi_tut_watch'] = {'text': '看！找一找证据', 'games': ['evidence']}
    m['evi_tut_turn'] = {'text': '你来当侦探', 'games': ['evidence']}
    m['evi_hint'] = {'text': '再看看想一想', 'games': ['evidence']}
    m['evi_right'] = {'text': '找对啦，真聪明', 'games': ['evidence']}
    m['evi_wrong'] = {'text': '再看看这张图', 'games': ['evidence']}
    m['evi_q1'] = {'text': '哪张能证明它呀', 'games': ['evidence']}
    # r17 文本迁移（2026-09-17，SPEC-BATCH32 §-r17-evidence）：findall 升三真值——
    # 「两张图」→「三张图」（既有键删 mp3 强制重合成，键数不变；旧 3120 实长作废）
    m['evi_q2'] = {'text': '找出能证明它的三张图', 'games': ['evidence']}
    # r17 新键：反问题型题面句（前缀 evi_ 已核 manifest 无占用）
    m['evi_q3'] = {'text': '哪张不能证明它呀', 'games': ['evidence']}
    for cid, cn in [('rainwet', '刚下过雨'), ('snowplay', '下过雪'), ('birthday', '今天有人过生日'),
                    ('cooked', '妈妈刚做过饭'), ('doghere', '小狗来过'), ('windbig', '刮过大风'),
                    ('paintday', '刚画过画'), ('nightowl', '昨晚很晚还有人醒着'),
                    # r17 结论池 8→20（SPEC-BATCH32 §-r17-evidence §1 新 12 条；前缀已核无占用）
                    ('washhands', '刚洗过手'), ('ateorange', '刚吃过橘子'), ('haircut', '刚剪过头发'),
                    ('waterplant', '刚浇过花'), ('mopped', '刚拖过地'), ('brushed', '刚刷过牙'),
                    ('fedfish', '刚喂过鱼'), ('playedblocks', '刚搭过积木'), ('drankmilk', '刚喝过牛奶'),
                    ('wrotehomework', '刚写过作业'), ('fixedbike', '刚修过自行车'), ('playedsandbox', '刚玩过沙子')]:
        m['evi_c_' + cid] = {'text': cn, 'games': ['evidence']}
    # ---- batch33（soundcount/position/robotpaint，120 扩容批 3：每段各 1 款）----
    # sc_ 已核无占用；名音=晓晓读数字带量词「下」（5 互异）——SPEC-BATCH33 §0.79
    m['sc_tut_watch'] = {'text': '看！听一听数一数', 'games': ['soundcount']}
    m['sc_tut_turn'] = {'text': '你来数一数', 'games': ['soundcount']}
    m['sc_hint'] = {'text': '再听一遍呀', 'games': ['soundcount']}
    m['sc_right'] = {'text': '数对啦，真棒', 'games': ['soundcount']}
    m['sc_wrong'] = {'text': '再想一想', 'games': ['soundcount']}
    m['sc_q1'] = {'text': '敲了几下呀', 'games': ['soundcount']}
    m['sc_q2'] = {'text': '鼓敲了几下', 'games': ['soundcount']}
    m['sc_replay'] = {'text': '再听一遍', 'games': ['soundcount']}
    for n, cn in [(1, '一下'), (2, '两下'), (3, '三下'), (4, '四下'), (5, '五下')]:
        m['sc_n_%d' % n] = {'text': cn, 'games': ['soundcount']}
    # ps_ 已核无占用；名音=晓晓读方位词（6 互异）——SPEC-BATCH33 §0.80
    m['ps_tut_watch'] = {'text': '看！兔子在哪里呀', 'games': ['position']}
    m['ps_tut_turn'] = {'text': '你来放一放', 'games': ['position']}
    m['ps_hint'] = {'text': '再看看，兔子在哪边', 'games': ['position']}
    m['ps_right'] = {'text': '放对啦，真棒', 'games': ['position']}
    m['ps_wrong'] = {'text': '再想一想', 'games': ['position']}
    m['ps_q1'] = {'text': '兔子在树的哪里呀', 'games': ['position']}
    m['ps_q2'] = {'text': '把兔子放好', 'games': ['position']}
    for pid, cn in [('front', '前面'), ('back', '后面'), ('left', '左边'), ('right', '右边'),
                    ('up', '上面'), ('down', '下面')]:
        m['ps_n_' + pid] = {'text': cn, 'games': ['position']}
    # r44 新 16 键（2026-09-22 主线注册；SPEC-R44-POSITION §R7 键清单——dual 双参照物 4+
    # flip 视角转换题面 6+fy 答案句 6；文案与 batch33/position/_src/game-data.js 的
    # DUAL_TTS/FLIP_TTS/FLIPY_TTS 运行时构造表一字一致——主线 node 执行对账 2026-09-22 mismatch=0）
    for k, cn in [('lu', '兔子藏在树的左边，也在房子的上面'), ('dr', '兔子藏在树的下面，也在房子的右边'),
                  ('ru', '兔子藏在树的右边，也在房子的上面'), ('dl', '兔子藏在树的下面，也在房子的左边')]:
        m['ps_dual_' + k] = {'text': cn, 'games': ['position']}
    for pid, cn in [('front', '兔子转过身去啦，它的前面是树的哪边呀'), ('back', '兔子转过身去啦，它的后面是树的哪边呀'),
                    ('left', '兔子转过身去啦，它的左边是树的哪边呀'), ('right', '兔子转过身去啦，它的右边是树的哪边呀'),
                    ('up', '兔子转过身去啦，它的上面是树的哪边呀'), ('down', '兔子转过身去啦，它的下面是树的哪边呀')]:
        m['ps_flip_' + pid] = {'text': cn, 'games': ['position']}
    for pid, cn in [('front', '转身以后，它的前面就是树的后面呀'), ('back', '转身以后，它的后面就是树的前面呀'),
                    ('left', '转身以后，它的左边就是树的右边呀'), ('right', '转身以后，它的右边就是树的左边呀'),
                    ('up', '转身以后，它的上面就是树的上面呀'), ('down', '转身以后，它的下面就是树的下面呀')]:
        m['ps_fy_' + pid] = {'text': cn, 'games': ['position']}
    assert sum(1 for k in m if k.startswith(('ps_dual_', 'ps_flip_', 'ps_fy_'))) == 16, 'r44 新键应 16'
    # rp_ 已核无占用；名音=晓晓读属性词（8 互异）——SPEC-BATCH33 §0.81
    m['rp_tut_watch'] = {'text': '看！小画师要画画啦', 'games': ['robotpaint']}
    m['rp_tut_turn'] = {'text': '你来当小老师', 'games': ['robotpaint']}
    m['rp_hint'] = {'text': '哪不一样呀，再看看', 'games': ['robotpaint']}
    m['rp_right'] = {'text': '画得真像，你真是好老师', 'games': ['robotpaint']}
    m['rp_wrong'] = {'text': '哪不一样呀', 'games': ['robotpaint']}
    m['rp_q'] = {'text': '说清楚要什么', 'games': ['robotpaint']}
    m['rp_go'] = {'text': '画！', 'games': ['robotpaint']}
    m['rp_like'] = {'text': '画得真像', 'games': ['robotpaint']}
    for aid, cn in [('red', '红色'), ('yel', '黄色'), ('blu', '蓝色'), ('cir', '圆形'),
                    ('squ', '方形'), ('tri', '三角形'), ('big', '大大的'), ('small', '小小的')]:
        m['rp_n_' + aid] = {'text': cn, 'games': ['robotpaint']}
    # r18 难度改造新增 3 键（2026-09-18，AUDIT-78 黄款 robotpaint：否定指令/两步修改/双画师
    # 三 kind 开题句；rp_ 前缀既有 16 键无撞名已核 2026-09-18 实查——记忆闪现句走 TTS keyless 不入 clip）
    m['rp_neg'] = {'text': '打了叉的不能用，想想该画哪个', 'games': ['robotpaint']}
    m['rp_edit'] = {'text': '小画师画好啦，按新指令改一改', 'games': ['robotpaint']}
    m['rp_dual'] = {'text': '两位小画师等你指挥，一个一个来', 'games': ['robotpaint']}

    # ---- batch34（hidecup/sentorder/datacollect，120 扩容批 4：每段各 1 款）----
    # hc_ 已核无占用；名音=晓晓读动物名（5 互异）——SPEC-BATCH34 §0.82；
    # 亮相链=[名音(clip), hc_show'要躲猫猫啦'(TTS keyless 恒尾)——契约 N 合法]
    m['hc_tut_watch'] = {'text': '看！小动物藏起来啦', 'games': ['hidecup']}
    m['hc_tut_turn'] = {'text': '你来试一试', 'games': ['hidecup']}
    m['hc_hint'] = {'text': '再想一想，看杯子怎么动', 'games': ['hidecup']}
    m['hc_right'] = {'text': '找到啦，真棒', 'games': ['hidecup']}
    m['hc_wrong'] = {'text': '再想一想', 'games': ['hidecup']}
    m['hc_show'] = {'text': '要躲猫猫啦', 'games': ['hidecup']}
    for aid, cn in [('rabbit', '兔子'), ('cat', '小猫'), ('bear', '小熊'), ('dog', '小狗'), ('duck', '小鸭')]:
        m['hc_n_' + aid] = {'text': cn, 'games': ['hidecup']}
    # so_ 已核无占用；词音/整句全 TTS 无 clip（6-7 识字期）——SPEC-BATCH34 §2
    m['so_tut_watch'] = {'text': '看！拼出一句话', 'games': ['sentorder']}
    m['so_tut_turn'] = {'text': '你来拼一拼', 'games': ['sentorder']}
    m['so_hint'] = {'text': '想一想，先说哪一个', 'games': ['sentorder']}
    m['so_right'] = {'text': '拼对啦，真厉害', 'games': ['sentorder']}
    m['so_wrong_order'] = {'text': '这个词要晚一点说', 'games': ['sentorder']}
    m['so_wrong_word'] = {'text': '这个词不是这句话的', 'games': ['sentorder']}
    # r45 新 82 键（2026-09-22 主线注册；SPEC-R45-SENTORDER §R7——句库 20→40：句音 so_s_21..40
    # +词音 so_w_55..116；键号=SENT_ALL 行序/词首现序（键稳定律：存量 so_s_1..20/so_w_1..54 零漂移）；
    # 文案与 batch34/sentorder/_src/game-data.js SENT_BANK 表一字一致——主线 node 执行对账 2026-09-22）
    SO45_S = ['妈妈洗衣服', '爸爸看报纸', '哥哥搭积木', '妹妹踢毽子', '老师讲故事',
              '妹妹在屋里跳舞', '爷爷在公园打拳', '天气真好呀', '我把作业写完', '大家一起做操',
              '我先洗手再吃饭', '四只小羊在坡上吃草', '小猴子在山下爬树', '小螃蟹在桥下吹泡泡',
              '小猫先洗脸再睡觉', '我扶奶奶下楼', '小鸭子背小鸡过河', '小蝴蝶飞到哪里了',
              '小青蛙唱得真棒', '小猴子先爬树再摘桃']
    SO45_W = ['妈妈', '洗', '衣服', '爸爸', '看', '报纸', '哥哥', '搭', '积木', '妹妹', '踢', '毽子',
              '老师', '讲', '故事', '屋里', '跳舞', '爷爷', '公园', '打拳', '天气', '真', '好', '呀',
              '我', '把', '作业', '写完', '大家', '一起', '做', '操', '先', '洗手', '再', '吃饭',
              '四只', '小羊', '坡上', '吃草', '山下', '爬', '树', '小螃蟹', '桥下', '吹', '泡泡',
              '洗脸', '扶', '奶奶', '下楼', '背', '过河', '小蝴蝶', '飞', '到', '哪里', '了',
              '小青蛙', '得', '棒', '摘桃']
    for i, t in enumerate(SO45_S, 21):
        m['so_s_%d' % i] = {'text': t, 'games': ['sentorder']}
    for i, w in enumerate(SO45_W, 55):
        m['so_w_%d' % i] = {'text': w, 'games': ['sentorder']}
    assert len(SO45_S) == 20 and len(SO45_W) == 62, 'r45 新键应 20+62'
    # dc_ 已核无占用；名音=晓晓读类目（6 互异）——SPEC-BATCH34 §0.84；
    # 数量确认=名音+TTS'N只'尾段（契约 N 合法）；点亮计数音=Web Audio 无 clip
    m['dc_tut_watch'] = {'text': '看！数一数做表格', 'games': ['datacollect']}
    m['dc_tut_turn'] = {'text': '你来数一数', 'games': ['datacollect']}
    m['dc_hint'] = {'text': '再数一数呀', 'games': ['datacollect']}
    m['dc_right'] = {'text': '做对啦，真聪明', 'games': ['datacollect']}
    m['dc_wrong'] = {'text': '再数一数', 'games': ['datacollect']}
    m['dc_q_count'] = {'text': '有几只呀', 'games': ['datacollect']}
    m['dc_q_most'] = {'text': '哪一类最多呀', 'games': ['datacollect']}
    for tid, cn in [('rabbit', '兔子'), ('bird', '小鸟'), ('cat', '小猫'), ('chick', '小鸡'),
                    ('sheep', '小羊'), ('duck', '小鸭')]:
        m['dc_n_' + tid] = {'text': cn, 'games': ['datacollect']}
    # batch34 datacollect r14（2026-09-15 难度改造：AUDIT-78 datacollect 行——数量域 10-30+
    # 一格=2 换算/合计差值+两次调查+most 改「多几只」数值作答）。新 7 键已核 manifest 无占用
    # （2026-09-15 实查；既有 dc_ 13 键一字不改；dc_q_most 随 most 题型下线保留不删——grid r13
    # gri_hint 同例）。题面尾段/教学换算句；文案与 SPEC-BATCH34 §3-r14 真值现行版一致。
    m['dc_q_sum'] = {'text': '一共几只呀', 'games': ['datacollect']}
    m['dc_q_diff'] = {'text': '相差几只呀', 'games': ['datacollect']}
    m['dc_q_change_up'] = {'text': '比第一次多了几只', 'games': ['datacollect']}
    m['dc_q_change_dn'] = {'text': '比第一次少了几只', 'games': ['datacollect']}
    m['dc_q_total_up'] = {'text': '一共多了几只呀', 'games': ['datacollect']}
    m['dc_q_total_dn'] = {'text': '一共少了几只呀', 'games': ['datacollect']}
    m['dc_scale'] = {'text': '一格代表两只', 'games': ['datacollect']}
    # ---- batch35（turntake/maketen/errdoc，120 扩容批 5：每段各 1 款）----
    # tt_/mt_/ed_ 已核无占用（2026-09-12 实查）；md_ 被 memduel 占用故错题小医生用 ed_
    # 2026-09-13 turntake 难度升级改造：tut_watch/hint 文案改 + 新增排序/纠错三句
    m['tt_tut_watch'] = {'text': '看！给最渴的花浇水', 'games': ['turntake']}
    m['tt_tut_turn'] = {'text': '你来浇一浇', 'games': ['turntake']}
    m['tt_hint'] = {'text': '找找最渴的那盆', 'games': ['turntake']}
    m['tt_right'] = {'text': '浇对啦，花开咯', 'games': ['turntake']}
    m['tt_wrong'] = {'text': '这盆不渴哦', 'games': ['turntake']}
    m['tt_wait'] = {'text': '该小兔子浇啦，等等它', 'games': ['turntake']}
    m['tt_order_hint'] = {'text': '按最渴到最不渴的顺序浇', 'games': ['turntake']}
    m['tt_order_wrong'] = {'text': '先浇更渴的那盆', 'games': ['turntake']}
    m['tt_rabbit_wrong'] = {'text': '小兔子浇错啦，帮帮它', 'games': ['turntake']}
    # mt_ 已核无占用；数字/算式全 TTS 无 clip（NUMCN 1-20 契约 L）——SPEC-BATCH35 §2
    m['mt_tut_watch'] = {'text': '看！两张卡凑一凑', 'games': ['maketen']}
    m['mt_tut_turn'] = {'text': '你来凑一凑', 'games': ['maketen']}
    m['mt_hint'] = {'text': '想一想，还差几', 'games': ['maketen']}
    m['mt_right'] = {'text': '凑对啦，收银咯', 'games': ['maketen']}
    m['mt_wrong_more'] = {'text': '多了一点，换张小一点的', 'games': ['maketen']}
    m['mt_wrong_less'] = {'text': '少了一点，换张大一点的', 'games': ['maketen']}
    # ed_ 已核无占用；题库 fix≤20 NUMCN 0-20 全 TTS——SPEC-BATCH35 §3
    m['ed_tut_watch'] = {'text': '看！小医生看病啦', 'games': ['errdoc']}
    m['ed_tut_turn'] = {'text': '你来看一看', 'games': ['errdoc']}
    m['ed_hint'] = {'text': '再检查检查，哪里不对劲', 'games': ['errdoc']}
    m['ed_right'] = {'text': '治好啦，真棒', 'games': ['errdoc']}
    m['ed_wrong'] = {'text': '再想一想', 'games': ['errdoc']}
    m['ed_spot'] = {'text': '找到啦，就是这里', 'games': ['errdoc']}
    m['ed_rx_careful'] = {'text': '下次看得再仔细一点', 'games': ['errdoc']}
    m['ed_rx_calc'] = {'text': '再算一遍检查一下', 'games': ['errdoc']}
    m['ed_rx_slow'] = {'text': '慢一点点，不着急', 'games': ['errdoc']}
    # ---- batch36（comfort/quickcmp/tictac，120 扩容批 6：每段各 1 款）----
    # co_/qc_/tk_ 已核无占用（2026-09-12 实查）；tc_/cs_ 被占故井字棋用 tk_
    m['co_tut_watch'] = {'text': '看！朋友伤心了', 'games': ['comfort']}
    m['co_tut_turn'] = {'text': '你来试一试', 'games': ['comfort']}
    m['co_hint'] = {'text': '想想怎样朋友会开心', 'games': ['comfort']}
    m['co_right'] = {'text': '朋友开心啦，真好', 'games': ['comfort']}
    m['co_wrong'] = {'text': '这样朋友会更难过哦', 'games': ['comfort']}
    # r11 难度改造（2026-09-14，SPEC-BATCH36 §6）：co_ 5→7——择优题面锚+灰色次优反馈
    # （前缀 co_ 仍无占用；既有 5 键文本一字不改）
    m['co_pick'] = {'text': '都很好，哪个现在最好', 'games': ['comfort']}
    m['co_gray'] = {'text': '这样有点用，还有更好的办法', 'games': ['comfort']}
    # qc_ 已核无占用；数字复述全 TTS（NUMCN 1-10 契约 L）——SPEC-BATCH36 §2
    m['qc_tut_watch'] = {'text': '看！圆点闪一闪', 'games': ['quickcmp']}
    m['qc_tut_turn'] = {'text': '你来比一比', 'games': ['quickcmp']}
    m['qc_ask'] = {'text': '哪边的圆点多', 'games': ['quickcmp']}
    m['qc_hint'] = {'text': '数一数，比一比', 'games': ['quickcmp']}
    m['qc_right'] = {'text': '比对啦，真棒', 'games': ['quickcmp']}
    m['qc_wrong'] = {'text': '再仔细看看哦', 'games': ['quickcmp']}
    # r46 新 11 键（2026-09-22 主线注册；SPEC-R46-QUICKCMP §R7——比例带收紧+数量域 10-20+ch4 dual 双闪）：
    # ask_gap=dual 第二问问句；数词段 qc_n_11..20 在下方 T46 段注册（与在册 qc_n_1..10 同族同位置，
    # 文案=数词+'个'——SPEC §R7 原写纯数词，主线注册时勘误：复述链 segParts 在册 1-10 全带量词，
    # 同链必须同口径，见 T46 段注释）
    m['qc_ask_gap'] = {'text': '多几个呢', 'games': ['quickcmp']}
    # tk_ 已核无占用；策略款无 wrong 无错链（契约 I 豁免备案）——SPEC-BATCH36 §3
    m['tk_tut_watch'] = {'text': '看！三个连一线', 'games': ['tictac']}
    m['tk_tut_turn'] = {'text': '你来下一局', 'games': ['tictac']}
    m['tk_hint'] = {'text': '想办法连成三个', 'games': ['tictac']}
    m['tk_right'] = {'text': '赢啦，小冠军', 'games': ['tictac']}
    m['tk_draw'] = {'text': '平局啦，打得真棒', 'games': ['tictac']}
    m['tk_lose'] = {'text': '兔子赢啦，再来一局', 'games': ['tictac']}
    # r18 难度改造（2026-09-18，SPEC-BATCH36 §-r18-tictac）：tk_ 6→13——残局三题型题面+
    # 残局错反馈+负局复盘+两变体规则句（新后缀 puz_*/review/v44/vroll/wrong 已核
    # manifest 无占用 2026-09-18 实查；既有 6 键文本一字不改——对战关 I 豁免备案仍立，
    # tk_wrong 仅残局关错反馈链用，分题型口径见 SPEC §-r18 §5）
    m['tk_puz_win'] = {'text': '一步就能赢，找那一格', 'games': ['tictac']}
    m['tk_puz_block'] = {'text': '兔子快连成啦，堵住它', 'games': ['tictac']}
    m['tk_puz_fork'] = {'text': '好棋，一步造两条线', 'games': ['tictac']}
    m['tk_wrong'] = {'text': '再看看棋盘想一想', 'games': ['tictac']}
    m['tk_review'] = {'text': '这一步，下这里更好', 'games': ['tictac']}
    m['tk_v44'] = {'text': '大棋盘，三个连一线', 'games': ['tictac']}
    m['tk_vroll'] = {'text': '只有三颗子，下新的收旧的', 'games': ['tictac']}
    # ---- batch37（thanks/plant/teach，120 扩容批 7：每段各 1 款）----
    # th_/pl_/tch_ 已核无占用（2026-09-12 实查）——SPEC-BATCH37 §1-§3
    m['th_tut_watch'] = {'text': '看！朋友来帮忙', 'games': ['thanks']}
    m['th_tut_turn'] = {'text': '你来试一试', 'games': ['thanks']}
    m['th_hint'] = {'text': '怎么说谢谢呢', 'games': ['thanks']}
    m['th_right'] = {'text': '你真有礼貌', 'games': ['thanks']}
    m['th_wrong'] = {'text': '朋友会伤心的', 'games': ['thanks']}
    # r12 难度改造（2026-09-15，SPEC-BATCH37 §7）：th_ 5→+tha_ 4——场合适配/强度匹配择优锚+
    # 反向题框架+灰反馈+反向错反馈（前缀 tha_ 全库 0 占用已核 2026-09-15 实查；既有 th_ 5 键文本一字不改）
    m['tha_fit'] = {'text': '想一想，哪个最合适', 'games': ['thanks']}
    m['tha_not'] = {'text': '哪一句，现在不该说', 'games': ['thanks']}
    m['tha_gray'] = {'text': '有点用，还有更合适的哦', 'games': ['thanks']}
    m['tha_ok'] = {'text': '这句可以说，再找不该说的', 'games': ['thanks']}
    # pl_ 已核无占用；程序卡句=题面 keyless TTS（'第X行第Y列' 7 字骨架）——SPEC-BATCH37 §2
    m['pl_tut_watch'] = {'text': '看！按卡种小树', 'games': ['plant']}
    m['pl_tut_turn'] = {'text': '你来种一种', 'games': ['plant']}
    m['pl_ask'] = {'text': '种在哪一格', 'games': ['plant']}
    m['pl_hint'] = {'text': '先看行，再看列', 'games': ['plant']}
    m['pl_right'] = {'text': '小树种好啦', 'games': ['plant']}
    m['pl_wrong'] = {'text': '再看看卡片哦', 'games': ['plant']}
    # r47 新 14 键（2026-09-22 主线注册；SPEC-R47-PLANT §R6——rel 相对指令两段题：网格 3/4/5/6+
    # 标尺闪现 ch3-4+「从星星出发，向X格，向Y格」15 字卡；文案与 batch37/plant/_src/
    # game-data.js DESIGN_KEYS 一字一致（主线 node 对账 2026-09-22）；rel 卡句=queue 拼
    # 3 clip（pl_rel_from 头+两段 pl_mv_*）——CARD_WIN_REL 6900 est 罩 2325+1980×2+150×2；
    # q 域扩 20 键（pl_q_ r≥5/c≥5）在下方 T46 plant 段追加
    for _k in ('pl_rel_from', 'pl_rel_hint'):
        assert _k not in m, 'r47 键撞既有: %s' % _k
    m['pl_rel_from'] = {'text': '从星星出发', 'games': ['plant']}
    m['pl_rel_hint'] = {'text': '从星星开始，数着走', 'games': ['plant']}
    _PL47_DIR = {'r': '右', 'd': '下', 'l': '左', 'u': '上'}
    _PL47_STEP = {1: '一', 2: '两', 3: '三'}
    for _d in 'rdlu':
        for _s in (1, 2, 3):
            m['pl_mv_%s%d' % (_d, _s)] = {'text': '向%s%s格' % (_PL47_DIR[_d], _PL47_STEP[_s]), 'games': ['plant']}
    # tch_ 已核无占用；三步小课款（示范→学→纠错）——SPEC-BATCH37 §3
    m['tch_tut_watch'] = {'text': '看！当小老师', 'games': ['teach']}
    m['tch_tut_turn'] = {'text': '你来教一教', 'games': ['teach']}
    m['tch_task'] = {'text': '教兔子数一数', 'games': ['teach']}
    m['tch_hint'] = {'text': '看看兔子摆对了吗', 'games': ['teach']}
    m['tch_right'] = {'text': '兔子学会啦，你是好老师', 'games': ['teach']}
    m['tch_wrong'] = {'text': '兔子还没听懂哦', 'games': ['teach']}
    # ---- batch38（stamp/libr/gear，120 扩容批 8：每段各 1 款）----
    # spm_/lb_/gr_ 已核无占用（2026-09-12 实查；**st_ 已被 stack 占用 2 键（st_place/st_wind）——首查误查 pt_ 非 st_，当场改 spm_**）——SPEC-BATCH38 §1-§3
    # stamp v3 难度升档（2026-09-13）：spm_hint 文案改+新增 4 条任务框架/找错句
    # （题面=任务框架句——去语音泄题，规律只靠看不靠听；4 条现为占位复制须重合成）
    m['spm_tut_watch'] = {'text': '看！按规律盖花边', 'games': ['stamp']}
    m['spm_tut_turn'] = {'text': '你来盖一盖', 'games': ['stamp']}
    m['spm_hint'] = {'text': '找找颜色的规律，再看看形状', 'games': ['stamp']}
    m['spm_task_next'] = {'text': '看看花边的规律，盖下一个', 'games': ['stamp']}
    m['spm_task_dual'] = {'text': '颜色和形状都有自己的规律哦', 'games': ['stamp']}
    m['spm_task_fix'] = {'text': '花边里有一枚盖错啦，找出来', 'games': ['stamp']}
    m['spm_fix_wrong'] = {'text': '这枚是对的哦，再看看哪枚不合规律', 'games': ['stamp']}
    m['spm_right'] = {'text': '花边真漂亮', 'games': ['stamp']}
    m['spm_wrong'] = {'text': '再看看规律哦', 'games': ['stamp']}
    m['lb_tut_watch'] = {'text': '看！把书放回家', 'games': ['libr']}
    m['lb_tut_turn'] = {'text': '你来放一放', 'games': ['libr']}
    m['lb_hint'] = {'text': '它住哪一格呢', 'games': ['libr']}
    m['lb_right'] = {'text': '放对啦', 'games': ['libr']}
    m['lb_wrong'] = {'text': '再想一想哦', 'games': ['libr']}
    # r48 新 8 键（2026-09-22 主线注册；SPEC-R48-LIBR §R6——ch1 起恒四格+维度句去泄漏
    # （只述分类标准不念答案）+ch4 跨维挑书二级题；文案与 batch38/libr/_src/game-data.js
    # DIM2_HINTS/PICK_HINTS 一字一致（主线亲核 2026-09-22）；旧 lb_dim_* 4 键退役
    # （维度句改版后代码孤儿——下方 lb_dim 段随本轮删除）
    _LB48 = (('d2_farm', '它住在农场里'), ('d2_eat', '我们能吃它'),
             ('d2_pet', '它是我们的好朋友'), ('d2_wear', '天冷了要穿上它'),
             ('pick_animal', '帮动物格挑一本新书'), ('pick_food', '帮食物格挑一本新书'),
             ('pick_clothes', '帮衣物格挑一本新书'), ('pick_vehicle', '帮交通格挑一本新书'))
    assert len(_LB48) == 8, 'r48 libr 新键应 8'
    for _k, _t in _LB48:
        assert 'lb_%s' % _k not in m, 'r48 键撞既有: lb_%s' % _k
        m['lb_%s' % _k] = {'text': _t, 'games': ['libr']}
    # gear v3 难度升档（2026-09-13 r3）：双答制阶段1（转向预判/传动比）错反馈 2 条
    # （gr_dir_wrong/gr_speed_wrong 前缀已核 manifest 无占用 2026-09-13 实查；
    #   题面句=章档 obs keyless say 沿用家族 N 机制，不入 clip）
    m['gr_tut_watch'] = {'text': '看！齿轮咬齿轮', 'games': ['gear']}
    m['gr_tut_turn'] = {'text': '你来装一装', 'games': ['gear']}
    m['gr_hint'] = {'text': '看看旁边的齿轮', 'games': ['gear']}
    m['gr_right'] = {'text': '风车转起来啦', 'games': ['gear']}
    m['gr_wrong'] = {'text': '齿轮还没咬上哦', 'games': ['gear']}
    m['gr_dir_wrong'] = {'text': '不对哦，隔一个反一次', 'games': ['gear']}
    m['gr_speed_wrong'] = {'text': '数一数两个齿轮的齿', 'games': ['gear']}

    # ---- batch39（crd/etm/cir，120 扩容批 9：每段各 1 款）----
    # crd_/etm_/cir_ 已核无占用（2026-09-12 实查；emo_ 被 b25 emotions 全套 11 键占用——当场改 etm_）——SPEC-BATCH39 §1-§3
    m['crd_tut_watch'] = {'text': '看！做一张贺卡', 'games': ['crd']}
    m['crd_tut_turn'] = {'text': '你也做一张', 'games': ['crd']}
    m['crd_hint'] = {'text': '想想这是给谁的', 'games': ['crd']}
    m['crd_right'] = {'text': '贺卡真好看', 'games': ['crd']}
    m['crd_wrong'] = {'text': '再想想主题哦', 'games': ['crd']}
    # r12 难度批新增 3 键（2026-09-15，crd r12 块：错链方向提示按步型分流——
    # 偏好推理/冲突排除/语用适配；crd_ 前缀既有 5 键无撞名已核）
    m['crd_hint_like'] = {'text': '想想他喜欢什么', 'games': ['crd']}
    m['crd_hint_no'] = {'text': '这个节日不用它', 'games': ['crd']}
    m['crd_hint_wish'] = {'text': '想想现在什么事', 'games': ['crd']}
    m['etm_tut_watch'] = {'text': '看！现在心情怎么样', 'games': ['etm']}
    m['etm_tut_turn'] = {'text': '你来指一指', 'games': ['etm']}
    m['etm_hint'] = {'text': '听听发生了什么', 'games': ['etm']}
    m['etm_right'] = {'text': '你说对啦', 'games': ['etm']}
    m['etm_wrong'] = {'text': '再听一次想想哦', 'games': ['etm']}
    m['cir_tut_watch'] = {'text': '看！电路连起来', 'games': ['cir']}
    m['cir_tut_turn'] = {'text': '你来连一连', 'games': ['cir']}
    m['cir_hint'] = {'text': '看看哪里断了', 'games': ['cir']}
    m['cir_right'] = {'text': '小灯泡亮啦', 'games': ['cir']}
    m['cir_wrong'] = {'text': '还没连上哦', 'games': ['cir']}
    # r4 难度批新增 2 键（2026-09-13，SPEC-BATCH39 §3 r4 块：双答制阶段1 专用错链）
    m['cir_pred_wrong'] = {'text': '不对哦，顺着电线找一找', 'games': ['cir']}
    m['cir_bright_wrong'] = {'text': '想想一盏灯有多亮', 'games': ['cir']}
    # ---- batch40（ins/cbx/brk，120 扩容收官批：每段各 1 款）----
    # ins_/cbx_/brk_ 已核无占用（2026-09-12 实查；cal_ 被 b26 calendar 占 5 同名键当场改 cbx_——st_ 事故预防第三次命中）——SPEC-BATCH40 §1-§3
    m['ins_tut_watch'] = {'text': '看！昆虫和蜘蛛', 'games': ['ins']}
    m['ins_tut_turn'] = {'text': '你来点一点', 'games': ['ins']}
    m['ins_hint'] = {'text': '数数它有几条腿', 'games': ['ins']}
    m['ins_right'] = {'text': '答对啦，小科学家', 'games': ['ins']}
    m['ins_wrong'] = {'text': '再数数腿呀', 'games': ['ins']}
    m['ins_a_ant'] = {'text': '蚂蚁', 'games': ['ins']}
    m['ins_a_butterfly'] = {'text': '蝴蝶', 'games': ['ins']}
    m['ins_a_bee'] = {'text': '蜜蜂', 'games': ['ins']}
    m['ins_a_ladybird'] = {'text': '瓢虫', 'games': ['ins']}
    m['ins_a_spider'] = {'text': '蜘蛛', 'games': ['ins']}
    m['ins_a_wolfspider'] = {'text': '狼蛛', 'games': ['ins']}
    m['ins_a_jumpspider'] = {'text': '跳蛛', 'games': ['ins']}
    m['ins_a_scorpion'] = {'text': '蝎子', 'games': ['ins']}
    m['ins_sci_insect'] = {'text': '昆虫有六条腿，头胸腹三部分', 'games': ['ins']}
    m['ins_sci_spider'] = {'text': '蜘蛛有八条腿，它不是昆虫哦', 'games': ['ins']}
    m['cbx_tut_watch'] = {'text': '看！冷静工具箱', 'games': ['cbx']}
    m['cbx_tut_turn'] = {'text': '你来选一选', 'games': ['cbx']}
    m['cbx_hint'] = {'text': '选让心里舒服的', 'games': ['cbx']}
    m['cbx_right'] = {'text': '好办法，舒服多啦', 'games': ['cbx']}
    m['cbx_wrong'] = {'text': '这样会更难受哦', 'games': ['cbx']}
    m['cbx_g_breath'] = {'text': '慢慢吸气，再慢慢呼出来，深呼吸', 'games': ['cbx']}
    m['cbx_g_countten'] = {'text': '闭上眼睛，慢慢数到十', 'games': ['cbx']}
    m['cbx_g_hugbunny'] = {'text': '抱抱小兔子，软软的很安心', 'games': ['cbx']}
    m['cbx_g_sayout'] = {'text': '把心里的话说出来', 'games': ['cbx']}
    m['cbx_g_drinkwater'] = {'text': '喝一口温水，慢慢咽下去', 'games': ['cbx']}
    m['cbx_b_throw'] = {'text': '玩具摔坏了，你也会更难过', 'games': ['cbx']}
    m['cbx_b_shout'] = {'text': '大喊大叫，旁边的人也难受', 'games': ['cbx']}
    m['cbx_b_hit'] = {'text': '打人会让别人疼，还会失去朋友', 'games': ['cbx']}
    m['cbx_b_tear'] = {'text': '书撕坏了，就没人能看了', 'games': ['cbx']}
    m['cbx_n_cryonly'] = {'text': '哭一会儿可以，一直哭问题还在哦', 'games': ['cbx']}
    m['cbx_n_hide'] = {'text': '躲起来，大家就帮不到你啦', 'games': ['cbx']}
    m['brk_tut_watch'] = {'text': '看！大问题拆小问题', 'games': ['brk']}
    m['brk_tut_turn'] = {'text': '你来拆一拆', 'games': ['brk']}
    m['brk_hint'] = {'text': '哪几步帮到任务', 'games': ['brk']}
    m['brk_right'] = {'text': '拆得好，一步步完成', 'games': ['brk']}
    m['brk_wrong'] = {'text': '这张卡是别的任务用的', 'games': ['brk']}
    m['brk_t_birthday'] = {'text': '办一场生日聚会', 'games': ['brk']}
    m['brk_t_picnic'] = {'text': '去公园野餐', 'games': ['brk']}
    m['brk_t_cardmake'] = {'text': '给妈妈做贺卡', 'games': ['brk']}
    m['brk_t_planttree'] = {'text': '种一棵小树', 'games': ['brk']}
    m['brk_t_bagpack'] = {'text': '整理小书包', 'games': ['brk']}
    m['brk_t_washhand'] = {'text': '洗干净小手', 'games': ['brk']}
    m['brk_t_feedrabbit'] = {'text': '喂小兔子吃饭', 'games': ['brk']}
    m['brk_t_bedtime'] = {'text': '准备上床睡觉', 'games': ['brk']}

    # ==================================================================
    # Task#46 阶段1（2026-09-19）：keyless 语音点全量 clip 化注册
    # 依据 voice/task46-enumerate/ 静态枚举清单（ENUM-A/B）+ 全站 dump（site-dump.txt，
    # 程序化提取零手抄）；文案=各款 _src 源码原文（注释标源文件锚点）。
    # 防线：T46() 撞既有键立即断言崩（撞前缀四事故史）；既有 2244 键一字不改。
    # ==================================================================
    _pre46 = set(m)
    def T46(key, text, games):
        assert key not in m, 'T46 撞既有/已注册键: %s' % key
        m[key] = {'text': text, 'games': [games] if isinstance(games, str) else games}
    def SRC46(*parts):
        return open(os.path.join(ROOT, *parts), encoding='utf-8').read()

    # ---- 1a：B 类命名键（VOICE 表有名 manifest 无键 → play 落空走 TTS）----
    # shapeshome wrongSpeech 整句口径：既有 shp_q3_*/shp_nq_* 带「找一找，」前缀无法复用
    # 为段，73 整句（tri 48=6色×4形×2大小 / neg 24=6色×4形）——镜像 qKeyOf 命名
    T46('shp_wrong_g', '不对哦，看看问号那一行的形状，再看看那一列的颜色', 'shapeshome')
    for cid, cn in CS:
        for sid, sn in SS:
            for zid, zn in SZ:
                T46('shp_wrong_tri_%s_%s_%s' % (cid, sid, zid), '不对哦，要找' + cn + '的' + zn + sn, 'shapeshome')
    for cid, cn in CS:
        for sid, sn in SS:
            T46('shp_wrong_neg_%s_%s' % (cid, sid), '不对哦，要找不是' + cn + '、也不是' + sn + '的', 'shapeshome')
    # worden wrongText 三模式（game-data.js wrongText）
    T46('wen_wrong_hear', '不对哦，再听一听', 'worden')          # sound2pic
    T46('wen_wrong_read', '不对哦，再读一读', 'worden')          # word2pic
    T46('wen_wrong_find', '不对哦，再找一找它的英语', 'worden')  # pic2word
    # 其余 B 类单键（各款 VOICE 表/wrongText 原文）
    T46('sub_refly', '好，我们重新飞一飞', 'subbug')
    T46('fru_knife', '点一点小刀，切一切', 'fruitsplit')
    T46('fru_same', '一半和一半，一样多', 'fruitsplit')
    T46('fru_wrong', '不对哦，再想一想', 'fruitsplit')
    T46('hop_wrong', '一格一格跳', 'hopscotch')
    T46('pic_wrong', '不对哦，再找一找', 'picto')
    T46('si_wrong', '敲错啦，再看一遍，跟着敲', 'simon')
    T46('mg_wrong', '不对哦，想一想刚才哪里亮过', 'memgrid')
    T46('mir_wrong', '不对哦，想一想镜子里的样子', 'mirror')
    T46('sli_q', '把小兔子的照片拼好吧', 'slide')                # slide quizSpeech() 恒定
    T46('sha_w_same', '再找一找，一样的影子', 'shadow')           # shadow key:null wrong
    T46('sor_wrong', '再想一想，先点哪个呀', 'sortsize')          # sortsize key:null wrong
    # （idm_q_fill/idm_q_near 已在册同文——登记发现清单，不重注册）

    # ---- 1b：固定句族 / key:null 族 / 数词副本族（按款）----
    # kitchen-rhythm 结算兜底拆段（game-main.js:681；kitchen_n_1..30/kitchen_cut/kitchen_cat 在册）
    T46('kr_combo', '，连击', 'kitchen')
    for n in range(1, 31):
        T46('kr_dn_%d' % n, num_cn(n) + '下', 'kitchen')
    T46('kr_dn_0', num_cn(0) + '下', 'kitchen')            # 09-19 首批B上报：完美局/AFK 0 值域残留 TTS——零值键补齐（彻底消灭 speechSynthesis 红线）
    T46('kitchen_n_0', num_cn(0) + '个', 'kitchen')        # 同上（hit=0 / miss=0 段）
    # shop-math 报数/付钱/找零（build/game-main.js:334/491/541；shop_n_6..20 在册补 1-5）
    for n in range(1, 21):
        T46('shop_cn_%d' % n, num_cn(n) + '个', 'shop')
    for n in range(1, 6):
        T46('shop_n_%d' % n, num_cn(n) + '元', 'shop')
    T46('shop_n_0', num_cn(0) + '元', 'shop')              # 09-19 找零 0 元（整付 3+5=8 类）零值键
    T46('shop_put', '放一枚', 'shop')
    T46('shop_try', '元的试试吧', 'shop')
    T46('shop_chg', '找了', 'shop')
    # connect 题面/确认句（NM/FM/EATS/CHAINS 表提取；stemOf/confirmOf 模板 game-data.js:88-102）
    con2 = SRC46('batch5', 'connect', '_src', 'game-data.js')
    _nm_blk = re.search(r'const NM = \{([^}]+)\}', con2).group(1)
    NM = {int(k): v for k, v in re.findall(r"(\d+):\s*'([^']+)'", _nm_blk)}
    _fm_blk = re.search(r'const FM = \{([^}]+)\}', con2).group(1)
    FM = {int(k): v for k, v in re.findall(r"(\d+):\s*'([^']+)'", _fm_blk)}
    assert len(NM) == 12 and len(FM) == 14, 'connect NM/FM 提取异常'
    _eats_blk = con2[con2.find('const EATS'):con2.find('const ownersOf')]
    # 行序=动物 id（行内全部数字=该动物吃的食物表，首数字也是食物——「[1]」即只吃 1 号小鱼）
    EATS = {i: [int(x) for x in m.group(1).split(',') if x.strip()]
            for i, m in enumerate(re.finditer(r'^\s*\[([\d,\s]+)\]', _eats_blk, re.M))}
    assert len(EATS) == 12, 'connect EATS 提取异常: %d' % len(EATS)
    CHAINSC = [(int(b), int(md), int(t)) for b, md, t in
               re.findall(r'base: (\d+), mid:\s*(\d+),\s*top: (\d+)', con2)]
    assert len(CHAINSC) == 3, 'connect CHAINS 提取异常'
    owners = {}
    for a, foods in EATS.items():
        for f in foods:
            owners.setdefault(f, []).append(a)
    for a in NM:
        T46('con_st_pair_%d' % a, '想一想，' + NM[a] + '爱吃什么', 'connect')
        T46('con_st_set_%d' % a, '把' + NM[a] + '能吃的都连上', 'connect')
        T46('con_cf_%d' % a, NM[a] + '吃得饱饱的，真开心', 'connect')
    for f, os_ in owners.items():
        if len(os_) == 1:                                   # 专属食物 11 → anti 题
            a = os_[0]
            T46('con_st_anti_%d' % a, '只有' + NM[a] + '吃的是哪一个', 'connect')
            T46('con_cf_anti_%d' % a, '答对啦，只有' + NM[a] + '爱吃' + FM[f], 'connect')
    _con_up_seen = set()   # 两链同 (mid,base)=(5,6)——up 题干去重后仅 2 句（侦察已核）
    for b, md, t in CHAINSC:
        if (md, b) not in _con_up_seen:
            _con_up_seen.add((md, b))
            T46('con_st_up_%d_%d' % (md, b), FM[md] + '吃过' + FM[b] + '，谁吃掉它', 'connect')
        T46('con_st_dn_%d_%d' % (b, t), '什么吃过' + FM[b] + '，被' + NM[t] + '吃到', 'connect')
        T46('con_cf_chain_%d' % t, NM[t] + '吃到' + FM[b] + '啦', 'connect')
    # compare 语义句+数数跟读（game-data.js SEM_TEXT / game-main.js:439 say(String(k))）
    T46('cmp_sem_gt', '左边多', 'compare')
    T46('cmp_sem_lt', '右边多', 'compare')
    T46('cmp_sem_eq', '一样多', 'compare')
    for k in range(1, 21):   # 09-19 阶段2首批A上报：dch4 数字卡 n 可达 20（枚举口径 1..10 漏 11..20），跟读 k 实达 20
        T46('cmp_n_%d' % k, num_cn(k), 'compare')
    # r29 难度改造 tri 三数比大小+near 最接近N 两新题型题面/反馈（SPEC-R29-COMPARE
    # §R10；前缀已核 manifest 零占用——在册 cmp_ 键不含下列 5 键）
    T46('cmp_tri_ask', '哪张卡片', 'compare')
    T46('cmp_tri_max', '最大', 'compare')
    T46('cmp_tri_min', '最小', 'compare')
    T46('cmp_near_ask', '哪个数最接近', 'compare')
    T46('cmp_near_ok', '最接近', 'compare')
    # subbug 题面拆段（game-data.js:48 qSpeech；numCn 0..20）
    T46('sub_s_leaf', '叶子上有', 'subbug')
    T46('sub_s_fly', '只小虫，飞走了', 'subbug')
    T46('sub_s_left', '只，还剩几只？', 'subbug')
    # r30 难度改造 盲飞三段式+dual 两步题题面分型（SPEC-R30-SUBBUG §R10；
    # 前缀已核 manifest 零撞名——在册 sub_ 键不含下列 6 键）
    T46('sub_calc', '先算一算，还剩几只', 'subbug')
    T46('sub_s_green', '数一数绿色的小虫，', 'subbug')
    T46('sub_s_fly2', '飞走了', 'subbug')
    T46('sub_s_come', '只小虫，飞来了', 'subbug')
    T46('sub_s_andcome', '只，又飞来了', 'subbug')
    T46('sub_s_andfly', '只，又飞走了', 'subbug')
    # r31 难度改造 ±2 邻居+mid4 内插+dual 两步题面（SPEC-R31-NEIGHBORS §R10；
    # 前缀已核 manifest 零撞名——在册 neb_ 键不含下列 5 键）
    T46('neb_qp2', '的邻居是几呀？比它多二', 'neighbors')
    T46('neb_qm2', '的邻居是几呀？比它少二', 'neighbors')
    T46('neb_and', '和', 'neighbors')
    T46('neb_dual_a', '的多一邻居住好啦，再找它的少二邻居，是几号呀', 'neighbors')
    T46('neb_dual_b', '的多二邻居住好啦，再找它的少一邻居，是几号呀', 'neighbors')
    # r32 难度改造 blank 缺字母补全指令（SPEC-R32-WORDEN §R10；前缀已核 manifest 零撞名；
    # 24 新词 en 音走上方表提取段自动注册，此处仅 zh 指令 1 键——
    # 字母卡不播 letter name 为设计决策（SPEC §R1），无字母音键）
    T46('wen_q3', '看图，补上缺少的字母吧', 'worden')
    # r33 难度改造 two 两步指令+flip 参照物翻转链段（SPEC-R33-WHEREISTAND §R10；
    # WIS2_TEXTS 为运行时构造表——此处 Python 同构复刻，从 DIRS/NUMCN5/ANIMALS 源表
    # 提取零手抄；前缀 wis2_ 已核 manifest 零占用；链段拼接句=game-main speakQuiz
    # two=[from,go] / flip=[name,side] 两段式（段间 150ms queue））
    wis_src = SRC46('batch9', 'whereistand', '_src', 'game-data.js')
    _wis_dirs = dict(re.findall(r"(\w+):\s*\{\s*cn: '([^']+)'",
                     wis_src[wis_src.find('const DIRS'):wis_src.find('const NUMCN5')]))
    assert len(_wis_dirs) == 4, 'whereistand DIRS 提取异常: %d' % len(_wis_dirs)
    _wis_n5 = re.findall(r"'([^']*)'", re.search(r'NUMCN5 = \[([^\]]+)\]', wis_src).group(1))
    assert _wis_n5 == ['', '一', '二', '三', '四', '五'], 'NUMCN5 与预期不一致: %s' % _wis_n5
    for d in ('up', 'down', 'left', 'right'):
        for k in (2, 3, 4):
            T46('wis2_from_%s_%d' % (d, k), '从' + _wis_dirs[d] + '边数，第' + _wis_n5[k] + '个', 'whereistand')
        T46('wis2_go_%s' % d, '它的' + _wis_dirs[d] + '边，是谁呀', 'whereistand')
        T46('wis2_side_%s' % d, '的' + _wis_dirs[d] + '边，是谁呀', 'whereistand')
    WIS_AN = re.findall(r"(\w+):\s*\{\s*name: '([^']+)'",
                        wis_src[wis_src.find('const ANIMALS'):wis_src.find('const ANIMAL_IDS')])
    assert len(WIS_AN) == 8, 'whereistand ANIMALS 提取应 8: %d' % len(WIS_AN)
    for aid, an in WIS_AN:
        T46('wis2_name_%s' % aid, an, 'whereistand')
    for n in range(0, 21):
        T46('sub_n_%d' % n, num_cn(n), 'subbug')
    # fishcolor 拆段+间色反馈（game-data.js quizSpeech/MIXES/COLORS）
    fis_src = SRC46('batch7', 'fishcolor', '_src', 'game-data.js')
    FIS_C = re.findall(r"(\w+):\s*\{\s*name: '([^']+)'", fis_src)[:9]
    assert len(FIS_C) == 9, 'fishcolor 颜色表提取异常'
    for cid, cn in FIS_C:
        T46('fis_c_%s' % cid, cn, 'fishcolor')
    for n, cn in ((1, '一条'), (2, '两条'), (3, '三条')):
        T46('fis_cnt_%d' % n, cn, 'fishcolor')
    for k, t in (('diao', '钓'), ('dewei', '的鱼'), ('xian', '先钓'), ('zai', '，再钓'),
                 ('shi', '是'), ('he', '和'), ('bian', '变的，先钓'), ('bianc', '，变出')):
        T46('fis_s_%s' % k, t, 'fishcolor')
    for mix, c1, c2 in re.findall(r"(\w+):\s*\[\s*'(\w+)',\s*'(\w+)'\s*\]",
                                  fis_src[fis_src.find('const MIXES'):fis_src.find('const POOLS')]):
        n1, n2 = dict(FIS_C)[c1], dict(FIS_C)[c2]
        T46('fis_mix_%s_12' % mix, n1 + '和' + n2 + '，变成' + dict(FIS_C)[mix] + '的小鱼啦', 'fishcolor')
        T46('fis_mix_%s_21' % mix, n2 + '和' + n1 + '，变成' + dict(FIS_C)[mix] + '的小鱼啦', 'fishcolor')
    # fruitsplit 题面全族（game-data.js MODE_QUEST/NUM_CN/FRUIT_NAME；fair 题面=在册 fru_fair_q）
    T46('fru_q_pick', '看一看，哪一个是它的一半？', 'fruitsplit')
    T46('fru_q_cut', '点一点小刀，把水果切成两半', 'fruitsplit')
    fru_src = SRC46('batch7', 'fruitsplit', '_src', 'game-data.js')
    FRU_N = re.findall(r"(\w+):\s*'([^']+)'", fru_src[fru_src.find('const FRUIT_NAME'):fru_src.find('}', fru_src.find('const FRUIT_NAME'))])
    assert len(FRU_N) == 6, 'fruitsplit FRUIT_NAME 提取异常'
    for fid, fn in FRU_N:
        T46('fru_q_cut_%s' % fid, '点一点小刀，把' + fn + '切成两半', 'fruitsplit')
    T46('fru_q_match', '找一找，另一半在哪里？', 'fruitsplit')
    for n, cn in ((2, '两'), (3, '三'), (4, '四')):
        T46('fru_q_choose_%d' % n, cn + '个人分，选一样大的切法', 'fruitsplit')
        T46('fru_q_fair3_%d' % n, cn + '块一样大，很公平', 'fruitsplit')
    # hopscotch 跳格指令拆段（game-data.js qSpeech：mode2 两块跳 + 往回 4 前缀）
    for k, t in ((1, '跳到'), (2, '往回跳，跳到'), (3, '两块两块跳，跳到'), (4, '两块两块往回跳，跳到')):
        T46('hop_p_%d' % k, t, 'hopscotch')
    for n in range(1, 21):
        T46('hop_n_%d' % n, num_cn(n), 'hopscotch')
    # neighbors 中间数+数词+纠错（game-main.js:67/73；game-data.js:37 key:null）
    for n in range(1, 19):
        T46('neb_mid_%d' % n, num_cn(n) + '和' + num_cn(n + 2), 'neighbors')
    for n in range(1, 21):
        T46('neb_n_%d' % n, num_cn(n), 'neighbors')
    T46('neb_wrong', '再想一想，顺着数一数', 'neighbors')
    # whereistand 序数题面整句 20 + 纠错（game-data.js ordinalCn/DIRS/NUMCN5）
    for d, dcn in (('up', '上'), ('down', '下'), ('left', '左'), ('right', '右')):
        for k, kcn in ((1, '一'), (2, '二'), (3, '三'), (4, '四'), (5, '五')):
            T46('wis_ord_%s_%d' % (d, k), '从' + dcn + '边数，第' + kcn + '个是谁呀', 'whereistand')
    T46('wis_wrong', '再想一想，它站在哪里呀', 'whereistand')
    # chainsum 题面拆段+纠错（game-data.js qSpeech/opCn；numCn 0..20）
    for n in range(0, 21):
        T46('cs_n_%d' % n, num_cn(n), 'chainsum')
    T46('cs_op_add', '加', 'chainsum')
    T46('cs_op_sub', '减', 'chainsum')
    T46('cs_tail', '等于几呀', 'chainsum')
    T46('cs_wrong', '再想一想，算一算', 'chainsum')
    # habit 流程题尾段+三纠错（game-data.js:60-65）
    T46('hb_suffix', '，先做什么呀', 'habit')
    T46('hb_w_start', '再想一想，一开始先做什么？', 'habit')
    T46('hb_w_mid', '这一步要用到上一步的结果吗？', 'habit')
    T46('hb_w_adj', '再想想这两步，谁得等谁？', 'habit')
    # cipher 值词/符号名/密码对连接词（game-data.js WORDS/SYMS；main sayVal/sayPair）
    ci_src = SRC46('batch19', 'cipher', '_src', 'game-data.js')
    CI_WORDS = re.findall(r"'([^']+)'", re.search(r'const WORDS = \[([^\]]+)\]', ci_src).group(1))
    assert len(CI_WORDS) == 12, 'cipher WORDS 提取异常'
    _syms_blk = ci_src[ci_src.find('const SYMS'):]
    CI_SYMS = re.findall(r"^\s+(\w+):\s*\{\s*name: '([^']+)'", _syms_blk[:_syms_blk.find('\n};')], re.M)
    assert len(CI_SYMS) == 10, 'cipher SYMS 提取异常: %d' % len(CI_SYMS)
    for n in range(1, 10):
        T46('ci_v_d%d' % n, str(n), 'cipher')
    for w in CI_WORDS:
        T46('ci_v_%s' % w, w, 'cipher')
    for sid, sn in CI_SYMS:
        T46('ci_sym_%s' % sid, sn, 'cipher')
    T46('ci_repr', '，代表，', 'cipher')
    T46('ci_look1', '看破译好的情报，推一推', 'cipher')
    T46('ci_look2', '这一行缺了一角，看情报推一推', 'cipher')
    # area 四静题面+calcAsk 15 对×2+确认超集（game-data.js ASK/calcAsk；main:37-44）
    T46('ar_ask_count', '挖空区有几格？', 'area')
    T46('ar_ask_samearea', '哪块砖和挖空区一样大？', 'area')
    T46('ar_ask_combo', '这些砖拼在一起，一共几格？', 'area')
    T46('ar_ask_unit2', '每格住 2 只小蚂蚁，一共住几只？', 'area')
    for L in range(2, 6):
        for W in range(2, 6):
            if L * W > 20: continue
            T46('ar_calc_area_%d_%d' % (L, W), '长 %d 宽 %d，铺满要几格？' % (L, W), 'area')
            T46('ar_calc_peri_%d_%d' % (L, W), '长 %d 宽 %d，一圈是几格边？' % (L, W), 'area')
    for p in range(8, 21, 2):
        T46('ar_cf_p_%d' % p, '一圈 %d 格，铺好啦，真整齐' % p, 'area')
    for t in range(2, 21):
        T46('ar_cf_c_%d' % t, '一共 %d 格，铺好啦，真整齐' % t, 'area')
    for v in range(2, 21, 2):
        T46('ar_cf_u_%d' % v, '一共 %d 只，铺好啦，真整齐' % v, 'area')
    for n in range(1, 21):   # 09-19 A5 上报：calc-area hole 分支 G=L×W 可达 20（注册域截断在 10，3×4~5×4 七对受影响）
        T46('ar_cf_s_%d' % n, '%d 格，铺好啦，真整齐' % n, 'area')
    # bounce / coder2 / stack / sudokunum
    T46('bc_hole', '进错洞啦，换个方向再试试', 'bounce')
    for k, t in (('f', '前进'), ('l', '左转'), ('r', '右转'), ('rep2', '重复两次'), ('rep3', '重复三次')):
        T46('cd2_i_%s' % k, t, 'coder2')
    T46('cd2_loop', '循环块里不放循环块哦', 'coder2')
    for ch, t in ((1, '把楼层一块块搭上去'), (2, '看看宽窄，稳稳地搭'), (3, '风来了，往另一边放'), (4, '大风天，搭一座高楼')):
        T46('st_q_%d' % ch, t, 'stack')
    T46('sn_dead', '有一个数字放错啦，换一换摇头的格子', 'sudokunum')
    # memduel 串读值词（game-data.js DIGITS/LETTERS/COLORS）
    for v in range(1, 10):
        T46('md_v_d%d' % v, str(v), 'memduel')
    for ch in 'ABCDEFGHIJKLM':
        T46('md_v_l%s' % ch, ch, 'memduel')
    for cn in ('红', '橙', '黄', '绿', '蓝', '紫', '粉', '棕', '灰', '黑'):
        T46('md_v_c%s' % cn, cn, 'memduel')

    # bridge 口诀 token+尾句（game-data.js chantText/COLORS short/shapeShort）
    for cid, cn in (('red', '红'), ('blue', '蓝'), ('green', '绿'), ('purple', '紫'), ('orange', '橙')):
        T46('brg_t_%s' % cid, cn, 'bridge')
        T46('brg_t_%s_sq' % cid, cn + '方', 'bridge')
        T46('brg_t_%s_ci' % cid, cn + '圆', 'bridge')
    T46('brg_t_tail', '，有一块不对哦', 'bridge')
    # bubble 题面 18+跟数+尾句（game-data.js quizSpeech/COLOR_CN；N∈3..8）
    for n in range(3, 9):
        for cid, cn in (('blue', '蓝色'), ('yellow', '黄色'), ('pink', '粉色')):
            T46('bub_q_%d_%s' % (n, cid), '点破' + num_cn(n) + '个' + cn + '泡泡', 'bubble')
    for n in range(1, 9):
        T46('bub_n_%d' % n, num_cn(n), 'bubble')
    T46('bub_enough', '数够了就拍拍小兔子', 'bubble')
    # feed 题面 15+combo 拆段+数词+超放回（game-data.js quizSpeech/comboSpeech/FOODS）
    FED_F = (('carrot', '胡萝卜', '根'), ('greens', '青菜', '片'), ('apple', '苹果', '个'))
    for n in range(6, 11):
        for fid, fn, mw in FED_F:
            T46('fed_q_%d_%s' % (n, fid), '喂小兔子' + num_cn(n) + mw + fn, 'feed')
    T46('fed_c_head', '喂小兔子，', 'feed')
    for n in range(2, 6):
        for fid, fn, mw in FED_F:
            T46('fed_c_%d_%s' % (n, fid), num_cn(n) + mw + fn, 'feed')
    for n in range(0, 11):
        T46('fed_n_%d' % n, num_cn(n), 'feed')
    T46('fed_more', '多啦，放回去一根', 'feed')
    # colormix 题面 10 目标+4 颜料名+变绿（game-data.js COLORS quizSpeech；白/浑浊非目标）
    # r21 深浅两档+三色扩表（SPEC-R21-COLORMIX §R6）：+3 浅二级色题面+反推题面
    for cid, cn in (('red', '红色'), ('yellow', '黄色'), ('blue', '蓝色'), ('orange', '橙色'),
                    ('green', '绿色'), ('purple', '紫色'), ('brown', '棕色'),
                    ('lightred', '浅红色'), ('lightyellow', '浅黄色'), ('lightblue', '浅蓝色'),
                    ('lightorange', '浅橙色'), ('lightgreen', '浅绿色'), ('lightpurple', '浅紫色')):
        T46('col_q_%s' % cid, '调出' + cn + '吧', 'colormix')
    for cid, cn in (('red', '红色'), ('yellow', '黄色'), ('blue', '蓝色'), ('white', '白色')):
        T46('col_paint_%s' % cid, cn, 'colormix')
    T46('col_green', '变绿啦', 'colormix')
    T46('col_rev_q', '这个颜色是怎么调出来的呀', 'colormix')
    # hidden 单类题面+双类拆段+纠错+引导（game-data.js ANIMALS n/quizSpeech）
    hid_src = SRC46('batch22', 'hidden', '_src', 'game-data.js')
    _hid_blk = hid_src[hid_src.find('const ANIMALS'):hid_src.find('};', hid_src.find('const ANIMALS'))]
    HID_A = re.findall(r"(\w+):\s*\{\s*n: '([^']+)'", _hid_blk)
    assert len(HID_A) == 6, 'hidden ANIMALS 提取异常'
    for aid, an in HID_A:
        T46('hid_q_%s' % aid, '找一找，藏着几只' + an + '呀', 'hidden')
        T46('hid_an_%s' % aid, an, 'hidden')
        T46('hid_w_%s' % aid, '这不是' + an + '呀', 'hidden')
    T46('hid_s_find', '找', 'hidden')
    T46('hid_s_he', '和', 'hidden')
    for n in range(1, 7):
        T46('hid_n_%d' % n, ('两' if n == 2 else num_cn(n)) + '只', 'hidden')   # 源 NUM_CN 2='两'（量词位口语）
    T46('hid_ear', '看到耳朵尖了吗', 'hidden')
    # r20 难度改造（2026-09-20，SPEC-R20-HIDDEN §R6）：计数作答题面+重试+记忆闪现引导
    T46('hid_cnt_q', '数一数，一共找到了几只呀', 'hidden')
    T46('hid_cnt_retry', '再数一数吧', 'hidden')
    T46('hid_mem_watch', '看清楚哦，记住它们藏在哪里', 'hidden')
    # slide 缺键+滑块规则（game-main.js:68/310）
    T46('sli_adj', '空格旁边的，才能滑', 'slide')
    # weather 题面 17+提交 2（game-data.js stem: 全表/SUBMIT_TEXT）
    wea_src = SRC46('batch23', 'weather', '_src', 'game-data.js')
    WEA_S = re.findall(r"stem: '([^']+)'", wea_src)
    assert len(WEA_S) == 17, 'weather stems 提取应 17: %d' % len(WEA_S)
    for i, s in enumerate(WEA_S):
        T46('wea_st_%d' % i, s, 'weather')
    T46('wea_sub_less', '还差一件，再找一找哦', 'weather')
    T46('wea_sub_more', '多选了一件，重新挑一挑哦', 'weather')
    # 09-19 B1 上报主线复核：temp/who 题面域=TEMPS 9 值×WHO_TEMPS 6 值封闭有限集（game-core.js
    # stem 拼接），全域 21 句可枚举——红线=彻底消灭 speechSynthesis，补注册（键名 t=-5→m5 防负号）
    for t in (-5, 5, 8, 12, 16, 18, 24, 25, 32):
        _tcn = ('零下' + num_cn(-t) if t < 0 else num_cn(t)) + '度'
        T46('wea_tt_%s' % ('m5' if t < 0 else t), '今天' + _tcn + '，穿什么', 'weather')
    for pk, pn, ptail in (('mom', '妈妈', '怕冷，给妈妈选一件'), ('bunny', '小兔子', '怕热，给小兔子选一件')):
        for t in (5, 8, 12, 16, 18, 24):
            T46('wea_tw_%s_%d' % (pk, t), '今天' + num_cn(t) + '度，' + pn + ptail, 'weather')
    # share 题面 22+数词（game-data.js quizSpeech；N∈2..12×K∈{2,3}）
    for n in range(2, 13):
        for k in (2, 3):
            T46('sha_q_%d_%d' % (n, k), num_cn(n) + '颗糖，分给' + ('两' if k == 2 else num_cn(k)) + '只小动物，每只一样多', 'share')
    # r22 份数4+非整除比较+等分反推（SPEC-R22-SHARE §R6）；games 恰 ['share']——sha_ 前缀与
    # shadow 20 键撞前缀，禁宽限（G3 串款防线）
    for n in (5, 6, 7, 9, 10, 11):
        T46('sha_q_%d_4' % n, num_cn(n) + '颗糖，分给四只小动物，每只一样多', 'share')
    T46('sha_cmp_who', '谁的糖果多呀', 'share')
    T46('sha_cmp_diff', '多几颗呀', 'share')
    T46('sha_rev_q', '数一数，一共有几颗糖呀', 'share')
    T46('sha_wrong', '再数一数吧', 'share')
    T46('sha_ans_right', '数对啦，真厉害', 'share')
    for n in range(0, 13):
        T46('sha_n_%d' % n, num_cn(n), 'share')
    # piano / dressup
    T46('pia_like', '弹得真像', 'piano')
    # r23 节奏听辨+和弦听辨新作答面（SPEC-R23-PIANO §R6）；games 恰 ['piano']
    T46('pia_rhy_q', '哪个音弹得最长呀', 'piano')
    T46('pia_cho_q', '兔子弹了哪两个音呀', 'piano')
    T46('pia_ans_wrong', '再听一听，再选一次吧', 'piano')
    # r24 纯听+大域+双音色双问（SPEC-R24-SOUNDCOUNT §R6）；sc_ 前缀 13 既有键不含下列 7 键（已核）
    T46('sc_ears', '这次呀，用小耳朵数一数', 'soundcount')
    T46('sc_q3', '铃铛响了几下', 'soundcount')
    for n, cn in [(6, '六下'), (7, '七下'), (8, '八下'), (9, '九下'), (10, '十下')]:
        T46('sc_n_%d' % n, cn, 'soundcount')
    dru_src = SRC46('batch24', 'dressup', '_src', 'game-data.js')
    DRU_T = re.findall(r"(\w+):\s*\{\s*n: '[^']+',\s*items: \[[^\]]*\],\s*q: '([^']+)'", dru_src)
    assert len(DRU_T) == 6, 'dressup THEMES 提取异常'
    for tid, q in DRU_T:
        T46('dru_q_%s' % tid, q, 'dressup')
    for tid, q in re.findall(r"(\w+): '([^']+)'", dru_src[dru_src.find('const BUDGET_Q'):dru_src.find('const ANTI_Q')]):
        T46('dru_qb_%s' % tid, q, 'dressup')
    for tid, q in re.findall(r"(\w+): '([^']+)'", dru_src[dru_src.find('const ANTI_Q'):dru_src.find('const quizSpeech')]):
        T46('dru_qa_%s' % tid, q, 'dressup')
    # emo 情境读题+确认 48（game-data.js SCENES ask/cue；confirm=cue+，小兔子很+情绪词）
    emo_src = SRC46('batch25', 'emo', '_src', 'game-data.js')
    EMO_CN = {'happy': '开心', 'sad': '难过', 'angry': '生气', 'scared': '害怕', 'surprised': '惊讶', 'worried': '担心'}
    EMO_ROWS = re.findall(r"\{ id: '(\w+)',\s*emo: '(\w+)',\s*bg: '[^']+',\s*ask: '([^']+)',\s*cue: '([^']+)'", emo_src)
    assert len(EMO_ROWS) == 24, 'emo SCENES 提取应 24: %d' % len(EMO_ROWS)
    for sid, ek, ask, cue in EMO_ROWS:
        T46('emo_s_%s' % sid, ask, 'emo')
        T46('emo_cf_%s' % sid, cue + '，小兔子很' + EMO_CN[ek], 'emo')
    T46('emo_rev_q', '小兔子怎么了，选一选是哪件事', 'emo')   # r35 rev 逆向题面问句（game-data VOICE.rev 同文案）
    # habitat 名词族+链句+确认骨架（game-data.js ANIMALS/FOOD/ENV/CHAINS/STRUCTS/ABILITY/DUALS）
    hab_src = SRC46('batch25', 'habitat', '_src', 'game-data.js')
    _hab_an = hab_src[hab_src.find('const ANIMALS'):hab_src.find('};', hab_src.find('const ANIMALS'))]
    HAB_AN = re.findall(r"(\w+):\s*\{\s*n: '([^']+)',\s*home: '(\w+)'", _hab_an)
    assert len(HAB_AN) == 24, 'habitat ANIMALS 提取应 24: %d' % len(HAB_AN)
    HAB_HOME = {a: h for a, _, h in HAB_AN}
    HAB_NM = {a: n for a, n, _ in HAB_AN}
    for a, n, _ in HAB_AN:
        T46('hab_an_%s' % a, n, 'habitat')
    HAB_FD = re.findall(r"(\w+):\s*\{\s*n: '([^']+)'\s*\}", hab_src[hab_src.find('const FOOD'):hab_src.find('const FOOD_KEYS')])
    assert len(HAB_FD) == 6, 'habitat FOOD 提取异常'
    for fid, fn in HAB_FD:
        T46('hab_fd_%s' % fid, fn, 'habitat')
    HAB_EV = re.findall(r"(\w+):\s*\{\s*n: '([^']+)'\s*\}", hab_src[hab_src.find('const ENV'):hab_src.find('const ALL7')])
    assert len(HAB_EV) == 7, 'habitat ENV 提取异常'
    for eid, en in HAB_EV:
        T46('hab_ev_%s' % eid, en, 'habitat')
    HAB_AB = re.findall(r"(\w+):\s*\{\s*n: '([^']+)'\s*\}", hab_src[hab_src.find('const ABILITY'):hab_src.find('const ABILITY_KEYS')])
    assert len(HAB_AB) == 4, 'habitat ABILITY 提取异常'
    HAB_ABIL = dict(HAB_AB)
    for aid, an in HAB_AB:
        T46('hab_ab_%s' % aid, an, 'habitat')
    _hab_ch = hab_src[hab_src.find('const CHAINS'):hab_src.find('const STRUCTS')]
    HAB_CH = re.findall(r"base: '(\w+)',\s*mid: '(\w+)',\s*top: '(\w+)'", _hab_ch)
    assert len(HAB_CH) == 4, 'habitat CHAINS 提取异常'
    _fdn = dict(HAB_FD)
    for base, mid, top in HAB_CH:
        T46('hab_st_up_%s_%s_%s' % (base, mid, top),
            HAB_NM[top] + '会吃' + HAB_NM[mid] + '，' + HAB_NM[mid] + '爱吃' + _fdn[base] +
            '。' + _fdn[base] + '变多了，最后谁也会变多？', 'habitat')
        _lv = '飞' if HAB_HOME[top] == 'sky' else '走'
        T46('hab_st_dn_%s_%s_%s' % (base, mid, top), HAB_NM[top] + _lv + '了，谁会变多？', 'habitat')
        T46('hab_cf_up_%s_%s_%s' % (base, mid, top),
            '对啦，' + _fdn[base] + '多了，' + HAB_NM[top] + '也会变多', 'habitat')
        T46('hab_cf_dn_%s_%s_%s' % (base, mid, top),
            '对啦，' + HAB_NM[top] + _lv + '了，' + HAB_NM[mid] + '变多啦', 'habitat')
    T46('hab_st_hib_sleep', '冬天到了，谁要睡很长很长的一觉？', 'habitat')
    T46('hab_st_hib_awake', '冬天到了，谁不睡长觉，还出来找吃的？', 'habitat')
    HAB_ST = re.findall(r"(\w+):\s*\{\s*feat: '[^']+',\s*short: '([^']+)',\s*abil: '(\w+)',\s*q: '([^']+)'",
                        hab_src[hab_src.find('const STRUCTS'):hab_src.find('const DUALS')])
    assert len(HAB_ST) == 4, 'habitat STRUCTS 提取异常'
    for fid, short, abil, q in HAB_ST:
        T46('hab_st_struct_%s' % fid, q, 'habitat')
        T46('hab_cf_struct_%s' % fid, '对啦，' + short + '的动物' + HAB_ABIL[abil], 'habitat')
    for did, q, suffix in re.findall(r"\{ id: '(\w+)',[^}]*?q: '([^']+)', c: n => '对啦，' \+ n \+ '([^']+)'",
                                     hab_src[hab_src.find('const DUALS'):hab_src.find('\n];', hab_src.find('const DUALS'))]):
        T46('hab_st_dual_%s' % did, q, 'habitat')
        T46('hab_dq_%s' % did, suffix, 'habitat')
    for k, t in (('homeq', '的家在哪里？'), ('aq', '爱吃什么？'), ('aichi', '爱吃'),
                 ('dui', '对啦，'), ('hib1', '冬天要睡长觉'), ('hib2', '冬天不睡长觉')):
        T46('hab_s_%s' % k, t, 'habitat')
    # 09-19 B2 上报：home 型确认句「动物名+住在+环境名+里，+act」TTS 残留——补 2 段键+24 动物 act
    T46('hab_s_zhu', '住在', 'habitat')
    T46('hab_s_li', '里，', 'habitat')
    _hab_act = re.findall(r"(\w+):\s*\{\s*n: '[^']+',\s*home: '\w+',\s*act: '([^']+)'",
                          hab_src[hab_src.find('const ANIMALS'):hab_src.find('const FOOD')])
    assert len(_hab_act) == 24, 'habitat act 提取应 24: %d' % len(_hab_act)
    for aid, act in _hab_act:
        T46('hab_act_%s' % aid, act, 'habitat')
    # story3 复述句 12+提示（game-data.js STORY_LIB s 数组/recapOf）
    # r34 难度改造（2026-09-21，SPEC-R34-STORY3 §R10）：帧数阶梯 3/4/5（ch1×4 不动/
    # ch2×4→4 帧/ch3×4→5 帧）——RECAP_KEYS 连接词 3=[先,然后,最后]/4=[先,然后,接着,
    # 最后]/5=[先,然后,再,接着,最后]（game-data recapOf 同构复刻，键名随帧数
    # recapKeyOf：3 帧=sto_recap_*（旧键文本不变幂等）/4=sto_recap4_*/5=sto_recap5_*）。
    # 已扩帧 8 故事的旧 sto_recap_* 键运行时零调用但保留注入（SPEC「本轮不收编退役」
    # +verify ⑬ t46ok 前缀计数 13 锚）——从上次 manifest 读回原值。
    sto_src = SRC46('batch25', 'story3', '_src', 'game-data.js')
    STO = re.findall(r"(\w+):\s*\{\s*ch: \d+,\s*n: '[^']+',\s*s: \[([^\]]+)\]", sto_src)
    assert len(STO) == 12, 'story3 STORY_LIB 提取应 12: %d' % len(STO)
    _sto_lens = sorted(len(re.findall(r"'([^']+)'", ss)) for _, ss in STO)
    assert _sto_lens == [3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5], 'r34 帧数阶梯异常: %s' % _sto_lens
    _RECAP_KEYS = {3: ['先', '然后', '最后'], 4: ['先', '然后', '接着', '最后'],
                   5: ['先', '然后', '再', '接着', '最后']}
    _old_sto = json.load(open(os.path.join(OUT, 'manifest.json'), encoding='utf-8'))
    for sid, ss in STO:
        steps = re.findall(r"'([^']+)'", ss)
        n = len(steps)
        text = '，'.join(kk + tt for kk, tt in zip(_RECAP_KEYS[n], steps))
        if n == 3:
            T46('sto_recap_%s' % sid, text, 'story3')            # ch1 4 故事：文本与旧一致（幂等跳过）
        else:
            T46('sto_recap%d_%s' % (n, sid), text, 'story3')     # r34 扩帧新键（SPEC §R10-C 8 条）
            assert 'sto_recap_%s' % sid in _old_sto, '旧 3 帧键缺失: sto_recap_%s' % sid
            m['sto_recap_%s' % sid] = _old_sto['sto_recap_%s' % sid]   # 旧键读回保留注入（零调用死重，下轮收编）
    T46('sto_hint3', '想一想，先做什么，然后再做什么，最后做什么', 'story3')
    # r34 新 23 键其余 15：干扰帧/why 反馈 3 + 因果问句 12（SPEC §R10-A/B）
    T46('sto_w_out', '这张画不是这个故事里的哦', 'story3')
    T46('sto_why_w', '再想一想，它为什么要排第一呀', 'story3')
    T46('sto_why_right', '答对啦，先有了它，后面的故事才会一件一件发生', 'story3')
    _STO_WHY = re.findall(r"(\w+):\s*\{\s*ch: \d+,\s*n: '[^']+',\s*s: \[[^\]]+\],\s*"
                          r"why:\s*\{\s*q0: '([^']+)',\s*a: '([^']+)',\s*b: '([^']+)'", sto_src)
    assert len(_STO_WHY) == 12, 'story3 why 提取应 12: %d' % len(_STO_WHY)
    for sid, q0, a, b in _STO_WHY:
        _t = '为什么要先%s呀？是因为%s，还是因为%s？你来选一选。' % (q0, a, b)
        assert '先先' not in _t, 'sto_why_%s 叠字（q0 前导先 × 模板，r34 审查 M1 同族防复发）: %s' % (sid, _t)
        T46('sto_why_%s' % sid, _t, 'story3')
    # calendar 词族+骨架+序数反馈（game-data.js DAYS/MONTHS/quizText/confirmText/DIRFB）
    cal_src = SRC46('batch26', 'calendar', '_src', 'game-data.js')
    CAL_D = re.findall(r"'([^']+)'", re.search(r'const DAYS = \[([^\]]+)\]', cal_src).group(1))
    CAL_M = re.findall(r"'([^']+)'", re.search(r'const MONTHS = \[([^\]]+)\]', cal_src).group(1))
    assert len(CAL_D) == 7 and len(CAL_M) == 12, 'calendar DAYS/MONTHS 提取异常'
    for i, w in enumerate(CAL_D):
        T46('cal_d_%d' % i, w, 'calendar')
    for i, w in enumerate(CAL_M):
        T46('cal_m_%d' % i, w, 'calendar')
    for k, t in (('day', '的后面是星期几？'), ('month', '的后面是几月？'),
                 ('dr1', '今天是'), ('dr2', '，昨天是星期几？'),
                 ('mr1', '这个月是'), ('mr2', '，上个月是几月？')):
        T46('cal_q_%s' % k, t, 'calendar')
    T46('cal_cf_rev', '的前面是', 'calendar')
    T46('cal_cf_fwd', '的后面是', 'calendar')
    for k, t in (('fb_fwd_b', '这个已经过啦，它在前面'), ('fb_fwd_a', '它排在后面哦，往前找找'),
                 ('fb_rd_b', '昨天在它后面哦'), ('fb_rd_a', '昨天在它前面哦'),
                 ('fb_rm_b', '上个月在它后面哦'), ('fb_rm_a', '上个月在它前面哦')):
        T46('cal_%s' % k, t, 'calendar')
    for k, t in (('self_d_f', '就是今天哦，找它后面的'), ('self_d_r', '就是今天哦，找它前面的'),
                 ('self_m_f', '就是这个月哦，找它后面的'), ('self_m_r', '就是这个月哦，找它前面的')):
        T46('cal_%s' % k, t, 'calendar')
    T46('cal_prev', '想想它的前面是谁', 'calendar')
    # r37-bis 段链化 37 新键（SPEC-R37 §R6-bis 键集终表 2026-09-21 定稿；build「在册即一致」断言对账）
    _RB37 = (('q_d2', '，后天是星期几？'), ('q_dm2', '，前天是星期几？'),
                 ('q_m2', '，下下个月是几月？'), ('q_mm2', '，上上个月是几月？'),
                 ('q_dq1', '是'), ('q_dq2', '是星期几？'), ('q_cb', '，明天是几月几号？'),
                 ('cf_d2', '的后天是'), ('cf_dm2', '的前天是'),
                 ('cf_m2', '的下下个月是'), ('cf_mm2', '的上上个月是'), ('cf_cb', '明天是'),
                 ('fb_cb_31', '没有三十一号哦'), ('fb_cb_32', '没有三十二号哦'),
                 ('fb_j_p1d', '再多数一天哦'), ('fb_j_m1d', '再少数一天哦'),
                 ('fb_j_p1m', '再多数一个月哦'), ('fb_j_m1m', '再少数一个月哦'),
                 ('fb_j_over', '数过头啦，往回数一数'),
                 ('hint_p2', '数一数，往后数两天'), ('hint_m2', '数一数，往前数两天'),
                 ('hint_p2m', '数一数，往后数两个月'), ('hint_m2m', '数一数，往前数两个月'),
                 ('hint_dq', '日子过两天，星期也走两天'), ('hint_cb', '想一想，这个月过完是哪个月'))
    assert len(_RB37) == 25, 'r37-bis 骨架/反馈/hint 键应 25，实得 %d（+12 号词=37）' % len(_RB37)
    for k, t in _RB37:
        T46('cal_%s' % k, t, 'calendar')
    _CN10 = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
    for i, cn in enumerate(_CN10, 1):
        T46('cal_num_%d' % i, cn + '号', 'calendar')
    T46('cal_num_30', '三十号', 'calendar')
    T46('cal_num_31', '三十一号', 'calendar')
    # season 题面/锚/确认/提交（game-data.js TEMPS/OCCS/stemOf/ANTI_ANCHOR/confirmOf/SUBMIT_TEXT）
    sea_src = SRC46('batch26', 'season', '_src', 'game-data.js')
    SEA_T = re.findall(r"(\w+):\s*\{\s*n: '([^']+)'", sea_src[sea_src.find('const TEMPS'):sea_src.find('const OCCS')])
    SEA_O = re.findall(r"(\w+):\s*\{\s*n: '([^']+)'", sea_src[sea_src.find('const OCCS'):sea_src.find('const ALL_OCCS')])
    assert len(SEA_T) == 3 and len(SEA_O) == 4, 'season TEMPS/OCCS 提取异常'
    for band, bn in SEA_T:
        for occ, on in SEA_O:
            T46('sea_st_%s_%s' % (band, occ), bn + '的天' + on + '，穿什么', 'season')
            T46('sea_cf_%s_%s' % (band, occ), bn + '的天' + on + '，穿好啦', 'season')
        T46('sea_sta_%s' % band, bn + '的天，哪件穿上不合适', 'season')
        T46('sea_cf_a_%s' % band, bn + '的天，它不合适', 'season')
    T46('sea_anchor_cold', '很冷的天，哪件会发抖', 'season')
    T46('sea_anchor_cool', '凉爽的天，哪件不合适', 'season')
    T46('sea_anchor_hot', '很热的天，哪件会出汗', 'season')
    T46('sea_sub_less', '还差一件，再挑一挑', 'season')
    T46('sea_sub_more', '多选了一件，再挑一挑', 'season')
    # sign 含义句+7 家族引导+act 题面（game-data.js SIGNS sent/GUIDE/ACT）
    # r36 难度改造（2026-09-21，SPEC-R36-SIGN §R10）：库 12→24（旧 12 sent 文本幂等跳过，
    # 新 12 en 音合成——表提取零手抄）+guide 新 redtri/bluec 两族+act 题面句 1 键（15 新键）
    sgn_src = SRC46('batch26', 'sign', '_src', 'game-data.js')
    SGN = re.findall(r"(\w+):\s*\{\s*n: '[^']+',\s*fam: '\w+',\s*m: '[^']+',\s*sent: '([^']+)'", sgn_src)
    assert len(SGN) == 24, 'sign SIGNS 提取应 24（r36 扩库）: %d' % len(SGN)
    for sid, sent in SGN:
        T46('sgn_sent_%s' % sid, sent, 'sign')
    for k, t in (('red', '红圈圈说，不能做'), ('redoct', '红八角说，停下来'),
                 ('yellow', '黄三角说，要小心'), ('blue', '蓝牌子说，这样走'),
                 ('signal', '看看灯的颜色再走'),
                 ('redtri', '红倒三角说，让一让'), ('bluec', '蓝圆圈说，这样走')):
        T46('sgn_guide_%s' % k, t, 'sign')
    T46('sgn_q_act', '看到这个标志，怎么做', 'sign')
    # coin 面额确认+组合+引导+同值（game-data.js MONEY/COMBOS/cnOf/GUIDE）
    coi_src = SRC46('batch27', 'coin', '_src', 'game-data.js')
    COI_CN = {1: '一', 2: '两', 5: '五', 10: '十', 20: '二十'}
    def _coi_cn(jiao):
        yuan, j = jiao // 10, jiao % 10
        if yuan and j: return COI_CN[yuan] + '元' + COI_CN[j] + '角'
        if yuan: return COI_CN[yuan] + '元'
        return COI_CN[j] + '角'
    COI_F = re.findall(r"(\w+):\s*\{\s*n: '[^']+',\s*kind: '\w+',\s*jiao: (\d+)", coi_src)
    assert len(COI_F) == 7, 'coin MONEY 提取应 7: %d' % len(COI_F)
    for fid, jiao in COI_F:
        T46('coi_cf_%s' % fid, '这是' + _coi_cn(int(jiao)), 'coin')
    _coi_cb = coi_src[coi_src.find('const COMBOS'):coi_src.find('const COMBO_IDS')]
    for cid, say, cf in re.findall(r"(\w+):\s*\{\s*coins:[^}]*?say: '([^']+)',\s*confirm: '([^']+)'", _coi_cb):
        T46('coi_say_%s' % cid, say, 'coin')
        T46('coi_cf_c_%s' % cid, cf, 'coin')
    T46('coi_q2', '哪个和它一样多？', 'coin')
    T46('coi_cf_sv_1', '一元硬币和一元纸币一样多', 'coin')
    T46('coi_cf_sv_2', '一元纸币和一元硬币一样多', 'coin')
    for k, t in (('silver', '都是银色，要看大小哦，大的是一元'), ('unit', '数字一样，角和元不一样哦'),
                 ('color', '看看颜色，金色的是五角'), ('num', '看看上面的大数字'),
                 ('combohi', '没有那么多钱哦'), ('combolo', '不止这些，再算一算'),
                 ('seek', '要找一样多的钱哦'), ('def', '看看数字，再看看颜色')):
        T46('coi_g_%s' % k, t, 'coin')
    # r38 段链化 39 新键（SPEC-R38-COIN §R6 终表 2026-09-21 主线对账过：文案=game-data.js
    # 构造语义逐族推导吻合——NSEG/MONEY.n/ITEMS+cnOf/MTXT/pay/q_min 字面；v 族=SUM_CN（两元/两角）；manifest 零碰撞）
    _RB38 = (('n1', '一枚一角'), ('n5', '一枚五角'), ('n10', '一枚一元'), ('q_sum', '一共是多少钱'),
             ('v_gt', '一共是'), ('q_r1', '哪个是一角硬币'), ('q_r5', '哪个是五角硬币'), ('q_r10', '哪个是一元硬币'),
             ('it_soda', '汽水，六角'), ('it_candy', '棒棒糖，八角'), ('it_sticker', '贴纸，九角'),
             ('it_balloon', '气球，三角'), ('it_book', '绘本，三元'), ('it_blocks', '积木，四元'),
             ('q_pay1', '付了一元'), ('q_pay5', '付了五元'), ('q_chg', '应该找回多少钱'), ('cf_chg', '找回'),
             ('q_min0', '要付'), ('q_min1', '最少用几枚硬币'),
             ('cf_min1', '一枚就够了'), ('cf_min2', '两枚就够了'), ('cf_min3', '三枚就够了'), ('cf_min4', '四枚，正好用完'),
             ('g_minhi', '硬币不用那么多哦'), ('g_minlo', '还不够哦，再想一想'), ('g_kind', '要找圆圆的硬币哦'))
    _YCN38 = {1: '一', 2: '两', 3: '三', 4: '四'}
    _JCN38 = {1: '一', 2: '两', 3: '三', 4: '四', 5: '五', 6: '六', 7: '七', 8: '八'}
    for k, t in _RB38: T46('coi_%s' % k, t, 'coin')
    for y, cn in _YCN38.items(): T46('coi_v_y%d' % y, cn + '元', 'coin')
    for j, cn in _JCN38.items(): T46('coi_v_j%d' % j, cn + '角', 'coin')
    assert len(_RB38) + len(_YCN38) + len(_JCN38) == 39, 'r38 coin 新键应 39'
    # notebird 题面/引导/确认/主线（game-data.js NOTES cn/GUIDE_FIND/GUIDE_HIGHER/MAIN_LINE）
    not_src = SRC46('batch27', 'notebird', '_src', 'game-data.js')
    # 行级顺序无关提取（sol 行 c/freq 字段序互换——按行锚 cn: 尾字段）
    NOT_CN = re.findall(r"^\s*(?:do|re|mi|fa|sol|la|si|dop):\s*\{[^}]*?cn: '([^']+)'", not_src, re.M)
    assert len(NOT_CN) == 8, 'notebird NOTES 提取应 8（含 dop 白鸟——09-19 B2 上报漏匹）: %d' % len(NOT_CN)
    for i, cn in enumerate(NOT_CN):
        T46('not_cf_h_%d' % i, '对啦，' + cn + '小鸟的声音高', 'notebird')
        T46('not_cf_s_%d' % i, '对啦，' + cn + '小鸟在唱歌', 'notebird')
    T46('not_q2', '谁的声音高？', 'notebird')
    T46('not_g_right', '再往右找找，声音更高的', 'notebird')
    T46('not_g_left', '再往左找找，声音更低的', 'notebird')
    T46('not_g_higher', '左边的声音低，右边的声音高，再听一听', 'notebird')
    T46('not_main', '电线左边低，右边高', 'notebird')
    # r39 新 9 键（SPEC-R39-NOTEBIRD §R10 终表 2026-09-21 对账过：文案与 game-data.js 一字一致；
    # 退役键 not_g_right/left/higher 位置语义误导停用，保留注入不删——主线择机清理非本轮面）
    # r39-bis（2026-09-22）：g_h2 文案改 9 字版去「后唱=高」结构规律明示（审查 M1 方案 c，唱序已随机）
    _RB39 = (('g_hi2', '再听一听，它更高些'), ('g_lo2', '再听一听，它更低些'), ('g_h2', '再听一遍，谁的声音高'),
             ('g_mel', '再听一遍，照顺序点'), ('g_iv', '再听听，隔了多远'),
             ('q_mel', '听一听，学着唱一遍'), ('q_iv', '听一听，隔了多远'),
             ('cf_mel', '对啦，唱得真好'), ('cf_iv', '对啦，耳朵真准'))
    assert len(_RB39) == 9
    for k, t in _RB39: T46('not_%s' % k, t, 'notebird')
    # ruler 合法组合题面/确认+陷阱+引导（game-data.js ITEMS/UNITS/COMBOS12/TRAPS/GUIDE）
    rul_src = SRC46('batch27', 'ruler', '_src', 'game-data.js')
    RUL_I = re.findall(r"(\w+):\s*\{\s*n: '([^']+)',\s*base: (\d+)\s*\}", rul_src[:rul_src.find('const UNITS')])
    assert len(RUL_I) == 6, 'ruler ITEMS 提取应 6: %d' % len(RUL_I)
    RUL_U = re.findall(r"(\w+):\s*\{\s*n: '([^']+)',\s*base: (\d+),\s*q: '([^']+)'\s*\}",
                       rul_src[rul_src.find('const UNITS'):rul_src.find('const ITEM_KEYS')])
    assert len(RUL_U) == 3, 'ruler UNITS 提取应 3: %d' % len(RUL_U)
    RUL_NUMCN = {1: '一', 2: '两', 3: '三', 4: '四', 5: '五', 6: '六'}
    for iid, iname, ibase in RUL_I:
        for uid, uname, ubase, uq in RUL_U:
            if int(ibase) % int(ubase) != 0: continue
            units = int(ibase) // int(ubase)
            T46('rul_q_%s_%s' % (iid, uid), iname + '有几' + uq + uname + '长？', 'ruler')
            T46('rul_cf_%s_%s' % (iid, uid), iname + '有' + RUL_NUMCN[units] + uq + uname + '长', 'ruler')
    RUL_T = re.findall(r"a: \{\s*item: '(\w+)',\s*unit: '(\w+)',\s*units: (\d+)\s*\}",
                       rul_src[rul_src.find('const TRAPS'):rul_src.find('const GUIDE')])
    assert len(RUL_T) == 4, 'ruler TRAPS 提取应 4: %d' % len(RUL_T)
    _rin, _run = dict((i, n) for i, n, _ in RUL_I), dict((u, (n, q)) for u, n, _, q in [(u, n, b, q) for u, n, b, q in RUL_U])
    for i, (iid, uid, units) in enumerate(RUL_T):
        uname, uq = _run[uid]
        T46('rul_cft_%d' % i, _rin[iid] + '更长，有' + RUL_NUMCN[int(units)] + uq + uname + '长', 'ruler')
    T46('rul_q2', '谁更长？', 'ruler')
    for k, t in (('count_over', '没有那么多，再数数'), ('count_under', '还有一小段，再多数一根'),
                 ('cmp_clip', '回形针短，数得多也不一定长哦'), ('cmp_stick', '小棒长，根数少也可能长哦'),
                 ('cmp_block', '积木长，块数少也可能长哦')):
        T46('rul_g_%s' % k, t, 'ruler')
    # coder 路径题面拆段+引导+确认（game-data.js pathSpeak/GUIDE/confirmText）
    for n, cn in ((1, '一'), (2, '两'), (3, '三')):
        T46('cod_ps_n_%d' % n, cn, 'coder')
    for k, t in (('go', '走'), ('bu', '步，先往'), ('zai', '，再往'), ('tail', '，小兔子会走到哪')):
        T46('cod_ps_%s' % k, t, 'coder')
    for d, dn in (('up', '上'), ('down', '下'), ('left', '左'), ('right', '右')):
        T46('cod_d_%s' % d, dn, 'coder')
    T46('cod_gw1', '小兔没走到萝卜，先往', 'coder')
    T46('cod_gw2', '走', 'coder')
    T46('cod_g_path', '再想想，先走第一步看看', 'coder')
    T46('cod_g_block', '往这边走不过去哦', 'coder')
    T46('cod_cf_path', '猜对啦，走到这里', 'coder')
    T46('cod_cf_run', '小兔子吃到萝卜啦', 'coder')
    T46('cod_demo', '点箭头，小兔子就走', 'coder')
    # conserve 变换/确认/引导全族（game-data.js PRE_SAY/T_SAY/addSayOf/confirmOf/guideOf）
    T46('cnv_pre', '看，两边一样多', 'conserve')
    for k, t in (('rows', '右边的拉开了，可是数量没有变'), ('pour', '水倒进细高的杯子，水面变高了'),
                 ('clay', '橡皮泥压一压，变成长条啦')):
        T46('cnv_t_%s' % k, t, 'conserve')
    for side, sn in (('l', '左边'), ('r', '右边')):
        for act, an in (('add', '加了一个'), ('take', '拿走了一个')):
            T46('cnv_add_rows_%s_%s' % (side, act), '又给' + sn + an, 'conserve')
    T46('cnv_add_pour', '又往右边倒了一点水', 'conserve')
    T46('cnv_add_clay', '又从右边切走了一块', 'conserve')
    for base in (5, 6, 7):
        T46('cnv_cf_same_rows_%d' % base, '两边都是' + num_cn(base) + '个，一样多', 'conserve')
    T46('cnv_cf_same_pour', '水倒来倒去，还是一样多', 'conserve')
    T46('cnv_cf_same_clay', '压一压捏一捏，还是一样多', 'conserve')
    T46('cnv_cf_rows_l', '刚才一样多，现在左边多', 'conserve')
    T46('cnv_cf_rows_r', '刚才一样多，现在右边多', 'conserve')
    T46('cnv_cf_pour', '又倒进去一点，右边多', 'conserve')
    T46('cnv_cf_clay', '切走了一块，左边多', 'conserve')
    for base in (5, 6, 7):
        T46('cnv_g_same_rows_%d' % base, '再数一数，两边都是' + num_cn(base) + '个哦', 'conserve')
    T46('cnv_g_same_pour', '倒来倒去，水没有变多也没有变少哦', 'conserve')
    T46('cnv_g_same_clay', '压一压捏一捏，橡皮泥没有变多也没有变少哦', 'conserve')
    for side, sn in (('l', '左边'), ('r', '右边')):
        for act, an in (('add', '加了'), ('take', '拿走了')):
            T46('cnv_g_rows_%s_%s' % (side, act), '刚才是两边一样多，后来又给' + sn + an + '一个哦', 'conserve')
    T46('cnv_g_pour', '刚才一样多，后来又往右边倒了一点哦', 'conserve')
    T46('cnv_g_clay', '刚才一样多，后来又从右边切走了一块哦', 'conserve')
    # shapecount 颜色/形状/题面/确认段+引导（game-data.js quizText/confirmText/GUIDE）
    shc_src = SRC46('batch28', 'shapecount', '_src', 'game-data.js')
    SHC_S = re.findall(r"(\w+):\s*\{\s*n: '([^']+)'", shc_src[shc_src.find('const SHAPES'):shc_src.find('const ALL6')])
    SHC_C = re.findall(r"(\w+):\s*\{\s*n: '([^']+)'", shc_src[shc_src.find('const COLORS'):shc_src.find('const COLOR4')])
    assert len(SHC_C) == 4 and len(SHC_S) == 6, 'shapecount 色/形表提取异常 %d/%d' % (len(SHC_C), len(SHC_S))
    for cid, cn in SHC_C:
        T46('shc_c_%s' % cid, cn, 'shapecount')
    for sid, sn in SHC_S:
        T46('shc_s_%s' % sid, sn, 'shapecount')
    T46('shc_s_yj', '有几个？', 'shapecount')
    T46('shc_s_yg', '，有', 'shapecount')
    T46('shc_s_gyg', '一共，有', 'shapecount')
    for n in range(1, 21):
        T46('shc_n_%d' % n, ('两' if n == 2 else num_cn(n)) + '个', 'shapecount')   # 源 NUMCN 2='两'；两/四/六=点4 复用 shc_n_2/4/6
    T46('shc_q_grid', '排好队的图形，一共有几个？', 'shapecount')
    T46('shc_q_gridmiss', '有空格的图形，一共几个？', 'shapecount')
    for k, t in (('over', '没有那么多，再数数'), ('under', '还有呢，再接着数'),
                 ('gridmiss', '先数满的行，再数空格'), ('dual', '先找颜色，再找形状')):
        T46('shc_g_%s' % k, t, 'shapecount')
    # bodyen / poem / wordpuz / babylove / maze / storybed / animalmenu / iftrain / evidence / robotpaint
    T46('bod_again_hear', '再听一遍这个单词', 'bodyen')
    T46('bod_again_see', '再看看它指的地方', 'bodyen')
    T46('poe_g_next', '再读读上一行，找找接下来那句', 'poem')
    T46('poe_g_hear', '再听一遍这一句', 'poem')
    T46('wpu_g_wrong', '看看图画，想想怎么拼', 'wordpuz')
    T46('wpu_demo', '点字母，放进格子里', 'wordpuz')
    for k, t in (('mom', '再看看它的妈妈长什么样'), ('baby', '再看看这个宝宝是谁'),
                 ('grow', '再想想长大的顺序'), ('hab', '再看看它住在哪里')):
        T46('bab_again_%s' % k, t, 'babylove')
    T46('maz_guide', '点小兔旁边的格子', 'maze')
    T46('maz_keyget', '拿到钥匙啦', 'maze')
    T46('maz_demo', '点旁边的格子走路', 'maze')
    for k, t in (('wrong', '再想想现在做哪一件事'), ('distract', '这一步不在这个流程里'),
                 ('miss', '再看看少了哪一步')):
        T46('stb_g_%s' % k, t, 'storybed')
    for k, t in (('food', '再看看它爱吃什么'), ('who', '再想想谁爱吃这个'),
                 ('diet', '再想想它吃什么'), ('chain', '再想一想，谁吃谁')):
        T46('anm_again_%s' % k, t, 'animalmenu')
    T46('rai_again_apply', '再看看外面是什么天气', 'iftrain')
    T46('rai_again_back', '再想想什么时候用它', 'iftrain')
    T46('evi_again', '能证明吗', 'evidence')
    T46('rp_mem', '看清楚啦，把它记住，等一会儿画出来', 'robotpaint')
    # chartread 重听 8+题面段+确认段（game-data.js AGAIN 族/题面 q.text.slice(0,-1)）
    for k, t in (('most', '再看看哪一行最长'), ('second', '先找最多的，再找第二多'),
                 ('howmany', '再数一数这一行'), ('total', '把每一行都数一数再加起来'),
                 ('compare', '一行一行数一数再比一比'), ('unit2', '一格代表两只，数数格子'),
                 ('constraint', '两个条件都要比一比哦'), ('twocompare', '两张图都看一看再比一比')):
        T46('chr_again_%s' % k, t, 'chartread')
    T46('chr_s_bi', '比', 'chartread')
    T46('chr_s_duo', '多几只呀', 'chartread')
    T46('chr_s_dyou', '多又比', 'chartread')
    T46('chr_s_shd', '少的是谁呀？', 'chartread')
    T46('chr_lab_am', '上午', 'chartread')
    T46('chr_lab_pm', '下午', 'chartread')
    T46('chr_s_de', '的', 'chartread')
    T46('chr_s_dduo', '的多几只呀', 'chartread')
    for n in range(1, 21):
        T46('chr_n_%d' % n, ('两' if n == 2 else num_cn(n)) + '只', 'chartread')   # 源 NUMCN 2='两'
    # 09-19 B3 上报：total 判对尾段'一共X只' X=NUMCN 运行时域 21..74（3/4 类目和封顶 74）——chr_n_ 域 20 截断补齐
    for n in range(21, 75):
        T46('chr_n_%d' % n, num_cn(n) + '只', 'chartread')
    T46('chr_s_yg', '一共', 'chartread')
    T46('chr_s_do', '多', 'chartread')
    # senses 纠错族（game-data.js SENSE/THING/MULTI/ANTI/COV_AGAIN）
    T46('sen_again_sense', '再想一想，用什么呢', 'senses')
    T46('sen_again_thing', '再想想什么用它', 'senses')
    T46('sen_again_multi', '再想一想，都用了哪里呀', 'senses')
    T46('sen_again_cov', '再想一想，捂住了还能用什么', 'senses')
    T46('sen_anti_base', '再想一想，哪个不是用', 'senses')
    T46('sen_anti_tail', '的呀', 'senses')
    # position 方位整句+尾字（game-data.js PLACE_TTS/'呀'）
    for pid, pn in (('front', '前面'), ('back', '后面'), ('left', '左边'),
                    ('right', '右边'), ('up', '上面'), ('down', '下面')):
        T46('ps_place_%s' % pid, '把兔子放到树的' + pn, 'position')
    T46('ps_ya', '呀', 'position')
    # datacollect 确认数词偶数域+骨架（game-data.js NUMCN 2..60 偶/confirmText）
    for n in range(2, 61, 2):
        T46('dc_n_%d' % n, ('两' if n == 2 else num_cn(n)) + '只', 'datacollect')   # 源 NUMCN 偶数表 2='两'
    for k, t in (('yg', '一共'), ('xc', '相差'), ('duo', '多了'), ('shao', '少了')):
        T46('dc_s_%s' % k, t, 'datacollect')
    # maketen 算式拆段（game-data.js NUMCN 2=两）
    for n in range(1, 21):
        T46('mt_n_%d' % n, ('两' if n == 2 else num_cn(n)), 'maketen')
    T46('mt_s_add', '加', 'maketen')
    T46('mt_s_eq', '等于', 'maketen')
    # errdoc 算式/提示拆段（game-data.js NUMCN 0..20/OP_WORD；core eqTTS/hintTTS）
    for n in range(0, 21):
        T46('ed_n_%d' % n, num_cn(n), 'errdoc')
    T46('ed_op_add', '加', 'errdoc')
    T46('ed_op_sub', '减', 'errdoc')
    T46('ed_op_mul', '乘', 'errdoc')
    T46('ed_s_eq', '等于', 'errdoc')
    T46('ed_s_here', '这里应该是', 'errdoc')
    # quickcmp 左右数词段（game-data.js NUMCN 2=两）
    T46('qc_s_left', '左边', 'quickcmp')
    T46('qc_s_right', '右边', 'quickcmp')
    for n in range(1, 11):
        T46('qc_n_%d' % n, ('两' if n == 2 else num_cn(n)) + '个', 'quickcmp')
    # r46 数词段 11-20（2026-09-22 主线注册；SPEC-R46 §R7 数量域 10-20 联动）。文案=数词+'个'
    # 与在册 qc_n_1..10 同族（复述链 segParts=[left,n,right,n] 同链同口径）；SPEC §R7 原表纯数词
    # 系笔误，注册时勘误——主线键集对账 2026-09-22 裁定
    for n in range(11, 21):
        T46('qc_n_%d' % n, num_cn(n) + '个', 'quickcmp')
    # comfort/thanks/crd/cbx/etm 情境句（各 game-data.js say:/QUESTIONS text）
    for i, s in enumerate(re.findall(r"say: '([^']+)'", SRC46('batch36', 'comfort', '_src', 'game-data.js')), 1):
        T46('co_sc_%d' % i, s, 'comfort')
    for i, s in enumerate(re.findall(r"say: '([^']+)'", SRC46('batch37', 'thanks', '_src', 'game-data.js')), 1):
        T46('th_sc_%d' % i, s, 'thanks')
    for i, s in enumerate(re.findall(r"say: '([^']+)'", SRC46('batch39', 'crd', '_src', 'game-data.js')), 1):
        T46('crd_sc_%d' % i, s, 'crd')
    for i, s in enumerate(re.findall(r"say: '([^']+)'", SRC46('batch40', 'cbx', '_src', 'game-data.js')), 1):
        T46('cbx_sc_%d' % i, s, 'cbx')
    _etm_sc = re.findall(r"\{ scene: '(\w+)',\s*kind: '\w+',\s*text: '([^']+)'",
                         SRC46('batch39', 'etm', '_src', 'game-data.js'))
    # r49 扩容（2026-09-22 主线注册）：题库 20→40（face 间接情境+level 5 档+mix 双拼脸）；
    # 本段是 etm_sc 唯一注册点（m 全量字面重建，跑至此 etm_sc 尚不在 m）——旧 18 名单分流
    # 新旧计数；旧键文案漂移由注册前磁盘 manifest 比对把关（本轮无变更——r39-bis 教训③）；
    # paintspill/longwait 已随场景退役不再被提取=manifest 覆写后自然清退（mp3 顺手删）
    assert len(_etm_sc) == 40, 'etm 题表提取应 40（r49 扩容后）: %d' % len(_etm_sc)
    _ETM_OLD18 = {'flower', 'blocksdown', 'balloonfly', 'thunder', 'singsong', 'crayondrop',
                  'snatchtoy', 'swinggrab', 'castlekick', 'ruinlaugh', 'painting', 'shoutloud',
                  'towertop', 'grabtoy', 'lostmom', 'stepfoot', 'interrupt', 'tearbook'}
    _etm_old = _etm_new = 0
    for sid, s in _etm_sc:
        T46('etm_sc_%s' % sid, s, 'etm')
        if sid in _ETM_OLD18: _etm_old += 1
        else: _etm_new += 1
    assert _etm_old == 18 and _etm_new == 22, \
        'r49 etm 新旧分流应 18+22，实得 %d+%d' % (_etm_old, _etm_new)
    # r48 退役：lb_dim_* 4 键（维度句改版 lb_d2_*，旧句「它住在农场，是动物」念答案泄漏
    # 已废）——段删除=manifest 覆写后自然清退；mp3 顺手删
    # gear/cir 观察句（各 game-data.js obs）
    for i, s in enumerate(re.findall(r"obs: '([^']+)'", SRC46('batch38', 'gear', '_src', 'game-data.js')), 1):
        T46('gr_obs_%d' % i, s, 'gear')
    for i, s in enumerate(re.findall(r"obs: '([^']+)'", SRC46('batch39', 'cir', '_src', 'game-data.js')), 1):
        T46('cir_obs_%d' % i, s, 'cir')
    # ins 题型句（game-data.js SAY_T）
    T46('ins_t_judge', '呀，它是昆虫还是蜘蛛？', 'ins')
    T46('ins_t_legs', '的腿有几条呀？数一数', 'ins')
    # r26 难度改造 dch4 三选/藏腿/分段/找一找（SPEC-R26-INS §R6；前缀 ins_ 已核
    # manifest 无占用——在册 17 键不含下列 8 键）
    T46('ins_a_snail', '蜗牛', 'ins')
    T46('ins_a_centipede', '蜈蚣', 'ins')
    T46('ins_t_judge3', '呀，它是昆虫、蜘蛛，还是都不是呀？', 'ins')
    T46('ins_t_legs3', '的腿有几条呀？想一想', 'ins')
    T46('ins_t_bodyseg', '的身体分几段呀？数一数', 'ins')
    T46('ins_t_mix6', '找一找呀，六条腿的昆虫', 'ins')
    T46('ins_t_mix8', '找一找呀，八条腿的蜘蛛', 'ins')
    T46('ins_sci_none', '蜗牛和蜈蚣呀，不是昆虫也不是蜘蛛', 'ins')
    # brk 题面模板+40 卡步序（game-data.js TMPL/GOALS）
    T46('brk_tmpl', '帮小兔子拆一拆', 'brk')
    _brk_src = SRC46('batch40', 'brk', '_src', 'game-data.js')
    _brk_goals = _brk_src[_brk_src.find('const GOALS'):]
    BRK_STEPS = re.findall(r"(\w+):\s*\[([^\]]+)\]", _brk_goals[:_brk_goals.find('\n};')])
    assert len(BRK_STEPS) == 8, 'brk GOALS 提取应 8 目标: %d' % len(BRK_STEPS)
    for gid, steps in BRK_STEPS:
        st = re.findall(r"'([^']+)'", steps)
        assert len(st) == 5, 'brk %s 步数应 5: %d' % (gid, len(st))
        for i, s in enumerate(st):
            T46('brk_step_%s_%d' % (gid, i), s, 'brk')
    # plant 程序卡整句 16（game-data.js cardText 第X行第Y列）
    for r in range(1, 5):
        for c in range(1, 5):
            T46('pl_q_%d_%d' % (r, c), '第' + num_cn(r) + '行第' + num_cn(c) + '列', 'plant')
    # r47 键域扩 20（2026-09-22 主线注册；SPEC-R47 §R6——网格升 5×5/6×6：q 域 r≥5 全列
    # +r≤4×c≥5；与 DESIGN_KEYS 逐键全等（build.py cardText 逐键对账断言在款侧）
    _pl_new = 0
    for r in range(1, 7):
        for c in range(1, 7):
            if r <= 4 and c <= 4:
                continue  # 1-4 域 16 键在册（上段）
            T46('pl_q_%d_%d' % (r, c), '第' + num_cn(r) + '行第' + num_cn(c) + '列', 'plant')
            _pl_new += 1
    assert _pl_new == 20, 'r47 q 域扩应 20，实得 %d' % _pl_new
    # teach 任务句+组末计数+按群标签+引导+兔子句（taskTTS 模板 game-core.js:197；NUMCN 表在 game-data.js:34）
    _tch = SRC46('batch37', 'teach', '_src', 'game-data.js')
    _tch_numcn = dict((int(k), v) for k, v in
                      re.findall(r"(\d+): '([^']+)'", _tch[_tch.find('const NUMCN'):_tch.find('const NUMCN') + 400]))
    for n in range(2, 21):
        T46('tch_task_%d' % n, '教小兔子数' + _tch_numcn[n] + '个苹果', 'teach')
        T46('tch_n_%d' % n, _tch_numcn[n] + '个', 'teach')
    T46('tch_gm_1', '一个一个数', 'teach')
    T46('tch_gm_2', '两个两个数', 'teach')
    T46('tch_gm_5', '五个五个数', 'teach')
    T46('tch_ghint', '大数字，可以几个几个数哦', 'teach')
    T46('tch_rabbit', '兔子说：我来试试', 'teach')

    # ---- batch41 zilearn 识字小课堂（2026-09-24 段二注册；SPEC-ZILEARN §3——178 键）----
    # zi_ 前缀已核 manifest 5517 无占用。zi_ch_ 150=每字读音组词（<字>，<首词>的<字>，wrd 范式）
    # 从 game-data.js CHARS 表正则提取 {字,py,首词}（零手抄，与 chText()/chKey 严格一致）；
    # zi_st_ 20=句子朗读（SENTENCES 表段内正则——避开 LEVELS 里 sentence 双写，_r_zi_regex_probe 实测口径）。
    m['zi_tut_watch'] = {'text': '看！来认识新字啦', 'games': ['zilearn']}
    m['zi_tut_turn'] = {'text': '你来点一点', 'games': ['zilearn']}
    m['zi_hint'] = {'text': '想一想，再选一选', 'games': ['zilearn']}
    m['zi_right'] = {'text': '答对啦，真棒', 'games': ['zilearn']}
    m['zi_wrong'] = {'text': '不对哦，再想一想', 'games': ['zilearn']}
    m['zi_listen'] = {'text': '听一听，找一找', 'games': ['zilearn']}
    m['zi_word'] = {'text': '选一选', 'games': ['zilearn']}
    m['zi_quiz'] = {'text': '小测时间到', 'games': ['zilearn']}
    # r2 F5（2026-09-25 诊断建议 4）：句子题副提示语音平行播报——原只有文字无语音
    m['zi_read_hint'] = {'text': '读一读，选出生字', 'games': ['zilearn']}
    zi_src = open(os.path.join(ROOT, 'batch41', 'zilearn', '_src', 'game-data.js'), encoding='utf-8').read()
    zi_ch = re.findall(r'"([一-鿿])":\s*\{\s*py:\s*"([^"]+)",[^,]+,\s*chNo:\s*\d+,\s*words:\s*\[\["([^"]+)"', zi_src)
    assert len(zi_ch) == 150, 'zi CHARS 提取异常: %d' % len(zi_ch)
    assert len({p for _, p, _ in zi_ch}) == 150, 'zi py 冲突（clip key 不唯一）'
    for c, py, first_word in zi_ch:
        m['zi_ch_' + py] = {'text': '%s，%s的%s' % (c, first_word, c), 'games': ['zilearn']}
    zi_seg = zi_src.split('const SENTENCES')[1]
    zi_st = re.findall(r'\{"text": "([^"]+)", "afterFlat": (\d+)', zi_seg)
    assert len(zi_st) == 20, 'zi SENTENCES 提取异常: %d' % len(zi_st)
    assert len({int(f) for _, f in zi_st}) == 20, 'zi afterFlat 冲突'
    for text, flat in zi_st:
        m['zi_st_%s' % flat] = {'text': text, 'games': ['zilearn']}
    assert sum(1 for k in m if k.startswith('zi_')) == 179, 'zi_ 键总数应 179（178+zi_read_hint r2F5）'
    _t46dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'task46-enumerate')
    for jf, expect in (('keys_read.json', 174), ('keys_t46.json', 970)):   # 963-1：tc_s_comma 纯标量段非语音点剔除（edge-tts 0 字节）
        p = os.path.join(_t46dir, jf)
        assert os.path.exists(p), '缺 %s——先跑 voice/task46-enumerate/extract_*.py' % jf
        jm = json.load(open(p, encoding='utf-8'))
        assert len(jm) == expect, '%s 键数应 %d: %d' % (jf, expect, len(jm))
        for k, v in jm.items():
            T46(k, v['text'], v['games'])
    del _pre46  # 1a/1b/1c 全部经 T46 注册，撞既有键已在断言拦截
    return m

async def synth(key, text, sem, stats, voice=None):
    path = os.path.join(OUT, key + '.mp3')
    if os.path.exists(path) and os.path.getsize(path) > 800:  # 幂等：已有产物跳过
        stats['skip'] += 1; return True
    async with sem:
        for attempt in range(3):
            try:
                import edge_tts
                if voice:   # per-key 覆盖（worden 英语词=en-US-AnaNeural）
                    c = edge_tts.Communicate(text, voice)
                else:
                    c = edge_tts.Communicate(text, VOICE, rate=RATE, pitch=PITCH)
                await c.save(path)
                if os.path.getsize(path) > 800:
                    stats['ok'] += 1; return True
            except Exception as e:
                await asyncio.sleep(1.5 * (attempt + 1))
        stats['fail'] += 1; stats['failed_keys'].append(key)
        return False

async def main():
    m = build_manifest()
    json.dump(m, open(os.path.join(OUT, 'manifest.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    sem, stats = asyncio.Semaphore(8), {'ok': 0, 'skip': 0, 'fail': 0, 'failed_keys': []}   # Task#46：4→8 提并发
    t0 = time.time()
    await asyncio.gather(*(synth(k, v['text'], sem, stats, v.get('voice')) for k, v in m.items()))
    print('manifest=%d ok=%d skip=%d fail=%d %.1fs' % (len(m), stats['ok'], stats['skip'], stats['fail'], time.time() - t0))
    if stats['failed_keys']: print('FAILED:', stats['failed_keys']); sys.exit(1)

if __name__ == '__main__':
    asyncio.run(main())
