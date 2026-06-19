---
description: Gera um artigo técnico completo para o blog. Pesquisa referências, propõe outline para aprovação, escreve o artigo em Markdown com diagramas Mermaid, gera imagem de capa com DALL-E 3 (Cloudinary) e publica como rascunho na blog API.
---

Certifique-se de que o arquivo `agent/.env` existe (veja `agent/.env.example`).

Execute o agente de geração de artigos:

```bash
cd $WORKSPACE_DIR && python agent/article_agent.py
```

O agente vai:
1. Pedir as informações do artigo interativamente (tópico, audiência, tom, idioma, categoria, tags)
2. Pesquisar referências na web (Brave Search)
3. Gerar um outline e **aguardar sua aprovação** antes de prosseguir
4. Escrever o artigo completo em Markdown com blocos Mermaid para diagramas
5. Gerar imagem de capa com DALL-E 3 e fazer upload para Cloudinary
6. Salvar rascunho local em `agent/drafts/` e publicar como **rascunho** na blog API

Após a geração, revise o artigo no painel admin (`/admin/posts`) e publique manualmente.
