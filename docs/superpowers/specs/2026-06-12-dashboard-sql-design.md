# Dashboard.sql — Correção de dados, multi-ano e rigor de schema

**Data:** 2026-06-12
**Estado:** Aprovado

## Objetivo

Melhorar o script `Dashboard.sql` (schema + seed da base de dados MySQL) em quatro frentes:

1. **Corrigir o bug de coerência** — hoje `total_value` é calculado com um `RAND()` independente do usado em `quantity`, pelo que `total_value ≠ price × quantity` em quase todas as linhas.
2. **Dados multi-ano** — 720 vendas distribuídas por 2023–2025 (~240/ano, a densidade atual), tornando útil o filtro "Ano" do dashboard.
3. **Schema mais rigoroso** — `NOT NULL` nas FKs, `ENGINE=InnoDB` + `utf8mb4` explícitos, índice em `sale_date`.
4. **Queries de exemplo alinhadas com a API real** — KPIs com ticket médio e unidades, agregações por mês/categoria/região, exemplo com filtros.

**Restrições acordadas:** apenas edição do ficheiro — **não** executar contra a BD `sales_dashboard` do utilizador, **não** fazer commit do `Dashboard.sql` (fica untracked, como está). A validação corre numa BD descartável.

## Contexto

- MySQL server 9.5 (CTEs recursivos disponíveis), cliente mysql 9.6 instalado.
- O script é standalone: DROP + CREATE + seed + verificações. A app (backend Express) lê destas tabelas; nenhuma alteração de nomes de tabelas/colunas é permitida (a API depende delas).
- Estrutura atual: dimensões `categories` (4), `regions` (5), `sellers` (5), `products` (10) + facto `sales` (240 linhas, só 2024), gerada por stored procedure com loop e `DELIMITER`.

## Design

### Schema

Mesmas tabelas e colunas (zero impacto na API), com:

- `NOT NULL` em `products.id_category` e em `sales.id_product`, `sales.id_region`, `sales.id_seller`.
- Todas as tabelas com `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`.
- `INDEX idx_sales_date (sale_date)` na tabela `sales` (FKs já são indexadas pelo InnoDB).
- Mantém-se o bloco de limpeza `DROP TABLE IF EXISTS` pela ordem inversa de dependências.

### Seed (substitui a stored procedure)

Set-based, sem `DELIMITER` nem loop:

1. **CTE recursivo** gera a sequência 1..720 (abaixo do `cte_max_recursion_depth` default de 1000).
2. Os valores aleatórios materializam-se numa **`CREATE TEMPORARY TABLE tmp_seed AS …`** — a materialização garante que cada `RAND()` é avaliado exatamente uma vez por linha, pelo que a `quantity` usada no `total_value` é a mesma da coluna `quantity` (correção do bug à prova de otimizador, que poderia reavaliar expressões numa derived table).
3. `INSERT INTO sales … SELECT … FROM tmp_seed t JOIN products p ON p.id_product = t.id_product` com `total_value = ROUND(p.price * t.quantity, 2)`.
4. `DROP TEMPORARY TABLE tmp_seed`.

Distribuições:

- `sale_date`: uniforme em `DATE_ADD('2023-01-01', INTERVAL FLOOR(RAND()*1096) DAY)` (2023-01-01 a 2025-12-31; 1096 dias porque 2024 é bissexto).
- `quantity`: `FLOOR(1 + RAND()*5)` (1–5).
- `id_product`: `FLOOR(1 + RAND()*10)`; `id_region` e `id_seller`: `FLOOR(1 + RAND()*5)` — válidos porque o script cria as dimensões do zero com AUTO_INCREMENT a começar em 1.
- Sem sazonalidade artificial (fora de âmbito por decisão do utilizador).

### Verificações (no fim do script)

- `SELECT COUNT(*)` total (esperado: 720).
- Contagem por ano (`GROUP BY YEAR(sale_date)` — esperado: 3 anos com ~240 cada).
- **Check de coerência** (esperado: 0):

```sql
SELECT COUNT(*) AS inconsistencias
FROM sales s JOIN products p ON s.id_product = p.id_product
WHERE s.total_value <> ROUND(p.price * s.quantity, 2);
```

### Queries de exemplo

Substituir as três queries desatualizadas por exemplos que espelham a API:

- KPIs globais: `total_sales`, `total_orders`, `avg_ticket`, `total_units` (como `/api/stats/kpis`).
- Vendas por mês, por categoria (DESC), por região (DESC).
- Um exemplo com filtros (`WHERE YEAR(sale_date) = 2024 AND id_region = 1`) a demonstrar o que a API faz com query params.

## Validação

Executar o script completo numa BD descartável `sales_dashboard_validation` (criada e apagada no momento), confirmando: execução sem erros, 720 linhas, 3 anos presentes, check de coerência = 0, e os 10 produtos/5 regiões/4 categorias. A BD `sales_dashboard` do utilizador não é tocada. Se o utilizador MySQL (`sales_app`) não tiver privilégio `CREATE DATABASE`, validar apenas a sintaxe por inspeção e reportar a limitação.

## Fora de âmbito

- Executar o script na BD real do utilizador.
- Commit do `Dashboard.sql`.
- Atualizar o README (passará a dizer "ano de 2024" desatualizado — decisão do utilizador quando aplicar).
- Sazonalidade ou volumes não uniformes.
- Alterações a nomes de tabelas/colunas ou à API.
