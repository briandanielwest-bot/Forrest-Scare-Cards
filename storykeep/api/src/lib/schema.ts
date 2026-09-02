/**
 * The schema, embedded rather than shipped as a .sql file on purpose:
 * `tsc` copies no assets, so a separate file is present in dev and missing
 * in the Render build. Embedding it means migrate-on-boot cannot fail for
 * a reason that never shows up locally.
 */
export const SCHEMA_SQL = String.raw`
-- Storykeep schema.
--
-- Design notes that matter:
--  * Nothing an author says is ever deleted by the system. Transcript turns
--    are append-only; drafts are versioned rather than overwritten. A memoir
--    is often the only surviving record of what someone said, so "undo"
--    must always be possible.
--  * Chapter text lives in 'drafts', not on 'chapters'. 'chapters.current_draft_id'
--    is just a pointer, so reverting is a pointer move, not a data loss.
--  * Spend is recorded per call and attributed to a user, because the daily
--    ceiling has to survive a restart (a counter in memory does not).

CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,
  email           TEXT UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  display_name    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);

CREATE TABLE IF NOT EXISTS books (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  genre           TEXT NOT NULL,           -- memoir | kids | keepsake
  title           TEXT NOT NULL DEFAULT 'Untitled',
  subtitle        TEXT,
  -- ghostwriter | cowriter | coach
  assist_level    TEXT NOT NULL DEFAULT 'ghostwriter',
  -- Set once at creation and never changed: it is the seed that makes this
  -- book's prose unlike every other book the system has written.
  style_seed      TEXT NOT NULL,
  target_pages    INTEGER,
  -- The Architect's outline, the Voice Matcher's fingerprint, the trim size.
  blueprint       JSONB NOT NULL DEFAULT '{}'::jsonb,
  voice_profile   JSONB,
  status          TEXT NOT NULL DEFAULT 'interviewing',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS books_user_idx ON books(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS chapters (
  id                TEXT PRIMARY KEY,
  book_id           TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  position          INTEGER NOT NULL,
  title             TEXT NOT NULL,
  -- What this chapter is supposed to do, written by the Architect. The
  -- Ghostwriter reads it; the Reader Advocate grades against it.
  brief             TEXT,
  status            TEXT NOT NULL DEFAULT 'empty', -- empty|interviewing|drafted|edited|final
  current_draft_id  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS chapters_book_idx ON chapters(book_id, position);

-- One interview sitting. Start and stop freely; a book has many.
CREATE TABLE IF NOT EXISTS interviews (
  id          TEXT PRIMARY KEY,
  book_id     TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  chapter_id  TEXT REFERENCES chapters(id) ON DELETE SET NULL,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at    TIMESTAMPTZ,
  -- Where the Interviewer had got to, so "resume" is exact.
  agenda      JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS interviews_book_idx ON interviews(book_id, started_at DESC);

CREATE TABLE IF NOT EXISTS turns (
  id            TEXT PRIMARY KEY,
  interview_id  TEXT NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  book_id       TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  role          TEXT NOT NULL,     -- agent | author
  text          TEXT NOT NULL,
  -- 'voice' turns keep the raw transcript separately from any cleanup, so
  -- the author's actual words are never lost to a tidy-up pass.
  source        TEXT NOT NULL DEFAULT 'text', -- text | voice
  raw_transcript TEXT,
  audio_seconds NUMERIC,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS turns_interview_idx ON turns(interview_id, created_at);
CREATE INDEX IF NOT EXISTS turns_book_idx ON turns(book_id, created_at);

-- The Story Ledger: every fact the Listener pulled out of a transcript.
-- This is what makes chapter 14 remember what was said in chapter 2, and
-- what the Continuity Keeper diffs against.
CREATE TABLE IF NOT EXISTS ledger (
  id          TEXT PRIMARY KEY,
  book_id     TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL,   -- person | place | date | event | object | theme | quote
  label       TEXT NOT NULL,
  detail      TEXT,
  -- ISO-ish; deliberately TEXT because real memories say "sometime in '67".
  when_text   TEXT,
  confidence  NUMERIC NOT NULL DEFAULT 0.8,
  source_turn TEXT REFERENCES turns(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ledger_book_idx ON ledger(book_id, kind);

CREATE TABLE IF NOT EXISTS drafts (
  id            TEXT PRIMARY KEY,
  book_id       TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  chapter_id    TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  version       INTEGER NOT NULL,
  body          TEXT NOT NULL,
  word_count    INTEGER NOT NULL DEFAULT 0,
  -- Which agent produced it, and what the graders said about it.
  authored_by   TEXT NOT NULL DEFAULT 'ghostwriter',
  notes         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS drafts_chapter_idx ON drafts(chapter_id, version DESC);

-- Kids books and keepsakes are laid out as spreads, not chapters.
CREATE TABLE IF NOT EXISTS spreads (
  id            TEXT PRIMARY KEY,
  book_id       TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  position      INTEGER NOT NULL,
  text          TEXT NOT NULL DEFAULT '',
  art_brief     TEXT,
  image_url     TEXT,
  image_status  TEXT NOT NULL DEFAULT 'none', -- none|briefed|rendering|ready|failed
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS spreads_book_idx ON spreads(book_id, position);

-- The illustration style bible: character sheets that keep the same kid
-- looking like the same kid on page 3 and page 27.
CREATE TABLE IF NOT EXISTS art_bible (
  book_id     TEXT PRIMARY KEY REFERENCES books(id) ON DELETE CASCADE,
  style       TEXT NOT NULL,
  palette     TEXT,
  characters  JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviews (
  id          TEXT PRIMARY KEY,
  book_id     TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  chapter_id  TEXT REFERENCES chapters(id) ON DELETE CASCADE,
  agent       TEXT NOT NULL,   -- continuity | originality | sensitivity | reader | editor
  severity    TEXT NOT NULL DEFAULT 'note', -- note | warn | block
  message     TEXT NOT NULL,
  detail      JSONB,
  resolved    BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reviews_book_idx ON reviews(book_id, resolved);

CREATE TABLE IF NOT EXISTS exports (
  id          TEXT PRIMARY KEY,
  book_id     TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  format      TEXT NOT NULL,   -- pdf | epub | docx
  trim        TEXT,
  bytes       INTEGER,
  paid        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id            TEXT PRIMARY KEY,
  book_id       TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL,   -- export | print | animation
  status        TEXT NOT NULL DEFAULT 'pending',
  amount_cents  INTEGER NOT NULL DEFAULT 0,
  stripe_id     TEXT,
  detail        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orders_book_idx ON orders(book_id);

-- Every Claude call, priced. The spend ceiling is rebuilt from this on boot.
CREATE TABLE IF NOT EXISTS spend (
  id            TEXT PRIMARY KEY,
  user_id       TEXT REFERENCES users(id) ON DELETE SET NULL,
  book_id       TEXT REFERENCES books(id) ON DELETE SET NULL,
  agent         TEXT NOT NULL,
  model         TEXT NOT NULL,
  input_tokens        INTEGER NOT NULL DEFAULT 0,
  output_tokens       INTEGER NOT NULL DEFAULT 0,
  cache_read_tokens   INTEGER NOT NULL DEFAULT 0,
  cache_write_tokens  INTEGER NOT NULL DEFAULT 0,
  usd           NUMERIC NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS spend_day_idx ON spend(created_at);
CREATE INDEX IF NOT EXISTS spend_user_idx ON spend(user_id, created_at);
`;
