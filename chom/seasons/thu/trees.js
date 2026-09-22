// Chớm world, season Thu: the milk-flower trees (hoa sữa, Alstonia scholaris).
//   A tall straight trunk; branches in whorls, so the crown stands in flat tiers like a pagoda; leaves in rosettes;
//   the flowers in dense ivory umbels on top of each rosette, lit up under the street lamps.
//   Crowns are big flat brush strokes laid on the air (cards cut out by the real scanned strokes in tex/strokes.png,
//   the way paint test B did it), lit by the core's light (the lamp band, the six warm lights, the night sky, the air).
//   milkTree -> trunk into a hero Batch, crown into Cards;  milkBranch -> the branch at the lens.
//   (the florets falling are the core's petals, in ivory: season.js)
import * as THREE from 'three';
import { U, COMMON_GLSL } from '../../core/paint.js';
import { V3, C, withC } from '../../core/build.js';

const LEAF_CELLS = [0, 1, 2, 3, 5, 6, 7, 8, 10, 11];
const FLOWER_CELLS = [12, 13, 14, 15];

const FLORET = { col: '#b8bca2', col2: '#fffae8', emit: 0.5, erode: 0.08, hilite: 0.25, scale: 30, bump: 0.7 };
const FLORET_SHADE = { col: '#7e8a6c', col2: '#e2e0c4', emit: 0.24, erode: 0.08, hilite: 0.15, scale: 30, bump: 0.7 };
const STALK = { col: '#2a3a2a', col2: '#6a7e5a', erode: 0, hilite: 0.1, scale: 20, bump: 0.5 };
const FLORET_GEO = new Map();
function floretGeo(r) {
  const key = Math.round(r * 2000);
  if (!FLORET_GEO.has(key)) {
    const g = new THREE.CircleGeometry(key / 2000, 10);
    const pp = g.attributes.position;
    for (let i = 1; i < pp.count; i++) {
      const x = pp.getX(i), y = pp.getY(i), a = Math.atan2(y, x);
      const k = 0.55 + 0.45 * Math.abs(Math.cos(2.5 * a));
      pp.setXYZ(i, x * k, y * k, 0);
    }
    g.computeVertexNormals();
    FLORET_GEO.set(key, g);
  }
  return FLORET_GEO.get(key);
}

export class Cards {
  constructor(viewDir) {
    this.view = viewDir.clone().normalize();
    this.p = []; this.uv = []; this.cell = []; this.ctr = []; this.col = []; this.col2 = []; this.par = []; this.sway = []; this.tree = [];
  }
  // one card: centre, width, height, in-plane angle, cluster centre, colours, kind (0 leaf, 1 flower)
  card(c, w, h, rot, ctr, col, col2, R, { kind = 0, sway = 0, tree = 0, tilt = 0.45, haze = 0 } = {}) {
    const n = this.view.clone().negate().add(V3((R() - 0.5) * tilt, (R() - 0.3) * tilt, (R() - 0.5) * tilt)).normalize();
    const up0 = Math.abs(n.y) > 0.9 ? V3(1, 0, 0) : V3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(up0, n).normalize();
    const up = new THREE.Vector3().crossVectors(n, right).normalize();
    const cr = Math.cos(rot), sr = Math.sin(rot);
    const ax = right.clone().multiplyScalar(cr).addScaledVector(up, sr).multiplyScalar(w / 2);
    const ay = up.clone().multiplyScalar(cr).addScaledVector(right, -sr).multiplyScalar(h / 2);
    const cells = kind ? FLOWER_CELLS : LEAF_CELLS;
    const cell = cells[Math.floor(R() * cells.length)];
    const flip = R() < 0.5;
    const c1 = new THREE.Color(col), c2 = new THREE.Color(col2);
    const rnd = R();
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]]) {
      const q = c.clone().addScaledVector(ax, sx).addScaledVector(ay, sy);
      this.p.push(q.x, q.y, q.z);
      this.uv.push(flip ? (1 - sx) / 2 : (sx + 1) / 2, (sy + 1) / 2);
      this.cell.push(cell);
      this.ctr.push(ctr.x, ctr.y, ctr.z);
      this.col.push(c1.r, c1.g, c1.b); this.col2.push(c2.r, c2.g, c2.b);
      this.par.push(kind, rnd, haze, 0);
      this.sway.push(typeof sway === 'function' ? sway(q.x, q.y, q.z) : sway);
      this.tree.push(tree);
    }
  }
  get count() { return this.p.length / 18; }
  mesh() {
    const g = new THREE.BufferGeometry();
    const f = (a, k) => new THREE.BufferAttribute(new Float32Array(a), k);
    g.setAttribute('position', f(this.p, 3));
    g.setAttribute('uv', f(this.uv, 2));
    g.setAttribute('aCell', f(this.cell, 1));
    g.setAttribute('aCtr', f(this.ctr, 3));
    g.setAttribute('aCol', f(this.col, 3));
    g.setAttribute('aCol2', f(this.col2, 3));
    g.setAttribute('aCard', f(this.par, 4));
    g.setAttribute('aSway', f(this.sway, 1));
    g.setAttribute('aTree', f(this.tree, 1));
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, cardMaterial());
    m.frustumCulled = false;
    // the cards cast into the shadow map as the cut-out strokes they are
    m.userData.shadowMaterial = cardMaterial(true);
    return m;
  }
}

