// Chớm world, season Hạ: the two main people, as simple stand-ins until their own folders exist in people/.
// TẠM: chờ Agent Nhân Vật (people/<name> for the roles teaMaker / picker; season.js builds a stand-in only for a role nobody plays).
// They reuse person() / solveArm() from people/placeholder (imported, not changed)
// and take the poses the real ones will have:
//   teaMaker  sits on a low stool at the tea table, nón lá bowed over an open lotus in her left hand; her right hand takes a pinch of
//             tea from the bowl, tucks it into the flower, folds the petals and winds a strip of lạt round them (6 s loop)
//   picker    stands at the stern of the boat and poles it; at the stop she lays the pole along the boat, bends over the far
//             side and brings up two flowers, then turns round and poles the boat back out stern first
import * as THREE from 'three';
import { person, solveArm, shoulderLocal } from '../../people/placeholder/people.js';
import { V3, Batch, hero, heroOf, withC, C, TIER2 } from '../../core/build.js';
import { lotusFlower, LC } from './lotus.js';
import { BOAT, boatAt, PICK } from './boat.js';
import { WATER_Y } from './water.js';

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const sm = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const win = (t, a, b, c, d) => sm(a, b, t) * (1 - sm(c, d, t));
const lerpV = (a, b, t) => a.clone().lerp(b, t);
const faceY = (at, face) => Math.atan2(face.x - at.x, face.z - at.z);
const step2 = (t) => Math.floor(t * 12) / 12;          // on twos

// ---------------------------------------------------------------- the tea maker
// slice: core.slice (yield to the page between the heavy steps; the person itself is one step)
export async function buildTeaMaker(scene, R, layout, slice = async () => {}) {
  await slice('before tea maker stand-in');
  const P = person(scene, {
    seated: true, s: 1, hunch: 0.07, seed: 3.1,
    // a faded indigo cotton blouse (áo cánh), black silk trousers, nón lá
    coat: withC(C.body, { col: '#1a1a2c', col2: '#5a5a80', gloss: 0.45, hilite: 0.6 }),
    pants: withC(C.body, { col: '#0c0c10', col2: '#383844', gloss: 0.5, hilite: 0.6 }),
    hat: 'non', cuff: withC(C.body, { col: '#1a1a2c', col2: '#6a6a90' }),
  });
  P.group.position.copy(layout.at);
  P.group.rotation.y = faceY(layout.at, layout.face);
  // the open flower in her left hand
  await slice('tea maker stand-in body');
  const fb = new Batch({ wind: true });
  fb.rod(V3(0, -0.16, 0), V3(0, 0, 0), 0.006, LC.stem, 5, 0.006, 0.02, 1);
  lotusFlower(fb, V3(0, 0, 0), { open: 0.9, size: 1.25, R, sway: 0.03, tree: 1, tea: true });
  const flower = hero(fb.merge(), { wind: true, rimW: 1.5, rimOff: 1.0 });
  P.group.add(flower);
  // a pinch of tea in the right hand (only while she carries it)
  const pinch = heroOf((() => { const b = new Batch(); b.blob(0.012, V3(0, 0, 0), [1, 0.7, 1], { col: '#34401e', col2: '#8a9a54', erode: 0, hilite: 0.1, scale: 30, bump: 1 }, 1, 1, 0.3); return b; })(), { rims: false });
  P.group.add(pinch);
  // where things are, in her own space
  const toL = (w) => P.group.worldToLocal(w.clone());
  P.group.updateMatrixWorld(true);
  const bowl = toL(layout.bowl);
  const hold = V3(0.07, 0.56, 0.36);
  function update(t) {
    const tc = ((step2(t) % 6) + 6) % 6;
    P.group.updateMatrixWorld(true);
    // 0-1.6 take tea from the bowl, 1.6-2.8 tuck it into the flower, 2.8-4.2 fold the petals, 4.2-6 wind the lạt round
    const take = win(tc, 0.2, 0.9, 1.3, 2.0);
    const tuck = win(tc, 1.6, 2.2, 2.6, 3.0);
    const fold = win(tc, 2.8, 3.3, 3.9, 4.3);
    const wind = win(tc, 4.2, 4.6, 5.6, 5.95);
    P.torso.rotation.set(0.12 + 0.06 * take + 0.04 * tuck, -0.1 * take + 0.05 * wind, -0.03 * take);
    P.head.rotation.set(0.35 + 0.1 * tuck + 0.08 * fold, -0.15 * take, 0);
    P.group.updateMatrixWorld(true);
    const SL = shoulderLocal(P, 0), SR = shoulderLocal(P, 1);
    // left hand holds the flower, lifts it a little toward her while she works
    const hL = hold.clone().add(V3(0.0, 0.02 * fold + 0.015 * Math.sin(tc * 1.1), -0.02 * tuck));
    const wL = solveArm(P.arms[0], SL, hL, V3(1, -0.4, -0.3), V3(-1, 0.3, 0), V3(-0.2, 0.4, 1));
    flower.position.copy(wL).add(V3(-0.03, 0.07, 0.03));
    flower.rotation.set(0.2 - 0.1 * fold, 0, -0.25);
    // right hand: bowl -> flower -> petals -> round and round
    let hR = V3(-0.16, 0.5, 0.3);
    hR = lerpV(hR, bowl.clone().add(V3(0, 0.05, 0)), take);
    hR = lerpV(hR, hL.clone().add(V3(-0.04, 0.1, 0.02)), tuck);
    hR = lerpV(hR, hL.clone().add(V3(-0.07, 0.07, 0.04)), fold);
    const a = tc * Math.PI * 2 / 0.9;
    hR = lerpV(hR, hL.clone().add(V3(-0.06 + 0.035 * Math.cos(a), 0.06, 0.035 * Math.sin(a))), wind);
    const wR = solveArm(P.arms[1], SR, hR, V3(-1, -0.3, -0.4), V3(1, -0.2, 0.2), V3(0.3, -0.2, 1));
    pinch.visible = tc > 0.9 && tc < 2.4;
    pinch.position.copy(wR).add(V3(0.02, -0.02, 0.05));
  }
  return { P, flower, update, sketch: [[P.group, { seed: 401, loops: 2, off: [4, 11], wob: 5, width: 1.4 }]] };
}

