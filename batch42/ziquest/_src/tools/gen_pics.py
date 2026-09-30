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
GAP_S = 20                    # 单发间隔（避风控家族口径）
POLL_MAX_S = 150              # 单张生成轮询上限
HARD_TIMEOUT_S = 180          # 单字硬超时（含取图+压缩）
BUDGET_BYTES = 10240          # WebP ≤10KB

PROMPT = (u'儿童绘本卡通插画风格的一个%s，明快可爱的暖色调配色，圆润造型带柔和渐变和高光，'
          u'纯白色背景，单个物体居中构图，画面中绝对不要出现任何文字、字母或数字')


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
    for size, q in [(512, 62), (512, 55), (448, 50), (384, 45), (320, 40)]:
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


def gen_one(pw, pg, ch, word):
    """生成一字：输入→Enter→轮询新图→滚动→fetch raw→压缩。返回 ok/失败原因"""
    t0 = time.time()
    prompt = PROMPT % word
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
            res = gen_one(pw, it['ch'], it['word'])
            dt = int(time.time() - t0)
            log('[%d/%d] %s(%s) -> %s (%ds)' % (i + 1, len(todo), it['ch'], it['word'], res, dt))
            if res.startswith('ok'):
                fail_streak = 0
            else:
                fail_streak += 1
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
