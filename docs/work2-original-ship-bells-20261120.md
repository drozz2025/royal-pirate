# WORK 2 — sinos de bordo 3D originais (20-11-2026)

## Implementação
O novo gerador `WebPreview/src/ship-deck-bell.ts` desenha um sino de bronze com campânula oca, bordo saliente, badalo, suportes de madeira e peças forjadas. Usa superfícies e materiais PBR Three.js, sem modelos, texturas nem custos externos. As peças fundem-se em **duas meshes renderizáveis** (madeira e bronze), com geometrias e materiais descartáveis.

As três classes usam geometrias diferentes: `scout` (armação estreita), `fighter` (travamentos inclinados) e `warship` (arco cerimonial com remates e galhardetes de metal). O módulo `ornaments` altera a decoração 3D: `ornaments-simple` (nível 1), `ornaments-lanterns` (nível 8), `ornaments-legendary` (nível 19). Estão posicionados no convés dianteiro, sem alterar canhões, mastros, rigging, física ou sistema de combate.

O carregamento é feito exclusivamente por `applyShipModules` dentro do grupo temporário `modular-ship-accessories`. Ao trocar a configuração, o mecanismo atual liberta as meshes antigas, geometria e materiais. Não há sons de sino, interação de combate, alterações de moedas, propriedade de navios ou outros direitos de inventário.

## Contratos de integração
- **WORK 4:** continua a fornecer `ownedModuleIds`, `ownedShipClasses` e `verifiedPlayerLevel` validados no serviço de jogo. O nível 19 apenas permite *pré-visualizar* acabamentos lendários; não atribui posse. O backend deve continuar a validar equipar e compras.
- **WORK 6:** pode focar a decoração no editor, utilizando a categoria já existente `ornaments`; a geometria não precisa de novas rotas nem mudanças no layout. A peça segue as diretrizes de materiais de madeira e metais dourados em `assets/design-approved`.
- **WORK 5:** testes automáticos em `WebPreview/tests/ship-deck-bell.test.ts` verificam nove variantes, limites de vertex/draw calls, relevo físico, libertação de GPU, 60 combinações de classe e nível, e ausência de posse implícita. São testes de geometria e regressão, não medição de FPS real.

## Validação e integração
Feature isolada na branch `work2/original-ship-bells-20261120`, baseada em `work2/shipyard-preview-geometry-reuse-20261120` (PR #688). Sem alterar `main`, Unity, batalha ou versão pública. Rever CI (`npm ci`, `npm test`, TypeScript/Vite build), depois validar visualmente Chrome/Safari e FPS em aparelhos físicos antes de integrar. Custo: 0 €.
