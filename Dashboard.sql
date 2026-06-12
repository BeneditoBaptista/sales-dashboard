/* ============================================================
   SALES DASHBOARD — SCHEMA + SEED (MySQL 8+)
   Creates the star schema and seeds 720 sales (2023–2025).
   WARNING: drops and recreates all tables.
============================================================ */

/* ============================
   Drop Tables (reverse dependency order)
============================ */
DROP TABLE IF EXISTS sales;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS regions;
DROP TABLE IF EXISTS sellers;

/* ============================
   Dimension Tables
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
   Fact Table
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
   Dimension Inserts
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
   Seed 720 Sales (2023–2025), set-based

   Random values are materialized into a temporary table so
   each RAND() is evaluated exactly once per row — this way
   total_value = price × quantity uses the same quantity that
   gets stored (the previous version used independent RAND()
   calls, so the values never matched).
============================================================ */

CREATE TEMPORARY TABLE tmp_seed AS
WITH RECURSIVE seq (n) AS (
    SELECT 1
    UNION ALL
    SELECT n + 1 FROM seq WHERE n < 720
)
SELECT
    -- 1096 days: 2023-01-01 through 2025-12-31 (2024 is a leap year)
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
   Verifications
============================ */

-- Expected: 720
SELECT COUNT(*) AS total_sales FROM sales;

-- Expected: 2023, 2024 and 2025 with ~240 sales each
SELECT YEAR(sale_date) AS year, COUNT(*) AS sales
FROM sales
GROUP BY YEAR(sale_date)
ORDER BY year;

-- Expected: 0 (total_value consistent with price × quantity)
SELECT COUNT(*) AS inconsistencies
FROM sales s
JOIN products p ON s.id_product = p.id_product
WHERE s.total_value <> ROUND(p.price * s.quantity, 2);

/* ============================================================
   Example Queries (mirror the backend API)
============================================================ */

-- Global KPIs (GET /api/stats/kpis)
SELECT
    ROUND(SUM(total_value), 2) AS total_sales,
    COUNT(*) AS total_orders,
    ROUND(AVG(total_value), 2) AS avg_ticket,
    SUM(quantity) AS total_units
FROM sales;

-- Sales by month (GET /api/stats/sales-by-month)
SELECT MONTH(sale_date) AS month, ROUND(SUM(total_value), 2) AS total_sales
FROM sales
GROUP BY MONTH(sale_date)
ORDER BY month;

-- Sales by category (GET /api/stats/sales-by-category)
SELECT c.name AS category, ROUND(SUM(s.total_value), 2) AS total_sales
FROM sales s
JOIN products p ON s.id_product = p.id_product
JOIN categories c ON p.id_category = c.id_category
GROUP BY c.name
ORDER BY total_sales DESC;

-- Sales by region (GET /api/stats/sales-by-region)
SELECT r.name AS region, ROUND(SUM(s.total_value), 2) AS total_sales
FROM sales s
JOIN regions r ON s.id_region = r.id_region
GROUP BY r.name
ORDER BY total_sales DESC;

-- Filtered example (equivalent to /api/stats/kpis?year=2024&region=1)
SELECT
    ROUND(SUM(total_value), 2) AS total_sales,
    COUNT(*) AS total_orders
FROM sales
WHERE YEAR(sale_date) = 2024 AND id_region = 1;
