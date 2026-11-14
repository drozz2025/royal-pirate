# WORK 3 — combate naval e física

Entrega de código de 14/11/2026. Branch `feat/combat-physics`, baseada em
`work1/unity-foundation-20261114`, commit `7be4af3dd271018c386a2891b95f067e471dba7e`.

**Estado: implementado e testado ao nível do domínio C#; protótipo Unity ainda NÃO validado.**
Não há execução do Editor, XML Unity, vídeo de gameplay, build móvel ou perfil em dispositivo nesta sessão.
Não se considera cumprido o critério de conclusão do protótipo enquanto faltarem essas provas.

## Integração e coordenação com Work 1

Foram lidos README, ARCHITECTURE, TASKS, INTEGRATION, WORK_3, NAVIO_01, os contratos, assemblies,
cena e testes existentes. Os 128 ficheiros da base local correspondem exatamente aos blobs GitHub da fundação.

São reutilizados `ShipCatalog`, `ShipLoadout`, `ModuleState`, `Ballistics`, `TurnState`, `IWeapon`,
`IShip`, `IHeroAbility`, `ShotRequest`, `LocalLoadoutStore` e a mesma `Integration.unity`.
`Contracts.cs`, `Ballistics.cs`, `TurnState.cs`, `ShipModel.cs`, Services, Packages,
ProjectSettings, Editor e GUIDs existentes não foram alterados. Mantêm-se as seis assemblies,
com Domain independente de Unity; os novos adaptadores Combat pertencem à assembly Runtime existente.

Este PR propõe explicitamente o handoff dos cinco adaptadores iniciais Runtime para Work 3.
Não existe aprovação independente nem comunicação automática entre chats. Work 1 deve rever o diff,
a hierarquia visual e as adições ao Domain antes do merge. Nenhuma alteração foi escrita diretamente
em main ou na branch do Work 1. Não se afirma que o handoff já foi aprovado.
Os documentos centrais do Work 1 não foram sobrescritos; este relatório contém o estado desta entrega.

## Código implementado

- `CombatSession` envolve o `TurnState` original. Temporizador de mira configurável 2–120 s;
  resolução conserva 8 s. Disparo exige turno, fase e canhão operacional. Atrasos/callbacks antigos
  são verificados pelo número do turno. Projétil expira aos 7 s; destaque de impacto dura 0,45 s.
- Vitória por casco destruído ou ausência de canhões operacionais; derrota simétrica e empate se
  ambos estiverem incapacitados. Havendo outro canhão, o adaptador seleciona-o para o turno seguinte.
- Mira tátil com EnhancedTouch, captura por contacto, limites/sensibilidade normalizados pela safe area;
  o gesto iniciado na zona de mira não se transforma em botão quando termina sobre FIRE.
  O slider de potência tem captura separada. Mouse permite ensaio no Editor. Perda de foco limpa capturas.
- Potência configurável dentro de [0,1], velocidade `10 + 25*power` m/s; elevação 5–70°.
  Gravidade 9,81 m/s²; integração analítica de aceleração constante do Work 1.
  Não se acrescentou resistência do ar: manter este modelo simples permite verificá-lo exatamente.
- Vento horizontal X/Z em **m/s² de aceleração efetiva**, não velocidade meteorológica.
  Direção/magnitude reproduzíveis por seed+turno, estáveis durante o voo. Limite configurável 0–8 m/s²;
  predefinição 1,2 m/s² de magnitude. HUD indica seta, eixos e intensidade.
- Projéteis simulados em subpassos até 10 ms; sphere sweep de raio 0,18 m, overlap inicial,
  escolha da superfície mais próxima, exclusão do dono, obstáculos genéricos e plano de água a Y=-1.
  A queda entre curva e corda por subpasso é inferior a 0,13 mm no eixo vertical.
- Buffers de 64 resultados por consulta; saturação usa uma consulta alocadora completa e incrementa
  `OverflowQueries`, preservando a correção. Não se descarta silenciosamente um alvo por buffer cheio.
  Um projétil pré-criado por arma; sem Instantiate/Destroy a cada disparo no combate integrado.
- Dano usa o valor do canhão no catálogo, aplica-se ao módulo atingido, agrega-se na resistência do navio
  e não altera o loadout guardado. Não há acertos automáticos, homing nem dano por animação.
- Raiz de cada módulo com escala unitária; dimensão fica no visual e no BoxCollider.
  O socket Muzzle fica à frente do cano e acompanha a direção/elevação reais. Recoil move só o visual.
- Destruição desliga colliders de gameplay; canhões deixam de disparar. Módulos destacados têm um
  Rigidbody visual com impulso no impacto; mastros caem, peças desaparecem após 3 s/entrada na água.
  Destroços não colidem com outros objetos nem aplicam dano. Casco permanece visível no afundamento.
