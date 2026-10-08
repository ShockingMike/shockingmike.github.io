import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import opentype from 'opentype';
import { C, HEX, makeShared, makeMaterial } from './npr.js';
import { makeNen } from './nen.js';
import { makeKhoi } from './khoi.js';
import { makeKinhLup } from './kinh-lup.js';
import { makeBuoc, inOut3 } from './buoc.js';
import { makeDaiPhim, CANH } from './dai-phim.js';
import { CHU, thanChu } from './chu.js';
import { makeChuStudio } from './chu-studio.js';
import { makeTieuDe } from './tieu-de.js';
import { tinhBoCuc, KIEU, tinhBoCuc2, KIEU2, tinhBoCuc3, tinhBoCuc5, tinhBoCuc6 } from './bo-cuc.js';
let makeLat = null, LAT = null, anhDiem = null, kheCua = null, nguoiAt = null, MAY_NGO = null;
async function napLat() {
  if (makeLat) return;
  const [a, b] = await Promise.all([import('./lat.js'), import('./ngo.js')]);
  ({ makeLat, LAT } = a); ({ anhDiem, kheCua, nguoiAt, MAY_NGO } = b);
}
let makeNgo4 = null, makeNgo4G = null, NGO4 = null, VAT4 = null, taoGiayBao = null, taoGiayBaoBuoc = null, conChiTiet4 = null;
async function napNgo4() { if (makeNgo4) return; ({ makeNgo4, makeNgo4G, NGO4, VAT4, taoGiayBao, taoGiayBaoBuoc, conNhap: window.__conNhap, conChiTiet: conChiTiet4 } = await import('./ngo4.js')); }
let makeHam5G = null;
async function napHam5() { if (makeHam5G) return; ({ makeHam5G } = await import('./ham5.js')); }
let makeBan6G = null, MAY6 = null, makeHoSo6 = null;
async function napBan6() { if (makeBan6G) return; const [a, b] = await Promise.all([import('./ban6.js'), import('./ho-so6.js')]); ({ makeBan6G, MAY6 } = a); ({ makeHoSo6 } = b); }
let anh6P = null, anh6Loi = -1e9;
let ham5P = null, ham5Loi = -1e9;
const layNgam = async (u, kieu) => { const r = await fetch(u); if (!r.ok) throw new Error('tải hỏng: ' + u); return kieu === 'json' ? r.json() : r.arrayBuffer(); };
const taiHam5 = () => {
  if (!ham5P) {
    if (performance.now() - ham5Loi < 8000) return Promise.reject(new Error('chờ thử lại'));
    ham5P = Promise.all([layNgam('./model/dan-ba-ham.glb'), layNgam('./model/dan-ba-ham.json', 'json'),
      new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = './model/ve-0418.png'; })]);
    ham5P.catch(() => { ham5P = null; ham5Loi = performance.now(); });
  }
  return ham5P;
};
import { KHUNG } from './khung.js';
import { makePho, PHO, taoBienTex } from './pho.js';
import { makeChuyen } from './chuyen.js';
import { MO, moAt, makeLoe } from './mo-man.js';
import { taoAmThanh } from './am-thanh.js';
import { taoChonAm } from './am-chon.js';
import { taoSfx } from './am-sfx.js';

const Q = new URLSearchParams(location.search);
const TINH = Q.has('tinh'), MASK = Q.has('mask');
if (Q.has('cheE')) KIEU.tieuDe.cheE = +Q.get('cheE');
const tai = (p) => { try { window.__tai(p); } catch (e) { } };
tai(8);
if (window.__cssP) await window.__cssP;
const PHAN_MEM = (() => {
  try {
    const g = document.createElement('canvas').getContext('webgl2'); if (!g) return false;
    let ten = String(g.getParameter(g.RENDERER) || '');
    if (!ten || /^webkit webgl$|^mozilla$/i.test(ten)) { const e = g.getExtension('WEBGL_debug_renderer_info'); ten = e ? String(g.getParameter(e.UNMASKED_RENDERER_WEBGL)) : ''; }
    return /swiftshader|llvmpipe|software|basic render/i.test(ten);
  } catch (e) { return false; }
})();
const PHONE = matchMedia('(pointer: coarse)').matches && Math.min(innerWidth, innerHeight) < 700;
let LOW = Q.get('q') === '1' || Q.get('q') === '2' || Q.get('q') === '3' || PHAN_MEM || PHONE;
let NAC = Q.get('q') === '3' ? 3 : PHAN_MEM || Q.get('q') === '2' ? 2 : LOW ? 1 : 0;
const LOOP = 10, AZ0 = 24, EL = 4.6, DIST = 2.25;
const UP = new THREE.Vector3(0, 1, 0);
const v3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
const dirAz = (deg, y = 0) => { const a = THREE.MathUtils.degToRad(deg); return new THREE.Vector3(Math.sin(a), y, Math.cos(a)).normalize(); };

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: !PHAN_MEM && !Q.has('noaa'), powerPreference: 'high-performance', preserveDrawingBuffer: TINH });
} catch (e) {
  try { window.__hong('webgl'); } catch (e2) { }
  throw e;
}
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.setClearColor(new THREE.Color().setRGB(C.muc.x, C.muc.y, C.muc.z, THREE.LinearSRGBColorSpace));
document.getElementById('san').appendChild(renderer.domElement);
const hieu = document.querySelector('.hieu'), daiEl = document.getElementById('dai');
renderer.domElement.setAttribute('aria-hidden', 'true');
const SCR = Math.min(window.devicePixelRatio || 1, 2);
const SAN_DPR = SCR * 0.7;
let DPR = Q.get('q') === '3' ? SCR * 0.55 : PHAN_MEM || Q.get('q') === '2' ? SCR * 0.5 : Q.get('q') === '1' ? SCR * 0.8 : PHONE ? Math.min(SCR, 1.5) : SCR;
let DPRC = DPR;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(16.5, 1, 0.05, 14);
const shared = makeShared();
const fig = new THREE.Group(); scene.add(fig);
const nen = makeNen(shared); scene.add(nen.tuong, nen.cua);
const MATS = {
  Dau: { ember: 1, dark: C.muc, mid: C.chamDem, high: C.chamSang, th1: 0.22, gw1: 14, kRed: 1, kFace: 1, thFace: 0.72, high2: 0, thH: 0.45, speck: 0.018, rimThr: 0.05 },
  Toc: { ember: 0, dark: C.muc, mid: C.chamDem, high: C.chamDem, th1: 0.5, kRed: 1, kFace: 1, thFace: 0.7, high2: 0, thH: 0.3, speck: 0.01 },
  Ao: { dark: C.muc, mid: C.chamDem, high: C.chamSang, th1: 0.42, gw1: 16, th2: 0.9, high2: 1, thH: 0.3, speck: 0.03, rimThr: 0.09 },
  CoAo: { dark: C.muc, mid: C.chamDem, high: C.chamSang, th1: 0.16, gw1: 14, kRed: 1, th2: 0.95, high2: 1, thH: 0.3, speck: 0.03, rimThr: 0.09, side: THREE.DoubleSide },
  VeAo: { dark: C.muc, mid: C.chamDem, high: C.chamSang, th1: 0.3, gw1: 10, th2: 0.82, high2: 1, thH: 0.3, speck: 0.03, rimOn: 0 },
  SoMi: { dark: C.muc, mid: C.chamDem, high: C.chamSang, th1: 0.3, gw1: 10, th2: 0.97, high2: 0, thH: 0.3, speck: 0.02, rimOn: 0, side: THREE.DoubleSide },
  CaVat: { dark: C.muc, mid: C.chamDem, high: C.chamSang, th1: 0.5, gw1: 8, high2: 0, thH: 0.2, speck: 0.01, rimOn: 0 },
  Mu: { ember: 3, dark: C.muc, mid: C.chamDem, high: C.chamSang, th1: 0.36, gw1: 16, kRed: 1, th2: 0.9, high2: 1, thH: 0.3, speck: 0.03, rimThr: 0.06, side: THREE.DoubleSide },
  BangMu: { ember: 3, dark: C.muc, mid: C.muc, high: C.chamDem, th1: 0.95, high2: 0, thH: 0.2, speck: 0.0 },
  GongKinh: { ember: 4, dark: C.doChim, mid: C.doChim, high: C.do, th1: 0.9, high2: 0, thH: 0.0, rimOn: 0, speck: 0.0 },
  TrongKinh: { dark: C.do, mid: C.giay, high: C.hong, rim: C.do, kind: 1 },
  DieuThuoc: { ember: 2, dark: C.chamDem, mid: C.chamSang, high: C.chamSang, th1: 0.0, gw1: 2, high2: 0, thH: 0.3, rimThr: 0.03, speck: 0.0 },
  DauLua: { dark: C.do, mid: C.giay, high: C.hong, rim: C.do, kind: 2 },
};
const materials = {};
for (const [k, p] of Object.entries(MATS)) materials[k] = makeMaterial(shared, p);

function makeShadow(size) {
  const rt = new THREE.WebGLRenderTarget(size, size, { depthTexture: new THREE.DepthTexture(size, size), depthBuffer: true });
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.05, 6);
  cam.layers.set(1);
  return { rt, cam, size };
}
const SH = LOW ? 1024 : 2048;
const shFill = makeShadow(SH), shHead = makeShadow(SH), shRed = makeShadow(SH);
const depthOnly = new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide });
let camRT = null, camTinh = false;
const camDepth = camera.clone();
let META = null, figCenter = new THREE.Vector3(), figRadius = 0.6;
function fitShadow(sh, L, xa = 0) {
  sh.cam.position.copy(figCenter).addScaledVector(L, 2.5);
  sh.cam.lookAt(figCenter);
  const r = figRadius * 1.02;
  sh.cam.left = -r; sh.cam.right = r; sh.cam.top = r; sh.cam.bottom = -r;
  sh.cam.near = 2.5 - figRadius * 1.2; sh.cam.far = 2.5 + figRadius * 1.2 + xa;
  sh.cam.updateProjectionMatrix(); sh.cam.updateMatrixWorld();
  return new THREE.Matrix4().multiplyMatrices(sh.cam.projectionMatrix, sh.cam.matrixWorldInverse);
}
function renderDepth(sh) {
  scene.overrideMaterial = depthOnly;
  renderer.setRenderTarget(sh.rt); renderer.clear(); renderer.render(scene, sh.cam);
  renderer.setRenderTarget(null); scene.overrideMaterial = null;
}

const XE0 = 2.2, XE1 = 7.4;
function state(t) {
  t = ((t % LOOP) + LOOP) % LOOP;
  const p = Math.min(1, Math.max(0, (t - XE0) / (XE1 - XE0)));
  const env = p > 0 && p < 1 ? Math.pow(Math.sin(Math.PI * p), 0.6) : 0;
  const d = t - 8.05;
  return { t, p, headI: env, rit: Math.exp(-(d * d) / (0.45 * 0.45)) };
}
let base = null;
function setupBase() {
  const head = v3(META.headCentre);
  const right0 = new THREE.Vector3(Math.cos(THREE.MathUtils.degToRad(AZ0)), 0, -Math.sin(THREE.MathUtils.degToRad(AZ0)));
  const toCam0 = dirAz(AZ0);
  const screenLeft = right0.clone().negate(), behind = toCam0.clone().negate();
  const Lred = screenLeft.clone().multiplyScalar(0.72).addScaledVector(behind, 0.62).addScaledVector(UP, 0.22).normalize();
  const Lfill = screenLeft.clone().multiplyScalar(0.42).addScaledVector(toCam0, 0.30).addScaledVector(UP, 0.86).normalize();
  const cua = head.clone().addScaledVector(screenLeft, 0.66).addScaledVector(behind, 0.9).addScaledVector(UP, +(Q.get('cu') ?? -0.66));
  const tuong = head.clone().addScaledVector(behind, 1.6).addScaledVector(UP, -0.3);
  const Lface = toCam0.clone().multiplyScalar(0.78).addScaledVector(screenLeft, 0.38).addScaledVector(UP, -0.05).normalize();
  return { head, right0, toCam0, screenLeft, behind, Lred, Lfill, Lface, cua, tuong };
}
const xeAt = (p) => base.head.clone().addScaledVector(base.cua.clone().sub(base.head), 3.2).addScaledVector(base.right0, 2.2 - 4.4 * p);
const headDir = (p) => xeAt(p).sub(base.head).normalize();

const POSE = { pos: new THREE.Vector3(), q: new THREE.Quaternion(), fov: 16.5, nang: 0, nangDich: 0, nangTu: 0, tNang: 0, lech: 0 };
function nearFov(aspect) { return aspect >= 1 ? Math.max(16.5, THREE.MathUtils.radToDeg(2 * Math.atan(0.2 / aspect))) : THREE.MathUtils.lerp(27, 22.6, THREE.MathUtils.clamp((aspect - 0.45) / 0.55, 0, 1)); }
function tgtFor(aspect) {
  const k = THREE.MathUtils.clamp((aspect - 0.8) / 0.8, 0, 1);
  const land = base.head.clone().addScaledVector(base.screenLeft, 0.27 - POSE.lech + THREE.MathUtils.clamp((2.07 - aspect) * 0.32, 0, 0.1)).addScaledVector(UP, -0.115);
  const port = base.head.clone().addScaledVector(base.screenLeft, +(Q.get('tl') ?? 0.17)).addScaledVector(UP, +(Q.get('tu') ?? 0.06));
  return port.lerp(land, k);
}
const nearPos = () => base.head.clone().addScaledVector(UP, -0.06).addScaledVector(dirAz(AZ0, Math.tan(THREE.MathUtils.degToRad(EL))), DIST);
let poseKey = '';
function setPose() {
  const aspect = camera.aspect;
  const key = aspect + '|' + POSE.nang + '|' + POSE.lech;
  if (key === poseKey) return;
  poseKey = key;
  camera.position.copy(nearPos()); camera.fov = nearFov(aspect);
  camera.lookAt(tgtFor(aspect));
  if (POSE.nang) camera.rotateX(THREE.MathUtils.degToRad(POSE.nang));
  camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  POSE.pos.copy(camera.position); POSE.q.copy(camera.quaternion); POSE.fov = camera.fov;
  camTinh = false;
}

function place(st) {
  const Lh = headDir(st.p);
  shared.uLhead.value.copy(Lh);
  shared.uHeadI.value = st.headI;
  shared.uHeadVP.value.copy(fitShadow(shHead, Lh, 2.6));
  nen.cua.material.uniforms.uHeadI.value = st.headI;
  nen.cua.material.uniforms.uHeadX.value = 0.5 + xeAt(st.p).sub(base.head).multiplyScalar(1 / 3.2).add(base.head).sub(nen.cua.position).dot(base.right0) / nen.cua.geometry.parameters.width;
  khoi.u.uCar.value.copy(xeAt(st.p));
  khoi.u.uVXe.value = st.headI > 0.001 ? 0.05 + 0.4 * st.p : -1;
  const cr = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0), cu = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
  shared.uRimDir.value.set(base.Lred.dot(cr), base.Lred.dot(cu)).normalize();
  shared.uRimDirH.value.set(Lh.dot(cr), Lh.dot(cu)).normalize();
}

async function lay(url) {
  let r;
  try { r = await fetch(url); } catch (e) { try { window.__hong('mang'); } catch (e2) { } throw e; }
  if (!r.ok) { try { window.__hong('mang'); } catch (e2) { } throw new Error('tải hỏng: ' + url); }
  return r;
}
async function taiByte(url, a, b) {
  const r = await lay(url);
  const n = +r.headers.get('content-length') || 0;
  if (!r.body || !n) { const buf = await r.arrayBuffer(); tai(b); return buf; }
  const rd = r.body.getReader(); const parts = []; let got = 0;
  try {
    for (;;) { const { done, value } = await rd.read(); if (done) break; parts.push(value); got += value.length; tai(a + (b - a) * Math.min(1, got / n)); }
  } catch (e) { try { window.__hong('mang'); } catch (e2) { } throw e; }
  const out = new Uint8Array(got); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
  return out.buffer;
}
const taiFont = (f) => document.fonts.load(f).catch(() => null);
const ANTON = 'https://cdn.jsdelivr.net/npm/@fontsource/anton@5.2.5/files/anton-latin-400-normal.woff';
const taiFontTep = async (ten, tep) => {
  const buf = await lay(tep).then((r) => r.arrayBuffer());
  const f = new FontFace(ten, buf);
  try { await f.load(); } catch (e) { try { window.__hong('loi'); } catch (e2) { } throw e; }
  document.fonts.add(f);
};
const canh2P = Promise.all([lay('./model/dan-ba.glb').then((r) => r.arrayBuffer()), lay('./model/dan-ba.json').then((r) => r.json())]);
canh2P.catch(() => {});
const [glbBuf, meta, antonBuf] = await Promise.all([
  taiByte('./model/tham-tu.glb', 10, 70),
  lay('./model/tham-tu.json').then((r) => r.json()),
  lay(ANTON).then((r) => r.arrayBuffer()),
  taiFont('400 20px "Courier Prime"'), taiFont('500 40px "Caveat"'), taiFontTep(KIEU.than.font, KIEU.than.tep),
]);
tai(76);
const font = opentype.parse(antonBuf);
const gltf = await new GLTFLoader().parseAsync(glbBuf, './model/');
tai(82);
META = meta;
gltf.scene.traverse((o) => {
  if (!o.isMesh) return;
  const key = Object.keys(MATS).find((k) => o.name === k || o.name.startsWith(k + '_') || o.name.startsWith(k + '.')) || (o.parent && Object.keys(MATS).find((k) => o.parent.name === k));
  o.material = materials[key] || materials.Ao;
  o.userData.key = key;
  o.layers.enable(1);
});
fig.add(gltf.scene);
const box = new THREE.Box3().setFromObject(gltf.scene);
box.getCenter(figCenter);
figRadius = box.getSize(new THREE.Vector3()).length() / 2;
base = setupBase();
shared.uLred.value.copy(base.Lred); shared.uLfill.value.copy(base.Lfill); shared.uLface.value.copy(base.Lface);
shared.uLens.value = META.lenses.map((l) => v3(l.c)); shared.uLensUp.value = META.lenses.map((l) => v3(l.up)); shared.uLensRt.value = META.lenses.map((l) => v3(l.rt));
shared.uLensR.value = META.lenses[0].r;
shared.uFillVP.value.copy(fitShadow(shFill, base.Lfill)); shared.uFillDepth.value = shFill.rt.depthTexture;
shared.uRedVP.value.copy(fitShadow(shRed, base.Lred)); shared.uRedDepth.value = shRed.rt.depthTexture;
shared.uHeadDepth.value = shHead.rt.depthTexture;
shared.uFillTexel.value = 1 / SH; shared.uHeadTexel.value = 1 / SH;
const EMBER = (() => { const m = gltf.scene.getObjectByName('DauLua'); return m ? new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3()) : v3(META.cig.end); })();
shared.uEmber.value.copy(EMBER);
shared.uDauC.value.copy(v3(META.headCentre)); shared.uDauF.value.copy(v3(META.headFwd)).normalize(); shared.uDauU.value.copy(v3(META.headUp)).normalize();
nen.cua.position.copy(base.cua); nen.cua.lookAt(nen.cua.position.clone().add(base.toCam0.clone().applyAxisAngle(UP, THREE.MathUtils.degToRad(-14))));
nen.tuong.position.copy(base.tuong); nen.tuong.lookAt(nen.tuong.position.clone().add(base.toCam0));
nen.tuong.material.uniforms.uNw.value.copy(base.toCam0);
nen.cua.updateMatrixWorld(); nen.tuong.updateMatrixWorld();
shared.uCuaInv.value.copy(nen.cua.matrixWorld).invert();
shared.uCuaSize.value.set(nen.cua.geometry.parameters.width, nen.cua.geometry.parameters.height);

const khoi = makeKhoi(shared);
scene.add(khoi.mesh);
let khoiDist = DIST;

const lens = makeKinhLup(renderer);
{
  let id = 1;
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    if (o.name === 'DieuThuoc' || o.name === 'DauLua') { lens.gbufFor(o, 9); return; }
    if (o.name === 'Dau') lens.chiMat.uniforms.uIdDau.value = id;
    if (o.name === 'Mu') lens.chiMat.uniforms.uIdMu.value = id;
    { const k = ['Ao', 'CoAo', 'VeAo', 'SoMi', 'CaVat'].indexOf(o.name); if (k >= 0) lens.chiMat.uniforms.uAo.value[k] = id; }
    lens.gbufFor(o, id++, o.name === 'Dau' ? { c: v3(META.headCentre), u: v3(META.headUp).normalize() } : null);
  });
  lens.gbufMat(nen.tuong, nen.gTuong); lens.gbufMat(nen.cua, nen.gCua);
  const gk = khoi.mesh.material.clone(); gk.uniforms = { ...khoi.mesh.material.uniforms, uKiem: { value: 4 } }; gk.transparent = false; gk.extensions = { derivatives: true };
  lens.gbufMat(khoi.mesh, gk);
  lens.anDi(khoi.mesh);
}
const td = makeTieuDe(font); window.__td = td;
scene.add(td.group);
lens.gbufMat(td.meshMat, td.gbMat); lens.anDi(td.meshBong); lens.anDi(td.meshBongT); lens.anDi(td.meshLong);
const loe = makeLoe();
const chu = makeChuStudio(CHU.studio, { dom: () => { try { return CANH_HIEN === 0; } catch (e) { return true; } } });
const T2 = { D: 1.25, CHU: 1.3, PHIM: 1.45 };
const NHOE12 = { n: 8, tu: 0.3, du: 0.5, mau: 4 };
const TD2_TAN = [0, 0.25];
const CHOP_B2 = Q.get('chop') !== 'nhoe', B2_TAN = [0, 0.22];
let pho = null, C2 = false, choC2 = 0;
const CHO = { t0: 0, a: 0, r: 0 };
const bienTex = taoBienTex(font);
const td2 = makeTieuDe(font); td2.meshLong.visible = false;
const chu2 = makeChuStudio(CHU.pho, { dom: false });
const lens2 = makeKinhLup(renderer, { pho: true });
lens2.gbufMat(td2.meshMat, td2.gbMat); lens2.anDi(td2.meshBong); lens2.anDi(td2.meshBongT); lens2.anDi(td2.meshLong);
const chuyen = makeChuyen(renderer);
async function taoPho() {
  const [glb2Buf, meta2] = await canh2P;
  pho = await makePho({ renderer, font, low: LOW, bienTex, lay: async (u) => (u.endsWith('.glb') ? glb2Buf : meta2) });
  pho.ROI.t0 = T2.PHIM;
  pho.scene.add(td2.group); pho.AN_PHAN_CHIEU.push(td2.group);
  pho.dangKyKinh(lens2);
  pho.datNac(NAC);
  window.__pho = pho;
}
let BC2 = null, LENS2_0 = { x: 0, y: 0 }, CANH_HIEN = 0;
const T3 = { D: 1.35, MAT0: 0.6, MO: 0.55, CHAY: 1.35, CHAY_TAN: 0.3 };
let choC3Go = false;
const CHO3 = { t0: 0, c0: null, dir: null, d: 0 };
const CHO4 = { t0: 0, tc: 0, c0: null, dir: null, d: 0, D: 0, tan: 0 };
const veMay3Goc = () => { if (lat && lat.BC) { lat.camera.position.set(0, 0, lat.BC.D); lat.camera.updateMatrixWorld(); } };
let lat = null, C3 = false, choC3 = 0, BC3 = null, LENS3_0 = { x: 0, y: 0 }, dang3 = false;
const td3 = makeTieuDe(font); td3.meshLong.visible = false;
const chu3 = makeChuStudio(CHU.lat, { dom: false });
const lens3 = makeKinhLup(renderer, { lat: true });
lens3.gbufMat(td3.meshMat, td3.gbMat); lens3.anDi(td3.meshBong); lens3.anDi(td3.meshBongT); lens3.anDi(td3.meshLong);
function taoLat() {
  if (lat || !pho) return;
  const yeu = NAC >= 2 || PHAN_MEM;
  lat = makeLat({ renderer, nguoi: pho.fig.children[0], anhRong: yeu ? 512 : LOW ? 640 : 768, mau: yeu ? 0 : LOW ? 2 : 4 });
  lat.scene.add(td3.group);
  lat.dangKyKinh(lens3);
  window.__lat = lat;
}
const T4 = { D: 1.7, DAY: 0.68, MAT0: 0.34, ZMAX: 4.2, CHU: 0.25 };
let choC4Go = false, choTua4 = 0;
let ngo4 = null, C4 = false, choC4 = 0, BC4 = null, LENS4_0 = { x: 0, y: 0 }, dang4 = false, GIAY4 = null, LOP4 = null, DAY4 = null, den4 = false;
let s4Bat = null, s4Moc = 0, tTD4 = -1, daQua4 = false, lopK4 = -1;
const chu4 = makeChuStudio(CHU.ngo, { dom: false });
const lens4 = makeKinhLup(renderer, { ngo: true });
function taoGiay4() { if (!GIAY4) GIAY4 = taoGiayBao(CHU.ngo.tieuDe, 'BA Anton'); }
let banSao4 = null;
function taoBanSao4() { if (!banSao4) banSao4 = gltf.scene.clone(true); }
let gCanh4 = null;
function taoCanh4(buoc = false) {
  if (ngo4 || !lat) return true;
  taoBanSao4();
  if (!gCanh4) gCanh4 = makeNgo4G({ renderer, thamTu: banSao4, MATS, meta: META, low: LOW || NAC >= 2 || PHAN_MEM });
  let r; do { r = gCanh4.next(); } while (!r.done && !buoc);
  if (r.done) { ngo4 = r.value; gCanh4 = null; return true; }
  return false;
}
function taoNgo4() {
  if (!lat) return;
  taoGiay4(); taoCanh4();
  if (ngo4.baoU.uTex.value) return;
  ngo4.baoU.uTex.value = GIAY4.tex; ngo4.datTieu(GIAY4.hopTieu);
  ngo4.dangKyKinh(lens4, (tt, ln) => {
    const ids = [1, 2, 3, 4, 5, 6, 7, 8, 12, 13, 14, 15, 16, 17, 18, 19, 23, 24, 25, 26]; let i = 0;
    tt.traverse((m) => { if (!m.isMesh) return; if (m.name === 'DieuThuoc' || m.name === 'DauLua') { ln.gbufFor(m, 9); return; }
      const id = ids[Math.min(ids.length - 1, i++)]; if (m.name === 'Mu') ln.chiMat.uniforms.uIdMu.value = id; ln.gbufFor(m, id); });
    ln.chiMat.uniforms.uIdDau.value = -5;
  }, GIAY4.hopTieu);
  window.__ngo4 = ngo4;
}
const T5 = { D: 2.0, DAY: 0.68, CHU: 0.3, MAG: 4.5, TAT: 0.26 };
let choC5Go = false;
let ham5 = null, C5 = false, choC5 = 0, BC5 = null, LENS5_0 = { x: 0, y: 0 }, dang5 = false, LOP5 = null, DAY5 = null, khung5 = false, nac5 = -1;
let s5Bat = null, s5Moc = 0, tTD5 = -1, daQua5 = false, lopK5 = -1;
const td5 = makeTieuDe(font); td5.meshLong.visible = false;
const chu5 = makeChuStudio(CHU.ham, { dom: false });
const lens5 = makeKinhLup(renderer, { ngo: true, ham: true });
lens5.gbufMat(td5.meshMat, td5.gbMat); lens5.anDi(td5.meshBong); lens5.anDi(td5.meshBongT); lens5.anDi(td5.meshLong);
const R5DT = () => (Hc < 800 ? 88 : 96);
let gCanh5 = null, ham5Du = null;
function taoCanh5(buoc = false) {
  if (ham5 || !ham5Du) return true;
  if (!gCanh5) gCanh5 = makeHam5G({ renderer, nguoi: ham5Du.nguoi, J: ham5Du.J, anh0418: ham5Du.anh, low: LOW || NAC >= 2 || PHAN_MEM, phongAnton: 'BA Anton' });
  let r; do { r = gCanh5.next(); } while (!r.done && !buoc);
  if (!r.done) return false;
  ham5 = r.value; gCanh5 = null;
  ham5.scene.add(td5.group); ham5.AN_BONG.push(td5.group);
  ham5.dangKyKinh(lens5);
  window.__ham5 = ham5;
  return true;
}
const T6 = { D: 1.32, XOA: 0.22, CHU: 0.3, FORM: 1.0, DONG: 0.55 };
let choC6Go = false;
let ban6 = null, C6 = false, choC6 = 0, BC6 = null, LENS6_0 = { x: 0, y: 0 }, dang6 = false, LOP6 = null, nac6 = -1, ui6 = null;
let s6Bat = null, s6Moc = 0, tTD6 = -1, daQua6 = false, lopK6 = -1;
const td6 = makeTieuDe(font); td6.meshLong.visible = false;
const chu6 = makeChuStudio(CHU.ban, { dom: false });
const lens6 = makeKinhLup(renderer, { ngo: true });
lens6.gbufMat(td6.meshMat, td6.gbMat); lens6.anDi(td6.meshBong); lens6.anDi(td6.meshBongT); lens6.anDi(td6.meshLong);
const R6DT = () => (Hc < 700 ? 76 : Hc < 800 ? 86 : 94);
const F6 = { s: 0, t0: 0, m0: null, m1: null };
const taiAnh6 = () => {
  if (!anh6P) {
    if (performance.now() - anh6Loi < 8000) return Promise.reject(new Error('chờ thử lại'));
    anh6P = Promise.all(CHU.ban.hoSo.map((d) => new Promise((res, rej) => { const i = new Image(); i.decoding = 'async'; i.onload = () => res(i); i.onerror = rej; i.src = d.anh; })));
    anh6P.catch(() => { anh6P = null; anh6Loi = performance.now(); });
  }
  return anh6P;
};
let gCanh6 = null, ban6Du = null;
function taoCanh6(buoc = false) {
  if (ban6 || !ban6Du) return true;
  if (!gCanh6) gCanh6 = makeBan6G({ renderer, thamTu: gltf.scene.clone(true), anh: ban6Du.anh, hoSo: CHU.ban.hoSo, dau: CHU.ban.dau, low: LOW || NAC >= 2 || PHAN_MEM });
  let r; do { r = gCanh6.next(); } while (!r.done && !buoc);
  if (!r.done) return false;
  ban6 = r.value; gCanh6 = null;
  ban6.scene.add(td6.group);
  ban6.dangKyKinh(lens6);
  ui6 = makeHoSo6({ C: CHU.ban, onNhich: (i, v) => ban6.nhich(i, v), onChon: (i) => { if (i >= 0) datUi6(); SFX.su(i >= 0 ? 'ho-mo' : 'ho-dong'); }, onForm: () => moForm6(), onDongForm: () => dongForm6(), onGui: () => { ban6.datPhieuTron(false); datChan6(); THU.a = vungHop(ui6.form.getBoundingClientRect()); AM.su('dau'); }, onMoLai: () => { SFX.su('to-moi'); ban6.datPhieuTron(true); datChan6(); THU.a = vungHop(ui6.form.getBoundingClientRect()); } });
  window.__ban6 = ban6; window.__ui6 = ui6;
  return true;
}
document.title = CHU.trang.ten;
{ const m = document.querySelector('meta[name=description]'); if (m) m.content = CHU.trang.moTa; }

