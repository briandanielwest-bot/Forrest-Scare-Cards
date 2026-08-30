# Bayou & Blazer

The ultimate high-end Houston men's style guide — an AI agent team that interviews you, looks at your photos, scouts Houston's custom and high-end menswear stores, and hands you a full phased wardrobe plan: what to buy, when, where, and how.

A React Native (Expo) app in `app/`, talking to a small Node/Express backend in `server/` that runs the agent pipeline on the Claude API.

## The agents

| Agent | Persona | Job |
|---|---|---|
| Interviewer | **Tex** | Fun, hip, funny conversation that gets a real style + budget profile — not a form. |
| Photo Analyst | **The Eye** | Reviews as many photos as you upload; calls your current style, fit, coloring, and gaps. |
| Store Scouts | **The Cutter** / **The Floor** / **The Ranch Hand** / **The Finisher** | Four specialist agents, each reviewing one slice of Houston's custom/high-end menswear scene (bespoke tailoring; luxury department & contemporary; Western wear & footwear; lifestyle & accessories) and ranking the best fits for your profile. |
| Style & Weather | **The Almanac** | Houston's climate calendar and dress culture — feeds every other agent so recommendations actually make sense for this city. |
| Wardrobe Planner | **The Closet Architect** | Synthesizes everything into one phased, budgeted, store-by-store wardrobe plan. |

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

## About the store data

`server/src/data/houstonStores.ts` is a **curated seed list built from general knowledge**, not a live, verified business directory. Every entry is flagged `verified: false` on purpose. Addresses are given at neighborhood/shopping-center granularity rather than exact street addresses, and hours, current operating status, and inventory should be confirmed independently before anyone relies on this to plan a visit — the app's UI includes that disclaimer too.

To upgrade this to live data, swap `getAllStores()` in that file for a call to a real source (Google Places API, Yelp Fusion API, etc.) — nothing else in the codebase needs to change, since every agent consumes stores through that one function.

## Extending it

- **More/better store data** — see above.
- **Persistent sessions** — replace `server/src/sessionStore.ts`'s in-memory `Map` with a database so plans survive server restarts and work across multiple server instances.
- **Save/share a plan** — the `WardrobePlan` returned by `/api/plan/generate` is already a clean JSON object; add a route to persist it and a share screen in the app.
- **Swap the model** — every agent shares one model via `AGENT_MODEL` in `server/src/config.ts`; point it at a cheaper model to cut cost, or a different one entirely.
