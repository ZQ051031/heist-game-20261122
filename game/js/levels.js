// Level data for The Amber Gallery: three single-screen rooms.
// Each room is one frame: walls, cover that blocks sight and movement,
// guard patrols, sweeping cameras, loot (one star piece per room) and an exit.
// Coordinates are canvas pixels; the playfield runs x 20..1260, y 20..700.
//
// Geometry rule, checked by /tmp/pwtest/validate-levels.mjs: every guard
// patrol leg clears every wall and cover by the guard's radius, and every
// loot piece sits on open floor (reachable by a player of radius 13).

export const PLAY = { x: 20, y: 20, w: 1240, h: 680 };

function wall(x, y, w, h) { return { x, y, w, h }; }
function cover(x, y, w, h, kind) { return { x, y, w, h, kind }; } // kind: case | planter | statue | pillar
function guard(waypoints, speed = 62) { return { waypoints, speed }; }
function camera(x, y, baseAngle, sweep, range = 280) { return { x, y, baseAngle, sweep, range }; }
function loot(x, y, value, kind, main = false) { return { x, y, value, kind, main, taken: false }; }

export const LEVELS = [
  {
    name: '1 · The Marble Foyer',
    intro: 'The gallery sleeps. Lift the Jade Scarab, then slip out the green door.',
    playerStart: { x: 90, y: 620 },
    exit: { x: 1170, y: 40, w: 70, h: 70 },
    walls: [
      wall(300, 20, 24, 300),    // north gallery divider, gap at the bottom
      wall(300, 470, 24, 230),
      wall(640, 180, 24, 520),   // long central wall, gaps top and bottom
      wall(940, 20, 24, 260),
      wall(940, 430, 24, 270),
    ],
    covers: [
      // zone A (left strip): no guards, free placement
      cover(60, 120, 110, 70, 'case'),
      cover(60, 480, 70, 70, 'planter'),
      cover(180, 300, 70, 70, 'statue'),
      // zone B (mid-left): guard 0 shuttles north-south at x=500, leaving
      // a clear transit lane along the central wall for a well-timed crossing
      cover(400, 300, 70, 70, 'case'),
      cover(400, 480, 70, 70, 'planter'),
      // zone C (mid-right): guard 1 patrols the rect (760..900, 120..560)
      cover(800, 300, 70, 70, 'case'),
      cover(790, 450, 70, 70, 'planter'),
      // zone D (right strip): no guards
      cover(1040, 150, 110, 70, 'case'),
      cover(1060, 480, 70, 70, 'planter'),
      cover(1140, 300, 70, 70, 'statue'),
    ],
    guards: [
      guard([{ x: 500, y: 150 }, { x: 500, y: 550 }], 48),
      guard([{ x: 760, y: 120 }, { x: 760, y: 560 }, { x: 900, y: 560 }, { x: 900, y: 120 }], 48),
    ],
    cameras: [
      camera(640, 30, Math.PI / 2, 0.9, 280),
      camera(1240, 380, Math.PI, 0.7, 260),
    ],
    loots: [
      loot(250, 120, 120, 'gem'),
      loot(480, 90, 150, 'painting'),
      loot(720, 520, 150, 'gem'),
      loot(1150, 600, 200, 'painting'),
      loot(700, 330, 500, 'scarab', true), // the star piece of this room
    ],
    par: 75,
    spot: 0.6,
  },
  {
    name: '2 · The Hall of Coins',
    intro: 'Two cameras sweep the coin hall. Take the Gilded Astrolabe — mind the lasers of light.',
    playerStart: { x: 90, y: 90 },
    exit: { x: 1170, y: 590, w: 70, h: 70 },
    walls: [
      wall(220, 20, 24, 240),
      wall(220, 400, 24, 300),
      wall(560, 140, 24, 420),   // gaps top (20..140) and bottom (560..700)
      wall(880, 20, 24, 300),
      wall(880, 470, 24, 230),
      wall(380, 560, 300, 24),   // low wall, two ways around it
    ],
    covers: [
      // zone A: guard 0 shuttles (60,350)-(180,350)
      cover(60, 120, 110, 70, 'case'),
      cover(60, 500, 70, 70, 'planter'),
      // zone B: no guards
      cover(330, 90, 120, 70, 'case'),
      cover(300, 300, 70, 70, 'planter'),
      cover(420, 400, 70, 70, 'statue'),
      // zone C: guard 1 patrols the rect (660..800, 150..520)
      cover(690, 300, 90, 70, 'case'),
      cover(700, 400, 70, 70, 'statue'),
      cover(700, 200, 70, 70, 'planter'),
      // zone D: guard 2 shuttles x=1000, y 120..580
      cover(1080, 300, 110, 70, 'case'),
      cover(1060, 120, 70, 70, 'planter'),
      cover(1120, 500, 70, 70, 'statue'),
    ],
    guards: [
      guard([{ x: 60, y: 350 }, { x: 180, y: 350 }], 58),
      guard([{ x: 660, y: 150 }, { x: 660, y: 520 }, { x: 800, y: 520 }, { x: 800, y: 150 }], 68),
      guard([{ x: 1000, y: 120 }, { x: 1000, y: 580 }], 62),
    ],
    cameras: [
      camera(560, 30, Math.PI / 2, 1.0, 300),
      camera(30, 360, 0, 0.8, 280),
      camera(1240, 640, -Math.PI / 2, 0.9, 280),
    ],
    loots: [
      loot(145, 200, 150, 'gem'),
      loot(480, 120, 180, 'painting'),
      loot(715, 125, 150, 'gem'),
      loot(1055, 375, 200, 'painting'),
      loot(700, 620, 150, 'gem'),
      loot(740, 480, 700, 'astrolabe', true),
    ],
    par: 90,
    spot: 0.85,
  },
  {
    name: '3 · The Amber Vault',
    intro: 'The Amber Star waits behind the tightest patrol in the house. Take it and run.',
    playerStart: { x: 640, y: 640 },
    exit: { x: 90, y: 40, w: 70, h: 70 },
    walls: [
      wall(360, 20, 24, 260),
      wall(360, 430, 24, 270),
      wall(700, 180, 24, 520),   // gap at the top (20..180)
      wall(1040, 20, 24, 260),
      wall(1040, 430, 24, 270),
      wall(500, 330, 240, 24),   // vault antechamber wall; the Star sits just below it
    ],
    covers: [
      // zone A: guard 0 patrols the rect (100..280, 120..560)
      cover(150, 300, 110, 70, 'case'),
      cover(150, 450, 70, 70, 'planter'),
      cover(170, 200, 70, 70, 'statue'),
      // zone B: guard 2 shuttles x=460, y 110..600
      cover(500, 90, 120, 70, 'case'),
      cover(560, 480, 70, 70, 'statue'),
      cover(600, 200, 70, 70, 'planter'),
      // zone C: guard 3 shuttles x=860, y 240..430
      cover(900, 200, 110, 70, 'case'),
      cover(830, 120, 70, 70, 'planter'),
      cover(770, 420, 70, 70, 'statue'),
      // zone D: guard 1 patrols the rect (1100..1200, 120..560)
      cover(1120, 300, 60, 70, 'case'),
      cover(1120, 450, 60, 70, 'planter'),
    ],
    guards: [
      guard([{ x: 100, y: 120 }, { x: 100, y: 560 }, { x: 280, y: 560 }, { x: 280, y: 120 }], 74),
      guard([{ x: 1100, y: 120 }, { x: 1100, y: 560 }, { x: 1200, y: 560 }, { x: 1200, y: 120 }], 78),
      guard([{ x: 460, y: 110 }, { x: 460, y: 600 }], 66),
      guard([{ x: 860, y: 240 }, { x: 860, y: 430 }], 70),
    ],
    cameras: [
      camera(640, 30, Math.PI / 2, 1.1, 300),
      camera(30, 360, 0, 0.9, 290),
      camera(1240, 360, Math.PI, 0.9, 290),
      camera(640, 690, -Math.PI / 2, 0.8, 280),
    ],
    loots: [
      loot(130, 210, 200, 'gem'),
      loot(660, 120, 220, 'painting'),
      loot(950, 150, 200, 'gem'),
      loot(1150, 420, 250, 'painting'),
      loot(505, 515, 200, 'gem'),
      loot(640, 370, 1500, 'star', true), // THE AMBER STAR
    ],
    par: 110,
    spot: 1.0,
  },
];

// Starting tools. Smoke and EMP cost loot when used; coins are free but few.
export const START_TOOLS = { coins: 5, smoke: 2, emp: 1 };
export const TOOL_COST = { smoke: 100, emp: 150 };
