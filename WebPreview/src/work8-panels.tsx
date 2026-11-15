import React from 'react';
import { PirateIcon } from './app-icons';
import { MISSIONS, battlesPlayed, canClaimDaily, nextDailyStreak, levelFor, missionProgress, type LocalProfile, type MissionId } from './progression';


/* Original vector artwork for the mobile mosaic. Decorative only; player values remain local. */
type W8ArtKind='chest'|'scroll'|'cannon'|'helm'|'trophy'|'medal'|'flag';
function W8Art({kind}:{kind:W8ArtKind}){
  return <svg className={'w8-art w8-art-'+kind} width="92" height="92" viewBox="0 0 112 112" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <linearGradient id="w8-gold-metal" x1="16" y1="0" x2="90" y2="112" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FFF6B6"/><stop offset=".27" stopColor="#FFD66A"/><stop offset=".62" stopColor="#D68C27"/><stop offset="1" stopColor="#82431C"/>
      </linearGradient>
      <linearGradient id="w8-wood" x1="10" y1="10" x2="90" y2="110" gradientUnits="userSpaceOnUse">
        <stop stopColor="#E98550"/><stop offset=".53" stopColor="#A83A38"/><stop offset="1" stopColor="#5F2029"/>
      </linearGradient>
      <linearGradient id="w8-royal-blue" x1="0" y1="0" x2="112" y2="112" gradientUnits="userSpaceOnUse">
        <stop stopColor="#3FB9D4"/><stop offset=".5" stopColor="#25639C"/><stop offset="1" stopColor="#122749"/>
      </linearGradient>
    </defs>
    {kind==='chest'&&<g strokeLinejoin="round" strokeLinecap="round">
      <ellipse cx="56" cy="100" rx="46" ry="8" fill="#031629" opacity=".4"/>
      <path d="M16 51Q16 24 56 21Q96 24 96 51V60H16V51Z" fill="url(#w8-wood)" stroke="#65352E" strokeWidth="5"/>
      <path d="M20 48Q24 27 56 27Q88 27 92 48" stroke="url(#w8-gold-metal)" strokeWidth="8"/>
      <path d="M34 27V53M78 27V53" stroke="#FFD879" strokeWidth="7"/>
      <path d="M15 53H97V91Q56 105 15 91V53Z" fill="url(#w8-wood)" stroke="#572B29" strokeWidth="5"/>
      <path d="M20 58H92M20 90Q56 101 92 90M27 57V95M85 57V95" stroke="url(#w8-gold-metal)" strokeWidth="7"/>
      <rect x="44" y="53" width="24" height="27" rx="5" fill="url(#w8-gold-metal)" stroke="#7E481E" strokeWidth="3"/>
      <path d="M56 61V73" stroke="#643713" strokeWidth="5"/>
      <path d="M10 22L14 13L18 22L27 26L18 30L14 39L10 30L1 26L10 22Z" fill="#FFF1A4"/>
      <path d="M94 15L97 8L100 15L107 18L100 21L97 28L94 21L87 18L94 15Z" fill="#FFDB66"/>
    </g>}
    {kind==='scroll'&&<g strokeLinejoin="round" strokeLinecap="round">
      <path d="M20 14Q36 18 52 14L81 18V92Q57 88 32 94L24 88V27Q14 28 16 20Z" fill="#F6D9A0" stroke="#8B5631" strokeWidth="5"/>
      <path d="M20 17H82Q93 17 91 30Q90 38 81 39H30Q20 38 20 29Q10 28 12 20Q14 14 20 17Z" fill="url(#w8-gold-metal)" stroke="#84512B" strokeWidth="4"/>
      <path d="M24 85H81Q93 85 94 96Q95 104 84 103H23Q11 103 13 94Q14 86 24 85Z" fill="url(#w8-gold-metal)" stroke="#84512B" strokeWidth="4"/>
      <path d="M34 49H69M34 59H67M34 69H57" stroke="#956539" strokeWidth="5"/>
      <circle cx="76" cy="69" r="18" fill="url(#w8-royal-blue)" stroke="#FBE099" strokeWidth="5"/>
      <path d="M66 69L73 77L86 61" stroke="#FBE099" strokeWidth="6"/>
    </g>}
    {kind==='cannon'&&<g strokeLinejoin="round" strokeLinecap="round">
      <path d="M22 73L78 73L85 85L20 85Z" fill="url(#w8-wood)" stroke="#693823" strokeWidth="5"/>
      <circle cx="32" cy="86" r="13" fill="#8D4D2D" stroke="url(#w8-gold-metal)" strokeWidth="6"/>
      <circle cx="76" cy="86" r="13" fill="#8D4D2D" stroke="url(#w8-gold-metal)" strokeWidth="6"/>
      <path d="M16 43L74 32L88 45L32 64Z" fill="url(#w8-royal-blue)" stroke="#0B2446" strokeWidth="6"/>
      <path d="M76 30L94 35L97 53L86 56L77 47Z" fill="url(#w8-gold-metal)" stroke="#784A26" strokeWidth="4"/>
      <path d="M27 45L36 61" stroke="#F8CE74" strokeWidth="8"/>
      <path d="M100 18L103 26L111 30L103 34L100 42L97 34L89 30L97 26Z" fill="#FFD975"/>
    </g>}
    {kind==='helm'&&<g strokeLinejoin="round" strokeLinecap="round" stroke="#8C572C">
      <circle cx="56" cy="56" r="37" stroke="url(#w8-gold-metal)" strokeWidth="10"/>
      <path d="M56 3V109M3 56H109M18 18L94 94M18 94L94 18" stroke="url(#w8-gold-metal)" strokeWidth="9"/>
      <path d="M56 21V91M21 56H91M31 31L81 81M31 81L81 31" stroke="#79441E" strokeWidth="4"/>
      <circle cx="56" cy="56" r="14" fill="url(#w8-royal-blue)" stroke="#F9D681" strokeWidth="6"/>
      <path d="M51 57L56 47L61 57L56 65Z" fill="#FFD974" stroke="none"/>
    </g>}
    {(kind==='trophy'||kind==='medal')&&<g strokeLinejoin="round" strokeLinecap="round">
      <path d="M29 26L19 17L10 23L17 37L29 44M83 26L93 17L102 23L95 37L83 44" stroke="#F3CA67" strokeWidth="7"/>
      <path d="M32 22H80L75 58Q71 70 56 74Q41 70 37 58Z" fill="url(#w8-gold-metal)" stroke="#894C20" strokeWidth="5"/>
      <path d="M55 73V86M37 89H75L81 100H31Z" fill="url(#w8-gold-metal)" stroke="#894C20" strokeWidth="6"/>
      <path d="M42 41L49 37L56 24L63 37L70 41L64 48L66 59L56 53L46 59L48 48Z" fill="#FDF5B5" stroke="#C98528" strokeWidth="3"/>
      <path d="M16 62L9 57M15 74L5 73M96 62L103 57M97 74L107 73" stroke="#6DD9BB" strokeWidth="5"/>
    </g>}
    {kind==='flag'&&<g strokeLinejoin="round" strokeLinecap="round">
      <path d="M26 13V104" stroke="url(#w8-gold-metal)" strokeWidth="9"/>
      <path d="M30 20Q50 5 76 22L96 16L87 59Q57 45 30 65Z" fill="url(#w8-royal-blue)" stroke="#F3CC7A" strokeWidth="5"/>
      <path d="M48 33L56 42L76 25" stroke="#FBE69D" strokeWidth="7"/>
      <path d="M12 102H41" stroke="#F6D68A" strokeWidth="7"/>
    </g>}
  </svg>;
}


