// tools/ingest.mjs
import { XMLParser } from 'fast-xml-parser';
import fs from 'node:fs/promises';
import path from 'node:path';

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });

/* ------------------------------ CONFIG DES FLUX ------------------------------ */

// Flux Budget 2026 / PLF / PLFSS / économie
const FEEDS_BUDGET = [
  "http://www.assemblee-nationale.fr/rss/rss_presse.xml",
  "http://www2.assemblee-nationale.fr/feeds/detail/ID_59048/(type)/instance",
  "https://www.francetvinfo.fr/titres.rss",
  "https://www.lemonde.fr/france/rss_full.xml",
  "https://www.lemonde.fr/economie/rss_full.xml",
  "https://syndication.lesechos.fr/rss/rss_une.xml",
  "https://www.vie-publique.fr/flux/actualites/rss.xml",
  // Flux supplémentaires
  "https://www.publicsenat.fr/rss.xml",
  "https://www.bfmtv.com/rss/info/flux-rss/flux-toutes-les-actualites/",
  "https://www.economie.gouv.fr/rss/actualites"
];

// Flux locaux (Ville de Metz, presse régionale)
const FEEDS_METZ = [
  "https://tout-metz.com/feed",
  "https://rcf.fr/actualite/metz-actu/rss",
  "https://www.eurometropolemetzhabitat.fr/sujet/actualites-generales/feed/",
  "https://actu.fr/grand-est/metz/rss.xml",
  "https://www.republicain-lorrain.fr/metz/rss"
];

/* ------------------------------ UTILS ------------------------------ */

function newsRssFor(name) {
  const q = encodeURIComponent(name);
  return `https://news.google.com/rss/search?q=${q}&hl=fr&gl=FR&ceid=FR:fr`;
}

function nitterFeedsFor(handle) {
  if (!handle) return [];
  const mirrors = [
    'https://nitter.net',
    'https://nitter.fdn.fr',
    'https://nitter.poast.org',
    'https://nitter.privacydev.net'
  ];
  return mirrors.map(base => `${base}/${handle}/rss`);
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'user-agent': 'VeilleBot/1.0 (+github actions)' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

/* ------------------------------ PARSEUR RSS ------------------------------ */

function normalizeRss(xml, fallbackSource, tabKey, personName = null) {
  const j = parser.parse(xml);

  let items = [];

  if (j.rss?.channel?.item) {
    items = j.rss.channel.item.map(i => ({
      id: i.guid?.['#text'] || i.guid || i.link || (i.title + i.pubDate),
      title: (i.title || '').trim(),
      summary: (i.description || '').trim(),
      link: i.link?.href || i.link || (i.guid?.['#text']?.startsWith('http') ? i.guid['#text'] : null),
      source: j.rss.channel.title || fallbackSource || 'RSS',
      tags: personName ? [personName] : [],
      dateISO: i.pubDate ? new Date(i.pubDate).toISOString() : new Date().toISOString(),
      pinned: false,
      read: false,
      tab_key: tabKey
    }));
  } else if (j.feed?.entry) {
    items = j.feed.entry.map(e => ({
      id: e.id || e.link?.href || (e.title + e.updated),
      title: (e.title?.['#text'] || e.title || '').trim(),
      summary: (e.summary?.['#text'] || e.content?.['#text'] || '').trim(),
      link: e.link?.href || (Array.isArray(e.link)
        ? (e.link.find(l => l.rel === 'alternate')?.href || e.link[0]?.href)
        : null),
      source: j.feed?.title?.['#text'] || j.feed?.title || fallbackSource || 'Atom',
      tags: personName ? [personName] : [],
      dateISO: e.updated ? new Date(e.updated).toISOString() : new Date().toISOString(),
      pinned: false,
      read: false,
      tab_key: tabKey
    }));
  }

  // Nettoyage titres et doublons
  const seen = new Set();
  const clean = items
    .filter(x => x.title && x.link)
    .map(x => ({
      ...x,
      title: x.title.replace(/<[^>]+>/g, '').trim(),
      summary: (x.summary || '').replace(/<[^>]+>/g, '').trim()
    }))
    .filter(x => {
      if (seen.has(x.link)) return false;
      seen.add(x.link);
      return true;
    });

  return clean.map(x => ({ ...x, id: String(x.id).slice(0, 128) }));
}

/* ------------------------------ SOCIAL ------------------------------ */

async function loadPeople() {
  const ymlPath = path.resolve('tools/people.yml');
  const txt = await fs.readFile(ymlPath, 'utf8');
  const lines = txt.split(/\\r?\\n/);
  const people = [];
  let current = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('people:')) continue;
    if (line.startsWith('- ')) {
      if (current) people.push(current);
      current = {};
      continue;
    }
    const m = line.match(/^(\\w+):\\s*(.*)$/);
    if (m && current) {
      const key = m[1];
      let val = m[2].trim();
      if (val.startsWith('"') || val.startsWith("'")) val = val.slice(1, -1);
      current[key] = val;
    }
  }
  if (current) people.push(current);
  return { people };
}

async function ingestSocialFromPeople() {
  let all = [];
  let ppl;
  try {
    ppl = await loadPeople();
  } catch (e) {
    console.error('[social] cannot read tools/people.yml', e.message);
    ppl = { people: [] };
  }

  for (const person of (ppl.people || [])) {
    const feeds = new Set();
    feeds.add(newsRssFor(person.name)); // Google News
    if (person.x_handle) {
      for (const u of nitterFeedsFor(person.x_handle)) feeds.add(u);
    }
    if (Array.isArray(person.custom_feeds)) {
      for (const u of person.custom_feeds) feeds.add(u);
    }

    for (const url of feeds) {
      try {
        const xml = await fetchText(url);
        const items = normalizeRss(xml, new URL(url).hostname, 'social', person.name);
        all = all.concat(items);
      } catch (e) {
        console.error('[social] feed error', person.name, url, e.message);
      }
    }
  }

  all.sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO));
  all = all.slice(0, 400);
  const outPath = `frontend/data/social.json`;
  await fs.writeFile(outPath, JSON.stringify({ items: all, updatedAt: new Date().toISOString() }, null, 2), 'utf8');
  console.log('[social] wrote', outPath, all.length, 'items');
}

/* ------------------------------ INGESTION ------------------------------ */

async function ingestTab(tabKey, urls) {
  let all = [];
  for (const u of urls) {
    try {
      const xml = await fetchText(u);
      const items = normalizeRss(xml, new URL(u).hostname, tabKey);
      all = all.concat(items);
    } catch (e) {
      console.error('[ingest] feed error', tabKey, u, e.message);
    }
  }
  all.sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO));
  all = all.slice(0, 300);
  const outPath = `frontend/data/${tabKey}.json`;
  await fs.writeFile(outPath, JSON.stringify({ items: all, updatedAt: new Date().toISOString() }, null, 2), 'utf8');
  console.log('[ingest] wrote', outPath, all.length, 'items');
}

/* ------------------------------ MAIN ------------------------------ */

async function main() {
  await ingestTab('budget', FEEDS_BUDGET);
  await ingestTab('metz', FEEDS_METZ);
  await ingestSocialFromPeople();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
