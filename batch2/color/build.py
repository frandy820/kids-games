# -*- coding: utf-8 -*-
"""涂色本（color）单文件构建：design/core.js 全文原样内嵌（禁止手抄改写）。
用法: python build.py  → 生成同目录 index.html
"""
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent
DESIGN = pathlib.Path('F:/claudecode/projects/active/kids-games/design')

TEMPLATE = '''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>涂色本</title>
<style>
/*__GAME_CSS__*/
</style>
</head>
<body>
<div id="app">
  <section id="scene-home" class="scene">
    <div id="logo"></div>
    <div id="home-cards">
      <button id="card-color" class="home-card" aria-label="涂色"></button>
      <button id="card-free" class="home-card" aria-label="自由画布"><div class="thumb"></div><div class="stars"></div></button>
    </div>
    <div id="today-dots"></div>
  </section>
  <section id="scene-play" class="scene" data-mode="free">
    <div id="play-top" class="topbar">
      <button id="btn-home" class="tbtn" aria-label="返回首页"></button>
      <button id="btn-map" class="tbtn" aria-label="关卡地图"></button>
      <div id="mini-preview"></div>
      <button id="btn-undo" class="tbtn" aria-label="撤销"></button>
      <button id="btn-done" class="tbtn primary" aria-label="完成"></button>
    </div>
    <div id="play-body">
      <div id="ref-box" aria-hidden="true"></div>
      <div id="art-wrap"><div id="art"></div><div id="finger"></div></div>
    </div>
    <div id="progress"></div>
    <div id="palette" class="palette"></div>
    <div id="mixbar"></div>
  </section>
  <section id="scene-free" class="scene">
    <div id="free-top" class="topbar">
      <button id="btn-home2" class="tbtn" aria-label="返回首页"></button>
      <button id="btn-undo2" class="tbtn" aria-label="撤销"></button>
      <div id="brushes"></div>
      <button id="btn-eraser" aria-label="橡皮"></button>
      <button id="btn-clear" class="tbtn" aria-label="长按清空"></button>
    </div>
    <div id="canvas-wrap"><canvas id="fcanvas"></canvas></div>
    <div id="palette2" class="palette"></div>
  </section>
</div>
<div id="toast" aria-hidden="true"><span class="ticon"></span><span id="toast-text">还有空白哦</span></div>
<div id="mode-banner" aria-hidden="true"></div>
<pre id="verify-result" aria-hidden="true"></pre>
<script>
/*__CORE_JS__*/
//__PICS_JS__
//__GAME_JS__
</script>
</body>
</html>
'''


def main():
    core = (DESIGN / 'core.js').read_text(encoding='utf-8')
    pics = (ROOT / '_src' / 'pics.js').read_text(encoding='utf-8')
    game = (ROOT / '_src' / 'game.js').read_text(encoding='utf-8')
    css = (ROOT / '_src' / 'game.css').read_text(encoding='utf-8')
    # 语音 clips 注入（clips 目录缺失时降级为空字符串，主会话补管线后重建）
    try:
        sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
        from inject_clips import clips_js
        clips = clips_js('color')
    except ImportError:
        clips = ''

    # 硬性断言：core 为新版（旧 core 无 settle()/queue(parts) 会被静默拼接）
    for token in ('settle()', 'queue(parts)'):
        if token not in core:
            sys.exit('FATAL: core.js missing %r (old core detected)' % token)
    # r6 硬性断言（2026-09-13 难度改造）：
    # ① estMs 家族定版 n*345+600（r4 m-5 口径；禁 +300 变体——源/verify/SPEC 四处同步之一）
    if 'const estMs = n => n * 345 + 600;' not in game:
        sys.exit('FATAL: estMs 家族漂移（须字面 n * 345 + 600）')
    if 'n * 345 + 300' in game or 'n*345+300' in game:
        sys.exit('FATAL: estMs +300 变体禁止（r4 m-5 定版 n*345+600）')
    # ② r6 语音六键在源内注册使用（防 key 手抄漂移——manifest 真值源在 voice/gen_clips.py）
    for k in ('clr_match_intro', 'clr_match_wrong', 'clr_mix_intro', 'clr_mix_wrong',
              'clr_pat_intro', 'clr_pat_wrong'):
        if k not in game:
            sys.exit('FATAL: r6 语音键 %s 未在 game.js 注册' % k)
    # ③ 模式分派四分支 + 混色封闭表字面（pics.js）
    for token in ("mode: 'free'", "mode: 'match'", "mode: 'mix'", "mode: 'pat'",
                  "R6_MIX_TABLE = { '0+2': 1, '2+0': 1, '2+6': 3, '6+2': 3, '0+6': 7, '6+0': 7 }"):
        if token not in pics:
            sys.exit('FATAL: pics.js 缺 r6 token %r' % token)
    # 安全检查：任何片段出现字面 </script / </style 序列都会提前闭合标签块
    for name, text in (('core', core), ('pics', pics), ('game', game), ('css', css), ('clips', clips)):
        if '</script' in text.lower():
            sys.exit('FATAL: literal </script sequence in %s' % name)
    for name, text in (('core', core), ('pics', pics), ('game', game)):
        if '</style' in text.lower():
            sys.exit('FATAL: literal </style sequence in %s' % name)

    html = (TEMPLATE
            .replace('/*__GAME_CSS__*/', css)
            .replace('/*__CORE_JS__*/', core)
            .replace('//__PICS_JS__', pics)
            .replace('//__GAME_JS__', clips + '\n' + game))
    # r6 审查 m-4：离线断言（姊妹款均有的门禁）+ clips 注入实体检查（注入降级空串会静默产出
    # 无音频单文件——源码键名检查≠注入实体检查）
    stripped = html.replace('http://www.w3.org/2000/svg', 'NS-SVG')
    for bad in ('http://', 'https://', '<link', ' src=', ' href='):
        if bad in stripped:
            sys.exit('FATAL: 发现外部引用 %r' % bad)
    if '"clr_match_intro":"data:audio/mpeg;base64,' not in html:
        sys.exit('FATAL: clr_ clips 注入实体缺失（注入被静默降级为空串）')
    for k in ('clr_match_intro', 'clr_mix_intro', 'clr_pat_intro', 'clr_pat_wrong',
              'clr_tut_watch', 'clr_tut_turn', 'clr_hint'):
        if ("'%s'" % k not in html) and ('"%s"' % k not in html):
            sys.exit('FATAL: clip 键 %s 未注入 index.html' % k)
    out = ROOT / 'index.html'
    out.write_text(html, encoding='utf-8')
    print('built %s (%d bytes); core settle()/queue(parts) asserted; clips %d chars'
          % (out, len(html), len(clips)))


if __name__ == '__main__':
    main()
