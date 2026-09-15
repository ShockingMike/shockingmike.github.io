/* Cabin layout in metres. Cabin space: table top at y = 0, x to the right, z towards the viewer.
   The hull wall with the portholes is the plane z = wallZ, parallel to the ship's fore-and-aft (x) axis.
   The desk is composed like a product shot: charts and the sample chest along the back, the compass, the letter, the
   crew list and the log along the front, the lamp over the middle. Two chart sheets lie on the table: the voyage
   (ocean) sheet, and the harbour sheet on top of it, which rolls up to the left to uncover the ocean. Nothing rests on
   the sheets, and every object leaves room for its own movement (the log's cover, the compass lid, the letter's flap). */
export const LAYOUT = {
  wallZ: -0.62,
  table: { x0: -0.9, x1: 0.9, z0: -0.60, z1: 0.32, t: 0.05, railH: 0.034, railT: 0.022 },
  portholes: [{ x: -0.30, y: 0.50 }, { x: 0.52, y: 0.50 }],
  lampPivot: [0.10, 1.02, -0.30],
  chart: { x: -0.18, z: -0.26, w: 0.52, h: 0.52 / 1.4, yaw: -0.05 },
  ocean: { x: -0.168, z: -0.25, w: 0.52, h: 0.52 / 1.4, yaw: -0.02 },
  compass: { x: -0.42, z: 0.10 },
  pencil: { x: -0.19, z: -0.036, yaw: 0.06 },
  dividers: { x: -0.69, z: -0.15, yaw: 0.85 },
  cup: { x: 0.66, z: -0.10 },
  box: { x: 0.34, z: -0.30, yaw: 0.08, scale: 1.2 },
  logbook: { x: 0.46, z: 0.085, yaw: -0.25 },
  slip: { x: 0.12, z: 0.13, yaw: 0.12 },
  letter: { x: -0.15, z: 0.12, yaw: -0.08 },
  // dressing (lib/decor.js), clear of every pickable object and its movement; wall items: x, y on the hull wall;
  // deck items stand on the deck in front of the table
  decor: {
    sextant: { x: -0.74, z: -0.44, yaw: 0.55 },
    binoculars: { x: -0.765, z: 0.01, yaw: -0.35 },
    magnifier: { x: -0.7, z: 0.235, yaw: 0.9 },
    hourglass: { x: 0.108, z: -0.525 },
    inkwell: { x: 0.79, z: 0.2 },
    grinder: { x: 0.775, z: -0.44, yaw: -0.4 },
    // wall: close enough to the portholes to stay whole in the phone's narrower frame
    // s: scale (the instruments are a little smaller than first built, to leave room for the sample cabinets)
    clock: { x: -0.58, y: 0.57, s: 0.8 },
    barometer: { x: 0.8, y: 0.55, s: 0.8 },
    shelf: { x: -0.6, y: 0.285 },
    // deck: just in front of the table, under its edge (below the frame at the desktop seat, filling the phone's floor)
    sack: { x: -0.46, z: 0.5, yaw: 0.4 },
    rope: { x: 0.02, z: 0.56 },
    crate: { x: 0.5, z: 0.47, yaw: -0.2 }
  },
  // sample cabinets (lib/cabinets.js), 0.46 m wide, standing on the deck against the hull wall beyond the table's ends,
  // in front of the wall's rib and frame
  // tuck: the lower body (below the counter ledge) is this much narrower on the table's side, so the upper shelves can
  // stand over the table's end while the drawers and the bay stay clear of its rail
  // (the seat is a little right of centre, so the left cabinet stands further in to show as much as the right one)
  cabinets: { floor: -0.76, z: -0.565, left: { x: -1.06, tuck: 0.1 }, right: { x: 1.115, tuck: 0.04 } },
  seaY: -2.7,
  pivot: [0, -2.6, 1.6]
};

/* A point on a sheet (u right, v down from the far edge) in cabin space. */
export function sheetPoint(S, u, v) {
  const dx = (u - 0.5) * S.w, dz = (v - 0.5) * S.h;
  const c = Math.cos(S.yaw), s = Math.sin(S.yaw);
  return { x: S.x + dx * c + dz * s, z: S.z - dx * s + dz * c };
}
export const chartPoint = (u, v) => sheetPoint(LAYOUT.chart, u, v);
