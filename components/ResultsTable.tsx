import React from 'react';
import { NodeResult, EdgeResult, NetworkNode } from '../types';

interface ResultsTableProps {
  nodes: NetworkNode[];
  nodeResults: Map<string, NodeResult>;
  edgeResults: Map<string, EdgeResult>;
}

export const ResultsTable: React.FC<ResultsTableProps> = ({ nodes, nodeResults, edgeResults }) => {
  const [tab, setTab] = React.useState<'NODES' | 'LINES'>('NODES');

  return (
    <div className="flex flex-col h-full bg-gray-900 text-sm">
      <div className="flex border-b border-gray-700">
        <button 
          onClick={() => setTab('NODES')}
          className={`px-4 py-2 ${tab === 'NODES' ? 'bg-gray-800 text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
        >
          Node Voltages
        </button>
        <button 
          onClick={() => setTab('LINES')}
          className={`px-4 py-2 ${tab === 'LINES' ? 'bg-gray-800 text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
        >
          Line Currents & Losses
        </button>
      </div>

      <div className="flex-1 overflow-auto p-0">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-800 text-gray-400 sticky top-0">
            {tab === 'NODES' ? (
              <tr>
                <th className="p-2">Name</th>
                <th className="p-2">Type</th>
                <th className="p-2">Voltage (kV)</th>
                <th className="p-2">Voltage (p.u.)</th>
                <th className="p-2">Drop (%)</th>
              </tr>
            ) : (
              <tr>
                <th className="p-2">Line ID</th>
                <th className="p-2">I (A)</th>
                <th className="p-2">Loading (%)</th>
                <th className="p-2">Volt Drop (kV)</th>
                <th className="p-2">Loss (kW)</th>
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-gray-800 text-gray-300">
            {tab === 'NODES' ? (
              nodes.map(node => {
                const res = nodeResults.get(node.id);
                return (
                  <tr key={node.id} className="hover:bg-gray-800/50">
                    <td className="p-2 font-medium text-white">{node.name}</td>
                    <td className="p-2 text-xs opacity-70">{node.type}</td>
                    <td className="p-2 text-blue-300">{res?.voltageKv.toFixed(3)}</td>
                    <td className={`p-2 font-mono ${res && res.voltagePu < 0.9 ? 'text-red-400 font-bold' : res && res.voltagePu < 0.95 ? 'text-yellow-400' : 'text-green-400'}`}>
                      {res?.voltagePu.toFixed(4)}
                    </td>
                    <td className="p-2">{res?.dropPercent.toFixed(2)}%</td>
                  </tr>
                );
              })
            ) : (
              Array.from(edgeResults.values()).map((res: EdgeResult) => (
                <tr key={res.edgeId} className="hover:bg-gray-800/50">
                  <td className="p-2 font-medium">{res.edgeId}</td>
                  <td className="p-2 text-blue-300">{res.currentAmps.toFixed(2)}</td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${res.loadingPercent > 90 ? 'bg-red-500' : 'bg-green-500'}`} 
                          style={{ width: `${Math.min(res.loadingPercent, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs">{res.loadingPercent.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="p-2">{res.voltageDropKv.toFixed(4)}</td>
                  <td className="p-2 text-orange-300">{res.powerLossKw.toFixed(3)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};