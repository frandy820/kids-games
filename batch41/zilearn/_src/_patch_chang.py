# -*- coding: utf-8 -*-
# M3 双侧 chars.json 长 words 重排（多行展开格式；文本级替换保 diff 最小）
import io, sys, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
L = chr(10)
old = ('[' + L + '     "长大",' + L + '     "zhǎng dà"' + L + '    ],' + L +
       '    [' + L + '     "长长",' + L + '     "cháng cháng"' + L + '    ],' + L +
       '    [' + L + '     "长江",' + L + '     "cháng jiāng"' + L + '    ]')
new = ('[' + L + '     "长江",' + L + '     "cháng jiāng"' + L + '    ],' + L +
       '    [' + L + '     "长长",' + L + '     "cháng cháng"' + L + '    ],' + L +
       '    [' + L + '     "长大",' + L + '     "zhǎng dà"' + L + '    ]')
for p in [r'F:\claudecode\output\kids-games-zilearn\chars.json',
          r'F:\claudecode\projects\active\kids-games\batch41\zilearn\_src\chars.json']:
    s = open(p, encoding='utf-8').read()
    assert s.count(old) == 1, (p, s.count(old))
    open(p, 'w', encoding='utf-8').write(s.replace(old, new))
    d = json.load(open(p, encoding='utf-8'))
    assert d['chars']['长']['words'][0] == ['长江', 'cháng jiāng'], d['chars']['长']['words']
    assert d['chars']['长']['words'][2] == ['长大', 'zhǎng dà']
    print(p.split(chr(92))[-2] + '/chars.json OK words[0]=长江 words[2]=长大(惰性)')
