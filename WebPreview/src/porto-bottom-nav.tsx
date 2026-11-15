import React from 'react';
import { PortoArt } from './porto-art';
import type { AppScreenId } from './app-screens';
import { CREW, UPGRADES, upgradeCost, type LocalProfile } from './progression';

/**
 * Reuses the approved Porto navigation markup and its harbour-nav CSS.
 * Porto itself is deliberately left unchanged; other screens match its exact
 * five-tab sizing, illustrations, labels, gold active state and notifications.
 */
const tabs: ReadonlyArray<{title:string;icon:'port'|'fleet'|'cards'|'shop'|'ranking';screen:AppScreenId|null}> = [
  {title:'PORTO',icon:'port',screen:null},
  {title:'FROTA',icon:'fleet',screen:'fleet'},
  {title:'CARTAS',icon:'cards',screen:'cards'},
  {title:'LOJA',icon:'shop',screen:'shop'},
  {title:'RANKING',icon:'ranking',screen:'ranking'},
];

export function PortoBottomNav({screen,profile,onNavigate,onPorto}:{
  screen:AppScreenId;
  profile:LocalProfile;
  onNavigate:(screen:AppScreenId)=>void;
  onPorto:()=>void;
}) {
  // Exactly the same real, locally-derived alert criteria as Porto.
  const fleetUpgradeReady=UPGRADES.some(u=>profile.upgrades[u.id]<5&&profile.coins>=upgradeCost(u.id,profile.upgrades[u.id]));
  const crewCardReady=CREW.some(c=>!profile.ownedCrew.includes(c.id)&&c.cost>0&&profile.coins>=c.cost);
  return <nav className="harbour-nav app-dock-porto" aria-label="Main game screens">
    {tabs.map(item=>{
      const current=item.screen===screen||(item.screen==='fleet'&&screen==='forge')||
        (item.screen==='ranking'&&screen==='profile');
      const actionable=item.screen==='fleet'?fleetUpgradeReady:item.screen==='cards'?crewCardReady:false;
      const label=item.screen===null?'Porto':item.title+(actionable?', melhoria disponível':'');
      return <button type="button" key={item.title}
        className={'harbour-nav-item'+(current?' harbour-nav-current':'')}
        disabled={current} aria-current={current?'page':undefined}
        onClick={item.screen===null?onPorto:()=>onNavigate(item.screen!)}
        aria-label={label}>
        <span className="harbour-nav-icon" aria-hidden="true"><span className="app-tab-glyph"><PortoArt name={item.icon} size={42}/></span></span>
        <strong>{item.title}</strong>
        {actionable&&<span className="harbour-nav-alert" aria-hidden="true">!</span>}
      </button>;
    })}
  </nav>;
}
