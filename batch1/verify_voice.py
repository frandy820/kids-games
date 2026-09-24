# -*- coding: utf-8 -*-
"""语音 clips 专项验收：三款内嵌 clips 完整性 + 播放器可用性（headless 独立实例）"""
import os, sys
from playwright.sync_api import sync_playwright

BASE = os.path.dirname(os.path.abspath(__file__))
EXPECT = {
    'pipe': ['core_chapter_end', 'core_day_end', 'core_rest', 'pipe_tut_watch', 'pipe_tut_turn', 'pipe_hint_tut', 'pipe_start'],
    'shop': (['core_chapter_end', 'core_day_end', 'core_rest', 'shop_want', 'shop_and', 'shop_recount',
              'shop_full', 'shop_over'] +
             ['shop_help_' + k for k in ('apple', 'banana', 'pear', 'orange')] +
             ['shop_g_%s_%d' % (k, n) for k in ('apple', 'banana', 'pear', 'orange') for n in range(1, 6)] +
             # T46 拆段（2026-09-19）：组末报数/付钱/找零 clip 化键
             ['shop_cn_%d' % n for n in range(1, 21)] +
             ['shop_n_%d' % n for n in range(1, 6)] + ['shop_put', 'shop_try', 'shop_chg']),
    'kitchen': ['core_chapter_end', 'core_day_end', 'core_rest', 'kitchen_tut', 'kitchen_cut', 'kitchen_cat'] +
               ['kitchen_n_%d' % n for n in range(1, 31)] +
               # T46 结算拆段（2026-09-19）：kr_combo + 连击段 kr_dn_1..30
               ['kr_combo'] + ['kr_dn_%d' % n for n in range(1, 31)],
    # batch2
    'memory': ['core_chapter_end', 'core_day_end', 'core_rest', 'mem_tut_watch', 'mem_tut_turn', 'mem_hint'],
    'tangram': ['core_chapter_end', 'core_day_end', 'core_rest', 'tan_tut_watch', 'tan_tut_turn', 'tan_hint'],
    'color': ['core_chapter_end', 'core_day_end', 'core_rest', 'clr_tut_watch', 'clr_tut_turn', 'clr_hint'],  # r6 m-6 改名 col_→clr_（col_ 归 colormix）；09-20 阶段3 全量首跑抓出 EXPECT 过时
    # batch3（py_syl_* 音节键从 manifest 动态取，零手抄）
    'math': ['core_chapter_end', 'core_day_end', 'core_rest', 'mat_tut_watch', 'mat_tut_turn', 'mat_hint'],
    'pinyin': ['core_chapter_end', 'core_day_end', 'core_rest', 'pyi_tut_watch', 'pyi_tut_turn', 'pyi_hint'],
    'pattern': ['core_chapter_end', 'core_day_end', 'core_rest', 'pat_tut_watch', 'pat_tut_turn', 'pat_hint'],
    # batch4
    'clock': ['core_chapter_end', 'core_day_end', 'core_rest', 'clk_tut_watch', 'clk_tut_turn', 'clk_hint'],
    'countchick': ['core_chapter_end', 'core_day_end', 'core_rest', 'chk_tut_watch', 'chk_tut_turn', 'chk_hint'],
    'spotdiff': ['core_chapter_end', 'core_day_end', 'core_rest', 'spd_tut_watch', 'spd_tut_turn', 'spd_hint'],
    'connect': ['core_chapter_end', 'core_day_end', 'core_rest', 'con_tut_watch', 'con_tut_turn', 'con_hint'],
    'times': ['core_chapter_end', 'core_day_end', 'core_rest', 'tim_tut_watch', 'tim_tut_turn', 'tim_hint', 'tim_also', 'tim_miss_hint'] +
             ['tim_n%d' % n for n in range(1, 10)] + ['tim_shi', 'tim_plus', 'tim_eq', 'tim_howmuch', 'tim_times'],
    'sudoku': ['core_chapter_end', 'core_day_end', 'core_rest', 'sud_tut_watch', 'sud_tut_turn', 'sud_hint'],
    # batch6（words 每字 wrd_ch_* 音组词 clip 合成注入后再扩——pinyin 模式）
    'words': ['core_chapter_end', 'core_day_end', 'core_rest', 'wrd_tut_watch', 'wrd_tut_turn', 'wrd_hint'],
    'compare': ['core_chapter_end', 'core_day_end', 'core_rest', 'cmp_tut_watch', 'cmp_tut_turn', 'cmp_hint'],
    'subbug': ['core_chapter_end', 'core_day_end', 'core_rest', 'sub_tut_watch', 'sub_tut_turn', 'sub_hint'],
    # batch7（颜色词/报数/题面拼句走 TTS 兜底不建 clip；r7 新增纠错方向锚×2+游散提示）
    'fishcolor': ['core_chapter_end', 'core_day_end', 'core_rest', 'fis_tut_watch', 'fis_tut_turn', 'fis_hint',
                  'fis_wrong', 'fis_wrong_seq', 'fis_wait'] +
                  # T46 阶段2（2026-09-19）：题面拆段 26（色 9+量词 3+句式段 8+间色反馈 6）——静态枚举（_MANI 尚未加载）
                  ['fis_c_' + c for c in ('red', 'yellow', 'blue', 'green', 'orange', 'purple', 'pink', 'black', 'white')] +
                  ['fis_cnt_%d' % n for n in (1, 2, 3)] +
                  ['fis_s_' + k for k in ('diao', 'dewei', 'xian', 'zai', 'shi', 'he', 'bian', 'bianc')] +
                  ['fis_mix_%s_%s' % (m, o) for m in ('orange', 'green', 'purple') for o in ('12', '21')],
    'fruitsplit': ['core_chapter_end', 'core_day_end', 'core_rest', 'fru_tut_watch', 'fru_tut_turn', 'fru_hint',
                  'fru_choose', 'fru_fair_q', 'fru_fair_yes', 'fru_fair_no', 'fru_recut'] +
                  # T46 阶段2（2026-09-19）：题面 15（pick/cut×6+泛/match/choose×3/fair3×3）+B 类 3
                  ['fru_q_pick', 'fru_q_match', 'fru_q_cut'] +
                  ['fru_q_cut_' + k for k in ('apple', 'orange', 'melon', 'pizza', 'wedge', 'berry')] +
                  ['fru_q_choose_%d' % n for n in (2, 3, 4)] +
                  ['fru_q_fair3_%d' % n for n in (2, 3, 4)] +
                  ['fru_knife', 'fru_same', 'fru_wrong'],
    'hopscotch': ['core_chapter_end', 'core_day_end', 'core_rest', 'hop_tut_watch', 'hop_tut_turn', 'hop_hint',
                  'hop_wrong2'] +
                  # T46 阶段2（2026-09-19）：题面拆段 24（方向前缀 4+数词 20）+报数复用 hop_n_+B 类 hop_wrong
                  ['hop_p_%d' % k for k in (1, 2, 3, 4)] +
                  ['hop_n_%d' % n for n in range(1, 21)] + ['hop_wrong'],
    # batch8（数字/纠错走 TTS 兜底；picto 每字 pic_ch_*、worden 每词 wen_w_* en 童声——运行时全覆盖抽查）
    'neighbors': ['core_chapter_end', 'core_day_end', 'core_rest', 'neb_tut_watch', 'neb_tut_turn', 'neb_hint',
                  'neb_q1', 'neb_q2', 'neb_q4'],
    'picto': ['core_chapter_end', 'core_day_end', 'core_rest', 'pic_tut_watch', 'pic_tut_turn', 'pic_hint',
              'pic_q1', 'pic_q2', 'pic_q3'],   # r12：pic_q3=字源推演题面；pic_ch_ 40 条由前缀动态覆盖
    'worden': ['core_chapter_end', 'core_day_end', 'core_rest', 'wen_tut_watch', 'wen_tut_turn', 'wen_hint',
               'wen_q1', 'wen_q2', 'wen_q4'],
    # batch9（T46 阶段2 2026-09-19：ordinal 题面 20 整句 + wrong 纠错 clip 化）
    'whereistand': ['core_chapter_end', 'core_day_end', 'core_rest', 'wis_tut_watch', 'wis_tut_turn', 'wis_hint',
                    'wis_q_up', 'wis_q_down', 'wis_q_left', 'wis_q_right', 'wis_wrong'] +
                    ['wis_ord_%s_%d' % (d, k) for d in ('up', 'down', 'left', 'right') for k in range(1, 6)],
    'mirror': ['core_chapter_end', 'core_day_end', 'core_rest', 'mir_tut_watch', 'mir_tut_turn', 'mir_hint',
               'mir_q_v', 'mir_q_h'],
    'memgrid': ['core_chapter_end', 'core_day_end', 'core_rest', 'mg_tut_watch', 'mg_tut_turn', 'mg_hint', 'mg_q'],
    # batch10（chainsum 题面=动态数词 TTS 不建 clip；simon 键音=Web Audio 合成）
    'chainsum': ['core_chapter_end', 'core_day_end', 'core_rest', 'cs_tut_watch', 'cs_tut_turn', 'cs_hint',
                 # T46 阶段2（2026-09-19）：题面拆段 25（cs_n_0-20+add/sub+tail）+cs_wrong——cs_ 前缀动态取
                 ],
    'simon': ['core_chapter_end', 'core_day_end', 'core_rest', 'si_tut_watch', 'si_tut_turn', 'si_hint', 'si_replay'],
    'habit': ['core_chapter_end', 'core_day_end', 'core_rest', 'hb_tut_watch', 'hb_tut_turn', 'hb_hint',
              'hb_q_xishou', 'hb_q_qichuang', 'hb_q_shuaya', 'hb_q_chuanyi', 'hb_q_guomal', 'hb_q_shuijiao',
              # T46 阶段2（2026-09-19）：题面尾段+三纠错锚 clip 化（hb_ 全量从 manifest 动态取）
              ] + ['hb_suffix', 'hb_w_start', 'hb_w_mid', 'hb_w_adj'],
    # batch11（题面句 clip 化 2026-09-07 真机反馈：sha_q_* 15 / shp_q_* 28+规则 2 / sor_q_* 2）
    # r8 难度改造（2026-09-14）：旧 sha_tut_watch/tut_turn/hint 已被 batch23/share 同名覆盖（games=['share']），
    # shadow 侧改新键 sha_teach_watch/sha_teach_turn/sha_help；overlap 题面 sha_q_pair 由下方 sha_q_ 前缀规则涵盖
    'shadow': ['core_chapter_end', 'core_day_end', 'core_rest', 'sha_teach_watch', 'sha_teach_turn', 'sha_help',
               # T46 阶段2（2026-09-19）：wrong keyless→sha_w_same clip 化
               'sha_w_same'],
    'feed': ['core_chapter_end', 'core_day_end', 'core_rest', 'fed_tut_watch', 'fed_tut_turn', 'fed_hint',
            'fed_right', 'fed_wrong', 'fed_left_q', 'fed_left_do'],   # r8 补登记（原漏——verify_voice feed 参数静默空跑）
    'bridge': ['core_chapter_end', 'core_day_end', 'core_rest', 'brg_tut_watch', 'brg_tut_turn',
               'brg_hint', 'brg_right', 'brg_wrong', 'brg_fix_q', 'brg_fix_do', 'brg_found'],   # r9 补登记（batch21 driver 传 bridge 但 EXPECT 无键=空转假绿，feed 同型漏）
    'shapeshome': ['core_chapter_end', 'core_day_end', 'core_rest', 'shp_tut_watch', 'shp_tut_turn', 'shp_hint',
                   'shp_rule2', 'shp_rule3',
                   # r8 难度改造（2026-09-14）：三维/否定/九宫格新题面+新章规则句（shp_q3_* 由 shp_q_ 前缀自动覆盖）
                   'shp_gq', 'shp_rule_neg', 'shp_rule_grid', 'shp_rule_mix'],
    'sortsize': ['core_chapter_end', 'core_day_end', 'core_rest', 'sor_tut_watch', 'sor_tut_turn', 'sor_hint',
                 # T46 阶段2（2026-09-19）：wrong keyless→sor_wrong clip 化
                 'sor_wrong'],
    'divide': (['core_chapter_end', 'core_day_end', 'core_rest', 'div_tut_watch', 'div_tut_turn', 'div_hint',
                'div_q1', 'div_q2', 'div_q3', 'div_rem1', 'div_rem2']),
    'fraction': (['core_chapter_end', 'core_day_end', 'core_rest', 'fra_tut_watch', 'fra_tut_turn', 'fra_hint',
                  'fra_q_cut', 'fra_q_cut2', 'fra_q_read', 'fra_q_cmp',
                  # r15 难度改造（2026-09-16）：ch5 一样大章 eq 等值题面句（AUDIT-78:78）
                  'fra_q_eq']),
    # r15 难度改造（2026-09-16，AUDIT-78:79）：新 6 键=进退位标记句×2+方向锚×2+两步题面/换步句
    'column': ['core_chapter_end', 'core_day_end', 'core_rest', 'clm_tut_watch', 'clm_tut_turn', 'clm_hint',
               'clm_q_add', 'clm_q_sub', 'clm_q_two', 'clm_q_step2',
               'clm_carry_go', 'clm_borrow_go', 'clm_no_carry', 'clm_no_borrow'],
    # batch13（§0.23 题面 clip 化+§0.25 数词副本：men_n_ 1-20 / wor_n_ 1-35+wor_tpl2_ 38 段(r13 两步题库) / gri_n_ 1-5+方向词 4）
    'money': ['core_chapter_end', 'core_day_end', 'core_rest', 'men_tut_watch', 'men_tut_turn', 'men_hint', 'men_wrong',
              'men_q_buy', 'men_q_buy2', 'men_q_pay', 'men_q_pay2', 'men_q_pay3', 'men_q_jiao',
              # r15 难度改造（AUDIT-78:80）：ch1 角价尾句+ch2 买两件接续段两态
              'men_q_buy_j', 'men_q_and', 'men_q_and_j'],
    'wordprob': ['core_chapter_end', 'core_day_end', 'core_rest', 'wor_tut_watch', 'wor_tut_turn', 'wor_hint', 'wor_wrong'],
    'grid': ['core_chapter_end', 'core_day_end', 'core_rest', 'gri_tut_watch', 'gri_tut_turn', 'gri_hint', 'gri_wrong',
             'gri_q1', 'gri_q2', 'gri_q3', 'gri_go',
             # r13 相对导航指令句全 clip 化（§0.23 禁 key:null）：fwd/格/左转/右转/拿宝箱/错序三段/开场任务
             'gri_i_fwd', 'gri_i_ge', 'gri_i_left', 'gri_i_right', 'gri_i_take', 'gri_i_order',
             'gri_i_next', 'gri_i_box', 'gri_i_hint'],
    # batch14（blo 数词 1-12+题面 4+win 无/mul 数词 2-9+win/lose+q 两段/num 数词 5+反馈 4+无 wrong（§0.24 豁免））
    'blocks': ['core_chapter_end', 'core_day_end', 'core_rest', 'blo_tut_watch', 'blo_tut_turn', 'blo_hint', 'blo_wrong',
               'blo_q_count', 'blo_q_fill', 'blo_q_front', 'blo_q_top'],
    'multibattle': ['core_chapter_end', 'core_day_end', 'core_rest', 'mul_tut_watch', 'mul_tut_turn', 'mul_hint', 'mul_wrong',
                    'mul_q1', 'mul_q2', 'mul_win', 'mul_lose'],
    'numberdet': ['core_chapter_end', 'core_day_end', 'core_rest', 'num_tut_watch', 'num_tut_turn', 'num_q1', 'num_q2',
                  'num_big', 'num_small', 'num_got', 'num_gone', 'num_hint'],
}
import json as _json
_MANI = _json.load(open(os.path.join(BASE, '..', 'voice', 'clips', 'manifest.json'), encoding='utf-8'))
EXPECT['pinyin'] += [k for k in _MANI if k.startswith('py_syl_')]
EXPECT['picto'] += [k for k in _MANI if k.startswith('pic_ch_')]
EXPECT['worden'] += [k for k in _MANI if k.startswith('wen_w_')]
# T46 阶段2（09-19 修）：share（batch23）同前缀键 sha_q_N_K 已入 manifest（games=['share']），
# 裸前缀规则会拉进他款键=假 missing——改为 games 限定（shadow 侧 16 条 sha_q_*）
EXPECT['shadow'] = sorted(set(EXPECT['shadow']) |
                          {k for k, v in _MANI.items() if k.startswith('sha_q_') and 'shadow' in v['games']})
