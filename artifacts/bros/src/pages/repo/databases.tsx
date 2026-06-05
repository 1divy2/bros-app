import { useGetDatabases, getGetDatabasesQueryKey } from "@workspace/api-client-react";
import { RepoLayout } from "@/components/layout/repo-layout";
import { RepoPageWrapper } from "@/components/layout/repo-page-wrapper";
import { useParams } from "wouter";
import { useMemo, useState, useCallback } from "react";
import ReactFlow, { Background, Controls, MiniMap, NodeProps, Handle, Position, MarkerType } from "reactflow";
import "reactflow/dist/style.css";
import { Database, Key, Link as LinkIcon, ChevronDown, ChevronRight } from "lucide-react";

// Classic ER Diagram colors
const HEADER_COLORS = [
  "bg-[#8e24aa]", // Purple
  "bg-[#1e88e5]", // Blue
  "bg-[#43a047]", // Green
  "bg-[#e53935]", // Red
  "bg-[#fdd835]", // Yellow
  "bg-[#00acc1]", // Cyan
  "bg-[#fb8c00]", // Orange
];

function DomainGroupNode({ data }: NodeProps) {
  return (
    <div 
      onClick={(e) => { e.stopPropagation(); data.onToggle(data.domain); }}
      className={`border-2 transition-all cursor-pointer relative overflow-hidden ${
         data.isExpanded 
           ? 'border-dashed border-[#3b82f6]/40 bg-[#0a0b0d]/50 rounded-2xl' 
           : 'border-solid border-[#3b82f6] bg-[#1a1b1e] hover:bg-[#25262b] shadow-lg rounded-xl'
      }`}
      style={data.isExpanded ? { width: data.width, height: data.height } : { width: 220, height: 70 }}
    >
      <Handle type="target" position={Position.Left} className="opacity-0" />
      
      <div className={`px-4 py-3 font-mono font-bold flex items-center justify-between ${data.isExpanded ? 'border-b border-[#3b82f6]/30 bg-[#3b82f6]/10' : ''}`}>
        <div className="flex items-center gap-2 text-white text-sm capitalize">
           {data.isExpanded ? <ChevronDown className="w-4 h-4 opacity-70" /> : <ChevronRight className="w-4 h-4 opacity-70" />}
           <span>{data.domain} Domain</span>
        </div>
        {!data.isExpanded && (
           <span className="text-[#3b82f6] bg-[#3b82f6]/20 px-2 py-0.5 rounded text-[10px]">
              {data.tableCount} tables
           </span>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="opacity-0" />
    </div>
  );
}

function TableNode({ data }: NodeProps) {
  const table = data.table;
  const headerColor = HEADER_COLORS[table.name.length % HEADER_COLORS.length];
  
  return (
    <div className="bg-[#2d2d2d] border border-[#111] shadow-[0_4px_15px_rgba(0,0,0,0.5)] flex flex-col font-sans min-w-[260px] max-w-[260px] relative">
      <Handle type="target" position={Position.Left} className="!w-1 !h-full !bg-transparent !border-0 !rounded-none !top-0 !transform-none opacity-0" />
      <Handle type="target" position={Position.Top} className="opacity-0" />
      
      {/* Header */}
      <div className={`${headerColor} text-white font-bold text-sm text-center py-1.5 border-b border-[#111] shadow-inner`}>
        {table.name}
      </div>

      {/* Columns */}
      <div className="flex flex-col py-1">
        {table.columns.map((col: any, i: number) => (
          <div key={col.name + i} className="flex items-center px-2 py-0.5 hover:bg-white/10 group cursor-default">
            {/* PK / FK Icon */}
            <div className="w-4 flex-shrink-0 flex items-center justify-center">
              {col.primaryKey ? (
                <Key className="w-3 h-3 text-yellow-400" />
              ) : col.foreignKey ? (
                <LinkIcon className="w-3 h-3 text-slate-300" />
              ) : null}
            </div>
            
            {/* Column Name */}
            <div className="text-slate-100 text-[11px] ml-1 font-semibold truncate max-w-[100px]" title={col.name}>
              {col.name}
            </div>
            
            {/* Spacer */}
            <div className="flex-1" />
            
            {/* Type */}
            <div className="text-slate-300 italic text-[10px] mx-2 text-right truncate max-w-[80px]" title={col.type}>
              {col.type}
            </div>
            
            {/* Not Null */}
            <div className="w-4 text-right text-[9px] text-slate-100 font-bold">
              {!col.nullable ? "NN" : ""}
            </div>
          </div>
        ))}
      </div>

      <Handle type="source" position={Position.Right} className="!w-1 !h-full !bg-transparent !border-0 !rounded-none !top-0 !transform-none opacity-0" />
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
}

const nodeTypes = { tableNode: TableNode, domainGroupNode: DomainGroupNode };

export default function Databases() {
  const params = useParams();
  const repoId = parseInt(params.id || "0", 10);
  const { data, isLoading, error } = useGetDatabases(repoId, {
    query: { enabled: !!repoId, queryKey: getGetDatabasesQueryKey(repoId) },
  });

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = useCallback((domain: string) => {
    setExpandedGroups(prev => ({ ...prev, [domain]: !prev[domain] }));
  }, []);

  const groups = useMemo(() => {
    if (!data) return {};
    const g: Record<string, typeof data.tables> = {};
    const seenTables = new Set<string>();
    
    data.tables.forEach(t => {
      const name = t.name.toLowerCase();
      if (!seenTables.has(name)) {
        seenTables.add(name);
        let domain = name.split('_')[0];
        if (domain.endsWith('s') && domain.length > 3) domain = domain.slice(0, -1);
        if (!g[domain]) g[domain] = [];
        g[domain].push(t);
      }
    });
    return g;
  }, [data]);

  const { nodes, edges } = useMemo(() => {
    if (!data) return { nodes: [], edges: [] };

    const rfNodes: any[] = [];
    const rfEdges: any[] = [];
    
    const groupNames = Object.keys(groups);
    const columns = Math.ceil(Math.sqrt(groupNames.length));
    
    let currentY = 0;
    let currentRowHeight = 0;
    let currentX = 0;

    // 2. Generate Nodes (Groups and Tables)
    groupNames.forEach((domain, i) => {
      const isExpanded = !!expandedGroups[domain];
      const domainTables = groups[domain];
      
      const col = i % columns;
      if (col === 0 && i > 0) {
        currentY += currentRowHeight + 80; // Add margin below row
        currentX = 0;
        currentRowHeight = 0;
      }
      
      // Calculate group bounding box if expanded
      const childCols = Math.ceil(Math.sqrt(domainTables.length));
      const childRows = Math.ceil(domainTables.length / childCols);
      
      const childWidth = 280; // Table width + padding
      const childHeight = 350; // Roughly max table height
      
      const expandedWidth = Math.max(260, childCols * childWidth + 40);
      const expandedHeight = Math.max(100, childRows * childHeight + 80);
      
      const gWidth = isExpanded ? expandedWidth : 220;
      const gHeight = isExpanded ? expandedHeight : 70;
      
      currentRowHeight = Math.max(currentRowHeight, gHeight);

      const groupId = `group-${domain}`;
      
      // Group Node
      rfNodes.push({
        id: groupId,
        type: "domainGroupNode",
        position: { x: currentX, y: currentY },
        style: isExpanded ? { width: gWidth, height: gHeight } : { width: 220, height: 70 },
        data: { domain, isExpanded, width: gWidth, height: gHeight, tableCount: domainTables.length, onToggle: toggleGroup },
      });
      
      // Child Table Nodes
      if (isExpanded) {
        domainTables.forEach((table, tIdx) => {
          const tCol = tIdx % childCols;
          const tRow = Math.floor(tIdx / childCols);
          rfNodes.push({
            id: table.id,
            type: "tableNode",
            parentNode: groupId,
            extent: "parent", // Keeps children bound within parent
            position: { x: 20 + tCol * childWidth, y: 60 + tRow * childHeight },
            data: { table },
          });
        });
      }
      
      currentX += gWidth + 60; // Space between columns
    });

    // 3. Generate Edges (Remap if groups are collapsed)
    const uniqueTables = Object.values(groups).flat();
    uniqueTables.forEach((table) => {
      let sourceDomain = table.name.toLowerCase().split('_')[0];
      if (sourceDomain.endsWith('s') && sourceDomain.length > 3) sourceDomain = sourceDomain.slice(0, -1);
      
      table.relationships.forEach((rel, idx) => {
        const targetTable = uniqueTables.find(t => t.name.toLowerCase() === rel.targetTable.toLowerCase());
        if (targetTable) {
          let targetDomain = targetTable.name.toLowerCase().split('_')[0];
          if (targetDomain.endsWith('s') && targetDomain.length > 3) targetDomain = targetDomain.slice(0, -1);
          
          const sourceExpanded = !!expandedGroups[sourceDomain];
          const targetExpanded = !!expandedGroups[targetDomain];
          
          const sourceId = sourceExpanded ? table.id : `group-${sourceDomain}`;
          const targetId = targetExpanded ? targetTable.id : `group-${targetDomain}`;
          
          // Hide edges contained entirely inside a collapsed group
          if (sourceId === targetId && !sourceExpanded) return;
          
          const edgeId = `e-${sourceId}-${targetId}-${table.id}-${targetTable.id}`;
          
          // Avoid duplicate lines between the same collapsed groups by using a distinct ID check
          const visualEdgeId = `e-${sourceId}-${targetId}`;
          if (!rfEdges.some(e => e.id === visualEdgeId)) {
            rfEdges.push({
              id: visualEdgeId, // Use visualEdgeId so we only render one connection between collapsed groups
              source: sourceId,
              target: targetId,
              animated: true,
              label: sourceExpanded && targetExpanded ? rel.type : undefined,
              labelStyle: { fontFamily: "JetBrains Mono, monospace", fontSize: 9, fill: "hsl(215 20% 75%)", fontWeight: "bold" },
              labelBgStyle: { fill: "#0a0b0d", fillOpacity: 0.9, stroke: "#3b82f6", strokeWidth: 1, rx: 4, ry: 4 },
              style: { stroke: "#3b82f6", strokeWidth: 2, filter: `drop-shadow(0 0 4px #3b82f6)` },
              markerEnd: { type: MarkerType.ArrowClosed, color: "#3b82f6", width: 14, height: 14 },
            });
          }
        }
      });
    });

    return { nodes: rfNodes, edges: rfEdges };
  }, [data, expandedGroups, groups, toggleGroup]);

  const isAllExpanded = Object.keys(groups).length > 0 && Object.keys(groups).every(k => expandedGroups[k]);
  
  const toggleAll = () => {
    if (isAllExpanded) {
      setExpandedGroups({});
    } else {
      const newExp: Record<string, boolean> = {};
      Object.keys(groups).forEach(k => newExp[k] = true);
      setExpandedGroups(newExp);
    }
  };

  return (
    <RepoLayout id={params.id!}>
      <RepoPageWrapper
        isLoading={isLoading}
        error={error}
        hasData={!!data}
        loadingMessage="Loading database schema..."
        errorMessage="Database schema not available."
        queryKeyToInvalidate={getGetDatabasesQueryKey(repoId)}
        className="absolute inset-0 w-full h-full"
      >
        {data && (
          <>
            {/* Top Info Bar */}
            <div className="absolute top-4 left-6 z-10 pointer-events-none">
              <div className="bg-card/80 backdrop-blur-md border border-border rounded-md px-4 py-3 flex items-center gap-6 shadow-lg">
                <div>
                  <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest mb-1">Database Type</p>
                  <p className="font-mono text-sm font-bold text-cyan-400">{data.databaseType}</p>
                </div>
                <div className="w-px h-8 bg-border"></div>
                <div>
                  <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest mb-1">Tables</p>
                  <p className="font-mono text-sm font-bold text-foreground">{data.totalTables}</p>
                </div>
                <div className="w-px h-8 bg-border"></div>
                <div>
                  <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest mb-1">Relationships</p>
                  <p className="font-mono text-sm font-bold text-amber-400">{data.totalRelationships}</p>
                </div>
                <div className="w-px h-8 bg-border"></div>
                <button 
                  onClick={toggleAll}
                  className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded font-mono text-[10px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
                >
                  {isAllExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  {isAllExpanded ? "Collapse All" : "Expand All"}
                </button>
              </div>
            </div>

            {data.tables.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 font-mono text-muted-foreground bg-[#0a0b0d]">
                <Database className="w-12 h-12 text-muted-foreground/30 mb-2" />
                <span className="text-sm">No specific database tables detected in codebase</span>
                <span className="text-[10px] opacity-50 max-w-sm text-center">
                  We could not find schema definitions or migration files to render a graphical topology. 
                  ({data.databaseType})
                </span>
              </div>
            ) : (
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                className="bg-[#0a0b0d]"
                proOptions={{ hideAttribution: true }}
              >
                <Background color="hsl(215 14% 30%)" gap={32} size={1.5} style={{ opacity: 0.2 }} />
                <Controls
                  className="bg-background border border-border"
                  style={{ bottom: 16, right: 16, left: "auto" }}
                />
                <MiniMap
                  className="bg-background border border-border"
                  nodeColor="#3b82f6"
                  maskColor="rgba(10, 11, 13, 0.7)"
                />
              </ReactFlow>
            )}
          </>
        )}
      </RepoPageWrapper>
    </RepoLayout>
  );
}