- Pool de seis sistemas de partículas, explosão/fragmentos, salpicos e fumo no modo High.
  Qualidade Off/Low/High; Off desliga novos efeitos e usa remoção simples de peças.
  São efeitos de engenharia com geometria básica, não VFX finais.
- Bot calcula intenção balística a partir da mesma aceleração e adiciona erro limitado de direção,
  elevação e potência. O impacto é sempre decidido pelo mesmo `ProjectileView`.
- Habilidade `ReinforcedShot`: +50% de dano, vinculada a um HeroSlot vivo e ao ID do canhão;
  cooldown de seis turnos globais (três turnos próprios), expira ao terminar o turno em que foi armada.
  Valores iniciais de teste, ainda sem validação de equilíbrio. Sem moeda, compras ou herói artístico.
- Câmaras de mira, seguimento parcial, impacto e resultado com transições exponenciais suaves.
  A posição principal fica atrás do canhão frontal, com o inimigo à frente; não é broadside.
- `HudChanged`/`CombatHudState` apresentam HP real, nomes de teste, turno, timer, vento, potência e habilidade.
  Uma única apresentação de diagnóstico substitui o OnGUI antigo, com barra azul e vermelha.
- Ao suspender/perder foco, o relógio e os projéteis param. Capturas táteis são descartadas.
  Interrupções reais iOS/Android continuam pendentes de validação.

## Ficheiros

| Grupo | Ficheiros criados/alterados |
| --- | --- |
| Novos Domain | `CombatRules.cs`, `TurnWind.cs`, `BotAimSolver.cs`, `ReinforcedShot.cs` |
| Runtime existente alterado | `BattleBootstrap.cs`, `CannonWeapon.cs`, `ProjectileView.cs`, `ModuleView.cs`, `ShipView.cs` |
| Novos Runtime/Combat | `TouchCombatInput.cs`, `CombatCamera.cs`, `CombatHud.cs`, `CombatEffects.cs`, `ModuleDestruction.cs` |
| Novos EditMode | `CombatContractChecks.cs`, `CombatDomainTests.cs` |
| Novos PlayMode | `CombatPhysicsTests.cs`, `CombatIntegrationTests.cs` |
| Testes/ ferramentas alterados | `RoyalPirate.PlayModeTests.asmdef` (referência Input System), `Tools/DomainChecks/Program.cs`, `DomainChecks.csproj` |
| Metadados | `.meta` novos com GUIDs únicos para todos os novos assets e pasta Combat; GUIDs antigos preservados |
| Relatório/provas | Este README, `domain-checks.txt`, `structure-checks.txt`, `syntax-checks.txt`, `run-unity-checks.sh` |

A cena existente continua a apontar para o mesmo `BattleBootstrap`; a integração é feita através desse
entry point, sem duplicar a cena ou introduzir outro conjunto de regras de combate.
Os assets em `Modelos_3D` e `Referencias_Visuais` não foram alterados (hashes originais verificados).

## Validação executada

Ambiente Linux, .NET SDK **8.0.428** já disponível em `/tmp/royal-dotnet`, sem instalação paga.

| Verificação | Resultado executado | Prova |
| --- | --- | --- |
| Domínio C# de produção + testes | **58 PASS**: 25 regressões Work 1 + 33 casos Work 3 | `domain-checks.txt` |
| Estrutura, assemblies, metadados, cena e hashes originais | **23 PASS** | `structure-checks.txt` |
| Análise sintática Roslyn, gramática C# 9, todos os scripts Assets | **29 ficheiros, zero erros de sintaxe** | `syntax-checks.txt` |
| `git diff --check` | Sem erros | Comando executado antes do commit |
| Compilação/importação Unity 6000.3.28f1 | **NÃO EXECUTADA** | Editor não encontrado neste ambiente |
| NUnit EditMode e PlayMode/Physics/InputSystem | **NÃO EXECUTADOS** | Testes preparados, sem XML produzido |
| iOS/Android, toque real, desempenho e vídeo | **NÃO EXECUTADOS** | Sem dispositivo de teste ligado |

A análise sintática não resolve tipos/APIs Unity e não equivale a compilação do jogo.
O runner .NET compila exatamente os ficheiros Domain de produção, sem imitar Unity com stubs.
As 33 verificações novas também são parametrizadas no NUnit EditMode, mas esse runner Unity não foi executado.

Cobertura executada: parábola analítica, alcance por potência, vento X/Z, repetição com condições iguais,
partição de passos, 5.000 ventos dentro do limite, potências/elevações/vento extremos, rejeição de NaN,
limites de mira, dano/overkill/destruição única, alternância/timeout/configuração do timer,
duplo disparo/vez errada/canhão indisponível, callback antigo, vitória/derrota/empate/sem armas,
boost/cooldown/alvo errado/herói destruído, repetição e limites de 500 intenções de bot.

