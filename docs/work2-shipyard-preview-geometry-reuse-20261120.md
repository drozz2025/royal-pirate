# WORK 2 — Estaleiro 3D: sincronização do preview sem reconstrução (2026-11-20)

## Problema verificado no código

O controlo `DEMO PREVIEW LEVEL 1–20` envia um novo loadout ao motor por cada alteração. Antes desta alteração, `OceanScene.showShipyard()` invocava sempre `applyShipModules()`, que remove os modelos procedurais anteriores, recria geometrias, materiais e `InstancedMesh`, e depois liberta os buffers anteriores. Isto acontecia mesmo quando apenas o número de nível mudava, mantendo-se os nove módulos visuais e a mesma classe.

## Alteração proposta

- `WebPreview/src/shipyard-preview-sync.ts`: resolve e valida o loadout ANTES de mutar a cena; reutiliza a mesma `modular-ship-accessories` quando a classe e os nove IDs visuais continuam idênticos; atualiza só os metadados `level`/`tier`. Um nível maior **não concede** módulos ou navios.
- Se a classe ou qualquer módulo visual mudar, o caminho original `applyShipModules` continua a construir e libertar os acessórios. Todos os navios de combate mantêm instâncias separadas.
- `WebPreview/src/scene.ts`: o estaleiro usa `syncShipyardPreview`; a batalha continua a criar os seus navios com `makeShip`, sem alterações.
- `WebPreview/tests/shipyard-preview-sync.test.ts`: cobre 20 níveis, 3 classes, mudanças reais de módulo, rejeição de módulos bloqueados/inexistentes, reuso de buffers e separação do combate.
- Pipeline isolado sem publicação: `.github/workflows/work2-shipyard-verify.yml` executa `npm ci`, `npm test`, `npm run build` na branch de trabalho.

## Contrato de integração — WORK 4

`syncShipyardPreview` é **apenas** apresentação. `verifiedPlayerLevel`, `ownedShipClasses`, `ownedModuleIds` e `validateOwnedFleetForPlayer` continuam sendo a única fronteira atualmente definida para validação de equipar. Nenhum preço, propriedade, inventário, compra, saldo, XP ou nível de jogador é criado ou persistido. A verificação autorizativa deve ser repetida pelo backend antes de gravar qualquer equipamento real. Não passar o slider de demonstração como nível real.

## Contrato de integração — WORK 6

Continuar a chamar `OceanScene.showShipyard(loadout)` em cada alteração do editor. O motor decide se precisa de reconstrução sem alterar a API da cena nem a lógica de batalha. `showHarbour()`, `inspectShip()` e `showBattle()` mantêm a limpeza completa do preview e restauração do DPR original. Não publicar nem fundir até a equipa completar teste visual, navegação e FPS reais em Safari/iPhone e Android.

## Limites

Este mecanismo evita reconstruções de geometria em alterações **somente de nível**, e evita mutações após loadouts inválidos. Não inclui provas de aumento real de FPS nem promete melhoria de memória em dispositivos físicos. O custo adicional é zero. PR em rascunho; sem alteração de `main`, combate, Unity ou versão publicada.