const daiH = () => { const e = document.getElementById('dai'); return (e && e.getBoundingClientRect().height) || 46; };
let LENS0 = { x: 0, y: 0 };
function hopTieuDe() {
  const out = [];
  for (const c of td.L.chu) { const r = out[c.li] || (out[c.li] = [1e9, 1e9, -1e9, -1e9]); r[0] = Math.min(r[0], c.bb[0]); r[1] = Math.min(r[1], c.bb[1]); r[2] = Math.max(r[2], c.bb[2]); r[3] = Math.max(r[3], c.bb[3]); }
  return out.filter(Boolean).map((r) => r.map(Math.round));
}
function hopLogo() {
  const im = hieu && hieu.querySelector('img'); if (!im) return [0, 0, 0, 0];
  const r = im.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom].map(Math.round);
}
function dungKinh() {
  if (KHONG_KINH()) { lopK = -1; return; }
  const cuaR = new THREE.Vector3().setFromMatrixColumn(nen.cua.matrixWorld, 0).normalize();
  LENS0 = lens.dungLop({
    META, v3, cam: camera, khoi: window.__khoi,
    wall: { pt: base.tuong, n: base.toCam0, right: base.right0 },
    cua: { c: nen.cua.position, right: cuaR, w: nen.cua.geometry.parameters.width, h: nen.cua.geometry.parameters.height },
    chu: mocChu(), W: Wc, H: Hc, day: daiH(), dt: laDt(), ember: EMBER,
    tranh: Q.has('thuhong') ? [] : [hopDau(), [EPX.x - 40, EPX.y - 40, EPX.x + 40, EPX.y + 40], ...hopTieuDe().map((r) => [r[0] + 10, r[1] + 10, r[2] - 10, r[3] - 10]), hopLogo()], dauBox: hopDau(), emberPx: EPX, soc: SOC, cuaTren: vungSang(0, Wc * 0.35),
    logoDay: hopLogo()[3], thanDay: chu.moc().than[3],
  });
  lopK = -1;
}

let W = 1, H = 1, Wc = 1, Hc = 1;
const laDt = () => (PHONE && Hc >= Wc) || Wc < 700;
const KHONG_KINH = () => PHONE || laDt();
let henBoTri = 0, dangDung = false, mDung = 1;
function resize(ngay = false, nhe = false) {
  Wc = window.innerWidth; Hc = window.innerHeight;
  { const r = document.documentElement.classList; r.toggle('dt8', laDt()); r.toggle('dtn', PHONE && !laDt()); }
  if (!nhe) { renderer.setPixelRatio(DPRC); renderer.setSize(Wc, Hc, false); }
  camera.aspect = Wc / Hc;
  poseKey = ''; setPose();
  W = Math.floor(Wc * DPR); H = Math.floor(Hc * DPR);
  datManThap();
  if (!camRT || camRT.width !== W || camRT.height !== H) { const cu = camRT; camRT = new THREE.WebGLRenderTarget(W, H, { depthTexture: new THREE.DepthTexture(W, H), depthBuffer: true }); shared.uCamDepth.value = camRT.depthTexture; if (cu) { cu.depthTexture.dispose(); cu.dispose(); } }
  camTinh = false;
  shared.uRes.value.set(W, H);
  shared.uNear.value = camera.near; shared.uFar.value = camera.far;
  shared.uRimW.value = Math.max(3, 5.2 * (Hc / 920)) * DPR * (16.5 / POSE.fov);
  const perCss = (2 * DIST * Math.tan(THREE.MathUtils.degToRad(POSE.fov / 2))) / Hc;
  const picPx = Math.max(1, Math.min(Wc, Hc * 2.1) / 1200);
  shared.uCell.value = perCss * picPx;
  nen.setCell(perCss * picPx * (3.85 / DIST), perCss * picPx * (3.1 / DIST));
  khoi.setCell(perCss * picPx * (khoiDist / DIST), picPx * DPR);
  td.datDpr(DPR, Hc);
  emberPx();
  chu.datKhung(Wc, Hc);
  lens.datRes(Wc, Hc);
  khoi.u.uCss.value.set(Wc, Hc);
  if (pho) { pho.resize(W, H, Wc, Hc); if (BC2) pho.datMay(BC2.fx, BC2.cam.fy, BC2.cam.fov, BC2.cam.lui || 0, BC2.cam.camX || 0); }
  lens2.datRes(Wc, Hc); chu2.datKhung(Wc, Hc); td2.datDpr(DPR, Hc);
  lens3.datRes(Wc, Hc); chu3.datKhung(Wc, Hc); td3.datDpr(DPR, Hc);
  lens4.datRes(Wc, Hc); chu4.datKhung(Wc, Hc);
  lens5.datRes(Wc, Hc); chu5.datKhung(Wc, Hc); td5.datDpr(DPR, Hc);
  lens6.datRes(Wc, Hc); chu6.datKhung(Wc, Hc); td6.datDpr(DPR, Hc);
  if (nhe) { lens.resize(Wc, Hc, DPR, laDt(), BC && BC.kieu === 'ngang'); lens2.resize(Wc, Hc, DPR, laDt(), BC && BC.kieu === 'ngang', R2DT(), 92, 190); lens3.resize(Wc, Hc, DPR, laDt(), BC && BC.kieu === 'ngang', R3DT(), 84, 172);
    lens4.resize(Wc, Hc, DPR, laDt(), BC && BC.kieu === 'ngang', R4DT(), 92, 172); if (ngo4 && BC4) { boTri4A(BC4.kieu); ngo4.ganTinh(); } if (BC2) datChuMua2();
    lens5.resize(Wc, Hc, DPR, laDt(), BC && BC.kieu === 'ngang', R5DT(), 96, 172, 126); if (ham5 && BC5) { ham5.datMay(BC5.may, W, H); ham5.datDpr(DPR); }
    lens6.resize(Wc, Hc, DPR, laDt(), BC && BC.kieu === 'ngang', R6DT(), 96, 172, 126); if (ban6 && BC6) datMay6(); return; }
  if (!ngay && BC2 && (CANH_HIEN === 1 || (nav.S.mode !== 'idle' && nav.S.to === 1))) { const t0b = performance.now(); boTri2A(laDt() ? 'dt' : Hc < 560 ? 'ngang' : 'may'); BT_LOG.push(+(performance.now() - t0b).toFixed(1)); }
  if (!ngay && BC3 && lat && (CANH_HIEN === 2 || (nav.S.mode !== 'idle' && nav.S.to === 2))) { const t0b = performance.now(); boTri3A(laDt() ? 'dt' : Hc < 560 ? 'ngang' : 'may'); BT_LOG.push(+(performance.now() - t0b).toFixed(1)); }
  if (!ngay && BC4 && ngo4 && (CANH_HIEN === 3 || (nav.S.mode !== 'idle' && nav.S.to === 3))) { const t0b = performance.now(); boTri4A(laDt() ? 'dt' : Hc < 560 ? 'ngang' : 'may'); BT_LOG.push(+(performance.now() - t0b).toFixed(1)); }
  if (!ngay && BC5 && ham5 && (CANH_HIEN === 4 || (nav.S.mode !== 'idle' && nav.S.to === 4))) { const t0b = performance.now(); boTri5A(laDt() ? 'dt' : Hc < 560 ? 'ngang' : 'may'); BT_LOG.push(+(performance.now() - t0b).toFixed(1)); }
  if (!ngay && BC6 && ban6 && (CANH_HIEN === 5 || (nav.S.mode !== 'idle' && nav.S.to === 5))) { const t0b = performance.now(); boTri6A(laDt() ? 'dt' : Hc < 560 ? 'ngang' : 'may'); BT_LOG.push(+(performance.now() - t0b).toFixed(1)); }
  if (!ngay && nav.S.mode === 'move' && nav.S.to === 4 && ngo4 && BC4) { traMay4(); boTri4A(laDt() ? 'dt' : Hc < 560 ? 'ngang' : 'may'); datDay5(); }
  if (!ngay && nav.S.mode === 'move' && nav.S.to === 2 && DAY && pho && BC3) { traMay2(); datDay(); }
  if (!ngay && nav.S.mode === 'move' && nav.S.to === 3 && DAY4 && lat && BC3) datDay4();
  dangDung = !ngay;
  clearTimeout(henBoTri);
  const kieuMoi = laDt() ? 'dt' : Hc < 560 ? 'ngang' : 'may';
  if (ngay || (BC && BC.kieu !== kieuMoi)) boTri(ngay); else henBoTri = setTimeout(() => boTri(false), 160);
}
let rtThap = null;
const phong = (() => {
  const u = { uT: { value: null } };
  const m = new THREE.ShaderMaterial({ uniforms: u, depthTest: false, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: 'uniform sampler2D uT; varying vec2 vUv; void main() { gl_FragColor = texture2D(uT, vUv); }' });
  const sc = new THREE.Scene(), q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m); q.frustumCulled = false; sc.add(q);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  return { u, ve() { renderer.setRenderTarget(null); renderer.render(sc, cam); },
    lamNong() { const a = new THREE.WebGLRenderTarget(8, 8), b = new THREE.WebGLRenderTarget(8, 8); u.uT.value = a.texture; renderer.setRenderTarget(b); renderer.render(sc, cam); renderer.setRenderTarget(null); a.dispose(); b.dispose(); u.uT.value = rtThap ? rtThap.texture : null; } };
})();
const MAN = () => (DPR < DPRC * 0.999 ? rtThap : null);
function datManThap() {
  if (DPR >= DPRC * 0.999) return;
  if (!rtThap) rtThap = new THREE.WebGLRenderTarget(W, H, { depthBuffer: true });
  else if (rtThap.width !== W || rtThap.height !== H) rtThap.setSize(W, H);
  phong.u.uT.value = rtThap.texture;
}
let MU_W = null;
function doMu() {
  if (!MU_W) {
    MU_W = { p: [], tri: [] };
    for (const ten of ['Mu', 'BangMu']) {
      const m = gltf.scene.getObjectByName(ten); if (!m) continue;
      const a = m.geometry.attributes.position, idx = m.geometry.index, v = new THREE.Vector3(); m.updateMatrixWorld();
      const goc = MU_W.p.length / 3;
      for (let i = 0; i < a.count; i++) { v.fromBufferAttribute(a, i).applyMatrix4(m.matrixWorld); MU_W.p.push(v.x, v.y, v.z); }
      const n = idx ? idx.count : a.count;
      for (let k = 0; k < n; k++) MU_W.tri.push(goc + (idx ? idx.getX(k) : k));
    }
  }
  const P = MU_W.p, N = P.length / 3, sc = new Float32Array(N * 2), v = new THREE.Vector3();
  let top = 1e9;
  for (let i = 0; i < N; i++) { v.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]).project(camera); sc[i * 2] = (v.x * 0.5 + 0.5) * Wc; sc[i * 2 + 1] = (0.5 - v.y * 0.5) * Hc; if (sc[i * 2 + 1] < top) top = sc[i * 2 + 1]; }
  const trai = (y0, y1 = y0) => {
    let x = 1e9; const T = MU_W.tri;
    for (let t = 0; t < T.length; t += 3) {
      const Q = [[sc[T[t] * 2], sc[T[t] * 2 + 1]], [sc[T[t + 1] * 2], sc[T[t + 1] * 2 + 1]], [sc[T[t + 2] * 2], sc[T[t + 2] * 2 + 1]]];
      const ymin = Math.min(Q[0][1], Q[1][1], Q[2][1]), ymax = Math.max(Q[0][1], Q[1][1], Q[2][1]);
      if (ymax < y0 || ymin > y1) continue;
      for (let e = 0; e < 3; e++) {
        const A = Q[e], B = Q[(e + 1) % 3];
        if (A[1] >= y0 && A[1] <= y1) x = Math.min(x, A[0]);
        for (const yy of [y0, y1]) if ((A[1] - yy) * (B[1] - yy) < 0) x = Math.min(x, A[0] + (B[0] - A[0]) * (yy - A[1]) / (B[1] - A[1]));
      }
    }
    return x;
  };
  return { top, trai };
}
const oTuThe = (n, f) => { POSE.nang = n; poseKey = ''; setPose(); return f(); };
let BC = null;
const BUOC_BT = [], BT_LOG = [], VIEC_LOG = [], VIEC_GIA = {}; let viecHoan = 0; window.__btLog = BT_LOG; window.__viecLog = VIEC_LOG;
function boTri(ngay) {
  BUOC_BT.length = 0;
  const dt = laDt();
  const kieu = dt ? 'dt' : Hc < 560 ? 'ngang' : 'may';
  const S = {};
  const oDich = (f) => { const cu = POSE.nang; POSE.nang = S.bc ? S.bc.n : cu; poseKey = ''; setPose(); emberPx(); f(); POSE.nang = cu; poseKey = ''; setPose(); emberPx(); };
  const buoc = [
    () => {
      POSE.lech = kieu === 'ngang' ? 0.05 : 0;
      lens.resize(Wc, Hc, DPR, dt, kieu === 'ngang');
      S.dangCo = POSE.nang;
      S.bc = tinhBoCuc({
        W: Wc, H: Hc, kieu, font, dai: daiH(), demDong: chu.demDong, rongGach: chu.rongGach, dtNgang: kieu === 'ngang' && PHONE,
        mu: (n) => oTuThe(n, doMu), cua: (n) => oTuThe(n, () => vungSang(Wc * 0.04, Wc * 0.33)), dau: (n) => oTuThe(n, hopDau),
        lua: (n) => oTuThe(n, () => { const q = EMBER.clone().project(camera); return { x: (q.x * 0.5 + 0.5) * Wc, y: (0.5 - q.y * 0.5) * Hc }; }),
      });
      POSE.nang = S.dangCo; poseKey = ''; setPose(); emberPx();
    },
    () => oDich(() => {
      S.fwd = camera.getWorldDirection(new THREE.Vector3());
      S.zT = base.head.clone().sub(camera.position).dot(S.fwd) + 0.45;
      S.camP = camera.position.clone();
      td.dung(S.bc.dongs, camera, Wc, Hc, Math.min(window.devicePixelRatio || 1, 2), S.zT, DPR, true);
      BC = S.bc;
    }),
    () => BUOC_BT.unshift(...td.sdfBuoc()),
    () => oDich(() => {
      const bc = S.bc;
      chu.dung(bc, Wc, Hc, Math.min(window.devicePixelRatio || 1, 2), td.L.tCuoi);
      if (hieu) { hieu.classList.toggle('trai', bc.logo === 'trai'); const im = hieu.querySelector('img'); if (im) im.style.height = (kieu === 'may' ? Math.round(48 * Math.max(0.85, Math.min(1.25, bc.s))) : 30) + 'px'; }
      const m = mocChu();
      datTuong(m, dt);
      datKhoi(m);
      const perE = (2 * khoiDist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / Hc;
      const dau = hopDau();
      khoi.datChu({ ex: EPX.x, ey: EPX.y, perE, box: [td.L.box[0] - 0.2 * bc.cap, td.L.box[1] - 0.2 * bc.cap, td.L.box[2] + 0.2 * bc.cap, td.L.box[3] + 0.2 * bc.cap], dau: [dau[0] - 12, dau[1] - 12, dau[2] + 12, dau[3] + 12],
        sdf: td.sdf, Wc, Hc, uon: Math.max(7, 0.2 * bc.cap), zMid: S.zT, camP: S.camP, fwd: S.fwd, hop: [m.than, m.nhan],
        v0: Math.max(0.05, (EPX.y - td.L.box[3]) * perE), nghieng: bc.kieu === 'may' ? 0.35 : 0 });
    }),
    () => oDich(() => {
      if (window.__khoi) dungKinh();
      POSE.nangDich = S.bc.n; POSE.nangTu = ngay ? S.bc.n : S.dangCo; POSE.tNang = performance.now();
    }),
    () => { if (pho) boTri2A(kieu); },
    () => { if (!pho) return; if (ngay) td2.xongSdf(); else BUOC_BT.unshift(...td2.sdfBuoc()); },
    () => { if (pho) boTri2B(kieu); },
    () => { if (lat) boTri3A(kieu); },
    () => { if (!lat) return; if (ngay) td3.xongSdf(); else BUOC_BT.unshift(...td3.sdfBuoc()); },
    () => { if (lat) boTri3B(kieu); },
    () => { if (lat) boTri3C(); },
    () => { if (ngo4) { boTri4A(kieu); boTri4B(kieu); } },
    () => { if (ngo4) boTri4C(); },
    () => { if (ham5) boTri5A(kieu); },
    () => { if (!ham5) return; if (ngay) td5.xongSdf(); else BUOC_BT.unshift(...td5.sdfBuoc()); },
    () => { if (ham5) boTri5B(kieu); },
    () => { if (ham5) boTri5C(); },
    () => { if (ban6) boTri6A(kieu); },
    () => { if (!ban6) return; if (ngay) td6.xongSdf(); else BUOC_BT.unshift(...td6.sdfBuoc()); },
    () => { if (ban6) boTri6B(kieu); },
    () => { if (ban6) boTri6C(); },
  ];
  if (ngay) { for (const f of buoc) { if (f === buoc[2]) td.xongSdf(); else f(); } POSE.nang = S.bc.n; poseKey = ''; setPose(); emberPx(); }
  else if (CANH_HIEN === 1 || (nav.S.mode !== 'idle' && nav.S.to === 1)) {
    const c2 = buoc.slice(5, 8), c1 = buoc.slice(0, 5), c3 = buoc.slice(8);
    if (BC2 && BC2.W === Wc && BC2.H === Hc) c2.shift();
    BUOC_BT.push(...c2, ...c1, ...c3);
  }
  else if (CANH_HIEN === 2 || (nav.S.mode !== 'idle' && nav.S.to === 2)) {
    const c3 = buoc.slice(8, 12), c1 = buoc.slice(0, 5), c2 = buoc.slice(5, 8), c4 = buoc.slice(12);
    if (BC3 && BC3.W === Wc && BC3.H === Hc) c3.shift();
    BUOC_BT.push(...c3, ...c1, ...c2, ...c4);
  }
  else if (CANH_HIEN === 3 || (nav.S.mode !== 'idle' && nav.S.to === 3)) {
    const c4 = buoc.slice(12, 14), c1 = buoc.slice(0, 5), c2 = buoc.slice(5, 8), c3 = buoc.slice(8, 12), c5 = buoc.slice(14);
    BUOC_BT.push(...c4, ...c1, ...c2, ...c3, ...c5);
  }
  else if (CANH_HIEN === 4 || (nav.S.mode !== 'idle' && nav.S.to === 4)) {
    const c5 = buoc.slice(14, 18), c1 = buoc.slice(0, 5), c2 = buoc.slice(5, 8), c3 = buoc.slice(8, 12), c4 = buoc.slice(12, 14), c6 = buoc.slice(18);
    if (BC5 && BC5.W === Wc && BC5.H === Hc) c5.shift();
    BUOC_BT.push(...c5, ...c1, ...c2, ...c3, ...c4, ...c6);
  }
  else if (CANH_HIEN === 5 || (nav.S.mode !== 'idle' && nav.S.to === 5)) {
    const c6 = buoc.slice(18), c1 = buoc.slice(0, 5), c2 = buoc.slice(5, 8), c3 = buoc.slice(8, 12), c4 = buoc.slice(12, 14), c5 = buoc.slice(14, 18);
    if (BC6 && BC6.W === Wc && BC6.H === Hc) c6.shift();
    BUOC_BT.push(...c6, ...c1, ...c2, ...c3, ...c4, ...c5);
  }
  else BUOC_BT.push(...buoc);
}

let FIG_BOX = null;
function trai2(quang = 0.28) {
  const c = PHO.CUA, x0 = c.c[0] - c.h[0] - quang;
  const pts = [[x0, c.c[1] + c.h[1], PHO.WALL_Z], [x0, 0, PHO.WALL_Z], [x0, -(c.c[1] + c.h[1]), PHO.WALL_Z]].map((a) => new THREE.Vector3(...a));
  const b = FIG_BOX || (FIG_BOX = new THREE.Box3().setFromObject(pho.fig));
  for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) { pts.push(new THREE.Vector3(x, y, z)); pts.push(new THREE.Vector3(x, -y, z)); }
  let m = 1e9; for (const p of pts) { const q = pho.man(p, Wc, Hc); if (q.z < 1) m = Math.min(m, q.x); }
  return m;
}
function boTri2A(kieu) {
  const bc = tinhBoCuc2({ W: Wc, H: Hc, kieu, font, tieuDe: CHU.pho.tieuDe, demDong: chu2.demDong, rongThan: chu2.rongThan, dai: daiH() });
  const cam = bc.cam, camX = cam.camX || 0;
  let lui = cam.lui || 0;
  const quang = kieu === 'dt' ? 0.06 : 0.28, le = kieu === 'dt' ? 24 : KIEU2.le;
  const timFx = (fy, fov) => {
    const dat = (fx) => { pho.datMay(fx, fy, fov, lui, camX); return trai2(quang); };
    let a = cam.fx[0], b = cam.fx[1];
    if (dat(a) < bc.phai + le) { for (let i = 0; i < 14; i++) { const m = (a + b) / 2; if (dat(m) < bc.phai + le) a = m; else b = m; } a = b; }
    return a;
  };
  let fy = cam.fy, fov = cam.fov, fx = timFx(fy, fov);
  pho.datBien(PHO.NEON.x0);
  const dayBien = () => (kieu === 'dt' ? bc.top - 22 : Hc - daiH() - 10);
  const yBien = () => pho.hopBongBien(Wc, Hc)[3];
  if (cam.cat && kieu === 'dt') {
    const yCat = (fx2, lui2) => { pho.datMay(fx2, fy, fov, lui2, camX); return pho.man(pho.diemNguoi(cam.cat), Wc, Hc).y; };
    const giai = () => {
      for (let mo = 0; mo < 20; mo++) {
        for (let lap = 0; lap < 3; lap++) {
          let a = -4, b = 6;
          for (let i = 0; i < 18; i++) { const m = (a + b) / 2; if (yCat(fx, m) < 0) a = m; else b = m; }
          lui = (a + b) / 2;
          fx = timFx(fy, fov);
        }
        pho.datMay(fx, fy, fov, lui, camX);
        if (yBien() > dayBien() && fov < cam.fov + 40) { fov += 1.5; continue; }
        break;
      }
    };
    giai();
  } else if (cam.cat) {
    const yCat = (fx2, fy2) => { pho.datMay(fx2, fy2, fov, lui, camX); return pho.man(pho.diemNguoi(cam.cat), Wc, Hc).y; };
    for (let lap = 0; lap < 24; lap++) {
      let a = 0.2, b = 0.7;
      for (let i = 0; i < 16; i++) { const m = (a + b) / 2; if (yCat(fx, m) < 0) a = m; else b = m; }
      fy = (a + b) / 2;
      fx = timFx(fy, fov);
      pho.datMay(fx, fy, fov, lui, camX);
      if (Math.abs(yCat(fx, fy)) >= 1.5) continue;
      const yBong = pho.man(pho.diemNguoi(-1.8), Wc, Hc).y;
      if ((yBong > Hc - daiH() - 18 || yBien() > dayBien()) && fov < cam.fov + 16) { fov += 1; continue; }
      break;
    }
  }
  pho.datMay(fx, fy, fov, lui, camX);
  for (let lap = 0; lap < 3; lap++) {
    const hb = pho.hopBongBien(Wc, Hc), m = pho.datU.uNeonM.value;
    const dx = hb[2] > Wc - 12 ? (Wc - 12) - hb[2] : hb[0] < 12 ? 12 - hb[0] : 0;
    if (Math.abs(dx) < 0.5) break;
    pho.datBien(PHO.NEON.c[0] + dx * m);
  }
  bc.fx = fx; bc.cam = { ...cam, fy, fov, lui, camX }; bc.W = Wc; bc.H = Hc;
  const fwd = pho.camera.getWorldDirection(new THREE.Vector3());
  const xs = bc.dongs.map((d) => d.x), ys = bc.dongs.map((d) => d.y);
  const cx = (Math.min(...xs) + bc.phai) / 2, cy = (Math.min(...ys) - bc.cap + Math.max(...ys)) / 2;
  const tia = (x, y) => { const q = new THREE.Vector3(x / Wc * 2 - 1, 1 - y / Hc * 2, 0.5).unproject(pho.camera); return new THREE.Ray(pho.camera.position, q.sub(pho.camera.position).normalize()); };
  const hit = tia(cx, cy).intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), -PHO.WALL_Z), new THREE.Vector3());
  let zT = hit ? hit.sub(pho.camera.position).dot(fwd) - 0.3 : 6;
  { const yDay = Math.max(...ys) + 0.25 * bc.cap, dat0 = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    for (const x of [Math.min(...xs), bc.phai]) { const g = tia(x, yDay).intersectPlane(dat0, new THREE.Vector3()); if (g) zT = Math.min(zT, g.sub(pho.camera.position).dot(fwd) * 0.85); } }
  td2.dung(bc.dongs, pho.camera, Wc, Hc, Math.min(window.devicePixelRatio || 1, 2), zT, DPR, true);
  BC2 = bc;
}
function datChuMua2() {
  const hd1 = []; for (const c of td2.L.chu) { const r = hd1[c.li] || (hd1[c.li] = [1e9, 1e9, -1e9, -1e9]); r[0] = Math.min(r[0], c.bb[0]); r[1] = Math.min(r[1], c.bb[1]); r[2] = Math.max(r[2], c.bb[2]); r[3] = Math.max(r[3], c.bb[3]); }
  pho.datChuMua([...hd1.filter(Boolean), ...hopChu2()], Hc, DPR);
}
const R2DT = () => (Hc < 800 ? 104 : 118);
const hopChu2 = () => [chu2.moc().than];
let NG_ROWS = null;
function dongNguoi(co = 16) {
  const key = Wc + '|' + Hc + '|' + pho.camera.matrixWorld.elements.join(',') + '|' + pho.camera.projectionMatrix.elements.join(',');
  if (!NG_ROWS || NG_ROWS.key !== key) {
    const rows = new Map(), v = new THREE.Vector3(), q3 = new THREE.Vector3();
    pho.fig.updateMatrixWorld(true);
    pho.fig.traverse((o2) => { if (!o2.isMesh) return; const a2 = o2.geometry.attributes.position;
      for (let i = 0; i < a2.count; i += 3) { v.fromBufferAttribute(a2, i).applyMatrix4(o2.matrixWorld);
        for (const sy of [1, -1]) { q3.set(v.x, v.y * sy, v.z).project(pho.camera); if (q3.z > 1) continue; const qx = (q3.x * 0.5 + 0.5) * Wc, qy = (0.5 - q3.y * 0.5) * Hc; const r = Math.floor(qy / 12); const c = rows.get(r) || [1e9, -1e9]; c[0] = Math.min(c[0], qx); c[1] = Math.max(c[1], qx); rows.set(r, c); } } });
    NG_ROWS = { key, rows: [...rows] };
  }
  return NG_ROWS.rows.map(([r, c]) => { const cx = (c[0] + c[1]) / 2, hw = Math.max(0, (c[1] - c[0]) / 2 - co); return [cx - hw, r * 12 + 4, cx + hw, r * 12 + 8]; });
}
function datLe(kieu) {
  const u = pho.datU.uLe.value, hK = 0.07, cp = pho.camera.position;
  if (kieu !== 'may') { u.w = 0; return; }
  const xCua = pho.man(new THREE.Vector3(PHO.CUA.c[0] - PHO.CUA.h[0], 0, PHO.WALL_Z), Wc, Hc).x - 260;
  const hd = []; for (const c of td2.L.chu) { const r = hd[c.li] || (hd[c.li] = [1e9, 1e9, -1e9, -1e9]); r[0] = Math.min(r[0], c.bb[0]); r[1] = Math.min(r[1], c.bb[1]); r[2] = Math.max(r[2], c.bb[2]); r[3] = Math.max(r[3], c.bb[3]); }
  const hops = [...hd.filter(Boolean), ...hopChu2()].map((r) => [r[0] - 30, r[1] - 30, r[2] + 30, r[3] + 30]);
  let tot = null;
  for (let xK = -0.5; xK >= -1.01; xK -= 0.05) {
    const xT = xK + (xK - cp.x) * hK / (cp.y - hK), xR = xK + (cp.x - xK) * hK / (cp.y + hK);
    let z0 = PHO.WALL_Z, hien = 0;
    for (let z = cp.z - 0.6; z > PHO.WALL_Z; z -= 0.05) {
      const qs = [xT, xR].map((x) => pho.man(new THREE.Vector3(x, 0, z), Wc, Hc));
      if (qs.some((q) => q.x > xCua || hops.some((r) => q.x > r[0] && q.x < r[2] && q.y > r[1] && q.y < r[3]))) { z0 = z; break; }
      if (qs[0].x > 0 && qs[0].y < Hc - daiH()) hien++;
    }
    if (!tot || hien > tot.hien) tot = { xK, z0, hien };
  }
  u.set(tot.xK, hK, tot.z0, tot.hien >= 4 ? 1 : 0);
  window.__le = tot;
}
function boTri2B(kieu) {
  const bc = BC2; if (!bc) return;
  chu2.dung(bc, Wc, Hc, Math.min(window.devicePixelRatio || 1, 2), td2.L.tCuoi);
  const than = chu2.moc().than, hops = hopChu2();
  datLe(kieu);
  { const hd0 = []; for (const c of td2.L.chu) { const r = hd0[c.li] || (hd0[c.li] = [1e9, 1e9, -1e9, -1e9]); r[0] = Math.min(r[0], c.bb[0]); r[1] = Math.min(r[1], c.bb[1]); r[2] = Math.max(r[2], c.bb[2]); r[3] = Math.max(r[3], c.bb[3]); }
    const hopVat = (x0, x1, y1) => { const ps = []; for (const x of [x0, x1]) for (const y of [y1, -y1]) for (const z of [PHO.WALL_Z, PHO.CAM.pos[2] - 0.5]) { const q = pho.man(new THREE.Vector3(x, y, PHO.WALL_Z), Wc, Hc); ps.push(q); void z; } return [Math.min(...ps.map((q) => q.x)), Math.min(...ps.map((q) => q.y)), Math.max(...ps.map((q) => q.x)), Math.max(...ps.map((q) => q.y))]; };
    const C2 = PHO.CUA, N2 = PHO.NEON;
    const cot = [hopVat(C2.c[0] - C2.h[0] - 0.15, C2.c[0] + C2.h[0] + 0.15, C2.c[1] + C2.h[1]), hopVat(N2.c[0] - N2.h[0] - 0.1, N2.c[0] + N2.h[0] + 0.1, N2.c[1] + N2.h[1])];
    void cot;
    window.__dap = pho.chonDap([...hops, ...hd0.filter(Boolean), hopLogo()], Wc, Hc, daiH(), kieu === 'dt' ? 80 : 110); }
  pho.datVungChu([than[0] - 16, than[1] - 16, than[2] + 16, than[3] + 16], Wc, Hc, hops.map((r) => [r[0] - 16, r[1] - 16, r[2] + 16, r[3] + 16]));
  datChuMua2();
  lens2.resize(Wc, Hc, DPR, laDt(), kieu === 'ngang', R2DT(), 92, 190);
  if (KHONG_KINH()) { lopK2 = -1; return; }
  const m = (p) => pho.man(p, Wc, Hc);
  const meta2w = (a) => pho.toWorld(a);
  const co = meta2w(pho.meta.co); co.y = -co.y;
  const tui = pho.TUI.c, tay = meta2w(pho.meta.handL), cot = pho.lampP.clone(); cot.y = 1.1;
  const vet = new THREE.Vector3((PHO.VET.tu[0] + PHO.VET.toi[0]) / 2, 0, (PHO.VET.tu[1] + PHO.VET.toi[1]) / 2);
  const d0 = td2.L.chu.filter((c) => c.li === 0);
  const murder = d0.slice(-6);
  const xM = murder.length ? (Math.min(...murder.map((c) => c.bb[0])) + Math.max(...murder.map((c) => c.bb[2]))) / 2 : Wc * 0.4;
  const yM = d0.length ? Math.max(...d0.map((c) => c.bb[3])) + 26 : Hc * 0.2;
  const pCo = m(co), pTui = m(tui), pTay = m(tay), pDen = m(cot), pVet = m(vet), pPhim = m(pho.DAP);
  const pTayB = m(tay.clone().setY(-tay.y)), pTuiB = m(tui.clone().setY(-tui.y));
  const hopDong = [];
  for (const c of td2.L.chu) { const r = hopDong[c.li] || (hopDong[c.li] = [1e9, 1e9, -1e9, -1e9]); r[0] = Math.min(r[0], c.bb[0]); r[1] = Math.min(r[1], c.bb[1]); r[2] = Math.max(r[2], c.bb[2]); r[3] = Math.max(r[3], c.bb[3]); }
  const nguoiDai = dongNguoi(16);
  const nguoi = (() => { const b = new THREE.Box3().setFromObject(pho.fig); const ps = []; for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) ps.push(m(new THREE.Vector3(x, y, z))); return [Math.min(...ps.map((p) => p.x)), Math.min(...ps.map((p) => p.y)), Math.max(...ps.map((p) => p.x)), Math.max(...ps.map((p) => p.y))]; })();
  const dat = [];
  for (let x = -5; x <= -1; x += 1) dat.push([new THREE.Vector3(x, 0, PHO.WALL_Z), new THREE.Vector3(x * 0.55 - 0.3, 0, PHO.CAM.pos[2] - 1.2)]);
  const leB = kieu === 'dt' ? -14 : 10;
  const hopBien = (() => { const N = PHO.NEON, ps = []; for (const x of [N.c[0] - N.h[0], N.c[0] + N.h[0]]) for (const y of [N.c[1] - N.h[1], N.c[1] + N.h[1]]) ps.push(m(new THREE.Vector3(x, -y, N.c[2]))); return [Math.min(...ps.map((p) => p.x)) - leB, Math.min(...ps.map((p) => p.y)) - leB, Math.max(...ps.map((p) => p.x)) + leB, Math.max(...ps.map((p) => p.y)) + leB]; })();
  const cuaHop = (() => { const c = PHO.CUA, ps = []; for (const x of [c.c[0] - c.h[0], c.c[0] + c.h[0]]) for (const y of [c.c[1] + c.h[1], 0, -(c.c[1] + c.h[1])]) ps.push(m(new THREE.Vector3(x, y, PHO.WALL_Z))); return [Math.min(...ps.map((p) => p.x)), Math.min(...ps.map((p) => p.y)), Math.max(...ps.map((p) => p.x)), Math.max(...ps.map((p) => p.y))]; })();
  const kep = (q) => ({ x: Math.min(Wc - 60, Math.max(60, q.x)), y: Math.min(Hc - daiH() - 60, Math.max(60, q.y)) });
  const trongMan = (q) => q.z < 1 && q.x > 4 && q.x < Wc - 4 && q.y > 4 && q.y < Hc - daiH() - 4;
  const dauChan = []; { const V = PHO.VET; for (let i = 0; i < V.n; i++) { const t = i / (V.n - 1), q = m(new THREE.Vector3(V.tu[0] + (V.toi[0] - V.tu[0]) * t, 0, V.tu[1] + (V.toi[1] - V.tu[1]) * t)); if (trongMan(q)) dauChan.push(q); } }
  const dCuoi = hopDong.filter(Boolean).slice(-1)[0];
  const moiB = m(meta2w([pho.meta.headCentre[0], pho.meta.headCentre[1] - 0.07, pho.meta.headCentre[2]]).setY(-(pho.meta.headCentre[1] - 0.07)));
  const vatDt = kieu === 'dt' ? {
    tay: [pTay, pTayB].filter(trongMan), tui: [pTui, pTuiB].filter(trongMan), son: [pCo, moiB].filter(trongMan), vet: dauChan,
    duoi: dCuoi ? [0.2, 0.5, 0.8].map((k) => ({ x: dCuoi[0] + (dCuoi[2] - dCuoi[0]) * k, y: dCuoi[3] })) : null,
  } : null;
  const hp = pho.phimHop(), phimHop = hp ? [hp[0] - 3, hp[1] - 3, hp[2] + 3, hp[3] + 3] : null;
  const OPT2 = { cam: pho.camera, W: Wc, H: Hc, day: daiH(), kieu, K: CHU.pho.kinh, datDuong: dat, netTay: pho.netTay(), chuNoi: [...hopDong.filter(Boolean), ...hops, cuaHop], phimHop,
    chuNoiChu: [...hopDong.filter(Boolean), ...hops, hopLogo()],
    xa: kieu === 'dt' ? 24 : 14,
    tranh: [...hopDong.filter(Boolean).map((r) => (kieu === 'dt' ? [r[0] + 18, r[1] + 18, r[2] - 18, r[3] - 18] : [r[0] + 10, r[1] + 10, r[2] - 10, r[3] - 10])), kieu === 'dt' ? hopLogo().map((v, i) => v + (i < 2 ? 16 : -16)) : hopLogo(), ...nguoiDai, ...hops.map((r) => (kieu === 'dt' ? [r[0] + 14, r[1] + 14, r[2] - 14, r[3] - 14] : [r[0] - 6, r[1] - 6, r[2] + 6, r[3] + 6])), hopBien,
      ...(hp ? [[hp[0] + 16, hp[1] + 16, hp[2] - 16, hp[3] - 16]] : [])],
    kinhTranh: [hopLogo()],
    vat: vatDt,
    neo: { duoi: kieu === 'dt' && dCuoi ? { x: dCuoi[0] + 70, y: dCuoi[3] + 34 } : kep({ x: xM, y: yM }), son: kep({ x: pCo.x - 80, y: pCo.y }),
      tui: kieu === 'dt' ? { x: pTui.x - 110, y: pTui.y - 24 } : kep({ x: pTui.x - 80, y: pTui.y }),
      tay: kep(kieu === 'dt' ? { x: pTayB.x - 105, y: pTayB.y } : { x: pTay.x - 130, y: pTay.y + 30 }),
      phim: hp ? { x: (hp[0] + hp[2]) / 2, y: (hp[1] + hp[3]) / 2 } : kep({ x: pPhim.x, y: pPhim.y }),
      den: kieu === 'dt' && !trongMan(pDen) ? null : kep({ x: pDen.x - 40, y: pDen.y }),
      vet: kieu === 'dt' && dauChan.length ? { x: dauChan.reduce((s, q) => s + q.x, 0) / dauChan.length, y: Math.min(...dauChan.map((q) => q.y)) - 34 } : kep({ x: pVet.x, y: pVet.y - 60 }) } };
  LENS2_0 = lens2.dungLopPho(OPT2);
  window.__nguoiDai = nguoiDai;
  { const a = m(new THREE.Vector3(-6, 0, PHO.WALL_Z)), b = m(new THREE.Vector3(7, 0, PHO.WALL_Z)); lens2.chiMat.uniforms.uNuoc.value.set(a.x, a.y, b.x, b.y);
    const ch = m(new THREE.Vector3(PHO.NGUOI.pos[0], 0, PHO.NGUOI.pos[2])); lens2.chiMat.uniforms.uChan.value.set(0, 0, ch.y, 1); }
  lopK2 = -1;
}
const R3DT = () => (Hc < 800 ? 96 : 104);
const hopDongTD = (t) => { const out = []; for (const c of t.L.chu) { const r = out[c.li] || (out[c.li] = [1e9, 1e9, -1e9, -1e9]); r[0] = Math.min(r[0], c.bb[0]); r[1] = Math.min(r[1], c.bb[1]); r[2] = Math.max(r[2], c.bb[2]); r[3] = Math.max(r[3], c.bb[3]); } return out.filter(Boolean); };
let BC3m = null;
function boTri3A1(kieu) {
  if (!lat) return;
  const bc = tinhBoCuc3({ W: Wc, H: Hc, kieu, font, tieuDe: CHU.lat.tieuDe, demDong: chu3.demDong, rongThan: chu3.rongThan, dai: daiH() });
  lat.datBoCuc(bc.dai.gx, bc.dai.gy, bc.dai.pxmm, bc.dai.nghieng, Wc, Hc);
  bc.W = Wc; bc.H = Hc;
  BC3m = bc;
}
function boTri3A2() {
  const bc = BC3m; if (!bc || !lat) return;
  td3.dung(bc.dongs, lat.camera, Wc, Hc, Math.min(window.devicePixelRatio || 1, 2), lat.BC.D - 0.09, DPR, true);
  BC3 = bc;
}
function boTri3A(kieu) { boTri3A1(kieu); boTri3A2(); }
function boTri3B(kieu) {
  const bc = BC3; if (!bc || !lat) return;
  chu3.dung(bc, Wc, Hc, Math.min(window.devicePixelRatio || 1, 2), td3.L.tCuoi);
  lens3.resize(Wc, Hc, DPR, laDt(), kieu === 'ngang', R3DT(), 84, 172);
  if (KHONG_KINH()) { LOP3 = null; return; }
  const than = chu3.moc().than, dongs = hopDongTD(td3);
  const mk = (f, x, y) => lat.manKhung(f, x, y);
  const hinhMm = (uv) => [1 + (uv[0] - 0.5) * 22, (uv[1] - 0.5) * 16];
  const khe = kheCua(KHUNG), ng = nguoiAt(KHUNG, MAY_NGO.pos);
  const cuaMm = hinhMm(anhDiem([khe.c, 1.25, -15])), dauMm = hinhMm(anhDiem([ng.x, 1.62, ng.z]));
  const co = (poly, k) => { const cx = poly.reduce((a, q) => a + q.x, 0) / 4, cy = poly.reduce((a, q) => a + q.y, 0) / 4; return poly.map((q) => ({ x: cx + (q.x - cx) * k, y: cy + (q.y - cy) * k })); };
  const h18 = lat.hopHinh(KHUNG), h19 = lat.hopHinh(KHUNG + 1), h17 = lat.hopHinh(KHUNG - 1);
  const trongMan = (poly) => poly.every((q) => q.x > 0 && q.x < Wc && q.y > 0 && q.y < Hc - daiH());
  const kMua = trongMan(h19) || !trongMan(h17) ? KHUNG + 1 : KHUNG - 1;
  const tdCuoi = dongs[dongs.length - 1] || [Wc * 0.6, Hc * 0.4, Wc * 0.9, Hc * 0.45];
  const neo = {
    chinh: bc.kieu === 'may' ? mk(KHUNG, 1, 10.6 - 2.0) : mk(KHUNG, 1, 10.6),
    ngo: mk(KHUNG, cuaMm[0] - 6.5, cuaMm[1] - 1.5),
    so: mk(KHUNG, 12.5, -0.6),
    vet: mk(KHUNG, 1, -10.4),
    mep: mk(KHUNG, -19.5, 3.4),
    mua: mk(kMua, 1, 0),
    duoi: bc.kieu !== 'dt' ? { x: Math.max(than[2] + 130, tdCuoi[0] + (tdCuoi[2] - tdCuoi[0]) * 0.78), y: tdCuoi[3] + 36 } : { x: tdCuoi[0] + 90, y: tdCuoi[1] - 40 },
  };
  const bang = (y0, y1) => [mk(KHUNG, -11.8, y0), mk(KHUNG, 12.6, y0), mk(KHUNG, 12.6, y1), mk(KHUNG, -11.8, y1)];
  const haMm = bc.kieu === 'may' ? 2.0 : 0;
  const trong = { chinh: bang(7.2 - haMm, 15.5), ngo: co(h18, 0.96), mua: co(kMua === KHUNG + 1 ? h19 : h17, 0.97) };
  const vat = { so: [mk(KHUNG, 16.5, -0.6)], vet: [-8, -3, 2, 7].map((x) => mk(KHUNG, x, -9.5)), mep: [mk(KHUNG, -14.9, 3.2)], ngo: [mk(KHUNG, cuaMm[0], cuaMm[1])] };
  const them = kieu === 'ngang' ? 0.3 : 0;
  vat.so.tMax = 0.3 + them; vat.vet.tMax = 0.3 + them; vat.mep.tMax = 0.2 + them; vat.ngo.tMax = 0.5 + them;
  const loi = [mk(KHUNG, -10, -8), mk(KHUNG, 12, -8), mk(KHUNG, 12, 5.0 - haMm), mk(KHUNG, -10, 5.0 - haMm)];
  const hopMm = (pts) => { const q = pts.map(([x, y]) => mk(KHUNG, x, y)); return [Math.min(...q.map((v) => v.x)), Math.min(...q.map((v) => v.y)), Math.max(...q.map((v) => v.x)), Math.max(...q.map((v) => v.y))]; };
  const camSat = [hopMm([[15.95, -2.9], [17.05, -2.9], [17.05, 1.6], [15.95, 1.6]]), hopMm([[-15.8, 0.3], [-14.0, 0.3], [-14.0, 6.1], [-15.8, 6.1]])];
  window.__neo3 = { neo, dauMm, cuaMm };
  LOP3 = { kieu, neo, trong, vat, dongs, than, loi, camSat };
}
let LOP3 = null;
const optLop3 = () => { const { kieu, neo, trong, vat, dongs, than, loi, camSat } = LOP3;
  return { cam: lat.camera, W: Wc, H: Hc, day: daiH(), kieu, K: CHU.lat.kinh, dMat: lat.BC.D * 0.9,
    tranh: [...dongs.map((r) => [r[0] + 10, r[1] + 10, r[2] - 10, r[3] - 10]), [than[0] - 6, than[1] - 6, than[2] + 6, than[3] + 6], hopLogo()],
    chuNoi: [...dongs, than, hopLogo()], neo, trong, vat, loi, camSat, vatGan: kieu === 'ngang' ? 0.8 : 0.5, truc: lat.trucDai() }; };
