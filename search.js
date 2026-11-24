export function normalize(value) {
  return value.toLowerCase().replace(/ae/g, 'a').replace(/oe/g, 'o').replace(/ue/g, 'u')
    .replace(/ß/g, 'ss').normalize('NFD').replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export function verifiedItems(items) {
  return items.filter(item => item.verification_status === 'verified' && item.source_url && item.verified_at);
}

function near(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  if (a.length !== b.length) {
    return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
  }
  return a.slice(i + 1) === b.slice(i + 1)
    || (a[i] === b[i + 1] && b[i] === a[i + 1] && a.slice(i + 2) === b.slice(i + 2));
}

export function makeIndex(items) {
  return items.map(item => ({
    item,
    names: [...new Set([item.name_en, item.name_de, ...item.synonyms_en, ...item.synonyms_de].map(normalize).filter(Boolean))]
  }));
}

export function scoreMatch(name, query) {
  if (name === query) return 100;
  const parts = name.split(' ');
  if (name.startsWith(query)) return 80;
  if (parts.includes(query)) return 75;
  if (name.includes(query)) return 60;
  const words = query.split(' ');
  if (words.every(word => parts.some(part => part.startsWith(word)))) return 50;
  if (query.length >= 4 && near(query, name)) return 40;
  if (words.every(word => parts.some(part => part === word || (word.length >= 4 && near(word, part))))) return 30;
  return 0;
}

function itemQuery(input) {
  const phrase = input.trim()
    .replace(/^where (?:does|do|can|should)\s+(?:i |we )?(?:put |throw away |dispose of |recycle )?(.+?)(?: go)?[?!.]*$/i, '$1')
    .replace(/^wohin\s+(?:mit|gehört|gehoert)\s+/i, '');
  return normalize(phrase).replace(/^(?:a|an|the|ein|eine|der|die|das) /, '');
}

function singular(query) {
  return query.replace(/\b([a-z]{3,})(?:ies)\b$/, '$1y')
    .replace(/\b([a-z]{3,}[^sui])s\b$/, '$1');
}

export function search(index, input, pendingTerms) {
  const original = normalize(input);
  const query = itemQuery(input);
  if (!query) return [];
  if (query !== original && /^(?:it|this|that|das|es)$/.test(query)) return [];
  const ranked = (a, b) => b.score - a.score || a.item.name_en.localeCompare(b.item.name_en);
  const exact = term => index.filter(({names}) => names.includes(term)).map(({item}) => ({item, score: 100}));
  if (pendingTerms?.has(original)) return exact(original).sort(ranked);
  const direct = index.some(({names}) => names.includes(original));
  const lookup = direct ? original : query;
  const cleaned = query === original ? [] : exact(query);
  if (!direct && pendingTerms?.has(query)) return cleaned.sort(ranked);
  const base = singular(lookup);
  if (!direct && !cleaned.length && base !== lookup) {
    if (pendingTerms?.has(base)) return [];
    const singularMatches = exact(base);
    if (singularMatches.length) return singularMatches.sort(ranked);
  }
  return index.flatMap(({item, names}) => {
    const score = Math.max(...names.map(name => scoreMatch(name, lookup)));
    return score ? [{item, score}] : [];
  }).sort(ranked);
}
