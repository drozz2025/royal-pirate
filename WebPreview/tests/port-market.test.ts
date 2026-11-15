import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {AppScreens,type AppScreenId} from '../src/app-screens.tsx';
import {buyCrew,finishBattle,initialProfile,type LocalProfile} from '../src/progression.ts';

const noop=()=>{};
function screen(id:AppScreenId,profile:LocalProfile){
 return renderToStaticMarkup(React.createElement(AppScreens,{
   screen:id,profile,onNavigate:noop,onClose:noop,onBattle:noop,onInspect:noop,onBuyCrew:noop,
   onEquipCrew:noop,onUpgrade:noop,onMission:noop,onDaily:noop,
   onExportBackup:noop,onImportBackup:noop,backupMessage:''
 }));
}

test('port market shows true local inventory, real coin costs and unavailable paid services',()=>{
 const html=screen('shop',initialProfile());
 assert.match(html,/Port Market/);
 assert.match(html,/Recruit your crew/);
 assert.match(html,/3 COLLECTED|1 \/ 3 COLLECTED/);
 assert.match(html,/Captain Mara already collected/);
 assert.match(html,/Need 60 more local coins to recruit Iron Jack/);
 assert.match(html,/Need 90 more local coins to recruit Northwind/);
 assert.match(html,/EARN COINS IN BATTLE/);
 assert.match(html,/MANAGE CREW/);
 assert.match(html,/No real-money checkout is available/);
 assert.doesNotMatch(html,/BUY NOW|REAL.MONEY CHECKOUT/);
});

test('market recruitment follows actual coin balance and local crew ownership',()=>{
 const earned=finishBattle(finishBattle(initialProfile(),'victory',1,2),'victory',1,3);
 assert.equal(earned.coins,70);
 let html=screen('shop',earned);
 assert.match(html,/Recruit Iron Jack for 60 local coins/);
 assert.match(html,/Need 20 more local coins to recruit Northwind/);
 const bought=buyCrew(earned,'gunner');
 assert.equal(bought.coins,10);
 assert.deepEqual(bought.ownedCrew,['captain','gunner']);
 html=screen('shop',bought);
 assert.match(html,/Iron Jack already collected/);
 assert.match(html,/Need 80 more local coins to recruit Northwind/);
 assert.match(html,/2 \/ 3 COLLECTED/);
});

test('personal victory milestone route reflects completed real battles, not online rankings',()=>{
 const fresh=screen('profile',initialProfile());
 assert.match(fresh,/Captain&#x27;s milestones/);
 assert.match(fresh,/aria-label="Personal victory milestones" aria-valuemin="0" aria-valuemax="10" aria-valuenow="0"/);
 let profile=initialProfile();
 for(let i=0;i<3;i++)profile=finishBattle(profile,'victory',2,3);
 const html=screen('profile',profile);
 assert.match(html,/aria-label="Personal victory milestones" aria-valuemin="0" aria-valuemax="10" aria-valuenow="3"/);
 assert.match(html,/3 WINS/);
 assert.match(html,/not online ranks, leagues or prize claims/);
 assert.match(html,/no account, multiplayer service or connected leaderboard yet/);
});
