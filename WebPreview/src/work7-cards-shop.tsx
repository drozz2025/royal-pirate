import React from 'react';
import {CREW, type CrewId, type LocalProfile} from './progression';

/** WORK 7. Visual card tiers are decorative: canonical progression has no rarity mechanics. */
const visualTier:Record<CrewId,string> = {
  captain:'INICIAL', gunner:'ESPECIAL', navigator:'RARO'
};
/** Short captions preserve legibility in the approved four-column mobile grid. */
const compactCrewName:Record<CrewId,string> = {captain:'Mara',gunner:'Iron Jack',navigator:'Northwind'};

const crewRolePt:Record<CrewId,string> = {captain:'Capitã inicial · coleção local',gunner:'Artilheiro · coleção local',navigator:'Navegador · coleção local'};

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




/** Approved artwork is cropped to the illustration area only. Page text,
 * levels, balances, costs, labels and buttons are rendered from real state. */
const approvedArt={
  cards:new URL('../../assets/design-approved/05-cartas.webp',import.meta.url).href,
  shop:new URL('../../assets/design-approved/06-loja.webp',import.meta.url).href
};
const approvedConcepts=[
  {title:'BOMBARDEIO',x:18,y:198},
  {title:'VENTO FAVORÁVEL',x:109,y:198},
  {title:'REPARAÇÃO',x:199,y:198},
  {title:'TEMPESTADE',x:289,y:198},
  {title:'BORDO LATERAL',x:18,y:326},
  {title:'ESCUDO NAVAL',x:109,y:326},
  {title:'TRIPULAÇÃO ÉLITE',x:199,y:326},
  {title:'MINA EXPLOSIVA',x:289,y:326}
] as const;
function ApprovedArtCrop({kind,x,y,cropWidth,cropHeight=cropWidth}:{kind:'cards'|'shop';x:number;y:number;cropWidth:number;cropHeight?:number}) {
  const scale=100/cropWidth;
  const imageStyle:React.CSSProperties={width:(384*scale)+'%',left:(-x*scale)+'%',top:(-y*100/cropHeight)+'%'};
  return <span className="w7-approved-crop" style={{aspectRatio:cropWidth+'/'+cropHeight}} aria-hidden="true">
    <img src={approvedArt[kind]} alt="" width={384} height={512} style={imageStyle} draggable={false}/>
  </span>;
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
    <TabBar value={tab==='fusion'?'upgrade':tab} onSelect={setTab} label="Cartas" tabs={[['collection','A MINHA COLEÇÃO'],['upgrade','EVOLUIR']]}/>
    {tab==='collection'&&<section className="w7-content w7-collection-content" role="tabpanel" aria-label="A minha coleção">
      <div className="w7-collection-status">
        <strong>CARTAS: {profile.ownedCrew.length}/{CREW.length}</strong>
        <span>8 ARTES CONCEPTUAIS</span>
      </div>
      <div className="w7-approved-grid" role="group" aria-label="Oito ilustrações conceptuais aprovadas, ainda sem cartas jogáveis">
        {approvedConcepts.map((concept,slot)=><article key={concept.title} className={'w7-approved-slot w7-approved-slot-'+slot}
          aria-label={concept.title+' — ilustração conceptual aprovada, ainda não jogável'}>
          <ApprovedArtCrop kind="cards" x={concept.x} y={concept.y} cropWidth={73} cropHeight={67}/>
          <strong>{concept.title}</strong>
          <small aria-label="CONCEITO · EM BREVE" title="Ilustração conceptual, ainda não jogável">PRÉVIA</small>
        </article>)}
      </div>
      <div className={'w7-spotlight w7-spotlight-'+active.id} aria-live="polite">
        <div className="w7-spotlight-portrait"><CardArt id={active.id} featured/><span>{equipped?'EM SERVIÇO':owned?'ADQUIRIDA':'POR RECRUTAR'}</span></div>
        <div className="w7-spotlight-info">
          <span className="w7-eyebrow">TRIPULAÇÃO REAL</span>
          <h3>{active.name}</h3><p>{crewRolePt[active.id]}</p>
          <div className="w7-spotlight-tags"><span>{visualTier[active.id]}</span><span>{owned?'NO INVENTÁRIO':active.cost+' MOEDAS LOCAIS'}</span></div>
          <button type="button" disabled={equipped||(!owned&&!canRecruit)} onClick={press}
            aria-label={equipped?active.name+' já equipado':owned?'Equipar '+active.name:canRecruit?'Recrutar '+active.name+' por '+active.cost+' moedas locais':'Faltam '+Math.max(0,active.cost-profile.coins)+' moedas para '+active.name}>
            {equipped?'EQUIPADO':owned?'EQUIPAR':canRecruit?'RECRUTAR':'SEM MOEDAS'}
          </button>
        </div>
      </div>
      <details className="w7-crew-details">
        <summary>GERIR TRIPULAÇÃO REAL · {profile.ownedCrew.length}/{CREW.length}</summary>
        <div className="w7-crew-tools">
          <strong>SELECIONA UM TRIPULANTE</strong>
          <div className="w7-filter" role="group" aria-label="Filter crew collection">
            <button type="button" aria-pressed={!ownedOnly} onClick={()=>setOwnedOnly(false)}>TODAS</button>
            <button type="button" aria-pressed={ownedOnly} onClick={()=>setOwnedOnly(true)}>MINHAS</button>
          </div>
        </div>
        <div className="w7-card-grid w7-roster-grid" role="group" aria-label="Escolher carta da tripulação">
          {cards.map(c=>{
            const isOwned=profile.ownedCrew.includes(c.id),isSelected=active.id===c.id,isEquipped=profile.equippedCrew===c.id;
            return <button key={c.id} className={'w7-card w7-'+c.id+(isSelected?' is-selected':'')+(!isOwned?' is-locked':'')} type="button" aria-pressed={isSelected}
                aria-label={'Ver '+c.name+(isOwned?', adquirido':', bloqueado')} onClick={()=>setSelected(c.id)}>
              <span className="w7-card-top"><span>{visualTier[c.id]}</span><span aria-hidden="true">{isOwned?'◆':'◇'}</span></span>
              <span className="w7-card-art"><CardArt id={c.id}/></span>
              <span className="w7-card-level" title="Níveis de cartas ainda indisponíveis">NV. <span>—</span></span>
              <strong title={c.name}>{compactCrewName[c.id]}</strong>
              <small>{isEquipped?'★ EQUIPADO':isOwned?'✓ ADQUIRIDO':c.cost+' ● MOEDAS'}</small>
            </button>;
          })}
        </div>
      </details>
      <p className="w7-disclaimer">Arte conceptual da referência visual, sem níveis, custos nem efeitos jogáveis. Coleção real guardada neste dispositivo. Raridades visuais sem efeitos de jogo; personagens equipadas ainda não alteram o combate.</p>
      <button className="w7-fusion-access" type="button" onClick={()=>setTab('fusion')}>FUSÃO · EM BREVE</button>
    </section>}
    {tab==='upgrade'&&<section className="w7-content w7-feature" role="tabpanel" aria-label="Melhorar cartas">
      <span className="w7-feature-mark">✦</span><div className="w7-feature-deck" aria-hidden="true"><span className="w7-feature-art"><CardArt id={profile.equippedCrew}/></span><span className="w7-feature-spark">✦</span><span className="w7-feature-empty">?</span></div><span className="w7-eyebrow">EVOLUÇÃO DE CARTAS</span><h3>EVOLUIR</h3>
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
        <div className="w7-captain-pack-art" aria-hidden="true"><ApprovedArtCrop kind="shop" x={23} y={176} cropWidth={149} cropHeight={126}/></div>
        <div className="w7-captain-pack-info">
          <span className="w7-eyebrow">TESOUROS DO PORTO</span>
          <h3>PACK DO CAPITÃO</h3>
          <p>Baús e recompensas em preparação.</p>
          <strong className="w7-pack-unavailable">INDISPONÍVEL</strong>
          <small>Preço e conteúdo por definir · sem pagamentos</small>
        </div>
      </section>
      <div className="w7-chests-heading"><strong>BAÚS DO TESOURO</strong><span>SEM COMPRAS</span></div>
      <div className="w7-chest-grid" aria-label="Baús ainda indisponíveis">
        {([['rare','BAÚ RARO'],['epic','BAÚ ÉPICO'],['legend','BAÚ LENDÁRIO']] as const).map(([rarity,title])=>
          <article className={'w7-chest w7-chest-'+rarity} key={rarity}>
            <strong>{title}</strong>
            <div className="w7-chest-art" aria-hidden="true"><ApprovedArtCrop kind="shop" x={rarity==='rare'?35:rarity==='epic'?159:284} y={350} cropWidth={73} cropHeight={63}/></div>
            <span className="w7-chest-status">EM BREVE</span>
          </article>)}
      </div>
      <details className="w7-recruit-details"><summary>RECRUTAR TRIPULAÇÃO COM MOEDAS DO JOGO</summary>
      <div className="w7-shop-local-note"><strong>RECRUTA A TUA TRIPULAÇÃO</strong><span>RECRUTAMENTO COM MOEDAS GANHAS NO JOGO</span></div>
      <div className="w7-line"><strong>MEMBROS DO PORTO</strong><span>{profile.ownedCrew.length} / {CREW.length} CARTAS</span></div>
      <div className="w7-shop-list">{CREW.map(c=>{
        const owned=profile.ownedCrew.includes(c.id),canBuy=!owned&&c.cost>0&&profile.coins>=c.cost;
        return <article key={c.id} className={'w7-product w7-'+c.id}>
          <span className="w7-product-art"><CardArt id={c.id}/></span>
          <div className="w7-product-info"><small>{visualTier[c.id]}</small><strong title={c.name}>{compactCrewName[c.id]}</strong><span>{c.role}</span><b>{owned?'ADQUIRIDO':c.cost+' ● MOEDAS'}</b></div>
          <button type="button" disabled={!canBuy}
            aria-label={owned?c.name+' already collected':canBuy?'Recruit '+c.name+' for '+c.cost+' local coins':'Need '+Math.max(0,c.cost-profile.coins)+' more local coins to recruit '+c.name}
            onClick={()=>announce(c.name+' recrutado com moedas locais.',()=>onBuyCrew(c.id))}>{owned?'TEU':canBuy?'RECRUTAR':'SEM SALDO'}</button>
        </article>;
      })}
      </div>
      <div className="w7-shop-actions"><button type="button" onClick={onBattle} aria-label="EARN COINS IN BATTLE">GANHAR MOEDAS</button><button type="button" onClick={onCards} aria-label="MANAGE CREW">VER CARTAS</button></div>
      </details>
      <details className="w7-legal-details"><summary>INFORMAÇÃO SOBRE A LOJA E PAGAMENTOS</summary><p className="w7-disclaimer">Os packs e baús são apenas uma pré-visualização: não têm preços, compras nem entregas disponíveis. Apenas o recrutamento com moedas ganhas no jogo funciona. O progresso fica guardado neste dispositivo. <span lang="en">No real-money checkout is available; secure payments are not integrated. Progress is saved on this device only.</span></p></details>
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
    <div className="w7-foot"><span>RECRUTAMENTO COM MOEDAS DO JOGO</span><span>SEM PAGAMENTOS REAIS</span></div>
  </div>;
}