/** Decorative maritime panorama drawn in SVG, not a screenshot or gameplay layer. */
function W8SeaBackdrop({variant}:{variant:'missions'|'ranking'}){
  return <svg className={'w8-seascape w8-seascape-'+variant} viewBox="0 0 420 176" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="w8-sea-sky" x1="0" y1="0" x2="0" y2="1">
        <stop stopColor="#2D94B8"/><stop offset=".58" stopColor="#19638A"/><stop offset="1" stopColor="#0A3156"/>
      </linearGradient>
      <linearGradient id="w8-sea-waves" x1="0" y1="0" x2="0" y2="1">
        <stop stopColor="#2A88A5"/><stop offset="1" stopColor="#072B4B"/>
      </linearGradient>
    </defs>
    <rect width="420" height="176" fill="url(#w8-sea-sky)"/>
    <circle cx="341" cy="38" r="28" fill="#FFE6A1" opacity=".36"/>
    <circle cx="341" cy="38" r="41" fill="none" stroke="#FFE6A1" strokeWidth="1.5" opacity=".19"/>
    <path d="M0 111L42 91L70 101L101 75L142 103L177 93L214 113L256 99L291 104L329 85L368 101L420 82V176H0Z" fill="#164D67"/>
    <path d="M0 124Q55 115 104 125T212 125T318 121T420 127V176H0Z" fill="url(#w8-sea-waves)"/>
    <g fill="none" stroke="#84D7DE" strokeWidth="2.2" opacity=".32">
      <path d="M-10 143Q31 135 76 143T166 143T256 143T346 143T436 143"/>
      <path d="M-10 159Q31 151 76 159T166 159T256 159T346 159T436 159"/>
      <path d="M220 129Q247 124 267 129M294 139Q308 137 324 139M361 146Q381 140 406 146"/>
    </g>
    <g opacity=".64">
      <path d="M280 117L300 54V118Z" fill="#09243F" stroke="#E4B865" strokeWidth="1.5"/>
      <path d="M303 115V44L346 112Z" fill="#142C4D" stroke="#E9B66B" strokeWidth="1.3"/>
      <path d="M265 119Q319 141 373 116L362 130Q318 148 279 133Z" fill="#071B33" stroke="#DAAD67" strokeWidth="2"/>
      <path d="M300 49V133M303 43L317 47L303 55Z" stroke="#F2CE85" strokeWidth="2" fill="#DB7C38"/>
    </g>
    {variant==='missions'
      ? <g opacity=".58" stroke="#FFE3AB" fill="none" strokeWidth="2">
          <path d="M13 15Q45 9 73 25T134 24" strokeDasharray="4 8" strokeLinecap="round"/>
          <path d="M107 13L123 28M123 13L107 28"/>
          <circle cx="92" cy="20" r="10" strokeDasharray="3 5"/>
        </g>
      : <g opacity=".43" stroke="#FFE2A1" fill="none">
          <circle cx="69" cy="67" r="36" strokeWidth="2"/>
          <circle cx="69" cy="67" r="29"/>
          <path d="M69 24V110M26 67H112M44 42L94 92M94 42L44 92"/>
          <path d="M69 39L79 67L69 96L59 67Z" fill="#FFD883" strokeWidth="2"/>
        </g>}
    <path d="M0 0H420V176H0Z" fill="none" stroke="#EABF77" strokeWidth="4" opacity=".3"/>
  </svg>;
}

