// The Amber Gallery — main game loop and state machine.
// States: title -> intro -> play -> (caught | roomclear) -> ... -> victory
// The player steals one star piece per room, then reaches the green exit.
// Alarm, loot, tools and the timer feed the final rank.

import { LEVELS, PLAY, START_TOOLS, TOOL_COST } from './levels.js';
import { input, bindInput, consumeClick, consumePressed, clearPressed } from './input.js';
import { sfx, ensureAudio, toggleMute } from './audio.js';
import {
  makeGuard, makeCamera, updateGuard, updateCamera, canSee, collides, dist,
} from './guards.js';
import * as R from './render.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const hudRoom = document.getElementById('hud-room');
const hudLoot = document.getElementById('hud-loot-value');
const hudAlarmFill = document.getElementById('alarm-fill');
const hudAlarmText = document.getElementById('alarm-text');
const hudTools = document.getElementById('hud-tools-value');
const hudTime = document.getElementById('hud-time-value');

const PLAYER_SPEED = 175;
const PLAYER_SNEAK = 95;
const PLAYER_RADIUS = 13;

const game = {
  state: 'title', // title | intro | play | paused | caught | roomclear | victory
  levelIndex: 0,
  level: null,
  guards: [],
  cameras: [],
  blockers: [],
  player: { x: 90, y: 620, sneaking: false, mouseX: 640, mouseY: 360 },
  loot: 0,
  lootTaken: 0,
  starTaken: false,
  alarm: 0,
  alarmPeak: 0,
  time: 0,
  levelTime: 0,
  tools: { ...START_TOOLS },
  smoke: [],
  coins: [],
  floaters: [],
  lockdown: 0,
  caughtBy: null,
  roomScores: [],
  message: '',
  messageTimer: 0,
  spottedFlash: 0,
  empFlash: 0,
};

function loadLevel(idx) {
  const def = LEVELS[idx];
  game.levelIndex = idx;
  game.level = def;
  game.guards = def.guards.map((g, i) => makeGuard(g, i));
  game.cameras = def.cameras.map((c, i) => makeCamera(c, i));
  game.blockers = [...def.walls, ...def.covers];
  game.player.x = def.playerStart.x;
  game.player.y = def.playerStart.y;
  game.starTaken = false;
  game.levelTime = 0;
  game.tools = { ...START_TOOLS };
  game.smoke = [];
  game.coins = [];
  game.floaters = [];
  game.lockdown = 0;
  game.alarm = 0;
  game.message = '';
  game.messageTimer = 0;
  // fresh loot copies per attempt
  def.loots.forEach((l) => { l.taken = false; });
  hudRoom.textContent = def.name;
}

function startGame() {
  game.loot = 0;
  game.lootTaken = 0;
  game.alarmPeak = 0;
  game.time = 0;
  game.roomScores = [];
  loadLevel(0);
  game.state = 'intro';
}

function addFloater(x, y, text, color = '#ffd75e') {
  game.floaters.push({ x, y, text, color, life: 1.4, maxLife: 1.4 });
}

function showMessage(text, secs = 3) {
  game.message = text;
  game.messageTimer = secs;
}

function rankFor(score, par, alarmPeak) {
  if (score >= 2600 && alarmPeak < 35) return 'S';
  if (score >= 2000 && alarmPeak < 60) return 'A';
  if (score >= 1300) return 'B';
  return 'C';
}

function roomScore() {
  const def = game.level;
  const timeBonus = Math.max(0, Math.round((def.par - game.levelTime) * 8));
  const calmBonus = Math.round((100 - game.alarmPeak) * 3);
  const toolBonus = game.tools.smoke * 50 + game.tools.emp * 75 + game.tools.coins * 10;
  return { timeBonus, calmBonus, toolBonus, total: game.loot + timeBonus + calmBonus + toolBonus };
}

// --- tools ------------------------------------------------------------------

function throwCoin(x, y) {
  if (game.tools.coins <= 0) { showMessage('No coins left!', 1.5); return; }
  game.tools.coins -= 1;
  game.coins.push({ x, y, life: 6 });
  sfx.coin();
  // the nearest patrolling guard walks over to look
  let best = null, bestD = 1e9;
  for (const g of game.guards) {
    const d = dist(g.x, g.y, x, y);
    if (d < bestD && (g.state === 'patrol' || g.state === 'suspicious')) { best = g; bestD = d; }
  }
  if (best && bestD < 420) {
    best.state = 'investigate';
    best.lastSeen = { x, y };
    addFloater(x, y - 14, 'clink…', '#e8e4d8');
  }
}

