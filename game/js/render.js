// Canvas rendering for The Amber Gallery.
// One clear visual language: warm floor, dark walls, gold loot, amber cones
// for guards, red cones for cameras, green for the exit. Safe cover is dark,
// danger is bright, loot glows — readable at a glance.

import { conePolygon, CONE_HALF_ANGLE } from './guards.js';

const FLOOR_A = '#241c2e';
const FLOOR_B = '#1d1626';

export function drawFloor(ctx, play) {
  ctx.fillStyle = FLOOR_A;
  ctx.fillRect(0, 0, 1280, 720);
  // checker tiles
  ctx.fillStyle = FLOOR_B;
  const t = 40;
  for (let y = play.y; y < play.y + play.h; y += t) {
    for (let x = play.x; x < play.x + play.w; x += t) {
      if (((x - play.x) / t + (y - play.y) / t) % 2 === 0) ctx.fillRect(x, y, t, t);
    }
  }
  // gilt border
  ctx.strokeStyle = '#6b5320';
  ctx.lineWidth = 4;
  ctx.strokeRect(play.x, play.y, play.w, play.h);
}

export function drawWalls(ctx, walls) {
  for (const w of walls) {
    ctx.fillStyle = '#3d3348';
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = '#574a66';
    ctx.fillRect(w.x, w.y, w.w, 5);
    ctx.strokeStyle = '#171019';
    ctx.lineWidth = 2;
    ctx.strokeRect(w.x, w.y, w.w, w.h);
  }
}

const COVER_STYLE = {
  case: { fill: '#2c4a5e', top: '#4d7a99', label: '◈' },
  planter: { fill: '#1f4d2e', top: '#2f7a45', label: '❦' },
  statue: { fill: '#4a4030', top: '#7a6a4a', label: '♟' },
  pillar: { fill: '#453a52', top: '#6a5a7a', label: '' },
};

export function drawCovers(ctx, covers) {
  for (const c of covers) {
    const s = COVER_STYLE[c.kind] || COVER_STYLE.case;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(c.x + 4, c.y + 5, c.w, c.h);
    ctx.fillStyle = s.fill;
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.fillStyle = s.top;
    ctx.fillRect(c.x + 4, c.y + 4, c.w - 8, c.h - 8);
    ctx.strokeStyle = '#120d18';
    ctx.lineWidth = 2;
    ctx.strokeRect(c.x, c.y, c.w, c.h);
    if (s.label) {
      ctx.fillStyle = 'rgba(232,228,216,0.75)';
      ctx.font = '22px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.label, c.x + c.w / 2, c.y + c.h / 2);
    }
  }
}

export function drawExit(ctx, exit, open, time) {
  const pulse = open ? 0.6 + 0.4 * Math.sin(time * 4) : 0.25;
  ctx.fillStyle = open ? `rgba(46,204,113,${0.25 + pulse * 0.3})` : 'rgba(120,120,120,0.18)';
  ctx.fillRect(exit.x, exit.y, exit.w, exit.h);
  ctx.strokeStyle = open ? '#2ecc71' : '#8a8a8a';
  ctx.lineWidth = 3;
  ctx.strokeRect(exit.x, exit.y, exit.w, exit.h);
  ctx.fillStyle = open ? '#a9f5c3' : '#bdbdbd';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(open ? 'EXIT' : 'LOCKED', exit.x + exit.w / 2, exit.y + exit.h / 2 - 10);
  ctx.font = '22px sans-serif';
  ctx.fillText(open ? '➤' : '🔒', exit.x + exit.w / 2, exit.y + exit.h / 2 + 16);
}

export function drawLoot(ctx, loots, time) {
  for (const l of loots) {
    if (l.taken) continue;
    const bob = Math.sin(time * 3 + l.x) * 3;
    const glow = l.main ? 26 : 16;
    const grad = ctx.createRadialGradient(l.x, l.y + bob, 2, l.x, l.y + bob, glow);
    const col = l.main ? '255,190,60' : '255,215,94';
    grad.addColorStop(0, `rgba(${col},0.55)`);
    grad.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(l.x, l.y + bob, glow, 0, Math.PI * 2);
    ctx.fill();
    // pedestal
    ctx.fillStyle = '#3a2f22';
    ctx.fillRect(l.x - 16, l.y + 10 + bob, 32, 8);
    ctx.fillStyle = '#ffd75e';
    ctx.font = l.main ? '26px sans-serif' : '19px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const glyph = { gem: '◆', painting: '▣', scarab: '✦', astrolabe: '☼', star: '★' }[l.kind] || '◆';
    ctx.fillText(glyph, l.x, l.y + bob);
    if (l.main) {
      ctx.fillStyle = '#ffe9a8';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(l.kind === 'star' ? 'AMBER STAR' : 'STAR PIECE', l.x, l.y - 26 + bob);
    }
  }
}

