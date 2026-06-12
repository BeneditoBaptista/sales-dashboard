# Sales Dashboard Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar filtros dinâmicos (ano/região/categoria), exportação CSV+PDF e redesign visual escuro tipo Power BI ao sales dashboard.

**Architecture:** Evolução incremental — os 4 endpoints de stats passam a aceitar query params com prepared statements; novo endpoint `/api/stats/filters`; frontend ganha `FilterBar` e `ExportButtons`, estado central no `Dashboard.jsx` com loading/erro; tema escuro em CSS puro com variáveis.

**Tech Stack:** Node/Express + mysql2, React 19 + Vite, Recharts, jspdf + html2canvas (novas deps no frontend).

**Spec:** `docs/superpowers/specs/2026-06-11-dashboard-improvements-design.md`

**Nota sobre testes:** o projeto não tem infraestrutura de testes automatizados. A verificação é feita com `curl` (backend) e browser (frontend), conforme o spec. O backend requer MySQL local com a base de dados do `Dashboard.sql` carregada e o `.env` existente em `backend/.env`.

---

### Task 1: Backend — filtros e novos KPIs no stats.controller.js

**Files:**
- Modify: `backend/src/controllers/stats.controller.js` (reescrita completa)

- [ ] **Step 1: Reescrever o controller com filtros, try/catch e KPIs novos**

Substituir todo o conteúdo de `backend/src/controllers/stats.controller.js` por:

```js
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
    `, values);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao obter vendas por região" });
    }
};

exports.getFilterOptions = async (req, res) => {
    try {
        const [years] = await pool.query(`
      SELECT DISTINCT YEAR(sale_date) AS year FROM sales ORDER BY year
    `);
        const [regions] = await pool.query(`
      SELECT id_region AS id, name FROM regions ORDER BY name
    `);
        const [categories] = await pool.query(`
      SELECT id_category AS id, name FROM categories ORDER BY name
    `);
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
```

- [ ] **Step 2: Registar a rota /filters**

Substituir todo o conteúdo de `backend/src/routes/stats.routes.js` por:

```js
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
```

- [ ] **Step 3: Verificar com curl**

Arrancar o backend (`cd backend && npm run dev`, fica na porta 3006) e correr:

```bash
curl -s http://localhost:3006/api/stats/kpis | head -c 300; echo
curl -s "http://localhost:3006/api/stats/kpis?year=2024&region=1" | head -c 300; echo
curl -s "http://localhost:3006/api/stats/sales-by-month?category=1" | head -c 300; echo
curl -s http://localhost:3006/api/stats/filters | head -c 500; echo
curl -s "http://localhost:3006/api/stats/kpis?year=abc" | head -c 300; echo
```

Esperado:
- `/kpis` devolve JSON com `total_sales`, `total_orders`, `avg_ticket`, `total_units`.
- Com filtros, os valores mudam (menores que o total).
- `/filters` devolve `{"years":[2024],"regions":[...],"categories":[...]}`.
- `?year=abc` é ignorado (devolve o mesmo que sem filtro — não rebenta).

- [ ] **Step 4: Commit**

```bash
git add backend/src/controllers/stats.controller.js backend/src/routes/stats.routes.js backend/src/server.js
git commit -m "feat(backend): filtros dinâmicos, novos KPIs e endpoint de opções de filtro"
```

(O `server.js` entra neste commit para fixar a mudança pendente da porta 3001→3006.)

---

### Task 2: Frontend — api.js com variável de ambiente

**Files:**
- Modify: `frontend/src/services/api.js`
- Create: `frontend/.env.example`

- [ ] **Step 1: Atualizar api.js**

Substituir todo o conteúdo de `frontend/src/services/api.js` por:

```js
import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:3006/api",
});