function dropSmoke() {
  if (game.tools.smoke <= 0) { showMessage('No smoke bombs left!', 1.5); return; }
  if (game.loot < TOOL_COST.smoke) { showMessage(`Smoke costs $${TOOL_COST.smoke} of loot`, 1.5); return; }
  game.tools.smoke -= 1;
  game.loot -= TOOL_COST.smoke;
  game.smoke.push({ x: game.player.x, y: game.player.y, r: 90, life: 5 });
  sfx.smoke();
  showMessage('Smoke! No one can see through it for 5s', 2);
}

function fireEmp() {
  if (game.tools.emp <= 0) { showMessage('No EMP pulses left!', 1.5); return; }
  if (game.loot < TOOL_COST.emp) { showMessage(`EMP costs $${TOOL_COST.emp} of loot`, 1.5); return; }
  game.tools.emp -= 1;
  game.loot -= TOOL_COST.emp;
  for (const c of game.cameras) c.disabled = 8;
  game.empFlash = 0.5;
  sfx.emp();
  showMessage('EMP! Cameras blind for 8s', 2);
}

// --- update -----------------------------------------------------------------

function updatePlayer(dt) {
  const p = game.player;
  let dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  if (dx || dy) {
    const len = Math.hypot(dx, dy);
    dx /= len; dy /= len;
    const speed = input.sneak ? PLAYER_SNEAK : PLAYER_SPEED;
    const nx = p.x + dx * speed * dt;
    const ny = p.y + dy * speed * dt;
    if (!collides(nx, p.y, game.blockers, PLAY)) p.x = nx;
    if (!collides(p.x, ny, game.blockers, PLAY)) p.y = ny;
  }
  p.sneaking = input.sneak;
  p.mouseX = input.mouseX;
  p.mouseY = input.mouseY;

  const click = consumeClick();
  if (click) throwCoin(click.x, click.y);
  if (consumePressed('Digit2')) dropSmoke();
  if (consumePressed('Digit3')) fireEmp();

  // grab loot
  if (consumePressed('KeyE')) {
    for (const l of game.level.loots) {
      if (!l.taken && dist(p.x, p.y, l.x, l.y) < 46) {
        l.taken = true;
        game.loot += l.value;
        game.lootTaken += 1;
        if (l.main) {
          game.starTaken = true;
          sfx.starPickup();
          addFloater(l.x, l.y - 30, `★ +$${l.value} — GET TO THE EXIT!`, '#ffe9a8');
          showMessage('Star piece secured! The exit is open — run!', 3.5);
        } else {
          sfx.pickup();
          addFloater(l.x, l.y - 26, `+$${l.value}`, '#ffd75e');
        }
        break;
      }
    }
  }
}

function update(dt) {
  game.time += dt;
  game.levelTime += dt;
  if (game.messageTimer > 0) game.messageTimer -= dt;
  if (game.spottedFlash > 0) game.spottedFlash -= dt;
  if (game.empFlash > 0) game.empFlash -= dt;
  if (game.lockdown > 0) game.lockdown -= dt;

  updatePlayer(dt);

  // smoke and coins decay
  for (const s of game.smoke) s.life -= dt;
  game.smoke = game.smoke.filter((s) => s.life > 0);
  for (const c of game.coins) c.life -= dt;
  game.coins = game.coins.filter((c) => c.life > 0);
  for (const f of game.floaters) { f.life -= dt; f.y -= 22 * dt; }
  game.floaters = game.floaters.filter((f) => f.life > 0);

  let anySeen = false;
  let alarmRate = 0;

  for (const g of game.guards) {
    const sees = updateGuard(g, dt, game.player, game.blockers, PLAY, game.smoke, (kind) => {
      if (kind === 'chase') {
        sfx.spotted();
        game.spottedFlash = 0.9;
        showMessage('SPOTTED! Break line of sight!', 2);
      } else if (kind === 'suspicious') {
        sfx.alarm();
        showMessage('A guard is suspicious…', 1.5);
      }
    }, game.level.spot ?? 1);
    if (sees) {
      anySeen = true;
      const d = dist(g.x, g.y, game.player.x, game.player.y);
      alarmRate += (d < 90 ? 16 : 9) * (game.player.sneaking ? 0.5 : 1);
    }
    // caught?
    if (g.state === 'chase' && g.chaseGrace <= 0 && dist(g.x, g.y, game.player.x, game.player.y) < 26) {
      game.state = 'caught';
      game.caughtBy = 'guard';
      sfx.caught();
      return;
    }
  }

  for (const cam of game.cameras) {
    const sees = updateCamera(cam, dt, game.time, game.player, game.blockers, game.smoke, game.level.spot ?? 1);
    if (sees) {
      anySeen = true;
      alarmRate += 12;
      if (cam.seenAmount > 0.85 && game.alarm < 100) {
        // camera locks on: guards converge on your position
        for (const g of game.guards) {
          if (g.state === 'patrol') { g.state = 'suspicious'; g.lastSeen = { x: game.player.x, y: game.player.y }; }
        }
      }
    }
  }

  if (anySeen) {
    game.alarm = Math.min(100, game.alarm + alarmRate * dt);
  } else {
    game.alarm = Math.max(0, game.alarm - 3 * dt);
  }
  game.alarmPeak = Math.max(game.alarmPeak, game.alarm);

  if (game.alarm >= 100 && game.lockdown <= 0) {
    game.lockdown = 8;
    game.alarm = 60;
    sfx.alarm();
    showMessage('LOCKDOWN! The exit is sealed for 8s — hide!', 3.5);
    for (const g of game.guards) {
      g.state = 'suspicious';
      g.lastSeen = { x: game.player.x, y: game.player.y };
      g.lookTimer = 3;
    }
  }

  // exit
  const e = game.level.exit;
  if (game.starTaken && game.lockdown <= 0
    && game.player.x > e.x && game.player.x < e.x + e.w
    && game.player.y > e.y && game.player.y < e.y + e.h) {
    const score = roomScore();
    game.roomScores.push({ room: game.level.name, ...score, alarmPeak: Math.round(game.alarmPeak) });
    sfx.door();
    if (game.levelIndex + 1 < LEVELS.length) {
      game.state = 'roomclear';
    } else {
      game.state = 'victory';
      sfx.win();
    }
  }
}

