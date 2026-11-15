import React from 'react';
import {PirateIcon} from './app-icons';
import {CREW, UPGRADES, upgradeCost, type LocalProfile, type UpgradeId} from './progression';

/**
 * Screens 03 and 04 of the approved eight-screen composition.
 * All state and prices are derived from the existing local profile.
 * There is only one owned ship; no inventory, armour upgrade or other ships
 * are fabricated to fill the visual layout.
 */
type FleetTab='mine'|'obtain'|'customize';
type ForgeTab=UpgradeId|'armour';
const fleetTabs:ReadonlyArray<{id:FleetTab;title:string}>=[
  {id:'mine',title:'A MINHA FROTA'},
  {id:'obtain',title:'OBTER NAVIOS'},
  {id:'customize',title:'PERSONALIZAR'}
];
const forgeTabs:ReadonlyArray<{id:ForgeTab;title:string}>=[
  {id:'hull',title:'NAVIO'},
  {id:'cannons',title:'CANHÕES'},
  {id:'armour',title:'ARMADURA'},
  {id:'sails',title:'VELAS'}
];

function ShipArtwork({small=false,part='ship'}:{small?:boolean;part?:'ship'|'cannons'|'sails'|'hull'|'armour'}){
  return <svg className={'w4-ship-art '+(small?'w4-ship-small':'')+' w4-part-'+part}
    viewBox="0 0 340 234" role="img" aria-label="Ilustração original do navio Royal Crown">
    <defs>
      <linearGradient id="w4-hull" x1="0" y1="0" x2="0.7" y2="1">
        <stop stopColor="#f9c779"/><stop offset=".24" stopColor="#683421"/><stop offset=".7" stopColor="#381e20"/><stop offset="1" stopColor="#bd793b"/>
      </linearGradient>
      <linearGradient id="w4-sail" x1="0" y1="0" x2=".9" y2="1">
        <stop stopColor="#404b57"/><stop offset=".6" stopColor="#111c2e"/><stop offset="1" stopColor="#111524"/>
      </linearGradient>
      <linearGradient id="w4-sea" x1="0" y1="0" x2="0" y2="1">
        <stop stopColor="#2cc2d6"/><stop offset="1" stopColor="#0c4b88"/>
      </linearGradient>
    </defs>
    <ellipse cx="179" cy="203" rx="140" ry="17" fill="#06314f" opacity=".65"/>
    <path d="M19 205Q59 195 99 207T178 204T255 208T330 202" stroke="#66e6ff" strokeWidth="5" fill="none" opacity=".7"/>
    <path className="w4-art-hull" d="M43 143Q163 160 300 136L271 188Q157 213 81 185Z"
      fill="url(#w4-hull)" stroke="#f5bd65" strokeWidth="5"/>
    <path d="M76 164Q177 181 285 158M95 188Q163 205 256 183" stroke="#bc8246" strokeWidth="4" fill="none"/>
    <path d="M58 146L292 137M84 136L266 136" stroke="#ffd18b" strokeWidth="7" strokeLinecap="round"/>
    <path d="M120 142V32M213 141V18M265 138V65" stroke="#7e522d" strokeWidth="7" strokeLinecap="round"/>
    <path d="M120 38Q70 53 77 124Q98 133 120 128Z" className="w4-art-sail" fill="url(#w4-sail)" stroke="#cba567" strokeWidth="3"/>
    <path d="M127 43Q176 43 196 119Q162 126 127 127Z" className="w4-art-sail" fill="url(#w4-sail)" stroke="#cba567" strokeWidth="3"/>
    <path d="M211 27Q264 39 254 114Q228 123 213 124Z" className="w4-art-sail" fill="url(#w4-sail)" stroke="#cba567" strokeWidth="3"/>
    <path d="M265 70Q298 72 291 127L266 129Z" className="w4-art-sail" fill="url(#w4-sail)" stroke="#cba567" strokeWidth="2"/>
    <path d="M213 18L253 28 213 40Z" fill="#bc2434" stroke="#ffd47c" strokeWidth="2"/>
    <path d="M120 32L155 43 120 54Z" fill="#b52a38" stroke="#ffd47c" strokeWidth="2"/>
    <path d="M167 76l-9 7m22 0-9-7m-4 7 4 10m0-10 4 10" stroke="#f3db9c" strokeWidth="4" strokeLinecap="round"/>
    <circle cx="165" cy="70" r="9" fill="#e8dcb6"/>
    <circle cx="161" cy="68" r="2" fill="#252532"/><circle cx="169" cy="68" r="2" fill="#252532"/>
    <path d="M101 156v9m41-5v10m41-7v10m42-8v8" stroke="#c5a36e" strokeWidth="2"/>
    {Array.from({length:6},(_,i)=><g key={i}>
      <circle className="w4-art-cannon" cx={91+i*29} cy={167+(i===2||i===3?5:0)} r="6" fill="#17202b" stroke="#e1a856" strokeWidth="3"/>
    </g>)}
    <path d="M299 137Q318 145 307 164Q292 171 282 151" fill="none" stroke="#f6b85c" strokeWidth="7"/>
    <path d="M38 207Q95 194 148 208T249 204T339 210" fill="none" stroke="url(#w4-sea)" strokeWidth="9" opacity=".8"/>
  </svg>;
}

