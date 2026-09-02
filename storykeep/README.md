# Storykeep

**You talk. It becomes a book.**

Storykeep interviews a person out loud, keeps every name and date they mention
straight, learns how they actually talk, and writes their book in their voice:
a memoir, a children's picture book, or a keepsake about one small moment.
Start and stop whenever. Everything is saved.

It exists for one specific person: someone with stories worth keeping who will
happily talk for an hour and will never sit down and type for one.

> `Storykeep` is a working name. Renaming the product is `api/src/brand.ts`
> plus the two `name:` fields in `render.yaml`.

---

## The crew

Fifteen agents and an orchestrator. They split along one line — **craft**
agents make prose and structural judgements and run on the most capable model;
**utility** agents do structured reads (extraction, diffing, grading) where a
faster model is indistinguishable and costs a third as much.

| Agent | Who | What they do | Tier |
|---|---|---|---|
| Interviewer | **Wren** | Asks the questions. Knows when an answer was thin and asks for the woodpile instead of the adjective. | craft |
| Listener | **Echo** | Files every name, date, place and exact quote into the Story Ledger after each answer. | utility |
| Voice Matcher | **Mirror** | Builds a fingerprint of how this person talks — including the words they'd never use. | craft |
| Architect | **Atlas** | Decides the book's shape and writes a working brief for every chapter. | craft |
| Ghostwriter | **Quill** | Writes the pages. The agent the whole product exists to run. | craft |
| Editor | **Marla** | Line edits. Cuts padding, never adds a fact, never launders the voice. | craft |
| Continuity Keeper | **Ledger** | Catches the brother who was 12 in one chapter and 9 in the next. | utility |
| Originality Guard | **Sable** | Stops the fourteenth memoir sounding like the first thirteen. | utility |
| Careful Reader | **Iris** | Flags what's about a living person, what's private, what may be regretted. | craft |
| Reader Advocate | **Pip** | Reads it cold, like a stranger, and says where it drags. | craft |
| Memoir Specialist | **Hollis** | How a life becomes a book without becoming a list. | craft |
| Picture Book Specialist | **Bea** | Page turns, word counts, meter, what a four-year-old will sit still for. | craft |
| Keepsake Specialist | **June** | Takes one small moment and makes it hold its weight. | craft |
| Illustration Director | **Ink** | Character sheets and per-spread art direction, so the same child looks like the same child. | craft |
| Typesetter | **Cass** | Trim, margins, front matter, page numbers. Makes a file a printer accepts. | utility |

Plus an **orchestrator** (`api/src/agents/orchestrator.ts`) — no persona, the
only thing that knows what order the crew runs in.

The personas are original characters, not likenesses of anyone real. They have
names because a person being interviewed about their dead mother answers a
named interviewer very differently than they answer "the system".

---

## How it fits together

```
web/    Next.js 15 (App Router)  →  Vercel
api/    Node/Express + TypeScript →  Render (starter) + Render Postgres
```

The web app is a browser client only: every agent call, every byte of book
text, and the session cookie live on the API. Nothing is stored in the browser.

### The writing pipeline

1. **Wren** asks one question. The author answers by voice (or types).
2. The answer is **stored verbatim first**, then **Echo** extracts facts into
   the Story Ledger. If extraction fails, the answer is still saved.
3. Every eighth answer, **Mirror** re-fingerprints the voice.
4. **Atlas** builds the outline once there's enough ledger to see a shape.
5. **Quill** drafts a chapter from the ledger and the transcript.
6. **Ledger, Sable, Iris and Pip** read it in parallel.
7. **Marla** makes one edit pass carrying their findings.
8. Every version is kept. Reverting is a pointer move.

### The three things that make it not-generic

**The Story Ledger.** Facts are extracted once and carried in a cached prompt
prefix, so chapter fourteen remembers chapter two without shipping an
eighty-thousand-word transcript into every call. This is why cost stays flat as
a memoir grows.

**The voice fingerprint.** Mirror's `forbidden` list — the literary reflexes a
competent ghostwriter would reach for that *this* person plainly would not — is
the field that does most of the work.

