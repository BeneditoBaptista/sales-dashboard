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
