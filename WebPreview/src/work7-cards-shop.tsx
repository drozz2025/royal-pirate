import React from 'react';
import {CREW, type CrewId, type LocalProfile} from './progression';

/** WORK 7. Visual card tiers are decorative: canonical progression has no rarity mechanics. */
const visualTier:Record<CrewId,string> = {
  captain:'INICIAL', gunner:'ESPECIAL', navigator:'RARO'
};
/** Short captions preserve legibility in the approved four-column mobile grid. */
const compactCrewName:Record<CrewId,string> = {captain:'Mara',gunner:'Iron Jack',navigator:'Northwind'};

function CardArt({id,featured=false}:{id:CrewId;featured?:boolean}) {
  return <svg className={featured?'w7-featured-svg':'w7-art-svg'} viewBox="0 0 180 160" role="img" aria-label={id==='captain'?'Retrato ilustrado de capitã pirata':id==='gunner'?'Ilustração de canhão de bronze':'Rosa dos ventos ilustrada'}>
    <defs>
      <radialGradient id={'w7-glow-'+id}><stop stopColor={id==='navigator'?'#97fff0':'#fff1bb'}/><stop offset="1" stopColor={id==='gunner'?'#633723':'#13334d'}/></radialGradient>
    </defs>
    <circle cx="90" cy="78" r="67" fill={'url(#w7-glow-'+id+')'} opacity=".7"/>
    <circle cx="90" cy="78" r="61" fill="none" stroke="#ffe0a3" strokeWidth="2" strokeDasharray="2 8"/>
    {id==='captain'?<>
      <path d="M38 148Q47 111 90 110Q133 111 142 148Z" fill="#9f2332" stroke="#e8ba70" strokeWidth="4"/>
      <path d="M75 111L90 135 105 111" fill="#faf2d0" stroke="#785b46" strokeWidth="3"/>
      <ellipse cx="90" cy="82" rx="29" ry="37" fill="#e4a56d" stroke="#743d26" strokeWidth="3"/>
      <path d="M60 73Q57 28 90 33Q120 28 122 73L113 66 90 57 67 66Z" fill="#17253c" stroke="#e5b95f" strokeWidth="3"/>
      <path d="M41 68Q90 49 139 68L134 78Q90 70 46 78Z" fill="#222d44" stroke="#ffe1a0" strokeWidth="3"/>
      <path d="M83 43L90 31 97 43Z" fill="#f2d18b"/>
      <circle cx="80" cy="84" r="3" fill="#17253c"/><circle cx="100" cy="84" r="3" fill="#17253c"/>
      <path d="M75 97Q90 107 105 97M90 86V95" stroke="#8d4e31" strokeWidth="3" fill="none" strokeLinecap="round"/>
      <path d="M67 112Q90 124 113 112" stroke="#442921" strokeWidth="9" fill="none" strokeLinecap="round"/>
    </>:id==='gunner'?<>
      <path d="M35 139H145L129 118H51Z" fill="#9a5d32" stroke="#ffda80" strokeWidth="4"/>
      <circle cx="63" cy="131" r="18" fill="#3b3441" stroke="#d0a568" strokeWidth="5"/><circle cx="122" cy="131" r="18" fill="#3b3441" stroke="#d0a568" strokeWidth="5"/>
      <path d="M42 104L118 50 150 70 83 116Z" fill="#a66c39" stroke="#f7d98c" strokeWidth="4"/>
      <path d="M118 50L150 70 158 63 124 43Z" fill="#f4be61" stroke="#fff0ba" strokeWidth="3"/>
      <path d="M83 113L103 98M94 87L113 73" stroke="#5c372b" strokeWidth="5"/>
      <path d="M146 38L155 21M152 46L174 40M142 31L139 12" stroke="#ffe5a3" strokeWidth="6" strokeLinecap="round"/>
    </>:<>
      <circle cx="90" cy="80" r="53" fill="#163f56" stroke="#f9dca0" strokeWidth="8"/>
      <circle cx="90" cy="80" r="43" fill="none" stroke="#75d8dd" strokeWidth="3"/>
      <path d="M90 14L103 68 154 80 103 92 90 147 77 92 26 80 77 68Z" fill="#eac16d" stroke="#fff0b3" strokeWidth="3"/>
      <path d="M90 29L90 131 37 80 143 80Z" fill="#47adc1" opacity=".86"/>
      <circle cx="90" cy="80" r="14" fill="#f9dfa0" stroke="#58412d" strokeWidth="3"/>
      <circle cx="90" cy="80" r="5" fill="#18364d"/>
      <text x="90" y="11" fontSize="13" textAnchor="middle" fontWeight="900" fill="#ffebac">N</text>
    </>}
    <circle cx="24" cy="27" r="3" fill="#fff0bb"/><circle cx="155" cy="31" r="2.5" fill="#fff0bb"/>
  </svg>;
}



