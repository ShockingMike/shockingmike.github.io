// Chớm world, core: the quality steps (README section 16). Keeps the page smooth on an ordinary office laptop (graphics
// built into the processor) without making it blurry and without ever stopping anything that moves.
//
// Five steps. Step 0 is the page exactly as Mike approved it; each step after it takes away the dearest thing first and
// the picture's size last:
//   1  the edges smoothed with 2 samples instead of 4, the beams walked in fewer steps          (the picture: the same)
//   2  the sun's shadow map and the lamps' at half size, the beams at a quarter size and fewer steps
//   3  as 2, and the scene drawn at 0.85 of the screen, sharpened on the way up
//   4  as 3, the scene at 0.7 of the screen (never less), sharpened a little more
// The edges keep 2 samples down to the last step. Without them the thin coloured rims round every figure break into
// stairs, and drawn smaller and sharpened those stairs are what the eye sees first (compared at 3x, 28/9); 2 samples
// cost 10–25% of the frame on the RTX 3060 at the lighter steps, and that was judged worth it.
// What never changes: the words and the page layer (plain HTML, always sharp), every motion (people, crowd, smoke, wind,
// rain, the boil of the bottle's line), the frames per second the scene is animated at.
//
// Which step: a first guess from the name of the graphics chip (a built-in chip starts one step down), then the real frame
// times: slow frames step it down, it never steps back up (so it cannot flicker). ?q=0..4 forces a step (for testing).
// A software renderer (no graphics chip at all) cannot draw this page at any step: the four-season page shows the reading
// version instead (core/journey.js).

export const TIERS = [
  { scale: 1, msaa: 4, sun: 2048, lamp: 1, shaftSteps: 40, shaftDiv: 2, sharpen: 0 },
  { scale: 1, msaa: 2, sun: 2048, lamp: 1, shaftSteps: 28, shaftDiv: 2, sharpen: 0 },
  { scale: 1, msaa: 2, sun: 1024, lamp: 0.5, shaftSteps: 20, shaftDiv: 4, sharpen: 0 },
  { scale: 0.85, msaa: 2, sun: 1024, lamp: 0.5, shaftSteps: 20, shaftDiv: 4, sharpen: 0.35 },
  { scale: 0.7, msaa: 2, sun: 1024, lamp: 0.5, shaftSteps: 16, shaftDiv: 4, sharpen: 0.5 },
];
export const TOP = TIERS.length - 1;

// The scene is never drawn at less than 0.7 of the screen's own pixels (and never at more than step 0 draws it).
export const MIN_OF_SCREEN = 0.7;

// the chip's name, from a context that already exists (making one just to ask costs a moment and a context)
export function gpuInfo(gl) {
  let name = '';
  try {
    const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
    name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : (gl ? gl.getParameter(gl.RENDERER) : '');
  } catch (e) { /* no webgl */ }
  name = String(name || '');
  const soft = /SwiftShader|llvmpipe|softpipe|Basic Render|Microsoft Basic|Software Rasterizer/i.test(name);
  const mobile = (typeof navigator !== 'undefined') && (navigator.userAgentData?.mobile ?? /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent));
  // built-in graphics: Intel HD/UHD/Iris, AMD APUs ("Radeon(TM) Graphics", "Vega 8 Graphics"), phone chips
  const integrated = /Intel|UHD|Iris|HD Graphics|Radeon\(TM\) Graphics|Radeon Graphics|Vega \d+ Graphics|Mali|Adreno|PowerVR|Apple GPU/i.test(name);
  return { name, soft, mobile, integrated };
}

// ?q=0..4 from the address, or null
export function forcedTier(params = new URLSearchParams(location.search)) {
  if (!params.has('q')) return null;
  const q = Math.round(+params.get('q'));
  return Number.isFinite(q) ? Math.max(0, Math.min(TOP, q)) : null;
}

export function firstTier(info) {
  return info.soft ? TOP : (info.integrated || info.mobile ? 1 : 0);
}

// Watches the page's frame times and steps down when they are slow. tick(ms, { building }) once per frame.
// While seasons are still being built behind the page, each frame may also carry a slice of that building (6–24 ms),
// so a frame of 25 ms says little about the drawing: then only a page held under ~33 frames a second counts, and never
// two steps at once. (Measured 28/9 on the RTX 3060: every window of the whole load held 60 a second, so this costs a
// strong machine nothing; a machine that cannot keep 33 while it loads steps down before the load is over.) Once everything is built the ordinary rule holds: below ~45 per second on average, or a quarter of the frames
// dropped, is one step down (two when it is far below).
// A window that is only somewhat slow must be followed by a second one before the step goes down: one hiccup of half a
// second (another program, a tab switch, the browser tidying its memory) must not cost a strong machine its picture for
// good, since the step never comes back up. A window far too slow (median over 40 ms) steps at once.
export function makeGovernor({ onChange, start = 0, forced = null } = {}) {
  let tier = forced ?? start;
  const win = [];
  let settle = 45;                 // frames not counted after a start or a change (shaders, targets being remade)
  let strikes = 0;
  const set = (t) => {
    const n = Math.max(0, Math.min(TOP, t));
    if (n === tier) return;
    tier = n; win.length = 0; settle = 45; strikes = 0;
    try { onChange?.(tier); } catch (e) { console.error(e); }
  };
  return {
    get tier() { return tier; },
    get forced() { return forced !== null; },
    set,
    // how many frames it is waiting for (a check can wait for it)
    get settling() { return settle; },
    reset() { win.length = 0; settle = Math.max(settle, 20); },
    tick(ms, { building = false } = {}) {
      if (forced !== null || tier >= TOP) return;
      if (typeof document !== 'undefined' && document.hidden) { win.length = 0; return; }
      if (settle > 0) { settle--; return; }
      if (!(ms > 0) || ms > 250) return;         // a tab switch, a debugger, a page that was busy elsewhere
      win.push(ms);
      if (win.length < 30) return;
      const s = [...win].sort((a, b) => a - b), med = s[15], p75 = s[22];
      // (the mean as well as the middle: a browser not held to the screen's refresh — a measuring run with vsync off —
      // hands over frames in bursts, many of 0.3 ms and a few long ones; the middle and the 75th of those say "slow"
      // while the page is running at 300 frames a second. The mean does not lie about that.)
      const mean = s.reduce((a, b) => a + b, 0) / s.length;
      win.length = 0;
      const slow = building ? med > 30 && mean > 30 : mean > 22 || (p75 > 30 && mean > 18);
      if (!building && mean > 40 && med > 40) { set(tier + 2); return; }
      strikes = slow ? strikes + 1 : 0;
      if (strikes >= 2) set(tier + 1);
    },
  };
}
