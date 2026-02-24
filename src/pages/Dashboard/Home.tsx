import { useCallback, useEffect, useMemo, useState } from "react";
import { Database, RefreshCw, Search, Layers, FileText, CheckCircle2, AlertCircle, Clock, ArrowUpRight, Filter } from "lucide-react";
import { getAdminOverview } from "../../api/batchcodeApi";

type DashboardRow = Record<string, unknown>;
type DashboardTables = Record<string, DashboardRow[]>;

const TABLE_TITLES: Record<string, string> = {
  qc_lab_samples: "QC Lab Samples",
  sms_register: "SMS Register",
  hot_coil: "Hot Coil",
  re_coiler: "Recoiler",
  pipe_mill: "Pipe Mill",
  laddle_checklist: "Laddle Checklist",
  tundish_checklist: "Tundish Checklist",
  laddle_return: "Laddle Return",
  patching_checklist: "Patching Checklist",
};

const PRIORITY_COLUMNS = [
  "unique_code",
  "sms_batch_code",
  "sms_short_code",
  "id",
  "created_at",
  "createdAt",
  "sample_timestamp",
];

const formatColumnName = (columnName: string) =>
  columnName
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatTableName = (tableName: string) =>
  TABLE_TITLES[tableName] ??
  tableName
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const normalizeValueForSearch = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  if (Array.isArray(value)) {
    return value.map((item) => normalizeValueForSearch(item)).join(" ");
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }

  return String(value);
};

const matchesSearch = (row: DashboardRow, query: string) =>
  Object.entries(row).some(([key, value]) => {
    const keyText = key.toLowerCase();
    const valueText = normalizeValueForSearch(value).toLowerCase();
    return keyText.includes(query) || valueText.includes(query);
  });

const formatCellValue = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  if (Array.isArray(value)) {
    return value.map((item) => normalizeValueForSearch(item)).join(", ");
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "-";
    }
  }

  return String(value);
};

const buildRowKey = (tableName: string, row: DashboardRow, rowIndex: number) => {
  const idLikeValues = ["id", "unique_code", "sms_batch_code", "sms_short_code"]
    .map((key) => row[key])
    .filter((value) => value !== undefined && value !== null && value !== "");

  if (idLikeValues.length) {
    return `${tableName}-${String(idLikeValues[0])}-${rowIndex}`;
  }

  return `${tableName}-${rowIndex}`;
};

const getColumnsForRows = (rows: DashboardRow[]) => {
  const columnSet = new Set<string>();

  rows.forEach((row) => {
    Object.keys(row).forEach((column) => columnSet.add(column));
  });

  return Array.from(columnSet).sort((a, b) => {
    const aPriority = PRIORITY_COLUMNS.indexOf(a);
    const bPriority = PRIORITY_COLUMNS.indexOf(b);

    const aHasPriority = aPriority !== -1;
    const bHasPriority = bPriority !== -1;

    if (aHasPriority && bHasPriority) return aPriority - bPriority;
    if (aHasPriority) return -1;
    if (bHasPriority) return 1;

    return a.localeCompare(b);
  });
};

const toDashboardTables = (rawData: unknown): DashboardTables => {
  if (!rawData || typeof rawData !== "object" || Array.isArray(rawData)) {
    return {};
  }

  const normalized: DashboardTables = {};

  Object.entries(rawData as Record<string, unknown>).forEach(([tableName, rows]) => {
    if (!Array.isArray(rows)) return;

    normalized[tableName] = rows.filter(
      (row): row is DashboardRow =>
        Boolean(row) && typeof row === "object" && !Array.isArray(row)
    );
  });

  return normalized;
};