export function FleetPanel({profile,onForge,onCrew,onPorto}:{profile:LocalProfile;onForge:()=>void;onCrew:()=>void;onPorto:()=>void}){
  const [tab,setTab]=React.useState<FleetTab>('mine');
  const [details,setDetails]=React.useState(true);
  const captain=CREW.find(c=>c.id===profile.equippedCrew)?.name??'Captain Mara';
  const total=UPGRADES.reduce((s,u)=>s+profile.upgrades[u.id],0);
  return <section className="w4-screen w4-fleet" aria-label="A minha frota">
    <div className="w4-title">
      <div className="w4-kicker">ESTALEIRO REAL · PROGRESSO LOCAL</div>
      <h2><PirateIcon name="fleet" size={26}/> FROTA</h2>
    </div>
    <div role="tablist" aria-label="Secções da frota" className="w4-tabs w4-fleet-tabs">
      {fleetTabs.map(t=><button key={t.id} type="button" role="tab" id={'w4-fleet-tab-'+t.id}
        aria-selected={tab===t.id} aria-controls="w4-fleet-panel"
        onClick={()=>setTab(t.id)}>{t.title}</button>)}
    </div>
    <div id="w4-fleet-panel" role="tabpanel" aria-labelledby={'w4-fleet-tab-'+tab}>
      <div className="w4-harbour-stage">
        <div className="w4-island w4-island-left" aria-hidden="true"/>
        <div className="w4-island w4-island-right" aria-hidden="true"/>
        <ShipArtwork/>
        <div className="w4-stage-label"><span>★ NAVIO REAL</span><strong>ROYAL CROWN</strong>
          <small>1 navio disponível · Capitão {captain}</small>
          <b>✓ ATIVO</b>
        </div>
      </div>
      {tab==='mine'&&<div className="w4-fleet-state">
        <div className="w4-fleet-stats" aria-label="Melhorias locais guardadas">
          {UPGRADES.map(u=><span key={u.id}><b>{u.name}</b><strong>{profile.upgrades[u.id]} / 5</strong></span>)}
          <span><b>PROGRESSO TOTAL</b><strong>{total} / 15</strong></span>
        </div>
        <div className="w4-action-pair">
          <button type="button" className="w4-primary" onClick={onForge}>⚒ ABRIR MELHORIAS</button>
          <button type="button" onClick={onPorto}>VER NAVIO NO PORTO</button>
        </div>
      </div>}
      {tab==='obtain'&&<div className="w4-fleet-state" role="status">
        <h3>Obter navios</h3>
        <p>A Royal Crown é o único navio existente nesta versão. Não há ainda construção, desbloqueios ou compra de outros navios.</p>
        <button type="button" className="w4-primary" onClick={onPorto}>EXPLORAR A ROYAL CROWN</button>
      </div>}
      {tab==='customize'&&<div className="w4-fleet-state">
        <h3>Personalizar a frota</h3>
        <p>O capitão equipado é guardado neste dispositivo. Cores, velas e peças cosméticas ainda não podem ser alteradas.</p>
        <div className="w4-custom-captain"><span aria-hidden="true">♛</span><div><strong>{captain}</strong><small>CAPITÃO EQUIPADO</small></div></div>
        <button type="button" className="w4-primary" onClick={onCrew}>GERIR CAPITÃO / CARTAS</button>
      </div>}
      <div className="w4-cards-caption"><strong>NAVIOS DA FROTA</strong><small>1 disponível · restantes em desenvolvimento</small></div>
      <div className="w4-ship-roster" role="group" aria-label="Selecionar navio da frota">
        <button type="button" className="w4-ship-slot is-active" aria-pressed={details}
          onClick={()=>setDetails(v=>!v)} aria-label="Royal Crown, navio ativo, alternar detalhes">
          <span className="w4-slot-art"><ShipArtwork small/></span><strong>ROYAL CROWN</strong><small>✓ DISPONÍVEL</small>
        </button>
        {[2,3,4].map(n=><div key={n} className="w4-ship-slot is-pending" aria-label={'Espaço '+n+' indisponível'}>
          <span className="w4-slot-empty" aria-hidden="true">⚓</span><strong>ESPAÇO {n}</strong><small>EM DESENVOLVIMENTO</small></div>)}
      </div>
      {details&&<p className="w4-footnote">Royal Crown selecionada. O navio 3D interativo encontra-se no Porto. O estaleiro guarda níveis reais, mas ainda não altera o combate.</p>}
    </div>
  </section>;
}