/** Five decorative heraldic seals for future collection slots.
 * They are deliberately not characters, unlocks, rarity or game items. */
function FutureCardSeal({slot}:{slot:number}) {
  const colors=[
    ['#82e8e5','#266e8c'],['#ddb0fc','#6647a1'],['#b9efad','#35795c'],
    ['#ffd28c','#956039'],['#efb4c3','#93546c']
  ] as const;
  const [shine,shade]=colors[slot%colors.length];
  const glyphs=[
    <g key="anchor" fill="none" stroke={shine} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="49" cy="24" r="7"/><path d="M49 32V72M34 43H64M23 60Q23 78 49 79Q75 78 75 60M23 60L16 66M75 60L82 66"/>
    </g>,
    <g key="helm" fill="none" stroke={shine} strokeLinecap="round">
      <circle cx="49" cy="50" r="23" strokeWidth="5"/><circle cx="49" cy="50" r="7" strokeWidth="4"/>
      <path d="M49 15V85M14 50H84M24 25L74 75M74 25L24 75" strokeWidth="4"/>
    </g>,
    <g key="compass" stroke={shine} strokeLinejoin="round">
      <path d="M49 14L59 40 84 50 59 60 49 86 39 60 14 50 39 40Z" fill={shade} strokeWidth="3"/>
      <path d="M49 24L49 76M23 50H75" strokeWidth="2.5"/>
      <circle cx="49" cy="50" r="6" fill={shine} strokeWidth="1"/>
    </g>,
    <g key="sails" stroke={shine} strokeLinejoin="round" strokeWidth="3">
      <path d="M49 17V76M49 21L17 64H49ZM55 29L79 65H55Z" fill={shade}/>
      <path d="M18 73H82L72 82H30Z" fill={shine}/>
    </g>,
    <g key="cannon" stroke={shine} strokeWidth="3.5" strokeLinejoin="round">
      <path d="M19 45L68 28 79 50 32 66Z" fill={shade}/><path d="M68 27L79 23 90 48 79 51Z" fill={shine}/>
      <path d="M27 70H76L85 78H19Z" fill={shade}/><circle cx="32" cy="78" r="8" fill={shine}/><circle cx="71" cy="78" r="8" fill={shine}/>
    </g>
  ];
  const id='w7-seal-'+slot;
  return <svg className="w7-future-icon" viewBox="0 0 98 96" aria-hidden="true" focusable="false">
    <defs><radialGradient id={id}><stop stopColor={shade}/><stop offset=".7" stopColor="#152e51"/><stop offset="1" stopColor="#081a34"/></radialGradient></defs>
    <path d="M49 3L89 17V53Q88 78 49 93Q10 78 9 53V17Z" fill={'url(#'+id+')'} stroke={shine} strokeWidth="3.5"/>
    <path d="M49 10L81 22V51Q80 72 49 84Q18 72 17 51V22Z" fill="none" stroke="#fff4cf" strokeOpacity=".28" strokeWidth="1.5"/>
    {glyphs[slot%glyphs.length]}
    <circle cx="49" cy="8" r="2" fill="#fff6cc"/>
  </svg>;
}

