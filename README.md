# party-games

Local-multiplayer party game platform. One Node server (runs on a laptop,
a phone hotspot host, or behind a tunnel); phones join through the browser.
Turn-based games only — no tick loops, no prediction, no interpolation.

## Slice 1: game engine + plugin framework

- `src/framework.ts` — the `GameDefinition` contract every game implements,
  plus the game-agnostic wire protocol (`ClientMessage` / `ServerMessage`).
- `src/games/liars-dice/` — game #1: pure engine, plugin wiring, tests.

## Run

```sh
npm install
npm test        # tsc + node --test, all engine tests
```

## Slices

1. ✅ Engine: pure Liar's Dice logic + `GameDefinition` plugin framework + wire
   protocol (`src/framework.ts`). 10 engine tests.
2. ✅ Server: one table, no rooms or codes — whoever connects joins. The
   first player to join is the host. Names are unique and act as identity:
   reconnecting with the same name reclaims your seat (a name that's
   already in use is rejected). A dealt-in player disconnecting mid-game
   pauses it; the game auto-resumes when everyone is back, or the host
   can send everyone back to the lobby. If the host disconnects, the
   earliest-joined connected player becomes host (and keeps it). The
   host picks the game from the lobby.
   Static file serving on the same port; the server prints its LAN URL on
   startup. Unit + socket e2e tests (a real two-player game played over
   actual websockets, plus pause/rejoin/host-migration).
3. ✅ Client: React 19 + Vite, mobile-first. Name-only join (rejoin with the
   same name to reclaim your seat), then lobby → game. The host picks the
   game in the lobby. Each game is a component registered in
   `client/src/games/` — new games plug in there. No server address to
   type — it always talks to the server that served the page. Paused-game
   banner with a host "back to lobby" button.
4. ✅ Docs: `docs/phone-hosting.md` — Termux setup, same-WiFi hosting, and
   Cloudflare Tunnel for cross-network play.

## Run

```sh
npm install
npm test        # build + all tests (engine, rooms, socket e2e)
npm run serve   # build + start on http://localhost:8080 (PORT=xxxx to change)
```

Open two browser tabs at http://localhost:8080 to play against yourself.

### Dev mode (UI iteration)

```sh
npm run dev   # game server (auto-restart) + Vite dev server with hot reload
```

Open `http://localhost:5173` — the page comes from Vite, websocket
traffic is proxied to the game server.

For UI work with no server and no second player, open
`http://localhost:5173/?dev`: a playground rendering every game screen
against hand-built mock states (my turn, their turn, challenge reveal,
paused, game over…) plus the lobby. Clicks log the action they'd send
instead of sending it. Scenarios live in `client/src/dev/mocks.ts`.

### UI components

Styling is Tailwind v4 (`@tailwindcss/vite`). The theme tokens — Jason's
tweaked colors — live in `client/src/index.css` under `@theme`.
`client/src/components/ui.tsx` holds the shared components (`Screen`,
`TopBar`, `StickyBar`, `Button`, `Chip`, `Notice`, `Field`, `Label`,
`Divider`, `Die`…): screens compose those instead of hand-rolling class
strings. Game-specific layout stays in the game's own component file.

Design language: flat and mobile-first — no card boxes. Sections are
separated by hairline dividers, the header is a sticky blurred bar, and
primary actions sit in a sticky bottom bar (`StickyBar`) where thumbs
can reach them. One accent color, used sparingly.

## Design notes

- The engine is pure: `(state, playerId, action, rand?) -> { state, events }`.
  Illegal actions throw; the server translates those into error messages.
- Hidden information lives in `getView()` — a player only ever sees their
  own dice plus everyone else's counts. Tests assert no leakage.
- Randomness is injected, so tests rig the dice deterministically.
- The framework stays minimal until the second game (poker) earns new features.
