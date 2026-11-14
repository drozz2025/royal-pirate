# Work 4 — primeira implementação

Estado: **implementado para revisão; conclusão técnica bloqueada pela ausência de Unity**.
Base remota inspecionada: `work1/unity-foundation-20261114`, commit `7be4af3dd271018c386a2891b95f067e471dba7e`, tree `cfe592be52c712ac01061d3795504a81c5417d0e`.
Branch: `feat/ui-progression`, conforme instrução do utilizador. Nenhuma alteração direta em main.
Unity definido: 6000.3.28f1; URP 17.3.0; Input System 1.17.0. Despesas: **0 €**.

## Abrir e experimentar

1. Abrir o projeto no Unity 6000.3.28f1 e deixar resolver os packages já definidos pelo Work 1.
2. Executar o comando existente **Royal Pirate → Prepare Mobile Project**.
3. Executar **Royal Pirate → Prepare Work 4 Harbour**. Cria o PanelSettings, liga material URP ao bootstrap, guarda o prefab e coloca Harbour em primeiro lugar no Build Settings, conservando as restantes cenas.
4. Abrir `Assets/RoyalPirate/Scenes/Shipyard/Harbour.unity` e entrar em Play.
5. Abrir Shipyard, arrastar a vista, fazer pinch/scroll para zoom, selecionar uma peça na vista ou faixa horizontal, construir/melhorar. O saldo e a montagem são guardados em conjunto após cada ação. Remoção exige dois toques e não reembolsa.
6. Regressar ao menu, parar e reiniciar Play: UUID, moedas, módulos/níveis, heróis, etapas e recompensas devem manter-se.
7. Battle exporta exatamente o `ShipLoadout` atual para `IProgressStore`, que a cena Integration existente consome. O canhão é obrigatório para entrar. `< Harbour` regressa ao menu.

O teste ainda não foi executado no Unity. Não existe APK, IPA, vídeo ou screenshot de execução nesta entrega. A geometria cúbica está identificada como provisória e não cumpre ainda a meta artística premium.

## Funcionalidades

- UI Toolkit vertical: Home, Shipyard, Crew, Fleet, Rewards, Missions, Shop, Ranking e Settings. Ícones vetoriais originais, botões grandes, safe area normalizada e recálculo após resolução/safe area mudar.
- Vista 3D em RenderTexture dentro da interface: câmara orbital, rotação com um dedo/rato, pinch/scroll, seleção por raycast/encaixe, destaque, peças em falta transparentes, água com reflexos geométricos animados e oscilação do navio. Sem física naval nova.
- Construção e melhorias delegadas ao `SandboxShipyard` original. O `ShipLoadout`, IDs, custos e HP do catálogo Work 1 permanecem inalterados. Comparação HP atual/seguinte; ataque mostrado com o valor real do contrato atual, sem inventar escalamento.
- Cinco etapas do Royal Sloop, desbloqueios por etapa, custos em JSON. 24 entradas de frota planeadas; apenas Royal Sloop tem catálogo implementado. Não são 24 navios jogáveis.
- Cinco classes de herói, raridade/XP/nível/habilidade declarada, desbloqueio, equipamento exclusivo por posição, remoção e custo de evolução. Habilidades não são executadas por este Work.
- Moedas/gemas/XP/troféus/baús no agregado. Recompensa inicial, baú e missão de construir/melhorar; claims repetidos recusados. Recompensas de vitória/derrota configuradas, mas sem concessão automática até Work 3 fornecer resultados por contrato revisto.
- Conta convidada local UUID. Apple/Google/recuperação cloud visíveis mas indisponíveis; reutilização dos contratos online já definidos pelo Work 1. Sem tokens ou SDKs instalados.
- Loja apenas apresentação desativada. Não há pagamentos nem anúncios reais; contratos `IPurchaseService`/`IRewardedAdService` mantidos no domínio original.
- `BattleHudPresenter`: HP/percentagens, turno, temporizador, vento (aceleração m/s²), potência, disparo, habilidade, vitória/derrota e resumo de recompensa recebidos de `IBattleHudSource`. Não está ligado ao bootstrap de combate atual; requer adaptador Work 3. Não concede prémios.

## Persistência e confiança

`work4-progress-v1.json` em `Application.persistentDataPath`. Formato agregado v1 contém saldo e montagem na mesma geração; limite 128 KiB, validação estrutural, escrita temporária com flush, substituição atómica e backup. Erro de gravação deixa o estado em memória anterior inalterado. Recuperação de backup preserva o ficheiro corrompido na próxima gravação. Se principal e backup forem inválidos, bloqueia e preserva; se houver schema futuro, bloqueia sem regressar a backup antigo. Não existe migração anterior a v1.

