import * as THREE from 'three';

export const HEX = {
  muc: '#17131A', chamDem: '#232A62', chamSang: '#34399A', do: '#FF1F4F', hong: '#FF3A86', giay: '#F3DCD6', doChim: '#602443',
};
export const C = Object.fromEntries(Object.entries(HEX).map(([k, h]) => {
  const n = parseInt(h.slice(1), 16);
  return [k, new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255)];
}));

export const GOBO = `
uniform mat4 uCuaInv; uniform vec2 uCuaSize; uniform float uSlats, uLa;
float goboCua(vec3 wp, vec3 L) {
  vec4 o = uCuaInv * vec4(wp, 1.0); vec3 d = mat3(uCuaInv) * L;
  if (abs(d.z) < 1e-4) return 0.0;
  float t = -o.z / d.z;
  if (t < 0.0) return 0.0;
  vec2 q = o.xy + d.xy * t;
  vec2 uv = q / uCuaSize + 0.5;
  float bx = min(min(uv.x, 1.0 - uv.x) * uCuaSize.x, min(uv.y, 1.0 - uv.y) * uCuaSize.y);
  float s = uv.y * uSlats, f = fract(s);
  float fw = max(fwidth(s), 1e-4);
  float khe = clamp((f - uLa) / fw + 0.5, 0.0, 1.0) * clamp((0.985 - f) / fw + 0.5, 0.0, 1.0);
  float fb = max(fwidth(bx), 1e-5);
  return khe * clamp((bx - 0.045) / fb + 0.5, 0.0, 1.0);
}
`;
export const COMMON = `
const vec3 P_MUC = vec3(23.0, 19.0, 26.0) / 255.0, P_DOCHIM = vec3(96.0, 36.0, 67.0) / 255.0, P_DO = vec3(255.0, 31.0, 79.0) / 255.0;
float hash13(vec3 p3) { p3 = fract(p3 * .1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
float rutTham(float t, float n, float hat) {
  float w = max(1.0 - hat, 1e-3);
  float nn = w * 0.5 + n * (1.0 - w);
  return clamp((t - nn) / w + 0.5, 0.0, 1.0);
}
float denXe(vec3 wp, vec3 stripeAx, vec3 stripe, vec3 beamAx, vec3 beam) {
  float s = dot(wp, stripeAx) * stripe.x + stripe.y;
  float ds = stripe.z * 0.5 - abs(fract(s) - 0.5);
  float st = clamp(ds / (max(fwidth(s), 1e-5) * 6.0) + 0.5, 0.0, 1.0);
  float hx = dot(wp, beamAx) - beam.x;
  float b = clamp((beam.y - abs(hx)) / beam.z, 0.0, 1.0);
  return st * b;
}
float bac(float v, float th, float wpx) {
  float fw = max(fwidth(v), 1e-5);
  return clamp((v - th) / (fw * wpx) + 0.5, 0.0, 1.0);
}
`;

const POISSON = `const vec2 PD[12] = vec2[12](
  vec2(-0.326,-0.406), vec2(-0.840,-0.074), vec2(-0.696, 0.457), vec2(-0.203, 0.621), vec2( 0.962,-0.195), vec2( 0.473,-0.480),
  vec2( 0.519, 0.767), vec2( 0.185,-0.893), vec2( 0.507, 0.064), vec2( 0.896, 0.412), vec2(-0.322,-0.933), vec2(-0.792,-0.598));`;

const VERT = `
varying vec3 vObj;
varying vec3 vWorld;
varying vec3 vNrm;
varying vec3 vView;
uniform float uGioT, kLay, layTu; uniform vec3 uGioDir;
void main() {
  vObj = position;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  if (kLay > 0.0) {
    float h = clamp((layTu - wp.y) / max(layTu - 0.35, 0.05), 0.0, 1.0);
    float g = sin(uGioT * 1.3 + wp.y * 3.0) * 0.6 + sin(uGioT * 2.1 + 1.7 + wp.x * 2.0) * 0.4;
    wp.xyz += uGioDir * (h * h * kLay * g);
  }
  vWorld = wp.xyz;
  vNrm = normalize(mat3(modelMatrix) * normal);
  vec4 vp = viewMatrix * wp;
  vView = vp.xyz;
  gl_Position = projectionMatrix * vp;
}`;

