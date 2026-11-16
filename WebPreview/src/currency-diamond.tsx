import React from 'react';

/** A visual indicator only. Diamond balances and purchases are not yet implemented. */
export function CurrencyDiamond({size=18}:{size?:number}) {
  return <svg width={size} height={size} viewBox="0 0 32 32" focusable="false" aria-hidden="true">
    <path d="M8 6h16l7 10-15 14L1 16Z" fill="#40bdf1" stroke="#e2f8ff" strokeWidth="1.8" strokeLinejoin="round"/>
    <path d="M8 6l5 10 3 14L1 16ZM24 6l-5 10-3 14 15-14ZM13 16l3-10 3 10Z" fill="#9fe9ff"/>
    <path d="M1 16h30M8 6l5 10h6l5-10" fill="none" stroke="#ecfcff" strokeWidth="1.2" opacity=".9"/>
  </svg>;
}