export default function Home() {
  const [tables, setTables] = useState<DashboardTables>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setIsSyncing(true);
    setErrorMessage("");

    try {
      const response = await getAdminOverview();
      const payload = response?.data ?? {};

      const nestedTables = toDashboardTables(payload?.data);
      const fallbackTables = toDashboardTables(payload);
      const normalizedTables =
        Object.keys(nestedTables).length > 0 ? nestedTables : fallbackTables;

      setTables(normalizedTables);
      setLastUpdated(new Date().toISOString());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch dashboard data";
      // Only show error on full refresh or if it's the first load
      if (!isSilent) setErrorMessage(message);
      console.error("Auto-sync failed:", message);
    } finally {
      if (!isSilent) setLoading(false);
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchDashboardData();

    // Auto-sync every 5 seconds (IPL style)
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const hasSearch = searchTerm.trim().length > 0;

  const filteredTables = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return tables;

    const filtered: DashboardTables = {};

    Object.entries(tables).forEach(([tableName, rows]) => {
      const matchingRows = rows.filter((row) => matchesSearch(row, query));
      if (matchingRows.length > 0) {
        filtered[tableName] = matchingRows;
      }
    });

    return filtered;
  }, [searchTerm, tables]);

  const tableEntries = useMemo(() => {
    const source = hasSearch ? filteredTables : tables;
    return Object.entries(source).sort((a, b) => b[1].length - a[1].length);
  }, [filteredTables, hasSearch, tables]);

  const totalTables = useMemo(() => Object.keys(tables).length, [tables]);

  const totalRecords = useMemo(
    () => Object.values(tables).reduce((sum, rows) => sum + rows.length, 0),
    [tables]
  );

  const matchedTablesCount = useMemo(() => Object.keys(filteredTables).length, [filteredTables]);

  const visibleRecords = useMemo(
    () => Object.values(filteredTables).reduce((sum, rows) => sum + rows.length, 0),
    [filteredTables]
  );

  return (
    <div className="min-h-screen space-y-4 sm:space-y-6 pb-12 pt-4 px-4 sm:px-6 lg:px-8 bg-slate-50/50">
      {/* Premium Header Section */}
      <header className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-slate-900 px-5 py-6 sm:px-8 sm:py-10 text-white shadow-2xl transition-all duration-500 hover:shadow-red-900/10">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-red-600/10 blur-[100px]" />
        <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-blue-600/10 blur-[100px]" />

        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-red-500" />
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-red-400">Live Infrastructure Overview</p>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-4xl lg:text-5xl">
              System <span className="bg-gradient-to-r from-red-500 to-orange-400 bg-clip-text text-transparent">Analytics</span>
            </h1>
            <p className="max-w-xl text-xs sm:text-sm leading-relaxed text-slate-400 font-medium">
              Real-time monitoring across all production modules. Search and filter critical manufacturing data with extreme precision.
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchDashboardData(false)}
            disabled={loading || isSyncing}
            className="group flex flex-row items-center gap-3 self-start md:self-center rounded-2xl bg-white/5 p-1 pr-6 text-sm font-semibold text-white backdrop-blur-md transition-all hover:bg-white/10 active:scale-95 disabled:opacity-50 border border-white/10"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 shadow-lg shadow-red-600/40 group-hover:rotate-180 transition-transform duration-500">
              <RefreshCw className={`h-5 w-5 ${loading || isSyncing ? "animate-spin" : ""}`} />
            </div>
            <div className="flex flex-col items-start leading-tight">
              <span>Sync Data</span>
              <span className="text-[9px] text-red-400 font-bold uppercase tracking-widest flex items-center gap-1">
                {isSyncing ? "Syncing..." : "Auto-Live"}
                <span className={`h-1.5 w-1.5 rounded-full bg-red-500 ${isSyncing ? "animate-ping" : ""}`} />
              </span>
            </div>
          </button>
        </div>

        {/* Improved Stat Cards Layout */}
        <div className="relative z-10 mt-8 sm:mt-10 grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Monitored Tables"
            value={totalTables}
            icon={<Database className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />}
            trend="Active Modules"
          />
          <StatCard
            label="Total Records"
            value={totalRecords}
            icon={<Layers className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />}
            trend="System Wide"
          />
          <StatCard
            label="Search Matches"
            value={hasSearch ? visibleRecords : totalRecords}
            icon={<Filter className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500" />}
            trend={hasSearch ? "Filtering" : "No Filters"}
          />
          <StatCard
            label="Updated"
            value={lastUpdated ? new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Never"}
            icon={<Clock className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />}
            trend="Latest Sync"
            isLast={true}
          />
        </div>
      </header>

      {/* Global Search Bar */}
      <section className="sticky top-2 sm:top-4 z-30 group">
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white/90 p-1.5 shadow-xl backdrop-blur-xl transition-all focus-within:ring-2 focus-within:ring-red-500/20">
          <Search className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 group-focus-within:text-red-500 transition-colors" />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Global Search..."
            className="w-full rounded-xl bg-transparent py-3 sm:py-4 pl-12 pr-6 text-sm sm:text-base font-medium text-slate-800 outline-none placeholder:text-slate-400"
          />
          {hasSearch && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <span className="hidden sm:inline-flex rounded-lg bg-red-50 px-3 py-1 text-xs font-bold text-red-600">
                {matchedTablesCount} tables found
              </span>
              <button
                onClick={() => setSearchTerm("")}
                className="hover:bg-slate-100 p-2 rounded-full text-slate-400 transition-colors"
                title="Clear Search"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </section>

      {errorMessage && (
        <section className="animate-in fade-in slide-in-from-top rounded-2xl border border-red-200 bg-red-50/50 p-4 sm:p-5 backdrop-blur-sm">
          <div className="flex items-center gap-3 text-red-800">
            <AlertCircle className="h-5 w-5" />
            <p className="font-bold uppercase tracking-tight text-xs sm:text-sm">Sync Failure</p>
          </div>
          <p className="mt-2 text-xs sm:text-sm text-red-600/90 font-medium">{errorMessage}</p>
          <button
            type="button"
            onClick={() => fetchDashboardData(false)}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all hover:translate-y-[-1px]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            RETRY
          </button>
        </section>
      )}

      {loading ? (
        <section className="flex flex-col items-center justify-center py-20">
          <div className="relative">
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full border-[3px] border-slate-200 mt-1" />
            <div className="absolute top-0 h-16 w-16 sm:h-20 sm:w-20 animate-spin rounded-full border-[3px] border-transparent border-t-red-600" />
          </div>
          <p className="mt-6 text-[10px] sm:text-xs font-bold tracking-widest text-slate-400 uppercase">Synchronizing Nodes...</p>
        </section>
      ) : tableEntries.length === 0 ? (
        <section className="flex flex-col items-center justify-center py-16 sm:py-24 rounded-3xl border-2 border-dashed border-slate-200 bg-white">
          <div className="bg-slate-50 p-5 sm:p-6 rounded-3xl mb-4">
            <Database className="h-10 w-10 sm:h-12 sm:w-12 text-slate-300" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-slate-800 px-4 text-center">
            {hasSearch ? "No Records Found" : "System Empty"}
          </h3>
          <p className="mt-2 text-xs sm:text-sm text-slate-500 font-medium text-center max-w-xs leading-relaxed px-6">
            {hasSearch
              ? "No data matches your criteria. Please refine your search."
              : "No manufacturing data detected in the current schema."}
          </p>
        </section>
      ) : (
        <div className="grid gap-6 sm:gap-8">
          {tableEntries.map(([tableName, rows]) => {
            const columns = getColumnsForRows(rows);
            return <DataBlock key={tableName} title={formatTableName(tableName)} rows={rows} columns={columns} tableName={tableName} />;
          })}
        </div>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px;
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f8fafc;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}} />
    </div>
  );
}

// Helper Components
function StatCard({ label, value, icon, trend, isLast = false }: { label: string; value: string | number; icon: React.ReactNode; trend: string; isLast?: boolean }) {
  return (
    <div className="group relative rounded-xl sm:rounded-2xl bg-white/[0.04] p-3.5 sm:p-5 border border-white/5 transition-all hover:bg-white/[0.08]">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-slate-800 border border-white/10 group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <div className="flex items-center gap-1 text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
          <span className="hidden sm:inline">{trend}</span>
          <ArrowUpRight className="h-2.5 w-2.5" />
        </div>
      </div>
      <div>
        <p className="text-[9px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-400 sm:text-slate-500 leading-none mb-1 text-ellipsis overflow-hidden whitespace-nowrap">{label}</p>
        <p className="text-xl sm:text-2xl font-black text-white">{value}</p>
      </div>
    </div>
  );
}

function DataBlock({ title, rows, columns, tableName }: { title: string; rows: DashboardRow[]; columns: string[]; tableName: string }) {
  return (
    <section className="group overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-xl hover:shadow-slate-200/40">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 px-4 sm:px-6 py-4 sm:py-5 bg-gradient-to-r from-slate-50 to-white gap-3">
        <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-slate-900 text-white shadow-lg">
            <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-800 tracking-tight truncate">{title}</h2>
            <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">Source: {tableName}</p>
          </div>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
          <span className="rounded-xl bg-emerald-50 px-2.5 py-1.5 text-[10px] sm:text-xs font-bold text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {rows.length} <span className="hidden sm:inline">Records</span>
          </span>
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="p-12 text-center text-slate-400 font-medium">
          <Database className="mx-auto mb-3 h-8 w-8 opacity-20" />
          <p className="text-sm">No data entries recorded</p>
        </div>
      ) : (
        <div className="relative">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="min-w-full text-left">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column}
                      className="whitespace-nowrap px-4 sm:px-6 py-3 sm:py-4 text-[10px] font-black uppercase tracking-widest text-slate-500"
                    >
                      {formatColumnName(column)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, rowIndex) => (
                  <tr key={buildRowKey(tableName, row, rowIndex)} className="group/row hover:bg-slate-50 transition-colors">
                    {columns.map((column) => (
                      <td
                        key={`${tableName}-${rowIndex}-${column}`}
                        className="max-w-[200px] sm:max-w-[300px] truncate px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-slate-600 sm:text-slate-700"
                      >
                        {column.includes('unique_code') || column.includes('short_code') ? (
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-[11px] font-bold text-slate-800 shadow-sm border border-slate-200 group-hover/row:bg-red-600 group-hover/row:text-white group-hover/row:border-red-600 transition-all">
                            {formatCellValue(row[column])}
                          </span>
                        ) : formatCellValue(row[column])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile hint for horizontal scroll */}
          <div className="sm:hidden absolute bottom-0 right-0 left-0 h-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-50" />
        </div>
      )}

      <footer className="bg-slate-50/30 px-4 sm:px-6 py-2 sm:py-3 border-t border-slate-100 flex justify-between items-center sm:justify-end">
        <span className="sm:hidden text-[9px] font-bold text-slate-400 uppercase tracking-widest">
          Swipe for more data →
        </span>
        <button className="text-[10px] sm:text-[11px] font-bold text-slate-400 hover:text-red-600 transition-colors uppercase tracking-widest flex items-center gap-1">
          <span className="hidden sm:inline">View Full </span>Ledger <ArrowUpRight className="h-3 w-3" />
        </button>
      </footer>
    </section>
  );
}