EXPECT['shapeshome'] += [k for k in _MANI if k.startswith('shp_q_') or k.startswith('shp_nq_')]
# Task#46 阶段2 A5（2026-09-19）：shp_wrong 族 73（tri 48+neg 24+grid 1）挂键——前缀动态取
EXPECT['shapeshome'] += [k for k in _MANI if k.startswith('shp_wrong')]
EXPECT['sortsize'] += [k for k in _MANI if k.startswith('sor_q_')]
EXPECT['divide'] += [k for k in _MANI if k.startswith('div_n_')] + ['div_wrong']  # 审查 m5
EXPECT['fraction'] += [k for k in _MANI if k.startswith('fra_f_')] + ['fra_num_2', 'fra_num_3', 'fra_num_4', 'fra_wrong']  # 审查 M1+m5
EXPECT['money'] += [k for k in _MANI if k.startswith('men_n_')]  # §0.25 数词副本 1-20
EXPECT['wordprob'] += [k for k, v in _MANI.items() if k.startswith('wor_n_') and 'wordprob' in v['games']] + \
                      [k for k, v in _MANI.items() if k.startswith('wor_tpl2_') and 'wordprob' in v['games']]  # r13：数词 1-35+两步模板段 38；旧 wor_tpl_ 24 条退役 games=[] 不注入不计入
