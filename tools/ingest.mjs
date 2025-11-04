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
  "https:/
