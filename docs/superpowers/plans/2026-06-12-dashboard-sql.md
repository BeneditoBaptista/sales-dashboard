# Dashboard.sql Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reescrever o `Dashboard.sql` corrigindo o bug de coerência do `total_value`, gerando 720 vendas multi-ano (2023–2025) de forma set-based, com schema mais rigoroso e queries de exemplo alinhadas com a API.

**Architecture:** Script standalone DROP+CREATE+seed. A stored procedure com loop e `DELIMITER` é substituída por um CTE recursivo cujos valores aleatórios materializam numa tabela temporária (garante 1 avaliação de `RAND()` por linha) seguida de um único `INSERT…SELECT` com JOIN a `products`.

**Tech Stack:** MySQL 9.5 (servidor), cliente mysql 9.6. Sem dependências novas.

**Spec:** `docs/superpowers/specs/2026-06-12-dashboard-sql-design.md`

**Restrições críticas:**
- **NÃO executar contra a BD `sales_dashboard`** — validação só em BD descartável `sales_dashboard_validation`.
- **NÃO fazer `git add`/`git commit` do `Dashboard.sql`** — fica untracked por decisão do utilizador.
- Nomes de tabelas/colunas não mudam (a API do backend depende deles).

---

### Task 1: Reescrever o Dashboard.sql

**Files:**
- Modify: `Dashboard.sql` (reescrita completa, na raiz do repo)

- [ ] **Step 1: Substituir todo o conteúdo de `Dashboard.sql` por:**

```sql
/* ============================================================
   SALES DASHBOARD — SCHEMA + SEED (MySQL 8+)
   Cria o modelo em estrela e gera 720 vendas (2023–2025).
   AVISO: apaga e recria todas as tabelas.
============================================================ */

/* ============================
   LIMPEZA (ordem inversa de dependências)
============================ */
DROP TABLE IF EXISTS sales;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS regions;
DROP TABLE IF EXISTS sellers;

/* ============================
   TABELAS DE DIMENSÃO
============================ */

CREATE TABLE categories (
    id_category INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE regions (
    id_region INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sellers (
    id_seller INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE products (
    id_product INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    id_category INT NOT NULL,
    FOREIGN KEY (id_category) REFERENCES categories(id_category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* ============================
   TABELA FACTO
============================ */

CREATE TABLE sales (
    id_sale INT AUTO_INCREMENT PRIMARY KEY,
    sale_date DATE NOT NULL,
    quantity INT NOT NULL,
    total_value DECIMAL(10,2) NOT NULL,
    id_product INT NOT NULL,
    id_region INT NOT NULL,
    id_seller INT NOT NULL,
    FOREIGN KEY (id_product) REFERENCES products(id_product),
    FOREIGN KEY (id_region) REFERENCES regions(id_region),
    FOREIGN KEY (id_seller) REFERENCES sellers(id_seller),
    INDEX idx_sales_date (sale_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* ============================
   INSERTS BASE (dimensões)
============================ */

INSERT INTO categories (name) VALUES
    ('Eletrónica'),
    ('Casa'),
    ('Desporto'),
    ('Moda');

INSERT INTO regions (name) VALUES
    ('Lisboa'),
    ('Norte'),
    ('Centro'),
    ('Alentejo'),
    ('Algarve');

INSERT INTO sellers (name) VALUES
    ('Maria Costa'),
    ('João Silva'),
    ('Pedro Santos'),
    ('Rita Fernandes'),
    ('Ana Pereira');

INSERT INTO products (name, price, id_category) VALUES
    ('Smartphone Samsung', 850.00, 1),
    ('Portátil Lenovo', 1200.00, 1),
    ('Televisão LG', 999.00, 1),
    ('Sofá 3 Lugares', 1300.00, 2),
    ('Mesa de Jantar', 780.00, 2),
    ('Cadeira Escritório', 210.00, 2),
    ('Sapatilhas Running', 95.00, 3),
    ('Bicicleta Montanha', 620.00, 3),
    ('T-shirt Desportiva', 35.00, 4),
    ('Casaco Inverno', 180.00, 4);

/* ============================================================
   GERAR 720 VENDAS (2023–2025), SET-BASED

   Os valores aleatórios materializam numa tabela temporária:
   cada RAND() é avaliado uma única vez por linha, pelo que
   total_value = price × quantity usa exatamente a quantity
   guardada (na versão anterior eram RAND() independentes).
============================================================ */

CREATE TEMPORARY TABLE tmp_seed AS
WITH RECURSIVE seq (n) AS (
    SELECT 1
    UNION ALL
    SELECT n + 1 FROM seq WHERE n < 720
)
SELECT
    -- 1096 dias: 2023-01-01 a 2025-12-31 (2024 é bissexto)
    DATE_ADD('2023-01-01', INTERVAL FLOOR(RAND() * 1096) DAY) AS sale_date,
    FLOOR(1 + RAND() * 5)  AS quantity,
    FLOOR(1 + RAND() * 10) AS id_product,
    FLOOR(1 + RAND() * 5)  AS id_region,
    FLOOR(1 + RAND() * 5)  AS id_seller
FROM seq;

INSERT INTO sales (sale_date, quantity, total_value, id_product, id_region, id_seller)
SELECT
    t.sale_date,
    t.quantity,
    ROUND(p.price * t.quantity, 2) AS total_value,
    t.id_product,
    t.id_region,
    t.id_seller
FROM tmp_seed t
JOIN products p ON p.id_product = t.id_product;

DROP TEMPORARY TABLE tmp_seed;

/* ============================
   VERIFICAÇÕES
============================ */

-- Esperado: 720
SELECT COUNT(*) AS total_sales FROM sales;

-- Esperado: 2023, 2024 e 2025 com ~240 vendas cada
SELECT YEAR(sale_date) AS year, COUNT(*) AS sales
FROM sales
GROUP BY YEAR(sale_date)
ORDER BY year;

-- Esperado: 0 (total_value coerente com price × quantity)
SELECT COUNT(*) AS inconsistencias
FROM sales s
JOIN products p ON s.id_product = p.id_product
WHERE s.total_value <> ROUND(p.price * s.quantity, 2);

/* ============================================================
   QUERIES DE EXEMPLO (espelham a API do backend)
============================================================ */

-- KPIs globais (GET /api/stats/kpis)
SELECT
    ROUND(SUM(total_value), 2) AS total_sales,
    COUNT(*) AS total_orders,
    ROUND(AVG(total_value), 2) AS avg_ticket,
    SUM(quantity) AS total_units
FROM sales;

-- Vendas por mês (GET /api/stats/sales-by-month)
SELECT MONTH(sale_date) AS month, ROUND(SUM(total_value), 2) AS total_sales
FROM sales
GROUP BY MONTH(sale_date)
ORDER BY month;

-- Vendas por categoria (GET /api/stats/sales-by-category)
SELECT c.name AS category, ROUND(SUM(s.total_value), 2) AS total_sales
FROM sales s
JOIN products p ON s.id_product = p.id_product
JOIN categories c ON p.id_category = c.id_category
GROUP BY c.name
ORDER BY total_sales DESC;

-- Vendas por região (GET /api/stats/sales-by-region)
SELECT r.name AS region, ROUND(SUM(s.total_value), 2) AS total_sales
FROM sales s
JOIN regions r ON s.id_region = r.id_region
GROUP BY r.name
ORDER BY total_sales DESC;

-- Exemplo com filtros (equivalente a /api/stats/kpis?year=2024&region=1)
SELECT
    ROUND(SUM(total_value), 2) AS total_sales,
    COUNT(*) AS total_orders
FROM sales
WHERE YEAR(sale_date) = 2024 AND id_region = 1;
```