EXPECT['grid'] += [k for k in _MANI if k.startswith('gri_n_')] + [k for k in _MANI if k.startswith('gri_d_')]
EXPECT['blocks'] += [k for k in _MANI if k.startswith('blo_n_')]          # 数词 1-12 副本（§0.25）
EXPECT['multibattle'] += [k for k in _MANI if k.startswith('mul_n_')]     # 数词 2-9 副本
EXPECT['numberdet'] += [k for k in _MANI if k.startswith('num_n_')]       # 数词 10/20/30/50/99
# Task#46 阶段2（2026-09-19）：compare 语义句 cmp_sem_*+数数跟读 cmp_n_1..10、subbug 题面拆段 sub_s_*+
# sub_n_0..20+sub_refly clip 化——cmp_/sub_ 前缀全量从 manifest 动态取（前缀无跨款泄漏已核，set 去重防重复计数）
EXPECT['compare'] = sorted(set(EXPECT['compare']) |
                           {k for k, v in _MANI.items() if k.startswith('cmp_') and 'compare' in v['games']})
EXPECT['subbug'] = sorted(set(EXPECT['subbug']) |
                          {k for k, v in _MANI.items() if k.startswith('sub_') and 'subbug' in v['games']})
# Task#46 阶段2 A5（2026-09-19）：connect 题面 con_st_* 40+确认 con_cf_* 26 clip 化——本款此前
# 无 EXPECT 条目=空转缺口（feed/shaperoof 同款漏登补法）；con_ 前缀全量从 manifest 动态取
# （含既有 16 条；anti 仅专属食物 11 动物、up 去重 2 句、dn/chain 按 CHAINS 3 链——以注册块为准）
EXPECT['connect'] = ['core_chapter_end', 'core_day_end', 'core_rest'] + \
                    sorted({k for k, v in _MANI.items() if k.startswith('con_') and 'connect' in v['games']})
# batch15（cas 数词 1-35+题面段+反馈；lgw 问句 6+拼接单元 8+词 6+动物 3；ms 全 8 条）
EXPECT['cashier'] = (['core_chapter_end', 'core_day_end', 'core_rest', 'cas_tut_watch', 'cas_tut_turn', 'cas_hint',
                      'cas_right', 'cas_wrong', 'cas_q_more', 'cas_q_less', 'cas_q1', 'cas_q2', 'cas_q3', 'cas_q3j'] +
                     [k for k in _MANI if k.startswith('cas_n_')])
EXPECT['logicwho'] = ['core_chapter_end', 'core_day_end', 'core_rest', 'lgw_tut_watch', 'lgw_tut_turn', 'lgw_hint', 'lgw_wrong',
                      'lgw_q_red', 'lgw_q_yellow', 'lgw_q_blue', 'lgw_q_ball', 'lgw_q_book', 'lgw_q_umbrella',
                      'lgw_c_a', 'lgw_c_b', 'lgw_c_nb', 'lgw_c_l', 'lgw_c_left', 'lgw_c_ll', 'lgw_c_rr', 'lgw_c_h', 'lgw_c_i',
                      'lgw_red', 'lgw_yellow', 'lgw_blue', 'lgw_ball', 'lgw_book', 'lgw_umbrella',
                      'lgw_n_tu', 'lgw_n_mao', 'lgw_n_xiong']
EXPECT['matchstick'] = ['core_chapter_end', 'core_day_end', 'core_rest', 'ms_tut_watch', 'ms_tut_turn', 'ms_hint', 'ms_q',
                        'ms_right', 'ms_wrong', 'ms_pick', 'ms_drop']

EXPECT['read'] = (['core_chapter_end', 'core_day_end', 'core_rest', 'rd_tut_watch', 'rd_tut_turn', 'rd_hint',
                   'rd_right', 'rd_wrong', 'rd_listen',
                   'rd_q1', 'rd_q1b', 'rd_q2', 'rd_q2b', 'rd_q3a', 'rd_q3b', 'rd_q3c', 'rd_q4a', 'rd_q4b'] +
                  ['rd_w_' + k for k in ('red', 'blue', 'yellow', 'green', 'park', 'school', 'shop', 'river', 'yard', 'home',
                                         'rabbit', 'cat', 'bear', 'happy', 'sad', 'angry', 'worried',
                                         'umbrella', 'hat', 'boots', 'carrot', 'kite', 'book')] +
                  # T46 拆段（2026-09-19）：正文句族 rd_s_* 174 条（听读/点句跟读 clip 化）从 manifest 动态取
                  [k for k, v in _MANI.items() if k.startswith('rd_s_') and 'read' in v['games']])
# r16 难度改造（2026-09-16，补 spellen agent 漏更：SP_WORDS 旧 24 词已废，book/moon/bird 等出库）：
# 60 词库三题型（listen/missing/meaning）——sp_word_ 发音 60+sp_mean_ 释义 60 从 manifest 动态取
# （零手抄；sp_word_* 禁 TTS 英文兜底 §0.32）
EXPECT['spellen'] = (['core_chapter_end', 'core_day_end', 'core_rest', 'sp_tut_watch', 'sp_tut_turn', 'sp_hint',
                      'sp_right', 'sp_wrong', 'sp_first'] +
                     [k for k, v in _MANI.items() if k.startswith('sp_word_') and 'spellen' in v['games']] +
                     [k for k, v in _MANI.items() if k.startswith('sp_mean_') and 'spellen' in v['games']] +
                     # T46 拆段（2026-09-19）：字母名跟读族 sp_l_<word>（sayLetters clip 化）
                     [k for k, v in _MANI.items() if k.startswith('sp_l_') and 'spellen' in v['games']])
# r16 难度改造（2026-09-16，AUDIT-78:81）：库 30→80 按义类分章+情境句填成语+近义辨析；
# 新 7 句键（tut_watch2/tut_turn2/hint2/right2/wrong2/q_fill/q_near）+名音 idm_w_ 1-80 从 manifest
# 动态取（零手抄）；旧 idm_t_1..30+旧 5 键冻结 games=[] 不注入不计入（wordprob r13 先例）
EXPECT['idiom'] = (['core_chapter_end', 'core_day_end', 'core_rest',
                    'idm_tut_watch2', 'idm_tut_turn2', 'idm_hint2', 'idm_right2', 'idm_wrong2',
                    'idm_q_fill', 'idm_q_near'] +
                   [k for k, v in _MANI.items() if k.startswith('idm_w_') and 'idiom' in v['games']] +
                   # T46 阶段2（09-19）：尾段释义/语境句 clip 化（idm_ctx_1..80/idm_def_1..80 动态取）
                   [k for k, v in _MANI.items()
                    if k.startswith(('idm_ctx_', 'idm_def_')) and 'idiom' in v['games']])
