// E4_2_Body_v001.js — 《摧毀只是一瞬間》序言 · E4.2 身体
// ─────────────────────────────────────────────────────────────────────────────
// 一个中性人体（1.8 m，无五官、性别特征），一个 stage 参数 0 → 4 连续推进：
//   K1 凝聚  stage 0–1 ：胸口光点 → 光尘向外扩散凝成人形，一侧光尘飘散，身后光环（参考 1 2）
//   K2 转变  stage 1–2 ：光谱能量从头到脚贯穿，胸口爆发色散光刃（参考 3 4）
//   K3 显形  stage 2–3 ：光尘收拢成半透明外壳，脊柱主干亮起，线网从胸口 / 脊柱向全身生长（参考 5 6）
//   K4 过场  stage 3–4 ：身体变成流动光纤，胸口向两侧长出光枝（参考 7）
// 所有画面只由 (t, params) 决定；随机数全部固定 seed。输出线性 HDR，不做 tone mapping / bloom。
// 坐标：米。脚底 y=0，正面朝 −Z，胸口光 (0, 1.31, −0.015)。
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js';
import { NOISE, rng, clamp, lerp, sstep } from './shared.js';

export const DEFAULTS = {
  stage: 0,               // 0–4，见文件头
  hue: 0,                 // 0 = 暖金（参考 1）· 1 = 电光蓝（参考 2）；中间值混合
  gain: 1,                // 整体亮度
  particleGain: 1,        // 光尘
  particleSize: 1,        // 光尘大小倍率
  drift: 1,               // 一侧光尘飘散强度（参考 1）
  ringGain: 1,            // 身后光环
  columnGain: 1,          // 光谱光柱（参考 3）
  burstGain: 1,           // 胸口色散光刃（参考 4）
  shellGain: 1,           // 半透明外壳（参考 5 6）
  netGain: 1,             // 内部线网（脊柱 + 分枝）
  fiberGain: 1,           // 流动光纤（参考 7）
  limbGain: 1,            // 胸口长出的光枝（参考 7）
  chestGlow: 1,           // 胸口灵魂光
  seed: 7,
  // ── 直接指定（复刻单张参考图时用）：不为 null 时覆盖 stage 推算出的值
  form: null, condense: null, ring: null, colPhase: null, column: null, burst: null,
  shell: null, grow: null, net: null, fiber: null, limbGrow: null, limb: null, particles: null,
  rimOnly: 0,             // 0–1：光尘只留轮廓（参考 3）
  silk: 1,                // 外壳丝绸烟雾纹强度（参考 5）
  shellTint: null,        // 外壳颜色（THREE.Color），null = 跟随 hue
  netCyan: null, netWarm: null,  // 线网两种颜色
  netDensity: 1,          // 创建时：线网密度倍率（参考 6 用 2–3）
  fiberCount: 900,        // 创建时：光纤条数
  chestSize: 1,           // 胸口光大小
};

const CHEST = new THREE.Vector3(0, 1.31, -0.015);

// ───────────────────────── 中性人体 SDF（与 prologue-scene-v02.js 一致）
function sdCap(px, py, pz, ax, ay, az, bx, by, bz, r) {
  const pax = px - ax, pay = py - ay, paz = pz - az, bax = bx - ax, bay = by - ay, baz = bz - az;
  const h = clamp((pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz));
  return Math.hypot(pax - bax * h, pay - bay * h, paz - baz * h) - r;
}
function sdEll(px, py, pz, cx, cy, cz, rx, ry, rz) {
  const x = px - cx, y = py - cy, z = pz - cz;
  const k0 = Math.hypot(x / rx, y / ry, z / rz), k1 = Math.hypot(x / (rx * rx), y / (ry * ry), z / (rz * rz));
  return k1 === 0 ? -Math.min(rx, ry, rz) : k0 * (k0 - 1) / k1;
}
function smin(a, b, k) { const h = clamp(0.5 + 0.5 * (b - a) / k); return lerp(b, a, h) - k * h * (1 - h); }
export function bodySDF(x, y, z) {
  let d = sdEll(x, y, z, 0, 1.672, 0.004, .091, .117, .102);
  d = smin(d, sdCap(x, y, z, 0, 1.47, 0, 0, 1.6, 0.004, .047), .035);
  let t = sdEll(x, y, z, 0, 1.30, 0, .165, .19, .098);
  t = smin(t, sdEll(x, y, z, 0, 1.06, 0, .127, .17, .084), .07);
  t = smin(t, sdEll(x, y, z, 0, 0.93, 0, .157, .115, .097), .06);
  t = smin(t, sdCap(x, y, z, -.168, 1.415, 0, .168, 1.415, 0, .057), .05);
  d = smin(d, t, .03);
  for (const s of [-1, 1]) {
    let a = sdCap(x, y, z, s * .195, 1.40, 0, s * .232, 1.12, .012, .046);
    a = smin(a, sdCap(x, y, z, s * .232, 1.12, .012, s * .252, .875, -.018, .036), .02);
    a = smin(a, sdEll(x, y, z, s * .257, .80, -.022, .027, .074, .044), .02);
    d = smin(d, a, .035);
    let l = sdCap(x, y, z, s * .087, .90, 0, s * .097, .50, .006, .074);
    l = smin(l, sdCap(x, y, z, s * .097, .50, .006, s * .102, .085, .02, .049), .03);
    l = smin(l, sdCap(x, y, z, s * .102, .045, .03, s * .107, .03, -.085, .037), .025);
    d = smin(d, l, .04);
  }
  return d;
}
const grad = (p, e = 0.002) => new THREE.Vector3(
  bodySDF(p.x + e, p.y, p.z) - bodySDF(p.x - e, p.y, p.z),
  bodySDF(p.x, p.y + e, p.z) - bodySDF(p.x, p.y - e, p.z),
  bodySDF(p.x, p.y, p.z + e) - bodySDF(p.x, p.y, p.z - e)).normalize();

