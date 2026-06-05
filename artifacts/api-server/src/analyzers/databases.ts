import { Analyzer, RepoContext, GithubTreeItem, GraphNode, GraphEdge } from "./types";

export interface DbTable {
  id: string;
  name: string;
  columns: Array<{
    name: string;
    type: string;
    nullable: boolean;
    primaryKey?: boolean;
    foreignKey?: boolean;
  }>;
  relationships: Array<{
    targetTable: string;
    type: "one-to-one" | "one-to-many" | "many-to-many";
  }>;
}

export interface DatabaseIntelligence {
  tables: DbTable[];
  nodes: GraphNode[];
  edges: GraphEdge[];
  databaseType: string;
  totalTables: number;
  totalRelationships: number;
}

export const databasesAnalyzer: Analyzer<DatabaseIntelligence> = {
  name: "databases",
  analyze: async (ctx: RepoContext, files: GithubTreeItem[]) => {
    const tables: DbTable[] = [];
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    let databaseType = "Unknown / No DB";

    // Detect DB type based on files
    if (files.some(f => f.path.includes("prisma/schema.prisma"))) {
      databaseType = "PostgreSQL (Prisma)";
    } else if (files.some(f => f.path.includes("drizzle") || f.path.includes("schema.ts"))) {
      databaseType = "PostgreSQL (Drizzle ORM)";
    } else if (files.some(f => f.path.includes("typeorm"))) {
      databaseType = "SQL (TypeORM)";
    } else if (files.some(f => f.path.includes("mongoose") || f.path.includes("models/"))) {
      databaseType = "MongoDB";
    }

    // Attempt to parse schema.prisma if present
    const prismaFile = files.find(f => f.path.endsWith("schema.prisma"));
    if (prismaFile) {
      const { fetchFileContent } = await import("./tree");
      const content = await fetchFileContent(ctx.owner, ctx.name, prismaFile.path);
      if (content) {
        databaseType = "PostgreSQL (Prisma)";
        const modelBlocks = content.split("model ");
        modelBlocks.shift(); // remove everything before first model

        modelBlocks.forEach((block, idx) => {
          const lines = block.split("\n").map(l => l.trim()).filter(l => l);
          const tableName = lines.shift()?.split(" ")[0];
          if (!tableName) return;

          const columns: DbTable["columns"] = [];
          lines.forEach(line => {
            if (line.startsWith("//") || line.startsWith("@@")) return;
            const parts = line.split(/\s+/);
            if (parts.length >= 2) {
              const name = parts[0];
              const type = parts[1];
              if (name && type && !name.includes("{") && !name.includes("}")) {
                columns.push({
                  name,
                  type: type.replace("?", ""),
                  nullable: type.includes("?"),
                  primaryKey: line.includes("@id"),
                  foreignKey: line.includes("@relation")
                });
              }
            }
          });

          tables.push({ id: `table-${idx}`, name: tableName, columns, relationships: [] });
          nodes.push({ id: `table-${idx}`, label: tableName, type: "table", category: "database" });
        });
      }
    }

    if (tables.length === 0) {
      // Attempt to find SQL files with CREATE TABLE
      const sqlFiles = files.filter(f => f.path.endsWith(".sql"));
      if (sqlFiles.length > 0) {
        const { fetchFileContent } = await import("./tree");
        for (const file of sqlFiles) {
          const content = await fetchFileContent(ctx.owner, ctx.name, file.path);
          if (content) {
            databaseType = "SQL (Raw/Migrations)";
            // Simple regex to find CREATE TABLE statements
            const createTableMatches = content.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`]?([a-zA-Z0-9_]+)["`]?\s*\(([\s\S]*?)\);/gi);
            if (createTableMatches) {
              createTableMatches.forEach((match, idx) => {
                const nameMatch = match.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`]?([a-zA-Z0-9_]+)["`]?/i);
                const tableName = nameMatch ? nameMatch[1] : `table_${idx}`;
                
                // Very basic column parsing
                const columnsBlockMatch = match.match(/\(([\s\S]*?)\)/);
                const columns: DbTable["columns"] = [];
                if (columnsBlockMatch) {
                  const lines = columnsBlockMatch[1].split(',').map(l => l.trim()).filter(l => l && !l.toUpperCase().startsWith('PRIMARY KEY') && !l.toUpperCase().startsWith('FOREIGN KEY'));
                  lines.forEach(line => {
                    const parts = line.split(/\s+/);
                    if (parts.length >= 2) {
                      columns.push({
                        name: parts[0].replace(/["`]/g, ''),
                        type: parts[1],
                        nullable: !line.toUpperCase().includes("NOT NULL"),
                        primaryKey: line.toUpperCase().includes("PRIMARY KEY")
                      });
                    }
                  });
                }
                
                tables.push({ id: `table-sql-${tables.length}`, name: tableName, columns, relationships: [] });
                nodes.push({ id: `table-sql-${tables.length}`, label: tableName, type: "table", category: "database" });
              });
            }
          }
        }
      }
    }

    if (tables.length === 0) {
      // Fallback: infer from file names
      const modelFiles = files.filter(f => 
        f.path.includes("models/") || 
        f.path.includes("entities/") || 
        (f.path.includes("schema/") && f.path.endsWith(".ts")) ||
        (f.path.includes("db/") && f.path.endsWith(".ts")) ||
        f.path.includes("migrations/")
      );

      modelFiles.forEach((file, index) => {
        const parts = file.path.split('/');
        const tableName = parts[parts.length - 1].replace(/\.(ts|js|go|java|py|prisma|sql|mjs|cjs)$/, '').toLowerCase();
        
        if (tableName === 'index' || tableName === 'schema' || tableName === 'db' || tableName.startsWith('init')) return;

        tables.push({
          id: `table-${index}`,
          name: tableName,
          columns: [
            { name: "id", type: "integer", nullable: false, primaryKey: true },
            { name: "created_at", type: "timestamp", nullable: false },
            { name: "name", type: "varchar", nullable: true }
          ],
          relationships: []
        });
        
        nodes.push({ id: `table-${index}`, label: tableName, type: "table", category: "database" });
      });
    }

    if (tables.length === 0) {
      // Check docker-compose for database services
      const dcFile = files.find(f => f.path.includes("docker-compose"));
      if (dcFile) {
        const { fetchFileContent } = await import("./tree");
        const content = await fetchFileContent(ctx.owner, ctx.name, dcFile.path);
        if (content) {
          if (content.includes("postgres")) databaseType = "PostgreSQL (Docker)";
          else if (content.includes("mysql")) databaseType = "MySQL (Docker)";
          else if (content.includes("mongo")) databaseType = "MongoDB (Docker)";
          else if (content.includes("redis")) databaseType = "Redis (Docker)";
          
          if (databaseType !== "Unknown / No DB") {
            tables.push({
              id: "table-unknown",
              name: "Unknown Tables",
              columns: [{ name: "info", type: "text", nullable: true }],
              relationships: []
            });
            nodes.push({ id: "table-unknown", label: "Unknown Tables", type: "table", category: "database" });
          }
        }
      }
    }

    if (tables.length === 0 && databaseType === "Unknown / No DB") {
      databaseType = "Unknown / No DB";
    }

    // Heuristic: Infer relationships based on column names ending in _id or Id
    tables.forEach(table => {
      table.columns.forEach(col => {
        if (col.name.toLowerCase().endsWith("_id") || col.name.endsWith("Id")) {
          let potentialTarget = col.name.replace(/_id$/i, "").replace(/Id$/, "").toLowerCase();
          
          // Try to find matching table (exact or plural)
          let targetTable = tables.find(t => t.name.toLowerCase() === potentialTarget || t.name.toLowerCase() === `${potentialTarget}s`);
          
          if (targetTable && targetTable.id !== table.id) {
            col.foreignKey = true;
            
            // Add relationship if it doesn't exist
            if (!table.relationships.some(r => r.targetTable === targetTable?.name)) {
              table.relationships.push({
                targetTable: targetTable.name,
                type: "one-to-many"
              });
              edges.push({
                source: table.id,
                target: targetTable.id,
                type: "one-to-many"
              });
            }
          }
        }
      });
    });

    return {
      tables,
      nodes,
      edges,
      databaseType,
      totalTables: tables.length,
      totalRelationships: edges.length
    };
  }
};