function cardMaterial(shadow = false) {
  return new THREE.ShaderMaterial({
    uniforms: { ...U, uNear: { value: new THREE.Vector2(0, 0) } },
    side: THREE.DoubleSide, alphaToCoverage: !shadow,
    vertexShader: /* glsl */`
      attribute float aCell; attribute vec3 aCtr; attribute vec3 aCol; attribute vec3 aCol2; attribute vec4 aCard;
      attribute float aSway; attribute float aTree;
      uniform vec3 uSway[6]; uniform float uTime;
      varying vec2 vUv; varying float vCell; varying vec3 vWP, vCtr, vCol, vCol2; varying vec4 vCard;
      void main(){
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vec3 gust = uSway[int(aTree + 0.5)];
        float ph = aCtr.x * 0.35 + aCtr.y * 0.6 + aCtr.z * 0.21 + aTree * 2.1;
        // a slow night breeze through the tiers; the cursor gust makes the strokes shiver a little
        vec3 breeze = vec3(sin(uTime * 0.7 + ph), 0.0, cos(uTime * 0.55 + ph * 1.3)) * 0.03;
        vec3 flutter = vec3(sin(uTime * 2.3 + ph * 3.1), sin(uTime * 2.9 + ph * 2.3) * 0.6, cos(uTime * 2.1 + ph * 2.7)) * 0.06 * length(gust);
        vec3 move = (breeze + gust + flutter) * aSway;
        wp.xyz += move;
        vUv = uv; vCell = aCell; vWP = wp.xyz; vCtr = aCtr + move; vCol = aCol; vCol2 = aCol2; vCard = aCard;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: shadow ? /* glsl */`
      uniform sampler2D tStrokes; varying vec2 vUv; varying float vCell;
      void main(){
        float cell = floor(vCell + 0.5);
        vec2 cc = vec2(mod(cell, 4.0), floor(cell / 4.0));
        if (texture2D(tStrokes, vec2((cc.x + vUv.x) / 4.0, (3.0 - cc.y + vUv.y) / 4.0)).r < 0.2) discard;
        gl_FragColor = vec4(1.0);
      }` : /* glsl */`
      ${COMMON_GLSL()}
      uniform sampler2D tStrokes; uniform vec2 uNear;
      varying vec2 vUv; varying float vCell; varying vec3 vWP, vCtr, vCol, vCol2; varying vec4 vCard;
      void main(){
        float cell = floor(vCell + 0.5);
        vec2 cc = vec2(mod(cell, 4.0), floor(cell / 4.0));
        vec2 uv = vec2((cc.x + vUv.x) / 4.0, (3.0 - cc.y + vUv.y) / 4.0);
        float m = texture2D(tStrokes, uv).r;
        float dRef = length(uRefEye - vWP);
        // far away the stroke thickens a little, so a crown never goes bald or sparkles
        float cut = mix(0.2, 0.12, smoothstep(15.0, 60.0, dRef));
        float a = smoothstep(cut - 0.05, cut + 0.05, m);
        if (a < 0.02) discard;
        // near the lens (the push) the strokes break up and let the camera through
        if (uNear.y > 0.0 && length(cameraPosition - vWP) < mix(uNear.x, uNear.y, m)) discard;
        float flower = vCard.x;
        float tone = clamp((m - cut) / (0.9 - cut), 0.0, 1.0);
        vec3 N = normalize(vWP - vCtr);
        float j = (tone - 0.5) * 0.3 + (vCard.y - 0.5) * 0.2;
        vec3 alb = mix(vCol * 0.8, vCol2 * 1.12, band(tone + (vCard.y - 0.5) * 0.4, 0.5));
        // the lamps light the crowns all round them (no cone: the light spills up into the leaves), in painted steps
        float E = 0.0; vec3 Cb = vec3(0.0);
        for (int i = 0; i < ${6}; i++) {
          vec3 Lv = uBulb[i].xyz - vWP; float d = length(Lv); vec3 L = Lv / max(d, 1e-3);
          float att = clamp(1.0 - d / max(uBulb[i].w * 0.8, 1e-3), 0.0, 1.0); att *= att;
          float e = (max(dot(N, L), 0.0) * 0.7 + 0.3) * att;
          E += e; Cb += uBulbCol[i] * e;
        }
        vec3 hue = Cb / max(E, 1e-4);
        float ej = E + j * 0.06;
        float kq = band(ej, 0.02) * 0.4 + band(ej, 0.08) * 0.35 + band(ej, 0.2) * 0.25;
        vec3 amb = mix(uSkyLow, uSkyTop, N.y * 0.5 + 0.5);
        vec3 shade = alb * amb * (0.85 + 0.3 * tone) * mix(0.9, 1.15, band(dot(N, uFillDir) + j, 0.3));
        vec3 col = shade + alb * hue * kq * 0.9;
        // hoa sữa holds a little light of its own in the dark, and turns ivory under a lamp
        col += vCol * flower * (0.05 + 0.05 * tone);
        vec3 ivory = uHi * mix(vec3(1.0), hue / max(max(hue.r, max(hue.g, hue.b)), 1e-3), 0.3);
        col = mix(col, ivory * (0.75 + 0.3 * tone), flower * band(kq + (tone - 0.5) * 0.25, 0.4) * 0.85);
        float air = max(vCard.z, airAt(vWP));
        float g = dot(col, vec3(0.3, 0.55, 0.15));
        col = mix(col, mix(vec3(g), col, 0.65), air * 0.5);
        col = mix(col, airCol(vWP), air);
        gl_FragColor = vec4(col, a);
      }`,
  });
}

// a hoa sữa tree: trunk and branches into the hero batch (tb), the crown into cards
export function milkTree(tb, cards, x, z, R, { tree = 1, scale = 1, low = 0, reach = 1, haze = 0, lean = 0 } = {}) {
  const bark = withC(C.bark, { col: '#1e1c22', col2: '#5a5258', scale: 6, haze, erode: 0.25 });
  const H = 12 * scale;
  const topAt = V3(x + lean, H * 0.92, z);
  const trunkSway = (px, py) => Math.max(0, (py - 3) / 14) * 0.35;
  tb.tube([V3(x, 0, z), V3(x + lean * 0.2, H * 0.3, z), V3(x + lean * 0.6, H * 0.6, z), topAt], 0.24 * scale, bark, 16, 9, trunkSway, tree);
  // root flare, and a whitewashed band at the foot (Hanoi paints its street trees)
  tb.cyl(0.25 * scale, 0.32 * scale, 0.5, V3(x, 0.25, z), bark, 12);
  tb.cyl(0.25 * scale, 0.27 * scale, 0.9, V3(x, 0.95, z), withC(C.paper, { col: '#8a8a88', col2: '#e8e6dc', scale: 5, erode: 0.2, haze }), 12);
  const tiers = [[0.36 - low, 2.7], [0.5 - low * 0.5, 2.8], [0.64, 2.4], [0.78, 1.9], [0.9, 1.2]];
  const sway = (px, py) => Math.max(0, (py - 3.5) / 8) * 0.9 + 0.1;
  const leafA = ['#1a2a24', '#2e4436'], leafB = ['#223228', '#3a5040'];
  const shell = [];
  tiers.forEach(([hf, rr], ti) => {
    const y = H * hf, r = rr * scale * reach;
    const cx = x + lean * hf;
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + ti * 0.9;
      tb.rod(V3(cx, y - 0.7, z), V3(cx + Math.cos(a) * r * 0.62, y + 0.15, z + Math.sin(a) * r * 0.62), 0.07 * scale, bark, 6, 0.03 * scale, sway, tree);
    }
    const nb = 4 + Math.floor(r * 1.3);
    for (let k = 0; k <= nb; k++) {
      const a = (k / nb) * Math.PI * 2 + R() * 0.6;
      const rad = k === nb ? 0 : r * (0.45 + R() * 0.32);
      const c = V3(cx + Math.cos(a) * rad, y + (R() - 0.5) * 0.7, z + Math.sin(a) * rad);
      const s = r * (0.4 + R() * 0.16);
      const pal = R() < 0.5 ? leafA : leafB;
      const n = 5 + Math.floor(R() * 3);
      for (let i = 0; i < n; i++) {
        const o = V3((R() - 0.5) * s * 1.3, (R() - 0.4) * s * 0.7, (R() - 0.5) * s * 1.3);
        const w = s * (1.3 + R() * 0.9);
        cards.card(c.clone().add(o), w, w * (0.42 + R() * 0.22), (R() - 0.5) * 0.9, c, pal[0], pal[1], R, { sway, tree, haze });
      }
      // umbels: ivory dabs sitting on top of the rosette, toward the eye; October, so many of them
      // many small dabs, tiered with the leaf rosettes (umbels sit at the ends of the whorls)
      const nf = 5 + Math.floor(R() * 4);
      for (let f = 0; f < nf; f++) {
        const o = V3((R() - 0.5) * s * 1.3, s * (0.15 + R() * 0.5), (R() - 0.5) * s * 1.3).addScaledVector(cards.view, -s * 0.35);
        const w = (0.16 + R() * 0.2) * scale;
        cards.card(c.clone().add(o), w, w * (0.7 + R() * 0.3), R() * 6.28, c, '#c8c6ae', '#f2eedc', R, { kind: 1, sway, tree, haze });
      }
      shell.push([c, s]);
    }
  });
  return { x, z, H, r: 0.32 * scale, shell };
}

// the branch at the lens: a whorl of leaf rosettes and umbels, hero paint (layer 0)
export async function milkBranch(b, base, dir, len, R, { sway = () => 0.3, tree = 0, cards = null, slice = null } = {}) {
  const bark = withC(C.bark, { col: '#1a181e', col2: '#4a4248', scale: 9 });
  const leaf = withC(C.leaf, { col: '#0a1612', col2: '#2a4234', gloss: 0.35, hilite: 0.35, scale: 9 });
  const leaf2 = withC(C.leaf, { col: '#0e1a16', col2: '#34503e', gloss: 0.3, hilite: 0.35, scale: 9 });
  const flower = { col: '#b8b8a0', col2: '#fffbea', emit: 0.2, erode: 0.1, hilite: 0.35, scale: 16, bump: 0.8 };
  const d = dir.clone().normalize();
  const pts = [];
  for (let i = 0; i <= 5; i++) pts.push(base.clone().addScaledVector(d, (len * i) / 5).add(V3(0, Math.sin(i * 1.1) * 0.04, (R() - 0.5) * 0.05)));
  b.tube(pts, 0.035, bark, 14, 7, sway, tree);
  const curve = new THREE.CatmullRomCurve3(pts);
  const tips = [];
  // side twigs, each ending in a rosette
  for (let k = 0; k < 8; k++) {
    const t = 0.25 + k * 0.1;
    const p = curve.getPoint(Math.min(0.99, t));
    const td = d.clone().multiplyScalar(0.4).add(V3(R() - 0.5, 0.3 + R() * 0.5, R() - 0.5)).normalize();
    const e = p.clone().addScaledVector(td, 0.18 + R() * 0.2);
    b.tube([p, p.clone().lerp(e, 0.5).add(V3(0, 0.02, 0)), e], 0.016, bark, 6, 5, sway, tree);
    tips.push(e);
  }
  tips.push(pts[pts.length - 1]);
  for (const e of tips) {
    // a rosette: 6-8 long leaves spread flat around the tip
    const nl = 6 + Math.floor(R() * 3);
    for (let i = 0; i < nl; i++) {
      const a = (i / nl) * Math.PI * 2 + R() * 0.4;
      const ll = 0.075 + R() * 0.04;
      const ld = V3(Math.cos(a), -0.15 + R() * 0.3, Math.sin(a)).normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(V3(1, 0, 0), ld);
      const m = new THREE.Matrix4().compose(e.clone().addScaledVector(ld, ll * 0.95), q, V3(ll, 0.008, ll * 0.28));
      b.push(() => new THREE.SphereGeometry(1, 10, 6), true, { ...(R() < 0.5 ? leaf : leaf2), smooth: true }, m, sway, tree);
    }
    // the umbel: a small dome of sub-heads on short stalks, each a knot of tiny five-lobed florets (green-ivory, the lit ones
    // paler), dark gaps between them; hero paint gives the dabs and the two steps of light
    // the umbel stands out of the rosette toward the eye (seen from below, flat leaves would hide it otherwise)
    const toEye = V3(0.6, 1.42, 0).sub(e).normalize();
    const axis = toEye.clone().multiplyScalar(0.75).add(V3(0, 0.66, 0)).normalize();
    const top = e.clone().addScaledVector(axis, 0.035);
    const qAxis = new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), axis);
    const heads = 6 + Math.floor(R() * 3);
    for (let h = 0; h < heads; h++) {
      const u = (h / heads) * 6.28 + R() * 0.6, v = h === 0 ? 0 : 0.45 + R() * 0.65;
      const n = V3(Math.sin(v) * Math.cos(u), Math.cos(v), Math.sin(v) * Math.sin(u)).applyQuaternion(qAxis);
      const hc = top.clone().addScaledVector(n, 0.022 + R() * 0.01);
      b.rod(e.clone().add(V3(0, 0.01, 0)), hc, 0.0025, STALK, 4, 0.0025, sway, tree);
      const nf = 11 + Math.floor(R() * 5);
      for (let i = 0; i < nf; i++) {
        const fu = R() * 6.28, fv = Math.acos(1 - R() * 0.85);
        const fn = V3(Math.sin(fv) * Math.cos(fu), Math.cos(fv), Math.sin(fv) * Math.sin(fu)).applyQuaternion(qAxis);
        const fp = hc.clone().addScaledVector(fn, 0.012 + R() * 0.005);
        const r = 0.0048 + R() * 0.0028;
        const q = new THREE.Quaternion().setFromUnitVectors(V3(0, 0, 1), fn.clone().lerp(toEye, 0.35).normalize());
        b.add(floretGeo(r), R() < 0.3 ? FLORET_SHADE : FLORET, new THREE.Matrix4().compose(fp, q, V3(1, 1, 1)), sway, tree);
      }
    }
    if (slice) await slice('lens umbel');
  }
}