# r16 难度改造（2026-09-16，timecalc 主线收口补登）：九型（审计域 40+5 关=「45 关」为 verify 审计域口径
# 非结构常量，STATIC_LEVELS=40）；tc_ 7 键（r16 +2 新键 tc_hint2/tc_wrong2；tim_=batch4 times 款不冲突）
EXPECT['timecalc'] = sorted(set(
    ['core_chapter_end', 'core_day_end', 'core_rest',
     'tc_tut_watch', 'tc_tut_turn', 'tc_hint', 'tc_hint2',
     'tc_right', 'tc_wrong', 'tc_wrong2']) |
    {k for k, v in _MANI.items() if k.startswith('tc_') and 'timecalc' in v['games']})
# r17 难度改造（2026-09-17，主线收口补登——verify_batch20 传参 memduel 此前无条目=空转 rc0 假绿，
# feed 同款漏登补法）：五型（df/dr/lf/cf/dx）md_ 9 键=既有 5+r17 新 4（dir_fwd/dir_rev/hint_rev/gap）
EXPECT['memduel'] = sorted(set(
    ['core_chapter_end', 'core_day_end', 'core_rest',
     'md_tut_watch', 'md_tut_turn', 'md_hint', 'md_hint_rev', 'md_right', 'md_wrong',
     'md_dir_fwd', 'md_dir_rev', 'md_gap']) |
    {k for k, v in _MANI.items() if k.startswith('md_') and 'memduel' in v['games']})
# T46 阶段2（2026-09-19）：chainsum 题面拆段 25（cs_n_0-20 数词+cs_op_add/sub+cs_tail 尾段）
# +cs_wrong 纠错 clip 化——cs_ 前缀全量从 manifest 动态取（28 条全在 chainsum 名下，无跨款泄漏）
EXPECT['chainsum'] = sorted(set(
    ['core_chapter_end', 'core_day_end', 'core_rest', 'cs_hint']) |
    {k for k, v in _MANI.items() if k.startswith('cs_') and 'chainsum' in v['games']})
# T46 阶段2（2026-09-19）：neighbors 题面段链 39（neb_mid_1-18「n和n+2」整段+neb_n_1-20 数词）
# +neb_wrong 纠错 clip 化——neb_ 前缀全量从 manifest 动态取（45 条全在 neighbors 名下）
EXPECT['neighbors'] = sorted(set(EXPECT['neighbors']) |
                             {k for k, v in _MANI.items() if k.startswith('neb_') and 'neighbors' in v['games']})
# T46 阶段2（2026-09-19）：quiz 题库 clip 化补登（此前 EXPECT/DIRS 无 quiz 条目=传参空转缺口，
# feed 同款漏登补法）——qz_ 330=题面 qz_q_160+选项串 qz_opts_160+类别 qz_cat_4+纠错 qz_no+
# 通用 5，qz_ 前缀全量从 manifest 动态取（零手抄；题库文本 build 侧与 QZ_BANK 全量对账）
EXPECT['quiz'] = sorted(set(
    ['core_chapter_end', 'core_day_end', 'core_rest',
     'qz_tut_watch', 'qz_tut_turn', 'qz_hint', 'qz_right', 'qz_wrong', 'qz_no'] +
    ['qz_cat_%d' % n for n in range(1, 5)]) |
    {k for k, v in _MANI.items() if k.startswith('qz_') and 'quiz' in v['games']})
# r17 难度改造（2026-09-17，chartread 主线补登）：值域 10-20+一格=2+四新问法；chr_ 17 键=
# 通用 5+题面 6（r17 新 second/total）+名音 6（games=['chartread'] n=20 含 core 3）
EXPECT['chartread'] = sorted(set(
    ['core_chapter_end', 'core_day_end', 'core_rest',
     'chr_tut_watch', 'chr_tut_turn', 'chr_hint', 'chr_right', 'chr_wrong',
     'chr_q_most', 'chr_q_least', 'chr_q_howmany', 'chr_q_compare', 'chr_q_second', 'chr_q_total'] +
    ['chr_n_' + w for w in ('bird', 'cat', 'chick', 'dog', 'fish', 'rabbit')]) |
    {k for k, v in _MANI.items() if k.startswith('chr_') and 'chartread' in v['games']})
# r17 难度改造（2026-09-17，evidence 主线补登）：结论池 8→20+三档+findall 多选+反问；
# evi_ 28 键=通用 7+q 三态（q2 文本迁移重合成/新 q3）+结论句 c_×20（games=['evidence'] n=31 含 core 3）
EXPECT['evidence'] = sorted(set(
    ['core_chapter_end', 'core_day_end', 'core_rest',
     'evi_tut_watch', 'evi_tut_turn', 'evi_hint', 'evi_right', 'evi_wrong',
     'evi_q1', 'evi_q2', 'evi_q3'] +
    ['evi_c_' + c for c in ('rainwet', 'snowplay', 'birthday', 'cooked', 'doghere', 'windbig', 'paintday',
                            'nightowl', 'washhands', 'ateorange', 'haircut', 'waterplant', 'mopped', 'brushed',
                            'fedfish', 'playedblocks', 'drankmilk', 'wrotehomework', 'fixedbike', 'playedsandbox')]) |
    {k for k, v in _MANI.items() if k.startswith('evi_') and 'evidence' in v['games']})
# batch17（poemfill 整首朗读 pf_poem_* 30（r13 扩 20）+教学反馈 6；area 数数 ar_count_ 1-10+教学反馈 6；mirrormaze 教学 7（r14 扩 mm_hint2/mm_wrong2 轴向语义））
PF_POEMS = ['yie', 'jys', 'cx', 'mn', 'dgjl', 'cs', 'jx', 'wlsbp', 'zwl', 'jgsh',
            'hua', 'glyx', 'feng', 'xyze', 'xich', 'huaj', 'yess', 'meih', 'xec', 'cunj',
            'yl', 'cao', 'xjc', 'mnq', 'zys', 'sjian', 'zlj', 'shx', 'sxg', 'jj2']
EXPECT['poemfill'] = (['core_chapter_end', 'core_day_end', 'core_rest', 'pf_tut_watch', 'pf_tut_turn', 'pf_hint',
                       'pf_right', 'pf_wrong', 'pf_first'] + ['pf_poem_' + p for p in PF_POEMS] +
                      # Task#46 阶段2（2026-09-19）：诗句行 pf_l_* 120+飞花令 pf_ff_q/c_* 6 clip 化
                      # ——前缀全量从 manifest 动态取（零手抄，poemfill 无跨款前缀泄漏已核）
                      [k for k, v in _MANI.items() if k.startswith('pf_l_') and 'poemfill' in v['games']] +
                      [k for k, v in _MANI.items() if k.startswith('pf_ff_') and 'poemfill' in v['games']])
# Task#46 阶段2 A5（2026-09-19）：area 题面 ar_ask_*4+ar_calc_* 30+确认句 ar_cf_* 46 clip 化——
# ar_ 前缀全量从 manifest 动态取（16 既有+80 T46=96；已知缺口 ar_cf_s_11..20 未注册报主线）
EXPECT['area'] = sorted(set(
    ['core_chapter_end', 'core_day_end', 'core_rest', 'ar_tut_watch', 'ar_tut_turn', 'ar_hint',
     'ar_right', 'ar_wrong', 'ar_tip'] + ['ar_count_%d' % n for n in range(1, 11)]) |
    {k for k, v in _MANI.items() if k.startswith('ar_') and 'area' in v['games']})
EXPECT['mirrormaze'] = ['core_chapter_end', 'core_day_end', 'core_rest', 'mm_tut_watch', 'mm_tut_turn', 'mm_hint',
                        'mm_hint2', 'mm_right', 'mm_wrong', 'mm_wrong2']
