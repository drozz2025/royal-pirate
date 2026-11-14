# Entrega Work 5 — 14/11/2026

**Decisão: manter PR draft. Não recomendar lançamento.** Implementação QA feita; compilação Unity e execução física mobile ainda bloqueadas por falta de editor/licença/dispositivos disponíveis nesta sessão.

## Testes preparados e executados

| Conjunto | Preparados | Efetivamente executados | Resultado |
| --- | ---: | ---: | --- |
| Novos cenários de domínio (também NUnit EditMode) | 34 | 34 em .NET 8.0.428 | 34 aprovados, 0 falhados |
| Testes anteriores do domínio Work 1 | 25 checks | 25 em .NET | 25 aprovados, 0 falhados |
| Ferramentas QA: XML, scanner, métricas | 14 | 14 em Python | 14 aprovados, 0 falhados |
| Validação estrutural anterior | 23 checks | 23 em Python | 23 aprovados, 0 falhados; 68 GUIDs/9 assemblies |
| Higiene de fontes | Scanner | Executado | Nenhum padrão bloqueante detetado; não certifica ausência de todos os segredos |
| Novos testes de save Unity | 8 | 0 | Pendente; inclui 2 regressões ativas de recuperação |
| Novos testes de runtime/colisão Unity | 7 | 0 | Pendente |
| Fixture de partidas físicas | 1 teste, configurável 1–10.000 partidas | 0 partidas | Preparado para headless; sem métricas de partidas reais nesta sessão |
| Total de novos casos NUnit | 50 (42 EditMode + 8 PlayMode) | 0 dentro de Unity | Compilação/importação/NUnit não comprovadas |
| CI GitHub / devices / lojas | Workflow, matriz e checklist | 0 | Não executado/ativado |

O cenário de economia executou 1.000 sequências com 60.000 tentativas de melhoria e retries; o de turnos executou 1.000 transições. Não são partidas completas, pagamentos nem prova de equilíbrio. Não somar os 34 cenários executados em .NET a “testes Unity aprovados”.

Durante a sessão, Work 3 publicou `f49d77ba651926fdb5291cca1852f3a02bb12757`. Validámos também a árvore publicada numa cópia temporária:

| Verificação com código Work 3 + testes QA | Resultado executado |
| --- | --- |
| Suite .NET do Work 3 (inclui os 25 checks iniciais) | 58/58 aprovados |
| Novos cenários Work 5 contra domínio Work 3 | 34/34 aprovados |
| Estrutura combinada | 23/23 aprovados |

Isto confirma compatibilidade do domínio nesse snapshot, não compilação Unity nem merge final. Work 3 acrescentou regras de resultado e mitigação de alocações; os respetivos efeitos em Unity continuam por medir. Nenhuma branch dos outros Works foi alterada.

## Problemas e gravidade

- **S1:** Unity/IL2CPP/importação e dispositivos sem evidência; impede integração final e publicação comercial.
- **S1:** principal ausente ignora backup e recuperação seguida de Save pode substituir backup bom por ficheiro corrompido; conclusões por inspeção, reproduções NUnit preparadas e ainda não executadas.
- **S1:** base Work 1 não termina quando ambos perdem armas; Work 3 propõe correção, pendente de integração/validação. Limite de partidas em que ambos continuam a falhar por definir.
- **S0 se monetizar:** economia/auth/IAP de produção não implementados; sandbox local não é protegido contra alteração pelo jogador. Comércio continua desativado.
- **S1/S2:** ausência de medições mobile, configuração de gates, migrações de save e conformidade comercial. Ver RISKS.md.

## Ficheiros e evidência

Alterações exclusivamente aditivas:

- `Assets/RoyalPirate/Tests/QA/`: três assemblies de teste, cinco ficheiros C# de testes/cenários e metas.
- `Tools/QA/`: executor .NET, verificador XML, scanner de fontes, runner Unity, analisador de frames e respetivos unit tests.
- `.github/workflows/qa-release.yml`: execução manual em runner existente de custo zero, nunca hosted por defeito.
- `Documentation/Reports/Work5/`: instruções, matriz, riscos, segurança/publicação, inventário e logs reais.

Logs: `qa-domain.txt`, `baseline-domain.txt`, `qa-tools.txt`, `structure.txt`, `source-hygiene.txt`, `unity-preflight.txt`.
Resultados estruturados: `domain-results.json`, `execution.json` (hashes de fontes), `work3-domain-results.json`, `work3-integration-check.json`.
Validação Work 3: `work3-domain.txt`, `work3-qa-domain.txt`, `work3-structure.txt`.
`unity-preflight.txt` mostra saída 2 / BLOCKED; não existe XML Unity fabricado. O inventário exato está em `FILES.txt`.

## Próximas ações e dependências

1. Work 1 revê este PR dependente da sua fundação; mantém o controlo da integração. Corrigir R02/R03 em Services numa alteração coordenada, com as regressões QA ativas.
2. Integrar Work 3 e posteriormente arte/UI Works 2/4; resolver divergências de base e repetir os checks no commit integrado.
3. Abrir editor 6000.3.28f1 licenciado, guardar packages-lock/settings revistos e executar `run_unity.py --mode core`; anexar XML/logs. Executar simulação física e validar resultado contra gameplay manual.
4. Disponibilizar iPhone/Android existentes e executar matriz real, navegação/progressão e medições antes de recomendar candidato.
5. Configurar runner/check obrigatório apenas quando disponibilidade/licença/custo zero estiverem confirmados. Nenhuma proteção de branch foi alterada por este Work.
6. Validar requisitos comerciais, segurança/backend e pagamentos sandbox quando implementados; pedir aprovação final ao proprietário antes de publicar ou criar despesas.

**Despesas: 0 €.** Sem merge, publicação de builds, transações, compra de recursos ou serviços pagos.
