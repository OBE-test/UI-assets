# E1 · EarthGlow v001 — 序言地球辉光

一颗地球、一套物理参数；S1/S2/S3/S5 只改机位和 `sunDir`。参考：4 张 Pinterest 图（R1 火箭掠地平线、R2 ISS 分层地平线、R3 夜面、R4 日食光环）。

- `E1_EarthGlow_v001.js` — 元素模块（手册第 2 节规范：`create(opts) → {object3d, params, update(t,p), dispose}`）
- `shared.js` — 主场景共享工具（色板、rng、NOISE）
- `preview_E1.html` — 预览：浏览器打开 = 交互（拖拽旋转、S1/S2/S3/S5/S5alt、tint/厚度/增益/远晕/云 滑杆，`#S2` 锚点）；Playwright 打开 = `seek(t)` 渲染（20 s，4 镜×5 s）
- `shoot.py` 出四镜静帧；`video.py` 出 MP4（three.js 从本地 node_modules 注入：`npm i three@0.170.0`）

技术：单球壳 BackSide 解析求交 → 完美轮廓；Rayleigh λ⁻⁴ + Mie HG 单次散射，向切点加密采样（24×6 步，GPU；无 GPU 可传 `{steps:12,sunSteps:4}`）；太阳衰减自然泛红；tint 只降偏冷成分的饱和度（C 方案 = 0.5）。城市光默认 0（一万年前）。

交互预览：https://claude.ai/artifact/93ifbtHnYeSCrJ4KJFX6sK

## v002（2026-11-24）— 地球特有的蓝（参考 R3 夜面图）
- 新增：臭氧吸收（Chappuis 带）、多次散射「天空蓝」近似（`multiScatter`）、月光照亮的夜面云（`moonDir` / `moonIntensity`）、域扭曲云层、成簇城市光（`cityAmount`，默认 0）、蓝色远晕（`haloBlue`）
- 三个版本（`preview_E1_v002.html` 的 VARIANTS，浏览器里有切换按钮）：A 真实蓝 · B 深蓝 · C 蓝+暖芯
- 新增 REF 机位：复刻 R3 构图（高处俯看夜面，地球边缘竖在左侧）
- 对比总表：`shots/E1_v002_三版本对比.jpg`
- 交互预览：https://claude.ai/artifact/UdCUuuLm49EMvbNbLqgkHa

## v004（2026-11-25）— 纹理重做（基于主对话的 v003）
- 保留 v003：夜面边缘光带（lineGain）、夜面大气纱（veil）
- 梯度噪声（quintic Perlin）替代 value noise；按像素尺寸自动淡出高频（fwidth LOD）→ 近看锐利、远看不闪
- 云：大尺度云系 + 5 个气旋涡旋 + 纬向拉伸 + 积云团块 + 卷云丝；`cloudCover` 云量、`cloudSharp` 边缘锐度、`cloudRelief` 明暗起伏（沿光照方向差分）
- 大陆：域扭曲梯度 fbm，海岸线清晰；`glint` 海面月光 / 日光高光
- 多次散射在地表方向压到 0.35，日面不再被蓝雾盖住
- 新机位：TEX（低空看夜面云）、DAY（日面近景）
- 对比：`shots/E1_v004_前后对比.jpg`；交互预览：https://claude.ai/artifact/MrspgKBE6v2MCM7w7gNETT
