import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ShipClass } from './ship-modules';
import type { PreviewOrnamentModule } from './ship-heraldry';

/**
 * Original working-deck capstans for the isolated 3D fleet editor.
 * Scout has one lean six-sided winch, Fighter one broad eight-sided capstan,
 * and Warship a pair of ten-sided admiral capstans.
 *
 * These are visual sculptures only: no functioning anchors, collision shapes,
 * combat stats, currency, ownership, inventory, or persistent upgrades.
 * All timber parts share one draw and all forged details one additional draw.
 */
export function createPreviewDeckCapstans(
 shipClass: ShipClass,
 ornamentModule: PreviewOrnamentModule
): T.Group {
 const profiles: Record<ShipClass, { sides: number; spokes: number; radius: number; stations: readonly number[] }> = {
  scout: { sides: 6, spokes: 4, radius: .32, stations: [3.27] },
  fighter: { sides: 8, spokes: 6, radius: .42, stations: [3.14] },
  warship: { sides: 10, spokes: 8, radius: .48, stations: [3.13, -.49] }
 };
 const profile = profiles[shipClass];
 if (!profile) throw new Error('Unknown preview ship class for deck capstan');
 if (!['ornaments-simple','ornaments-lanterns','ornaments-legendary'].includes(ornamentModule))
  throw new Error('Unknown preview ornaments for deck capstan');

 const timber: T.BufferGeometry[] = [];
 const forged: T.BufferGeometry[] = [];
 function add(parts: T.BufferGeometry[], geometry: T.BufferGeometry,
              x: number, y: number, z: number, yaw = 0, roll = 0): void {
  geometry.rotateZ(roll);
  geometry.rotateY(yaw);
  geometry.translate(x, y, z);
  parts.push(geometry);
 }
 const gilded = ornamentModule === 'ornaments-legendary';
 const reinforced = ornamentModule !== 'ornaments-simple';
 const { sides, spokes, radius } = profile;

 for (const z of profile.stations) {
  // The capstan sits on the procedural deck (deck elevation y=1.97).
  // Faceted waisted drum and oversized cap: a distinct readable silhouette.
  add(timber, new T.CylinderGeometry(radius*.71, radius*.88, .52, sides), 0, 2.27, z);
  add(timber, new T.CylinderGeometry(radius*.96, radius*.96, .085, sides), 0, 2.57, z);
  add(forged, new T.TorusGeometry(radius*.84, .037, 4, sides*2),
      0, 2.06, z, 0, Math.PI/2);
  add(forged, new T.TorusGeometry(radius*.79, .033, 4, sides*2),
      0, 2.51, z, 0, Math.PI/2);

  // Radial handles are actual low-poly timber, not a flat wheel texture.
  for (let i=0; i<spokes; i++) {
   const a = 2*Math.PI*i/spokes;
   const x = Math.cos(a)*radius*.68;
   const zz = z+Math.sin(a)*radius*.68;
   add(timber, new T.CylinderGeometry(.041, .045, radius*.97, 6),
       x, 2.57, zz, -a, Math.PI/2);
   add(forged, new T.SphereGeometry(.064, 6, 4),
       Math.cos(a)*radius*1.16, 2.57, z+Math.sin(a)*radius*1.16);
  }

  if (shipClass === 'scout') {
   // A single navigation finial on the smaller corsair winch.
   add(forged, new T.ConeGeometry(.105, .24, 5), 0, 2.75, z);
  } else if (shipClass === 'fighter') {
   // Crossed raised arresting bars distinguish the broadside deck.
   for (const a of [-Math.PI/4,Math.PI/4])
    add(forged, new T.BoxGeometry(radius*1.1, .065, .09),
        0, 2.74, z, a);
  } else {
   // Royal capstan: three-point forged crown, duplicated on two decks.
   for (const x of [-radius*.54,0,radius*.54]) {
    add(forged, new T.ConeGeometry(.075, .18, 5),
        x, 2.77+(x===0?.07:0), z);
   }
  }

  if (reinforced) {
   // Level-eight ornament variant: physical additional retaining bands.
   add(forged, new T.TorusGeometry(radius*.87, .031, 4, sides*2),
       0, 2.27, z, 0, Math.PI/2);
   for (const side of [-1,1]) {
    add(forged, new T.BoxGeometry(.08,.21,.09),
        side*radius*.69, 2.32, z);
   }
  }
  if (gilded) {
   // Level-nineteen variant: ceremonial bosses around the top plate.
   for (let i=0; i<4; i++) {
    const a=2*Math.PI*i/4;
    add(forged,new T.SphereGeometry(.065,6,4),
        Math.cos(a)*radius*.60, 2.66, z+Math.sin(a)*radius*.60);
   }
   add(forged,new T.CylinderGeometry(.12,.16,.09,8),0,2.69,z);
  }
 }

 const group = new T.Group();
 group.name = 'shipyard-'+shipClass+'-'+ornamentModule+'-deck-capstans';
 const renderBins: readonly [T.BufferGeometry[], T.MeshStandardMaterial, string][] = [
  [timber, new T.MeshStandardMaterial({color:'#835137',roughness:.8,metalness:.05}), 'carved-timber'],
  [forged, new T.MeshStandardMaterial({
   color:gilded?'#f1cb73':reinforced?'#d7b173':'#b88f64',
   roughness:.38,metalness:.68
  }), 'forged-metal']
 ];
 for (const [parts, material, name] of renderBins) {
  const combined = mergeGeometries(parts, false);
  parts.forEach(part=>part.dispose());
  if (!combined) {
   material.dispose();
   throw new Error('Cannot batch deck capstan geometry');
  }
  combined.computeBoundingSphere();
  const mesh = new T.Mesh(combined,material);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
 }
 group.userData = {
  previewOnly:true, shipClass, ornamentModule,
  capstans:profile.stations.length, spokesPerCapstan:spokes,
  drawCallObjects:group.children.length
 };
 return group;
}