export function makeShared() {
  return {
    uLfill: { value: new THREE.Vector3(0, 1, 0) },
    uLface: { value: new THREE.Vector3(0, 0, 1) },
    uDbg: { value: 0 },
    uLred: { value: new THREE.Vector3(-1, 0, 0) },
    uLhead: { value: new THREE.Vector3(-1, 0, 0) },
    uHeadI: { value: 0 },
    uStripeAx: { value: new THREE.Vector3(0, 1, 0) },
    uStripe: { value: new THREE.Vector3(14, 0, 0.5) },
    uBeamAx: { value: new THREE.Vector3(1, 0, 0) },
    uBeam: { value: new THREE.Vector3(0, 0.2, 0.06) },
    uFillVP: { value: new THREE.Matrix4() },
    uHeadVP: { value: new THREE.Matrix4() },
    uFillDepth: { value: null },
    uRedVP: { value: new THREE.Matrix4() },
    uRedDepth: { value: null },
    uHeadDepth: { value: null },
    uCamDepth: { value: null },
    uRes: { value: new THREE.Vector2(1, 1) },
    uRimDir: { value: new THREE.Vector2(-1, 0) },
    uRimDirH: { value: new THREE.Vector2(-1, 0) },
    uRimW: { value: 4 },
    uNear: { value: 0.1 },
    uFar: { value: 20 },
    uCell: { value: 0.0014 },
    uPx: { value: 1 },
    uMask: { value: 0 },
    uFillTexel: { value: 1 / 2048 },
    uHeadTexel: { value: 1 / 2048 },
    uLens: { value: [new THREE.Vector3(), new THREE.Vector3()] },
    uLensUp: { value: [new THREE.Vector3(), new THREE.Vector3()] },
    uLensRt: { value: [new THREE.Vector3(), new THREE.Vector3()] },
    uLensR: { value: 0.0195 },
    uGlint: { value: 0 },
    uCuaInv: { value: new THREE.Matrix4() }, uCuaSize: { value: new THREE.Vector2(1, 1) }, uSlats: { value: 6.5 }, uLa: { value: 0.5 },
    uTaps: { value: 12 },
    uRit: { value: 0 },
    uXeNguoi: { value: 1 },
    uSang: { value: 1 }, uSangCua: { value: 1 }, uNhen: { value: 1 }, uEmber: { value: new THREE.Vector3() }, uEmberI: { value: 0 },
    uDauC: { value: new THREE.Vector3() }, uDauF: { value: new THREE.Vector3(0, 0, 1) }, uDauU: { value: new THREE.Vector3(0, 1, 0) },
    uGioT: { value: 0 }, uGioDir: { value: new THREE.Vector3(1, 0, 0) },
  };
}

