# Bayou & Blazer

The ultimate high-end Houston men's style guide — an AI agent team that interviews you, looks at your photos, scouts Houston's custom and high-end menswear stores, and hands you a full phased wardrobe plan: what to buy, when, where, and how.

A React Native (Expo) app in `app/`, talking to a small Node/Express backend in `server/` that runs the agent pipeline on the Claude API.

## The agents

| Agent | Persona | Job |
|---|---|---|
| Interviewer | **Kyla** | Confident, sharp professional stylist who runs a real, in-depth conversation to get a genuine style + budget profile — not a form. |
| Photo Analyst | **Watt** | Breaks your photos down like game film — face shape, body type, fit, coloring, and gaps — and turns them into concrete recommendations (collar spreads, lapel widths, cuts). |
| Store Scouts | **Biggio** / **Drexler** / **Olajuwon** / **Wagner** | Four specialist agents, each reviewing one slice of Houston's custom/high-end menswear scene (bespoke tailoring; luxury department & contemporary; footwear & western wear; lifestyle & accessories) and ranking the best fits for your profile. |
| Style & Weather | **Campbell** | Houston's climate calendar and dress culture — feeds every other agent so recommendations actually make sense for this city. |
| Wardrobe Planner | **Moon** | The quarterback — synthesizes everything into one phased, budgeted, store-by-store wardrobe game plan. |

Agent names other than Kyla are a fan homage to Houston sports legends, each matched to their role — the film-room read, the craftsman who played every position, The Glide's effortless style, the greatest footwork in the game, the closer, the power through Houston heat, and the Hall of Fame quarterback calling the plan. This app is not affiliated with or endorsed by the people these names honor.

See `server/src/agents/` for each one's system prompt and logic, and `server/src/data/houstonStores.ts` for the curated store dataset (see **About the store data** below).

## Project layout

```
server/   Node/Express + TypeScript backend, calls the Claude API
app/      Expo (React Native) app — the thing you install on a phone
```

## 1. Run the backend

```bash
cd server
cp .env.example .env     # then paste your Anthropic API key into it
npm install
npm run dev               # http://localhost:4000
```

