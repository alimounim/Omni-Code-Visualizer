import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { VariableValue } from '../../types';

interface TreeVisualizerProps {
  name: string;
  data: VariableValue;
}

const TreeVisualizer: React.FC<TreeVisualizerProps> = ({ name, data }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!data || !svgRef.current || !wrapperRef.current) return;

    // 1. Transform generic VariableValue into D3 hierarchy format
    const transformData = (node: VariableValue): any => {
      const children: any[] = [];
      
      // Heuristic: check properties for 'left', 'right', 'next', or arrays of children
      if (node.properties) {
        if (node.properties.left && node.properties.left.value !== null) {
            children.push(transformData(node.properties.left));
        }
        if (node.properties.right && node.properties.right.value !== null) {
            children.push(transformData(node.properties.right));
        }
        // Linked list support
        if (node.properties.next && node.properties.next.value !== null) {
            children.push(transformData(node.properties.next));
        }
      }

      // If 'value' itself is an array of children (n-ary tree)
      if (Array.isArray(node.children)) {
          node.children.forEach(child => children.push(transformData(child)));
      }

      // Extract display value
      let display = node.displayValue || "";
      if (!display && node.properties && node.properties.value) {
          display = String(node.properties.value.value);
      } else if (!display && node.properties && node.properties.data) {
          display = String(node.properties.data.value);
      } else if (!display) {
          display = "Node";
      }

      return {
        name: display,
        address: node.address,
        children: children.length > 0 ? children : undefined
      };
    };

    // Skip if root is null
    if (data.value === null || data.value === 'null') return;

    const treeData = transformData(data);
    const { height } = wrapperRef.current.getBoundingClientRect();
    
    // Dynamic width calculation to prevent overlap
    const root = d3.hierarchy(treeData);
    // Estimate width based on number of leaves
    const leaves = root.leaves().length;
    const minWidthPerLeaf = 60;
    const calculatedWidth = Math.max(wrapperRef.current.clientWidth, leaves * minWidthPerLeaf + 40);
    
    const margin = { top: 30, right: 20, bottom: 20, left: 20 };
    const innerWidth = calculatedWidth - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Clear previous
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
        .attr("width", calculatedWidth)
        .attr("height", Math.max(240, height))
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const treeLayout = d3.tree().size([innerWidth, innerHeight - 50]);
    treeLayout(root);

    // Links
    svg.selectAll('.link')
        .data(root.links())
        .enter()
        .append('path')
        .attr('class', 'link')
        .attr('d', d3.linkVertical()
            .x((d: any) => d.x)
            .y((d: any) => d.y) as any
        )
        .attr('fill', 'none')
        .attr('stroke', '#475569') // slate-600
        .attr('stroke-width', 1.5)
        .attr('opacity', 0.6);

    // Nodes
    const nodes = svg.selectAll('.node')
        .data(root.descendants())
        .enter()
        .append('g')
        .attr('class', 'node')
        .attr('transform', (d: any) => `translate(${d.x},${d.y})`);

    // Node Circle
    nodes.append('circle')
        .attr('r', 14)
        .attr('fill', '#0f172a') // slate-900
        .attr('stroke', '#3b82f6') // blue-500
        .attr('stroke-width', 2)
        .attr('class', 'shadow-lg');

    // Text Halo (Background stroke to prevent overlap issues)
    const textHalo = (text: any) => {
        text.attr('stroke', '#0f172a')
            .attr('stroke-width', 3)
            .attr('stroke-opacity', 0.8)
            .attr('paint-order', 'stroke');
    };

    // Node Value Text
    const texts = nodes.append('text')
        .attr('dy', 5)
        .attr('text-anchor', 'middle')
        .text((d: any) => d.data.name)
        .attr('fill', '#f1f5f9') // slate-100
        .attr('font-size', '11px')
        .attr('font-weight', 'bold')
        .attr('font-family', 'monospace')
        .style('pointer-events', 'none');
    
    // Apply halo
    texts.call(textHalo);

    // Address labels (below node)
    const addrTexts = nodes.append('text')
        .attr('dy', 26)
        .attr('text-anchor', 'middle')
        .text((d: any) => d.data.address || '')
        .attr('fill', '#94a3b8') // slate-400
        .attr('font-size', '9px')
        .attr('font-family', 'monospace');
        
    addrTexts.call(textHalo);

  }, [data]);

  return (
    <div ref={wrapperRef} className="h-64 w-full bg-slate-800/50 rounded-lg border border-slate-700 backdrop-blur-sm relative overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-slate-700">
      <div className="absolute top-2 left-2 text-sm font-semibold text-blue-300 font-mono z-10 sticky left-0">{name} (Tree/List)</div>
      <svg ref={svgRef} className="block" />
    </div>
  );
};

export default TreeVisualizer;