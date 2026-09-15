/* Weathers of the voyage. Scroll blends them directly (mixWeather), a stop jump tweens them.
   Colours are linear; sky values are radiance before exposure. Angles in degrees, lengths in metres.
   Exposure stays at 1: the cabin gets darker or brighter because its light changes, not because the camera compensates.
   Glass: rain = drops on the porthole glass, rainFlow = how fast they run, wash = green water sweeping over it.
   Outside: rainOut = falling streaks beyond the glass. Grade: sat (saturation), tint (per channel), camRoll (how much
   of the hull's roll the seated viewer's head follows). */
const BASE = {
  exposure: 1.0,
  zenith: [0.16, 0.18, 0.30], horizon: [0.95, 0.60, 0.52], skyGain: 0.55,
  sunDir: [-0.215, 0.028, -0.976], sunColor: [1.0, 0.56, 0.36], sunDisc: 5, sunGlow: 0.55, sunSize: 0.011,
  clouds: 0.42, cloudDark: 0.15, stars: 0, moon: 0,
  haze: 0.9, hazeColor: [0.86, 0.66, 0.62], fog: 0.0011,
  seaDeep: [0.030, 0.034, 0.050], seaScatter: [0.05, 0.05, 0.06], waveAmp: 0.12, chop: 0.25, foam: 0, glitter: 0.12,
  roll: 0.35, pitch: 0.12, heave: 0.008, period: 8.0, gust: 0.1,
  lampI: 0.16, flicker: 0.035,
  lightDir: [0.20, -0.52, 0.83], lightI: 1.3, lightColor: [1.0, 0.62, 0.52], shadowSoft: 5,
  fillI: 1.1, fillColor: [0.95, 0.70, 0.72],
  envI: 0.40, envSky: [0.95, 0.66, 0.62], envWarm: 0.25,
  ambI: 0.75, ambSky: [0.92, 0.70, 0.68], ambGround: [0.18, 0.11, 0.08],
  beam: 0.45, dust: 0.7, rain: 0, rainFlow: 1, rainOut: 0, wash: 0, lightning: 0, bloom: 0.40, steam: 1.0, vignette: 0.30,
  sat: 1.0, tint: [1, 1, 1], camRoll: 0.55
};
const W = (o) => Object.assign({}, BASE, o);

