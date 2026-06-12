const express = require("express");
const {
    getKpis,
    salesByMonth,
    salesByCategory,
    salesByRegion,
    getFilterOptions
} = require("../controllers/stats.controller");

const router = express.Router();

router.get("/kpis", getKpis);
router.get("/sales-by-month", salesByMonth);
router.get("/sales-by-category", salesByCategory);
router.get("/sales-by-region", salesByRegion);
router.get("/filters", getFilterOptions);

module.exports = router;
