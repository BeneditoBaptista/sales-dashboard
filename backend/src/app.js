const express = require("express");
const cors = require("cors");

const statsRoutes = require("./routes/stats.routes");
const salesRoutes = require("./routes/sales.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/stats", statsRoutes);
app.use("/api/sales", salesRoutes);

module.exports = app;