const FRAG = `
#include <packing>
${COMMON}
${GOBO}
${POISSON}
varying vec3 vObj;
varying vec3 vWorld;
varying vec3 vNrm;
varying vec3 vView;
uniform vec3 uLfill, uLred, uLhead, uStripeAx, uStripe, uLface, uBeamAx, uBeam;
uniform float uDbg; uniform vec3 cDbg;
uniform float uHeadI, uRimW, uNear, uFar, uCell, uPx, uMask, uFillTexel, uHeadTexel, uLensR, uGlint;
uniform mat4 uFillVP, uHeadVP, uRedVP;
uniform sampler2D uFillDepth, uHeadDepth, uCamDepth, uRedDepth;
uniform vec2 uRes, uRimDir, uRimDirH;
uniform int uTaps;
uniform float uRit, uXeNguoi, uSang, uNhen, uEmberI; uniform vec3 uEmber, uDauC, uDauF, uDauU;
uniform vec3 uLens[2], uLensUp[2], uLensRt[2];
uniform vec3 cDark, cMid, cHigh, cRim, cXe;
uniform float th1, gw1, hat1, th2, uHigh, uRimOn, uRimThr, uHeadOn, thH, uShadowOn, uKind, uSpeck, uGrainAmt, kRed, kFace, thFace, kEmber;

float shadowCov(sampler2D tex, mat4 vp, vec3 wp, float bias, float rad) {
  vec4 lp = vp * vec4(wp, 1.0);
  vec3 p = lp.xyz / lp.w * 0.5 + 0.5;
  if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0 || p.z > 1.0) return 1.0;
  float lit = 0.0;
  int nt = uTaps;
  for (int i = 0; i < 12; i++) {
    if (i >= nt) break;
    float d = textureLod(tex, p.xy + PD[i] * rad, 0.0).r;
    lit += (p.z - bias <= d) ? 1.0 : 0.0;
  }
  return lit / float(nt);
}
float viewZAt(vec2 frag) {
  float d = textureLod(uCamDepth, frag / uRes, 0.0).r;
  if (d >= 1.0) return -1e4;
  return perspectiveDepthToViewZ(d, uNear, uFar);
}
void main() {
  if (uMask > 0.5) { gl_FragColor = vec4(1.0); return; }
  if (uDbg > 0.5) { gl_FragColor = vec4(cDbg * (0.55 + 0.45 * max(dot(normalize(vNrm), normalize(vec3(-0.3, 0.8, 0.5))), 0.0)), 1.0); return; }
  vec3 n = normalize(vNrm);
  if (!gl_FrontFacing) n = -n;
  vec3 cell = floor(vObj / uCell);
  float r1 = hash13(cell), r2 = hash13(cell + 17.31), r3 = hash13(cell + 41.7), r4 = hash13(cell + 73.1);

  if (uKind > 0.5) {
    vec3 col;
    if (uKind < 1.5) {
      int k = distance(vWorld, uLens[0]) < distance(vWorld, uLens[1]) ? 0 : 1;
      vec3 d = vWorld - uLens[k];
      float y = dot(d, uLensUp[k]) / uLensR, x = dot(d, uLensRt[k]) / uLensR;
      float t = clamp(y * 1.1 + 0.15, 0.0, 1.0);
      col = mix(cRim, cHigh, rutTham(t, r1, 0.55));
      float g = length(vec2(x, y) - vec2(-0.38, 0.42));
      float gl = clamp((0.16 - g) / max(fwidth(g), 1e-4) + 0.5, 0.0, 1.0);
      col = mix(col, cMid, gl);
      vec3 toi = mix(P_MUC, P_DOCHIM, rutTham(uEmberI * 0.85, r2, 0.62));
      toi = mix(toi, cMid, gl * step(0.3, uEmberI));
      col = mix(toi, col, rutTham(uSang, r2, 0.62));
    } else {
      col = mix(cRim, cHigh, rutTham(clamp(0.2 + 0.8 * uRit, 0.0, 1.0), r1, 0.6));
      col = mix(col, cMid, rutTham(clamp(uRit * 1.3 - 0.35, 0.0, 1.0), r2, 0.7));
      col = mix(P_MUC, col, rutTham(uNhen, r3, 0.62));
    }
    col += (r3 + r4 - 1.0) * (10.0 / 255.0);
    gl_FragColor = vec4(col, 1.0);
    return;
  }

  float vF = dot(n, uLfill);
  float sF = uShadowOn > 0.5 ? shadowCov(uFillDepth, uFillVP, vWorld + n * 0.002, 0.0015, uFillTexel * 2.5) : 1.0;
  float t1 = rutTham(bac(vF, th1, gw1), r1, hat1) * rutTham(sF, r2, 0.62);
  if (kRed > 0.0) {
    float vR = dot(n, uLred);
    float sR = shadowCov(uRedDepth, uRedVP, vWorld + n * 0.002, 0.0015, uFillTexel * 2.5);
    float tR = rutTham(bac(vR, th1 + 0.05, gw1), r1, hat1) * rutTham(sR, r2, 0.62) * kRed;
    t1 = max(t1, tR);
  }
  if (kFace > 0.0) {
    float vC = dot(n, uLface);
    t1 = max(t1, rutTham(bac(vC, thFace, gw1), r1, hat1) * rutTham(sF, r2, 0.62) * kFace);
  }
  vec3 col = mix(cDark, cMid, t1);
  float t2 = bac(vF, th2, 1.2) * step(0.99, sF);
  col = mix(col, cHigh, t2 * uHigh);

  if (uHeadI > 0.001 && uHeadOn > 0.0 && uXeNguoi > 0.5) {
    float vH = dot(n, uLhead);
    float stripe = goboCua(vWorld + n * 0.003, uLhead);
    float sH = shadowCov(uHeadDepth, uHeadVP, vWorld + n * 0.002, 0.0015, uHeadTexel * 2.0);
    float tH = bac(vH, thH, 10.0) * stripe * sH * uHeadI;
    tH = rutTham(tH, r3, 0.6) * uHeadOn;
    col = mix(col, cHigh, tH);
    col = mix(col, cXe, tH * rutTham(bac(vH, 0.62, 6.0), r4, 0.6));
  }

  if (uRimOn > 0.0) {
    float myZ = vView.z;
    float cnt = 0.0;
    float nr = uTaps < 12 ? 2.0 : 4.0;
    for (int k = 1; k <= 4; k++) {
      if (float(k) > nr) break;
      vec2 f = gl_FragCoord.xy + uRimDir * uRimW * (float(k) / nr);
      cnt += (myZ - viewZAt(f) > uRimThr) ? 1.0 : 0.0;
    }
    cnt *= 4.0 / nr;
    float face = smoothstep(0.0, 0.3, dot(n, uLred));
    float sRr = face > 0.0 ? shadowCov(uRedDepth, uRedVP, vWorld + n * 0.003, 0.0015, uFillTexel * 1.5) : 0.0;
    float tR = rutTham(clamp(cnt / 4.0 * 1.6 - 0.2, 0.0, 1.0) * face * sRr, r4, 0.55) * uRimOn;
    col = mix(col, cRim, tR);
    if (uHeadI > 0.001 && uHeadOn > 0.0 && uXeNguoi > 0.5) {
      float cH = 0.0;
      for (int k = 1; k <= 4; k++) {
        if (float(k) > nr) break;
        vec2 f = gl_FragCoord.xy + uRimDirH * uRimW * 1.3 * (float(k) / nr);
        cH += (myZ - viewZAt(f) > uRimThr) ? 1.0 : 0.0;
      }
      cH *= 4.0 / nr;
      float faceH = smoothstep(0.0, 0.3, dot(n, uLhead));
      float gH = goboCua(vWorld + n * 0.003, uLhead);
      float sHr = faceH > 0.0 ? shadowCov(uHeadDepth, uHeadVP, vWorld + n * 0.003, 0.0015, uHeadTexel * 1.5) : 0.0;
      float tRH = rutTham(clamp(cH / 4.0 * 1.6 - 0.2, 0.0, 1.0) * faceH * gH * sHr * uHeadI, r1, 0.55);
      col = mix(col, cXe, tRH);
    }
  }

  col = mix(P_MUC, col, rutTham(uSang, fract(r2 + r3 * 0.37), 0.62));
  if (uEmberI > 0.002 && kEmber > 0.0) {
    vec3 dE = uEmber - vWorld; float lE = length(dE);
    float huong = clamp(dot(n, dE / max(lE, 1e-4)), 0.0, 1.0);
    vec3 rel = vWorld - uDauC;
    float truoc = smoothstep(0.0, 0.03, dot(rel, uDauF));
    float duoi = (1.0 - smoothstep(-0.09, -0.05, dot(rel, uDauU))) * smoothstep(0.45, -0.1, dot(n, uDauU));
    float laDau = 1.0 - step(0.15, length(rel));
    float e = 0.0, gan = 0.0, xa = 0.0;
    if (kEmber > 3.5) { e = huong; xa = 1.0 - smoothstep(0.17, 0.2, lE); }
    else if (kEmber > 2.5) { e = smoothstep(0.35, 0.6, -n.y) * truoc; xa = 1.0 - smoothstep(0.22, 0.26, lE); }
    else if (kEmber > 1.5) { e = 1.0; gan = 1.0 - smoothstep(0.1, 0.125, lE); xa = gan; }
    else {
      e = huong * mix(1.0, truoc * duoi, laDau);
      gan = 1.0 - smoothstep(0.05, 0.062, lE); xa = 1.0 - smoothstep(0.1, 0.115, lE);
    }
    e *= uEmberI;
    col = mix(col, P_DOCHIM, bac(e * xa, 0.22, 1.5));
    col = mix(col, P_DO, bac(e * gan, 0.45, 1.5));
  }
  vec3 cellB = floor(vObj / (uCell * 1.9));
  float sp = hash13(cellB + 5.5);
  col = mix(col, col * 1.25 + vec3(0.0, 0.01, 0.06), step(1.0 - uSpeck, sp) * (0.55 + 0.45 * r2));
  col += (r3 + r4 - 1.0) * (uGrainAmt / 255.0) * (0.8 + 0.4 * col);
  gl_FragColor = vec4(col, 1.0);
}`;

