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