# batch18（coder2 13+stack 11+bounce 6 教学反馈句；Task#46 阶段2：coder2 指令词 cd2_i_* 5+
# 循环块 cd2_loop、stack 章问句 st_q_1..4 clip 化——keyless 拼句清零）
EXPECT['coder2'] = ['core_chapter_end', 'core_day_end', 'core_rest', 'cd2_tut_watch', 'cd2_tut_turn', 'cd2_hint',
                    'cd2_right', 'cd2_wrong', 'cd2_run', 'cd2_wall',
                    'cd2_i_f', 'cd2_i_l', 'cd2_i_r', 'cd2_i_rep2', 'cd2_i_rep3', 'cd2_loop']
EXPECT['stack'] = ['core_chapter_end', 'core_day_end', 'core_rest', 'st_tut_watch', 'st_tut_turn', 'st_hint',
                   'st_right', 'st_wrong', 'st_wind', 'st_place', 'st_q_1', 'st_q_2', 'st_q_3', 'st_q_4']
EXPECT['bounce'] = ['core_chapter_end', 'core_day_end', 'core_rest', 'bc_tut_watch', 'bc_tut_turn', 'bc_hint',
                    'bc_right', 'bc_wrong', 'bc_boing',
                    # T46 阶段2（2026-09-19）：进错洞语义句 keyless→bc_hole clip 化
                    'bc_hole']
# batch19（cipher 5+gomoku4 6+sudokunum 5 教学反馈句；T46 阶段2 cipher 拆段 34
# =ci_v_d1-9 数字词+ci_v_<字>12+ci_sym_*10+ci_repr/ci_look1-2——ci_ 前缀全量从 manifest 动态取）
EXPECT['cipher'] = sorted(set(
    ['core_chapter_end', 'core_day_end', 'core_rest', 'ci_tut_watch', 'ci_tut_turn', 'ci_hint',
     'ci_right', 'ci_wrong']) |
    {k for k, v in _MANI.items() if k.startswith('ci_') and 'cipher' in v['games']})
EXPECT['gomoku4'] = ['core_chapter_end', 'core_day_end', 'core_rest', 'gk_tut_watch', 'gk_tut_turn', 'gk_hint',
                     'gk_right', 'gk_lose', 'gk_draw']
EXPECT['sudokunum'] = ['core_chapter_end', 'core_day_end', 'core_rest', 'sn_tut_watch', 'sn_tut_turn', 'sn_hint',
                       'sn_right', 'sn_wrong',
                       # T46 阶段2（2026-09-19）：死局明说句 keyless→sn_dead clip 化
                       'sn_dead']
# batch24（2026-09-13 补 shaperoof 段——原 driver 传参 shaperoof 但 EXPECT/DIRS 无此键=空转 rc0 假绿；
# v2 三阶反馈 sr_ 3 条随段登记。trace/dressup 段不在本次改造范围，空转缺口登记不修）
EXPECT['shaperoof'] = ['core_chapter_end', 'core_day_end', 'core_rest',
                       'shr_tut_watch', 'shr_tut_turn', 'shr_hint', 'shr_right', 'shr_wrong', 'shr_q',
                       'sr_rot_hint', 'sr_mir_wrong', 'sr_combo_hint']
# batch24 dressup r10（2026-09-14 补段——verify_batch24 传参 dressup 但 EXPECT/DIRS 无此键=空转 rc0 假绿，
# feed/shaperoof 同款漏登补法；r10 新 3 键（dru_budget_hint/dru_anti_hint/dru_anti_right）随段登记）
EXPECT['dressup'] = ['core_chapter_end', 'core_day_end', 'core_rest',
                     'dru_tut_watch', 'dru_tut_turn', 'dru_hint', 'dru_right',
                     'dru_wrong', 'dru_free', 'dru_budget_hint', 'dru_anti_hint', 'dru_anti_right']
# batch23 weather r9（2026-09-14 补段——v2 条件推理款此前未登记=空转缺口，feed 同款漏登补法；
# wea_ 19 键：四包装 3+hint+4 天气题面/错配+4 新条件 hint（manifest games=['weather']）
EXPECT['weather'] = ['core_chapter_end', 'core_day_end', 'core_rest',
                     'wea_tut_watch', 'wea_tut_turn', 'wea_hint', 'wea_right',
                     'wea_w_sun', 'wea_w_rain', 'wea_w_snow', 'wea_w_wind',
                     'wea_q_sun', 'wea_q_rain', 'wea_q_snow', 'wea_q_wind',
                     'wea_multi_hint', 'wea_temp_hint', 'wea_who_hint', 'wea_anti_hint']
# batch21 bubble r9（2026-09-14 补段——此前未登记=verify_batch21 传参 bubble 空转 rc0 假绿，feed 同款漏登补法；
# bub_ 7 键：六条 v2 教学反馈 + r9 新增 bub_timeup 倒计时温和重来引导）
EXPECT['bubble'] = ['core_chapter_end', 'core_day_end', 'core_rest',
                    'bub_tut_watch', 'bub_tut_turn', 'bub_hint', 'bub_right',
                    'bub_wrong_more', 'bub_wrong_less', 'bub_timeup']
# Task#46 阶段2 B1（2026-09-19）：bridge 教学 pattern 读出段链 16（brg_t_{色}×5+_sq×5+_ci×5
# +brg_t_tail）clip 化——brg_t_ 前缀全量从 manifest 动态取（16 条全在 bridge 名下）
EXPECT['bridge'] = sorted(set(EXPECT['bridge']) |
                          {k for k, v in _MANI.items() if k.startswith('brg_t_') and 'bridge' in v['games']})
# Task#46 阶段2 B1（2026-09-19）：bubble 题面 18（bub_q_{n}_{色}）+跟数 8（bub_n_1..8）
# +演示强调 1（bub_enough）clip 化——bub_ 前缀全量从 manifest 动态取（27 增量全在 bubble 名下）
EXPECT['bubble'] = sorted(set(EXPECT['bubble']) |
                          {k for k, v in _MANI.items() if k.startswith('bub_') and 'bubble' in v['games']})
# Task#46 阶段2 B1（2026-09-19）：feed 题面 15（fed_q）+combo 段 13（fed_c_head+fed_c_）
# +数词 11（fed_n_0..10）+超放回 1（fed_more）clip 化——fed_ 前缀全量从 manifest 动态取
EXPECT['feed'] = sorted(set(EXPECT['feed']) |
                        {k for k, v in _MANI.items() if k.startswith('fed_') and 'feed' in v['games']})
# Task#46 阶段2 B1（2026-09-19）：colormix 题面 10（col_q_{混色答案}）+点颜料 4（col_paint_{色}）
# +演示收束 1（col_green）clip 化——本款此前无 EXPECT 条目=空转缺口（feed 同款漏登补法）；
# col_ 前缀全量从 manifest 动态取（20 条全在 colormix 名下，games 限定防跨款泄漏）
EXPECT['colormix'] = ['core_chapter_end', 'core_day_end', 'core_rest'] + \
                     sorted({k for k, v in _MANI.items() if k.startswith('col_') and 'colormix' in v['games']})
# Task#46 阶段2 B1（2026-09-19）：hidden 题面 6（hid_q_{动物}）+两型拆段（hid_s_find/hid_s_he
# +hid_n_{数}+hid_an_{动物}）+干扰点名（hid_w_{动物}）+听耳 1（hid_ear）clip 化——本款此前
# 无 EXPECT 条目=空转缺口；hid_ 前缀全量动态取（31 条全在 hidden 名下）
EXPECT['hidden'] = ['core_chapter_end', 'core_day_end', 'core_rest'] + \
                   sorted({k for k, v in _MANI.items() if k.startswith('hid_') and 'hidden' in v['games']})
# Task#46 阶段2 B1（2026-09-19）：slide 题面 1（sli_q 补挂）+教学空格句 1（sli_adj）clip 化
# ——本款此前无 EXPECT 条目=空转缺口；sli_ 前缀全量动态取（7 条全在 slide 名下）
EXPECT['slide'] = ['core_chapter_end', 'core_day_end', 'core_rest'] + \
                  sorted({k for k, v in _MANI.items() if k.startswith('sli_') and 'slide' in v['games']})