export function makeMaterial(shared, p) {
  const u = {
    ...shared,
    cDark: { value: p.dark }, cMid: { value: p.mid }, cHigh: { value: p.high }, cRim: { value: p.rim || C.do },
    cXe: { value: p.xe || C.giay },
    th1: { value: p.th1 ?? 0.2 }, gw1: { value: p.gw1 ?? 12 }, hat1: { value: p.hat1 ?? 0.58 },
    th2: { value: p.th2 ?? 0.8 }, uHigh: { value: p.high2 ?? 0 },
    uRimOn: { value: p.rimOn ?? 1 }, uRimThr: { value: p.rimThr ?? 0.05 },
    uHeadOn: { value: p.headOn ?? 1 }, thH: { value: p.thH ?? 0.15 },
    uShadowOn: { value: p.shadow ?? 1 }, uKind: { value: p.kind ?? 0 }, kRed: { value: p.kRed ?? 0 },
    kFace: { value: p.kFace ?? 0 }, thFace: { value: p.thFace ?? 0.6 }, cDbg: { value: p.dbg || new THREE.Vector3(1, 0, 1) },
    uSpeck: { value: p.speck ?? 0.025 }, uGrainAmt: { value: p.grain ?? 14 }, kEmber: { value: p.ember ?? 0 },
    kLay: { value: p.lay ?? 0 }, layTu: { value: p.layTu ?? 1 },
  };
  const m = new THREE.ShaderMaterial({ uniforms: u, vertexShader: VERT, fragmentShader: FRAG, side: p.side ?? THREE.FrontSide });
  m.extensions = { derivatives: true };
  return m;
}
