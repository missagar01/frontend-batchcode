"use client"
import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"

import { o2dAPI } from "../../services/o2dAPI"

export function OrdersView() {
  const [pendingOrders, setPendingOrders] = useState([])
  const [historyOrders, setHistoryOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState("pending")

  const [filters, setFilters] = useState({
    salesperson: '',
    customer: '',
    item: '',
    search: ''
  })

  const [filterOptions, setFilterOptions] = useState({
    salespersons: [],
    customers: [],
    items: []
  })

  const [balanceTotals, setBalanceTotals] = useState({
    pending: 0,
    history: 0
  })

  const fetchOrderData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch pending orders
      const pendingResponse = await o2dAPI.getPendingOrders()
      const pendingResult = pendingResponse.data

      // Fetch completed orders (History)
      const historyResponse = await o2dAPI.getCompletedOrders()
      const historyResult = historyResponse.data

      if (!pendingResult.success || !historyResult.success) {
        throw new Error(pendingResult.message || historyResult.message || 'Failed to fetch data')
      }

      const pendingRows = pendingResult.data || []
      const historyRows = historyResult.data || []

      // Helper to process rows
      const processRows = (rows, statusType) => {
        return rows.map((row: any, index: number) => {
          // Handle potentially different casing
          const getField = (key: string) => row[key] || row[key.toUpperCase()] || row[key.toLowerCase()] || '';

          const vrDate = getField('vrdate');
          let formattedDateTime = vrDate;
          if (vrDate) {
            const dateObj = new Date(vrDate);
            if (!isNaN(dateObj.getTime())) {
              const day = String(dateObj.getDate()).padStart(2, '0');
              const month = String(dateObj.getMonth() + 1).padStart(2, '0');
              const year = String(dateObj.getFullYear()).slice(-2);
              const hours = String(dateObj.getHours()).padStart(2, '0');
              const minutes = String(dateObj.getMinutes()).padStart(2, '0');
              formattedDateTime = `${day}/${month}/${year} ${hours}:${minutes}`;
            }
          }

          // Balance Logic
          let balance = 0;
          if (statusType === 'Pending') {
            balance = parseFloat(getField('balance_qty') || getField('balanceqty')) || 0;
          }

          return {
            id: `${statusType}-${index}-${getField('vrno')}`,
            salesperson: getField('sales_person') || getField('salesperson') || '',
            customerName: getField('customer_name') || getField('customername') || '',
            vrno: getField('vrno'),
            date: formattedDateTime,
            itemName: getField('item_name') || getField('itemname') || '',
            remarks: getField('remark') || getField('remarks') || '',
            priority: getField('priority') || '',
            rate: getField('rate') || '',
            balanceQty: balance,
            status: statusType
          }
        })
      }

      const pending = processRows(pendingRows, 'Pending');
      const history = processRows(historyRows, 'History');

      // Combine for filter options
      const allOrders = [...pending, ...history];

      // Extract unique values for filters
      const salespersons = [...new Set(allOrders.map(order => order.salesperson).filter(Boolean))].sort()
      const customers = [...new Set(allOrders.map(order => order.customerName).filter(Boolean))].sort()
      const items = [...new Set(allOrders.map(order => order.itemName).filter(Boolean))].sort()

      setFilterOptions({
        salespersons,
        customers,
        items
      })

      // Calculate totals
      setBalanceTotals({
        pending: pending.reduce((sum, order) => sum + order.balanceQty, 0),
        history: 0
      })

      setPendingOrders(pending)
      setHistoryOrders(history)

    } catch (err: any) {
      console.error("Fetch Error:", err);
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const filterOrders = (orders) => {
    return orders.filter(order => {
      if (filters.salesperson && order.salesperson !== filters.salesperson) return false
      if (filters.customer && order.customerName !== filters.customer) return false
      if (filters.item && order.itemName !== filters.item) return false

      if (filters.search) {
        const searchTerm = filters.search.toLowerCase()
        const matchesSearch =
          order.vrno.toLowerCase().includes(searchTerm) ||
          order.customerName.toLowerCase().includes(searchTerm) ||
          order.itemName.toLowerCase().includes(searchTerm) ||
          order.remarks.toLowerCase().includes(searchTerm)
        if (!matchesSearch) return false
      }
      return true
    })
  }

  useEffect(() => {
    fetchOrderData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-gray-50">
        <div className="flex flex-col items-center space-y-4 p-8 bg-white rounded-lg shadow-xl">
          <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-800">Loading Orders...</h3>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Orders</h2>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading data</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <button
                onClick={fetchOrderData}
                className="mt-2 text-sm bg-red-100 text-red-800 px-3 py-1 rounded hover:bg-red-200"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderTable = (data, type) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-md">
      {/* Header Section */}
      <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center space-x-2">
          <div className={`h-2 w-2 rounded-full ${type === 'pending' ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
          <div>
            <h3 className="text-lg font-bold text-gray-800 capitalize">{type} Orders</h3>
            <p className="text-gray-500 text-xs mt-0.5">Manage and track your {type} status orders</p>
          </div>
        </div>
        <div className="px-4 py-2 bg-blue-50 rounded-lg border border-blue-100">
          <span className="text-blue-600 text-xs font-semibold uppercase tracking-wider">Total Balance</span>
          <div className="text-xl font-bold text-blue-800 tabular-nums leading-none mt-1">
            {typeof balanceTotals[type] === 'number' ? balanceTotals[type].toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="p-5 bg-white border-b border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative group">
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 ml-1">Salesperson</label>
            <select
              value={filters.salesperson}
              onChange={(e) => setFilters({ ...filters, salesperson: e.target.value })}
              className="w-full pl-3 pr-8 py-2.5 bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors cursor-pointer hover:bg-gray-100"
            >
              <option value="">All Salespersons</option>
              {filterOptions.salespersons.map((sp, i) => (
                <option key={i} value={sp}>{sp}</option>
              ))}
            </select>
          </div>

          <div className="relative group">
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 ml-1">Customer</label>
            <select
              value={filters.customer}
              onChange={(e) => setFilters({ ...filters, customer: e.target.value })}
              className="w-full pl-3 pr-8 py-2.5 bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors cursor-pointer hover:bg-gray-100"
            >
              <option value="">All Customers</option>
              {filterOptions.customers.map((c, i) => (
                <option key={i} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="relative group">
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 ml-1">Item</label>
            <select
              value={filters.item}
              onChange={(e) => setFilters({ ...filters, item: e.target.value })}
              className="w-full pl-3 pr-8 py-2.5 bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors cursor-pointer hover:bg-gray-100"
            >
              <option value="">All Items</option>
              {filterOptions.items.map((it, i) => (
                <option key={i} value={it}>{it}</option>
              ))}
            </select>
          </div>

          <div className="relative group">
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 ml-1">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full px-3 pr-3 py-2.5 bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors hover:bg-gray-100"
              placeholder="Search VR No, Remarks..."
            />
          </div>
        </div>

        {(filters.salesperson || filters.customer || filters.item || filters.search) && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => setFilters({ salesperson: '', customer: '', item: '', search: '' })}
              className="text-xs font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md transition-colors flex items-center space-x-1"
            >
              <span>Clear Filters</span>
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto relative" style={{ maxHeight: '500px', overflowY: 'auto' }}>
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50/50 sticky top-0 z-10 backdrop-blur-sm shadow-sm ring-1 ring-black/5">
            <tr>
              <th className="px-5 py-3.5 text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">S.No</th>
              <th className="px-5 py-3.5 text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Salesperson</th>
              <th className="px-5 py-3.5 text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Customer</th>
              <th className="px-5 py-3.5 text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">VR No</th>
              <th className="px-5 py-3.5 text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Date</th>
              <th className="px-5 py-3.5 text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Item</th>
              <th className="px-5 py-3.5 text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap w-48">Remarks</th>
              <th className="px-5 py-3.5 text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap text-center">Priority</th>
              <th className="px-5 py-3.5 text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap text-right">Rate</th>
              <th className="px-5 py-3.5 text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap text-right">Balance Qty</th>
              <th className="px-5 py-3.5 text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {filterOrders(data).length > 0 ? (
              filterOrders(data).map((order, index) => (
                <tr key={order.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-5 py-4 text-sm text-gray-700 whitespace-nowrap font-medium">{index + 1}</td>
                  <td className="px-5 py-4 text-sm text-gray-700 whitespace-nowrap font-medium">{order.salesperson}</td>
                  <td className="px-5 py-4 text-sm text-gray-700 whitespace-nowrap font-medium text-gray-900">{order.customerName}</td>
                  <td className="px-5 py-4 text-sm font-mono text-gray-600 whitespace-nowrap bg-gray-50/50 rounded-sm">{order.vrno}</td>
                  <td className="px-5 py-4 text-sm text-gray-600 whitespace-nowrap tabular-nums">{order.date}</td>
                  <td className="px-5 py-4 text-sm text-gray-700 whitespace-nowrap">{order.itemName}</td>
                  <td className="px-5 py-4 text-sm text-gray-500 min-w-[200px]">
                    <p className="truncate max-w-[200px]" title={order.remarks}>{order.remarks || "-"}</p>
                  </td>
                  <td className="px-5 py-4 text-sm text-center">
                    {order.priority === 'PRIORITY' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800 border border-red-200 shadow-sm animate-pulse-slow">
                        PRIORITY
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-700 whitespace-nowrap text-right font-medium tabular-nums">
                    {order.rate ? `₹${order.rate}` : '-'}
                  </td>
                  <td className="px-5 py-4 text-sm font-bold text-gray-900 whitespace-nowrap text-right tabular-nums">
                    {typeof order.balanceQty === 'number' ? order.balanceQty.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : order.balanceQty}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-center">
                    <span className={`inline-flex px-2.5 py-1 text-xs font-bold rounded-full border shadow-sm ${type === 'pending' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      }`}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={11} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <h3 className="text-gray-900 font-medium">No orders found</h3>
                    <p className="text-gray-500 text-sm mt-1">Try adjusting your filters</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Orders</h2>
          <p className="text-gray-600">Manage all orders</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={fetchOrderData}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2 transition-colors"
          >
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("pending")}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === "pending"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
            >
              Pending ({pendingOrders.length})
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === "history"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
            >
              History ({historyOrders.length})
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "pending" && renderTable(pendingOrders, "pending")}
        {activeTab === "history" && renderTable(historyOrders, "history")}
      </div>
    </div>
  )
}