**The style seed.** Every book gets a fixed texture and aperture at creation
(`api/src/routes/books.ts`), carried in every writing prompt. Sable then checks
the prose actually diverged. Two customers writing about the same childhood in
the same town must not get the same book.

---

## Running it locally

### 1. Postgres

There is no in-memory fallback, on purpose: storage that a restart erases is
not storage for someone's life story.

```bash
docker run --name storykeep-db -e POSTGRES_PASSWORD=dev -p 5432:5432 -d postgres:16
```

### 2. The API

```bash
cd storykeep/api
cp .env.example .env       # paste your Anthropic API key into it
npm install
npm run dev                # http://localhost:4000
```

The schema is applied on every boot; there is no separate migrate step.

`GET /api/health` tells you what is actually switched on:

```json
{ "ok": true, "storage": "postgres", "payments": "off",
  "illustration": "briefs-only", "spend": { "today": 0.42, "month": 3.10 } }
```

### 3. The web app

```bash
cd storykeep/web
cp .env.example .env       # NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
npm install
npm run dev                # http://localhost:3000
```

### 4. Check the exports without spending anything

```bash
cd storykeep/api
DATABASE_URL=postgres://postgres:dev@localhost:5432/postgres npm run smoke
```

Seeds a memoir and a picture book, renders all six files, and checks them at
byte level — an EPUB whose `mimetype` entry got compressed looks fine until an
e-reader rejects it. Run this after touching anything in `src/export`.

---

## What is optional, and what happens without it

Storykeep degrades rather than failing, because the person on the other end may
only ever try this once.

| Missing | What still works |
|---|---|
| `DEEPGRAM_API_KEY` | Voice still works, using the browser's own speech recognition. Less accurate; absent in Firefox. Typing always works. |
| `REPLICATE_API_TOKEN` | Every spread still gets a full art brief and render prompt — exactly what you hand to a human illustrator. Only the rendering is skipped. |
| `STRIPE_SECRET_KEY` | Exports unlock for free. This is the correct behaviour for a demo, not a bypass. |
| `DATABASE_URL` | Nothing. The server refuses to start and tells you how to get one. |

---

## Deploying

### API → Render

Push to GitHub, then Render → **New +** → **Blueprint**, point it at this repo.
`render.yaml` provisions the service and the database and wires `DATABASE_URL`.
Render prompts for `ANTHROPIC_API_KEY`, `CORS_ORIGIN` and `PUBLIC_WEB_URL`.

Set `CORS_ORIGIN` to your exact Vercel origin. The session cookie is cross-site
(Vercel → Render), so it is sent `SameSite=None; Secure` and a browser will
reject it against a wildcard origin.

Set the database's instance type on its own page in Render. Do not add
`plan: free` to `render.yaml` — free databases are deleted after their trial.

### Web → Vercel

Vercel → **Add New** → **Project** → import the repo → set **Root Directory**
to `storykeep/web`. Then, **before the first deploy**, set:

```
NEXT_PUBLIC_API_BASE_URL = https://storykeep-api.onrender.com
```

It is baked into the build, so adding it afterwards needs a redeploy.

### Stripe (optional)

Point a webhook at `https://<your-api>/api/stripe/webhook` for
`checkout.session.completed` and set `STRIPE_WEBHOOK_SECRET`. That route is
mounted before the JSON body parser because Stripe signs the raw bytes.

---

## What is verified, and what is not

Verified against a real Postgres in this repo's CI-less way — booted, exercised,
inspected:

- Schema applies; auth, sessions, book creation, ownership isolation
  (another user gets a 404, not a 403), and interview sessions.
- All six exports render and pass byte-level format checks.
- The web app builds and the whole signed-in flow works in a real browser.

**Not verified:** the agent calls themselves. No Anthropic API key was
available in the environment this was built in, so every prompt in
`api/src/agents/` is unrun. The plumbing around them is proven — the request
reaches the Claude client and fails only on the missing credential. Expect to
spend the first hour with a real key tuning Wren's follow-ups and Sable's
sensitivity, which is prompt work, not code work.
