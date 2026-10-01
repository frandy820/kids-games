# -*- coding: utf-8 -*-
"""gen_pics.py — ziquest P2 实物配图生图 driver（豆包客户端 CDP 9225，单发避风控）

流程（每字）：已有图跳过 → contenteditable 输入 prompt → Enter → 轮询新图 →
滚动挂载 → fetch_original.py --latest 取 raw 无水印原图 → 512px center-crop WebP ≤10KB →
硬验收（尺寸/格式/字节）→ 心跳日志。

断点续跑：pics/<ch>.webp ≥1KB 即已完。熔断：连续 3 字失败停（外部服务熔断纪律：
先只读探测客户端活着，探测不发送）。长跑三件套：单张硬超时 180s + 心跳日志 + 外层看门狗。

用法（独立进程跑，勿在 CC Bash 前台长跑）：
  python gen_pics.py --run        # 生图主循环
  python gen_pics.py --status     # 只读进度报表
清单：work/pics-list.json [{ch, word}]（_pick_pics.py 产出）
产物：_src/data/pics_raw/<ch>.png（中间产物不进 git）+ _src/data/pics/<ch>.webp（真值源进 git）
"""
import argparse, io, json, os, subprocess, sys, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))          # .../_src
DATA = os.path.join(ROOT, 'data')
PICS = os.path.join(DATA, 'pics')
RAW = os.path.join(DATA, 'pics_raw')
LIST = 'F:/claudecode/output/ziquest/work/pics-list.json'
FETCH = 'F:/claudecode/test/one-piece-map-chronicle/scripts/planet-v2-gen/fetch_original.py'
LOG = 'F:/claudecode/output/ziquest/work/pics-gen.log'
HEARTBEAT = 'F:/claudecode/output/ziquest/work/pics-heartbeat.txt'
QUOTA_WAIT = 'F:/claudecode/output/ziquest/work/pics-quota-wait.json'
GAP_S = 20                    # 单发间隔（避风控家族口径）
POLL_MAX_S = 150              # 单张生成轮询上限
HARD_TIMEOUT_S = 180          # 单字硬超时（含取图+压缩）
BUDGET_BYTES = 6144           # WebP ≤6KB（v53 瘦身：320px 档，59 张实测 avg 3.5KB）

PROMPT = (u'儿童绘本卡通插画风格的一个%s，明快可爱的暖色调配色，圆润造型带柔和渐变和高光，'
          u'纯白色背景，单个物体居中构图，画面中绝对不要出现任何文字、字母或数字')

# prompt 主体分型（2026-09-30 首图教训：「一个下雪」画成冬帽=词不对图）：
# word 去动/形/色前缀（下雪→雪、大灰狼→狼、白粥→粥、看书→书）；strip 后单字场景物加
# 具象化特例（雪→雪景、雾→山间雾气）；word 级特例兜底（土地→泥土田地）
_STRIP_PREFIX = u'下大看开上白青早小灰'
_W_SPECIAL = {u'土地': u'泥土田地', u'沙子': u'一堆沙子', u'屋子': u'一座小屋',
              u'葡萄': u'一串紫色葡萄',   # 2026-10-01 VLM 抽检：「一个葡萄」画成单颗浆果（似李子），须「一串」诱导成簇
              u'青蛙': u'一只青蛙', u'发芽': u'一颗发芽的种子', u'画画': u'儿童蜡笔画',
              u'食盐': u'一袋食用盐', u'宝贝': u'一个可爱的宝宝', u'客人': u'来做客的小朋友'}
_S_SPECIAL = {u'雪': u'雪景', u'雾': u'山间的雾气', u'海': u'大海', u'江': u'江河', u'湖': u'湖泊',
              u'街': u'热闹的街道', u'楼': u'高楼', u'市': u'城市', u'树': u'大树',
              u'林': u'小树林', u'森': u'大森林', u'车': u'小汽车', u'书': u'一本翻开的故事书',
              u'棋': u'棋盘和棋子', u'画': u'儿童蜡笔画', u'果': u'水果拼盘',
              u'粥': u'一碗白粥', u'菜': u'一棵青菜', u'鹅': u'一只大白鹅', u'虾': u'一只大虾',
              u'沙': u'一堆沙子', u'屋': u'一座小屋', u'岛': u'一座小岛',
              u'桥': u'一座小桥', u'船': u'一艘小船'}


def subject(word):
    if word in _W_SPECIAL:
        return _W_SPECIAL[word]
    s = word
    while len(s) > 1 and s[0] in _STRIP_PREFIX:
        s = s[1:]
    return _S_SPECIAL.get(s, s)


