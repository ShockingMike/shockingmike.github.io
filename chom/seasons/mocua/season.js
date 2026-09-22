// Chớm world, the opening ("mở cửa"): the still life the page opens on, before the four seasons.
// A lacquer table in a dark room. An old kerosene lamp stands behind the bottle and a little to its right, and it is the
// only light: it lies along the table in a long raking sheen, it burns through the teal glass of the bottle from behind
// (so the glass reads as glass, not as a dark shape), it lights the dó paper pinned on the boards behind, and it throws the
// bottle's long shadow forward across the left of the frame, where the opening words go. The bottle is just opened: its
// lacquer cap lies tipped beside it, a paper test strip leans on the glass, and from the open neck thin ribbons of scent
// climb into the lamplight. Spring waits inside that scent: scrolling walks the camera into the bottle's mouth and stops
// inside the ribbons, and the core takes over from there (the hand-over numbers are in `opening`, below).
//
// Built as a fifth "season" so it shares the core (seasons/<id>/season.js, core/README.md section 2).
// This folder owns: the still life, its light, the cap, the ribbons of scent, and the camera's walk into the bottle.
// It does NOT own: the change into Xuân (the core), or the opening words (the page layer; their clear area is in NOI.md).
const Q = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');

// where things stand (metres; the table's top is y = 0, the camera looks toward -z)
const BOTTLE_AT = [0.10, 0, -0.10];
// (21/9) Life size. Mike settled the bottle at 100 ml, 147 mm tall on 18/9 at 17:10 (core/bottle.js LIFE = 0.6434), and
// `scale: 1` is exactly that bottle, as all four seasons use it. This scene asked for 1.55 at 12:44 the same day
// ("bigger bottle") — four and a half hours BEFORE that decision — and nobody came back to it. Measured at 1.55 the open
// glass stood 183 mm on the table (228 mm with its stopper); at 1 it stands 118 mm (147 mm with the stopper).
const BOTTLE_SCALE = 1;
// The open neck, the height the scent starts at. ONE source: the height of the built glass at `scale: 1`, read off the
// page itself (__chom.bottleStand().bottle.top), times whatever scale this scene asks for. build() below checks it
// against the bottle the core actually built and says so in the console if they disagree by more than 3 mm.
// It used to be written out by hand as "0.184 x 1.55 = 0.285", which was right on 18/9 at 12:44 and wrong from 17:10,
// because the core then began multiplying every bottle by LIFE as well. Nobody measured, so from that hour until today
// the ribbons of scent started 102 mm ABOVE the neck of the bottle, hanging in the air with a visible gap under them.
const NECK_Y = 0.1181;
const MOUTH = [BOTTLE_AT[0], NECK_Y * BOTTLE_SCALE, BOTTLE_AT[2]];
// where the camera stops: just in front of the neck and inside the wide part of the veils, so the last frame of the
// push is scent and not the room behind. Offsets are per unit of bottle scale, so the door follows the bottle.
const DOOR = [BOTTLE_AT[0] + 0.0116 * BOTTLE_SCALE, MOUTH[1] + 0.0729 * BOTTLE_SCALE, BOTTLE_AT[2] + 0.0516 * BOTTLE_SCALE];
// The scent's own numbers (SC, in build()) were drawn at this bottle scale; they are read back out of it, so the whole
// plume keeps its shape and its place on the neck whatever the bottle's size.
const SC_DRAWN_AT = 1.55;
const SCK = BOTTLE_SCALE / SC_DRAWN_AT;
// the lamp: behind the bottle and to its right, at the edge of the frame. Its flame is the scene's one light
// (it stands on a small wooden box, so its flame is well above the table: the light then lies clearly along the lacquer
// instead of grazing it, which would break the table into half-lit speckle)
const LAMP = { at: [0.50, 0, -0.66], base: 0.13, flame: 0.455 };
const FLAME = [LAMP.at[0], LAMP.flame, LAMP.at[2]];
// the key light's direction (toward the flame, from the middle of the bottle): the core lights the whole scene with this,
// so the glass, the rims and the shadows all agree with the lamp standing there in the frame
const KEY = (() => {
  const d = [FLAME[0] - BOTTLE_AT[0], FLAME[1] - 0.14, FLAME[2] - BOTTLE_AT[2]];
  const n = Math.hypot(...d);
  return d.map((v) => v / n);
})();

