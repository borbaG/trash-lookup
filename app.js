import { makeIndex, normalize, search, verifiedItems } from './search.js';

const authority = 'https://www.landkreis-kusel.de/buergerservice-und-verwaltung/themen/abfallwirtschaft/';
const missing = 'Item not found. Please check with your host before throwing it away.';
const content = document.querySelector('#content');
const field = document.querySelector('#query');
const announce = document.querySelector('#announce');
const lookup = document.querySelector('#lookup');
const groups = { all: 'All Items', household: 'Household Waste', recycling: 'Recycling', organic: 'Organic Waste', special: 'Special Disposal' };
const symbols = {
  bin: '<path d="M5 7h14m-12 0 1 14h8l1-14M9 7V4h6v3m-4 3v7m2-7v7"/>',
  bag: '<path d="M9 7h6l-2-4h-2L9 7ZM9 7c-2 3-5 7-5 10a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4c0-3-3-7-5-10H9Z"/>',
  return: '<path d="m9 5-5 5 5 5m-5-5h11a5 5 0 0 1 0 10h-3"/>',
  plug: '<path d="M8 3v5m8-5v5M6 8h12v3a6 6 0 0 1-12 0V8Zm6 9v4"/>',
  battery: '<path d="M9 5V3h6v2m-7 0h8v16H8zM10 12h4m-2-2v4"/>',
  alert: '<path d="M12 3 2.8 20h18.4L12 3Zm0 6v5m0 3h.01"/>',
  truck: '<path d="M3 6h12v11H3zM15 10h4l3 3v4h-7"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
  facility: '<path d="m3 10 9-6 9 6v10H3zM8 20v-7h8v7"/>',
  leaf: '<path d="M5 19c0-8 5-12 14-14 0 9-4 14-11 14m-3 0 8-8"/>'
};
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);

let items = [];
let index = [];
let pendingTerms = new Set();
let categories = {};
let updatedAt;
let ready = false;
let failed = false;
let lastList = '#home';

function route() {
  return (location.hash.slice(1) || 'home').split('/');
}

function remember(id) {
  try {
    localStorage.setItem('trash-lookup-recent', JSON.stringify([id, ...recent().filter(value => value !== id)].slice(0, 6)));
  } catch { /* Storage can be disabled. */ }
}

