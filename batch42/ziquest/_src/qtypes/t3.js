/* ================= ziquest 题型层 t3：词挖空（视觉题——题面绝不出现答案字/答案音） =================
   形态：words 中本字挖空「□」（words[0] 优先，防御取首个含本字的词），四选一大字卡补空
   （选项=本字+distract 3，M2a 造 q.options/q.answer）。答对=字飞入空位（transform-only）。
   防泄露：stem 文本=挖空后的词（□ 代替本字），禁含 q.ch；题面音只播 zq_word（不播目标字音）。 */
(function () {
'use strict';

var ZQ = (typeof ZQ !== 'undefined') ? ZQ : (window.ZQ || {});
if (!ZQ._qt) throw new Error('ZQ._qt missing: qtypes must load t1.js first');
var QT_ = ZQ._qt;

ZQ.registerQ('t3', {
  render: function (q, box, api) {
    QT_.teardown(box);
    var f = QT_.frame(box);

    /* 挖空词防御选取：words[0] 含本字用之；否则首个含本字词；全不含退化「□+词」 */
    var w0 = null;
    (q.words || []).some(function (w) {
      if (w && w[0] && String(w[0]).indexOf(q.ch) >= 0) { w0 = String(w[0]); return true; }
      return false;
    });
    var pos = w0 ? w0.indexOf(q.ch) : -1;
    var html;
    if (w0 && pos >= 0) {
      html = '';
      for (var i = 0; i < w0.length; i++) {
        html += i === pos
          ? '<span class="zq-t3-blank" aria-label="空位">□</span>'
          : '<span class="zi">' + QT_.esc(w0[i]) + '</span>';
      }
    } else {
      html = '<span class="zq-t3-blank">□</span>' +
        (w0 ? '<span class="zi">' + QT_.esc(w0) + '</span>' : '');
    }

    f.stem.innerHTML =
      '<div class="zq-prompt"><span>读一读，空格里是哪个字？</span></div>' +
      '<div class="zq-t3-word">' + html + '</div>';

    var items = (q.options || []).map(function (o) {
      return '<span class="zi">' + QT_.esc(o) + '</span>';
    });
    var layout = QT_.layout(items.length, q, 3);
    var optEls = QT_.mkOpts(f.opts, items, layout);
    var blank = f.stem.querySelector('.zq-t3-blank');
    var ansCh = q.options[QT_.ansIdxOf(q)];

    QT_.wirePick({
      box: box, q: q, api: api, optEls: optEls,
      ansIdx: QT_.ansIdxOf(q),           /* 判定域=原始索引（乱序无关） */
      onRight: function () {                      /* 答案字飞入空位（视觉确认，transform-only） */
        if (blank) {
          blank.classList.add('zq-fly');
          setTimeout(function () { blank.textContent = ansCh; blank.classList.add('lit'); }, 220);
        }
      },
      rightMs: 520,
      encText: function (i) {
        return i === 1 ? '没关系，读一读这个词' : (i === 2 ? '想一想它的样子，再选一选' : '去掉一个啦，再选一选');
      }
    });
  },
  onShow: function (q, api) {                     /* 2026-09-30 语音主通道化：孩子不识字词面 → 播「X，word的X」听词辨字（音=词语境，玩法本体非泄露） */
    QT_.voice(api, 'zq_word');
    QT_.voice(api, 'zq_ch_' + q.pyKey);
  }
});

QT_.cssOnce('zq-css-t3',
  '.zq-t3-word{display:flex;align-items:center;gap:6px;background:#FFF9EE;border:2.5px solid #4A3B2E;' +
    'border-radius:26px;box-shadow:0 5px 0 #D8C9B4;padding:18px 30px;min-height:96px}' +
  '.zq-t3-word .zi{font-size:56px;font-weight:800;color:#4A3B2E;line-height:1}' +
  '.zq-t3-blank{font-size:56px;font-weight:800;color:#E8975A;line-height:1;' +
    'border-bottom:5px dotted #E8975A;padding:0 4px;animation:zq-breathe 1.6s ease-in-out infinite}' +
  '.zq-t3-blank.lit{color:#5B8A4E;border-bottom-color:#5B8A4E;animation:none}');

})();
