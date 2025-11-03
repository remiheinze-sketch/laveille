-- Tabs
CREATE TABLE IF NOT EXISTS tabs (
  key TEXT PRIMARY KEY,
  title TEXT NOT NULL
);

-- Sources
CREATE TABLE IF NOT EXISTS sources (
  id SERIAL PRIMARY KEY,
  tab_key TEXT REFERENCES tabs(key) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('rss','webhook','api','manual')),
  name TEXT NOT NULL,
  url TEXT,
  enabled BOOLEAN DEFAULT TRUE
);

-- People (social tab)
CREATE TABLE IF NOT EXISTS people (
  id SERIAL PRIMARY KEY,
  tab_key TEXT REFERENCES tabs(key) ON DELETE CASCADE,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS social_links (
  id SERIAL PRIMARY KEY,
  person_id INT REFERENCES people(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('linkedin','x','instagram','facebook','site')),
  url TEXT NOT NULL,
  UNIQUE(person_id, type, url)
);

-- Items
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  tab_key TEXT REFERENCES tabs(key) ON DELETE SET NULL,
  source_id INT REFERENCES sources(id) ON DELETE SET NULL,
  person_id INT REFERENCES people(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  summary TEXT,
  link TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  date_iso TIMESTAMPTZ NOT NULL,
  pinned BOOLEAN DEFAULT FALSE,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookmarks
CREATE TABLE IF NOT EXISTS bookmarks (
  id SERIAL PRIMARY KEY,
  item_id TEXT REFERENCES items(id) ON DELETE CASCADE,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(item_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_items_tab_date ON items(tab_key, date_iso DESC);
