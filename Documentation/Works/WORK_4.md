# Work 4 — interface e progressão

Branch `work4/shipyard-ui`, base: fundação Work 1. Ler imagens oficiais, arquitetura, NAVIO_01 e limites de confiança. Trabalhar em UI, Runtime/UI, Runtime/Progression e Scenes/Shipyard; não editar bootstrap/cena de integração sem handoff.

1. Criar ecrã principal vertical com safe area e ícones legíveis; usar identidade própria e composição baseada na imagem aprovada.
2. Estaleiro mostra peças/encaixes/níveis e permite construir/melhorar cada peça; usar ShipLoadout, validação e IProgressionService. Para desenvolvimento usar SandboxShipyard com rótulo explícito e moeda sem valor real.
3. Batalha recebe exatamente a montagem validada; persistir via IProgressStore e tratar corrupção/backup sem apagar dados silenciosamente.
4. HUD de HP/vento/turno/potência, pause/settings, estados de loading/erro/offline. Não assumir que um botão implementa o backend.
5. Desenhar convidado/ligação Apple/Google, moedas/gemas, baús, recompensas, missões diárias, heróis e ranking com interfaces; sem pagamentos/anúncios reais nem SDKs pagos.

Aceitação: construção→guardar→reiniciar→batalha conserva instâncias/níveis; transações inválidas sem alteração de saldo; 44 pt/48 dp como alvos de interação a verificar em dispositivos; texto legível e navegação sem sobreposição. Dependências: contratos Work 1, arte Work 2 e HUD/estado de batalha Work 3.