/** WORK 8: live React screens. All player values come from the persisted local profile. */
export type RankingTab = 'ranking'|'leagues';
type Navigate = (screen:'ranking'|'profile'|'missions'|'battle')=>void;

export function RankingTabs({active,onNavigate,onLeagues}:{
  active:'ranking'|'profile'|'leagues';onNavigate:Navigate;onLeagues:()=>void;
}) {
  return <nav className="w8-tabs" aria-label="Secções de ranking e perfil">
    <button type="button" aria-pressed={active==='ranking'} onClick={()=>onNavigate('ranking')}>RANKING</button>
    <button type="button" aria-pressed={active==='profile'} onClick={()=>onNavigate('profile')}>O MEU PERFIL</button>
    <button type="button" aria-pressed={active==='leagues'} onClick={onLeagues}>LIGAS</button>
  </nav>;
}

export function RankingPanel({profile,tab,onTab,onNavigate}:{
  profile:LocalProfile;tab:RankingTab;onTab:(tab:RankingTab)=>void;onNavigate:Navigate;
}) {
  return <div className="w8-screen w8-ranking-scene">
    <RankingTabs active={tab} onNavigate={screen=>{if(screen==='ranking')onTab('ranking');else onNavigate(screen);}}
      onLeagues={()=>onTab('leagues')}/>
    {tab==='ranking'?<>
      <div className="w8-hero w8-rank-hero"><W8SeaBackdrop variant="ranking"/>
        <div className="w8-hero-icon" aria-hidden="true"><W8Art kind="trophy"/></div>
        <div><span className="w8-eyebrow">DIÁRIO DO CAPITÃO</span>
          <h2>O TEU PERCURSO</h2><p>Estatísticas reais guardadas apenas neste dispositivo.</p><span className="w8-hero-live">{battlesPlayed(profile)} BATALHAS · {profile.xp} XP LOCAL</span></div>
      </div>
      <section className="w8-medal-card" aria-label="Resumo pessoal das batalhas">
        <div className="w8-medal-art" aria-hidden="true"><W8Art kind="medal"/></div>
        <div className="w8-medal-data"><small>CAPITÃO LOCAL</small>
          <strong>NÍVEL {levelFor(profile.xp)}</strong>
          <span>{profile.xp} XP · {battlesPlayed(profile)} batalhas</span></div>
      </section>
      <div className="w8-stat-row">
        <div><span className="w8-stat-symbol">★</span><strong>{profile.wins}</strong><small>VITÓRIAS</small></div>
        <div><span className="w8-stat-symbol">◆</span><strong>{profile.losses}</strong><small>DERROTAS</small></div>
        <div><span className="w8-stat-symbol">◎</span><strong>{profile.shots?Math.round(100*profile.hits/profile.shots)+'%':'—'}</strong><small>PRECISÃO</small></div>
      </div>
      <div className="w8-honesty" aria-label="There is no global leaderboard yet">
        <PirateIcon name="ranking" size={25}/><div><strong>CLASSIFICAÇÃO MUNDIAL EM BREVE</strong>
        <p>Não existe ranking global nem serviço multiplayer. Não mostramos jogadores, posições ou prémios fictícios.</p></div>
      </div>
      <button type="button" className="app-cta" onClick={()=>onNavigate('profile')}>VER O MEU PERFIL</button>
    </>:<>
      <div className="w8-hero w8-rank-hero"><div className="w8-hero-icon" aria-hidden="true"><W8Art kind="flag"/></div>
        <div><span className="w8-eyebrow">ROYAL PIRATE · LIGAS</span><h2>LIGAS EM BREVE</h2><p>Sem classificação inventada.</p></div></div>
      <div className="w8-honesty w8-honesty-large"><PirateIcon name="ranking" size={32}/><div>
        <strong>AINDA NÃO EXISTEM LIGAS ONLINE</strong>
        <p>Esta versão ainda não tem contas, servidor competitivo ou temporadas. Os teus resultados locais continuam guardados e podem ser consultados no perfil.</p>
      </div></div>
      <button type="button" className="app-cta" onClick={()=>onNavigate('profile')}>VER PROGRESSO LOCAL</button>
    </>}
  </div>;
}

