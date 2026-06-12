const express = require("express");
const { getAllSales } = require("../controllers/sales.controller");

const router = express.Router();

router.get("/", getAllSales);

module.exports = router;