# -*- coding: utf-8 -*-
# verify_voice.py 补登记 zilearn（EXPECT+DIRS 两处；r16 坑④ + b36 坑① heredoc 反斜杠→Write 直写）
import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
p = r'F:\claudecode\projects\active\kids-games\batch1\verify_voice.py'
src = open(p, encoding='utf-8').read()

BS = chr(92)  # 反斜杠（禁字面反斜杠进管道）
old1 = ("EXPECT['hidecup'] = sorted(set(['core_chapter_end', 'core_day_end', 'core_rest']) | " + BS + "\n"
        "                    {k for k, v in _MANI.items() if k.startswith('hc_') and 'hidecup' in v['games']})")
new1 = old1 + ("\n"
               "# batch41 zilearn（2026-09-24 段二注册；参数子集过滤未登记=静默 rc0 假绿，第 8 起预防）\n"
               "EXPECT['zilearn'] = sorted(set(['core_chapter_end', 'core_day_end', 'core_rest']) | " + BS + "\n"
               "                    {k for k, v in _MANI.items() if k.startswith('zi_') and 'zilearn' in v['games']})")
assert src.count(old1) == 1, 'EXPECT anchor count=%d' % src.count(old1)
src = src.replace(old1, new1)

old2 = "        'hidecup': '../batch34/hidecup', 'sentorder': '../batch34/sentorder',"
new2 = old2 + "\n        'zilearn': '../batch41/zilearn',  # batch41 第 151 款（2026-09-24）"
assert src.count(old2) == 1, 'DIRS anchor count=%d' % src.count(old2)
src = src.replace(old2, new2)

open(p, 'w', encoding='utf-8').write(src)
import ast
ast.parse(src)
print('EXPECT+DIRS 登记完成，syntax OK')