function boTri3C() {
  if (!LOP3 || !lat) return;
  LENS3_0 = lens3.dungLopLat(optLop3());
  lopK3 = -1;
}
function buoc3C() {
  if (!LOP3 || !lat) return;
  if (!buoc3C.s) buoc3C.s = lens3.dungLopLatBuoc(optLop3());
  const r = buoc3C.s();
  if (r.xong) { LENS3_0 = r.kq; lopK3 = -1; buoc3C.s = null; } else VIEC2.unshift(buoc3C);
}
buoc3C.ten = '3C';
const BT4 = {
  may: { cao: 9.5, S: 3.15, cx: 0.55, cuoi: 0.85, tt: [0.07, -12.48], bong: [0.07, 4.2, -16.68], nem: [0.2, 0.25, 0.775, 0.07],
    den: [0.97, -12.9, 0.45, 0.66], denB: [1.05, 3.06, -12.82], meo: [-0.69, -14.56, 1.7, -1], but: [1.43, -12.55, 0.5, 0.2], bao: [0.375, -13.42, Math.PI / 2 - 0.06, 0.75],
    vung: [[0.2, -14.3, 0.15, 0.11], null, [0.75, -10.4, 0.2, 0.14]] },
  ngang: { cao: 9.5, S: 3.6, cx: 0.75, cuoi: 0.86, tt: [0.07, -12.48], bong: [0.07, 4.2, -16.68], nem: [0.2, 0.25, 0.775, 0.07],
    den: [0.97, -13.15, 0.42, 0.62], denB: [1.05, 3.06, -13.08], meo: [-0.69, -14.56, 1.7, -1], but: [1.43, -12.6, 0.5, 0.2], bao: [0.37, -13.62, Math.PI / 2 - 0.05, 1.1],
    vung: [[0.2, -14.3, 0.15, 0.11], null, [0.75, -10.4, 0.2, 0.14]] },
  dt: { cao: 12, pxm: 114, cx: 0.15, tt: [-0.1, -13.15], bong: [-0.1, 9.0, -16.55], nem: [-0.24, 0.22, 0.775, 0.05],
    den: [0.97, -12.0, 0.4, 0.6], denB: [1.05, 3.06, -11.95], meo: [-0.8, -14.7, 1.7, 1], but: [1.43, -12.6, 0.5, 0.2], bao: [-0.15, -11.35, 0.03, 1.2],
    vung: [[0.25, -14.35, 0.15, 0.11], null, [-0.85, -12.35, 0.16, 0.12]] },
};
function lechNut4(pxm) {
  const lg = hopLogo(); if (!(lg[2] > lg[0]) || !VAT4 || !VAT4.bau) return 0;
  const nut = [lg[0], lg[3] + 10, lg[2], lg[3] + 54], B = VAT4.bau;
  const ps = [[B[0], B[4], B[2]], [B[1], B[4], B[2]], [B[0], B[4], B[3]], [B[1], B[4], B[3]]].map((q) => ngo4.man(q, Wc, Hc));
  const y0 = Math.min(...ps.map((q) => q.y)), y1 = Math.max(...ps.map((q) => q.y)), x1 = Math.max(...ps.map((q) => q.x));
  if (y0 > nut[3] || y1 < nut[1]) return 0;
  const thieu = x1 - (nut[0] - 16);
  return thieu > 0 ? -thieu / pxm : 0;
}
const R4DT = () => (Hc < 800 ? 82 : 86);
function boTri4A(kieu) {
  if (!ngo4) return;
  const B = { ...BT4[kieu], ...((window.__BT4 && window.__BT4[kieu]) || {}) };
  const dt = kieu === 'dt', ngang = kieu === 'ngang';
  const lh = dt ? KIEU.than.lhDt : ngang ? KIEU.than.lhNgang : KIEU.than.lh;
  let fs, cot, x, y;
  const deg = (r) => r * 180 / Math.PI;
  if (dt) {
    fs = KIEU.than.fsDt; cot = Math.round(Wc - 40); x = 20;
    const n0 = chu4.demDong(fs, cot, lh);
    y = Math.round(Hc - daiH() - 22 - n0 * fs * lh);
    const zDayBao = B.bao[1] + 0.5 * B.bao[3];
    const pxm = Math.min(B.pxm * Wc / 390, (y - 16 - 118) / (zDayBao + NGO4.dai)), fov = deg(2 * Math.atan((Hc / pxm / 2) / B.cao));
    ngo4.datMay([B.cx, zDayBao - (y - 16 - Hc / 2) / pxm], B.cao, fov, [0, 0, -1], W, H);
  } else {
    const span = (Wc / Hc) * B.S, zc = B.zc ?? (-NGO4.dai + (B.cuoi - 0.5) * span);
    ngo4.datMay([B.cx, zc], B.cao, deg(2 * Math.atan(B.S / 2 / B.cao)), [-1, 0, 0], W, H);
    if (!ngang) { const d = lechNut4(Wc / span); if (d) ngo4.datMay([B.cx, zc + d], B.cao, deg(2 * Math.atan(B.S / 2 / B.cao)), [-1, 0, 0], W, H); }
    const k = Math.min(Wc / 1920, Hc / 1080);
    fs = Math.round(Math.min(KIEU.than.fsMax, Math.max(ngang ? KIEU.than.fsNgang : KIEU.than.fsMin, 21 * k)));
    cot = Math.round(fs * KIEU.than.cotEm);
    const n0 = chu4.demDong(fs, cot, lh);
    x = Math.max(24, 64 * k);
    y = Hc - daiH() - Math.max(14, 26 * k) - n0 * fs * lh;
  }
  ngo4.datVat({ tt: B.tt, bong: B.bong, nem: B.nem, den: B.den, denB: B.denB, meo: B.meo, but: B.but, vung: B.vung.map((v) => v || [0, 0, 0, 0]) });
  const R = ngo4.shared.uDenR.value, v2 = B.vung[1] || [0, 0, 0.17, 0.12];
  const vs = B.vung.map((v, i) => (i === 1 && B.vung[1] ? [R.x - 0.16, R.y + 0.09, v2[2], v2[3]] : v || [0, 0, 0, 0]));
  ngo4.datVat({ vung: vs });
  ngo4.datBao(...B.bao);
  ngo4.datGai(kieu);
  const n = chu4.demDong(fs, cot, lh);
  BC4 = { kieu, W: Wc, H: Hc, nhan: { x, y: 0, fs: 13 }, than: { x: x - KIEU.than.bu * fs, y, fs, lh, cot, n } };
}
function hopTieu4() {
  if (!ngo4 || !GIAY4) return [0, 0, 0, 0];
  const [u0, v0, u1, v1] = GIAY4.hopTieu, ps = [[u0, v0], [u1, v0], [u0, v1], [u1, v1]].map(([u, v]) => { const p = ngo4.diemBao(u, v); return ngo4.man([p.x, p.y, p.z], Wc, Hc); });
  return [Math.min(...ps.map((q) => q.x)), Math.min(...ps.map((q) => q.y)), Math.max(...ps.map((q) => q.x)), Math.max(...ps.map((q) => q.y))].map(Math.round);
}
function hopMeo4(le = 0) {
  if (!ngo4) return [0, 0, 0, 0];
  const ps = ngo4.meo3.hop().map((p) => ngo4.man([p.x, p.y, p.z], Wc, Hc));
  return [Math.min(...ps.map((q) => q.x)) - le, Math.min(...ps.map((q) => q.y)) - le, Math.max(...ps.map((q) => q.x)) + le, Math.max(...ps.map((q) => q.y)) + le].map(Math.round);
}
function boTri4B(kieu) {
  if (!ngo4 || !BC4) return;
  chu4.dung(BC4, Wc, Hc, Math.min(window.devicePixelRatio || 1, 2), 0);
  lens4.resize(Wc, Hc, DPR, laDt(), kieu === 'ngang', R4DT(), 92, 172);
  ngo4.ganTinh();
  if (KHONG_KINH()) { LOP4 = null; return; }
  const m = (p) => ngo4.man(p, Wc, Hc);
  const than = chu4.moc().than, tieu = hopTieu4();
  const dt = kieu === 'dt';
  const tt = ngo4.tt.position;
  const ch = ngo4.chan, nC = ch.length;
  const pVet = m([ch[nC - 2][0], 0, ch[nC - 2][1]]);
  const S = VAT4.song, pSong = m([(S[0] + S[1]) / 2, 0, (S[2] + S[3]) / 2]);
  const pMu = m([tt.x, 1.82, tt.z]), pLua = (() => { const q = ngo4.diemLua(); return m([q.x, q.y, q.z]); })();
  const pMeo = (() => { const p = ngo4.meo3.dau(); return m([p.x, p.y, p.z]); })();
  const pMeoThan = (() => { const p = ngo4.meo3.diem(0.0, -0.06, 0.05); return m([p.x, p.y, p.z]); })();
  const pBut = (() => { const p = ngo4.diemBut(); return m([p.x, p.y, p.z]); })();
  const pDuoi = (() => { const p = ngo4.diemBao(0.32, Math.min(0.66, GIAY4.hopTieu[3] + 0.1)); return m([p.x, p.y, p.z]); })();
  const pToi = dt ? m([-0.95, 0, -14.4]) : kieu === 'may' ? m([0.38, 0.12, -15.35]) : m([-0.95, 0, -14.1]);
  const pCua = m([0.66, 0.1, -NGO4.dai]);
  const kN = dt ? 1 : Math.min(1, lens4.H.R / 151);
  const doi = (p, dx, dy) => ({ x: p.x + dx * kN, y: p.y + dy * kN });
  const neo = dt ? {
    chinh: (() => { const q = m([0.42, 0, -14.1]); return { x: q.x, y: q.y }; })(), duoi: doi(pDuoi, 0, 26), ham: doi(pSong, 79, 8), tieng: doi(pSong, 60, 95),
    vong: doi(pMu, 0, 80), meo: doi(pMeo, -20, -45), hoi: doi(pToi, 40, -10), but: doi(pBut, -95, 0),
  } : kieu === 'ngang' ? {
    chinh: (() => { const q = m([0.3, 0, -10.75]); return { x: q.x, y: q.y - 46 }; })(), meo: { x: pMeo.x - 63, y: pMeo.y + 70 }, vong: { x: pMu.x - 60, y: pMu.y + 56 },
    duoi: { x: pDuoi.x + 57, y: pDuoi.y + 50 }, ham: { x: pSong.x - 80, y: pSong.y + 20 }, hoi: { x: pToi.x - 68, y: pToi.y + 29 }, tieng: { x: pSong.x - 40, y: pSong.y + 55 },
    but: { x: pBut.x - 73, y: pBut.y - 64 },
  } : {
    chinh: doi(pVet, -23, 84), duoi: doi(pDuoi, 43, 48), ham: doi(pSong, -123, 92), tieng: doi(pSong, 34, 154),
    vong: doi(pMu, -22, -186), meo: doi(pMeo, 60, 125), hoi: doi(pToi, -242, -193), but: (() => { const q = doi(pBut, 0, -110); q.x = Math.max(q.x, than[2] + 90); return q; })(),
  };
  if (kieu === 'may' && kN < 0.9) Object.assign(neo, { duoi: { x: pDuoi.x - 24, y: pDuoi.y + 43 }, hoi: { x: pToi.x - 58, y: pToi.y - 52 } });
  if (window.__NEO4 && window.__NEO4[kieu]) Object.assign(neo, window.__NEO4[kieu]);
  const vat = { ham: [pSong], tieng: [pSong], vong: [pMu, pLua], meo: [pMeo, pMeoThan], duoi: [pDuoi], hoi: [pToi], but: [pBut] };
  for (const k of Object.keys(vat)) vat[k].ten = k;
  const tM = dt || kieu === 'ngang' ? 0.6 : 0.5;
  for (const k of Object.keys(vat)) vat[k].tMax = tM;
  const cuaP = [m([NGO4.cua.x - NGO4.cua.w / 2, 0, -NGO4.dai]), m([NGO4.cua.x + NGO4.cua.w / 2, NGO4.cua.h, -NGO4.dai])];
  const cua = [Math.min(cuaP[0].x, cuaP[1].x) - 10, Math.min(cuaP[0].y, cuaP[1].y) - 10, Math.max(cuaP[0].x, cuaP[1].x) + 10, Math.max(cuaP[0].y, cuaP[1].y) + 10];
  const camSat = ch.map(([vx, vz]) => { const q = m([vx, 0, vz]), q2 = m([vx + 0.1, 0, vz]), r = Math.max(6, Math.abs(q2.y - q.y) + Math.abs(q2.x - q.x)); return [q.x - r, q.y - r, q.x + r, q.y + r]; })
    .filter((b) => b[2] > 0 && b[0] < Wc && b[3] > 0 && b[1] < Hc);
  const meoH = hopMeo4(6);
  const butH = (() => { const B = BT4[kieu].but, c = Math.cos(B[2]), sn = Math.sin(B[2]), h = B[3] / 2 + 0.02, y = NGO4.hP + NGO4.goDay;
    const a = m([B[0] + sn * h, y, B[1] + c * h]), b = m([B[0] - sn * h, y, B[1] - c * h]);
    return [Math.min(a.x, b.x) - 10, Math.min(a.y, b.y) - 10, Math.max(a.x, b.x) + 10, Math.max(a.y, b.y) + 10]; })();
  camSat.push(butH);
  const tuGiac = (h) => [{ x: h[0], y: h[1] }, { x: h[2], y: h[1] }, { x: h[2], y: h[3] }, { x: h[0], y: h[3] }];
  const ttH = (() => { const ps = [[-0.27, 1.45, -0.2], [0.27, 1.45, -0.2], [-0.27, 1.45, 0.2], [0.27, 1.45, 0.2], [-0.22, 1.8, -0.22], [0.22, 1.8, 0.22]].map(([a, b, c]) => m([tt.x + a, b, tt.z + c]));
    return [Math.min(...ps.map((q) => q.x)), Math.min(...ps.map((q) => q.y)), Math.max(...ps.map((q) => q.x)), Math.max(...ps.map((q) => q.y))]; })();
  const songH = (() => { const a = m([S[0], 0, S[2]]), b = m([S[1], 0, S[3]]); return [Math.min(a.x, b.x) - 4, Math.min(a.y, b.y) - 4, Math.max(a.x, b.x) + 4, Math.max(a.y, b.y) + 4]; })();
  if (kieu === 'dt' || lens4.H.R >= 130) camSat.push(songH, ttH);
  LOP4 = { kieu, neo, vat, than, tieu, cua, vet: [pVet], camSat, loiThem: [tuGiac(meoH), tuGiac(ttH)], meoH, ttH, pCua, pts: { pVet, pSong, pMu, pLua, pMeo, pDuoi, pToi } };
}
const OPT_CHINH4 = (dt) => ({ fs: 64, color: HEX.do, nen: null, vien: HEX.muc, mui: dt ? 'len' : 'phai' });
const TEN4 = ['meo', 'but', 'vong', 'ham', 'duoi', 'hoi', 'tieng'];
const K4 = { ...CHU.ngo.kinh, chinh: CHU.ngo.kinh.chinh.split(/(?<=\.)\s+/) };
const TRONG_SO4 = { meo: 1.6, but: 1.5, vong: 1.3, ham: 1.2, duoi: 1.1, hoi: 1.0, tieng: 0.9 };
const optLop4 = () => { const { kieu, neo, vat, than, tieu, camSat, loiThem, meoH } = LOP4;
  return { cam: ngo4.camera, W: Wc, H: Hc, day: daiH(), kieu, K: K4, dMat: 6, tenCum: TEN4, trongSo: TRONG_SO4, optChinh: OPT_CHINH4(kieu === 'dt'),
    tranh: [[tieu[0] + 6, tieu[1] + 6, tieu[2] - 6, tieu[3] - 6], [than[0] - 6, than[1] - 6, than[2] + 6, than[3] + 6], hopLogo()],
    chuNoi: [[tieu[0] - 10, tieu[1] - 10, tieu[2] + 10, tieu[3] + 10], than, hopLogo(), LOP4.cua], camSat: kieu === 'ngang' || (kieu === 'may' && lens4.H.R < 130) ? camSat : [...camSat, meoH], loiThem, neo, trong: {}, vat, vatGan: 0.6 }; };
