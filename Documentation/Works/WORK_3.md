# Work 3 — combate e física

Branch `work3/naval-combat`, base: fundação Work 1. Ler contratos v0.1 e TEST_PLAN. Antes de editar os adaptadores iniciais Runtime, obter handoff explícito registado no PR; criar Scenes/Combat e Runtime/Combat para trabalho independente.

1. Executar testes analíticos e PlayMode; validar sweep, overlaps, ordenação, exclusão do dono, tiro rasante e fim de vida.
2. Câmara atrás de Muzzle, arrasto horizontal/vertical com captura do dedo e UI exclusion, potência e previsão consistente com integrador; não predefinir acertos.
3. Dados de arma do catálogo, vento por turno, projétil/VFX, danos e destruição visual desacoplados. Não introduzir dupla gravidade.
4. Turnos/cronómetro, bot capaz de escolher tiros, derrota por casco, empate/sem armas, pausa/retoma e afundamento. Atualizar testes.
5. Herói/skill por IHeroAbility após contrato conjunto; não usar gemas locais como autorização de habilidade paga.

Entregar vídeo do Editor, XML de testes e perfil com vários tiros; reportar dispositivo somente se executado. Colisões Unity não são determinismo de servidor. PR separado para qualquer alteração de Domain. Depende do prefab/socket Work 2 para arte final; geometria de teste permite começar já.