# Task#46 阶段2 B1（2026-09-19）：piano 教学演示收束语 1（pia_like）clip 化——本款此前
# 无 EXPECT 条目=空转缺口；pia_ 前缀全量动态取（6 条全在 piano 名下）
EXPECT['piano'] = ['core_chapter_end', 'core_day_end', 'core_rest'] + \
                  sorted({k for k, v in _MANI.items() if k.startswith('pia_') and 'piano' in v['games']})
# Task#46 阶段2 B1（2026-09-19）：share 题面 22（sha_q_{n}_{k}，出题域 n∈2-12×k∈{2,3}）
# +数词 13（sha_n_0..12，碗内计数/取回报数含'零'）clip 化——本款此前无 EXPECT 条目=空转
# 缺口；sha_ 前缀动态取但必须 games 限定 share（shadow 同前缀 20 条 sha_q_* 在 shadow 名下）
EXPECT['share'] = ['core_chapter_end', 'core_day_end', 'core_rest'] + \
                  sorted({k for k, v in _MANI.items() if k.startswith('sha_') and 'share' in v['games']})
# r24 难度改造（SPEC-R24-SOUNDCOUNT §R6）：纯听预告/双问第二问句/大域名音 7 新键
# （sc_ears/sc_q3/sc_n_6..10）clip 化——本款此前无 EXPECT 条目=空转缺口；sc_ 前缀
# 全量动态取（20 条全在 soundcount 名下）
EXPECT['soundcount'] = ['core_chapter_end', 'core_day_end', 'core_rest'] + \
                       sorted({k for k, v in _MANI.items() if k.startswith('sc_') and 'soundcount' in v['games']})
# Task#46 阶段2 B1（2026-09-19）：weather 题面静态 17 句（wea_st_0..16，gen_clips 注册序=
# game-data 源内 stem 出现序）+提交反馈 2（wea_sub_less/more）clip 化——temp/who 动态句
# （含温度数词）无键仍 TTS 兜底（域外）；wea_ 前缀其余 16 条既有 EXPECT 已列
EXPECT['weather'] = sorted(set(EXPECT['weather']) |
                           {k for k, v in _MANI.items() if (k.startswith('wea_st_') or k.startswith('wea_tt_') or k.startswith('wea_tw_'))
                                and 'weather' in v['games']} |
                           {'wea_sub_less', 'wea_sub_more'})
# Task#46 阶段2 B1（2026-09-19）：dressup 题面 17 句（dru_q_ 6 冲突/dru_qb_ 5 预算/
# dru_qa_ 6 反向，文本与 game-data 三表逐条对账一致）clip 化——dru_ 前缀全量动态取
# （26 条全在 dressup 名下）
EXPECT['dressup'] = sorted(set(EXPECT['dressup']) |
                           {k for k, v in _MANI.items() if k.startswith('dru_') and 'dressup' in v['games']})
# batch30 storybed r10（2026-09-14 补段——此前未登记=空转缺口，feed/dressup 同款漏登补法；
# stb_ 34 键：教学反馈 7+三型题面 2（q_rain/q_miss）+步音 24+条件步音 1（stb_s_out_4），manifest games=['storybed']）
EXPECT['storybed'] = (['core_chapter_end', 'core_day_end', 'core_rest',
                       'stb_tut_watch', 'stb_tut_turn', 'stb_hint', 'stb_right', 'stb_wrong',
                       'stb_q', 'stb_next', 'stb_q_rain', 'stb_q_miss', 'stb_s_out_4'] +
                      ['stb_s_%s_%d' % (f, n) for f in
                       ('sleep', 'getup', 'washhand', 'eat', 'out', 'bath') for n in range(4)])
# batch30 babylove r10（2026-09-14 主线补段——babylove agent 漏登，feed/dressup 同款空转缺口补法；
# bab_ 44 键：教学反馈 5+题面 5+发育链/生境 4+名音 30，manifest games=['babylove']）
EXPECT['babylove'] = (['core_chapter_end', 'core_day_end', 'core_rest',
                       'bab_tut_watch', 'bab_tut_turn', 'bab_hint', 'bab_right', 'bab_wrong',
                       'bab_q1', 'bab_q2', 'bab_q3', 'bab_q4_mom', 'bab_q4_baby',
                       'bab_grow_next', 'bab_h_water', 'bab_h_forest', 'bab_h_grass'] +
                      ['bab_n_' + n for n in ('tadpole', 'frog', 'caterpillar', 'butterfly',
                       'fishfry', 'fish', 'duckling', 'duck', 'grub', 'beetle', 'lamb', 'sheep',
                       'piglet', 'pig', 'foal', 'horse', 'calf', 'cow', 'kitten', 'cat',
                       'puppy', 'dog', 'chick', 'hen', 'egg_frog', 'egg_butterfly', 'egg_beetle',
                       'egg_fish', 'egg_hen', 'egg_duck')])
# batch36 comfort r11（2026-09-14 补段——本款此前未登记 verify_voice（空转缺口），同 dressup r10 补法；
# core 3+co 7（r11 难度改造新增 co_pick 择优锚/co_gray 灰色次优反馈，manifest games=['comfort']）
EXPECT['comfort'] = ['core_chapter_end', 'core_day_end', 'core_rest',
                     'co_tut_watch', 'co_tut_turn', 'co_hint', 'co_right', 'co_wrong',
                     'co_pick', 'co_gray']
# batch37 thanks r12（2026-09-15 补段；core 3+th_ 5+tha_ 4——r12 难度改造新增
# tha_fit 择优锚/tha_not 反向锚/tha_gray 灰反馈/tha_ok 反向错反馈，manifest games=['thanks']）
EXPECT['thanks'] = ['core_chapter_end', 'core_day_end', 'core_rest',
                    'th_tut_watch', 'th_tut_turn', 'th_hint', 'th_right', 'th_wrong',
                    'tha_fit', 'tha_not', 'tha_gray', 'tha_ok']
# batch39 crd r12（2026-09-15 补段；core 3+crd_ 8=既有 5+r12 新 3 错链方向提示按步型分流
# hint_like/hint_no/hint_wish，manifest games=['crd']）
EXPECT['crd'] = ['core_chapter_end', 'core_day_end', 'core_rest',
                 'crd_tut_watch', 'crd_tut_turn', 'crd_hint', 'crd_right', 'crd_wrong',
                 'crd_hint_like', 'crd_hint_no', 'crd_hint_wish']
# batch32 senses r11（2026-09-14 补段——本款此前未登记 verify_voice（空转缺口），同 dressup r10 补法；
# core 3+sen_ 33：教学反馈 7+r11 新句 6+名音×20（感官 5+物品 10+多感官物 5），manifest games=['senses']）
EXPECT['senses'] = (['core_chapter_end', 'core_day_end', 'core_rest',
                     'sen_tut_watch', 'sen_tut_turn', 'sen_hint', 'sen_right', 'sen_wrong',
                     'sen_q1', 'sen_q2', 'sen_q3', 'sen_q_not', 'sen_q_not2',
                     'sen_q_cov1', 'sen_q_cov2', 'sen_mw'] +
                    ['sen_n_' + w for w in ('eye', 'ear', 'nose', 'hand', 'mouth',
                                            'rainbow', 'star', 'bell', 'birdsong', 'flower',
                                            'cookie', 'softtoy', 'ice', 'lemon', 'candy',
                                            'popcorn', 'watermelon', 'kitten', 'soup', 'drum')])
# batch31 animalmenu（r11 难度改造：anm_ 39=句 14+名音 25，manifest games=['animalmenu'] n=42 含 core 3）
EXPECT['animalmenu'] = (['core_chapter_end', 'core_day_end', 'core_rest',
                         'anm_tut_watch', 'anm_tut_turn', 'anm_hint', 'anm_right', 'anm_wrong',
                         'anm_q1', 'anm_q2',
                         'anm_q_multi', 'anm_q_diet', 'anm_q_chain', 'anm_less', 'anm_more',
                         'anm_h_diet', 'anm_h_chain'] +
                        ['anm_n_' + w for w in ('rabbit', 'panda', 'monkey', 'cat', 'dog',
                                                'mouse', 'bear', 'squirrel',
                                                'carrot', 'bamboo', 'banana', 'fish',
                                                'bone', 'cheese', 'honey', 'pinecone',
                                                'wolf', 'sheep', 'apple', 'greens',
                                                'berry', 'meat', 'grass', 'corn', 'acorn')])
