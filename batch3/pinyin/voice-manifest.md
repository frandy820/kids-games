# 拼音小火车 语音清单（voice-manifest）

- 调用统一 `KIDS.voice.play(key, text)`；无 clip 时回退系统 TTS 读 **text（代表字/短句）**，绝不让 TTS 读拼音字母串。
- 声母读音=呼读音（b→bo「波」）、韵母读音=本音（ui→wei「威」），全部落到 py_syl_* 库内音节；eng/ong 无独立本音，仅作视觉干扰不作听音目标。
- 游戏内语音仅前 3 关播放（sayP，flat<3）；pyi_* 提示音用于 1-0 教学关、答错提示、20s 空闲提示。

## 教学提示音（pyi_*，3）

| key | text | 用途 |
| --- | --- | --- |
| pyi_tut_watch | 看！找到正确的车厢 | 教学「看」演示开场（1-0 首次） |
| pyi_tut_turn | 你来点一点 | 教学「帮」交还操作 |
| pyi_hint | 找一找一样的拼音 | 答错提示 / 兔子按钮 / 20s 空闲提示 |

## 音节读音库 py_syl_*（154 = 两拼 124 + 整体认读 16 + 零声母 14；text=代表字）

### 两拼音节 SYL（124 条）

| key | 音节 | text(代表字) |
| --- | --- | --- |
| py_syl_ba | ba | 爸 |
| py_syl_pa | pa | 爬 |
| py_syl_ma | ma | 马 |
| py_syl_fa | fa | 发 |
| py_syl_da | da | 大 |
| py_syl_ta | ta | 他 |
| py_syl_la | la | 拉 |
| py_syl_ha | ha | 哈 |
| py_syl_sha | sha | 沙 |
| py_syl_ca | ca | 擦 |
| py_syl_bo | bo | 波 |
| py_syl_po | po | 坡 |
| py_syl_mo | mo | 摸 |
| py_syl_fo | fo | 佛 |
| py_syl_de | de | 的 |
| py_syl_te | te | 特 |
| py_syl_ne | ne | 呢 |
| py_syl_le | le | 乐 |
| py_syl_ge | ge | 哥 |
| py_syl_ke | ke | 科 |
| py_syl_he | he | 河 |
| py_syl_re | re | 热 |
| py_syl_bi | bi | 笔 |
| py_syl_pi | pi | 皮 |
| py_syl_mi | mi | 米 |
| py_syl_di | di | 弟 |
| py_syl_ni | ni | 你 |
| py_syl_li | li | 里 |
| py_syl_ji | ji | 鸡 |
| py_syl_qi | qi | 七 |
| py_syl_xi | xi | 西 |
| py_syl_bu | bu | 步 |
| py_syl_pu | pu | 扑 |
| py_syl_mu | mu | 木 |
| py_syl_fu | fu | 父 |
| py_syl_du | du | 读 |
| py_syl_tu | tu | 兔 |
| py_syl_lu | lu | 路 |
| py_syl_gu | gu | 姑 |
| py_syl_ku | ku | 哭 |
| py_syl_hu | hu | 虎 |
| py_syl_zhu | zhu | 竹 |
| py_syl_chu | chu | 出 |
| py_syl_shu | shu | 树 |
| py_syl_bai | bai | 白 |
| py_syl_dai | dai | 带 |
| py_syl_tai | tai | 台 |
| py_syl_nai | nai | 奶 |
| py_syl_lai | lai | 来 |
| py_syl_hai | hai | 海 |
| py_syl_bei | bei | 背 |
| py_syl_mei | mei | 美 |
| py_syl_fei | fei | 飞 |
| py_syl_dui | dui | 对 |
| py_syl_hui | hui | 会 |
| py_syl_shui | shui | 水 |
| py_syl_zui | zui | 嘴 |
| py_syl_bao | bao | 包 |
| py_syl_pao | pao | 跑 |
| py_syl_mao | mao | 猫 |
| py_syl_lao | lao | 老 |
| py_syl_gao | gao | 高 |
| py_syl_hao | hao | 好 |
| py_syl_zhao | zhao | 找 |
| py_syl_dou | dou | 豆 |
| py_syl_tou | tou | 头 |
| py_syl_gou | gou | 狗 |
| py_syl_kou | kou | 口 |
| py_syl_hou | hou | 猴 |
| py_syl_shou | shou | 手 |
| py_syl_jiu | jiu | 九 |
| py_syl_qiu | qiu | 球 |
| py_syl_liu | liu | 六 |
| py_syl_jie | jie | 姐 |
| py_syl_qie | qie | 切 |
| py_syl_xie | xie | 写 |
| py_syl_bie | bie | 别 |
| py_syl_jue | jue | 决 |
| py_syl_que | que | 缺 |
| py_syl_xue | xue | 雪 |
| py_syl_ban | ban | 班 |
| py_syl_man | man | 慢 |
| py_syl_fan | fan | 反 |
| py_syl_dan | dan | 蛋 |
| py_syl_gan | gan | 干 |
| py_syl_kan | kan | 看 |
| py_syl_shan | shan | 山 |
| py_syl_zhan | zhan | 站 |
| py_syl_ben | ben | 本 |
| py_syl_men | men | 门 |
| py_syl_fen | fen | 粉 |
| py_syl_hen | hen | 很 |
| py_syl_zhen | zhen | 真 |
| py_syl_pin | pin | 拼 |
| py_syl_min | min | 民 |
| py_syl_jin | jin | 金 |
| py_syl_xin | xin | 心 |
| py_syl_lun | lun | 轮 |
| py_syl_gun | gun | 滚 |
| py_syl_hun | hun | 混 |
| py_syl_chun | chun | 春 |
| py_syl_jun | jun | 军 |
| py_syl_bang | bang | 帮 |
| py_syl_mang | mang | 忙 |
| py_syl_fang | fang | 房 |
| py_syl_tang | tang | 糖 |
| py_syl_zhang | zhang | 张 |
| py_syl_chang | chang | 长 |
| py_syl_feng | feng | 风 |
| py_syl_deng | deng | 灯 |
| py_syl_zheng | zheng | 正 |
| py_syl_cheng | cheng | 城 |
| py_syl_sheng | sheng | 生 |
| py_syl_bing | bing | 冰 |
| py_syl_ming | ming | 名 |
| py_syl_jing | jing | 京 |
| py_syl_qing | qing | 青 |
| py_syl_xing | xing | 星 |
| py_syl_dong | dong | 冬 |
| py_syl_tong | tong | 同 |
| py_syl_gong | gong | 工 |
| py_syl_kong | kong | 空 |
| py_syl_hong | hong | 红 |
| py_syl_zhong | zhong | 中 |

