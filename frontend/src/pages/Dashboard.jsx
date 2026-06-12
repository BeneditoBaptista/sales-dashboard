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

        const controller = new AbortController();
        const { signal } = controller;

        setLoading(true);
        setError(false);

        Promise.all([
            api.get("/stats/kpis", { params, signal }),
            api.get("/stats/sales-by-month", { params, signal }),
            api.get("/stats/sales-by-category", { params, signal }),
            api.get("/stats/sales-by-region", { params, signal }),
        ])
            .then(([k, m, c, r]) => {
                setKpis(k.data);
                setByMonth(m.data);
                setByCategory(c.data);
                setByRegion(r.data);
                setLoading(false);
            })
            .catch((err) => {
                if (signal.aborted) return;
                console.error(err);
                setError(true);
                setLoading(false);
            });

        return () => controller.abort();
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