// ---------------------------------------------------------------- the picker on the boat
export async function buildPicker(scene, R, boat, slice = async () => {}) {
  await slice('before picker stand-in');
  const P = person(boat.group, {
    seated: false, s: 1, seed: 4.2, skirt: false, hunch: 0.04,
    coat: withC(C.body, { col: '#2e241e', col2: '#8a7058', gloss: 0.3, hilite: 0.4 }),
    pants: withC(C.body, { col: '#121014', col2: '#403a40', gloss: 0.3, hilite: 0.4 }),
    hat: 'non', tier: TIER2, rimW: 0,
  });
  P.group.position.set(-1.0, boat.deckY + 0.02, 0);
  const hands = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const Yax = V3(0, 1, 0);
  await slice('picker stand-in body');
  let poleTip = null;
  function update(t) {
    const tq = step2(t);
    const s = boatAt(tq);
    const g = boat.group;
    // she faces the way the boat is going: bow on the way in, stern on the way out (she turns during the 'turn' phase)
    const turn = s.phase === 'turn' ? sm(0.2, 0.8, s.u) : s.phase === 'out' ? 1 : 0;
    P.group.rotation.y = Math.PI / 2 + Math.PI * turn;
    P.group.position.x = -1.0 + 0.25 * turn;
    const pick = s.phase === 'pick';
    const k = pick ? s.u : 0;
    // two bends over the far side (her left on the way in)
    const bend = pick ? Math.max(win(k, 0.08, 0.26, 0.38, 0.5), win(k, 0.5, 0.66, 0.8, 0.94)) : 0;
    const poling = s.phase === 'in' || s.phase === 'out';
    const ph = s.push * Math.PI * 2;
    const lean = poling ? 0.18 + 0.12 * Math.sin(ph) : 0.05;
    P.torso.rotation.set(lean + 0.95 * bend, 0.25 * bend, -0.3 * bend);
    P.head.rotation.set(0.3 + 0.2 * bend, 0.2 * bend, 0);
    P.group.updateMatrixWorld(true);
    const SL = shoulderLocal(P, 0), SR = shoulderLocal(P, 1);
    boat.pole.visible = true;
    g.updateMatrixWorld(true);
    // how much the pole is in her hands (1) or lying along the boat (0): she lays it down as the boat stops and picks it
    // up again once she has turned round, each over about a second (never a jump)
    const held = s.phase === 'in' || s.phase === 'out' ? 1 : s.phase === 'pick' ? 1 - sm(0, 0.08, s.u) : sm(0.72, 1.0, s.u);
    // the held pole: its foot planted in the lake bed beside the hull on her left, behind her; while she pushes the boat
    // slides past the foot (so the foot moves back along the hull), then she lifts it and swings it forward again
    const fwd = s.phase === 'out' || s.phase === 'turn' ? -1 : 1;
    const herX = -1.0 + 0.25 * turn;
    const pp = s.push;
    const pushing = pp < 0.72;
    const kk = pushing ? pp / 0.72 : 1 - (pp - 0.72) / 0.28;
    const lift = pushing ? 0 : Math.sin((Math.PI * (pp - 0.72)) / 0.28);
    const foot = g.localToWorld(V3(herX - fwd * (0.25 + 1.0 * kk), -1.35 + 1.1 * lift, -0.62 * fwd));
    const grip = P.group.localToWorld(V3(0.3, 1.18 - 0.12 * kk, 0.14 - 0.22 * kk));
    const dH = grip.clone().sub(foot).normalize();
    const gripLen = grip.distanceTo(foot);
    const centreH = foot.clone().addScaledVector(dH, 2.1);
    // the laid pole
    const lay = g.localToWorld(V3(0.1, boat.deckY + 0.05, -0.28));
    const dL = V3(1, 0.02, 0).transformDirection(g.matrixWorld);
    const qH = new THREE.Quaternion().setFromUnitVectors(Yax, dH), qL = new THREE.Quaternion().setFromUnitVectors(Yax, dL);
    boat.pole.position.lerpVectors(lay, centreH, held);
    boat.pole.quaternion.slerpQuaternions(qL, qH, held);
    // hands: on the pole (upper at the grip, lower 0.4 further down), or free
    const onPole = P.group.worldToLocal(grip.clone());
    const onPole2 = P.group.worldToLocal(foot.clone().addScaledVector(dH, gripLen - 0.42));
    const reach = V3(0.62, 0.3, 0.45);
    const freeL = lerpV(V3(0.16, 0.92, 0.16), reach, bend);
    const freeR = lerpV(V3(-0.12, 0.95, 0.18), reach.clone().add(V3(-0.14, 0.05, -0.05)), bend);
    solveArm(P.arms[0], SL, lerpV(freeL, onPole, held), V3(0.6, -0.4 + bend * (1 - held), -0.6), V3(-0.4 * (1 - held) - held, 0, 1 - held), V3(0, held * 2 - 1, 0.3));
    solveArm(P.arms[1], SR, lerpV(freeR, onPole2, held), V3(-0.3, -0.3 + bend * (1 - held), -0.8), V3(0.4 * (1 - held) + held, 0, 1 - held), V3(0, held * 2 - 1, 0.3));
    // where the pole meets the water (the rings)
    poleTip = held > 0.5 && dH.y > 0.05 && foot.y < WATER_Y ? foot.clone().addScaledVector(dH, (WATER_Y - foot.y) / dH.y) : null;
    // the flowers she brings up: in her hand from low among the leaves, then laid in the bow
    const first = pick && k > 0.26 && k < 0.5, second = pick && k > 0.66 && k < 0.94;
    for (let i = 0; i < 2; i++) {
      const f = boat.picked[i];
      const inHand = i === 0 ? first : second;
      const done = (i === 0 && ((pick && k >= 0.5) || s.phase !== 'pick' && s.phase !== 'in')) || (i === 1 && ((pick && k >= 0.94) || s.phase === 'turn' || s.phase === 'out'));
      f.visible = inHand || done;
      if (inHand) {
        P.group.localToWorld(tmp.copy(P.arms[0].hand.position));
        f.position.copy(tmp).add(V3(0, 0.02, 0));
        f.rotation.set(0, 0, 0);
      } else if (done) {
        g.localToWorld(tmp.set(1.05 - i * 0.25, -0.02, 0.12 - i * 0.2));
        f.position.copy(tmp);
        f.rotation.set(0.2, 0.4 + i, Math.PI / 2 - 0.2);
      }
    }
  }
  return { P, update, poleTipAt: () => poleTip };
}
