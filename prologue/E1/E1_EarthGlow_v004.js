// E1_EarthGlow_v004.js — 《摧毀只是一瞬間》序言 · 地球辉光
// v004（基于 v003）：重做地表 / 云层纹理，目标「清晰、有立体感」
//   · 梯度噪声（quintic Perlin）替代 value noise：边缘不糊、不出方块
//   · 按像素尺寸自动淡出高频八度（fwidth LOD）：近看细节锐利、远看不闪烁
//   · 云层：大尺度云系 + 气旋涡旋（球面旋转扭曲）+ 纬向拉伸 + 积云团块（billow）+ 可调边缘锐度
//   · 云的明暗起伏：沿光照方向做高度差分 → 迎光面亮、背光面暗，云有体积感
//   · 大陆：域扭曲梯度 fbm，海岸线清晰；海面月光 / 日光高光（glint）
// v003（主对话）：夜面边缘光带（lineGain）、夜面大气纱（veil）、云细节八度（cloudDetail）
// v002：臭氧吸收、多次散射天空蓝、月光夜面云、城市光、蓝色远晕
// ─────────────────────────────────────────────────────────────────────────────
// v002：加臭氧吸收（Chappuis 带 → 地球特有的深蓝边缘）、月光照亮的夜面云、域扭曲云层、成簇城市光、蓝色远晕。
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
  tint: 0.0,                                // 0 = 物理真实（蓝）· 0.5 = 混合 · 1 = 暖白
  ozone: 1.6,                               // 臭氧吸收倍率，0–4：越大边缘蓝越深（真实地球的深蓝来自这里）
  moonDir: new THREE.Vector3(0.3, 0.8, 0.4),// 月光方向（夜面云层的照明），单位向量
  moonIntensity: 1.0,                       // 月光强度，0–4
  haloBlue: 1.0,                            // 远晕的蓝度，0 = 中性白 · 1 = 物理 Rayleigh 蓝
  multiScatter: 1.0,                        // 多次散射「天空蓝」强度，0–3：地球边缘那层饱和深蓝主要来自这里
  lineGain: 0.0,                            // v003 夜面边缘光带强度，0–3（0 = 关闭）
  lineH: 0.0055,                            // 光带所在高度（地球半径单位，乘 limbWidth）
  lineW: 0.0008,                            // 光带半厚度（同上）
  lineColor: new THREE.Color('#5a8cff'),    // 光带颜色
  veil: 0.0,                                // v003 夜面大气纱强度，0–3
  veilColor: new THREE.Color('#1d3f9e'),    // 大气纱颜色
  cloudDetail: 1.0,                         // 云层细节量，0–1（v004 起由 LOD 自动控制远近）
  cloudCover: 0.32,                         // v004 云量，0–1（0.3 ≈ 稀疏云团，0.6 ≈ 大片云系）
  cloudSharp: 1.4,                          // v004 云边缘锐度，0.5–3：越大轮廓越清楚
  cloudRelief: 1.3,                         // v004 云的明暗起伏（体积感），0–2
  vortex: 1.0,                              // v004 气旋涡旋强度，0–2
  landAmount: 1.0,                          // v004 大陆可见度，0–1
  glint: 1.0,                               // v004 海面高光（月光 / 日光），0–3
  warm: new THREE.Color('#FFE2B8'),         // tint 往暖偏时的目标色
  cloudSpin: 0.004,                         // 云层随 t 漂移（弧度/秒）
  exposure: 1.0,                            // 模块整体曝光（四镜统一时用于微调）
};

// 质量档：GPU 默认；无 GPU（软件 WebGL）可传 { steps: 12, sunSteps: 4 }
const Q_DEFAULT = { steps: 24, sunSteps: 6 };

const VERT = /* glsl */`
varying vec3 vW;
void main(){ vec4 wp = modelMatrix*vec4(position,1.); vW = wp.xyz; gl_Position = projectionMatrix*viewMatrix*wp; }`;

