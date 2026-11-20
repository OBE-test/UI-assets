# Thought-Forms 章节整理（1905）

Nov 19, 2026 · @Ryan
> 源文档：https://claude.ai/artifact/Woz4HmcRuEFjPd9TdLL4uo （Docs，rev 8，2026-11-20 归档）

## 项目定位

这本书是 3D 交互页面的内容骨架：22 章原文 + 58 幅插图，每幅插图都会变成一个可交互的 3D「思想形态」画面，再扩展成可随机生成的思想画面库。

- **书目**：Annie Besant & C. W. Leadbeater，*Thought-Forms*，London/Benares：Theosophical Publishing Society，1905，58 幅插图。你手上的是第一版实体书，有 Calcutta Dayanand Vedic Library 馆章。
- **版权**：1905 年出版，已进入 public domain，原文和插图都能直接用到页面上。另一本 Annette de Jonge《Thought Forms》（2022）受 Obooko 授权限制，**不能转载上网**，只作灵感参考，不放进页面。
- **文本来源**：扫描 PDF 的 400 dpi 页面经过重新 OCR，再按章节切分，共约 18,000 词。目前是 **OCR 初版，约 97% 准确**，个别词有错字和断句，上线前要精校（见最后一节）。
- **数据文件**：每章原文已经整理成 `chapters.json`（id、中英标题、插图编号、段落），可以直接给页面调用。

## 章节总表

全书拆成 22 章：前 9 章讲理论，中间 11 章是插图案例，最后是音乐和结语。带插图的 14 章就是 3D 交互的主体。

| # | 章节 | Chapter | 原书页 | 插图 | 词数 |
| --- | --- | --- | --- | --- | --- |
| 00 | 序言 | Foreword | 6 | — | 230 |
| 01 | 导论：科学与不可见世界 | Introduction | 11 | — | 1,250 |
| 02 | 表现的困难 | The Difficulty of Representation | 16 | — | 1,200 |
| 03 | 思想的两种效应 | The Two Effects of Thought | 21 | — | 420 |
| 04 | 振动如何作用 | How the Vibration Acts | 23 | — | 490 |
| 05 | 形态及其效应 | The Form and its Effect | 25 | Fig. 1–7 | 1,470 |
| 06 | 三条总原则 | General Principles | 31 | — | 30 |
| 07 | 颜色的意义 | The Meaning of the Colours | 32 | 卷首色表 | 830 |
| 08 | 思想形态的三种类型 | Three Classes of Thought-Forms | 36 | — | 1,280 |
| 09 | 爱 / 情感 | Affection | 40 | Fig. 8–13 | 1,140 |
| 10 | 虔敬 | Devotion | 44 | Fig. 14–17 | 1,440 |
| 11 | 智性 | Intellect | 49 | Fig. 18–19 | 610 |
| 12 | 野心 | Ambition | 51 | Fig. 20–21 | 210 |
| 13 | 愤怒与嫉妒 | Anger | 52 | Fig. 22–26 | 720 |
| 14 | 同情 | Sympathy | 55 | Fig. 18A | 90 |
| 15 | 恐惧 | Fear | 55 | Fig. 27 | 250 |
| 16 | 贪欲 | Greed | 56 | Fig. 28–29 | 420 |
| 17 | 各种情境中的情绪 | Various Emotions | 57 | Fig. 30–36 | 2,420 |
| 18 | 冥想中所见的形态 | Forms Seen in Meditation | 66 | Fig. 37–47 | 2,440 |
| 19 | 助人的思想 | Helpful Thoughts | 74 | Fig. 48–54 | 340 |
| 20 | 音乐所建构的形态 | Forms Built by Music | 75 | Plate M / G / W | 2,500 |
| 21 | 结语：生命隐藏的一面 | Conclusion | 83 | — | 290 |

## 视觉语法：三条原则 + 25 色表

整本书的画面只由三个变量生成，这也是我们「随机生成思想画面」的参数系统。

1. **Quality → Colour**：思想的品质决定颜色（查下表）。
2. **Nature → Form**：思想的性质决定形状。比如云 = 模糊情绪，尖锥 / 抛射体 = 有方向的意志，弯钩 = 抓取和自私，闪电 = 爆发。
3. **Definiteness → Clarity of outline**：思想越明确，轮廓越锐利；越模糊，边缘越散。

