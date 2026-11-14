# Registo de riscos e bloqueios

14/11/2026; base 7be4af3d. S0: perda de dados/fraude comercial; S1: bloqueante de jogabilidade/lançamento; S2: importante. Uma conclusão por leitura não é um teste executado.

| ID | Gravidade | Evidência / estado | Correção e responsável | Validação de fecho |
| --- | --- | --- | --- | --- |
| W5-R01 | S1 | Sem Unity executável/licenciado identificado; compilação, importação e XML Unity ausentes | Work 1/5: runner/editor existente; resolver packages e setup | Build/importação limpa + XML EditMode/PlayMode no mesmo SHA |
| W5-R02 | S1 | Leitura: LocalLoadoutStore.Load retorna null se principal faltar, mesmo com .bak válido; reprodução NUnit preparada, não executada | Work 1: recuperação quando só existe backup | W5R02 passa; recuperar em Android/iOS |
| W5-R03 | S1 | Leitura: após recuperar .bak, Save faz File.Replace e pode substituir o backup válido pelo principal corrupto; reprodução preparada | Work 1: validar o backup que se conserva e estratégia de recuperação | W5R03 passa; injeção de interrupções/disco cheio |
| W5-R04 | S1 | Base Work 1: ambos sem canhões não terminam. Atualização Work 3 f49d77ba propõe CombatSession.Evaluate com derrota/desarmamento e empate; ainda sem integração Unity | Work 1/3: validar a mitigação e definir limite quando ambos continuam a falhar | Testes contra coordenador real; 1.000 partidas sem bloqueio |
| W5-R05 | S1 | Sem devices disponíveis nesta sessão; FPS/memória/temperatura/bateria não medidos | Work 5/proprietário: inventariar hardware existente | Matriz física e traces aprovados |
| W5-R06 | S0 se monetizar | Sandbox local alterável e sem autoridade remota; contratos de contas/IAP não são implementações | Work 1/4: ledger/validação servidor antes de monetizar; manter DisabledCommerce | Sandbox lojas + idempotência/recibos/replay/acesso entre contas |
| W5-R07 | S1 | Work 2 baseado em main antigo; Work 3 publicou f49d77ba durante QA; Work 4 ainda sem commits próprios na última leitura | Work 1: integrar sequencialmente; evitar duplicar Domain/IDs/saves | Comparar branches atuais, revisão e executar QA na árvore integrada |
| W5-R08 | S2 | Base aloca consultas por passo; Work 3 f49d77ba introduz NonAlloc/pooling com fallback de overflow, ainda não perfilado | Work 3/5: medir comportamento normal e saturação de buffers | Profiler de física/GC, OverflowQueries e regressão de colisão em dispositivos |
| W5-R09 | S1 comercial | Sem política publicada, cadastro completo, marcas verificadas, idade, SDK disclosures, assinatura ou teste interno | Work 1/proprietário: checklist comercial | Evidência nas consolas e aprovação final; nenhum custo automático |
| W5-R10 | S2 | Atualização de schema só rejeita !=1; não há migração v2; guardar pode falhar por IO | Work 1/4: versionar migrações, mensagem de erro e recuperação | Fixtures v1→v2, futuro não sobrescrito, kill/disco cheio |
| W5-R11 | S1 | Actions preparado mas não executado; branch protection não configurada | Work 1: runner zero custo, checks obrigatórios após validar | Falha deliberada impede merge; skipped não substitui XML |
| W5-R12 | S2 | BattleBootstrap cria objetos raiz sem coleção completa de cleanup; possível acumulação em reload/ciclo | Work 3/4: validar ciclo real; ainda hipótese por leitura | 100 entradas/saídas e contagem de objetos/memória estável |

Nenhum risco foi ocultado com Ignore, xfail ou testes que simplesmente aceitam o defeito. R02/R03 ficam ativos na suite principal para exigir correção coordenada. Sem alteração unilateral dos ficheiros Services/Runtime.
