import { useCallback, useEffect, useMemo, useState } from "react";
import { Database, RefreshCw, Search } from "lucide-react";
import { getAdminOverview } from "../../api/batchcodeApi";
import {
  PageContainer,
  PageHeader,
  SectionCard,
  ResponsiveDataTable,
  secondaryButtonClass
} from "../../components/batchcode/PagePrimitives";
import { matchesSearch, toSearchText } from "../../components/batchcode/dataUtils";

const PRIORITY_COLUMNS = [
  "unique_code",
  "sms_batch_code",
  "sms_short_code",
  "id",
  "sample_timestamp",
  "created_at",
  "createdAt"
];

const formatTableName = (name) =>
  name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatColumnName = (name) =>
  name
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const normalizeTables = (response) => {
  const payload = response?.data;
  const source = payload?.data && typeof payload.data === "object" ? payload.data : payload;

  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return {};
  }

  const normalized = {};

  Object.entries(source).forEach(([tableName, rows]) => {
    if (!Array.isArray(rows)) {
      return;
    }

    normalized[tableName] = rows.filter(
      (row) => row && typeof row === "object" && !Array.isArray(row)
    );
  });

  return normalized;
};

const getColumnsForRows = (rows) => {
  const keys = new Set();

  rows.forEach((row) => {
    Object.keys(row).forEach((key) => keys.add(key));
  });

  return Array.from(keys)
    .sort((first, second) => {
      const firstPriority = PRIORITY_COLUMNS.indexOf(first);
      const secondPriority = PRIORITY_COLUMNS.indexOf(second);

      if (firstPriority !== -1 && secondPriority !== -1) {
        return firstPriority - secondPriority;
      }

      if (firstPriority !== -1) {
        return -1;
      }

      if (secondPriority !== -1) {
        return 1;
      }

      return first.localeCompare(second);
    })
    .slice(0, 6);
};

const buildRowKey = (tableName, row, index) => {
  const idCandidate = row.id || row.unique_code || row.sms_batch_code || row.sms_short_code;
  return idCandidate ? `${tableName}-${idCandidate}-${index}` : `${tableName}-${index}`;
};

function Dashboard() {
  const [tables, setTables] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }

    setSyncing(true);
    setErrorMessage("");

    try {
      const response = await getAdminOverview();
      setTables(normalizeTables(response));
      setLastUpdated(new Date().toISOString());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch dashboard data";
      if (!silent) {
        setErrorMessage(message);
      }
      console.error("Dashboard refresh failed", message);
    } finally {
      if (!silent) {
        setLoading(false);
      }
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const timer = setInterval(() => fetchData(true), 10000);
    return () => clearInterval(timer);
  }, [fetchData]);

  const filteredTables = useMemo(() => {
    if (!searchTerm.trim()) {
      return tables;
    }

    const filtered = {};

    Object.entries(tables).forEach(([tableName, rows]) => {
      const matchedRows = rows.filter((row) => matchesSearch(row, searchTerm));
      if (matchedRows.length) {
        filtered[tableName] = matchedRows;
      }
    });

    return filtered;
  }, [searchTerm, tables]);

  const tableEntries = useMemo(
    () => Object.entries(filteredTables).sort((first, second) => second[1].length - first[1].length),
    [filteredTables]
  );

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
    <PageContainer>
      <PageHeader
        title="Dashboard"
        subtitle="Compact admin snapshot across all modules"
        icon={Database}
        actions={
          <>
            <div className="relative flex-1 sm:w-72">
              <Search size={14} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search all tables"
                className="h-9 md:h-10 w-full rounded-md border border-slate-300 pl-8 pr-3 text-sm text-slate-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
              />
            </div>

            <button type="button" onClick={() => fetchData()} className={secondaryButtonClass}>
              <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
              Refresh
            </button>
          </>
        }
      />

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white shadow rounded-lg p-3 space-y-1">
          <p className="text-xs text-slate-500">Tables</p>
          <p className="text-lg md:text-xl font-semibold text-slate-900">{totalTables}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-3 space-y-1">
          <p className="text-xs text-slate-500">Total Records</p>
          <p className="text-lg md:text-xl font-semibold text-slate-900">{totalRecords}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-3 space-y-1">
          <p className="text-xs text-slate-500">Visible Records</p>
          <p className="text-lg md:text-xl font-semibold text-slate-900">{visibleRecords}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-3 space-y-1">
          <p className="text-xs text-slate-500">Last Updated</p>
          <p className="text-sm md:text-base font-semibold text-slate-900">
            {lastUpdated ? new Date(lastUpdated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-"}
          </p>
        </div>
      </section>

      {errorMessage ? (
        <SectionCard className="border border-rose-200 bg-rose-50">
          <p className="text-sm text-rose-700">{errorMessage}</p>
        </SectionCard>
      ) : null}

      {loading ? (
        <SectionCard>
          <div className="py-10 text-center text-sm text-slate-600">Loading dashboard data...</div>
        </SectionCard>
      ) : tableEntries.length === 0 ? (
        <SectionCard>
          <div className="py-10 text-center text-sm text-slate-600">No dashboard records found.</div>
        </SectionCard>
      ) : (
        tableEntries.map(([tableName, rows]) => {
          const columns = getColumnsForRows(rows);

          return (
            <SectionCard key={tableName}>
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-slate-900">{formatTableName(tableName)}</h2>
                <span className="text-xs text-slate-600">{rows.length} records</span>
              </div>

              <ResponsiveDataTable
                rows={rows.slice(0, 25)}
                columns={columns.map((column) => ({
                  label: formatColumnName(column),
                  render: (row) => {
                    const value = row[column];
                    const normalized = toSearchText(value);
                    return normalized || "-";
                  }
                }))}
                getRowKey={(row, index) => buildRowKey(tableName, row, index)}
                emptyMessage="No records available."
              />
            </SectionCard>
          );
        })
      )}
    </PageContainer>
  );
}

export default Dashboard;
