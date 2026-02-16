import { useState, useEffect, useCallback, useRef } from 'react';
import { NetworkNode, NetworkEdge } from '../types';
import { INITIAL_NODES, INITIAL_EDGES } from '../constants';

interface NetworkState {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}

interface HistoryState {
  past: NetworkState[];
  present: NetworkState;
  future: NetworkState[];
}

const STORAGE_KEY = 'powerflow_network';

export const useNetworkState = () => {
  // Initial state loader
  const getInitialState = (): NetworkState => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load from local storage', e);
    }
    return { nodes: INITIAL_NODES, edges: INITIAL_EDGES };
  };

  const [history, setHistory] = useState<HistoryState>(() => ({
    past: [],
    present: getInitialState(),
    future: []
  }));

  // Auto-save to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.present));
  }, [history.present]);

  // Helper to push new state
  const pushState = useCallback((newState: NetworkState) => {
    setHistory(curr => {
      // Limit history size if needed (e.g., 50 steps)
      const newPast = [...curr.past, curr.present].slice(-50);
      return {
        past: newPast,
        present: newState,
        future: []
      };
    });
  }, []);

  // --- Actions ---

  const undo = useCallback(() => {
    setHistory(curr => {
      if (curr.past.length === 0) return curr;
      const previous = curr.past[curr.past.length - 1];
      const newPast = curr.past.slice(0, -1);
      return {
        past: newPast,
        present: previous,
        future: [curr.present, ...curr.future]
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory(curr => {
      if (curr.future.length === 0) return curr;
      const next = curr.future[0];
      const newFuture = curr.future.slice(1);
      return {
        past: [...curr.past, curr.present],
        present: next,
        future: newFuture
      };
    });
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          undo();
        } else if (e.key === 'y') {
          e.preventDefault();
          redo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // --- Domain Handlers (Wrapped to use History) ---

  const updateNodeMove = useCallback((id: string, x: number, y: number) => {
    // NOTE: dragging generates too many updates. 
    // We should probably only push state on drag END. 
    // For now, we update local state "quickly" but maybe we need a separate "live" state vs "committed" state?
    // OR: The drag implementation in NetworkCanvas calls onNodeMove on drag END.
    // Checking NetworkCanvas: .on('end', ... onNodeMove) -> YES, it calls onNodeMove only at the end.
    // However, it calls 'drag' event updates locally on the d3 object.
    // Wait, App.tsx's handleNodeMove was: setNodes(prev => ...).

    // So we can treat this as a commit.
    setHistory(curr => {
      const newNodes = curr.present.nodes.map(n => n.id === id ? { ...n, x, y } : n);
      return {
        past: [...curr.past, curr.present],
        present: { ...curr.present, nodes: newNodes },
        future: []
      };
    });
  }, []);

  const updateNode = useCallback((updatedNode: NetworkNode) => {
    setHistory(curr => {
      const newNodes = curr.present.nodes.map(n => n.id === updatedNode.id ? updatedNode : n);
      return {
        past: [...curr.past, curr.present],
        present: { ...curr.present, nodes: newNodes },
        future: []
      };
    });
  }, []);

  const updateEdge = useCallback((updatedEdge: NetworkEdge) => {
    setHistory(curr => {
      const newEdges = curr.present.edges.map(e => e.id === updatedEdge.id ? updatedEdge : e);
      return {
        past: [...curr.past, curr.present],
        present: { ...curr.present, edges: newEdges },
        future: []
      };
    });
  }, []);

  const deleteSelection = useCallback((selection: { type: 'NODE' | 'EDGE' | null, id: string | null }, setSelection: (s: any) => void) => {
    if (!selection.id) return;

    setHistory(curr => {
      let newNodes = curr.present.nodes;
      let newEdges = curr.present.edges;

      if (selection.type === 'NODE') {
        const node = newNodes.find(n => n.id === selection.id);
        if (node?.type === 'SOURCE') return curr; // Cannot delete source

        newNodes = newNodes.filter(n => n.id !== selection.id);
        newEdges = newEdges.filter(e => e.source !== selection.id && e.target !== selection.id);
      } else if (selection.type === 'EDGE') {
        newEdges = newEdges.filter(e => e.id !== selection.id);
      }

      setSelection({ type: null, id: null });

      return {
        past: [...curr.past, curr.present],
        present: { nodes: newNodes, edges: newEdges },
        future: []
      };
    });
  }, []);

  const createBranch = useCallback((sourceNodeId: string, sourceKv: number) => {
    setHistory(curr => {
      const sourceNode = curr.present.nodes.find(n => n.id === sourceNodeId);
      if (!sourceNode) return curr;

      const newId = `n${Date.now()}`;
      const newNode: NetworkNode = {
        id: newId,
        x: sourceNode.x + 100,
        y: sourceNode.y + 50,
        name: `N${curr.present.nodes.length + 1}`,
        type: 'LOAD',
        baseKv: sourceKv,
        loadKva: 10,
        pf: 0.9,
        loadType: 'Residential'
      };

      const newEdge: NetworkEdge = {
        id: `e${Date.now()}`,
        source: sourceNodeId,
        target: newId,
        lengthMeters: 200,
        conductorId: 'rabbit'
      };

      return {
        past: [...curr.past, curr.present],
        present: {
          nodes: [...curr.present.nodes, newNode],
          edges: [...curr.present.edges, newEdge]
        },
        future: []
      };
    });
  }, []);

  const reset = useCallback(() => {
    setHistory(curr => ({
      past: [...curr.past, curr.present],
      present: { nodes: INITIAL_NODES, edges: INITIAL_EDGES },
      future: []
    }));
  }, []);

  const importNetwork = useCallback((data: NetworkState) => {
    if (!data.nodes || !data.edges) throw new Error("Invalid network data");
    setHistory(curr => ({
      past: [...curr.past, curr.present],
      present: data,
      future: []
    }));
  }, []);

  return {
    nodes: history.present.nodes,
    edges: history.present.edges,
    updateNodeMove,
    updateNode,
    updateEdge,
    deleteSelection,
    createBranch,
    undo,
    redo,
    reset,
    importNetwork,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0
  };
};