// --- draw -------------------------------------------------------------------

function draw() {
  const def = game.level || LEVELS[0];
  ctx.clearRect(0, 0, 1280, 720);
  R.drawFloor(ctx, PLAY);
  R.drawExit(ctx, def.exit, game.starTaken && game.lockdown <= 0, game.time);
  R.drawCovers(ctx, def.covers);
  R.drawWalls(ctx, def.walls);
  R.drawLoot(ctx, def.loots, game.time); // loot glows above cover, so its label never hides
  for (const c of game.cameras) R.drawCamera(ctx, c, game.blockers);
  for (const g of game.guards) R.drawGuard(ctx, g, game.blockers);
  R.drawSmoke(ctx, game.smoke, game.time);
  R.drawCoins(ctx, game.coins);
  R.drawPlayer(ctx, game.player, game.time);
  R.drawFloaters(ctx, game.floaters);

  // nearby-loot hint
  if (game.state === 'play') {
    for (const l of def.loots) {
      if (!l.taken && dist(game.player.x, game.player.y, l.x, l.y) < 46) {
        ctx.fillStyle = '#ffe9a8';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Press E to grab', l.x, l.y - 34);
        break;
      }
    }
  }

  if (game.messageTimer > 0) {
    ctx.globalAlpha = Math.min(1, game.messageTimer);
    ctx.font = 'bold 15px sans-serif';
    const w = ctx.measureText(game.message).width + 36;
    ctx.fillStyle = 'rgba(10,8,14,0.85)';
    ctx.fillRect(640 - w / 2, 636, w, 34);
    ctx.strokeStyle = '#b98a1e';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(640 - w / 2, 636, w, 34);
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(game.message, 640, 654);
    ctx.globalAlpha = 1;
  }

  if (game.spottedFlash > 0) {
    ctx.fillStyle = `rgba(226,59,46,${game.spottedFlash * 0.12})`;
    ctx.fillRect(0, 0, 1280, 720);
  }
  if (game.empFlash > 0) {
    ctx.fillStyle = `rgba(120,200,255,${game.empFlash * 0.25})`;
    ctx.fillRect(0, 0, 1280, 720);
  }
  if (game.lockdown > 0) {
    ctx.fillStyle = '#ff5a4a';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`🔒 LOCKDOWN ${Math.ceil(game.lockdown)}s`, 640, 40);
  }
}

function panel(x, y, w, h) {
  ctx.fillStyle = 'rgba(12,9,18,0.92)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#b98a1e';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
}

