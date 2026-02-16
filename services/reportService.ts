import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { NetworkNode, NetworkEdge, NodeResult, EdgeResult, SystemResult } from '../types';

export const generatePDFReport = (
    nodes: NetworkNode[],
    edges: NetworkEdge[],
    nodeResults: Map<string, NodeResult>,
    edgeResults: Map<string, EdgeResult>,
    systemResult: SystemResult,
    sldImage?: string,
    feederName: string = 'Distribution Feeder'
) => {
    const doc = new jsPDF();
    const timestamp = new Date().toLocaleString();

    // --- Page 1: Executive Summary ---
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text('PowerFlow Study Report', 14, 22);

    if (feederName) {
        doc.setFontSize(14);
        doc.setTextColor(51, 65, 85); // slate-700
        doc.text(`Feeder: ${feederName}`, 14, 30);
    }

    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Generated on: ${timestamp}`, 14, feederName ? 35 : 30);

    doc.setDrawColor(200);
    doc.line(14, feederName ? 38 : 35, 196, feederName ? 38 : 35);

    // --- SLD Image ---
    let summaryY = feederName ? 53 : 50;
    if (sldImage) {
        doc.setFontSize(14);
        doc.text('Network Diagram (SLD)', 14, 45);
        // Add image (preserving aspect ratio roughly)
        // A4 width is 210mm. Margin 14mm each side -> 182mm available.
        doc.addImage(sldImage, 'PNG', 14, 50, 182, 100, undefined, 'FAST');
        summaryY = 160;
    }

    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text('1. System Summary', 14, summaryY - 5);

    const summaryData = [
        ['Total Connected Load', `${systemResult.totalLoadKva.toFixed(2)} kVA`],
        ['Total System Losses', `${systemResult.totalLossKw.toFixed(2)} kW`],
        ['Feeder Efficiency', `${(systemResult.feederEfficiency * 100).toFixed(2)}%`],
        ['Minimum System Voltage', `${systemResult.minVoltagePu.toFixed(4)} p.u.`],
        ['Total System length', `${(systemResult.totalSystemLengthMeters / 1000).toFixed(2)} km`],
        ['Total System Resistance', `${systemResult.totalSystemResistanceOhms.toFixed(3)} Ohms`],
    ];

    autoTable(doc, {
        startY: summaryY,
        head: [['Parameter', 'Value']],
        body: summaryData,
        theme: 'grid',
        headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255] },
    });

    doc.setFontSize(16);
    doc.text('2. Critical Path Info', 14, (doc as any).lastAutoTable.finalY + 12);

    const criticalPathData = [
        ['Length', `${(systemResult.criticalPathLengthMeters / 1000).toFixed(2)} km`],
        ['Resistance', `${systemResult.criticalPathResistanceOhms.toFixed(3)} Ohms`],
        ['Critical Node', nodes.find(n => n.id === systemResult.criticalNodeId)?.name || 'N/A'],
    ];

    autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 20,
        head: [['Metric', 'Detail']],
        body: criticalPathData,
        theme: 'grid',
        headStyles: { fillColor: [139, 92, 246] }, // violet-500
    });

    // --- Page 2: Node Analysis ---
    doc.addPage();
    doc.setFontSize(16);
    doc.text('3. Node Voltage Analysis', 14, 22);

    const nodeTableData = nodes.map(node => {
        const res = nodeResults.get(node.id);
        return [
            node.name,
            node.type,
            `${node.baseKv} kV`,
            res ? `${res.voltageKv.toFixed(3)} kV` : 'N/A',
            res ? res.voltagePu.toFixed(4) : 'N/A',
            res ? (res.voltagePu < 0.95 ? 'LOW' : 'NORMAL') : '-'
        ];
    });

    autoTable(doc, {
        startY: 30,
        head: [['Node', 'Type', 'Base kV', 'Actual kV', 'p.u.', 'Status']],
        body: nodeTableData,
        theme: 'striped',
        headStyles: { fillColor: [51, 65, 85] },
        didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 5 && data.cell.text[0] === 'LOW') {
                data.cell.styles.textColor = [239, 68, 68]; // red-500
                data.cell.styles.fontStyle = 'bold';
            }
        }
    });

    // --- Page 3: Edge/Line Analysis ---
    doc.addPage();
    doc.setFontSize(16);
    doc.text('4. Line Loading and Losses', 14, 22);

    const edgeTableData = edges.map(edge => {
        const res = edgeResults.get(edge.id);
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);

        return [
            `${sourceNode?.name || '?'} -> ${targetNode?.name || '?'}`,
            `${(edge.lengthMeters / 1000).toFixed(2)} km`,
            edge.conductorId,
            res ? `${res.currentAmps.toFixed(1)} A` : 'N/A',
            res ? `${res.loadingPercent.toFixed(1)}%` : 'N/A',
            res ? `${res.powerLossKw.toFixed(3)} kW` : 'N/A'
        ];
    });

    autoTable(doc, {
        startY: 30,
        head: [['From-To', 'Length', 'Cond.', 'Current', 'Loading', 'Loss']],
        body: edgeTableData,
        theme: 'striped',
        headStyles: { fillColor: [51, 65, 85] },
        didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 4) {
                const val = parseFloat(data.cell.text[0]);
                if (val > 100) data.cell.styles.textColor = [239, 68, 68];
                else if (val > 80) data.cell.styles.textColor = [245, 158, 11];
            }
        }
    });

    // Save the PDF
    doc.save(`PowerFlow_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
};
