/* ================= ziquest 题型层 t5：句子挖空（读句找生字，视觉题） =================
   形态：句子大字排开，focus 字（q.ch）首处挖空「□」呼吸卡，四选一大字卡补空；答对字飞入。
   句子来源（运行时探测，M2a 约定）：q.sentence.text → window.ZQ_DATA.ZQ_SENTENCES（元素为
   字符串或 {text}；取含 q.ch 者按 seedIdx 确定性选）→ 都缺=占位卡（words[0] 挖空退化形态，
   class zq-fb 标记，可判定不卡关——sentences.json 由并行线产出，加载时缺失不崩）。
   防泄露：stem 文本=挖空后的句子（□ 代替 focus 字）；题面音只播 zq_read_hint。 */
(function () {
'use strict';

var ZQ = (typeof ZQ !== 'undefined') ? ZQ : (window.ZQ || {});
if (!ZQ._qt) throw new Error('ZQ._qt missing: qtypes must load t1.js first');
var QT_ = ZQ._qt;

function t5PickSent(q) {
  if (q.sentence && q.sentence.text) return String(q.sentence.text);
  /* 探测链（2026-09-29 主线修正）：可注入容器 window.ZQ_DATA.ZQ_SENTENCES 优先（测试两态可控），
     生产环境无容器 → 裸全局 const ZQ_SENTENCES（_gen_data 产出）兜底 */
  var S = (typeof window !== 'undefined' && window.ZQ_DATA && window.ZQ_DATA.ZQ_SENTENCES) ||
          (typeof ZQ_SENTENCES !== 'undefined' && ZQ_SENTENCES) ||
          (typeof ZQ_DATA !== 'undefined' ? ZQ_DATA.ZQ_SENTENCES : null);
  if (S && S.length) {
    var hits = [];
    for (var i = 0; i < S.length; i++) {
      var t = S[i] == null ? '' : (typeof S[i] === 'string' ? S[i] : S[i].text);
      if (t && t.indexOf(q.ch) >= 0) hits.push(t);
    }
    if (hits.length) return hits[((q.seedIdx || 0) % hits.length + hits.length) % hits.length];
  }
  return null;
}

ZQ.registerQ('t5', {
  render: function (q, box, api) {
    QT_.teardown(box);
    var f = QT_.frame(box);
    var sent = t5PickSent(q);

    var html, fbCls = '';
    if (sent) {
      html = '';
      var done = false;
      for (var i = 0; i < sent.length; i++) {
        if (!done && sent[i] === q.ch) {
          html += '<span class="zq-t5-blank" aria-label="空位">□</span>';
          done = true;
        } else {
          html += '<span class="zi">' + QT_.esc(sent[i]) + '</span>';
        }
      }
    } else {                                     /* 占位卡：句库缺失，词挖空退化（标记 zq-fb） */
      fbCls = ' zq-fb';
      var w0 = (q.words && q.words[0] && String(q.words[0][0])) || '';
      var p = w0.indexOf(q.ch);
      html = '';
      for (var k = 0; k < w0.length; k++) {
        html += (k === p) ? '<span class="zq-t5-blank">□</span>'
                          : '<span class="zi">' + QT_.esc(w0[k]) + '</span>';
      }
      if (p < 0) html = '<span class="zq-t5-blank">□</span>' + html;
    }

    f.stem.innerHTML =
      '<div class="zq-prompt"><span>读一读，选出生字</span></div>' +
      '<div class="zq-t5-sent' + fbCls + '">' + html + '</div>';

    var items = (q.options || []).map(function (o) {
      return '<span class="zi">' + QT_.esc(o) + '</span>';
    });
    var layout = QT_.layout(items.length, q, 5);
    var optEls = QT_.mkOpts(f.opts, items, layout);
    var blank = f.stem.querySelector('.zq-t5-blank');

    QT_.wirePick({
      box: box, q: q, api: api, optEls: optEls,
      ansIdx: QT_.ansIdxOf(q),           /* 判定域=原始索引（乱序无关） */
      onRight: function () {
        if (blank) {
          blank.classList.add('zq-fly');
          setTimeout(function () { blank.textContent = q.ch; blank.classList.add('lit'); }, 220);
        }
      },
      rightMs: 520,
      encText: function (i) {
        return i === 1 ? '没关系，把句子读一读' : (i === 2 ? '读到哪里空了呢？' : '去掉一个啦，再选一选');
      }
    });
  },
  onShow: function (q, api) {                     /* 视觉题纪律：题面音不带目标字音 */
    QT_.voice(api, 'zq_read_hint');
  }
});

QT_.cssOnce('zq-css-t5',
  '.zq-t5-sent{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:4px 6px;' +
    'background:#FFF9EE;border:2.5px solid #4A3B2E;border-radius:24px;box-shadow:0 5px 0 #D8C9B4;' +
    'padding:16px 20px;max-width:640px;min-height:96px}' +
  '.zq-t5-sent .zi{font-size:34px;font-weight:800;color:#4A3B2E;line-height:1.5}' +
  '.zq-t5-sent.zq-fb{border-style:dashed;opacity:.96}' +
  '.zq-t5-blank{font-size:34px;font-weight:800;color:#E8975A;line-height:1.5;' +
    'border-bottom:4px dotted #E8975A;padding:0 2px;animation:zq-breathe 1.6s ease-in-out infinite}' +
  '.zq-t5-blank.lit{color:#5B8A4E;border-bottom-color:#5B8A4E;animation:none}');

})();
