# E1 · EarthGlow v001 — 序言地球辉光

一颗地球、一套物理参数；S1/S2/S3/S5 只改机位和 `sunDir`。参考：4 张 Pinterest 图（R1 火箭掠地平线、R2 ISS 分层地平线、R3 夜面、R4 日食光环）。

- `E1_EarthGlow_v001.js` — 元素模块（手册第 2 节规范：`create(opts) → {object3d, params, update(t,p), dispose}`）
- `shared.js` — 主场景共享工具（色板、rng、NOISE）
- `preview_E1.html` — 预览：浏览器打开 = 交互（拖拽旋转、S1/S2/S3/S5/S5alt、tint/厚度/增益/远晕/云 滑杆，`#S2` 锚点）；Playwright 打开 = `seek(t)` 渲染（20 s，4 镜×5 s）
- `shoot.py` 出四镜静帧；`video.py` 出 MP4（three.js 从本地 node_modules 注入：`npm i three@0.170.0`）

技术：单球壳 BackSide 解析求交 → 完美轮廓；Rayleigh λ⁻⁴ + Mie HG 单次散射，向切点加密采样（24×6 步，GPU；无 GPU 可传 `{steps:12,sunSteps:4}`）；太阳衰减自然泛红；tint 只降偏冷成分的饱和度（C 方案 = 0.5）。城市光默认 0（一万年前）。

交互预览：https://claude.ai/artifact/93ifbtHnYeSCrJ4KJFX6sK
