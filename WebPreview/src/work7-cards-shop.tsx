import React from 'react';
import {CREW, type CrewId, type LocalProfile} from './progression';

/** WORK 7. Visual card tiers are decorative: canonical progression has no rarity mechanics. */
const visualTier:Record<CrewId,string> = {
  captain:'INICIAL', gunner:'ESPECIAL · VISUAL', navigator:'RARO · VISUAL'
};

function CardArt({id}:{id:CrewId}) {
  return <svg className="w7-art-svg" viewBox="0 0 180 160" role="img" aria-label={id==='captain'?'Retrato ilustrado de capitã pirata':id==='gunner'?'Ilustração de canhão de bronze':'Rosa dos ventos ilustrada'}>
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
    <header className="w7-hero"><div><span className="w7-eyebrow">ROYAL PIRATE · COLEÇÃO</span><h2>CARTAS</h2><p>Tripulação do teu navio</p></div>
      <div className="w7-medal" aria-label={profile.ownedCrew.length+' de '+CREW.length+' cartas adquiridas'}><strong>{profile.ownedCrew.length}/{CREW.length}</strong><small>CARTAS</small></div>
    </header>
    <TabBar value={tab} onSelect={setTab} label="Cartas" tabs={[['collection','A MINHA COLEÇÃO'],['upgrade','MELHORAR'],['fusion','FUSÃO']]}/>
    {tab==='collection'&&<section className="w7-content" role="tabpanel" aria-label="A minha coleção">
      <div className="w7-line"><strong>AS TUAS CARTAS</strong><div className="w7-filter" role="group" aria-label="Filter crew collection">
        <button type="button" aria-pressed={!ownedOnly} onClick={()=>setOwnedOnly(false)}>TODAS</button>
        <button type="button" aria-pressed={ownedOnly} onClick={()=>setOwnedOnly(true)}>MINHAS</button>
      </div></div>
      <div className="w7-card-grid" role="group" aria-label="Escolher carta da tripulação">
        {cards.map(c=>{
          const isOwned=profile.ownedCrew.includes(c.id),isSelected=active.id===c.id,isEquipped=profile.equippedCrew===c.id;
          return <button key={c.id} className={'w7-card w7-'+c.id+(isSelected?' is-selected':'')+(!isOwned?' is-locked':'')} type="button" aria-pressed={isSelected}
              aria-label={'Ver '+c.name+(isOwned?', adquirido':', bloqueado')} onClick={()=>setSelected(c.id)}>
            <span className="w7-card-top"><span>{visualTier[c.id]}</span><span aria-hidden="true">{isOwned?'◆':'◇'}</span></span>
            <span className="w7-card-art"><CardArt id={c.id}/></span>
            <strong>{c.name}</strong><small>{isEquipped?'★ EQUIPADO':isOwned?'✓ ADQUIRIDO':c.cost+' ● MOEDAS'}</small>
          </button>;
        })}
      </div>
      <div className="w7-detail">
        <div><span className="w7-eyebrow">CARTA SELECIONADA</span><h3>{active.name}</h3><p>{active.role}</p></div>
        <button type="button" disabled={equipped||(!owned&&!canRecruit)} onClick={press}
          aria-label={equipped?active.name+' já equipado':owned?'Equipar '+active.name:canRecruit?'Recrutar '+active.name+' por '+active.cost+' moedas locais':'Faltam '+Math.max(0,active.cost-profile.coins)+' moedas para '+active.name}>
          {equipped?'EQUIPADO':owned?'EQUIPAR':canRecruit?'RECRUTAR':'SEM MOEDAS'}
        </button>
      </div>
      <p className="w7-disclaimer">Coleção saved on this device. Raridades visuais sem efeitos de jogo; personagens equipadas ainda não alteram o combate.</p>
    </section>}
    {tab==='upgrade'&&<section className="w7-content w7-feature" role="tabpanel" aria-label="Melhorar cartas">
      <span className="w7-feature-mark">✦</span><span className="w7-eyebrow">EVOLUÇÃO DE CARTAS</span><h3>MELHORAR</h3>
      <p>A evolução de cartas ainda não tem níveis ou custos reais definidos. Nenhuma moeda será consumida.</p>
      <div className="w7-feature-row"><span>◆</span><strong>Melhorias em desenvolvimento</strong><b>EM BREVE</b></div>
      <button type="button" onClick={()=>setTab('collection')}>VOLTAR À COLEÇÃO</button>
    </section>}
    {tab==='fusion'&&<section className="w7-content w7-feature" role="tabpanel" aria-label="Fusão de cartas">
      <span className="w7-feature-mark">◇ + ◇</span><span className="w7-eyebrow">OFICINA DE CARTAS</span><h3>FUSÃO</h3>
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
  const future:{[key:string]:{symbol:string;title:string;description:string}}={
    coins:{symbol:'●',title:'PACOTES DE MOEDAS',description:'Ainda não há compras integradas nem preços reais configurados.'},
    gems:{symbol:'◆',title:'GEMAS',description:'Não existe saldo de gemas nem compras de gemas nesta versão.'},
    special:{symbol:'♛',title:'ITENS ESPECIAIS',description:'Os artigos especiais ainda não têm inventário ou preços reais.'}
  };
  const pending=tab!=='offers'?future[tab]:null;
  return <div className="w7-screen" data-work7-screen="shop">
    <header className="w7-hero w7-shop-hero"><div><span className="w7-eyebrow">MERCADO DO PORTO</span><h2>LOJA</h2><p>Equipamento e tripulação</p></div>
      <div className="w7-medal w7-wallet" aria-label={profile.coins+' moedas locais'}><strong>● {profile.coins}</strong><small>MOEDAS</small></div>
    </header>
    <TabBar value={tab} onSelect={setTab} label="Loja" tabs={[['offers','OFERTAS'],['coins','MOEDAS'],['gems','GEMAS'],['special','ESPECIAIS']]}/>
    {tab==='offers'&&<section className="w7-content" role="tabpanel" aria-label="Ofertas disponíveis">
      <div className="w7-banner"><span aria-hidden="true">♛</span><div><small>OFERTAS LOCAIS</small><strong>RECRUTA A TUA TRIPULAÇÃO</strong><p>Moedas ganhas em batalhas. Sem dinheiro real.</p></div></div>
      <div className="w7-line"><strong>DISPONÍVEL NO JOGO</strong><span>{profile.ownedCrew.length} / {CREW.length} CARTAS</span></div>
      <div className="w7-shop-list">{CREW.map(c=>{
        const owned=profile.ownedCrew.includes(c.id),canBuy=!owned&&c.cost>0&&profile.coins>=c.cost;
        return <article key={c.id} className={'w7-product w7-'+c.id}>
          <span className="w7-product-art"><CardArt id={c.id}/></span>
          <div className="w7-product-info"><small>{visualTier[c.id]}</small><strong>{c.name}</strong><span>{c.role}</span><b>{owned?'ADQUIRIDO':c.cost+' ● MOEDAS'}</b></div>
          <button type="button" disabled={!canBuy}
            aria-label={owned?c.name+' already collected':canBuy?'Recruit '+c.name+' for '+c.cost+' local coins':'Need '+Math.max(0,c.cost-profile.coins)+' more local coins to recruit '+c.name}
            onClick={()=>announce(c.name+' recrutado com moedas locais.',()=>onBuyCrew(c.id))}>{owned?'TEU':canBuy?'RECRUTAR':'SEM SALDO'}</button>
        </article>;
      })}</div>
      <div className="w7-shop-actions"><button type="button" onClick={onBattle} aria-label="EARN COINS IN BATTLE">GANHAR MOEDAS</button><button type="button" onClick={onCards} aria-label="MANAGE CREW">VER CARTAS</button></div>
      <p className="w7-disclaimer">No real-money checkout is available; secure payments não estão integrados. O progresso é saved on this device.</p>
    </section>}
    {pending&&<section className="w7-content w7-feature w7-pending" role="tabpanel" aria-label={pending.title}>
      <span className="w7-feature-mark">{pending.symbol}</span><span className="w7-eyebrow">LOJA · PRÉ-VISUALIZAÇÃO NÃO COMERCIALIZÁVEL</span><h3>{pending.title}</h3>
      <p>{pending.description} Nenhuma transação simulada é permitida.</p>
      <div className="w7-feature-row"><span aria-hidden="true">◇</span><strong>Conteúdo em preparação</strong><b>EM BREVE</b></div>
      <button type="button" onClick={()=>setTab('offers')}>VER OFERTAS LOCAIS</button>
    </section>}
    <div className="w7-foot"><span>COMPRA COM MOEDAS LOCAIS</span><span>SEM PAGAMENTOS REAIS</span></div>
  </div>;
}