function boTri4C() { if (!LOP4 || !ngo4) return; LENS4_0 = lens4.dungLopLat(optLop4()); lopK4 = -1; }
function buoc4C() {
  if (!LOP4 || !ngo4) return;
  if (!buoc4C.s) buoc4C.s = lens4.dungLopLatBuoc(optLop4());
  const r = buoc4C.s();
  if (r.xong) { LENS4_0 = r.kq; lopK4 = -1; buoc4C.s = null; } else VIEC2.unshift(buoc4C);
}
buoc4C.ten = '4C';
const s4Now = (now) => { const S = nav.S; if (S.mode !== 'idle' && S.to === 3) return s4Moc + S.t; return s4Bat === null ? 0 : (now - s4Bat) / 1000; };
const kChu4 = (s4) => (tTD4 === -99 ? 99 : tTD4 < 0 ? -1 : s4 - tTD4);
const t4Song = () => (window.__t4 ?? (performance.now() - t0) / 1000);
function veCanh4(s4, dich = null, coChu = true) {
  ngo4.capNhat(t4Song(), mqGiam3.matches ? 0.25 : 1);
  chu4.ve(kChu4(s4));
  ngo4.ve(dich);
  if (coChu) chu4.render(renderer);
}
function veKinh4(k, dich = null) {
  if (Math.abs(k - lopK4) > 0.004 || ((k === 0) !== (lopK4 === 0))) { lens4.datLop(k); lopK4 = k; }
  lv.copy(ngo4.nshared.uLfill.value).transformDirection(ngo4.camera.matrixWorldInverse);
  lens4.render(ngo4.scene, ngo4.camera, Wc, Hc, lv, dich);
  renderer.setRenderTarget(dich);
  chu4.render(renderer);
}
const kinh4 = (s4) => { if (tTD4 === -1) return 0; const a = tTD4 === -99 ? T4.D + 0.6 : tTD4 + chu4.L.het + 0.3; return ssm(a, a + MO.KINH, s4); };
function datDay4() {
  DAY4 = null;
  if (!lat || !BC3) return;
  const hinhMm = (uv) => [1 + (uv[0] - 0.5) * 22, (uv[1] - 0.5) * 16];
  const ng = nguoiAt(KHUNG, MAY_NGO.pos);
  const mm = (y, dx = 0) => hinhMm(anhDiem([ng.x + dx, y, ng.z]));
  const tam = mm(0.95), P = lat.manKhung(KHUNG, tam[0], tam[1]);
  const q = [mm(1.72, -0.28), mm(1.72, 0.28), mm(0.0, 0.28), mm(0.0, -0.28)].map((a) => lat.manKhung(KHUNG, a[0], a[1]));
  const cam = lat.camera, c0 = cam.position.clone();
  const dir = new THREE.Vector3(P.x / Wc * 2 - 1, 1 - P.y / Hc * 2, 0.5).unproject(cam).sub(c0).normalize();
  if (dir.z >= -0.05) return;
  DAY4 = { P, q, c0, dir, t0: c0.z / -dir.z };
}
function dayMay3(k) {
  if (!DAY4) return 1;
  const e = inOut3(Math.min(1, k / T4.DAY)), z = Math.exp(Math.log(T4.ZMAX) * e);
  lat.camera.position.copy(DAY4.c0).addScaledVector(DAY4.dir, DAY4.t0 * (1 - 1 / z)); lat.camera.updateMatrixWorld();
  if (DAY4.cell === undefined) DAY4.cell = lat.U.uCellMM.value;
  lat.U.uCellMM.value = DAY4.cell / Math.pow(2, Math.round(Math.log2(z) * 2) / 2);
  return z;
}
const traMay3 = () => { if (DAY4 && lat) { lat.camera.position.set(0, 0, lat.BC.D); lat.camera.updateMatrixWorld(); if (DAY4.cell !== undefined) lat.U.uCellMM.value = DAY4.cell; } };
function veChuyen34(k, man, now) {
  if (k < T4.DAY) {
    den4 = false;
    const z = dayMay3(k);
    const den0 = lat.U.uDen.value; lat.U.uDen.value = den0 * (1 - (1 - LAT.DEN_TOI) * ssm(0.0, 0.4, k));
    const tan0 = (DAY4 && DAY4.tan0) || 0;
    td3.U.uTan.value = Math.max(tan0, ssm(0.0, 0.1, k));
    chu3.datA(Math.max(0, 1 - k / 0.08) * (1 - tan0) * (0.35 + 0.65 * mDung));
    lat.ve(man);
    lat.U.uDen.value = den0;
    td3.U.uTan.value = 0;
    if (DAY4 && k > T4.MAT0) {
      const P = DAY4.P, q = DAY4.q.map((a) => ({ x: P.x + (a.x - P.x) * z, y: P.y + (a.y - P.y) * z }));
      const e = Math.min(1, (k - T4.MAT0) / (T4.DAY - T4.MAT0)), ra = e * e * (3 - 2 * e);
      renderer.setRenderTarget(man); chuyen.mat(q, Math.exp(Math.log(heSoPhu(q)) * (1 - ra)) * (1 - ra) + 0.0001, W, H, DPR);
    }
    traMay3();
  } else {
    if (!den4) { const rt = chuyen.khung(W, H), cc = renderer.getClearColor(new THREE.Color()), ca = renderer.getClearAlpha(); renderer.setRenderTarget(rt); renderer.setClearColor(new THREE.Color().setRGB(C.muc.x, C.muc.y, C.muc.z, THREE.LinearSRGBColorSpace), 1); renderer.clear(); renderer.setClearColor(cc, ca); den4 = true; }
    veCanh4(s4Now(now), man);
    renderer.setRenderTarget(man); chuyen.tan((k - T4.DAY) / (1 - T4.DAY));
  }
}
async function dungCanh4() {
  if (dang4 || !lat) return; dang4 = true;
  try { await napNgo4(); if (!document.fonts.check('40px "BA Anton"')) { const ff = new FontFace('BA Anton', antonBuf.slice(0)); await ff.load(); document.fonts.add(ff); } }
  catch (e) { dang4 = false; return; }
  const kieu = () => (laDt() ? 'dt' : Hc < 560 ? 'ngang' : 'may');
  const ten = (t, fn) => { fn.ten = t; return fn; };
  const gb = taoGiayBaoBuoc(CHU.ngo.tieuDe, 'BA Anton');
  await new Promise((r) => VIEC2.push(...gb.slice(0, -1).map((f, i) => ten('4giay' + i, f)), ten('4giayx', () => { GIAY4 = gb[gb.length - 1](); }),
    ten('4ban', () => taoBanSao4()), ten('4canh', () => taoCanh4(true)), ten('4canh', () => taoCanh4(true)), ten('4canh', () => taoCanh4(true)), ten('4canh', () => taoCanh4(true)), ten('4tao', () => { taoNgo4(); r(); })));
  VIEC2.push(ten('4A', () => boTri4A(kieu())), ten('4B', () => boTri4B(kieu())), ...(KHONG_KINH() ? [] : lens4.ghiTruoc(K4, laDt(), TEN4, OPT_CHINH4(laDt()))).map((fn, i) => ten('4ghi' + i, fn)), buoc4C);
  await new Promise((r) => VIEC2.push(r));
  try {
    if (renderer.extensions.has('KHR_parallel_shader_compile')) { await ngo4.lamNongAsync(); if (!KHONG_KINH()) await lens4.lamNongAsync(ngo4.scene, ngo4.camera, ngo4.dichTungVat); }
    else { renderer.compile(ngo4.scene, ngo4.camera); if (!KHONG_KINH()) lens4.lamNong(ngo4.scene, ngo4.camera); }
  } catch (e) { }
  await new Promise((r) => VIEC2.push(ten('4tinh', () => ngo4.veTinh()), ten('4nongm', () => lamNong4('m')), ten('4nong', () => lamNong4(0)), ten('4nongk', () => { lamNong4(1); r(); })));
  C4 = true;
}
let rtNong4 = null;
function lamNong4(phan = -1) {
  if (!rtNong4) rtNong4 = new THREE.WebGLRenderTarget(W, H, { depthBuffer: true });
  if (phan === 'm') { renderer.setRenderTarget(rtNong4); renderer.render(ngo4.meo, ngo4.camera); renderer.setRenderTarget(null); return; }
  if (phan !== 1) veCanh4(30, rtNong4, false);
  if (phan !== 0) { lens4.H.x = Wc * 0.4; lens4.H.y = Hc * 0.4; lens4.H.on = KHONG_KINH() ? 0 : 1; veKinh4(lens4.H.on, rtNong4); lens4.H.on = 0; }
  renderer.setRenderTarget(null); chu4.ve(-1);
  if (phan !== 0) { rtNong4.dispose(); rtNong4 = null; }
}
function boTri5A(kieu) {
  if (!ham5) return;
  const bc = tinhBoCuc5({ W: Wc, H: Hc, kieu, font, tieuDe: CHU.ham.tieuDe, demDong: chu5.demDong, rongThan: chu5.rongThan, dai: daiH() });
  ham5.datMay(bc.may, W, H); ham5.datDpr(DPR);
  td5.dung(bc.dongs, ham5.camera, Wc, Hc, Math.min(window.devicePixelRatio || 1, 2), 1.0, DPR, true);
  bc.W = Wc; bc.H = Hc;
  BC5 = bc;
}
const hopMan5 = (ps, le = 0) => { const q = ps.map((p) => ham5.man(p, Wc, Hc)); return [Math.min(...q.map((v) => v.x)) - le, Math.min(...q.map((v) => v.y)) - le, Math.max(...q.map((v) => v.x)) + le, Math.max(...q.map((v) => v.y)) + le].map(Math.round); };
function hopTay5(le = 0) {
  if (!ham5) return [0, 0, 0, 0];
  const h = ham5.hopTay(Wc, Hc); return [h[0] - le, h[1] - le, h[2] + le, h[3] + le];
}
function boTri5B(kieu) {
  if (!ham5 || !BC5) return;
  chu5.dung(BC5, Wc, Hc, Math.min(window.devicePixelRatio || 1, 2), td5.L.tCuoi);
  lens5.resize(Wc, Hc, DPR, laDt(), kieu === 'ngang', R5DT(), 96, 172, 126);
  ham5.ganTinh();
  if (KHONG_KINH()) { LOP5 = null; return; }
  const D = ham5.diem, m = (p) => ham5.man([p.x, p.y, p.z], Wc, Hc), dt = kieu === 'dt';
  const than = chu5.moc().than, dongs = hopDongTD(td5), tdCuoi = dongs[dongs.length - 1] || [Wc * 0.7, Hc * 0.7, Wc * 0.9, Hc * 0.75];
  const pTo = m(D.to), pBut = m(D.butBan), pKep = m(D.kepTrong), pKinh = m(D.kinhCua);
  const tayDu = hopTay5(), tay = ham5.hopTay(Wc, Hc, 390), pTay = ham5.diemTay(420, 700, Wc, Hc);
  const hopDen = hopMan5(D.hopDen);
  const kN = dt ? 1 : Math.min(1, lens5.H.R / 151);
  const doi = (p, dx, dy) => ({ x: p.x + dx * kN, y: p.y + dy * kN });
  const neo = dt ? {
    chinh: { x: Math.min(Wc - 100, hopDen[2] + 130), y: hopDen[3] + 6 }, tay: { x: (tay[0] + tay[2]) / 2 + 14, y: tay[1] - 34 }, toi: doi(pKep, 10, 92), but: doi(pBut, 30, 56),
    kinh: doi(pKinh, 92, 70), duoi: { x: Wc * 0.62, y: dongs[0] ? dongs[0][1] - 34 : Hc * 0.5 },
  } : kieu === 'ngang' ? {
    chinh: { x: hopDen[0] - lens5.H.R * 1.2, y: (hopDen[1] + hopDen[3]) / 2 + 20 }, tay: { x: (tay[0] + tay[2]) / 2 - 56, y: tay[1] - 14 }, toi: doi(pKep, 0, 70), but: doi(pBut, 60, 40), kinh: doi(pKinh, 70, 52),
    duoi: { x: (dongs[0] ? dongs[0][0] : Wc * 0.6) + 90, y: (dongs[0] ? dongs[0][1] : Hc * 0.3) - 34 },
  } : {
    chinh: { x: hopDen[0] - lens5.H.R * 1.25, y: hopDen[3] + 10 }, tay: doi(pTay, -120, 0), toi: doi(pKep, 0, 120), but: doi(pBut, 70, 72),
    kinh: doi(pKinh, 120, 66), duoi: { x: Math.min(Wc - 130, tdCuoi[2] + 130), y: (tdCuoi[1] + tdCuoi[3]) / 2 },
  };
  if (window.__NEO5 && window.__NEO5[kieu]) Object.assign(neo, window.__NEO5[kieu]);
  const vat = { chinh: [pTo], tay: [pTay], toi: [pKep], but: [pBut], kinh: [pKinh] };
  for (const k of Object.keys(vat)) { vat[k].ten = k; vat[k].tMax = dt || kieu === 'ngang' ? 0.6 : 0.5; }
  const camSat = [tay, hopMan5([[D.to.x - 0.15, D.to.y, D.to.z - 0.11], [D.to.x + 0.15, D.to.y, D.to.z + 0.11]]), hopMan5([[D.butBan.x - 0.05, D.butBan.y, D.butBan.z - 0.05], [D.butBan.x + 0.05, D.butBan.y, D.butBan.z + 0.05]], 4),
    hopMan5([[D.kinhCua.x, D.kinhCua.y - 0.2, D.kinhCua.z - 0.31], [D.kinhCua.x, D.kinhCua.y + 0.2, D.kinhCua.z + 0.31]], 4), hopMan5([[D.kepTrong.x - 0.02, D.kepTrong.y - 0.04, D.kepTrong.z], [D.kepTrong.x + 0.02, D.kepTrong.y + 0.01, D.kepTrong.z]], 6)];
  const tuGiac = (h) => [{ x: h[0], y: h[1] }, { x: h[2], y: h[1] }, { x: h[2], y: h[3] }, { x: h[0], y: h[3] }];
  const loiThem = [tuGiac(tayDu), tuGiac(hopMan5(D.tayTrai, 8)), tuGiac(hopMan5(D.phim, 6)), tuGiac(hopMan5(D.nguoi, 0)), tuGiac(camSat[1])];
  LOP5 = { kieu, neo, vat, than, dongs, camSat, loiThem, tay, pts: { pTo, pBut, pKep, pKinh, pTay } };
}
const OPT_CHINH5 = (dt) => ({ fs: 64, color: HEX.do, nen: null, vien: HEX.muc, mui: dt ? 'trai' : 'phai' });
const TEN5 = ['tay', 'toi', 'kinh', 'but', 'duoi'];
const TRONG_SO5 = { tay: 1.6, toi: 1.4, kinh: 1.35, but: 1.2, duoi: 1.0 };
const K5 = { ...CHU.ham.kinh, chinh: CHU.ham.kinh.chinh.split(/(?<=[.?])\s+/) };
const optLop5 = () => { const { kieu, neo, vat, than, dongs, camSat, loiThem } = LOP5;
  return { cam: ham5.camera, W: Wc, H: Hc, day: daiH(), kieu, K: K5, dMat: 0.6, tenCum: TEN5, trongSo: TRONG_SO5, optChinh: OPT_CHINH5(kieu === 'dt'),
    tranh: [...dongs.map((r) => [r[0] + 6, r[1] + 6, r[2] - 6, r[3] - 6]), [than[0] - 6, than[1] - 6, than[2] + 6, than[3] + 6], hopLogo()],
    chuNoi: [...dongs, than, hopLogo()], camSat, loiThem, neo, trong: {}, vat, vatGan: 0.6, canKinh: true, kinhGiua: true }; };
function boTri5C() { if (!LOP5 || !ham5) return; LENS5_0 = lens5.dungLopLat(optLop5()); lopK5 = -1; }
function buoc5C() {
  if (!LOP5 || !ham5) return;
  if (!buoc5C.s) buoc5C.s = lens5.dungLopLatBuoc(optLop5());
  const r = buoc5C.s();
  if (r.xong) { LENS5_0 = r.kq; lopK5 = -1; buoc5C.s = null; } else VIEC2.unshift(buoc5C);
}
buoc5C.ten = '5C';
const s5Now = (now) => { const S = nav.S; if (S.mode !== 'idle' && S.to === 4) return s5Moc + S.t; return s5Bat === null ? 0 : (now - s5Bat) / 1000; };
const kChu5 = (s5) => (tTD5 === -99 ? 99 : tTD5 < 0 ? -1 : s5 - tTD5);
const t5Song = () => (window.__t5 ?? (performance.now() - t0) / 1000);
function veCanh5(s5, dich = null, coChu = true, khongBong = false) {
  if (nac5 !== NAC) { ham5.datNac(NAC, PHAN_MEM); nac5 = NAC; }
  ham5.capNhat(t5Song(), mqGiam3.matches ? 0.25 : 1);
  const k = kChu5(s5);
  td5.ve(k); chu5.ve(k);
  ham5.ve(dich, khongBong);
  if (coChu) chu5.render(renderer);
}
function veKinh5(k, dich = null) {
  if (Math.abs(k - lopK5) > 0.004 || ((k === 0) !== (lopK5 === 0))) { lens5.datLop(k); lopK5 = k; }
  lv.copy(ham5.nshared.uLred.value).transformDirection(ham5.camera.matrixWorldInverse);
  lens5.render(ham5.scene, ham5.camera, Wc, Hc, lv, dich);
  renderer.setRenderTarget(dich);
  chu5.render(renderer);
}
const kinh5 = (s5) => { if (tTD5 === -1) return 0; const a = tTD5 === -99 ? T5.D + 0.6 : tTD5 + chu5.L.het + 0.3; return ssm(a, a + MO.KINH, s5); };
function datDay5() {
  DAY5 = null;
  if (!ngo4 || !BC4) return;
  const cam = ngo4.camera, c0 = cam.position.clone(), fwd = cam.getWorldDirection(new THREE.Vector3());
  const S = VAT4.song, gc = new THREE.Vector3((S[0] + S[1]) / 2, 0, (S[2] + S[3]) / 2);
  const p0 = ngo4.man([gc.x, 0, gc.z], Wc, Hc);
  const goc = [[S[0], S[2]], [S[1], S[2]], [S[1], S[3]], [S[0], S[3]]].map(([x, z]) => ngo4.man([x, 0, z], Wc, Hc));
  const kich = Math.max((Math.max(...goc.map((q) => q.y)) - Math.min(...goc.map((q) => q.y))) / Hc, (Math.max(...goc.map((q) => q.x)) - Math.min(...goc.map((q) => q.x))) / Wc);
  const mag = Math.max(2, Math.min(T5.MAG, 0.42 / Math.max(0.01, kich)));
  const pm = (() => { const q = ngo4.meo3.dau(); return ngo4.man([q.x, q.y, q.z], Wc, Hc); })();
  const cdx = pm.x - p0.x, cdy = pm.y - p0.y, cl = Math.hypot(cdx, cdy) || 1;
  const g = { x: Wc * (0.5 + 0.13 * cdx / cl), y: (Hc - daiH()) * (0.5 + 0.13 * cdy / cl) };
  const foe = { x: (g.x - mag * p0.x) / (1 - mag), y: (g.y - mag * p0.y) / (1 - mag) };
  const dir = new THREE.Vector3(foe.x / Wc * 2 - 1, 1 - foe.y / Hc * 2, 0.5).unproject(cam).sub(c0).normalize();
  const z0 = gc.clone().sub(c0).dot(fwd), uz = dir.dot(fwd);
  if (uz <= 0.05 || z0 <= 0.2) return;
  DAY5 = { c0, dir, z0, uz, mag, near: cam.near };
}
const traMay4 = () => { if (DAY5 && ngo4) { const cam = ngo4.camera; cam.position.copy(DAY5.c0); cam.near = DAY5.near; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); ngo4.ganTinh(); } };
function veHa4(k, dich, now) {
  const u = Math.min(1, k / T5.DAY), e = inOut3(Math.max(0, (u - T5.TAT) / (1 - T5.TAT)));
  const cam = ngo4.camera;
  if (DAY5) {
    const z = Math.exp(Math.log(DAY5.mag) * e);
    cam.position.copy(DAY5.c0).addScaledVector(DAY5.dir, (DAY5.z0 - DAY5.z0 / z) / DAY5.uz);
    cam.near = Math.min(DAY5.near, Math.max(0.08, (cam.position.y - 0.5) * 0.5)); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    ngo4.ganTinh();
  }
  ngo4.capNhat(t4Song(), mqGiam3.matches ? 0.25 : 1);
  const tat = ssm(0, T5.TAT, u);
  ngo4.shared.uTat.value = tat; ngo4.nshared.uSang.value = 1 - 0.75 * tat;
  ngo4.shared.uTanSong.value = 0.62 * ssm(T5.TAT, T5.TAT + 0.2, u);
  if (!mqGiam3.matches) { const w = ngo4.meo3.u.uC3.value; w.w = Math.max(w.w, ssm(0.1, 0.4, u)); }
  chu4.datA(Math.max(0, 1 - k / 0.1) * (0.35 + 0.65 * mDung));
  chu4.ve(kChu4(s4Now(now)));
  ngo4.ve(dich);
  chu4.render(renderer);
  ngo4.shared.uTat.value = 0; ngo4.shared.uTanSong.value = 0; ngo4.nshared.uSang.value = 1;
  traMay4();
}
function veChuyen45(k, man, now) {
  if (k < T5.DAY) { khung5 = false; veHa4(k, man, now); return; }
  if (!khung5) { veHa4(T5.DAY, chuyen.khung(W, H), now); khung5 = true; }
  veCanh5(s5Now(now), man);
  renderer.setRenderTarget(man); chuyen.tan((k - T5.DAY) / (1 - T5.DAY));
}
async function dungCanh5() {
  if (dang5 || !ngo4) return; dang5 = true;
  try {
    await napHam5();
    const [buf, J, anh] = await taiHam5();
    const g = await new GLTFLoader().parseAsync(buf, './model/');
    ham5Du = { nguoi: g.scene, J, anh };
  } catch (e) { dang5 = false; return; }
  const kieu = () => (laDt() ? 'dt' : Hc < 560 ? 'ngang' : 'may');
  const ten = (t, fn) => { fn.ten = t; return fn; };
  await new Promise((r) => VIEC2.push(...Array.from({ length: 7 }, () => ten('5canh', () => taoCanh5(true))), ten('5tao', () => { taoCanh5(); r(); })));
  VIEC2.push(ten('5A', () => boTri5A(kieu())), ten('5sdf', () => { VIEC2.unshift(...td5.sdfBuoc().map((f, i) => ten('5sdf' + i, f))); }), ten('5B', () => boTri5B(kieu())),
    ...(KHONG_KINH() ? [] : lens5.ghiTruoc(K5, laDt(), TEN5, OPT_CHINH5(laDt()))).map((fn, i) => ten('5ghi' + i, fn)), buoc5C);
  await new Promise((r) => VIEC2.push(r));
  try {
    if (renderer.extensions.has('KHR_parallel_shader_compile')) { await ham5.lamNongAsync(); if (!KHONG_KINH()) await lens5.lamNongAsync(ham5.scene, ham5.camera); }
    else { renderer.compile(ham5.scene, ham5.camera); if (!KHONG_KINH()) lens5.lamNong(ham5.scene, ham5.camera); }
  } catch (e) { }
  await new Promise((r) => VIEC2.push(ten('5tinh', () => ham5.veTinh()), ten('5bong', () => ham5.veBongDen()), ...ham5.nongTay().map((f, i) => ten('5tay' + i, f)), ...viecTex(ham5.scene).map((f, i) => ten('5tex' + i, f)), ten('5nong', () => lamNong5(0)), ten('5nongk', () => { lamNong5(1); r(); })));
  C5 = true;
}
let rtNong5 = null;
function viecTex(sc, n = 3) {
  const ds = new Set();
  const them = (v) => { if (v && v.isTexture && !v.isRenderTargetTexture && !v.isDepthTexture && !v.isFramebufferTexture) ds.add(v); };
  sc.traverse((o) => {
    const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of ms) { for (const k in m) them(m[k]); if (m.uniforms) for (const k in m.uniforms) them(m.uniforms[k] && m.uniforms[k].value); }
  });
  const a = [...ds], out = [];
  for (let i = 0; i < a.length; i += n) { const g = a.slice(i, i + n); out.push(() => { for (const t of g) renderer.initTexture(t); }); }
  return out;
}
function lamNong5(phan = -1) {
  if (!rtNong5) rtNong5 = new THREE.WebGLRenderTarget(W, H, { depthBuffer: true });
  if (phan !== 1) veCanh5(30, rtNong5, false, true);
  if (phan !== 0) { lens5.H.x = Wc * 0.4; lens5.H.y = Hc * 0.4; lens5.H.on = KHONG_KINH() ? 0 : 1; veKinh5(lens5.H.on, rtNong5); lens5.H.on = 0; }
  renderer.setRenderTarget(null); chu5.ve(-1); td5.ve(-1);
  if (phan !== 0) { rtNong5.dispose(); rtNong5 = null; }
}
const kieuNow = () => (laDt() ? 'dt' : Hc < 560 ? 'ngang' : 'may');
function mayFiles6(kieu, bc) {
  const a = Wc / Hc;
  if (kieu === 'dt') return { ...MAY6.dt, lech: bc && bc.lech ? bc.lech : [0, 0] };
  const M = MAY6.may, fov = Math.max(M.fov, 2 * Math.atan(Math.tan((M.hfov * Math.PI) / 360) / a) * 180 / Math.PI);
  return { p: M.p, t: M.t, fov, lech: kieu === 'ngang' ? [0.2, 0.04] : [0, 0] };
}
function datMay6() { if (!ban6 || !BC6) return; ban6.datMay(F6.s === 2 ? ban6.mayForm(BC6.may, BC6.kieu) : BC6.may, W, H); }
function boTri6A(kieu) {
  if (!ban6) return;
  const bc = tinhBoCuc6({ W: Wc, H: Hc, kieu, font, tieuDe: CHU.ban.tieuDe, demDong: chu6.demDong, rongThan: chu6.rongThan, dai: daiH() });
  ban6.datKieu(kieu); ui6.datKieu(kieu);
  bc.may = mayFiles6(kieu);
  ban6.datMay(bc.may, W, H);
  if (kieu === 'dt') {
    const thanDay = bc.than.y + bc.than.n * bc.than.fs * bc.than.lh;
    const daiTren = Math.round(Math.min(Hc - daiH() - 8 - 206 - 24, Math.max(Hc - daiH() - 268 - 24, thanDay + 24 + Math.max(220, Hc * 0.3))));
    const q = ban6.man([0.03, BAN6Y(), -0.24], Wc, Hc), muc = thanDay * 0.38 + daiTren * 0.62;
    bc.may = { ...bc.may, lech: [0, (muc - q.y) / Hc] }; ban6.datMay(bc.may, W, H);
    { const tren = Math.min(...ban6.diem.anh.map((c) => Math.min(...[[c.x - 0.13, c.z - 0.1], [c.x + 0.13, c.z - 0.1], [c.x - 0.13, c.z + 0.1], [c.x + 0.13, c.z + 0.1]].map(([x, z]) => ban6.man([x, c.y, z], Wc, Hc).y))));
      if (tren < thanDay + 20) { bc.may = { ...bc.may, lech: [0, bc.may.lech[1] + (thanDay + 20 - tren) / Hc] }; ban6.datMay(bc.may, W, H); } }
    bc.daiTren = daiTren;
  }
  td6.dung(bc.dongs, ban6.camera, Wc, Hc, Math.min(window.devicePixelRatio || 1, 2), 0.9, DPR, true);
  bc.W = Wc; bc.H = Hc;
  BC6 = bc;
  if (F6.s === 2) datMay6();
  datUi6();
}
const BAN6Y = () => 0.76;
function datUi6() {
  if (!ban6 || !BC6 || !ui6) return;
  const kieu = BC6.kieu, m0 = ban6.mayDat();
  if (F6.s === 2) ban6.datMay(BC6.may, W, H);
  ui6.datTap(kieu === 'dt' ? [null, null, null, null, null] : [0, 1, 2, 3, 4].map((i) => ban6.gocTap(i, Wc, Hc)));
  ui6.datCo(kieu === 'may' ? Math.min(1.35, Math.max(1, Hc / 1080)) : 1);
  ui6.datDai(kieu === 'dt' ? BC6.daiTren : null);
  const p = ban6.hopPhieu(Wc, Hc);
  if (kieu === 'ngang') ui6.datMang(BC6.than.x, BC6.than.y + BC6.than.n * BC6.than.fs * BC6.than.lh + 14, 0);
  else {
    const hm = ui6.hopMang(), wm = hm[2] - hm[0] || 236, x106 = Math.min(...ban6.gocTap(4, Wc, Hc).map((v) => v.x));
    ui6.datMang(Math.min(p[0] + 10 * Math.max(0.7, BC6.s), x106 - 8 - wm), p[1] - 58 * Math.max(0.7, Math.min(1.2, BC6.s)), -2);
  }
  if (kieu === 'may') { const kc = Math.min(1.35, Math.max(1, Hc / 1080)), wt = Math.round(380 * Math.max(0.85, Math.min(1, BC6.s)) * kc), lp = Math.round(90 * Math.max(0.8, Math.min(1.35, BC6.s)));
    ui6.datThe({ left: (Wc - wt - lp) + 'px', top: Math.round(110 * Math.max(0.8, Math.min(1.35, BC6.s))) + 'px', width: wt + 'px' }); }
  else if (kieu === 'ngang') { const thR = chu6.moc().than ? chu6.moc().than[2] : BC6.than.x + BC6.than.cot, xp = Math.max(td6.L.box[2], thR) + 14, wt = Math.max(300, Wc - xp - 14); ui6.datThe({ left: (Wc - wt - 14) + 'px', top: (PHONE ? 60 : 10) + 'px', width: wt + 'px' }); }
  else ui6.datThe({ left: '', top: '', width: '' });
  if (F6.s === 2) { ban6.datMay(m0, W, H); ui6.datForm(rectForm6()); datChan6(); THU.a = vungHop(ui6.form.getBoundingClientRect()); }
  datThe6();
  if (F6.s === 0 && ui6.theMo() >= 0) { THU.a = vungHop(ui6.hopThe()); THU.b = vungTap6(ui6.theMo()); }
  datChanBan6();
}
function datThe6() {
  if (!ui6 || !BC6 || !ban6 || ui6.theMo() < 0 || BC6.kieu === 'dt') return;
  const kieu = BC6.kieu, the = ui6.the, day = Hc - daiH() - 10;
  const q = ban6.gocTap(4, Wc, Hc), b = [Math.min(...q.map((v) => v.x)), Math.min(...q.map((v) => v.y)), Math.max(...q.map((v) => v.x)), Math.max(...q.map((v) => v.y))];
  const loi = [b[0] + (b[2] - b[0]) * 0.22, b[1] + (b[3] - b[1]) * 0.22, b[2] - (b[2] - b[0]) * 0.22, b[3] - (b[3] - b[1]) * 0.22];
  const td = td6.L.box, lg = hopLogo(), giao = (r, s) => r[0] < s[2] && r[2] > s[0] && r[1] < s[3] && r[3] > s[1];
  const nA = document.getElementById('nut-am'), nR = nA && !nA.hidden ? nA.getBoundingClientRect() : null, nutA = nR && nR.width ? [nR.left - 12, nR.top - 12, nR.right + 12, nR.bottom + 12] : null;
  const nhan = kieu === 'may' ? Math.round(24 * Math.min(1.35, Math.max(1, Hc / 1080))) : 0;
  const phanCham = (r, s) => { const w = Math.min(r[2], s[2]) - Math.max(r[0], s[0]), h = Math.min(r[3], s[3]) - Math.max(r[1], s[1]); return w > 0 && h > 0 ? (w * h) / ((s[2] - s[0]) * (s[3] - s[1])) : 0; };
  const thu = (x, y, w, choCham = 0) => { if (w) the.style.width = w + 'px'; const r = the.getBoundingClientRect(), hh = r.height, ww = r.width;
    const hop = [x, y - nhan, x + ww, y + hh];
    return x >= 8 && y - nhan >= 6 && x + ww <= Wc - 8 && y + hh <= day && !giao(hop, td) && !giao(hop, lg) && !(nutA && giao(hop, nutA)) && phanCham(hop, loi) <= choCham ? { x, y, w: ww } : null; };
  const w0 = parseFloat(the.style.width) || the.getBoundingClientRect().width, x0 = parseFloat(the.style.left) || 0, y0 = parseFloat(the.style.top) || 0;
  let c = null;
  if (kieu === 'may') {
    const h0 = () => the.getBoundingClientRect().height;
    c = thu(x0, y0, 0, 0.3) || thu(x0, Math.max(8 + nhan, lg[3] + 10 + nhan, nutA ? nutA[3] + nhan : 0), 0, 0.3) || thu(x0, Math.max(8 + nhan, lg[3] + 10 + nhan, nutA ? nutA[3] + nhan : 0)) || thu(b[0] - 16 - w0, y0) || thu(Wc - w0 - 16, day - h0()) || thu(24, day - h0());
  } else {
    const wt = Math.min(560, Math.round(b[0] - 28));
    c = thu(16, td[3] + 10, wt) || thu(x0, y0, w0);
  }
  if (c) ui6.datThe({ left: Math.round(c.x) + 'px', top: Math.round(c.y) + 'px', width: Math.round(c.w) + 'px' });
}
function rectForm6() {
  const m0 = ban6.mayDat(); ban6.datMay(ban6.mayForm(BC6.may, BC6.kieu), W, H);
  const r = ban6.hopPhieu(Wc, Hc); ban6.datMay(m0, W, H);
  const bw = r[2] - r[0], bh = r[3] - r[1];
  let x0 = r[0] + 0.137 * bw, x1 = r[2] - 0.04 * bw; const wMin = Math.min(620, Wc - 40);
  if (x1 - x0 < wMin) { const cx = (x0 + x1) / 2; x0 = cx - wMin / 2; x1 = cx + wMin / 2; }
  if (x0 < 16) { x1 += 16 - x0; x0 = 16; } if (x1 > Wc - 16) { x0 -= x1 - (Wc - 16); x1 = Wc - 16; }
  const top = Math.max(16, r[1] + 0.05 * bh), h = Math.min(Hc - daiH() - 16 - top, Math.max(bh * 0.98, 640));
  return [Math.round(x0), Math.round(top), Math.round(x1), Math.round(top + h)];
}
const hopMan6 = (ps, le = 0) => { const q = ps.map((p) => ban6.man(p, Wc, Hc)); return [Math.min(...q.map((v) => v.x)) - le, Math.min(...q.map((v) => v.y)) - le, Math.max(...q.map((v) => v.x)) + le, Math.max(...q.map((v) => v.y)) + le].map(Math.round); };
function boTri6B(kieu) {
  if (!ban6 || !BC6) return;
  chu6.dung(BC6, Wc, Hc, Math.min(window.devicePixelRatio || 1, 2), td6.L.tCuoi);
  lens6.resize(Wc, Hc, DPR, laDt(), kieu === 'ngang', R6DT(), 96, 172, 126);
  if (KHONG_KINH()) { LOP6 = null; datUi6(); return; }
  const D = ban6.diem, m = (p) => ban6.man(p, Wc, Hc), dt = kieu === 'dt';
  const than = chu6.moc().than, dongs = hopDongTD(td6), td0 = dongs[0] || [Wc * 0.3, 40, Wc * 0.7, 120];
  const pAnh = D.anh.map(m), pNhan = D.nhan.map(m), pPhim = m(D.phim);
  const hopAnh = (i) => { const c = D.anh[i]; return hopMan6([[c.x - 0.13, c.y, c.z - 0.1], [c.x + 0.13, c.y, c.z + 0.1]], 2); };
  const kN = dt ? 1 : Math.min(1, lens6.H.R / 151);
  const doi = (p, dx, dy) => ({ x: p.x + dx * kN, y: p.y + dy * kN });
  const neo = dt ? { chinh: { x: pAnh[4].x - 25, y: pAnh[4].y - 50 }, co: { x: Wc - 100, y: (than[3] + pAnh[4].y) / 2 }, duoi: { x: Wc * 0.5, y: than[3] + 34 } }
    : kieu === 'ngang' ? { chinh: m(D.t7), co: doi(pAnh[4], -10, -110), giu: doi(pPhim, -40, 80), duoi: { x: than[0] + 110, y: than[3] + 120 } }
    : { chinh: doi(pNhan[4], -10, 96), co: doi(pAnh[4], -10, -150), giu: doi(pPhim, -60, 110), duoi: { x: (td0[0] + td0[2]) / 2 + 140, y: than[3] + 44 } };
  const vat = kieu === 'ngang' ? { giu: [pPhim] } : dt ? { chinh: [pNhan[4]] } : { chinh: [pNhan[4]], co: [pAnh[4]], giu: [pPhim] };
  for (const k of Object.keys(vat)) { vat[k].ten = k; vat[k].tMax = dt || kieu === 'ngang' ? 0.6 : 0.55; }
  const mangR = dt ? [0, 0, 0, 0] : ui6.hopMang();
  const camSat = (dt ? [0, 1, 2, 3] : [0, 1, 2, 3, 4]).map(hopAnh).concat([ban6.hopPhieu(Wc, Hc), hopMan6([[D.phim.x - 0.04, D.phim.y, D.phim.z - 0.035], [D.phim.x + 0.04, D.phim.y, D.phim.z + 0.035]], 4)]);
  const daiR = dt && BC6.daiTren ? [0, BC6.daiTren - 10, Wc, Hc] : null;
  const tuGiac = (h) => [{ x: h[0], y: h[1] }, { x: h[2], y: h[1] }, { x: h[2], y: h[3] }, { x: h[0], y: h[3] }];
  const loiThem = dt ? [] : [0, 1, 2, 3, 4].map((i) => tuGiac(hopAnh(i))).concat([tuGiac(ban6.hopPhieu(Wc, Hc))]);
  LOP6 = { kieu, neo, vat, than, dongs, camSat, loiThem, chuThem: [mangR, ...(daiR ? [daiR] : [])] };
  datUi6();
  if (CHAN6) LOP6.chuThem.push(CHAN6.hop);
}
const OPT_CHINH6 = () => ({ fs: 64, color: HEX.do, nen: null, vien: HEX.muc, mui: laDt() ? 'xuong' : 'len' });
const TEN6 = ['co', 'giu', 'duoi'];
const TRONG_SO6 = { co: 1.5, giu: 1.3, duoi: 1.0 };
const K6 = { ...CHU.ban.kinh, chinh: CHU.ban.kinh.chinh.split(/(?<=[.:])\s+/) };
const optLop6 = (noi = false) => { const { kieu, neo, vat, than, dongs, loiThem, chuThem } = LOP6; const camSat = noi || kieu !== 'may' ? LOP6.camSat.slice(-2) : LOP6.camSat;
  return { cam: ban6.camera, W: Wc, H: Hc, day: kieu === 'dt' && BC6.daiTren ? Hc - BC6.daiTren + 4 : daiH(), kieu, K: K6, dMat: 0.6, tenCum: TEN6, trongSo: TRONG_SO6, optChinh: OPT_CHINH6(),
    tranh: [...dongs.map((r) => [r[0] + 6, r[1] + 6, r[2] - 6, r[3] - 6]), [than[0] - 6, than[1] - 6, than[2] + 6, than[3] + 6], hopLogo(), ...chuThem],
    chuNoi: [...dongs, than, hopLogo(), ...(kieu === 'dt' ? [] : chuThem)], camSat, loiThem: noi ? [] : loiThem, neo, trong: {}, vat, vatGan: 0.6, canKinh: true, kinhGiua: true }; };
