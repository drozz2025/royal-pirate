# Tarefas e coordenação

Estado em 14/11/2026. Implementado em código não significa testado no Unity.

| ID | Responsável | Entrega | Estado / dependência |
| --- | --- | --- | --- |
| W1-01 | Work 1 | Inspeção e preservação do repositório | Feito; base upstream 8448a1dccf4e7764ad23c731e6d30b6bc98e7537 |
| W1-02 | Work 1 | Imagens exatas, GLB anterior e hashes | Recuperados e adicionados; arte final não aprovada |
| W1-03 | Work 1 | Estrutura Unity/URP, contratos e cenário de integração | Código preparado; importação Unity pendente |
| W1-04 | Work 1 | Validação local, commit e PR | Ver relatório de sessão e PR |
| W2-01 | Work 2 | Inspecionar 26 meshes e aplicar mapeamento/pivots | Pode começar pelo GLB; seguir Documentation/NAVIO_01.md |
| W2-02 | Work 2 | Prefab original com LOD, colliders, materiais | Depende W2-01 e importação Unity; sem alterar Domain |
| W3-01 | Work 3 | Validar balística/colliders no Unity | Contratos e testes base preparados |
| W3-02 | Work 3 | Câmara/mira tátil final, previsão, recoil/VFX, trajetória e afundamento | Depende primeira importação; preservar física real |
| W3-03 | Work 3 | Estados de derrota, empate e canhões inutilizados | Resolver casos em que ambos perdem armas sem perder casco |
| W4-01 | Work 4 | Estaleiro visual com mesma ShipLoadout | Contratos v0.1 disponíveis; não criar modelo de batalha alternativo |
| W4-02 | Work 4 | HUD, safe area, ícones, progressão offline de desenvolvimento | Arte aprovada como referência; sem pagamentos |
| W4-03 | Work 4 | Fluxos convidado/associação, heróis, recompensas | Design de estados e adaptadores; backend não existe |
| W5-01 | Work 5 | Importar editor fixado e executar ambos os modos de testes | Bloqueio atual: sem Unity funcional neste ambiente |
| W5-02 | Work 5 | Dispositivos reais, perfis, pausa/retoma e matriz de compatibilidade | Depende W5-01 e acesso físico a iOS/Android |
| W1-05 | Work 1 | Rever PRs dos Works e integrar sequencialmente | Não há comunicação automática entre chats |

Cada Work deve ler README, ARCHITECTURE, TASKS, Documentation/INTEGRATION e o respetivo ficheiro em Documentation/Works. Criar a sua branch a partir da fundação integrada ou, antes do merge, a partir do commit da branch Work 1 e abrir PR dependente contra essa branch. Não partir do main antigo e reconstruir contratos.
