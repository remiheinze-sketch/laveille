import crypto from 'node:crypto';

export function makeId(input){
  return crypto.createHash('sha1').update(input).digest('hex');
}

export function normalizeItem({tab_key, source_id=null, person_id=null, title, summary='', link, tags=[], date_iso=new Date().toISOString(), pinned=false, read=false}){
  const id = makeId(`${link}-${tab_key}`);
  return { id, tab_key, source_id, person_id, title, summary, link, tags, date_iso, pinned, read };
}
