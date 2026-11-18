# ROYAL PIRATE — CONTRATO VISUAL FINAL DO PORTO

**Decisão do proprietário: 15/11/2026 ~11h56 (Portugal). PRIORIDADE ABSOLUTA.**

## Referência vinculativa
- A imagem de Porto aprovada pelo utilizador mostra um navio pirata com velas pretas, água turquesa, cais em madeira, cidade costeira e farol. Layout de referência em `assets/design-approved/01-porto.webp` e `assets/design-approved/00-referencia-original-aprovada.webp`. O utilizador voltou a apresentar esta composição e insistiu em fidelidade **1:1 à organização, proporções, hierarquia e linguagem gráfica**.
- O objetivo é **recriar a experiência funcional com arte/código original**, não usar uma imagem estática como a própria aplicação. Não copiar material de jogos terceiros.
- **Não inventar molduras, painéis, etiquetas, barras largas, botões repetidos, cartões ou caixas** que não existam na composição aprovada.

## Ecrã inicial — posições e elementos
1. **Topo esquerdo:** retrato circular de capitão; nível e barra fina de progresso, discretos. Dados devem ser reais do perfil local (não exibir níveis/XP falsos da arte).
2. **Topo centro:** logótipo original ROYAL PIRATE, sem caixa exterior.
3. **Topo direito:** recursos em contadores pequenos alinhados verticalmente ou em linha, engrenagem de definições; mostrar apenas recursos realmente existentes (moedas locais etc.), nunca moedas premium fictícias.
4. **Centro da cena:** **navio 3D grande, destacado, livre de sobreposições**, no porto tropical com oceano, cais, edifícios costeiros, farol e céu luminoso. Manter navio 3D interativo **no próprio Porto**: toque no casco, arrastar para orbitar, gesto pinch para zoom, sem ecrã de inspeção nem botão "VIEW SHIP IN 3D". Gestos não podem bloquear a navegação.
5. **Lateral esquerda:** três botões pequenos, individuais, estilizados em madeira/moldura naval: **ARENA**, **BAÚS**, **EVENTOS**. Sem painel largo que os agrupe. Funções pendentes identificadas honestamente; não fingir liga e troféus globais.
6. **Lateral direita:** três botões pequenos do mesmo estilo: **RECOMPENSAS**, **MISSÕES**, **OFERTAS**. Sem duplicação de destinos: se um botão existir como atalho contextual e a secção existir também na barra inferior, os dois têm de ter funções distintas (por exemplo, contador de claim vs página de missões), ou reduzir o atalho a indicador de notificação. Não inventar promoções/IAP.
7. **Zona inferior, acima da navegação:** **BATALHA!** grande e vermelho, com espadas douradas, ação real de entrar no combate naval. Pequeno baú cenográfico no canto inferior esquerdo, sem criar segunda mecânica fictícia de saque.
8. **Barra inferior:** cinco botões grandes alinhados: **PORTO, FROTA, CARTAS, LOJA, RANKING**. Ativo Porto realçado em dourado. Sem botões adicionais FORGE/FLEET em cima a duplicar navegação; **Forja** acessível dentro de Frota/Melhorias.
9. **Diário/recompensas:** NÃO colocar barra grande "DAILY SUPPLY ROUTE", nem placa central "THE ROYAL CROWN / TOUCH THE SHIP". Calendário completo de 7 dias dentro de Missões/Recompensas; acesso contextual compacto, como na imagem, sem tapar o navio.

## Ordem de implementação
A. Harmonizar primeiro HTML/React+CSS do Porto com esta composição de referência. Remover estilos legados que introduzem painéis opacos, barras grandes ou caixas extras.
B. Reutilizar as funções reais já existentes e preservar as rotas da app, dados locais, batalhas e navegação, acessibilidade, safe areas iPhone e PWA.
C. Recuperar o cenário 3D original/procedural do Porto e enriquecer sem substituir por imagem fixa. Navio visível, central, grande e manipulável.
D. Fazer testes de render, cliques, navegação, toque/pinch, estados de recompensas e versão; validar visualmente por captura de browser mobile quando disponível. Se não houver teste visual real, NÃO alegar paridade 100% alcançada.
E. Branch de feature, PR para `work6/web-3d-preview`, CI `npm ci`, `npm test`, `npm run build`, merge só CI verde, verificar publicação real HTTP e cache PWA antes de chamar "publicado".

## Definição de pronto
- Comparação visual lado a lado à referência aprovada em viewport vertical iPhone, sem caixas extras.
- Navio permanece a zona de atenção principal; nenhuma placa ou barra atravessa o casco.
- Menus operacionais, nenhum botão morto disfarçado de função.
- Batalha e progresso local sem regressões.
- Não trabalhar agora em navios finais nível 1–20, multiplayer, login/SDK, pagamentos ou ranking mundial. Work 2 em pausa.
- Orçamento: **0 €**. Não mexer em `main`, Unity ou ChatGPT Sites.

**Este documento é um contrato de design e ordem de execução; a sua existência não significa que a interface já tenha sido implementada.**