const hongChinh6 = () => lens6.LOPBO.includes('No rain in this on');
function boTri6C() { if (!LOP6 || !ban6) return; LENS6_0 = lens6.dungLopLat(optLop6()); if (hongChinh6() && LOP6.kieu !== 'may') LENS6_0 = lens6.dungLopLat(optLop6(true)); lopK6 = -1; }
function buoc6C() {
  if (!LOP6 || !ban6) return;
  if (!buoc6C.s) { buoc6C.noi = false; buoc6C.s = lens6.dungLopLatBuoc(optLop6()); }
  const r = buoc6C.s();
  if (r.xong && hongChinh6() && LOP6.kieu !== 'may' && !buoc6C.noi) { buoc6C.noi = true; buoc6C.s = lens6.dungLopLatBuoc(optLop6(true)); VIEC2.unshift(buoc6C); return; }
  if (r.xong) { LENS6_0 = r.kq; lopK6 = -1; buoc6C.s = null; } else VIEC2.unshift(buoc6C);
}
buoc6C.ten = '6C';
const s6Now = (now) => { const S = nav.S; if (S.mode !== 'idle' && S.to === 5) return s6Moc + S.t; return s6Bat === null ? 0 : (now - s6Bat) / 1000; };
const kChu6 = (s6) => (tTD6 === -99 ? 99 : tTD6 < 0 ? -1 : s6 - tTD6);
const t6Song = () => (window.__t6 ?? (performance.now() - t0) / 1000);
let dt6 = 0.016, kinhLui6 = 0, truot6 = false, hienLai6 = -1;
const NHOE6 = Q.has('nhoe') ? +Q.get('nhoe') : 1.6;
function veCanh6(s6, dich = null, coChu = true) {
  if (nac6 !== NAC) { ban6.datNac(NAC); nac6 = NAC; }
  ban6.capNhat(t6Song(), dt6, mqGiam3.matches ? 0.25 : 1);
  const k = kChu6(s6);
  td6.ve(k); chu6.ve(k);
  ban6.ve(dich, Wc, Hc);
  if (coChu) { renderer.setRenderTarget(dich); chu6.render(renderer); }
}
function veKinh6(k, dich = null) {
  if (Math.abs(k - lopK6) > 0.004 || ((k === 0) !== (lopK6 === 0))) { lens6.datLop(k); lopK6 = k; }
  lv.set(0.3, 0.6, 0.7).normalize().transformDirection(ban6.camera.matrixWorldInverse);
  lens6.render(ban6.scene, ban6.camera, Wc, Hc, lv, dich);
  renderer.setRenderTarget(dich);
  chu6.render(renderer);
}
const kinh6 = (s6) => { if (tTD6 === -1) return 0; const a = tTD6 === -99 ? T6.D + 0.6 : tTD6 + chu6.L.het + 0.3; return ssm(a, a + MO.KINH, s6); };
function veChuyen56(k, man, now) {
  const rtB = chuyen.khungB(W, H);
  const giu = tTD6; tTD6 = -1; veCanh6(s6Now(now), rtB, true); tTD6 = giu;
  const k0 = T6.XOA / T6.D, u = Math.max(0, (k - k0) / (1 - k0)), Dt = T6.D - T6.XOA;
  const v = u < 0.5 ? 12 * u * u : 12 * (1 - u) * (1 - u);
  renderer.setRenderTarget(man); chuyen.truot(inOut3(u), rtB.texture, W, H, DPR, Math.min(0.2, v * NHOE6 / (Dt * 60)), ssm(0, k0, k), NAC >= 3 || PHAN_MEM ? 10 : 32);
}
function chupTran1(t, mo) {
  const rt = chuyen.khungC(W, H), u0 = td.U.uTan.value;
  td.U.uTan.value = 1; chu.datA(0); khoiTran = true; veCanh(t, mo, rt); khoiTran = false;
  td.U.uTan.value = u0; chu.datA(0.35 + 0.65 * mDung); renderer.setRenderTarget(null);
}
function chupTran5(now) {
  const rt = chuyen.khungC(W, H), giu = tTD5; tTD5 = -1;
  veCanh5(s5Now(now), rt, false); tTD5 = giu; renderer.setRenderTarget(null);
}
const NHOE_F = Q.has('nhoef') ? +Q.get('nhoef') : 1.5;
const vLuot = new THREE.Vector3(), vFoe = new THREE.Vector3();
function veLuot6(u, s6, man, aChu = 1) {
  const e = inOut3(u), A = F6.m0, B = F6.m1, lerp3 = (a, b) => a.map((v, i) => v + (b[i] - v) * e);
  ban6.datMay({ p: lerp3(A.p, B.p), t: lerp3(A.t, B.t), fov: A.fov, lech: A.lech }, W, H);
  td6.U.uTan.value = ssm(0, 0.3, u); chu6.datA((1 - ssm(0, 0.25, u)) * aChu);
  ban6.datPhieuTron(u >= 0.45);
  const rt = chuyen.khungB(W, H);
  veCanh6(s6, rt, true);
  td6.U.uTan.value = 0;
  vLuot.set(B.p[0] - A.p[0], B.p[1] - A.p[1], B.p[2] - A.p[2]);
  const quang = vLuot.length(), cam = ban6.camera.position, con = Math.max(0.25, cam.distanceTo(vFoe.set(...B.t)));
  const v = u < 0.5 ? 12 * u * u : 12 * (1 - u) * (1 - u);
  const k = Math.min(0.22, (v * quang / (T6.FORM * 60)) * NHOE_F / con);
  vFoe.copy(cam).addScaledVector(vLuot.normalize(), 6);
  const f = ban6.man(vFoe, Wc, Hc);
  renderer.setRenderTarget(man); chuyen.zoom(rt.texture, W, H, f.x * W / Wc, H - f.y * H / Hc, k, NAC >= 3 || PHAN_MEM ? 10 : 24);
}
function moForm6() {
  if (!ban6 || !BC6 || F6.s !== 0 || nav.cur() !== 5 || nav.S.mode !== 'idle') return;
  if (ui6) ui6.dongThe();
  F6.m0 = BC6.may; F6.m1 = ban6.mayForm(BC6.may, BC6.kieu); F6.t0 = performance.now();
  { const m0 = ban6.mayDat(); ban6.datMay(F6.m1, W, H); datVungForm6(); ban6.datMay(m0, W, H); }
  F6.s = mqGiam3.matches ? 2 : 1;
  SFX.su('to-mo');
  if (F6.s === 2) { ban6.datMay(F6.m1, W, H); hienForm6(); }
}
const THU = { k: 0, a: null, b: null };
const vungHop = (r) => { if (!r || !r.width) return null; const sx = W / Wc, sy = H / Hc;
  return [(r.left + r.width / 2) * sx, (Hc - (r.top + r.height / 2)) * sy, (r.width / 2 + 2) * sx, (r.height / 2 + 2) * sy]; };
function vungTap6(i) { const q = ban6.gocTap(i, Wc, Hc), sx = W / Wc, sy = H / Hc; const x0 = Math.min(...q.map((v) => v.x)), y0 = Math.min(...q.map((v) => v.y)), x1 = Math.max(...q.map((v) => v.x)), y1 = Math.max(...q.map((v) => v.y));
  return [(x0 + x1) / 2 * sx, (Hc - (y0 + y1) / 2) * sy, ((x1 - x0) / 2 * 1.12 + 8) * sx, ((y1 - y0) / 2 * 1.12 + 8) * sy]; }