另有两个运动变量：无私的思想是开放曲线，**向上飞出**；自私的思想是闭合曲线，**回到自身**，并向下沉。

下表是卷首色表（Key to the Meanings of Colours），5 行 × 5 列。表中中文是意译，色号是从实拍照片估的近似值，待用高清扫描校准。

| 行 | 第 1 列 | 第 2 列 | 第 3 列 | 第 4 列 | 第 5 列 |
| --- | --- | --- | --- | --- | --- |
| 1 | High Spirituality 高灵性 `#A9A3C4` | Devotion mixed with Affection 含爱的虔敬 `#2A2A6E` | Devotion to a Noble Ideal 对崇高理想的虔敬 `#4F86B8` | Pure Religious Feeling 纯粹宗教情感 `#1E63B0` | Selfish Religious Feeling 自私的宗教情感 `#3D6A93` |
| 2 | Religious Feeling tinged with Fear 带恐惧的宗教情感 `#2C4A5E` | Highest Intellect 最高智性 `#F2E01E` | Strong Intellect 强智性 `#EDB12A` | Low type of Intellect 低层智性 `#D79A2B` | Pride 骄傲 `#F38B2E` |
| 3 | Sympathy 同情 `#9CC56A` | Love for Humanity 博爱 `#D9B2B2` | Unselfish Affection 无私之爱 `#EF9A8E` | Selfish Affection 自私之爱 `#8A2530` | Pure Affection 纯爱 `#E9554F` |
| 4 | Adaptability 适应力 `#6B7A3A` | Jealousy 嫉妒 `#7A4A28` | Deceit 欺骗 `#8E8A78` | Fear 恐惧 `#A3A8B4` | Depression 抑郁 `#6E6766` |
| 5 | Selfishness 自私 `#5A3E3A` | Avarice 贪婪 `#B23A2A` | Anger 愤怒 `#E0542A` | Sensuality 情欲 `#9A2E34` | Malice 恶意 `#1A1A26` |

## 逐章导读（含 3D 方向）

每章先写核心意思，再写画面方向。方向里的代号对应「光学渲染效果库」。最关键的发现是：书里的 Fig. 38 / 44 / 45 / 46 本来就是用\*\*摆锤绘图机（harmonograph）\*\*画出来的，所以用数学曲线生成它们符合原书的做法，不是我们硬套的。

### 00 序言 Foreword

- **要点**：Besant 说明文字由她和 Leadbeater 合写；插图由 John Varley、Mr Prince、Miss Macfarlane 三位画家根据观察者的描述绘制。她的原话是：画家需要「彩色的火」，手里却只有「泥土颜料」。
- **3D 方向**：这句话可以做开场宣言——用光和 shader 来替代当年的颜料。

### 01 导论 Introduction

- **要点**：科学正在接近不可见的世界，书中举了 X 光、放射性、催眠，以及用感光底片拍「思想」的实验（Baraduc 等）。本书定位为上一本《Man Visible and Invisible》的续篇。
- **3D 方向**：用老式感光底片的暗房质感做过场，先显影出一层模糊光晕。

### 02 表现的困难 The Difficulty of Representation

- **要点**：思想形态属于更高维度，画在纸上只是一个「切片」。人有两个精微体负责产生思想形态：心智体（mental body）和欲望体（desire / astral body）。两者合力形成思想的力量。
- **3D 方向**：交互可以做成「用一个平面去切一个高维体」，接近 `tes`。心智体和欲望体可以接入你 P2 的多层身体结构。

### 03 思想的两种效应 The Two Effects of Thought

- **要点**：每个明确的思想都会产生两种效应：① 向外扩散的振动（radiating vibration）；② 一个独立漂浮的形态（floating form）。思想发生时，心智体会产生振动，并瞬间染上对应的颜色。
- **3D 方向**：这是整个系统的基础动画——一圈波纹向外扩散（`int`），同时一个形体脱离出去并漂走。

### 04 振动如何作用 How the Vibration Acts

- **要点**：振动越远越弱；强而清晰的思想传得更远。振动传的是思想的「性质」，不是「内容」。比如一个虔敬的念头，会在不同信仰的人心中唤起各自的虔敬。
- **3D 方向**：波只传递「频率 / 颜色」，接收者各自长出不同的形。这正好适合做多人共振的交互。

