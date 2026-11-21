/**
 * WORK 5 — independent cross-screen local-wallet and accessible HUD QA.
 * React SSR assertions only: no physical iPhone, touch gesture, or click
 * claim. Tests-only: the visual Porto, app screens, gameplay and deploy
 * sources remain owned by WORK 0/4/6/7/8 and are not changed here.
 *
 * Regression target: #104 — the Porto and all eight primary screens must
 * show the SAME earned gold, a truthful unavailable gem counter and the
 * saved local captain's name. Never fabricate online gems or payments.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Harbour} from '../src/harbour.tsx';
import {AppScreens, type AppScreenId} from '../src/app-screens.tsx';
import {
  initialProfile,finishBattle,buyCrew,improve,claimMission,claimDaily,
  canClaimDaily,exportProfileBackup,importProfileBackup,parseProfile,
  type LocalProfile
} from '../src/progression.ts';

const pages:AppScreenId[]=[
  'battle','fleet','forge','cards','shop','missions','ranking','profile'
];
const noop=()=>{};
function screenHtml(screen:AppScreenId,profile:LocalProfile):string {
  return renderToStaticMarkup(React.createElement(AppScreens,{
    screen,profile,onNavigate:noop,onClose:noop,onBattle:noop,
    onBuyCrew:noop,onEquipCrew:noop,onUpgrade:noop,onMission:noop,
    onDaily:noop,onExportBackup:noop,onImportBackup:noop,
    onSetPlayerName:noop,backupMessage:''
  }));
}
const portHtml=(profile:LocalProfile)=>renderToStaticMarkup(
  React.createElement(Harbour,{profile,onBattle:noop,onNavigate:noop})
);
function verifyWallet(profile:LocalProfile,label:string){
  const formatted=new Intl.NumberFormat('pt-PT').format(profile.coins);
  const porto=portHtml(profile);
  assert.ok(porto.includes('aria-label="'+profile.coins+' locally earned coins"'),
    label+' Porto accessible gold differs from saved coins');
  assert.ok(porto.includes('<strong>'+formatted+'</strong>'),
    label+' Porto displayed gold differs from saved coins');
  assert.ok(porto.includes('Diamantes indisponíveis: economia de diamantes ainda não implementada'),
    label+' Porto incorrectly suggests real gems are available');
  assert.equal((porto.match(/class="harbour-stat harbour-stat-diamonds"/g)||[]).length,1,
    label+' Porto must have one visible gem placeholder');
  for(const page of pages){
    const html=screenHtml(page,profile);
    assert.ok(html.includes('aria-label="'+profile.coins+' moedas de ouro ganhas localmente"'),
      label+' '+page+' accessible gold differs from Porto');
    assert.ok(html.includes('<strong>'+formatted+'</strong>'),
      label+' '+page+' displayed gold differs from Porto');
    assert.ok(html.includes('Diamantes indisponíveis nesta versão; economia de gemas não implementada'),
      label+' '+page+' falsely represents gem entitlement');
    assert.equal((html.match(/class="app-wallet app-wallet-gold"/g)||[]).length,1,
      label+' '+page+' must have one gold counter');
    assert.equal((html.match(/class="app-wallet app-wallet-gems"/g)||[]).length,1,
      label+' '+page+' must have one unavailable gem counter');
  }
}

test('WORK5: Porto and all eight views agree on earned gold and unavailable gems at zero and high balances',()=>{
  verifyWallet(initialProfile(),'new captain');
  verifyWallet({...initialProfile(),coins:123_456_789,xp:40_000,wins:41},'advanced captain');
});

test('WORK5: navigating/rendering eight sheets after purchase, daily claim and backup cannot change saved wallet',()=>{
  const when=Date.parse('2026-11-21T03:00:00.000Z');
  let profile=initialProfile();
  for(let i=0;i<4;i++)profile=finishBattle(profile,'victory',3,5,when+i*1000);
  assert.equal(profile.coins,140);
  profile=buyCrew(profile,'gunner');
  profile=improve(profile,'hull');
  profile=claimMission(profile,'first-win');
  profile=claimDaily(profile,when);
  assert.equal(profile.coins,80,'independent expected purchase/reward ledger');
  assert.equal(canClaimDaily(profile,when),false);
  const backup=exportProfileBackup(profile,when+5000);
  const restored=importProfileBackup(backup);
  const before=structuredClone(restored);
  for(let round=0;round<3;round++){
    verifyWallet(restored,'restored captain round '+round);
    assert.deepEqual(restored,before,'SSR navigation mutated local profile');
    assert.strictEqual(claimMission(restored,'first-win'),restored,
      'rendering reopened a claimed mission payout');
    assert.strictEqual(claimDaily(restored,when+7000),restored,
      'rendering reopened claimed UTC reward');
  }
  assert.equal(restored.coins,80,'money changed after repeat navigation');
  assert.equal(restored.upgrades.hull,1);
  assert.ok(restored.ownedCrew.includes('gunner'));
  assert.equal(restored.battleLog.length,4);
});

test('WORK5: player-supplied HTML-like captain names remain escaped in Porto and eight sheets',()=>{
  const unsafe='<script>1</script>';
  const profile=parseProfile(JSON.stringify({...initialProfile(),playerName:unsafe}));
  assert.equal(profile.playerName,unsafe,'test name must survive strict local parsing');
  const rendered=[portHtml(profile),...pages.map(page=>screenHtml(page,profile))];
  for(const [index,html] of rendered.entries()){
    const page=index===0?'Porto':pages[index-1];
    assert.ok(html.includes('&lt;script&gt;1&lt;/script&gt;'),
      page+' lost the actual saved player name or failed escaping');
    assert.ok(!html.includes(unsafe),
      page+' interpolated player-supplied name as executable HTML');
  }
});