/** Three distinct treasure-chest illustrations, strictly preview-only. */
function PreviewChestArt({tier}:{tier:'rare'|'epic'|'legend'}) {
  const palette={
    rare:{metal:'#91edff',body:'#217aaa',shade:'#123968',glow:'#e5ffff'},
    epic:{metal:'#e7bcff',body:'#7840aa',shade:'#32195c',glow:'#fff0ff'},
    legend:{metal:'#ffe39a',body:'#b87d38',shade:'#582e1f',glow:'#fff9cc'}
  }[tier];
  const id='w7-chest-'+tier;
  return <svg className={'w7-preview-chest w7-preview-chest-'+tier} viewBox="0 0 130 116" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={id+'-wood'} x1="0" y1="0" x2="1" y2="1"><stop stopColor={palette.body}/><stop offset="1" stopColor={palette.shade}/></linearGradient>
      <linearGradient id={id+'-metal'} x1="0" y1="0" x2="1" y2="1"><stop stopColor={palette.glow}/><stop offset=".5" stopColor={palette.metal}/><stop offset="1" stopColor={palette.body}/></linearGradient>
    </defs>
    <ellipse cx="65" cy="106" rx="54" ry="8" fill="#041027" opacity=".55"/>
    <path d="M16 50Q16 19 65 18Q114 19 114 50V68H16Z" fill={'url(#'+id+'-wood)'} stroke={palette.metal} strokeWidth="4"/>
    <path d="M27 49Q28 28 65 27Q102 28 103 49" fill="none" stroke={palette.glow} strokeOpacity=".7" strokeWidth="3"/>
    <path d="M12 59H118L111 99Q65 108 19 99Z" fill={'url(#'+id+'-wood)'} stroke={palette.metal} strokeWidth="4"/>
    <path d="M20 68H110M29 31V96M101 31V96" fill="none" stroke={'url(#'+id+'-metal)'} strokeWidth="8"/>
    <path d="M13 57H117V66H13Z" fill={'url(#'+id+'-metal)'}/>
    <path d="M52 60H78V84Q65 97 52 84Z" fill={'url(#'+id+'-metal)'} stroke={palette.glow} strokeWidth="2"/>
    {tier==='rare'?<path d="M65 66L72 74 65 83 58 74Z" fill={palette.shade}/>:
      tier==='epic'?<path d="M65 65L68 72 76 73 70 79 72 85 65 82 58 85 60 79 54 73 62 72Z" fill={palette.shade}/>:
      <path d="M57 80L54 70 61 75 65 66 69 75 76 70 73 80Z" fill={palette.shade}/>}
    <circle cx="65" cy="89" r="3" fill={palette.glow}/>
    <path d="M31 17L27 9M65 11V3M99 17L103 9" stroke={palette.glow} strokeWidth="3" strokeLinecap="round"/>
  </svg>;
}

function ShopRelic({kind}:{kind:'coins'|'gems'|'special'}) {
  const id='w7-relic-'+kind;
  return <svg className={'w7-relic-svg w7-relic-'+kind} viewBox="0 0 120 110" role="img" aria-label={kind==='coins'?'Moedas douradas ilustradas':kind==='gems'?'Gema azul ilustrada':'Baú de tesouro ilustrado'}>
    <defs><linearGradient id={id+'-gold'} x1="0" x2="1" y1="0" y2="1"><stop stopColor="#fff5bc"/><stop offset=".5" stopColor="#f3bc54"/><stop offset="1" stopColor="#a95c23"/></linearGradient>
    <linearGradient id={id+'-aqua'} x1="0" x2="1" y1="0" y2="1"><stop stopColor="#e8ffff"/><stop offset=".43" stopColor="#41d6ef"/><stop offset="1" stopColor="#3066aa"/></linearGradient></defs>
    <ellipse cx="60" cy="95" rx="48" ry="10" fill="#061626" opacity=".45"/>
    {kind==='coins'?<>
      <path d="M18 67V85Q18 100 44 100T70 85V67" fill="#a95c25" stroke="#593317" strokeWidth="3"/>
      <ellipse cx="44" cy="67" rx="26" ry="12" fill={'url(#'+id+'-gold)'} stroke="#fff2b6" strokeWidth="3"/>
      <path d="M43 43V72Q43 83 69 83T95 72V43" fill="#cf8436" stroke="#67401e" strokeWidth="3"/>
      <ellipse cx="69" cy="43" rx="26" ry="12" fill={'url(#'+id+'-gold)'} stroke="#fff2b6" strokeWidth="3"/>
      <path d="M32 33Q46 9 69 24L88 38 64 58Z" fill={'url(#'+id+'-gold)'} stroke="#fff2bc" strokeWidth="3"/>
      <path d="M55 30L69 25M73 35L65 45" stroke="#9e6127" strokeWidth="4" strokeLinecap="round"/>
    </>:kind==='gems'?<>
      <path d="M19 43L39 17H81L101 43 60 94Z" fill={'url(#'+id+'-aqua)'} stroke="#bdfaff" strokeWidth="4" strokeLinejoin="round"/>
      <path d="M19 43H101M39 17L49 43 60 94 72 43 81 17" fill="none" stroke="#f0ffff" strokeWidth="3" opacity=".8"/>
      <path d="M49 43L60 94 72 43" fill="#2468b9" opacity=".35"/>
      <path d="M49 9V1M8 32L1 27M108 22L116 14" stroke="#fff5bf" strokeWidth="4" strokeLinecap="round"/>
    </>:<>
      <path d="M18 51Q18 31 60 31T102 51V85Q102 96 60 96T18 85Z" fill="#90502d" stroke="#ffe29a" strokeWidth="4"/>
      <path d="M18 51Q18 22 60 22T102 51Z" fill="#b46a38" stroke="#ffdea0" strokeWidth="4"/>
      <path d="M23 52H97M39 33V93M81 33V93" stroke="#f8c45c" strokeWidth="8"/>
      <path d="M48 52H72V77Q60 86 48 77Z" fill={'url(#'+id+'-gold)'} stroke="#fff1b4" strokeWidth="3"/>
      <circle cx="60" cy="65" r="4" fill="#70401d"/>
      <path d="M55 8L60 1 65 8M102 17L111 13M12 22L3 17" fill="none" stroke="#fff1b3" strokeWidth="4" strokeLinecap="round"/>
    </>}
  </svg>;
}