### 整体认读 ZTR_LIB（16 条）

| key | 音节 | text(代表字) |
| --- | --- | --- |
| py_syl_zhi | zhi | 知 |
| py_syl_chi | chi | 吃 |
| py_syl_shi | shi | 十 |
| py_syl_ri | ri | 日 |
| py_syl_zi | zi | 字 |
| py_syl_ci | ci | 词 |
| py_syl_si | si | 四 |
| py_syl_yi | yi | 一 |
| py_syl_wu | wu | 五 |
| py_syl_yu | yu | 鱼 |
| py_syl_ye | ye | 夜 |
| py_syl_yue | yue | 月 |
| py_syl_yuan | yuan | 圆 |
| py_syl_yin | yin | 音 |
| py_syl_yun | yun | 云 |
| py_syl_ying | ying | 鹰 |

### 零声母/韵母本音 ZERO（14 条）

| key | 音节 | text(代表字) |
| --- | --- | --- |
| py_syl_a | a | 啊 |
| py_syl_o | o | 喔 |
| py_syl_e | e | 鹅 |
| py_syl_ai | ai | 爱 |
| py_syl_ei | ei | 欸 |
| py_syl_ao | ao | 奥 |
| py_syl_ou | ou | 欧 |
| py_syl_er | er | 耳 |
| py_syl_an | an | 安 |
| py_syl_en | en | 恩 |
| py_syl_ang | ang | 昂 |
| py_syl_wei | wei | 威 |
| py_syl_you | you | 优 |
| py_syl_wen | wen | 温 |

## 声母呼读音映射（SM_READ，23；听 b 实播 py_syl_bo「波」）

| 声母 | 呼读音 | 落库 key |
| --- | --- | --- |
| b | bo | py_syl_bo |
| p | po | py_syl_po |
| m | mo | py_syl_mo |
| f | fo | py_syl_fo |
| d | de | py_syl_de |
| t | te | py_syl_te |
| n | ne | py_syl_ne |
| l | le | py_syl_le |
| g | ge | py_syl_ge |
| k | ke | py_syl_ke |
| h | he | py_syl_he |
| j | ji | py_syl_ji |
| q | qi | py_syl_qi |
| x | xi | py_syl_xi |
| zh | zhi | py_syl_zhi |
| ch | chi | py_syl_chi |
| sh | shi | py_syl_shi |
| r | ri | py_syl_ri |
| z | zi | py_syl_zi |
| c | ci | py_syl_ci |
| s | si | py_syl_si |
| y | yi | py_syl_yi |
| w | wu | py_syl_wu |

## 韵母本音映射（YM_READ，22 有本音；eng/ong=null 仅视觉干扰不作听音目标）

| 韵母 | 本音 | 落库 key |
| --- | --- | --- |
| a | a | py_syl_a |
| o | o | py_syl_o |
| e | e | py_syl_e |
| i | yi | py_syl_yi |
| u | wu | py_syl_wu |
| ü | yu | py_syl_yu |
| ai | ai | py_syl_ai |
| ei | ei | py_syl_ei |
| ui | wei | py_syl_wei |
| ao | ao | py_syl_ao |
| ou | ou | py_syl_ou |
| iu | you | py_syl_you |
| ie | ye | py_syl_ye |
| üe | yue | py_syl_yue |
| er | er | py_syl_er |
| an | an | py_syl_an |
| en | en | py_syl_en |
| in | yin | py_syl_yin |
| un | wen | py_syl_wen |
| ün | yun | py_syl_yun |
| ang | ang | py_syl_ang |
| ing | ying | py_syl_ying |

合计语音 key 157 条（pyi_* 3 + py_syl_* 154）。真值源：`_src/game-data.js`。
