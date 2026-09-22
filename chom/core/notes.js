// Chớm world, core: the bottle's notes panel words, from the shared copy (the ids of docs/content/chom-copy.md / chom-copy-vi.md).
//   notesFromCopy(C, id, lang) -> notes for fillNotes, or null when the copy has no such season
//   loadCopy() -> { en, vi } from window.CHOM_COPY (the page layer's), else page/copy.js if it exists, else null
export function notesFromCopy(C, id, l) {
  if (!C) return null;
  const k = (key) => C[key] ?? key.split('.').reduce((o, x) => (o ? o[x] : undefined), C);
  const name = k(`season.${id}.name`);
  if (!name) return null;
  return {
    name, english: k(`season.${id}.english`), opener: k(`season.${id}.opener`),
    top: k(`season.${id}.top`), heart: k(`season.${id}.heart`), base: k(`season.${id}.base`), memory: k(`season.${id}.memory`),
    labels: { top: k('notes.top') ?? 'Top', heart: k('notes.heart') ?? 'Heart', base: k('notes.base') ?? 'Base' },
    close: k('a11y.close') ?? (l === 'vi' ? 'Đóng' : 'Close'),
    bottleLabel: k(`a11y.bottle.${id}`) ?? `${k(`nav.${id}Aria`) ?? name}${l === 'vi' ? ': mở phần giới thiệu mùi' : ': open its notes'}`,
  };
}

let fileCopy;
export async function loadCopy() {
  if (window.CHOM_COPY) return window.CHOM_COPY;
  if (fileCopy !== undefined) return fileCopy;
  fileCopy = null;
  try {
    const res = await fetch(new URL('../page/copy.js', import.meta.url), { method: 'HEAD' });
    if (res.ok) fileCopy = (await import('../page/copy.js')).COPY ?? null;
  } catch (e) { fileCopy = null; }
  return fileCopy;
}
