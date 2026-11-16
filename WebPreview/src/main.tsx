import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Battle } from './battle';
import { OceanScene, type Metrics } from './scene';
import { Harbour } from './harbour';
import { AppScreens, type AppScreenId } from './app-screens';
import { STORAGE_KEY, parseProfile, finishBattle, claimDaily, claimMission, buyCrew, equipCrew, improve, exportProfileBackup, importProfileBackup, type CrewId, type MissionId, type UpgradeId } from './progression';
import './harbour.css';
import './style.css';
import './app-screens.css';
import './battle-approved.css';
const Icon=({name,size=22}:{name:string;size?:number})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{name==='anchor'?<><circle cx="12" cy="5" r="2.5"/><path d="M12 8v13M6 11h12M4 15c0 8 16 8 16 0M2 17l2-3 3 2m10 0 3-2 2 3"/></>:name==='restart'?<><path d="M3 10a9 9 0 1 1 1 8M3 4v6h6"/></>:name==='aim'?<><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 1v4m0 14v4M1 12h4m14 0h4"/></>:name==='music'?<><path d="M10 18V5l11-2v12"/><circle cx="7" cy="18" r="3"/><circle cx="18" cy="15" r="3"/></>:name==='sound'?<><path d="M4 9h4l5-4v14l-5-4H4zM17 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></>:name==='mute'?<><path d="M4 9h4l5-4v14l-5-4H4zM17 9l5 6m0-6-5 6"/></>:name==='chart'?<><path d="M4 4v16h16M8 15v-4m5 4V6m5 9v-7"/></>:name==='camera'?<><path d="M4 7h4l2-3h4l2 3h4v13H4z"/><circle cx="12" cy="13" r="4"/></>:name==='close'?<path d="m6 6 12 12M6 18 18 6"/>:name==='flag'?<><path d="M5 22V3m0 1c6-4 8 4 15 0v11c-7 4-9-4-15 0"/></>:name==='fire'?<><path d="M13 2c2 7-5 7-3 12 2 0 3-2 3-4 7 5 5 12-1 12S1 15 6 9c-1 4 1 5 2 4-1-5 4-6 5-11Z"/></>:name==='wind'?<><path d="M3 8h12c5 0 4-6 1-5M3 12h16c5 0 4 7 0 5M5 16h6c4 0 4 6 0 5"/></>:<><path d="m8 5 8 7-8 7"/></>}</svg>;
const source='https://github.com/drozz2025/royal-pirate';
function App(){
 const host=useRef<HTMLDivElement>(null),engine=useRef(new Battle()),view=useRef<OceanScene|null>(null);
 const [state,setState]=useState({phase:'ready',player:100,enemy:100,round:1,message:'Aim your broadside',shots:0,hits:0});
 const [appScreen,setAppScreen]=useState<AppScreenId|null>(null);
 const backupFile=useRef<HTMLInputElement>(null);
 const [backupMessage,setBackupMessage]=useState('');
 const [profile,setProfile]=useState(()=>{try{return parseProfile(window.localStorage.getItem(STORAGE_KEY));}catch{return parseProfile(null);}});
 const recordedResult=useRef(false);
 const [harbour,setHarbour]=useState(true),[shipSelected,setShipSelected]=useState(false),[yaw,setYaw]=useState(0),[power,setPower]=useState(65),[progress,setProgress]=useState(false),[music,setMusic]=useState(false),[sound,setSound]=useState(false),[deck,setDeck]=useState(false),[error,setError]=useState(''),[loaded,setLoaded]=useState(false),[metrics,setMetrics]=useState<Metrics|null>(null),[diagnostics,setDiagnostics]=useState(false),[compatibility,setCompatibility]=useState(false);
 useEffect(()=>{let last='';try{const scene=new OceanScene(host.current!,engine.current,()=>{const b=engine.current;const key=[b.phase,b.health.player,b.health.enemy,b.round,b.lastMessage,b.shotsFired].join(':');if(key!==last){last=key;setState({phase:b.phase,player:b.health.player,enemy:b.health.enemy,round:b.round,message:b.lastMessage,shots:b.shotsFired,hits:b.hits});}},setMetrics,setError,setShipSelected);view.current=scene;setCompatibility(scene.compatibility);scene.showHarbour();setLoaded(true);return()=>scene.dispose();}catch(e){setError(`This browser could not start WebGL. ${e instanceof Error?e.message:'Please reload or try Safari/Chrome.'}`);}},[]);
 useEffect(()=>{try{window.localStorage.setItem(STORAGE_KEY,JSON.stringify(profile));}catch{/* Private browsing may disable storage. */}},[profile]);
 useEffect(()=>{if((state.phase==='victory'||state.phase==='defeat')&&!recordedResult.current){recordedResult.current=true;setProfile(p=>finishBattle(p,state.phase==='victory'?'victory':'defeat',state.hits,state.shots));}},[state.phase,state.hits,state.shots]);
 useEffect(()=>{if(view.current)view.current.paused=progress||Boolean(appScreen);},[progress,appScreen]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){setProgress(false);setAppScreen(null);}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[]);
 const aim=(y:number,p:number)=>{engine.current.aim(y,p);setYaw(engine.current.yaw);setPower(engine.current.power);};
 const reset=()=>{recordedResult.current=false;view.current?.reset();setYaw(0);setPower(65);setDeck(false);};
 const enterBattle=()=>{reset();view.current?.showBattle();setShipSelected(false);setHarbour(false);setAppScreen(null);};
 const returnHarbour=()=>{reset();view.current?.showHarbour();setShipSelected(false);setHarbour(true);setAppScreen(null);};
 const navigateTo=(next:AppScreenId)=>{setShipSelected(false);setAppScreen(next);};
 const exportBackup=()=>{
   try {
     const json=exportProfileBackup(profile);
     const url=URL.createObjectURL(new Blob([json],{type:'application/json'}));
     const link=document.createElement('a');
     link.href=url;link.download='royal-pirate-save-'+new Date().toISOString().slice(0,10)+'.json';
     document.body.appendChild(link);link.click();link.remove();
     window.setTimeout(()=>URL.revokeObjectURL(url),1200);
     setBackupMessage('Save file created. Keep it safe; progress is not cloud synced.');
   }catch{setBackupMessage('Could not download your save file in this browser.');}
 };
 const restoreBackup=async(event:React.ChangeEvent<HTMLInputElement>)=>{
   const file=event.currentTarget.files?.[0];event.currentTarget.value='';
   if(!file)return;
   if(file.size>65_536){setBackupMessage('Only save JSON files smaller than 64 KB are accepted.');return;}
   try{
     const next=importProfileBackup(await file.text());
     if(!window.confirm('Replace this device\'s current progress with the backup? This cannot be undone without another backup.')){
       setBackupMessage('Restore cancelled. Current progress was not changed.');return;
     }
     setProfile(next);setBackupMessage('Save restored on this device. No cloud synchronization.');
   }catch(err){setBackupMessage(err instanceof Error?err.message:'Restore failed.');}
 };
 const result=state.phase==='victory'||state.phase==='defeat',ready=state.phase==='ready'&&loaded&&!error;
 return <main className={'app '+(harbour?'in-harbour':'in-battle')}>
   <div ref={host} className="ocean"/><div className="vignette"/>
   {harbour&&<Harbour onBattle={enterBattle} onNavigate={navigateTo} profile={profile} selected={shipSelected} hidden={Boolean(appScreen)}/>}
   <input ref={backupFile} type="file" hidden accept=".json,application/json" aria-label="Choose a local Royal Pirate save backup" onChange={restoreBackup}/>
   {harbour&&appScreen&&<AppScreens screen={appScreen} profile={profile} onNavigate={navigateTo} onClose={()=>setAppScreen(null)} onBattle={enterBattle}
      onBuyCrew={(id:CrewId)=>setProfile(p=>buyCrew(p,id))} onEquipCrew={(id:CrewId)=>setProfile(p=>equipCrew(p,id))}
      onUpgrade={(id:UpgradeId)=>setProfile(p=>improve(p,id))} onMission={(id:MissionId)=>setProfile(p=>claimMission(p,id))}
      onDaily={()=>setProfile(p=>claimDaily(p,Date.now()))} onSetPlayerName={name=>setProfile(p=>({...p,playerName:name.trim().slice(0,20)||'Jogador'}))} onExportBackup={exportBackup} onImportBackup={()=>backupFile.current?.click()} backupMessage={backupMessage}/>}
   {!harbour&&<button className="return-harbour" type="button" aria-label="Return to harbour" onClick={returnHarbour}>‹ PORTO</button>}
   {!harbour&&<section className="battle-approved-top" aria-label="Informações da batalha">
     <div className="battle-approved-logo" aria-hidden="true">ROYAL <b>PIRATE</b></div>
     <div className="battle-approved-currencies" role="group" aria-label="Recursos do capitão">
       <span className="battle-approved-gold" aria-label={profile.coins+' moedas de ouro locais'}><i aria-hidden="true">●</i>{new Intl.NumberFormat('pt-PT').format(profile.coins)} <small>OURO</small></span>
       <span className="battle-approved-gems" aria-label="Diamantes indisponíveis nesta versão"><i aria-hidden="true">◆</i>— <small>GEMAS INDISPONÍVEIS</small></span>
     </div>
     <h1 className="battle-approved-banner"><Icon name="anchor" size={22}/> BATALHA <Icon name="anchor" size={22}/></h1>
   </section>}
   <header className="topbar"><a className="brand" href="#" aria-label="Royal Pirate"><span className="brand-emblem"><Icon name="anchor" size={28}/></span><span>ROYAL <b>PIRATE</b><small>THE FIRST BROADSIDE</small></span></a><span className="preview-pill"><i/> {compatibility?'3D COMPATIBILITY MODE':'LIVE 3D PREVIEW'}</span><button className="progress-button" aria-label="Development Progress" onClick={()=>setProgress(true)}><Icon name="chart" size={19}/><span>Development Progress</span></button></header>
   <section className="battle-hud" aria-label="Battle health"><Health name={profile.playerName||"ROYAL PIRATE"} label="CAPITÃO" value={state.player}/><div className="round"><strong className="battle-versus">VS</strong><span>RONDA {state.round.toString().padStart(2,"0")}</span></div><Health name="CAPITÃO NERO" label="INIMIGO" value={state.enemy} enemy/></section>
   <div className="scene-caption"><span className="eyebrow">THE SHATTERED ISLES</span><h1>Fortune favours<br/>the bold.</h1><p>Two captains. One open sea.</p><span className="chapter">01 <span/> FIRST ENCOUNTER</span></div>
   <aside className="view-controls" aria-label="View controls"><button aria-label="Reset camera" title="Reset camera" onClick={()=>{view.current?.home();setDeck(false);}}><Icon name="aim"/></button><button aria-label="Toggle deck camera" aria-pressed={deck} title="Deck camera" className={deck?'active':''} onClick={()=>{if(deck)view.current?.home();else view.current?.deck();setDeck(!deck);}}><Icon name="camera"/></button><button aria-label={music?'Disable pirate music':'Enable pirate music'} aria-pressed={music} title="Pirate music" className={music?'active':''} onClick={()=>{const scene=view.current;if(scene)void scene.toggleMusic().then(setMusic);}}><Icon name="music"/></button><button aria-label={sound?'Disable cannon and impact effects':'Enable cannon and impact effects'} aria-pressed={sound} title="Sound effects" className={sound?'active':''} onClick={()=>{const scene=view.current;if(scene)void scene.toggleEffects().then(setSound);}}><Icon name={sound?'sound':'mute'}/></button><button aria-label="Restart battle" title="Restart battle" onClick={reset}><Icon name="restart"/></button></aside>
   <div className="scene-hint"><span className="drag-icon">↔</span> DESLIZAR PARA EXPLORAR <span>·</span> AMPLIAR COM DOIS DEDOS</div>
   {!loaded&&!error&&<div className="loading"><Icon name="anchor" size={38}/><p>Setting sail…</p></div>}
   {error&&<div className="error-panel" role="alert"><h2>The ocean needs a reload</h2><p>{error}</p><button onClick={()=>location.reload()}>Reload preview</button></div>}
   {!result&&<section className="command-deck" aria-label="Battle controls"><div className="turn-line"><span className={'turn-dot '+(ready?'':'enemy-dot')}/><strong>{error?'3D UNAVAILABLE':!loaded?'SETTING SAIL':ready?'TUA VEZ':state.phase==='enemy-aim'?'INIMIGO A APONTAR':state.phase==='enemy-flight'?'DEFENDE-TE':'DISPARO EM VOO'}</strong><span className="message" aria-live="polite">{state.message}</span><span className="wind"><Icon name="wind" size={16}/> CALM SEAS</span></div>
   <div className="controls-body"><div className="sliders"><label htmlFor="bearing"><span><Icon name="aim" size={16}/> ÂNGULO <b>{yaw>0?'+':''}{yaw}°</b></span><input id="bearing" aria-label="Bearing" type="range" min="-25" max="25" step="1" value={yaw} disabled={!ready} onChange={e=>aim(+e.target.value,power)}/><div className="scale"><span>BOMBORDO</span><span>ESTIBORDO</span></div></label><label htmlFor="power"><span><Icon name="fire" size={16}/> POTÊNCIA <b>{power}%</b></span><input id="power" aria-label="Power" type="range" min="20" max="100" step="1" value={power} disabled={!ready} onChange={e=>aim(yaw,+e.target.value)}/><div className="scale"><span>CURTO</span><span>LONGO</span></div></label></div><button className="fire-button" disabled={!ready} onClick={()=>engine.current.fire()}><Icon name="fire" size={29}/><span>{ready?'DISPARAR!':'AGUARDA'}</span><small>CANHÃO NAVAL</small></button></div><div className="deck-footer"><span>Adjust your aim. Watch the arc. Make it count.</span><span className="ammo">● ● ● <b>UNLIMITED</b></span></div></section>}
   {result&&<section className="result" role="dialog" aria-modal="true" aria-label="Battle result"><div className="result-badge"><Icon name={state.phase==='victory'?'flag':'anchor'} size={40}/></div><span className="eyebrow">THE FIRST BROADSIDE</span><h2>{state.phase==='victory'?'Seas of glory.':'A captain rises again.'}</h2><p>{state.phase==='victory'?'The Crimson Tide has fallen. These waters are yours.':'Your ship has fallen. A new broadside awaits.'}</p><div className="result-stats"><span><strong>{state.round}</strong>ROUNDS</span><span><strong>{state.hits}/{state.shots}</strong>SHOTS LANDED</span></div><p className="result-loot">{state.phase==='victory'?'+35 LOCAL COINS · +50 XP':'+10 XP · NO COINS'} · saved on this device</p><button onClick={reset}><Icon name="restart" size={20}/> SAIL AGAIN</button><button className="return-port-button" onClick={returnHarbour}>⚓ RETURN TO PORT</button></section>}
   <footer className="bottom-note"><span>{compatibility?'CANVAS 3D · WEBGL UNAVAILABLE':'WEB DEMONSTRATION'} <span>·</span> ART IN DEVELOPMENT</span><button onClick={()=>setDiagnostics(!diagnostics)}>{metrics?.fps??'—'} FPS <span>⌁</span></button></footer>
   {diagnostics&&<aside className="diagnostics"><strong>Browser diagnostics · {compatibility?'Canvas 3D (CPU)':'WebGL2'}</strong><p>{metrics?.renderMs} ms render · {metrics?.calls} draw calls · {metrics?.triangles.toLocaleString()} triangles</p><p>{metrics?.geometries} geometries · {metrics?.textures} textures · {metrics?.effects} active effects</p><p>{metrics?.heapMB?`${metrics.heapMB} MB JS heap (Chromium estimate)`:'JS heap measurement unavailable'}</p><small>Live browser measurements. Not an iPhone or Unity benchmark.</small></aside>}
   {progress&&<Progress close={()=>setProgress(false)}/>}
 </main>;
}
function Health({name,label,value,enemy=false}:{name:string;label:string;value:number;enemy?:boolean}){return <div className={'health-card '+(enemy?'enemy':'')}><div className="health-crest"><Icon name={enemy?'flag':'anchor'} size={24}/></div><div className="health-detail"><div className="ship-label">{label}<strong>{value}<span>/100</span></strong></div><h2>{name}</h2><div className="health-track" role="progressbar" aria-label={`${name} health`} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}><span style={{width:`${value}%`}}/></div></div></div>}
const modules=[
 ['Modelação 3D','Demonstração web','Dois navios procedurais: casco curvo, tábuas, mastros, velas, cabos, canhões e tripulação. Arte provisória. GLB original auditado, não apresentado como arte final.','ASSET_MANIFEST.md'],
 ['Construção naval','Implementado, não validado','Estaleiro e progressão existem no Work 4 e na integração Work 0. Sem execução nativa Unity. Construção não incluída nesta batalha web.','Documentation/Work4/README.md'],
 ['Combate','Demonstração web','Pontaria, potência, turnos, dano, vitória, derrota e reinício usam a simulação web. O combate C# está integrado, sem validação Unity.','Documentation/Combat/README.md'],
 ['Física e projéteis','Demonstração web','Balística com gravidade e colisão contínua segmento/caixa. A pré-visualização da trajetória usa a mesma equação dos disparos.','WebPreview/src/battle.ts'],
 ['Efeitos visuais','Demonstração web','Ondas, reflexos estilizados, clarão, fumo, estilhaços, salpicos e dano visível. Efeitos reutilizados num limite de 160 partículas.','WebPreview/src/scene.ts'],
 ['Interface','Demonstração web','Controlos táteis, barras de vida, duas câmaras, órbita, zoom, música original, sons distintos e reinício. Não exige conta de jogo.','WebPreview/src/main.tsx'],
 ['Inteligência artificial','Demonstração web','Adversário calcula a velocidade balística e aplica erro de pontaria/potência. Os impactos dependem da colisão; sem resultados pré-definidos.','WebPreview/src/battle.ts'],
 ['Testes Unity','Pendente','Work 0 regista 150 verificações C# independentes aprovadas. Importação, compilação e testes no Unity continuam por executar.','Documentation/Reports/Work0/DELIVERY.md'],
 ['Preparação iOS/Android','Implementado, não validado','Configuração Unity e ferramentas de validação presentes. Não há builds ou testes em dispositivos físicos nesta entrega.','Documentation/Reports/Work0/DELIVERY.md']
];
function Progress({close}:{close:()=>void}){const closeRef=useRef<HTMLButtonElement>(null);useEffect(()=>{closeRef.current?.focus();},[]);return <div className="modal-backdrop" onClick={e=>{if(e.target===e.currentTarget)close();}}><section className="progress-modal" role="dialog" aria-modal="true" aria-labelledby="progress-title" onKeyDown={e=>{if(e.key==='Tab'){const items=e.currentTarget.querySelectorAll<HTMLElement>('button,a[href]');const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}}><header><div><span className="eyebrow">ROYAL PIRATE · WORK 6</span><h2 id="progress-title">Development Progress</h2></div><button ref={closeRef} aria-label="Close progress" onClick={close}><Icon name="close"/></button></header><div className="progress-intro"><span className="audit-dot"/> ESTADO AUDITADO · 14 NOV 2026<p>Esta batalha é uma demonstração web independente. O jogo definitivo continua em Unity. Os estados abaixo não representam percentagens de conclusão.</p><a href={`${source}/pull/12`} target="_blank" rel="noreferrer">Integração Work 0 · 0620645 ↗</a></div><div className="status-legend"><span>Implementado e testado = evidência de execução</span><span>Implementado, não validado = código sem validação suficiente</span><span>Demonstração web = funcionalidade do navegador</span><span>Pendente = execução ou implementação em falta</span></div><div className="module-list">{modules.map(([name,status,description,path],i)=><article key={name}><span className="module-number">{String(i+1).padStart(2,'0')}</span><div><h3>{name}</h3><span className={'status '+(status==='Demonstração web'?'web':status==='Pendente'?'pending':'unverified')}>{status}</span><p>{description}</p><a href={`${source}/blob/${path.startsWith('WebPreview')?'work6/web-3d-preview':'work0/first-battle-integration-20261114'}/${path}`} target="_blank" rel="noreferrer">Consultar fonte ↗</a></div></article>)}</div><div className="verification"><h3>Verificação desta demonstração</h3><p>20 testes automáticos passaram, incluindo 200 partidas simuladas. No Chromium, o modo Canvas 3D foi jogado até vitória e derrota; pontaria, potência, resposta inimiga e reinício foram verificados. WebGL2 está indisponível no navegador deste ambiente. Safari, iPhone físico, Unity e builds mobile não foram executados neste ambiente.</p><a href={`${source}/blob/work6/web-3d-preview/WebPreview/TEST_REPORT.md`} target="_blank" rel="noreferrer">Evidências e reprodução dos testes ↗</a></div><footer>0 € DE DESPESAS · SEM COMPRAS · SEM ANÚNCIOS · SEM PAGAMENTOS</footer></section></div>}
createRoot(document.getElementById('root')!).render(<App/>);

/* Installable web preview foundation; scope follows the deployed manifest URL. */
if(typeof window!=='undefined'&&'serviceWorker' in navigator&&window.isSecureContext){
 const manifest=document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
 if(manifest){
   const scope=new URL('.',manifest.href);
   window.addEventListener('load',()=>{
     navigator.serviceWorker.register(new URL('sw.js',scope).href,{scope:scope.href}).catch(()=>{
       // Private browsing and restricted browsers can disallow service workers.
     });
   },{once:true});
 }
}