/** Decorative SVG panorama. All game state remains in LocalProfile. */
function MastheadScene({kind}:{kind:'cards'|'shop'}) {
  const shop=kind==='shop';
  const sky='w7-scene-sky-'+kind,water='w7-scene-water-'+kind;
  return <svg className="w7-masthead-art" viewBox="0 0 380 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={sky} x1="0" y1="0" x2="0" y2="1">
        <stop stopColor="#377ea2"/><stop offset=".53" stopColor="#164465"/><stop offset="1" stopColor="#071f41"/>
      </linearGradient>
      <linearGradient id={water} x1="0" y1="0" x2="0" y2="1">
        <stop stopColor="#51aab7"/><stop offset="1" stopColor="#092d50"/>
      </linearGradient>
    </defs>
    <rect width="380" height="150" fill={'url(#'+sky+')'}/>
    <circle cx="296" cy="39" r="31" fill="#ffdda0" opacity=".66"/>
    <path d="M100 83Q141 59 188 82L220 67 259 81 301 68 347 82 380 72V150H90Z" fill="#0a2c48" opacity=".75"/>
    <path d="M140 102Q210 93 263 99T380 96V150H120Z" fill={'url(#'+water+')'}/>
    <path d="M100 118Q169 109 224 119T380 117M112 136Q199 124 280 135T380 131" fill="none" stroke="#8be0df" strokeWidth="2.5" opacity=".44"/>
    {shop ? <g transform="translate(224 18)">
      <ellipse cx="79" cy="121" rx="85" ry="11" fill="#031225" opacity=".6"/>
      <path d="M15 79H139V122H15Z" fill="#5d3826" stroke="#dfb467" strokeWidth="4"/>
      <path d="M3 73L18 35H138L154 73Z" fill="#b54139" stroke="#ffe19c" strokeWidth="4"/>
      <path d="M18 36H138L131 51H25Z" fill="#e7ba66"/>
      <path d="M3 73L18 35 35 73M51 73L58 35 66 73M84 73L93 35 102 73M118 73L138 35 154 73" fill="#8e2936" stroke="#f3c67b" strokeWidth="2"/>
      <path d="M24 79V122M130 79V122" stroke="#f7cb77" strokeWidth="9"/>
      <rect x="43" y="78" width="68" height="34" rx="6" fill="#152c48" stroke="#f5cd81" strokeWidth="3"/>
      <path d="M52 90H103M56 100H99" stroke="#ffe3a6" strokeWidth="3" strokeLinecap="round"/>
      <circle cx="78" cy="31" r="8" fill="#fbe9ad" stroke="#bd7b31" strokeWidth="3"/>
      <path d="M78 23V10M69 11H87" stroke="#ffebaa" strokeWidth="4" strokeLinecap="round"/>
      <circle cx="8" cy="116" r="8" fill="#edb95c"/><circle cx="153" cy="118" r="8" fill="#eec86b"/>
    </g> : <g transform="translate(218 12)">
      <ellipse cx="78" cy="126" rx="88" ry="10" fill="#031225" opacity=".7"/>
      <path d="M3 103L153 103 126 124H35Z" fill="#7f4c2f" stroke="#f4c57c" strokeWidth="5"/>
      <path d="M29 101L52 55H119L143 101Z" fill="#251e34" stroke="#eebf79" strokeWidth="3"/>
      <path d="M75 104V5M114 103V19" stroke="#e6b46e" strokeWidth="5"/>
      <path d="M72 12L19 79H72Z" fill="#e8d8b5" stroke="#fff3d5" strokeWidth="3"/>
      <path d="M80 14L127 72H80Z" fill="#252d44" stroke="#dfba72" strokeWidth="3"/>
      <path d="M111 24L143 76H111Z" fill="#20283e" stroke="#dfba72" strokeWidth="3"/>
      <path d="M75 5L98 11 75 19Z" fill="#bc4b3d"/>
      <path d="M43 105V117M62 105V120M84 105V121M108 105V119" stroke="#f4b965" strokeWidth="3"/>
      <path d="M9 108Q77 118 146 109" fill="none" stroke="#faf0c6" strokeWidth="3" opacity=".7"/>
    </g>}
    <path d="M200 33l7 -3 7 3M178 46l6 -2 5 2" fill="none" stroke="#fff1cb" strokeWidth="2" strokeLinecap="round" opacity=".75"/>
  </svg>;
}