export function drawGuard(ctx, g, blockers) {
  const col = g.state === 'chase' ? 'rgba(226,59,46,0.30)'
    : g.state === 'suspicious' ? 'rgba(232,140,40,0.28)'
    : 'rgba(232,200,50,0.20)';
  const pts = conePolygon(g.x, g.y, g.angle, 240, blockers);
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = g.state === 'chase' ? '#e23b2e' : g.state === 'suspicious' ? '#e88c28' : 'rgba(232,200,50,0.55)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // body
  ctx.fillStyle = '#20242e';
  ctx.beginPath();
  ctx.arc(g.x, g.y, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = g.state === 'patrol' ? '#7a86a0' : '#e23b2e';
  ctx.lineWidth = 3;
  ctx.stroke();
  // facing tick + cap
  ctx.strokeStyle = '#e8e4d8';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(g.x, g.y);
  ctx.lineTo(g.x + Math.cos(g.angle) * 20, g.y + Math.sin(g.angle) * 20);
  ctx.stroke();
  ctx.fillStyle = '#c8ccd8';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('♟', g.x, g.y);
  // alert marks
  if (g.state === 'chase') {
    ctx.fillStyle = '#ff5a4a';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('!', g.x, g.y - 26);
  } else if (g.state === 'suspicious' || g.seenAmount > 0.3) {
    ctx.fillStyle = '#ffb347';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('?', g.x, g.y - 26);
  }
  // suspicion bar
  if (g.seenAmount > 0.05) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(g.x - 16, g.y + 20, 32, 5);
    ctx.fillStyle = g.seenAmount > 0.55 ? '#ff5a4a' : '#ffb347';
    ctx.fillRect(g.x - 16, g.y + 20, 32 * g.seenAmount, 5);
  }
}

export function drawCamera(ctx, cam, blockers) {
  if (cam.disabled > 0) {
    ctx.fillStyle = 'rgba(120,120,140,0.25)';
    ctx.beginPath();
    ctx.arc(cam.x, cam.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#aaa';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('OFF', cam.x, cam.y - 20);
    return;
  }
  const pts = conePolygon(cam.x, cam.y, cam.angle, cam.range, blockers);
  ctx.fillStyle = cam.seenAmount > 0.4 ? 'rgba(226,59,46,0.30)' : 'rgba(226,59,46,0.16)';
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(226,59,46,0.6)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // mount
  ctx.fillStyle = '#1c1c24';
  ctx.beginPath();
  ctx.arc(cam.x, cam.y, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#e23b2e';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = cam.seenAmount > 0.4 ? '#ff5a4a' : '#ff8a7a';
  ctx.beginPath();
  ctx.arc(cam.x + Math.cos(cam.angle) * 7, cam.y + Math.sin(cam.angle) * 7, 3.5, 0, Math.PI * 2);
  ctx.fill();
  if (cam.seenAmount > 0.05) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(cam.x - 14, cam.y + 16, 28, 4);
    ctx.fillStyle = '#ff5a4a';
    ctx.fillRect(cam.x - 14, cam.y + 16, 28 * cam.seenAmount, 4);
  }
}

export function drawPlayer(ctx, p, time) {
  // sneak ring
  if (p.sneaking) {
    ctx.strokeStyle = 'rgba(120,200,255,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 20 + Math.sin(time * 5) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 12, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#191d26';
  ctx.beginPath();
  ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffd75e';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#e8e4d8';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('♦', p.x, p.y);
  // coin-throw aim line
  ctx.strokeStyle = 'rgba(255,215,94,0.35)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 6]);
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.mouseX, p.mouseY);
  ctx.stroke();
  ctx.setLineDash([]);
}

export function drawSmoke(ctx, smoke, time) {
  for (const s of smoke) {
    const grad = ctx.createRadialGradient(s.x, s.y, 4, s.x, s.y, s.r);
    grad.addColorStop(0, 'rgba(200,200,210,0.55)');
    grad.addColorStop(1, 'rgba(200,200,210,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawCoins(ctx, coins) {
  for (const c of coins) {
    ctx.fillStyle = '#ffd75e';
    ctx.beginPath();
    ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8a6d1e';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

export function drawFloaters(ctx, floaters) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const f of floaters) {
    ctx.globalAlpha = Math.max(0, f.life / f.maxLife);
    ctx.fillStyle = f.color;
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}