### 05 形态及其效应 The Form and its Effect（Fig. 1–7）

- **要点**：思想形态是由「精灵精华」（elemental essence）构成的临时活体。它可以飞向所想之人，可以停在思考者身边，也可以在空中漂浮。既然振动能生成形状，书中就用物理实验做类比：Chladni 声板上沙粒排成图案（Fig. 1–3），双摆绘图机画出曲线（Fig. 4–7）。这些曲线和后面的思想形态惊人地相似。
- **3D 方向**：这是「数学生成思想」的理论依据。新增 Chladni standing-wave 效果，把 `spi` 升级成 harmonograph（阻尼双摆）。

### 06 三条总原则 General Principles

- **要点**：品质决定颜色，性质决定形状，明确度决定轮廓清晰度（见上一节）。
- **3D 方向**：三个参数可以做成三个滑杆或三个 AI 输入维度。

### 07 颜色的意义 The Meaning of the Colours

- **要点**：黑色 = 仇恨与恶意；红色闪电 = 愤怒；粗红 = 情欲；褐灰 = 自私；铅灰 = 恐惧；绿 = 适应力和同情；玫瑰红 = 爱；黄 = 智性；蓝 = 虔敬；淡紫 = 灵性。此外，属灵性的思想会向上升到更高层面，带私欲的思想会向下沉，并裹上一层星光体物质。
- **3D 方向**：上升或下沉就是一个重力参数。光质感也分两类：高层面用发光、半透明、虹彩（`iri`），低层面用浑浊的烟雾（`vol`）。

### 08 思想形态的三种类型 Three Classes

- **要点**：① 呈现思考者自己的形象（如想念远方时，以自己的形象出现在那里）；② 呈现一个物体的形象（朋友、画、小说人物）；③ 自有形态，表达自身的品质。本书只画第三类。章中还讲到：善意和恶意的思想飞向他人，如果对方没有对应的物质可以吸附，就会反弹回发送者。
- **3D 方向**：「反弹」是很好的交互机制，可以做护盾和回旋。

### 09 爱 / 情感 Affection（Fig. 8–13）

- **要点**：同样是爱，明确度和自私程度不同，画面完全不同：
  - Fig. 8 模糊的纯爱：旋转的玫瑰红云
  - Fig. 9 模糊的自私之爱：深红里混着褐灰
  - Fig. 10 明确的爱：有方向的抛射体
  - Fig. 11 向外放射的爱：第一个有意生成的形态，从中心涌出如喷泉
  - Fig. 12 平安与庇护：祝福之念
  - Fig. 13 抓取的兽性之爱：浑浊的颜色加上弯钩
- **3D 方向**：一个「爱」的形态系统。用滑杆控制云 → 抛射体、纯 → 自私，画面连续变形。技术上用 `neb` + `vol` + SDF morph。

### 10 虔敬 Devotion（Fig. 14–17）

- **要点**：
  - Fig. 14：教堂里的模糊蓝云。在时髦的教堂里，会众头顶飘的反而是帽子、珠宝和马车的影像。
  - Fig. 15：向上冲的蓝色尖锥。
  - Fig. 17：Logos 的回应——无私的思想在更高层面打开一个通道，神性力量顺着通道倒灌下来。
  - Fig. 16：自我舍弃，淡蓝花苞。这里提到思想形态与贝壳、叶子、花的自然形态相似，并推测宇宙本身就是一个巨大的思想形态。
- **3D 方向**：Fig. 15 → Fig. 17 是最有戏剧性的一组：尖锥向上刺穿，天光倒灌下来（`god` + 粒子瀑布）。Fig. 16 适合做缓慢绽放的细分曲面花。

### 11 智性 Intellect（Fig. 18–19）

- **要点**：Fig. 18 是模糊的黄云，代表模糊的智性乐趣。黄色越浅、越亮，智性越无私。Fig. 19 是「想知道」的意图，展示了一个思想形态的生长过程，常伴随提问出现。
- **3D 方向**：做生长动画，形状从一点长出探索的弯钩，很适合和 AI 问答联动。

### 12 野心 Ambition（Fig. 20–21）

- **要点**：高尚的野心稳步飞向一个明确目标；自私的野心漂浮不定，伸出弯钩，想抓住目光所及的一切。
- **3D 方向**：两个橙色形体对照——一个向前推进，一个原地伸触手。

