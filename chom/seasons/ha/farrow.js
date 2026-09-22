// Chớm world, season Hạ: the rows of houses far across the water (Trúc Bạch's far side, and the end of Thanh Niên).
//
// WHY THIS IS THE SEASON'S OWN AND NOT core.backdrop (21/9 late, the scene gate's round twelve): core.backdrop is a flat
// upright plane whose houses end in a ruler-straight line where the lake covers them, with a roofline of one hashed
// height per 6-7 m cell (and most cells near the lowest height), all washed toward one sky colour. At half the scroll
// the end-of-road row read as a pale sticker laid on the water: a flat block, a hard bottom edge, a nearly flat top.
// Three changes, nothing else:
//  1. THE FOOT MELTS INTO THE HAZE ON THE WATER: the lowest few metres go see-through in a wavy, brushed band, so what
//     shows there is what is really behind - the far lake and the horizon, in the same air as the lake in front. No
//     colour is invented for the mist, so it cannot be the wrong one.
//  2. THE ROOFLINE BREAKS: heights rise and dip in groups along the row (a slow noise) as well as house by house; plots
//     are split in two now and then; pitched roofs, water tanks, a few tree crowns between the houses.
//  3. THE SAME AIR AS THE LAKE: the far houses take airCol/airAt like everything else at that distance.
// The reflection on the water is the lake's (water.js: `farRows`), from the same skyline function (SKYLINE_GLSL), so the
// mirrored houses are these houses.
import * as THREE from 'three';
import { U, COMMON_GLSL } from '../../core/paint.js';

const lin = (h) => new THREE.Color(h);

// the skyline: height of the roof (metres above the row's foot) at x along the row. Shared with the lake's reflection.
export const SKYLINE_GLSL = /* glsl */`
float rowTop(float x, float seed, float minH, float maxH, float cw){
  float cell = floor(x / cw);
  float fx = fract(x / cw);
  // a plot split in two, now and then, at a place of its own
  float split = 0.3 + 0.4 * hash12(vec2(cell, seed + 11.0));
  float two = step(0.55, hash12(vec2(cell, seed + 13.0)));
  float sub = two * step(split, fx);
  float lx = two > 0.5 ? (sub > 0.5 ? (fx - split) / (1.0 - split) : fx / split) : fx;
  // height: house by house, and in groups along the row (so the tops never run level for long)
  float group = fbm(vec2(x * 0.018 + seed * 3.1, seed));
  float hh = mix(minH, maxH, clamp(0.25 + 0.75 * hash12(vec2(cell * 2.0 + sub, seed + 1.0)) * (0.55 + 0.9 * group), 0.0, 1.0));
  float kind = hash12(vec2(cell * 2.0 + sub, seed + 3.0));
  float top = hh;
  if (kind > 0.62) top += (0.5 - abs(lx - 0.5)) * 2.6;                          // a pitched roof
  else if (kind < 0.12) top += step(abs(lx - 0.28), 0.1) * 1.4;                 // a water tank on a flat roof
  else if (kind < 0.2) top += step(abs(lx - 0.7), 0.012) * 3.2;                 // an aerial
  // a tree crown between the houses, rounder than any roof
  float tr = hash12(vec2(cell, seed + 17.0));
  if (tr < 0.16) { float c = 1.0 - pow(abs(fx - 0.5) * 2.0, 2.0); top = max(top, minH * 0.55 + sqrt(max(c, 0.0)) * 4.5); }
  return top;
}
// the same, with the row's two ends stepping down to low houses (a row that stops at full height on a vertical cut
// is the edge of a sheet, not the end of a street)
float rowTopT(float x, float seed, float minH, float maxH, float cw, float halfW){
  // stepped house by house (the taper is read at each plot's middle): a smooth ramp read as a hillside
  float xc = (floor(x / (cw * 0.5)) + 0.5) * cw * 0.5;
  return mix(minH * 0.35, rowTop(x, seed, minH, maxH, cw), smoothstep(0.0, 28.0, halfW - abs(xc)));
}
`;
// what the lake needs to mirror a row: where it stands and its skyline numbers (water.js farRows)
export function rowForLake(o, at, ry) {
  const tone = new THREE.Color(o.cBld).lerp(new THREE.Color(o.cBld2), 0.5).lerp(new THREE.Color(o.cSky), o.haze);
  return { at, ry, halfW: o.w / 2, seed: o.seed, minH: o.minH ?? 5, maxH: o.maxH ?? 14, cellW: o.cellW ?? 4.5, mist: o.mist ?? 4.5, tone };
}

