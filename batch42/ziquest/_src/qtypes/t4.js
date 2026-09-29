/* ================= ziquest 题型层 t4：组词（本字+「_」四选一选词，视觉题） =================
   形态：题面=本字大卡 + 虚线空位（本字在词首=「天 _」选词尾；词尾=「_ 天」选词头——由
   words[0] 中本字位置决定）；选项=词卡 ×4（正确词+3 换字词，M2a 造 q.options/q.answer）。
   词卡中与 q.ch 同形的字高亮（视觉锚定本字位置，判别仍在整词）。
   防泄露：stem 只出本字与空位（本字=题干非答案；答案=完整词不出现在题面），题面音只播 zq_word。 */
(function () {
'use strict';

var ZQ = (typeof ZQ !== 'undefined') ? ZQ : (window.ZQ || {});
if (!ZQ._qt) throw new Error('ZQ._qt missing: qtypes must load t1.js first');
var QT_ = ZQ._qt;

ZQ.registerQ('t4', {
  render: function (q, box, api) {
    QT_.teardown(box);
    var f = QT_.frame(box);

    /* 词形方向：words[0] 本字在首 → 空位在右（选词尾）；否则空位在左 */
    var w0 = (q.words && q.words[0] && String(q.words[0][0])) || '';
    var headFirst = w0.indexOf(q.ch) === 0;
    var chCard = '<span class="zq-t4-zi">' + QT_.esc(q.ch) + '</span>';
    var slot = '<span class="zq-t4-slot" aria-label="词的位置"></span>';
    var pair = headFirst ? chCard + slot : slot + chCard;

    f.stem.innerHTML =
      '<div class="zq-prompt"><span>给它找个词朋友</span></div>' +
      '<div class="zq-t4-pair">' + pair + '</div>';

    var items = (q.options || []).map(function (w) {      /* 词卡：本字位置高亮 */
      var s = QT_.esc(String(w));
      return '<span class="wd">' + s.split(QT_.esc(q.ch)).join('<b class="hl">' + QT_.esc(q.ch) + '</b>') + '</span>';
    });
    var layout = QT_.layout(items.length, q, 4);
    var optEls = QT_.mkOpts(f.opts, items, layout);
    var slotEl = f.stem.querySelector('.zq-t4-slot');
    var ansWord = String(q.options[QT_.ansIdxOf(q)]);
    var tailCh = ansWord.split(q.ch).join('');   /* 空位填=本字之外的剩余字 */

    QT_.wirePick({
      box: box, q: q, api: api, optEls: optEls,
      ansIdx: QT_.ansIdxOf(q),           /* 判定域=原始索引（乱序无关） */
      onRight: function () {                      /* 选中的那个字飞入空位 */
        if (slotEl) {
          slotEl.classList.add('zq-fly');
          setTimeout(function () {
            slotEl.textContent = tailCh || ansWord;
            slotEl.classList.add('lit');
          }, 220);
        }
      },
      rightMs: 520,
      encText: function (i) {
        return i === 1 ? '没关系，读一读这些词' : (i === 2 ? '哪个词里有它呢？' : '去掉一个啦，再选一选');
      }
    });
  },
  onShow: function (q, api) {                     /* 2026-09-30 语音主通道化：播「X，word的X」听音选词（音=玩法本体；识字前孩子靠听不靠读） */
    QT_.voice(api, 'zq_word');
    QT_.voice(api, 'zq_ch_' + q.pyKey);
  }
});

QT_.cssOnce('zq-css-t4',
  '.zq-t4-pair{display:flex;align-items:center;gap:10px;min-height:96px}' +
  '.zq-t4-zi{min-width:96px;min-height:96px;border-radius:22px;background:#FFF9EE;border:2.5px solid #4A3B2E;' +
    'box-shadow:0 5px 0 #D8C9B4;display:flex;align-items:center;justify-content:center;' +
    'font-size:56px;font-weight:800;color:#4A3B2E;padding:8px 14px}' +
  '.zq-t4-slot{min-width:96px;min-height:96px;border-radius:22px;background:rgba(232,151,90,.12);' +
    'border:2.5px dashed #E8975A;display:flex;align-items:center;justify-content:center;' +
    'font-size:44px;font-weight:800;color:#4A3B2E;padding:8px 12px}' +
  '.zq-t4-slot.lit{border-style:solid;border-color:#5B8A4E;background:#E9F2DF;animation:none}' +
  '.zq-opt .wd{font-size:38px;font-weight:800;line-height:1.15;display:flex;gap:2px;align-items:center}' +
  '.zq-opt .wd .hl{color:#E8975A}');

})();
