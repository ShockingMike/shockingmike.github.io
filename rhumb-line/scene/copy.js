/* Rhumb Line · scene/copy.js
   The only words printed on 3D objects (chart sheets, tags, plate, labels). Every string is approved copy from
   docs/content/rhumb-line-copy.md, keyed as there. Do not add words here that are not in that file. */
export const COPY = {
  'hero.wordmark': 'RHUMB LINE',
  'hero.sub': 'Coffee Roasters',
  'port.name': 'Merrowick',
  'port.coordinates': '44°48′N 62°37′W',
  'hero.chartTitle': 'Approaches to Merrowick Harbour',
  'hero.chartNote': 'Soundings in metres. Surveyed 1911, revised 2026.',
  'hero.distanceUnit': 'nmi',
  'voyage.chartTitle': 'Six origins, one voyage',
  'voyage.legLabel': 'Leg {n} of 6',
  'voyage.logLabel': 'Ship’s log',
  'chest.label': 'Sample chest',
  'quiz.label': 'The crew list',
  'footer.newsletterHeading': 'Tide tables and new origins',
  origins: {
    guatemala: { name: 'Huehuetenango, Guatemala', port: 'Santo Tomás de Castilla, Guatemala', portCoords: '15°41′N 88°37′W' },
    colombia: { name: 'Huila, Colombia', port: 'Cartagena, Colombia', portCoords: '10°24′N 75°32′W' },
    brazil: { name: 'Mogiana, Brazil', port: 'Santos, Brazil', portCoords: '23°59′S 46°18′W' },
    kenya: { name: 'Nyeri, Kenya', port: 'Mombasa, Kenya', portCoords: '4°03′S 39°39′E' },
    ethiopia: { name: 'Yirgacheffe, Ethiopia', port: 'Djibouti, Republic of Djibouti', portCoords: '11°36′N 43°08′E' },
    sumatra: { name: 'Gayo, Sumatra', port: 'Belawan, Sumatra, Indonesia', portCoords: '3°47′N 98°41′E' }
  }
};

/* "Santo Tomás de Castilla, Guatemala" -> ['Santo Tomás de Castilla', 'Guatemala'] (first comma only). */
export function splitFirst(s) {
  const i = s.indexOf(',');
  return i < 0 ? [s, ''] : [s.slice(0, i).trim(), s.slice(i + 1).trim()];
}