You need an [Anthropic API key](https://console.anthropic.com/) in `server/.env` as `ANTHROPIC_API_KEY`. Every agent call goes through the Claude API and costs a small amount per request (the interview, photo analysis, four store scouts, and the final plan each make at least one call) — see [Anthropic's pricing](https://www.anthropic.com/pricing) for current rates. `ANTHROPIC_MODEL` in `.env` defaults to `claude-opus-5`; drop it to a cheaper model there if you want to cut cost.

Session state (the interview transcript, profile, photo assessment, plan) is kept **in memory** on the server — fine for trying this out or sharing with a friend, but it resets on server restart and only works with a single server process. Swap `server/src/sessionStore.ts` for a real database before this needs to survive restarts or scale past one instance.

Every route that calls an agent (`/api/interview`, `/api/photo`, `/api/plan`) is rate-limited to 60 requests per 15 minutes per IP, so a leaked link or a stuck client-side retry loop can't run up an unbounded Claude API bill. Adjust `agentRouteLimiter` in `server/src/index.ts` if that's too tight or too loose for how you're using it.

## 2. Run the app

```bash
cd app
cp .env.example .env     # point EXPO_PUBLIC_API_BASE_URL at your server
npm install
npm start
```

This opens the Expo dev tools. From there:

- Press `i` for the iOS simulator or `a` for an Android emulator (needs Xcode / Android Studio installed).
- Or scan the QR code with the **Expo Go** app on your own phone — this is the fastest way to "share it with a friend": as long as their phone is on the same Wi-Fi and `EXPO_PUBLIC_API_BASE_URL` points at a server address reachable from their phone (your computer's LAN IP, not `localhost`), they can scan and use the whole app immediately, no App Store needed.

If you're testing on a physical phone (Expo Go or a dev build), set `EXPO_PUBLIC_API_BASE_URL` in `app/.env` to your computer's LAN IP (e.g. `http://192.168.1.23:4000`), not `localhost` — the phone can't resolve your laptop's `localhost`.

## 3. Getting it onto the App Store (or just onto a friend's phone permanently)

This app was built with Expo, so the path to a real App Store submission is [EAS Build](https://docs.expo.dev/build/introduction/) + [EAS Submit](https://docs.expo.dev/submit/introduction/):

1. `npm install -g eas-cli` and `eas login` (free Expo account).
2. You'll need a **paid Apple Developer account** ($99/year) to submit to the App Store — Expo can't get around that requirement, it's Apple's.
3. `eas build --platform ios` from `app/` builds an installable `.ipa` in the cloud (no Mac required for the build itself).
4. For sharing with a friend *without* going through App Review at all: `eas build --profile preview` produces an installable build you can send them a link to install directly (still needs your Apple Developer account for iOS device installs, or use Android for a no-account path).
5. `eas submit --platform ios` uploads the build to App Store Connect for review once you're ready to actually publish it.

Because the app calls your own backend, **the backend needs to be deployed somewhere reachable from the internet** (Render, Fly.io, Railway, a small VPS, etc.) before a build you hand to someone else — or submit to the App Store — will work; `localhost`/your LAN IP only works for local dev. Point `EXPO_PUBLIC_API_BASE_URL` at that deployed URL before building.

## 4. Sharing a web version instead (fastest, free, works on any phone)

You don't need the App Store, Expo Go, or to buy a domain to let a few friends try this — Expo can export this same app as a static website, since this codebase (React Native + Expo) runs on the web too via `react-native-web`. Verified working: `npx expo export --platform web` from `app/` builds a static site into `app/dist/` (already confirmed rendering correctly, including live agent replies, in a real browser at a phone-sized viewport).

Both pieces below have free tiers, so this costs nothing beyond your Claude API usage — no website purchase required. A custom domain (~$10-15/year from any registrar, pointed at your host) is a nice-to-have you can add later, not a requirement.

1. **Deploy the backend first** (see below) — Render's free tier works fine for sharing with a few friends. Note the URL it gives you (e.g. `https://bayou-blazer-server.onrender.com`).
2. **Deploy the web app** — `app/vercel.json` is a ready-made [Vercel](https://vercel.com) config. Push this repo to GitHub, go to vercel.com → **Add New** → **Project**, import the repo, and set the **Root Directory** to `app`. Vercel reads `vercel.json` and handles the build automatically.
3. Before deploying, set an environment variable in Vercel's project settings: `EXPO_PUBLIC_API_BASE_URL` = the backend URL from step 1. (This gets baked into the build, so set it *before* the first deploy, or trigger a redeploy after adding it.)
4. Vercel gives you a free URL like `https://bayou-blazer.vercel.app` — text that to your friends. It opens in any phone's browser, looks and works like the app (same screens, same agents), and needs nothing installed.
5. Once you know the real Vercel URL, tighten `CORS_ORIGIN` on the backend (in Render's dashboard, or `server/.env` if self-hosting) from `*` to that exact URL, so only your site can call your backend.

Netlify or Cloudflare Pages work the same way if you'd rather use those (same build command `npx expo export --platform web`, output directory `dist`) — Vercel's just the path with a config file already in the repo.

## Deploying the backend

Two ready-made paths, both verified against this repo's actual `npm run build` / `npm start`:

**Render (no Docker needed)** — `render.yaml` at the repo root is a [Render Blueprint](https://render.com/docs/blueprint-spec). On [render.com](https://render.com), pick **New +** → **Blueprint**, point it at this repo, and Render reads that file: it builds and starts `server/` for you and prompts for `ANTHROPIC_API_KEY` in its dashboard (kept out of the repo since it's a secret). Free tier works for trying this out.

**Anywhere else that runs a container** (Fly.io, Railway, Google Cloud Run, a VPS) — `server/Dockerfile` is a standard multi-stage Node build. e.g. for Fly.io: `fly launch` from inside `server/` (it'll detect the Dockerfile), then `fly secrets set ANTHROPIC_API_KEY=sk-ant-...`. For a plain VPS: `docker build -t bayou-blazer-server . && docker run -p 4000:4000 -e ANTHROPIC_API_KEY=sk-ant-... bayou-blazer-server`.

Either way, once it's live, set `CORS_ORIGIN` to your actual app's origin instead of the `*` default if you want to lock that down, and point `EXPO_PUBLIC_API_BASE_URL` in `app/.env` at the deployed URL before building the app.

## About the store data

`server/src/data/houstonStores.ts` is a **curated seed list built from general knowledge**, not a live, verified business directory. Every entry is flagged `verified: false` on purpose. Addresses are given at neighborhood/shopping-center granularity rather than exact street addresses, and hours, current operating status, and inventory should be confirmed independently before anyone relies on this to plan a visit — the app's UI includes that disclaimer too.

To upgrade this to live data, swap `getAllStores()` in that file for a call to a real source (Google Places API, Yelp Fusion API, etc.) — nothing else in the codebase needs to change, since every agent consumes stores through that one function.

### Monthly self-refresh ("Ryan", the front office)

The dataset re-verifies itself: `server/scripts/refresh-data.ts` uses the
Claude API's server-side web search tool to check every store (open/closed +
one current, shopper-useful note) and rebuild a rolling ~90-day Houston
season brief, then writes both as generated TypeScript data files
(`storeFreshness.ts`, `seasonBrief.ts`). A store flagged closed with high
confidence disappears from every agent and the directory automatically; the
current notes surface as "Right now:" lines in the directory and as
`rightNow` intel to the scouts and planner. On its first run it caught a
store in this very dataset that had closed permanently.

`.github/workflows/refresh-data.yml` runs it on the 1st of each month and
commits the result (Render redeploys from main automatically). Setup: add an
`ANTHROPIC_API_KEY` repository secret (Settings → Secrets and variables →
Actions), plus `ANTHROPIC_WORKSPACE_ID` if your key needs one. Run on demand
with `cd server && npm run refresh:data`, or from the Actions tab
(workflow_dispatch).

## Extending it

- **More/better store data** — see above.
- **Persistent sessions** — replace `server/src/sessionStore.ts`'s in-memory `Map` with a database so plans survive server restarts and work across multiple server instances.
- **Save/share a plan** — the `WardrobePlan` returned by `/api/plan/generate` is already a clean JSON object; add a route to persist it and a share screen in the app.
- **Swap the model** — every agent shares one model via `AGENT_MODEL` in `server/src/config.ts`; point it at a cheaper model to cut cost, or a different one entirely.