### 13 愤怒与嫉妒 Anger（Fig. 22–26）

- **要点**：
  - Fig. 22 杀意狂怒：从黑云中迸出的红光闪电。
  - Fig. 23 长期积压的愤怒：细长的匕首。
  - Fig. 24 爆发性愤怒：一次爆炸，中心是空的。
  - Fig. 25–26 嫉妒：褐绿色的蛇形，充满窥伺感。
- **3D 方向**：用 `arc` + `dis`。Fig. 24 的「中心已空」可以做得很有诗意——爆炸结束后，情绪已经不在了。

### 14 同情 Sympathy（Fig. 18A）

- **要点**：绿色的模糊云。这是一种泛泛的哀怜，尚未变成行动。
- **3D 方向**：与 Fig. 8、14、18 组成「四色模糊云」系列，可以做成同一个 shader 的四种参数。

### 15 恐惧 Fear（Fig. 27）

- **要点**：突如其来的惊吓——铅灰色的碎片向外喷射。最先喷出的碎片全是灰色，稍后的已经带上愤怒的红色。
- **3D 方向**：爆裂可以做成有时间顺序的粒子，颜色随喷出的先后从灰渐变到红。

### 16 贪欲 Greed（Fig. 28–29）

- **要点**：自私的贪婪伸出弯钩，甚至会透过橱窗玻璃去够商品。对酒的贪欲是更低的一种。
- **3D 方向**：弯钩和触手做成 IK 追踪鼠标，让观众感受到「被抓住」。

### 17 各种情境中的情绪 Various Emotions（Fig. 30–36）

- **要点**：七个真实场景。
  - 海难（Fig. 30）：三个人三种反应——恐惧爆裂、祈祷中勉强上升、果断的行动。
  - 首演之夜（Fig. 31）：女演员的野心和怕失败交织。
  - 赌徒（Fig. 32）：蒙特卡洛赌场里输家和赢家的思想。
  - 街头事故（Fig. 33）：同一种感受在不同人身上长成不同形态。
  - 葬礼（Fig. 34）：不懂死亡的人产生灰色下坠、缠住棺材的形态；懂得死亡的人产生带星的蓝粉彩色尖锥。
  - 遇见朋友（Fig. 35）：玫瑰色加绿色，向前伸展如拥抱。
  - 欣赏一幅画（Fig. 36）：黄色代表对技艺的赞叹，其他颜色代表对宗教题材的感动。
- **3D 方向**：最适合做「场景剧场」——同一个事件，多个人的思想同时浮现。Fig. 34 的葬礼对照和你《摧毀只是一瞬間》的主题最契合。

### 18 冥想中所见的形态 Forms Seen in Meditation（Fig. 37–47）

- **要点**：从这一章起，形态不再由外界引起，而是有意的冥想，所以形状规整、对称。
  - Fig. 37：对一切的同情与爱。
  - Fig. 38：希望拥抱一切。一条紫色细线反复绕圈，金光从内部透出，原图由机器绘制。
  - Fig. 39：向六方发送爱。圆形被六股思想流拉成内凹的六边形。
  - Fig. 40：宇宙秩序。两个交织的三角，分别代表灵与物质。
  - Fig. 41：Logos 显现于人。蓝色五角星外放金光。
  - Fig. 42 / 44：Logos 遍在一切。金球嵌在蓝色细线球里。
  - Fig. 45：另一人对同一思想的形态，产生波纹绸般的干涉纹。
  - Fig. 46：三重显现。中心强光，外面两圈织线。
  - Fig. 47：七重显现。七对羽翼状的蓝线。
  - Fig. 43：智性的仰望。黄色尖形，类似 Fig. 15。
- **3D 方向**：这是纯代码生成最强的一章。harmonograph 线球加内发光黄金核心；Fig. 45 的波纹绸纹就是 moiré / `int`。

### 19 助人的思想 Helpful Thoughts（Fig. 48–54）

- **要点**：一个远距传念实验。发送者 A 每天定时发出助人的思想，接收者 B 素描下所见。蓝色代表虔敬，黄色代表智性上的坚毅，玫瑰色代表关爱。发送者状态不好时，形态会碎成小球。
- **3D 方向**：天然的双人交互——一端发，另一端收，完整度取决于发送者的专注度。

