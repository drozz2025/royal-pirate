# ROYAL PIRATE — APP FIRST: referências e implementação

Estado: 2026-11-15. Decisão do proprietário: **primeiro a aplicação completa e funcional; navios 3D finais e personalização avançada só depois**.

## Fontes e originalidade
- Referências originais já aprovadas e carregadas no GitHub: [assets/design-approved](../../assets/design-approved/README.md) — oito ecrãs e uma visão geral, especialmente 01-porto.webp e 02-batalha.webp.
- Em 15 de novembro, o proprietário enviou **13 capturas adicionais de outro jogo**, em duas mensagens da conversa. São **referências funcionais de UX**, não assets licenciados para uso na app. **Não foram copiadas para esta branch**; utilizar somente as observações e exigências abaixo. Não reproduzir sprites, personagens, fundos, ícones nem a disposição pixel a pixel.
- Castle/castelo -> **navio/porto pirata**; herói -> **tripulante/capitão**; reconstrução -> **estaleiro**; defender castelo -> **combate naval**.

## Mapa de ecrãs e equivalências
| Referência observada | Ecrã ROYAL PIRATE | Requisitos funcionais |
|---|---|---|
| Loja e ofertas com cartões visuais e separadores | **Loja do Porto** | categorias e ofertas verdadeiras; sem preços de dinheiro real até IAP validada |
| Heróis/cartas equipadas, coleção, detalhes e melhoria | **Tripulação** | lista de cartas, equipar/des-equipar, progressão por regras próprias, guardar localmente |
| Classificação com perfil, prémios e posições | **Classificação** | ranking real só com backend; se não existir, ecrã informativo identificado, sem jogadores falsos |
| Introdução VS com equipa equipada | **Preparação da batalha** | apresentar navio, capitão e adversário IA, iniciar combate |
| Batalha com vida, turno, tempo, vento, mira | **Combate naval 3D** | manter a simulação real existente, alvo, potência, disparo, IA e dano; não inventar multiplayer |
| Explosão, destroços, vitória/derrota | **Resultado da batalha** | usar resultado determinístico do motor, registar estatísticas e permitir continuar |
| Ecrã de vitória, recompensas e botão para duplicar | **Espólio** | recompensas reais por regra; anúncios recompensados só quando SDK estiver integrado |
| Presente diário por 7 dias | **Recompensas diárias** | reclamar uma vez por dia com persistência e prevenção básica de duplicações; offline local identificado |
| Cartões de recompensa após ganho | **Resumo de espólio** | valores derivados da batalha/claim, continuar para o porto |
| Construtor de secções com +, custos, unidades | **Estaleiro** | seleção por secção proa/centro/popa, níveis, pré-visualização; comprar só com economia real implementada |

## Sequência de desenvolvimento — app antes dos navios finais
1. **Casco da aplicação:** barra de recursos, 5 botões grandes com ícones (Porto, Batalha, Frota, Tripulação, Loja), rotas internas e overlays, áreas seguras iPhone, gestos e acessibilidade.
2. **Ciclo jogável:** Porto → preparação VS → Batalha 3D existente → vitória/derrota → espólio → Porto; manter também batalha direta enquanto o fluxo evolui.
3. **Perfil e estado local:** identificador local, estatísticas, conquistas e persistência versionada; deixar explícito que não é login nem cloud.
4. **Tripulação/cartas:** inventário próprio inicial obtido por progressão verdadeira, equipar, raridade, níveis, sem comprar ou receber itens inexistentes.
5. **Estaleiro e frota:** interface, categorias e espaços de módulos; usar modelos originais atuais como temporários; modelos finais do WORK 2 só na última fase.
6. **Missões e presentes diários:** regras reais, prevenção de claims repetidos e feedback.
7. **Loja, economia e ranking:** backend e autenticação antes de rankings entre jogadores, IAP ou compras reais; enquanto pendente, não apresentar números fictícios nem botões enganadores.
8. **Polimento final:** Unity/iOS/Android e desenvolvimento aprofundado dos 20 níveis, grafismo 3D, performance e testes em dispositivos.

## Regras de qualidade
- Orientação vertical; elementos grandes, legíveis e sem cobrir a Dynamic Island nem a barra inferior.
- Visual original ROYAL PIRATE: azul-marinho, dourado/champagne, madeira e mar; não copiar a paleta, sprites ou personagens da referência externa.
- Preservar WebPreview de três dimensões, lógica balística, IA, áudio, perdas/ganhos e navegação regressiva; novas interfaces são **interativas**, não imagens estáticas.
- Trabalhar em branches e PRs; npm ci/test/build e revisão em navegador antes de integrar; não tocar main ou Unity por suposição.
- Orçamento de implementação nesta fase: 0 €.
- Se uma funcionalidade depende de serviço externo, marcar **pendente**, nunca simular pagamentos, rankings reais ou saldos persistidos remotamente.
