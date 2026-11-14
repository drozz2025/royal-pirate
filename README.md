## Work 0 — integration preview

The combined first-battle branch is `work0/first-battle-integration-20261114`. See [implemented changes, reproducible checks and remaining Unity gates](Documentation/Reports/Work0/DELIVERY.md). In Unity 6000.3.28f1 use **Royal Pirate → Prepare First Battle Integration**, then open Harbour. Unity compilation and gameplay are still unverified.

# ROYAL PIRATE

Projeto Unity nativo, C#, iOS/Android, vertical. Work 1: fundação técnica de 14/11/2026.
**Estado: código e cenário de integração preparados; ainda não compilados/importados no Unity nem executados num telemóvel. Não é uma versão comercial.**

## Abrir e verificar
1. Instalar Unity Personal **6000.3.28f1 (Unity 6.3 LTS)** pelo Unity Hub, com módulos Android/iOS necessários. A licença e a elegibilidade Personal têm de estar válidas no computador de execução.
2. Clonar este repositório e selecionar a branch `work1/unity-foundation-20261114`. Abrir a raiz que contém `Assets`, `Packages` e `ProjectSettings`.
3. Deixar o Package Manager resolver as dependências. Não aceitar atualizações de versão sem PR. O `packages-lock.json` deve ser gerado pelo Unity e revisto no primeiro PR de importação; não foi inventado manualmente.
4. Executar **Royal Pirate → Prepare Mobile Project**. Este comando explícito cria os assets URP, liga o material à cena, configura retrato/Input System e guarda as definições. Reiniciar o Editor se solicitado. Não modifica contas externas.
5. Abrir `Assets/RoyalPirate/Scenes/Integration.unity`, carregar Play. Cenário esperado: dois navios com geometria de teste, câmara atrás do canhão, mira por arrasto/sliders, potência e botão FIRE; adversário por turnos. Os acertos dependem da trajetória e das colisões.
6. Window → General → Test Runner: executar EditMode e PlayMode. Guardar XML e logs com versão, commit e ambiente. Ver [TEST_PLAN.md](TEST_PLAN.md).

O aspeto geométrico do cenário NÃO representa a arte final. As duas imagens originais aprovadas estão em `Referencias_Visuais/01_Imagens_Aprovadas/`. O GLB anterior está em `Modelos_3D/Navio_01/`, fora de Assets, ainda sem importador ou integração artística.

## Verificações sem Unity
```sh
python3 Tools/validate_repository.py
dotnet run --project Tools/DomainChecks/DomainChecks.csproj -- Assets/RoyalPirate/Data/Resources/Navio01.json
```
O segundo comando compila e executa apenas o domínio C# em .NET 8. Não valida APIs Unity, JsonUtility, URP, colisões, renderização ou dispositivos.

## Limites desta entrega
- Um catálogo de navio, dez tipos de peças, loadout com instâncias e níveis, montagem, dano localizado e regra de derrota pelo casco.
- Economia de teste em memória (`SandboxShipyard`), sem valor real. Save local guarda apenas montagem/níveis; não guarda moeda nem credenciais e não é autoridade de progressão.
- Portas para identidade, progressão, compras, recompensas, anúncios, ranking, missões e combate remoto. Integrações externas e heróis jogáveis ainda não implementados.
- UI de diagnóstico IMGUI; interface final, estaleiro visual, VFX, água animada, áudio e arte premium pendentes.
- Pagamentos reais desativados; nenhum SDK publicitário, backend, conta de loja, assinatura ou recurso pago provisionado.

## Coordenação
[Arquitetura](ARCHITECTURE.md) · [Tarefas](TASKS.md) · [Roadmap](ROADMAP.md) · [Integração](Documentation/INTEGRATION.md) · [Assets](ASSET_MANIFEST.md) · [Testes](TEST_PLAN.md) · [Alterações](CHANGELOG.md)

Orçamento total máximo: 5.000 €. Despesas autorizadas nesta fase e realizadas nesta sessão: **0 €**. Natal de 2026 é uma meta desejada condicionada à qualidade e validação, não uma data prometida.
