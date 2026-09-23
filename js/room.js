/* room.js — the record shop around the crate, built from boxes and canvas paint: a wooden counter the crate sits on,
   a shelf unit behind it full of standing records (the label's own six face out), framed prints on a plaster wall,
   pendant lamps, a plank floor. Nothing here moves; the fog in stage.js fades it with depth. Units are centimetres. */

import * as THREE from 'three';
import { wood } from './album.js';

function make(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return { c, ctx: c.getContext('2d') };
}
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/** Plaster: a warm grey with fine noise, a little brighter where the afternoon light lands. */
function plaster(S = 512, seed = 3) {
  const { c, ctx } = make(S);
  ctx.fillStyle = '#b9ae9d'; ctx.fillRect(0, 0, S, S);
  const r = rng(seed);
  const img = ctx.getImageData(0, 0, S, S);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (r() - 0.5) * 22;
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  for (let i = 0; i < 60; i++) { // faint scuffs
    ctx.strokeStyle = `rgba(0,0,0,${0.03 + r() * 0.05})`; ctx.lineWidth = 0.5 + r() * 1.2;
    ctx.beginPath(); const x = r() * S, y = r() * S; ctx.moveTo(x, y); ctx.lineTo(x + (r() - 0.5) * 60, y + (r() - 0.5) * 60); ctx.stroke();
  }
  return c;
}

/** A framed print for the wall: one of the house sleeves, or a plain typographic card. */
function printCard(S, text, sub, ink, paper) {
  const { c, ctx } = make(S);
  ctx.fillStyle = paper; ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = ink; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.font = `600 ${S * 0.13}px Newsreader, Georgia, serif`;
  ctx.fillText(text, S * 0.1, S * 0.5);
  ctx.font = `500 ${S * 0.04}px Archivo, sans-serif`;
  ctx.fillText(sub.toUpperCase(), S * 0.1, S * 0.6);
  ctx.strokeStyle = ink; ctx.globalAlpha = 0.5; ctx.lineWidth = 2;
  ctx.strokeRect(S * 0.06, S * 0.06, S * 0.88, S * 0.88);
  return c;
}

/**
 * Builds the shop. `covers` = the six sleeve fronts (canvases) for the face-out records and the prints.
 * Returns { group, lights, mats } — mats are every material here (they all take the fog).
 */
