# ROYAL PIRATE — estado da sincronização ChatGPT Sites (WORK0 / #104)

**Fonte única de código:** `drozz2025/royal-pirate`, branch `work6/web-3d-preview`, pasta `WebPreview/`. GitHub Pages publica a build desta branch em https://drozz2025.github.io/royal-pirate/.

**Site existente, a preservar:** https://royal-pirate.ricardomalheiro.chatgpt.site/. A configuração `WebPreview/.openai/hosting.json` identifica o projeto Sites existente, mas **não prova** que GitHub Actions possua credenciais, API ou permissão para o atualizar. Não alterar o slug, o domínio ou a visibilidade sem confirmação do proprietário.

## O que foi efetivamente implementado

`scripts/audit-sites-parity.mjs` realiza verificações **somente de leitura** de ambos os URLs. Examina HTTP, versão explicitamente apresentada no HTML e SHA-256 dos ficheiros JavaScript/CSS da mesma origem. Bloqueia falsos positivos: HTTP 200 isolado, strings de versão escondidas em JavaScript, versões HTML discrepantes ou assets incompletos nunca provam paridade. O passo de auditoria na workflow de Pages é não bloqueante e não guarda credenciais. O código do jogo e o deploy de Pages mantêm-se independentes da disponibilidade do Site.

Os possíveis resultados são `HTTP_UNVERIFIED`, `NO_VALIDATED_RELEASE`, `VERSION_NOT_CONFIRMED`, `ASSET_PARITY_UNVERIFIED`, `ASSET_HASH_MISMATCH` e `ASSET_PARITY_CONFIRMED`. **Mesmo a correspondência de hashes não demonstra sincronização automática nem identidade funcional completa.**

## Bloqueio da publicação automática no Site

A documentação oficial de ChatGPT Sites descreve uma atualização feita pelo proprietário/editor a partir do Site existente, seguida de pré-visualização e publicação. Não está comprovada nesta integração uma API de deployment autenticada do projeto Sites a partir de GitHub Actions. **Nenhum processo GitHub autorizado para publicar no ChatGPT Sites foi disponibilizado ou usado.**

Alternativa simples sem custos adicionais nem divergência de fonte: continuar a publicar em GitHub Pages; manter este URL como versão canónica testável; quando for necessário atualizar o Site existente, abri-lo em **Sites → Editar**, solicitar ao editor que importe a mesma revisão de `WebPreview/`, pré-visualizar e publicar manualmente no projeto original. Depois, executar a auditoria e verificar a jogabilidade em ambos os endereços. Não presumir igualdade apenas por coincidência do número de versão.

Fonte oficial: https://help.openai.com/en/articles/20001339-creating-and-using-chatgpt-sites

## Limites e próxima etapa

A auditoria de ficheiros não substitui as comparações Chromium nos viewports 320×568, 384×512, 390×844 e 430×932. A Batalha permanece `approved:false`: a câmara tem um único canhão central, mas a qualidade do casco, oceano, atmosfera, materiais e HUD ainda exige revisão humana perante `assets/design-approved/02-batalha.webp`. Não lançar versões apenas por redução de MAE ou sucesso da CI.

Proibições: não expor segredos, não ativar serviços pagos, não alterar Porto/dock aprovado, não publicar Sites sem operação autorizada e não declarar 8/8 aprovados.