- [ ] **Step 2: NÃO commitar.** Confirmar com `git status --short` que `Dashboard.sql` continua untracked (`?? Dashboard.sql`).

---

### Task 2: Validar numa BD descartável

**Files:** nenhum (só execução).

- [ ] **Step 1: Criar a BD de validação e correr o script**

As credenciais vêm de `backend/.env` (não imprimir a password):

```bash
cd /Users/bennymanuel/Documents/Mestrado/Portefolio/sales-dashboard
export MYSQL_PWD="$(grep '^DB_PASSWORD=' backend/.env | cut -d= -f2-)"
DB_USER="$(grep '^DB_USER=' backend/.env | cut -d= -f2-)"

mysql -h 127.0.0.1 -u "$DB_USER" -e "CREATE DATABASE sales_dashboard_validation CHARACTER SET utf8mb4"
mysql -h 127.0.0.1 -u "$DB_USER" --table sales_dashboard_validation < Dashboard.sql
```

**Se o `CREATE DATABASE` falhar com "Access denied"**: o utilizador `sales_app` não tem o privilégio — parar, NÃO tentar contornar (nem usar root), e reportar BLOCKED com a mensagem de erro. A validação fica por inspeção apenas.

Esperado do segundo comando (a ordem das tabelas de output segue as verificações/queries de exemplo do script):
- `total_sales` = 720
- 3 linhas de anos: 2023, 2024, 2025, cada uma com ~200–280 vendas
- `inconsistencias` = 0
- KPIs globais com 4 colunas preenchidas; agregações por mês (12 linhas), categoria (4), região (5); exemplo filtrado com valores < globais

- [ ] **Step 2: Confirmar que a BD real não foi tocada**

```bash
mysql -h 127.0.0.1 -u "$DB_USER" -e "SELECT COUNT(*) AS c FROM sales_dashboard.sales"
```

Esperado: o mesmo número de antes (240 — a BD real mantém o seed antigo).

- [ ] **Step 3: Apagar a BD de validação**

```bash
mysql -h 127.0.0.1 -u "$DB_USER" -e "DROP DATABASE sales_dashboard_validation"
unset MYSQL_PWD
```

Esperado: sem output. `SHOW DATABASES` já não lista `sales_dashboard_validation`.

- [ ] **Step 4: Reportar resultados** (outputs das verificações, confirmação de cleanup). Sem commits.