# batch34 datacollect r14（2026-09-15 补段；core 3+dc_ 20=通用 5+题面 7（q_most 随 most 下线保留
# +q_sum/q_diff/change_up·dn/total_up·dn）+scale 换算锚+名音 6，manifest games=['datacollect']）
EXPECT['datacollect'] = ['core_chapter_end', 'core_day_end', 'core_rest',
                         'dc_tut_watch', 'dc_tut_turn', 'dc_hint', 'dc_right', 'dc_wrong',
                         'dc_q_count', 'dc_q_most', 'dc_q_sum', 'dc_q_diff',
                         'dc_q_change_up', 'dc_q_change_dn', 'dc_q_total_up', 'dc_q_total_dn',
                         'dc_scale'] + ['dc_n_' + w for w in ('rabbit', 'bird', 'cat', 'chick', 'sheep', 'duck')]
# Task#46 阶段2 B4（2026-09-19）：batch33-37 12 款 keyless 清零——各前缀全量从 manifest 动态取
# （零手抄；前缀跨款泄漏已逐前缀核 none：ps_/rp_/dc_/hc_/so_/ed_/mt_/co_/qc_/pl_/tch_/th_）
EXPECT['datacollect'] = sorted(set(EXPECT['datacollect']) |
                               {k for k, v in _MANI.items() if k.startswith('dc_') and 'datacollect' in v['games']})
EXPECT['position'] = sorted(set(['core_chapter_end', 'core_day_end', 'core_rest']) | \
                     {k for k, v in _MANI.items() if k.startswith('ps_') and 'position' in v['games']})
EXPECT['robotpaint'] = sorted(set(['core_chapter_end', 'core_day_end', 'core_rest']) | \
                       {k for k, v in _MANI.items() if k.startswith('rp_') and 'robotpaint' in v['games']})
EXPECT['hidecup'] = sorted(set(['core_chapter_end', 'core_day_end', 'core_rest']) | \
                    {k for k, v in _MANI.items() if k.startswith('hc_') and 'hidecup' in v['games']})
# batch41 zilearn（2026-09-24 段二注册；参数子集过滤未登记=静默 rc0 假绿，第 8 起预防）
EXPECT['zilearn'] = sorted(set(['core_chapter_end', 'core_day_end', 'core_rest']) | \
                    {k for k, v in _MANI.items() if k.startswith('zi_') and 'zilearn' in v['games']})
EXPECT['sentorder'] = sorted(set(['core_chapter_end', 'core_day_end', 'core_rest']) | \
                      {k for k, v in _MANI.items() if k.startswith('so_') and 'sentorder' in v['games']})
EXPECT['errdoc'] = sorted(set(['core_chapter_end', 'core_day_end', 'core_rest']) | \
                   {k for k, v in _MANI.items() if k.startswith('ed_') and 'errdoc' in v['games']})
EXPECT['maketen'] = sorted(set(['core_chapter_end', 'core_day_end', 'core_rest']) | \
                    {k for k, v in _MANI.items() if k.startswith('mt_') and 'maketen' in v['games']})
EXPECT['comfort'] = sorted(set(EXPECT['comfort']) |
                           {k for k, v in _MANI.items() if k.startswith('co_') and 'comfort' in v['games']})
EXPECT['quickcmp'] = sorted(set(['core_chapter_end', 'core_day_end', 'core_rest']) | \
                     {k for k, v in _MANI.items() if k.startswith('qc_') and 'quickcmp' in v['games']})
EXPECT['plant'] = sorted(set(['core_chapter_end', 'core_day_end', 'core_rest']) | \
                  {k for k, v in _MANI.items() if k.startswith('pl_') and 'plant' in v['games']})
EXPECT['teach'] = sorted(set(['core_chapter_end', 'core_day_end', 'core_rest']) | \
                  {k for k, v in _MANI.items() if k.startswith('tch_') and 'teach' in v['games']})
EXPECT['thanks'] = sorted(set(EXPECT['thanks']) |
                          {k for k, v in _MANI.items() if k.startswith('th_') and 'thanks' in v['games']})
# Task#46 阶段2 B2（2026-09-19）：b25-b28 12 款 keyless clip 化——EXPECT=manifest 中
# games 含该款的全量键（与 inject_clips.clips_js 注入口径完全一致，零手抄零遗漏）
for _g in ('emo', 'habitat', 'story3', 'calendar', 'season', 'sign', 'coin',
           'notebird', 'ruler', 'coder', 'conserve', 'shapecount'):
    EXPECT[_g] = sorted(k for k, v in _MANI.items() if _g in v['games'])
# Task#46 阶段2 B5（2026-09-19）：B 组 8 款 keyless clip 化（gear/libr/cir/crd/etm/brk/
# cbx/ins）——同 B2 波 games 全量口径（crd 与既有手抄 11 键取并集防漏计；stamp 0 点不在册）
for _g in ('gear', 'libr', 'cir', 'crd', 'etm', 'brk', 'cbx', 'ins'):
    EXPECT[_g] = sorted(set(EXPECT.get(_g, [])) | {k for k, v in _MANI.items() if _g in v['games']})
# Task#46 阶段2 B3（2026-09-19）：batch29-32 11 款 keyless clip 化——5 款新登记（bodyen/poem/
# wordpuz/maze/iftrain，games 全量口径同 B2）+ 4 款既有手抄清单并集补 T46 键（senses+6/
# animalmenu+4/storybed+3/babylove+4；chartread/evidence 已前缀全量动态取自动覆盖）
for _g in ('bodyen', 'poem', 'wordpuz', 'maze', 'iftrain'):
    EXPECT[_g] = sorted(k for k, v in _MANI.items() if _g in v['games'])
for _g in ('senses', 'animalmenu', 'storybed', 'babylove'):
    EXPECT[_g] = sorted(set(EXPECT.get(_g, [])) | {k for k, v in _MANI.items() if _g in v['games']})
