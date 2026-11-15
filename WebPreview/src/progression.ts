/** ROYAL PIRATE local-only progression.
 * No server account, currency exchange, real-money purchases or online leaderboard.
 * Keep rules deterministic so results can be unit tested without a browser.
 */
export const STORAGE_KEY = 'royal-pirate:local-profile:v1';
export type CrewId = 'captain' | 'gunner' | 'navigator';
export type UpgradeId = 'hull' | 'cannons' | 'sails';
export type MissionId = 'first-win' | 'five-hits' | 'three-battles';
export type BattleOutcome = 'victory' | 'defeat';
/** Compact, truthful, device-only account of completed battles (newest first). */
export type BattleRecord = {outcome:BattleOutcome; shots:number; hits:number; earnedCoins:number; earnedXp:number; completedAt:string};
export type LocalProfile = {
  version: 1; coins: number; xp: number; wins: number; losses: number; hits: number; shots: number;
  ownedCrew: CrewId[]; equippedCrew: CrewId; upgrades: Record<UpgradeId, number>;
  claimedMissions: MissionId[]; lastDailyDay: string; dailyStreak: number; battleLog: BattleRecord[];
};
export const CREW: ReadonlyArray<{id:CrewId;name:string;role:string;cost:number;symbol:string}> = [
  {id:'captain',name:'Captain Mara',role:'Starter captain · collection only',cost:0,symbol:'♛'},
  {id:'gunner',name:'Iron Jack',role:'Gunner · collection only',cost:60,symbol:'✹'},
  {id:'navigator',name:'Northwind',role:'Navigator · collection only',cost:90,symbol:'✦'}
];
export const UPGRADES: ReadonlyArray<{id:UpgradeId;name:string;description:string;symbol:string}> = [
  {id:'hull',name:'Hull',description:'Estaleiro progression only; battle damage unchanged',symbol:'⚓'},
  {id:'cannons',name:'Cannons',description:'Estaleiro progression only; battle damage unchanged',symbol:'✹'},
  {id:'sails',name:'Sails',description:'Estaleiro progression only; battle speed unchanged',symbol:'➶'}
];
export const MISSIONS: ReadonlyArray<{id:MissionId;title:string;target:number;reward:number;measure:'wins'|'hits'|'battles'}> = [
  {id:'first-win',title:'Win your first battle',target:1,reward:25,measure:'wins'},
  {id:'five-hits',title:'Land 5 cannon hits',target:5,reward:35,measure:'hits'},
  {id:'three-battles',title:'Finish 3 battles',target:3,reward:40,measure:'battles'}
];
const MAX = 1_000_000_000;
const bounded = (v:unknown, max=MAX) => typeof v==='number'&&Number.isSafeInteger(v)&&v>=0&&v<=max?v:0;
const LOG_LIMIT=12;
const validIso=(v:unknown):v is string=>typeof v==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(v)&&!Number.isNaN(Date.parse(v))&&new Date(v).toISOString()===v;
function validBattleRecord(v:unknown):v is BattleRecord {
  if(!v||typeof v!=='object'||Array.isArray(v))return false;
  const entry=v as Partial<BattleRecord>;
  if(entry.outcome!=='victory'&&entry.outcome!=='defeat')return false;
  return bounded(entry.shots,1000)===entry.shots&&bounded(entry.hits,1000)===entry.hits&&
    (entry.hits as number)<=(entry.shots as number)&&entry.earnedXp===(entry.outcome==='victory'?50:10)&&
    entry.earnedCoins===(entry.outcome==='victory'?35:0)&&validIso(entry.completedAt);
}
export function initialProfile():LocalProfile {
  return {version:1,coins:0,xp:0,wins:0,losses:0,hits:0,shots:0,ownedCrew:['captain'],equippedCrew:'captain',
    upgrades:{hull:0,cannons:0,sails:0},claimedMissions:[],lastDailyDay:'',dailyStreak:0,battleLog:[]};
}
export function parseProfile(raw:string|null):LocalProfile {
  if(!raw)return initialProfile();
  try {
    const p:unknown=JSON.parse(raw);
    if(!p||typeof p!=='object'||!('version' in p)||(p as {version:unknown}).version!==1)return initialProfile();
    const s=p as Partial<LocalProfile>;
    const crewIds=CREW.map(c=>c.id), missionIds=MISSIONS.map(m=>m.id);
    const owned: CrewId[]=['captain',...crewIds.filter(id=>id!=='captain'&&Array.isArray(s.ownedCrew)&&s.ownedCrew.includes(id))];
    const equipped=owned.includes(s.equippedCrew as CrewId)?s.equippedCrew as CrewId:'captain';
    const upgrades=s.upgrades&&typeof s.upgrades==='object'?s.upgrades:{hull:0,cannons:0,sails:0};
    return {
      version:1,coins:bounded(s.coins),xp:bounded(s.xp),wins:bounded(s.wins),losses:bounded(s.losses),
      hits:bounded(s.hits),shots:bounded(s.shots),ownedCrew:owned,equippedCrew:equipped,
      upgrades:{hull:bounded(upgrades.hull,5),cannons:bounded(upgrades.cannons,5),sails:bounded(upgrades.sails,5)},
      claimedMissions:missionIds.filter(id=>Array.isArray(s.claimedMissions)&&s.claimedMissions.includes(id)),
      lastDailyDay:typeof s.lastDailyDay==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s.lastDailyDay)?s.lastDailyDay:'',
      dailyStreak:bounded(s.dailyStreak,7),
      battleLog:Array.isArray(s.battleLog)?s.battleLog.filter(validBattleRecord).slice(0,LOG_LIMIT):[]
    };
  }catch{return initialProfile();}
}
export const levelFor=(xp:number)=>Math.min(20,1+Math.floor(Math.sqrt(Math.max(0,xp)/80)));
export const battlesPlayed=(p:LocalProfile)=>p.wins+p.losses;
export function finishBattle(p:LocalProfile,outcome:BattleOutcome,hits:number,shots:number,now=Date.now()):LocalProfile {
  const count=bounded(shots,1000), landed=Math.min(count,bounded(hits,1000));
  const earnedXp=outcome==='victory'?50:10,earnedCoins=outcome==='victory'?35:0;
  const safeNow=Number.isSafeInteger(now)&&now>0&&now<=8_640_000_000_000_000?now:Date.now();
  const record:BattleRecord={outcome,shots:count,hits:landed,earnedCoins,earnedXp,completedAt:new Date(safeNow).toISOString()};
  return {...p,wins:p.wins+(outcome==='victory'?1:0),losses:p.losses+(outcome==='defeat'?1:0),
    hits:p.hits+landed,shots:p.shots+count,xp:p.xp+earnedXp,coins:p.coins+earnedCoins,
    battleLog:[record,...(p.battleLog||[])].slice(0,LOG_LIMIT)};
}
export function missionProgress(p:LocalProfile,id:MissionId):number {
  const m=MISSIONS.find(m=>m.id===id);if(!m)return 0;
  return Math.min(m.target,m.measure==='wins'?p.wins:m.measure==='hits'?p.hits:battlesPlayed(p));
}
export function claimMission(p:LocalProfile,id:MissionId):LocalProfile {
  const m=MISSIONS.find(m=>m.id===id);
  if(!m||p.claimedMissions.includes(id)||missionProgress(p,id)<m.target)return p;
  return {...p,coins:p.coins+m.reward,claimedMissions:[...p.claimedMissions,id]};
}
export function buyCrew(p:LocalProfile,id:CrewId):LocalProfile {
  const crew=CREW.find(c=>c.id===id);
  if(!crew||p.ownedCrew.includes(id)||crew.cost===0||p.coins<crew.cost)return p;
  return {...p,coins:p.coins-crew.cost,ownedCrew:[...p.ownedCrew,id]};
}
export function equipCrew(p:LocalProfile,id:CrewId):LocalProfile {
  if(!p.ownedCrew.includes(id)||p.equippedCrew===id)return p;
  return {...p,equippedCrew:id};
}
export function upgradeCost(id:UpgradeId,level:number):number {
  return 45+(UPGRADES.findIndex(u=>u.id===id)*15)+level*35;
}
export function improve(p:LocalProfile,id:UpgradeId):LocalProfile {
  if(!UPGRADES.some(u=>u.id===id))return p;
  const level=p.upgrades[id],cost=upgradeCost(id,level);
  if(level>=5||p.coins<cost)return p;
  return {...p,coins:p.coins-cost,upgrades:{...p.upgrades,[id]:level+1}};
}
const utcDay=(now:number)=>new Date(now).toISOString().slice(0,10);
export function canClaimDaily(p:LocalProfile,now:number):boolean {
  if(!Number.isFinite(now)||now<=0)return false;
  return !p.lastDailyDay||utcDay(now)>p.lastDailyDay;
}
/** Next eligible consecutive UTC claim; expired streaks start over at day one. */
export function nextDailyStreak(p:LocalProfile,now:number):number {
  if(!Number.isFinite(now)||now<=0)return 1;
  const today=utcDay(now),yesterday=utcDay(now-86400000);
  return p.lastDailyDay===today||p.lastDailyDay===yesterday?Math.min(7,p.dailyStreak+1):1;
}
export function claimDaily(p:LocalProfile,now:number):LocalProfile {
  if(!canClaimDaily(p,now))return p;
  const today=utcDay(now),streak=nextDailyStreak(p,now);
  return {...p,lastDailyDay:today,dailyStreak:streak,coins:p.coins+15+streak*5};
}

