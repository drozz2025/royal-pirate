# Manifesto de recursos

| Recurso | Origem | Estado | Utilização |
| --- | --- | --- | --- |
| Referencias_Visuais/01_Imagens_Aprovadas/01_Ecra_Principal_APROVADO.jpeg | ZIP ROYAL_PIRATE_Navio01_e_Referencias.zip da conversa de 14/11 | Imagem oficial aprovada pelo proprietário, consultada nesta sessão | Direção artística do ecrã principal |
| Referencias_Visuais/01_Imagens_Aprovadas/02_Batalha_APROVADA.jpeg | Mesmo ZIP original | Imagem oficial aprovada, consultada nesta sessão | Direção artística da batalha |
| Modelos_3D/Navio_01/RoyalPirate_Navio01_Modular.glb | Mesmo ZIP original | GLB 2, 26 meshes, 27 nós incluindo raiz; 22.000 bytes; não importado no Unity | Geometria inicial, não arte final |
| Assets/RoyalPirate/Data/Resources/Navio01.json | Criado no Work 1 | Catálogo funcional de teste: 10 tipos/encaixes | Fonte de dados do cenário e testes |
| Geometria por primitivas no ShipView | Código próprio Work 1 | Marcadores visuais de engenharia | Substituir por prefab Work 2 |

Hashes SHA-256 e tamanhos exatos: `Documentation/asset-checksums.json`. JPEG e GLB foram copiados sem recompressão nem transformação. O ZIP também contém os 26 GLBs individuais; o GLB completo já contém esses meshes, por isso não se duplicam binários nesta entrega.

A aprovação visual é das duas imagens, não certifica o modelo 3D nem substitui revisão de direitos comerciais. Não foi descarregado nenhum recurso do Castle Rivals. Não usar as imagens como texturas do jogo ou copiar a identidade/interface de terceiros. Registar autor, licença, fonte, data, hash, triângulos, materiais, atlas e animações de cada novo asset.

O GLB fica fora de Assets: o Unity não o importa nativamente nesta configuração. Work 2 deverá exportar FBX com materiais próprios ou propor importador glTF gratuito com licença/dependências revistas. Nenhum importador foi instalado silenciosamente.
