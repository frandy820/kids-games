# -*- coding: utf-8 -*-
# 主入口插卡：zilearn 第 151 款（b31 坑②行级锚定；b24 坑①插卡后 href 可达性扫描）
import io, sys, os, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
ROOT = r'F:\claudecode\projects\active\kids-games'
p = os.path.join(ROOT, 'index.html')
src = open(p, encoding='utf-8').read()

CARD = ('<a class="card" href="batch41/zilearn/index.html"><div class="icon"><svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">'
        '<rect x="16" y="14" width="52" height="66" rx="7" fill="#F2C94C" stroke="#4A3B2E" stroke-width="2.4" transform="rotate(-8 42 47)"/>'
        '<rect x="24" y="12" width="52" height="66" rx="7" fill="#7FB3E0" stroke="#4A3B2E" stroke-width="2.4" transform="rotate(4 50 45)"/>'
        '<rect x="30" y="10" width="52" height="66" rx="7" fill="#FFF9EE" stroke="#4A3B2E" stroke-width="2.6"/>'
        '<text x="56" y="54" font-size="30" font-weight="800" text-anchor="middle" fill="#4A3B2E" font-family="inherit">天</text>'
        '<path d="M56 68 q10 7 20 0" stroke="#E8975A" stroke-width="2.6" fill="none" stroke-linecap="round"/>'
        '<circle cx="80" cy="76" r="12" fill="none" stroke="#4A3B2E" stroke-width="2.6"/>'
        '<path d="M71 76 h18" stroke="#4A3B2E" stroke-width="2.6" stroke-linecap="round"/>'
        '</svg></div><div class="name">识字小课堂</div><div class="sub">认字组词读句子</div></a>')

anchor = '问题拆解小博士</div><div class="sub">大事拆成小事做</div></a>'
assert src.count(anchor) == 1, 'anchor count=%d（须唯一）' % src.count(anchor)
assert 'batch41/zilearn' not in src, '已插过卡（重复插入防）'
src = src.replace(anchor, anchor + CARD)
open(p, 'w', encoding='utf-8').write(src)

# 插卡后对账：卡数 111→112 + href 全量可达性扫描（b24 坑①：卡数对账≠链接可达）
src = open(p, encoding='utf-8').read()
hrefs = re.findall(r'<a class="card" href="([^"]+)"', src)
print('卡数: %d（111→112 预期）' % len(hrefs))
missing = [h for h in hrefs if not os.path.exists(os.path.join(ROOT, h.replace('/', os.sep)))]
print('href 缺失:', missing if missing else '无（%d 全可达）' % len(hrefs))
assert len(hrefs) == 112 and not missing
print('插卡完成')