function TabBar<T extends string>({value,tabs,onSelect,label}:{value:T;tabs:ReadonlyArray<readonly [T,string]>;onSelect:(value:T)=>void;label:string}) {
  return <div className={'w7-tabs '+(tabs.length===4?'w7-tabs-four':'')} role="tablist" aria-label={label}>
    {tabs.map(([id,name])=><button key={id} type="button" role="tab" aria-selected={value===id} onClick={()=>onSelect(id)}>{name}</button>)}
  </div>;
}

type CardProps={profile:LocalProfile;onBuyCrew:(id:CrewId)=>void;onEquipCrew:(id:CrewId)=>void;onBattle:()=>void;announce:(message:string,callback:()=>void)=>void};
export function CardsCollection({profile,onBuyCrew,onEquipCrew,onBattle,announce}:CardProps) {
  const [tab,setTab]=React.useState<'collection'|'upgrade'|'fusion'>('collection');
  const [ownedOnly,setOwnedOnly]=React.useState(false);
  const [selected,setSelected]=React.useState<CrewId>(profile.equippedCrew);
  const cards=CREW.filter(c=>!ownedOnly||profile.ownedCrew.includes(c.id));
  const active=cards.find(c=>c.id===selected)??cards[0];
  const owned=profile.ownedCrew.includes(active.id);
  const equipped=profile.equippedCrew===active.id;
  const canRecruit=!owned&&active.cost>0&&profile.coins>=active.cost;
  const press=()=>{
    if(equipped)return;
    if(owned)announce(active.name+' equipado localmente. Sem efeitos de combate.',()=>onEquipCrew(active.id));
    else if(canRecruit)announce(active.name+' recrutado com '+active.cost+' moedas locais.',()=>onBuyCrew(active.id));
  };
  return <div className="w7-screen" data-work7-screen="cards">
    <header className="w7-hero"><MastheadScene kind="cards"/><div><span className="w7-eyebrow">ROYAL PIRATE · COLEÇÃO</span><h2>CARTAS</h2><p>Tripulação do teu navio</p></div>
      <div className="w7-medal" aria-label={profile.ownedCrew.length+' de '+CREW.length+' cartas adquiridas'}><strong>{profile.ownedCrew.length}/{CREW.length}</strong><small>CARTAS</small></div>
    </header>
    <TabBar value={tab} onSelect={setTab} label="Cartas" tabs={[['collection','A MINHA COLEÇÃO'],['upgrade','MELHORAR'],['fusion','FUSÃO']]}/>
    {tab==='collection'&&<section className="w7-content" role="tabpanel" aria-label="A minha coleção">
      <div className="w7-line"><strong>ESCOLHE UMA CARTA</strong><div className="w7-filter" role="group" aria-label="Filter crew collection">
        <button type="button" aria-pressed={!ownedOnly} onClick={()=>setOwnedOnly(false)}>TODAS</button>
        <button type="button" aria-pressed={ownedOnly} onClick={()=>setOwnedOnly(true)}>MINHAS</button>
      </div></div>
      <div className="w7-collection-progress" role="progressbar" aria-label="Cartas da tripulação adquiridas" aria-valuemin={0} aria-valuemax={CREW.length} aria-valuenow={profile.ownedCrew.length}><span style={{width:(profile.ownedCrew.length/CREW.length*100)+"%"}}/></div>
      <div className="w7-line w7-crew-caption"><strong>TRIPULAÇÃO DISPONÍVEL</strong><span>TOCA NUMA CARTA PARA VER</span></div>
      <div className="w7-card-grid" role="group" aria-label="Escolher carta da tripulação">
        {cards.map(c=>{
          const isOwned=profile.ownedCrew.includes(c.id),isSelected=active.id===c.id,isEquipped=profile.equippedCrew===c.id;
          return <button key={c.id} className={'w7-card w7-'+c.id+(isSelected?' is-selected':'')+(!isOwned?' is-locked':'')} type="button" aria-pressed={isSelected}
              aria-label={'Ver '+c.name+(isOwned?', adquirido':', bloqueado')} onClick={()=>setSelected(c.id)}>
            <span className="w7-card-top"><span>{visualTier[c.id]}</span><span aria-hidden="true">{isOwned?'◆':'◇'}</span></span>
            <span className="w7-card-art"><CardArt id={c.id}/></span>
            <span className="w7-card-level" title="Níveis de cartas ainda indisponíveis">NV. <span>—</span></span>
            <strong title={c.name}>{compactCrewName[c.id]}</strong><small>{isEquipped?'★ EQUIPADO':isOwned?'✓ ADQUIRIDO':c.cost+' ● MOEDAS'}</small>
          </button>;
        })}
        {!ownedOnly&&Array.from({length:5},(_,slot)=><div key={'upcoming-'+slot}
          className={'w7-future-card w7-upcoming-'+slot}
          aria-label={'Espaço '+(slot+1)+' para carta futura; não disponível'}>
          <div className="w7-future-seal" aria-hidden="true"><FutureCardSeal slot={slot}/></div>
          <strong>POR REVELAR</strong><small>EM BREVE</small>
          <span className="w7-future-note">Sem personagem, custo ou nível</span>
        </div>)}
      </div>
      <div className={'w7-spotlight w7-spotlight-'+active.id} aria-live="polite">
        <div className="w7-spotlight-portrait"><CardArt id={active.id} featured/><span>{equipped?'EM SERVIÇO':owned?'ADQUIRIDA':'POR RECRUTAR'}</span></div>
        <div className="w7-spotlight-info">
          <span className="w7-eyebrow">CARTA EM DESTAQUE</span>
          <h3>{active.name}</h3>
          <p>{active.role}</p>
          <div className="w7-spotlight-tags"><span>{visualTier[active.id]}</span><span>{owned?'NO INVENTÁRIO':active.cost+' MOEDAS LOCAIS'}</span></div>
          <button type="button" disabled={equipped||(!owned&&!canRecruit)} onClick={press}
            aria-label={equipped?active.name+' já equipado':owned?'Equipar '+active.name:canRecruit?'Recrutar '+active.name+' por '+active.cost+' moedas locais':'Faltam '+Math.max(0,active.cost-profile.coins)+' moedas para '+active.name}>
            {equipped?'EQUIPADO':owned?'EQUIPAR':canRecruit?'RECRUTAR':'SEM MOEDAS'}
          </button>
        </div>
      </div>
      <p className="w7-disclaimer">Coleção guardada neste dispositivo. Níveis ainda indisponíveis. Raridades visuais sem efeitos de jogo; personagens equipadas ainda não alteram o combate.</p>
    </section>}
    {tab==='upgrade'&&<section className="w7-content w7-feature" role="tabpanel" aria-label="Melhorar cartas">
      <span className="w7-feature-mark">✦</span><div className="w7-feature-deck" aria-hidden="true"><span className="w7-feature-art"><CardArt id={profile.equippedCrew}/></span><span className="w7-feature-spark">✦</span><span className="w7-feature-empty">?</span></div><span className="w7-eyebrow">EVOLUÇÃO DE CARTAS</span><h3>MELHORAR</h3>
      <p>A evolução de cartas ainda não tem níveis ou custos reais definidos. Nenhuma moeda será consumida.</p>
      <div className="w7-feature-row"><span>◆</span><strong>Melhorias em desenvolvimento</strong><b>EM BREVE</b></div>
      <button type="button" onClick={()=>setTab('collection')}>VOLTAR À COLEÇÃO</button>
    </section>}
    {tab==='fusion'&&<section className="w7-content w7-feature" role="tabpanel" aria-label="Fusão de cartas">
      <span className="w7-feature-mark">◇ + ◇</span><div className="w7-feature-deck" aria-hidden="true"><span className="w7-feature-empty">?</span><span className="w7-feature-spark">+</span><span className="w7-feature-empty">?</span></div><span className="w7-eyebrow">OFICINA DE CARTAS</span><h3>FUSÃO</h3>
      <p>Não existem duplicados ou receitas de fusão no progresso real. As tuas cartas permanecem intactas.</p>
      <div className="w7-feature-row"><span>♛</span><strong>Fusões em desenvolvimento</strong><b>EM BREVE</b></div>
      <button type="button" onClick={()=>setTab('collection')}>VOLTAR À COLEÇÃO</button>
    </section>}
    <div className="w7-foot"><span>{profile.ownedCrew.length} / {CREW.length} CARTAS NO INVENTÁRIO</span><button type="button" onClick={onBattle}>IR À BATALHA</button></div>
  </div>;
}