export function ForgePanel({profile,onUpgrade,onFleet}:{profile:LocalProfile;onUpgrade:(id:UpgradeId)=>void;onFleet:()=>void}){
  const [tab,setTab]=React.useState<ForgeTab>('hull');
  const upgrade=tab==='armour'?undefined:UPGRADES.find(u=>u.id===tab);
  const level=upgrade?profile.upgrades[upgrade.id]:0;
  const max=Boolean(upgrade)&&level>=5;
  const cost=upgrade&&!max?upgradeCost(upgrade.id,level):0;
  const shortfall=Math.max(0,cost-profile.coins);
  return <section className="w4-screen w4-forge" aria-label="Melhorias e forja">
    <div className="w4-title"><div className="w4-kicker">ESTALEIRO · ROYAL CROWN</div>
      <h2><PirateIcon name="forge" size={26}/> MELHORIAS</h2></div>
    <div className="w4-tabs w4-forge-tabs" role="tablist" aria-label="Sistemas do navio">
      {forgeTabs.map(t=><button type="button" role="tab" id={'w4-forge-tab-'+t.id} key={t.id}
        aria-selected={tab===t.id} aria-controls="w4-forge-panel"
        onClick={()=>setTab(t.id)}>{t.title}</button>)}
    </div>
    <div id="w4-forge-panel" role="tabpanel" aria-labelledby={'w4-forge-tab-'+tab}>
      <div className="w4-forge-stage">
        <div className="w4-forge-glow" aria-hidden="true"/>
        <ShipArtwork part={tab==='armour'?'armour':tab==='hull'?'hull':tab}/>
        <div className="w4-forge-description"><span>{upgrade?'MELHORIA LOCAL DISPONÍVEL':'FUNÇÃO FUTURA'}</span>
          <h3>{upgrade?upgrade.name:'Armadura'}</h3>
          {upgrade?<strong>NÍVEL {level} <em>→ {max?'MAX':level+1}</em></strong>:<strong>INDISPONÍVEL</strong>}
        </div>
      </div>
      <div className="w4-attributes" aria-label="Atributos guardados">
        <h3>PROGRESSO DO ESTALEIRO</h3>
        {upgrade?
          <div className="w4-level-track" role="progressbar" aria-label={'Nível de '+upgrade.name}
            aria-valuemin={0} aria-valuemax={5} aria-valuenow={level}>
            {[1,2,3,4,5].map(i=><span key={i} className={i<=level?'is-filled':''}/>)}
          </div>:
          <p>Não existe um sistema de armadura no progresso local. Não há níveis, preços ou benefícios para apresentar.</p>}
        <div className="w4-system-levels" aria-label="Níveis locais dos sistemas do navio">
          {UPGRADES.map(u=><div key={u.id}>
            <strong>{u.name}</strong><small>NÍVEL {profile.upgrades[u.id]} / 5</small>
            <span role="progressbar" aria-label={u.name+' shipyard upgrade progress'} aria-valuemin={0} aria-valuemax={5}
              aria-valuenow={profile.upgrades[u.id]} className="w4-mini-track">
              <i style={{width:profile.upgrades[u.id]*20+'%'}}/>
            </span>
          </div>)}
        </div>
        {upgrade&&<p>O nível fica guardado no dispositivo. Esta melhoria ainda não altera dano, vida, velocidade ou o modelo 3D no combate.</p>}
      </div>
      <div className="w4-materials" aria-label="Custo e materiais disponíveis">
        <h3>MATERIAIS E CUSTOS</h3>
        {upgrade&&<div className="w4-resource-grid">
          <div><span className="w4-coin" aria-hidden="true">●</span><small>MOEDAS LOCAIS</small><strong>{profile.coins.toLocaleString('pt-PT')}</strong></div>
          <div><span aria-hidden="true">⚒</span><small>{max?'MELHORIA COMPLETA':'CUSTO REAL'}</small><strong>{max?'MÁXIMO':cost.toLocaleString('pt-PT')+' ●'}</strong></div>
          <div><span aria-hidden="true">◆</span><small>EM FALTA</small><strong>{max?'—':shortfall.toLocaleString('pt-PT')+' ●'}</strong></div>
        </div>}
        <p>{upgrade?'Não existe inventário de madeira, ferro ou gemas nesta versão: apenas moedas locais são usadas.':'A armadura e os respetivos materiais ainda não estão implementados.'}</p>
      </div>
      {upgrade?<button type="button" className="w4-improve-button" disabled={max||shortfall>0}
        onClick={()=>onUpgrade(upgrade.id)} aria-label={max?'Melhoria no máximo':shortfall>0?'Moedas insuficientes, faltam '+shortfall:'Melhorar '+upgrade.name+' por '+cost+' moedas'}>
        {max?'MELHORIA MÁXIMA':shortfall>0?'MOEDAS INSUFICIENTES':'MELHORAR · '+cost.toLocaleString('pt-PT')+' ●'}
      </button>:<button type="button" className="w4-improve-button" disabled>ARMADURA INDISPONÍVEL</button>}
      <div className="w4-action-pair"><button type="button" onClick={onFleet}>← VOLTAR À FROTA</button></div>
      <p className="w4-footnote">Os valores apresentados são exclusivamente níveis e moedas guardados neste navegador. Sem compras externas nem efeitos de combate simulados.</p>
    </div>
  </section>;
}
