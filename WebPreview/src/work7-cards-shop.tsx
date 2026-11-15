import React from 'react';
import {CREW, type CrewId, type LocalProfile} from './progression';
import {CrewDeck} from './crew-deck';
import './work7-cards-shop.css';

/** Work 7: UI only. Every purchase delegates to the existing canonical progression action. */
export function CardsCollection({profile,onBuyCrew,onEquipCrew,onBattle,announce}:{
 profile:LocalProfile;onBuyCrew:(id:CrewId)=>void;onEquipCrew:(id:CrewId)=>void;
 onBattle:()=>void;announce:(message:string,callback:()=>void)=>void;
}) {
 const [tab,setTab]=React.useState<'collection'|'upgrade'|'fusion'>('collection');
 const [onlyOwned,setOnlyOwned]=React.useState(false);
 return <div className="work7-screen">
  <div className="work7-heading"><span>CARTAS · COLEÇÃO LOCAL</span><h2>As cartas da tua frota</h2><p>{profile.ownedCrew.length} de {CREW.length} tripulantes colecionados</p></div>
  <div className="work7-tabs" role="tablist" aria-label="Cartas">
   {([['collection','A MINHA COLEÇÃO'],['upgrade','MELHORAR'],['fusion','FUSÃO']] as const).map(([id,label])=>
    <button key={id} type="button" role="tab" aria-selected={tab===id} onClick={()=>setTab(id)}>{label}</button>)}
  </div>
  {tab==='collection'&&<div role="tabpanel" className="work7-panel">
    <div className="work7-filter"><span>CARTAS DISPONÍVEIS</span><button type="button" aria-pressed={onlyOwned} onClick={()=>setOnlyOwned(v=>!v)}>{onlyOwned?'VER TODAS':'SÓ MINHAS'}</button></div>
    <CrewDeck profile={profile} onlyOwned={onlyOwned} onBuyCrew={onBuyCrew} onEquipCrew={onEquipCrew} onBattle={onBattle} announce={announce}/>
   </div>}
  {tab==='upgrade'&&<section role="tabpanel" className="work7-panel work7-unavailable">
    <span className="work7-large-icon" aria-hidden="true">✦</span><h3>MELHORIAS DE CARTAS</h3>
    <p>Os níveis e custos de melhoria de tripulantes ainda não estão definidos no jogo. Não serão descontadas moedas por melhorias inexistentes.</p>
    <div className="work7-ledger">Moedas disponíveis <strong>{profile.coins} ●</strong></div>
    <button type="button" onClick={()=>setTab('collection')}>VER A COLEÇÃO</button>
   </section>}
  {tab==='fusion'&&<section role="tabpanel" className="work7-panel work7-unavailable">
    <span className="work7-large-icon" aria-hidden="true">◆</span><h3>FUSÃO DE CARTAS</h3>
    <p>A fusão requer receitas, cartas duplicadas e resultados persistentes que ainda não existem. Nenhuma carta será consumida nesta demonstração.</p>
    <div className="work7-ledger">Cartas únicas <strong>{profile.ownedCrew.length} / {CREW.length}</strong></div>
    <button type="button" onClick={()=>setTab('collection')}>VER A COLEÇÃO</button>
   </section>}
 </div>;
}

export function ShopMarket({profile,onBuyCrew,onCards,onBattle,announce}:{
 profile:LocalProfile;onBuyCrew:(id:CrewId)=>void;onCards:()=>void;onBattle:()=>void;
 announce:(message:string,callback:()=>void)=>void;
}) {
 const [tab,setTab]=React.useState<'offers'|'coins'|'gems'|'special'>('offers');
 return <div className="work7-screen">
  <div className="work7-heading"><span>LOJA · MERCADO DO PORTO</span><h2>Tesouros do Capitão</h2><p>Compras com moedas conquistadas em jogo</p></div>
  <div className="work7-ledger">SALDO LOCAL <strong>{profile.coins} ●</strong></div>
  <div className="work7-tabs work7-tabs-four" role="tablist" aria-label="Loja">
   {([['offers','OFERTAS'],['coins','MOEDAS'],['gems','GEMAS'],['special','ESPECIAIS']] as const).map(([id,label])=>
    <button key={id} type="button" role="tab" aria-selected={tab===id} onClick={()=>setTab(id)}>{label}</button>)}
  </div>
  {tab==='offers'&&<section role="tabpanel" className="work7-panel">
   <h3 className="work7-subheading">RECRUTAR TRIPULANTES</h3>
   <div className="work7-products">{CREW.map(c=>{
     const owned=profile.ownedCrew.includes(c.id),canBuy=!owned&&c.cost>0&&profile.coins>=c.cost;
     return <article key={c.id} className="work7-product">
      <div className="work7-product-art" aria-hidden="true">{c.symbol}</div>
      <div className="work7-product-text"><strong>{c.name}</strong><span>{c.role}</span><b>{owned?'ADQUIRIDO':c.cost+' ●'}</b></div>
      <button type="button" disabled={!canBuy} onClick={()=>announce(c.name+' recrutado com moedas locais.',()=>onBuyCrew(c.id))}>{owned?'TEU':canBuy?'COMPRAR':'SEM SALDO'}</button>
     </article>;
   })}</div>
   <div className="work7-actions"><button type="button" onClick={onBattle}>GANHAR MOEDAS</button><button type="button" onClick={onCards}>VER CARTAS</button></div>
   <p className="work7-note">Os tripulantes não atribuem vantagens de combate nesta versão. Os gastos são guardados no progresso local.</p>
  </section>}
  {tab!=='offers'&&<section role="tabpanel" className="work7-panel work7-unavailable">
   <span className="work7-large-icon" aria-hidden="true">{tab==='gems'?'◇':tab==='coins'?'●':'♛'}</span>
   <h3>{tab==='coins'?'PACOTES DE MOEDAS':tab==='gems'?'GEMAS':'ITENS ESPECIAIS'}</h3>
   <p>{tab==='special'?'Ainda não existem itens especiais com preços e inventário reais.':'Compras integradas e pagamentos com dinheiro real não estão disponíveis nesta versão.'} Não existem transações simuladas.</p>
   <button type="button" onClick={()=>setTab('offers')}>VER OFERTAS DISPONÍVEIS</button>
  </section>}
 </div>;
}