function drawTitle() {
  draw();
  ctx.fillStyle = 'rgba(8,6,12,0.72)';
  ctx.fillRect(0, 0, 1280, 720);
  panel(290, 130, 700, 440);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd75e';
  ctx.font = 'bold 54px Georgia, serif';
  ctx.fillText('THE AMBER GALLERY', 640, 210);
  ctx.fillStyle = '#e8e4d8';
  ctx.font = '20px Georgia, serif';
  ctx.fillText('A heist in three rooms', 640, 248);
  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#bdb5c8';
  const lines = [
    'Three rooms. Three star pieces. One way out.',
    'Read the cones before you move — guards patrol, cameras sweep,',
    'and every second you are seen, the alarm climbs.',
    'Coins lure guards away. Smoke blinds them. EMP blinds the cameras.',
    'Tools cost loot. Silence is free.',
  ];
  lines.forEach((l, i) => ctx.fillText(l, 640, 300 + i * 26));
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('Click or press Enter to begin', 640, 470);
  ctx.fillStyle = '#8d879e';
  ctx.font = '14px sans-serif';
  ctx.fillText('WASD move · Shift sneak · E grab · Click toss coin · 2 smoke · 3 EMP · M mute', 640, 520);
}

function drawIntro() {
  draw();
  ctx.fillStyle = 'rgba(8,6,12,0.72)';
  ctx.fillRect(0, 0, 1280, 720);
  panel(340, 220, 600, 260);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd75e';
  ctx.font = 'bold 34px Georgia, serif';
  ctx.fillText(game.level.name, 640, 285);
  ctx.fillStyle = '#e8e4d8';
  ctx.font = '17px sans-serif';
  ctx.fillText(game.level.intro, 640, 330);
  ctx.fillStyle = '#bdb5c8';
  ctx.font = '15px sans-serif';
  ctx.fillText(`Par time ${game.level.par}s · Grab the star piece, then reach the green EXIT.`, 640, 368);
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 17px sans-serif';
  ctx.fillText('Click or press Enter to start the room', 640, 425);
}

function drawCaught() {
  draw();
  ctx.fillStyle = 'rgba(40,4,6,0.78)';
  ctx.fillRect(0, 0, 1280, 720);
  panel(390, 220, 500, 280);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff5a4a';
  ctx.font = 'bold 44px Georgia, serif';
  ctx.fillText('CAUGHT!', 640, 290);
  ctx.fillStyle = '#e8e4d8';
  ctx.font = '17px sans-serif';
  ctx.fillText('The guard got a hand on your collar.', 640, 335);
  ctx.fillText('The gallery keeps its secrets — this time.', 640, 362);
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 17px sans-serif';
  ctx.fillText('Press R to retry the room', 640, 425);
  ctx.fillStyle = '#8d879e';
  ctx.font = '14px sans-serif';
  ctx.fillText('Tip: break line of sight before the guard finishes shouting.', 640, 460);
}

function drawRoomClear() {
  const s = game.roomScores[game.roomScores.length - 1]
    || { timeBonus: 0, calmBonus: 0, toolBonus: 0, total: 0, alarmPeak: 0 };
  draw();
  ctx.fillStyle = 'rgba(8,6,12,0.78)';
  ctx.fillRect(0, 0, 1280, 720);
  panel(390, 170, 500, 380);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#2ecc71';
  ctx.font = 'bold 40px Georgia, serif';
  ctx.fillText('CLEAN GETAWAY', 640, 235);
  ctx.fillStyle = '#e8e4d8';
  ctx.font = '17px sans-serif';
  const rows = [
    [`Loot this room`, `$${game.loot}`],
    [`Time bonus`, `+$${s.timeBonus}`],
    [`Calm bonus (alarm peak ${s.alarmPeak}%)`, `+$${s.calmBonus}`],
    [`Tools kept`, `+$${s.toolBonus}`],
    [`Room total`, `$${s.total}`],
  ];
  rows.forEach(([k, v], i) => {
    ctx.fillStyle = i === rows.length - 1 ? '#ffd75e' : '#e8e4d8';
    ctx.font = i === rows.length - 1 ? 'bold 18px sans-serif' : '16px sans-serif';
    ctx.fillText(`${k}: ${v}`, 640, 285 + i * 30);
  });
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 17px sans-serif';
  ctx.fillText('Click or press Enter for the next room', 640, 490);
}

