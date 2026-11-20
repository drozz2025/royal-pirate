import * as T from 'three';

/** Release only GPU objects belonging exclusively to the detached shipyard.
 * makeShip() deliberately shares some cached geometry/materials with the
 * live battle ships. Disposing an entire preview subtree indiscriminately
 * would corrupt the battle when a player returns to the harbour.
 * No gameplay, inventory, or entitlement data is read or changed here. */
type Resources = {
 geometries: Set<T.BufferGeometry>;
 materials: Set<T.Material>;
 textures: Set<T.Texture>;
};

function resourcesUnder(root: T.Object3D): Resources {
 const geometries = new Set<T.BufferGeometry>();
 const materials = new Set<T.Material>();
 const textures = new Set<T.Texture>();
 root.traverse(node => {
  if (!(node instanceof T.Mesh || node instanceof T.Line ||
        node instanceof T.Points || node instanceof T.Sprite)) return;
  geometries.add(node.geometry);
  const assigned = Array.isArray(node.material) ? node.material : [node.material];
  for (const material of assigned) {
   materials.add(material);
   // Includes maps, alpha/normal/roughness textures, etc. Most original
   // preview resources use plain untextured PBR materials.
   for (const value of Object.values(material)) {
    if (value instanceof T.Texture) textures.add(value);
   }
  }
 });
 return {geometries, materials, textures};
}

export type ShipyardResourceRelease = {
 geometries: number;
 materials: number;
 textures: number;
};

/** Call only when leaving the editor, never on each class/module switch.
 * Detach first so the retained scene scan excludes the old preview. */
export function releaseShipyardResources(
 scene: T.Scene, shipyardRoot: T.Object3D
): ShipyardResourceRelease {
 shipyardRoot.removeFromParent();
 // InstancedMesh owns an instanceMatrix GPU buffer, which geometry.dispose()
 // alone does not release. Each editor batch is disposable and scene-local.
 // Release those buffers even if a shape/material also exists in battle.
 shipyardRoot.traverse(node=>{
  if(node instanceof T.InstancedMesh)node.dispose();
 });
 const retained = resourcesUnder(scene);
 const removed = resourcesUnder(shipyardRoot);
 let geometries = 0, materials = 0, textures = 0;
 for (const geometry of removed.geometries) {
  if (!retained.geometries.has(geometry)) { geometry.dispose(); geometries++; }
 }
 for (const texture of removed.textures) {
  if (!retained.textures.has(texture)) { texture.dispose(); textures++; }
 }
 for (const material of removed.materials) {
  if (!retained.materials.has(material)) { material.dispose(); materials++; }
 }
 return {geometries, materials, textures};
}
