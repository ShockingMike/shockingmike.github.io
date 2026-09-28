// Keeps a WebGL page smooth on ordinary laptops (no graphics card) and phones.
// It guesses a starting quality step from the GPU's name, then watches real frame times and steps quality down
// whenever frames get slow. Steps: 0 full · 1 lighter · 2 light · 3 lightest. Never steps back up, so it can't flicker.
// Force a step with ?q=0..3 in the URL (for testing).

export function gpuInfo() {
  let name = '';
  try {
    const c = document.createElement('canvas'), gl = c.getContext('webgl2') || c.getContext('webgl');
    const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
    name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : (gl ? gl.getParameter(gl.RENDERER) : '');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch (e) { /* no webgl */ }
  const soft = /SwiftShader|llvmpipe|softpipe|Basic Render|Microsoft Basic/i.test(name);
  const mobile = navigator.userAgentData?.mobile ?? /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  // integrated graphics: Intel HD/UHD/Iris, AMD APUs ("Radeon(TM) Graphics", "Vega 8 Graphics"), phone GPUs
  const integrated = /Intel|UHD|Iris|HD Graphics|Radeon\(TM\) Graphics|Radeon Graphics|Vega \d+ Graphics|Mali|Adreno|PowerVR|Apple GPU/i.test(name);
  return { name, soft, mobile, integrated };
}

export function makeGovernor({ onChange, start } = {}) {
  const q = new URLSearchParams(location.search);
  const forced = q.has('q') ? Math.max(0, Math.min(3, +q.get('q'))) : null;
  const info = gpuInfo();
  let tier = forced ?? start ?? (info.soft ? 3 : info.integrated || info.mobile ? 1 : 0);
  const win = [];
  let settle = 30;                 // frames to ignore after loading or after a change (shader compiles, texture uploads)
  window.__tier = tier; window.__gpu = info.name;
  const set = (t) => { tier = Math.min(3, t); window.__tier = tier; win.length = 0; settle = 30; onChange?.(tier); };
  return {
    info,
    get tier() { return tier; },
    // call once per animation frame with the time since the last one, in milliseconds
    tick(ms) {
      if (forced !== null || tier >= 3 || document.hidden) return;
      if (settle > 0) { settle--; return; }
      if (ms > 250) return;         // a tab switch or a debugger pause, not a slow frame
      win.push(ms); if (win.length < 30) return;
      const s = [...win].sort((a, b) => a - b), med = s[15], p75 = s[22];
      win.length = 0;
      // below ~45 fps most of the time, or a quarter of frames dropped: one step lighter (two if it's really struggling)
      if (med > 40) set(tier + 2); else if (med > 22 || p75 > 30) set(tier + 1);
    },
  };
}
