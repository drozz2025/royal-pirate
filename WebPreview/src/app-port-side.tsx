import React from 'react';
import { PortoArt } from './porto-art';
import { MISSIONS, battlesPlayed, canClaimDaily, missionProgress, nextDailyStreak, type LocalProfile } from './progression';

export type PortSideId = 'chests' | 'events' | 'rewards' | 'offers';

const settings: Record<PortSideId, { eyebrow: string; title: string; description: string; button: string; destination: 'missions' | 'shop' }> = {
  chests: { eyebrow: 'ABASTECIMENTO · PROGRESSO LOCAL', title: 'Baú diário',
    description: 'Sete dias de recompensas em moedas. O calendário e a recolha estão nas Missões.',
    button: 'VER CALENDÁRIO E RECOLHER', destination: 'missions' },
  events: { eyebrow: 'EVENTOS · MODO OFFLINE', title: 'Aventura no mar',
    description: 'Os eventos temporários online ainda não estão disponíveis. Continua a avançar nas missões locais.',
    button: 'VER MISSÕES LOCAIS', destination: 'missions' },
  rewards: { eyebrow: 'RECOMPENSAS · PROGRESSO LOCAL', title: 'Tesouro do capitão',
    description: 'Recompensas e moedas registadas neste dispositivo, sem sincronização online.',
    button: 'VER RECOMPENSAS PENDENTES', destination: 'missions' },
  offers: { eyebrow: 'OFERTAS · LOJA LOCAL', title: 'Mercado pirata',
    description: 'Não existem compras com dinheiro real nesta demonstração. Podes consultar o recrutamento com moedas locais.',
    button: 'ENTRAR NA LOJA', destination: 'shop' }
};

export function PortSidePanel({ screen, profile, onNavigate }: {
  screen: PortSideId;
  profile: LocalProfile;
  onNavigate: (screen: 'missions' | 'shop') => void;
}) {
  const now = Date.now();
  const dailyReady = canClaimDaily(profile, now);
  const nextDay = nextDailyStreak(profile, now);
  const currentStreak = dailyReady && nextDay === 1 ? 0 : profile.dailyStreak;
  const pending = MISSIONS.filter(m =>
    !profile.claimedMissions.includes(m.id) && missionProgress(profile, m.id) >= m.target
  ).length;
  const data = settings[screen];
  const label = screen === 'chests' ? (dailyReady ? 'PRONTO A RECOLHER' : 'RECOLHIDO HOJE')
    : screen === 'events' ? 'EVENTOS ONLINE INATIVOS'
    : screen === 'rewards' ? 'GUARDADO LOCALMENTE' : 'SEM PAGAMENTOS';
  return <section className={'app-side app-side-' + screen} aria-label={data.title}>
    <header className="app-side-hero">
      <div className="app-side-illustration" aria-hidden="true"><PortoArt name={screen} size={112}/></div>
      <div className="app-side-hero-copy">
        <span className="app-side-eyebrow">{data.eyebrow}</span>
        <h2>{data.title}</h2>
        <p>{data.description}</p>
      </div>
      <span className={'app-side-status' + (screen === 'chests' && dailyReady ? ' is-ready' : '')}>{label}</span>
    </header>

    {screen === 'chests' && <>
      <div className="app-side-section-title"><h3>Rota de 7 dias</h3><small>{currentStreak} / 7 dias consecutivos</small></div>
      <ol className="app-side-calendar">
        {Array.from({length: 7}, (_, i) => i + 1).map(day => {
          const collected = day <= currentStreak;
          const ready = dailyReady && day === nextDay;
          return <li key={day} className={collected ? 'is-collected' : ready ? 'is-ready' : ''}>
            <span className="app-side-day">DIA {day}</span>
            <span className="app-side-day-icon" aria-hidden="true">{collected ? '✓' : '✦'}</span>
            <strong>{15 + day * 5}</strong>
            <small>MOEDAS</small>
          </li>;
        })}
      </ol>
      <p className="app-side-hint">{dailyReady
        ? 'Próxima recolha: ' + (15 + nextDay * 5) + ' moedas locais. Abre Missões para recolher.'
        : 'A recompensa de hoje já foi recolhida. A próxima fica disponível no próximo dia UTC.'}</p>
    </>}

    {screen === 'events' && <>
      <div className="app-side-feature">
        <div className="app-side-feature-icon" aria-hidden="true">✦</div>
        <div><strong>Missões de treino</strong><p>{pending
          ? pending + (pending === 1 ? ' missão concluída com recompensa por recolher.' : ' missões concluídas com recompensas por recolher.')
          : 'Completa objetivos reais em batalhas para ganhar moedas locais.'}</p></div>
        <span>{pending} PRONTAS</span>
      </div>
      <div className="app-side-metrics">
        <div><small>BATALHAS</small><strong>{battlesPlayed(profile)}</strong></div>
        <div><small>VITÓRIAS</small><strong>{profile.wins}</strong></div>
        <div><small>EVENTOS ONLINE</small><strong>—</strong></div>
      </div>
      <p className="app-side-hint">Não há eventos temporários, torneios, adversários online ou prémios de evento ativos.</p>
    </>}

    {screen === 'rewards' && <>
      <div className="app-side-section-title"><h3>O teu tesouro</h3><small>Dados reais deste dispositivo</small></div>
      <div className="app-side-metrics">
        <div><small>MOEDAS ATUAIS</small><strong>{new Intl.NumberFormat('pt-PT').format(profile.coins)}</strong></div>
        <div><small>MISSÕES RECOLHIDAS</small><strong>{profile.claimedMissions.length}</strong></div>
        <div><small>MISSÕES PRONTAS</small><strong>{pending}</strong></div>
      </div>
      <div className="app-side-feature">
        <div className="app-side-feature-icon" aria-hidden="true">✦</div>
        <div><strong>{dailyReady ? 'Baú diário disponível' : 'Baú diário recolhido hoje'}</strong>
          <p>{dailyReady ? 'A recompensa local está à tua espera no ecrã Missões.' : 'Volta no próximo dia UTC para a próxima recompensa.'}</p></div>
      </div>
    </>}

    {screen === 'offers' && <>
      <div className="app-side-section-title"><h3>Disponibilidade</h3><small>Sem pagamentos integrados</small></div>
      <div className="app-side-offers">
        <div><span aria-hidden="true">✦</span><strong>Ofertas especiais</strong><small>EM BREVE · SEM COMPRAS</small></div>
        <div><span aria-hidden="true">⚓</span><strong>Tripulação local</strong><small>RECRUTAMENTO COM MOEDAS DO JOGO</small></div>
      </div>
      <p className="app-side-hint">Não são apresentados preços, saldos premium, compras simuladas ou promessas de produtos disponíveis.</p>
    </>}

    <button className="app-side-primary" type="button" onClick={() => onNavigate(data.destination)}>{data.button}</button>
    <small className="app-side-footnote">DEMONSTRAÇÃO LOCAL · SEM CONTA ONLINE OU PAGAMENTOS</small>
  </section>;
}
