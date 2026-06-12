const pool = require("../db/connection");

exports.getAllSales = async (req, res) => {
    const [rows] = await pool.query(`
    SELECT
      s.id_sale,
      s.sale_date,
      s.quantity,
      s.total_value,
      p.name AS product,
      c.name AS category,
      r.name AS region,
      se.name AS seller
    FROM sales s
    JOIN products p ON s.id_product = p.id_product
    JOIN categories c ON p.id_category = c.id_category
    JOIN regions r ON s.id_region = r.id_region
    JOIN sellers se ON s.id_seller = se.id_seller
    ORDER BY s.sale_date DESC
  `);
    res.json(rows);
};