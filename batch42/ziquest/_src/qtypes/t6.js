/* ================= ziquest 题型层 t6：形近辨析（田字格亮相 + 听音选字，辨认层） =================
   形态：题面=主字大田字格（高亮教学锚）+ 3 个形近干扰字小田字格对比排（distract），播目标字音
   → 四选一大字卡（本字+3 干扰，乱序）。
   防泄露口径：题面主字与选项同形=玩法组件（辨析教学亮相——同 t1「听音题的题面音=目标音」
   豁免类，SPEC §2；selftest 专断言：题面主字必在选项中且选项乱序）；干扰格不标注对错。 */
(function () {
'use strict';

var ZQ = (typeof ZQ !== 'undefined') ? ZQ : (window.ZQ || {});
if (!ZQ._qt) throw new Error('ZQ._qt missing: qtypes must load t1.js first');
var QT_ = ZQ._qt;

ZQ.registerQ('t6', {
  render: function (q, box, api) {
    QT_.teardown(box);
    var f = QT_.frame(box);

    var dis = (q.distract || []).map(function (d) { return Array.isArray(d) ? d[0] : d; })
      .filter(function (c) { return c && c !== q.ch; });
    var row = dis.map(function (c) {
      return '<span class="zq-tg zq-t6-mini"><span class="zi">' + QT_.esc(c) + '</span></span>';
    }).join('');

    f.stem.innerHTML =
      '<div class="zq-prompt">' + QT_.ICON.hear + '<span>听一听，找到它</span></div>' +
      '<div class="zq-t6-row">' +
        '<span class="zq-tg zq-t6-main"><span class="zi">' + QT_.esc(q.ch) + '</span></span>' +
        '<span class="zq-t6-vs">它们长得像</span>' +
        '<span class="zq-t6-side">' + row + '</span>' +
      '</div>';

    var items = (q.options || []).map(function (o) {
      return '<span class="zi">' + QT_.esc(o) + '</span>';
    });
    var layout = QT_.layout(items.length, q, 6);
    var optEls = QT_.mkOpts(f.opts, items, layout);

    QT_.wirePick({
      box: box, q: q, api: api, optEls: optEls,
      ansIdx: QT_.ansIdxOf(q),           /* 判定域=原始索引（乱序无关） */
      encText: function (i) {
        return i === 1 ? '没关系，再听一听' : (i === 2 ? '看一看田字格里它的样子' : '去掉一个啦，再选一选');
      }
    });
  },
  onShow: function (q, api) {                     /* 听音题：题面音=目标字音本身是玩法（豁免口径） */
    QT_.voice(api, 'zq_listen');
    QT_.voice(api, 'zq_ch_' + q.pyKey);
  }
});

QT_.cssOnce('zq-css-t6',
  '.zq-t6-row{display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;min-height:96px}' +
  '.zq-tg{background-color:#FFF9EE;border:2.5px solid #4A3B2E;border-radius:14px;' +
    'background-image:linear-gradient(#D8C9B4,#D8C9B4),linear-gradient(#D8C9B4,#D8C9B4);' +
    'background-size:100% 2px,2px 100%;background-position:center;background-repeat:no-repeat;' +
    'display:flex;align-items:center;justify-content:center;box-shadow:0 4px 0 #D8C9B4}' +
  '.zq-t6-main{width:104px;height:104px;border-radius:16px;border-color:#E8975A;' +
    'box-shadow:0 5px 0 #E8B287;animation:zq-breathe 2.2s ease-in-out infinite}' +
  '.zq-t6-main .zi{font-size:64px;font-weight:800;color:#4A3B2E}' +
  '.zq-t6-vs{font-size:15px;font-weight:800;color:#8A7B6C}' +
  '.zq-t6-side{display:flex;gap:8px}' +
  '.zq-t6-mini{width:58px;height:58px;border-width:2px;border-radius:10px;box-shadow:none;opacity:.82}' +
  '.zq-t6-mini .zi{font-size:34px;font-weight:800;color:#6B5B4A}');

})();