function buildBodyMesh(res) {
  const mc = new MarchingCubes(res, new THREE.MeshBasicMaterial(), false, false, 600000);
  mc.isolation = 0;
  const S = 0.96, cy = 0.92, h = res / 2;
  for (let z = 0; z < res; z++) for (let y = 0; y < res; y++) for (let x = 0; x < res; x++)
    mc.field[res * res * z + res * y + x] = -bodySDF((x - h) / h * S, (y - h) / h * S + cy, (z - h) / h * S);
  mc.update();
  const n = mc.count, pos = mc.positionArray.slice(0, n * 3), nor = mc.normalArray.slice(0, n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] *= S; pos[i * 3 + 1] = pos[i * 3 + 1] * S + cy; pos[i * 3 + 2] *= S;
    const l = Math.hypot(nor[i * 3], nor[i * 3 + 1], nor[i * 3 + 2]) || 1;
    nor[i * 3] /= l; nor[i * 3 + 1] /= l; nor[i * 3 + 2] /= l;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.computeBoundingSphere();
  return g;
}

// 在网格表面按面积均匀采样
function sampleSurface(geo, n, r) {
  const P = geo.attributes.position.array, N = geo.attributes.normal.array, tri = P.length / 9;
  const cum = new Float32Array(tri); let acc = 0;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < tri; i++) {
    a.fromArray(P, i * 9); b.fromArray(P, i * 9 + 3); c.fromArray(P, i * 9 + 6);
    acc += b.sub(a).cross(c.sub(a)).length() * 0.5; cum[i] = acc;
  }
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
  for (let k = 0; k < n; k++) {
    const u = r() * acc; let lo = 0, hi = tri - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < u) lo = m + 1; else hi = m; }
    let s = r(), t = r(); if (s + t > 1) { s = 1 - s; t = 1 - t; }
    for (let j = 0; j < 3; j++) {
      pos[k * 3 + j] = P[lo * 9 + j] * (1 - s - t) + P[lo * 9 + 3 + j] * s + P[lo * 9 + 6 + j] * t;
      nor[k * 3 + j] = N[lo * 9 + j] * (1 - s - t) + N[lo * 9 + 3 + j] * s + N[lo * 9 + 6 + j] * t;
    }
  }
  return { pos, nor };
}

// ───────────────────────── 骨架血管 / 神经网络（参考 5 6）
// 沿人体骨架链生成：每条线在肢体截面内平滑偏移、缠绕，再长出逐渐变细的分枝 → 顺着身体纵向流动
// 线段格式：[p0, p1, order(离胸口的路径长度 0..1), gen, warm, spine]
const SKEL = (() => {
  const P = (x, y, z, r) => ({ p: new THREE.Vector3(x, y, z), r });
  const chains = [
    { name: 'trunk', pts: [P(0, 0.90, 0, .12), P(0, 1.06, 0, .11), P(0, 1.31, 0, .13), P(0, 1.47, 0, .045), P(0, 1.60, 0, .07), P(0, 1.70, 0, .07)], root: 2 },
  ];
  for (const s of [-1, 1]) {
    chains.push({ name: 'arm', pts: [P(0, 1.36, 0, .08), P(s * .19, 1.41, 0, .05), P(s * .232, 1.12, .012, .04), P(s * .252, .875, -.018, .03), P(s * .257, .78, -.022, .022)], root: 0 });
    chains.push({ name: 'leg', pts: [P(s * .05, 1.02, 0, .09), P(s * .087, .90, 0, .07), P(s * .097, .50, .006, .05), P(s * .102, .085, .02, .04), P(s * .107, .03, -.085, .03)], root: 0 });
  }
  // 每条链：弧长参数化 → 取点 / 切线 / 半径
  for (const c of chains) {
    c.len = [0]; for (let i = 1; i < c.pts.length; i++) c.len.push(c.len[i - 1] + c.pts[i].p.distanceTo(c.pts[i - 1].p));
    c.L = c.len[c.len.length - 1];
    c.at = (u) => {   // u: 0..L
      let i = 1; while (i < c.len.length - 1 && c.len[i] < u) i++;
      const k = clamp((u - c.len[i - 1]) / (c.len[i] - c.len[i - 1]));
      const a = c.pts[i - 1], b = c.pts[i];
      const t = b.p.clone().sub(a.p).normalize();
      return { p: a.p.clone().lerp(b.p, k), t, r: lerp(a.r, b.r, k) };
    };
  }
  return chains;
})();
const n1 = (x, s) => Math.sin(x * 1.7 + s) * 0.5 + Math.sin(x * 3.1 + s * 2.3) * 0.3 + Math.sin(x * 7.3 + s * 0.7) * 0.2;   // 平滑 1D 噪声

