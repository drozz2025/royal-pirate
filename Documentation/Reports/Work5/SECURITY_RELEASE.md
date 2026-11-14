# Segurança, monetização e publicação

Preparação em 14/11/2026. Estado: **NÃO RECOMENDADO PARA PUBLICAÇÃO**. Não há pagamentos, contas de loja, SDKs de publicidade ou backend provisionados por este Work. Não foram executados testes externos intrusivos nem transações reais.

## Fronteiras de confiança e testes pendentes

| Superfície | Regra necessária | Casos de aceitação quando implementada |
| --- | --- | --- |
| Moedas/gemas/melhorias | Servidor autoriza preço, oferta, saldo e revisão; ledger transacional | Valor negativo/overflow, preço adulterado, retry, concorrência, revisão velha e conta alheia; nenhuma cobrança/entrega parcial |
| Recibos Apple/Google | Verificação servidor/plataforma; unicidade por transação e conta; estado confirmado antes de conceder | Falso, cancelado, pendente, expirado/revogado, restaurado, replay, produto/conta incorretos; zero compras reais |
| Entrega | Idempotência persistente; outbox/reconciliação; acknowledgement conforme SDK/plataforma | Crash antes/depois de verificar/conceder, timeout após commit, duplicado em segundo dispositivo; entrega uma vez |
| Anúncios | Test ads; callback autenticado do fornecedor, sessão/nonce, claim único | Indisponível, fechado cedo, offline, callback repetido/falsificado; não premiar só por evento local |
| Combate/ranking | Servidor valida sessão, sequência, loadout e resultado | Resultado inventado, tiro fora de turno, dano/potência adulterados, replay; nenhuma escrita direta de score |
| Save local | Dados não confiáveis, limite e schema; backup recuperável | Truncado, grande, IDs/níveis inválidos, principal ausente, backup corrupto, disco cheio; não promover sandbox a dinheiro real |
| Convidado e Apple/Google | Identidade criada/validada no servidor, tokens em armazenamento seguro | Associação reautenticada, conta já ligada, token inválido, expiração, progresso concorrente; não somar saldos no cliente |
| APIs/credenciais | AuthN/AuthZ por recurso, rate limits, logs redigidos, segredos só servidor/CI autorizado | Acesso cruzado entre contas, replay, enumeração, abuso; apenas ambientes próprios autorizados |
| Eliminação/recuperação | Apagar conta e dados associados segundo política; retenções justificadas | Revogar sessões, sincronizar apagamento, restauro sem reintroduzir dados apagados |

O scanner implementado deteta conflitos, ficheiros de assinatura e padrões de credenciais de alta confiança sem imprimir valores. Não é uma auditoria completa de segredos/histórico/dependências. Criptografar/HMAC com chave embutida no app não torna a economia local autoritativa. Os testes existentes de `DisabledCommerce` apenas confirmam recusa de operações, não certificam IAP.

## Privacidade / RGPD

Antes de conta/analytics/ads: inventário de dados e SDKs, responsável/contacto, finalidade/base legal por tratamento, minimização, retenção, processadores/transferências e procedimento de direitos (acesso, correção, apagamento, portabilidade quando aplicável). Avaliar público etário e consentimento apropriado; não presumir consentimento parental nem classificação etária. Configurar disclosures de loja a partir do tráfego e SDKs realmente presentes.

A política tem de corresponder ao produto e estar acessível dentro da app e numa página pública. Login convidado local não deve ser anunciado como conta recuperável na cloud. Não entregar uma política final com dados de empresa ou práticas inventadas. Rever conformidade antes de distribuir.

## Checklist de submissão

Todos os itens por validar, salvo código/ferramentas explicitamente documentados no relatório de execução.

- [ ] Proprietário/editor legal, contactos, suporte, territórios e identidades únicas (bundle ID/package name) confirmados.
- [ ] Pesquisa de nome/marcas ROYAL PIRATE nos mercados pretendidos e revisão de direitos/licenças de arte, música e fontes; nome ainda não legalmente verificado.
- [ ] Ícone e capturas/vídeo de gameplay real nas dimensões atuais das consolas; descrição honesta, sem capacidades ainda ausentes; originais aprovados pelo proprietário.
- [ ] Questionários de classificação etária, audiência e conteúdo preenchidos; idade não presumida por ser cartoon.
- [ ] Política de privacidade pública/in-app, termos adequados e contacto; App Privacy/Data safety refletem todos os SDKs e dados; permisos mínimos e purpose strings.
- [ ] Apple: build com Xcode/SDK exigidos, assinatura/provisionamento fora do Git, build/version únicas, privacidade de SDKs/required-reason APIs verificada, revisão de login e tracking se aplicáveis.
- [ ] Google: target API exigido, AAB/assinatura segura, compatibilidade de bibliotecas nativas/arquiteturas e páginas de memória segundo requisitos vigentes; conferir consola e build final.
- [ ] Compras e anúncios só com sandbox/testers/test ads; produtos/estados/entrega/restore/cancelamento/pendentes testados. Sem compra real para “testar”.
- [ ] Conta: recuperação/associação e eliminação in-app; recurso externo de eliminação Google quando houver criação de conta. Conta de demonstração e notas para reviewers por canal seguro.
- [ ] TestFlight e Google Play internal/closed testing com builds realmente instaladas; relatórios de crash/ANR e dispositivos completos.
- [ ] Evidência técnica: compilação, suites, partidas, saves, economia, segurança e perfis no SHA/build candidato; zero S0/S1 abertos.
- [ ] Requisitos aplicáveis à conta pessoal Google cumpridos; confirmar tipo/data da conta e acesso de produção na consola.
- [ ] Revisão de requisitos oficiais novamente na data da submissão; aprovação expressa do proprietário antes de enviar build ou pagar qualquer taxa.

## Fontes oficiais consultadas em 14/11/2026

Requisitos consultados, não aprovação jurídica/técnica nem submissão:

| Fonte | Implicação a confirmar na build/conta |
| --- | --- |
| [Apple SDK requirements](https://developer.apple.com/news/upcoming-requirements/?id=04282026a) | Desde 28/04/2026, Xcode 26+ e SDK iOS 26+ para uploads; isso não obriga deployment target iOS 26 |
| [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) | Revisão de conteúdo, pagamentos, privacidade, login, publicidade e informação da app |
| [Apple account deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app/) | Criação de conta requer iniciar eliminação dentro da app |
| [Apple review information](https://developer.apple.com/help/app-review/before-submitting-for-review/complete-review/) | Fornecer acesso de demonstração e informação completa para funcionalidades restritas |
| [Google target API](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en-be) | Página consultada indica API 36/Android 16 para novas apps/updates desde 31/08/2026; confirmar novamente na consola |
| [Google personal-account testing](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en-GB) | Contas pessoais criadas após 13/11/2023: pelo menos 12 testers continuamente 14 dias em closed testing antes de pedir produção; acesso não é automático |
| [Google User Data](https://support.google.com/googleplay/android-developer/answer/10144311) | Política pública e na app; Data safety; eliminação in-app e recurso externo quando existe criação de conta |
| [RGPD — EUR-Lex](https://eur-lex.europa.eu/eli/reg/2016/679) | Princípios, direitos e proteção de dados desde a conceção; mapear obrigações ao tratamento real |

Dependências: Work 1 (build/assinatura/backend), Work 2 (assets/licenças), Work 3 (combate), Work 4 (UI/progressão/monetização), proprietário (contas/dispositivos/aprovação). Sem despesas autorizadas além de 0 €.
