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
    try {
        await generatePdf(targetRef, filtersLabel);
    } catch (err) {
        console.error(err);
        alert("Não foi possível gerar o PDF. Tente novamente.");
    }
}

async function generatePdf(targetRef, filtersLabel) {
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