function growNetwork(r, dens = 1) {
  const segs = [];
  const frame = (t) => { const a = Math.abs(t.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0); const b1 = new THREE.Vector3().crossVectors(t, a).normalize(); return [b1, new THREE.Vector3().crossVectors(t, b1).normalize()]; };
  const vessel = (c, u0, u1, th0, rad, gen, warm, orderBase, spine) => {
    u1 = Math.min(u1, c.L - 0.03); u0 = Math.max(u0, 0.03);
    const steps = Math.max(4, Math.floor((u1 - u0) / 0.012)); let prev = null;
    const sd = r() * 100, amp = 0.8 + r() * 1.2, fq = 6 + r() * 8;
    for (let i = 0; i <= steps; i++) {
      const u = clamp(lerp(u0, u1, i / steps), 0, c.L - 1e-3), f = c.at(u), [b1, b2] = frame(f.t);
      const th = th0 + n1(u * fq, sd) * amp;
      const rr = f.r * rad * (0.75 + 0.25 * n1(u * fq * 1.7, sd + 5));
      const p = f.p.clone().addScaledVector(b1, Math.cos(th) * rr).addScaledVector(b2, Math.sin(th) * rr);
      // 保证在身体里面
      const d = bodySDF(p.x, p.y, p.z); if (d > -0.004) p.addScaledVector(grad(p), -(d + 0.006));
      const ord = clamp(orderBase + Math.abs(u - c.len[c.root]) / 1.4);
      if (prev) segs.push([prev, p, ord, gen, warm, spine]);
      prev = p;
      // 分枝：从主干斜出，逐渐靠近表面、变细
      if (gen < 3 && i > 2 && r() < 0.035 * dens) {
        const du = (r() < 0.5 ? 1 : -1) * (0.06 + r() * 0.18) * (gen === 0 ? 1.4 : 1);
        branch(c, u, du, th, rr / Math.max(f.r, 1e-3), gen + 1, warm, ord);
      }
    }
  };
  const branch = (c, u, du, th, rad0, gen, warm, ord) => {
    const steps = 10 + Math.floor(r() * 10); let prev = null;
    const dth = (r() - .5) * 2.4, sd = r() * 50;
    for (let i = 0; i <= steps; i++) {
      const k = i / steps, uraw = u + du * k; if (uraw < 0.005 || uraw > c.L - 0.005) break;   // 走到链的尽头就停（否则原地绕圈）
      const uu = uraw, f = c.at(uu), [b1, b2] = frame(f.t);
      const t2 = th + dth * k + n1(k * 4, sd) * 0.4;
      const rr = f.r * lerp(rad0, 0.95, k);
      const p = f.p.clone().addScaledVector(b1, Math.cos(t2) * rr).addScaledVector(b2, Math.sin(t2) * rr);
      const d = bodySDF(p.x, p.y, p.z); if (d > -0.003) p.addScaledVector(grad(p), -(d + 0.004));
      if (prev) segs.push([prev, p, clamp(ord + k * 0.15), gen, warm, 0]);
      prev = p;
      if (gen < 3 && i > 3 && r() < 0.05 * dens) branch(c, uu, du * 0.6, t2, rr / Math.max(f.r, 1e-3), gen + 1, warm, ord + k * 0.15);
    }
  };
  const trunk = SKEL[0];
  // 脊柱：背侧一条最亮的主干
  { const steps = 70; let prev = null;
    for (let i = 0; i <= steps; i++) { const u = lerp(0, trunk.L, i / steps), f = trunk.at(u);
      const p = f.p.clone().add(new THREE.Vector3(0, 0, f.p.y > 1.5 ? 0.02 : f.r * 0.62));
      if (prev) segs.push([prev, p, clamp(Math.abs(u - trunk.len[2]) / 1.4 * 0.6), 0, 0, 1]); prev = p; } }
  // 主血管 / 神经：每条链若干条，绕截面分布
  for (const c of SKEL) {
    const n = Math.round((c.name === 'trunk' ? 10 : c.name === 'arm' ? 5 : 6) * dens);
    for (let k = 0; k < n; k++) {
      const warm = r() < 0.3 ? 1 : 0;
      vessel(c, 0, c.L, (k / n) * Math.PI * 2 + r(), 0.45 + r() * 0.45, 0, warm, c.name === 'trunk' ? 0 : 0.15, 0);
    }
  }
  // 头部：细密的环绕线（脑部的光）
  for (let k = 0; k < Math.round(6 * dens); k++) vessel(trunk, trunk.len[4] - 0.05, trunk.L - 0.015, r() * 6.28, 0.5 + r() * 0.4, 1, 0, 0.35, 0);
  return segs;
}

