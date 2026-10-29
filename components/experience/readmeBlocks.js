// Turns the profile README (mostly HTML) into plain blocks the monitor can paint on a canvas:
//   { type: 'h', level, text } | { type: 'li', text } | { type: 'row', cells } | { type: 'p', text }
// Only text survives, so nothing in the README can ever run or be parsed again.
const HEADING = '\u0001H';
const ITEM = '\u0001L';
const ROW = '\u0001R';
const CELL = '\u0002';

const ENTITIES = [[/&nbsp;/g, ' '], [/&lt;/g, '<'], [/&gt;/g, '>'], [/&quot;/g, '"'], [/&#39;|&apos;/g, "'"], [/&amp;/g, '&']];
const tidy = (text) => ENTITIES.reduce((out, [pattern, to]) => out.replace(pattern, to), text).replace(/\s+/g, ' ').trim();

export function readmeBlocks(html) {
  const marked = String(html ?? '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '')
    .replace(/<(img|hr)\b[^>]*>/gi, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<h([1-6])\b[^>]*>/gi, `\n${HEADING}$1`)
    .replace(/<li\b[^>]*>/gi, `\n${ITEM}`)
    .replace(/<tr\b[^>]*>/gi, `\n${ROW}`)
    .replace(/<t[dh]\b[^>]*>/gi, CELL)
    .replace(/<\/?(p|div|ul|ol|table|tbody|thead|details|summary|h[1-6]|li|tr)\b[^>]*>/gi, '\n')
    .replace(/<\/?[a-z][^>]*>/gi, ''); // real tags only: a bare "<" ("<3", "a < b") is text

  const blocks = [];
  for (const raw of marked.split('\n')) {
    const line = raw.trim();
    if (line.startsWith(HEADING)) {
      const text = tidy(line.slice(HEADING.length + 1));
      if (text) blocks.push({ type: 'h', level: Number(line[HEADING.length]), text });
    } else if (line.startsWith(ITEM)) {
      const text = tidy(line.slice(ITEM.length));
      if (text) blocks.push({ type: 'li', text });
    } else if (line.startsWith(ROW)) {
      const cells = line.slice(ROW.length).split(CELL).map(tidy).filter(Boolean);
      if (cells.length) blocks.push({ type: 'row', cells });
    } else if (tidy(line.replaceAll(CELL, ' '))) {
      blocks.push({ type: 'p', text: tidy(line.replaceAll(CELL, ' ')) });
    }
  }
  return blocks;
}
