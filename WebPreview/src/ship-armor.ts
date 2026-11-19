import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ShipClass } from './ship-modules';

/** Isolated SHIPYARD armour art. This is not collision protection, damage
 * mitigation or an entitlement. A single fused mesh keeps mobile draw calls
 * stable while each hull has its own original plate silhouette. */
export type PreviewArmorModule = 'armor-none' | 'armor-iron' | 'armor-royal';

const PLAN: Record<ShipClass, { stations: readonly number[]; beam: number; width: number; outline: readonly (readonly [number, number])[] }> = {
 scout: {
  stations: [-1.6, 1.6], beam: 1.59, width: .90,
  // Swift, swept chevron blades: clear the scout's narrow gunwale.
  outline: [[-.48,-.18], [0,.25], [.48,-.18], [.24,-.30], [0,-.16], [-.24,-.30]]
 },
 fighter: {
  stations: [-2.0, 0, 2.0], beam: 1.77, width: 1,
  // Frigate shield plates: flat shoulder with a tapered lower point.
  outline: [[-.46,.29], [.46,.29], [.44,-.08], [0,-.36], [-.44,-.08]]
 },
 warship: {
  stations: [-2.45, -.82, .82, 2.45], beam: 1.84, width: 1.06,
  // Flagship overlapping hexagonal scales, not enlarged scout shields.
  outline: [[-.5,.2], [-.20,.33], [.29,.33], [.52,.10], [.41,-.29], [-.34,-.29], [-.54,-.08]]
 }
};

function shape(points: readonly (readonly [number, number])[]): T.Shape {
 const path = new T.Shape();
 points.forEach(([x,y],index) => index === 0 ? path.moveTo(x,y) : path.lineTo(x,y));
 path.closePath();
 return path;
}

/** An unarmoured ship creates no plating geometry. Royal plating adds a
 * small raised diamond to each shield, fused into the same final draw call. */
export function createPreviewArmour(
 shipClass: ShipClass,
 armourModule: PreviewArmorModule
): T.Mesh | null {
 if (!Object.prototype.hasOwnProperty.call(PLAN,shipClass))
  throw new Error('Unknown preview ship class for armour');
 if (!['armor-none','armor-iron','armor-royal'].includes(armourModule))
  throw new Error('Unknown preview armour module');
 if (armourModule === 'armor-none') return null;

 const profile = PLAN[shipClass];
 const outline = shape(profile.outline.map(([x,y]) => [x * profile.width,y] as const));
 const emboss = shape([[0,.16], [.13,0], [0,-.16], [-.13,0]]);
 const pieces: T.BufferGeometry[] = [];
 const royal = armourModule === 'armor-royal';
 for (const side of [-1,1]) for (const z of profile.stations) {
  const plate = new T.ExtrudeGeometry(outline,{
   depth: royal ? .115 : .075, steps:1, curveSegments:1, bevelEnabled:false
  });
  plate.rotateY(side * Math.PI / 2);
  plate.translate(side * profile.beam, 1.02, z);
  pieces.push(plate);
  if (royal) {
   const crest = new T.ExtrudeGeometry(emboss,{
    depth:.035, steps:1, curveSegments:1, bevelEnabled:false
   });
   crest.rotateY(side * Math.PI / 2);
   crest.translate(side * (profile.beam+.13),1.03,z);
   pieces.push(crest);
  }
 }
 // All source shapes have the same indexed/non-indexed geometry layout.
 // Keep one final indexed/non-indexed buffer, one material and one Mesh.
 const combined = mergeGeometries(pieces);
 for(const piece of pieces)piece.dispose();
 if(!combined)throw new Error('Failed to merge preview armour panels');
 combined.computeBoundingSphere();
 const metal = new T.MeshStandardMaterial({
  color:royal?'#e0b962':'#536678',metalness:royal?.70:.62,
  roughness:royal?.34:.48,flatShading:true,side:T.DoubleSide
 });
 const mesh = new T.Mesh(combined,metal);
 mesh.name = 'shipyard-'+shipClass+'-'+armourModule+'-plating';
 mesh.castShadow = true;
 mesh.receiveShadow = true;
 mesh.userData = {
  previewOnly:true, shipClass, armourModule,
  panelCount:profile.stations.length*2, primitivesMerged:pieces.length,
  drawCallObjects:1
 };
 return mesh;
}