### 20 音乐所建构的形态 Forms Built by Music（Plate M / G / W）

- **要点**：在教堂弹奏一曲管风琴，就会在教堂上空建起持续一两小时的音乐形态。
  - Mendelssohn（M）：小而精致，四条线对应四个声部。
  - Gounod（G）：空心球体，色块浓烈。
  - Wagner（W）：约 900 英尺高的钟形「山脉」。
- **3D 方向**：可以接 Web Audio，实时把音乐生成形态；也可以让观众自己弹。

### 21 结语 Conclusion

- **要点**：每一个声音、每一个念头都在不可见的世界里留下后果。知道这一点的人会有意识地思考。
- **3D 方向**：收尾把话筒交给观众——「你现在在想什么？」，由 AI 生成他的思想形态。

## 插图清单与素材现状

58 幅图里，你的实拍照片覆盖了 20 幅（其中 Fig. 4–7 原书就是黑白），另加卷首色表。扫描 PDF 是 1-bit 黑白，插图基本不可用。剩下 38 幅需要补彩色高清版。

| Fig. | 原名 | 章节 | 彩色素材 |
| --- | --- | --- | --- |
| 卷首 | Meaning of the Colours | 07 | 有（实拍） |
| 1–3 | Chladni's Sound Plate / Forms Produced in Sand | 05 | 缺 |
| 4–7 | Forms Produced by Pendulums | 05 | 有（黑白原版） |
| 8, 9 | Vague Pure / Vague Selfish Affection | 09 | 有 |
| 10–13 | Definite / Radiating Affection, Peace and Protection, Grasping Animal Affection | 09 | 缺 |
| 14, 16 | Vague Religious Feeling / Self-Renunciation | 10 | 有 |
| 15, 17 | Upward Rush of Devotion / Response to Devotion | 10 | 有 |
| 18, 19 | Vague Intellectual Pleasure / Intention to Know | 11 | 缺 |
| 20, 21 | High Ambition / Selfish Ambition | 12 | 有 |
| 22–26 | Murderous Rage, Sustained Anger, Explosive Anger, Watchful / Angry Jealousy | 13 | 缺 |
| 18A | Vague Sympathy | 14 | 缺 |
| 27 | Sudden Fright | 15 | 缺 |
| 28, 29 | Selfish Greed / Greed for Drink | 16 | 缺 |
| 30 | At a Shipwreck | 17 | 有 |
| 31–33 | On the First Night / The Gamblers / At a Street Accident | 17 | 缺 |
| 34 | At a Funeral | 17 | 有 |
| 35, 36 | On Meeting a Friend / Appreciation of a Picture | 17 | 缺 |
| 37–39 | Sympathy and Love for All / Aspiration to Enfold All / In the Six Directions | 18 | 缺 |
| 40, 41 | Cosmic Order / The Logos as Manifested in Man | 18 | 有 |
| 42–47 | Logos Pervading All, Another Conception, Threefold, Sevenfold, Intellectual Aspiration | 18 | 缺 |
| 48–50 | Helpful Thoughts | 19 | 有 |
| 51–54 | Helpful Thoughts | 19 | 缺 |
| M, G | Music of Mendelssohn / Gounod | 20 | 缺 |
| W | Music of Wagner | 20 | 有 |

## 缺口与下一步

- **原文精校**：OCR 初版每段大约有 1–3 处错字。Project Gutenberg 有这本书的干净全文（eBook #16269），但当前工作环境被拦截。在 claude.ai Settings > Capabilities 里放行 `gutenberg.org` 后，可以直接替换成干净版。
- **彩色插图**：缺的 38 幅，可以你继续翻拍实体书（平铺、正拍、自然光），或者找 Wikimedia Commons 上的 public-domain 扫描。
- **词库 / AI 数据库**：把每幅图结构化成「情绪 / 颜色 / 形态 / 明确度 / 运动方向」五个字段，就是随机生成和 AI 解读的种子数据。
- **第一个原型建议**：第 10 章「虔敬」的 Fig. 14 → 15 → 17：模糊的蓝云凝聚成尖锥，再引来天光倒灌。三幅都有彩色实拍，而且一组画面就演示了「明确度决定轮廓」和「无私即向上」。