const longThu = () => 30 * W / Wc;
function datVungForm6() { if (!ui6 || !BC6) return; const m0 = ban6.mayDat(); THU.a = vungHop(ui6.hopForm(rectForm6())); THU.b = null; if (m0) ban6.datMay(m0, W, H); }
function capNhatThu6(dt, dich) {
  if (dich == null) dich = 0;
  if (dich > 0 && !(THU.dich > 0)) SFX.su('den'); THU.dich = dich;
  if (F6.s === 3) THU.k = 0;
  THU.k = Math.max(0, Math.min(1, THU.k + Math.sign(dich - THU.k) * Math.min(Math.abs(dich - THU.k), dt / 0.5)));
  ban6.datThu(mqGiam3.matches ? (dich > 0 ? 1 : 0) * (THU.k > 0 ? 1 : 0) : THU.k, THU.a, THU.b, longThu());
}
function hienForm6() { ban6.datPhieuTron(!ui6.daGui()); ui6.moForm(rectForm6()); ui6.datChan(true); datChan6(); THU.a = vungHop(ui6.form.getBoundingClientRect()); THU.b = null; }
function datChan6() {
  if (!ui6 || !ban6 || !BC6) return;
  if (BC6.kieu === 'dt') { ui6.datChanO(null); return; }
  const m0 = ban6.mayDat(); ban6.datMay(ban6.mayForm(BC6.may, BC6.kieu), W, H);
  const q = ban6.gocPhieu(Wc, Hc); ban6.datMay(m0, W, H);
  const k = Math.min(1.35, Math.max(1, Hc / 1080)), w = ui6.rongChan(), yb = Hc - daiH() - 14, ya = yb - 18 * k;
  const cat = (y) => { const xs = []; for (let i = 0; i < 4; i++) { const a = q[i], b = q[(i + 1) % 4]; if ((a.y - y) * (b.y - y) <= 0 && a.y !== b.y) xs.push(a.x + (b.x - a.x) * (y - a.y) / (b.y - a.y)); } return xs; };
  const cam = [];
  for (const y of [ya, (ya + yb) / 2, yb]) { const xs = cat(y); if (xs.length) cam.push([Math.min(...xs), Math.max(...xs)]); }
  const fr = ui6.form.getBoundingClientRect(); if (fr.width && fr.bottom > ya && fr.top < yb) cam.push([fr.left, fr.right]);
  const trai = cam.length ? Math.min(...cam.map((c) => c[0])) : Wc, phai = cam.length ? Math.max(...cam.map((c) => c[1])) : 0;
  if (40 + w <= trai - 16) ui6.datChanO({ left: 40 });
  else if (16 + w <= trai - 16) ui6.datChanO({ left: 16 });
  else if (phai + 16 + w <= Wc - 16) ui6.datChanO({ left: Math.max(phai + 16, Wc - 40 - w) });
  else ui6.datChanO('trong');
}
let CHAN6 = null, chanO6 = '';
function datChanBan6() {
  CHAN6 = null; chanO6 = '';
  if (!ui6 || !ban6 || !BC6 || BC6.kieu === 'dt') return;
  const m0 = ban6.mayDat(); ban6.datMay(BC6.may, W, H);
  const k = BC6.kieu === 'may' ? Math.min(1.35, Math.max(1, Hc / 1080)) : 1, w = ui6.rongChan(), yb = Hc - daiH() - 14, ya = yb - 18 * k;
  const hop = (q) => [Math.min(...q.map((v) => v.x)), Math.min(...q.map((v) => v.y)), Math.max(...q.map((v) => v.x)), Math.max(...q.map((v) => v.y))];
  const vat = [ban6.hopPhieu(Wc, Hc), ...[0, 1, 2, 3, 4].map((i) => hop(ban6.gocTap(i, Wc, Hc))), ui6.hopMang(), td6 && td6.L ? td6.L.box : null, chu6 && chu6.moc ? chu6.moc().than : null];
  ban6.datMay(m0, W, H);
  const th = ui6.hopThe(); if (th && th.width) vat.push([th.left, th.top, th.right, th.bottom]);
  const cham = (x) => vat.some((r) => r && r[0] < x + w + 14 && r[2] > x - 14 && r[1] < yb + 6 && r[3] > ya - 10);
  for (const x of [40, 16, Wc - 40 - w, Wc - 16 - w]) if (x >= 8 && x + w <= Wc - 8 && !cham(x)) { CHAN6 = { left: x, hop: [x - 6, ya - 6, x + w + 6, yb + 6] }; return; }
}
function dongForm6() {
  if (!ban6 || F6.s !== 2) return;
  ui6.dongForm(); ui6.datChan(false);
  const rt = chuyen.khung(W, H); veCanh6(s6Now(performance.now()), rt, false); renderer.setRenderTarget(null);
  ban6.datPhieuTron(false);
  ban6.datMay(BC6.may, W, H);
  F6.s = 3; F6.t0 = performance.now();
  SFX.su('to-dong');
}
function roiCanh6() { if (!ban6) return; ban6.datPhieuTron(false); THU.k = 0; ban6.datThu(0, null, null); if (ui6) { ui6.dongThe(); if (ui6.formMo()) ui6.dongForm(); ui6.datChan(false); ui6.datHien(false); } F6.s = 0; if (BC6) ban6.datMay(BC6.may, W, H); }
async function dungCanh6() {
  if (dang6 || !ham5) return; dang6 = true;
  try { await napBan6(); const anh = await taiAnh6(); ban6Du = { anh }; } catch (e) { dang6 = false; return; }
  const ten = (t, fn) => { fn.ten = t; return fn; };
  for (const [k, v] of Object.entries({ '6canh': 4, '6A': 12, '6B': 8, '6html': 4, '6nong': 14, '6nongk': 10, '6bong': 6, '6tex': 3 })) if (!VIEC_GIA[k]) VIEC_GIA[k] = v;
  await new Promise((r) => { const buoc = ten('6canh', () => { if (taoCanh6(true)) r(); else VIEC2.unshift(buoc); }); VIEC2.push(buoc); });
  VIEC2.push(ten('6A', () => boTri6A(kieuNow())), ten('6sdf', () => { VIEC2.unshift(...td6.sdfBuoc().map((f, i) => ten('6sdf' + i, f))); }), ten('6B', () => boTri6B(kieuNow())),
    ten('6html', () => { VIEC2.unshift(...ui6.viecLamNong().map((f, i) => ten('6html' + i, f))); }),
    ...(KHONG_KINH() ? [] : lens6.ghiTruoc(K6, laDt(), TEN6, OPT_CHINH6())).map((fn, i) => ten('6ghi' + i, fn)), buoc6C);
  await new Promise((r) => VIEC2.push(r));
  try {
    if (renderer.extensions.has('KHR_parallel_shader_compile')) {
      await ban6.lamNongAsync(chuyen.khungB(W, H)); if (!KHONG_KINH()) await lens6.lamNongAsync(ban6.scene, ban6.camera);
      const giu = renderer.getRenderTarget();
      for (const scx of [chuyen.sc[3], chuyen.sc[4]]) { for (const d of [null, rtThap]) { renderer.setRenderTarget(d); await renderer.compileAsync(scx, chuyen.cam).catch(() => {}); } }
      renderer.setRenderTarget(giu);
    }
    else { renderer.compile(ban6.scene, ban6.camera); if (!KHONG_KINH()) lens6.lamNong(ban6.scene, ban6.camera); }
  } catch (e) { }
  await new Promise((r) => VIEC2.push(ten('6bong', () => ban6.veBong()), ...viecTex(ban6.scene).map((f, i) => ten('6tex' + i, f)), ten('6nong', () => lamNong6(0)), ten('6nongt', () => lamNong6(2)), ten('6nongk', () => { lamNong6(1); r(); })));
  C6 = true;
}
let rtNong6 = null;
function lamNong6(phan = -1) {
  if (!rtNong6) rtNong6 = new THREE.WebGLRenderTarget(W, H, { depthBuffer: true });
  if (phan === 0 || phan === -1) veCanh6(30, rtNong6, false);
  if (phan === 2 || phan === -1) { const rtB = chuyen.khungB(W, H); renderer.setRenderTarget(rtNong6); chuyen.truot(0.5, rtB.texture, W, H, DPR); chuyen.zoom(rtB.texture, W, H, W / 2, H / 2, 0.05); }
  if (phan === 1 || phan === -1) { lens6.H.x = Wc * 0.4; lens6.H.y = Hc * 0.4; lens6.H.on = KHONG_KINH() ? 0 : 1; veKinh6(lens6.H.on, rtNong6); lens6.H.on = 0; }
  renderer.setRenderTarget(null); chu6.ve(-1); td6.ve(-1);
  if (phan === 1 || phan === -1) { rtNong6.dispose(); rtNong6 = null; }
}
let s3Bat = null, s3Moc = 0, tChay3 = T3.CHAY, chay3 = false, tTD3 = -1, tDung3 = -1, daQua3 = false, lopK3 = -1;
const kChu3 = (s3) => (tTD3 === -99 ? 99 : tTD3 < 0 ? -1 : s3 - tTD3);
function veCanh3(s3, dich = null, coChu = true) {
  const k = kChu3(s3);
  td3.ve(k); chu3.ve(k);
  lat.muaSong(s3, !mqGiam3.matches);
  lat.ve(dich);
  if (coChu) chu3.render(renderer);
}
function veKinh3(k, dich = null) {
  const kl = k;
  if (Math.abs(kl - lopK3) > 0.004 || ((kl === 0) !== (lopK3 === 0))) { lens3.datLop(kl); lopK3 = kl; }
  lv.set(0, 0, 1);
  lens3.render(lat.scene, lat.camera, Wc, Hc, lv, dich);
  renderer.setRenderTarget(dich);
  chu3.render(renderer);
}
const kinh3 = (s3) => { if (tDung3 < 0) return 0; const a = Math.max(tDung3 + 1.2, tTD3 >= 0 ? tTD3 + chu3.L.het + 0.3 : 0); return ssm(a, a + MO.KINH, s3); };
let DAY = null;
function datDay() {
  DAY = null;
  if (!pho || !BC3 || !pho.phim.visible) return;
  const cam = pho.camera, c0 = cam.position.clone(), fwd = cam.getWorldDirection(new THREE.Vector3());
  pho.phim.updateMatrixWorld();
  let x0 = 1e9, x1 = -1e9, sx = 0, sy = 0, n = 0;
  for (const q of pho.PHIM_MAU) { const w = q.clone().applyMatrix4(pho.phim.matrixWorld), m = pho.man(w, Wc, Hc); x0 = Math.min(x0, m.x); x1 = Math.max(x1, m.x); sx += m.x; sy += m.y; n++; }
  const p0 = { x: sx / n, y: sy / n }, wPhim = Math.max(8, x1 - x0);
  const g = { x: BC3.dai.gx, y: BC3.dai.gy }, mag = Math.max(2, (35 * BC3.dai.pxmm) / wPhim);
  const foe = { x: (g.x - mag * p0.x) / (1 - mag), y: (g.y - mag * p0.y) / (1 - mag) };
  const dir = new THREE.Vector3(foe.x / Wc * 2 - 1, 1 - foe.y / Hc * 2, 0.5).unproject(cam).sub(c0).normalize();
  const tam = pho.phim.position.clone();
  const z0 = tam.clone().sub(c0).dot(fwd), uz = dir.dot(fwd);
  if (uz <= 0.05 || z0 <= 0.2) return;
  DAY = { c0, dir, z0, uz, mag };
}
function heSoPhu(q) {
  const cx = (q[0].x + q[1].x + q[2].x + q[3].x) / 4, cy = (q[0].y + q[1].y + q[2].y + q[3].y) / 4;
  let r = 1e9;
  for (let i = 0; i < 4; i++) { const a = q[i], b = q[(i + 1) % 4], l = Math.hypot(b.x - a.x, b.y - a.y) || 1; r = Math.min(r, Math.abs((b.x - a.x) * (cy - a.y) - (b.y - a.y) * (cx - a.x)) / l); }
  const R = Math.max(...[[0, 0], [Wc, 0], [0, Hc], [Wc, Hc]].map(([x, y]) => Math.hypot(x - cx, y - cy)));
  return Math.max(1, 1.15 * R / Math.max(1, r));
}
function matDong(k, rt) {
  if (k <= T3.MAT0) return;
  if (!lat) return;
  const q = lat.hopCua();
  const e = Math.min(1, (k - T3.MAT0) / (1 - T3.MAT0)), ra = 1 - (1 - e) * (1 - e);
  renderer.setRenderTarget(rt); chuyen.mat(q, Math.exp(Math.log(heSoPhu(q)) * (1 - ra)), W, H, DPR);
}
function matMo(u, rt) {
  if (u >= 1 || !lat) return;
  const q = lat.hopCua();
  renderer.setRenderTarget(rt); chuyen.mat(q, Math.exp(Math.log(heSoPhu(q)) * Math.max(0, u) * Math.max(0, u)), W, H, DPR);
}
let vaoDay3 = false;
function viTriDay(k) {
  if (!DAY) return null;
  const e = inOut3(Math.min(1, Math.max(0, k)));
  const z = DAY.z0 / Math.pow(DAY.mag, e);
  return DAY.c0.clone().addScaledVector(DAY.dir, (DAY.z0 - z) / DAY.uz);
}
const traMay2 = () => { if (pho && BC2) pho.datMay(BC2.fx, BC2.cam.fy, BC2.cam.fov, BC2.cam.lui || 0, BC2.cam.camX || 0); };
async function dungCanh3() {
  if (!document.querySelector('link[data-ngo4]')) { const l = document.createElement('link'); l.rel = 'modulepreload'; l.href = new URL('./ngo4.js', import.meta.url).href; l.dataset.ngo4 = '1'; document.head.appendChild(l); }
  if (dang3 || !pho) return; dang3 = true;
  try { await napLat(); } catch (e) { dang3 = false; return; }
  const kieu = () => (laDt() ? 'dt' : Hc < 560 ? 'ngang' : 'may');
  const ten = (t, f) => { f.ten = t; return f; };
  await new Promise((r) => VIEC2.push(ten('3tao', () => { taoLat(); r(); })));
  VIEC2.push(...lat.viecSo().map((f, i) => ten('3so' + i, f)));
  VIEC2.push(ten('3A1', () => boTri3A1(kieu())), ten('3A2', () => boTri3A2()), ten('3sdf', () => { VIEC2.unshift(...td3.sdfBuoc().map((f, i) => ten('3sdf' + i, f))); }),
    ten('3B', () => boTri3B(kieu())), ...(KHONG_KINH() ? [] : lens3.ghiTruoc(CHU.lat.kinh, laDt())).map((f, i) => ten('3ghi' + i, f)), buoc3C);
  await new Promise((r) => VIEC2.push(r));
  try { await lat.taoNgo(); } catch (e) { }
  for (const f of lat.viecVe()) VIEC2.push(ten('anh', f));
  await new Promise((r) => VIEC2.push(r));
  try {
    if (renderer.extensions.has('KHR_parallel_shader_compile')) { await renderer.compileAsync(lat.scene, lat.camera).catch(() => {}); if (!KHONG_KINH()) await lens3.lamNongAsync(lat.scene, lat.camera); }
    else { renderer.compile(lat.scene, lat.camera); if (!KHONG_KINH()) lens3.lamNong(lat.scene, lat.camera); }
  } catch (e) { }
  await new Promise((r) => VIEC2.push(ten('3nong1', () => lamNong3(1)), ten('3nong2', () => { lamNong3(2); r(); })));
  C3 = true;
  for (const f of lat.viecBienMua([KHUNG - 2, KHUNG - 1, KHUNG + 1, KHUNG + 2], 4)) VIEC2.push(ten('mua', f));
}
let rtNong3 = null;
function lamNong3(buoc = 0) {
  if (!rtNong3) rtNong3 = new THREE.WebGLRenderTarget(W, H, { depthBuffer: true });
  const s0 = lat.CH.s, cho0 = lat.CH.cho, ch0 = lat.CH.chay; lat.datS(KHUNG); lat.capNhat(0);
  if (buoc !== 2) veCanh3(20, rtNong3, false);
  if (buoc !== 1) { lens3.H.x = Wc * 0.3; lens3.H.y = Hc * 0.4; lens3.H.on = KHONG_KINH() ? 0 : 1; veKinh3(lens3.H.on, rtNong3); lens3.H.on = 0; }
  lat.CH.s = s0; lat.CH.cho = cho0; lat.CH.chay = ch0;
  renderer.setRenderTarget(null); td3.ve(-1); chu3.ve(-1);
  if (buoc !== 1) { rtNong3.dispose(); rtNong3 = null; }
}
function mocChu() {
  const t = chu.moc(), b = td.L.box, bc = BC;
  const yTieuCuoi = Math.max(...bc.dongs.map((d) => d.y)) + 4;
  return { kieu: bc.kieu, x: bc.LE, yTieuCuoi, yThan: t.than[1], yHet: t.than[3], yDay: t.than[3], w: t.than[2] - t.than[0], phai: t.than[2], tieuDe: b, than: t.than, nhan: t.nhan, cap: bc.cap };
}
function tuongPx(x, y) {
  const pl = new THREE.Plane().setFromNormalAndCoplanarPoint(base.toCam0, base.tuong);
  const sz = nen.tuong.material.uniforms.uSize.value;
  const pt = new THREE.Vector3(x / Wc * 2 - 1, 1 - y / Hc * 2, 0.5).unproject(camera);
  const hit = new THREE.Ray(camera.position, pt.sub(camera.position).normalize()).intersectPlane(pl, new THREE.Vector3());
  const loc = nen.tuong.worldToLocal(hit); return new THREE.Vector2(loc.x + sz.x / 2, loc.y + sz.y / 2);
}
function datTuong(m, dt) {
  const u = nen.tuong.material.uniforms, sz = u.uSize.value;
  const yCua = vungSang(0, Wc * 0.5);
  const hx = Math.max(m.phai + 90, Wc * 0.5), hy = Math.min(Hc * 0.85, yCua + Hc * 0.22);
  const c = tuongPx(dt ? Wc * 0.25 : hx, dt ? Hc * 0.7 : hy);
  u.uHat.value.set(c.x / sz.x, c.y / sz.y, 1.15, dt ? 0.42 : 0.5);
  const mu = new THREE.Box3().setFromObject(gltf.scene.getObjectByName('Mu'));
  let trai = 1e9; for (const x of [mu.min.x, mu.max.x]) for (const y of [mu.min.y, mu.max.y]) for (const z of [mu.min.z, mu.max.z]) { const s = new THREE.Vector3(x, y, z).project(camera); trai = Math.min(trai, (s.x * 0.5 + 0.5) * Wc); }
  const xL = dt ? 30 : m.phai + 34, xR = dt ? Wc * 0.45 : trai - 8;
  if (xR - xL < 90 || m.tieuDe) { u.uSocB.value.w = 0; SOC = null; return; }
  const cx = (xL + xR) / 2, wPx = Math.min(300, xR - xL - 16);
  const yDuoi = dt ? Hc * 0.62 : Math.min(yCua - 12, Hc * 0.4), yTren = dt ? m.yDay + 40 : Math.max(8, Hc * 0.015);
  const A = tuongPx(cx - wPx * 0.05, yDuoi), B = tuongPx(cx + wPx * 0.08, yTren);
  const wM = tuongPx(cx - wPx / 2, yDuoi).distanceTo(tuongPx(cx + wPx / 2, yDuoi));
  u.uSocA.value.set(A.x, A.y, B.x, B.y);
  u.uSocB.value.set(wM, 0.085, 0.45, 0.95);
  SOC = { x: cx, y: (yDuoi + yTren) / 2 };
}
function datKhoi(m) {
  const perE = (2 * khoiDist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / Hc;
  const dr = khoi.u.uDrift.value, le = 0.045 / perE;
  const hop = [m.than, m.nhan].map((r) => [r[0] - 32, r[1] - 30, r[2] + 32, r[3] + 30]);
  let vTat = 9;
  for (let v = 0.01; v <= 0.6; v += 0.005) {
    const tg = Math.min(1, v / 0.025), x = EPX.x - (dr.x * (1 - Math.exp(-v / dr.y)) * tg * tg * (3 - 2 * tg) + dr.z * v) / perE, y = EPX.y - v / perE;
    if (hop.some((r) => x - le < r[2] && x + le > r[0] && y < r[3] && y > r[1] - 40)) { vTat = v; break; }
    if (y < 64) { vTat = v; break; }
  }
  khoi.u.uVTat.value = vTat;
}
function vungSang(x0, x1) {
  const w2 = nen.cua.geometry.parameters.width / 2, h2 = nen.cua.geometry.parameters.height / 2;
  const a = new THREE.Vector3(-w2, h2, 0).applyMatrix4(nen.cua.matrixWorld).project(camera), b = new THREE.Vector3(w2, h2, 0).applyMatrix4(nen.cua.matrixWorld).project(camera);
  const A = [(a.x * 0.5 + 0.5) * Wc, (0.5 - a.y * 0.5) * Hc], B = [(b.x * 0.5 + 0.5) * Wc, (0.5 - b.y * 0.5) * Hc];
  const yAt = (x) => A[1] + (B[1] - A[1]) * THREE.MathUtils.clamp((x - A[0]) / (B[0] - A[0]), 0, 1);
  if (x1 < Math.min(A[0], B[0]) || x0 > Math.max(A[0], B[0])) return 1e9;
  return Math.min(yAt(Math.max(x0, Math.min(A[0], B[0]))), yAt(Math.min(x1, Math.max(A[0], B[0]))));
}
function hopDau() {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; const p = new THREE.Vector3();
  for (const ten of ['Mu', 'Toc', 'GongKinh', 'TrongKinh', 'BangMu']) {
    const m = gltf.scene.getObjectByName(ten); if (!m) continue;
    const a = m.geometry.attributes.position; m.updateMatrixWorld();
    for (let i = 0; i < a.count; i += 3) { p.fromBufferAttribute(a, i).applyMatrix4(m.matrixWorld).project(camera); const x = (p.x * 0.5 + 0.5) * Wc, y = (0.5 - p.y * 0.5) * Hc; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  }
  const d = gltf.scene.getObjectByName('Dau'), hc = v3(META.headCentre);
  if (d) { const a = d.geometry.attributes.position; d.updateMatrixWorld(); for (let i = 0; i < a.count; i += 2) { p.fromBufferAttribute(a, i).applyMatrix4(d.matrixWorld); if (p.distanceTo(hc) > 0.15) continue; p.project(camera); const x = (p.x * 0.5 + 0.5) * Wc, y = (0.5 - p.y * 0.5) * Hc; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } }
  return [x0, y0, x1, y1].map(Math.round);
}
let SOC = null;
let EPX = { x: 0, y: 0 };
function emberPx() { const s = EMBER.clone().project(camera); EPX = { x: (s.x * 0.5 + 0.5) * Wc, y: (0.5 - s.y * 0.5) * Hc }; }

let tTruoc = 0;
let khoiTran = false;
function veCanh(t, mo, dich = null) {
  const st = state(t);
  setPose();
  place(st);
  const tdK = td.ve(mo.chu);
  khoi.u.uChuCo.value = mo.chu >= 0 && !khoiTran ? 1 : 0;
  khoi.u.uTD.value = tdK;
  khoi.u.uTuongTac.value = NAC < 3 ? 1 : 0;
  khoi.update(st.t);
  const dT = Math.min(0.1, Math.max(0, ((st.t - tTruoc) % LOOP + LOOP) % LOOP)); tTruoc = st.t;
  td.capNhat(dT, st.t, khoi.hang, tdK);
  shared.uRit.value = st.rit;
  shared.uSang.value = mo.sang; shared.uSangCua.value = mo.sangCua; shared.uNhen.value = mo.nhen;
  const loeI = Math.max(st.rit, mo.duoiLoe) * mo.nhen;
  shared.uEmberI.value = loeI * (1 - 0.85 * mo.sang);
  if (st.headI > 0.001 && NAC < 2) renderDepth(shHead);
  shared.uXeNguoi.value = NAC < 2 ? 1 : 0;
  khoi.u.uDuoi.value.set(NAC < 2 ? 2.6 : NAC < 3 ? 1.5 : 1.0, NAC < 2 ? 3.0 : NAC < 3 ? 1.6 : 1.0);
  if (!camTinh) {
    camDepth.copy(camera); camDepth.layers.set(1);
    scene.overrideMaterial = depthOnly;
    renderer.setRenderTarget(camRT); renderer.clear(); renderer.render(scene, camDepth);
    renderer.setRenderTarget(null); scene.overrideMaterial = null;
    camTinh = true;
  }
  renderer.setRenderTarget(dich);
  renderer.render(scene, camera);
  loe.dat(EPX.x + (window.__lechLoe || 0), EPX.y, loeI * (1 - 0.75 * mo.sang), DPR, Hc);
  if (MASK) return;
  loe.ve(renderer);
  chu.ve(mo.chu);
  chu.render(renderer);
}
const lv = new THREE.Vector3();
let lopK = -1;
function veKinh(k, dich = null) {
  if (Math.abs(k - lopK) > 0.004 || ((k === 0) !== (lopK === 0))) { lens.datLop(k); lopK = k; }
  lv.copy(base.Lfill).transformDirection(camera.matrixWorldInverse);
  lens.render(scene, camera, Wc, Hc, lv, dich);
}
let lopK2 = -1;
function veCanh2(t, s2, dich = null, coChu = true) {
  pho.capNhat(t, s2);
  const k = s2 - T2.CHU;
  td2.ve(k); chu2.ve(k);
  pho.ve(dich, NAC >= 3 ? 'tinh' : 'song');
  if (coChu) chu2.render(renderer);
}
function veKinh2(k, dich = null) {
  if (Math.abs(k - lopK2) > 0.004 || ((k === 0) !== (lopK2 === 0))) { lens2.datLop(k); lopK2 = k; }
  lens2.chiMat.uniforms.uTq.value = Math.floor(pho.datU.uT.value * 6) / 6;
  lv.copy(pho.shared.uLfill.value).transformDirection(pho.camera.matrixWorldInverse);
  lens2.render(pho.scene, pho.camera, Wc, Hc, lv, dich);
  renderer.setRenderTarget(dich);
  chu2.render(renderer);
}
function gocNan() {
  const r = new THREE.Vector3().setFromMatrixColumn(nen.cua.matrixWorld, 0).normalize();
  const a = nen.cua.position.clone().project(camera), b = nen.cua.position.clone().addScaledVector(r, 0.5).project(camera);
  const g = Math.atan2((b.y - a.y) * Hc, (b.x - a.x) * Wc);
  return Math.abs(g) > Math.PI / 2 ? g - Math.sign(g) * Math.PI : g;
}


{
  camera.aspect = window.innerWidth / window.innerHeight;
  setPose();
  const ember = v3(META.cig.end).addScaledVector(v3(META.cig.dir), 0.002);
  window.__khoi = khoi.dat(ember, camera);
  khoi.u.uNeon.value.copy(base.head).addScaledVector(base.cua.clone().sub(base.head), 3.0).addScaledVector(UP, -0.35);
  khoiDist = ember.distanceTo(camera.position);
}
if (MASK) {
  shared.uMask.value = 1; nen.tuong.material.uniforms.uMask.value = 1; nen.cua.material.uniforms.uMask.value = 1;
  khoi.mesh.visible = false; td.group.visible = false;
}
if (LOW) shared.uTaps.value = 4;
let xoaPhac6 = null;
import('./ho-so6.js').then((m) => { if (window.__daMo) return; xoaPhac6 = m.vePhacHoSo6(CHU.ban, laDt() ? 'dt' : Hc < 560 ? 'ngang' : 'may'); setTimeout(() => { if (xoaPhac6) { xoaPhac6(); xoaPhac6 = null; } }, 600); }).catch(() => {});
{ const kip = TINH ? await canh2P.then(() => true, () => false) : await Promise.race([canh2P.then(() => true, () => false), new Promise((r) => setTimeout(() => r(false), 300))]);
  if (kip) await taoPho(); }
resize(true);
renderDepth(shFill); renderDepth(shRed);
if (renderer.extensions.has('KHR_parallel_shader_compile')) await renderer.compileAsync(scene, camera).catch(() => {});
else renderer.compile(scene, camera);
tai(90);
const nhuong = (p) => { tai(p); if (document.hidden || TINH) return null; return new Promise((r) => { let x = false; const di = () => { if (!x) { x = true; setTimeout(r, 0); } }; requestAnimationFrame(di); setTimeout(di, 100); }); };
const MO_XONG = moAt(99);
{
  const kk = KHONG_KINH() ? 0 : 1;
  lens.H.x = Wc * 0.5; lens.H.y = Hc * 0.4; lens.H.on = kk;
  veCanh(8.05, moAt(0.95)); veKinh(kk);
  await nhuong(91);
  lens.H.x = Wc * 0.5; lens.H.y = Hc * 0.4; lens.H.on = kk;
  veCanh(1, MO_XONG); veKinh(kk);
  await nhuong(92);
  lens.H.on = 0; if (kk) lens.lamNong(scene, camera);
  await nhuong(93);
  for (const f of td.sdfBuoc()) f();
  chu.ve(-1); td.ve(-1);
  await nhuong(94);
  if (pho) {
    if (renderer.extensions.has('KHR_parallel_shader_compile')) {
      await renderer.compileAsync(pho.scene, pho.camera).catch(() => {}); await renderer.compileAsync(pho.mua.sc, pho.camera).catch(() => {});
      if (!KHONG_KINH()) await lens2.lamNongAsync(pho.scene, pho.camera).catch(() => {});
      await nhuong(94.5);
      lamNong2();
    } else { renderer.compile(pho.scene, pho.camera); lamNong2(); if (!KHONG_KINH()) lens2.lamNong(pho.scene, pho.camera); }
    C2 = true; await nhuong(95);
  }
  { chuyen.datDai(W, H, gocNan(), DPR); const rtW = new THREE.WebGLRenderTarget(64, 64); renderer.setRenderTarget(rtW); chuyen.manh(0.5); chuyen.tan(0.5);
    chuyen.mat([{ x: 10, y: 10 }, { x: 50, y: 12 }, { x: 48, y: 50 }, { x: 12, y: 48 }], 1, 64, 64, 1); renderer.setRenderTarget(null); rtW.dispose(); }
  td2.ve(-1); chu2.ve(-1);
  phong.lamNong();
  renderer.getContext().finish();
}
function lamNong2() {
  const rtN = chuyen.khung(W, H); veCanh2(1, 20, rtN, false); lens2.H.x = Wc * 0.5; lens2.H.y = Hc * 0.4; lens2.H.on = KHONG_KINH() ? 0 : 1; veKinh2(lens2.H.on, rtN); lens2.H.on = 0;
  renderer.setRenderTarget(null); td2.ve(-1); chu2.ve(-1);
}
const VIEC2 = [];
async function dungCanh2Muon() {
  try { await taoPho(); } catch (e) { return; }
  const kieu = () => (laDt() ? 'dt' : Hc < 560 ? 'ngang' : 'may');
  VIEC2.push(() => { pho.resize(W, H, Wc, Hc); }, () => boTri2A(kieu()), () => { VIEC2.unshift(...td2.sdfBuoc()); }, () => boTri2B(kieu()));
  await new Promise((r) => VIEC2.push(r));
  try {
    if (renderer.extensions.has('KHR_parallel_shader_compile')) {
      await renderer.compileAsync(pho.scene, pho.camera).catch(() => {}); await renderer.compileAsync(pho.mua.sc, pho.camera).catch(() => {});
      if (!KHONG_KINH()) await lens2.lamNongAsync(pho.scene, pho.camera);
    } else { renderer.compile(pho.scene, pho.camera); if (!KHONG_KINH()) lens2.lamNong(pho.scene, pho.camera); }
  } catch (e) { }
  await new Promise((r) => VIEC2.push(() => { lamNong2(); r(); }));
  C2 = true;
}
tai(96);
addEventListener('resize', () => resize());

const BUILT = 5;
let san = false;
const moXong = () => MOS.s >= MO.CHU + chu.L.het + 0.3 + MO.KINH - 0.01;
let s2Bat = null, daQua2 = false, moCuoi = null, s2Moc = 0;
const s2Now = (now) => { const S = nav.S; if (S.mode !== 'idle' && S.to === 1) return s2Moc + S.t; return s2Bat === null ? 0 : (now - s2Bat) / 1000; };
const s3Now = (now) => { const S = nav.S; if (S.mode !== 'idle' && S.to === 2) return s3Moc + S.t; return s3Bat === null ? 0 : (now - s3Bat) / 1000; };
const mqGiam3 = matchMedia('(prefers-reduced-motion: reduce)');
let moThang = -1;
const nav = makeBuoc({ n: CANH.length, start: 0, canInput: () => san, lastBuilt: () => BUILT, moveD: (a, b) => (b === 5 ? T6.D : b === 4 ? T5.D : b === 3 ? T4.D : b === 2 ? T3.D : T2.D),
  canGo: (k, laGo = false) => {
    if (k === 3 && lat && CANH_HIEN === 2 && lat.dangChay()) { lat.tua(); if (laGo) choTua4 = performance.now(); return false; }
    if (k > BUILT || !moXong()) return false;
    if (k === 1 && !C2) { choC2 = performance.now(); return false; }
    if (k === 2 && !C3) { choC3 = performance.now(); choC3Go = nav.cur() !== 1; return false; }
    if (k === 3 && !C4) { choC4 = performance.now(); choC4Go = nav.cur() !== 2; return false; }
    if (k === 4 && !C5) { choC5 = performance.now(); choC5Go = nav.cur() !== 3; return false; }
    if (k === 5 && !C6) { choC6 = performance.now(); choC6Go = nav.cur() !== 4; return false; }
    if (k === 0) { choC2 = 0; choC3 = 0; choC4 = 0; choC5 = 0; choC6 = 0; } return true; },
  huy: () => { choC2 = 0; choC3 = 0; choC4 = 0; choC5 = 0; choC6 = 0; choTua4 = 0; },
  ngoai: (cur, dir) => { if (cur !== 5 || !ban6) return false; if (F6.s === 1 || F6.s === 3) return true;
    if (F6.s === 0 && ui6 && ui6.theMo() >= 0) { ui6.dongThe(false); return true; }
    if (dir > 0) { if (F6.s === 0) moForm6(); return true; } if (F6.s === 2) { dongForm6(); return true; } return false; },
  cuChiMoi: () => { choC2 = 0; choC3 = 0; choC4 = 0; choC5 = 0; choC6 = 0; choTua4 = 0; moThang = -1; },
  khiKhoa: (k) => { if (k === 3 && lat && CANH_HIEN === 2 && lat.dangChay()) lat.tua(); },
  onStart: (from, to, kieu) => batDauChuyen(from, to, kieu), onArrive: (k) => toiCanh(k) });
const dai = makeDaiPhim(document.getElementById('dai'), { built: BUILT, onGo: (k) => { if (k !== nav.cur() || nav.moving()) SFX.su('dai'); nav.cuChi(); nav.go(k); } });
const AM = taoAmThanh({ goc: './am/' });
const SFX = taoSfx(AM, { goc: './am/sfx/', nav, tat: Q.get('sfx') === '0' }); window.__sfx = SFX;
for (const t of [td, td2, td3, td5, td6]) t.nghe.dan = SFX.dan;
for (const c of [chu, chu2, chu3, chu4, chu5, chu6]) c.nghe.go = SFX.go;
const CHON_AM = taoChonAm({ chu: CHU.am, am: AM, layCanh: () => (nav.S.mode === 'idle' ? nav.cur() : nav.S.to), layPhimDung: () => !!(lat && chay3 && !lat.dangChay()) });
window.__am = AM;
addEventListener('input', (e) => {
  if (!AM.dangBat) return;
  const t = e.target; if (!t || !t.closest || !t.closest('.c6-form') || !/^(INPUT|TEXTAREA)$/.test(t.tagName) || t.type === 'radio') return;
  const k = e.inputType || '';
  if (k === 'insertLineBreak' || k === 'insertParagraph') AM.su('dong'); else if (e.data === ' ') AM.su('cach'); else AM.su('phim');
}, true);
const AMW = { rit0: false, ritK: 0, roi: true, latChay: false, daDung: true, khung: -1, con4: 1e9, keo: 1e9 };
function ngheAm(now) {
  if (!AM.dangBat) return;
  const SN = nav.S, idle = SN.mode === 'idle';
  SFX.khung({ canh: CANH_HIEN, idle, t4: CANH_HIEN === 3 && idle && ngo4 ? t4Song() : -1, cham: mqGiam3.matches ? 0.25 : 1 });
  if (!AMW.rit0 && MOS.s >= 0.33 && MOS.s < 1.5) { AMW.rit0 = true; AM.su('rit', { dinh: Math.max(0.1, (0.95 - MOS.s) / Math.max(1, MOS.toc)) }); }
  if (CANH_HIEN === 0 && idle && MOS.s > 3) {
    const tC = (now - tMo) / 1000 + MO.LECH, k = Math.floor((tC - 7.43) / 10);
    if (k > AMW.ritK) { AMW.ritK = k; const dinh = 8.05 + 10 * k - tC; if (dinh > 0.4) AM.su('rit', { dinh, nho: true }); }
  }
  if (!AMW.roi && pho && (CANH_HIEN === 1 || (!idle && SN.to === 1)) && s2Now(now) >= pho.ROI.t0 + pho.ROI.T - 0.3) { AMW.roi = true; AM.su('roi'); }
  if (lat && (CANH_HIEN === 2 || (!idle && SN.to === 2))) {
    const ch = lat.CH;
    if (ch.chay && !AMW.latChay) { AMW.latChay = true; AMW.khung = Math.floor(ch.s); AM.su('chay'); }
    if (AMW.latChay) { const f = Math.floor(ch.s); if (f > AMW.khung && f < KHUNG) AM.su('khung'); AMW.khung = Math.max(AMW.khung, f); }
    if (chay3 && !AMW.daDung && !lat.dangChay()) { AMW.daDung = true; AMW.latChay = false; AM.su('dung'); }
  }
  if (conChiTiet4 && CANH_HIEN === 3 && idle && !mqGiam3.matches) {
    const t4 = t4Song();
    for (const c of conChiTiet4(t4 - 0.02, t4 + 1)) if (c.t > AMW.con4) { AMW.con4 = c.t; AM.su('chap', { tre: Math.max(0, c.t - t4), nhip: c.nhip.map(([o, sau]) => [o, sau / 0.19]) }); }
  }
  if (CANH_HIEN === 4 && idle) {
    const t5 = t5Song(), j = Math.floor((t5 + 0.6 - 1.25) / 5);
    if (j > AMW.keo) { AMW.keo = j; const tre = 1.25 + 5 * j - t5; if (tre >= 0 && Math.random() < 0.67) AM.su('keo', { tre }); }
  }
}
const loaCanh = (() => { const e = document.createElement('p'); e.className = 'an'; e.setAttribute('aria-live', 'polite'); document.body.appendChild(e); return e; })();


function chupKhung(canh, now) {
  const rt = chuyen.khung(W, H);
  const t = (now - tMo) / 1000 + MO.LECH;
  if (canh === 5) { veCanh6(s6Now(now), rt, false); if (F6.s === 0) veKinh6(lens6.H.on > 0.003 ? lens6.H.on : 0, rt); }
  else if (canh === 4) { veCanh5(s5Now(now), rt, false); veKinh5(lens5.H.on > 0.003 ? lens5.H.on : 0, rt); }
  else if (canh === 3) { veCanh4(s4Now(now), rt, false); veKinh4(lens4.H.on > 0.003 ? lens4.H.on : 0, rt); }
  else if (canh === 2) { veCanh3(s3Now(now), rt, false); veKinh3(lens3.H.on > 0.003 ? lens3.H.on : 0, rt); if (vaoDay3) matMo((s3Now(now) - T3.D) / T3.MO, rt); }
  else if (canh === 1) { veCanh2(t, s2Now(now), rt, false); veKinh2(lens2.H.on > 0.003 ? lens2.H.on : 0, rt); }
  else { veCanh(t, moCuoi || moAt(99, chu.L.het), rt); veKinh(lens.H.on > 0.003 ? lens.H.on : 0, rt); }
  renderer.setRenderTarget(null);
}
function batDauChuyen(from, to, kieu) {
  const now = performance.now();
  AM.canh(to);
  SFX.chuyen(from, to, kieu, !!(CHO.t0 && CHO.a > 0));
  if (CHO3.t0) { CHO3.t0 = 0; if (!(to === 2 && kieu === 'move')) traMay2(); }
  let tan4 = 0;
  if (CHO4.t0) { tan4 = CHO4.tan; CHO4.t0 = 0; CHO4.tc = 0; CHO4.tan = 0; if (!(to === 3 && kieu === 'move')) veMay3Goc(); }
  chupKhung(from, now);
  if (from === 4 && to === 5 && kieu === 'move') chupTran5(now);
  if (CHOP_B2 && from === 0 && to === 1 && kieu === 'move') chupTran1((now - tMo) / 1000 + MO.LECH, moCuoi || moAt(99, chu.L.het));
  chuyen.datDai(W, H, gocNan(), DPR);
  chuyen.datLanMin(to === 1 && CHO.t0 && CHO.a > 0 ? CHO.r : 0); CHO.t0 = 0; CHO.a = 0;
  if (to === 1) {
    dai.goiY(false);
    s2Moc = daQua2 ? 60 : (kieu === 'fade' ? T2.D - 0.7 : 0);
    s2Bat = now - s2Moc * 1000;
    daQua2 = true;
    AMW.roi = s2Moc >= 60;
  }
  if (to === 2) {
    s3Moc = 0; s3Bat = now; chay3 = false; tDung3 = -1; tTD3 = daQua3 ? -99 : -1;
    AMW.latChay = false; AMW.daDung = false; AMW.khung = -1;
    tChay3 = kieu === 'move' ? T3.CHAY : T3.CHAY_TAN;
    if (lat) lat.cho();
    if (to === 2 && from === 1 && kieu === 'move') datDay(); else DAY = null;
    vaoDay3 = from === 1 && kieu === 'move';
    if (lat && mqGiam3.matches) { lat.dungNgay(); chay3 = true; }
    if (pho && lat) pho.datAnhPhim(lat.anhKhung(KHUNG));
    daQua3 = true;
  }
  if (to === 3) {
    s4Moc = 0; s4Bat = now; tTD4 = daQua4 ? -99 : -1; daQua4 = true;
    AMW.con4 = t4Song();
    if (from === 2 && kieu === 'move') { datDay4(); if (DAY4) DAY4.tan0 = tan4; } else DAY4 = null;
    den4 = false;
  }
  if (to === 4) {
    s5Moc = 0; s5Bat = now; tTD5 = daQua5 ? -99 : -1; daQua5 = true;
    AMW.keo = Math.floor((t5Song() + 0.6 - 1.25) / 5);
    if (from === 3 && kieu === 'move') datDay5(); else DAY5 = null;
    khung5 = false;
  }
  if (to === 5) {
    s6Moc = 0; s6Bat = now; tTD6 = daQua6 ? -99 : -1; daQua6 = true;
    truot6 = kieu === 'move' && tTD6 === -99; hienLai6 = -1;
    F6.s = 0; if (ban6 && BC6) ban6.datMay(BC6.may, W, H);
    THU.k = 0; if (ban6) ban6.datThu(0, null, null);
  }
  if (from === 5) roiCanh6();
  kinhHien = 0; tKinh0 = -1; lensPos.khoi = false; kinhTay = null;
}
function toiCanh(k) {
  CANH_HIEN = k;
  nhipOK = 0; mau = [];
  if (k === 1) { dai.moKhoa(1); dai.goiY(false); s2Bat = performance.now() - (s2Moc + nav.S.D) * 1000; }
  else if (k === 2) { dai.moKhoa(2); dai.goiY(false); s3Bat = performance.now() - (s3Moc + nav.S.D) * 1000; traMay2(); }
  else if (k === 3) { dai.moKhoa(3); dai.goiY(false); s4Bat = performance.now() - (s4Moc + nav.S.D) * 1000; traMay3(); DAY4 = null; traMay4(); DAY5 = null; if (tTD4 === -1) tTD4 = s4Now(performance.now()) + T4.CHU; }
  else if (k === 4) { dai.moKhoa(4); dai.goiY(false); s5Bat = performance.now() - (s5Moc + nav.S.D) * 1000; traMay4(); DAY5 = null; if (tTD5 === -1) tTD5 = s5Now(performance.now()) + T5.CHU; }
  else if (k === 5) { if (truot6) { hienLai6 = performance.now(); truot6 = false; } dai.moKhoa(5); dai.goiY(false); dai.lap(true); s6Bat = performance.now() - (s6Moc + nav.S.D) * 1000; if (tTD6 === -1) tTD6 = s6Now(performance.now()) + T6.CHU; }
  else if (goiYHien && !daQua2) dai.goiY(true);
  const nguon = k === 5 ? CHU.ban : k === 4 ? CHU.ham : k === 3 ? CHU.ngo : k === 2 ? CHU.lat : k === 1 ? CHU.pho : CHU.studio;
  const set = (id, t) => { const e = document.getElementById(id); if (e) e.textContent = t; };
  set('tieu-de', nguon.tieuDe); set('nhan-studio', nguon.nhan || '');
  { const e = document.getElementById('nhan-studio'); if (e) e.hidden = !nguon.nhan; }
  if (loaCanh && CANH[k] && CANH[k].doc) loaCanh.textContent = CANH[k].doc;
  { const ul = document.getElementById('gioi-thieu');
    const ds = nguon.kieuThan === 'dong' || nguon.kieuThan === 'doan' ? [nguon.than.map(thanChu).join(' ')] : nguon.than.map(thanChu);
    if (ul) ul.replaceChildren(...ds.map((t) => { const li = document.createElement('li'); li.textContent = t; return li; })); }
}
const ssm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const kinh2 = (s2) => { const a = Math.max(T2.CHU + chu2.L.het + 0.3, pho.ROI.t0 + pho.ROI.T + 1.2); return ssm(a, a + MO.KINH, s2); };
const MOS = { s: 0, toc: 1, tocDich: 1 };
const tuaNhanh = () => { if (MOS.s < MO.CHU + chu.L.het + 0.3 + MO.KINH) MOS.tocDich = 8; };
for (const ev of ['wheel', 'keydown', 'pointerdown', 'touchstart']) addEventListener(ev, tuaNhanh, { passive: true, capture: true });

let troCuoi = null, troAn = false, kinhTay = null;
const lensPos = { x: 0, y: 0, khoi: false };
let khuay = 0, troT = 0;
addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse') return;
  const now = performance.now();
  if (troCuoi && troT) khuay = Math.max(khuay, Math.min(1, Math.hypot(e.clientX - troCuoi.x, e.clientY - troCuoi.y) / Math.max(8, now - troT) / 1.2));
  troCuoi = { x: e.clientX, y: e.clientY }; troT = now;
});
document.addEventListener('pointerleave', () => { troCuoi = null; });
addEventListener('blur', () => { troCuoi = null; });
let tc = null;
const cv = renderer.domElement;
let tc6 = null;
const cuonTu6 = (t, dir) => {
  for (let el = t; el && el.nodeType === 1 && el.id !== 'c6'; el = el.parentElement) {
    const cs = getComputedStyle(el);
    if (/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 4 && (dir < 0 ? el.scrollTop > 4 : el.scrollTop + el.clientHeight < el.scrollHeight - 4)) return true;
  }
  return false;
};
addEventListener('touchstart', (e) => {
  const t = e.target;
  if (e.touches.length !== 1 || !t || !t.closest || !t.closest('#c6')) { tc6 = null; return; }
  const p = e.touches[0]; tc6 = { x0: p.clientX, y0: p.clientY, t0: performance.now(), len: cuonTu6(t, -1), xuong: cuonTu6(t, 1) };
}, { passive: true });
addEventListener('touchend', (e) => {
  if (!tc6) return; const c = tc6; tc6 = null;
  const p = e.changedTouches[0], dy = c.y0 - p.clientY, dx = c.x0 - p.clientX;
  if (Math.abs(dy) > 40 && Math.abs(dy) > Math.abs(dx) * 1.2 && performance.now() - c.t0 < 1200) { const dir = dy > 0 ? 1 : -1; if (dir > 0 ? c.xuong : c.len) return; nav.cuChi(); nav.step(dir); }
}, { passive: true });
cv.addEventListener('touchstart', (e) => {
  if (e.touches.length !== 1) { tc = null; return; }
  const p = e.touches[0];
  tc = { x0: p.clientX, y0: p.clientY, t0: performance.now(), lensMode: false, swipe: false, daXong: moXong() };
  if (!KHONG_KINH()) tc.timer = setTimeout(() => { if (tc && !tc.swipe) { tc.lensMode = true; kinhTay = kepKinh({ x: tc.x0, y: tc.y0 - lens.H.R * 1.05 }); } }, 200);
}, { passive: true });
cv.addEventListener('touchmove', (e) => {
  if (!tc) return;
  const p = e.touches[0];
  if (e.cancelable) e.preventDefault();
  if (tc.lensMode) {
    const moi = kepKinh({ x: p.clientX, y: p.clientY - lens.H.R * 1.05 }), now = performance.now();
    if (kinhTay && tc.tKeo) khuay = Math.max(khuay, Math.min(1, Math.hypot(moi.x - kinhTay.x, moi.y - kinhTay.y) / Math.max(8, now - tc.tKeo) / 1.2));
    tc.tKeo = now; kinhTay = moi; return;
  }
  if (Math.hypot(p.clientX - tc.x0, p.clientY - tc.y0) > 12) { tc.swipe = true; clearTimeout(tc.timer); }
}, { passive: false });
cv.addEventListener('touchend', (e) => {
  if (!tc) return;
  clearTimeout(tc.timer);
  const p = e.changedTouches[0];
  if (!tc.lensMode) {
    const dy = tc.y0 - p.clientY, dx = tc.x0 - p.clientX;
    if (Math.abs(dy) > 40 && Math.abs(dy) > Math.abs(dx) * 1.2 && performance.now() - tc.t0 < 1200) { nav.cuChi(); if (tc.daXong) nav.step(dy > 0 ? 1 : -1); }
  }
  tc = null;
}, { passive: true });
function kepKinh(p) {
  const R = (CANH_HIEN === 5 ? lens6 : CANH_HIEN === 4 ? lens5 : CANH_HIEN === 3 ? lens4 : CANH_HIEN === 2 ? lens3 : CANH_HIEN === 1 ? lens2 : lens).H.R + 12;
  const day = CANH_HIEN === 5 && BC6 && BC6.kieu === 'dt' && BC6.daiTren ? Hc - BC6.daiTren + 4 : daiH();
  return { x: THREE.MathUtils.clamp(p.x, R, Wc - R), y: THREE.MathUtils.clamp(p.y, R, Hc - day - R) };
}
let kinhHien = 0, tKinh0 = -1, troTruoc = false, vaoLai = null;
function dichKinh(dt, kMo, now) {
  const ln = CANH_HIEN === 5 ? lens6 : CANH_HIEN === 4 ? lens5 : CANH_HIEN === 3 ? lens4 : CANH_HIEN === 2 ? lens3 : CANH_HIEN === 1 ? lens2 : lens, L0 = CANH_HIEN === 5 ? LENS6_0 : CANH_HIEN === 4 ? LENS5_0 : CANH_HIEN === 3 ? LENS4_0 : CANH_HIEN === 2 ? LENS3_0 : CANH_HIEN === 1 ? LENS2_0 : LENS0;
  if (KHONG_KINH()) kMo = 0;
  kinhHien = kMo <= 0 ? 0 : Math.min(kMo, kinhHien + dt / 0.3);
  if (kinhHien >= 0.9 && tKinh0 < 0) tKinh0 = now;
  const tro = troCuoi && troCuoi.y < Hc - daiH() ? troCuoi : null;
  const tuKhiHien = tKinh0 < 0 ? 0 : (now - tKinh0) / 1000;
  const giuMoi = tro && tuKhiHien < 1.8;
  if (!lensPos.khoi) { const d0 = kepKinh(L0); lensPos.x = d0.x; lensPos.y = d0.y; lensPos.khoi = true; }
  if (giuMoi) {
    const a = kepKinh(L0), b = kepKinh(tro), k = inOut3(Math.min(1, Math.max(0, (tuKhiHien - 1.2) / 0.6)));
    lensPos.x = a.x + (b.x - a.x) * k; lensPos.y = a.y + (b.y - a.y) * k;
  } else {
    const dich = kepKinh(tro || kinhTay || L0);
    if (tro && !troTruoc) vaoLai = { t: now, x: lensPos.x, y: lensPos.y };
    const kv = vaoLai ? (now - vaoLai.t) / 350 : 1;
    if (tro && kv < 1) { const k = inOut3(Math.max(0, kv)); lensPos.x = vaoLai.x + (dich.x - vaoLai.x) * k; lensPos.y = vaoLai.y + (dich.y - vaoLai.y) * k; }
    else if (tro || (kinhTay && tc && tc.lensMode)) { lensPos.x = dich.x; lensPos.y = dich.y; }
    else { const a = Math.min(1, dt * 6); lensPos.x += (dich.x - lensPos.x) * a; lensPos.y += (dich.y - lensPos.y) * a; }
  }
  troTruoc = !!tro;
  ln.H.x = lensPos.x; ln.H.y = lensPos.y;
  ln.H.on = kinhHien * mDung;
  return kinhHien * mDung;
}