// v004 梯度噪声 + LOD fbm（模块自带，不改 shared.js）
const GNOISE = /* glsl */`
vec3 ghash(vec3 p){ p = vec3(dot(p,vec3(127.1,311.7,74.7)), dot(p,vec3(269.5,183.3,246.1)), dot(p,vec3(113.5,271.9,124.6)));
  return -1. + 2.*fract(sin(p)*43758.5453123); }
float gnoise(vec3 p){                       // quintic Perlin，输出约 [-1,1]
  vec3 i = floor(p), f = fract(p);
  vec3 u = f*f*f*(f*(f*6.-15.)+10.);
  float n000=dot(ghash(i),f), n100=dot(ghash(i+vec3(1,0,0)),f-vec3(1,0,0));
  float n010=dot(ghash(i+vec3(0,1,0)),f-vec3(0,1,0)), n110=dot(ghash(i+vec3(1,1,0)),f-vec3(1,1,0));
  float n001=dot(ghash(i+vec3(0,0,1)),f-vec3(0,0,1)), n101=dot(ghash(i+vec3(1,0,1)),f-vec3(1,0,1));
  float n011=dot(ghash(i+vec3(0,1,1)),f-vec3(0,1,1)), n111=dot(ghash(i+vec3(1,1,1)),f-vec3(1,1,1));
  return 1.6*mix(mix(mix(n000,n100,u.x),mix(n010,n110,u.x),u.y),mix(mix(n001,n101,u.x),mix(n011,n111,u.x),u.y),u.z);
}
// fbm：pix = 该点一个像素对应的噪声空间尺寸；频率高到一个像素装不下时自动淡出（不闪烁）
float fbmL(vec3 p, int oct, float pix){
  float s=0., a=.5, f=1.;
  for(int i=0;i<9;i++){ if(i>=oct) break;
    float lod = 1.-smoothstep(0.35, 0.9, pix*f);
    s += a*gnoise(p*f)*lod; f*=2.03; a*=.5; }
  return s;                                  // 约 [-1,1]
}
float billowL(vec3 p, int oct, float pix){   // 积云团块：1-|n|
  float s=0., a=.5, f=1.;
  for(int i=0;i<7;i++){ if(i>=oct) break;
    float lod = 1.-smoothstep(0.35, 0.9, pix*f);
    s += a*(1.-abs(gnoise(p*f+float(i)*3.7)))*lod + a*0.5*(1.-lod); f*=2.07; a*=.5; }
  return s;                                  // 约 [0,1]
}
vec3 rotAxis(vec3 v, vec3 k, float a){ float c=cos(a), s=sin(a); return v*c + cross(k,v)*s + k*dot(k,v)*(1.-c); }
`;

