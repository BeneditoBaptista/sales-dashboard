const pool = require("../db/connection");

// Constrói WHERE dinâmico a partir de ?year=&region=&category=.
// Todas as queries fazem JOIN a products (alias p), por isso o filtro
// de categoria pode usar sempre p.id_category.
function buildFilters(query) {
    const where = [];
    const values = [];

    if (query.year && Number.isInteger(Number(query.year))) {
        where.push("YEAR(s.sale_date) = ?");
        values.push(Number(query.year));
    }
    if (query.region && Number.isInteger(Number(query.region))) {
        where.push("s.id_region = ?");
        values.push(Number(query.region));
    }
    if (query.category && Number.isInteger(Number(query.category))) {
        where.push("p.id_category = ?");
        values.push(Number(query.category));
    }

    return {
        whereSql: where.length ? `WHERE ${where.join(" AND ")}` : "",
        values,
    };
}

exports.getKpis = async (req, res) => {
    try {
        const { whereSql, values } = buildFilters(req.query);
        const [rows] = await pool.query(`
      SELECT
        ROUND(SUM(s.total_value),2) AS total_sales,
        COUNT(*) AS total_orders,
        ROUND(AVG(s.total_value),2) AS avg_ticket,
        SUM(s.quantity) AS total_units
      FROM sales s
      JOIN products p ON s.id_product = p.id_product
      ${whereSql}
    `, values);
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao obter KPIs" });
    }
};

exports.salesByMonth = async (req, res) => {
    try {
        const { whereSql, values } = buildFilters(req.query);
        const [rows] = await pool.query(`
      SELECT
        MONTH(s.sale_date) AS month,
        ROUND(SUM(s.total_value),2) AS total_sales
      FROM sales s
      JOIN products p ON s.id_product = p.id_product
      ${whereSql}
      GROUP BY MONTH(s.sale_date)
      ORDER BY month
    `, values);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao obter vendas por mês" });
    }
};

exports.salesByCategory = async (req, res) => {
    try {
        const { whereSql, values } = buildFilters(req.query);
        const [rows] = await pool.query(`
      SELECT
        c.name AS category,
        ROUND(SUM(s.total_value),2) AS total_sales
      FROM sales s
      JOIN products p ON s.id_product = p.id_product
      JOIN categories c ON p.id_category = c.id_category
      ${whereSql}
      GROUP BY c.name
      ORDER BY total_sales DESC
    `, values);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao obter vendas por categoria" });
    }
};

exports.salesByRegion = async (req, res) => {
    try {
        const { whereSql, values } = buildFilters(req.query);
        const [rows] = await pool.query(`
      SELECT
        r.name AS region,
        ROUND(SUM(s.total_value),2) AS total_sales
      FROM sales s
      JOIN products p ON s.id_product = p.id_product
      JOIN regions r ON s.id_region = r.id_region
      ${whereSql}
      GROUP BY r.name
      ORDER BY total_sales DESC
    `, values);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao obter vendas por região" });
    }
};

exports.getFilterOptions = async (req, res) => {
    try {
        const [[years], [regions], [categories]] = await Promise.all([
            pool.query(`SELECT DISTINCT YEAR(sale_date) AS year FROM sales ORDER BY year`),
            pool.query(`SELECT id_region AS id, name FROM regions ORDER BY name`),
            pool.query(`SELECT id_category AS id, name FROM categories ORDER BY name`),
        ]);
        res.json({
            years: years.map(r => r.year),
            regions,
            categories,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao obter opções de filtro" });
    }
};
