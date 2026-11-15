import type {BattleRecord} from './progression';

/** These calculations cover saved recent battle entries only (maximum 12).
 * Never present them as lifetime totals, cloud data or a global leaderboard.
 */
export type BattleHistoryFilter = 'all' | 'victory' | 'defeat';

export function filterBattleHistory(
  entries:ReadonlyArray<BattleRecord>, filter:BattleHistoryFilter
):BattleRecord[] {
  return entries.filter(entry=>filter==='all'||entry.outcome===filter);
}

export function summarizeBattleHistory(entries:ReadonlyArray<BattleRecord>) {
  const summary={battles:0,wins:0,defeats:0,hits:0,shots:0,earnedXp:0,earnedCoins:0};
  for(const battle of entries){
    summary.battles+=1;
    if(battle.outcome==='victory')summary.wins+=1;else summary.defeats+=1;
    summary.hits+=battle.hits;
    summary.shots+=battle.shots;
    summary.earnedXp+=battle.earnedXp;
    summary.earnedCoins+=battle.earnedCoins;
  }
  return {...summary,accuracy:summary.shots===0?null:Math.round(100*summary.hits/summary.shots)};
}
