// E1_EarthGlow_v001.js — 《摧毀只是一瞬間》序言 · 地球辉光
// ─────────────────────────────────────────────────────────────────────────────
// 一颗地球，一套物理参数：四镜只改机位和 sunDir（以及少量增益），颜色和宽度自然变化。
//   太阳在正后方 → 黑剪影 + 细橙红光环 + 前向散射亮点（参考 R4，S1）
//   太阳在侧后方 → 分层大弧：暖橙底层 / 白亮核心 / 淡蓝外层（参考 R2，S2 S3）
//   太阳在侧面   → 亮弧 + 宽柔晕 + 掠射光下的云纹（参考 R1 R3，S5）
//
// 技术：单个球壳网格（BackSide），整颗地球（地表 + 大气）在片元里解析计算：
//   · 视线与地球 / 大气球求交 → 轮廓在任何距离都是完美圆弧，不受网格精度影响
//   · 单次散射：Rayleigh（β∝λ⁻⁴）+ Mie（Henyey-Greenstein 前向峰），沿视线 STEPS 步、沿太阳 SUN_STEPS 步
//   · 采样点向切点（最低高度处）加密，薄层也不出条纹；逐像素固定抖动（与 t 无关，seek 安全）
//   · 太阳光穿越大气的衰减 → 边缘自然泛红；地球自身遮挡 → 软阴影晨昏线
//   · 输出线性 HDR，premultiplied alpha：地球盘遮住背后的星星，大气叠加在星空上
//   · 不做 tone mapping / bloom（交给主场景）
//
// 坐标：米。默认球心在 (0, −R−62, 0)，即球顶在原点下方 62 m（手册第 5 节）。
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { NOISE, C, clamp, lerp } from './shared.js';

export const DEFAULTS = {
  R: 1500,                                  // 地球半径（米，艺术比例）
  center: new THREE.Vector3(0, -1562, 0),   // 球心（世界坐标）
  sunDir: new THREE.Vector3(0, 0.05, -1),   // 指向太阳的单位向量（世界坐标）。决定一切颜色变化
  sunIntensity: 22,                         // 太阳辐照（HDR），建议 10–40
  limbWidth: 1.0,                           // 大气整体厚度倍率（同时缩放标高），0.5–2.5；远景可加大保证可读
  density: 1.0,                             // 大气浓度倍率，0.3–2；越大越不透明、边缘越红
  glowGain: 1.0,                            // 大气散射光总增益，0–3
  mieGain: 0.55,                            // Mie 前向亮点 / 白色核心强度，0–3
  mieG: 0.86,                               // Mie 各向异性 g，0.6–0.9；越大亮点越集中
  haloSize: 1.0,                            // 外层远晕宽度倍率，0–4（R3 那种宽柔晕）
  haloGain: 0.6,                            // 外层远晕强度，0–3
  dayAmount: 0.35,                          // 日面地表亮度，0–1（保持「暗」）
  nightGlow: 1.0,                           // 夜面云层的极弱月光/地辉，0–3
  cloudAmount: 0.8,                         // 云量，0–1
  cloudScale: 5.5,                          // 云的尺度（越大越碎），3–10
  cityAmount: 0.0,                          // 城市光，0–1。一万年前没有城市 → 默认 0
  tint: 0.5,                                // 0 = 物理真实蓝白（A）· 0.5 = 混合（C，默认）· 1 = 暖白（B）
  warm: new THREE.Color('#FFE2B8'),         // tint 往暖偏时的目标色
  cloudSpin: 0.004,                         // 云层随 t 漂移（弧度/秒）
  exposure: 1.0,                            // 模块整体曝光（四镜统一时用于微调）
};

// 质量档：GPU 默认；无 GPU（软件 WebGL）可传 { steps: 12, sunSteps: 4 }
const Q_DEFAULT = { steps: 24, sunSteps: 6 };

