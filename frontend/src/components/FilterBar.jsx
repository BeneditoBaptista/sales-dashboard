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
