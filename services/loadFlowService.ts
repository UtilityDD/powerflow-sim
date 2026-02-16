import { NetworkNode, NetworkEdge, Conductor, NodeResult, EdgeResult, SystemResult } from '../types';
import { CONDUCTORS } from '../constants';

// Helper to find conductor props
const getConductor = (id: string): Conductor => {
  return CONDUCTORS.find(c => c.id === id) || CONDUCTORS[0];
};

/**
 * Performs a radial load flow calculation.
 * Assumptions:
 * 1. Network is radial (tree structure).
 * 2. Source node is the root.
 * 3. Balanced 3-phase system.
 * 4. Simplified non-iterative sweep for real-time performance.
 */
export const calculateLoadFlow = (
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  sourceKv: number
): { nodeResults: Map<string, NodeResult>; edgeResults: Map<string, EdgeResult>; systemResult: SystemResult } => {
  
  const nodeMap = new Map<string, NetworkNode>();
  nodes.forEach(n => nodeMap.set(n.id, n));

  const adjacency = new Map<string, NetworkEdge[]>();
  edges.forEach(e => {
    if (!adjacency.has(e.source)) adjacency.set(e.source, []);
    if (!adjacency.has(e.target)) adjacency.set(e.target, []);
    adjacency.get(e.source)?.push(e);
    adjacency.get(e.target)?.push(e);
  });

  // 1. Determine Topology (BFS from Source)
  const sourceNode = nodes.find(n => n.type === 'SOURCE');
  if (!sourceNode) throw new Error("No Source Node found");

  const parentMap = new Map<string, { parentId: string, edge: NetworkEdge }>();
  const levelOrder: string[] = []; // For backward sweep (reverse of this)
  const visited = new Set<string>();
  const queue = [sourceNode.id];
  visited.add(sourceNode.id);

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    levelOrder.push(currentId);

    const neighbors = adjacency.get(currentId) || [];
    for (const edge of neighbors) {
      const neighborId = edge.source === currentId ? edge.target : edge.source;
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        parentMap.set(neighborId, { parentId: currentId, edge });
        queue.push(neighborId);
      }
    }
  }

  // Initialize Results
  const nodeResults = new Map<string, NodeResult>();
  const edgeResults = new Map<string, EdgeResult>();
  
  // Accumulated Load (Complex power S = P + jQ)
  const accumulatedLoad = new Map<string, { p: number, q: number }>(); 

  nodes.forEach(n => {
    // S = P + jQ
    // P = S * pf, Q = S * sin(acos(pf))
    const angle = Math.acos(n.pf);
    const p = n.loadKva * n.pf;
    const q = n.loadKva * Math.sin(angle);
    accumulatedLoad.set(n.id, { p, q });
  });

  // 2. Backward Sweep (Summing Loads from leaves to source)
  for (let i = levelOrder.length - 1; i >= 0; i--) {
    const nodeId = levelOrder[i];
    if (nodeId === sourceNode.id) continue;

    const parentInfo = parentMap.get(nodeId);
    if (!parentInfo) continue;

    const myLoad = accumulatedLoad.get(nodeId)!;
    const parentLoad = accumulatedLoad.get(parentInfo.parentId)!;

    // Add my load to parent
    parentLoad.p += myLoad.p;
    parentLoad.q += myLoad.q;
  }

  // Calculate Total System R & L
  let totalSystemLengthMeters = 0;
  let totalSystemResistanceOhms = 0;

  edges.forEach(e => {
    totalSystemLengthMeters += e.lengthMeters;
    const c = getConductor(e.conductorId);
    totalSystemResistanceOhms += c.resistancePerKm * (e.lengthMeters / 1000);
  });

  // 3. Forward Sweep (Voltage Drop & Distance Calculation)
  nodeResults.set(sourceNode.id, {
    nodeId: sourceNode.id,
    voltageKv: sourceKv,
    voltagePu: 1.0,
    angleDegrees: 0,
    dropPercent: 0
  });

  // Track distances for longest path (Geometric)
  const nodeDistances = new Map<string, number>();
  nodeDistances.set(sourceNode.id, 0);
  let maxDistance = 0;
  let farthestNodeId = sourceNode.id;

  let totalLossKw = 0;

  for (const nodeId of levelOrder) {
    if (nodeId === sourceNode.id) continue;

    const parentInfo = parentMap.get(nodeId)!;
    const parentResult = nodeResults.get(parentInfo.parentId)!;
    const edge = parentInfo.edge;
    const conductor = getConductor(edge.conductorId);

    // Distance Calculation
    const parentDist = nodeDistances.get(parentInfo.parentId) || 0;
    const currentDist = parentDist + edge.lengthMeters;
    nodeDistances.set(nodeId, currentDist);
    
    if (currentDist > maxDistance) {
        maxDistance = currentDist;
        farthestNodeId = nodeId;
    }

    const isForward = edge.source === parentInfo.parentId;

    const downstreamS = accumulatedLoad.get(nodeId)!; 
    const sMagnitude = Math.sqrt(downstreamS.p ** 2 + downstreamS.q ** 2);
    
    const vBase = parentResult.voltageKv || sourceKv;
    const currentAmps = sMagnitude > 0 ? (sMagnitude / (Math.sqrt(3) * vBase)) : 0;

    const rTotal = conductor.resistancePerKm * (edge.lengthMeters / 1000);
    const xTotal = (conductor.reactancePerKm || 0) * (edge.lengthMeters / 1000);

    const flowPf = sMagnitude > 0 ? downstreamS.p / sMagnitude : 1.0;
    const flowAngle = Math.acos(flowPf);
    const sinPhi = Math.sin(flowAngle);

    const vDropLine = (Math.sqrt(3) * currentAmps * (rTotal * flowPf + xTotal * sinPhi)) / 1000; // in kV
    
    const nodeVoltageKv = parentResult.voltageKv - vDropLine;
    const nodeVoltagePu = nodeVoltageKv / sourceKv;

    const lossKw = (3 * (currentAmps ** 2) * rTotal) / 1000;
    totalLossKw += lossKw;

    nodeResults.set(nodeId, {
      nodeId: nodeId,
      voltageKv: nodeVoltageKv,
      voltagePu: nodeVoltagePu,
      angleDegrees: 0,
      dropPercent: (1 - nodeVoltagePu) * 100
    });

    edgeResults.set(edge.id, {
      edgeId: edge.id,
      currentAmps,
      loadingPercent: (currentAmps / conductor.maxCurrentAmps) * 100,
      powerLossKw: lossKw,
      voltageDropKv: vDropLine,
      isForward
    });
  }

  // System Stats
  let minV = 1.0;
  let criticalNodeId: string | null = null;
  let totalKva = 0;

  nodes.forEach(n => {
    totalKva += n.loadKva;
    const res = nodeResults.get(n.id);
    if (res && res.voltagePu < minV) {
      minV = res.voltagePu;
      criticalNodeId = n.id;
    }
  });

  // Reconstruct Longest Path (Geometric)
  const longestPathEdgeIds: string[] = [];
  if (farthestNodeId && farthestNodeId !== sourceNode.id) {
    let curr = farthestNodeId;
    while (curr !== sourceNode.id) {
        const info = parentMap.get(curr);
        if (!info) break;
        longestPathEdgeIds.push(info.edge.id);
        curr = info.parentId;
    }
  }

  // Reconstruct Critical Path (Electrical / Voltage)
  // Path from Source to Critical Node (minV)
  let criticalPathLengthMeters = 0;
  let criticalPathResistanceOhms = 0;

  if (criticalNodeId && criticalNodeId !== sourceNode.id) {
    let curr = criticalNodeId;
    while (curr !== sourceNode.id) {
      const info = parentMap.get(curr);
      if (!info) break;

      criticalPathLengthMeters += info.edge.lengthMeters;
      
      const c = getConductor(info.edge.conductorId);
      criticalPathResistanceOhms += c.resistancePerKm * (info.edge.lengthMeters / 1000);

      curr = info.parentId;
    }
  }

  return {
    nodeResults,
    edgeResults,
    systemResult: {
      totalLoadKva: totalKva,
      totalLossKw,
      minVoltagePu: minV,
      criticalNodeId: criticalNodeId,
      feederEfficiency: totalKva > 0 ? (1 - (totalLossKw / (totalKva * 0.9 + totalLossKw))) * 100 : 100,
      longestPathEdgeIds,
      totalSystemLengthMeters,
      totalSystemResistanceOhms,
      criticalPathLengthMeters,
      criticalPathResistanceOhms
    }
  };
};