export default api;
```

- [ ] **Step 2: Criar .env.example**

Criar `frontend/.env.example` com:

```
VITE_API_URL=http://localhost:3006/api
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/services/api.js frontend/.env.example
git commit -m "feat(frontend): URL da API configurável via VITE_API_URL"
```

---

### Task 3: Frontend — componente FilterBar

**Files:**
- Create: `frontend/src/components/FilterBar.jsx`

- [ ] **Step 1: Criar o componente**

Criar `frontend/src/components/FilterBar.jsx`:

```jsx
export default function FilterBar({ options, filters, onChange }) {
    const hasActive = filters.year || filters.region || filters.category;

    const set = (key) => (e) => onChange({ ...filters, [key]: e.target.value });

    return (
        <div className="filter-bar">
            <label>
                Ano
                <select value={filters.year} onChange={set("year")}>
                    <option value="">Todos</option>
                    {options.years.map(y => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>
            </label>

            <label>
                Região
                <select value={filters.region} onChange={set("region")}>
                    <option value="">Todas</option>
                    {options.regions.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                </select>
            </label>

            <label>
                Categoria
                <select value={filters.category} onChange={set("category")}>
                    <option value="">Todas</option>
                    {options.categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
            </label>

            {hasActive && (
                <button
                    className="btn-clear"
                    onClick={() => onChange({ year: "", region: "", category: "" })}
                >
                    Limpar filtros
                </button>
            )}
        </div>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/FilterBar.jsx
git commit -m "feat(frontend): componente FilterBar"
```

(Verificação visual acontece na Task 5, quando o Dashboard o usar.)

---

### Task 4: Frontend — ExportButtons (CSV + PDF)

**Files:**
- Create: `frontend/src/components/ExportButtons.jsx`
- Modify: `frontend/package.json` (via npm install)

- [ ] **Step 1: Instalar dependências**

```bash
cd frontend && npm install jspdf html2canvas
```

Esperado: `added N packages` sem erros.

- [ ] **Step 2: Criar o componente**

Criar `frontend/src/components/ExportButtons.jsx`:

```jsx
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const monthNames = {
    1: "Jan", 2: "Fev", 3: "Mar", 4: "Abr",
    5: "Mai", 6: "Jun", 7: "Jul", 8: "Ago",
    9: "Set", 10: "Out", 11: "Nov", 12: "Dez"
};

function buildCsv({ byMonth, byCategory, byRegion }) {
    const lines = [];
    lines.push("Vendas por Mês");
    lines.push("mes;total_vendas");
    byMonth.forEach(r => lines.push(`${monthNames[r.month]};${r.total_sales}`));
    lines.push("");
    lines.push("Vendas por Categoria");
    lines.push("categoria;total_vendas");
    byCategory.forEach(r => lines.push(`${r.category};${r.total_sales}`));
    lines.push("");
    lines.push("Vendas por Região");
    lines.push("regiao;total_vendas");
    byRegion.forEach(r => lines.push(`${r.region};${r.total_sales}`));
    return lines.join("\n");
}

function downloadCsv(data) {
    // BOM para o Excel abrir UTF-8 corretamente
    const blob = new Blob(["\uFEFF" + buildCsv(data)], {
        type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "relatorio-vendas.csv";
    a.click();
    URL.revokeObjectURL(url);
}

async function downloadPdf(targetRef, filtersLabel) {
    const canvas = await html2canvas(targetRef.current, {
        backgroundColor: "#0f1419",
        scale: 2,
    });
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();

    pdf.setFontSize(16);
    pdf.text("Relatório de Vendas", 14, 16);
    pdf.setFontSize(10);
    pdf.text(
        `Gerado em ${new Date().toLocaleDateString("pt-PT")} — ${filtersLabel}`,
        14, 23
    );

    const imgWidth = pageWidth - 28;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(img, "PNG", 14, 28, imgWidth, imgHeight);
    pdf.save("relatorio-vendas.pdf");
}

export default function ExportButtons({ data, targetRef, filtersLabel, disabled }) {
    return (
        <div className="export-buttons">
            <button disabled={disabled} onClick={() => downloadCsv(data)}>
                Exportar CSV
            </button>
            <button disabled={disabled} onClick={() => downloadPdf(targetRef, filtersLabel)}>
                Exportar PDF
            </button>
        </div>
    );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ExportButtons.jsx frontend/package.json frontend/package-lock.json
git commit -m "feat(frontend): exportação CSV e PDF"
```

(Verificação funcional acontece na Task 5, quando o Dashboard o usar.)

---

### Task 5: Frontend — Dashboard com filtros, loading/erro e nova estrutura

**Files:**
- Modify: `frontend/src/pages/Dashboard.jsx` (reescrita completa)

- [ ] **Step 1: Reescrever o Dashboard**

Substituir todo o conteúdo de `frontend/src/pages/Dashboard.jsx` por:

```jsx
import { useEffect, useRef, useState } from "react";
import api from "../services/api";
import KPICard from "../components/KPICard";
import SalesLineChart from "../components/SalesLineChart";
import CategoryBarChart from "../components/CategoryBarChart";
import RegionPieChart from "../components/RegionPieChart";
import FilterBar from "../components/FilterBar";
import ExportButtons from "../components/ExportButtons";

const EMPTY_FILTERS = { year: "", region: "", category: "" };

export default function Dashboard() {
    const [filters, setFilters] = useState(EMPTY_FILTERS);
    const [options, setOptions] = useState({ years: [], regions: [], categories: [] });
    const [kpis, setKpis] = useState({});
    const [byMonth, setByMonth] = useState([]);
    const [byCategory, setByCategory] = useState([]);
    const [byRegion, setByRegion] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);
    const dashboardRef = useRef(null);

    useEffect(() => {
        api.get("/stats/filters")
            .then(res => setOptions(res.data))
            .catch(() => setError(true));
    }, [reloadKey]);

    useEffect(() => {
        const params = {};
        if (filters.year) params.year = filters.year;
        if (filters.region) params.region = filters.region;
        if (filters.category) params.category = filters.category;

        setLoading(true);
        setError(false);

        Promise.all([
            api.get("/stats/kpis", { params }),
            api.get("/stats/sales-by-month", { params }),
            api.get("/stats/sales-by-category", { params }),
            api.get("/stats/sales-by-region", { params }),
        ])
            .then(([k, m, c, r]) => {
                setKpis(k.data);
                setByMonth(m.data);
                setByCategory(c.data);
                setByRegion(r.data);
            })
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }, [filters, reloadKey]);

    const filtersLabel = [
        filters.year && `Ano: ${filters.year}`,
        filters.region && `Região: ${options.regions.find(r => String(r.id) === String(filters.region))?.name}`,
        filters.category && `Categoria: ${options.categories.find(c => String(c.id) === String(filters.category))?.name}`,
    ].filter(Boolean).join(", ") || "Sem filtros";

    const fmtEuro = (v) =>
        v != null ? `${Number(v).toLocaleString("pt-PT", { minimumFractionDigits: 2 })} €` : "—";

    if (error) {
        return (
            <div className="dashboard">
                <div className="error-state">
                    <p>Não foi possível carregar os dados.</p>
                    <button onClick={() => setReloadKey(k => k + 1)}>
                        Tentar novamente
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <h1>Dashboard de Vendas</h1>
                <ExportButtons
                    data={{ byMonth, byCategory, byRegion }}
                    targetRef={dashboardRef}
                    filtersLabel={filtersLabel}
                    disabled={loading}
                />
            </header>

            <FilterBar options={options} filters={filters} onChange={setFilters} />

            {loading ? (
                <div className="loading-state">A carregar dados…</div>
            ) : (
                <div ref={dashboardRef}>
                    <div className="kpi-grid">
                        <KPICard title="Total de Vendas" value={fmtEuro(kpis.total_sales)} />
                        <KPICard title="Número de Vendas" value={kpis.total_orders ?? "—"} />
                        <KPICard title="Ticket Médio" value={fmtEuro(kpis.avg_ticket)} />
                        <KPICard title="Unidades Vendidas" value={kpis.total_units ?? "—"} />
                    </div>

                    <div className="chart-grid">
                        <section className="chart-card">
                            <h2>Vendas por Mês</h2>
                            <SalesLineChart data={byMonth} />
                        </section>
                        <section className="chart-card">
                            <h2>Vendas por Categoria</h2>
                            <CategoryBarChart data={byCategory} />
                        </section>
                        <section className="chart-card">
                            <h2>Vendas por Região</h2>
                            <RegionPieChart data={byRegion} />
                        </section>
                    </div>
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 2: Verificar no browser**

Com backend e frontend a correr (`npm run dev` em cada pasta), abrir http://localhost:5173 e confirmar:
- Os 4 KPIs e os 3 gráficos carregam.
- Selecionar um ano/região/categoria atualiza tudo; "Limpar filtros" repõe.
- "Exportar CSV" descarrega um .csv com as 3 secções; "Exportar PDF" descarrega um .pdf com o snapshot.
- Parar o backend e recarregar mostra "Não foi possível carregar os dados" + botão "Tentar novamente" (que funciona após rearrancar o backend).

(O visual ainda está "cru" — o tema escuro chega na Task 6.)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Dashboard.jsx
git commit -m "feat(frontend): dashboard com filtros, exportação e estados de loading/erro"
```

---

### Task 6: Frontend — redesign visual escuro tipo Power BI

**Files:**
- Modify: `frontend/src/index.css` (reescrita completa)
- Modify: `frontend/src/App.css` (esvaziar)
- Modify: `frontend/src/components/KPICard.jsx` (reescrita)
- Modify: `frontend/src/components/SalesLineChart.jsx` (cores/grelha)
- Modify: `frontend/src/components/CategoryBarChart.jsx` (cores/grelha)
- Modify: `frontend/src/components/RegionPieChart.jsx` (cores por fatia)

- [ ] **Step 1: Reescrever index.css com o tema escuro**

Substituir todo o conteúdo de `frontend/src/index.css` por:

```css
:root {
    --bg: #0f1419;
    --surface: #1a2129;
    --surface-2: #222b35;
    --border: #2c3742;
    --text: #e6edf3;
    --text-muted: #8b98a5;
    --accent: #38bdf8;
    --accent-2: #2dd4bf;
    --accent-3: #fbbf24;
    --danger: #f87171;

    font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
    color-scheme: dark;
}

* {
    box-sizing: border-box;
}

body {
    margin: 0;
    background: var(--bg);
    color: var(--text);
}

.dashboard {
    max-width: 1200px;
    margin: 0 auto;
    padding: 24px;
}

.dashboard-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 20px;
}

.dashboard-header h1 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
}

/* ---- Filtros ---- */

.filter-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 16px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 14px 18px;
    margin-bottom: 20px;
}

.filter-bar label {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 0.78rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
}

.filter-bar select {
    background: var(--surface-2);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 7px 10px;
    min-width: 140px;
    font-size: 0.9rem;
}

/* ---- Botões ---- */

button {
    background: var(--surface-2);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 8px 14px;
    font-size: 0.9rem;
    cursor: pointer;
}

button:hover:not(:disabled) {
    border-color: var(--accent);
    color: var(--accent);
}

button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
}

.btn-clear {
    color: var(--danger);
}

.export-buttons {
    display: flex;
    gap: 10px;
}

/* ---- KPIs ---- */

.kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 20px;
}

.kpi-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 18px 20px;
}

.kpi-card h4 {
    margin: 0 0 8px;
    font-size: 0.78rem;
    font-weight: 500;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
}

.kpi-card h2 {
    margin: 0;
    font-size: 1.6rem;
    font-weight: 600;
    color: var(--accent);
}

/* ---- Gráficos ---- */

.chart-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
}

.chart-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 18px 20px;
}

.chart-card h2 {
    margin: 0 0 14px;
    font-size: 1rem;
    font-weight: 600;
}

/* ---- Estados ---- */

.loading-state,
.error-state {
    text-align: center;
    padding: 80px 0;
    color: var(--text-muted);
}

/* ---- Responsivo ---- */

@media (max-width: 900px) {
    .kpi-grid {
        grid-template-columns: repeat(2, 1fr);
    }
    .chart-grid {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 520px) {
    .kpi-grid {
        grid-template-columns: 1fr;
    }
}
```

- [ ] **Step 2: Esvaziar App.css**

Substituir o conteúdo de `frontend/src/App.css` por um ficheiro vazio (ou apagar o ficheiro e remover `import './App.css'` se existir em `App.jsx` — atualmente `App.jsx` não o importa, por isso basta esvaziar).

- [ ] **Step 3: Atualizar KPICard.jsx**

Substituir todo o conteúdo de `frontend/src/components/KPICard.jsx` por:

```jsx
export default function KPICard({ title, value }) {
    return (
        <div className="kpi-card">
            <h4>{title}</h4>
            <h2>{value}</h2>
        </div>
    );
}
```

- [ ] **Step 4: Atualizar SalesLineChart.jsx**

Substituir todo o conteúdo de `frontend/src/components/SalesLineChart.jsx` por:

```jsx
import {
    LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer
} from "recharts";

const monthNames = {
    1: "Jan", 2: "Fev", 3: "Mar", 4: "Abr",
    5: "Mai", 6: "Jun", 7: "Jul", 8: "Ago",
    9: "Set", 10: "Out", 11: "Nov", 12: "Dez"
};

const tooltipStyle = {
    backgroundColor: "#1a2129",
    border: "1px solid #2c3742",
    borderRadius: "6px",
    color: "#e6edf3",
};

export default function SalesLineChart({ data }) {
    const formattedData = data.map(item => ({
        month: monthNames[item.month],
        total_sales: Number(item.total_sales)
    }));

    return (
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={formattedData}>
                <CartesianGrid stroke="#2c3742" strokeDasharray="3 3" />
                <XAxis dataKey="month" stroke="#8b98a5" />
                <YAxis stroke="#8b98a5" />
                <Tooltip contentStyle={tooltipStyle} />
                <Line
                    type="monotone"
                    dataKey="total_sales"
                    name="Vendas (€)"
                    stroke="#38bdf8"
                    strokeWidth={3}
                    dot={{ fill: "#38bdf8" }}
                />
            </LineChart>
        </ResponsiveContainer>
    );
}
```

- [ ] **Step 5: Atualizar CategoryBarChart.jsx**

Substituir todo o conteúdo de `frontend/src/components/CategoryBarChart.jsx` por:

```jsx
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer
} from "recharts";

const tooltipStyle = {
    backgroundColor: "#1a2129",
    border: "1px solid #2c3742",
    borderRadius: "6px",
    color: "#e6edf3",
};

export default function CategoryBarChart({ data }) {
    const formattedData = data.map(item => ({
        category: item.category,
        total_sales: Number(item.total_sales)
    }));

    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={formattedData}>
                <CartesianGrid stroke="#2c3742" strokeDasharray="3 3" />
                <XAxis dataKey="category" stroke="#8b98a5" />
                <YAxis stroke="#8b98a5" />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#222b35" }} />
                <Bar dataKey="total_sales" name="Vendas (€)" fill="#2dd4bf" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
}
```

- [ ] **Step 6: Atualizar RegionPieChart.jsx**

Substituir todo o conteúdo de `frontend/src/components/RegionPieChart.jsx` por:

```jsx
import {
    PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer
} from "recharts";

const COLORS = ["#38bdf8", "#2dd4bf", "#fbbf24", "#a78bfa", "#f87171", "#34d399"];

const tooltipStyle = {
    backgroundColor: "#1a2129",
    border: "1px solid #2c3742",
    borderRadius: "6px",
    color: "#e6edf3",
};

export default function RegionPieChart({ data }) {
    const formattedData = data.map(item => ({
        region: item.region,
        total_sales: Number(item.total_sales)
    }));

    return (
        <ResponsiveContainer width="100%" height={300}>
            <PieChart>
                <Pie
                    data={formattedData}
                    dataKey="total_sales"
                    nameKey="region"
                    outerRadius={100}
                    label
                >
                    {formattedData.map((entry, index) => (
                        <Cell key={entry.region} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
            </PieChart>
        </ResponsiveContainer>
    );
}
```

- [ ] **Step 7: Verificar no browser**

Recarregar http://localhost:5173 e confirmar:
- Tema escuro aplicado: fundo #0f1419, cards com borda, KPIs em 4 colunas, gráficos em grelha 2 colunas.
- Tooltips e eixos legíveis no fundo escuro; pie chart com cores distintas e legenda.
- Estreitar a janela (<900px): grelhas colapsam para 1–2 colunas.
- Exportar PDF de novo — o snapshot reflete o tema escuro.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/index.css frontend/src/App.css frontend/src/components/KPICard.jsx frontend/src/components/SalesLineChart.jsx frontend/src/components/CategoryBarChart.jsx frontend/src/components/RegionPieChart.jsx
git commit -m "feat(frontend): tema escuro tipo Power BI"
```

---

### Task 7: README e verificação final

**Files:**
- Modify: `README.md` (secções 6, 9 e 10)

- [ ] **Step 1: Atualizar o README**

Na secção **6. Funcionalidades do Dashboard**, substituir a lista por:

```markdown
   •	📈 Vendas por Mês (gráfico de linha)
   •	📊 Vendas por Categoria (gráfico de barras)
   •	🍩 Vendas por Região (gráfico circular)
   •	🔢 KPIs (total de vendas, nº de vendas, ticket médio, unidades vendidas)
   •	🔍 Filtros dinâmicos por ano, região e categoria
   •	📤 Exportação de relatórios em CSV e PDF
   •	🌙 Tema escuro profissional e layout responsivo
```

Na secção **9. Execução do Projeto**, atualizar a porta do backend para `http://localhost:3006` (se o README ainda referir 3001).

Na secção **10. Limitações e Melhorias Futuras**, remover as linhas "Implementação de filtros dinâmicos (ano, região)" e "Exportação de relatórios" (já implementadas), mantendo autenticação e integração com dados reais.

- [ ] **Step 2: Verificação final completa**

Com backend e frontend a correr:

```bash
curl -s http://localhost:3006/api/stats/filters | head -c 300; echo
curl -s "http://localhost:3006/api/stats/kpis?year=2024" | head -c 300; echo
cd frontend && npm run build
```

Esperado: JSON válido nos curls; `npm run build` termina sem erros.

No browser: passar pelos filtros, exports e responsividade uma última vez.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: atualizar README com filtros, exportação e tema escuro"
```