export function buildRoom({ covers, tex, portrait }) {
  const group = new THREE.Group();
  const mats = [];
  // every material here is made transparent from the start: the shop fades out when a record is opened, and
  // switching `transparent` on at that moment would make the browser build the shader again mid-movement.
  const M = (o) => { const m = new THREE.MeshStandardMaterial({ transparent: true, ...o }); mats.push(m); return m; };
  const woodDark = tex(wood(1024, 512, 21), true, [2, 1]);
  const woodFloor = tex(wood(1024, 1024, 33), true, [5, 5]);
  const plasterTex = tex(plaster(512, 3), true, [4, 2]);

  // the counter the crate stands on: a thick top, a front panel, a kick
  const counterMat = M({ map: woodDark, roughness: 0.72, metalness: 0, envMapIntensity: 0.25 });
  const top = new THREE.Mesh(new THREE.BoxGeometry(190, 5, 130), counterMat);
  top.position.set(0, -4, -12);
  top.receiveShadow = true; top.castShadow = true;
  const front = new THREE.Mesh(new THREE.BoxGeometry(190, 80, 4), M({ map: tex(wood(512, 1024, 22), true, [1, 1]), roughness: 0.75, metalness: 0 }));
  front.position.set(0, -46, 51);
  const sideL = new THREE.Mesh(new THREE.BoxGeometry(4, 80, 130), counterMat); sideL.position.set(-93, -46, -12);
  const sideR = sideL.clone(); sideR.position.x = 93;
  group.add(top, front, sideL, sideR);

  // the floor and the walls
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), M({ map: woodFloor, roughness: 0.8, metalness: 0, envMapIntensity: 0.2 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, -90, -40); floor.receiveShadow = true;
  const wallMat = M({ map: plasterTex, roughness: 0.95, metalness: 0, envMapIntensity: 0.1 });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(700, 340), wallMat);
  back.position.set(0, 80, -196); back.receiveShadow = true;
  const left = new THREE.Mesh(new THREE.PlaneGeometry(400, 340), wallMat);
  left.rotation.y = Math.PI / 2; left.position.set(-330, 80, 0);
  const right = left.clone(); right.rotation.y = -Math.PI / 2; right.position.x = 330;
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(700, 400), M({ color: 0x3b332b, roughness: 1, metalness: 0 }));
  ceiling.rotation.x = Math.PI / 2; ceiling.position.set(0, 250, -40);
  group.add(floor, back, left, right, ceiling);
  // a dado rail and a skirting on the back wall
  const rail = new THREE.Mesh(new THREE.BoxGeometry(700, 3, 2.5), M({ color: 0x3a2f27, roughness: 0.7 }));
  rail.position.set(0, 42, -195); group.add(rail);

  // the shelf unit behind the counter: boards and dividers, bays full of records
  const shelfMat = M({ map: woodDark, roughness: 0.7, metalness: 0, envMapIntensity: 0.2 });
  const unit = new THREE.Group();
  const UW = 290, UD = 34, UZ = -176, ROWS = [-90, -50, -10, 30], BAYS = [-145, -48, 48, 145];
  for (const y of ROWS) { const b = new THREE.Mesh(new THREE.BoxGeometry(UW, 2.4, UD), shelfMat); b.position.set(0, y + 1.2, UZ); b.castShadow = true; b.receiveShadow = true; unit.add(b); }
  const topBoard = new THREE.Mesh(new THREE.BoxGeometry(UW, 2.4, UD), shelfMat); topBoard.position.set(0, 71, UZ); unit.add(topBoard);
  for (const x of BAYS) { const d = new THREE.Mesh(new THREE.BoxGeometry(2.4, 162, UD), shelfMat); d.position.set(x, -9, UZ); unit.add(d); }
  const backBoard = new THREE.Mesh(new THREE.BoxGeometry(UW, 162, 1.2), M({ color: 0x2e2620, roughness: 0.9 })); backBoard.position.set(0, -9, UZ - UD / 2 + 0.6); unit.add(backBoard);
  // records on the shelves: spines out, packed, each its own colour; a face-out one leaning at the front of each bay
  const PAL = ['#cfc7b6', '#b9ae9a', '#1d2742', '#2c3a8a', '#8a6a2c', '#243241', '#6e2a33', '#d8d0c2', '#8f3a3d', '#0f2029', '#1b1a21', '#bfb08e', '#55614a', '#a8a397', '#7a3d24', '#2d2d33', '#3b3a40', '#5a4a3a'];
  const r = rng(91);
  const per = portrait ? 34 : 52;
  const total = ROWS.length * (BAYS.length - 1) * per;
  const spineGeo = new THREE.BoxGeometry(1.25, 31.4, 31.4);
  const spines = new THREE.InstancedMesh(spineGeo, M({ color: 0xffffff, roughness: 0.85, metalness: 0 }), total);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), scl = new THREE.Vector3(1, 1, 1), col = new THREE.Color();
  let k = 0;
  for (const y of ROWS) {
    for (let b = 0; b < BAYS.length - 1; b++) {
      const x0 = BAYS[b] + 3, x1 = BAYS[b + 1] - 3, span = x1 - x0;
      const lean = (r() - 0.5) * 0.12;
      for (let i = 0; i < per; i++) {
        const x = x0 + 1 + (span - 2) * (i / per) + r() * 0.3;
        pos.set(x, y + 2.4 + 15.7 + r() * 0.4, UZ + 1 + (r() - 0.5) * 2);
        q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), lean + (r() - 0.5) * 0.05);
        m4.compose(pos, q, scl);
        spines.setMatrixAt(k, m4);
        col.set(PAL[Math.floor(r() * PAL.length)]).multiplyScalar(0.55 + r() * 0.35);
        spines.setColorAt(k, col);
        k += 1;
      }
    }
  }
  spines.instanceMatrix.needsUpdate = true;
  if (spines.instanceColor) spines.instanceColor.needsUpdate = true;
  spines.castShadow = false; spines.receiveShadow = true;
  unit.add(spines);
  // the label's own records, face out, one per bay on the upper rows
  const faceGeo = new THREE.BoxGeometry(31.4, 31.4, 1.2);
  covers.forEach((cv, i) => {
    const bay = i % (BAYS.length - 1), row = ROWS[ROWS.length - 1 - Math.floor(i / (BAYS.length - 1))];
    const m = new THREE.Mesh(faceGeo, [shelfMat, shelfMat, shelfMat, shelfMat, M({ map: tex(cv), roughness: 0.8, metalness: 0, envMapIntensity: 0.3 }), shelfMat]);
    m.position.set((BAYS[bay] + BAYS[bay + 1]) / 2 + (i % 2 ? 8 : -8), row + 2.4 + 15.9, UZ + UD / 2 - 2.5);
    m.rotation.x = -0.1;
    m.castShadow = true;
    unit.add(m);
  });
  group.add(unit);

  // framed prints on the wall above the unit
  const frameMat = M({ color: 0x1b1816, roughness: 0.5, metalness: 0.1 });
  const prints = [
    [covers[1] || printCard(512, 'Rhumb Line', 'Shocking Mike Records', '#1e2a35', '#e8dcc0'), -78, 118, 46],
    [printCard(512, 'SMR', 'Shocking Mike Records · est. 2026', '#141416', '#e9e4d8'), 0, 122, 54],
    [covers[2] || printCard(512, 'Chớm', 'Shocking Mike Records', '#3a2030', '#efe6da'), 78, 118, 46]
  ];
  for (const [cv, x, y, size] of prints) {
    const fr = new THREE.Mesh(new THREE.BoxGeometry(size + 6, size + 6, 2.2), frameMat);
    fr.position.set(x, y, -193.5); fr.castShadow = true;
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(size, size), M({ map: tex(cv), roughness: 0.9, metalness: 0 }));
    pic.position.set(x, y, -192.3);
    group.add(fr, pic);
  }

  // pendant lamps over the counter: a cord, a shade, a warm bulb, a point light each
  const lights = [];
  const shadeMat = M({ color: 0x2f3a33, roughness: 0.6, metalness: 0.2, side: THREE.DoubleSide });
  const innerMat = M({ color: 0xffe2b8, emissive: 0xffc98a, emissiveIntensity: 1.2, roughness: 1, side: THREE.BackSide });
  const bulbMat = M({ color: 0xfff1d6, emissive: 0xffe6c0, emissiveIntensity: 3, roughness: 1 });
  const cordMat = M({ color: 0x111111, roughness: 1 });
  for (const [x, z, y] of [[-78, -120, 74], [78, -120, 74], [0, -40, 84]]) {
    const shade = new THREE.Mesh(new THREE.ConeGeometry(15, 13, 32, 1, true), shadeMat);
    shade.position.set(x, y, z);
    const inner = new THREE.Mesh(new THREE.ConeGeometry(14.6, 12.6, 32, 1, true), innerMat);
    inner.position.copy(shade.position);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(2.6, 16, 12), bulbMat);
    bulb.position.set(x, y - 3, z);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 250 - y - 6, 6), cordMat);
    cord.position.set(x, (250 + y + 6) / 2, z);
    const light = new THREE.PointLight(0xffd6a2, 2600, 300, 2);
    light.position.set(x, y - 4, z);
    lights.push(light);
    group.add(shade, inner, bulb, cord, light);
  }

  // a few things on the counter, so it is a counter: a stack of sleeves and a mug
  const stackMat = M({ map: tex(covers[0] || printCard(256, 'SMR', '', '#141416', '#e9e4d8')), roughness: 0.85 });
  const pile = new THREE.Mesh(new THREE.BoxGeometry(31.4, 6, 31.4), [shelfMat, shelfMat, stackMat, shelfMat, shelfMat, shelfMat]);
  pile.position.set(-64, 1.5, 6); pile.rotation.y = 0.18; pile.castShadow = true; pile.receiveShadow = true;
  const mug = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 3.8, 9.5, 24), M({ color: 0xe9e4d8, roughness: 0.4 }));
  mug.position.set(62, 3.2, 18); mug.castShadow = true;
  group.add(pile, mug);

  return { group, lights, mats };
}
