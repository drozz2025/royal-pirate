import React from 'react';

/** Original, scalable ROYAL PIRATE line icons; decorative beside named buttons. */
export type PirateIconName = 'battle' | 'fleet' | 'forge' | 'cards' | 'shop' | 'missions' | 'profile' | 'port' | 'ranking' | 'chests' | 'rewards' | 'offers' | 'events' | 'settings' | 'arena';
const artwork:Record<PirateIconName,React.ReactNode> = {
  battle:<><path d="M4 4 20 20M20 4 4 20"/><path d="m3 8 5-5m8 0 5 5M3 16l5 5m8 0 5-5"/><circle cx="12" cy="12" r="2"/></>,
  fleet:<><path d="M12 2v13M11 4 5 13h6M13 5l6 8h-6"/><path d="M3 16h18l-3 4H6l-3-4ZM2 22c2-1 3-1 5 0s3 1 5 0 3-1 5 0 3 1 5 0"/></>,
  forge:<><path d="m4 20 10-10m-2-3 5-5 5 5-5 5-5-5ZM2 22l4-1-3-3-1 4Z"/><path d="m5 8 2-2m-1 5 2-2"/></>,
  cards:<><rect x="3" y="7" width="13" height="15" rx="2"/><path d="M8 4h11a2 2 0 0 1 2 2v12M9.5 11l1.5 2 2-1-1 3-3 1 .5-2-2-1 2-2Z"/></>,
  shop:<><path d="M5 9h14l1 12H4L5 9Z"/><path d="M9 10V6a3 3 0 0 1 6 0v4M3 9h18"/><path d="M9 15h6m-3-3v6"/></>,
  missions:<><path d="M7 3h12v17H7a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z"/><path d="M7 3a3 3 0 0 0 0 6h12M10 13l2 2 4-4M9 19h10"/></>,
  profile:<><path d="M4 21c1-5 5-7 8-7s7 2 8 7"/><circle cx="12" cy="9" r="4"/><path d="m5 5 7-3 7 3-7 2-7-2ZM12 2v-1"/></>,
  port:<><path d="M12 3v17m-8-7h16M2 14c0 10 20 10 20 0M8 5h8M12 2v2m-3 14 3 3 3-3"/><circle cx="12" cy="6" r="2"/></>,
  ranking:<><path d="M5 21h14M7 16h10l2-10-5 3-2-6-2 6-5-3z"/><path d="M12 3v-2M4 4 2 2m18 2 2-2M8 13h8"/></>,
  chests:<><rect x="2" y="9" width="20" height="12" rx="2"/><path d="M2 9c0-5 4-7 10-7s10 2 10 7M9 9V3m6 6V3M2 13h20M10 12h4v5h-4z"/></>,
  rewards:<><path d="M12 7v14M3 10h18v11H3zM2 7h20v4H2z"/><path d="M12 7C7 7 4 6 4 3c0-3 6-2 8 4Zm0 0c5 0 8-1 8-4 0-3-6-2-8 4Z"/></>,
  offers:<><path d="m3 11 8-8h9l2 10-9 9-10-11Z"/><circle cx="16.8" cy="7.2" r="1.5"/><path d="m8 17 9-9"/></>,
  events:<><path d="M4 5h16v15H4zM4 9h16M8 3v4m8-4v4M8 13l3 2 5-4"/></>,
  settings:<><circle cx="12" cy="12" r="3"/><path d="m10 2-.5 2.1-2.2.9-1.8-1.3-2.8 2.8L4 8.3l-.9 2.2L1 11v3l2.1.5.9 2.2-1.3 1.8 2.8 2.8 1.8-1.3 2.2.9.5 2.1h3l.5-2.1 2.2-.9 1.8 1.3 2.8-2.8-1.3-1.8.9-2.2L23 14v-3l-2.1-.5-.9-2.2 1.3-1.8-2.8-2.8-1.8 1.3-2.2-.9L14 2h-4Z"/></>,
  arena:<><path d="m4 4 16 16M20 4 4 20M2 5l4-4 4 4-4 4zM14 19l4-4 4 4-4 4z"/><path d="M9 12 5 16m10-4 4 4"/></>
};
export function PirateIcon({name,size=24}:{name:PirateIconName;size?:number}){
  return <svg className="pirate-icon" data-pirate-icon={name} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{artwork[name]}</svg>;
}
