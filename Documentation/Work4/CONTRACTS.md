# Handoff técnico Work 4 → Work 1 / 2 / 3 / 5

## Propriedade

Tudo é aditivo. Não foram editados Domain, Services, Runtime base, Editor base, Integration, Packages, ProjectSettings, modelos, referências nem documentos centrais. A branch assenta na tree exata publicada pelo Work 1. Scripts próprios em Runtime/Progression e Runtime/UI, cena em Scenes/Shipyard, prefab em Prefabs/UI, dados/estilos em UI/Resources, testes sob Tests/Work4 e ferramentas/documentação próprias.

## Contratos reutilizados sem alterações

| Contrato | Utilização |
| --- | --- |
| `ShipCatalog`, `MountDefinition`, `ModuleDefinition` | IDs, posição, tipo, custo base, máximo de nível, HP e dano vêm de Navio01.json. |
| `ShipLoadout`, `ModuleInstallation` | Uma montagem; UUID e níveis conservados ao persistir/exportar para batalha. |
| `SandboxShipyard` | Instalar/melhorar, cobrança, revisão e limites. Executa sobre cópia transacional. |
| `IProgressStore`, `LocalLoadoutStore` | Projeção validada de entrada na cena de integração existente. |
| `IAccountService`, `IRewardService`, `IPurchaseService`, `IRewardedAdService`, `ILeaderboardService`, `IDailyMissionService`, `IProgressionService` | Portas online mantidas; não implementadas com autoridade local falsa. |

## Aditivos propostos para revisão Work 1

`PlayerProgress` (schema 1, environment offline-sandbox) agrega loadout e wallet; a revisão do agregado inclui também heróis, etapa, recompensas e settings. A revisão de `ShipLoadout` só muda com módulos. `ProgressionSession` aplica copy → validar → guardar → publicar. `Snapshot` e `BattleLoadout()` retornam cópias profundas. Falha em disco não altera saldo nem montagem em memória. `IPlayerProgressStore` / `IProgressCodec` isolam agregação/serialização sem substituir `IProgressStore`.

`EconomyConfig` é JSON versionado carregado de Resources e validado ao iniciar. Custos dos módulos continuam na fonte Work 1, evitando duas fontes. Etapas/heróis/recompensas/planeamento de frota vivem em Work4Economy.json. Uma futura fonte remota deve entregar uma configuração versionada validada; não aceitar preços/recompensas enviados pelo cliente como autoridade. Não há SDK de configuração remota nesta entrega.

Construir/melhorar equipa no máximo nível definido pelo catálogo. Remover é operação sandbox aditiva, proíbe casco, não reembolsa, remove equipamento associado e incrementa revisão. Não foram inventadas dependências físicas entre mastros/velas; a aceitação estrutural permanece a do contrato Work 1.

## Work 2 — integração visual

`ShipArtBindings` ScriptableObject: entries `definitionId`, `stage`, `prefab`; selecionar maior stage <= atual. Ausência de binding mantém geometria provisória identificada. Origem do prefab no encaixe; Y up, Z forward, metros, escala de raiz 1; sem scripts de economia/dano. A seleção usa `MountTarget` com ID persistente e `GetComponentInParent` do collider. O adapter não redimensiona modelos finais para caixas. Conferir pivots, colliders e transparência no Unity antes de aprovar.

A geometria provisória usa os tamanhos/posições reais do catálogo Work 1. O preview não instancia `ModuleState` nem aplica dano. Cenário, água, glints e materiais temporários pertencem à vista e são destruídos com ela; materiais são reutilizados entre reconstruções. RenderTexture redimensiona apenas quando o tamanho muda e é libertada ao destruir a vista.

## Work 3 — ligação de HUD e batalha

`IBattleHudSource` em RoyalPirate.UI tem Current + evento Changed e comandos RequestFire, SetPower e RequestAbility. `BattleHudPresenter` só apresenta snapshots e emite intenções; dispose remove subscrição. O controlador de combate deve autorizar os comandos mesmo quando um botão está visualmente desativado. Vento mantém a unidade do Work 1 (aceleração m/s²).

O botão Battle do Harbour grava `Session.BattleLoadout()` através de `IProgressStore` e só depois abre Integration. Falha no export impede a transição. BattleReturnButton acrescenta apenas uma ação de saída, sem alterar a cena original. O protótipo de combate mantém a sua UI atual; o novo HUD não está ligado a membros privados por reflexão e não corre combate duplicado.

Falta coordenar transporte dos `HeroProgress` equipados (IDs, abilityId, level e mountId) para o controlador final. Não implementar habilidades no Work 4. Recompensas battle.win/battle.loss estão configuradas, mas nenhum botão emite moedas por vitória fictícia. Work 1/3 devem definir confirmação de resultado/claim; produção usa IRewardService com claim de servidor.

## Work 5 — gates de aceitação

Sem compilação Unity não há aceitação técnica. Os testes de .NET não validam JsonUtility, importadores, materiais, UI Toolkit, eventos, física, API compatibility, touch, resolução real ou filesystem mobile. Testes Unity incluídos estão preparados, não aprovados. Work4Setup é uma ação explícita para ligar resources e cenas; não há mutação automática do projeto ao importar.

Testar dois cliques rápidos, revisão obsoleta, max level, saldo insuficiente, casco protegido, remoção de slot com herói, reinício, backup corrompido, versão futura e falha de escrita. Capturar logs/XML/screenshots e testar hardware iOS/Android antes de promover PR.

## Fontes oficiais consultadas para APIs de UI

- https://docs.unity.com/en-us/engine/6000.3/manual/uitoolkits/uielements/uie-events/reference/uie-pointer-events
- https://docs.unity.com/en-us/engine/6000.3/manual/uitoolkits/uielements/uie-support-for-runtime-ui/uie-render-runtime-ui/uie-runtime-event-system
- https://docs.unity.com/en-us/engine/6000.3/script-reference/unityengine/uielements/background/fromrendertexture

São referências de API, não provas de execução do projeto.
