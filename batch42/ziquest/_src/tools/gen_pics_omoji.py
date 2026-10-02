# -*- coding: utf-8 -*-
"""gen_pics_omoji.py — v57 配图换源：豆包生图退役，138 字全量切 OpenMoji（CC BY-SA 4.0）

用户拍板（2026-10-01）「火车就找火车的图片」+版权红线（公开部署儿童游戏禁来路不明图）。
OpenMoji=开源 emoji 图标库（黑描边扁平卡通，风格统一），jsdelivr CDN 下载 SVG→
cairosvg 转 320px WebP ≤6KB（走 gen_pics 同预算档）。无贴切 emoji 的字不硬凑→留空走
无图降级路径（t2 已有）。版权合规：CC BY-SA 4.0 需署名——家长面板底部加 credit。

用法:
  python gen_pics_omoji.py --run       # 下载+转换全量（幂等：webp 在则跳过）
  python gen_pics_omoji.py --status    # 覆盖统计
产物：_src/data/pics/<ch>.webp（覆盖豆包版，真值源同位）
"""
import io, json, os, subprocess, sys, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PICS = os.path.join(ROOT, 'data', 'pics')
LIST = 'F:/claudecode/output/ziquest/work/pics-list.json'
CDN = 'https://cdn.jsdelivr.net/gh/hfg-gmuend/openmoji@master/color/svg/%s.svg'
LOG = 'F:/claudecode/output/ziquest/work/omoji-gen.log'
BUDGET = 6144

# 字→emoji 码点（'-' 连多码点）。空=无贴切，走无图降级。
EMOJI = {
    # 动物
    '兔': '1F407', '牛': '1F42E', '猫': '1F408', '鸭': '1F986', '羊': '1F411', '狗': '1F415',
    '猪': '1F416', '尾': '', '雀': '1F426', '猴': '1F435', '狮': '1F981', '牧': '', '鸡': '1F413',
    '龟': '1F422', '鼠': '1F400', '熊': '1F43B', '鹿': '1F98C', '燕': '', '豚': '1F42C',
    '鱼': '1F41F', '虾': '1F990', '蟹': '1F980', '蛙': '1F438', '孔': '1F99A', '鹤': '',
    '鹦': '1F99C', '虫': '1F41B', '蜜': '1F41D', '蝴': '1F98B', '鸟': '1F426', '虎': '1F42F',
    '象': '1F418', '马': '1F40E', '鹰': '',
    # 水果食物
    '苹': '1F34E', '西': '1F349', '香': '1F34C', '葡': '1F347', '桃': '1F351', '杏': '',
    '枣': '', '梨': '1F350', '橘': '1F34A', '果': '1F34E', '糖': '1F36C', '糕': '1F382',
    '饺': '1F95A', '饼': '1F36A', '盐': '', '粥': '1F963', '饮': '1F964', '杯': '1F9CB',
    '碗': '1F963', '筷': '1F962', '餐': '1F37D', '蛋': '1F95A',
    # 身体文具
    '指': '1F446', '手': '270B', '耳': '1F442', '眼': '1F441', '笔': '270F', '纸': '1F4C4',
    '书': '1F4DA', '包': '1F392',
    # 出行衣物
    '飞': '2708', '车': '1F697', '火': '1F686', '雨': '2602', '伞': '1F302', '帽': '1F393',
    '鞋': '1F45E',
    # 自然天象
    '雪': '1F328', '雷': '1F329', '风': '1F32C', '云': '2601', '阳': '2600', '月': '1F319',
    '星': '2B50', '山': '26F0', '水': '1F4A7', '沙': '1F3D6', '雾': '1F32B', '河': '1F30A',
    '海': '1F30A', '湖': '1F3CA', '虹': '1F308', '树': '1F332', '森': '1F333', '林': '1F333',
    '花': '1F338', '叶': '1F342', '草': '1F33F', '木': '1F333', '石': '1FAA8', '田': '1F33E',
    # 场所家人
    '校': '1F3EB', '医': '1F3E5', '园': '1F333', '店': '1F3EA', '楼': '1F3D9', '桥': '1F309',
    '路': '1F6E3', '街': '', '场': '26BD', '玩': '1F388', '具': '', '超': '1F6D2',
    '爷': '1F474', '奶': '1F475', '男': '1F466', '女': '1F467', '爸': '1F468', '妈': '1F469',
    '师': '1F469-200D-1F3EB', '司': '1F698', '警': '1F46E', '厨': '1F46D', '宝': '1F476',
}


def log(msg):
    with io.open(LOG, 'a', encoding='utf-8') as f:
        f.write(time.strftime('%H:%M:%S ') + msg + '\n')
    print(msg.encode('ascii', 'replace').decode()[:120])


def main():
    items = json.load(io.open(LIST, encoding='utf-8'))
    have = 0
    todo = []
    for it in items:
        ch, word = it['ch'], it['word']
        if word in EMOJI:                       # 词级键（'小兔' 等聚合词已折到字键）
            code = EMOJI[word]
        else:
            code = EMOJI.get(ch, '')
        if not code:
            continue
        if code.endswith('? '):
            code = code[:-2]
        dst = os.path.join(PICS, ch + '.webp')
        if os.path.exists(dst) and os.path.getsize(dst) >= 800:
            have += 1
            continue
        todo.append((ch, word, code))
    log('RUN start: emoji-mapped %d/138 (have webp %d, todo %d)'
        % (sum(1 for c in EMOJI.values() if c and not c.endswith('?')), have, len(todo)))
    import requests
    from PIL import Image
    import cairosvg
    tmp_svg = os.path.join(PICS, '_omo.svg')
    ok = 0
    for ch, word, code in todo:
        try:
            r = requests.get(CDN % code, timeout=30)
            if r.status_code != 200 or b'<svg' not in r.content[:200]:
                log('DL-FAIL %s(%s) %s http %d' % (ch, word, code, r.status_code))
                continue
            io.open(tmp_svg, 'wb').write(r.content)
            png = os.path.join(PICS, '_omo.png')
            cairosvg.svg2png(url=tmp_svg, write_to=png, output_width=512, output_height=512)
            im = Image.open(png).convert('RGB')
            im = im.resize((320, 320), Image.LANCZOS)
            dst = os.path.join(PICS, ch + '.webp')
            for q in [58, 50, 45]:
                im.save(dst, 'WEBP', quality=q, method=6)
                if os.path.getsize(dst) <= BUDGET:
                    break
            ok += 1
            log('ok %s(%s) %s -> %dB' % (ch, word, code, os.path.getsize(dst)))
            time.sleep(0.4)
        except Exception as e:
            log('ERR %s %s: %s' % (ch, code, repr(e)[:80]))
    for f in ['_omo.svg', '_omo.png']:
        p = os.path.join(PICS, f)
        if os.path.exists(p):
            os.remove(p)
    log('RUN end ok=%d' % ok)


if __name__ == '__main__':
    main()