export function MissionsPanel({profile,onDaily,onMission,onNavigate}:{
  profile:LocalProfile;onDaily:()=>void;onMission:(id:MissionId)=>void;onNavigate:Navigate;
}) {
  const [tab,setTab]=React.useState<'daily'|'weekly'|'events'>('daily');
  const [message,setMessage]=React.useState('');
  const now=Date.now(),canClaim=canClaimDaily(profile,now),next=nextDailyStreak(profile,now);
  const visibleStreak=canClaim&&next===1?0:profile.dailyStreak;
  const ready=MISSIONS.filter(m=>missionProgress(profile,m.id)>=m.target&&!profile.claimedMissions.includes(m.id)).length;
  return <div className="w8-screen w8-missions-scene">
    <nav className="w8-tabs" aria-label="Categorias de missões">
      <button type="button" onClick={()=>{setTab('daily');setMessage('');}} aria-pressed={tab==='daily'}>DIÁRIAS</button>
      <button type="button" onClick={()=>{setTab('weekly');setMessage('');}} aria-pressed={tab==='weekly'}>SEMANAIS</button>
      <button type="button" onClick={()=>{setTab('events');setMessage('');}} aria-pressed={tab==='events'}>EVENTOS</button>
    </nav>
    <div className="w8-hero"><W8SeaBackdrop variant="missions"/>
      <div className="w8-hero-icon" aria-hidden="true"><W8Art kind="scroll"/></div>
      <div><span className="w8-eyebrow">ORDENS DO CAPITÃO</span>
        <h2>{tab==='daily'?'MISSÕES E RECOMPENSAS':tab==='weekly'?'MISSÕES SEMANAIS':'EVENTOS DO PORTO'}</h2>
        <p>{tab==='daily'?'Conquista objetivos reais e recolhe prémios locais.':'Conteúdos competitivos indisponíveis nesta demonstração.'}</p>{tab==='daily'&&<span className="w8-hero-live">{profile.claimedMissions.length}/{MISSIONS.length} OBJETIVOS RECOLHIDOS</span>}</div>
    </div>
    {tab==='daily'?<>
      <section className="w8-daily" aria-label="Recompensa diária" title={'Next claim earns '+(15+next*5)+' coins'}>
        <div className="w8-daily-orb" aria-hidden="true"><W8Art kind="chest"/></div>
        <div className="w8-daily-copy"><span className="w8-eyebrow">BAÚ DIÁRIO</span><strong>{canClaim?'RECOMPENSA DISPONÍVEL':'RECOLHIDO HOJE'}</strong>
          <small>Dia {next} da sequência · reinício às 00:00 UTC</small>
          <span className="w8-reward-amount">{15+next*5} <span aria-hidden="true">●</span> MOEDAS</span></div>
        <button type="button" disabled={!canClaim} onClick={()=>{onDaily();setMessage('Recompensa diária recolhida no perfil local.');}}>{canClaim?'RECOLHER':'RECOLHIDO'}</button>
      </section>
      <section className="w8-calendar" aria-label="7-day supply route">
        <div className="w8-section-heading"><h3>RECOMPENSA DIÁRIA</h3><small>{visibleStreak}/7 dias seguidos</small></div>
        <ol className="w8-days" aria-label="Seven consecutive daily rewards">{Array.from({length:7},(_,i)=>i+1).map(n=><li key={n} aria-label={'DAY '+n} className={'app-week-day'+(n<=visibleStreak?' is-claimed':canClaim&&n===next?' is-next':'')}>
          <small>DIA {n}</small><span className="w8-day-token" aria-hidden="true">{n<=visibleStreak?'✓':n===7?'★':'◆'}</span><strong>{15+n*5} ●</strong>
        </li>)}</ol>
        <p>Recompensas locais por dia UTC. Uma recolha por dia; dias em falta reiniciam a sequência.</p>
      </section>
      <section className="w8-missions" aria-label="Objetivos locais permanentes">
        <div className="w8-section-heading"><h3>OBJETIVOS DO CAPITÃO</h3><small>{ready} PRONTOS</small></div>
        <p className="w8-explain">Estes objetivos são permanentes, não reiniciam diariamente. O progresso depende das batalhas realmente concluídas.</p>
        {MISSIONS.map((mission,index)=>{
          const progress=missionProgress(profile,mission.id),claimed=profile.claimedMissions.includes(mission.id);
          const canCollect=!claimed&&progress>=mission.target;
          return <article className="w8-mission" key={mission.id}>
            <div className={'w8-mission-icon w8-mission-icon-'+index} aria-hidden="true">
              <W8Art kind={index===0?'cannon':index===1?'scroll':'helm'}/></div>
            <div className="w8-mission-main">
              <strong>{mission.title}</strong><small>{progress} / {mission.target} · <span>+{mission.reward} ●</span></small>
              <div className="w8-progress" role="progressbar" aria-label={mission.title+' progress'} aria-valuemin={0} aria-valuemax={mission.target} aria-valuenow={progress}>
                <span style={{width:(100*progress/mission.target)+'%'}}/></div>
            </div>
            <button type="button" disabled={!canCollect} onClick={()=>{onMission(mission.id);setMessage('Prémio do objetivo '+mission.title+' recolhido localmente.');}}>
              {claimed?'FEITO':canCollect?'RECOLHER':'PENDENTE'}</button>
          </article>;
        })}
        <button type="button" className="w8-secondary-cta" onClick={()=>onNavigate('battle')}>IR PARA A BATALHA</button>
      </section>
      <p className="w8-footnote">Moedas e progresso são dados locais do jogo, não sincronizados com servidor ou conta.</p>
    </>:<div className="w8-unavailable">
      <div aria-hidden="true" className="w8-lock"><W8Art kind="flag"/></div>
      <strong>{tab==='weekly'?'SEMANAIS EM BREVE':'SEM EVENTOS ATIVOS'}</strong>
      <p>{tab==='weekly'?'Não existe calendário semanal ativo nem prémios semanais disponíveis. Os objetivos permanentes mantêm-se no separador Diárias.':'Não existem eventos online ativos nesta versão. Não são atribuídas recompensas ou posições fictícias.'}</p>
      <button type="button" onClick={()=>setTab('daily')}>VER MISSÕES DISPONÍVEIS</button>
    </div>}
    {message&&<div className="w8-feedback" role="status" aria-live="polite">{message}</div>}
  </div>;
}
