"use client"
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { o2dAPI } from "../../services/o2dAPI";

const COLUMN_DEFINITIONS = [
  { label: "Gate Entry Time", key: "GATE_ENTRY_TIMESTAMP" },
  { label: "Gate Entry Number", key: "GATE_ENTRY_NUMBER" },
  { label: "Loading Order Number", key: "LOADING_ORDER_NUMBER" },
  { label: "Party Name", key: "PARTY_NAME" },
  { label: "Truck Number", key: "TRUCKNO" },
  { label: "Weighbridge Slip", key: "WSLIP_NO" },
  { label: "Planned First Weight", key: "FIRST_WEIGHT_PLANNED" },
  { label: "Actual First Weight", key: "FIRST_WEIGHT_ACTUAL" },
  { label: "Planned Second Weight", key: "PLANNED_SECOND_WEIGHT" },
  { label: "Actual Second Weight", key: "ACTUAL_SECOND_WEIGHT" },
  { label: "Planned Invoice Time", key: "PLANNED_INVOICE_TIMESTAMP" },
  { label: "Actual Invoice Time", key: "ACTUAL_INVOICE_TIMESTAMP" },
  { label: "Invoice Number", key: "INVOICE_NUMBER" },
  { label: "Planned Gate Out", key: "GATE_OUT_PLANNED" },
  { label: "Actual Gate Out", key: "GATE_OUT_ACTUAL" },
];

const formatValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  return String(value);
};

export function PendingVehicles() {
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeline = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await o2dAPI.getProcessTimeline();
      if (response.data?.success && Array.isArray(response.data.rows)) {
        setTimeline(response.data.rows);
      } else {
        throw new Error(response.data?.error || "Unable to fetch process data");
      }
    } catch (err: any) {
      console.error("Failed to load process timeline:", err);
      setError(err?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  const headerClasses = "px-3 py-3 text-left font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap text-[10px] sm:text-xs";

  const memoizedRows = useMemo(() => timeline, [timeline]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Pending Vehicles</h2>
    
      </div>

      <div className="bg-white rounded-2xl shadow border border-gray-100">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {memoizedRows.length ? `${memoizedRows.length} records` : "No records yet"}
            </p>
           
          </div>
          <button
            onClick={fetchTimeline}
            className="inline-flex items-center gap-2 rounded-md border border-blue-600 bg-white px-3 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </button>
        </div>

        {loading && !memoizedRows.length && (
          <div className="flex items-center justify-center px-8 py-16 text-sm font-medium text-gray-500">
            <Loader2 className="mr-3 h-5 w-5 animate-spin text-blue-500" />
            Loading Pending Vehicles...
          </div>
        )}

        {error && (
          <div className="px-6 py-5 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="overflow-auto" style={{ maxHeight: "680px" }}>
          <table className="min-w-full text-xs leading-tight">
            <thead
              className="bg-white/80 text-left shadow-sm"
              style={{ position: "sticky", top: 0, zIndex: 1 }}
            >
              <tr>
                {COLUMN_DEFINITIONS.map((column) => (
                  <th key={column.key} className={headerClasses}>
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {memoizedRows.length === 0 ? (
                <tr>
                  <td colSpan={COLUMN_DEFINITIONS.length} className="px-3 py-10 text-center text-sm text-gray-500">
                    No Pending Vehicles yet. Try refreshing.
                  </td>
                </tr>
              ) : (
                memoizedRows.map((row, index) => (
                  <tr key={`${row.GATE_ENTRY_NUMBER || index}-${index}`} className="hover:bg-blue-50/40">
                    {COLUMN_DEFINITIONS.map((column) => (
                      <td key={column.key} className="px-3 py-3 text-[11px] sm:text-xs text-gray-800 align-top whitespace-nowrap">
                        {formatValue(row[column.key])}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
