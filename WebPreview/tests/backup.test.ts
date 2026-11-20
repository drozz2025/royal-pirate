import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialProfile,finishBattle,buyCrew,equipCrew,exportProfileBackup,importProfileBackup,BACKUP_FORMAT} from '../src/progression.ts';
const day=Date.parse('2026-11-15T02:30:00Z');
test('offline save round-trips earned coins and crew without cloud identity',()=>{
 let p=initialProfile();p=finishBattle(p,'victory',4,6);p=finishBattle(p,'victory',3,5);
 p=buyCrew(p,'gunner');p=equipCrew(p,'gunner');
 const raw=exportProfileBackup(p,day),data=JSON.parse(raw);
 assert.equal(data.format,BACKUP_FORMAT);
 assert.equal(data.createdAt,'2026-11-15T02:30:00.000Z');
 assert.deepEqual(importProfileBackup(raw),p);
});
test('restore refuses malformed JSON, other formats, corrupt counters and impossible hits',()=>{
 const raw=exportProfileBackup(initialProfile(),day);
 assert.throws(()=>importProfileBackup('not-json'),/valid JSON/);
 assert.throws(()=>importProfileBackup(raw.replace(BACKUP_FORMAT,'another-game')),/Unsupported/);
 assert.throws(()=>importProfileBackup(JSON.stringify({format:BACKUP_FORMAT,version:1})),/no valid captain profile/);
 const tampered=JSON.parse(raw);tampered.profile.coins=-1;
 assert.throws(()=>importProfileBackup(JSON.stringify(tampered)),/Invalid profile counter/);
 tampered.profile.coins=5;tampered.profile.hits=10;tampered.profile.shots=1;
 assert.throws(()=>importProfileBackup(JSON.stringify(tampered)),/Invalid shot statistics/);
});
test('restore rejects oversized, unowned crew and invalid upgrade data',()=>{
 assert.throws(()=>importProfileBackup(' '.repeat(65_537)),/64 KB/);
 let save=JSON.parse(exportProfileBackup(initialProfile(),day));
 save.profile.ownedCrew=['captain','unknown'];
 assert.throws(()=>importProfileBackup(JSON.stringify(save)),/owned crew/);
 save=JSON.parse(exportProfileBackup(initialProfile(),day));
 save.profile.upgrades.hull=99;
 assert.throws(()=>importProfileBackup(JSON.stringify(save)),/upgrade/);
});
test('save timestamps are verified and backups do not create credentials',()=>{
 assert.throws(()=>exportProfileBackup(initialProfile(),NaN),/Invalid backup time/);
 assert.doesNotMatch(exportProfileBackup(initialProfile(),day),/accessToken|email|password|leaderboard/i);
});