// 表面流线（参考 7 的光纤）
function traceFibers(r, n, steps) {
  const segs = []; const tmp = new THREE.Vector3();
  for (let k = 0; k < n; k++) {
    // 随机起点：先随机取点再投影到表面
    let p = new THREE.Vector3((r() - .5) * 0.6, r() * 1.75 + 0.03, (r() - .5) * 0.25);
    for (let j = 0; j < 6; j++) { const s = bodySDF(p.x, p.y, p.z); p.addScaledVector(grad(p), -s); }
    const warm = r() < 0.3 ? 1 : 0, ph = r();
    let up = r() < 0.5 ? 1 : -1;
    let d = new THREE.Vector3(0, up, 0);
    for (let i = 0; i < steps; i++) {
      const g = grad(p);
      // 流场：以竖直为主，叠加一点绕身体的旋转和噪声
      tmp.set(Math.sin(p.y * 7 + k) * 0.6 + (r() - .5) * 0.5, up, Math.cos(p.y * 5 + k * 1.3) * 0.4 + (r() - .5) * 0.5);
      d.lerp(tmp.normalize(), 0.25);
      d.addScaledVector(g, -d.dot(g)).normalize();                        // 投影到切平面
      const q = p.clone().addScaledVector(d, 0.013);
      const s = bodySDF(q.x, q.y, q.z); q.addScaledVector(grad(q), -(s + 0.004));   // 贴着表面略往里
      if (q.y < 0.02 || q.y > 1.79) break;
      segs.push([p, q, i / steps, warm, ph]);
      p = q;
    }
  }
  return segs;
}

// 胸口长出的光枝（参考 7）：向两侧、略向上分叉的树
function growLimbs(r) {
  const segs = [];
  const branch = (p, d, len, depth, dist) => {
    const n = Math.max(3, Math.floor(len / 0.02)); let q0 = p.clone();
    const dd = d.clone();
    for (let i = 0; i < n; i++) {
      dd.add(new THREE.Vector3(r() - .5, (r() - .5) * 0.8, (r() - .5) * 0.6).multiplyScalar(0.35)).normalize();
      const q1 = q0.clone().addScaledVector(dd, len / n);
      segs.push([q0, q1, dist + i / n * 0.25, depth]);
      q0 = q1;
      if (depth < 5 && i > n * 0.35 && r() < 0.16) {
        const nd = dd.clone().add(new THREE.Vector3(r() - .5, r() * 0.8, r() - .5).multiplyScalar(1.2)).normalize();
        branch(q0, nd, len * (0.45 + r() * 0.25), depth + 1, dist + i / n * 0.25);
      }
    }
  };
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++)
    branch(CHEST.clone().add(new THREE.Vector3(s * 0.05, 0.03 * k, 0)), new THREE.Vector3(s, 0.35 + 0.25 * k, -0.15 + r() * 0.1), 0.55 + r() * 0.25, 1, 0);
  return segs;
}