export function farRow({ w, h, seed, haze, cBld, cBld2, cWin, cSky, cRoof = '#9a8a86', winDensity = 0.1, minH = 5, maxH = 14, cellW = 4.5, strokes = 0.35, mist = 4.5 }) {
  const m = new THREE.ShaderMaterial({
    side: THREE.DoubleSide, transparent: true,
    uniforms: {
      ...U, uSeed: { value: seed }, uHaze: { value: haze }, uMinH: { value: minH }, uMaxH: { value: maxH }, uCellW: { value: cellW },
      cBld: { value: lin(cBld) }, cBld2: { value: lin(cBld2) }, cWin: { value: lin(cWin) }, cSky: { value: lin(cSky) }, cRoof: { value: lin(cRoof) },
      uWin: { value: winDensity }, uStroke: { value: strokes }, uMist: { value: mist }, uHalfW: { value: w / 2 },
    },
    vertexShader: `varying vec2 vP; varying vec3 vWP; void main(){ vP = position.xy; vec4 w = modelMatrix * vec4(position, 1.); vWP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      ${COMMON_GLSL()}
      uniform float uSeed, uHaze, uMinH, uMaxH, uCellW, uWin, uStroke, uMist, uHalfW;
      uniform vec3 cBld, cBld2, cWin, cSky, cRoof;
      varying vec2 vP; varying vec3 vWP;
      ${SKYLINE_GLSL}
      void main(){
        vec2 p = vP;
        vec4 b = texture2D(tBrush, p.yx * uStroke + uSeed);
        vec4 b2 = texture2D(tBrush, p * uStroke * 0.6 + uSeed * 1.7);
        float top = rowTopT(p.x, uSeed, uMinH, uMaxH, uCellW, uHalfW);
        float edge = (b.a - 0.5) * 0.5;
        if (p.y > top + edge) discard;
        float cell = floor(p.x / uCellW);
        vec3 col = mix(cBld, cBld2, band(b.b + hash12(vec2(cell, uSeed + 5.0)) * 0.4 - 0.2, 0.5));
        // not one flat tone: each plot a little lighter or darker than its neighbours
        col *= 0.86 + 0.2 * hash12(vec2(floor(p.x / (uCellW * 0.5)), uSeed + 21.0));
        col = mix(col, cRoof, step(top - 1.2 + edge * 0.5, p.y) * step(0.62, hash12(vec2(cell, uSeed + 3.0))));
        vec2 wc = vec2(p.x / 1.7, (p.y - 0.8) / 3.1);
        vec2 wi = floor(wc), wf = fract(wc);
        float isWin = step(abs(wf.x - 0.5), 0.2) * step(abs(wf.y - 0.45), 0.22) * step(0.9, p.y) * step(p.y, top - 1.6);
        float lit = step(hash12(wi + uSeed * 7.0), uWin);
        float dab = band(isWin * (0.5 + b2.a), 0.6);
        col = mix(col, cBld * 0.72, dab * (1.0 - lit) * 0.7);
        col = mix(col, cWin, dab * lit);
        col = mix(col, cSky, clamp(uHaze + (1.0 - smoothstep(0.0, top, p.y)) * 0.2, 0.0, 1.0));
        // the same air as the lake in front of it - lightly: the row already carries its own haze, and at 0.5 it came
        // out paler than the hills twice as far behind it (21/9)
        col = mix(col, airCol(vWP), airAt(vWP) * 0.22);
        // the foot: see-through in a wavy, brushed band - the far water and the horizon show there, not a painted edge
        float mt = uMist * (0.6 + 0.8 * fbm(vec2(p.x * 0.05 + uSeed, 0.3 * uSeed)));
        float a = smoothstep(0.0, mt, p.y + 0.6 + (b.a - 0.5) * 1.6 + (b2.b - 0.5) * 0.8);
        a *= smoothstep(0.0, 10.0, uHalfW - abs(p.x));      // and the ends fade into the air too
        if (a < 0.01) discard;
        gl_FragColor = vec4(col, a);
      }`,
  });
  const g = new THREE.PlaneGeometry(w, h);
  g.translate(0, h / 2 - 1, 0);
  const mesh = new THREE.Mesh(g, m);
  mesh.frustumCulled = false;
  return mesh;
}