function drawVictory() {
  const total = game.roomScores.reduce((a, s) => a + s.total, 0);
  const rank = rankFor(total, 0, game.alarmPeak);
  ctx.fillStyle = '#141019';
  ctx.fillRect(0, 0, 1280, 720);
  panel(290, 110, 700, 500);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd75e';
  ctx.font = 'bold 36px Georgia, serif';
  ctx.fillText('THE AMBER STAR IS YOURS', 640, 175);
  ctx.fillStyle = '#e8e4d8';
  ctx.font = '20px Georgia, serif';
  ctx.fillText('Three rooms. Three star pieces. One legend.', 640, 212);
  ctx.font = '17px sans-serif';
  game.roomScores.forEach((s, i) => {
    ctx.fillText(`${s.room} — $${s.total}  (alarm peak ${s.alarmPeak}%)`, 640, 270 + i * 30);
  });
  ctx.fillStyle = '#ffd75e';
  ctx.font = 'bold 26px Georgia, serif';
  ctx.fillText(`Total haul: $${total}`, 640, 400);
  ctx.font = 'bold 60px Georgia, serif';
  ctx.fillStyle = rank === 'S' ? '#ffd75e' : '#e8e4d8';
  ctx.fillText(`RANK ${rank}`, 640, 480);
  ctx.fillStyle = '#bdb5c8';
  ctx.font = '15px sans-serif';
  ctx.fillText(`Time ${Math.floor(game.time / 60)}:${String(Math.floor(game.time % 60)).padStart(2, '0')} · Alarm peak ${Math.round(game.alarmPeak)}% · Loot $${game.loot}`, 640, 525);
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 17px sans-serif';
  ctx.fillText('Press Enter to play again', 640, 565);
}

function drawPaused() {
  draw();
  ctx.fillStyle = 'rgba(8,6,12,0.7)';
  ctx.fillRect(0, 0, 1280, 720);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8e4d8';
  ctx.font = 'bold 44px Georgia, serif';
  ctx.fillText('PAUSED', 640, 350);
  ctx.font = '17px sans-serif';
  ctx.fillText('Press P to resume', 640, 395);
}

// --- HUD ----------------------------------------------------------------------

function updateHud() {
  hudLoot.textContent = `$${game.loot}`;
  hudAlarmFill.style.width = `${Math.round(game.alarm)}%`;
  hudAlarmText.textContent = game.lockdown > 0 ? `LOCKDOWN ${Math.ceil(game.lockdown)}s` : `${Math.round(game.alarm)}%`;
  hudTools.textContent = `🪙 ${game.tools.coins} · 💨 ${game.tools.smoke} · ⚡ ${game.tools.emp}`;
  const t = Math.floor(game.levelTime);
  hudTime.textContent = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

// --- main loop ----------------------------------------------------------------

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  // Schedule the next frame first: one bad frame must never kill the loop.
  requestAnimationFrame(frame);
  try {
    if (game.state === 'play') update(dt);
    if (game.state === 'title') drawTitle();
    else if (game.state === 'intro') drawIntro();
    else if (game.state === 'caught') drawCaught();
    else if (game.state === 'roomclear') drawRoomClear();
    else if (game.state === 'victory') drawVictory();
    else if (game.state === 'paused') drawPaused();
    else draw();
    updateHud();
  } catch (err) {
    console.error('frame error:', err);
  }
}

function onKey(code) {
  ensureAudio();
  if (code === 'KeyM') { toggleMute(); return; }
  if (code === 'KeyP' && game.state === 'play') { game.state = 'paused'; return; }
  if (code === 'KeyP' && game.state === 'paused') { game.state = 'play'; return; }
  if (code === 'KeyR' && (game.state === 'caught' || game.state === 'play' || game.state === 'paused')) {
    loadLevel(game.levelIndex);
    game.state = 'intro';
    return;
  }
  if ((code === 'Enter' || code === 'Space')) {
    if (game.state === 'title') startGame();
    else if (game.state === 'intro') { game.state = 'play'; clearPressed(); }
    else if (game.state === 'roomclear') { loadLevel(game.levelIndex + 1); game.state = 'intro'; }
    else if (game.state === 'victory') startGame();
  }
}

canvas.addEventListener('mousedown', () => {
  ensureAudio();
  if (game.state === 'title') startGame();
  else if (game.state === 'intro') game.state = 'play';
  else if (game.state === 'roomclear') { loadLevel(game.levelIndex + 1); game.state = 'intro'; }
  else if (game.state === 'victory') startGame();
});

bindInput(canvas, onKey);

// Screenshot/demo states: ?shot=1..4 renders a mid-heist moment of the real game.
const shot = new URLSearchParams(location.search).get('shot');
loadLevel(0);
if (shot) {
  applyShot(game, shot, loadLevel);
} else {
  game.state = 'title';
}

// Debug handle used by the play-test script (read-only state snapshot).
window.AMBER = {
  game,
  start: () => { startGame(); game.state = 'play'; },
  state: () => ({
    state: game.state, level: game.levelIndex, loot: game.loot,
    starTaken: game.starTaken, alarm: Math.round(game.alarm),
    player: { x: Math.round(game.player.x), y: Math.round(game.player.y) },
    guards: game.guards.map((g) => ({ state: g.state, x: Math.round(g.x), y: Math.round(g.y) })),
  }),
};

clearPressed();
requestAnimationFrame(frame);
