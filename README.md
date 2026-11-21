# Moth & Lantern — Five Heists

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/bsnpg/moth-lantern-stealth-v4/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/bsnpg/moth-lantern-stealth-v4/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

A complete top-down stealth game for the make.fun best-stealth-game bounty.
You are a moth thief. Five heists, five rooms, twenty-five guards — steal the
objective in each room and reach the exit unseen.

## The five heists

1. **The Glasshouse Conservatory** — steal the Moonflower Bloom. 3 guards.
   Learn coins and hiding in the fern beds.
2. **The Counting House** — steal the Brass Ledger. 4 guards, 1 sweeping
   camera. Smoke the camera or time its sweep; swing to the roof hatch.
3. **The Bellwright Foundry** — steal the Founder's Bell Clapper. 5 guards,
   2 cameras, 2 pulsing laser tripwires, 2 vents. Each laser is wired to a
   wall lantern: snuff the lantern and its laser dies for 6 seconds.
4. **The Reliquary Archive** — steal the Sealed Codex. 6 guards including a
   warden who re-lights snuffed lanterns and a Moth-Hunter who sees through
   dim light. 3 lasers, 3 vents.
5. **The Sky Palace** — take the Palace Key, then the Moth Crown, then run
   for the airship gangway. 7 guards, 3 cameras, 3 lasers, gust vents that
   flare your Wing Dust.

## Systems

- **Wing Dust / visibility** — lantern light fills your dust meter; shadow
  drains it. In shadow guards detect you at 0.45x, in the light at 2.2x.
- **Noise** — walking, dashing, snuffing and laser trips are loud. Guards
  inside the audible radius come to investigate.
- **Guard states** — PATROL / SUSPICIOUS ("WHAT WAS THAT?") / ALARM
  ("SPOTTED!"). An alarm is a strike; three strikes fail the heist.
- **Gadgets** — throwable coins (lure guards), smoke canisters (blind cones
  and cameras), snuff (kill a lantern — and any laser wired to it).
- **Cameras** — cyan sweeping cones; fill their exposure meter and they
  raise the alarm. Smoke blinds them; a snuffed lamp cuts their range.
- **Lasers** — pulse 2 s on / 2 s off with a 1 s warning glow. Crossing a
  live beam is an instant alarm.
- **Vents** — crawl silently, invisible to cameras. **Low cover** — hide in
  fern beds, crates and desks. **Swing chains** — cross gaps and counters.
- **Score / Heat / Strikes / Ghost** — loot, heist bonus, time bonus, and
  +500 GHOST per heist finished with no alarms, no spots and all loot. Heat
  above 70 spawns an extra patrol and speeds the cameras up.

## Controls

- WASD / arrows — move
- SHIFT — dash (loud)
- E — hide in cover / crawl a vent / grab a swing chain
- Q or click — throw a coin at the mouse
- 2 — smoke canister
- 3 or F — snuff the nearest lantern
- SPACE — release a swing early
- P — pause

## Running it

Serve `game/` with any static server and open `game/index.html` in desktop
Chrome. No network, no build step. Screenshots are real renders of the
game's own code, staged with `?shot=1..4`.

## Layout

- `main.ts` — the entry program: copies game/ and screenshots/ to the
  output directory and writes dossier.json.
- `game/index.html` — the page; `game/src/main.js` is the entry module.
- `game/src/config.js` — tuning numbers, palette, the five heist layouts.
- `game/src/world.js` — geometry (cones, line of sight, collision) and the
  heist state builder.
- `game/src/render.js` — all canvas drawing, including the HUD panel.
- `game/src/main.js` — game loop, guard AI, gadgets, detection, scoring.
- `game/src/shots.js` — the four staged screenshot states + self-test.
- `game/src/input.js` — keyboard and mouse. `game/src/random.js` — seeded RNG.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.

MIT licensed. Original art, names and code — no assets from any other game.
