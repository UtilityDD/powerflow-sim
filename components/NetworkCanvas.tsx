import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { NetworkNode, NetworkEdge, SelectionState, NodeResult, EdgeResult } from '../types';
import { VOLTAGE_THRESHOLDS, CONDUCTORS } from '../constants';

interface NetworkCanvasProps {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  nodeResults: Map<string, NodeResult>;
  edgeResults: Map<string, EdgeResult>;
  highlightedEdgeIds: string[]; // Edges to highlight
  onSelectionChange: (selection: SelectionState) => void;
  onNodeMove: (id: string, x: number, y: number) => void;
  onBackgroundClick: () => void;
}

export const NetworkCanvas: React.FC<NetworkCanvasProps> = ({
  nodes,
  edges,
  nodeResults,
  edgeResults,
  highlightedEdgeIds,
  onSelectionChange,
  onNodeMove,
  onBackgroundClick
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .style('background-color', '#0f172a'); // slate-900

    // --- Defs for Arrows ---
    let defs = svg.select<SVGDefsElement>('defs');
    if (defs.empty()) {
      defs = svg.append('defs');

      // Arrow Marker
      defs.append('marker')
        .attr('id', 'arrow')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 22) // 12 (Source Radius) + 10 (Padding)
        .attr('refY', 0)
        .attr('markerWidth', 8) // Fixed size 8px
        .attr('markerHeight', 8) // Fixed size 8px
        .attr('markerUnits', 'userSpaceOnUse') // Prevent scaling with line width
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', '#64748b'); // slate-500
    }

    // Groups Layering
    let gMain = svg.select<SVGGElement>('g.main-group');
    if (gMain.empty()) {
      gMain = svg.append('g').attr('class', 'main-group');
    }

    // Order: Highlight -> Links -> HitLinks (invisible but clickable) -> Arrows/Labels -> Nodes
    let highlightGroup = gMain.select<SVGGElement>('g.highlights');
    if (highlightGroup.empty()) highlightGroup = gMain.append('g').attr('class', 'highlights');

    let linkGroup = gMain.select<SVGGElement>('g.links');
    if (linkGroup.empty()) linkGroup = gMain.append('g').attr('class', 'links');

    // New Group for Hit Areas
    let hitLinkGroup = gMain.select<SVGGElement>('g.hit-links');
    if (hitLinkGroup.empty()) hitLinkGroup = gMain.append('g').attr('class', 'hit-links');

    let labelGroup = gMain.select<SVGGElement>('g.labels');
    if (labelGroup.empty()) labelGroup = gMain.append('g').attr('class', 'labels');

    let nodeGroup = gMain.select<SVGGElement>('g.nodes');
    if (nodeGroup.empty()) nodeGroup = gMain.append('g').attr('class', 'nodes');

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 5])
      .on('zoom', (event) => {
        gMain.attr('transform', event.transform);
      });
    svg.call(zoom);

    // --- Helper to get line start/end based on flow direction ---
    // Supports overrides for dragging (mx, my)
    const getCoords = (edge: NetworkEdge, movingNodeId?: string, mx?: number, my?: number) => {
      const s = nodes.find(n => n.id === edge.source);
      const t = nodes.find(n => n.id === edge.target);

      let sx = s?.x || 0;
      let sy = s?.y || 0;
      let tx = t?.x || 0;
      let ty = t?.y || 0;

      if (movingNodeId) {
        if (edge.source === movingNodeId) { sx = mx!; sy = my!; }
        if (edge.target === movingNodeId) { tx = mx!; ty = my!; }
      }

      const res = edgeResults.get(edge.id);
      const isReverse = res && !res.isForward;

      // If forward: Start=Source, End=Target
      // If reverse: Start=Target, End=Source (so arrow points to Source)
      const x1 = isReverse ? tx : sx;
      const y1 = isReverse ? ty : sy;
      const x2 = isReverse ? sx : tx;
      const y2 = isReverse ? sy : ty;
      return { x1, y1, x2, y2 };
    };

    // --- Highlights (Critical Path) ---
    // We only render highlights for edges present in highlightedEdgeIds
    const highlightedEdges = edges.filter(e => highlightedEdgeIds.includes(e.id));

    const highlightSelection = highlightGroup
      .selectAll<SVGLineElement, NetworkEdge>('line')
      .data(highlightedEdges, (d) => d.id);

    const highlightEnter = highlightSelection.enter()
      .append('line')
      .attr('stroke-linecap', 'round')
      .attr('stroke-opacity', 0.4);

    const highlightUpdate = highlightEnter.merge(highlightSelection);

    highlightUpdate
      .attr('x1', d => getCoords(d).x1)
      .attr('y1', d => getCoords(d).y1)
      .attr('x2', d => getCoords(d).x2)
      .attr('y2', d => getCoords(d).y2)
      .attr('stroke', '#a855f7') // purple-500 glow
      .attr('stroke-width', 12)
      .style('pointer-events', 'none'); // Highlights shouldn't capture clicks

    highlightSelection.exit().remove();

    // --- Visual Links (The visible thin lines) ---
    const linkSelection = linkGroup
      .selectAll<SVGLineElement, NetworkEdge>('line')
      .data(edges, (d) => d.id);

    const linkEnter = linkSelection.enter()
      .append('line')
      .attr('stroke-linecap', 'round')
      .attr('marker-end', 'url(#arrow)')
      .style('pointer-events', 'none'); // Let clicks pass significantly to hit-area or just ignore

    const linkUpdate = linkEnter.merge(linkSelection);

    linkUpdate
      .attr('x1', d => getCoords(d).x1)
      .attr('y1', d => getCoords(d).y1)
      .attr('x2', d => getCoords(d).x2)
      .attr('y2', d => getCoords(d).y2)
      .attr('stroke', d => {
        const res = edgeResults.get(d.id);
        if (!res) return '#4b5563';
        if (res.loadingPercent > 100) return '#ef4444';
        if (res.loadingPercent > 80) return '#f59e0b';
        return '#60a5fa';
      })
      .attr('stroke-width', d => {
        const res = edgeResults.get(d.id);
        return Math.max(2, Math.min(6, (res?.currentAmps || 0) / 20));
      });

    linkSelection.exit().remove();

    // --- Hit Area Links (Invisible thick lines) ---
    const hitLinkSelection = hitLinkGroup
      .selectAll<SVGLineElement, NetworkEdge>('line')
      .data(edges, (d) => d.id);

    const hitLinkEnter = hitLinkSelection.enter()
      .append('line')
      .attr('stroke', 'transparent')
      .attr('stroke-width', 15) // Thick hit area
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        onSelectionChange({ type: 'EDGE', id: d.id });
      });

    const hitLinkUpdate = hitLinkEnter.merge(hitLinkSelection);

    hitLinkUpdate
      .attr('x1', d => getCoords(d).x1)
      .attr('y1', d => getCoords(d).y1)
      .attr('x2', d => getCoords(d).x2)
      .attr('y2', d => getCoords(d).y2);

    hitLinkSelection.exit().remove();


    // --- Edge Labels (Currents, Length, Conductor) ---
    const labelSelection = labelGroup
      .selectAll<SVGTextElement, NetworkEdge>('text')
      .data(edges, (d) => d.id);

    const labelEnter = labelSelection.enter()
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .style('pointer-events', 'none')
      // Halo effect to prevent text from being unreadable over the line
      .style('paint-order', 'stroke')
      .style('stroke', '#0f172a') // Match background color
      .style('stroke-width', '4px')
      .style('stroke-linecap', 'round')
      .style('stroke-linejoin', 'round');

    const labelUpdate = labelEnter.merge(labelSelection);

    labelUpdate.each(function (d) {
      const el = d3.select(this);
      const res = edgeResults.get(d.id);
      const cond = CONDUCTORS.find(c => c.id === d.conductorId);
      const lenKm = d.lengthMeters / 1000;
      const condName = cond ? cond.name.split(' ')[0] : d.conductorId;

      const c = getCoords(d);
      const cx = (c.x1 + c.x2) / 2;
      const cy = (c.y1 + c.y2) / 2;

      el.attr('x', cx)
        .attr('y', cy)
        .text(null); // Clear existing tspans/text

      const hasCurrent = res && res.currentAmps > 0.1;

      // Line 1: Current
      if (hasCurrent) {
        el.append('tspan')
          .attr('x', cx)
          .attr('dy', '-0.5em')
          .attr('font-weight', 'bold')
          .attr('fill', '#e2e8f0') // brighter for current
          .text(`I=${res.currentAmps.toFixed(1)}A`);
      }

      // Line 2: Length and Conductor
      el.append('tspan')
        .attr('x', cx)
        .attr('dy', hasCurrent ? '1.2em' : '0.35em') // Adjust offset if only one line
        .attr('fill', '#94a3b8') // darker gray
        .attr('font-size', '9px')
        .text(`${lenKm}km • ${condName}`);
    });

    labelSelection.exit().remove();


    // --- Nodes ---
    const nodeSelection = nodeGroup
      .selectAll<SVGGElement, NetworkNode>('g.node')
      .data(nodes, (d) => d.id);

    const nodeEnter = nodeSelection.enter()
      .append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      // Don't attach drag here, attach to merged selection to keep closures fresh
      .on('click', (event, d) => {
        event.stopPropagation();
        onSelectionChange({ type: 'NODE', id: d.id });
      });

    // Invisible Hit Circle (Larger)
    nodeEnter.append('circle')
      .attr('class', 'hit-circle')
      .attr('r', 20)
      .attr('fill', 'transparent');

    // Visible Circle
    nodeEnter.append('circle')
      .attr('class', 'visible-circle')
      .attr('r', d => d.type === 'SOURCE' ? 12 : 8)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    nodeEnter.append('text')
      .attr('dy', -15)
      .attr('text-anchor', 'middle')
      .attr('fill', '#e2e8f0')
      .attr('font-size', '10px')
      .attr('class', 'select-none pointer-events-none')
      .style('paint-order', 'stroke')
      .style('stroke', '#0f172a')
      .style('stroke-width', '3px')
      .text(d => d.name);

    nodeEnter.append('text')
      .attr('class', 'voltage-label select-none pointer-events-none')
      .attr('dy', 22)
      .attr('text-anchor', 'middle')
      .attr('font-size', '9px')
      .attr('fill', '#94a3b8')
      .style('paint-order', 'stroke')
      .style('stroke', '#0f172a')
      .style('stroke-width', '3px');

    const nodeUpdate = nodeEnter.merge(nodeSelection as any);

    nodeUpdate
      .attr('transform', d => `translate(${d.x},${d.y})`);

    nodeUpdate.select('circle.visible-circle')
      .attr('fill', d => {
        const res = nodeResults.get(d.id);
        if (!res) return '#6b7280';
        if (d.type === 'SOURCE') return '#8b5cf6';
        if (res.voltagePu < VOLTAGE_THRESHOLDS.LOW) return '#ef4444';
        if (res.voltagePu < VOLTAGE_THRESHOLDS.WARN) return '#eab308';
        return '#22c55e';
      });

    nodeUpdate.select('text.voltage-label')
      .text(d => {
        const res = nodeResults.get(d.id);
        return res ? `${res.voltageKv.toFixed(2)}kV` : '';
      });

    // Define Drag Behavior with fresh closure
    const dragBehavior = d3.drag<SVGGElement, NetworkNode>()
      .on('start', (event) => {
        d3.select(event.sourceEvent.target).attr('cursor', 'grabbing');
      })
      .on('drag', (event, d) => {
        // Update datum internal state
        d.x = event.x;
        d.y = event.y;

        // Visual Update of Node
        d3.select(event.sourceEvent.currentTarget).attr('transform', `translate(${event.x},${event.y})`);

        // Visual Update of Links & Labels
        const updateLines = (selection: d3.Selection<any, any, any, any>) => {
          selection
            .filter(l => l.source === d.id || l.target === d.id)
            .attr('x1', (l: NetworkEdge) => getCoords(l, d.id, event.x, event.y).x1)
            .attr('y1', (l: NetworkEdge) => getCoords(l, d.id, event.x, event.y).y1)
            .attr('x2', (l: NetworkEdge) => getCoords(l, d.id, event.x, event.y).x2)
            .attr('y2', (l: NetworkEdge) => getCoords(l, d.id, event.x, event.y).y2);
        }

        updateLines(linkUpdate);
        updateLines(hitLinkUpdate); // Update hit links too
        updateLines(highlightUpdate); // Update highlights too

        labelUpdate
          .filter(l => l.source === d.id || l.target === d.id)
          .each(function (l) {
            const c = getCoords(l, d.id, event.x, event.y);
            const cx = (c.x1 + c.x2) / 2;
            const cy = (c.y1 + c.y2) / 2;

            const el = d3.select(this);
            el.attr('x', cx).attr('y', cy);
            el.selectAll('tspan').attr('x', cx);
          });
      })
      .on('end', (event, d) => {
        d3.select(event.sourceEvent.target).attr('cursor', 'grab');
        onNodeMove(d.id, event.x, event.y);
      });

    // Apply drag to 'nodeUpdate' (merged) to ensure fresh listeners
    nodeUpdate.call(dragBehavior);

    nodeSelection.exit().remove();

  }, [nodes, edges, nodeResults, edgeResults, highlightedEdgeIds, onNodeMove, onSelectionChange]);

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden bg-gray-950 relative">
      <svg
        ref={svgRef}
        id="network-svg"
        className="block w-full h-full cursor-grab active:cursor-grabbing"
        onClick={() => onSelectionChange({ type: null, id: null })}
      />
      {/* Legend */}
      <div className="absolute top-4 left-4 bg-gray-900/90 backdrop-blur p-3 rounded-lg border border-gray-800 shadow-xl pointer-events-none">
        <h4 className="text-[10px] uppercase font-bold text-gray-500 mb-2 tracking-wider">Voltage Levels</h4>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
          <span className="text-xs text-gray-300">&gt; 95%</span>
        </div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]"></span>
          <span className="text-xs text-gray-300">90% - 95%</span>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span>
          <span className="text-xs text-gray-300">&lt; 90%</span>
        </div>

        <div className="h-px bg-gray-700 my-2"></div>
        <div className="flex items-center gap-2">
          <span className="w-8 h-1 bg-purple-500 rounded opacity-60"></span>
          <span className="text-xs text-gray-300">Critical Path</span>
        </div>
      </div>
    </div>
  );
};