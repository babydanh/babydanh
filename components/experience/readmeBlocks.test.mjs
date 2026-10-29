import test from 'node:test';
import assert from 'node:assert/strict';
import { readmeBlocks } from './readmeBlocks.js';

test('headings keep their level and drop inline tags', () => {
  assert.deepEqual(readmeBlocks('<h2 align="center">About <b>Me</b></h2><h3>Minecraft</h3>'), [
    { type: 'h', level: 2, text: 'About Me' },
    { type: 'h', level: 3, text: 'Minecraft' },
  ]);
});

test('list items become bullets with links, bold text and entities flattened', () => {
  const html = '<ul><li>🎓 <b>IT Student</b> @ <a href="https://x.dev">HUFLIT</a> &amp; more</li><li>Second&nbsp;item</li></ul>';
  assert.deepEqual(readmeBlocks(html), [
    { type: 'li', text: '🎓 IT Student @ HUFLIT & more' },
    { type: 'li', text: 'Second item' },
  ]);
});

test('table rows become rows of cells, and rows with no text are dropped', () => {
  const html = '<table><tr><td><b>Sporto</b></td><td>Pickleball platform</td><td>Next.js</td></tr><tr><td><img src="a.svg"></td><td><img src="b.svg"></td></tr></table>';
  assert.deepEqual(readmeBlocks(html), [{ type: 'row', cells: ['Sporto', 'Pickleball platform', 'Next.js'] }]);
});

test('a list inside a table cell still reads as bullets', () => {
  const html = '<table><tr><td><ul><li>One</li><li>Two</li></ul></td><td><img src="s.png"></td></tr></table>';
  assert.deepEqual(readmeBlocks(html), [{ type: 'li', text: 'One' }, { type: 'li', text: 'Two' }]);
});

test('paragraphs and line breaks read as text; images, rules, comments, scripts and styles vanish', () => {
  const html = '<!-- note --><p align="center"><b>A Full-Stack Developer</b><br>From Vietnam</p><hr><img src="x.png"><script>alert(1)</script><style>p{}</style>';
  assert.deepEqual(readmeBlocks(html), [{ type: 'p', text: 'A Full-Stack Developer From Vietnam' }]);
});

test('markdown-free input of plain text and empty input are safe', () => {
  assert.deepEqual(readmeBlocks(''), []);
  assert.deepEqual(readmeBlocks('just text'), [{ type: 'p', text: 'just text' }]);
});

test('text that looks like markup is never kept as markup', () => {
  const [block] = readmeBlocks('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
  assert.equal(block.text, '<script>alert(1)</script>'); // plain text drawn on a canvas, not parsed again
});

test('a bare "<" in text is kept and does not swallow what follows', () => {
  const blocks = readmeBlocks('<h2>My Snake Contribution <3</h2>\n<picture><source srcset="x"></picture>\n<p>a < b and <b>more</b></p>');
  assert.deepEqual(blocks.map((b) => b.text), ['My Snake Contribution <3', 'a < b and more']);
});
