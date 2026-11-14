# Work 5 — QA e preparação de lançamento

Data: 14/11/2026. Branch: `feat/qa-release`. Integração final: Work 1.

## Base e isolamento

Base remota inspecionada: `work1/unity-foundation-20261114`, commit `7be4af3dd271018c386a2891b95f067e471dba7e` (PR #1).
Clone HTTPS privado indisponível neste terminal; materialização local feita a partir do snapshot Git existente.
Os 18 hashes de árvores/blobs do nível raiz coincidem exatamente com a base GitHub, incluindo código, binários e documentação. O commit local original `62b076be...` tem metadados distintos; não é apresentado como o SHA remoto. Publicação feita por GitHub Git Data API com parent remoto correto.

Branches observadas na inspeção inicial:

| Work | Branch | Head observado | Consequência |
| --- | --- | --- | --- |
| 1 | work1/unity-foundation-20261114 | 7be4af3d | Base dos testes; PR #1 ainda draft |
| 2 | feat/ships-3d | 8448a1dc | Ainda sem fundação nesta branch no momento observado; integrar contratos antes de testar arte |
| 3 | feat/combat-physics | 7be4af3d | Fundação disponível; nova implementação de combate ainda não publicada |
| 4 | feat/ui-progression | 7be4af3d | Fundação disponível; UI/progressão própria ainda não publicada |

Reverificação no final da sessão: Work 3 avançou para `f49d77ba651926fdb5291cca1852f3a02bb12757`. A árvore publicada `fbe77a8d7d154f56bbc130fbe543fd3ea5b7041b` foi confirmada pelos hashes e testada numa cópia isolada com os testes QA sobrepostos. Acrescenta `CombatSession`, `BotAimSolver`, `TurnWind`, `ReinforcedShot`, pooling e consultas físicas NonAlloc. Os contratos públicos consumidos pelos nossos testes foram mantidos. Ver `work3-integration-check.json`; não houve merge de branches. Os riscos R04/R08 têm mitigação proposta nesse commit, ainda sem prova Unity.

Nenhum ficheiro de produção ou teste anterior foi alterado. Novos ficheiros em `Tests/QA`, `Tools/QA`, `Documentation/Reports/Work5` e workflow próprio. Não houve merge, alteração de proteção, publicação de build ou comunicação automática com outros chats. O PR é o ponto de coordenação/revisão pelo Work 1.

## O que executar

Na raiz, com Python 3 e .NET 8 disponíveis:

```sh
python3 Tools/validate_repository.py
python3 Tools/QA/static_checks.py
python3 -m unittest discover -s Tools/QA -p 'test_*.py' -v
dotnet run --project Tools/DomainChecks/DomainChecks.csproj -- Assets/RoyalPirate/Data/Resources/Navio01.json
dotnet run --project Tools/QA/QA.csproj -- Assets/RoyalPirate/Data/Resources/Navio01.json TestResults/QA/domain.json
```

Os 34 cenários de `DomainScenarios` compilam os mesmos ficheiros Domain usados pelo jogo, sem stubs de Unity. São também 34 casos NUnit EditMode. A execução .NET valida regras e números; não valida Unity, JsonUtility, física de colisão nem dispositivos. As 1.000 sequências de economia e 1.000 transições de turnos são testes de esforço de subsistemas, **não 1.000 partidas completas**.

Com Unity 6000.3.28f1 instalado e licenciado, após o setup explícito do Work 1:

```sh
export UNITY_EDITOR=/caminho/para/Unity
python3 Tools/QA/run_unity.py --mode core
python3 Tools/QA/run_unity.py --mode simulation --battles 1000
```

O runner não instala nem ativa Unity. Verifica versão, remove XML antigo, exige código de saída válido e XML com casos efetivamente aprovados, sem skipped/inconclusive. Produz logs, hashes dos XML, SHA e indicador de working tree alterada. Evidência com `dirty=true` serve para diagnóstico e tem de ser repetida no commit exato antes de integração.

`core` executa EditMode e PlayMode, excluindo apenas a categoria `Simulation`. **ReleaseBlocker não é excluída.** Os dois testes de recuperação de save verificam requisitos desejados e podem falhar na base atual; não foram marcados Ignore nem convertidos em sucesso esperado.

## Simulação headless

`HeadlessBattleTests` cria navios por `ShipView.Assemble`, dispara por `CannonWeapon`, integra `Ballistics`, resolve colisões por `ProjectileView`/Unity Physics e alterna `TurnState`. Não altera vida para fabricar um vencedor. Usa trajetórias de acerto/falha controladas, troca o lado vencedor e limita cada partida a 40 turnos e cada projétil a 400 passos.

Executa 10 partidas por defeito no Test Runner; variável `ROYAL_QA_BATTLES` aceita 1–10.000. O script pede 1.000 por defeito. Guarda JSON mesmo em interrupção por exceção, com partidas concluídas, vencedor esperado/obtido, acertos, falhas, turnos, duração simulada e erros. O caminho é definido por `ROYAL_QA_SIM_REPORT`.

**Ainda não executado em Unity.** Testa componentes reais numa montagem controlada, não o bot aleatório de `BattleBootstrap`, navegação, progressão nem equilíbrio comercial. Vento é validado pelo domínio; a simulação inicial de partidas usa vento zero. Aumentar a amostragem de estratégias/vento depois do contrato de batalha do Work 3 estar integrado. Não usar tempo headless ou `timeScale=20` como FPS/desempenho mobile.

## GitHub Actions e bloqueio

Workflow `.github/workflows/qa-release.yml` preparado, apenas `workflow_dispatch`, sem serviços pagos nem uploads de artefactos. Exige runner existente com labels `self-hosted, royal-pirate-qa`, Unity licenciado, .NET 8, Python e variável `QA_ZERO_COST_RUNNER_READY=true`. Não foi ativado nem executado.

Work 1 deve verificar que o runner tem custo marginal zero, definir a variável, executar manualmente e só depois propor triggers `pull_request`/`push` e tornar o check `Royal Pirate QA / qa` obrigatório. Não executar código de PRs externos em runner persistente. O token é read-only e checkout não conserva credenciais. Inputs entram via variável de ambiente e são validados como inteiros.

**O repositório ainda não tem bloqueio de merge configurado por este Work.** Job skipped/queued, ausência de runner/licença ou apenas checks estáticos verdes não aprovam integração. Manter PR draft até importação/compilação Unity e XML dos dois modos aprovados, além de revisão Work 1. Não iniciar um runner hosted por conveniência.

## Primeira batalha jogável: critérios objetivos

1. Base integrada num commit identificado; importação limpa no editor fixado; packages-lock e settings gerados/revistos pelo Work 1; zero erros de compilação e referências em falta.
2. Todos os testes críticos EditMode e PlayMode aprovados, sem ignorar ReleaseBlocker; XML/logs com SHA exato.
3. Dois navios montados a partir do catálogo; origem não recebe dano próprio; impacto mais próximo recebe dano uma vez; casco destruído termina a batalha e afunda; canhão destruído deixa de disparar.
4. Potências 0/1 e vento lateral/frontal comprovados; 20 s de mira, 8 s de resolução, callback tardio não avança outro turno; início/reinício não deixa objetos de batalha órfãos.
5. Vitória e derrota reproduzíveis; decisão explícita para ambos sem armas e ausência de vencedor. Nenhuma batalha pode ficar indefinidamente bloqueada. Work 3 propõe derrota por desarmamento e empate se ambos perdem, a validar na integração; combate onde ambos continuam a falhar ainda exige política de limite.
6. Pelo menos 100 partidas físicas automatizadas sem resultado impossível/timeout; 1.000 antes de recomendar candidato comercial. JSON completo e determinismo de cenário repetido no mesmo ambiente (sem prometer determinismo entre CPUs).
7. Dez batalhas manuais completas e 100 ciclos estaleiro/batalha num iOS e Android disponíveis, retrato/safe area, toque e pausa/retoma. Nenhum dispositivo executado ainda.
8. Save preserva IDs/revisão/melhorias; interromper escrita e recuperar backup não causa perda silenciosa. Economia de desenvolvimento identificada como sandbox.

Publicação comercial exige adicionalmente os critérios de `COMPATIBILITY.md`, `SECURITY_RELEASE.md`, resolução de riscos S0/S1, pagamentos sandbox se existirem, revisão do proprietário e aprovação expressa. Natal é objetivo, não dispensa testes.

## Cobertura e dependências

| Área | Implementação QA | Limite atual |
| --- | --- | --- |
| Gravidade/vento/potência | 9 cenários numéricos + entradas inválidas | Domínio executado; engine pendente |
| Danos/módulos | Casco/canhão/mastro, overkill, evento único | Colisões/desativação/afundamento só preparados |
| Turnos/temporizadores | Ownership, timeout, callbacks antigos, fim e 1.000 transições | Empate/desarmamento propostos Work 3; engine e limite de falhas sucessivas pendentes |
| Construção/custos | Instalação, upgrade, revisão, limites, 60.000 operações | Não é ledger de produção |
| Persistência | 8 novos testes de falhas/recuperação | Unity pendente; migração real v2 ainda inexistente |
| Vitória/derrota | Fixture de partidas com lados alternados | Sem execução Unity; bot de produção não validado |
| Heróis/recompensas/UI | Contratos inventariados e matriz definida | Aguardar implementação publicada Work 4; sem mocks que finjam cobertura |
| Login/IAP/anúncios | Requisitos e casos definidos; comércio já desativado na base | Não há SDK/backend/sandbox configurado |
| Mobile | Matriz e analisador CSV de frames | Zero medições reais |

Despesas realizadas: **0 €**.
