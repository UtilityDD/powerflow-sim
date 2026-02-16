import React, { useState } from 'react';
import { X, FileText, Info } from 'lucide-react';

interface FeederNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string) => void;
}

export const FeederNameModal: React.FC<FeederNameModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [feederName, setFeederName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(feederName.trim() || 'Distribution Feeder');
    setFeederName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-700 w-full max-w-md rounded-xl shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-400" />
            Report Details
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors hover:bg-gray-800 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="feeder-name" className="block text-sm font-medium text-gray-400 mb-1.5">
              Name of the Feeder
            </label>
            <input
              id="feeder-name"
              type="text"
              autoFocus
              value={feederName}
              onChange={(e) => setFeederName(e.target.value)}
              placeholder="e.g. North Feeder 11kV"
              className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
            />
          </div>

          <div className="flex items-start gap-2 p-3 bg-blue-900/20 border border-blue-800/50 rounded-lg text-blue-300 text-xs leading-relaxed">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <p>This name will be displayed in the header of the generated PDF report for identification.</p>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-2">
            <button 
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-purple-900/20"
            >
              Generate PDF
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
