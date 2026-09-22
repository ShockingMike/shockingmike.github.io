// Chớm page layer: every copy of a painted drawing keeps its own ids.
// Each drawing in logo.js carries three ids of its own (the blur that bleeds the ink, the group of centre lines, the
// mask the hand writes through) and points at them with url(#…) and href="#…". The same drawing is written into the
// page more than once: the name in the opening room and on the waiting screen, each season word on its card and on
// the bottle's card. A browser resolves url(#id) to the FIRST element in the document with that id, so one copy's
// writing was steered by another copy's mask (21/9: 15 ids on the page were there two or three times over).
// So each copy is given ids of its own on the way in, and everything inside it that pointed at the old ones is
// pointed at the new ones. page/qa/page-check.mjs fails if any id on the page is there twice.
let copies = 0;

export function ownIds(svg) {
  if (!svg || !svg.querySelectorAll) return svg;
  const tag = `-c${++copies}`;
  const renamed = new Map();
  for (const el of svg.querySelectorAll('[id]')) {
    renamed.set(el.id, el.id + tag);
    el.id += tag;
  }
  if (!renamed.size) return svg;
  const repoint = (value) => value
    .replace(/url\(\s*#([^)\s]+)\s*\)/g, (m, id) => (renamed.has(id) ? `url(#${renamed.get(id)})` : m))
    .replace(/^#(.+)$/, (m, id) => (renamed.has(id) ? `#${renamed.get(id)}` : m));
  for (const el of [svg, ...svg.querySelectorAll('*')]) {
    for (const a of [...el.attributes]) {
      if (!a.value.includes('#')) continue;
      const next = repoint(a.value);
      if (next !== a.value) el.setAttributeNS(a.namespaceURI, a.name, next);
    }
  }
  return svg;
}