// a tall phone screen gets its own framing, chosen once at load: further back and a little higher, a wider lens, so the
// bottle and the lamp both fit in the upper two thirds and the bottom quarter stays clear for the opening words
const NARROW = typeof window !== 'undefined' && window.innerWidth / window.innerHeight < 0.95;
const EYE = NARROW ? [-0.05, 0.34, 0.86] : [-0.12, 0.30, 0.62];
const FOV = NARROW ? 44 : 38;
const PITCH = NARROW ? -6 : -6.5;
const YAW = NARROW ? 12 : 7;

// the push: straight in, low over the table, into the open neck. The stretch after the first waypoint is given as
// fractions of the way to the door, so it lands on the neck wherever the bottle's size puts it instead of climbing to a
// height that was only right for a bottle half again as tall.
const P1 = NARROW ? [-0.06, 0.33, 0.66] : [-0.06, 0.30, 0.46];
const lerp3 = (a, b, k) => a.map((v, i) => +(v + (b[i] - v) * k).toFixed(4));
const PATH = [EYE, P1, ...[0.4, 0.68, 0.85, 0.95].map((k) => lerp3(P1, DOOR, k)), DOOR];

export default {
  id: 'mocua',
  seed: 20260101,
  people: null,
  roles: [],
  crowd: false,              // nobody here: the core can skip drawing the crowd's poses
  label: 'A painted still life in the dark: a single Chớm perfume bottle of teal glass stands open on a lacquer table, lit from behind by an old kerosene lamp whose flame burns through the glass; the lacquer cap lies tipped beside it, a paper test strip leans on the bottle, and thin ribbons of scent climb from the open neck into the lamplight, with the spring street waiting inside them',
  notes: {
    name: 'Chớm', seasonWord: 'opening', english: 'Chớm · a Hanoi perfumery',
    opener: 'One bottle, just opened. The year begins in the scent above it.',
    top: 'Cold glass', heart: 'Lacquer', base: 'Paper and dust',
    memory: 'A lamp set low on a lacquer table. The cap is off, and the room fills, very slowly, with the first morning of the year.',
  },
  // section 5: a dark room, warm. The air goes to near black a couple of metres back, so the boards behind are only a hint
  palette: {
    air: '#160e10', airSun: '#2a1a16', fog: '#160e10', shade: '#33232e', lit: '#f6bf8e', litK: 0.82,
    skyTop: '#0b0809', skyLow: '#1a1210', hi: '#fff0d2', drip: '#1c1416', moss: '#1e1a18', peel: '#2a2422',
    rim1: '#e08a3a', rim2: '#2f7a7a',
    airNear: 1.0, airFar: 7.0, airMax: 0.86, clear: '#0d0a0a',
    wet: 0,
    accent: '#e8a050', accent2: ['#b8302a', '#2f6f6c'],
  },
  // the lamp standing in the frame is the key light: one warm, very low light from behind the bottle and to its right
  sun: { dir: KEY, color: '#ffc78e', intensity: 0.5 },
  street: { kerbNear: 1.2, kerbFar: -1.2, wallNear: 1.6, wallFar: -1.6 },
  camera: {
    fov: FOV, eye: EYE, yaw: YAW, pitch: PITCH,
    // straight in, low over the table, into the open neck, and on into the ribbons of scent
    path: PATH,
    yawAt: (p, narrow, { sm }) => YAW - YAW * sm(0.1, 0.85, p),
    pitchAt: (p, { sm }, narrow) => PITCH + (narrow ? 7 : 9) * sm(0.05, 0.6, p) + 13 * sm(0.55, 1.0, p),
    // the opening is the first scene: nobody arrives from behind it, and the core flies on into Xuân from the end
    throughDist: 0.9,
  },
  // the bottle is the whole scene: its glass, its oil highlights and its paper label must be the best on the page.
  // glow is high because the lamp stands behind it: the light comes through the body in a soft warm-teal swell
  bottle: {
    at: BOTTLE_AT, scale: BOTTLE_SCALE, ry: 0.30, label: 'C H Ớ M', labelFontText: 'CHỚM',
    capOff: true,            // the cap comes as its own thing (bottle.userData.cap): it is set down beside the bottle
    glow: 0.75, aimY: 0.12,
    labelLight: { color: '#ffcea0', k: 1.12 },
    glint: { at: [0.038, 0.128, 0.012], size: 0.026, color: '#ffe8c4', strength: 0.5 },
    focusView: { offset: [0.42, 0.26, 0.5], fov: 30, phoneOffset: [0.5, 0.3, 0.62], phoneFov: 40, arc: 0.08 },
  },
  // the cursor's breeze bends the scent (group 0) and stirs the paper (group 1)
  sway: [MOUTH, [0.28, 0.06, -0.12], [0, 0.2, -1.2], [0, 0.2, -1.2], [0, 0.2, -1.2], [0, 0.2, -1.2]],
  fonts: [['800 92px "Be Vietnam Pro"', 'CHỚM']],
  shadowZ: [-2.2, 1.4],

  // what the core needs to carry the viewer on into Xuân: the open neck, the way the scent climbs, and the door inside it
  opening: {
    mouth: MOUTH,
    rise: [0, 1, 0.02],          // the way the ribbons climb from the neck
    radius: +(0.11 * SCK).toFixed(4),   // how wide the scent is at the door (metres), with the bottle
    door: DOOR,                  // where the camera stops: inside the scent
    pathEnd: DOOR,
  },

  async build(scene, R, core) {
    const { THREE, V3, U } = core;
    const { knifeMaterial } = core.paint;
    const { Batch, hero, C, withC } = core.build;
    const slice = () => core.slice();

    core.sky({ top: '#0b0808', mid: '#140f0e', low: '#1e1512', glow: '#42281a', cloud: '#0f0b0b', cloud2: '#191211', cloud3: '#0c0909', sunA: '#54321e', sunB: '#24181a', lining: '#3a2418', sunDisc: 0 });
    core.sunRoofs([]);           // indoors there is nothing between the lamp and the table: its light reaches everywhere

    // ---- the boards behind, and the sheet of dó paper pinned on them. The lamp rakes across them from the right, so the
    // paper reads as a pale panel: the bottle's glass is seen against it, which is what makes the glass read as glass
    const wall = new Batch({ kind: 'knife' });
    const board = withC(C.wood, { col: '#15100f', col2: '#3c281c', gloss: 0.1, hilite: 0.16, erode: 0.24, scale: 2, bump: 0.9, vert: 1 });
    for (let i = 0; i < 6; i++) {
      const x = -1.2 + i * 0.6 + (R() - 0.5) * 0.04;
      wall.box(0.58, 2.4, 0.07, V3(x, 1.0, -1.95), { ...board, col: i % 2 ? '#1a1110' : '#1f1510', col2: i % 3 ? '#4a3020' : '#573a24', hilite: 0.14 + 0.06 * R(), seed: R(), haze: 0.3 });
      wall.box(0.014, 2.4, 0.086, V3(x - 0.3, 1.0, -1.945), { ...board, col: '#0d0907', col2: '#1f150e', hilite: 0.04, seed: R(), haze: 0.34 });
      await slice();
    }
    for (const y of [0.30, 1.58]) wall.box(3.7, 0.12, 0.09, V3(-0.1, y, -1.92), { ...board, col: '#181008', col2: '#402a18', hilite: 0.2, seed: R(), haze: 0.28 });
    // the dó paper, hung right behind the bottle so the glass has something to be seen against
    wall.box(0.92, 0.72, 0.012, V3(0.30, 0.62, -1.86), { col: '#33261a', col2: '#a68a62', gloss: 0.05, hilite: 0.42, erode: 0.5, scale: 3.4, bump: 1.2, seed: R(), haze: 0.22 });
    wall.box(0.96, 0.028, 0.014, V3(0.30, 0.985, -1.858), { col: '#33261a', col2: '#9c8258', hilite: 0.5, erode: 0.42, scale: 4, bump: 1, seed: R(), haze: 0.14 });
    const wallMesh = new THREE.Mesh(wall.merge(), knifeMaterial());
    wallMesh.frustumCulled = false;
    scene.add(wallMesh);
    core.addLampCasters(wallMesh);
    await slice();

    // ---- the lacquer table: black-red lacquer, its grain worked in with long strokes, the lamp's sheen raking across it
    const tb = new Batch({ kind: 'knife' });
    const lac = withC(C.lacquer, { col: '#150a09', col2: '#2e1710', gloss: 0.2, hilite: 0.08, erode: 0.05, scale: 4.6, bump: 0.3 });
    tb.rbox(2.6, 0.09, 1.9, 0.012, V3(0, -0.045, -0.35), { ...lac, seed: R() });
    // the grain: a few long strokes of cinnabar worked into the lacquer, running away from the lamp
    for (let i = 0; i < 4; i++) {
      const z = -0.5 + R() * 0.85, w = 0.3 + R() * 0.5;
      tb.box(w, 0.003, 0.007 + R() * 0.012, V3(-0.35 + R() * 0.9, 0.0018, z), {
        ...lac, col: '#140908', col2: '#34180c', hilite: 0.3, erode: 0.3, scale: 5, bump: 0.5, seed: R(),
      }, [0, (R() - 0.5) * 0.12, 0]);
      await slice();
    }
    // its front edge, and the far edge behind the lamp, both catch the flame
    tb.rbox(2.6, 0.02, 0.05, 0.008, V3(0, -0.005, 0.585), { ...lac, col: '#160a08', col2: '#4a2614', hilite: 0.4, scale: 1.4, seed: R() });
    const tableMesh = new THREE.Mesh(tb.merge(), knifeMaterial());
    tableMesh.frustumCulled = false;
    scene.add(tableMesh);
    core.addLampCasters(tableMesh);
    await slice();

    // the lacquer holds a picture: the lamp's warmth and the bottle's teal lie in it. Painted as soft decals broken by
    // the brush (a flat box lying on the table reads as a plank, whatever colour it is)
    const sheenMat = (color, k) => new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
      uniforms: { tBrush: U.tBrush, uCol: { value: new THREE.Color(color) }, uK: { value: k } },
      vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
      fragmentShader: /* glsl */`
        uniform sampler2D tBrush; uniform vec3 uCol; uniform float uK; varying vec2 vP;
        void main(){
          vec4 b = texture2D(tBrush, vP * 0.9 + 0.3);
          float r = length(vP) + (b.a - 0.5) * 0.3;
          float a = (1.0 - smoothstep(0.1, 0.5, r)) * uK * (0.55 + 0.45 * b.b);
          if (a < 0.012) discard;
          gl_FragColor = vec4(uCol * (0.85 + 0.3 * b.b), a);
        }`,
    });
    const sheen = (color, k, x, z, w, d, ry) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), sheenMat(color, k));
      m.scale.set(w, 1, d);
      m.position.set(x, 0.0028, z);
      m.rotation.y = ry;
      m.userData.castShadow = false;
      m.renderOrder = 1;
      scene.add(m);
      return m;
    };
    // the bottle standing in the lacquer, the lamp's long sheen, and the warm wash it lays toward the camera on the left
    sheen('#2c5c58', 0.5, BOTTLE_AT[0] - 0.01, BOTTLE_AT[2] + 0.16, 0.13, 0.3, 0.2);
    sheen('#b06828', 0.42, LAMP.at[0] - 0.05, LAMP.at[2] + 0.4, 0.2, 0.75, 0.12);
    sheen('#7a4526', 0.2, -0.28, 0.08, 0.6, 0.4, -0.4);
    // the room's dark lying over the left of the table, where the opening words go. One wash that thickens away from the
    // lamp, its edge and its body broken by the brush: paint, not a hole
    const washMesh = (axis) => new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
      new THREE.ShaderMaterial({
        defines: { NEAR_EDGE: axis === 'z' ? 1 : 0 },
        transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
        uniforms: { tBrush: U.tBrush },
        vertexShader: `varying vec2 vP; void main(){ vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
        fragmentShader: /* glsl */`
          uniform sampler2D tBrush; varying vec2 vP;
          void main(){
            vec4 b = texture2D(tBrush, vP * vec2(1.4, 1.1) + 0.27);
            vec4 b2 = texture2D(tBrush, vP * vec2(4.1, 3.3) + 0.63);
            // thick at the far left, gone by the bottle; the strokes eat into it, so the lacquer under it keeps its brush
            #if NEAR_EDGE
              // the near edge of the table, away from the lamp: it falls into the room's dark
              float a = smoothstep(-0.42, 0.02, vP.y + (b.a - 0.5) * 0.12) * (0.42 + 0.58 * b.b) * (0.6 + 0.4 * b2.a) * 2.1;
            #else
              float a = smoothstep(0.5, 0.1, vP.x + (b.a - 0.5) * 0.14) * (0.38 + 0.62 * b.b) * (0.6 + 0.4 * b2.a) * 1.85;
              a *= 1.0 - 0.3 * smoothstep(0.3, 0.5, abs(vP.y) + (b.b - 0.5) * 0.1);
            #endif
            if (a < 0.02) discard;
            gl_FragColor = vec4(vec3(0.042, 0.026, 0.028), min(a, 0.965));
          }`,
      }),
    );
    for (const [axis, sx, sz, x, z] of [['x', 2.9, 2.3, -0.75, -0.25], ['z', 3.2, 1.5, 0.1, 0.3]]) {
      const w = washMesh(axis);
      w.scale.set(sx, 1, sz);
      w.position.set(x, 0.0031, z);
      w.userData.castShadow = false;
      w.renderOrder = 1;
      scene.add(w);
    }
    await slice();

    // ---- the kerosene lamp, standing at the right edge of the frame: a glass fount, a brass collar, a tall chimney,
    // and the flame inside it. Everything in the scene is lit by this
    const lb = new Batch();
    const [LX, , LZ] = LAMP.at;
    const glassC = withC(C.pot, { col: '#5e6a5e', col2: '#f0f2e2', gloss: 1, hilite: 1.1, erode: 0.2 });
    const brass = withC(C.gold ?? C.lacquer, { col: '#6a4a1c', col2: '#e8bc60', gloss: 0.9, hilite: 1, erode: 0.3, scale: 8, bump: 0.7 });
    // the box it stands on: old wood, its top edge catching the flame
    lb.rbox(0.19, LAMP.base, 0.16, 0.006, V3(LX, LAMP.base / 2, LZ), withC(C.wood, { col: '#170f0a', col2: '#55301a', gloss: 0.1, hilite: 0.6, erode: 0.3, scale: 6, bump: 0.9, seed: R() }));
    lb.lathe([[0, 0], [0.055, 0], [0.075, 0.03], [0.072, 0.075], [0.044, 0.1], [0, 0.1]], V3(LX, LAMP.base, LZ), { ...glassC, col: '#4a3a24', col2: '#e0c48a', seed: R() }, 20);
    lb.lathe([[0.026, 0], [0.04, 0], [0.04, 0.03], [0.03, 0.045], [0.026, 0.045]], V3(LX, LAMP.base + 0.1, LZ), { ...brass, seed: R() }, 16);
    // the chimney: warm glass round the flame, paler above where the heat thins
    lb.lathe([[0.026, 0], [0.038, 0.03], [0.044, 0.09], [0.039, 0.12]], V3(LX, LAMP.base + 0.145, LZ), { ...glassC, col: '#b0703a', col2: '#ffe4a8', emit: 0.5, gloss: 0.6, seed: R() }, 16);
    lb.lathe([[0.039, 0], [0.032, 0.07], [0.029, 0.1], [0.026, 0.1]], V3(LX, LAMP.base + 0.265, LZ), { ...glassC, col: '#6a4526', col2: '#eab478', emit: 0.14, gloss: 0.6, seed: R() }, 16);
    // the wick's brass burner inside, and the little wheel that turns it
    lb.cyl(0.012, 0.015, 0.03, V3(LX, LAMP.base + 0.16, LZ), { ...brass, col: '#5a3a14', col2: '#c89040', seed: R() }, 10);
    lb.cyl(0.018, 0.018, 0.006, V3(LX - 0.045, LAMP.base + 0.115, LZ + 0.01), { ...brass, seed: R() }, 12, [0, 0, Math.PI / 2]);
    const lampObj = hero(lb.merge(), { rims: false, tier: 0.02 });
    scene.add(lampObj);
    core.addCasters(lampObj);
    core.addLampCasters(lampObj);
    await slice();

    // the flame itself: a drop of fire, a white-gold heart and an orange skin. It breathes on twos (update, below)
    const flame = new THREE.Mesh(
      new THREE.LatheGeometry([[0, 0], [0.008, 0.005], [0.012, 0.016], [0.011, 0.027], [0.007, 0.04], [0.003, 0.05], [0, 0.056]].map(([r, y]) => new THREE.Vector2(r, y)), 14),
      new THREE.ShaderMaterial({
        uniforms: { uFlick: { value: 1 } },
        vertexShader: `varying vec3 vN, vV; varying float vH; void main(){ vH = position.y / 0.056; vec4 mv = modelViewMatrix * vec4(position, 1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
        fragmentShader: /* glsl */`
          uniform float uFlick; varying vec3 vN, vV; varying float vH;
          void main(){
            float rim = 1.0 - abs(dot(normalize(vN), normalize(vV)));
            vec3 heart = vec3(1.7, 1.5, 1.08), gold = vec3(1.5, 0.95, 0.35), skin = vec3(1.15, 0.42, 0.1);
            vec3 col = mix(heart, gold, smoothstep(0.25, 0.7, vH));
            col = mix(col, skin, smoothstep(0.35, 0.8, rim + vH * 0.35));
            gl_FragColor = vec4(col * uFlick, 1.0);
          }`,
      }),
    );
    flame.position.set(LX, LAMP.base + 0.178, LZ);
    flame.userData.castShadow = false;
    // seen through the chimney's glass
    flame.material.depthTest = false;
    flame.renderOrder = 5;
    scene.add(flame);
    // the light the lamp gives: the painted bulb the shaders know, and its halo over what is behind it
    core.lamp(0, V3(LX, LAMP.base + 0.19, LZ), { radius: 1.25, color: '#ffb266', k: 1.9 });
    const halo = core.glow('#ff9c46', 0.15, 0.27, V3(LX, LAMP.base + 0.2, LZ), { maxScreen: 0.22, strength: 0.8 });
    // warm light lying on the table round the lamp's foot, its edge broken by the brush
    const pool = new THREE.Mesh(
      new THREE.CircleGeometry(0.42, 26).rotateX(-Math.PI / 2),
      new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
        uniforms: { tBrush: U.tBrush, uFlick: { value: 1 } },
        vertexShader: `varying vec2 vP; void main(){ vP = position.xz / 0.42; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
        fragmentShader: /* glsl */`
          uniform sampler2D tBrush; uniform float uFlick; varying vec2 vP;
          void main(){
            vec4 b = texture2D(tBrush, vP * 0.3 + 0.41);
            float r = length(vP) + (b.a - 0.5) * 0.28;
            float a = (1.0 - smoothstep(0.15, 1.0, r)) * 0.42 * uFlick;
            float inner = 1.0 - smoothstep(0.1, 0.45, r + (b.b - 0.5) * 0.22);
            if (a < 0.01) discard;
            gl_FragColor = vec4(mix(vec3(1.0, 0.62, 0.28), vec3(1.0, 0.84, 0.52), inner), a);
          }`,
      }),
    );
    pool.position.set(LX, 0.0032, LZ);
    pool.userData.castShadow = false;
    pool.renderOrder = 2;
    scene.add(pool);
    core.progress(0.45);
    await core.nextFrame();

    // ---- the bottle, just opened: the core builds it, its cap as its own thing (bottle.capOff)
    const bottle = await core.bottle();
    // NECK_Y is the one number the scent and the camera hang off, so it is checked against the bottle the core actually
    // built, every load. This is the check that was missing on 18/9, when the core started scaling every bottle by LIFE
    // and this scene went on pouring its scent out of a point 102 mm above the glass.
    {
      const main = bottle.userData.main;
      if (!main) console.warn('[mocua] nothing was measured: the bottle has no glass mesh (userData.main), so the neck height is unchecked');
      else {
        // the group's own matrix first: on the four-season page core.bottle() can come back a beat before the matrices are
        // brought up to date, and a box taken then reads the bottle at its unscaled size (184 mm) — a check that reports a
        // number that is not true is worse than no check at all
        bottle.updateMatrixWorld(true);
        const top = new THREE.Box3().setFromObject(main).max.y;
        const off = Math.abs(top - MOUTH[1]) * 1000;
        if (off > 3) console.warn(`[mocua] the scent starts ${off.toFixed(0)} mm from the neck: NECK_Y says ${(MOUTH[1] * 1000).toFixed(0)} mm, the built glass tops out at ${(top * 1000).toFixed(0)} mm. Put the measured number in NECK_Y (seasons/mocua/season.js).`);
      }
    }
    core.receiveShadows(bottle);
    core.addCasters(bottle);
    core.addLampCasters(bottle);
    // the light in the glass: the core's own highlights are hard bars this close, so they give way to softer ones, their
    // edges eaten by the brush, fading out at both ends and bending with the face of the bottle
    bottle.traverse((o) => { if (o.material?.uniforms?.tStrokes && o.material?.uniforms?.uCol) o.visible = false; });
    const glassLight = (w, h, pos, rz, k) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h, 6, 14),
        new THREE.ShaderMaterial({
          transparent: true, depthWrite: false,
          uniforms: { tBrush: U.tBrush, uCol: U.uHi, uK: { value: k }, uW: { value: w } },
          vertexShader: /* glsl */`
            uniform float uW; varying vec2 vUv;
            void main(){
              vUv = uv;
              // the face of the bottle is not flat: the light bends away with it
              vec3 p = position;
              p.z -= 1.9 * p.x * p.x + 0.35 * uW * abs(p.y) * 0.0;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
            }`,
          fragmentShader: /* glsl */`
            uniform sampler2D tBrush; uniform vec3 uCol; uniform float uK; varying vec2 vUv;
            void main(){
              vec4 b = texture2D(tBrush, vUv * vec2(1.3, 0.35) + vec2(0.2, 0.55));
              vec4 b2 = texture2D(tBrush, vUv * vec2(3.1, 0.9) + vec2(0.62, 0.11));
              float u = abs(vUv.x - 0.5) * 2.0 + (b.a - 0.5) * 0.5;
              float across = 1.0 - smoothstep(0.15, 1.0, u);            // soft at both edges
              float along = smoothstep(0.0, 0.3, vUv.y) * (1.0 - smoothstep(0.55, 1.0, vUv.y));
              float a = across * along * uK * (0.45 + 0.55 * b2.b);
              a *= 0.55 + 0.45 * b.b;                                    // broken stroke by stroke
              if (a < 0.015) discard;
              gl_FragColor = vec4(uCol * (0.9 + 0.2 * b2.a), a);
            }`,
        }),
      );
      m.position.copy(pos);
      m.rotation.z = rz;
      m.renderOrder = 6;
      bottle.add(m);
      return m;
    };
    // one long light down the front of the body, one short one along the shoulder
    glassLight(0.024, 0.115, V3(-0.031, 0.072, 0.0272), -0.05, 0.62);
    glassLight(0.04, 0.016, V3(0.006, 0.133, 0.0268), Math.PI / 2 + 0.06, 0.42);
    await slice();

    // the stopper (bottle.userData.cap): a ground-glass teardrop, pulled out a moment ago and set down on its side beside
    // the bottle, its peg turned toward the neck it came from. It rests on the widest part of the knob, so the glass really
    // touches the lacquer, and it carries its own shadow (a caster for the lamp and for the key light)
    const cap = bottle.userData.cap;
    if (cap) {
      scene.attach(cap);                       // out of the bottle, keeping its size
      // beside the bottle, at a distance that goes with the bottle's size (per unit of scale, from BOTTLE_AT)
      cap.position.set(BOTTLE_AT[0] - 0.1387 * BOTTLE_SCALE, 0, BOTTLE_AT[2] + 0.0387 * BOTTLE_SCALE);
      cap.rotation.set(0, -0.35, 1.48);         // lying on its side, the peg pointing back toward the neck it came from
      cap.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(cap);
      cap.position.y += 0.0005 - box.min.y;    // set it down on the table, not floating and not sunk
      core.addCasters(cap);
      core.addLampCasters(cap);
      // where the glass meets the lacquer: a small dark contact patch, so it reads as resting and not as pasted on
      sheen('#090607', 0.95, cap.position.x - 0.012, cap.position.z + 0.026, 0.17, 0.12, 0.45);
    }
    await slice();

    // ---- the small things: the paper test strip leaning on the glass, and a few dried peach petals
    const th = new Batch();
    const paper = withC(C.paper, { col: '#8a7454', col2: '#fbf0d4', emit: 0.22, hilite: 0.75, erode: 0.4, scale: 4.5, bump: 1 });
    // it leans on the glass, so its size and its place go with the bottle (numbers per unit of bottle scale)
    const SB = BOTTLE_SCALE;
    th.rbox(0.0135 * SB, 0.0013 * SB, 0.0968 * SB, 0.001, V3(BOTTLE_AT[0] + 0.0748 * SB, 0.0361 * SB, BOTTLE_AT[2] + 0.0323 * SB), { ...paper, seed: R() }, [-0.5, -0.5, 0.05]);
    // its wet end, where the scent was dipped, darker than the dry paper
    th.rbox(0.0135 * SB, 0.0015 * SB, 0.0258 * SB, 0.001, V3(BOTTLE_AT[0] + 0.0568 * SB, 0.0729 * SB, BOTTLE_AT[2] + 0.0090 * SB), { ...paper, col: '#6a563c', col2: '#d8c49c', emit: 0.12, seed: R() }, [-0.5, -0.5, 0.05]);
    const petal = withC(C.blossom2, { col: '#7a4248', col2: '#e8b0b0', emit: 0.02, hilite: 0.6, erode: 0.35, scale: 12, bump: 0.8 });
    for (const [x, z, ry, s] of [[-0.03, 0.2, 0.4, 1], [0.33, 0.12, -0.9, 0.85], [-0.17, 0.02, 1.8, 0.7]]) {
      th.sphere(0.018 * s, V3(x, 0.004, z), [1, 0.16, 0.66], { ...petal, seed: R() }, 10, [0, ry, 0]);
    }
    const things = hero(th.merge(), { rimW: 0.6, rimOff: 0.8, cut: 0.6 });
    scene.add(things);
    core.addCasters(things);
    core.addLampCasters(things);
    await slice();

    // ---- the scent: many thin ribbons, not one plume. They start a little off the neck's front so the bottle's shoulder
    // stays clear, spread as they climb into the lamplight, and fade out; warm ivory, never white
    const SC = [
      // [dx, dy, dz, length, w0, w1, driftX, driftZ, curl, speed, colour, opacity]
      [0.000, 0.004, 0.000, 0.44, 0.005, 0.024, 0.005, -0.004, 0.26, 0.040, '#e9cca2', 0.13],
      [0.011, 0.012, -0.006, 0.40, 0.004, 0.020, -0.004, 0.005, 0.34, 0.033, '#e0c298', 0.11],
      [-0.010, 0.018, 0.006, 0.36, 0.004, 0.017, 0.007, 0.002, 0.40, 0.028, '#d6b98e', 0.10],
      [0.015, 0.024, 0.004, 0.33, 0.004, 0.021, 0.002, -0.005, 0.30, 0.024, '#eed3a8', 0.11],
      [-0.007, 0.030, -0.008, 0.30, 0.003, 0.015, -0.007, -0.001, 0.46, 0.020, '#d0b288', 0.09],
      [0.005, 0.038, 0.002, 0.27, 0.003, 0.018, 0.004, 0.004, 0.36, 0.017, '#e6ca9e', 0.10],
      [0.018, 0.044, -0.004, 0.24, 0.003, 0.013, 0.006, 0.002, 0.42, 0.014, '#dcc094', 0.08],
      [-0.014, 0.05, 0.006, 0.21, 0.002, 0.011, -0.005, 0.004, 0.50, 0.012, '#d2b68c', 0.07],
      // four wide, very faint veils around the door (0.15 m above the neck): from the main frame they are only a warmth in
      // the air; when the camera stops inside them at the end of the push they fill the view
      [0.020, 0.09, 0.000, 0.30, 0.055, 0.20, 0.010, -0.006, 0.18, 0.010, '#e8d0a6', 0.055],
      [-0.016, 0.10, 0.010, 0.28, 0.05, 0.18, -0.008, 0.008, 0.22, 0.009, '#dcc49a', 0.05],
      [0.006, 0.12, -0.012, 0.26, 0.045, 0.17, 0.006, 0.010, 0.26, 0.008, '#f0d8ae', 0.055],
      [-0.004, 0.14, 0.004, 0.24, 0.04, 0.15, -0.006, -0.008, 0.2, 0.007, '#d6bc92', 0.045],
    ];
    core.fx.ribbonSmoke({
      // every length here is in the bottle's own metres: SCK carries the whole plume with the bottle's size
      sources: SC.map(([dx, dy, dz, len, w0, w1, drx, drz, curl, speed, color, opacity]) => ({
        at: [MOUTH[0] + dx * SCK, MOUTH[1] + dy * SCK, MOUTH[2] + dz * SCK],
        length: len * SCK, width: [w0 * SCK, w1 * SCK], rise: [dx * 0.6, 1, dz * 0.6], drift: [drx * SCK, drz * SCK], curl, speed, color, opacity, sway: 0,
      })),
      twelve: Q.get('smoke12') !== '0',
    });
    core.progress(0.7);
    await core.nextFrame();

    const fm = flame.material.uniforms.uFlick, pm = pool.material.uniforms.uFlick;
    let last = -1;
    return {
      layers: { foreground: [], middle: [things, tableMesh, lampObj], background: [wallMesh] },
      sketch: [],
      solids: [],
      movers: () => [],
      // the room's air: one slow drift that bends the scent, and the flame breathing on twos (nothing snaps, nothing flickers)
      update(t) {
        const a = 0.04 * Math.sin(t * 0.26) + 0.015 * Math.sin(t * 0.61 + 1.2);
        U.uSway.value[0].x += a;
        U.uSway.value[0].z += 0.02 * Math.sin(t * 0.19 + 0.7);
        U.uSway.value[1].x += 0.01 * Math.sin(t * 0.23);
        const step = Math.floor(t * 12);          // on twos, like the rest of the page
        if (step !== last) {
          last = step;
          const f = 0.93 + 0.07 * Math.sin(step * 1.7) + 0.04 * Math.sin(step * 0.53 + 2.1);
          fm.value = f;
          pm.value = 0.92 + (f - 0.93) * 0.8;
          flame.scale.set(1, f, 1);
          halo.scale.setScalar(0.97 + (f - 0.93) * 0.9);
        }
      },
    };
  },
};
