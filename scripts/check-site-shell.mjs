import fs from 'node:fs';
import {fileURLToPath} from 'node:url';

const dist = new URL('../dist/', import.meta.url);
const pages = ['index.html', 'colours.html', 'colour-lab.html', 'book.html', 'workshop.html', 'object-lab.html', 'chimes/index.html', 'object.html', 'compare.html', 'book-object.html'];
const title = '大江大湖间的符号——色彩与文化记忆';
const navigation = [
  {label: '二维图谱', href: 'index.html?view=2d', id: 'view-2d', view: '2d'},
  {label: '3D 时间轴', href: 'index.html?view=3d', id: 'view-3d', view: '3d'},
  {label: '荆楚地图', href: 'index.html?view=map', id: 'view-map', view: 'map'},
  {label: '颜色图谱', href: 'index.html?view=hue', id: 'view-hue', view: 'hue'},
  {label: '传统色谱', href: 'colours.html', id: 'view-catalogue', view: 'catalogue'},
  {label: '纹样探索', href: 'book.html'},
  {label: '器物实验室', href: 'object-lab.html'},
];
const failures = [];
const check = (condition, file, message) => { if (!condition) failures.push(`${file}: ${message}`); };
const hasClass = (node, value) => (node.attrs.class || '').split(/\s+/).includes(value);
const normalizeText = value => value.replace(/<svg\b[\s\S]*?<\/svg>/gi, '').replace(/<[^>]*>/g, '').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

// A small tag tree keeps hidden descendants out of the public navigation count.
// This checks authored HTML and local targets; visual geometry is checked in-browser.
function parse(html) {
  const nodes = [], stack = [];
  const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
  const source = html.replace(/<!--[\s\S]*?-->/g, value => ' '.repeat(value.length)).replace(/(<script\b[^>]*>)([\s\S]*?)(<\/script>)/gi, (_, open, content, close) => open + ' '.repeat(content.length) + close);
  const tags = /<\/?([a-z][\w:-]*)\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi;
  for (const match of source.matchAll(tags)) {
    const tag = match[1].toLowerCase();
    if (match[0].startsWith('</')) {
      const index = stack.findLastIndex(node => node.tag === tag);
      if (index >= 0) {
        const node = stack[index];
        node.close = match.index;
        node.end = match.index + match[0].length;
        stack.length = index;
      }
      continue;
    }
    const attrs = {};
    const attrSource = match[0].slice(match[1].length + 1, -1);
    for (const attr of attrSource.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) attrs[attr[1].toLowerCase()] = attr[2] ?? attr[3] ?? attr[4] ?? '';
    const node = {tag, attrs, start: match.index, openEnd: match.index + match[0].length, parent: stack.at(-1), children: []};
    node.parent?.children.push(node);
    nodes.push(node);
    if (!voidTags.has(tag) && !match[0].endsWith('/>')) stack.push(node);
    else node.end = node.openEnd;
  }
  return nodes;
}

function descendant(node, ancestor) {
  for (let current = node.parent; current; current = current.parent) if (current === ancestor) return true;
  return false;
}

function hidden(node) {
  for (let current = node; current; current = current.parent) {
    if ('hidden' in current.attrs || current.attrs['aria-hidden'] === 'true' || /display\s*:\s*none/i.test(current.attrs.style || '')) return true;
  }
  return false;
}

function resolveLocal(reference, file) {
  try {
    const url = new URL(reference.replace(/&amp;/g, '&'), new URL(file, dist));
    if (url.protocol !== 'file:') return null;
    return url;
  } catch { return null; }
}

function checkAsset(reference, file, expectedPath, label) {
  const resolved = reference ? resolveLocal(reference, file) : null;
  check(resolved && resolved.pathname === new URL(expectedPath, dist).pathname, file, `${label} must resolve to ${expectedPath}`);
  if (resolved) check(fs.existsSync(fileURLToPath(resolved)), file, `${label} target does not exist: ${reference}`);
}

check(fs.existsSync(new URL('site-shell.css', dist)), 'site-shell.css', 'shared shell stylesheet is missing');