const t0 = performance.now();
let last = t0, nFrames = 0, mau = [];
function haNac(manh = false) {
  if (CANH_HIEN === 1 && NAC < 3) {
    NAC = manh ? Math.max(2, Math.min(3, NAC + 2)) : NAC + 1;
    LOW = true; shared.uTaps.value = 4;
    const nac = NAC;
    VIEC2.push(() => { if (pho) pho.datNac(nac, 'refl'); }, () => { if (pho) pho.datNac(nac, 'bong'); });
    return true;
  }
  if (NAC >= 3 && DPR > SCR * 0.55 * 1.01) DPR = Math.max(SCR * 0.55, Math.min(DPR * 0.8, SAN_DPR));
  else if (manh && (DPR > SAN_DPR * 1.01 || NAC < 2)) { DPR = Math.min(DPR, SAN_DPR); NAC = Math.max(NAC, 2); }
  else if (DPR > SAN_DPR * 1.01) DPR = Math.max(SAN_DPR, DPR * 0.8);
  else if (NAC < 2) NAC = 2;
  else if (NAC < 3) { NAC = 3; DPR = Math.min(DPR, SCR * 0.55); }
  else return false;
  if (NAC === 0) NAC = 1;
  LOW = true; shared.uTaps.value = 4;
  resize(true, true);
  const nac = NAC;
  VIEC2.push(() => { if (pho) pho.datNac(nac, 'refl'); }, () => { if (pho) pho.datNac(nac, 'bong'); }, () => { renderDepth(shFill); renderDepth(shRed); });
  return true;
}
const glc = renderer.getContext();
const tq = Q.has('notq') ? null : glc.getExtension('EXT_disjoint_timer_query_webgl2');
let qDang = null; const qCho = []; let gpuMau = []; const cpuMau = [];
let nhipOK = 0, nhipOKt = 0; let doDB = 0; const dbMau = []; const pxDB = new Uint8Array(4);
const datNhipOK = (m) => { if (MOS.s >= 2.4) { nhipOK = m; nhipOKt = performance.now(); } };
const trungVi = (a) => { const b = a.slice().sort((x, y) => x - y); return b[b.length >> 1]; };
function batDauDo() { if (tq && !qDang && qCho.length < 4) { qDang = glc.createQuery(); glc.beginQuery(tq.TIME_ELAPSED_EXT, qDang); } }
function ketThucDo(tBat) {
  if (qDang) { glc.endQuery(tq.TIME_ELAPSED_EXT); qCho.push(qDang); qDang = null; }
  while (qCho.length && glc.getQueryParameter(qCho[0], glc.QUERY_RESULT_AVAILABLE)) {
    const q = qCho.shift();
    if (!glc.getParameter(tq.GPU_DISJOINT_EXT)) { gpuMau.push(glc.getQueryParameter(q, glc.QUERY_RESULT) / 1e6); if (gpuMau.length > 60) gpuMau.shift(); }
    glc.deleteQuery(q);
  }
  if (doDB > 0) { glc.readPixels(0, 0, 1, 1, glc.RGBA, glc.UNSIGNED_BYTE, pxDB); dbMau.push(performance.now() - tBat); doDB--; }
}
function xetNac(khoang) {
  if (nFrames <= 5) return;
  mau.push(khoang);
  if (doDB === 0 && dbMau.length >= 3) {
    const gia = trungVi(dbMau); dbMau.length = 0;
    const m = trungVi(mau); mau = [];
    if (gia > 0.55 * m) haNac(m > 33.4); else datNhipOK(m);
    return;
  }
  if (doDB > 0) return;
  let tong = 0; for (const x of mau) tong += x;
  if (mau.length < 8 || (tong < 600 && mau.length < 40)) return;
  const m = trungVi(mau);
  if (nhipOK && performance.now() - nhipOKt > 5000) nhipOK = 0;
  const cham = m > 22 && (nhipOK === 0 || m > nhipOK * 1.25);
  if (!cham) { mau = []; return; }
  if (tq && gpuMau.length >= 4) { const gia = Math.max(trungVi(gpuMau.slice(-12)), trungVi(cpuMau.slice(-12))); mau = []; if (gia > 0.55 * m) { haNac(m > 33.4); gpuMau = []; } else datNhipOK(m); return; }
  doDB = 3; dbMau.length = 0;
}
const GANH = +(Q.get('ganh') || 0); let ganhRT = null;
function ganhGia() {
  if (!ganhRT || ganhRT.width !== W) { ganhRT && ganhRT.dispose(); ganhRT = new THREE.WebGLRenderTarget(W, H); }
  renderer.setRenderTarget(ganhRT);
  for (let i = 0, n = Math.max(1, Math.round(GANH * DPR * DPR)); i < n; i++) renderer.render(scene, camera);
  renderer.setRenderTarget(null);
}
let hieuHien = false, goiYHien = false, logoMo = 1;
const logoHat = (() => {
  let cvL = null, g = null, goc = null, nguong = null, xong = false;
  function dung() {
    const im = hieu && hieu.querySelector('img'); if (!im || !im.complete || !im.clientWidth) return false;
    const d = Math.min(window.devicePixelRatio || 1, 2), w = Math.round(im.clientWidth * d), h = Math.round(im.clientHeight * d);
    cvL = document.createElement('canvas'); cvL.width = w; cvL.height = h; cvL.className = 'hieu-hat';
    cvL.style.width = im.clientWidth + 'px'; cvL.style.height = im.clientHeight + 'px';
    g = cvL.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0, w, h);
    goc = g.getImageData(0, 0, w, h);
    nguong = new Float32Array(w * h); const o = Math.max(1, Math.round(2 * d));
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const cx = Math.floor(x / o), cy = Math.floor(y / o); let a = (cx * 374761393 + cy * 668265263) >>> 0; a = Math.imul(a ^ (a >>> 13), 1274126177) >>> 0; nguong[y * w + x] = (a & 0xffff) / 65536; }
    hieu.appendChild(cvL); im.style.visibility = 'hidden';
    return true;
  }
  return function (p) {
    if (xong) return;
    if (!cvL && !dung()) { if (p >= 1 && hieu) hieu.querySelector('img').style.visibility = ''; return; }
    const out = g.createImageData(goc.width, goc.height), a = goc.data, b = out.data;
    for (let i = 0, n = nguong.length; i < n; i++) { if (nguong[i] < p) { const k = i * 4; b[k] = a[k]; b[k + 1] = a[k + 1]; b[k + 2] = a[k + 2]; b[k + 3] = a[k + 3]; } }
    g.putImageData(out, 0, 0);
    if (p >= 1) { xong = true; hieu.querySelector('img').style.visibility = ''; cvL.remove(); }
  };
})();
let logoT0 = -1;
let tMo = 0;
function loop(now) {
  const khoang = now - last;
  const dt = Math.min(0.05, khoang / 1000); last = now; nFrames++;
  const tBat = performance.now();
  batDauDo();
  if (BUOC_BT.length) { const a = performance.now(); BUOC_BT.shift()(); BT_LOG.push(+(performance.now() - a).toFixed(1)); if (!BUOC_BT.length) { dangDung = false; if (!kinhTay) lensPos.khoi = false; } }
  else if (VIEC2.length && nav.S.mode === 'idle' && (khoang < 26 || viecHoan >= (choC3 ? 1 : 3))) {
    const f = VIEC2[0], gia = (f.ten && VIEC_GIA[f.ten.replace(/\d+$/, '')]) || 2, cpuTruoc = cpuMau.length ? cpuMau[cpuMau.length - 1] : 0;
    if (cpuTruoc + gia > 13 && viecHoan < 4) viecHoan++;
    else { viecHoan = 0; VIEC2.shift(); const a = performance.now(); f(); const ms = +(performance.now() - a).toFixed(1); BT_LOG.push(ms); if (f.ten) { VIEC_LOG.push([f.ten, ms, Math.round(a)]); const k = f.ten.replace(/\d+$/, ''); VIEC_GIA[k] = VIEC_GIA[k] ? VIEC_GIA[k] * 0.6 + ms * 0.4 : ms; } }
  }
  if (C2 && !dang3 && san && MOS.s >= MO.CHU + chu.L.het + 1) dungCanh3();
  if (C3 && !dang4 && san) dungCanh4();
  if (C4 && !dang5 && san) dungCanh5();
  if (C5 && !dang6 && san) dungCanh6();
  if (dang5 && san && !anh6P) taiAnh6().catch(() => {});
  if (dang4 && san && !ham5P) taiHam5().catch(() => {});
  if (VIEC2.length && nav.S.mode === 'idle' && khoang >= 26) viecHoan++;
  if (choC3 && C3) { const doi = performance.now() - choC3, go = choC3Go; choC3 = 0;
    if (nav.S.mode === 'idle') { if (!go && nav.cur() === 1) nav.step(1); else if (go && doi < 15000) nav.go(2); } }
  if (choC3 && (choC3Go || nav.cur() !== 1) && performance.now() - choC3 > 15000) choC3 = 0;
  if (choC4 && C4) { const doi = performance.now() - choC4, go = choC4Go; choC4 = 0;
    if (nav.S.mode === 'idle') { if (!go && nav.cur() === 2) nav.step(1); else if (go && doi < 15000) nav.go(3); } }
  if (choC4 && (choC4Go || nav.cur() !== 2) && performance.now() - choC4 > 15000) choC4 = 0;
  if (choC5 && C5) { const doi = performance.now() - choC5, go = choC5Go; choC5 = 0;
    if (nav.S.mode === 'idle') { if (!go && nav.cur() === 3) nav.step(1); else if (go && doi < 15000) nav.go(4); } }
  if (choC5 && (choC5Go || nav.cur() !== 3) && performance.now() - choC5 > 15000) choC5 = 0;
  if (choC6 && C6) { const doi = performance.now() - choC6, go = choC6Go; choC6 = 0;
    if (nav.S.mode === 'idle') { if (!go && nav.cur() === 4) nav.step(1); else if (go && doi < 15000) nav.go(5); } }
  if (choC6 && (choC6Go || nav.cur() !== 4) && performance.now() - choC6 > 15000) choC6 = 0;
  if (choTua4 && (nav.cur() !== 2 || performance.now() - choTua4 > 6000)) choTua4 = 0;
  if (choTua4 && lat && !lat.dangChay() && nav.S.mode === 'idle' && nav.cur() === 2) { choTua4 = 0; nav.go(3); }
  if (choC2 && C2) { const doi = performance.now() - choC2; choC2 = 0; if (doi < 15000 && nav.S.mode === 'idle' && nav.cur() === 0) nav.step(1); }
  if (choC2 && performance.now() - choC2 > 15000) choC2 = 0;
  mDung += ((dangDung ? 0 : 1) - mDung) * Math.min(1, dt * (dangDung ? 20 : 8));
  chu.datA(0.35 + 0.65 * mDung);
  MOS.toc += (MOS.tocDich - MOS.toc) * Math.min(1, dt * 12);
  if (san && MOS.s < MO.CHU + chu.L.het + 3) MOS.s += dt * MOS.toc;
  const mo = moAt(MOS.s, chu.L.het);
  nav.update(nav.S.mode === 'move' && nav.S.to === 5 && (PHAN_MEM || NAC >= 3) ? Math.min(0.15, khoang / 1000) : dt);
  if (Math.abs(POSE.nangDich - POSE.nang) > 1e-5) { const p = Math.min(1, (performance.now() - POSE.tNang) / 350); POSE.nang = POSE.nangTu + (POSE.nangDich - POSE.nangTu) * inOut3(p); setPose(); emberPx(); }
  if (GANH) ganhGia();
  moCuoi = mo;
  const tCanh = (now - tMo) / 1000 + MO.LECH, SN = nav.S;
  let kH = 0, khungSo = 1 + (CANH[0].dung - 1) * mo.phim;
  chu2.datA(0.35 + 0.65 * mDung);
  chu3.datA(0.35 + 0.65 * mDung);
  chu4.datA(0.35 + 0.65 * mDung);
  chu5.datA(0.35 + 0.65 * mDung);
  chu6.datA(0.35 + 0.65 * mDung);
  dt6 = dt;
  if (lat && (CANH_HIEN === 2 || (SN.mode !== 'idle' && SN.to === 2))) {
    const s3 = s3Now(now);
    if (!chay3 && s3 >= tChay3) { chay3 = true; if (mqGiam3.matches) lat.dungNgay(); else lat.batDau(s3 - tChay3); }
    lat.capNhat(dt);
    if (tTD3 === -1 && chay3 && (!lat.dangChay() || lat.CH.t >= 1.05)) tTD3 = s3;
    if (tDung3 < 0 && chay3 && !lat.dangChay()) tDung3 = s3;
  }
  const man = MAN();
  if (SN.mode === 'move' && SN.to === 5) {
    const k = Math.min(1, SN.t / SN.D);
    veChuyen56(k, man, now);
    lens.H.on = 0; lens2.H.on = 0; lens3.H.on = 0; lens4.H.on = 0; lens5.H.on = 0; lens6.H.on = 0;
    khungSo = CANH[4].dung + (CANH[5].dung - CANH[4].dung) * inOut3(k);
  } else if (SN.mode === 'move' && SN.to === 4) {
    const k = Math.min(1, SN.t / SN.D);
    veChuyen45(k, man, now);
    lens.H.on = 0; lens2.H.on = 0; lens3.H.on = 0; lens4.H.on = 0; lens5.H.on = 0;
    khungSo = CANH[3].dung + (CANH[4].dung - CANH[3].dung) * inOut3(k);
  } else if (SN.mode === 'move' && SN.to === 3) {
    const k = Math.min(1, SN.t / SN.D);
    veChuyen34(k, man, now);
    lens.H.on = 0; lens2.H.on = 0; lens3.H.on = 0; lens4.H.on = 0; lens5.H.on = 0;
    khungSo = CANH[2].dung + (CANH[3].dung - CANH[2].dung) * inOut3(k);
  } else if (SN.mode === 'move' && SN.to === 2) {
    const k = Math.min(1, SN.t / SN.D);
    const p = viTriDay(k); if (p) pho.dayMay(p);
    chu2.datA(Math.max(0, 1 - k / 0.25) * (0.35 + 0.65 * mDung));
    td2.U.uTan.value = ssm(TD2_TAN[0], TD2_TAN[1], k);
    pho.datSangPhim(1 - (1 - LAT.DEN_TOI) * ssm(0.8, 1.0, k));
    veCanh2(tCanh, s2Now(now), man);
    pho.datSangPhim(1);
    td2.U.uTan.value = 0;
    matDong(k, man);
    lens.H.on = 0; lens2.H.on = 0; lens3.H.on = 0;
    khungSo = CANH[1].dung + (CANH[2].dung - CANH[1].dung) * inOut3(k);
  } else if (SN.mode === 'move' && SN.to === 1) {
    const k = Math.min(1, SN.t / SN.D);
    veCanh2(tCanh, s2Now(now), man);
    if (CHOP_B2) chuyen.manh(k, 0, 0, 0, 1, ssm(B2_TAN[0], B2_TAN[1], k)); else chuyen.manh(k, NHOE12.n, NHOE12.mau, NHOE12.tu, NHOE12.du);
    lens.H.on = 0; lens2.H.on = 0;
    khungSo = CANH[0].dung + (CANH[1].dung - CANH[0].dung) * inOut3(k);
  } else if (SN.mode === 'fade') {
    const k = Math.min(1, SN.t / SN.D);
    const tdMoi = SN.to === 5 ? td6 : SN.to === 4 ? td5 : SN.to === 3 ? null : SN.to === 2 ? td3 : SN.to === 1 ? td2 : td;
    if (tdMoi) tdMoi.U.uTan.value = 1 - ssm(0.5, 1.0, k);
    if (SN.to === 5) veCanh6(s6Now(now), man); else if (SN.to === 4) veCanh5(s5Now(now), man); else if (SN.to === 3) veCanh4(s4Now(now), man); else if (SN.to === 2) veCanh3(s3Now(now), man); else if (SN.to === 1) veCanh2(tCanh, s2Now(now), man); else veCanh(tCanh, mo, man);
    if (tdMoi) tdMoi.U.uTan.value = 0;
    renderer.setRenderTarget(man);
    chuyen.tan(k);
    lens.H.on = 0; lens2.H.on = 0; lens3.H.on = 0; lens4.H.on = 0; lens5.H.on = 0; lens6.H.on = 0;
    khungSo = CANH[SN.to].dung;
  } else if (nav.cur() === 5) {
    const s6 = s6Now(now);
    { const uF = F6.s === 1 ? Math.min(1, (now - F6.t0) / (T6.FORM * 1000)) : 0;
      capNhatThu6(dt, F6.s === 1 ? (uF >= 0.5 ? 1 : 0) : F6.s === 2 ? 1 : (F6.s === 0 && ui6 && ui6.theMo() >= 0) ? 1 : 0); }
    if (F6.s === 1) {
      const u = Math.min(1, (now - F6.t0) / (T6.FORM * 1000));
      veLuot6(u, s6, man, 0.35 + 0.65 * mDung);
      kH = dichKinh(dt, 0, now);
      if (u >= 1) { F6.s = 2; hienForm6(); }
    } else if (F6.s === 2) {
      td6.U.uTan.value = 1; chu6.datA(0);
      veCanh6(s6, man, false);
      td6.U.uTan.value = 0;
      kH = dichKinh(dt, 0, now);
    } else if (F6.s === 3) {
      const u = Math.min(1, (now - F6.t0) / (T6.DONG * 1000));
      veCanh6(s6, man, false);
      renderer.setRenderTarget(man); chu6.render(renderer);
      chuyen.tan(u);
      kH = dichKinh(dt, 0, now);
      if (u >= 1) F6.s = 0;
    } else {
      const vl = hienLai6 > 0 ? ssm(0, 0.4, (now - hienLai6) / 1000) : 1; if (vl >= 1) hienLai6 = -1;
      td6.U.uTan.value = 1 - vl;
      veCanh6(s6, man, false);
      td6.U.uTan.value = 0;
      if (vl < 1) chu6.datA(vl * (0.35 + 0.65 * mDung));
      kinhLui6 = Math.max(0, Math.min(1, kinhLui6 + (ui6 && ui6.dangChi() ? 1 : -1) * dt / 0.2));
      kH = dichKinh(dt, kinh6(s6) * (1 - kinhLui6) * (1 - THU.k), now);
      veKinh6(kH, man);
    }
    khungSo = CANH[5].dung;
  } else if (nav.cur() === 4) {
    const s5 = s5Now(now);
    veCanh5(s5, man, false);
    kH = dichKinh(dt, kinh5(s5), now);
    veKinh5(kH, man);
    khungSo = CANH[4].dung;
  } else if (nav.cur() === 3) {
    const s4 = s4Now(now);
    veCanh4(s4, man, false);
    kH = dichKinh(dt, kinh4(s4), now);
    veKinh4(kH, man);
    khungSo = CANH[3].dung;
  } else if (nav.cur() === 2) {
    const s3 = s3Now(now);
    if (choC4 && !C4 && !choC4Go && lat && lat.BC && !lat.dangChay() && !mqGiam3.matches) {
      if (!CHO4.t0) CHO4.t0 = now;
      if (!CHO4.tc || CHO4.D !== lat.BC.D) {
        veMay3Goc(); datDay4(); CHO4.tc = Math.max(now, CHO4.t0 + 350); CHO4.D = lat.BC.D;
        if (DAY4) { CHO4.c0 = DAY4.c0.clone(); CHO4.dir = DAY4.dir.clone(); CHO4.d = DAY4.t0; } else CHO4.d = 0;
        DAY4 = null;
      }
      CHO4.tan = ssm(0, 0.35, (now - CHO4.t0) / 1000);
      if (CHO4.d > 0) {
        const u = Math.max(0, Math.min(1, (now - CHO4.tc) / 1400)), e = 1 - Math.pow(1 - u, 3);
        lat.camera.position.copy(CHO4.c0).addScaledVector(CHO4.dir, CHO4.d * 0.06 * e); lat.camera.updateMatrixWorld();
      }
    } else if (CHO4.t0) { CHO4.t0 = 0; CHO4.tc = 0; CHO4.tan = 0; veMay3Goc(); }
    if (CHO4.t0) { td3.U.uTan.value = CHO4.tan; chu3.datA((1 - CHO4.tan) * (0.35 + 0.65 * mDung)); }
    veCanh3(s3, man, false);
    td3.U.uTan.value = 0;
    kH = dichKinh(dt, CHO4.t0 ? 0 : kinh3(s3), now);
    veKinh3(kH, man);
    if (vaoDay3) matMo((s3 - T3.D) / T3.MO, man);
    khungSo = CANH[2].dung;
  } else if (nav.cur() === 1) {
    if (choC3 && !C3 && !choC3Go && pho && pho.phim.visible) {
      if (!CHO3.t0) { CHO3.t0 = now; CHO3.c0 = pho.camera.position.clone(); CHO3.dir = pho.phim.position.clone().sub(CHO3.c0); CHO3.d = CHO3.dir.length(); CHO3.dir.normalize(); }
      const u = Math.min(1, (now - CHO3.t0) / 1400), e = 1 - Math.pow(1 - u, 3);
      pho.dayMay(CHO3.c0.clone().addScaledVector(CHO3.dir, CHO3.d * 0.06 * e));
    } else if (CHO3.t0) { CHO3.t0 = 0; traMay2(); }
    veCanh2(tCanh, s2Now(now), man, false);
    kH = dichKinh(dt, CHO3.t0 ? 0 : kinh2(s2Now(now)), now);
    veKinh2(kH, man);
    khungSo = CANH[1].dung;
  } else {
    veCanh(tCanh, mo, man);
    kH = dichKinh(dt, mo.kinh, now);
    khuay *= Math.exp(-dt / 0.5);
    khoi.u.uTro.value.set(lens.H.x, lens.H.y, khuay * kH); khoi.u.uTroR.value = lens.H.R;
    veKinh(kH, man);
    const choDang = !!choC2 && !C2;
    if (choDang && !CHO.t0) { CHO.t0 = now; CHO.a = 1; chuyen.datDai(W, H, gocNan(), DPR); SFX.su('nut'); }
    if (!choDang) CHO.a = Math.max(0, CHO.a - dt / 0.5);
    if (CHO.t0) {
      const s = (now - CHO.t0) / 1000, lan = 1 - Math.pow(1 - Math.min(1, s / 0.3), 2);
      CHO.r = Math.hypot(W, H) * 0.11 * lan * (1 + 0.3 * (1 - Math.exp(-s / 6)));
      if (CHO.a > 0) { renderer.setRenderTarget(man); chuyen.nut(CHO.r, CHO.a); } else CHO.t0 = 0;
    }
  }
  if (ui6) { const h6 = CANH_HIEN === 5 && SN.mode === 'idle' && kChu6(s6Now(now)) >= 0.2; ui6.datHien(h6); ui6.root.classList.toggle('dang-form', F6.s !== 0); if (F6.s === 0) ui6.traFocus();
    if (F6.s === 0) { if (chanO6 !== 'ban') { chanO6 = 'ban'; ui6.datChanO(CHAN6); } ui6.datChan(h6 && !!CHAN6); } else if (chanO6 === 'ban') chanO6 = ''; }
  if (man) phong.ve();
  dai.update(khungSo, SN.mode === 'idle' ? nav.cur() : SN.to);
  if (!hieuHien && mo.sang > 0.35) { hieu && hieu.classList.add('hien'); daiEl.classList.add('hien'); hieuHien = true; logoT0 = now; CHON_AM.hienNut(); }
  ngheAm(now);
  if (logoT0 >= 0) { const p = Math.min(1, (now - logoT0) / 900); logoHat(p * p * (3 - 2 * p)); if (p >= 1) logoT0 = -2; }
  if (!goiYHien && mo.chu >= chu.L.het) { if (CANH_HIEN === 0) dai.goiY(true); goiYHien = true; }
  ketThucDo(tBat);
  cpuMau.push(performance.now() - tBat); if (cpuMau.length > 60) cpuMau.shift();
  const lnH = (CANH_HIEN === 5 ? lens6 : CANH_HIEN === 4 ? lens5 : CANH_HIEN === 3 ? lens4 : CANH_HIEN === 2 ? lens3 : CANH_HIEN === 1 ? lens2 : lens).H;
  const anTro = lnH.on > 0.5 && !!troCuoi && Math.hypot(lnH.x - troCuoi.x, lnH.y - troCuoi.y) < 6;
  if (anTro !== troAn) { cv.style.cursor = anTro ? 'none' : ''; troAn = anTro; }
  if (hieu && (CANH_HIEN >= 1 || logoMo < 0.999)) {
    let duoi = false;
    if (CANH_HIEN >= 1 && lnH.on > 0.3) { const r = hopLogo(), nx = Math.max(r[0], Math.min(lnH.x, r[2])), ny = Math.max(r[1], Math.min(lnH.y, r[3])); duoi = Math.hypot(lnH.x - nx, lnH.y - ny) < lnH.R + 9; }
    logoMo += ((duoi ? 0.1 : 1) - logoMo) * Math.min(1, dt * 12);
    hieu.style.opacity = logoMo < 0.999 ? logoMo.toFixed(3) : '';
  }
  if ((NAC < 3 || DPR > SCR * 0.55 * 1.01) && !document.hidden && nav.S.mode === 'idle' && (MOS.s >= 2.4 || khoang > 45)) xetNac(khoang);
  requestAnimationFrame(loop);
}
function moMan() {
  if (xoaPhac6) { xoaPhac6(); xoaPhac6 = null; }
  tai(100);
  window.__daMo = true;
  { const h = document.getElementById('hong'); if (h && h.dataset.vi === 'cham') h.hidden = true; }
  document.getElementById('tai').classList.add('xong');
  setTimeout(() => { const t = document.getElementById('tai'); if (t) { t.hidden = true; t.setAttribute('aria-hidden', 'true'); } }, 700);
  san = true;
  tMo = performance.now(); MOS.s = 0; MOS.toc = 1; MOS.tocDich = 1;
  if (!pho) dungCanh2Muon();
}
window.__dat = (o) => {
  if (o.canh === 6) {
    if (!ban6 || !C6) return false;
    CANH_HIEN = 5;
    const s6 = o.s6 ?? 30;
    if (o.t != null) window.__t6 = o.t;
    tTD6 = o.chu === false ? -1 : o.chu != null ? s6 - o.chu : -99;
    s6Bat = performance.now() - s6 * 1000;
    if (o.lens === 'macdinh') { const k = kepKinh(LENS6_0); lens6.H.x = k.x; lens6.H.y = k.y; lens6.H.on = 1; }
    else if (o.lens) { lens6.H.x = o.lens[0]; lens6.H.y = o.lens[1]; lens6.H.on = o.lens[2] ?? 1; } else lens6.H.on = 0;
    if (o.formK != null) {
      F6.s = 1; F6.m0 = BC6.may; F6.m1 = ban6.mayForm(BC6.may, BC6.kieu);
      { const m0 = ban6.mayDat(); ban6.datMay(F6.m1, W, H); datVungForm6(); ban6.datMay(m0, W, H); }
      THU.k = o.thu ?? Math.max(0, Math.min(1, (o.formK - 0.5) / 0.5)); ban6.datThu(THU.k, THU.a, null, longThu());
      veLuot6(o.formK, s6, null, 1); chu6.datA(1);
      ui6.dongThe(); if (ui6.formMo()) ui6.dongForm(); ui6.datHien(true); ui6.root.classList.add('dang-form'); ui6.datChan(false);
      dai.lap(true); dai.update(CANH[5].dung, 5); dai.goiY(false); if (hieu) hieu.classList.add('hien'); daiEl.classList.add('hien');
      return true;
    }
    if (o.dongK != null) {
      if (o.dongK === 0) { F6.s = 2; ban6.datMay(ban6.mayForm(BC6.may, BC6.kieu), W, H); datVungForm6(); ban6.datThu(1, THU.a, null, longThu()); td6.U.uTan.value = 1;
        const rt = chuyen.khung(W, H); veCanh6(s6, rt, false); renderer.setRenderTarget(null); td6.U.uTan.value = 0; }
      F6.s = 3; ban6.datMay(BC6.may, W, H); ban6.datThu(0, null, null);
      veCanh6(s6, null, false); renderer.setRenderTarget(null); chu6.render(renderer); chuyen.tan(o.dongK);
      ui6.datHien(false);
      return true;
    }
    ui6.root.classList.toggle('dang-form', !!o.form);
    if (o.form) { F6.s = 2; ban6.datMay(ban6.mayForm(BC6.may, BC6.kieu), W, H); } else { F6.s = 0; ban6.datMay(BC6.may, W, H); }
    if (o.form) { td6.U.uTan.value = 1; chu6.datA(0); }
    if (o.form) { ui6.datHien(true); if (!ui6.formMo()) hienForm6(); ui6.datChan(true); }
    else { if (ui6.formMo()) ui6.dongForm(); ui6.datChan(false); if (o.ui !== false) { ui6.datHien(true); if (o.mo != null) { if (ui6.theMo() !== o.mo) ui6.moThe(o.mo); } else ui6.dongThe(); } else ui6.datHien(false); }
    if (o.form) THU.a = vungHop(ui6.form.getBoundingClientRect()), THU.b = null;
    else if (o.mo != null && ui6.theMo() >= 0) { THU.a = vungHop(ui6.hopThe()); THU.b = vungTap6(ui6.theMo()); }
    THU.k = o.thu ?? (o.form || (o.mo != null && o.ui !== false) ? 1 : 0); ban6.datThu(THU.k, THU.a, THU.b, longThu());
    veCanh6(s6, null, false); if (!o.form) veKinh6(lens6.H.on);
    td6.U.uTan.value = 0; chu6.datA(1);
    for (let i = 1; i <= 5; i++) dai.moKhoa(i); dai.lap(true); dai.update(CANH[5].dung, 5); dai.goiY(false);
    if (hieu) hieu.classList.add('hien'); daiEl.classList.add('hien');
    return true;
  }
  if (o.canh === 5) {
    if (!ham5 || !C5) return false;
    CANH_HIEN = 4;
    const s5 = o.s5 ?? 30;
    if (o.t != null) window.__t5 = o.t;
    tTD5 = o.chu === false ? -1 : o.chu != null ? s5 - o.chu : -99;
    if (o.lens === 'macdinh') { const k = kepKinh(LENS5_0); lens5.H.x = k.x; lens5.H.y = k.y; lens5.H.on = 1; }
    else if (o.lens) { lens5.H.x = o.lens[0]; lens5.H.y = o.lens[1]; lens5.H.on = o.lens[2] ?? 1; } else lens5.H.on = 0;
    veCanh5(s5, null, false); veKinh5(lens5.H.on);
    dai.moKhoa(1); dai.moKhoa(2); dai.moKhoa(3); dai.moKhoa(4); dai.update(CANH[4].dung, 4); dai.goiY(false);
    if (hieu) hieu.classList.add('hien'); daiEl.classList.add('hien');
    return true;
  }
  if (o.canh === 4) {
    if (!ngo4 || !C4) return false;
    CANH_HIEN = 3;
    const s4 = o.s4 ?? 30;
    if (o.t != null) window.__t4 = o.t;
    tTD4 = o.chu === false ? -1 : o.chu != null ? s4 - o.chu : -99;
    if (o.lens === 'macdinh') { const k = kepKinh(LENS4_0); lens4.H.x = k.x; lens4.H.y = k.y; lens4.H.on = 1; }
    else if (o.lens) { lens4.H.x = o.lens[0]; lens4.H.y = o.lens[1]; lens4.H.on = o.lens[2] ?? 1; } else lens4.H.on = 0;
    veCanh4(s4, null, false); veKinh4(lens4.H.on);
    dai.moKhoa(1); dai.moKhoa(2); dai.moKhoa(3); dai.update(CANH[3].dung, 3); dai.goiY(false);
    if (hieu) hieu.classList.add('hien'); daiEl.classList.add('hien');
    return true;
  }
  if (o.canh === 3) {
    if (!lat || !C3) return false;
    CANH_HIEN = 2;
    const s3 = o.s3 ?? 30;
    if (o.s == null || o.s === KHUNG) lat.dungNgay(); else lat.datS(o.s);
    lat.capNhat(0);
    tTD3 = o.chu === false ? -1 : o.chu != null ? s3 - o.chu : -99;
    tDung3 = o.s == null || o.s === KHUNG ? 0 : -1;
    if (o.lens === 'macdinh') { const k = kepKinh(LENS3_0); lens3.H.x = k.x; lens3.H.y = k.y; lens3.H.on = 1; }
    else if (o.lens) { lens3.H.x = o.lens[0]; lens3.H.y = o.lens[1]; lens3.H.on = o.lens[2] ?? 1; } else lens3.H.on = 0;
    veCanh3(s3, null, false); veKinh3(lens3.H.on);
    dai.moKhoa(1); dai.moKhoa(2); dai.update(CANH[2].dung, 2); dai.goiY(false);
    if (hieu) hieu.classList.add('hien'); daiEl.classList.add('hien');
    return true;
  }
  if (o.canh === 2) {
    if (!pho) return false;
    CANH_HIEN = 1; const s2 = o.s2 ?? 30; traMay2();
    if (o.lens === 'macdinh') { const k = kepKinh(LENS2_0); lens2.H.x = k.x; lens2.H.y = k.y; lens2.H.on = kinh2(s2); }
    else if (o.lens) { lens2.H.x = o.lens[0]; lens2.H.y = o.lens[1]; lens2.H.on = o.lens[2] ?? 1; } else lens2.H.on = 0;
    veCanh2(o.t ?? s2 + 20, s2, null, false); veKinh2(lens2.H.on);
    dai.moKhoa(1); dai.update(CANH[1].dung, 1); dai.goiY(false);
    if (hieu) hieu.classList.add('hien'); daiEl.classList.add('hien');
    return true;
  }
  CANH_HIEN = 0;
  const s = o.mo ?? 99;
  const mo = moAt(s, chu.L.het);
  const t = o.t ?? (s < 50 ? s + MO.LECH : 1);
  if (o.lens === 'macdinh') { const k = kepKinh(LENS0); lens.H.x = k.x; lens.H.y = k.y; lens.H.on = mo.kinh; }
  else if (o.lens) { lens.H.x = o.lens[0]; lens.H.y = o.lens[1]; lens.H.on = o.lens[2] ?? 1; } else lens.H.on = 0;
  veCanh(t, mo);
  veKinh(o.lens ? (o.lens === 'macdinh' ? mo.kinh : 1) : 0);
  dai.update(1 + (CANH[0].dung - 1) * mo.phim, 0);
  if (hieu) hieu.classList.toggle('hien', mo.sang > 0.35);
  daiEl.classList.toggle('hien', mo.sang > 0.35);
  dai.goiY(mo.chu >= chu.L.het);
  return true;
};
window.__matChu = (kind) => {
  const cu = []; scene.traverse((o) => { if (o.isMesh) cu.push([o, o.visible, o.material]); });
  const den = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide });
  const cc = renderer.getClearColor(new THREE.Color());
  renderer.setClearColor(0x000000);
  for (const [o] of cu) o.visible = false;
  if (kind === 'tieude') {
    fig.traverse((o) => { if (o.isMesh) { o.visible = true; o.material = den; } });
    td.meshMat.visible = true; td.meshMat.material = td.matNa;
    renderer.setRenderTarget(null); renderer.clear(); renderer.render(scene, camera);
  } else if (kind === 'nguoi') {
    const trang = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    fig.traverse((o) => { if (o.isMesh) { o.visible = true; o.material = trang; } });
    renderer.setRenderTarget(null); renderer.clear(); renderer.render(scene, camera);
  } else { renderer.setRenderTarget(null); renderer.clear(); chu.render(renderer); }
  for (const [o, v, m] of cu) { o.visible = v; o.material = m; }
  renderer.setClearColor(cc);
  return true;
};
window.__hienChu = () => {
  const rt = new THREE.WebGLRenderTarget(W, H);
  const cu = []; scene.traverse((o) => { if (o.isMesh) cu.push([o, o.visible, o.material]); });
  const den = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide });
  for (const [o] of cu) o.visible = false;
  fig.traverse((o) => { if (o.isMesh) { o.visible = true; o.material = den; } });
  td.meshMat.visible = true; td.meshMat.material = td.matNa;
  const cc = renderer.getClearColor(new THREE.Color()); renderer.setClearColor(0x000000);
  renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene, camera); renderer.setRenderTarget(null);
  renderer.setClearColor(cc);
  for (const [o, v, m] of cu) { o.visible = v; o.material = m; }
  const buf = new Uint8Array(W * H * 4); renderer.readRenderTargetPixels(rt, 0, 0, W, H, buf); rt.dispose();
  const cv2 = document.createElement('canvas'); cv2.width = W; cv2.height = H; const g = cv2.getContext('2d', { willReadFrequently: true });
  const out = [];
  for (const c of td.L.chu) {
    if (!/[A-Z]/.test(c.ch)) continue;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    g.translate(c.ox + c.c.x + c.c.adv / 2, c.oy + c.c.dy); g.rotate(c.c.rot); g.scale(c.c.sx, c.c.sy); g.translate(-c.c.adv / 2, 0);
    g.fillStyle = '#fff'; g.fill(c.c.path, 'nonzero');
    const x0 = Math.max(0, Math.floor(c.bb[0] * DPR) - 2), y0 = Math.max(0, Math.floor(c.bb[1] * DPR) - 2), x1 = Math.min(W, Math.ceil(c.bb[2] * DPR) + 2), y1 = Math.min(H, Math.ceil(c.bb[3] * DPR) + 2);
    const im = g.getImageData(x0, y0, x1 - x0, y1 - y0).data;
    let tong = 0, hien = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      if (im[((y - y0) * (x1 - x0) + (x - x0)) * 4 + 3] < 200) continue;
      tong++; if (buf[((H - 1 - y) * W + x) * 4] > 128) hien++;
    }
    out.push({ ch: c.ch, dong: c.li, hien: +(hien / Math.max(1, tong)).toFixed(3) });
  }
  out.sort((a, b) => a.hien - b.hien);
  return { it_nhat: out[0], bon_chu_it_nhat: out.slice(0, 4) };
};
window.__info = () => ({ dprc: DPRC, nang: POSE.nang, bc: BC && { kieu: BC.kieu, n: BC.n, cap: BC.cap, dongs: BC.dongs.map((d) => ({ text: d.text, x: d.x, y: d.y, cap: d.cap })), than: BC.than, nhan: BC.nhan, LE: BC.LE, inkTrai: td.L.inkTrai }, tieuDe: td.L.box, vTat: khoi.u.uVTat.value, dpr: DPR, low: LOW, nac: NAC, w: W, h: H, frames: nFrames, mo: MOS.s, lens: { ...lens.H, rt: undefined, gRt: undefined }, lens0: LENS0, chu: chu.L.box, ember: EPX, phone: PHONE });
window.__kiemChi = () => {
  const dau = hopDau(), em = [EPX.x - 40, EPX.y - 40, EPX.x + 40, EPX.y + 40];
  const no = (r, t) => { const u = [t[0] - 24, t[1] - 24, t[2] + 24, t[3] + 24]; const a = [r[0] + 10, r[1] + 10, r[2] - 10, r[3] - 10]; return a[0] < u[2] && a[2] > u[0] && a[1] < u[3] && a[3] > u[1]; };
  const cum = lens.LOPDAT.map((r) => r.map(Math.round));
  const giao = (r, t) => r[0] + 10 < t[2] && r[2] - 10 > t[0] && r[1] + 10 < t[3] && r[3] - 10 > t[1];
  const td0 = hopTieuDe();
  const R = lens.H.R, nh = R / lens.H.mag, b = R + 12 - nh;
  const tron = (r) => r[0] + 10 >= b - 0.5 && r[1] + 10 >= b - 0.5 && r[2] - 10 <= Wc - b + 0.5 && r[3] - 10 <= Hc - daiH() - b + 0.5;
  return { co_chu_kinh_min: Math.min(...lens.LOPCO), so_cum: cum.length, dam_dau: cum.filter((r) => no(r, dau)).length, dam_lua: cum.filter((r) => no(r, em)).length,
    dam_tieu_de: cum.filter((r) => td0.some((t) => giao(r, t))).length, ten: lens.LOPTEN.slice(), bo: lens.LOPBO.slice(), cuaTren: Math.round(vungSang(0, Wc * 0.35)), tieuDe: td0, R: lens.H.R, khong_soi_tron: cum.filter((r) => !tron(r)).length, dau, cum,
    ngoai_man: cum.filter((r) => r[0] + 10 < 0 || r[1] + 10 < 0 || r[2] - 10 > Wc || r[3] - 10 > Hc - daiH()).length };
};
window.__matBox = () => {
  const g = gltf.scene.getObjectByName('Dau');
  const pos = g.geometry.attributes.position;
  const hc = v3(META.headCentre), up = v3(META.headUp), fw = v3(META.headFwd);
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; const p = new THREE.Vector3();
  const eyeUp = v3(META.eyeL).sub(hc).dot(up);
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i); const d = p.clone().sub(hc);
    if (d.dot(up) > eyeUp + 0.02 || d.dot(fw) < 0.0) continue;
    const s = p.clone().project(camera);
    const x = (s.x * 0.5 + 0.5) * Wc, y = (0.5 - s.y * 0.5) * Hc;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  return [Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1)];
};
window.__dauBox = () => { const b = new THREE.Box3().setFromObject(gltf.scene.getObjectByName('Dau')); const pts = []; for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) { const s = new THREE.Vector3(x, y, z).project(camera); pts.push([(s.x * 0.5 + 0.5) * Wc, (0.5 - s.y * 0.5) * Hc]); } return [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))].map(Math.round); };
window.__ghiChu = () => lens.lensScene.children.filter((o) => o.material.map).map((o) => { const v = o.position.clone().project(camera); const w = o.geometry.parameters.width * o.scale.x, h = o.geometry.parameters.height * o.scale.y; const a = o.position.clone().addScaledVector(new THREE.Vector3(1, 0, 0).applyQuaternion(o.quaternion), w / 2).project(camera), c = o.position.clone().addScaledVector(new THREE.Vector3(0, 1, 0).applyQuaternion(o.quaternion), h / 2).project(camera); const cx = (v.x * 0.5 + 0.5) * Wc, cy = (0.5 - v.y * 0.5) * Hc, hw = Math.abs(a.x - v.x) * 0.5 * Wc, hh = Math.abs(c.y - v.y) * 0.5 * Hc; return [Math.round(cx - hw), Math.round(cy - hh), Math.round(cx + hw), Math.round(cy + hh)]; });
window.__chuyen = (k, s2 = null) => {
  CANH_HIEN = 0; lens.H.on = 0;
  const rt = chuyen.khung(W, H); veCanh(1, moAt(99, chu.L.het), rt); renderer.setRenderTarget(null); if (CHOP_B2) chupTran1(1, moAt(99, chu.L.het));
  chuyen.datDai(W, H, gocNan(), DPR);
  veCanh2(20, s2 ?? k * T2.D, null); if (CHOP_B2) chuyen.manh(k, 0, 0, 0, 1, ssm(B2_TAN[0], B2_TAN[1], k)); else chuyen.manh(k, NHOE12.n, NHOE12.mau, NHOE12.tu, NHOE12.du);
  dai.update(CANH[0].dung + (CANH[1].dung - CANH[0].dung) * inOut3(k), 1);
  if (hieu) hieu.classList.add('hien'); daiEl.classList.add('hien');
  return true;
};
window.__kiem2 = () => {
  const giao = (r, t) => r[0] + 10 < t[2] && r[2] - 10 > t[0] && r[1] + 10 < t[3] && r[3] - 10 > t[1];
  const hd = []; for (const c of td2.L.chu) { const r = hd[c.li] || (hd[c.li] = [1e9, 1e9, -1e9, -1e9]); r[0] = Math.min(r[0], c.bb[0]); r[1] = Math.min(r[1], c.bb[1]); r[2] = Math.max(r[2], c.bb[2]); r[3] = Math.max(r[3], c.bb[3]); }
  const b = new THREE.Box3().setFromObject(pho.fig); const ps = []; for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) ps.push(pho.man(new THREE.Vector3(x, y, z), Wc, Hc));
  const ng = [Math.min(...ps.map((p) => p.x)), Math.min(...ps.map((p) => p.y)), Math.max(...ps.map((p) => p.x)), Math.max(...ps.map((p) => p.y))];
  const cum = lens2.LOPDAT.map((r) => r.map(Math.round));
  const R = lens2.H.R, nh = R / lens2.H.mag, bb = R + 12 - nh;
  const tron = (r) => r[0] + 10 >= bb - 0.5 && r[1] + 10 >= bb - 0.5 && r[2] - 10 <= Wc - bb + 0.5 && r[3] - 10 <= Hc - daiH() - bb + 0.5;
  const than = chu2.moc().than; const k0 = LENS2_0;
  const cheChu = [...hd.filter(Boolean), ...hopChu2()].some((t) => { const nx = Math.max(t[0], Math.min(k0.x, t[2])), ny = Math.max(t[1], Math.min(k0.y, t[3])); return Math.hypot(k0.x - nx, k0.y - ny) < R + 10; });
  const hp = pho.phimHop(); const cheP = !!hp && Math.hypot(k0.x - Math.max(hp[0], Math.min(k0.x, hp[2])), k0.y - Math.max(hp[1], Math.min(k0.y, hp[3]))) < R + 8;
  return { so_cum: cum.length, bo: lens2.LOPBO.slice(), co_min: Math.min(...lens2.LOPCO), kinh_che_phim: cheP, phim: hp && hp.map(Math.round), dap: window.__dap, dam_tieu_de: cum.filter((r) => hd.some((t) => t && giao(r, t))).length, dam_nguoi: cum.filter((r) => (window.__nguoiDai || [ng]).some((t) => giao(r, t))).length, khong_soi_tron: cum.filter((r) => !tron(r)).length, kinh_che_chu: cheChu, nguoi: ng.map(Math.round), than: than.map(Math.round) };
};
window.__kiem3 = () => {
  if (!lat || !BC3) return null;
  const giao = (r, t) => r[0] + 10 < t[2] && r[2] - 10 > t[0] && r[1] + 10 < t[3] && r[3] - 10 > t[1];
  const hd = hopDongTD(td3), than = chu3.moc().than;
  const cum = lens3.LOPDAT.map((r) => r.map(Math.round));
  const R = lens3.H.R, nh = R / lens3.H.mag, bb = R + 12 - nh;
  const tron = (r) => r[0] + 10 >= bb - 0.5 && r[1] + 10 >= bb - 0.5 && r[2] - 10 <= Wc - bb + 0.5 && r[3] - 10 <= Hc - daiH() - bb + 0.5;
  const k0 = LENS3_0;
  const kc = (t) => Math.hypot(k0.x - Math.max(t[0], Math.min(k0.x, t[2])), k0.y - Math.max(t[1], Math.min(k0.y, t[3])));
  return { so_cum: cum.length, ten: lens3.LOPTEN.slice(), bo: lens3.LOPBO.slice(), co_min: Math.min(...lens3.LOPCO), dam_tieu_de: cum.filter((r) => hd.some((t) => giao(r, t))).length,
    dam_than: cum.filter((r) => giao(r, than)).length, dam_logo: cum.filter((r) => giao(r, hopLogo())).length, khong_soi_tron: cum.filter((r) => !tron(r)).length,
    kinh_che_chu: [...hd, than, hopLogo()].some((t) => kc(t) < R + 10), kinh0: { x: Math.round(k0.x), y: Math.round(k0.y) }, R, cum, than: than.map(Math.round), tieuDe: hd.map((r) => r.map(Math.round)),
    dai: BC3.dai, kieu: BC3.kieu };
};
window.__chuyen23 = (k, s = LAT ? LAT.TU : 399) => {
  if (!lat || !C3) return false;
  CANH_HIEN = 1; lens2.H.on = 0; traMay2(); pho.capNhat(50, 30); datDay();
  const p = viTriDay(Math.min(1, k)); if (p) pho.dayMay(p);
  chu2.datA(Math.max(0, 1 - k / 0.25));
  tTD3 = -1; lat.datS(s); lat.capNhat(0);
  if (k <= 1) { td2.U.uTan.value = ssm(TD2_TAN[0], TD2_TAN[1], k); pho.datAnhPhim(lat.anhKhung(KHUNG)); pho.datSangPhim(1 - (1 - LAT.DEN_TOI) * ssm(0.8, 1.0, k)); veCanh2(50, 30, null); pho.datSangPhim(1); td2.U.uTan.value = 0; matDong(k, null); }
  else {
    const s3 = T3.D * k; vaoDay3 = true;
    CANH_HIEN = 2; veCanh3(s3, null, false); matMo((s3 - T3.D) / T3.MO, null);
  }
  renderer.setRenderTarget(null);
  chu2.datA(1);
  dai.moKhoa(1); dai.update(CANH[1].dung + (CANH[2].dung - CANH[1].dung) * inOut3(k), 2); dai.goiY(false);
  if (hieu) hieu.classList.add('hien'); daiEl.classList.add('hien');
  return true;
};
window.__xaViec = () => { if (!dang3 && C2) dungCanh3(); if (!dang4 && C3) dungCanh4(); if (!dang5 && C4) dungCanh5(); if (!dang6 && C5) dungCanh6(); let n = 0; while ((BUOC_BT.length || VIEC2.length) && n++ < 400) (BUOC_BT.length ? BUOC_BT : VIEC2).shift()(); };
window.__veAnh = (f) => { if (!lat) return false; const t = f === 'bong' ? (lat.ngoObj() ? lat.ngoObj().bongRT.depthTexture : null) : lat.anhKhung(f); if (!t) return false;
  const m = new THREE.ShaderMaterial({ uniforms: { uT: { value: t } }, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }', fragmentShader: 'uniform sampler2D uT; varying vec2 vUv; void main(){ float v = texture2D(uT, vUv).r; gl_FragColor = vec4(vec3(v), 1.0); }' });
  const sc = new THREE.Scene(); const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m); q.frustumCulled = false; sc.add(q);
  renderer.setRenderTarget(null); renderer.render(sc, new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)); m.dispose(); return true; };
