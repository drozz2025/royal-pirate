# Plano de testes e prova

## Executado nesta sessão
Consultar `Documentation/Reports/2026-11-14-work1.md` e logs associados. Nunca converter análise estática em alegação de execução Unity.

## Camadas
| Área | Testes preparados | Execução necessária |
| --- | --- | --- |
| Física | Gravidade contra solução analítica, desvio por vento, entradas inválidas | DomainChecks .NET e EditMode |
| Dano | Overkill, dano negativo, evento único de destruição | DomainChecks e EditMode |
| Construção | Compatibilidade, instâncias únicas, encaixe ocupado, casco obrigatório | DomainChecks e EditMode |
| Melhorias/economia sandbox | Cobrança única, saldo insuficiente, revisão obsoleta, limites | DomainChecks e EditMode; não prova economia remota |
| Persistência | Roundtrip, IDs, nível/revisão, backup após corrupção, nível adulterado | EditMode JsonUtility + filesystem; retoma em dispositivo |
| Colisões | Sphere sweep num alvo fino, projétil exclui dono | PlayMode Unity Physics, ainda não executado |
| Comércio | Recibos e claims recusados na fase 1 | EditMode |
| Turnos | Titular do turno, duplo disparo, timeout e fim | DomainChecks e EditMode |
| Integração | Cena, câmara, derrota/afundamento, UI de teste, dano localizado | PlayMode manual com vídeo/logs |

Os testes .NET usam os mesmos ficheiros C# Domain; roundtrip System.Text.Json é separado de JsonUtility. Não simular Unity com stubs e apresentar isso como compilação do jogo.

## Execução Unity
Primeiro resolver packages e executar o setup explícito. Guardar `Packages/packages-lock.json` e assets/definições gerados num PR revisto. Com UNITY_EDITOR a apontar para a instalação licenciada:
```sh
"$UNITY_EDITOR" -batchmode -nographics -projectPath "$PWD" -executeMethod RoyalPirate.Editor.MobileProjectSetup.Prepare -quit -logFile TestResults/setup.log
"$UNITY_EDITOR" -batchmode -nographics -projectPath "$PWD" -runTests -testPlatform EditMode -testResults TestResults/editmode.xml -logFile TestResults/editmode.log
"$UNITY_EDITOR" -batchmode -nographics -projectPath "$PWD" -runTests -testPlatform PlayMode -testResults TestResults/playmode.xml -logFile TestResults/playmode.log
```
Criar TestResults antes. Não acrescentar `-quit` aos comandos de testes; o runner termina quando conclui. As verificações visuais exigem Editor com gráficos/dispositivo, mesmo que os testes físicos passem em headless.

## Matriz real de dispositivos
A selecionar de acordo com os equipamentos disponíveis, sem compra automática: um iPhone de capacidade mínima pretendida, um iPhone recente, Android intermédio e Android de gama baixa. Registar modelo, SO, RAM, GPU, build, commit, resolução e renderer. Nenhum dispositivo validado nesta sessão.

- 20 minutos de combate repetido e 100 entradas/saídas de estaleiro; Profiler CPU/GPU/memória, p50/p95/p99 de frame, picos, temperatura, bateria e draw calls.
- 10 batalhas completas por dispositivo, disparo mínimo/máximo, vento extremo, colisão na borda, início sobreposto, casco destruído, timeout e ambos os canhões destruídos.
- Multi-touch, safe areas, 16:9/19.5:9/20:9, chamadas/interrupções, áudio desligado, app em background, orientação física e regresso com botão/gesto Android.
- Persistência: terminar app durante escrita, ficheiro truncado, backup, versão futura, disco cheio; não apagar automaticamente o save defeituoso.
- Conta/servidor futuros: ligação de convidado, conflitos, repetição de pedidos/recibos, alteração de relógio/saldo, replay de anúncios, compras pendentes/canceladas/reembolsadas, offline e privacidade.

## Critérios de merge e publicação
Compilação limpa e zero falhas nos testes exigidos; revisão de contratos; provas anexas ao PR. Uma fundação não testada pode permanecer em PR draft, nunca passar por validação concluída. Sem publicação comercial antes de perfis reais, direitos dos assets, privacidade, segurança e fluxos de lojas aprovados. CI pago não está autorizado; nenhum workflow automático com consumo foi ativado.