PlayMode preparado: alvo fino a 400 m/s, prioridade do alvo mais próximo, água antes de alvo submerso,
obstáculo bloqueador, overlap, reuso do pool, saturação de buffer, cancelamento/suspensão,
canhão destruído, dono excluído (teste Work 1), cena real, câmara/muzzle/HUD, tiro do bot,
toque com exclusão de UI, destruição/afundamento e separação dos controlos em três resoluções.

## Reproduzir no Unity

1. Abrir esta branch com Unity **6000.3.28f1**, URP **17.3.0**, Input System **1.17.0**.
2. Executar o setup explícito do Work 1: `Royal Pirate > Prepare Mobile Project`.
3. Abrir `Assets/RoyalPirate/Scenes/Integration.unity` e carregar Play.
4. Arrastar a zona central do mar; ajustar potência na faixa inferior; BOOST arma a habilidade;
   FIRE dispara ao libertar o contacto. O adversário joga após a resolução do impacto.
5. Executar EditMode e PlayMode no Test Runner e guardar XML/logs. Alternativa CLI:
   `UNITY_EDITOR=/caminho/Unity bash Documentation/Combat/run-unity-checks.sh`.

O script exige um Editor já instalado/licenciado, não instala nem ativa licenças e não assume sucesso.
O primeiro import deve gerar packages-lock.json/URP assets conforme o processo do Work 1.

## Handoffs e limitações

- **Work 1:** rever o handoff dos adaptadores Runtime, classes Domain novas e política de derrota sem armas;
  validar API Unity/URP e o ciclo de cenas. Interfaces e schema existentes não foram modificados.
- **Work 2:** substituir apenas os visuais/colliders greybox por módulos reais, conservar IDs e raízes unitárias,
  fornecer Muzzle +Z e pivots de destruição. `BindVisual` permite ligar o visual ao módulo.
  Não há importação/validação do GLB nesta entrega. Mastros/velas dependentes ainda precisam de vínculos
  artísticos e de testes de integração com o prefab final.
- **Work 4:** consumir `HudChanged`/`Snapshot`; ligar comandos públicos `DragAim`, `SetPower`,
  `TryPlayerFire`, `TryAbility`. Desativar `diagnosticHud` e, se substituindo o input, `useDefaultTouchControls`.
  `AdditionalUiBlocker` permite excluir elementos da UI final da área de mira.
- **Work 5:** executar o script Unity, confirmar as 15 instâncias PlayMode previstas (incluindo os dois
  testes originais), testar mudanças de cena, pausa/retoma, duas mãos e toque real. Corrigir erros de import
  ou runtime encontrados; estes ainda não podem ser descartados por inspeção.

Determinismo: integração Domain reproduzível para os mesmos floats, passo, seed e ordem no mesmo runtime.
Unity Physics, IDs de collider e Rigidbody visual não garantem replay idêntico entre dispositivos.
Não é autoridade para competição/economia online. UI, navios, herói e VFX continuam provisórios.
O shader de partículas tem fallback para material Lit se removido pelo stripping; validar aparência na build.

## Metas mobile e próximas tarefas

Metas, NÃO medições: 60 fps no dispositivo de referência; mínimo estável de 30 fps e p95 <=33,3 ms;
memória residente <=500 MB; caminho físico habitual sem alocação por consulta; `OverflowQueries=0`
no cenário de produção esperado. Dois projéteis pré-criados, no máximo um disparo ativo por combate;
seis pools de partículas com teto total de 288 partículas e um Rigidbody por módulo não-casco destruído.
O HUD de diagnóstico aloca strings e não está incluído na meta de zero GC do caminho físico.

Próxima validação: importar/compilar, executar EditMode/PlayMode, rever enquadramento no Editor,
10 batalhas completas por dispositivo e sessão de 20 minutos com Profiler. Registar modelo, SO, commit,
frame p50/p95/p99, GC, memória, draw calls, temperatura, entrada em background e retorno.
Usar iPhone e Android existentes; nenhum equipamento foi comprado.
Depois: integração artística Work 2, UI final Work 4, ajuste da precisão do bot/equilíbrio do boost
com resultados reais, e revisão/merge sequencial pelo Work 1.

## Proveniência, orçamento e fontes técnicas

Código criado para este projeto; nenhuma imagem/asset de terceiros foi copiada para o jogo.
Fontes técnicas consultadas para o adaptador (não são prova de execução):
- https://docs.unity.com/en-us/engine/6000.3/script-reference/unityengine/physics/raycastnonalloc
- https://github.com/Unity-Technologies/InputSystem/blob/develop/Packages/com.unity.inputsystem/Documentation~/touch-polling.md

**Despesas realizadas: 0 €.** Sem serviços/CI pagos, compras, publicação em lojas ou alteração de infraestrutura.