def log(msg):
    line = time.strftime('%H:%M:%S ') + msg
    with io.open(LOG, 'a', encoding='utf-8') as f:
        f.write(line + '\n')
    with io.open(HEARTBEAT, 'w', encoding='utf-8') as f:
        f.write(time.strftime('%Y-%m-%d %H:%M:%S'))


def done_ok(ch):
    p = os.path.join(PICS, ch + '.webp')
    return os.path.exists(p) and os.path.getsize(p) >= 1024


def compress(ch, raw_path):
    """raw png → 512 center-crop WebP ≤10KB（递降 q/尺寸重试）"""
    from PIL import Image
    im = Image.open(raw_path).convert('RGB')
    w, h = im.size
    s = min(w, h)
    im = im.crop(((w - s) // 2, (h - s) // 2, (w + s) // 2, (h + s) // 2))
    im = im.resize((512, 512), Image.LANCZOS)
    out = os.path.join(PICS, ch + '.webp')
    for size, q in [(320, 58), (320, 50), (288, 45), (256, 40)]:   # v53：320px 起步（幼儿屏显示 ≤300px 够清晰）
        im2 = im.resize((size, size), Image.LANCZOS) if size != 512 else im
        im2.save(out, 'WEBP', quality=q, method=6)
        if os.path.getsize(out) <= BUDGET_BYTES:
            return out, os.path.getsize(out)
    return out, os.path.getsize(out)          # 兜底返回最后档（验收层判超）


def probe_alive(pw):
    """只读探测：豆包客户端 9225 在线且有 chat 页（不发送任何内容）"""
    try:
        browser = pw.chromium.connect_over_cdp('http://127.0.0.1:9225')
        for ctx in browser.contexts:
            for pg in ctx.pages:
                if 'doubao' in pg.url and 'chat' in pg.url:
                    return browser, pg
        browser.close()
        return None, None
    except Exception:
        return None, None


def probe_quota(pg):
    """只读探测额度尽文案；命中写 quota_wait.json 并硬退（watchdog 定时重拉）"""
    try:
        m = pg.evaluate("""() => { const t = (document.body.innerText || '').slice(-2500);
          const m = t.match(/额度[^\\n]{0,40}?(\\d{1,2}:\\d{2})[^\\n]{0,15}恢复/);
          return m ? m[1] : null; }""")
    except Exception:
        return False
    if m:
        ts = time.strftime('%Y-%m-%d ') + m
        # 深夜跨日判断在写入方（2026-10-01 03:49 教训：watchdog 读侧曾按 remain∈(-23h,0)
        # 自动 +86400，把「到点该恢复」误判跨日推到明天，白等 6h）：20 点后页面说「今日
        # HH:MM」而该时刻已过 → 实为明天，写入时写对；watchdog 只信文件到点即拉
        stale = False
        try:
            t0 = time.mktime(time.strptime(ts, '%Y-%m-%d %H:%M'))
            if time.localtime().tm_hour >= 20 and t0 < time.time():
                ts = time.strftime('%Y-%m-%d %H:%M', time.localtime(t0 + 86400))
            elif t0 < time.time() - 20 * 60:
                # 文案时刻已过 >20min=额度真尽但页面残留旧文案（2026-10-01 18:0x 死循环：
                # 每轮写到点的 17:52→watchdog 清→拉起→又写。真恢复点未知）→ 写 now+60min
                # 探测重试点（届时试跑一张，又尽则顺延），不采信过期文案
                stale = True
        except Exception:
            pass
        if stale:
            ts = time.strftime('%Y-%m-%d %H:%M', time.localtime(time.time() + 3600))
            io.open(QUOTA_WAIT, 'w', encoding='utf-8').write(ts)
            log('QUOTA exhausted (stale text %s ignored), probe retry at %s -> exit 3' % (m, ts))
            os._exit(3)
        io.open(QUOTA_WAIT, 'w', encoding='utf-8').write(ts)
        log('QUOTA exhausted, resumes at %s -> exit 3 (watchdog will re-launch)' % ts)
        os._exit(3)
    return True


def gen_one(pw, pg, ch, word):
    """生成一字：输入→Enter→轮询新图→滚动→fetch raw→压缩。返回 ok/失败原因
    额度尽：页面出现「额度…预计今日 HH:MM 恢复」→ 写 quota_wait.json 后 exit 3（watchdog 定时重拉）"""
    t0 = time.time()
    prompt = PROMPT % subject(word)
    if pg.url == 'about:blank' or 'doubao' not in pg.url:
        return 'page-lost'
    try:
        seen0 = pg.evaluate('() => Array.from(document.images).map(i => i.src)')
        box = pg.query_selector('[contenteditable="true"]') or pg.query_selector('textarea')
        if not box:
            return 'no-editor'
        box.click()
        pg.keyboard.type(prompt, delay=15)
        time.sleep(1.5)
        pg.keyboard.press('Enter')
        # 轮询新图（缩略档出现=生成完）
        found = False
        while time.time() - t0 < POLL_MAX_S:
            news = pg.evaluate("""() => Array.from(document.images)
              .filter(i => /rc_gen|byteimg|imagex/.test(i.src) && i.naturalWidth > 200)
              .map(i => i.src)""")
            if any(s not in seen0 for s in news):
                found = True
                break
            time.sleep(3)
        if not found:
            probe_quota(pg)
            return 'gen-timeout'
        time.sleep(2)
        # 滚动挂载卡片（家族坑：新卡未挂载 fetch 必 FAIL）
        for _ in range(8):
            pg.mouse.wheel(0, 4000)
            time.sleep(0.3)
        time.sleep(1.5)
        # 取 raw 原图（subprocess 用系统 python；fetch_original 自带禁代理）
        outdir = os.path.join(RAW, '_tmp')
        os.makedirs(outdir, exist_ok=True)
        r = subprocess.run([sys.executable, FETCH, '--out', outdir, '--prefer', 'raw', '--latest'],
                           capture_output=True, timeout=90)
        files = sorted((os.path.join(outdir, f) for f in os.listdir(outdir)),
                       key=os.path.getmtime, reverse=True)
        if not files or r.returncode != 0:
            return 'fetch-fail:' + r.stdout.decode('utf-8', 'replace')[-120:].replace('\n', ' ')
        latest = files[0]
        dest_raw = os.path.join(RAW, ch + '.png')
        os.replace(latest, dest_raw)
        # 清空 tmp 目录残留（防下张取错）
        for f in os.listdir(outdir):
            os.remove(os.path.join(outdir, f))
        out, sz = compress(ch, dest_raw)
        if sz > BUDGET_BYTES:
            return 'over-budget:%d' % sz
        return 'ok:%d' % sz
    except Exception as e:
        return 'exc:' + repr(e)[:100]


def run():
    os.makedirs(PICS, exist_ok=True)
    os.makedirs(RAW, exist_ok=True)
    items = json.load(io.open(LIST, encoding='utf-8'))
    todo = [it for it in items if not done_ok(it['ch'])]
    log('RUN start total=%d done=%d todo=%d' % (len(items), len(items) - len(todo), len(todo)))
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        browser, pg = probe_alive(pw)
        if not pg:
            log('FATAL doubao client 9225 not alive (probe-only, nothing sent)')
            sys.exit(2)
        fail_streak = 0
        for i, it in enumerate(todo):
            if fail_streak >= 3:
                log('BREAK fail-streak=3 at %s (circuit breaker)' % it['ch'])
                break
            t0 = time.time()
            res = gen_one(pw, pg, it['ch'], it['word'])
            dt = int(time.time() - t0)
            log('[%d/%d] %s(%s) -> %s (%ds)' % (i + 1, len(todo), it['ch'], it['word'], res, dt))
            if res.startswith('ok'):
                fail_streak = 0
            else:
                fail_streak += 1
                if fail_streak >= 2:
                    probe_quota(pg)             # fetch-fail 症状的额度尽也兜住
                if res == 'page-lost':
                    browser, pg = probe_alive(pw)
                    if not pg:
                        log('FATAL page lost & re-probe fail')
                        break
            if i < len(todo) - 1:
                time.sleep(GAP_S)
        browser.close()
    log('RUN end done=%d/%d' % (
        sum(1 for it in items if done_ok(it['ch'])), len(items)))


def status():
    items = json.load(io.open(LIST, encoding='utf-8'))
    have = [it['ch'] for it in items if done_ok(it['ch'])]
    io.open(HEARTBEAT, 'a', encoding='utf-8').write(
        time.strftime('\nSTATUS %H:%M:%S ') + '%d/%d\n' % (len(have), len(items)))
    print('done %d / %d' % (len(have), len(items)))
    missing = [it['ch'] for it in items if it['ch'] not in have]
    print('missing:', ''.join(missing[:60]))


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--run', action='store_true')
    ap.add_argument('--status', action='store_true')
    a = ap.parse_args()
    if a.status:
        status()
    elif a.run:
        run()
    else:
        ap.print_help()
