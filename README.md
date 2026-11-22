# The Amber Gallery — A Heist in Three Rooms

An original top-down stealth heist game, built for the make.fun
**best-heist-game-20261122-0559** bounty ("Make the best heist game").

You are the thief they call Wren. Three rooms of the Amber Gallery sleep
behind you, three star pieces wait inside: the Jade Scarab, the Gilded
Astrolabe, and the Amber Star itself. Take each one, then slip out the
green exit — without letting the guards or the cameras raise the alarm
past the point of no return.

## How to play

Open `game/index.html` in a desktop browser (or serve `game/` with any
static server). No network requests, no build step.

| Input | Action |
|---|---|
| WASD / Arrow keys | Move |
| Shift | Sneak (slower, harder to spot) |
| E | Grab loot |
| Mouse click | Toss a coin — the nearest guard walks over to look |
| 2 | Smoke bomb — blinds sight for 5s (costs $100 of loot) |
| 3 | EMP pulse — blinds all cameras for 8s (costs $150 of loot) |
| P | Pause · R — restart room · M — mute |

## The rooms

1. **The Marble Foyer** — two patrolling guards, two sweeping cameras,
   the Jade Scarab. Learn to read the cones.
2. **The Hall of Coins** — three guards, three cameras, the Gilded
   Astrolabe, and a low wall with two ways around it.
3. **The Amber Vault** — four guards, four cameras, the Amber Star behind
   the tightest patrol in the house.

## The rules of the house

- **Vision cones are honest.** Amber cones are guards, red cones are
  cameras. If you are inside one with a clear line of sight, you are
  being seen. Walls, display cases, planters and statues block sight —
  use them.
- **Guards think in stages.** A guard who half-sees you grows
  suspicious and comes to look. A guard who is sure gives you a one-second
  shout of warning, then sprints. Break line of sight and they lose you.
- **The alarm is a meter, not a switch.** Being seen fills it; hiding
  drains it. At 100% the gallery locks down for 8 seconds: the exit seals
  and every guard converges on where you were last seen.
- **Tools cost loot.** Smoke and EMP are bought with what you have
  already stolen. Coins are free, but there are only five.
- **The getaway pays for planning.** Your rank (S/A/B/C) comes from the
  total haul, the time against par, the alarm peak, and the tools you
  kept.

## Screenshots

`screenshots/` holds four real renders of the game's own code, taken in
headless Chrome while the game was running (`?shot=1..4` stages a
mid-heist moment; the game renders it live):

1. `1-foyer-crossing.jpg` — the cover: crossing the foyer under sweeping cones.
2. `2-astrolabe-approach.jpg` — closing on the Astrolabe as a guard turns suspicious.
3. `3-vault-smoke.jpg` — smoke out at the Amber Star, alarm high, a guard closing in.
4. `4-coin-lure.jpg` — a tossed coin pulls a guard off his patrol.

## Layout

```
main.ts                  entry program: copies game/ + screenshots/ to /output,
                         writes /output/dossier.json via vendor/makefun-game.ts
vendor/makefun-game.ts   the kit's library, unchanged
game/
  index.html             page shell: HUD (room, loot, alarm meter, tools, time)
  style.css              HUD and frame styling
  js/main.js             game loop, states, scoring, tools, screens
  js/levels.js           the three rooms: walls, cover, patrols, cameras, loot
  js/guards.js           patrol AI, vision cones, line of sight, cameras
  js/render.js           canvas drawing: floor, cones, guards, loot, player
  js/input.js            keyboard + mouse
  js/audio.js            synthesised WebAudio sounds (no audio files)
  js/shots.js            deterministic mid-heist states for screenshots
screenshots/            4 real renders of the game
LICENSE                  MIT
```

## Verify locally

```sh
# serve the game and play it
node --version   # 22.18+
python3 -m http.server 8080 --directory game
# open http://localhost:8080

# build the hand-in the way the grader does
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
# out/ now holds game/, screenshots/ and dossier.json
```

## License

MIT — see `LICENSE`.
