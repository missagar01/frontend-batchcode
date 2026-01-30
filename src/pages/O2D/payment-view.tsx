"use client"
import { useState, useEffect, useRef, type UIEvent } from 'react'
import { o2dAPI } from "../../services/o2dAPI";
import { Loader2 } from "lucide-react"

export function PaymentView() {
  const [pendingData, setPendingData] = useState([])
  const [historyData, setHistoryData] = useState([])
  const [allCustomers, setAllCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [loadingTab, setLoadingTab] = useState<'pending' | 'history' | null>(null)
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending')
  const [selectedEntry, setSelectedEntry] = useState(null)
  const [paymentStatus, setPaymentStatus] = useState("")
  const [receivingMode, setReceivingMode] = useState("")
  const [receivedAmount, setReceivedAmount] = useState("")
  const [nextDateOfCall, setNextDateOfCall] = useState("")
  const [remarks, setRemarks] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [customerFilter, setCustomerFilter] = useState("")
  const [itemFilter, setItemFilter] = useState("")
  const [deductionAmount, setDeductionAmount] = useState("")
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [customerSearch, setCustomerSearch] = useState("")
  const customerDropdownRef = useRef(null)
  const [sortOrder, setSortOrder] = useState('none')
  const PAGE_SIZE = 50
  const [pendingPage, setPendingPage] = useState(1)
  const [historyPage, setHistoryPage] = useState(1)
  const [pendingHasMore, setPendingHasMore] = useState(true)
  const [historyHasMore, setHistoryHasMore] = useState(true)
  const [pendingTotalCount, setPendingTotalCount] = useState<number | null>(null)
  const [historyTotalCount, setHistoryTotalCount] = useState<number | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const displayedPendingCount = pendingTotalCount ?? pendingData.length
  const displayedHistoryCount = historyTotalCount ?? historyData.length
  const isPendingTabLoading = loadingTab === 'pending' && activeTab === 'pending'
  const isHistoryTabLoading = loadingTab === 'history' && activeTab === 'history'

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target)) {
        setShowCustomerDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // ✅ Fetch all customers from database
  useEffect(() => {
    fetchAllCustomers();
  }, []);

  // ✅ Fetch data when tab changes or filters change
  useEffect(() => {
    fetchTabData(activeTab, { reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, customerFilter, searchTerm, itemFilter]);

  const fetchAllCustomers = async () => {
    try {
      const response = await o2dAPI.getPaymentCustomers();
      if (response.data?.success && Array.isArray(response.data.data)) {
        setAllCustomers(response.data.data.filter(name => name).sort());
      }
    } catch (err) {
      console.error("Error fetching customers:", err);
    }
  };

  // ✅ Filtered customers based on search
  const filteredCustomers = allCustomers.filter(customer =>
    customer.toLowerCase().includes(customerSearch.toLowerCase())
  );

  // ✅ Handle customer selection
  const handleCustomerSelect = (customer) => {
    setCustomerFilter(customer);
    setCustomerSearch(customer);
    setShowCustomerDropdown(false);
  };

  // ✅ Reset customer filter
  const handleCustomerClear = () => {
    setCustomerFilter('');
    setCustomerSearch('');
    setShowCustomerDropdown(false);
  };

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

  // ✅ Fetch data from database with pagination support
  const fetchTabData = async (tab: 'pending' | 'history', options: { reset?: boolean } = {}) => {
    const shouldReset = options.reset ?? false
    const isPendingTab = tab === 'pending'

    if (!shouldReset) {
      if (isLoadingMore || loadingTab !== null) {
        return
      }

      const hasMore = isPendingTab ? pendingHasMore : historyHasMore
      if (!hasMore) {
        return
      }
    } else {
      if (isPendingTab) {
        setPendingPage(1)
        setPendingHasMore(true)
        setPendingTotalCount(null)
      } else {
        setHistoryPage(1)
        setHistoryHasMore(true)
        setHistoryTotalCount(null)
      }
    }

    const currentPage = shouldReset ? 1 : (isPendingTab ? pendingPage : historyPage)

    if (shouldReset) {
      setLoading(true)
      setLoadingTab(tab)
    } else {
      setIsLoadingMore(true)
    }

    setError(null)

    try {
      const paramsObj: Record<string, string | number> = {
        page: currentPage,
        limit: PAGE_SIZE
      };

      if (customerFilter) paramsObj.customer = customerFilter;
      if (searchTerm) paramsObj.search = searchTerm;
      if (itemFilter) paramsObj.item = itemFilter;

      const response = isPendingTab
        ? await o2dAPI.getPendingPayments(paramsObj)
        : await o2dAPI.getPaymentHistory(paramsObj);

      const result = response.data;

      if (result.success && Array.isArray(result.data)) {
        const normalizedData = result.data.map(item => ({
          plannedTimestamp: item.PLANNED_TIMESTAMP || "",
          vRDate: item.VRDATE || "",
          orderNumber: item.ORDER_VRNO || "",
          gateEntryNumber: item.GATE_VRNO || "",
          invoiceNumber: item.VRNO || "",
          customerName: item.CUSTOMER_NAME || "",
          truckNumber: item.TRUCKNO || "",
          itemName: item.ITEM_NAME || "",
          quantity: item.QTY || "",
          totalAmount: item.TOTAL_AMOUNT || "",
          receivedAmount: item.RECEIVED_AMOUNT || "",
          balanceAmount: item.BALANCE_AMOUNT || "",
          delay: item.DAYS || "",
          plannedFormatted: item.PLANNED_TIMESTAMP
            ? formatDateTime(item.PLANNED_TIMESTAMP)
            : "",
          vRDateFormatted: item.VRDATE
            ? formatDateTime(item.VRDATE)
            : "",
        }))

        const existingData = shouldReset ? [] : (isPendingTab ? pendingData : historyData)
        const combinedData = shouldReset ? normalizedData : [...existingData, ...normalizedData]
        const totalCount = result.totalCount ?? result.totalRecords ?? result.total ?? null
        const hasMore = totalCount != null ? combinedData.length < totalCount : normalizedData.length === PAGE_SIZE

        if (isPendingTab) {
          setPendingData(combinedData)
          setPendingPage(currentPage + 1)
          setPendingHasMore(hasMore)
          setPendingTotalCount(totalCount)
        } else {
          setHistoryData(combinedData)
          setHistoryPage(currentPage + 1)
          setHistoryHasMore(hasMore)
          setHistoryTotalCount(totalCount)
        }
      } else {
        throw new Error(result.error || `Failed to fetch ${isPendingTab ? 'pending payment' : 'payment history'} data`)
      }
    } catch (err) {
      setError("Error fetching data: " + err.message)
    } finally {
      if (shouldReset) {
        setLoading(false)
        setLoadingTab(prev => (prev === tab ? null : prev))
      }
      setIsLoadingMore(false)
    }
  }

  const handleScroll = (event: UIEvent<HTMLDivElement>, tabType: 'pending' | 'history') => {
    if (tabType !== activeTab) {
      return
    }

    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget
    const distanceToBottom = scrollHeight - scrollTop - clientHeight

    if (distanceToBottom > 120) {
      return
    }

    const hasMore = tabType === 'pending' ? pendingHasMore : historyHasMore

    if (loading || isLoadingMore || !hasMore) {
      return
    }

    fetchTabData(tabType)
  }

  // Add this function to handle sorting
  const handleSort = () => {
    if (sortOrder === 'none') {
      setSortOrder('asc');
    } else if (sortOrder === 'asc') {
      setSortOrder('desc');
    } else {
      setSortOrder('none');
    }
  };

  // Apply sorting when sortOrder changes
  useEffect(() => {
    if (sortOrder === 'none') {
      return;
    }

    const sortedData = [...pendingData].sort((a, b) => {
      const nameA = a.customerName.toLowerCase();
      const nameB = b.customerName.toLowerCase();

      if (sortOrder === 'asc') {
        return nameA.localeCompare(nameB);
      } else {
        return nameB.localeCompare(nameA);
      }
    });

    setPendingData(sortedData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortOrder]);

  const handleProcessPayment = async () => {
    if (!selectedEntry || !paymentStatus) {
      alert("Please select payment status")
      return
    }

    try {
      setIsSubmitting(true)

      // TODO: Implement payment submission API call
      // const paymentData = {
      //   orderNumber: selectedEntry.orderNumber,
      //   customerName: selectedEntry.customerName,
      //   invoiceNumber: selectedEntry.invoiceNumber,
      //   paymentStatus: paymentStatus,
      //   receivingMode: receivingMode || "",
      //   receivedAmount: receivedAmount || "",
      //   deductionAmount: deductionAmount || "",
      //   remarks: remarks || "",
      //   nextDateOfCall: nextDateOfCall || ""
      // }

      // Reset form
      setSelectedEntry(null)
      setPaymentStatus("")
      setReceivingMode("")
      setReceivedAmount("")
      setDeductionAmount("")
      setNextDateOfCall("")
      setRemarks("")
      setShowDialog(false)

      // Refresh data
      await fetchTabData(activeTab, { reset: true })

      alert("Payment processed successfully! (This would be saved to database in production)")
    } catch (error) {
      alert("Error processing payment: " + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // TODO: Uncomment when payment processing dialog is needed
  // const openDialog = (entry) => {
  //   setSelectedEntry(entry)
  //   setShowDialog(true)
  // }

  const closeDialog = () => {
    setShowDialog(false)
    setSelectedEntry(null)
    setPaymentStatus("")
    setReceivingMode("")
    setReceivedAmount("")
    setDeductionAmount("")
    setNextDateOfCall("")
    setRemarks("")
  }

  // Get unique item names for filter dropdown
  const uniqueItemNames = [...new Set(pendingData.map(item => item.itemName))].filter(name => name);

  // Clear filters function
  const clearFilters = () => {
    setCustomerFilter('');
    setCustomerSearch('');
    setSearchTerm('');
    setItemFilter('');
    setShowCustomerDropdown(false);
  };

  if (loading && pendingData.length === 0 && historyData.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-gray-50">
        <div className="flex flex-col items-center space-y-4 p-8 bg-white rounded-lg shadow-xl">
          <div className="relative flex h-16 w-16">
            <span className="absolute inline-flex h-full w-full animate-spin rounded-full border-4 border-blue-500 border-t-transparent opacity-75"></span>
            <span className="absolute inline-flex h-full w-full animate-spin rounded-full border-4 border-blue-300 border-t-transparent opacity-50 delay-150"></span>
            <Loader2 className="h-8 w-8 text-blue-600 absolute inset-0 m-auto animate-pulse" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-800">Loading Payment Data...</h3>
            <p className="text-sm text-gray-500">Please wait while we fetch the latest information.</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Payment</h2>
          <p className="text-sm sm:text-base text-gray-600">Payment processing and management</p>
        </div>

        <div className="bg-white rounded-lg shadow border">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold">Error Loading Data</h3>
            <p className="text-gray-600 text-sm">Unable to fetch data from database</p>
          </div>
          <div className="px-6 py-8">
            <div className="text-center">
              <p className="text-red-500 mb-4">Error: {error}</p>
              <button
                onClick={() => fetchTabData(activeTab, { reset: true })}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Payment</h2>
          <p className="text-sm sm:text-base text-gray-600">Payment processing and management</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Search and Filter Controls */}
        <div className="bg-white rounded-lg shadow border p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Customer Filter with Searchable Dropdown */}
            <div className="w-full sm:w-64 relative" ref={customerDropdownRef}>
              <label htmlFor="customer-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Customer
              </label>
              <div className="relative">
                <input
                  id="customer-filter"
                  type="text"
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowCustomerDropdown(true);
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  placeholder="Search customer..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 pr-10"
                />

                {customerSearch && (
                  <button
                    type="button"
                    onClick={handleCustomerClear}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Dropdown Menu */}
              {showCustomerDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map((customer, index) => (
                      <div
                        key={index}
                        onClick={() => handleCustomerSelect(customer)}
                        className={`px-3 py-2 cursor-pointer hover:bg-blue-50 ${customerFilter === customer ? 'bg-blue-100 text-blue-800' : ''
                          }`}
                      >
                        {customer}
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-gray-500">No customers found</div>
                  )}
                </div>
              )}
            </div>

            {/* Item Name Filter */}
            <div className="w-full sm:w-64">
              <label htmlFor="item-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Item Name
              </label>
              <select
                id="item-filter"
                value={itemFilter}
                onChange={(e) => setItemFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Items</option>
                {uniqueItemNames.map((name, index) => (
                  <option key={index} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                type="text"
                id="search"
                placeholder="Search across all columns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-end w-full sm:w-auto">
              <button
                onClick={clearFilters}
                className="w-full sm:w-auto px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
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
              Pending ({displayedPendingCount})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              History ({displayedHistoryCount})
            </button>
          </nav>
        </div>

        {/* Pending Tab Content */}
        {activeTab === 'pending' && (
          <div className="bg-white rounded-lg shadow border">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">Pending Payments</h3>
              <p className="text-gray-600 text-sm">
                {customerFilter ? `Filtered by: ${customerFilter}` : searchTerm ? `Search results for: "${searchTerm}"` : 'Invoices awaiting payment'}
                {customerFilter || searchTerm ? ` (${displayedPendingCount} records)` : ''}
              </p>
            </div>
            <div
              className="overflow-x-auto relative"
              style={{ maxHeight: '500px', overflowY: 'auto' }}
              onScroll={(e) => handleScroll(e, 'pending')}
            >
              <table className="w-full table-auto text-sm">
                <thead className="bg-gray-50 border-b sticky top-0 z-10 shadow-sm text-xs">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Planned</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Order Number</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Gate Entry</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap cursor-pointer" onClick={handleSort}>
                      Customer Name
                      {sortOrder === 'asc' && ' ↑'}
                      {sortOrder === 'desc' && ' ↓'}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Truck Number</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Invoice Number</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Item Name</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Quantity</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Delay (Days)</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Total Amount</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Received Amount</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Balance Amount</th>
                    {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th> */}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pendingData.length > 0 ? (
                    pendingData.map((entry, index) => (
                      <tr key={`${entry.invoiceNumber}-${index}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-gray-900 text-xs sm:text-sm">{entry.plannedFormatted}</td>
                        <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900 text-xs sm:text-sm">{entry.orderNumber}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-900 text-xs sm:text-sm">{entry.gateEntryNumber}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-900 text-xs sm:text-sm">{entry.customerName}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-900 text-xs sm:text-sm">{entry.truckNumber}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            {entry.invoiceNumber}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-900 text-xs sm:text-sm">{entry.itemName}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-900 text-xs sm:text-sm">{entry.quantity}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${parseInt(entry.delay) > 7
                            ? 'bg-red-100 text-red-800'
                            : parseInt(entry.delay) > 3
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                            }`}>
                            {entry.delay} days
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900 text-xs sm:text-sm">{entry.totalAmount}</td>
                        <td className="px-4 py-3 whitespace-nowrap font-medium text-green-600 text-xs sm:text-sm">{entry.receivedAmount}</td>
                        <td className="px-4 py-3 whitespace-nowrap font-medium text-red-600 text-xs sm:text-sm">{entry.balanceAmount}</td>
                        {/* <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => openDialog(entry)}
                            className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                          >
                            Process
                          </button>
                        </td> */}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={13} className="px-6 py-8 text-center text-gray-500">
                        {customerFilter || searchTerm ? 'No records found for current filters' : 'No pending records found'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {isPendingTabLoading && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-white/80 text-xs font-medium text-gray-600">
                  <span className="w-3.5 h-3.5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                  Loading pending records...
                </div>
              )}
              {isLoadingMore && (
                <div className="flex items-center justify-center gap-2 px-6 py-3 text-xs text-gray-500">
                  <span className="w-3.5 h-3.5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                  Loading more pending records...
                </div>
              )}
              {!isLoadingMore && !pendingHasMore && pendingData.length > 0 && (
                <div className="px-6 py-3 text-center text-xs text-gray-500">All pending records loaded</div>
              )}
            </div>
          </div>
        )}

        {/* History Tab Content */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-lg shadow border">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">Payment History</h3>
              <p className="text-gray-600 text-sm">
                {customerFilter ? `Filtered by: ${customerFilter}` : searchTerm ? `Search results for: "${searchTerm}"` : 'Processed payments'}
                {customerFilter || searchTerm ? ` (${displayedHistoryCount} records)` : ''}
              </p>
            </div>
            <div
              className="overflow-x-auto relative"
              style={{ maxHeight: '500px', overflowY: 'auto' }}
              onScroll={(e) => handleScroll(e, 'history')}
            >
              <table className="w-full table-auto text-sm">
                <thead className="bg-gray-50 border-b sticky top-0 z-10 shadow-sm text-xs">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Order Number</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Customer Name</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Invoice Number</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Item Name</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Quantity</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Total Amount</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Received Amount</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Balance Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {historyData.length > 0 ? (
                    historyData.map((entry, index) => (
                      <tr key={`${entry.invoiceNumber}-${index}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900 text-xs sm:text-sm">{entry.orderNumber}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-900 text-xs sm:text-sm">{entry.customerName}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                            {entry.invoiceNumber}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-900 text-xs sm:text-sm">{entry.itemName}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-900 text-xs sm:text-sm">{entry.quantity}</td>
                        <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900 text-xs sm:text-sm">{entry.totalAmount}</td>
                        <td className="px-4 py-3 whitespace-nowrap font-medium text-green-600 text-xs sm:text-sm">{entry.receivedAmount}</td>
                        <td className="px-4 py-3 whitespace-nowrap font-medium text-green-600 text-xs sm:text-sm">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${parseFloat(entry.balanceAmount) === 0
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                            }`}>
                            {entry.balanceAmount}
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
              {isHistoryTabLoading && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-white/80 text-xs font-medium text-gray-600">
                  <span className="w-3.5 h-3.5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                  Loading history records...
                </div>
              )}
              {isLoadingMore && (
                <div className="flex items-center justify-center gap-2 px-6 py-3 text-xs text-gray-500">
                  <span className="w-3.5 h-3.5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                  Loading more history records...
                </div>
              )}
              {!isLoadingMore && !historyHasMore && historyData.length > 0 && (
                <div className="px-6 py-3 text-center text-xs text-gray-500">All history records loaded</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Dialog Modal */}
      {showDialog && selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">Process Payment</h3>
              <p className="text-gray-600 text-sm">Process payment for invoice {selectedEntry.invoiceNumber}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Status</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select payment status</option>
                  <option value="Follow Up">Follow Up</option>
                  <option value="Received">Received</option>
                </select>
              </div>

              {paymentStatus === "Follow Up" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Next Date of Call</label>
                    <input
                      type="date"
                      value={nextDateOfCall}
                      onChange={(e) => setNextDateOfCall(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
                    <textarea
                      placeholder="Enter any remarks..."
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}

              {paymentStatus === "Received" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Receiving Mode</label>
                    <select
                      value={receivingMode}
                      onChange={(e) => setReceivingMode(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select receiving mode</option>
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cheque">Cheque</option>
                      <option value="UPI">UPI</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Received Amount</label>
                    <input
                      type="text"
                      placeholder="Enter received amount"
                      value={receivedAmount}
                      onChange={(e) => setReceivedAmount(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Deduction Amount</label>
                    <input
                      type="text"
                      placeholder="Enter deduction amount (if any)"
                      value={deductionAmount}
                      onChange={(e) => setDeductionAmount(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
                    <textarea
                      placeholder="Enter any remarks..."
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={closeDialog}
                disabled={isSubmitting}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleProcessPayment}
                disabled={isSubmitting || !paymentStatus}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {isSubmitting ? "Processing..." : "Process Payment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
