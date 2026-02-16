import React, { useState } from 'react';
import { X, BookOpen, Calculator, MousePointer2, GitBranch, Zap } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'MANUAL' | 'MATH'>('MANUAL');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-700 w-full max-w-3xl rounded-xl shadow-2xl flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-400" />
            Documentation
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors hover:bg-gray-800 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800 px-4">
          <button
            onClick={() => setActiveTab('MANUAL')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'MANUAL' 
                ? 'border-blue-500 text-blue-400' 
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <MousePointer2 className="w-4 h-4" /> User Manual
          </button>
          <button
            onClick={() => setActiveTab('MATH')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'MATH' 
                ? 'border-blue-500 text-blue-400' 
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Calculator className="w-4 h-4" /> Calculation Basics
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 text-gray-300 space-y-6 custom-scrollbar">
          
          {activeTab === 'MANUAL' && (
            <div className="space-y-6">
              <section>
                <h3 className="text-lg font-semibold text-white mb-3">Interactive Canvas Controls</h3>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <li className="bg-gray-800/50 p-3 rounded border border-gray-700">
                    <strong className="text-blue-300 block mb-1">Pan & Zoom</strong>
                    Click and drag the background to pan. Use your mouse wheel to zoom in/out.
                  </li>
                  <li className="bg-gray-800/50 p-3 rounded border border-gray-700">
                    <strong className="text-blue-300 block mb-1">Move Nodes</strong>
                    Click and drag any node (except the source, which is fixed in logic but movable visually) to rearrange the network.
                  </li>
                  <li className="bg-gray-800/50 p-3 rounded border border-gray-700">
                    <strong className="text-blue-300 block mb-1">Selection</strong>
                    Click on a Node or a Line to view its properties in the right-hand panel. Click the background to deselect.
                  </li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-white mb-3">Editing the Network</h3>
                <div className="space-y-3">
                  <div className="flex gap-3 items-start">
                    <div className="bg-gray-800 p-2 rounded text-green-400 shrink-0"><GitBranch className="w-4 h-4" /></div>
                    <div>
                      <h4 className="font-medium text-white">Adding Branches</h4>
                      <p className="text-sm text-gray-400">Select an existing node. In the Property Panel, click <span className="text-blue-400">"+ Add New Branch Here"</span>. A new node and line will be generated automatically.</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <div className="bg-gray-800 p-2 rounded text-red-400 shrink-0"><X className="w-4 h-4" /></div>
                    <div>
                      <h4 className="font-medium text-white">Deleting Elements</h4>
                      <p className="text-sm text-gray-400">Select a node or line and click "Delete" in the property panel. Note: Deleting a node removes all connected downstream branches.</p>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-white mb-3">Visual Indicators</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-green-500"></span>
                    <span>Voltage is healthy ({'>'} 95%)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                    <span>Voltage is low (90% - 95%)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500"></span>
                    <span>Voltage is critical ({'<'} 90%)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-8 h-1 bg-purple-500 rounded opacity-60"></span>
                    <span><strong>Purple Highlight:</strong> Indicates the geometrically longest path from source to the farthest node.</span>
                  </li>
                </ul>
              </section>
            </div>
          )}

          {activeTab === 'MATH' && (
            <div className="space-y-8">
              <section>
                <h3 className="text-lg font-semibold text-white mb-3">Simulation Methodology</h3>
                <p className="text-sm leading-relaxed">
                  This application uses a simplified <strong>Forward/Backward Sweep</strong> method tailored for radial distribution networks. 
                  Calculations are performed dynamically in real-time on the client side (browser).
                </p>
              </section>

              <section className="space-y-4">
                <div className="p-4 bg-gray-800/40 border border-gray-700 rounded-lg">
                  <h4 className="text-blue-300 font-mono text-sm mb-2 font-bold">1. Current Calculation</h4>
                  <p className="text-sm mb-2">First, we calculate the current flowing through each segment based on the downstream load.</p>
                  <div className="font-mono text-center bg-gray-900 p-3 rounded text-green-400 my-2">
                    I = S / (√3 × V)
                  </div>
                  <p className="text-xs text-gray-500">
                    Where <strong>S</strong> is the apparent power (kVA) magnitude, and <strong>V</strong> is the line-to-line voltage (kV).
                  </p>
                </div>

                <div className="p-4 bg-gray-800/40 border border-gray-700 rounded-lg">
                  <h4 className="text-blue-300 font-mono text-sm mb-2 font-bold">2. Voltage Drop</h4>
                  <p className="text-sm mb-2">Using the segment current, we calculate the voltage drop across the line.</p>
                  <div className="font-mono text-center bg-gray-900 p-3 rounded text-green-400 my-2">
                    V<sub>drop</sub> = √3 × I × (R cosΦ + X sinΦ)
                  </div>
                  <ul className="text-xs text-gray-500 list-disc list-inside mt-2">
                    <li><strong>I</strong>: Line current (Amps)</li>
                    <li><strong>R</strong>: Total resistance of conductor (Ohms)</li>
                    <li><strong>X</strong>: Total reactance (assumed 0 in this version for simplicity)</li>
                    <li><strong>cosΦ</strong>: Power factor of the flow</li>
                  </ul>
                </div>

                <div className="p-4 bg-gray-800/40 border border-gray-700 rounded-lg">
                  <h4 className="text-blue-300 font-mono text-sm mb-2 font-bold">3. Power Losses (Copper Loss)</h4>
                  <p className="text-sm mb-2">Technical losses in the line are calculated using the I²R formula.</p>
                  <div className="font-mono text-center bg-gray-900 p-3 rounded text-green-400 my-2">
                    P<sub>loss</sub> = 3 × I² × R
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-white mb-2">Parameter Assumptions & Conductor Data</h3>
                <p className="text-sm text-gray-400 mb-4">
                    The resistance of lines is calculated based on the specific resistance of the conductor material (Ohms per km) and the length of the line section.
                </p>

                <div className="mb-4">
                    <h4 className="text-sm font-bold text-gray-200 mb-2">Resistance Formula</h4>
                    <div className="font-mono bg-gray-900 p-2 rounded text-gray-300 text-xs inline-block border border-gray-700">
                        R_total = R_per_km × (Length_in_meters / 1000)
                    </div>
                </div>

                <h4 className="text-sm font-bold text-gray-200 mb-2">Standard Conductor Library</h4>
                <div className="overflow-x-auto border border-gray-700 rounded-lg">
                  <table className="w-full text-xs text-left text-gray-400">
                    <thead className="bg-gray-800 text-gray-200">
                      <tr>
                        <th className="p-2 border-r border-gray-700">Type</th>
                        <th className="p-2 border-r border-gray-700">Area (sqmm)</th>
                        <th className="p-2 border-r border-gray-700">Resistance (Ω/km)</th>
                        <th className="p-2">Max Current (A)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      <tr>
                        <td className="p-2 border-r border-gray-700 font-medium text-white">Rabbit</td>
                        <td className="p-2 border-r border-gray-700">50</td>
                        <td className="p-2 border-r border-gray-700">0.5426</td>
                        <td className="p-2">180</td>
                      </tr>
                      <tr>
                        <td className="p-2 border-r border-gray-700 font-medium text-white">Raccoon</td>
                        <td className="p-2 border-r border-gray-700">95</td>
                        <td className="p-2 border-r border-gray-700">0.3656</td>
                        <td className="p-2">240</td>
                      </tr>
                      <tr>
                        <td className="p-2 border-r border-gray-700 font-medium text-white">Dog</td>
                        <td className="p-2 border-r border-gray-700">100</td>
                        <td className="p-2 border-r border-gray-700">0.2733</td>
                        <td className="p-2">300</td>
                      </tr>
                      <tr>
                        <td className="p-2 border-r border-gray-700 font-medium text-white">Wolf</td>
                        <td className="p-2 border-r border-gray-700">150</td>
                        <td className="p-2 border-r border-gray-700">0.1828</td>
                        <td className="p-2">410</td>
                      </tr>
                      <tr>
                        <td className="p-2 border-r border-gray-700 font-medium text-white">Panther</td>
                        <td className="p-2 border-r border-gray-700">200</td>
                        <td className="p-2 border-r border-gray-700">0.1363</td>
                        <td className="p-2">480</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-white mb-2">Other Assumptions</h3>
                <ul className="list-disc list-inside text-sm text-gray-400 space-y-1">
                  <li>The system is assumed to be a balanced 3-phase network.</li>
                  <li>Loads are modeled as constant power (kVA), meaning current increases if voltage drops to maintain power.</li>
                  <li>Conductor temperature is assumed constant (approx 20°C); thermal resistance variation is ignored in this version.</li>
                  <li>Reactance is currently set to 0 for basic resistive drop approximation (typical for DC-like tutorials, but extensible to AC).</li>
                  <li>Power Factor is assumed lagging by default.</li>
                </ul>
              </section>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-gray-900 rounded-b-xl flex justify-end">
          <button 
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};