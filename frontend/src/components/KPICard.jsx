export default function KPICard({ title, value }) {
    return (
        <div className="kpi-card">
            <h4>{title}</h4>
            <h2>{value}</h2>
        </div>
    );
}
