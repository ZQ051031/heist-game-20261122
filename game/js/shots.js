// Deterministic mid-heist states for the maker's screenshots (?shot=1..4).
// These only place the player, set the alarm and nudge guard states —
// everything on screen is still rendered live by the real game code.

import { LEVELS } from './levels.js';

function placePlayer(game, x, y) {
  game.player.x = x;
  game.player.y = y;
}

export function applyShot(game, shot, loadLevel) {
  game.state = 'play';
  if (shot === '1') {
    // Cover: room 1, the thief mid-crossing, cones sweeping, loot glowing.
    loadLevel(0);
    placePlayer(game, 430, 400);
    game.alarm = 12;
    game.loot = 270;
    game.level.loots[0].taken = true;
    game.level.loots[1].taken = true;
    game.state = 'play';
  } else if (shot === '2') {
    // Room 2, closing on the Gilded Astrolabe while a guard grows suspicious.
    loadLevel(1);
    placePlayer(game, 700, 430);
    game.alarm = 45;
    game.loot = 480;
    game.level.loots[0].taken = true;
    game.level.loots[1].taken = true;
    const g = game.guards[1];
    g.state = 'suspicious';
    g.lastSeen = { x: 700, y: 430 };
    g.x = 760; g.y = 260;
    g.angle = Math.atan2(430 - 260, 700 - 760);
    g.seenAmount = 0.7;
    game.state = 'play';
  } else if (shot === '3') {
    // Room 3, smoke out at the Amber Star with the alarm high and a guard closing in.
    loadLevel(2);
    placePlayer(game, 640, 430);
    game.alarm = 72;
    game.loot = 870;
    game.level.loots[0].taken = true;
    game.level.loots[1].taken = true;
    game.level.loots[2].taken = true;
    game.smoke.push({ x: 640, y: 430, r: 90, life: 4 });
    const g = game.guards[3];
    g.state = 'chase';
    g.chaseGrace = 2.5;
    g.x = 760; g.y = 300;
    g.lastSeen = { x: 640, y: 430 };
    game.state = 'play';
  } else if (shot === '4') {
    // Room 2, a tossed coin lures a guard off his patrol while the thief slips past.
    loadLevel(1);
    placePlayer(game, 480, 330);
    game.alarm = 25;
    game.loot = 330;
    game.level.loots[0].taken = true;
    game.coins.push({ x: 300, y: 200, life: 6 });
    const g = game.guards[0];
    g.state = 'investigate';
    g.lastSeen = { x: 300, y: 200 };
    g.x = 280; g.y = 280;
    game.tools.coins = 4;
    game.state = 'play';
  } else {
    loadLevel(0);
    game.state = 'title';
  }
  // keep the HUD honest about the staged state
  game.alarmPeak = game.alarm;
}
