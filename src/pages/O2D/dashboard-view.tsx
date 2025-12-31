"use client"

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { AlertCircle, CalendarIcon, Filter, Loader2, RefreshCw, X } from "lucide-react"
import { format } from "date-fns"
import { useSearchParams } from "react-router"
import { useAuth } from "../../context/AuthContext"
import LeadToOrderDashboard from "../LeadToOrder/Dashboard"
import BatchCodeDashboard from "../BatchCode/Dashboard"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { Calendar } from "./ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { ChartContainer, ChartTooltip } from "./ui/chart"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs"
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts"
import { cn } from "../../lib/utils"
import api, { API_ENDPOINTS } from "../../config/api";
type DashboardRow = {
  indate?: string | null
  outdate?: string | null
  gateOutTime?: string | null
  orderVrno?: string | null
  gateVrno?: string | null
  wslipno?: string | null
  salesPerson?: string | null
  partyName?: string | null
  itemName?: string | null
  invoiceNo?: string | null
  stateName?: string | null
}

type DashboardSummary = {
  totalGateIn?: number
  totalGateOut?: number
  pendingGateOut?: number
  totalDispatch?: number
}

type DashboardFilters = {
  parties?: string[]
  items?: string[]
  salesPersons?: string[]
  states?: string[]
}

type DashboardResponse = {
  summary?: DashboardSummary
  filters?: DashboardFilters
  rows?: DashboardRow[]
  lastUpdated?: string
  appliedFilters?: Record<string, string | null>
}

// Using o2dAPI service instead of direct fetch

const formatTodayDate = () => {
  const today = new Date()
  const day = String(today.getDate()).padStart(2, "0")
  const month = String(today.getMonth() + 1).padStart(2, "0")
  const year = today.getFullYear()
  return `${day}/${month}/${year}`
}

const parseDateTime = (value?: string | null) => {
  if (!value) return null
  const parsed = new Date(value)
  return isNaN(parsed.getTime()) ? null : parsed
}

const isDateInRange = (value?: string | null, start?: Date | null, end?: Date | null) => {
  if (!value) return false
  const parsed = parseDateTime(value)
  if (!parsed) return false

  const dateOnly = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
  if (start) {
    const startOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate())
    if (dateOnly < startOnly) return false
  }
  if (end) {
    const endOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate())
    if (dateOnly > endOnly) return false
  }
  return true
}

