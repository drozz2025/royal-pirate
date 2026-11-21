# ROYAL PIRATE — GitHub Pages e ChatGPT Sites (18-11-2026)

## Fonte única de verdade
- Código: [drozz2025/royal-pirate](https://github.com/drozz2025/royal-pirate), integração em `work6/web-3d-preview`.
- Jogo público com deploy automatizado verificado em GitHub Actions: https://drozz2025.github.io/royal-pirate/
- URL de ChatGPT Sites indicada pelo proprietário: https://royal-pirate.ricardomalheiro.chatgpt.site/

## Estado da ligação
**Não existe sincronização GitHub Pages → ChatGPT Sites comprovada.**
A execução GitHub Actions atual **não publica** no URL `.chatgpt.site`; uma verificação de HTTP 200 não prova igualdade de conteúdo nem autoriza alteração de publicação.
A documentação oficial atualmente consultável descreve a **edição e a publicação autenticadas pelo proprietário/editor do Site** (revisão do preview, guardar versão e publicar). Não documenta uma ligação automática de GitHub Actions, um espelho de GitHub Pages ou um ficheiro `.openai/hosting.json` que por si mesmo ligue o repositório ao Site existente. Não foi confirmada nesta sessão uma API de publicação autenticada nem acesso editor ao Site. Não criar automaticamente um segundo Site nem alterar o domínio.

Documentação oficial:
- https://learn.chatgpt.com/docs/sites/managing-a-site
- https://help.openai.com/en/articles/20001339-creating-and-using-chatgpt-sites

## Atualização do Site existente quando houver sessão autorizada
1. Abrir **Sites → ROYAL PIRATE** no ChatGPT Work/Codex com a identidade proprietária/editora.
2. Usar a revisão aprovada do GitHub (`work6/web-3d-preview`) como código de referência; confirmar se o projeto local suportado pelo editor é o **mesmo** Site, sem criar cópia divergente.
3. Rever o preview no viewport nativo 384×512 e em 320×568, 390×844, 430×932 contra `assets/design-approved/00-referencia-original-aprovada.webp` e `01–08`, testar disparo real, Porto e dock.
4. **Guardar versão**, verificar que aponta ao commit pretendido, e só depois **publicar** no mesmo endereço; comparar a versão visível e funcionalidade em GitHub Pages e Sites.
5. Guardar evidência (commit SHA, versão, hora, capturas e respostas HTTP). Se não houver permissão, não publicar nem assumir integração.

## Guardrails
- Sem recursos pagos, sem credenciais no Git, sem redirecionar o domínio Sites, sem funcionalidades novas, Unity ou multiplayer.
- `approved:false` / 0 de 8 ecrãs até revisão humana. Alterações visuais menores não significam aprovação.
- Um único WORK é proprietário de cada conjunto de ecrãs; WORK0 coordena merges e deploys.

## Auditoria read-only em 21-11-2026 (WORK0, 03h Lisboa)
- Fonte publicada **com prova anterior de build/deploy/HTTP**: `work6/web-3d-preview` commit `10830c86f5a3bb2987333e55c0b58d9faacb71d1`, versão **v0.1.117**, [GitHub Actions #44737072556](https://github.com/drozz2025/royal-pirate/actions/runs/44737072556). Isto não aprova artisticamente os oito ecrãs.
- Nova tentativa de build do **candidato não publicado** PR [#696](https://github.com/drozz2025/royal-pirate/pull/696), commit `231442ee`, falhou no `npm test`: escala de galeão desatualizada num teste e uma comparação SwiftShader com jitter de 1/255. Logs: [Actions #44853372502](https://github.com/drozz2025/royal-pirate/actions/runs/44853372502), [QA Batalha #44853372555](https://github.com/drozz2025/royal-pirate/actions/runs/44853372555). A alteração do candidato é **não publicada**.
- O passo HTTP do workflow falhado registou **Pages HTTP 200, v0.1.117, 3 assets; Sites HTTP 200, versão não identificada, 3 assets**. Esta observação não prova que os sites sirvam o mesmo código. A avaliação foi somente de leitura; nenhum pedido autenticado de publicação a Sites foi executado.
- Correções de regressão aplicadas somente no PR #696 em `285e5a4` e `726461e`. Testes novos seguem CI; não constituem prova de deploy ou autorização artística.
- [Documentação oficial OpenAI](https://help.openai.com/en/articles/20001339-creating-and-using-chatgpt-sites), consultada em 21/11/2026: o proprietário/editor abre o Site existente, revê preview, guarda versão e publica. Descreve automações *dentro* de Sites, mas não documenta uma API externa GitHub Actions → Sites nem um vínculo de origem para publicação automática. A ligação não está configurada. A ligação GitHub a ChatGPT para leitura de código também [não é uma sincronização de deploy](https://help.openai.com/en/articles/11145903-connecting-github-to-chatgpt).
- **Alternativa segura de custo zero:** GitHub continua a fonte única e o Pages continua a URL jogável; depois de aprovação 8/8, utilizar no **mesmo** projeto Sites uma sessão de proprietário/editor no ChatGPT Work/Codex, referenciar o commit exato, guardar versão, publicar conscientemente e provar igualdade por SHA/asset fingerprints, capturas e testes de interação nos dois domínios. Sem acesso autenticado ou revisão humana, não alterar Sites, domínio ou a release do Pages.

## Auditoria adicional de 21-11-2026, ~08h UTC
- Nas branches GitHub verificadas, **não existem** `.openai/hosting.json` ou `.openai/sites.json` em `work6/web-3d-preview` (GitHub Contents API devolveu 404). A ausência de tais ficheiros **não prova** que Sites não ofereça outras integrações autorizadas; apenas impede afirmar que esta ligação já está configurada.
- A documentação oficial [Criar e utilizar Sites](https://help.openai.com/en/articles/20001339-creating-and-using-chatgpt-sites), consultada de novo em 21/11, diz para abrir o **Site existente**, rever alterações, guardar uma versão e publicá-la. Nem a ligação de leitura GitHub ao ChatGPT cria um deploy para `.chatgpt.site`: [Conectar GitHub](https://help.openai.com/en/articles/11145903-connecting-github-to-chatgpt).
- O navegador autenticado do proprietário não estava disponível nesta execução e não houve ferramenta autorizada de escrita de Sites; por isso, **nenhuma chamada de publicação ou sincronização** foi feita. Ao contrário de uma verificação HTTP 200, só commit/versão + capturas + interação no mesmo release podem demonstrar paridade.
- Candidato de código na [PR #696](https://github.com/drozz2025/royal-pirate/pull/696) recebeu duas correções de Frota da comparação original WORK4, mas continua **Draft, 0/8 de aprovação artística e sem deploy**. Até passar todos os gates, deixar Pages e o Site tal como estão.
