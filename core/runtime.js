// Awakenology 代码素材生成库 · runtime
// 协议：每个 scene 调用 Scene.define({duration, draw(t)}) ，渲染器只通过 window.seek(t) 驱动。
// 规则：禁止 requestAnimationFrame 时钟 / Date / CSS transition 驱动画面；随机数一律 Scene.rng(seed)。
(function () {
  const S = {};

  // ---------- 确定性随机 ----------
  S.rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  // ---------- 时间轴工具 ----------
  S.clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  S.lerp = (a, b, k) => a + (b - a) * k;
  S.range = (t, a, b) => S.clamp((t - a) / (b - a)); // t 在 [a,b] 内映射到 0..1
  S.ease = {
    inOut: (k) => k * k * (3 - 2 * k),
    out: (k) => 1 - Math.pow(1 - k, 3),
    in: (k) => k * k * k,
    expo: (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k < 0.5 ? Math.pow(2, 20 * k - 10) / 2 : (2 - Math.pow(2, -20 * k + 10)) / 2),
  };

  // ---------- 全屏 shader 层 ----------
  // frag 里可用 uniform: uRes, uTime, uLoop(0..1 循环相位), 以及自定义 uniforms
  S.shader = function (canvas, frag, extraUniforms = {}) {
    const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false, premultipliedAlpha: false });
    if (!gl) throw new Error('WebGL2 unavailable');
    const vs = `#version 300 es
    in vec2 p; void main(){ gl_Position = vec4(p,0.,1.); }`;
    const fsHead = `#version 300 es
    precision highp float;
    uniform vec2 uRes; uniform float uTime; uniform float uLoop;
    out vec4 fragColor;
    #define TAU 6.28318530718
    `;
    const mk = (type, src) => {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, mk(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, mk(gl.FRAGMENT_SHADER, fsHead + frag));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = (n) => gl.getUniformLocation(prog, n);
    return {
      gl,
      draw(time, loop, uniforms = {}) {
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(U('uRes'), canvas.width, canvas.height);
        gl.uniform1f(U('uTime'), time);
        gl.uniform1f(U('uLoop'), loop);
        const all = Object.assign({}, extraUniforms, uniforms);
        for (const k in all) {
          const v = all[k];
          if (typeof v === 'number') gl.uniform1f(U(k), v);
          else if (v.length === 2) gl.uniform2fv(U(k), v);
          else if (v.length === 3) gl.uniform3fv(U(k), v);
          else if (v.length === 4) gl.uniform4fv(U(k), v);
        }
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.finish();
      },
    };
  };

  // ---------- 场景注册 ----------
  S.define = function (cfg) {
    S.cfg = cfg;
    window.__scene = { duration: cfg.duration, fps: cfg.fps || 30, width: cfg.width || 1920, height: cfg.height || 1080 };
    window.seek = async function (t) {
      await cfg.draw(t);
      return true;
    };
    // 预览模式：直接打开 html 时用滑块/播放（仅预览，渲染时不用）
    if (!navigator.webdriver && !location.search.includes('render')) {
      const bar = document.createElement('input');
      bar.type = 'range'; bar.min = 0; bar.max = cfg.duration; bar.step = 0.001; bar.value = 0;
      bar.style.cssText = 'position:fixed;left:2%;bottom:12px;width:96%;z-index:99;opacity:.5';
      document.body.appendChild(bar);
      let playing = true, t0 = performance.now(), off = 0;
      bar.oninput = () => { playing = false; window.seek(+bar.value); };
      bar.ondblclick = () => { playing = true; off = +bar.value; t0 = performance.now(); };
      const tick = () => {
        if (playing) { const t = (off + (performance.now() - t0) / 1000) % cfg.duration; bar.value = t; window.seek(t); }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  };

  window.Scene = S;
})();