const VERT = /* glsl */`
varying vec3 vW;
void main(){ vec4 wp = modelMatrix*vec4(position,1.); vW = wp.xyz; gl_Position = projectionMatrix*viewMatrix*wp; }`;

const FRAG = (steps, sunSteps) => /* glsl */`
#define STEPS ${steps}
#define SUN_STEPS ${sunSteps}
${NOISE}
uniform vec3 uCenter, uSun, uBetaR, uWarm;
uniform float uR, uTop, uHr, uHm, uBetaM, uG, uSunI, uGain, uMieGain;
uniform float uHalo, uHaloH, uTint, uDay, uNight, uCloud, uCloudScale, uCity, uRot, uExposure;
varying vec3 vW;
#define PI 3.14159265

vec2 sph(vec3 ro, vec3 rd, float r){ float b=dot(ro,rd); float c=dot(ro,ro)-r*r; float d=b*b-c; if(d<0.) return vec2(1e9,-1e9); d=sqrt(d); return vec2(-b-d,-b+d); }

// 太阳方向的光学深度（Rayleigh, Mie），含地球软遮挡
vec3 sunDepth(vec3 p){
  // 地球遮挡：太阳光线离球心最近处的高度
  float tcs = -dot(p,uSun);
  float hmin = tcs>0. ? length(p+uSun*tcs)-1. : length(p)-1.;
  float vis = smoothstep(-0.0015, 0.0025, hmin);
  if(vis<=0.) return vec3(0.,0.,0.);
  float tEnd = sph(p,uSun,uTop).y;
  float ds = tEnd/float(SUN_STEPS); vec2 od = vec2(0.);
  for(int j=0;j<SUN_STEPS;j++){
    vec3 q = p + uSun*(ds*(float(j)+.5));
    float h = max(length(q)-1., 0.);
    od += vec2(exp(-h/uHr), exp(-h/uHm))*ds;
  }
  return vec3(od, vis);
}

void main(){
  vec3 ro = (cameraPosition-uCenter)/uR;
  vec3 rd = normalize(vW-cameraPosition);
  vec2 ta = sph(ro,rd,uTop);
  if(ta.y<0.) discard;
  float t0 = max(ta.x,0.), t1 = ta.y;
  vec2 tp = sph(ro,rd,1.);
  bool hit = tp.x>0. && tp.x<1e8;
  if(hit) t1 = tp.x;

  // 采样向切点加密
  float tc = clamp(-dot(ro,rd), t0, t1);
  float jit = fract(52.9829189*fract(dot(gl_FragCoord.xy, vec2(0.06711056,0.00583715))));
  vec3 sumR=vec3(0.), sumM=vec3(0.); vec2 odV=vec2(0.);
  for(int i=0;i<STEPS;i++){
    float u = (float(i)+jit)/float(STEPS);
    float w = u*2.-1.;
    float L = w<0. ? (tc-t0) : (t1-tc);
    float t = tc + sign(w)*w*w*L;
    float ds = 4.*abs(w)*L/float(STEPS);
    vec3 p = ro+rd*t;
    float h = max(length(p)-1., 0.);
    vec2 rho = vec2(exp(-h/uHr), exp(-h/uHm))*ds;
    odV += rho*.5;                                   // 采样点之前一半
    vec3 sd = sunDepth(p);
    if(sd.z>0.){
      vec3 tau = uBetaR*(odV.x+sd.x) + uBetaM*1.11*(odV.y+sd.y);
      vec3 att = exp(-tau)*sd.z;
      sumR += rho.x*att; sumM += rho.y*att;
    }
    odV += rho*.5;
  }
  float mu = dot(rd,uSun);
  float pR = 3./(16.*PI)*(1.+mu*mu);
  float g = uG, g2 = g*g;
  float pM = 3./(8.*PI)*((1.-g2)*(1.+mu*mu))/((2.+g2)*pow(1.+g2-2.*g*mu,1.5));
  vec3 col = uSunI*(sumR*uBetaR*pR + sumM*uBetaM*pM*uMieGain);
  vec3 Tview = exp(-(uBetaR*odV.x + uBetaM*1.11*odV.y));

  // 外层远晕：最低高度上方一层很淡、很宽的光（R3 的宽柔晕），只在有阳光的一侧
  if(!hit){
    float b = -dot(ro,rd);
    vec3 pc = ro+rd*max(b,0.);
    float hmin = length(pc)-1.;
    float lit = smoothstep(-0.35, 0.45, dot(normalize(pc),uSun)) ;
    float back = 0.35+0.65*pow(clamp(mu*.5+.5,0.,1.),2.);
    vec3 hc = mix(vec3(1.0,0.96,0.90), uBetaR/max(uBetaR.b,1e-4), 0.45);   // 远晕：带一点蓝的中性白
    col += hc * uHalo * exp(-max(hmin,0.)/uHaloH) * lit * back * uSunI * 0.004;
  }

  // 地表
  if(hit){
    vec3 n = normalize(ro+rd*t1);
    float cr = cos(uRot), sr = sin(uRot);
    vec3 q = vec3(cr*n.x - sr*n.z, n.y, sr*n.x + cr*n.z);
    float land = smoothstep(0.50, 0.56, fbm(q*2.6+vec3(3.1,1.7,5.2)));
    float cl = fbm(q*uCloudScale + vec3(0., 0., 7.)) ;
    cl = smoothstep(0.48, 0.78, cl + 0.18*fbm(q*uCloudScale*4.1)) * uCloud;
    vec3 alb = mix(vec3(0.010,0.018,0.034), vec3(0.040,0.034,0.024), land);
    alb = mix(alb, vec3(0.55,0.56,0.58), cl);
    vec3 sd = sunDepth(n*1.0005);
    vec3 Tsun = exp(-(uBetaR*sd.x + uBetaM*1.11*sd.y))*sd.z;
    float ndl = max(dot(n,uSun),0.);
    vec3 surf = alb * ndl * Tsun * uSunI * 0.06 * uDay;
    // 夜面：云层极弱的月光/地辉，偏冷
    surf += vec3(0.55,0.62,0.75) * cl * 0.0016 * uNight * (1.-smoothstep(-0.05,0.15,dot(n,uSun)));
    // 城市光（默认关闭）
    float city = smoothstep(0.78,0.92,fbm(q*60.)) * land * (1.-cl) * (1.-smoothstep(-0.1,0.05,dot(n,uSun)));
    surf += vec3(1.,.66,.36) * city * 0.03 * uCity;
    col += surf * Tview;
  }

  col *= uGain;

  // tint：只动偏蓝的部分——降饱和、往中性暖白靠（暖橙层不受影响，避免混出灰绿）
  //   0 = 物理真实蓝白（A）· 0.5 = 混合（C）· 1 = 暖白（B）
  float lum = dot(col, vec3(0.2126,0.7152,0.0722));
  float blue = clamp((max(col.b, col.g*1.04) - col.r)/(lum+1e-5)*1.3, 0., 1.);   // 偏冷（蓝或绿多于红）的程度
  vec3 neutral = mix(vec3(0.92,0.96,1.0), uWarm, uTint);
  col = mix(col, lum*neutral*1.1, clamp(uTint*1.4*blue, 0., 0.85));

  col *= uExposure;
  gl_FragColor = vec4(max(col,0.), hit ? 1. : 0.);
}`;