export const WEATHER = {
  dawn: W({}),
  haze: W({
    zenith: [0.10, 0.20, 0.42], horizon: [0.74, 0.78, 0.80], skyGain: 1.05,
    sunDir: [-0.22, 0.50, -0.84], sunColor: [1.0, 0.90, 0.76], sunDisc: 12, sunGlow: 1.0, sunSize: 0.014,
    clouds: 0.12, cloudDark: 0.0, haze: 1.0, hazeColor: [0.80, 0.84, 0.86], fog: 0.0010,
    seaDeep: [0.010, 0.050, 0.075], seaScatter: [0.02, 0.12, 0.12], waveAmp: 0.30, chop: 0.40, glitter: 0.5,
    roll: 0.6, pitch: 0.22, heave: 0.016, period: 7.4, gust: 0.1,
    lampI: 0.07, flicker: 0.03,
    lightDir: [0.28, -0.60, 0.75], lightI: 2.2, lightColor: [1.0, 0.93, 0.83], shadowSoft: 3.4,
    fillI: 2.0, fillColor: [0.86, 0.89, 0.93],
    envI: 0.62, envSky: [0.80, 0.84, 0.88], envWarm: 0.12,
    ambI: 1.15, ambSky: [0.88, 0.90, 0.94], ambGround: [0.26, 0.18, 0.12],
    beam: 0.8, dust: 1.7, bloom: 0.36, steam: 0.6, vignette: 0.22, sat: 0.9
  }),
  sun: W({
    zenith: [0.03, 0.16, 0.60], horizon: [0.36, 0.60, 0.88], skyGain: 1.25,
    sunDir: [-0.24, 0.60, -0.76], sunColor: [1.0, 0.93, 0.80], sunDisc: 40, sunGlow: 1.0, sunSize: 0.012,
    clouds: 0.20, cloudDark: 0.0, haze: 0.12, hazeColor: [0.70, 0.82, 0.94], fog: 0.00006,
    seaDeep: [0.004, 0.045, 0.085], seaScatter: [0.0, 0.16, 0.14], waveAmp: 0.45, chop: 0.55, glitter: 1.0,
    roll: 0.85, pitch: 0.30, heave: 0.022, period: 7.0, gust: 0.15,
    lampI: 0.06, flicker: 0.03,
    lightDir: [0.30, -0.62, 0.72], lightI: 2.6, lightColor: [1.0, 0.91, 0.76], shadowSoft: 1.6,
    fillI: 2.2, fillColor: [0.66, 0.80, 1.0],
    envI: 0.65, envSky: [0.62, 0.80, 1.0], envWarm: 0.12,
    ambI: 1.15, ambSky: [0.82, 0.88, 1.0], ambGround: [0.28, 0.18, 0.11],
    beam: 1.0, dust: 1.0, bloom: 0.32, steam: 0.5, vignette: 0.24, sat: 1.05
  }),
  lowcloud: W({
    zenith: [0.28, 0.31, 0.35], horizon: [0.50, 0.53, 0.55], skyGain: 0.95,
    sunDir: [-0.20, 0.60, -0.77], sunColor: [0.78, 0.80, 0.82], sunDisc: 0, sunGlow: 0.22, sunSize: 0.012,
    clouds: 1.0, cloudDark: 0.35, haze: 0.75, hazeColor: [0.52, 0.55, 0.57], fog: 0.00055,
    seaDeep: [0.012, 0.030, 0.034], seaScatter: [0.02, 0.07, 0.065], waveAmp: 0.6, chop: 0.62, foam: 0.12, glitter: 0.05,
    roll: 1.0, pitch: 0.35, heave: 0.03, period: 7.2, gust: 0.22,
    lampI: 0.15, flicker: 0.04,
    lightDir: [0.10, -0.85, 0.52], lightI: 0.5, lightColor: [0.82, 0.86, 0.90], shadowSoft: 7,
    fillI: 2.3, fillColor: [0.78, 0.82, 0.86],
    envI: 0.55, envSky: [0.60, 0.63, 0.66], envWarm: 0.2,
    ambI: 1.2, ambSky: [0.78, 0.80, 0.84], ambGround: [0.20, 0.15, 0.11],
    beam: 0, dust: 0.2, bloom: 0.28, steam: 0.7, vignette: 0.30, sat: 0.74, tint: [0.97, 1.0, 1.03]
  }),
  storm: W({
    zenith: [0.016, 0.020, 0.026], horizon: [0.060, 0.070, 0.078], skyGain: 0.55,
    sunDir: [0.10, 0.70, -0.70], sunColor: [0.50, 0.56, 0.62], sunDisc: 0, sunGlow: 0.05, sunSize: 0.012,
    clouds: 1.0, cloudDark: 1.0, haze: 0.9, hazeColor: [0.07, 0.085, 0.095], fog: 0.0014,
    seaDeep: [0.004, 0.010, 0.012], seaScatter: [0.02, 0.06, 0.055], waveAmp: 2.5, chop: 1.0, foam: 1.0, glitter: 0.02,
    roll: 3.0, pitch: 1.1, heave: 0.11, period: 6.2, gust: 0.6,
    lampI: 0.40, flicker: 0.16,
    lightDir: [0.08, -0.80, 0.60], lightI: 0.10, lightColor: [0.60, 0.72, 0.90], shadowSoft: 6,
    fillI: 0.30, fillColor: [0.45, 0.58, 0.78],
    envI: 0.10, envSky: [0.10, 0.13, 0.16], envWarm: 0.45,
    ambI: 0.10, ambSky: [0.45, 0.55, 0.70], ambGround: [0.08, 0.06, 0.04],
    beam: 0, dust: 0, rain: 1, rainFlow: 1.5, rainOut: 1, wash: 1, lightning: 1, bloom: 0.55, steam: 0.5, vignette: 0.52,
    sat: 0.6, tint: [0.86, 0.95, 1.08], camRoll: 0.8
  }),
  rain: W({
    zenith: [0.11, 0.13, 0.15], horizon: [0.27, 0.30, 0.32], skyGain: 0.8,
    sunDir: [0.0, 0.70, -0.70], sunColor: [0.60, 0.64, 0.68], sunDisc: 0, sunGlow: 0.1, sunSize: 0.012,
    clouds: 1.0, cloudDark: 0.6, haze: 0.85, hazeColor: [0.28, 0.31, 0.33], fog: 0.0009,
    seaDeep: [0.008, 0.020, 0.024], seaScatter: [0.02, 0.05, 0.05], waveAmp: 0.95, chop: 0.78, foam: 0.35, glitter: 0.03,
    roll: 1.4, pitch: 0.5, heave: 0.045, period: 6.8, gust: 0.3,
    lampI: 0.26, flicker: 0.06,
    lightDir: [0.05, -0.85, 0.52], lightI: 0.3, lightColor: [0.72, 0.78, 0.86], shadowSoft: 7,
    fillI: 1.15, fillColor: [0.62, 0.70, 0.80],
    envI: 0.3, envSky: [0.30, 0.34, 0.38], envWarm: 0.35,
    ambI: 0.55, ambSky: [0.60, 0.66, 0.74], ambGround: [0.12, 0.09, 0.07],
    beam: 0, dust: 0, rain: 0.85, rainFlow: 1.0, rainOut: 0.75, bloom: 0.40, steam: 0.6, vignette: 0.38,
    sat: 0.72, tint: [0.94, 0.98, 1.03], camRoll: 0.6
  }),
  dust: W({
    zenith: [0.30, 0.25, 0.17], horizon: [0.95, 0.64, 0.33], skyGain: 1.05,
    sunDir: [-0.26, 0.42, -0.87], sunColor: [1.0, 0.60, 0.28], sunDisc: 7, sunGlow: 1.2, sunSize: 0.017,
    clouds: 0.08, cloudDark: 0.0, haze: 1.0, hazeColor: [0.86, 0.57, 0.29], fog: 0.0018,
    seaDeep: [0.030, 0.040, 0.035], seaScatter: [0.08, 0.10, 0.06], waveAmp: 0.7, chop: 0.8, foam: 0.22, glitter: 0.35,
    roll: 1.1, pitch: 0.38, heave: 0.03, period: 6.6, gust: 0.5,
    lampI: 0.08, flicker: 0.05,
    lightDir: [0.26, -0.58, 0.77], lightI: 2.2, lightColor: [1.0, 0.70, 0.40], shadowSoft: 3.8,
    fillI: 2.0, fillColor: [1.0, 0.74, 0.46],
    envI: 0.55, envSky: [0.95, 0.68, 0.40], envWarm: 0.3,
    ambI: 1.0, ambSky: [1.0, 0.78, 0.52], ambGround: [0.30, 0.18, 0.09],
    beam: 1.3, dust: 2.8, bloom: 0.40, steam: 0.4, vignette: 0.32, sat: 0.88, tint: [1.06, 0.98, 0.84], camRoll: 0.6
  }),
  night: W({
    zenith: [0.0035, 0.006, 0.016], horizon: [0.016, 0.026, 0.048], skyGain: 1.0,
    sunDir: [0.36, 0.10, -0.93], sunColor: [0.78, 0.86, 1.0], sunDisc: 1.5, sunGlow: 0.05, sunSize: 0.0085,
    clouds: 0.22, cloudDark: 0.65, stars: 1, moon: 1,
    haze: 0.25, hazeColor: [0.02, 0.03, 0.05], fog: 0.00012,
    seaDeep: [0.0008, 0.002, 0.005], seaScatter: [0.0, 0.004, 0.008], waveAmp: 0.32, chop: 0.5, glitter: 0.3,
    roll: 0.6, pitch: 0.22, heave: 0.018, period: 7.6, gust: 0.12,
    lampI: 0.42, flicker: 0.05,
    lightDir: [-0.20, -0.55, 0.81], lightI: 0.16, lightColor: [0.52, 0.66, 1.0], shadowSoft: 2.5,
    fillI: 0.05, fillColor: [0.40, 0.52, 0.90],
    envI: 0.05, envSky: [0.05, 0.07, 0.12], envWarm: 0.8,
    ambI: 0.035, ambSky: [0.45, 0.50, 0.70], ambGround: [0.08, 0.05, 0.03],
    beam: 0.12, dust: 0.3, bloom: 0.62, steam: 0.45, vignette: 0.46, sat: 0.85, tint: [0.94, 0.97, 1.05]
  }),
  dusk: W({
    zenith: [0.06, 0.06, 0.18], horizon: [1.10, 0.44, 0.24], skyGain: 0.7,
    sunDir: [0.36, 0.035, -0.93], sunColor: [1.0, 0.42, 0.20], sunDisc: 3.2, sunGlow: 0.55, sunSize: 0.015,
    clouds: 0.38, cloudDark: 0.1, haze: 0.7, hazeColor: [0.90, 0.50, 0.38], fog: 0.0007,
    seaDeep: [0.020, 0.020, 0.040], seaScatter: [0.05, 0.03, 0.05], waveAmp: 0.22, chop: 0.35, glitter: 0.2,
    roll: 0.45, pitch: 0.16, heave: 0.010, period: 8.2, gust: 0.08,
    lampI: 0.24, flicker: 0.04,
    lightDir: [-0.22, -0.56, 0.80], lightI: 1.5, lightColor: [1.0, 0.55, 0.32], shadowSoft: 4,
    fillI: 1.2, fillColor: [1.0, 0.62, 0.52],
    envI: 0.38, envSky: [1.0, 0.60, 0.45], envWarm: 0.5,
    ambI: 0.6, ambSky: [0.95, 0.66, 0.60], ambGround: [0.20, 0.12, 0.08],
    beam: 0.15, dust: 0.8, bloom: 0.42, steam: 0.9, vignette: 0.34, tint: [1.04, 0.97, 0.93]
  })
};
// Dawn after the squall at Belawan: the same light, glass still beaded, drops barely moving.
WEATHER.dawnWet = W(Object.assign({}, WEATHER.dawn, { rain: 0.42, rainFlow: 0.12, haze: 1.0, fog: 0.0014, sat: 0.94, clouds: 0.55 }));

export function cloneWeather(w) {
  const o = {};
  for (const k in w) o[k] = Array.isArray(w[k]) ? w[k].slice() : w[k];
  return o;
}

export function mixWeather(out, a, b, t) {
  for (const k in a) {
    const va = a[k], vb = b[k];
    if (Array.isArray(va)) { for (let i = 0; i < va.length; i++) out[k][i] = va[i] + (vb[i] - va[i]) * t; }
    else out[k] = va + (vb - va) * t;
  }
  return out;
}