type MarketProps={profile:LocalProfile;onBuyCrew:(id:CrewId)=>void;onCards:()=>void;onBattle:()=>void;announce:(message:string,callback:()=>void)=>void};
export function ShopMarket({profile,onBuyCrew,onCards,onBattle,announce}:MarketProps) {
  const [tab,setTab]=React.useState<'offers'|'coins'|'gems'|'special'>('offers');
  const future:Record<'coins'|'gems'|'special',{symbol:string;title:string;description:string}>={
    coins:{symbol:'●',title:'PACOTES DE MOEDAS',description:'Ainda não há compras integradas nem preços reais configurados.'},
    gems:{symbol:'◆',title:'GEMAS',description:'Não existe saldo de gemas nem compras de gemas nesta versão.'},
    special:{symbol:'♛',title:'ITENS ESPECIAIS',description:'Os artigos especiais ainda não têm inventário ou preços reais.'}
  };
  const pending=tab!=='offers'?future[tab]:null;
  return <div className="w7-screen" data-work7-screen="shop">
    <header className="w7-hero w7-shop-hero"><MastheadScene kind="shop"/><div><span className="w7-eyebrow">MERCADO DO PORTO</span><h2>LOJA</h2><p>Equipamento e tripulação</p></div>
      <div className="w7-medal w7-wallet" aria-label={profile.coins+' moedas locais'}><strong>● {profile.coins}</strong><small>MOEDAS</small></div>
    </header>
    <TabBar value={tab} onSelect={setTab} label="Loja" tabs={[['offers','OFERTAS'],['coins','MOEDAS'],['gems','GEMAS'],['special','ESPECIAIS']]}/>
    {tab==='offers'&&<section className="w7-content" role="tabpanel" aria-label="Ofertas disponíveis">
      <section className="w7-captain-pack" aria-label="Pack do Capitão em desenvolvimento, indisponível">
        <span className="w7-pack-ribbon">EM BREVE</span>
        <div className="w7-captain-pack-art" aria-hidden="true"><ShopRelic kind="special"/><span className="w7-pack-glint">✦</span></div>
        <div className="w7-captain-pack-info">
          <span className="w7-eyebrow">TESOUROS DO PORTO</span>
          <h3>PACK DO CAPITÃO</h3>
          <p>Baús e recompensas para futuras aventuras.</p>
          <strong className="w7-pack-unavailable">INDISPONÍVEL</strong>
          <small>Preço e conteúdo por definir · sem pagamentos</small>
        </div>
      </section>
      <div className="w7-chests-heading"><strong>BAÚS DO TESOURO</strong><span>PRÉ-VISUALIZAÇÃO</span></div>
      <div className="w7-chest-grid" aria-label="Baús ainda indisponíveis">
        {([['rare','BAÚ RARO'],['epic','BAÚ ÉPICO'],['legend','BAÚ LENDÁRIO']] as const).map(([rarity,title])=>
          <article className={'w7-chest w7-chest-'+rarity} key={rarity}>
            <strong>{title}</strong>
            <div className="w7-chest-art" aria-hidden="true"><PreviewChestArt tier={rarity}/></div>
            <span className="w7-chest-status">EM BREVE</span>
          </article>)}
      </div>
      <div className="w7-shop-local-note"><strong>RECRUTA A TUA TRIPULAÇÃO</strong><span>RECRUTAMENTO COM MOEDAS GANHAS NO JOGO</span></div>
      <div className="w7-line"><strong>MEMBROS DO PORTO</strong><span>{profile.ownedCrew.length} / {CREW.length} CARTAS</span></div>
      <div className="w7-shop-list">{CREW.map(c=>{
        const owned=profile.ownedCrew.includes(c.id),canBuy=!owned&&c.cost>0&&profile.coins>=c.cost;
        return <article key={c.id} className={'w7-product w7-'+c.id}>
          <span className="w7-product-art"><CardArt id={c.id}/></span>
          <div className="w7-product-info"><small>{visualTier[c.id]}</small><strong title={c.name}>{compactCrewName[c.id]}</strong><span>{c.role}</span><b>{owned?'ADQUIRIDO':c.cost+' ● MOEDAS'}</b></div>
          <button type="button" disabled={!canBuy}
            aria-label={owned?c.name+' já adquirido':canBuy?'Recrutar '+c.name+' por '+c.cost+' moedas locais':'Faltam '+Math.max(0,c.cost-profile.coins)+' moedas para recrutar '+c.name}
            onClick={()=>announce(c.name+' recrutado com moedas locais.',()=>onBuyCrew(c.id))}>{owned?'TEU':canBuy?'RECRUTAR':'SEM SALDO'}</button>
        </article>;
      })}
      </div>
      <div className="w7-shop-actions"><button type="button" onClick={onBattle} aria-label="Ganhar moedas em batalha">GANHAR MOEDAS</button><button type="button" onClick={onCards} aria-label="Gerir cartas da tripulação">VER CARTAS</button></div>
      <p className="w7-disclaimer">Pagamentos reais indisponíveis. Baús e packs são apenas pré-visualizações, sem preços nem entregas. Só o recrutamento com moedas ganhas no jogo funciona; o progresso fica guardado neste dispositivo.</p>
    </section>}
    {pending&&<section className="w7-content w7-feature w7-pending" role="tabpanel" aria-label={pending.title}>
      <span className="w7-pending-relic"><ShopRelic kind={tab==='coins'?'coins':tab==='gems'?'gems':'special'}/></span>
      <span className="w7-eyebrow">LOJA · PRÉ-VISUALIZAÇÃO NÃO COMERCIALIZÁVEL</span><h3>{pending.title}</h3>
      <p>{pending.description} Nenhuma transação simulada é permitida.</p>
      <div className="w7-pending-card"><span>PRODUTO AINDA INDISPONÍVEL</span>
        <div className="w7-pending-price"><small>PREÇO</small><strong>POR DEFINIR</strong></div>
        <b>EM BREVE</b>
      </div>
      <div className="w7-feature-row"><span aria-hidden="true">◇</span><strong>Sem pagamentos ou entregas nesta versão</strong><b>EM BREVE</b></div>
      <button type="button" onClick={()=>setTab('offers')}>VER OFERTAS LOCAIS</button>
    </section>}
    <div className="w7-foot"><span>COMPRA COM MOEDAS LOCAIS</span><span>SEM PAGAMENTOS REAIS</span></div>
  </div>;
}