export function create(opts = {}, quality = Q_DEFAULT) {
  const params = { ...DEFAULTS, ...opts };
  params.center = (opts.center || DEFAULTS.center).clone();
  params.sunDir = (opts.sunDir || DEFAULTS.sunDir).clone().normalize();
  params.warm = (opts.warm || DEFAULTS.warm).clone();

  const U = {
    uCenter: { value: params.center.clone() }, uSun: { value: params.sunDir.clone() },
    uR: { value: params.R }, uTop: { value: 1 }, uHr: { value: 0 }, uHm: { value: 0 },
    uBetaR: { value: new THREE.Vector3() }, uBetaM: { value: 0 }, uG: { value: params.mieG },
    uSunI: { value: params.sunIntensity }, uGain: { value: 1 }, uMieGain: { value: 1 },
    uHalo: { value: 1 }, uHaloH: { value: 0.01 }, uTint: { value: 0.5 }, uWarm: { value: params.warm.clone() },
    uDay: { value: 0.35 }, uNight: { value: 1 }, uCloud: { value: 0.8 }, uCloudScale: { value: 5.5 },
    uCity: { value: 0 }, uRot: { value: 0 }, uExposure: { value: 1 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: U, vertexShader: VERT, fragmentShader: FRAG(quality.steps, quality.sunSteps),
    side: THREE.BackSide, transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  });
  // 外壳半径要包住远晕：1 + 大气顶 + 余量
  const geo = new THREE.SphereGeometry(1, 128, 96);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -5;                 // 先画：在星空之后、所有前景之前
  const object3d = new THREE.Group();
  object3d.add(mesh);

  function sync(t) {
    const p = params, R = p.R, lw = p.limbWidth;
    // 艺术比例：大气按半径比例缩放（真实 ≈ 0.0013R 标高，这里放宽以便在 R=1500 m 的场景里可读）
    const Hr = 0.0042 * lw, Hm = 0.0009 * lw;
    const top = 1 + Hr * 7.5;
    const haloH = 0.012 * p.haloSize * lw;
    const shellR = 1 + Math.max(Hr * 7.5, haloH * 6);
    U.uCenter.value.copy(p.center); U.uR.value = R;
    U.uSun.value.copy(p.sunDir).normalize();
    U.uTop.value = top; U.uHr.value = Hr; U.uHm.value = Hm;
    // 真实海平面 βR = (5.8, 13.5, 33.1)e-6 /m，换算成「每个地球半径」后按标高放宽比例回缩
    const k = 0.30 * p.density;
    U.uBetaR.value.set(37 * k, 86 * k, 211 * k);
    U.uBetaM.value = 60 * k;
    U.uG.value = p.mieG; U.uSunI.value = p.sunIntensity; U.uGain.value = p.glowGain; U.uMieGain.value = p.mieGain;
    U.uHalo.value = p.haloGain; U.uHaloH.value = haloH;
    U.uTint.value = p.tint; U.uWarm.value.copy(p.warm);
    U.uDay.value = p.dayAmount; U.uNight.value = p.nightGlow; U.uCloud.value = p.cloudAmount; U.uCloudScale.value = p.cloudScale;
    U.uCity.value = p.cityAmount; U.uRot.value = p.cloudSpin * t; U.uExposure.value = p.exposure;
    mesh.position.copy(p.center); mesh.scale.setScalar(R * shellR);
    mesh.updateMatrixWorld();
  }
  sync(0);

  return {
    object3d,
    params,
    update(t, p = {}) {
      for (const k in p) {
        if (params[k] && params[k].isVector3) params[k].copy(p[k]);
        else if (params[k] && params[k].isColor) params[k].copy(p[k]);
        else params[k] = p[k];
      }
      sync(t);
    },
    // 工具：给定机位，求「从相机看去，地球边缘某一点」的太阳方向，方便摆光
    sunBehindLimb(cameraPos, side = new THREE.Vector3(0, 1, 0), elev = 0.02) {
      const toC = params.center.clone().sub(cameraPos).normalize();
      const s = side.clone().sub(toC.clone().multiplyScalar(side.dot(toC))).normalize();
      return toC.clone().multiplyScalar(Math.cos(elev)).add(s.multiplyScalar(Math.sin(elev))).normalize();
    },
    dispose() { geo.dispose(); mat.dispose(); },
  };
}
