export interface Conductor {
  id: string;
  name: string;
  resistancePerKm: number; // Ohms per km
  reactancePerKm?: number; // Ohms per km (optional for future)
  maxCurrentAmps: number;
}

export interface NetworkNode {
  id: string;
  x: number;
  y: number;
  name: string;
  type: 'SOURCE' | 'LOAD';
  baseKv: number; // Only relevant for source usually, but kept on node for simplicity
  loadKva: number;
  pf: number; // Power Factor (0.0 to 1.0)
  loadType: 'Residential' | 'Commercial' | 'Industrial';
}

export interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  lengthMeters: number;
  conductorId: string;
}

// Result types derived from calculation
export interface NodeResult {
  nodeId: string;
  voltageKv: number;
  voltagePu: number; // Per unit
  angleDegrees: number;
  dropPercent: number;
}

export interface EdgeResult {
  edgeId: string;
  currentAmps: number;
  loadingPercent: number; // relative to conductor capacity
  powerLossKw: number;
  voltageDropKv: number;
  isForward: boolean; // true if flow is Source -> Target, false if Target -> Source
}

export interface SystemResult {
  totalLoadKva: number;
  totalLossKw: number;
  minVoltagePu: number;
  criticalNodeId: string | null;
  feederEfficiency: number;
  longestPathEdgeIds: string[]; // Path to the farthest node (max distance)
  
  // New Stats
  totalSystemLengthMeters: number;
  totalSystemResistanceOhms: number;
  criticalPathLengthMeters: number;
  criticalPathResistanceOhms: number;
}

export interface SelectionState {
  type: 'NODE' | 'EDGE' | null;
  id: string | null;
}