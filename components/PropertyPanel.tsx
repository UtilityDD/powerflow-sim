import React, { useEffect, useState } from 'react';
import { NetworkNode, NetworkEdge, SelectionState, Conductor } from '../types';
import { CONDUCTORS } from '../constants';

interface PropertyPanelProps {
  selection: SelectionState;
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  onUpdateNode: (node: NetworkNode) => void;
  onUpdateEdge: (edge: NetworkEdge) => void;
  onDelete: () => void;
  onCreateBranch: (sourceNodeId: string) => void;
}

// Helper component to handle numeric input state nicely
const NumericInput = ({ value, onChange, label, step = 1, suffix }: { value: number, onChange: (val: number) => void, label: string, step?: number, suffix?: string }) => {
  const [localValue, setLocalValue] = useState(value.toString());

  useEffect(() => {
    // Only update local state from prop if the numeric values differ
    // This allows the user to type "5." without it being reset to "5" immediately
    if (parseFloat(localValue) !== value) {
      setLocalValue(value.toString());
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valStr = e.target.value;
    setLocalValue(valStr);
    
    // Allow empty string to clear, but don't emit 0 immediately if you want required fields
    if (valStr === '') return;
    
    const num = parseFloat(valStr);
    if (!isNaN(num)) {
      onChange(num);
    }
  };

  const handleBlur = () => {
     // On blur, ensure formatted consistency
     setLocalValue(value.toString());
  };

  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
      <div className="relative">
        <input 
          type="number" 
          step={step}
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
        />
        {suffix && <span className="absolute right-2 top-1.5 text-gray-500 text-xs">{suffix}</span>}
      </div>
    </div>
  );
};

export const PropertyPanel: React.FC<PropertyPanelProps> = ({
  selection,
  nodes,
  edges,
  onUpdateNode,
  onUpdateEdge,
  onDelete,
  onCreateBranch
}) => {
  if (!selection.type || !selection.id) {
    return (
      <div className="p-4 text-gray-500 text-center text-sm flex flex-col items-center justify-center h-full">
        <p>Select a node or line to edit properties.</p>
      </div>
    );
  }

  const renderNodeForm = () => {
    const node = nodes.find(n => n.id === selection.id);
    if (!node) return null;

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            Node Properties
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Name</label>
              <input 
                type="text" 
                value={node.name}
                onChange={(e) => onUpdateNode({ ...node, name: e.target.value })}
                className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {node.type === 'SOURCE' && (
              <NumericInput 
                label="Base Voltage (kV)" 
                value={node.baseKv} 
                onChange={(val) => onUpdateNode({ ...node, baseKv: val })} 
                suffix="kV"
              />
            )}

            {node.type === 'LOAD' && (
              <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700 space-y-3">
                 <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wide mb-2">Load Configuration</h4>
                 
                 <NumericInput 
                    label="Load Power" 
                    value={node.loadKva} 
                    onChange={(val) => onUpdateNode({ ...node, loadKva: val })} 
                    suffix="kVA"
                 />
                 
                 <NumericInput 
                    label="Power Factor" 
                    value={node.pf} 
                    step={0.01}
                    onChange={(val) => onUpdateNode({ ...node, pf: Math.min(1, Math.max(0, val)) })} 
                 />

                 <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Load Type</label>
                  <select 
                    value={node.loadType}
                    onChange={(e) => onUpdateNode({ ...node, loadType: e.target.value as any })}
                    className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Residential">Residential</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Industrial">Industrial</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="pt-2 flex flex-col gap-3">
           <button 
            onClick={() => onCreateBranch(node.id)}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium py-2.5 rounded transition shadow-lg shadow-blue-900/20"
          >
            + Add New Branch Here
          </button>
          {node.type !== 'SOURCE' && (
            <button 
              onClick={onDelete}
              className="w-full bg-transparent hover:bg-red-900/30 text-red-400 border border-red-900/50 hover:border-red-500 text-xs py-2 rounded transition"
            >
              Delete Node
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderEdgeForm = () => {
    const edge = edges.find(e => e.id === selection.id);
    if (!edge) return null;

    return (
      <div className="space-y-6">
         <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            Line Properties
         </h3>
         
         <div className="space-y-4">
            <NumericInput 
              label="Length" 
              value={edge.lengthMeters} 
              onChange={(val) => onUpdateEdge({ ...edge, lengthMeters: val })} 
              suffix="m"
            />

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Conductor Type</label>
              <select 
                value={edge.conductorId}
                onChange={(e) => onUpdateEdge({ ...edge, conductorId: e.target.value })}
                className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                {CONDUCTORS.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="bg-gray-800 p-3 rounded-lg border border-gray-700 mt-2 space-y-1">
                <p className="text-xs font-semibold text-gray-400 border-b border-gray-700 pb-1 mb-1">Technical Specs</p>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Resistance:</span>
                  <span className="text-gray-300 font-mono">{CONDUCTORS.find(c => c.id === edge.conductorId)?.resistancePerKm} Ω/km</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Max Current:</span>
                  <span className="text-gray-300 font-mono">{CONDUCTORS.find(c => c.id === edge.conductorId)?.maxCurrentAmps} A</span>
                </div>
            </div>
        </div>

        <div className="pt-4">
          <button 
            onClick={onDelete}
            className="w-full bg-transparent hover:bg-red-900/30 text-red-400 border border-red-900/50 hover:border-red-500 text-xs py-2 rounded transition"
          >
            Delete Line
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-5 bg-gray-900 h-full overflow-y-auto custom-scrollbar">
      {selection.type === 'NODE' ? renderNodeForm() : renderEdgeForm()}
    </div>
  );
};