window.__boTri4 = () => { const k = laDt() ? 'dt' : Hc < 560 ? 'ngang' : 'may'; boTri4A(k); boTri4B(k); boTri4C(); ngo4.ganTinh(); return { ten: lens4.LOPTEN.slice(), bo: lens4.LOPBO.slice(), dat: lens4.LOPDAT.map((q) => q.map(Math.round)), kinh: { x: Math.round(LENS4_0.x), y: Math.round(LENS4_0.y) } }; };
window.__boTri5 = () => { const k = laDt() ? 'dt' : Hc < 560 ? 'ngang' : 'may'; boTri5A(k); td5.xongSdf(); boTri5B(k); boTri5C(); ham5.ganTinh(); return { ten: lens5.LOPTEN.slice(), bo: lens5.LOPBO.slice(), dat: lens5.LOPDAT.map((q) => q.map(Math.round)), kinh: { x: Math.round(LENS5_0.x), y: Math.round(LENS5_0.y) } }; };
window.__veChuyen56 = (k, rt) => { if (k === 0) { chupKhung(4, performance.now()); chupTran5(performance.now()); } veChuyen56(k, rt, performance.now()); }; window.__T6 = T6; window.__BC6 = () => BC6; window.__C6 = () => C6; window.__lens6 = lens6; window.__chu6 = chu6; window.__td6 = td6; window.__LOP6 = () => LOP6; window.__F6 = F6;
window.__boTri6 = () => { const k = kieuNow(); boTri6A(k); td6.xongSdf(); boTri6B(k); boTri6C(); return { ten: lens6.LOPTEN.slice(), bo: lens6.LOPBO.slice(), dat: lens6.LOPDAT.map((q) => q.map(Math.round)), kinh: { x: Math.round(LENS6_0.x), y: Math.round(LENS6_0.y) } }; };
window.__veChuyen45 = (k, rt) => { if (k === 0) datDay5(); veChuyen45(k, rt, performance.now()); }; window.__T5 = T5; window.__BC5 = () => BC5; window.__C5 = () => C5; window.__lens5 = lens5; window.__chu5 = chu5; window.__td5 = td5; window.__LOP5 = () => LOP5; window.__hopTay5 = () => hopTay5();
window.__veChuyen34 = (k, rt) => { if (k === 0) datDay4(); veChuyen34(k, rt, performance.now()); }; window.__T4 = T4; window.__BC4 = () => BC4; window.__C4 = () => C4; window.__lens4 = lens4; window.__chu4 = chu4; window.__LOP4 = () => LOP4; window.__hopTieu4 = () => hopTieu4();
window.__rendererInfo = () => renderer.info.programs.length; window.__T3 = T3; window.__conViec = () => VIEC2.length + BUOC_BT.length; window.__BC3 = () => BC3; window.__C3 = () => C3; window.__lens3 = lens3; window.__td3 = td3; window.__chu3 = chu3;
window.__man = MAN; window.__nav = nav; window.__pho = pho; window.__C2 = () => C2; window.__ren = renderer; window.__td2 = td2; window.__chu2 = chu2; window.__lens2 = lens2; window.__BC2 = () => BC2;
if (TINH) { window.__dat({ mo: 99 }); moMan(); window.__san = true; }
else {
  requestAnimationFrame(loop); requestAnimationFrame(() => {
    tai(100); window.__daMo = true; { const hg = document.getElementById('hong'); if (hg && hg.dataset.vi === 'cham') hg.hidden = true; }
    const hoi = () => CHON_AM.hoi(() => { moMan(); window.__san = true; });
    if (window.__taiXong) window.__taiXong(hoi); else { document.getElementById('tai').classList.add('xong'); hoi(); }
  });
  if (Q.get('canh') === '2') requestAnimationFrame(() => requestAnimationFrame(() => { MOS.s = 99; MOS.tocDich = 1; nav.go(1); }));
  { const dich = { 3: 2, 4: 3, 5: 4, 6: 5 }[Q.get('canh')];
    if (dich !== undefined) {
      MOS.s = 99; MOS.tocDich = 1; moThang = dich;
      const xong = () => (dich === 2 ? C3 : dich === 3 ? C4 : dich === 4 ? C5 : C6);
      const thu = () => { if (moThang !== dich) return; if (nav.cur() === dich || (xong() && nav.go(dich))) { moThang = -1; return; } setTimeout(thu, 120); };
      setTimeout(thu, 120);
    } }
}
