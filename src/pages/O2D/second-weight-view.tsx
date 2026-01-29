
"use client"
import { useState, useEffect, useRef } from 'react'
import { o2dAPI } from "../../services/o2dAPI";
import { Loader2 } from "lucide-react"

export function SecondWeightView() {
  const [pendingData, setPendingData] = useState([])
  const [historyData, setHistoryData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('pending')
  const [customerFilter, setCustomerFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const [pendingPage, setPendingPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [hasMorePending, setHasMorePending] = useState(true);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [pendingTotalCount, setPendingTotalCount] = useState<number | null>(null);
  const [historyTotalCount, setHistoryTotalCount] = useState<number | null>(null);
  const scrollContainerRef = useRef(null);

  // ✅ Reset pagination and fetch fresh data when filters change
  useEffect(() => {
    if (initialLoadDone) {
      setPendingPage(1);
      setHistoryPage(1);
      setPendingData([]);
      setHistoryData([]);
      setHasMorePending(true);
      setHasMoreHistory(true);
      fetchData(1, 1, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerFilter, searchTerm, activeTab, initialLoadDone]);

  // ✅ Load data when tab changes
  useEffect(() => {
    const loadInitial = async () => {
      setLoading(true);
      setPendingPage(1);
      setHistoryPage(1);
      setPendingData([]);
      setHistoryData([]);
      setHasMorePending(true);
      setHasMoreHistory(true);

      await fetchData(1, 1, true);
      setInitialLoadDone(true);
      setLoading(false);
    };
    loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ✅ Infinite scroll handler
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const bottom =
        container.scrollTop + container.clientHeight >= container.scrollHeight - 20;

      if (!initialLoadDone || loading) return;

      if (bottom) {
        if (activeTab === "pending" && hasMorePending) {
          const nextPage = pendingPage + 1;
          setPendingPage(nextPage);
          fetchData(nextPage, historyPage, false);
        } else if (activeTab === "history" && hasMoreHistory) {
          const nextPage = historyPage + 1;
          setHistoryPage(nextPage);
          fetchData(pendingPage, nextPage, false);
        }
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeTab,
    hasMorePending,
    hasMoreHistory,
    loading,
    initialLoadDone,
    pendingPage,
    historyPage,
  ]);

  const formatDateTime = (dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).replace(",", "");
    } catch {
      return dateString || "";
    }
  };


  // ✅ Fetch data with filters applied at database level
  const fetchData = async (pagePending = pendingPage, pageHistory = historyPage, resetData = false) => {
    try {
      setError(null);
      setLoading(true);

      if (activeTab === "pending") {
        // Build query parameters for filtering
        const params: Record<string, string | number> = {
          page: pagePending,
          limit: 50,
        };

        if (customerFilter) {
          params.customer = customerFilter;
        }
        if (searchTerm) {
          params.search = searchTerm;
        }

        const response = await o2dAPI.getPendingSecondWeight(params);
        const result = response.data;

        if (result.success && Array.isArray(result.data)) {
          const pending = result.data.map(item => ({
            orderNumber: item.ORDER_VRNO || "",
            gateEntryNumber: item.GATE_VRNO || "",
            customerName: item.ACC_REMARK || "",
            truckNumber: item.TRUCKNO || "",
            wbSlipNo: item.WSLIPNO || "",
            supervisorName: "",
            remarks: item.ACC_REMARK || "",
            finalWeight: "",
            plannedTimestamp: item.PLANNED_TIMESTAMP || "",
            indate: item.INDATE || "",
            plannedFormatted: item.PLANNED_TIMESTAMP
              ? formatDateTime(item.PLANNED_TIMESTAMP)
              : "",
            indateFormatted: item.INDATE
              ? formatDateTime(item.INDATE)
              : "",
          }));

          if (resetData || pagePending === 1) {
            setPendingData(pending);
            setPendingTotalCount(result.totalCount ?? null);
          } else {
            setPendingData(prev => [...prev, ...pending]);
          }

          setHasMorePending(pending.length === 50);
        } else {
          throw new Error(result.error || 'Failed to fetch pending second weight data');
        }
      }

      if (activeTab === "history") {
        // Build query parameters for filtering
        const params: Record<string, string | number> = {
          page: pageHistory,
          limit: 50,
        };

        if (customerFilter) {
          params.customer = customerFilter;
        }
        if (searchTerm) {
          params.search = searchTerm;
        }

        const response = await o2dAPI.getSecondWeightHistory(params);
        const result = response.data;

        if (result.success && Array.isArray(result.data)) {
          const history = result.data.map(item => ({
            orderNumber: item.ORDER_VRNO || "",
            gateEntryNumber: item.GATE_VRNO || "",
            customerName: item.ACC_REMARK || "",
            truckNumber: item.TRUCKNO || "",
            wbSlipNo: item.WSLIPNO || "",
            supervisorName: "",
            remarks: item.ACC_REMARK || "",
            finalWeight: "",
            plannedTimestamp: item.PLANNED_TIMESTAMP || "",
            outdate: item.OUTDATE || "",
            indate: item.INDATE || "",
            plannedFormatted: item.PLANNED_TIMESTAMP
              ? formatDateTime(item.PLANNED_TIMESTAMP)
              : "",
            outdateFormatted: item.OUTDATE
              ? formatDateTime(item.OUTDATE)
              : "",
            indateFormatted: item.INDATE
              ? formatDateTime(item.INDATE)
              : "",
          }));

          if (resetData || pageHistory === 1) {
            setHistoryData(history);
            setHistoryTotalCount(result.totalCount ?? null);
          } else {
            setHistoryData(prev => [...prev, ...history]);
          }

          setHasMoreHistory(history.length === 50);
        } else {
          throw new Error(result.error || 'Failed to fetch second weight history data');
        }
      }
    } catch (err) {
      setError("Error fetching data: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  // Get unique customers for dropdown (from current data)
  const uniqueCustomers = [...new Set([...pendingData, ...historyData].map(item => item.customerName))].filter(name => name).sort();

  if (loading && !initialLoadDone) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-gray-50">
        <div className="flex flex-col items-center space-y-4 p-8 bg-white rounded-lg shadow-xl">
          <div className="relative flex h-16 w-16">
            <span className="absolute inline-flex h-full w-full animate-spin rounded-full border-4 border-blue-500 border-t-transparent opacity-75"></span>
            <span className="absolute inline-flex h-full w-full animate-spin rounded-full border-4 border-blue-300 border-t-transparent opacity-50 delay-150"></span>
            <Loader2 className="h-8 w-8 text-blue-600 absolute inset-0 m-auto animate-pulse" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-800">Loading Second Weight Data...</h3>
            <p className="text-sm text-gray-500">Please wait while we fetch the latest information.</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Second Weight</h2>
          <p className="text-gray-600">Vehicle weighing after loading</p>
        </div>
        <div className="bg-white rounded-lg shadow border">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold">Error Loading Data</h3>
          </div>
          <div className="px-6 py-8 text-center">
            <p className="text-red-500 mb-4">Error: {error}</p>
            <button
              onClick={() => fetchData(1, 1, true)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Second Weight</h2>
        <p className="text-gray-600">Vehicle weighing after loading</p>
      </div>

      <div className="space-y-4">
        {/* Filter Controls */}
        <div className="bg-white p-4 rounded-lg shadow border mb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-full sm:w-auto">
              <label htmlFor="customer-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Customer
              </label>
              <select
                id="customer-filter"
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Customers</option>
                {uniqueCustomers.map((name, index) => (
                  <option key={index} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full sm:flex-1">
              <label htmlFor="search-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                id="search-filter"
                type="text"
                placeholder="Search by order number, gate entry, customer, truck number, WB slip..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setCustomerFilter('')
                  setSearchTerm('')
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('pending')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'pending'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Pending ({pendingTotalCount !== null ? pendingTotalCount : pendingData.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              History ({historyTotalCount !== null ? historyTotalCount : historyData.length})
            </button>
          </nav>
        </div>

        {/* Pending Tab Content */}
        {activeTab === 'pending' && (
          <div className="bg-white rounded-lg shadow border">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">Pending Second Weight</h3>
              <p className="text-gray-600 text-sm">
                {customerFilter ? `Filtered by: ${customerFilter}` : searchTerm ? `Search results for: "${searchTerm}"` : 'Vehicles waiting for final weighing'}
              </p>
            </div>
            <div
              ref={scrollContainerRef}
              className="overflow-x-auto relative"
              style={{ maxHeight: '400px', overflowY: 'auto' }}
            >
              <table className="w-full table-auto text-sm">
                <thead className="bg-gray-50 border-b sticky top-0 z-10 shadow-sm text-xs">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">S.No</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Planned Time</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">In Time</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Order Number</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Gate Entry</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Customer</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Truck Number</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">WB Slip No</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading && hasMorePending && (
                    <tr>
                      <td colSpan={8} className="px-6 py-4 text-center">
                        <div className="flex justify-center items-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                          <span className="ml-2 text-gray-600">Loading more data...</span>
                        </div>
                      </td>
                    </tr>
                  )}
                  {pendingData.length > 0 ? (
                    pendingData.map((entry, index) => (
                      <tr key={`${entry.gateEntryNumber}-${index}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-gray-900 text-xs sm:text-sm">{index + 1}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-900 text-xs sm:text-sm">{entry.plannedFormatted}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-900 text-xs sm:text-sm">{entry.indateFormatted}</td>
                        <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900 text-xs sm:text-sm">{entry.orderNumber}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-900 text-xs sm:text-sm">{entry.gateEntryNumber}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-900 text-xs sm:text-sm">{entry.customerName}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-900 text-xs sm:text-sm">{entry.truckNumber}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            {entry.wbSlipNo}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap max-w-xs truncate text-gray-900 text-xs sm:text-sm">{entry.remarks}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                        {customerFilter || searchTerm ? 'No records found for current filters' : 'No pending records found'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* History Tab Content */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-lg shadow border">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">Second Weight History</h3>
              <p className="text-gray-600 text-sm">
                {customerFilter ? `Filtered by: ${customerFilter}` : searchTerm ? `Search results for: "${searchTerm}"` : 'Completed final weighing records'}
              </p>
            </div>
            <div
              ref={scrollContainerRef}
              className="overflow-x-auto relative"
              style={{ maxHeight: '500px', overflowY: 'auto' }}
            >
              <table className="w-full table-auto text-sm">
                <thead className="bg-gray-50 border-b sticky top-0 z-10 shadow-sm text-xs">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">S.No</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Planned Time</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">In Time</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Out Time</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Order Number</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Gate Entry</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Customer</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Truck Number</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">WB Slip No</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading && hasMoreHistory && (
                    <tr>
                      <td colSpan={8} className="px-6 py-4 text-center">
                        <div className="flex justify-center items-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                          <span className="ml-2 text-gray-600">Loading more data...</span>
                        </div>
                      </td>
                    </tr>
                  )}
                  {historyData.length > 0 ? (
                    historyData.map((entry, index) => (
                      <tr key={`${entry.gateEntryNumber}-${index}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-gray-900 text-xs sm:text-sm">{index + 1}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-900 text-xs sm:text-sm">{entry.plannedFormatted}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-900 text-xs sm:text-sm">{entry.indateFormatted}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-900 text-xs sm:text-sm">{entry.outdateFormatted}</td>
                        <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900 text-xs sm:text-sm">{entry.orderNumber}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-900 text-xs sm:text-sm">{entry.gateEntryNumber}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-900 text-xs sm:text-sm">{entry.customerName}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-900 text-xs sm:text-sm">{entry.truckNumber}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            {entry.wbSlipNo}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                        {customerFilter || searchTerm ? 'No records found for current filters' : 'No history records found'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
