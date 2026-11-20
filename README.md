# awakenology-assets · 代码素材生成库

awakenology.space 各项目（《摧毀只是一瞬間》画廊 / 序言、P2 多次元複合體、Thought-Forms）共用的**代码生成素材库**。

所有素材都是代码，同一份源码有两种用法：
- **做网页**：直接嵌入。`<iframe src="effects/scene.html?fx=neb">`，或者把 `effects/effects.js` 里的 GLSL 拷进 Three.js。
- **做视频**：用 `video/render.py` 逐帧渲染成 MP4 / WebM。

总索引是 `catalog.json`。打开 `index.html` 可以按缩略图浏览全部素材。

```bash
python3 -m http.server 8000      # 然后打开 http://localhost:8000
```

## 结构

```
catalog.json            总索引：id、类型、名称、用在哪、提示词、路径、缩略图、渲染命令
index.html              素材浏览页（读 catalog.json）
core/runtime.js         seek(t) 协议、种子随机、时间轴/缓动、全屏 shader 工具
effects/
  effects.js            光学渲染效果库 · 22 个效果的唯一数据源（GLSL + 提示词 + 用途）
  scene.html?fx=<代号>   通用播放器：任何效果都能嵌网页或渲视频
  thumbs/<代号>.jpg
scenes/<名字>/scene.html  为具体项目定制的视频场景（每个都暴露 seek(t)）
prototypes/<名字>/       从 claude.ai Artifact 归档的网页原型
docs/                   项目文档（Markdown）
video/
  render.py             逐帧渲染 → ffmpeg
  thumbs.py             重新生成效果缩略图
  build_catalog.py      重建 catalog.json
  STORYBOARD_TEMPLATE.md  分镜模板
```

## 渲染视频

依赖：Python 3 + `pip install playwright` + Chrome/Chromium + ffmpeg。

```bash
python3 video/render.py scenes/p2-netbody/scene.html --stills 0.2,0.5,0.8   # 3 张关键帧定风格
python3 video/render.py scenes/p2-netbody/scene.html --draft                # 960×540 @15fps 草稿
python3 video/render.py scenes/p2-netbody/scene.html                        # 正式 1920×1080 @30fps
python3 video/render.py scenes/gallery-bubbles/scene.html --webm            # 加出 WebM（网页背景用）
python3 video/render.py effects/scene.html --q "fx=aur&dur=12"              # 效果库任一效果 → 视频
python3 video/render.py scenes/x/scene.html --w 3840 --h 2160               # 4K
```

输出在 `out/`（不进 git）。最终成片放 GitHub Releases，仓库只放代码和缩略图。

## 写新场景的规则（seek 协议）

1. 一个 `scene.html`，引入 `core/runtime.js`，调用 `Scene.define({duration, fps, draw(t)})`。
2. 画面**只由 t 决定**：不准用 `requestAnimationFrame` 计时、`Date`、CSS transition / animation 驱动画面。
3. 随机数一律用 `Scene.rng(seed)`，保证每次渲出来一模一样。
4. 循环素材：所有周期都用 `uLoop`（0→1）的整数倍，首尾帧必须一致。
5. 直接双击打开 html 是预览模式（底部有时间滑块）；`?render=1` 是渲染模式。

做片子的流程：先回答 `STORYBOARD_TEMPLATE.md` 里的问题 → 写分镜表并确认 → 渲 3 张关键帧定风格 → 草稿 → 正式渲染。

## 效果代号速查

| 类别 | 代号 |
|---|---|
| 形体 | `body` SDF 光体人形 · `jul` Julia · `mb` Mandelbulb · `gyr` Gyroid |
| 光学 | `iri` 薄膜虹彩 · `god` 体积光 · `cau` 焦散 · `pri` 棱镜 · `gla` 玻璃色散 · `int` 干涉 · `bh` 引力透镜 · `rt` 光追 |
| 结构线 | `net` 网光体网络 · `lor` 奇异吸引子 · `spi` 参数曲线 |
| 氛围 | `flow` 粒子流场 · `neb` 星云 · `vol` 体积光体 · `aur` 极光 · `arc` 电弧 |
| 破坏 / 维度 | `dis` 溶解碎裂 · `tes` 四维超立方体 |

## 新增素材

1. 新效果：在 `effects/effects.js` 的 `FX` 数组里加一项，然后跑 `python3 video/thumbs.py`。
2. 新场景：新建 `scenes/<名字>/scene.html`，在 `video/build_catalog.py` 的 `SCENES` 里登记。
3. 跑 `python3 video/build_catalog.py`，提交。

## 相关仓库

- [`OBEplayer/awakenology-gallery`](https://github.com/OBEplayer/awakenology-gallery)：网站页面本体（P1 展厅、P2 多次元複合體、Blender 管线）
