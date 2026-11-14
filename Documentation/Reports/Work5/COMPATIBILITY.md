# Compatibilidade e medições

Estado em 14/11/2026: nenhum dispositivo ligado ou teste mobile executado. Não existem FPS aprovados. Não comprar dispositivos nesta fase.

| Slot prioritário | Equipamento a selecionar entre os disponíveis | SO/resolução/RAM/GPU | Estado |
| --- | --- | --- | --- |
| iOS atual | iPhone disponível do proprietário; confirmar modelo e acesso à build | Por registar | Não executado |
| iOS mínimo candidato | iPhone mais antigo disponível e compatível com suporte pretendido | Por registar; suporte mínimo não congelado | Não executado |
| Android intermédio | Telefone físico disponível, retrato e recorte | Por registar | Não executado |
| Android mínimo candidato | Telefone físico com menor capacidade disponível | Por registar; não inventar mínimo comercial | Não executado |
| Editor/simulador | 16:9, 19.5:9, 20:9; safe area com recortes | 720×1280, 1080×2340, 1080×2400 como cenários | Preparado; não substitui hardware |

Em cada registo: SHA, build/versionCode, editor, backend IL2CPP/Mono, API gráfica, SO, modelo, RAM/GPU, resolução/escala, temperatura ambiente, estado da bateria, modo de energia, sessão fria/quente, data, operador e anexos. Não incluir identificadores pessoais/contas/tokens nos logs.

## Sessão de aceitação por dispositivo

1. Instalação limpa e arranque offline/online. Dez batalhas com vitória/derrota; potência/vento extremos, alvo fino, sobreposição, canhão/mastro/casco destruídos.
2. 100 ciclos estaleiro/batalha e 20 minutos contínuos de combate, incluindo explosões/água/destruição quando integradas. Distinguir primeira carga de steady state.
3. Retrato nas resoluções suportadas, safe areas e gestos do sistema, multi-touch, texto legível e controlos sem sobreposição. Rodar fisicamente e regressar ao retrato.
4. Chamada/áudio, background 5 s/1 min/10 min, ecrã bloqueado, suspensão e retoma, sem disparo/compra duplicados. Tempo durante pausa deve seguir política explícita Work 3/4.
5. Rede perdida antes/durante/depois de login, save e compra futura. Retry não concede duas vezes; offline não inventa autoridade do servidor.
6. Terminar app durante gravação; ficheiro truncado, backup, principal ausente e armazenamento reduzido. Não apagar dados válidos ao recuperar. Simular disco cheio apenas em sandbox/dispositivo de teste.
7. Atualização da última build e schema suportados sem perda; versão futura preservada; associação/recuperação de conta quando implementadas.

## Orçamentos provisórios, não medições

| Métrica | Meta de aceitação inicial | Como medir |
| --- | --- | --- |
| Frames no mínimo | p95 ≤33,33 ms, p99 ≤50 ms numa sessão ≥20 min | CSV por frame de device; warmup separado; registar stutters |
| Equipamento compatível 60 FPS | p95 ≤16,67 ms sem degradar estabilidade térmica | Mesmo protocolo; fallback 30 FPS |
| Memória residente | ≤500 MB provisórios, sem crescimento sustentado após ciclos | Unity Profiler + ferramentas nativas; não confundir managed heap com RSS |
| Arranque frio | ≤5 s até interface utilizável como meta provisória | Vídeo/timestamps em 5 arranques |
| Física/GC | Sem alocações recorrentes evitáveis no percurso crítico após perfil | Profiler Timeline/GC.Alloc; analisar arrays e consultas |
| CPU/GPU/render | Cabe no orçamento de frame; registar draw calls, SetPass, triângulos | Profiler/Frame Debugger e GPU tools; sem fixar draw calls sem medições |
| Texturas/partículas/água | Respeitar orçamento integrado de memória/frame | Captura do pior caso, materiais/overdraw/atlas/LOD |
| Temperatura/bateria | Sem aviso térmico ou degradação sustentada abaixo do alvo; consumo registado | Teste físico 20 min, início/fim, condições iguais; limiar energético após baseline |

Analisador de CSV real com coluna `frame_ms`:

```sh
python3 Tools/QA/analyze_frames.py frames.csv --device "modelo / SO / build" --commit SHA --output TestResults/QA/device-frames.json
```

Rejeita vazio/NaN/valores não positivos. Calcula média, p50/p95/p99, máximo e frames >50 ms. Não mede CPU/GPU/RAM nem prova a proveniência física do CSV; `release_approved` permanece false. Dados sintéticos usados nos unit tests validam o analisador, não o jogo.
