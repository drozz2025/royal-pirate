# Arquitetura — contratos v0.1

## Decisões
- Unity 6.3 LTS 6000.3.28f1, URP 17.3.0, Input System 1.17.0, Test Framework 1.4.6. Dependências públicas gratuitas; compatibilidade final depende da primeira resolução/importação real.
- Domínio C# independente do motor; adaptadores Unity isolam apresentação, entrada e colisões. Sem dependências de Unity no assembly Domain.
- Uma única `ShipLoadout` liga estaleiro, persistência e batalha. A batalha cria `ModuleState` separado; dano de batalha não altera níveis nem a montagem guardada.
- Coordenadas: metros, Y para cima, Z para a proa, X para estibordo. Origem na linha de água ao centro do casco. Rotação do adversário não altera dados de montagem.
- IDs de definição estáveis (`module.cannon.01`), IDs de posição (`mount.cannon.01`), IDs de instância UUID, revisão monotónica e versão de schema. Não utilizar nomes de GameObjects como identidade persistente.

## Assemblies
| Assembly | Dependências | Responsabilidade |
| --- | --- | --- |
| RoyalPirate.Domain | System | Dados, validação, balística, dano, turnos, contratos de serviços |
| RoyalPirate.Services | Domain, UnityEngine | Save local de desenvolvimento; comércio desativado |
| RoyalPirate.Runtime | Domain, Services, Input System | Construção visual, projéteis, colisões e cenário de integração |
| RoyalPirate.Editor | Runtime, URP/Core | Preparação explícita do projeto |
| RoyalPirate.EditModeTests | Domain, Services, Test Framework | Regras, transações sandbox, persistência |
| RoyalPirate.PlayModeTests | Domain, Runtime, Test Framework | Colisões físicas e exclusão do navio de origem |

## Organização
Tudo o que o Unity importa fica em `Assets/RoyalPirate/`: Scenes, Scripts, Prefabs, Ships, Characters, Weapons, Materials, Animations, VFX, UI, Audio, Data, Tests, Documentation e Editor. `Modelos_3D` e `Referencias_Visuais` preservam fontes fora de Assets. Documentação de coordenação na raiz e em `Documentation/`.

## Navios e combate
`ShipCatalog` define módulos/encaixes; `ShipLoadout.Validate` rejeita duplicados, níveis inválidos, tipos incompatíveis e ausência de casco. `SandboxShipyard` cobra apenas após validar e rejeita revisão obsoleta. `ShipView.Assemble` instancia a montagem e associa cada collider ao seu `ModuleView`/`ModuleState`. Na primeira entrega, o casco destruído implica derrota mesmo que peças secundárias sobrevivam. A barra agregada é complementar ao estado de derrota.

`IWeapon.TryFire` recebe intenção de disparo; `Ballistics.Step` integra aceleração constante de gravidade e vento. O vento nesta versão é aceleração efetiva em m/s², NÃO velocidade meteorológica em m/s. Alterá-lo exige versionar o modelo e testes. `ProjectileView` aplica overlap inicial e sphere sweep por passo, ordena impactos por distância, ignora o navio de origem e resolve uma vez. Sem Rigidbody a integrar novamente a gravidade. Projétil expira aos 7 s; turno em resolução permite 8 s. O Work 3 deve substituir alocações de consultas por buffers/perfis adequados após medir.

`TurnState`: Aiming → Resolving → Aiming do adversário; timeout em Aiming passa o turno; derrota termina a batalha. O bot atual escolhe ângulos/potência, não força acertos. Vento é mantido por turno. Não há replay determinístico entre arquiteturas garantido: Unity Physics/float não são autoridade para resultados comerciais.

## Serviços e confiança
Portas `IAccountService`, `IProgressionService`, `IRewardService`, `IPurchaseService`, `IRewardedAdService`, `ILeaderboardService`, `IDailyMissionService`, `IBattleService` e `IHeroAbility` preparam evolução sem instalar fornecedores. Não são funcionalidades concluídas.

Conta convidada futura será uma conta criada pelo servidor com possibilidade de ligação Apple/Google validada no servidor. Tokens não ficam em PlayerPrefs; adaptador nativo usará armazenamento seguro. Associação exige sessão reautenticada, transação de transferência e resolução explícita de conflitos; nunca fundir saldos pelo cliente.

Moedas, gemas, baús, missões, recompensas e ranking exigem ledger transacional no servidor: preços e relógio do servidor, revisão, idempotência por conta/operação, unicidade de recibos, validação de callbacks publicitários, verificação de recibos Apple/Google, replay protection e rate limit. O cliente pede uma ação/ID de oferta; não envia um saldo autorizado ou prémio a conceder. Resultados de combate deverão ser recalculados/validados pelo servidor. O sandbox local nunca é importado para a economia de produção.

`DisabledCommerce` recusa compras e recompensas. Não há backend nesta fase, logo NÃO se declara economia online protegida ou login funcional. O save local é não confiável, limitado a 64 KiB, validado e substituído com backup. A integridade estrutural impede estados inválidos, mas não prova que uma melhoria foi ganha; o servidor será a autoridade.

## URP móvel e desempenho
Setup explícito: HDR desligado, MSAA 2x, escala 1, distância de sombras 35 m, sem texturas de profundidade/opaca obrigatórias; uma luz direcional. Priorizar URP Lit/Simple Lit, atlas, instancing, LOD e colliders simples. Arte do navio deve ter módulos substituíveis sem alterar contratos. Retarget de renderer/materials requer revisão Work 1 + Work 2.

Metas provisórias, não medições: 60 fps no dispositivo de referência, fallback estável 30 fps no mínimo; p95 de frame ≤ 33,3 ms no mínimo, memória residente ≤ 500 MB, zero alocação recorrente no caminho físico após otimização. Escopo inicial: duas embarcações, 50k triângulos por navio em LOD0 como teto preliminar, até 3 materiais por navio, atlas até 2K; validar antes de congelar limites.

## Fontes verificadas em 14/11/2026
- https://unity.com/releases/editor/whats-new/6000.3.28f1
- https://docs.unity.com/en-us/engine/6000.3/manual
- https://docs.unity.com/en-us/engine/6000.3/manual/render-pipelines/universal-render-pipeline/requirements
- Registry oficial: https://packages.unity.com/com.unity.test-framework e https://packages.unity.com/com.unity.inputsystem

As notas da versão registam problemas de rotação Android, regresso do background e mudanças repetidas de cena. São casos obrigatórios da matriz Work 5; não assumir que retrato elimina o problema de rotação física.
