import { useCallback, useEffect, useMemo, useState } from "react";
import { Database, RefreshCw, Search } from "lucide-react";
import { getAdminOverview } from "../../api/batchcodeApi";

type DashboardRow = Record<string, unknown>;
type DashboardTables = Record<string, DashboardRow[]>;

const TABLE_TITLES: Record<string, string> = {
  qc_lab_samples: "QC Lab Samples",
  sms_register: "SMS Register",
  hot_coil: "Hot Coil",
  re_coiler: "Recoiler",
  pipe_mill: "Pipe Mill",
  laddle_checklist: "Laddel Checklist",
  tundish_checklist: "Tundish Checklist",
  laddle_return: "Laddel Return",
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
  const [errorMessage, setErrorMessage] = useState("");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
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
      setErrorMessage(message);
      setTables({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
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
    return Object.entries(source);
  }, [filteredTables, hasSearch, tables]);

  const totalTables = useMemo(() => Object.keys(tables).length, [tables]);

  const totalRecords = useMemo(
    () => Object.values(tables).reduce((sum, rows) => sum + rows.length, 0),
    [tables]
  );

  const visibleRecords = useMemo(
    () => Object.values(filteredTables).reduce((sum, rows) => sum + rows.length, 0),
    [filteredTables]
  );

  return (
    <div className="batchcode-page space-y-5 p-3 sm:p-4 md:p-6">
      <section className="rounded-2xl border border-red-200 bg-gradient-to-r from-red-600 to-red-500 p-5 text-white shadow-md">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-wide text-red-100">BATCHCODE</p>
            <h1 className="text-2xl font-bold md:text-3xl">Dashboard Overview</h1>
            <p className="mt-1 text-sm text-red-100">
              Search `unique_code` or any related data to see matching records from all tables.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchDashboardData}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-white/15 p-3">
            <p className="text-xs uppercase tracking-wide text-red-100">Tables</p>
            <p className="text-xl font-bold">{totalTables}</p>
          </div>
          <div className="rounded-xl bg-white/15 p-3">
            <p className="text-xs uppercase tracking-wide text-red-100">Total Records</p>
            <p className="text-xl font-bold">{totalRecords}</p>
          </div>
          <div className="rounded-xl bg-white/15 p-3">
            <p className="text-xs uppercase tracking-wide text-red-100">Matched Records</p>
            <p className="text-xl font-bold">{hasSearch ? visibleRecords : totalRecords}</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by unique_code, shift, furnace number, name, etc."
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm text-gray-700 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
          />
        </div>
        <p className="mt-2 text-xs text-gray-500">
          {hasSearch
            ? `${visibleRecords} matching records in ${Object.keys(filteredTables).length} table(s)`
            : `${totalRecords} total records across ${totalTables} table(s)`}
          {lastUpdated ? ` | Last updated: ${new Date(lastUpdated).toLocaleString()}` : ""}
        </p>
      </section>

      {errorMessage && (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">Unable to load dashboard data</p>
          <p className="mt-1">{errorMessage}</p>
          <button
            type="button"
            onClick={fetchDashboardData}
            className="mt-3 inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </section>
      )}

      {loading ? (
        <section className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-red-200 border-t-red-500" />
          <p className="text-sm text-gray-600">Loading dashboard data...</p>
        </section>
      ) : tableEntries.length === 0 ? (
        <section className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <Database className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm font-semibold text-gray-700">
            {hasSearch ? "No matching records found" : "No data available"}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {hasSearch
              ? "Try a different keyword or clear search."
              : "Create records in BatchCode forms to see them here."}
          </p>
        </section>
      ) : (
        tableEntries.map(([tableName, rows]) => {
          const columns = getColumnsForRows(rows);

          return (
            <section
              key={tableName}
              className="rounded-2xl border border-gray-200 bg-white shadow-sm"
            >
              <header className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
                <h2 className="text-sm font-bold text-gray-800">{formatTableName(tableName)}</h2>
                <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                  {rows.length} rows
                </span>
              </header>

              {rows.length === 0 ? (
                <div className="p-4 text-sm text-gray-500">No rows available</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-xs">
                    <thead className="bg-white">
                      <tr>
                        {columns.map((column) => (
                          <th
                            key={column}
                            className="whitespace-nowrap border-b border-gray-100 px-3 py-2 font-semibold uppercase tracking-wide text-gray-500"
                          >
                            {formatColumnName(column)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, rowIndex) => (
                        <tr key={buildRowKey(tableName, row, rowIndex)} className="hover:bg-red-50/40">
                          {columns.map((column) => (
                            <td
                              key={`${tableName}-${rowIndex}-${column}`}
                              className="max-w-[240px] whitespace-nowrap border-b border-gray-100 px-3 py-2 text-gray-700"
                              title={formatCellValue(row[column])}
                            >
                              {formatCellValue(row[column])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
