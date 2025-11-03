// tools/ingest.mjs
import { XMLParser } from 'fast-xml-parser';
import fs from 'node:fs/promises';
import path from 'node:path';

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });

/** ---- 0) Utils ---- */
function newsRssFor(name){
  // Google News RSS search for the person (French locale)
  const q = encodeURIComponent(name);
  return `https://news.google.com/rss/search?q=${q}&hl=fr&gl=FR&ceid=FR:fr`;
}

function nitterFeedsFor(handle){
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

function normalizeRss(xml, fallbackSource, tabKey, personName=null) {
  const j = parser.parse(xml);
  const items =
    j.rss?.channel?.item?.map(i => ({
      id: i.guid?.['#text'] || i.guid || i.link || (i.title + i.pubDate),
      title: (i.title || '').trim(),
      summary: (i.description || '').trim(),
      link: i.link,
      source: j.rss?.channel?.title || fallbackSource || 'RSS',
      tags: personName ? [personName] : [],
      dateISO: i.pubDate ? new Date(i.pubDate).toISOString() : new Date().toISOString(),
      pinned: false,
      read: false,
      tab_key: tabKey
    })) ||
    j.feed?.entry?.map(e => ({
      id: e.id || e.link?.href || (e.title + e.updated),
      title: (e.title?.['#text'] || e.title || '').trim(),
      summary: (e.summary?.['#text'] || e.content?.['#text'] || '').trim(),
      link: e.link?.href || (Array.isArray(e.link) ? (e.link.find(l => l.rel === 'alternate')?.href || e.link[0]?.href) : null),
      source: j.feed?.title?.['#text'] || j.feed?.title || fallbackSource || 'Atom',
      tags: personName ? [personName] : [],
      dateISO: e.updated ? new Date(e.updated).toISOString() : new Date().toISOString(),
      pinned: false,
      read: false,
      tab_key: tabKey
    })) || [];

  return items.filter(x => x.title && x.link).map(x => ({ ...x, id: String(x.id).slice(0,128) }));
}

/** ---- 1) Budget & Metz (prérempli comme avant) ---- */
const FEEDS_BUDGET = [
  "http://www.assemblee-nationale.fr/rss/rss_presse.xml",
  "http://www2.assemblee-nationale.fr/feeds/detail/ID_59048/(type)/instance",
  "https://www.francetvinfo.fr/titres.rss",
  "https://www.lemonde.fr/france/rss_full.xml",
  "https://www.lemonde.fr/economie/rss_full.xml",
  "https://syndication.lesechos.fr/rss/rss_une.xml",
  "https://www.vie-publique.fr/flux/actualites/rss.xml"
];

const FEEDS_METZ = [
  "https://tout-metz.com/feed",
  "https://rcf.fr/actualite/metz-actu/rss",
  "https://www.eurometropolemetzhabitat.fr/sujet/actualites-generales/feed/"
];

/** ---- 2) Social via people.yml ---- */
async function loadPeople(){
  const p = path.resolve('tools/people.yml');
  const yml = await fs.readFile(p, 'utf8');
  // simple YAML parser without dependency: naive (each line) not reliable
  // We'll bundle a minimal parser using a JSON trick: instruct user to keep simple keys.
  // Better: embed a tiny YAML parser? Not available. Use a simple convention:
  // Accept JSON as well: if people.yml starts with '{', treat as JSON.
  if (yml.trim().startsWith('{')){
    return JSON.parse(yml);
  } else {
    // very small YAML subset: 'people:' then list with '- name:' etc.
    // For reliability in Actions, we will include js-yaml by requiring users to keep JSON,
    // but to keep zero-install, fallback: try to parse manually best-effort.
    const people = [];
    let current = null;
    for (const raw of yml.split(/\r?\n/)){
      const line = raw.trim();
      if (!line) continue;
      if (line.startsWith('people:')) continue;
      if (line.startsWith('- ')){
        if (current) people.push(current);
        current = {};
        continue;
      }
      const m = line.match(/^(\w+):\s*(.*)$/);
      if (m && current){
        const key = m[1];
        let val = m[2].trim();
        if (val.startsWith('"') || val.startsWith("'")) val = val.slice(1, -1);
        current[key] = val;
      }
    }
    if (current) people.push(current);
    return { people };
  }
}

async function ingestSocialFromPeople(){
  let all = [];
  let ppl;
  try {
    ppl = await loadPeople();
  } catch (e) {
    console.error('[social] cannot read tools/people.yml', e.message);
    ppl = { people: [] };
  }
  for (const person of (ppl.people || [])){
    const feeds = new Set();
    // Google News search feed for the person
    feeds.add(newsRssFor(person.name));
    // X via Nitter mirrors
    if (person.x_handle) {
      for (const u of nitterFeedsFor(person.x_handle)) feeds.add(u);
    }
    // Custom RSS feeds (blogs/newsletters or third-party converters)
    if (Array.isArray(person.custom_feeds)){
      for (const u of person.custom_feeds) feeds.add(u);
    }
    for (const url of feeds){
      try {
        const xml = await fetchText(url);
        const items = normalizeRss(xml, new URL(url).hostname, 'social', person.name);
        all = all.concat(items);
      } catch (e) {
        console.error('[social] feed error', person.name, url, e.message);
      }
    }
  }
  all.sort((a,b) => new Date(b.dateISO) - new Date(a.dateISO));
  all = all.slice(0, 400);
  const outPath = `frontend/data/social.json`;
  await fs.writeFile(outPath, JSON.stringify({ items: all, updatedAt: new Date().toISOString() }, null, 2), 'utf8');
  console.log('[social] wrote', outPath, all.length, 'items');
}

/** ---- 3) Ingest and write all tabs ---- */
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
  all.sort((a,b) => new Date(b.dateISO) - new Date(a.dateISO));
  all = all.slice(0, 300);
  const outPath = `frontend/data/${tabKey}.json`;
  await fs.writeFile(outPath, JSON.stringify({ items: all, updatedAt: new Date().toISOString() }, null, 2), 'utf8');
  console.log('[ingest] wrote', outPath, all.length, 'items');
}

async function main(){
  await ingestTab('budget', FEEDS_BUDGET);
  await ingestTab('metz', FEEDS_METZ);
  await ingestSocialFromPeople();
}
main().catch(e => { console.error(e); process.exit(1); });
