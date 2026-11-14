# Navio 01 — especificação de integração v0.1

Arte oficial: as duas imagens exatas em Referencias_Visuais/01_Imagens_Aprovadas. Assinatura pretendida: casco cartoon de madeira, ferragens douradas, velas escuras, silhueta legível e mar tropical. A referência de batalha mostra broadside; o requisito funcional mantém câmara atrás do canhão durante a mira. Work 2/3 devem resolver transição cinematográfica sem substituir esse requisito.

GLB atual: 26 meshes/nós de peças e uma raiz `world`. Ainda sem prova de escala, pivots, topologia móvel ou importação. Não representar estes 26 objetos geométricos como 26 tipos de gameplay. Um módulo pode conter vários meshes; meshes decorativos não precisam de HP próprio.

## Contrato espacial
Y up, +Z proa, +X estibordo, 1 unidade = 1 m, raiz ao centro da linha de água. Escala aplicada antes da exportação; pivots de mastros/velas na base/ponto de encaixe e canhões no eixo de elevação. `Muzzle` aponta +Z local; posição de herói é socket separado. Não alterar transform de colisão ao animar recoil de mesh.

## Catálogo de teste (não balanceamento comercial)
| Tipo | ID | HP nível 1 | Custo base | Posição XYZ m | Meshes anteriores candidatos |
| --- | --- | --- | --- | --- | --- |
| Casco | module.hull.01 | 500 | 100 | 0, 0.2, 0 | 01_Casco |
| Proa | module.bow.01 | 150 | 100 | 0, 0.4, 5 | Precisa separação/reconstrução |
| Popa | module.stern.01 | 150 | 100 | 0, 0.4, -5 | Precisa separação/reconstrução |
| Convés | module.deck.01 | 100 | 100 | 0, 1.1, 0 | 02_Conves |
| Mastro | module.mast.01 | 120 | 100 | 0, 4.6, 0 | 04_Mastro*, 05_Vergas* |
| Vela | module.sail.01 | 100 | 100 | 0, 5, 0 | 06_Vela* |
| Canhão | module.cannon.01 | 120 | 100 | 0, 2, 4 | 11_Canhao_Proa; 07/08 laterais em expansão posterior |
| Cabine | module.cabin.01 | 180 | 100 | 0, 2.2, -3 | 09_Cabine_Popa |
| Blindagem | module.armor.01 | 150 | 100 | -3.1, 0.6, 0 | 03_Borda*, a rever |
| Herói | module.heroslot.01 | 50 | 100 | 1.5, 1.4, 2 | Socket novo; personagem pendente |

Fonte executável: `Assets/RoyalPirate/Data/Resources/Navio01.json`. Cada mount usa `mount.<tipo>.01`; cada instalação tem UUID próprio e nível 1–5. HP = base + (nível−1) × floor(base/4); melhoria custa baseCost × nível atual; canhão de teste causa 80 de dano. Valores exclusivamente de engenharia, sujeitos a playtest. O marcador HeroSlot é provisório; sem herói/skill jogável.

## Entrega Work 2
Prefab `ShipNavio01` com hierarquia de módulos/encaixes identificados; materiais originais URP, LOD0/1/2, colliders simples sem overlap desnecessário, visual intacto/danificado/destruído por módulo, socket Muzzle e sockets de herói. Sem scripts de economia/combate embutidos no mesh. Canhões laterais poderão acrescentar mounts únicos após validar o primeiro frontal. Preservar fonte GLB; entregar novos assets em paths próprios.

## Aceitação
Abrir/rodar em Unity sem materiais rosa; mostrar frente/lado/trás e vídeo de destruição de uma peça; medição de triângulos, draw calls, memória e escala; verificar substituição de prefab sem alteração de loadout/níveis. Aprovação artística e validação técnica são passos separados. Só ampliar a frota após este navio passar ambos.