function segGeometry(segs, attrs) {
  const n = segs.length * 2, pos = new Float32Array(n * 3);
  const A = attrs.map(a => new Float32Array(n * a.size));
  segs.forEach((s, i) => {
    pos.set([s[0].x, s[0].y, s[0].z, s[1].x, s[1].y, s[1].z], i * 6);
    attrs.forEach((a, j) => { for (let e = 0; e < 2; e++) A[j].set(a.get(s, e), (i * 2 + e) * a.size); });
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  attrs.forEach((a, j) => g.setAttribute(a.name, new THREE.BufferAttribute(A[j], a.size)));
  return g;
}

const ADD = { blending: THREE.AdditiveBlending, transparent: true, depthWrite: false };
const PAL = /* glsl */`
uniform float uHue;
vec3 palCore(){ return mix(vec3(1.00,0.78,0.48), vec3(0.55,0.78,1.00), uHue); }
vec3 palBody(){ return mix(vec3(1.00,0.52,0.16), vec3(0.16,0.34,1.00), uHue); }
vec3 spectral(float x){ return clamp(abs(fract(x+vec3(0.,.333,.667))*6.-3.)-1.,0.,1.); }
`;

export function create(opts = {}) {
  const params = { ...DEFAULTS, ...opts };
  const r = rng(params.seed);
  const object3d = new THREE.Group();
  const U = { uT: { value: 0 }, uHue: { value: params.hue }, uChest: { value: CHEST.clone() } };

  // ── 身体网格
  const bodyGeo = buildBodyMesh(120);

  // ── 光尘
  const NP = 150000;
  const surf = sampleSurface(bodyGeo, NP, r);
  const pr = new Float32Array(NP * 4); for (let i = 0; i < NP * 4; i++) pr[i] = r();
  // 15% 放进身体内部（沿法线往里），让人形有「实心」的光尘密度
  for (let i = 0; i < NP; i++) if (pr[i * 4 + 3] < 0.15) for (let j = 0; j < 3; j++) surf.pos[i * 3 + j] -= surf.nor[i * 3 + j] * (0.01 + pr[i * 4] * 0.05);
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(surf.pos, 3));
  pg.setAttribute('aNor', new THREE.BufferAttribute(surf.nor, 3));
  pg.setAttribute('aR', new THREE.BufferAttribute(pr, 4));
  const pU = { ...U, uForm: { value: 0 }, uDrift: { value: 1 }, uGain: { value: 1 }, uSize: { value: 1 }, uPx: { value: 1000 }, uCondense: { value: 0 }, uRim: { value: 0 } };
  const particles = new THREE.Points(pg, new THREE.ShaderMaterial({
    uniforms: pU, ...ADD,
    vertexShader: NOISE + PAL + /* glsl */`
      attribute vec3 aNor; attribute vec4 aR;
      uniform float uT, uForm, uDrift, uGain, uSize, uPx, uCondense, uRim; uniform vec3 uChest;
      varying vec3 vCol; varying float vA;
      void main(){
        vec3 S = position;
        // 凝聚：从胸口光点出发，按随机延迟流向身体表面
        float k = smoothstep(aR.x*0.55, aR.x*0.55+0.45, uForm);
        vec3 start = uChest + (vec3(aR.y,aR.z,aR.w)-.5)*0.06;
        vec3 p = mix(start, S, k*k*(3.-2.*k));
        // 一侧飘散（参考 1）：右侧、上半身更多，周期性离开 → 淡出 → 回到原位
        float side = smoothstep(0.02, -0.22, S.x) * smoothstep(0.75, 1.25, S.y);   // 正面看是画面右侧
        float pick = step(aR.w, 0.55) * side * min(uDrift, 1.);
        float ph = fract(aR.y + uT*0.06);
        vec3 flow = vec3(-0.55, 0.22, -0.08) + 0.35*vec3(vnoise(S*3.+uT*.1)-.5, vnoise(S*3.+7.)-.5, vnoise(S*3.+13.)-.5);
        p += flow * ph * (0.4 + 1.4*ph) * max(uDrift, 1.) * pick * k;
        // 收拢（K3）：光尘贴回表面、变少
        p = mix(p, S - aNor*0.004, uCondense);
        vec4 mv = modelViewMatrix*vec4(p,1.);
        gl_Position = projectionMatrix*mv;
        float px = uSize * (0.8 + aR.z*1.4) * 0.0045 * uPx / max(-mv.z, 0.05);
        gl_PointSize = clamp(px, 1.0, 9.0);
        // 亮度：胸口最亮，往四肢变暗（参考 1 2）
        float dc = length(S - uChest);
        float glow = 0.3 + 1.2*exp(-dc*dc*22.) + 0.45*exp(-dc*dc*4.);
        float tw = 0.75 + 0.25*sin(uT*2.3 + aR.x*40.);
        vec3 Vd = normalize(cameraPosition - (modelMatrix*vec4(S,1.)).xyz);
        float rim = 1. - abs(dot(normalize(aNor), Vd));
        float rimK = mix(1., smoothstep(0.55, 0.92, rim)*1.6, uRim);
        vA = rimK * (1. - pick*ph*ph) * (1. - uCondense*0.85*step(0.25, aR.w)) * (0.15 + 0.85*k);
        vCol = mix(palBody(), palCore(), clamp(exp(-dc*dc*5.)*1.2,0.,1.)) * glow * tw * uGain * 0.045 * (px < 1.2 ? px/1.2 : 1.);
      }`,
    fragmentShader: /* glsl */`
      varying vec3 vCol; varying float vA;
      void main(){ float d = length(gl_PointCoord-.5)*2.; float a = exp(-d*d*3.5)*(1.-d*0.3); if(d>1.) discard;
        gl_FragColor = vec4(vCol*a*vA, 1.); }`,
  }));
  particles.frustumCulled = false; particles.renderOrder = 4;

  // ── 半透明外壳（参考 5 6）
  const sU = { ...U, uGain: { value: 0 }, uSilk: { value: 1 }, uTint: { value: new THREE.Color(0.55, 0.75, 1.0) }, uUseTint: { value: 0 } };
  const shell = new THREE.Mesh(bodyGeo, new THREE.ShaderMaterial({
    uniforms: sU, ...ADD, side: THREE.DoubleSide,
    vertexShader: `varying vec3 vN, vV, vL; void main(){ vec4 wp=modelMatrix*vec4(position,1.); vN=normalize(mat3(modelMatrix)*normal); vV=cameraPosition-wp.xyz; vL=position; gl_Position=projectionMatrix*viewMatrix*wp; }`,
    fragmentShader: NOISE + PAL + /* glsl */`
      uniform float uT, uGain, uSilk, uUseTint; uniform vec3 uChest, uTint; varying vec3 vN, vV, vL;
      void main(){ vec3 N=normalize(vN), V=normalize(vV);
        float fr = pow(1.-abs(dot(N,V)), 2.2);
        // 丝绸烟雾纹（参考 5）：沿身体纵向拉长的流动噪声
        float silk = fbm(vL*vec3(18.,4.,18.) + vec3(0., uT*0.15, 0.));
        float silk2 = fbm(vL*vec3(40.,9.,40.) - vec3(0., uT*0.1, 0.));
        float streak = smoothstep(0.45, 0.75, silk*0.7 + silk2*0.4);
        vec3 glass = mix(mix(vec3(0.55,0.75,1.0), palCore(), 0.35), uTint, uUseTint);
        vec3 c = glass * (fr*0.9 + streak*0.16*uSilk + silk*0.03*uSilk + 0.012);
        float dc = length(vL - uChest); c += palCore() * exp(-dc*dc*14.) * 0.25;
        gl_FragColor = vec4(c * uGain * 0.16 * (gl_FrontFacing ? 1. : 0.55), 1.); }`,
  }));
  shell.renderOrder = 3;

  // ── 内部线网（脊柱 + 分枝，参考 5 6）
  const netSegs = growNetwork(r, params.netDensity);
  const netGeo = segGeometry(netSegs, [
    { name: 'aOrd', size: 1, get: (s) => [s[2]] }, { name: 'aGen', size: 1, get: (s) => [s[3]] },
    { name: 'aWarm', size: 1, get: (s) => [s[4]] }, { name: 'aSpine', size: 1, get: (s) => [s[5]] },
  ]);
  const nU = { ...U, uGrow: { value: 0 }, uGain: { value: 0 }, uCyan: { value: new THREE.Color(0.30, 0.80, 1.0) }, uWarmC: { value: new THREE.Color(1.0, 0.45, 0.22) } };
  const net = new THREE.LineSegments(netGeo, new THREE.ShaderMaterial({
    uniforms: nU, ...ADD,
    vertexShader: `attribute float aOrd, aGen, aWarm, aSpine; varying float vOrd, vGen, vWarm, vSpine; varying vec3 vP;
      void main(){ vOrd=aOrd; vGen=aGen; vWarm=aWarm; vSpine=aSpine; vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: PAL + /* glsl */`
      uniform float uT, uGrow, uGain; uniform vec3 uCyan, uWarmC; varying float vOrd, vGen, vWarm, vSpine; varying vec3 vP;
      void main(){
        float g = uGrow*1.15 - vOrd;                       // 从根部向末梢生长
        if(g < 0.) discard;
        float head = exp(-g*30.);                          // 生长前沿更亮
        float pulse = pow(0.5+0.5*sin(vOrd*55. - uT*5.5 + vGen*1.7), 8.);   // 沿线流动的光脉冲
        vec3 cyan = uCyan, warm = uWarmC;
        vec3 c = mix(cyan, warm, vWarm*0.85);
        float w = mix(1.0, 0.35, clamp(vGen/4.,0.,1.));    // 越细的分枝越暗
        float I = (0.35 + 0.9*pulse + 2.5*head) * w * (1.-vSpine) + vSpine*(4.0 + 2.*pulse);
        gl_FragColor = vec4(c * I * uGain, 1.); }`,
  }));
  net.frustumCulled = false; net.renderOrder = 5;

  // ── 流动光纤（参考 7）
  const fibSegs = traceFibers(r, params.fiberCount, 90);
  const fibGeo = segGeometry(fibSegs, [{ name: 'aU', size: 1, get: (s) => [s[2]] }, { name: 'aWarm', size: 1, get: (s) => [s[3]] }, { name: 'aPh', size: 1, get: (s) => [s[4]] }]);
  const fU = { ...U, uGain: { value: 0 } };
  const fibers = new THREE.LineSegments(fibGeo, new THREE.ShaderMaterial({
    uniforms: fU, ...ADD,
    vertexShader: `attribute float aU, aWarm, aPh; varying float vU, vWarm, vPh; void main(){ vU=aU; vWarm=aWarm; vPh=aPh; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: /* glsl */`uniform float uT, uGain; varying float vU, vWarm, vPh;
      void main(){ float flow = pow(0.5+0.5*sin(vU*18. - uT*2.4 + vPh*30.), 3.);
        float ends = smoothstep(0.,0.12,vU)*smoothstep(1.,0.85,vU);
        vec3 c = mix(vec3(0.35,0.72,1.0), vec3(1.0,0.45,0.38), vWarm);
        gl_FragColor = vec4(c * (0.25 + 1.2*flow) * ends * uGain * 0.45, 1.); }`,
  }));
  fibers.frustumCulled = false; fibers.renderOrder = 5;

  // ── 胸口光枝（参考 7）
  const limbSegs = growLimbs(r);
  const limbGeo = segGeometry(limbSegs, [{ name: 'aD', size: 1, get: (s, e) => [s[2] + e * 0.012] }, { name: 'aDep', size: 1, get: (s) => [s[3]] }]);
  const lU = { ...U, uGrow: { value: 0 }, uGain: { value: 0 } };
  const limbs = new THREE.LineSegments(limbGeo, new THREE.ShaderMaterial({
    uniforms: lU, ...ADD,
    vertexShader: `attribute float aD, aDep; varying float vD, vDep; void main(){ vD=aD; vDep=aDep; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: /* glsl */`uniform float uGrow, uGain, uT; varying float vD, vDep;
      void main(){ float g = uGrow*0.9 - vD; if(g<0.) discard;
        float fl = 0.8 + 0.2*sin(uT*17. + vD*40.);
        vec3 c = mix(vec3(1.0,0.97,0.92), vec3(0.95,0.60,0.55), smoothstep(2.,5.,vDep));
        gl_FragColor = vec4(c * (2.4 - vDep*0.32) * fl * (1.+3.*exp(-g*20.)) * uGain * 0.5, 1.); }`,
  }));
  limbs.frustumCulled = false; limbs.renderOrder = 6;

  // ── 胸口灵魂光 + 色散光刃（参考 4）：面向相机的四边形
  const cU = { ...U, uGain: { value: 1 }, uBurst: { value: 0 }, uCS: { value: 1 } };
  const core = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
    uniforms: cU, ...ADD, depthTest: false,
    vertexShader: `uniform vec3 uChest; uniform float uBurst, uCS; varying vec2 vUv;
      void main(){ vUv = position.xy; float S = (0.35 + 3.4*uBurst)*uCS;
        vec4 mv = viewMatrix*vec4(uChest,1.); mv.xy += position.xy*S; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: NOISE + PAL + /* glsl */`uniform float uT, uGain, uBurst, uCS; varying vec2 vUv;
      void main(){ vec2 p = vUv*2.; float r = length(p); float a = atan(p.y,p.x);
        float S = (0.35 + 3.4*uBurst)*uCS;
        float rm = r*S/uCS;                                    // 米
        vec3 c = palCore() * (exp(-rm*rm*900.)*6. + exp(-rm*rm*90.)*1.2 + exp(-rm*12.)*0.25);
        // 光刃：角向噪声 → 长短不一的放射线；RGB 三通道角度错开 → 棱镜色散彩边
        if(uBurst > 0.001){
          vec3 rays;
          for(int k=0;k<3;k++){
            float aa = a + float(k-1)*0.012;
            float n = vnoise(vec3(aa*9., 1.7, 0.)) * 0.6 + vnoise(vec3(aa*31., 5.3, 0.)) * 0.4;
            float len = (0.3 + 2.4*pow(n, 1.8)) * uBurst;
            float thin = pow(smoothstep(0.5, 1.0, vnoise(vec3(aa*55., 9.1, 0.))), 1.6) + 0.5*pow(smoothstep(0.6, 1.0, vnoise(vec3(aa*140., 2.3, 0.))), 2.);
            rays[k] = thin * exp(-rm/len*2.2) * smoothstep(0.02, 0.08, rm);
          }
          vec3 spec = 0.55 + 0.45*spectral(0.55 + 0.42*fract(r*0.8 + a*0.15));   // 蓝 → 紫 → 粉，少绿
          c += (rays * vec3(1.1,1.0,1.3) * spec * 3.0 + vec3(0.6,0.7,1.0)*exp(-rm*3.)*0.25) * uBurst;
        }
        gl_FragColor = vec4(c * uGain * 0.35, 1.); }`,
  }));
  core.frustumCulled = false; core.renderOrder = 8;

  // ── 身后光环（参考 1 2）
  const rU = { ...U, uGain: { value: 0 } };
  const ring = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
    uniforms: rU, ...ADD,
    vertexShader: `varying vec2 vUv; void main(){ vUv=position.xy; vec4 mv = viewMatrix*vec4(0.,1.36,0.25,1.); mv.xy += position.xy*1.5; gl_Position=projectionMatrix*mv; }`,
    fragmentShader: PAL + `uniform float uGain; varying vec2 vUv;
      void main(){ float r = length(vUv)*1.5; float d = abs(r-0.52);
        vec3 c = palCore()*(exp(-d*d*160000.)*2.0 + exp(-d*d*6000.)*0.12) + palBody()*exp(-d*d*400.)*0.025;
        gl_FragColor = vec4(c*uGain*0.5,1.); }`,
  }));
  ring.frustumCulled = false; ring.renderOrder = 1;

  // ── 光谱光柱（参考 3）：绕 y 轴面向相机的竖直长条
  const colU = { ...U, uGain: { value: 0 }, uPhase: { value: 0 } };
  const column = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 1, 220), new THREE.ShaderMaterial({
    uniforms: colU, ...ADD,
    vertexShader: NOISE + `uniform float uT; varying vec2 vUv; varying float vY;
      void main(){ float y = position.y*7. + 0.9; vY = y; vUv = position.xy;
        vec3 camR = normalize(vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]));
        float wob = (vnoise(vec3(y*1.6, uT*0.7, 0.))-.5)*0.22 + (vnoise(vec3(y*5., uT*1.3, 3.))-.5)*0.08 + (vnoise(vec3(y*18., uT*3., 7.))-.5)*0.03;
        wob *= smoothstep(0.3, 2.2, abs(y-1.0));          // 穿过身体时收紧
        vec3 p = vec3(0., y, 0.06) + camR*(wob + position.x*0.09);
        gl_Position = projectionMatrix*viewMatrix*vec4(p,1.); }`,
    fragmentShader: NOISE + PAL + `uniform float uT, uGain, uPhase; varying vec2 vUv; varying float vY;
      void main(){ float x = vUv.x*2.;
        float core = exp(-x*x*60.)*1.4 + exp(-x*x*8.)*0.3;
        // 能量由上往下贯穿：uPhase 0→1
        float front = smoothstep(uPhase*8. - 7., uPhase*8. - 6.3, 4.5 - vY);
        float spark = 0.7 + 0.6*vnoise(vec3(vY*14. - uT*6., x*3., 0.));
        vec3 c = (0.35 + 0.9*spectral(vY*0.22 - uT*0.25 + x*0.3)) * core * spark * front;
        c *= smoothstep(-0.8, 0.2, vY) * smoothstep(4.6, 3.2, vY);
        gl_FragColor = vec4(c*uGain*0.7, 1.); }`,
  }));
  column.frustumCulled = false; column.renderOrder = 2;

  object3d.add(ring, column, shell, particles, net, fibers, limbs, core);

  function sync(t) {
    const p = params, s = p.stage, G = p.gain;
    U.uT.value = t; U.uHue.value = p.hue;
    for (const m of [particles, shell, net, fibers, limbs, core, ring, column]) { m.material.uniforms.uT.value = t; m.material.uniforms.uHue.value = p.hue; }
    // K1：光点 → 凝聚
    pU.uForm.value = sstep(0.05, 0.95, s);
    pU.uDrift.value = p.drift * (1 - sstep(2.0, 2.6, s));
    pU.uCondense.value = sstep(2.1, 2.9, s);
    pU.uGain.value = G * p.particleGain * (0.35 + 0.65 * sstep(0, 0.6, s)) * (1 - 0.75 * sstep(3.2, 3.8, s));
    pU.uSize.value = p.particleSize;
    rU.uGain.value = G * p.ringGain * sstep(0.45, 0.95, s) * (1 - sstep(2.2, 2.8, s));
    // K2：光柱贯穿 → 胸口爆发
    colU.uPhase.value = sstep(1.0, 1.55, s);
    colU.uGain.value = G * p.columnGain * sstep(1.0, 1.1, s) * (1 - sstep(1.7, 2.0, s));
    cU.uBurst.value = p.burstGain * sstep(1.55, 1.75, s) * (1 - sstep(1.95, 2.35, s));
    cU.uGain.value = G * p.chestGlow * (0.25 + 0.75 * sstep(0, 0.3, s)) * (1 + 0.6 * cU.uBurst.value);
    // K3：外壳 + 线网
    sU.uGain.value = G * p.shellGain * sstep(2.0, 2.7, s) * (1 - 0.35 * sstep(3.3, 3.8, s));
    nU.uGrow.value = sstep(2.2, 3.1, s);
    nU.uGain.value = G * p.netGain * sstep(2.2, 2.4, s) * (1 - 0.5 * sstep(3.3, 3.8, s));
    // K4：光纤 + 光枝
    fU.uGain.value = G * p.fiberGain * sstep(3.0, 3.6, s);
    lU.uGrow.value = sstep(3.3, 3.95, s);
    lU.uGain.value = G * p.limbGain * sstep(3.3, 3.4, s);
    // 直接指定（复刻用）
    const o = (k, f) => { if (p[k] !== null && p[k] !== undefined) f(p[k]); };
    o('form', v => pU.uForm.value = v); o('condense', v => pU.uCondense.value = v); o('particles', v => pU.uGain.value = G * p.particleGain * v);
    o('ring', v => rU.uGain.value = G * p.ringGain * v); o('colPhase', v => colU.uPhase.value = v); o('column', v => colU.uGain.value = G * p.columnGain * v);
    o('burst', v => cU.uBurst.value = p.burstGain * v); o('shell', v => sU.uGain.value = G * p.shellGain * v);
    o('grow', v => nU.uGrow.value = v); o('net', v => nU.uGain.value = G * p.netGain * v);
    o('fiber', v => fU.uGain.value = G * p.fiberGain * v); o('limbGrow', v => lU.uGrow.value = v); o('limb', v => lU.uGain.value = G * p.limbGain * v);
    cU.uGain.value = G * p.chestGlow * (0.25 + 0.75 * sstep(0, 0.3, s)) * (1 + 0.6 * cU.uBurst.value);
    if (p.form !== null && p.form !== undefined) pU.uDrift.value = p.drift;   // 复刻模式：飘散不随 stage 关闭
    pU.uRim.value = p.rimOnly; sU.uSilk.value = p.silk; cU.uCS.value = p.chestSize;
    if (p.shellTint) { sU.uTint.value.copy(p.shellTint); sU.uUseTint.value = 1; } else sU.uUseTint.value = 0;
    if (p.netCyan) nU.uCyan.value.copy(p.netCyan); if (p.netWarm) nU.uWarmC.value.copy(p.netWarm);
  }

  return {
    object3d, params,
    update(t, p = {}) { Object.assign(params, p); sync(t); },
    setPixelScale(pxPerMeterAt1) { pU.uPx.value = pxPerMeterAt1; },
    chest: CHEST.clone(),
    stats: { particles: NP, network: netSegs.length, fibers: fibSegs.length, limbs: limbSegs.length },
    dispose() { object3d.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); }); },
  };
}
