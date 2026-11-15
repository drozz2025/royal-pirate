import {CREW, UPGRADES, upgradeCost, type LocalProfile} from './progression';
import {PirateIcon} from './app-icons';

/** The schematic is original, decorative shipyard artwork; the live ship remains in WebGL. */
export function FleetShowcase({profile,onForge,onCrew}:{
  profile:LocalProfile;onForge:()=>void;onCrew:()=>void;
}){
  const levels=UPGRADES.reduce((sum,upgrade)=>sum+profile.upgrades[upgrade.id],0);
  const captain=CREW.find(crew=>crew.id===profile.equippedCrew)?.name??'Captain Mara';
  return <section className="app-fleet-showcase" aria-labelledby="app-fleet-status-title">
    <header className="app-fleet-status-heading">
      <div><div className="app-kicker">ROYAL CROWN · SHIPYARD STATUS</div><h3 id="app-fleet-status-title">Your flagship</h3></div>
      <span className="app-fleet-levels"><strong>{levels} / 15</strong><small>LOCAL LEVELS</small></span>
    </header>
    <div className="app-fleet-blueprint" aria-hidden="true">
      <svg viewBox="0 0 320 156" focusable="false" preserveAspectRatio="xMidYMid meet">
        <path className="app-fleet-wave" d="M0 132 Q25 122 50 132T100 132T150 132T200 132T250 132T300 132T350 132"/>
        <path className="app-fleet-hull-shape" d="M30 105 Q160 119 292 105 L274 127 Q158 147 49 127 Z"/>
        <path className="app-fleet-deck" d="M44 103 L282 103 M76 96 H255 M90 92 V103 M243 92 V103"/>
        <path className="app-fleet-mast" d="M161 31 V104 M224 49 V102"/>
        <path className="app-fleet-sail" d="M152 39 Q125 65 148 90 L152 90 Z M170 40 Q214 52 192 92 H170 Z M232 57 Q260 68 235 94 H232 Z"/>
        <path className="app-fleet-flag" d="M161 31 V16 L197 25 L161 31 Z"/>
        <circle className="app-fleet-porthole" cx="96" cy="117" r="5"/>
        <circle className="app-fleet-porthole" cx="151" cy="124" r="5"/>
        <circle className="app-fleet-porthole" cx="210" cy="120" r="5"/>
      </svg>
      <span>SHIPYARD SCHEMATIC · LIVE 3D AVAILABLE ABOVE</span>
    </div>
    <div className="app-fleet-modules" aria-label="Saved local shipyard levels">
      {UPGRADES.map(u=>{
        const level=profile.upgrades[u.id];
        return <article className="app-fleet-module" key={u.id}>
          <div className="app-fleet-module-top"><span aria-hidden="true">{u.symbol}</span><strong>{u.name}</strong><small>LEVEL {level} / 5</small></div>
          <div className="app-fleet-progress" role="progressbar" aria-label={u.name+' shipyard upgrade progress'} aria-valuemin={0} aria-valuemax={5} aria-valuenow={level}>
            <span style={{width:(level*20)+'%'}}/>
          </div>
          <small>{level>=5?'Maximum local level': 'Next level: '+upgradeCost(u.id,level)+' coins'}</small>
        </article>;
      })}
    </div>
    <p className="app-fleet-captain">Equipped captain: <strong>{captain}</strong></p>
    <div className="app-fleet-actions">
      <button type="button" onClick={onForge}><PirateIcon name="forge" size={19}/> OPEN SHIPYARD</button>
      <button type="button" onClick={onCrew}><PirateIcon name="cards" size={19}/> MANAGE CREW</button>
    </div>
    <p className="app-fine">These levels and the equipped card are saved on this device. They do not yet modify ship appearance, movement or battle damage. The schematic is not a new 3D model.</p>
  </section>;
}
