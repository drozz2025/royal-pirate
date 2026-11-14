/** Independent web simulation. Does not execute or certify the Unity implementation. */
export type Vec = { x: number; y: number; z: number };
export type Side = 'player' | 'enemy';
export type Phase = 'ready' | 'player-flight' | 'enemy-aim' | 'enemy-flight' | 'victory' | 'defeat';
export type Shot = { side: Side; origin: Vec; velocity: Vec; position: Vec; age: number };
export type BattleEvent = { type: 'fire' | 'hit' | 'splash' | 'result'; position: Vec; side: Side; damage?: number };
export const SHIPS: Record<Side, Vec> = { player: { x: -10, y: 0, z: 3 }, enemy: { x: 10, y: 0, z: -3 } };
export const GRAVITY = 12;
export const PITCH = 35 * Math.PI / 180;
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export function launch(side: Side, yaw: number, power: number): Shot {
  const own = SHIPS[side], target = SHIPS[side === 'player' ? 'enemy' : 'player'];
  const origin = { x: own.x + (side === 'player' ? 1.9 : -1.9), y: 1.85, z: own.z };
  const heading = Math.atan2(target.z - origin.z, target.x - origin.x) + clamp(yaw, -25, 25) * Math.PI / 180;
  const speed = 7 + clamp(power, 20, 100) * .12;
  return { side, origin, position: { ...origin }, velocity: { x: Math.cos(heading) * Math.cos(PITCH) * speed, y: Math.sin(PITCH) * speed, z: Math.sin(heading) * Math.cos(PITCH) * speed }, age: 0 };
}
export function positionAt(shot: Shot, time: number): Vec {
  return { x: shot.origin.x + shot.velocity.x * time, y: shot.origin.y + shot.velocity.y * time - .5 * GRAVITY * time * time, z: shot.origin.z + shot.velocity.z * time };
}
/** Swept segment/AABB intersection avoids tunnelling at low frame rates. */
export function segmentBox(a: Vec, b: Vec, min: Vec, max: Vec): number | null {
  let entry = 0, exit = 1;
  for (const axis of ['x', 'y', 'z'] as const) {
    const d = b[axis] - a[axis];
    if (Math.abs(d) < 1e-9) { if (a[axis] < min[axis] || a[axis] > max[axis]) return null; }
    else { let t0 = (min[axis] - a[axis]) / d, t1 = (max[axis] - a[axis]) / d; if (t0 > t1) [t0, t1] = [t1, t0]; entry = Math.max(entry, t0); exit = Math.min(exit, t1); if (entry > exit) return null; }
  }
  return entry;
}
export function collision(a: Vec, b: Vec, side: Side): { type: 'hit' | 'splash'; position: Vec } | null {
  const target = SHIPS[side === 'player' ? 'enemy' : 'player'];
  const hit = segmentBox(a, b, { x: target.x - 1.65, y: .25, z: target.z - 4.4 }, { x: target.x + 1.65, y: 2.6, z: target.z + 4.4 });
  const water = b.y <= .08 ? clamp((a.y - .08) / (a.y - b.y), 0, 1) : null;
  const t = hit !== null && (water === null || hit <= water) ? hit : water;
  if (t === null) return null;
  return { type: t === hit ? 'hit' : 'splash', position: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t } };
}
export function predict(yaw: number, power: number): Vec[] {
  const shot = launch('player', yaw, power), points = [{ ...shot.origin }];
  for (let t = .055; t < 4; t += .055) { const p = positionAt(shot, t), hit = collision(points[points.length - 1], p, 'player'); points.push(hit?.position ?? p); if (hit) break; }
  return points;
}
export class Battle {
  phase: Phase = 'ready'; health = { player: 100, enemy: 100 }; round = 1;
  yaw = 0; power = 65; shot: Shot | null = null; events: BattleEvent[] = [];
  lastMessage = 'Aim your broadside'; shotsFired = 0; hits = 0;
  private delay = 0; private seed: number; private initialSeed: number;
  constructor(seed = 1261) { this.seed = this.initialSeed = seed; }
  private random() { this.seed = (1664525 * this.seed + 1013904223) >>> 0; return this.seed / 4294967296; }
  reset() { this.phase = 'ready'; this.health = { player: 100, enemy: 100 }; this.round = 1; this.shot = null; this.events = []; this.delay = 0; this.seed = this.initialSeed; this.shotsFired = 0; this.hits = 0; this.yaw = 0; this.power = 65; this.lastMessage = 'Aim your broadside'; }
  aim(yaw: number, power: number) { if (this.phase !== 'ready' || !Number.isFinite(yaw) || !Number.isFinite(power)) return; this.yaw = clamp(yaw, -25, 25); this.power = clamp(power, 20, 100); }
  fire(): boolean { if (this.phase !== 'ready') return false; this.begin('player', this.yaw, this.power); this.shotsFired++; return true; }
  private begin(side: Side, yaw: number, power: number) { this.shot = launch(side, yaw, power); this.phase = side === 'player' ? 'player-flight' : 'enemy-flight'; this.events.push({ type: 'fire', position: { ...this.shot.origin }, side }); this.lastMessage = side === 'player' ? 'Broadside away!' : 'Incoming fire!'; }
  tick(dt: number) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    // Substeps also make the domain safe when used without the render loop.
    for (let remaining = Math.min(dt, .25); remaining > 1e-8;) { const step = Math.min(remaining, 1 / 120); this.step(step); remaining -= step; }
  }
  private step(dt: number) {
    if (this.phase === 'enemy-aim') {
      this.delay -= dt;
      if (this.delay <= 0) {
        const origin = launch('enemy', 0, 65).origin, target = SHIPS.player;
        const range = Math.hypot(target.x - origin.x, target.z - origin.z);
        const speed = Math.sqrt(GRAVITY * range * range / (2 * Math.cos(PITCH) ** 2 * (range * Math.tan(PITCH) + origin.y - 1.3)));
        this.begin('enemy', (this.random() - .5) * 18, (speed - 7) / .12 + (this.random() - .5) * 13);
      }
      return;
    }
    if (!this.shot) return;
    const shot = this.shot, previous = shot.position;
    shot.age += dt; shot.position = positionAt(shot, shot.age);
    const hit = collision(previous, shot.position, shot.side);
    if (!hit && shot.age < 6) return;
    const impact = hit ?? { type: 'splash' as const, position: shot.position };
    const target: Side = shot.side === 'player' ? 'enemy' : 'player';
    const damage = impact.type === 'hit' ? (shot.side === 'player' ? 29 : 22) : 0;
    this.health[target] = Math.max(0, this.health[target] - damage);
    if (shot.side === 'player' && damage) this.hits++;
    this.events.push({ ...impact, side: target, damage });
    this.shot = null;
    this.lastMessage = damage ? `Direct hit · −${damage}` : 'Splash! Adjust your aim';
    if (this.health[target] <= 0) { this.phase = target === 'enemy' ? 'victory' : 'defeat'; this.events.push({ type: 'result', side: target, position: { ...SHIPS[target] } }); }
    else if (shot.side === 'player') { this.phase = 'enemy-aim'; this.delay = 1.6; }
    else { this.phase = 'ready'; this.round++; }
  }
  drainEvents() { return this.events.splice(0); }
}
