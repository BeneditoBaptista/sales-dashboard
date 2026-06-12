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
