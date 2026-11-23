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

export function search(index, input, pendingTerms) {
  const query = normalize(input);
  if (!query) return [];
  // An exact pending name must not be redirected to a similar verified item.
  const minimumScore = pendingTerms?.has(query) ? 100 : 1;
  return index.flatMap(({ item, names }) => {
    const score = minimumScore === 100
      ? (names.includes(query) ? 100 : 0)
      : Math.max(...names.map(name => scoreMatch(name, query)));
    return score >= minimumScore ? [{ item, score }] : [];
  }).sort((a, b) => b.score - a.score || a.item.name_en.localeCompare(b.item.name_en));
}
