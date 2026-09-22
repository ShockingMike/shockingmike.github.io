// Chớm world, season Đông: the Red River at night and the Long Biên bridge on the far side of the road.
//   riverMesh({ lights })     the water: painted strokes running with the current, the far mist, the lamps smeared into it
//   embankment(kb, mass, R)   the low wall and the bank between the road and the water, with steps down
//   longBien(kb, mass, R, o)  the bridge: stone piers, the deck, the diamond trusses, a few lamps (returns the lamp points)
// Everything is built from code; the bridge is a dark iron silhouette against the indigo sky, the water is almost black
// except where the lamps and the far bank fall into it.
import * as THREE from 'three';
import { U, COMMON_GLSL } from '../../core/paint.js';
import { V3, mat } from '../../core/build.js';

export const WATER_Y = -0.6;
const lin = (h) => new THREE.Color(h);
export const NRL = 8;                      // how many lights the water can mirror

// ---------------------------------------------------------------- the water
// A dark, slow river: long strokes along the current, the far side lost in mist, and under every lamp a broken column of
// light that stretches toward the eye (a painter's way of a reflection: bands of paint, not a mirror).
export function riverMesh({ at = [-52, WATER_Y, -60], size = [100, 240], colors = {} } = {}) {
  const k = { deep: '#171c2a', near: '#1f2432', crest: '#3e4460', ...colors };
  const lights = { value: Array.from({ length: NRL }, () => new THREE.Vector4(0, -999, 0, 0)) };
  // the bridge's own reflection: (z of the bridge, the deck's height, the width of one span, the near end of the bridge)
  // and (how far the trusses rise over the deck, the far end, 1 when there is a bridge to mirror)
  const bridgeA = { value: new THREE.Vector4(0, 0, 1, 0) }, bridgeB = { value: new THREE.Vector4(0, 0, 0, 0) };
  const lightCols = { value: Array.from({ length: NRL }, () => new THREE.Color(0, 0, 0)) };
  const m = new THREE.ShaderMaterial({
    uniforms: {
      ...U, cDeep: { value: lin(k.deep) }, cNear: { value: lin(k.near) }, cCrest: { value: lin(k.crest) },
      uRLight: lights, uRLightCol: lightCols, uBrA: bridgeA, uBrB: bridgeB,
    },
    vertexShader: `varying vec3 vWP; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vWP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      ${COMMON_GLSL()}
      uniform vec3 cDeep, cNear, cCrest;
      uniform vec4 uRLight[${NRL}]; uniform vec3 uRLightCol[${NRL}];
      uniform vec4 uBrA, uBrB;
      varying vec3 vWP;
      void main(){
        vec3 V = normalize(cameraPosition - vWP);
        float dist = length(cameraPosition - vWP);
        float dRef = length(uRefEye - vWP);
        // the current sets the strokes: long along z, drifting slowly downstream
        vec2 q = vec2(vWP.x, vWP.z + uTime * 0.35);
        float lf = smoothstep(8.0, 30.0, dRef), lf2 = smoothstep(30.0, 90.0, dRef);
        vec4 bn = texture2D(tBrush, q * vec2(0.5, 0.07) + vec2(0.11, 0.3));
        vec4 bf = texture2D(tBrush, q * vec2(0.5, 0.07) / 3.0 + vec2(0.63, 0.17));
        vec4 bg = texture2D(tBrush, q * vec2(0.5, 0.07) / 8.0 + vec2(0.29, 0.71));
        float pick = smoothstep(-0.03, 0.03, bf.a - (1.0 - lf) * 1.05);
        float pick2 = smoothstep(-0.03, 0.03, bg.a - (1.0 - lf2) * 1.05);
        vec4 b = mix(mix(bn, bf, pick), bg, pick2);
        vec4 b2 = texture2D(tBrush, vec2(vWP.x * 0.13, vWP.z * 0.05 + uTime * 0.05) + 0.37);
        // the body of the water: a little paler close to the near bank, deeper out
        float nearK = 1.0 - smoothstep(0.0, 26.0, abs(vWP.x + 3.0));
        vec3 col = mix(cDeep, cNear, band(b.b * 0.7 + nearK * 0.5 + (b2.b - 0.5) * 0.3, 0.5));
        // crests: a few pale strokes where the current folds, more toward the far mist
        float crest = band(b.a * (0.45 + 0.5 * b2.a) + (b.b - 0.5) * 0.3, 0.78);
        col = mix(col, cCrest, crest * 0.5 * (0.4 + 0.6 * smoothstep(6.0, 60.0, dist)));
        // the iron itself, mirrored: drop the eye under the water and see where that ray meets the bridge. Near the far
        // bank the reflection is the feet of the piers; close to us it is the top of the trusses, the way water folds a
        // tall thing down toward the one who looks at it.
        if (uBrB.z > 0.5 && vWP.z > uBrA.x) {
          vec3 em = vec3(cameraPosition.x, 2.0 * ${WATER_Y.toFixed(2)} - cameraPosition.y, cameraPosition.z);
          vec3 d = normalize(vWP - em);
          float t = (uBrA.x - vWP.z) / d.z;
          if (t > 0.0) {
            vec3 h = vWP + d * t;
            float u = fract((uBrA.w - h.x) / uBrA.z);
            float top = uBrA.y + 0.5 + uBrB.x * pow(sin(3.14159265 * u), 0.85);
            float edge = 0.4 + 1.2 * b.a;                                  // the paint breaks the edge of the iron
            float body = step(uBrA.y - 1.2, h.y) * (1.0 - smoothstep(top - edge, top + edge, h.y));
            // and the stone piers, standing from the water up to the deck at the middle of every span
            float du = abs(fract((uBrA.w - h.x) / uBrA.z) - 0.5) * uBrA.z;
            float pier = step(du, 1.7 + 0.5 * b.a) * step(h.y, uBrA.y - 1.2) * step(-1.4, h.y);
            float iron = max(body, pier);
            iron *= step(uBrB.y, h.x) * step(h.x, uBrA.w);
            // the deck is a solid band, the trusses above it are open ironwork, so they only half darken the water
            float open = mix(0.45, 1.0, smoothstep(uBrA.y + 1.2, uBrA.y - 0.4, h.y));
            float m = iron * open * (0.55 + 0.6 * b2.b) * smoothstep(1.0, 12.0, vWP.z - uBrA.x);
            col = mix(col, cDeep * 0.35, clamp(m, 0.0, 1.0) * 0.8);
          }
        }
        // the lamps of the bridge and the far bank, broken into bands of light that reach toward the eye
        vec3 f = -V;
        float ang = atan(f.z, f.x), angE = asin(f.y);
        for (int i = 0; i < ${NRL}; i++) {
          if (uRLight[i].y < -900.0) continue;
          vec3 mrr = vec3(uRLight[i].x, 2.0 * ${WATER_Y.toFixed(2)} - uRLight[i].y, uRLight[i].z);
          vec3 a = normalize(mrr - cameraPosition);
          float dx = abs(atan(a.z, a.x) - ang);
          float dy = angE - asin(a.y);
          float w = 0.02 * (0.5 + 1.0 * b.a) * (1.0 + max(-dy, 0.0) * 1.6) * uRLight[i].w;
          float colm = 1.0 - smoothstep(w * 0.3, w, dx);
          float fall = exp(-max(dy, 0.0) * 3.0 - max(-dy, 0.0) * 1.1);
          float g = colm * fall;
          float dab = band(g * (0.4 + 0.9 * b2.a) * (0.6 + 0.5 * b.b), 0.35);
          col = mix(col, uRLightCol[i] * 1.1, dab * 0.8);
          col = mix(col, mix(uRLightCol[i], vec3(1.0, 0.95, 0.82), 0.5), band(g * b.a * b2.a, 0.55) * 0.7);
          // and the small quick glints on top of it, the ones that make water read as water
          float spark = band(g * bn.a * b2.a * (0.55 + 0.85 * sin(uTime * 1.6 + vWP.z * 0.8 + vWP.x * 0.3)), 0.62);
          col = mix(col, vec3(1.0, 0.96, 0.86), spark * 0.6);
        }
        // the far water goes into the smoke of the air
        float air = clamp(0.1 + 0.9 * uAirMax * pow(smoothstep(uAirNear, uAirFar * 1.6, dist), 1.2), 0.0, 1.0);
        col = mix(col, airCol(vWP), air);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const g = new THREE.PlaneGeometry(size[0], size[1], 1, 1).rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(g, m);
  mesh.position.set(...at);
  mesh.frustumCulled = false;
  mesh.userData.castShadow = false;
  // the season fills these in: [x, y, z, width] and the colour of every light the water mirrors
  // the season hands the bridge over so the water can mirror its iron
  mesh.userData.setBridge = (o) => {
    // kept, so a measurement can read the bridge that was actually BUILT (seasons/dong/keepout.mjs) instead of working
    // its piers and spans out again from the numbers it was built with
    mesh.userData.bridge = o || null;
    if (!o) { bridgeB.value.z = 0; return; }
    bridgeA.value.set(o.z, o.deckY, o.spanW, o.xFrom);
    bridgeB.value.set(o.rise, o.xTo, 1, 0);
  };
  mesh.userData.setLights = (list) => {
    list.slice(0, NRL).forEach((l, i) => { lights.value[i].set(l.at.x, l.at.y, l.at.z, l.w ?? 1); lightCols.value[i].copy(lin(l.color ?? '#e8a860')); });
  };
  return mesh;
}

// ---------------------------------------------------------------- the bank between the road and the water
// a low concrete wall with a worn coping, the sloped bank below it, and a flight of steps down to the water
export function embankment(kb, mass, R, { xWall = -2.9, zFrom = 20, zTo = -150, stepsAt = -14, haze = 0.12 } = {}) {
  const H0 = { haze };
  const wallC = { col: '#5e5c5e', col2: '#86847e', scale: 0.5, drip: 0.5, seed: R(), ...H0 };
  const len = zFrom - zTo, zc = (zFrom + zTo) / 2;
  // the wall along the road, its coping a paler stone
  mass.box(0.34, 0.44, len, V3(xWall - 0.17, 0.0, zc), wallC);
  kb.box(0.44, 0.1, len, V3(xWall - 0.2, 0.25, zc), { col: '#7a7870', col2: '#a8a69c', scale: 0.8, drip: 0.3, seed: R(), ...H0 });
  // the bank below: two long slabs of dark stone down to the water
  mass.box(1.6, 0.9, len, V3(xWall - 1.0, -0.65, zc), { col: '#3e3c42', col2: '#5e5a5c', scale: 0.4, drip: 0.6, seed: R(), ...H0 });
  mass.box(2.4, 0.5, len, V3(xWall - 2.6, -1.2, zc), { col: '#34323a', col2: '#4e4a50', scale: 0.4, drip: 0.5, seed: R(), ...H0 });
  // a flight of steps down to the water, where the boats tie up
  for (let k = 0; k < 6; k++) {
    kb.box(1.5, 0.16, 1.9, V3(xWall - 0.9, 0.2 - k * 0.22, stepsAt), { col: '#6a6864', col2: '#918e88', scale: 1, seed: R(), ...H0 });
  }
  return { xWall };
}

// ---------------------------------------------------------------- a sand barge out on the water
// The Red River works all night: a low steel barge loaded with sand, a cabin at the stern, one lamp at the bow.
// Returns the lamp's place, so the water can mirror it too.
export function barge(kb, mass, R, { at = [-20, WATER_Y, -44], ry = 0.08, haze = 0.3 } = {}) {
  const H0 = { haze };
  const [bx, by, bz] = at;
  const P = (x, y, z) => V3(bx + x * Math.cos(ry) + z * Math.sin(ry), by + y, bz - x * Math.sin(ry) + z * Math.cos(ry));
  const steel = { col: '#23272f', col2: '#454b55', scale: 0.8, drip: 0.6, seed: R(), ...H0 };
  const rust = { col: '#3a2a22', col2: '#6a4a38', scale: 1.4, drip: 0.5, seed: R(), ...H0 };
  mass.box(10.5, 1.15, 2.9, P(0, 0.05, 0), steel, [0, ry, 0]);
  kb.box(10.8, 0.16, 3.1, P(0, 0.62, 0), rust, [0, ry, 0]);
  mass.box(2.4, 1.5, 2.3, P(3.6, 1.4, 0), steel, [0, ry, 0]);                 // the cabin at the stern
  kb.box(2.6, 0.12, 2.5, P(3.6, 2.2, 0), rust, [0, ry, 0]);
  kb.box(0.5, 0.42, 0.5, P(2.7, 2.0, 0.2), { col: '#c8a058', col2: '#ffe0a8', emit: 0.5, scale: 3, seed: R(), ...H0 }, [0, ry, 0]);   // its lit window
  for (let k = 0; k < 4; k++) mass.box(1.7, 0.5 + 0.2 * (k % 2), 2.1, P(-3.2 + k * 1.6, 0.95, 0), { col: '#6a6255', col2: '#98907c', scale: 1.2, seed: R(), ...H0 }, [0, ry, 0]);  // the sand
  const lamp = P(-4.6, 2.35, 0);
  kb.cyl(0.05, 0.05, 1.7, P(-4.6, 1.5, 0), steel, 6, [0, ry, 0]);
  kb.add(new THREE.SphereGeometry(0.16, 10, 8), { col: '#c08a3a', col2: '#ffd89a', emit: 1.2, scale: 2, seed: R(), ...H0 }, mat(lamp));
  return { lamp };
}

// ---------------------------------------------------------------- Long Biên: the old iron bridge across the river
// Built as a silhouette: stone piers out of the water, the deck, and the row of spans whose trusses rise to a point in the
// middle of each, the way the bridge's remaining spans do. A few lamps hang along the deck.
export function longBien(kb, mass, R, { z = -56, deckY = 9.2, xFrom = 9, xTo = -124, spans = 7, haze = 0.06, landAt = -7 } = {}) {
  const H0 = { haze };
  const iron = { col: '#101219', col2: '#282c38', scale: 1.2, seed: R(), ...H0 };
  const iron2 = { col: '#0c0e14', col2: '#22262f', scale: 2, seed: R(), ...H0 };
  const stone = { col: '#191b22', col2: '#31333b', scale: 0.5, drip: 0.5, seed: R(), ...H0 };
  const stone2 = { col: '#1f2129', col2: '#393b43', scale: 0.8, drip: 0.4, seed: R(), ...H0 };
  const lamps = [];
  // every pier this actually builds, so the season can hand them to the clipping check instead of working them out
  // again from xFrom/spanW. A boat was found standing inside one on 21/9 and nothing caught it, because the piers
  // were not in `solids` and the boat was not in `movers`.
  const piers = [];
  const total = xFrom - xTo, spanW = total / spans;
  const mid = (xFrom + xTo) / 2;
  // ---- the deck. The railway runs down the middle between the two truss walls; the two roadways and their footways are
  // hung outside them on brackets, which is why the deck is wider than the iron and shows a lip along each side.
  mass.box(total, 0.5, 4.4, V3(mid, deckY, z), iron);
  kb.box(total, 0.14, 4.8, V3(mid, deckY + 0.3, z), iron2);
  for (const dz of [-3.9, 3.9]) {
    kb.box(total, 0.12, 2.1, V3(mid, deckY + 0.2, z + dz), iron2);                       // the roadway slab, outside the truss
    kb.box(total, 0.34, 0.1, V3(mid, deckY + 0.5, z + dz * 1.24), iron2);                // its railing, a thin line at this distance
  }
  for (let x = xFrom - 1; x > xTo; x -= 2.6) for (const dz of [-1, 1]) {
    kb.rod(V3(x, deckY - 0.3, z + dz * 2.2), V3(x, deckY + 0.16, z + dz * 4.8), 0.07, iron2, 4);   // the brackets under them
  }
  // ---- the land end: on shore the bridge is not iron at all but the old stone approach, a long wall of arches
  // (896 m of it in Hà Nội, green Thanh Hoá stone), so that is what crosses over the road and the houses.
  {
    const aw = 3.2, h = 4.6;                                     // one arch: its width and the height of its opening
    for (let x = xFrom; x > landAt; x -= aw) {
      const x0 = x, pw = 0.9;
      mass.box(pw, h, 6.2, V3(x0 - aw + pw / 2, deckY - 1.1 - h / 2, z), stone);          // the pier between two arches
      const r = (aw - pw) / 2, cx = x0 - aw + pw + r, cy = deckY - 1.1 - h;
      for (let k = 0; k <= 7; k++) {                                                      // the arch ring, laid as voussoirs
        const a = Math.PI * (k / 7);
        mass.box(0.62, 0.5, 6.0, V3(cx - Math.cos(a) * r, cy + Math.sin(a) * r, z), stone2, [0, 0, -a + Math.PI / 2]);
      }
      mass.box(aw, 0.8, 6.4, V3(x0 - aw / 2, deckY - 0.7, z), stone);                     // the spandrel wall over it
    }
    mass.box(2.2, deckY + 2.0, 7.0, V3(landAt - 0.6, (deckY - 1.0) / 2 - 1.0, z), stone); // the abutment the iron sits on
  }
  // ---- the spans over the water. The French ones rise from the deck at the pier to a long flat crest in the middle of
  // the span, so the line of the bridge goes up and down like the back of a dragon. Seven spans and four piers were
  // bombed out in the war and came back as plain straight Soviet girders, so the crests do not repeat evenly.
  const FRENCH = [1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1];             // 1 = the old curved span, 0 = a straight one
  for (let s = 0; s <= spans; s++) {
    const x = xFrom - s * spanW;
    const pxPier = x - spanW / 2;
    if (s < spans && pxPier < landAt) {
      // the stone piers: big, battered, out of the water up to the deck, with a cutwater facing the current
      mass.box(3.4, deckY + 1.8, 7.4, V3(pxPier, (deckY - 1.4) / 2 - 1.5, z), stone);
      mass.box(4.2, 0.7, 8.2, V3(pxPier, deckY - 1.1, z), stone2);                        // the cap under the iron
      mass.add(new THREE.CylinderGeometry(1.7, 2.1, deckY + 1.2, 10), stone, mat(V3(pxPier, (deckY - 1.4) / 2 - 1.5, z + 3.7), [0, 0, 0]));
      // The shape a check may use must be the shape that was BUILT, not a circle drawn round it: the pier is 3.4 wide
      // and 7.4 deep with a 2.1 m cutwater upstream, so it is given as four small circles down its length. A single
      // r = 5 circle was tried on 21/9 and it swallowed the path the crowd walks on - fourteen false overlaps against
      // the one pier that stands on the bar, and not one of them real.
      piers.push({ x: pxPier, z, w: 3.4, d: 7.4, inWater: pxPier < -4, circles: [
        { x: pxPier, z: z - 1.9, r: 1.7 }, { x: pxPier, z, r: 1.7 },
        { x: pxPier, z: z + 1.9, r: 1.7 }, { x: pxPier, z: z + 3.7, r: 2.1 },
      ] });
    }
    if (s === spans) continue;
    const x0 = Math.min(x, landAt), x1 = x - spanW;
    if (x0 <= x1) continue;
    const xm = (x0 + x1) / 2, w = x0 - x1;
    const old = FRENCH[s % FRENCH.length] === 1;
    const rise = old ? 7.4 : 3.1;                                  // the straight spans are shallow and flat on top
    const N = 8;
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      // a trapezoid, not a bow: up fast off the pier, then a long level crest through the middle of the span
      const f = old ? Math.min(1, Math.sin(Math.PI * u) * 1.42) : (u > 0.06 && u < 0.94 ? 1 : 0.12);
      pts.push([x0 + (x1 - x0) * u, deckY + 0.5 + rise * f]);
    }
    for (const dz of [-2.2, 2.2]) {
      for (let i = 0; i < N; i++) kb.rod(V3(pts[i][0], pts[i][1], z + dz), V3(pts[i + 1][0], pts[i + 1][1], z + dz), 0.22, iron, 5);
      for (let i = 1; i < N; i++) {
        const px = pts[i][0], py = pts[i][1];
        kb.rod(V3(px, deckY + 0.5, z + dz), V3(px, py, z + dz), 0.15, iron2, 4);          // the verticals
        kb.rod(V3(pts[i - 1][0], deckY + 0.5, z + dz), V3(px, py, z + dz), 0.13, iron2, 4);  // and the diagonals both ways
        kb.rod(V3(pts[i + 1][0], deckY + 0.5, z + dz), V3(px, py, z + dz), 0.13, iron2, 4);
      }
      kb.rod(V3(x0, deckY - 0.4, z + dz), V3(x1, deckY - 0.4, z + dz), 0.14, iron, 4);     // the lower chord
      if (!old) kb.rod(V3(x0, pts[1][1], z + dz), V3(x1, pts[1][1], z + dz), 0.15, iron, 4);
    }
    for (let i = 1; i < N; i += 2) kb.rod(V3(pts[i][0], pts[i][1], z - 2.2), V3(pts[i][0], pts[i][1], z + 2.2), 0.09, iron2, 4);
    // lamps over the roadway: one at the middle of every span and one at each end, the way the deck is really lit
    const lz = z + 4.2;
    for (const lx of [xm, x1 + w * 0.02]) {
      kb.box(0.12, 1.5, 0.12, V3(lx, deckY + 1.1, lz), iron2);
      kb.add(new THREE.SphereGeometry(0.26, 10, 8), { col: '#c08a3a', col2: '#ffd89a', emit: 1.3, scale: 2, seed: R(), ...H0 }, mat(V3(lx, deckY + 1.9, lz)));
      lamps.push(V3(lx, deckY + 1.9, lz));
    }
  }
  return { lamps, piers, deckY, z, spanW, xFrom, xTo, landAt, rise: 7.9 };
}
