# wordprob 模板段语音清单（r13 两步题库 wor_tpl2_* 38 条，2026-09-15 已合成）

r13 难度改造（AUDIT-78 定案）：题库升 100 以内两步应用题。新模板段前缀 `wor_tpl2_`（38 条=9 模板×3-5 段）；
旧 24 条 `wor_tpl_*`（一步小数值题面）已退役——manifest 冻结字面量 games=[]，文案/音频一字不改，不再注入页面。

题面读音 = 段1 + 数词1 + 段2 + 数词2 + 段3 +（数词3 + 段4）+（数词4 + 段5）；槽序=各模板自然语序。

## 提取方式（零手抄）

对 `game-data.js` 逐行正则提取（key 与文案都在同一行单引号字面量）：

```python
import re, pathlib
src = pathlib.Path('game-data.js').read_text(encoding='utf-8')
pairs = re.findall(r"^\s{2}(wor_tpl2_\w+):\s*'([^']+)',?\s*$", src, re.M)
assert len(pairs) == 38, len(pairs)
```

## 全清单（9 模板；kind: one 单步桥接 / two 两步 / extra 多余条件）

### bus1 单步桥接（one，a+b 100 以内进位加；ch1 首题热身）
| key | 文案 |
|---|---|
| wor_tpl2_bus1_1 | 早上，公交车到站啦。车上有 |
| wor_tpl2_bus1_2 | 人，上来了 |
| wor_tpl2_bus1_3 | 人。现在车上有多少人呀 |

### bus2 两步加减（two，as：a+b-c）
| key | 文案 |
|---|---|
| wor_tpl2_bus2_1 | 下午，公交车到站啦。车上有 |
| wor_tpl2_bus2_2 | 人，上来了 |
| wor_tpl2_bus2_3 | 人，又下去了 |
| wor_tpl2_bus2_4 | 人。现在车上有多少人呀 |

### cookie2 两步加减（two，sa：a-b+c）
| key | 文案 |
|---|---|
| wor_tpl2_cookie2_1 | 小兔子在吃饼干。盘子里有 |
| wor_tpl2_cookie2_2 | 块，它吃掉了 |
| wor_tpl2_cookie2_3 | 块，妈妈又放上去 |
| wor_tpl2_cookie2_4 | 块。现在盘子里有多少块呀 |

### plate2 乘加（two，ma：a×b+c）
| key | 文案 |
|---|---|
| wor_tpl2_plate2_1 | 去野餐啦。桌上摆了 |
| wor_tpl2_plate2_2 | 盘草莓，每盘都有 |
| wor_tpl2_plate2_3 | 个，又拿来 |
| wor_tpl2_plate2_4 | 个。一共有多少个草莓呀 |

### row2 乘减（two，ms：a×b-c）
| key | 文案 |
|---|---|
| wor_tpl2_row2_1 | 小花园真漂亮。种了 |
| wor_tpl2_row2_2 | 行向日葵，每行都有 |
| wor_tpl2_row2_3 | 棵，搬走了 |
| wor_tpl2_row2_4 | 棵到花盆里。还剩多少棵呀 |

### busex 多余条件（extra，sad：a-b+c；d=座位数与所问无关）
| key | 文案 |
|---|---|
| wor_tpl2_busex_1 | 傍晚，公交车到站。车上有 |
| wor_tpl2_busex_2 | 人，下去了 |
| wor_tpl2_busex_3 | 人，又上来了 |
| wor_tpl2_busex_4 | 人。车上有 |
| wor_tpl2_busex_5 | 个座位。现在车上有多少人呀 |

### cookieex 多余条件（extra，sad：a-b+c；d=年龄与所问无关）
| key | 文案 |
|---|---|
| wor_tpl2_cookieex_1 | 小兔子在吃饼干，盘子里有 |
| wor_tpl2_cookieex_2 | 块，它吃掉了 |
| wor_tpl2_cookieex_3 | 块，妈妈又放上去 |
| wor_tpl2_cookieex_4 | 块。它今年 |
| wor_tpl2_cookieex_5 | 岁。现在盘子里有多少块呀 |

### rowex 多余条件乘减（extra，mad：a×b-c；d=蝴蝶只数与所问无关）
| key | 文案 |
|---|---|
| wor_tpl2_rowex_1 | 小花园里种了 |
| wor_tpl2_rowex_2 | 行向日葵，每行都有 |
| wor_tpl2_rowex_3 | 棵，搬走了 |
| wor_tpl2_rowex_4 | 棵到花盆里。花园里还飞来 |
| wor_tpl2_rowex_5 | 只蝴蝶。还剩多少棵向日葵呀 |

### candy2 除法两步（two，sd：(a-c)/b；槽序 [a,c,b]）
| key | 文案 |
|---|---|
| wor_tpl2_candy2_1 | 联欢会分糖啦。袋子里有 |
| wor_tpl2_candy2_2 | 颗糖，送给老师 |
| wor_tpl2_candy2_3 | 颗，剩下的平均分给 |
| wor_tpl2_candy2_4 | 个小朋友。每人分到几颗呀 |