DIRS = {'pipe': 'pipe-rabbit', 'shop': 'shop-math', 'kitchen': 'kitchen-rhythm',
        'memory': '../batch2/memory', 'tangram': '../batch2/tangram', 'color': '../batch2/color',
        'math': '../batch3/math', 'pinyin': '../batch3/pinyin', 'pattern': '../batch3/pattern',
        'countchick': '../batch5/countchick', 'spotdiff': '../batch5/spotdiff', 'connect': '../batch5/connect',
        'clock': '../batch4/clock', 'times': '../batch4/times', 'sudoku': '../batch4/sudoku',
        'words': '../batch6/words', 'compare': '../batch6/compare', 'subbug': '../batch6/subbug',
        'fishcolor': '../batch7/fishcolor', 'fruitsplit': '../batch7/fruitsplit', 'hopscotch': '../batch7/hopscotch',
        'neighbors': '../batch8/neighbors', 'picto': '../batch8/picto', 'worden': '../batch8/worden',
        'whereistand': '../batch9/whereistand', 'mirror': '../batch9/mirror', 'memgrid': '../batch9/memgrid',
        'chainsum': '../batch10/chainsum', 'simon': '../batch10/simon', 'habit': '../batch10/habit',
        'shadow': '../batch11/shadow', 'shapeshome': '../batch11/shapeshome', 'sortsize': '../batch11/sortsize',
        'divide': '../batch12/divide', 'fraction': '../batch12/fraction', 'column': '../batch12/column',
        'money': '../batch13/money', 'wordprob': '../batch13/wordprob', 'grid': '../batch13/grid',
        'blocks': '../batch14/blocks', 'multibattle': '../batch14/multibattle', 'numberdet': '../batch14/numberdet',
        'cashier': '../batch15/cashier', 'logicwho': '../batch15/logicwho', 'matchstick': '../batch15/matchstick',
        'read': '../batch16/read', 'spellen': '../batch16/spellen', 'idiom': '../batch16/idiom',
        'timecalc': '../batch20/timecalc',
        'memduel': '../batch20/memduel', 'quiz': '../batch20/quiz', 'chartread': '../batch31/chartread',
        'evidence': '../batch32/evidence',
        'poemfill': '../batch17/poemfill', 'area': '../batch17/area', 'mirrormaze': '../batch17/mirrormaze',
        'coder2': '../batch18/coder2', 'stack': '../batch18/stack', 'bounce': '../batch18/bounce',
        'cipher': '../batch19/cipher', 'gomoku4': '../batch19/gomoku4', 'sudokunum': '../batch19/sudokunum',
        'shaperoof': '../batch24/shaperoof', 'feed': '../batch21/feed',
        'weather': '../batch23/weather', 'bubble': '../batch21/bubble', 'bridge': '../batch21/bridge',
        'dressup': '../batch24/dressup', 'storybed': '../batch30/storybed',
        # Task#46 阶段2 B1（2026-09-19）：b21-23 五款补 DIRS（colormix/hidden/slide/piano
        # 原无 DIRS 条目=传参即 KeyError；share 随该款改造随后登记）
        'colormix': '../batch22/colormix', 'hidden': '../batch22/hidden',
        'slide': '../batch22/slide', 'piano': '../batch23/piano',
        'share': '../batch23/share', 'soundcount': '../batch33/soundcount',
        'babylove': '../batch30/babylove', 'comfort': '../batch36/comfort',
        'senses': '../batch32/senses', 'animalmenu': '../batch31/animalmenu',
        'thanks': '../batch37/thanks', 'crd': '../batch39/crd',
        'datacollect': '../batch34/datacollect',
        # T46 阶段2 B4（2026-09-19）：batch33-37 12 款（position/robotpaint/hidecup/sentorder/
        # errdoc/maketen/quickcmp/plant/teach；comfort/thanks/datacollect 已在上）
        'position': '../batch33/position', 'robotpaint': '../batch33/robotpaint',
        'hidecup': '../batch34/hidecup', 'sentorder': '../batch34/sentorder',
        'zilearn': '../batch41/zilearn',  # batch41 第 151 款（2026-09-24）
        'errdoc': '../batch35/errdoc', 'maketen': '../batch35/maketen',
        'quickcmp': '../batch36/quickcmp', 'plant': '../batch37/plant', 'teach': '../batch37/teach',
        'emo': '../batch25/emo', 'habitat': '../batch25/habitat', 'story3': '../batch25/story3',
        'calendar': '../batch26/calendar', 'season': '../batch26/season', 'sign': '../batch26/sign',
        'coin': '../batch27/coin', 'notebird': '../batch27/notebird', 'ruler': '../batch27/ruler',
        'coder': '../batch28/coder', 'conserve': '../batch28/conserve',
        'shapecount': '../batch28/shapecount',
        'gear': '../batch38/gear', 'libr': '../batch38/libr', 'cir': '../batch39/cir',
        'etm': '../batch39/etm', 'brk': '../batch40/brk', 'cbx': '../batch40/cbx',
        'ins': '../batch40/ins',
        # T46 阶段2 B3（2026-09-19）：batch29-32 五款补 DIRS（bodyen/poem/wordpuz/maze/iftrain）
        'bodyen': '../batch29/bodyen', 'poem': '../batch29/poem', 'wordpuz': '../batch29/wordpuz',
        'maze': '../batch30/maze', 'iftrain': '../batch31/iftrain'}
import sys as _sys
_sys_args = _sys.argv[1:]  # 可传游戏子集，如: python verify_voice.py memory tangram color

# 声音纪律（主线强制 2026-09-16：chrome-headless-shell 不认 --mute-audio，浏览器级静音无效音频
# 直走系统输出——本脚本 goto 各游戏页后开题链自动播 clip=外放风险）。INIT_SND 只接管底层
# new Audio/speechSynthesis/AudioContext 通道（页级 init script，先于页面 JS）；不动 KIDS.voice.clips
# 数据与 api 检查——断言语义不变（defensive silence only）。
INIT_SND = """(() => {
  if (window.__sndStubbed) return; window.__sndStubbed = 1;
  try { if (window.speechSynthesis) { speechSynthesis.speak = function () {};
    speechSynthesis.cancel = function () {}; } } catch (e) {}
  try { window.Audio = function () { return { play: function () { return Promise.resolve(); },
    pause: function () {}, load: function () {}, canPlayType: function () { return ''; },
    volume: 0, muted: true, autoplay: false }; }; } catch (e) {}
  try { var AC0 = window.AudioContext || window.webkitAudioContext;
    if (AC0) { var fac = function () { return {
      resume: function () { return Promise.resolve(); },
      close: function () { return Promise.resolve(); }, state: 'running', currentTime: 0,
      destination: {},
      createOscillator: function () { return { frequency: { value: 0, setValueAtTime: function () {} },
        connect: function () {}, start: function () {}, stop: function () {} }; },
      createGain: function () { return { gain: { value: 0, setValueAtTime: function () {},
        linearRampToValueAtTime: function () {}, exponentialRampToValueAtTime: function () {} },
        connect: function () {} }; } }; };
      window.AudioContext = fac; window.webkitAudioContext = fac; } } catch (e) {}
})();"""

fails = 0
only = set(_sys_args) or None
with sync_playwright() as p:
    b = p.chromium.launch()
    for game, keys in EXPECT.items():
        if only and game not in only:
            continue
        pg = b.new_page()
        pg.add_init_script(INIT_SND)
        pg.goto('file:///' + os.path.join(BASE, DIRS[game], 'index.html').replace('\\', '/'))
        pg.wait_for_timeout(1800)
        r = pg.evaluate("""(expect) => {
          const out = {n: Object.keys(KIDS.voice.clips).length, missing: [], bad: [], api: {}};
          expect.forEach(k => { const v = KIDS.voice.clips[k];
            if (!v) out.missing.push(k);
            else if (!v.startsWith('data:audio/mpeg;base64,')) out.bad.push(k); });
          out.api.play = typeof KIDS.voice.play === 'function';
          out.api.queue = typeof KIDS.voice.queue === 'function';
          return out;
        }""", keys)
        ok = (not r['missing']) and (not r['bad']) and r['api']['play'] and r['api']['queue'] and r['n'] >= len(keys)
        # shop：真实订单 key 覆盖抽查（生成器前 40 单）
        order_ok = True
        if game == 'shop':
            order_ok = pg.evaluate("""() => {
              const off = (typeof CUSTOMERS !== 'undefined' && CUSTOMERS) ? CUSTOMERS.length : 0;
              let ok = true;   /* getOrder 返回关卡 {rounds[]}（r.items 为规范化条目），非订单对象 */
              for (let i = 0; i < 40; i++) { const o = getOrder(i + off);
                (o.rounds || []).forEach(r => (r.items || []).forEach(it => {
                  if (!KIDS.voice.clips['shop_g_' + it.k + '_' + it.n]) ok = false; })); }
              return ok;
            }""")
        # pinyin：SM_READ/YM_READ 全部运行时映射落到 clips（听音题播的 key 全覆盖）
        if game == 'pinyin':
            order_ok = pg.evaluate("""() => {
              const miss = [];
              Object.values(SM_READ).forEach(s => { if (!KIDS.voice.clips['py_syl_' + s]) miss.push(s); });
              Object.values(YM_READ).forEach(s => { if (s && !KIDS.voice.clips['py_syl_' + s]) miss.push(s); });
              return miss.length === 0 ? true : miss.join(',');
            }""")
        # words：CHARS 表全部字音运行时 key 全覆盖（chKey='wrd_ch_'+py）
        if game == 'words':
            order_ok = pg.evaluate("""() => {
              const miss = [];
              Object.values(CHARS).forEach(arr => arr.forEach(ch => {
                if (!KIDS.voice.clips['wrd_ch_' + ch.py]) miss.push(ch.py);
              }));
              return miss.length === 0 ? true : miss.join(',');
            }""")
        status = 'PASS' if (ok and order_ok) else 'FAIL'
        fails += status == 'FAIL'
        print('[%s] %s clips=%d missing=%s bad=%s api=%s orderKeys=%s' %
              (status, game, r['n'], r['missing'][:3], r['bad'][:3], r['api'], order_ok))
        pg.close()
    b.close()
sys.exit(1 if fails else 0)