for (const file of pages) {
  const html = fs.readFileSync(new URL(file, dist), 'utf8');
  const nodes = parse(html);
  const headers = nodes.filter(node => node.tag === 'header' && hasClass(node, 'site-header'));
  const navs = nodes.filter(node => node.tag === 'nav' && hasClass(node, 'site-navigation'));
  const brandTitles = nodes.filter(node => hasClass(node, 'site-brand-title'));
  const logos = nodes.filter(node => hasClass(node, 'site-logo'));
  const styles = nodes.filter(node => node.tag === 'link' && node.attrs.rel === 'stylesheet' && /(?:^|\/)site-shell\.css(?:[?#]|$)/.test(node.attrs.href || ''));
  check(headers.length === 1, file, `expected one header.site-header, found ${headers.length}`);
  check(navs.length === 1, file, `expected one nav.site-navigation, found ${navs.length}`);
  check(brandTitles.length === 1, file, `expected one site-brand-title, found ${brandTitles.length}`);
  check(logos.length === 1, file, `expected one site-logo, found ${logos.length}`);
  check(styles.length === 1, file, `expected one site-shell.css import, found ${styles.length}`);
  check(!nodes.some(node => hasClass(node, 'colour-page-tabs')), file, 'legacy colour-page-tabs navigation remains');
  if (styles[0]) checkAsset(styles[0].attrs.href, file, 'site-shell.css', 'shell stylesheet');
  if (logos[0]) checkAsset(logos[0].attrs.src, file, 'assets/brand/chu-logo.png', 'brand logo');
  if (brandTitles[0]) {
    const node = brandTitles[0];
    check(normalizeText(html.slice(node.openEnd, node.close)) === title, file, 'brand title is incomplete or changed');
    check(!hidden(node), file, 'brand title is hidden in authored HTML');
  }
  const header = headers[0], nav = navs[0];
  if (!header || !nav) continue;
  check(brandTitles[0] && descendant(brandTitles[0], header), file, 'brand title must belong to site-header');
  check(logos[0] && descendant(logos[0], header), file, 'brand logo must belong to site-header');
  check(header.end <= nav.start, file, 'site navigation must follow the header');
  check(html.slice(header.end, nav.start).replace(/<!--[\s\S]*?-->/g, '').trim() === '', file, 'site navigation must immediately follow the header');
  const main = nodes.find(node => node.tag === 'main');
  check(main && nav.end <= main.start, file, 'site navigation must precede main content');
  if (file === 'index.html') {
    const workspace = nodes.find(node => hasClass(node, 'workspace'));
    check(workspace && nav.end <= workspace.start, file, 'main navigation must precede workspace/sidebar');
    for (const id of ['view-xyz', 'view-colour', 'view-particles']) {
      const controls = nodes.filter(node => node.attrs.id === id);
      check(controls.length === 1 && hidden(controls[0]), file, `${id} must remain a unique hidden compatibility control`);
    }
  }
  const items = nodes.filter(node => ['a', 'button'].includes(node.tag) && descendant(node, nav) && !hidden(node));
  check(items.length === navigation.length, file, `expected seven visible main navigation items, found ${items.length}`);
  items.forEach((item, index) => {
    const expected = navigation[index];
    if (!expected) return;
    const label = normalizeText(html.slice(item.openEnd, item.close)).replace(/\s*[↗→]\s*$/, '');
    check(label === expected.label, file, `navigation item ${index + 1}: expected “${expected.label}”, found “${label}”`);
    if (file === 'index.html' && index < 5) {
      check(item.tag === 'button' && item.attrs.id === expected.id && item.attrs['data-view'] === expected.view, file, `${expected.label} must preserve button #${expected.id} and data-view=${expected.view}`);
      check(nodes.filter(node => node.attrs.id === expected.id).length === 1, file, `${expected.id} must be unique`);
    } else {
      check(item.tag === 'a', file, `${expected.label} must be a navigation link`);
      const resolved = item.attrs.href ? resolveLocal(item.attrs.href, file) : null;
      const target = new URL(expected.href, dist);
      check(resolved && resolved.pathname === target.pathname && resolved.search === target.search, file, `${expected.label} must link to ${expected.href} relative to this page`);
      if (resolved) check(fs.existsSync(fileURLToPath(resolved)), file, `navigation target does not exist: ${item.attrs.href}`);
    }
  });
}

if (failures.length) {
  console.error(`Site shell checks failed (${failures.length}):\n${failures.map(failure => `- ${failure}`).join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({passed: true, pages: pages.length, consistentBrandTitle: true, mainNavigationItems: navigation.length, relativeLinks: true, sharedStylesheet: 'site-shell.css'}));
}
