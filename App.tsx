import React, { useState, useMemo } from 'react';
import { NetworkNode, NetworkEdge, SelectionState } from './types';
import { calculateLoadFlow } from './services/loadFlowService';
import { NetworkCanvas } from './components/NetworkCanvas';
import { PropertyPanel } from './components/PropertyPanel';
import { ResultsTable } from './components/ResultsTable';
import { HelpModal } from './components/HelpModal';
import { useNetworkState } from './hooks/useNetworkState';
import { Zap, HelpCircle, Undo2, Redo2, Download, Upload, FileText } from 'lucide-react'; // Added icons
import { generatePDFReport } from './services/reportService';

const App: React.FC = () => {
  // State from Custom Hook
  const {
    nodes,
    edges,
    updateNode,
    updateNodeMove,
    updateEdge,
    deleteSelection,
    createBranch,
    undo,
    redo,
    reset,
    importNetwork,
    canUndo,
    canRedo
  } = useNetworkState();

  const [selection, setSelection] = useState<SelectionState>({ type: null, id: null });
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Derived State
  const sourceKv = useMemo(() => {
    return nodes.find(n => n.type === 'SOURCE')?.baseKv || 11;
  }, [nodes]);

  // Results State
  const results = useMemo(() => {
    try {
      return calculateLoadFlow(nodes, edges, sourceKv);
    } catch (e) {
      console.error(e);
      return {
        nodeResults: new Map(),
        edgeResults: new Map(),
        systemResult: {
          totalLoadKva: 0,
          totalLossKw: 0,
          minVoltagePu: 0,
          criticalNodeId: null,
          feederEfficiency: 0,
          longestPathEdgeIds: [],
          totalSystemLengthMeters: 0,
          totalSystemResistanceOhms: 0,
          criticalPathLengthMeters: 0,
          criticalPathResistanceOhms: 0
        }
      };
    }
  }, [nodes, edges, sourceKv]);

  // Handlers
  const handleDelete = () => {
    deleteSelection(selection, setSelection);
  };

  const handleCreateBranch = (sourceNodeId: string) => {
    createBranch(sourceNodeId, sourceKv);
  };

  const handleDownload = () => {
    const data = JSON.stringify({ nodes, edges }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `powerflow-network-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        importNetwork(data);
      } catch (err) {
        alert("Failed to parse JSON file. Ensure it is a valid PowerFlow export.");
        console.error(err);
      }
    };
    reader.readAsText(file);
    // Clear input so same file can be uploaded again
    e.target.value = '';
  };

  const captureSldImage = (): Promise<string> => {
    return new Promise((resolve) => {
      const originalSvg = document.querySelector('#network-svg') as SVGSVGElement | null;
      if (!originalSvg) {
        resolve('');
        return;
      }

      // Clone SVG to modify it for print (white background)
      const svg = originalSvg.cloneNode(true) as SVGSVGElement;

      // Fix colors for white background
      // 1. Text fills: change light colors to dark slate
      svg.querySelectorAll('text').forEach(text => {
        const fill = text.getAttribute('fill');
        if (fill === '#e2e8f0' || fill === '#94a3b8') {
          text.setAttribute('fill', '#1e293b'); // slate-800
        }
      });
      svg.querySelectorAll('tspan').forEach(tspan => {
        const fill = tspan.getAttribute('fill');
        if (fill === '#e2e8f0' || fill === '#94a3b8') {
          tspan.setAttribute('fill', '#1e293b');
        }
      });

      // 2. Text Halos/Strokes: change from dark background color to white
      svg.querySelectorAll('text, tspan').forEach(el => {
        const style = (el as HTMLElement).style;
        if (style.stroke === 'rgb(15, 23, 42)' || style.stroke === '#0f172a') {
          style.stroke = '#ffffff';
        }
      });

      // Serialize modified SVG
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      // High quality capture
      const bbox = originalSvg.getBoundingClientRect();
      canvas.width = bbox.width * 2;
      canvas.height = bbox.height * 2;

      img.onload = () => {
        if (ctx) {
          ctx.fillStyle = '#ffffff'; // White background for PDF
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/png'));
        } else {
          resolve('');
        }
      };

      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      img.src = url;
    });
  };

  const handleReport = async () => {
    const sldImage = await captureSldImage();
    generatePDFReport(
      nodes,
      edges,
      results.nodeResults,
      results.edgeResults,
      results.systemResult,
      sldImage
    );
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-gray-950 text-gray-100 font-sans">
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

      {/* Header */}
      <header className="h-16 bg-gray-900 border-b border-gray-800 flex items-center px-4 justify-between shrink-0 z-10 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 mr-6 shrink-0">
          <Zap className="text-yellow-400 w-6 h-6" />
          <h1 className="text-lg font-bold tracking-tight hidden sm:block">PowerFlow Sim <span className="text-gray-500 text-xs font-normal">v1.1</span></h1>

          {/* Undo / Redo Controls */}
          <div className="flex items-center gap-1 ml-6 border-l border-gray-700 pl-6">
            <button
              onClick={undo}
              disabled={!canUndo}
              className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-5 h-5" />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-5 h-5" />
            </button>

            <div className="w-px h-4 bg-gray-700 mx-2"></div>

            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to reset the network to default? Current changes will be saved in history.")) {
                  reset();
                }
              }}
              className="text-xs text-red-400 hover:text-red-300 font-medium px-2 py-1 hover:bg-red-900/20 rounded transition-colors"
            >
              Reset
            </button>

            <div className="w-px h-4 bg-gray-700 mx-2"></div>

            {/* Import / Export */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleDownload}
                className="p-1.5 rounded hover:bg-gray-800 text-blue-400 hover:text-blue-300 transition-colors"
                title="Export as JSON"
              >
                <Download className="w-5 h-5" />
              </button>
              <label
                className="p-1.5 rounded hover:bg-gray-800 text-green-400 hover:text-green-300 transition-colors cursor-pointer flex items-center justify-center"
                title="Import from JSON"
              >
                <Upload className="w-5 h-5" />
                <input type="file" accept=".json" onChange={handleUpload} className="hidden" />
              </label>

              <div className="w-px h-4 bg-gray-700 mx-1"></div>

              <button
                onClick={handleReport}
                className="p-1.5 rounded hover:bg-gray-800 text-purple-400 hover:text-purple-300 transition-colors"
                title="Generate PDF Report"
              >
                <FileText className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm flex-1 justify-end min-w-max">
          <div className="flex flex-col items-end">
            <span className="text-gray-400 text-[10px] uppercase tracking-wider">Source Voltage</span>
            <span className="font-mono text-blue-400 font-bold text-xs">{sourceKv} kV</span>
          </div>

          <div className="h-8 w-px bg-gray-700"></div>
          <div className="flex flex-col items-end">
            <span className="text-gray-400 text-[10px] uppercase tracking-wider">Total Load</span>
            <span className="font-mono text-white font-bold text-xs">{results.systemResult.totalLoadKva.toFixed(1)} kVA</span>
          </div>

          <div className="h-8 w-px bg-gray-700"></div>
          <div className="flex flex-col items-end">
            <span className="text-gray-400 text-[10px] uppercase tracking-wider">Total R / L</span>
            <span className="font-mono text-gray-300 font-bold text-xs">
              {results.systemResult.totalSystemResistanceOhms.toFixed(2)}Ω / {(results.systemResult.totalSystemLengthMeters / 1000).toFixed(2)}km
            </span>
          </div>

          <div className="h-8 w-px bg-gray-700"></div>
          <div className="flex flex-col items-end">
            <span className="text-gray-400 text-[10px] uppercase tracking-wider">Crit. Path R / L</span>
            <span className="font-mono text-purple-400 font-bold text-xs">
              {results.systemResult.criticalPathResistanceOhms.toFixed(2)}Ω / {(results.systemResult.criticalPathLengthMeters / 1000).toFixed(2)}km
            </span>
          </div>

          <div className="h-8 w-px bg-gray-700"></div>
          <div className="flex flex-col items-end">
            <span className="text-gray-400 text-[10px] uppercase tracking-wider">Feeder Loss</span>
            <span className="font-mono text-orange-400 font-bold text-xs">{results.systemResult.totalLossKw.toFixed(2)} kW</span>
          </div>

          <div className="h-8 w-px bg-gray-700"></div>
          <div className="flex flex-col items-end">
            <span className="text-gray-400 text-[10px] uppercase tracking-wider">Min Voltage</span>
            <span className={`font-mono font-bold text-xs ${results.systemResult.minVoltagePu < 0.9 ? 'text-red-500' : 'text-green-400'}`}>
              {results.systemResult.minVoltagePu.toFixed(4)} p.u.
            </span>
          </div>

          <div className="ml-2 pl-4 border-l border-gray-700">
            <button
              onClick={() => setIsHelpOpen(true)}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-md transition-colors text-xs font-medium border border-gray-700"
            >
              <HelpCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Help</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">

        {/* Canvas Area */}
        <div className="flex-1 relative border-r border-gray-800">
          <NetworkCanvas
            nodes={nodes}
            edges={edges}
            nodeResults={results.nodeResults}
            edgeResults={results.edgeResults}
            highlightedEdgeIds={results.systemResult.longestPathEdgeIds}
            onSelectionChange={setSelection}
            onNodeMove={updateNodeMove}
            onBackgroundClick={() => setSelection({ type: null, id: null })}
          />
        </div>

        {/* Right Sidebar: Properties */}
        <div className="w-80 bg-gray-900 flex flex-col shrink-0">
          <PropertyPanel
            selection={selection}
            nodes={nodes}
            edges={edges}
            onUpdateNode={updateNode}
            onUpdateEdge={updateEdge}
            onDelete={handleDelete}
            onCreateBranch={handleCreateBranch}
          />

          {/* Quick Legend / Info */}
          <div className="mt-auto p-4 border-t border-gray-800 text-xs text-gray-500">
            <p className="mb-2 font-semibold text-gray-400">Controls</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Drag nodes to rearrange.</li>
              <li>Click nodes/lines to edit properties.</li>
              <li>Scroll to zoom, Drag canvas to pan.</li>
              <li><span className="text-gray-300">Ctrl+Z</span> to Undo, <span className="text-gray-300">Ctrl+Y</span> to Redo.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Panel: Tables */}
      <div className="h-64 border-t border-gray-800 shrink-0 relative z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)]">
        <ResultsTable
          nodes={nodes}
          nodeResults={results.nodeResults}
          edgeResults={results.edgeResults}
        />
      </div>
    </div>
  );
};

export default App;