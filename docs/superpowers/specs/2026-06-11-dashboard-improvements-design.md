# Sales Dashboard — Melhorias: Filtros, Exportação e Redesign Visual

**Data:** 2026-06-11
**Estado:** Aprovado

## Objetivo

Evoluir o sales dashboard (Node/Express + MySQL + React/Vite + Recharts) em três frentes:

1. **Filtros dinâmicos** — filtrar todo o dashboard por ano, região e categoria.
2. **Exportação de relatórios** — CSV (dados) e PDF (relatório visual), gerados no cliente.
3. **Redesign visual** — tema escuro profissional tipo Power BI, em CSS puro.

Sem alterações ao esquema da base de dados (`Dashboard.sql` mantém-se).

## Arquitetura

A arquitetura atual mantém-se: React → API REST Express → MySQL. As melhorias são incrementais sobre os ficheiros existentes, mais 2 componentes novos no frontend.

## Backend

### Filtros nos endpoints existentes

Os 4 endpoints de `stats.controller.js` (`/api/stats/kpis`, `/sales-by-month`, `/sales-by-category`, `/sales-by-region`) passam a aceitar query params opcionais:

- `year` — filtra por `YEAR(s.sale_date) = ?`
- `region` — filtra por `s.id_region = ?`
- `category` — filtra por `p.id_category = ?` (exige JOIN a `products` nas queries que ainda não o têm)

Implementação: função auxiliar única que constrói a cláusula `WHERE` dinâmica e o array de valores para prepared statements (`pool.query(sql, values)`). **Nunca** interpolar valores diretamente no SQL.

### Novo endpoint de opções de filtro

`GET /api/stats/filters` devolve:

```json
{
  "years": [2024],
  "regions": [{ "id": 1, "name": "Norte" }, ...],
  "categories": [{ "id": 1, "name": "Eletrónica" }, ...]
}
```

Anos extraídos de `DISTINCT YEAR(sale_date)`; regiões e categorias das tabelas de dimensão.

### Tratamento de erros

Todos os handlers passam a ter `try/catch` com `res.status(500).json({ error: "..." })` e `console.error` do erro real. Hoje uma falha de DB deixa o pedido pendurado.

## Frontend

### Estado e dados (`Dashboard.jsx`)

- Estado dos filtros: `{ year: "", region: "", category: "" }` (string vazia = sem filtro).
- Fetch com `Promise.all` dos 4 endpoints + `/stats/filters` no mount; refetch dos 4 endpoints de dados quando os filtros mudam (os filtros disponíveis só se carregam uma vez).
- Estados de `loading` e `error` com UI correspondente (spinner/mensagem).

### Componentes novos

- **`FilterBar.jsx`** — 3 `<select>` (Ano, Região, Categoria) preenchidos pelo endpoint `/stats/filters`, mais botão "Limpar filtros". Callback `onChange` para o Dashboard.
- **`ExportButtons.jsx`** — dois botões:
  - **Exportar CSV** — gera no cliente um CSV com os dados agregados atualmente exibidos (secções: vendas por mês, por categoria, por região), via Blob + download. Sem dependências novas.
  - **Exportar PDF** — captura o dashboard com `html2canvas` e gera PDF com `jspdf` (título, data de geração, filtros ativos, imagem do dashboard). Dependências novas: `jspdf`, `html2canvas`.

### Configuração da API (`api.js`)

`baseURL` passa a `import.meta.env.VITE_API_URL || "http://localhost:3006/api"`. Criar `.env.example` no frontend.

### Redesign visual (tema escuro tipo Power BI)

CSS puro com variáveis em `index.css` — sem bibliotecas de UI:

- Fundo escuro (~`#0f1419`), cards `~#1a2129` com borda subtil e cantos arredondados.
- Header com título e botões de exportação; barra de filtros abaixo.
- KPIs em linha de 4 cards: Total de Vendas (€), Nº de Vendas, **Ticket Médio (€)** e **Unidades Vendidas** (os 2 novos vêm do endpoint `/kpis` — `AVG(total_value)` e `SUM(quantity)`).
- Gráficos em grelha 2×2 (linha, barras, circular + espaço para crescimento futuro), responsiva (1 coluna em ecrãs estreitos).
- Paleta de cores consistente nos gráficos Recharts (tons de azul/teal/âmbar sobre fundo escuro), tooltips e eixos legíveis no tema escuro.

## Tratamento de erros (resumo)

- Backend: `try/catch` + 500 JSON em todos os handlers; validação leve dos query params (números).
- Frontend: estado de erro global com mensagem "Não foi possível carregar os dados" e botão "Tentar novamente"; exportação desativada enquanto `loading` ou `error`.

## Testes / Verificação

- Backend: testar manualmente os endpoints com e sem filtros (`curl`), incluindo combinações (ano+região) e valores inválidos.
- Frontend: verificar no browser que os filtros atualizam todos os gráficos, que "Limpar filtros" repõe tudo, e que os dois exports descarregam ficheiros corretos.
- Verificação visual do tema escuro em desktop e largura de telemóvel.

## Fora de âmbito

- Autenticação de utilizadores.
- Deploy.
- Alterações ao esquema da base de dados.
- Geração de PDF/CSV no servidor.