export function DashboardView() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  
  // Helper function to get default tab based on user's system_access
  const getDefaultTab = useCallback((): "o2d" | "lead-to-order" | "batchcode" => {
    const tabParam = searchParams.get("tab")
    if (tabParam === "lead-to-order" || tabParam === "batchcode") {
      return tabParam
    }
    
    // If user is loaded, check system_access
    if (user && !authLoading) {
      const isAdmin = (user?.role || user?.userType || "").toString().toLowerCase().includes("admin")
      
      // Admin sees O2D by default
      if (isAdmin) {
        return "o2d"
      }
      
      // For regular users, check system_access
      const systemAccess = user?.system_access 
        ? user.system_access.split(",").map(s => s.trim().toLowerCase().replace(/\s+/g, "")).filter(Boolean)
        : []
      
      // Priority: o2d > lead-to-order > batchcode
      if (systemAccess.includes("o2d")) {
        return "o2d"
      } else if (systemAccess.includes("lead-to-order")) {
        return "lead-to-order"
      } else if (systemAccess.includes("batchcode")) {
        return "batchcode"
      }
    }
    
    // Default fallback
    return "o2d"
  }, [searchParams, user, authLoading])
  
  // Initialize activeTab with proper default
  const [activeTab, setActiveTab] = useState<"o2d" | "lead-to-order" | "batchcode">(() => {
    const tabParam = searchParams.get("tab")
    if (tabParam === "lead-to-order" || tabParam === "batchcode") {
      return tabParam
    }
    // Will be updated by useEffect when user loads
    return "o2d"
  })

  const [selectedParty, setSelectedParty] = useState("All Parties")
  const [selectedItem, setSelectedItem] = useState("All Items")
  const [selectedSales, setSelectedSales] = useState("All Salespersons")
  const [selectedState, setSelectedState] = useState("All States")
  const [fromDate, setFromDate] = useState<Date | null>(null)
  const [toDate, setToDate] = useState<Date | null>(null)

  const dashboardRef = useRef<HTMLDivElement | null>(null)

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Build query params for proper Redis caching
      const params = new URLSearchParams()
      if (selectedParty !== "All Parties") params.append("partyName", selectedParty)
      if (selectedItem !== "All Items") params.append("itemName", selectedItem)
      if (selectedSales !== "All Salespersons") params.append("salesPerson", selectedSales)
      if (selectedState !== "All States") params.append("stateName", selectedState)
      if (fromDate) params.append("fromDate", format(fromDate, "yyyy-MM-dd"))
      if (toDate) params.append("toDate", format(toDate, "yyyy-MM-dd"))
      
      const queryString = params.toString()
      const url = queryString 
        ? `${API_ENDPOINTS.O2D.DASHBOARD.SUMMARY}?${queryString}`
        : API_ENDPOINTS.O2D.DASHBOARD.SUMMARY
      
      const response = await api.get(url)
      const payload = response.data
      if (!payload?.success || !payload?.data) {
        throw new Error("Invalid dashboard response")
      }
      setData(payload.data as DashboardResponse)
      setLastUpdated(payload.data.lastUpdated ? new Date(payload.data.lastUpdated) : new Date())
    } catch (err: unknown) {
      console.error("Error fetching dashboard:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to load dashboard data"
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [selectedParty, selectedItem, selectedSales, selectedState, fromDate, toDate])

  // Update tab when URL params change or user loads
  useEffect(() => {
    // Wait for auth to load
    if (authLoading) {
      return
    }
    
    const tabParam = searchParams.get("tab")
    if (tabParam === "lead-to-order" || tabParam === "batchcode") {
      setActiveTab(tabParam)
    } else if (!tabParam) {
      // If no tab param, use default based on user's system_access
      const defaultTab = getDefaultTab()
      if (activeTab !== defaultTab) {
        setActiveTab(defaultTab)
      }
    }
  }, [searchParams, user, authLoading, getDefaultTab, activeTab])

  useEffect(() => {
    // Wait for auth to load before fetching data
    if (authLoading) {
      return
    }
    
    if (activeTab === "o2d") {
      // Only fetch if we don't have data yet
      if (!data) {
        fetchDashboard()
      }
      // Set up auto-refresh interval
      const interval = setInterval(fetchDashboard, 5 * 60 * 1000)
      return () => clearInterval(interval)
    } else {
      // For other tabs (lead-to-order, batchcode), reset loading state
      // Their components will handle their own data fetching
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, authLoading]) // Only run when tab changes or auth loads, not when data/fetchDashboard changes

  const filteredData = useMemo(() => {
    const rows = data?.rows || []
    return rows.filter((row) => {
      const partyName = row.partyName?.trim() || ""
      const itemName = row.itemName?.trim() || ""
      const salesName = row.salesPerson?.trim() || ""
      const stateName = (row.stateName || (row as Record<string, unknown>).state || (row as Record<string, unknown>).STATE || "").toString().trim()

      if (selectedParty !== "All Parties" && partyName !== selectedParty) return false
      if (selectedItem !== "All Items" && itemName !== selectedItem) return false
      if (selectedSales !== "All Salespersons" && salesName !== selectedSales) return false
      if (selectedState !== "All States" && stateName !== selectedState) return false

      if (fromDate || toDate) {
        const dateToCheck = row.outdate || row.indate || row.gateOutTime
        if (!dateToCheck || !isDateInRange(dateToCheck, fromDate, toDate)) return false
      }

      return true
    })
  }, [data?.rows, fromDate, selectedItem, selectedParty, selectedSales, selectedState, toDate])

  const hasActiveFilters =
    selectedParty !== "All Parties" ||
    selectedItem !== "All Items" ||
    selectedSales !== "All Salespersons" ||
    selectedState !== "All States" ||
    fromDate !== null ||
    toDate !== null

  const calculateFilteredMetrics = () => {
    const rows = filteredData || []
    const summary: DashboardSummary = data?.summary || {}

    const totalsFromRows = () => {
      const gateIn = rows.length
      const gateOut = rows.filter((row) => !!row.gateOutTime).length
      const pendingGateOut = rows.filter((row) => !row.gateOutTime).length
      const dispatch = rows.length
      return { gateIn, gateOut, pendingGateOut, dispatch }
    }

    const rowTotals = totalsFromRows()
    const gateIn = hasActiveFilters ? rowTotals.gateIn : summary.totalGateIn ?? rowTotals.gateIn
    const gateOut = hasActiveFilters ? rowTotals.gateOut : summary.totalGateOut ?? rowTotals.gateOut
    const pendingGateOut = hasActiveFilters
      ? rowTotals.pendingGateOut
      : summary.pendingGateOut ?? rowTotals.pendingGateOut
    const dispatch = hasActiveFilters ? rowTotals.dispatch : summary.totalDispatch ?? rowTotals.dispatch

    return {
      totalGateIn: gateIn,
      totalGateOut: gateOut,
      totalPendingGateOut: pendingGateOut,
      loadingPending: 0,
      totalDispatchToday: dispatch,
      wbIn: 0,
      wbOut: 0,
      wbPending: 0,
      totalAmount: 0,
      totalPaymentsReceived: 0,
      pendingPayments: 0,
      paymentSuccessRate: 0,
    }
  }

  const displayMetrics = calculateFilteredMetrics()

  const formatMetricValue = (value?: number | string | null) => {
    if (typeof value === "number") {
      return value.toLocaleString("en-IN")
    }
    if (typeof value === "string" && value.trim().length > 0) {
      return value
    }
    return "0"
  }

  const summaryCards = [
    {
      id: "gateIn",
      title: "Total Gate In",
      value: formatMetricValue(displayMetrics.totalGateIn),
      description: "Live count",
      badgeText: "Today",
      backgroundColor: "#EFF6FF", // Light blue background
      borderColor: "rgba(37,99,235,0.85)",
      titleColor: "#1e40af",
      valueColor: "#1e3a8a",
      descriptionColor: "#3b82f6",
      badgeStyle: {
        backgroundColor: "rgba(37,99,235,0.15)",
        color: "#1d4ed8",
        borderColor: "rgba(37,99,235,0.45)",
      },
    },
    {
      id: "gateOut",
      title: "Total Gate Out",
      value: formatMetricValue(displayMetrics.totalGateOut),
      description: "Live count",
      badgeText: "Today",
      backgroundColor: "#F5F3FF", // Light purple background
      borderColor: "rgba(79,70,229,0.85)",
      titleColor: "#5b21b6",
      valueColor: "#4c1d95",
      descriptionColor: "#7c3aed",
      badgeStyle: {
        backgroundColor: "rgba(79,70,229,0.14)",
        color: "#4338ca",
        borderColor: "rgba(79,70,229,0.45)",
      },
    },
    {
      id: "pendingGateOut",
      title: "Pending Gate Out",
      value: formatMetricValue(displayMetrics.totalPendingGateOut),
      description: "Awaiting gate out",
      badgeText: "Pending",
      backgroundColor: "#FFF7ED", // Light orange/yellow background
      borderColor: "rgba(249,115,22,0.85)",
      titleColor: "#c2410c",
      valueColor: "#9a3412",
      descriptionColor: "#ea580c",
      badgeStyle: {
        backgroundColor: "rgba(249,115,22,0.16)",
        color: "#c2410c",
        borderColor: "rgba(249,115,22,0.45)",
      },
    },
    {
      id: "totalDispatch",
      title: "Total Dispatch",
      value: formatMetricValue(displayMetrics.totalDispatchToday),
      description: "Total rows",
      badgeText: formatTodayDate(),
      backgroundColor: "#FAF5FF", // Light purple background
      borderColor: "rgba(124,58,237,0.9)",
      titleColor: "#6d28d9",
      valueColor: "#581c87",
      descriptionColor: "#9333ea",
      badgeStyle: {
        backgroundColor: "rgba(124,58,237,0.14)",
        color: "#6d28d9",
        borderColor: "rgba(124,58,237,0.45)",
      },
    },
  ]

  const stateOptions = useMemo(() => {
    if (data?.filters?.states && data.filters.states.length > 0) return data.filters.states
    const rows = data?.rows || []
    const set = new Set<string>()
    rows.forEach((row) => {
      const value = (row.stateName || (row as Record<string, unknown>).state || (row as Record<string, unknown>).STATE || "").toString().trim()
      if (value) set.add(value)
    })
    return Array.from(set).sort()
  }, [data?.filters?.states, data?.rows])

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D", "#FFC658", "#FF7C7C"]

  const chartData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return []

    const map: Record<string, number> = {}
    filteredData.forEach((row) => {
      const name = row.partyName?.trim()
      if (!name) return
      map[name] = (map[name] || 0) + 1
    })

    const sorted = Object.entries(map).sort(([, a], [, b]) => b - a)
    const top10 = sorted.slice(0, 10)
    const others = sorted.slice(10)

    const dataPoints = top10.map(([name, value], index) => ({
      name,
      value,
      fill: COLORS[index % COLORS.length],
    }))

    if (others.length > 0) {
      const othersTotal = others.reduce((sum, [, value]) => sum + value, 0)
      dataPoints.push({ name: "Others", value: othersTotal, fill: "#999999" })
    }

    return dataPoints
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredData])

  const top10Customers = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return []
    const map: Record<
      string,
      { name: string; dispatchCount: number; items: Set<string>; totalQty: number; balanceAmount: number }
    > = {}

    filteredData.forEach((row) => {
      const name = row.partyName?.trim()
      if (!name) return

      if (!map[name]) {
        map[name] = { name, dispatchCount: 0, items: new Set<string>(), totalQty: 0, balanceAmount: 0 }
      }

      if (row.itemName) map[name].items.add(row.itemName.trim())
      map[name].dispatchCount += 1
    })

    return Object.values(map)
      .sort((a, b) => b.dispatchCount - a.dispatchCount)
      .slice(0, 10)
      .map((customer, index) => ({
        rank: index + 1,
        name: customer.name,
        dispatches: customer.dispatchCount,
        amount: "₹0",
        balanceAmount: "₹0",
        itemNames: Array.from(customer.items).join(", "),
        totalQty: customer.totalQty.toFixed(2),
      }))
  }, [filteredData])

  const downloadPDF = async () => {
    if (!dashboardRef.current) {
      alert("Dashboard content not ready for download")
      return
    }

    try {
      const metrics = displayMetrics
      const top10Data = top10Customers

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Dashboard Report</title>
          <style>
            @page { margin: 20mm; size: A4; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; line-height: 1.6; background: white; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 20px; }
            .header h1 { font-size: 28px; color: #1e40af; margin-bottom: 5px; }
            .header .subtitle { font-size: 14px; color: #6b7280; margin-bottom: 10px; }
            .timestamp { font-size: 12px; color: #9ca3af; }
            .section { margin-bottom: 30px; page-break-inside: avoid; }
            .section-title { font-size: 18px; font-weight: 600; color: #1e40af; margin-bottom: 15px; padding-bottom: 5px; border-bottom: 1px solid #e5e7eb; }
            .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px; }
            .kpi-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; background: #f9fafb; }
            .kpi-label { font-size: 12px; color: #6b7280; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.5px; }
            .kpi-value { font-size: 20px; font-weight: 700; color: #1e40af; }
            .kpi-value.amount { color: #059669; }
            .kpi-value.alert { color: #dc2626; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
            th { background: #f3f4f6; color: #374151; font-weight: 600; padding: 12px 8px; text-align: left; border: 1px solid #d1d5db; }
            td { padding: 10px 8px; border: 1px solid #e5e7eb; vertical-align: top; }
            tr:nth-child(even) { background: #f9fafb; }
            tr:hover { background: #f3f4f6; }
            .filters-section { background: #eff6ff; padding: 15px; border-radius: 8px; border-left: 4px solid #2563eb; }
            .filter-item { display: inline-block; background: white; padding: 5px 10px; margin: 5px; border-radius: 15px; border: 1px solid #d1d5db; font-size: 12px; }
            .no-data { text-align: center; color: #6b7280; font-style: italic; padding: 20px; }
            .page-break { page-break-before: always; }
            @media print { body { print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Dashboard Report</h1>
            <div class="subtitle">Filtered view of O2D operations</div>
            <div class="timestamp">Generated on: ${new Date().toLocaleString()}</div>
          </div>

          <div class="section">
            <div class="section-title">Key Performance Indicators</div>
            <div class="kpi-grid">
              <div class="kpi-card"><div class="kpi-label">Total Gate In</div><div class="kpi-value">${metrics.totalGateIn}</div></div>
              <div class="kpi-card"><div class="kpi-label">Total Gate Out</div><div class="kpi-value">${metrics.totalGateOut}</div></div>
              <div class="kpi-card"><div class="kpi-label">Total Dispatch</div><div class="kpi-value">${metrics.totalDispatchToday}</div></div>
              <div class="kpi-card"><div class="kpi-label">Pending Gate Out</div><div class="kpi-value alert">${metrics.totalPendingGateOut}</div></div>
            </div>
          </div>

          ${
            hasActiveFilters
              ? `
          <div class="section">
            <div class="section-title">Applied Filters</div>
            <div class="filters-section">
              ${selectedParty !== "All Parties" ? `<span class="filter-item">Party: ${selectedParty}</span>` : ""}
              ${selectedItem !== "All Items" ? `<span class="filter-item">Item: ${selectedItem}</span>` : ""}
              ${selectedState !== "All States" ? `<span class="filter-item">State: ${selectedState}</span>` : ""}
              ${selectedSales !== "All Salespersons" ? `<span class="filter-item">Sales: ${selectedSales}</span>` : ""}
              ${fromDate ? `<span class="filter-item">From: ${format(fromDate, "dd/MM/yyyy")}</span>` : ""}
              ${toDate ? `<span class="filter-item">To: ${format(toDate, "dd/MM/yyyy")}</span>` : ""}
            </div>
          </div>
          `
              : ""
          }

          <div class="section">
            <div class="section-title">Top 10 Customers</div>
            ${
              top10Data.length > 0
                ? `
            <table>
              <thead>
                <tr><th style="width:8%">Rank</th><th style="width:40%">Customer Name</th><th style="width:20%">Dispatches</th><th style="width:32%">Items</th></tr>
              </thead>
              <tbody>
                ${top10Data
                  .map(
                    (customer) => `
                <tr>
                  <td>${customer.rank}</td>
                  <td>${customer.name}</td>
                  <td>${customer.dispatches}</td>
                  <td>${customer.itemNames}</td>
                </tr>`,
                  )
                  .join("")}
              </tbody>
            </table>
            `
                : '<div class="no-data">No customer data available</div>'
            }
          </div>

          <div class="section page-break">
            <div class="section-title">Filtered Results (${filteredData?.length || 0} total records)</div>
            ${
              filteredData && filteredData.length > 0
                ? `
            <table>
              <thead>
                <tr>
                  <th style="width: 6%">Sr.No.</th>
                  <th style="width: 30%">Party Name</th>
                  <th style="width: 20%">Item</th>
                  <th style="width: 14%">In Date</th>
                  <th style="width: 14%">Out Date</th>
                  <th style="width: 16%">Invoice No.</th>
                </tr>
              </thead>
              <tbody>
                ${filteredData
                  .slice(0, 100)
                  .map(
                    (row, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${row.partyName || "-"}</td>
                  <td>${row.itemName || "-"}</td>
                  <td>${row.indate ? new Date(row.indate).toLocaleDateString() : "-"}</td>
                  <td>${row.outdate ? new Date(row.outdate).toLocaleDateString() : "-"}</td>
                  <td>${row.invoiceNo || "-"}</td>
                </tr>`,
                  )
                  .join("")}
              </tbody>
            </table>
            ${filteredData.length > 100 ? `<div style="margin-top: 15px; font-size: 12px; color: #6b7280; text-align: center;">Showing first 100 records of ${filteredData.length} total results</div>` : ""}
            `
                : '<div class="no-data">No records found matching your filters</div>'
            }
          </div>
        </body>
        </html>
      `

      const printWindow = window.open("", "_blank", "width=900,height=650")
      if (!printWindow) {
        alert("Popup blocked. Please allow popups to download the PDF.")
        return
      }

      printWindow.document.open()
      printWindow.document.write(htmlContent)
      printWindow.document.close()
      printWindow.focus()

      setTimeout(() => {
        printWindow.print()
      }, 300)
    } catch (err) {
      console.error("Error generating PDF:", err)
      alert("Error generating PDF. Please try again.")
    }
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-blue-300 border-t-blue-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}></div>
            </div>
          </div>
          <div className="flex flex-col items-center space-y-2">
            <p className="text-lg font-semibold text-gray-700">Loading dashboard data...</p>
            <p className="text-sm text-gray-500">Please wait while we fetch your data</p>
          </div>
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2 text-red-500">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      </div>
    )
  }

  // Handle tab change - update URL params instead of navigating
  const handleTabChange = (value: string) => {
    const tabValue = value as "o2d" | "lead-to-order" | "batchcode"
    setActiveTab(tabValue)
    
    // Update URL params without navigation
    const newSearchParams = new URLSearchParams(searchParams)
    if (tabValue === "o2d") {
      newSearchParams.delete("tab")
    } else {
      newSearchParams.set("tab", tabValue)
    }
    setSearchParams(newSearchParams, { replace: true })
  }

  return (
    <div className="relative space-y-4 sm:space-y-6 p-2 sm:p-4 lg:p-6" ref={dashboardRef}>
      {loading && data && activeTab === "o2d" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
          <div className="flex items-center gap-2 text-gray-700">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Refreshing dashboard...</span>
          </div>
        </div>
      )}
      
      {/* Tabs for Dashboard Navigation - Segmented Control Style - Full Width */}
      <div className="mb-4 sm:mb-6">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="inline-flex h-10 sm:h-12 items-center justify-center rounded-lg bg-gray-100 p-1 text-gray-600 w-full shadow-sm border border-gray-200">
            <TabsTrigger 
              value="o2d" 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 sm:px-6 py-2 text-sm sm:text-base font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm flex-1"
            >
              O2D
            </TabsTrigger>
            <TabsTrigger 
              value="lead-to-order" 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 sm:px-6 py-2 text-sm sm:text-base font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm flex-1"
            >
              Lead to Order
            </TabsTrigger>
            <TabsTrigger 
              value="batchcode" 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 sm:px-6 py-2 text-sm sm:text-base font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm flex-1"
            >
              Batchcode
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      {/* O2D Dashboard Content */}
      {activeTab === "o2d" && (
        <div className="space-y-4 sm:space-y-6 animate-in fade-in-50 duration-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">Dashboard</h2>
              <p className="text-gray-600 text-sm sm:text-base">Filtered view of your O2D operations</p>
              {lastUpdated && <p className="text-xs text-gray-500">Last updated: {lastUpdated.toLocaleTimeString()}</p>}
            </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchDashboard} variant="outline" size="sm" className="flex items-center gap-1">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={downloadPDF} className="flex items-center gap-2 ignore-pdf">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Download PDF
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <Card className="border-l-4 border-l-indigo-500 bg-gradient-to-br from-indigo-50/30 to-white">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-transparent">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-indigo-700">
                <Filter className="h-4 w-4 text-indigo-600" />
                Filters
              </CardTitle>
              <CardDescription className="text-indigo-600/80">Filter data by party, item, salesperson, and date range</CardDescription>
            </div>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedParty("All Parties")
                  setSelectedItem("All Items")
                  setSelectedSales("All Salespersons")
                  setSelectedState("All States")
                  setFromDate(null)
                  setToDate(null)
                }}
                className="ignore-pdf bg-red-50 text-red-600 hover:bg-red-100 border-red-200"
              >
                <X className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-blue-700">Salesperson</label>
              <Select value={selectedSales} onValueChange={setSelectedSales}>
                <SelectTrigger className="border-blue-200 focus:border-blue-400 focus:ring-blue-400">
                  <SelectValue placeholder="Select salesperson" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Salespersons">All Salespersons</SelectItem>
                  {(data?.filters?.salesPersons || []).map((sales) => (
                    <SelectItem key={sales} value={sales}>
                      {sales}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-green-700">Party</label>
              <Select value={selectedParty} onValueChange={setSelectedParty}>
                <SelectTrigger className="border-green-200 focus:border-green-400 focus:ring-green-400">
                  <SelectValue placeholder="Select party" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Parties">All Parties</SelectItem>
                  {(data?.filters?.parties || []).map((party) => (
                    <SelectItem key={party} value={party}>
                      {party}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-purple-700">Item</label>
              <Select value={selectedItem} onValueChange={setSelectedItem}>
                <SelectTrigger className="border-purple-200 focus:border-purple-400 focus:ring-purple-400">
                  <SelectValue placeholder="Select item" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Items">All Items</SelectItem>
                  {(data?.filters?.items || []).map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-orange-700">State</label>
              <Select value={selectedState} onValueChange={setSelectedState}>
                <SelectTrigger className="border-orange-200 focus:border-orange-400 focus:ring-orange-400">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All States">All States</SelectItem>
                  {stateOptions.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-teal-700">From Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal border-teal-200 focus:border-teal-400 focus:ring-teal-400", !fromDate && "text-gray-500")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-teal-600" />
                    {fromDate ? format(fromDate, "dd/MM/yyyy") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={fromDate ?? undefined} onSelect={setFromDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-pink-700">To Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal border-pink-200 focus:border-pink-400 focus:ring-pink-400", !toDate && "text-gray-500")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-pink-600" />
                    {toDate ? format(toDate, "dd/MM/yyyy") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={toDate ?? undefined} onSelect={setToDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="mt-4 flex flex-wrap gap-2">
              {selectedParty !== "All Parties" && (
                <Badge variant="secondary" className="flex items-center gap-1 bg-green-100 text-green-700 border-green-200">
                  Party: {selectedParty}
                  <X className="h-3 w-3 cursor-pointer ignore-pdf" onClick={() => setSelectedParty("All Parties")} />
                </Badge>
              )}
              {selectedItem !== "All Items" && (
                <Badge variant="secondary" className="flex items-center gap-1 bg-purple-100 text-purple-700 border-purple-200">
                  Item: {selectedItem}
                  <X className="h-3 w-3 cursor-pointer ignore-pdf" onClick={() => setSelectedItem("All Items")} />
                </Badge>
              )}
              {selectedState !== "All States" && (
                <Badge variant="secondary" className="flex items-center gap-1 bg-orange-100 text-orange-700 border-orange-200">
                  State: {selectedState}
                  <X className="h-3 w-3 cursor-pointer ignore-pdf" onClick={() => setSelectedState("All States")} />
                </Badge>
              )}
              {selectedSales !== "All Salespersons" && (
                <Badge variant="secondary" className="flex items-center gap-1 bg-blue-100 text-blue-700 border-blue-200">
                  Sales: {selectedSales}
                  <X className="h-3 w-3 cursor-pointer ignore-pdf" onClick={() => setSelectedSales("All Salespersons")} />
                </Badge>
              )}
              {fromDate && (
                <Badge variant="secondary" className="flex items-center gap-1 bg-teal-100 text-teal-700 border-teal-200">
                  From: {format(fromDate, "dd/MM/yyyy")}
                  <X className="h-3 w-3 cursor-pointer ignore-pdf" onClick={() => setFromDate(null)} />
                </Badge>
              )}
              {toDate && (
                <Badge variant="secondary" className="flex items-center gap-1 bg-pink-100 text-pink-700 border-pink-200">
                  To: {format(toDate, "dd/MM/yyyy")}
                  <X className="h-3 w-3 cursor-pointer ignore-pdf" onClick={() => setToDate(null)} />
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-3 lg:gap-4">
        {summaryCards.map((card) => (
          <Card
            key={card.id}
            className="w-full overflow-hidden border border-transparent shadow-sm hover:shadow-md transition-shadow duration-200"
            style={{
              borderLeftColor: card.borderColor,
              borderLeftWidth: 4,
              borderLeftStyle: "solid",
              backgroundColor: card.backgroundColor,
            }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 sm:p-3 pb-2">
              <CardTitle className="text-xs sm:text-xs font-semibold" style={{ color: card.titleColor }}>
                {card.title}
              </CardTitle>
              <Badge
                variant="secondary"
                className="text-xs sm:text-[10px] shrink-0 font-semibold border"
                style={card.badgeStyle}
              >
                {card.badgeText}
              </Badge>
            </CardHeader>
            <CardContent className="p-4 sm:p-3 pt-0">
              <div className="text-2xl sm:text-xl lg:text-2xl font-bold" style={{ color: card.valueColor }}>
                {card.value}
              </div>
              <p className="text-xs mt-1" style={{ color: card.descriptionColor }}>
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="w-full overflow-hidden">
        <CardHeader className="p-3 sm:p-4 lg:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-sm sm:text-base lg:text-lg">Party Wise Dispatch Analytics</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Distribution by customer ({filteredData?.length || 0} total records)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
              <ChartContainer
                config={{
                  value: { label: "Dispatched", color: "#0088FE" },
                  dispatched: { label: "Dispatched", color: "#0088FE" },
                }}
                className="w-full"
              >
                <div className="w-full" style={{ minHeight: 300, minWidth: 0 }}>
                  <ResponsiveContainer width="100%" height={300} minHeight={300}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius="60%"
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const datum = payload[0].payload
                        return (
                          <div className="bg-white border rounded-lg p-2 shadow-md">
                            <p className="font-medium">{datum.name}</p>
                            <p className="text-sm text-gray-600">{datum.value} dispatches</p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top 10 Customers</CardTitle>
          <CardDescription>
            Top performing customers by dispatch volume
            {hasActiveFilters ? " (filtered results)" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto max-h-[420px]">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-white">
                <TableRow>
                  <TableHead className="text-xs sm:text-sm">Rank</TableHead>
                  <TableHead className="text-xs sm:text-sm">Customer Name</TableHead>
                  <TableHead className="text-xs sm:text-sm">Item Name</TableHead>
                  <TableHead className="text-xs sm:text-sm">Dispatches</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {top10Customers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                      No customer data available
                    </TableCell>
                  </TableRow>
                ) : (
                  top10Customers.map((customer) => (
                    <TableRow key={customer.rank}>
                      <TableCell className="text-xs sm:text-sm">{customer.rank}</TableCell>
                      <TableCell className="text-xs sm:text-sm">{customer.name}</TableCell>
                      <TableCell className="text-xs sm:text-sm">{customer.itemNames}</TableCell>
                      <TableCell className="text-xs sm:text-sm">{customer.dispatches}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Filtered Results</CardTitle>
          <CardDescription>
            Showing {filteredData?.length || 0} records
            {hasActiveFilters ? " matching your filters" : " (all data)"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto max-h-[480px]">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-white">
                <TableRow>
                  <TableHead className="text-xs sm:text-sm">Sr. No.</TableHead>
                  <TableHead className="text-xs sm:text-sm">Party Name</TableHead>
                  <TableHead className="text-xs sm:text-sm">Item Name</TableHead>
                  <TableHead className="text-xs sm:text-sm">In Date</TableHead>
                  <TableHead className="text-xs sm:text-sm">Out Date</TableHead>
                  <TableHead className="text-xs sm:text-sm">Gate Out Time</TableHead>
                  <TableHead className="text-xs sm:text-sm">Order No.</TableHead>
                  <TableHead className="text-xs sm:text-sm">Gate Pass</TableHead>
                  <TableHead className="text-xs sm:text-sm">Invoice No.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!filteredData || filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      No records found matching your filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((row, index) => (
                    <TableRow key={`${row.wslipno || row.orderVrno || index}-${index}`}>
                      <TableCell className="text-xs sm:text-sm">{index + 1}</TableCell>
                      <TableCell className="text-xs sm:text-sm">{row.partyName || "-"}</TableCell>
                      <TableCell className="text-xs sm:text-sm">{row.itemName || "-"}</TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        {row.indate ? new Date(row.indate).toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        {row.outdate ? new Date(row.outdate).toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        {row.gateOutTime ? new Date(row.gateOutTime).toLocaleString() : "-"}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">{row.orderVrno || "-"}</TableCell>
                      <TableCell className="text-xs sm:text-sm">{row.gateVrno || "-"}</TableCell>
                      <TableCell className="text-xs sm:text-sm">{row.invoiceNo || "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {filteredData && filteredData.length > 100 && (
            <div className="mt-4 text-sm text-gray-500 text-center">
              Showing first 100 records of {filteredData.length} total results
            </div>
          )}
        </CardContent>
      </Card>
        </div>
      )}

      {/* Lead to Order Dashboard Content */}
      {activeTab === "lead-to-order" && (
        <div className="animate-in fade-in-50 duration-200">
          <LeadToOrderDashboard />
        </div>
      )}

      {/* Batchcode Dashboard Content */}
      {activeTab === "batchcode" && (
        <div className="animate-in fade-in-50 duration-200">
          <BatchCodeDashboard />
        </div>
      )}
    </div>
  )
}
