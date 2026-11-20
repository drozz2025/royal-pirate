# Work 6 asset provenance

The approved GitHub references were fetched at Work 0 commit `06206451f237a0e7f4d56830088253a37ca3446f`, decoded without modification, and visually inspected. Their location is `Referencias_Visuais/01_Imagens_Aprovadas/`. They informed the tropical water, original skull sails, wooden hulls, gold trims and vertical controls; they are not used as game textures.

The original `Modelos_3D/Navio_01/RoyalPirate_Navio01_Modular.glb` was inspected: GLB 2, 26 named meshes, 22,000 bytes. It is an initial geometric reference, not final Work 2 art. Work 6 instead authors its own curved hull/rigging/decoration in code, without modifying that GLB. No Castle Rivals resources or purchased models are used.

Reference audit:

```json
[
  {
    "file": "01_Ecra_Principal_APROVADO.jpeg",
    "bytes": 706597,
    "sha256": "2d3d4644f4982d61d623d762fb65c140756c6c20142d8c00e14e6dc6618e160e"
  },
  {
    "file": "02_Batalha_APROVADA.jpeg",
    "bytes": 817764,
    "sha256": "ef31e316c1fae5268ae6c7ba477074747ad9bfd26ba6998e391e955e9cb2cb32"
  },
  {
    "file": "RoyalPirate_Navio01_Modular.glb",
    "bytes": 22000,
    "sha256": "9afd40a1afd89150a40b968ac4e9d43e3abcdc0f5a25f4bf6e0a6591f0da9bac"
  }
]
```

Runtime artwork: original procedural code in `ships.ts` / `scene.ts`, created for this project, 2026-11-14. Fonts: Google Fonts Barlow and Barlow Condensed, SIL Open Font License (local OFL texts and source URLs in `public/fonts`). npm package licenses remain in their distributions.
