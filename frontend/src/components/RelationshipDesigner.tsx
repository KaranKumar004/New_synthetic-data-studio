"use client";

import { useEffect, useState, useRef } from "react";
import { Link2, Trash2, Plus, Info, Database, Compass } from "lucide-react";

interface RelationshipDesignerProps {
  tables: any[];
  setTables: (tables: any[]) => void;
  onBack?: () => void;
}

export default function RelationshipDesigner({ tables, setTables, onBack }: RelationshipDesignerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [connections, setConnections] = useState<Array<{ from: string; to: string }>>([]);
  const [sourceTable, setSourceTable] = useState("");
  const [sourceCol, setSourceCol] = useState("");
  const [targetTable, setTargetTable] = useState("");
  const [targetCol, setTargetCol] = useState("");

  // Scan tables to find existing foreign key relations
  useEffect(() => {
    const list: Array<{ from: string; to: string }> = [];
    tables.forEach((t) => {
      t.columns.forEach((c: any) => {
        if (c.config?.foreign_key) {
          // foreign_key format: "parent_table.parent_column"
          list.push({
            from: `${t.name}.${c.name}`,
            to: c.config.foreign_key
          });
        }
      });
    });
    setConnections(list);
  }, [tables]);

  const addConnection = () => {
    if (!sourceTable || !sourceCol || !targetTable || !targetCol) return;
    
    const fromPath = `${sourceTable}.${sourceCol}`;
    const toPath = `${targetTable}.${targetCol}`;

    // Prevent duplicate connections
    if (connections.some((c) => c.from === fromPath && c.to === toPath)) return;

    // Update the schema column in setTables
    const updated = tables.map((t) => {
      if (t.name === sourceTable) {
        return {
          ...t,
          columns: t.columns.map((c: any) => {
            if (c.name === sourceCol) {
              return {
                ...c,
                config: {
                  ...c.config,
                  foreign_key: toPath
                }
              };
            }
            return c;
          })
        };
      }
      return t;
    });

    setTables(updated);
    
    // Reset inputs
    setSourceCol("");
    setTargetCol("");
  };

  const removeConnection = (fromPath: string) => {
    const [tName, cName] = fromPath.split(".");

    const updated = tables.map((t) => {
      if (t.name === tName) {
        return {
          ...t,
          columns: t.columns.map((c: any) => {
            if (c.name === cName) {
              const newConfig = { ...c.config };
              delete newConfig.foreign_key;
              return {
                ...c,
                config: newConfig
              };
            }
            return c;
          })
        };
      }
      return t;
    });

    setTables(updated);
  };

  const getSourceColumns = () => {
    const t = tables.find((tbl) => tbl.name === sourceTable);
    return t ? t.columns : [];
  };

  const getTargetColumns = () => {
    const t = tables.find((tbl) => tbl.name === targetTable);
    return t ? t.columns : [];
  };

  return (
    <div className="glass-panel border border-card-border p-6 rounded-2xl space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Compass className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Visual Schema Mapper</h2>
            <p className="text-muted text-[10px] font-bold">
              Establish relational links and validate foreign key mappings.
            </p>
          </div>
        </div>
        
        {onBack && (
          <button
            onClick={onBack}
            className="px-3.5 py-1.5 border border-border bg-card hover:bg-muted-bg text-foreground text-xs font-bold rounded-lg transition-all cursor-pointer"
          >
            Back to Wizard
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Creator panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-muted-bg/30 p-4 rounded-xl border border-border/60 space-y-4">
            <h3 className="text-xs font-black uppercase text-muted tracking-wider flex items-center gap-1.5">
              <Link2 className="h-4 w-4 text-primary" />
              Add Relational Connection
            </h3>

            {/* Source mapping */}
            <div className="space-y-3">
              <div>
                <label className="block text-[9px] uppercase font-black text-muted mb-1">Source Table (Child)</label>
                <select
                  value={sourceTable}
                  onChange={(e) => { setSourceTable(e.target.value); setSourceCol(""); }}
                  className="w-full bg-card border border-border rounded-lg px-2.5 py-2 text-xs font-semibold"
                >
                  <option value="">-- Select Child Table --</option>
                  {tables.map((t) => (
                    <option key={t.name} value={t.name}>{t.name}</option>
                  ))}
                </select>
              </div>

              {sourceTable && (
                <div>
                  <label className="block text-[9px] uppercase font-black text-muted mb-1">Source Key (FK)</label>
                  <select
                    value={sourceCol}
                    onChange={(e) => setSourceCol(e.target.value)}
                    className="w-full bg-card border border-border rounded-lg px-2.5 py-2 text-xs font-semibold"
                  >
                    <option value="">-- Select Column --</option>
                    {getSourceColumns().map((c: any) => (
                      <option key={c.name} value={c.name}>{c.name} ({c.type})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Connector symbol */}
              <div className="flex justify-center text-muted font-black text-lg py-1">⬇ Connects to Primary Key ⬇</div>

              {/* Target mapping */}
              <div>
                <label className="block text-[9px] uppercase font-black text-muted mb-1">Target Table (Parent)</label>
                <select
                  value={targetTable}
                  onChange={(e) => { setTargetTable(e.target.value); setTargetCol(""); }}
                  className="w-full bg-card border border-border rounded-lg px-2.5 py-2 text-xs font-semibold"
                >
                  <option value="">-- Select Parent Table --</option>
                  {tables.filter(t => t.name !== sourceTable).map((t) => (
                    <option key={t.name} value={t.name}>{t.name}</option>
                  ))}
                </select>
              </div>

              {targetTable && (
                <div>
                  <label className="block text-[9px] uppercase font-black text-muted mb-1">Target Key (PK)</label>
                  <select
                    value={targetCol}
                    onChange={(e) => setTargetCol(e.target.value)}
                    className="w-full bg-card border border-border rounded-lg px-2.5 py-2 text-xs font-semibold"
                  >
                    <option value="">-- Select Column --</option>
                    {getTargetColumns().map((c: any) => (
                      <option key={c.name} value={c.name}>{c.name} ({c.type})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <button
              onClick={addConnection}
              disabled={!sourceTable || !sourceCol || !targetTable || !targetCol}
              className="w-full py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-primary/10 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
              Bind Relation Keys
            </button>
          </div>

          <div className="p-3.5 bg-secondary/5 border border-secondary/10 rounded-xl text-[10px] text-muted leading-relaxed font-semibold flex items-start gap-2">
            <Info className="h-4 w-4 shrink-0 text-secondary mt-0.5" />
            <span>
              <strong>Referential Integrity rule:</strong> When generating datasets, the system will sample values for the child foreign key column directly from values generated in the parent primary key column, preserving database joins.
            </span>
          </div>
        </div>

        {/* Connections details list & Visual Cards list */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Active links list */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase text-muted tracking-wider">Active Relationship Links ({connections.length})</h3>
            
            {connections.length === 0 ? (
              <div className="p-8 border border-dashed border-border rounded-xl text-center text-xs text-muted font-bold">
                No relational paths defined yet. Connect child FK columns to parent PK columns.
              </div>
            ) : (
              <div className="divide-y divide-border border border-border rounded-xl bg-card overflow-hidden text-xs">
                {connections.map((c) => (
                  <div key={c.from} className="p-3.5 flex justify-between items-center gap-4 hover:bg-muted-bg/30 transition-all font-semibold">
                    <div className="flex items-center gap-3">
                      <div className="px-2 py-1 bg-primary/10 text-primary rounded-md font-bold text-[10px]">
                        FOREIGN KEY
                      </div>
                      <div className="flex items-center gap-2 text-foreground font-extrabold">
                        <span>{c.from}</span>
                        <span className="text-muted font-medium">➜</span>
                        <span className="text-secondary">{c.to}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => removeConnection(c.from)}
                      className="p-1.5 border border-border hover:border-red-500/20 text-red-500 rounded-lg hover:bg-red-500/10 cursor-pointer"
                      title="Unbind Link"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Database Tables diagram list */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase text-muted tracking-wider">Database Tables Schemas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tables.map((t) => (
                <div key={t.name} className="p-4 bg-muted-bg/25 border border-border rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between font-bold text-xs">
                    <span className="text-foreground font-black flex items-center gap-1.5">
                      <Database className="h-4 w-4 text-muted" />
                      {t.name}
                    </span>
                    <span className="text-muted text-[10px] font-bold">({t.rows} rows)</span>
                  </div>
                  <div className="space-y-1.5">
                    {t.columns.map((c: any) => {
                      const hasFk = c.config?.foreign_key;
                      return (
                        <div key={c.name} className="flex justify-between items-center text-[11px] p-1.5 bg-card/50 border border-border/50 rounded-lg">
                          <span className="font-bold text-foreground">{c.name}</span>
                          <div className="flex items-center gap-1.5 font-semibold text-muted text-[10px]">
                            <span>{c.type}</span>
                            {hasFk && (
                              <span className="px-1.5 py-0.5 bg-secondary/15 text-secondary rounded-sm font-bold border border-secondary/10">
                                FK ➜ {hasFk}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