const FRAG = (steps, sunSteps) => /* glsl */`
#define STEPS ${steps}
#define SUN_STEPS ${sunSteps}
${NOISE}
${GNOISE}
uniform vec3 uCenter, uSun, uBetaR, uWarm, uBetaO, uMoon;
uniform float uR, uTop, uHr, uHm, uBetaM, uG, uSunI, uGain, uMieGain;
uniform float uOzH, uOzW, uMoonI, uHaloBlue, uMS;
uniform float uLineG, uLineH, uLineW, uVeil, uCDet; uniform vec3 uLineC, uVeilC;
uniform float uCSharp, uCRelief, uVortex, uLand, uGlint, uCover;
uniform float uHalo, uHaloH, uTint, uDay, uNight, uCloud, uCloudScale, uCity, uRot, uExposure;
varying vec3 vW;
#define PI 3.14159265

vec2 sph(vec3 ro, vec3 rd, float r){ float b=dot(ro,rd); float c=dot(ro,ro)-r*r; float d=b*b-c; if(d<0.) return vec2(1e9,-1e9); d=sqrt(d); return vec2(-b-d,-b+d); }

// 太阳方向的光学深度（Rayleigh, Mie），含地球软遮挡
float odO;   // sunDepth 的副产物：太阳方向的臭氧光学深度
vec3 sunDepth(vec3 p){
  // 地球遮挡：太阳光线离球心最近处的高度
  float tcs = -dot(p,uSun);
  float hmin = tcs>0. ? length(p+uSun*tcs)-1. : length(p)-1.;
  float vis = smoothstep(-0.0015, 0.0025, hmin);
  if(vis<=0.) return vec3(0.,0.,0.);
  float tEnd = sph(p,uSun,uTop).y;
  float ds = tEnd/float(SUN_STEPS); vec2 od = vec2(0.); odO = 0.;
  for(int j=0;j<SUN_STEPS;j++){
    vec3 q = p + uSun*(ds*(float(j)+.5));
    float h = max(length(q)-1., 0.);
    od += vec2(exp(-h/uHr), exp(-h/uHm))*ds;
    odO += max(0., 1.-abs(h-uOzH)/uOzW)*ds;
  }
  return vec3(od, vis);
}

// v004 云场：返回覆盖度 0..1。q = 地表单位向量（已含漂移旋转），pix = 一个像素对应的球面弧长
float gPuff;   // cloudField 的副产物：积云团块值，用于云内部明暗
float cloudField(vec3 q, float pix){
  // 气旋：几个固定位置的涡旋，越靠近中心旋转越多 → 螺旋云带
  vec3 cq = q;
  for(int k=0;k<5;k++){
    vec3 c = normalize(vec3(sin(float(k)*2.39+0.7), cos(float(k)*1.71+0.3)*0.8, sin(float(k)*3.13+1.9)));
    float d = acos(clamp(dot(cq,c),-1.,1.));
    float r = 0.16 + 0.05*float(k%3);
    cq = rotAxis(cq, c, uVortex * 2.6 * exp(-d*d/(r*r)) * (k%2==0 ? 1. : -1.));
  }
  float lat = cq.y + 0.12*gnoise(cq*3.1+5.) + 0.05*gnoise(cq*9.7);   // 纬度加扰动 → 云带不出直线
  // 纬向拉伸：东西方向被高空风拉长（在局部坐标里压缩南北频率以外的分量）
  vec3 sq = cq * uCloudScale; sq.y *= 1.6;
  float px = pix * uCloudScale * 1.6;
  vec3 warp = vec3(fbmL(sq*0.45+vec3(1.3,7.1,2.9),4,px*0.45), fbmL(sq*0.45+vec3(5.2,1.3,8.4),4,px*0.45), fbmL(sq*0.45+vec3(9.1,4.7,0.6),4,px*0.45));
  float big = fbmL(sq*0.55 + warp*1.1, 5, px*0.55);                  // 大尺度云系
  float bands = 0.10*cos(lat*9.0) + 0.07*cos(lat*3.1+0.8);           // 赤道辐合带 / 中纬风暴带的大致分布
  float puffs = billowL(sq*2.2 + warp*0.9, 6, px*2.2);               // 积云团块
  float wisps = fbmL(vec3(sq.x*3.0, sq.y*9.0, sq.z*3.0) + warp*2., 6, px*9.0); // 卷云丝
  float base = big*0.9 + bands + (puffs-0.5)*0.55*uCDet + wisps*0.18*uCDet;
  gPuff = puffs;
  float edge = 0.10 / max(uCSharp, 0.2);
  float thr = 0.30 - 0.55*uCover;                                     // 云量 → 阈值
  // 外缘锐利（edge），内部再用更宽的过渡慢慢变厚 → 边清楚、里面有层次
  return smoothstep(thr - edge, thr + edge, base) * (0.55 + 0.45*smoothstep(thr, thr + 0.35, base));
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
  vec3 sumR=vec3(0.), sumM=vec3(0.), sumMS=vec3(0.); vec2 odV=vec2(0.); float odVO=0.;
  for(int i=0;i<STEPS;i++){
    float u = (float(i)+jit)/float(STEPS);
    float w = u*2.-1.;
    float L = w<0. ? (tc-t0) : (t1-tc);
    float t = tc + sign(w)*w*w*L;
    float ds = 4.*abs(w)*L/float(STEPS);
    vec3 p = ro+rd*t;
    float h = max(length(p)-1., 0.);
    vec2 rho = vec2(exp(-h/uHr), exp(-h/uHm))*ds;
    float rhoO = max(0., 1.-abs(h-uOzH)/uOzW)*ds;
    odV += rho*.5; odVO += rhoO*.5;                  // 采样点之前一半
    vec3 sd = sunDepth(p);
    if(sd.z>0.){
      vec3 tau = uBetaR*(odV.x+sd.x) + uBetaM*1.11*(odV.y+sd.y) + uBetaO*(odVO+odO);
      vec3 att = exp(-tau)*sd.z;
      sumR += rho.x*att; sumM += rho.y*att;
    }
    // 多次散射近似：大气被照亮的一侧向四周发出各向同性的「天空蓝」，晨昏线外也延续一段
    float amb = smoothstep(-0.32, 0.30, dot(normalize(p), uSun));
    vec3 tv = exp(-(uBetaR*odV.x + uBetaM*1.11*odV.y + uBetaO*odVO));
    sumMS += rho.x * tv * amb;
    odV += rho*.5; odVO += rhoO*.5;
  }
  float mu = dot(rd,uSun);
  float pR = 3./(16.*PI)*(1.+mu*mu);
  float g = uG, g2 = g*g;
  float pM = 3./(8.*PI)*((1.-g2)*(1.+mu*mu))/((2.+g2)*pow(1.+g2-2.*g*mu,1.5));
  vec3 col = uSunI*(sumR*uBetaR*pR + sumM*uBetaM*pM*uMieGain);
  col += uSunI * uMS * 0.022 * sumMS * uBetaR * uBetaR / dot(uBetaR, vec3(0.33)) * (hit ? 0.35 : 1.);   // 地表方向压低，避免日面被蓝雾盖住   // 多次散射天空蓝（再乘一次 βR → 更蓝）
  vec3 Tview = exp(-(uBetaR*odV.x + uBetaM*1.11*odV.y + uBetaO*odVO));

  // v003 夜面边缘光带：视线穿过 [1+H-W, 1+H+W] 薄壳的路径长度（解析），归一化后发光
  {
    vec2 so = sph(ro,rd,1.+uLineH+uLineW), si = sph(ro,rd,1.+uLineH-uLineW);
    float tEnd = hit ? t1 : 1e9;
    float a0 = max(so.x,0.), a1 = min(so.y,tEnd);
    float Lsh = max(a1-a0,0.);
    if(si.x<1e8){ float b0=max(si.x,a0), b1=min(si.y,a1); Lsh -= max(b1-b0,0.); }
    float e = Lsh/(2.*uLineW);
    if(hit) e = max(e-2.2, 0.);
    e = e/(1.+e*0.035);
    col += uLineC * uLineG * e * 0.06;
  }
  // 外层远晕：最低高度上方一层很淡、很宽的光（R3 的宽柔晕），只在有阳光的一侧
  if(!hit){
    float b = -dot(ro,rd);
    vec3 pc = ro+rd*max(b,0.);
    float hmin = length(pc)-1.;
    float lit = smoothstep(-0.35, 0.45, dot(normalize(pc),uSun)) ;
    float back = 0.35+0.65*pow(clamp(mu*.5+.5,0.,1.),2.);
    vec3 hc = mix(vec3(1.0,0.96,0.90), vec3(0.16,0.42,1.0), uHaloBlue);    // 远晕：中性白 ↔ Rayleigh 蓝
    col += hc * uHalo * exp(-max(hmin,0.)/uHaloH) * lit * back * uSunI * 0.004;
  }

  // 地表
  if(hit){
    vec3 n = normalize(ro+rd*t1);
    float cr = cos(uRot), sr = sin(uRot);
    vec3 q = vec3(cr*n.x - sr*n.z, n.y, sr*n.x + cr*n.z);
    // v004 纹理：像素尺寸 → LOD；云 / 大陆都用梯度噪声
    float pix = length(fwidth(n)) + 1e-5;
    float cl = cloudField(q, pix) * uCloud;
    float puff = gPuff;
    // 云的明暗起伏：沿光照切向错开一点再采一次，差值即「迎光 / 背光」
    vec3 Ld = normalize(mix(uMoon, uSun, smoothstep(-0.1, 0.2, dot(n,uSun))));
    vec3 Lt = normalize(Ld - n*dot(Ld,n) + 1e-4);
    float cl2 = cloudField(normalize(q + Lt*max(pix*2.5, 0.0015)), pix) * uCloud;
    float relief = clamp(1. + (cl - cl2)*3.2*uCRelief, 0.35, 1.8);
    // 大陆：域扭曲梯度 fbm，海岸线清晰
    vec3 lq = q*2.1;
    float lpx = pix*2.1;
    vec3 lw = vec3(fbmL(lq+vec3(2.,9.,4.),4,lpx), fbmL(lq+vec3(7.,3.,1.),4,lpx), 0.);
    float lnd = fbmL(lq + lw*0.8 + vec3(3.1,1.7,5.2), 8, lpx);
    float land = smoothstep(0.04, 0.07, lnd) * uLand;
    float relLand = fbmL(lq*6.+3., 6, lpx*6.);
    vec3 alb = mix(vec3(0.006,0.014,0.032), mix(vec3(0.030,0.028,0.020), vec3(0.048,0.040,0.028), relLand*.5+.5), land);
    alb = mix(alb, vec3(0.66,0.68,0.72)*relief*(0.62 + 0.6*puff), min(cl*1.25, 1.));   // 云内部随积云团块明暗起伏
    vec3 sd = sunDepth(n*1.0005);
    vec3 Tsun = exp(-(uBetaR*sd.x + uBetaM*1.11*sd.y + uBetaO*odO))*sd.z;
    float ndl = max(dot(n,uSun),0.);
    vec3 surf = alb * ndl * Tsun * uSunI * 0.06 * uDay;
    // 夜面：月光照亮云层（冷），海面极弱
    float night = 1.-smoothstep(-0.05,0.15,dot(n,uSun));
    float ml = max(dot(n,uMoon),0.)*0.75+0.25;
    surf += vec3(0.50,0.60,0.82) * (cl*0.9*relief + 0.03) * ml * 0.55 * uNight * uMoonI * night;
    // 海面高光：月光（夜面）/ 日光（日面）在海上的镜面反射，云遮住则无
    vec3 V = -rd;
    float sea = (1.-land)*(1.-cl);
    float gm = pow(max(dot(reflect(-uMoon, n), V), 0.), 180.);
    float gs = pow(max(dot(reflect(-uSun, n), V), 0.), 260.);
    surf += sea * uGlint * (vec3(0.55,0.65,0.85)*gm*0.06*uMoonI*night + vec3(1.,0.93,0.82)*Tsun*gs*uSunI*0.02*uDay);
    // 城市光：沿海岸成簇的暖色小光团（默认关闭）
    vec3 cq = q*140.; vec3 ci = floor(cq); vec3 cf = fract(cq);
    float hr = hash13(ci); vec3 cp = vec3(hash13(ci+1.7),hash13(ci+5.3),hash13(ci+9.1));
    float dot1 = exp(-dot(cf-cp,cf-cp)*90.) * step(0.72,hr);
    float clust = smoothstep(0.50,0.70,fbm(q*14.+2.));
    float coast = 0.35 + 0.65*smoothstep(0.2,0.6,land);   // 陆地上更多，海上零星
    float city = (dot1*1.4 + exp(-dot(cf-cp,cf-cp)*12.)*0.12*step(0.72,hr)) * clust * coast * (1.-cl*0.85) * night;
    surf += vec3(1.,.62,.30) * city * 0.6 * uCity;
    col += surf * Tview;
  }

  // v003 夜面大气纱
  if(hit){
    vec3 n2 = normalize(ro+rd*t1);
    float night2 = 1.-smoothstep(-0.10,0.20,dot(n2,uSun));
    float thick = 1.-exp(-(odV.x*uBetaR.b*0.9));
    col += uVeilC * uVeil * thick * night2 * 0.08;
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
  params.moonDir = (opts.moonDir || DEFAULTS.moonDir).clone().normalize();
  params.lineColor = (opts.lineColor || DEFAULTS.lineColor).clone(); params.veilColor = (opts.veilColor || DEFAULTS.veilColor).clone();

  const U = {
    uCenter: { value: params.center.clone() }, uSun: { value: params.sunDir.clone() },
    uR: { value: params.R }, uTop: { value: 1 }, uHr: { value: 0 }, uHm: { value: 0 },
    uBetaR: { value: new THREE.Vector3() }, uBetaM: { value: 0 }, uG: { value: params.mieG },
    uSunI: { value: params.sunIntensity }, uGain: { value: 1 }, uMieGain: { value: 1 },
    uHalo: { value: 1 }, uHaloH: { value: 0.01 }, uTint: { value: 0.5 }, uWarm: { value: params.warm.clone() },
    uDay: { value: 0.35 }, uNight: { value: 1 }, uCloud: { value: 0.8 }, uCloudScale: { value: 5.5 },
    uCity: { value: 0 }, uRot: { value: 0 }, uExposure: { value: 1 },
    uBetaO: { value: new THREE.Vector3() }, uOzH: { value: 0.013 }, uOzW: { value: 0.008 },
    uMoon: { value: new THREE.Vector3(0, 1, 0) }, uMoonI: { value: 1 }, uHaloBlue: { value: 1 }, uMS: { value: 1 },
    uLineG: { value: 0 }, uLineH: { value: 0.0055 }, uLineW: { value: 0.0012 }, uLineC: { value: new THREE.Color() },
    uVeil: { value: 0 }, uVeilC: { value: new THREE.Color() }, uCDet: { value: 1 },
    uCSharp: { value: 1 }, uCover: { value: 0.32 }, uCRelief: { value: 1 }, uVortex: { value: 1 }, uLand: { value: 1 }, uGlint: { value: 1 },
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
    // 臭氧：真实 βO = (0.65, 1.881, 0.085)e-6 /m，换算到每个地球半径；分布为以 25 km 为中心的三角形（按标高放宽比例同步放大）
    U.uBetaO.value.set(4.1 * k * p.ozone, 12.0 * k * p.ozone, 0.54 * k * p.ozone);
    U.uOzH.value = 0.013 * lw; U.uOzW.value = 0.008 * lw;
    U.uMoon.value.copy(p.moonDir).normalize(); U.uMoonI.value = p.moonIntensity; U.uHaloBlue.value = p.haloBlue; U.uMS.value = p.multiScatter;
    U.uLineG.value = p.lineGain; U.uLineH.value = p.lineH * lw; U.uLineW.value = p.lineW * lw; U.uLineC.value.copy(p.lineColor);
    U.uVeil.value = p.veil; U.uVeilC.value.copy(p.veilColor); U.uCDet.value = p.cloudDetail;
    U.uCSharp.value = p.cloudSharp; U.uCover.value = p.cloudCover; U.uCRelief.value = p.cloudRelief; U.uVortex.value = p.vortex; U.uLand.value = p.landAmount; U.uGlint.value = p.glint;
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