/** Export/import strictly local saves. This data has no cloud identity or integrity guarantee. */
export const BACKUP_FORMAT='royal-pirate-local-backup';
export function exportProfileBackup(p:LocalProfile,now=Date.now()):string {
  if(!Number.isFinite(now)||now<=0)throw new Error('Invalid backup time.');
  return JSON.stringify({format:BACKUP_FORMAT,version:1,createdAt:new Date(now).toISOString(),
    profile:parseProfile(JSON.stringify(p))},null,2);
}
export function importProfileBackup(raw:string):LocalProfile {
  if(raw.length>65_536)throw new Error('Backup exceeds the 64 KB size limit.');
  let file:unknown;
  try {file=JSON.parse(raw);}catch{throw new Error('The backup file is not valid JSON.');}
  if(!file||typeof file!=='object'||Array.isArray(file))throw new Error('Invalid backup file.');
  const data=file as Record<string,unknown>;
  if(data.format!==BACKUP_FORMAT||data.version!==1)throw new Error('Unsupported ROYAL PIRATE backup format.');
  if(!data.profile||typeof data.profile!=='object'||Array.isArray(data.profile))throw new Error('Backup has no valid captain profile.');
  const p=data.profile as Record<string,unknown>;
  if(p.version!==1)throw new Error('Unsupported profile version.');
  const validCounter=(v:unknown,max=MAX):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0&&v<=max;
  for(const key of ['coins','xp','wins','losses','hits','shots']){
    if(!validCounter(p[key]))throw new Error('Invalid profile counter: '+key);
  }
  if((p.hits as number)>(p.shots as number))throw new Error('Invalid shot statistics.');
  if(!Array.isArray(p.ownedCrew)||p.ownedCrew.some(id=>!CREW.some(c=>c.id===id))||!p.ownedCrew.includes('captain')||
    new Set(p.ownedCrew).size!==p.ownedCrew.length)throw new Error('Invalid owned crew.');
  if(!p.ownedCrew.includes(p.equippedCrew))throw new Error('Equipped captain does not belong to this save.');
  if(!p.upgrades||typeof p.upgrades!=='object'||Array.isArray(p.upgrades))throw new Error('Invalid ship upgrades.');
  for(const u of UPGRADES)if(!validCounter((p.upgrades as Record<string,unknown>)[u.id],5))throw new Error('Invalid ship upgrade level.');
  if(!Array.isArray(p.claimedMissions)||p.claimedMissions.some(id=>!MISSIONS.some(m=>m.id===id))||
    new Set(p.claimedMissions).size!==p.claimedMissions.length)throw new Error('Invalid mission history.');
  if(typeof p.lastDailyDay!=='string'||(p.lastDailyDay!==''&&!/^\d{4}-\d{2}-\d{2}$/.test(p.lastDailyDay))||
    !validCounter(p.dailyStreak,7))throw new Error('Invalid daily reward history.');
  // Older v1 backups have no battleLog. Reject malformed additions rather than silently accepting forged rows.
  if(p.battleLog!==undefined&&(!Array.isArray(p.battleLog)||p.battleLog.length>LOG_LIMIT||
    !p.battleLog.every(validBattleRecord)))throw new Error('Invalid local battle history.');
  return parseProfile(JSON.stringify(p));
}
