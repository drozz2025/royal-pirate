# ROYAL PIRATE — Situação de publicação ChatGPT Sites (18-11-2026)

Fonte de código: [drozz2025/royal-pirate](https://github.com/drozz2025/royal-pirate), branch `work6/web-3d-preview`.

Publicação CI autenticada: [GitHub Pages](https://drozz2025.github.io/royal-pirate/). O workflow `.github/workflows/royal-pirate-pages.yml` publica e verifica a versão real nos ficheiros servidos.

Endereço adicional existente: [ROYAL PIRATE no ChatGPT Sites](https://royal-pirate.ricardomalheiro.chatgpt.site/).

**Estado: NÃO SINCRONIZADO/INDETERMINADO.** A documentação oficial [Creating and using ChatGPT Sites](https://help.openai.com/en/articles/20001339-creating-and-using-chatgpt-sites) descreve editar, pré-visualizar e publicar através do editor de Sites; não documenta uma API de deploy GitHub Pages → Sites. Sem ligação de publicação autenticada, NÃO afirmar igualdade das versões ou que o site é automaticamente atualizado.

O pipeline passa a verificar o HTTP do Site em modo **somente leitura** e procurar a etiqueta exata da versão compilada no HTML disponível. A presença dessa cadeia **não prova** igualdade do código. A ausência não prova qual é a versão, apenas falta de evidência. O resultado aparece no resumo do job `verify`; qualquer indisponibilidade de Sites não deve interromper o GitHub Pages.

Para permanecer com **uma única fonte e custo zero**: manter GitHub como fonte do código e Pages como URL de teste e release fiável; se for indispensável publicar no URL do ChatGPT Sites, abrir o Site como proprietário/editor, importar/editar a versão a partir da fonte, rever pré-visualização e publicar manualmente. Não trocar automaticamente o domínio, não criar redirecionamentos nem copiar a aplicação para um segundo repositório sem decisão explícita.

**Critério para declarar integração automática futura:** interface de deploy oficialmente suportada, acesso autorizado ao projeto Sites existente, publicação não destrutiva para esse projeto, prova de versão/código, teste funcional e HTTP em ambos os URL. Até lá: bloqueio de integração automática, não de GitHub Pages.