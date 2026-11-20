/** Pure preview camera positions. No combat or saved ship state is affected. */
export const SHIPYARD_VIEWS = [
  { id: 'quarter', label: '3/4' },
  { id: 'bow', label: 'BOW' },
  { id: 'stern', label: 'STERN' },
  { id: 'port', label: 'PORT' },
  { id: 'starboard', label: 'STARBOARD' }
] as const;
export type ShipyardView = typeof SHIPYARD_VIEWS[number]['id'];

export function shipyardCameraOffset(view: ShipyardView, portrait: boolean): Readonly<{x:number;y:number;z:number}> {
  const distance = portrait ? 24 : 21;
  const height = portrait ? 12 : 10;
  switch(view){
    case 'quarter': return {x:portrait?8:13,y:height,z:distance};
    case 'bow': return {x:0,y:height,z:distance+2};
    case 'stern': return {x:0,y:height,z:-(distance+2)};
    case 'port': return {x:-(distance+2),y:height,z:0};
    case 'starboard': return {x:distance+2,y:height,z:0};
  }
}
