import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ShipClass } from './ship-modules';

/** Original stern heraldry for the 3D Shipyard sandbox only.
 * Scout: compass rose; Fighter: crossed cutlasses; Warship: royal crown.
 * Each complete sculpture is ONE indexed mesh/draw call. Never a combat part.
 */
export type PreviewOrnamentModule =
  'ornaments-simple' | 'ornaments-lanterns' | 'ornaments-legendary';

export function createPreviewSternHeraldry(
  shipClass: ShipClass,
  ornamentModule: PreviewOrnamentModule
): T.Mesh {
  if (!['scout', 'fighter', 'warship'].includes(shipClass))
    throw new Error('Unknown ship class for heraldry');
  if (!['ornaments-simple', 'ornaments-lanterns', 'ornaments-legendary'].includes(ornamentModule))
    throw new Error('Unknown preview ornament module');

  const pieces: T.BufferGeometry[] = [];
  // Geometry is modelled in a small XY relief. The mesh sits just aft of
  // the captain's cabin, so it remains visible when the ship is rotated.
  function add(g: T.BufferGeometry, x = 0, y = 0, depth = 0, turn = 0): void {
    g.applyMatrix4(new T.Matrix4().compose(
      new T.Vector3(x, y, depth),
      new T.Quaternion().setFromEuler(new T.Euler(0, 0, turn)),
      new T.Vector3(1, 1, 1)
    ));
    pieces.push(g);
  }
  const bar = (w: number, h: number, d: number, x = 0, y = 0, turn = 0) =>
    add(new T.BoxGeometry(w, h, d), x, y, 0, turn);
  const boss = (radius: number, x = 0, y = 0) =>
    add(new T.SphereGeometry(radius, 8, 5), x, y, -.045);
  const rim = (radius: number, thickness = .035, x = 0, y = 0) =>
    add(new T.TorusGeometry(radius, thickness, 4, 16), x, y, 0);

  if (shipClass === 'scout') {
    // A small navigation rose with four tapered points, not a resized crown.
    rim(.35, .04);
    for (let i = 0; i < 4; i++) {
      const angle = Math.PI * i / 2;
      add(new T.ConeGeometry(.105, .39, 4), Math.sin(angle) * .24,
        Math.cos(angle) * .24, -.04, -angle);
    }
    boss(.105);
    bar(.11, .10, .10, -.23, -.28, -.42);
    bar(.11, .10, .10, .23, -.28, .42);
  } else if (shipClass === 'fighter') {
    // Crossed short cutlasses over a rectangular broadside command plaque.
    bar(.64, .52, .10);
    for (const side of [-1, 1]) {
      bar(.065, .88, .095, side * .105, 0, side * .58);
      bar(.28, .06, .12, side * .24, -.25, side * .58);
      boss(.075, side * .27, .27);
    }
    boss(.16);
  } else {
    // A five-point ceremonial crown above a shaped admiral's transom.
    bar(1.02, .19, .11, 0, -.17);
    rim(.49, .045, 0, -.04);
    for (let i = -2; i <= 2; i++) {
      bar(.095, .35 + (2 - Math.abs(i)) * .085, .10, i * .205, .16);
      add(new T.ConeGeometry(.105, .24, 5), i * .205,
        .43 + (2 - Math.abs(i)) * .08, -.02);
    }
    boss(.11, 0, -.12);
  }

  // Ornament module genuinely changes the rendered sculpture. Its unlock
  // level is enforced by resolveLoadout before this function is called.
  if (ornamentModule !== 'ornaments-simple') {
    for (const side of [-1, 1]) boss(.095, side * .53, -.26);
  }
  if (ornamentModule === 'ornaments-legendary') {
    for (const side of [-1, 1]) {
      bar(.055, .31, .08, side * .64, .04, side * -.34);
      boss(.078, side * .66, .30);
    }
  }

  // mergeGeometries retains normals/UVs so standard PBR lighting works.
  // Temporary primitive geometries are retired immediately after merging.
  const combined = mergeGeometries(pieces);
  for (const piece of pieces) piece.dispose();
  if (!combined) throw new Error('Could not merge original stern heraldry');
  combined.computeBoundingSphere();
  const material = new T.MeshStandardMaterial({
    color: '#eac473', metalness: .65, roughness: .33, side: T.DoubleSide
  });
  const mesh = new T.Mesh(combined, material);
  const placement = {
    scout: [0, 3.23, -4.68],
    fighter: [0, 3.17, -4.78],
    warship: [0, 4.11, -5.16]
  } as const;
  mesh.position.set(...placement[shipClass]);
  mesh.name = 'shipyard-' + shipClass + '-stern-heraldry';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData = {
    previewOnly: true, shipClass, ornamentModule,
    primitivesMerged: pieces.length, drawCallObjects: 1
  };
  return mesh;
}
