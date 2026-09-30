/* ================= ziquest 题型层 t2：字理亮相（认识层演出位，零错误路径） =================
   形态：glyph 字理文案淡入 →（有象形 SVG 则）古形 ev → 今形 svg 两帧 → 现代大字浮现
   （parts 有值=部件字卡从两侧滑入拼合再化出整字；null=整字放大浮现）→「点一点」确认
   （点击大字=收字，播字音 → api.right()，认识层不设错——M2a 编排 T1/T2 认识层→T4/T6 辨认层）。
   动画只用 transform/opacity（家族红线）；演出锁期间拒收点击（zilearn watch 同款防误触）。
   象形 SVG：29 字内嵌（自 batch8/zilearn PICTO 按字面复制，禁外链），覆盖 r1 全部 11 个象形字。 */
(function () {
'use strict';

var ZQ = (typeof ZQ !== 'undefined') ? ZQ : (window.ZQ = window.ZQ || {});
if (!ZQ._qt) throw new Error('ZQ._qt missing: qtypes must load t1.js first (build t-numeric order)');
var QT_ = ZQ._qt;
var ZQ_PICTO = {"天":{"ev":null,"svg":"<path d=\"M28 10 H72\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"7\" stroke-linecap=\"round\"/><circle cx=\"50\" cy=\"28\" r=\"7\" fill=\"#5A4632\"/><path d=\"M50 22 V60\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"8\" stroke-linecap=\"round\"/><path d=\"M50 36 Q30 30 18 18 M50 36 Q70 30 82 18\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"7\" stroke-linecap=\"round\"/><path d=\"M50 60 Q36 76 30 92 M50 60 Q64 76 70 92\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"7\" stroke-linecap=\"round\"/>"},"日":{"ev":"<circle cx=\"50\" cy=\"50\" r=\"33\" fill=\"#F2D8A8\" stroke=\"#5A4632\" stroke-width=\"7\"/><circle cx=\"50\" cy=\"50\" r=\"8\" fill=\"#5A4632\"/>","svg":"<rect x=\"18\" y=\"18\" width=\"64\" height=\"64\" rx=\"18\" fill=\"#F2D8A8\" stroke=\"#5A4632\" stroke-width=\"7.5\"/><circle cx=\"50\" cy=\"50\" r=\"7.5\" fill=\"#5A4632\"/>"},"月":{"ev":null,"svg":"<path d=\"M65 8 C34 14 14 32 14 50 C14 68 34 86 65 92 C44 80 36 66 36 50 C36 34 44 20 65 8 Z\" fill=\"#F2D8A8\" stroke=\"#5A4632\" stroke-width=\"6.5\" stroke-linejoin=\"round\"/><path d=\"M44 38 v16\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6\" stroke-linecap=\"round\"/>"},"水":{"ev":null,"svg":"<path d=\"M50 8 q12 14 0 28 q-12 14 0 28 q12 14 0 28\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"7\" stroke-linecap=\"round\"/><path d=\"M28 24 q-9 8 -6 19 M28 54 q-9 8 -6 19 M72 24 q9 8 6 19 M72 54 q9 8 6 19\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6.5\" stroke-linecap=\"round\"/>"},"火":{"ev":null,"svg":"<path d=\"M50 8 Q64 26 60 44 Q57 62 50 88 Q43 62 40 44 Q36 26 50 8 Z\" fill=\"#E8975A\" stroke=\"#5A4632\" stroke-width=\"6\" stroke-linejoin=\"round\"/><path d=\"M24 34 q-2 12 6 22 M76 34 q2 12 -6 22\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6.5\" stroke-linecap=\"round\"/>"},"山":{"ev":null,"svg":"<path d=\"M6 84 L24 30 L38 62 L50 20 L62 62 L76 30 L94 84 Z\" fill=\"#D9B98A\" stroke=\"#5A4632\" stroke-width=\"6.5\" stroke-linejoin=\"round\"/>"},"人":{"ev":null,"svg":"<path d=\"M38 10 Q56 24 46 88\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"8\" stroke-linecap=\"round\"/><path d=\"M42 26 Q66 36 78 58\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"8\" stroke-linecap=\"round\"/>"},"口":{"ev":"<path d=\"M14 40 Q50 72 86 40 Q50 88 14 40 Z\" fill=\"#EFE0BC\" stroke=\"#5A4632\" stroke-width=\"7\" stroke-linejoin=\"round\"/>","svg":"<rect x=\"20\" y=\"20\" width=\"60\" height=\"60\" rx=\"10\" fill=\"#EFE0BC\" stroke=\"#5A4632\" stroke-width=\"8\"/>"},"木":{"ev":"<path d=\"M52 6 C46 34 56 64 50 94\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"7.5\" stroke-linecap=\"round\"/><path d=\"M50 34 Q32 24 24 8 M50 34 Q68 24 76 8 M50 60 Q32 72 24 90 M50 60 Q68 72 76 90\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6.5\" stroke-linecap=\"round\"/><path d=\"M24 8 q-8 2 -10 10 M76 8 q8 2 10 10\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6\" stroke-linecap=\"round\"/>","svg":"<path d=\"M50 8 V92\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"7.5\" stroke-linecap=\"round\"/><path d=\"M50 42 Q32 30 24 14 M50 42 Q68 30 76 14 M50 58 Q32 70 24 86 M50 58 Q68 70 76 86\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6.5\" stroke-linecap=\"round\"/>"},"大":{"ev":null,"svg":"<path d=\"M50 10 V58\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"8\" stroke-linecap=\"round\"/><path d=\"M50 30 Q28 24 14 12 M50 30 Q72 24 86 12\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"8\" stroke-linecap=\"round\"/><path d=\"M50 58 Q36 74 30 92 M50 58 Q64 74 70 92\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"8\" stroke-linecap=\"round\"/>"},"小":{"ev":null,"svg":"<path d=\"M50 20 V80\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"8\" stroke-linecap=\"round\"/><path d=\"M26 38 Q33 45 39 52 M74 38 Q67 45 61 52\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"7\" stroke-linecap=\"round\"/>"},"云":{"ev":null,"svg":"<path d=\"M30 18 H72\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"7.5\" stroke-linecap=\"round\"/><path d=\"M22 38 H80\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"7.5\" stroke-linecap=\"round\"/><path d=\"M34 58 Q52 74 70 58 Q62 72 44 68\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"7\" stroke-linecap=\"round\"/>"},"田":{"ev":"<rect x=\"14\" y=\"14\" width=\"72\" height=\"72\" rx=\"18\" fill=\"#EFE0BC\" stroke=\"#5A4632\" stroke-width=\"7\"/><path d=\"M50 14 Q44 50 50 86 M14 50 Q50 44 86 50\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6.5\" stroke-linecap=\"round\"/>","svg":"<rect x=\"18\" y=\"18\" width=\"64\" height=\"64\" rx=\"8\" fill=\"#EFE0BC\" stroke=\"#5A4632\" stroke-width=\"8\"/><path d=\"M50 18 V82 M18 50 H82\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6.5\" stroke-linecap=\"round\"/>"},"石":{"ev":null,"svg":"<path d=\"M12 20 H66 L38 54\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><rect x=\"40\" y=\"58\" width=\"40\" height=\"28\" rx=\"9\" fill=\"#EFE0BC\" stroke=\"#5A4632\" stroke-width=\"8\"/>"},"马":{"ev":"<ellipse cx=\"55\" cy=\"52\" rx=\"26\" ry=\"16\" fill=\"#EFE0BC\" stroke=\"#5A4632\" stroke-width=\"6.5\"/><path d=\"M36 46 Q28 30 34 16 L46 20 Q46 34 44 44\" fill=\"#EFE0BC\" stroke=\"#5A4632\" stroke-width=\"6.5\" stroke-linejoin=\"round\"/><circle cx=\"38\" cy=\"18\" r=\"3\" fill=\"#5A4632\"/><path d=\"M34 20 Q26 30 28 40\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6\" stroke-linecap=\"round\"/><path d=\"M42 66 V88 M54 68 V90 M66 66 V88\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6.5\" stroke-linecap=\"round\"/><path d=\"M80 50 Q94 40 90 26\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6\" stroke-linecap=\"round\"/>","svg":"<path d=\"M30 14 Q44 6 50 16 Q52 28 49 38 L44 50 L38 48 Q34 34 30 14 Z\" fill=\"#EFE0BC\" stroke=\"#5A4632\" stroke-width=\"6.5\" stroke-linejoin=\"round\"/><path d=\"M33 12 L30 6\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6\" stroke-linecap=\"round\"/><circle cx=\"41\" cy=\"16\" r=\"3.5\" fill=\"#5A4632\"/><path d=\"M31 16 Q24 26 26 38 M35 24 Q30 32 31 42\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6\" stroke-linecap=\"round\"/><ellipse cx=\"58\" cy=\"54\" rx=\"24\" ry=\"15\" fill=\"#EFE0BC\" stroke=\"#5A4632\" stroke-width=\"6.5\"/><path d=\"M42 66 V90 M54 68 V92 M66 66 V90 M76 62 V86\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6.5\" stroke-linecap=\"round\"/><path d=\"M80 46 Q94 56 90 74\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6\" stroke-linecap=\"round\"/>"},"鸟":{"ev":"<path d=\"M14 34 Q22 12 44 16 Q56 8 62 18 L74 24 L62 30 Q66 44 58 54 Q48 68 30 62 Q16 54 14 34 Z\" fill=\"#EFE0BC\" stroke=\"#5A4632\" stroke-width=\"6.5\" stroke-linejoin=\"round\"/><circle cx=\"46\" cy=\"26\" r=\"4\" fill=\"#5A4632\"/><path d=\"M40 66 V84 M56 66 V84\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6\" stroke-linecap=\"round\"/><path d=\"M58 52 Q76 58 82 74\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6\" stroke-linecap=\"round\"/>","svg":"<path d=\"M10 30 L26 24 Q40 10 50 26 Q76 20 82 42 Q84 58 64 62 Q40 66 28 50 Q18 40 10 30 Z\" fill=\"#EFE0BC\" stroke=\"#5A4632\" stroke-width=\"6\" stroke-linejoin=\"round\"/><circle cx=\"34\" cy=\"28\" r=\"4.5\" fill=\"#5A4632\"/><path d=\"M40 14 q-2 -6 -8 -8\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6\" stroke-linecap=\"round\"/><path d=\"M78 52 Q92 66 88 86\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6.5\" stroke-linecap=\"round\"/><path d=\"M42 64 V82 M56 64 V82\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6\" stroke-linecap=\"round\"/>"},"鱼":{"ev":null,"svg":"<path d=\"M10 50 Q26 32 50 32 Q72 34 78 50 Q72 66 50 68 Q26 68 10 50 Z\" fill=\"#EFE0BC\" stroke=\"#5A4632\" stroke-width=\"6.5\" stroke-linejoin=\"round\"/><path d=\"M78 50 L96 34 Q92 50 96 66 Z\" fill=\"#EFE0BC\" stroke=\"#5A4632\" stroke-width=\"6\" stroke-linejoin=\"round\"/><circle cx=\"24\" cy=\"46\" r=\"4.5\" fill=\"#5A4632\"/><path d=\"M34 38 Q40 50 34 62\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6\" stroke-linecap=\"round\"/><path d=\"M46 32 Q52 22 62 30 M48 68 Q54 78 62 66\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6\" stroke-linecap=\"round\"/>"},"雨":{"ev":null,"svg":"<path d=\"M12 20 H88\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"8\" stroke-linecap=\"round\"/><path d=\"M26 34 Q31 44 26 49 Q21 44 26 34 Z M50 34 Q55 44 50 49 Q45 44 50 34 Z M74 34 Q79 44 74 49 Q69 44 74 34 Z M26 60 Q31 70 26 75 Q21 70 26 60 Z M50 60 Q55 70 50 75 Q45 70 50 60 Z M74 60 Q79 70 74 75 Q69 70 74 60 Z\" fill=\"#9FB9C8\"/>"},"门":{"ev":null,"svg":"<path d=\"M26 14 H74\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"8\" stroke-linecap=\"round\"/><path d=\"M30 16 V84 M70 16 V84\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"8\" stroke-linecap=\"round\"/><circle cx=\"30\" cy=\"88\" r=\"4.5\" fill=\"#5A4632\"/><circle cx=\"70\" cy=\"88\" r=\"4.5\" fill=\"#5A4632\"/>"},"手":{"ev":null,"svg":"<path d=\"M31 50 Q31 40 40 40 H60 Q69 40 69 50 L65 76 Q63 90 50 90 Q37 90 35 76 Z\" fill=\"#EFE0BC\" stroke=\"#5A4632\" stroke-width=\"7\" stroke-linejoin=\"round\"/><path d=\"M35 40 V22 M47 40 V14 M59 40 V18 M67 46 V28\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"7\" stroke-linecap=\"round\"/>"},"力":{"ev":null,"svg":"<path d=\"M32 12 Q66 12 68 46 Q69 66 58 82\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"7\" stroke-linecap=\"round\"/><path d=\"M32 12 L46 90\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"7\" stroke-linecap=\"round\"/>"},"目":{"ev":"<circle cx=\"50\" cy=\"50\" r=\"36\" fill=\"#EFE0BC\" stroke=\"#5A4632\" stroke-width=\"7\"/><circle cx=\"50\" cy=\"50\" r=\"15\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6\"/><circle cx=\"50\" cy=\"50\" r=\"5.5\" fill=\"#5A4632\"/>","svg":"<path d=\"M16 50 Q28 26 50 26 Q72 26 84 50 Q72 74 50 74 Q28 74 16 50 Z\" fill=\"#EFE0BC\" stroke=\"#5A4632\" stroke-width=\"7\" stroke-linejoin=\"round\"/><circle cx=\"50\" cy=\"50\" r=\"13\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6\"/><circle cx=\"50\" cy=\"50\" r=\"5\" fill=\"#5A4632\"/>"},"竹":{"ev":null,"svg":"<path d=\"M32 12 V88 M68 12 V88\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"7.5\" stroke-linecap=\"round\"/><path d=\"M32 18 Q20 26 12 24 M32 18 Q42 28 50 26 M68 18 Q56 26 50 26 M68 18 Q80 26 88 24\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6.5\" stroke-linecap=\"round\"/>"},"禾":{"ev":"<path d=\"M50 30 V92\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"7.5\" stroke-linecap=\"round\"/><path d=\"M50 30 Q62 22 68 8\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"7\" stroke-linecap=\"round\"/><circle cx=\"68\" cy=\"8\" r=\"3.5\" fill=\"#5A4632\"/><circle cx=\"61\" cy=\"16\" r=\"3.5\" fill=\"#5A4632\"/><circle cx=\"73\" cy=\"16\" r=\"3.5\" fill=\"#5A4632\"/><path d=\"M50 56 Q36 48 28 34 M50 56 Q64 48 72 34\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6.5\" stroke-linecap=\"round\"/><path d=\"M50 78 Q38 86 32 92 M50 78 Q62 86 68 92\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6\" stroke-linecap=\"round\"/>","svg":"<path d=\"M50 24 V92\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"7.5\" stroke-linecap=\"round\"/><path d=\"M50 56 Q34 46 26 30 M50 56 Q66 46 74 30 M50 56 Q34 66 26 84 M50 56 Q66 66 74 84\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6.5\" stroke-linecap=\"round\"/><path d=\"M50 24 Q38 12 26 16 M50 24 Q62 12 74 16\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6.5\" stroke-linecap=\"round\"/><path d=\"M38 14 l-5 9 M30 15 l-6 8 M62 14 l5 9 M70 15 l6 8\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6\" stroke-linecap=\"round\"/>"},"三":{"ev":null,"svg":"<path d=\"M22 26 H78\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"8\" stroke-linecap=\"round\"/><path d=\"M16 50 H84\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"8\" stroke-linecap=\"round\"/><path d=\"M22 74 H78\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"8\" stroke-linecap=\"round\"/>"},"乌":{"ev":"<path d=\"M12 32 Q20 12 42 18 Q52 8 60 20 L74 26 L60 32 Q66 46 58 56 Q46 68 28 62 Q14 54 12 32 Z\" fill=\"#EFE0BC\" stroke=\"#5A4632\" stroke-width=\"6.5\" stroke-linejoin=\"round\"/><path d=\"M38 66 V84 M54 66 V84\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6\" stroke-linecap=\"round\"/><path d=\"M58 52 Q78 58 84 74\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6\" stroke-linecap=\"round\"/>","svg":"<path d=\"M10 30 L26 24 Q40 10 50 26 Q76 20 82 42 Q84 58 64 62 Q40 66 28 50 Q18 40 10 30 Z\" fill=\"#EFE0BC\" stroke=\"#5A4632\" stroke-width=\"6\" stroke-linejoin=\"round\"/><path d=\"M40 14 q-2 -6 -8 -8\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6\" stroke-linecap=\"round\"/><path d=\"M78 52 Q92 66 88 86\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6.5\" stroke-linecap=\"round\"/><path d=\"M42 64 V82 M56 64 V82\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6\" stroke-linecap=\"round\"/>"},"本":{"ev":null,"svg":"<path d=\"M50 8 V92\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"7.5\" stroke-linecap=\"round\"/><path d=\"M50 42 Q32 30 24 14 M50 42 Q68 30 76 14 M50 58 Q32 70 24 86 M50 58 Q68 70 76 86\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"6.5\" stroke-linecap=\"round\"/><path d=\"M28 76 H72\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"8\" stroke-linecap=\"round\"/>"},"刀":{"ev":null,"svg":"<path d=\"M32 14 Q66 14 68 48 Q69 72 54 90 Z\" fill=\"#EFE0BC\" stroke=\"#5A4632\" stroke-width=\"7\" stroke-linejoin=\"round\"/>"},"少":{"ev":null,"svg":"<path d=\"M62 12 Q46 16 34 28\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"7\" stroke-linecap=\"round\"/><path d=\"M50 30 V84\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"8\" stroke-linecap=\"round\"/><path d=\"M27 46 Q34 53 40 60 M73 46 Q66 53 60 60\" fill=\"none\" stroke=\"#5A4632\" stroke-width=\"7\" stroke-linecap=\"round\"/>"}};

var T2 = {
  A_MS: 1300,      /* glyph 文案淡入窗 */
  B_MS: 800,       /* 象形 ev→svg 交叉淡化单帧窗 */
  C_MS: 760,       /* 部件滑入 / 整字浮现窗 */
  GAP: 120
};
var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
var EYE = '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
  '<path d="M6 32 Q32 8 58 32 Q32 56 6 32 Z" fill="#FFF9EE" stroke="#4A3B2E" stroke-width="3" stroke-linejoin="round"/>' +
  '<circle cx="32" cy="32" r="9" fill="#4A3B2E"/><circle cx="35" cy="29" r="3" fill="#FFF9EE"/></svg>';

ZQ.registerQ('t2', {
  render: function (q, box, api) {
    QT_.teardown(box);
    var st = { dead: false, lock: true, timer: null };
    box.__zqQ = st;
    var f = QT_.frame(box);
    f.stem.style.flex = '1 1 auto';
    f.stem.style.justifyContent = 'center';
    f.opts.style.display = 'none';                 /* t2 无四选一：大字卡即点击目标（≥96×96） */

    f.stem.innerHTML =
      '<div class="zq-prompt">' + EYE + '<span>看！来认识新字啦</span></div>' +
      '<div class="zq-t2-stage">' +
        '<div class="zq-t2-glyph">' + QT_.esc(q.glyph || '') + '</div>' +
        '<div class="zq-t2-picto" style="display:none"></div>' +
        '<div class="zq-t2-parts"></div>' +
        '<button class="zq-t2-big" aria-label="点一点这个字"><span class="zi">' +
          QT_.esc(q.ch) + '</span><span class="zq-t2-py">' + QT_.esc(q.py) + '</span></button>' +
        '<div class="zq-t2-ws"></div>' +
      '</div>';

    var glyphEl = f.stem.querySelector('.zq-t2-glyph');
    var pictoEl = f.stem.querySelector('.zq-t2-picto');
    var partsEl = f.stem.querySelector('.zq-t2-parts');
    var bigEl = f.stem.querySelector('.zq-t2-big');
    var wsEl = f.stem.querySelector('.zq-t2-ws');
    var pic = ZQ_PICTO[q.ch];
    /* P2 实物图兜底（无象形 SVG 的字）：PICTO 象形（字理价值）优先，ZQ_PICS 实物图次之 */
    var photo = !pic && typeof ZQ_PICS !== 'undefined' && ZQ_PICS[q.ch] || null;

    (async function () {
      /* A：字理文案淡入 */
      await wait(T2.GAP);
      if (st.dead) return;
      glyphEl.classList.add('on');
      await wait(T2.A_MS);
      if (st.dead) return;

      /* B：象形演变（有 SVG 的 29 字；ev 古形→svg 今形双帧交叉淡化） */
      if (pic) {
        glyphEl.classList.add('off');
        pictoEl.style.display = '';
        pictoEl.innerHTML =
          (pic.ev ? '<svg viewBox="0 0 100 100" class="zq-t2-ev" aria-hidden="true">' + pic.ev + '</svg>' : '') +
          '<svg viewBox="0 0 100 100" class="zq-t2-now" aria-hidden="true">' + pic.svg + '</svg>';
        pictoEl.classList.add('on');
        await wait(T2.B_MS + T2.GAP);
        if (st.dead) return;
        if (pic.ev) {
          pictoEl.classList.add('ev2');            /* ev 帧淡出 → 今形帧淡入 */
          await wait(T2.B_MS);
          if (st.dead) return;
        }
        pictoEl.classList.add('off');
      } else if (photo) {                          /* B'：实物图（P2 配图；单帧淡入观赏窗；
                                                       data: URI 经 DOM API 赋值=离线合规，无 src 字面） */
        glyphEl.classList.add('off');
        pictoEl.style.display = '';
        pictoEl.classList.add('photo');
        var im = document.createElement('img');
        im.alt = '';
        im.draggable = false;
        im.src = photo;
        pictoEl.appendChild(im);
        pictoEl.classList.add('on');
        await wait(T2.B_MS * 2 + T2.GAP);
        if (st.dead) return;
        pictoEl.classList.add('off');
      }

      /* C1：部件拼摆（parts 有值；滑入合拢后化出） */
      if (q.parts && q.parts.length > 1) {
        pictoEl.style.display = 'none';
        partsEl.innerHTML = q.parts.map(function (p, i) {
          return '<span class="zq-t2-part" data-k="' + i + '">' + QT_.esc(p) + '</span>';
        }).join('');
        await wait(30);
        if (st.dead) return;
        partsEl.classList.add('join');
        await wait(T2.C_MS + T2.GAP);
        if (st.dead) return;
        partsEl.classList.add('off');
      } else {
        pictoEl.style.display = 'none';
      }

      /* C2：现代大字浮现 + 词句条（P2：words 首词加粗 + 首个含字句）+ 解锁「点一点」 */
      var sentText = '';
      if (typeof ZQ_SENTENCES !== 'undefined' && ZQ_SENTENCES) {
        for (var si = 0; si < ZQ_SENTENCES.length; si++) {
          var sOne = ZQ_SENTENCES[si];
          var sTxt = sOne && String(sOne.text != null ? sOne.text : sOne);
          if (sTxt && sTxt.indexOf(q.ch) >= 0) { sentText = sTxt; break; }
        }
      }
      if (wsEl) {
        wsEl.innerHTML = (q.words && q.words[0] ? '<b>' + QT_.esc(q.words[0][0]) + '</b>' : '') +
          (sentText ? '<i>' + QT_.esc(sentText) + '</i>' : '');
      }
      bigEl.classList.add('on');
      if (wsEl && wsEl.innerHTML) wsEl.classList.add('on');
      await wait(T2.C_MS);
      if (st.dead) return;
      glyphEl.style.display = 'none';
      partsEl.style.display = 'none';
      bigEl.classList.add('ready');                /* breathe 邀请点击 */
      bigEl.addEventListener('click', function () {
        if (st.dead || st.lock) return;
        st.lock = true;
        bigEl.classList.remove('breathe');
        bigEl.classList.add('good');
        QT_.sfx('ok');
        QT_.voice(api, 'zq_ch_' + q.pyKey);
        QT_.voice(api, 'zq_right');
        setTimeout(function () { if (!st.dead) api.right(); }, 480);
      });
      st.lock = false;
    })();
  },
  onShow: function (q, api) {
    QT_.voice(api, 'zq_tut_watch');
    QT_.voice(api, 'zq_ch_' + q.pyKey);
  }
});

QT_.cssOnce('zq-css-t2',
  '.zq-t2-stage{position:relative;flex:0 0 auto;display:flex;flex-direction:column;align-items:center;' +
    'gap:10px;min-height:0;padding:6px 0}' +
  '.zq-t2-glyph{max-width:560px;text-align:center;font-size:19px;font-weight:700;color:#6B5B4A;' +
    'line-height:1.55;opacity:0;transition:opacity .5s ease}' +
  '.zq-t2-glyph.on{opacity:1}.zq-t2-glyph.off{opacity:.45}' +
  '.zq-t2-picto{position:relative;width:132px;height:132px;opacity:0;transform:scale(.88);' +
    'transition:opacity .45s ease,transform .45s ease}' +
  '.zq-t2-picto.on{opacity:1;transform:scale(1)}' +
  '.zq-t2-picto.off{opacity:0;transform:scale(1.06)}' +
  '.zq-t2-picto svg{position:absolute;inset:0;width:100%;height:100%;transition:opacity .4s ease}' +
  '.zq-t2-picto .zq-t2-now{opacity:0}' +
  '.zq-t2-picto.ev2 .zq-t2-ev{opacity:0}' +
  '.zq-t2-picto.ev2 .zq-t2-now{opacity:1}' +
  '.zq-t2-parts{display:flex;gap:14px;opacity:1;transition:opacity .3s ease}' +
  '.zq-t2-part{width:86px;height:86px;border-radius:18px;background:#FFF9EE;border:2.5px solid #4A3B2E;' +
    'box-shadow:0 4px 0 #D8C9B4;display:flex;align-items:center;justify-content:center;font-size:44px;' +
    'font-weight:800;color:#4A3B2E;transition:transform .6s cubic-bezier(.3,.9,.35,1)}' +
  '.zq-t2-part:first-child{transform:translateX(-64px)}' +
  '.zq-t2-part:last-child{transform:translateX(64px)}' +
  '.zq-t2-parts.join .zq-t2-part{transform:translateX(0)}' +
  '.zq-t2-parts.off{opacity:0}' +
  '.zq-t2-big{position:relative;min-width:170px;min-height:170px;border-radius:30px;' +
    'background:linear-gradient(180deg,#FFFDF6,#FFF1D8);' +
    'border:2.5px solid #4A3B2E;box-shadow:inset 0 3px 0 rgba(255,255,255,.95),0 6px 0 #D8C9B4,' +
    '0 14px 24px rgba(74,59,46,.12);display:flex;flex-direction:column;' +
    'align-items:center;justify-content:center;gap:4px;opacity:0;transform:scale(.6);' +
    'transition:opacity .4s ease,transform .5s cubic-bezier(.3,.9,.35,1)}' +
  '.zq-t2-big.on{opacity:1;transform:scale(1)}' +
  '.zq-t2-big .zi{font-size:96px;font-weight:800;color:#4A3B2E;line-height:1.1;' +
    'text-shadow:0 2px 0 rgba(255,255,255,.6)}' +
  '.zq-t2-big .zq-t2-py{font-size:16px;font-weight:700;color:#8A7B6C}' +
  '.zq-t2-big.ready{animation:zq-breathe 1.6s ease-in-out infinite;' +
    'box-shadow:inset 0 3px 0 rgba(255,255,255,.95),0 6px 0 #D8C9B4,0 0 26px rgba(245,196,69,.5)}' +
  '.zq-t2-big.good{background:linear-gradient(180deg,#F0F8E8,#DDF0CE);border-color:#5B8A4E;' +
    'box-shadow:inset 0 3px 0 rgba(255,255,255,.9),0 6px 0 #BFD4AC;animation:none}' +
  /* P2 实物图（photo 卡框=派蒙渐变+白高光；132 视区同 picto） */
  '.zq-t2-picto.photo{background:linear-gradient(180deg,#FFFDF6,#FFF1D8);border:2.5px solid #4A3B2E;' +
    'border-radius:22px;box-shadow:inset 0 3px 0 rgba(255,255,255,.95),0 5px 0 #D8C9B4,' +
    '0 10px 18px rgba(74,59,46,.1);overflow:hidden}' +
  '.zq-t2-picto.photo img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;user-select:none}' +
  /* P2 词句条：词加粗暖橙 + 句浅棕（大字卡下随 C2 浮现） */
  '.zq-t2-ws{display:flex;align-items:center;gap:14px;max-width:92%;opacity:0;' +
    'transform:translateY(8px);transition:opacity .4s ease,transform .4s ease;' +
    'background:linear-gradient(180deg,#FFFDF6,#FFF1D8);border:2px solid #4A3B2E;border-radius:16px;' +
    'box-shadow:inset 0 2px 0 rgba(255,255,255,.95),0 4px 0 #D8C9B4;padding:7px 18px;margin-top:2px}' +
  '.zq-t2-ws.on{opacity:1;transform:translateY(0)}' +
  '.zq-t2-ws b{font-size:21px;font-weight:800;color:#E8975A;white-space:nowrap}' +
  '.zq-t2-ws i{font-style:normal;font-size:16px;font-weight:600;color:#8A7B6C}');

})();
