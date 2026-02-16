import { Conductor, NetworkNode, NetworkEdge } from './types';

export const CONDUCTORS: Conductor[] = [
  { id: 'rabbit', name: 'Rabbit (50 sqmm)', resistancePerKm: 0.5426, maxCurrentAmps: 180 },
  { id: 'raccoon', name: 'Raccoon (95 sqmm)', resistancePerKm: 0.3656, maxCurrentAmps: 240 },
  { id: 'dog', name: 'Dog (100 sqmm)', resistancePerKm: 0.2733, maxCurrentAmps: 300 },
  { id: 'wolf', name: 'Wolf (150 sqmm)', resistancePerKm: 0.1828, maxCurrentAmps: 410 },
  { id: 'panther', name: 'Panther (200 sqmm)', resistancePerKm: 0.1363, maxCurrentAmps: 480 },
];

// Initial Data for the Demo
export const INITIAL_NODES: NetworkNode[] = [
  { id: 'n1', x: 100, y: 300, name: 'N1 (Source)', type: 'SOURCE', baseKv: 11, loadKva: 0, pf: 1.0, loadType: 'Industrial' },
  { id: 'n2', x: 300, y: 300, name: 'N2', type: 'LOAD', baseKv: 11, loadKva: 50, pf: 0.9, loadType: 'Residential' },
  { id: 'n3', x: 500, y: 300, name: 'N3', type: 'LOAD', baseKv: 11, loadKva: 80, pf: 0.85, loadType: 'Commercial' },
  { id: 'n4', x: 700, y: 300, name: 'N4', type: 'LOAD', baseKv: 11, loadKva: 120, pf: 0.9, loadType: 'Industrial' },
  { id: 'n5', x: 500, y: 150, name: 'N5', type: 'LOAD', baseKv: 11, loadKva: 40, pf: 0.95, loadType: 'Residential' },
  { id: 'n6', x: 700, y: 150, name: 'N6', type: 'LOAD', baseKv: 11, loadKva: 30, pf: 0.9, loadType: 'Residential' },
];

export const INITIAL_EDGES: NetworkEdge[] = [
  { id: 'e1', source: 'n1', target: 'n2', lengthMeters: 500, conductorId: 'dog' },
  { id: 'e2', source: 'n2', target: 'n3', lengthMeters: 400, conductorId: 'dog' },
  { id: 'e3', source: 'n3', target: 'n4', lengthMeters: 600, conductorId: 'rabbit' },
  { id: 'e4', source: 'n2', target: 'n5', lengthMeters: 300, conductorId: 'rabbit' },
  { id: 'e5', source: 'n5', target: 'n6', lengthMeters: 250, conductorId: 'rabbit' },
];

export const VOLTAGE_THRESHOLDS = {
  LOW: 0.90,
  WARN: 0.95,
};