/* records.js — the seven records: numbers, links, art, colours. Words live in copy.js.
   Chớm went live on 22/9 (https://shockingmike.github.io/chom/, Vietnamese only); its clip and still were captured from the live page.
   Studio Kōzō opens with its own site (https://shockingmike.github.io/kozo/, English only). Its clip, still and art were
   captured from the build Mike approved on 30/9 (p11b), at the page's top quality step: day castle → dusk → ink bleeding
   into the terraces, then the shoji turning into the map of the studio's work. The sleeve is the last chapter (the castle
   at night, every layer lit, the plot staked out) printed in sumi and rokushō; the open view is the site's night.
   Blind Alley Pictures opens with its own site (https://shockingmike.github.io/blind-alley/, English only). Its clip, still
   and art were captured from the live page: the cut-paper title, the cigarette lighting the office, the glass breaking
   onto the rain street, the editing bench. The sleeve is a scene of the film printed in the studio's own ink and red on
   its paper; the open view is the film's ink-dark night, and the disc is pressed in red.
   Order on the shelf (Mike, 9/10): newest first, so the latest site opens the crate; records still sealed come
   after the released ones. The SMR numbers stay the order they were made in.
   `sleeve` = the house sleeve's colours: paper (board), ink, accent (second ink of the halftone), foil (title stamped in foil).
   `theme` = the open view: one flat colour that fills the whole screen behind the record (Stripe Press), and the
   colour of the words on it. The colour is far from the sleeve's own board, so the sleeve stands off it. */

export const RECORDS = [
  {
    id: 'blind', cat: 'SMR 007', name: 'Blind Alley Pictures',
    url: 'https://shockingmike.github.io/blind-alley/', video: 'media/blind-alley.mp4', poster: 'media/blind-alley.jpg',
    art: 'media/art-blind.jpg', pick: 'custom',
    sleeve: { paper: '#f3dcd6', ink: '#17131a', accent: '#ff1f4f', foil: true, sub: 'Animation studio' },
    theme: { bg: '#17131a', bg2: '#17131a', fg: '#f3dcd6' },
    disc: { vinyl: '#c4123c', label: '#17131a', labelInk: '#f3dcd6' }
  },
  {
    id: 'kozo', cat: 'SMR 004', name: 'Studio Kōzō',
    url: 'https://shockingmike.github.io/kozo/', video: 'media/kozo.mp4', poster: 'media/kozo.jpg',
    art: 'media/art-kozo.jpg', pick: 'custom',
    sleeve: { paper: '#e4e2da', ink: '#1c2420', accent: '#3e9a80', foil: true, sub: 'Architecture studio' },
    theme: { bg: '#12261e', bg2: '#12261e', fg: '#e2eee8' },
    disc: { vinyl: '#2f7a64', label: '#e4e2da', labelInk: '#1c2420' }
  },
  {
    id: 'chom', cat: 'SMR 003', name: 'Chớm',
    url: 'https://shockingmike.github.io/chom/', video: 'media/chom.mp4', poster: 'media/chom.jpg',
    art: 'media/art-chom.jpg', pick: 'custom',
    sleeve: { paper: '#efe6da', ink: '#3a2030', accent: '#c2454c', foil: true, sub: 'Hanoi perfumery' },
    theme: { bg: '#4a1f2b', bg2: '#4a1f2b', fg: '#f6e8e0' },
    disc: { vinyl: '#8e2f3c', label: '#efe6da', labelInk: '#3a2030' }
  },
  {
    id: 'rhumb', cat: 'SMR 002', name: 'Rhumb Line',
    url: 'https://shockingmike.github.io/rhumb-line/',
    video: 'media/rhumb-line.mp4', poster: 'media/rhumb-line.jpg',
    art: 'media/art-rhumb.jpg', pick: 'advanced',
    sleeve: { paper: '#e8dcc0', ink: '#1e2a35', accent: '#b8862e', foil: true, sub: 'Coffee roasters', paper2: '#e8dcc0' },
    theme: { bg: '#15313a', bg2: '#15313a', fg: '#f0e3c8' },
    disc: { vinyl: '#7c4f27', label: '#e8dcc0', labelInk: '#1e2a35' }
  },
  {
    id: 'kern', cat: 'SMR 001', name: 'Kern Society',
    url: 'https://shockingmike.github.io/kern-society/',
    video: 'media/kern-society.mp4', poster: 'media/kern-society.jpg',
    art: 'media/art-kern.jpg', pick: 'standard',
    sleeve: { paper: '#e9e4d8', ink: '#141416', accent: '#3a4dd0', foil: true, sub: 'Independent type foundry' },
    theme: { bg: '#232a5e', bg2: '#232a5e', fg: '#efeade' },
    disc: { vinyl: '#0c0c0e', label: '#e9e4d8', labelInk: '#141416' }
  },
  {
    id: 'hadal', cat: 'SMR 005', name: 'Hadal', sealed: true,
    sleeve: { paper: '#0f2029', ink: '#c3e6ea', accent: '#c3e6ea', foil: true, sub: 'Oceanography institute' },
    theme: { bg: '#cfe3e0', bg2: '#cfe3e0', fg: '#10222a' }
  },
  {
    id: 'perihelion', cat: 'SMR 006', name: 'Perihelion', sealed: true,
    sleeve: { paper: '#1b1a21', ink: '#e6d7b3', accent: '#e6d7b3', foil: true, sub: 'Space travel' },
    theme: { bg: '#e2d6ba', bg2: '#e2d6ba', fg: '#1a1720' }
  }
];

export const byId = (id) => RECORDS.find((r) => r.id === id);
