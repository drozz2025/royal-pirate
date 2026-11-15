import React from 'react';
import { PirateIcon } from './app-icons';
import { MISSIONS, battlesPlayed, canClaimDaily, nextDailyStreak, levelFor, missionProgress, type LocalProfile, type MissionId } from './progression';

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
  return <div className="w8-screen">
    <RankingTabs active={tab} onNavigate={screen=>{if(screen==='ranking')onTab('ranking');else onNavigate(screen);}}
      onLeagues={()=>onTab('leagues')}/>
    {tab==='ranking'?<>
      <div className="w8-hero w8-rank-hero">
        <div className="w8-hero-icon" aria-hidden="true"><PirateIcon name="ranking" size={54}/></div>
        <div><span className="w8-eyebrow">DIÁRIO DO CAPITÃO</span>
          <h2>O TEU PERCURSO</h2><p>Estatísticas reais guardadas apenas neste dispositivo.</p></div>
      </div>
      <section className="w8-medal-card" aria-label="Resumo pessoal das batalhas">
        <div className="w8-medal-art" aria-hidden="true"><span>♛</span></div>
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
      <div className="w8-hero w8-rank-hero"><div className="w8-hero-icon" aria-hidden="true">♛</div>
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
  return <div className="w8-screen">
    <nav className="w8-tabs" aria-label="Categorias de missões">
      <button type="button" onClick={()=>{setTab('daily');setMessage('');}} aria-pressed={tab==='daily'}>DIÁRIAS</button>
      <button type="button" onClick={()=>{setTab('weekly');setMessage('');}} aria-pressed={tab==='weekly'}>SEMANAIS</button>
      <button type="button" onClick={()=>{setTab('events');setMessage('');}} aria-pressed={tab==='events'}>EVENTOS</button>
    </nav>
    <div className="w8-hero">
      <div className="w8-hero-icon" aria-hidden="true"><PirateIcon name="missions" size={54}/></div>
      <div><span className="w8-eyebrow">ORDENS DO CAPITÃO</span>
        <h2>{tab==='daily'?'MISSÕES E RECOMPENSAS':tab==='weekly'?'MISSÕES SEMANAIS':'EVENTOS DO PORTO'}</h2>
        <p>{tab==='daily'?'Conquista objetivos reais e recolhe prémios locais.':'Conteúdos competitivos indisponíveis nesta demonstração.'}</p></div>
    </div>
    {tab==='daily'?<>
      <section className="w8-daily" aria-label="Recompensa diária">
        <div className="w8-daily-orb" aria-hidden="true"><PirateIcon name="rewards" size={41}/></div>
        <div className="w8-daily-copy"><span className="w8-eyebrow">BAÚ DIÁRIO</span><strong>{canClaim?'RECOMPENSA DISPONÍVEL':'RECOLHIDO HOJE'}</strong>
          <small>Dia {next} da sequência · reinício às 00:00 UTC</small>
          <span className="w8-reward-amount">{15+next*5} <span aria-hidden="true">●</span> MOEDAS</span></div>
        <button type="button" disabled={!canClaim} onClick={()=>{onDaily();setMessage('Recompensa diária recolhida no perfil local.');}}>{canClaim?'RECOLHER':'RECOLHIDO'}</button>
      </section>
      <section className="w8-calendar" aria-label="Calendário de recompensas">
        <div className="w8-section-heading"><h3>RECOMPENSA DIÁRIA</h3><small>{visibleStreak}/7 dias seguidos</small></div>
        <ol className="w8-days">{Array.from({length:7},(_,i)=>i+1).map(n=><li key={n} className={n<=visibleStreak?'collected':canClaim&&n===next?'available':''}>
          <small>DIA {n}</small><span aria-hidden="true">{n<=visibleStreak?'✓':n===7?'♛':'◆'}</span><strong>{15+n*5} ●</strong>
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
              <PirateIcon name={index===0?'battle':index===1?'forge':'fleet'} size={29}/></div>
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
      <div aria-hidden="true" className="w8-lock">♛</div>
      <strong>{tab==='weekly'?'SEMANAIS EM BREVE':'SEM EVENTOS ATIVOS'}</strong>
      <p>{tab==='weekly'?'Não existe calendário semanal ativo nem prémios semanais disponíveis. Os objetivos permanentes mantêm-se no separador Diárias.':'Não existem eventos online ativos nesta versão. Não são atribuídas recompensas ou posições fictícias.'}</p>
      <button type="button" onClick={()=>setTab('daily')}>VER MISSÕES DISPONÍVEIS</button>
    </div>}
    {message&&<div className="w8-feedback" role="status" aria-live="polite">{message}</div>}
  </div>;
}
