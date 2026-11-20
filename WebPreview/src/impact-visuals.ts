/**
 * Positions a hull scorch mark at the point actually hit by a cannonball.
 * The preview hull is built from nine longitudinal stations (ships.ts), with
 * seven tapered plank belts. Pure math keeps placement deterministic/testable.
 * Component-specific hit points and gameplay penalties remain future work.
 */
export type ImpactPoint = { x: number; y: number; z: number };
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const stations = [-4.9, -4.3, -3.2, -1.6, 0, 1.8, 3.2, 4.3, 5];
const widths = [.25, 1.1, 1.55, 1.78, 1.83, 1.65, 1.3, .75, .08];

export function hullImpactPlacement(hit: ImpactPoint, center: ImpactPoint) {
  const z = clamp(hit.z - center.z, -3.4, 3.4);
  const y = clamp(hit.y - center.y, .55, 1.72);
  let i = 0;
  while (i < stations.length - 2 && z > stations[i + 1]) i++;
  const t = (z - stations[i]) / (stations[i + 1] - stations[i]);
  const width = widths[i] + (widths[i + 1] - widths[i]) * t;
  const beltFactor = .53 + .065 * ((y + .5) / .35);
  const side = hit.x < center.x ? -1 : 1;
  return { x: side * (width * beltFactor + .045), y, z, side };
}