function recent() {
  try {
    const value = JSON.parse(localStorage.getItem('trash-lookup-recent') || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function icon(category) {
  return `<span class="symbol" aria-hidden="true" style="--swatch:${category.color};--symbol-ink:${['bag'].includes(category.icon) ? '#172a24' : '#fff'}"><svg width="60%" height="60%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round" stroke-linecap="round">${symbols[category.icon]}</svg></span>`;
}

function itemLink(item, showCategory = true) {
  return `<a class="tile" href="#item/${escapeHtml(item.id)}"><span><strong>${escapeHtml(item.name_en)}</strong><small lang="de">${escapeHtml(item.name_de)}</small></span>${showCategory ? `<small>${item.clarification ? 'Choose an option' : escapeHtml(categories[item.category].name_de)}</small>` : ''}</a>`;
}

function rows(list, showCategory) {
  return `<div class="rows">${list.map(item => itemLink(item, showCategory)).join('')}</div>`;
}

function details(item, optionIndex, embedded = false) {
  const option = item.clarification && /^\d+$/.test(optionIndex ?? '') ? item.clarification.options[Number(optionIndex)] : undefined;
  const destination = option || item;
  const heading = embedded ? 'h2' : 'h1';
  const title = `<${heading} class="item-title">${escapeHtml(item.name_en)}</${heading}><p class="german" lang="de">${escapeHtml(item.name_de)}</p>`;
  if (item.clarification && !option) {
    return `<article class="card">${title}<h3>${escapeHtml(item.clarification.question)}</h3><div class="grid">${item.clarification.options.map(({ label }, i) =>
      `<a class="tile" href="#item/${escapeHtml(item.id)}/${i}">${escapeHtml(label)}</a>`).join('')}</div><p class="muted">If you’re unsure, check with your host.</p></article>`;
  }

  const category = categories[destination.category];
  return `<article class="card">${title}<div class="destination">${icon(category)}<div><strong lang="de">${escapeHtml(category.name_de)}</strong>${escapeHtml(category.name_en)}</div></div>
    <p>${escapeHtml(destination.instructions_en)}</p>
    ${destination.warnings.map(warning => `<p class="warning"><strong>Important</strong> ${escapeHtml(warning)}</p>`).join('')}
    ${option ? `<p><a href="#item/${escapeHtml(item.id)}">Change answer</a></p>` : ''}
    <p><a href="${escapeHtml(destination.source_url)}">Official disposal guidance</a></p></article>`;
}

function home() {
  const recents = recent().map(id => items.find(item => item.id === id)).filter(Boolean);
  return `<h2>Browse items</h2><div class="grid browse">${Object.entries(groups).map(([id, label]) =>
    `<a class="tile" href="#browse/${id}">${label}</a>`).join('')}<a class="tile" href="#az">A–Z List</a></div>
    <h2>Bin quick guide</h2><div class="grid">${['residual', 'organic', 'paper', 'packaging', 'glass'].map(id => {
      const cat = categories[id];
      return `<a class="tile" href="#category/${id}">${icon(cat)}<span><strong lang="de">${escapeHtml(cat.name_de)}</strong><small>${escapeHtml(cat.name_en)}</small></span></a>`;
    }).join('')}</div>
    ${recents.length ? `<h2>Recently searched</h2>${rows(recents, false)}` : ''}`;
}

function matches(view) {
  const hits = search(index, field.value, pendingTerms);
  announce.textContent = hits.length ? `${hits.length} matching items` : missing;
  if (!hits.length) return `<div class="card"><p>${missing}</p></div>`;
  if (view !== 'az' && hits[0].score === 100 && hits[1]?.score !== 100) {
    const [top, ...others] = hits;
    return details(top.item, undefined, true) + (others.length ? `<h2>Related items</h2>${rows(others.slice(0, 10).map(hit => hit.item), false)}` : '');
  }
  return `<h2>${hits[0].score >= 75 ? 'Matching items' : 'Possible matches'}</h2>${rows(hits.map(hit => hit.item), false)}`;
}

function alphabet(letter) {
  const letters = [...new Set(items.map(item => item.name_en[0].toUpperCase()))];
  const list = letter ? items.filter(item => item.name_en.startsWith(letter)) : items;
  return `<h2>A–Z directory</h2><div class="letters"><a href="#az">All</a>${letters.map(key =>
    `<a href="#az/${key}"${key === letter ? ' aria-current="page"' : ''}>${key}</a>`).join('')}</div><p></p>${rows(list)}`;
}

function browse(view, key) {
  const list = items.filter(item => {
    const destinations = item.clarification?.options.map(option => option.category) || [item.category];
    return key === 'all' || destinations.some(id => view === 'category' ? id === key : categories[id].group === key);
  });
  const title = view === 'category' ? categories[key]?.name_de : groups[key];
  return `<a class="back" href="#home">Back to Home</a><h1>${escapeHtml(title || 'Browse items')}</h1>${list.length ? rows(list) : '<p>No verified items in this category yet.</p>'}`;
}

function info() {
  const date = new Date(updatedAt + 'T00:00:00Z').toLocaleDateString('en-GB', { dateStyle: 'long', timeZone: 'UTC' });
  return `<article class="card"><h1>About Trash Lookup</h1><p>Look up household waste in English or German for <strong>Landkreis Kusel, Rheinland-Pfalz</strong>.</p>
    <p><strong>Verified items</strong> ${items.length}<br><strong>Database updated</strong> ${date}</p>
    <p>Official local rules take precedence. If you’re unsure about an item, check with your host or the county waste service.</p>
    <p><a href="${authority}">Landkreis Kusel waste services</a><br><a href="${authority}abfall-abc/">Official Abfall-ABC</a></p>
    <h2>Install on your home screen</h2><p>On iPhone, open in Safari and choose Add to Home Screen from the Share menu. On Android, use the browser’s Install app or Add to Home screen option.</p></article>`;
}

function render() {
  const [view, key, option] = route();
  const searchable = ['home', 'search', 'az'].includes(view);
  const activeNav = searchable || view === 'info' ? view : 'home';
  lookup.hidden = !searchable;
  document.querySelectorAll('nav a').forEach(link => {
    if (link.hash === '#' + activeNav) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  if (!ready) {
    if (failed) content.innerHTML = `<p role="alert">The waste directory couldn’t load. Try reloading while online, or check <a href="${authority}abfall-abc/">the official Abfall-ABC</a>.</p>`;
    return;
  }

  announce.textContent = '';
  if (view !== 'item') lastList = location.hash || '#home';
  const item = view === 'item' ? items.find(record => record.id === key) : undefined;
  if (view === 'item') {
    if (item) remember(item.id);
    content.innerHTML = `<a class="back" href="${escapeHtml(lastList)}">Back to lookup</a>${item ? details(item, option) : `<p>${missing}</p>`}`;
  } else if (view === 'info') content.innerHTML = info();
  else if (view === 'browse' || view === 'category') content.innerHTML = browse(view, key);
  else if (searchable && normalize(field.value)) content.innerHTML = matches(view);
  else if (view === 'az') content.innerHTML = alphabet(key);
  else if (view === 'search') {
    const recents = recent().map(id => items.find(item => item.id === id)).filter(Boolean);
    content.innerHTML = recents.length ? `<h2>Recently searched</h2>${rows(recents, false)}` : '<p class="muted">Try “banana peel”, “Kühlschrank” or “AA battery”.</p>';
  } else content.innerHTML = home();
}

document.querySelector('#search-form').addEventListener('submit', event => {
  event.preventDefault();
  if (!ready) return;
  const [first, second] = search(index, field.value, pendingTerms);
  if (first?.score === 100 && second?.score !== 100) location.hash = 'item/' + first.item.id;
});
field.addEventListener('input', render);
field.addEventListener('change', () => {
  if (!ready || route()[0] === 'az') return;
  const hits = search(index, field.value, pendingTerms);
  if (hits[0]?.score === 100 && hits[1]?.score !== 100) remember(hits[0].item.id);
});
document.querySelector('nav').addEventListener('click', event => {
  const link = event.target.closest('a');
  if (!link) return;
  if (link.hash === '#home' || link.hash === '#az') field.value = '';
  render();
  if (link.hash === '#search' && location.hash === '#search') field.focus();
});
document.querySelector('.brand a').addEventListener('click', () => {
  field.value = '';
  render();
});
window.addEventListener('hashchange', () => {
  render();
  window.scrollTo(0, 0);
  if (route()[0] === 'search') field.focus();
  if (route()[0] === 'item') {
    const heading = content.querySelector('.item-title');
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  }
});

async function json(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error('Failed to load ' + path);
  return response.json();
}

try {
  const [data, categoryData, pending] = await Promise.all([
    json('./data/waste-items.json'),
    json('./data/categories.json'),
    json('./data/pending-items.json')
  ]);
  categories = categoryData;
  items = verifiedItems(data.items).sort((a, b) => a.name_en.localeCompare(b.name_en, 'en'));
  updatedAt = data.updated_at;
  index = makeIndex(items);
  pendingTerms = new Set(makeIndex(pending).flatMap(entry => entry.names));
  ready = true;
} catch {
  failed = true;
}
render();

if (ready && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('./service-worker.js', { updateViaCache: 'none' }).catch(() => {
    // The online lookup remains available when service workers are disabled.
  });
}