O save legado `loadout-v1.json` é **apenas uma projeção para entrada no combate**, nunca autoridade do saldo. Não se importa silenciosamente um save legado sem carteira correspondente. Nenhum armazenamento local, UUID ou idempotência local prova legitimidade de moeda/recompensa. O sandbox é separado da economia de produção; relógio do dispositivo e ficheiros são manipuláveis. Um único escritor/sessão local por diretório é assumido.

Na produção, aplicar os contratos do Work 1: ledger no servidor, preços/relógio/resultados validados, claims únicos, recibos Apple/Google e callbacks de anúncios verificados no servidor, associação de identidades com resolução de conflitos. Não importar moeda sandbox para produção.

## Testes verificáveis

Consultar `domain-tests.txt`, `foundation-regression.txt`, `syntax-check.txt`, `structure-check.txt`, `work4-assets.txt` e `unity-attempt.txt` neste diretório.

- Work4Checks: **46 verificações passaram**, incluindo **5.000 transações determinísticas** com invariantes e igualdade entre estado persistido e visível. Compila e executa as fontes reais Domain/Progression/AtomicProgressStore com .NET 8; apenas codec substituído por System.Text.Json.
- DomainChecks original: **25 verificações passaram** após a adição Work 4.
- Verificador de estrutura original: **23 verificações passaram**, incluindo hashes das referências/modelo originais e grafo de assemblies.
- Verificador específico Work 4: **9 verificações estruturais passaram**, incluindo cena/prefab, cinco etapas, classes de heróis, frota e isolamento das alterações.
- Parser Roslyn: **31 ficheiros C# sem erros de sintaxe**. Isto não resolve APIs/assemblies Unity e não equivale a compilação Unity.
- Unity: comando de execução devolveu **BLOCKED, exit 2**, sem editor executável. EditMode, PlayMode, URP, carregamento da cena, import de USS/TSS, gestos reais, screenshots e dispositivos **não executados**.

Testes Unity adicionados: cenários de domínio/store com JsonUtility real; quatro casos de safe area; PlayMode para navegação por botões, construir/melhorar/reiniciar, rotação/zoom/rotas, projeção para combate e três resoluções. Os `.meta` de USS/TSS conservam GUID e deixam o Unity gerar detalhes do importer na primeira importação.

Reproduzir fora de Unity:

```sh
dotnet run --project Tools/Work4Checks/Work4Checks.csproj -- Assets/RoyalPirate/Data/Resources/Navio01.json Assets/RoyalPirate/UI/Resources/Work4Economy.json
dotnet run --project Tools/DomainChecks/DomainChecks.csproj -- Assets/RoyalPirate/Data/Resources/Navio01.json
dotnet run --project Tools/Work4Syntax/Work4Syntax.csproj -- Assets/RoyalPirate
python3 Tools/validate_repository.py
```

Com editor instalado/licenciado e ambiente gráfico disponível:

```sh
UNITY_EDITOR=/absolute/path/to/Unity bash Tools/Work4Checks/run-unity-tests.sh
```

## Dependências e próximos passos

1. Work 1: rever os contratos aditivos em `CONTRACTS.md`, compilar/importar e integrar a branch após validação. O comando Prepare Mobile Project reescreve Build Settings para Integration; correr Prepare Work 4 depois dele.
2. Work 2: entregar prefabs por módulo e etapa em coordenadas/escala aprovadas e preencher `ShipArtBindings`. Não se alterou o GLB nem assets do Work 2. Os cinco estágios ainda não têm cinco modelos finais distintos.
3. Work 3: ligar `IBattleHudSource`, decidir transporte de heróis equipados e resultado/recompensa; adotar a configuração validada à entrada. Nenhum bootstrap, arma, balística, dano ou cena de combate existente foi editado.
4. Work 5: executar EditMode/PlayMode e testar arrastar/pinch/cancelamento de toque, suspensão, safe areas reais/Dynamic Island, tamanhos de texto, File.Replace no iOS/Android, RenderTexture, memória/FPS e efeito do shader stripping. Ajustar layout apenas a partir da execução real.
5. Só após isso: modelos premium, balanceamento/playtests, evolução visual das cinco etapas, navios seguintes, autenticação/sincronização e backend autorizado.

Não há evidência de aprovação independente nem de conclusão técnica Unity. O PR deve permanecer draft.
