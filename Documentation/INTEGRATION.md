# Regras de integração entre Works

## Branches
- Work 1: `work1/unity-foundation-20261114` (fundação atual); seguintes `work1/<tema>`.
- Work 2: `work2/navio01-art`; Work 3: `work3/naval-combat`; Work 4: `work4/shipyard-ui`; Work 5: `work5/unity-device-validation`.
- Cada chat lê GitHub antes de alterar. O estado de outro chat não é prova de merge. Não criar commits diretos em main. Não fazer force push, apagar branches ou alterar proteção sem necessidade/autorização.

## Propriedade de ficheiros
| Zona | Dono principal | Coordenação necessária |
| --- | --- | --- |
| Scripts/Domain, Services, Packages, ProjectSettings, Editor, Scenes/Integration | Work 1 | Qualquer outro Work propõe alteração separada com motivo e testes |
| Ships, Characters, Weapons, Materials, Animations, Prefabs/Art, Modelos_3D | Work 2 | Materiais URP e pivots partilhados com Work 3 |
| Scripts/Runtime/Combat (a criar), VFX, Audio, Scenes/Combat | Work 3 | Adaptadores iniciais em Runtime devem ser transferidos por PR coordenado antes de editar |
| UI, Scripts/Runtime/UI e Progression (a criar), Scenes/Shipyard | Work 4 | Consome Domain; não redefine IDs/saves/economia |
| Tests, Tools, Documentation/Reports | Work 5 | Work 1 conserva os testes iniciais até handoff; mudanças coordenadas |
| README/ARCHITECTURE/ROADMAP/TASKS/CHANGELOG e documentos centrais | Work 1 | Outros Works escrevem relatório no seu diretório, sem sobrescrever o estado global |

Não é um bloqueio automático do GitHub; é política de trabalho. main foi observado sem proteção. Não foram alteradas definições externas. Antes de dois Works editarem o mesmo ficheiro, registar em TASKS qual PR transfere a propriedade; esperar merge ou combinar uma única branch de integração.

## Contratos e assets
- Classes/ficheiros PascalCase, namespaces `RoyalPirate.<Area>`, IDs persistentes minúsculos com pontos, cenas/prefabs PascalCase. Não renomear IDs lançados; migrar schema.
- Um MonoBehaviour/ScriptableObject público por ficheiro com nome igual. Sempre enviar `.meta` com asset/pasta e preservar GUID; não regenerar metas existentes.
- Texto Unity em Force Text. Evitar dois editores a alterar a mesma cena/prefab; cenas de trabalho separadas e prefabs encaixáveis.
- Nenhum `Library`, cache, build, token, credencial ou chave em Git. Binários atuais pequenos entram em Git normal; estudar LFS antes de ficheiros grandes, sem ativar custos.

## PR e revisão
1. Sincronizar a base; documentar tarefas e ficheiros possuídos.
2. Entregar mudança pequena, testes e evidência. PR deve declarar editor, plataformas executadas, outputs, limitações, despesas e dependências.
3. Work 1 revê contratos, referências, licenças, diffs e regressões. Work 5 executa o conjunto necessário.
4. Merge sequencial após validação. Não declarar self-review como aprovação independente; draft fica aberto até provas exigidas.
5. Atualizar changelog e TASKS com commit/PR. Não inventar resultados nem propagar sucesso de outro ambiente sem logs.

## Handoff inicial
Apenas Work 1 está a executar nesta sessão. Os outros Works são tarefas para chats separados; não foram iniciados nem concluídos automaticamente. Não ativar GitHub Actions ou serviços pagos nesta fase. O PR da fundação deve permanecer draft enquanto a importação/compilação Unity estiver por validar.
