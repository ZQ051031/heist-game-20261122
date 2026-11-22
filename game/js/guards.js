// Guards, cameras and vision for The Amber Gallery.
// A guard patrols waypoints, turns a vision cone, and escalates
// patrol -> suspicious -> chase. Cameras sweep a cone and feed the alarm.
// Line of sight is blocked by walls and cover (display cases, planters, statues).

export const CONE_HALF_ANGLE = 0.61; // ~35 degrees each side
export const GUARD_RANGE = 240;
export const RAY_COUNT = 26;

// --- geometry helpers -------------------------------------------------------

export function dist(ax, ay, bx, by) { return Math.hypot(bx - ax, by - ay); }

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Does segment (x1,y1)-(x2,y2) cross rectangle r?
function segmentHitsRect(x1, y1, x2, y2, r) {
  const dx = x2 - x1, dy = y2 - y1;
  let tmin = 0, tmax = 1;
  if (Math.abs(dx) < 1e-9) {
    if (x1 < r.x || x1 > r.x + r.w) return false;
  } else {
    let t1 = (r.x - x1) / dx, t2 = (r.x + r.w - x1) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (Math.abs(dy) < 1e-9) {
    if (y1 < r.y || y1 > r.y + r.h) return false;
  } else {
    let t1 = (r.y - y1) / dy, t2 = (r.y + r.h - y1) / dy;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

// Ray from (x,y) at angle, clipped to the first blocker; returns the end point.
export function castRay(x, y, angle, maxLen, blockers) {
  const dx = Math.cos(angle), dy = Math.sin(angle);
  let best = maxLen;
  for (const r of blockers) {
    // Slab test against the rectangle, t in [0, maxLen].
    let tmin = 0, tmax = maxLen;
    let ok = true;
    if (Math.abs(dx) < 1e-9) {
      if (x < r.x || x > r.x + r.w) ok = false;
    } else {
      let t1 = (r.x - x) / dx, t2 = (r.x + r.w - x) / dx;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
      if (tmin > tmax) ok = false;
    }
    if (ok) {
      if (Math.abs(dy) < 1e-9) {
        if (y < r.y || y > r.y + r.h) ok = false;
      } else {
        let t1 = (r.y - y) / dy, t2 = (r.y + r.h - y) / dy;
        if (t1 > t2) [t1, t2] = [t2, t1];
        tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
        if (tmin > tmax) ok = false;
      }
    }
    if (ok && tmin >= 0 && tmin < best) best = tmin;
  }
  return { x: x + dx * best, y: y + dy * best };
}

export function conePolygon(x, y, angle, range, blockers) {
  const pts = [{ x, y }];
  for (let i = 0; i <= RAY_COUNT; i++) {
    const a = angle - CONE_HALF_ANGLE + (2 * CONE_HALF_ANGLE * i) / RAY_COUNT;
    pts.push(castRay(x, y, a, range, blockers));
  }
  return pts;
}

// Can watcher at (x,y) facing `angle` see the player?
export function canSee(x, y, angle, range, px, py, blockers) {
  const d = dist(x, y, px, py);
  if (d > range) return false;
  if (d < 14) return true;
  if (Math.abs(angleDiff(Math.atan2(py - y, px - x), angle)) > CONE_HALF_ANGLE) return false;
  for (const r of blockers) if (segmentHitsRect(x, y, px, py, r)) return false;
  return true;
}

// --- guards -----------------------------------------------------------------

export function makeGuard(def, idx) {
  const w0 = def.waypoints[0];
  return {
    id: idx,
    x: w0.x, y: w0.y,
    angle: 0,
    waypoints: def.waypoints,
    wp: 1,
    speed: def.speed,
    state: 'patrol', // patrol | suspicious | chase | investigate
    pause: 0,
    lookTimer: 0,
    lastSeen: null,
    chaseGrace: 0,
    seenAmount: 0, // 0..1 how sure the guard is about the player
  };
}

function moveToward(g, tx, ty, speed, dt, blockers, bounds) {
  const d = dist(g.x, g.y, tx, ty);
  if (d < 2) return true;
  const step = Math.min(d, speed * dt);
  const nx = g.x + ((tx - g.x) / d) * step;
  const ny = g.y + ((ty - g.y) / d) * step;
  g.angle = turnToward(g.angle, Math.atan2(ty - g.y, tx - g.x), dt * 6);
  if (!collides(nx, g.y, blockers, bounds)) g.x = nx;
  if (!collides(g.x, ny, blockers, bounds)) g.y = ny;
  return d <= speed * dt + 2;
}

export function turnToward(a, target, maxStep) {
  const d = angleDiff(target, a);
  if (Math.abs(d) <= maxStep) return target;
  return a + Math.sign(d) * maxStep;
}

export function collides(x, y, blockers, bounds) {
  const r = 13;
  if (x - r < bounds.x || x + r > bounds.x + bounds.w) return true;
  if (y - r < bounds.y || y + r > bounds.y + bounds.h) return true;
  for (const b of blockers) {
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return true;
  }
  return false;
}

export function updateGuard(g, dt, player, blockers, bounds, smoke, onSpotted, spot = 1) {
  const inSmoke = smoke.some((s) => dist(player.x, player.y, s.x, s.y) < s.r);
  const sees = !inSmoke && canSee(g.x, g.y, g.angle, GUARD_RANGE, player.x, player.y, blockers);
  const sneakFactor = player.sneaking ? 0.45 : 1;
  const d = dist(g.x, g.y, player.x, player.y);

  if (sees) {
    const rate = (d < 90 ? 1.6 : 0.9) * sneakFactor * spot;
    g.seenAmount = Math.min(1, g.seenAmount + rate * dt);
    g.lastSeen = { x: player.x, y: player.y };
    if (g.seenAmount > 0.55 && g.state === 'patrol') {
      g.state = 'suspicious';
      onSpotted('suspicious');
    }
    if (g.seenAmount >= 1 && g.state !== 'chase') {
      g.state = 'chase';
      g.chaseGrace = 1.5; // a fair beat: the guard shouts before sprinting
      onSpotted('chase');
    }
  } else {
    g.seenAmount = Math.max(0, g.seenAmount - 0.5 * dt);
    if (g.state === 'chase' && g.seenAmount <= 0) {
      g.state = 'suspicious'; // lost you: searches where you were last seen
      g.lookTimer = 2.5;
    }
  }

  if (g.state === 'patrol') {
    if (g.pause > 0) {
      g.pause -= dt;
      g.angle = turnToward(g.angle, g.angle + 0.6 * dt, dt * 2);
    } else {
      const target = g.waypoints[g.wp];
      if (moveToward(g, target.x, target.y, g.speed, dt, blockers, bounds)) {
        g.wp = (g.wp + 1) % g.waypoints.length;
        g.pause = 1.0;
      }
    }
  } else if (g.state === 'suspicious') {
    if (g.lastSeen) {
      if (moveToward(g, g.lastSeen.x, g.lastSeen.y, g.speed * 1.15, dt, blockers, bounds)) {
        if (g.lookTimer > 0) {
          g.lookTimer -= dt;
          g.angle += dt * 1.8; // scans the room
        } else {
          g.state = 'patrol';
          g.lookTimer = 0;
        }
      }
    }
  } else if (g.state === 'chase') {
    if (g.chaseGrace > 0) g.chaseGrace -= dt;
    const speed = g.chaseGrace > 0 ? g.speed * 0.9 : g.speed * 1.35;
    moveToward(g, player.x, player.y, speed, dt, blockers, bounds);
  } else if (g.state === 'investigate') {
    if (g.lastSeen && moveToward(g, g.lastSeen.x, g.lastSeen.y, g.speed * 1.2, dt, blockers, bounds)) {
      g.state = 'suspicious';
      g.lookTimer = 2;
    }
  }
  return sees;
}

// --- cameras ----------------------------------------------------------------

export function makeCamera(def, idx) {
  return {
    id: idx,
    x: def.x, y: def.y,
    baseAngle: def.baseAngle,
    sweep: def.sweep,
    range: def.range,
    angle: def.baseAngle,
    phase: idx * 1.7,
    disabled: 0, // seconds of EMP left
    seenAmount: 0,
  };
}

export function updateCamera(cam, dt, time, player, blockers, smoke, spot = 1) {
  if (cam.disabled > 0) cam.disabled = Math.max(0, cam.disabled - dt);
  cam.angle = cam.baseAngle + Math.sin(time * 0.55 + cam.phase) * cam.sweep;
  if (cam.disabled > 0) return false;
  const inSmoke = smoke.some((s) => dist(player.x, player.y, s.x, s.y) < s.r);
  if (inSmoke) { cam.seenAmount = Math.max(0, cam.seenAmount - dt); return false; }
  const sees = canSee(cam.x, cam.y, cam.angle, cam.range, player.x, player.y, blockers);
  if (sees) cam.seenAmount = Math.min(1, cam.seenAmount + 1.1 * spot * dt);
  else cam.seenAmount = Math.max(0, cam.seenAmount - 0.6 * dt);
  return sees;
}
