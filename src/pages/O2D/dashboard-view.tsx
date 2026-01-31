"use client"

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { AlertCircle, Filter, Loader2, RefreshCw, X, Trophy, Database } from "lucide-react"
import { format } from "date-fns"
import { useAuth } from "../../context/AuthContext"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { ChartContainer, ChartTooltip } from "./ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Cell, Pie, PieChart, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { cn } from "../../lib/utils"
import { o2dAPI } from "../../services/o2dAPI";
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
  monthlyWorkingParty?: number
  monthlyPartyAverage?: string
  pendingOrdersTotal?: number
  conversionRatio?: string
  saudaAvg?: Array<{ ITEM: string; AVERAGE: number }>
  salesAvg?: Array<{ ITEM: string; AVERAGE: number }>
  saudaRate2026?: number
  monthlyGd?: number
  dailyGd?: number
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



export function DashboardView() {
  const { user, loading: authLoading } = useAuth()
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const [selectedParty, setSelectedParty] = useState("All Parties")
  const [selectedItem, setSelectedItem] = useState("All Items")
  const [selectedSales, setSelectedSales] = useState("All Salespersons")
  const [selectedState, setSelectedState] = useState("All States")
  const [selectedMonth, setSelectedMonth] = useState<string>("All Months")

  const dashboardRef = useRef<HTMLDivElement | null>(null)

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Build query params for proper Redis caching
      const params: any = {}
      if (selectedParty !== "All Parties") params.partyName = selectedParty
      if (selectedItem !== "All Items") params.itemName = selectedItem
      if (selectedSales !== "All Salespersons") params.salesPerson = selectedSales
      if (selectedState !== "All States") params.stateName = selectedState
      if (selectedMonth !== "All Months") {
        const [year, month] = selectedMonth.split("-")
        const fromDate = new Date(parseInt(year), parseInt(month) - 1, 1)
        const toDate = new Date(parseInt(year), parseInt(month), 0)
        params.fromDate = format(fromDate, "yyyy-MM-dd")
        params.toDate = format(toDate, "yyyy-MM-dd")
      }

      const response = await o2dAPI.getDashboardSummary(params)
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
  }, [selectedParty, selectedItem, selectedSales, selectedState, selectedMonth])

  useEffect(() => {
    if (authLoading) {
      return
    }

    fetchDashboard()
    const interval = setInterval(fetchDashboard, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [authLoading, fetchDashboard])

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

      return true
    })
  }, [data?.rows, selectedItem, selectedParty, selectedSales, selectedState])

  const hasActiveFilters =
    selectedParty !== "All Parties" ||
    selectedItem !== "All Items" ||
    selectedSales !== "All Salespersons" ||
    selectedState !== "All States" ||
    selectedMonth !== "All Months"

  const calculateFilteredMetrics = () => {
    const rows = filteredData || []
    const summary: DashboardSummary = data?.summary || {}

    const saudaAvgList = summary.saudaAvg || [];
    const salesAvgList = summary.salesAvg || [];

    let targetItem = 'PIPE';
    if (selectedItem !== 'All Items') {
      if (selectedItem.toUpperCase().includes('STRIP')) targetItem = 'STRIPS';
      else if (selectedItem.toUpperCase().includes('BILLET')) targetItem = 'BILLET';
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const saudaAvg = saudaAvgList.find((x: any) => x.ITEM === targetItem)?.AVERAGE || 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const salesAvg = salesAvgList.find((x: any) => x.ITEM === targetItem)?.AVERAGE || 0;

    return {
      monthlyWorkingParty: summary.monthlyWorkingParty ?? 0,
      monthlyPartyAverage: summary.monthlyPartyAverage ?? "0%",
      pendingOrdersTotal: summary.pendingOrdersTotal ?? 0,
      conversionRatio: summary.conversionRatio ?? "0%",
      saudaAvg,
      salesAvg,
      saudaRate2026: summary.saudaRate2026 ?? 0,
      monthlyGd: summary.monthlyGd ?? 0,
      dailyGd: summary.dailyGd ?? 0,
      activeItemName: targetItem === 'STRIPS' ? 'Strips' : targetItem === 'BILLET' ? 'Billet' : 'Pipe',
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
      id: "saudaRate2026",
      title: "Sauda Rate (2026)",
      // Purple to Indigo gradient
      className: "bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-600 text-white border-none",
      titleClassName: "text-purple-50",
      valueClassName: "text-white",
      descriptionClassName: "text-purple-100",
      badgeClassName: "bg-white/20 text-white border-white/20 backdrop-blur-sm",
      value: `₹${formatMetricValue(displayMetrics.saudaRate2026)}`,
      description: "Daily Avg Trend",
      badgeText: "Trend",
    },
    {
      id: "monthlyGd",
      title: "Monthly GD",
      // Bright Green gradient
      className: "bg-gradient-to-br from-green-400 via-green-500 to-green-600 text-white border-none",
      titleClassName: "text-green-50",
      valueClassName: "text-white",
      descriptionClassName: "text-green-100",
      badgeClassName: "bg-white/20 text-white border-white/20 backdrop-blur-sm",
      value: `₹${formatMetricValue(displayMetrics.monthlyGd)}`,
      description: "Gross Dispatch (Month)",
      badgeText: "GD",
    },
    {
      id: "dailyGd",
      title: "Daily GD",
      // Orange to Amber gradient
      className: "bg-gradient-to-br from-orange-400 via-orange-500 to-amber-500 text-white border-none",
      titleClassName: "text-orange-50",
      valueClassName: "text-white",
      descriptionClassName: "text-orange-100",
      badgeClassName: "bg-white/20 text-white border-white/20 backdrop-blur-sm",
      value: `₹${formatMetricValue(displayMetrics.dailyGd)}`,
      description: "Gross Dispatch (Today)",
      badgeText: "GD",
    },
    {
      id: "monthlyWorkingParty",
      title: "Monthly Working Party",
      // Cyan to Teal gradient
      className: "bg-gradient-to-br from-cyan-400 via-cyan-500 to-teal-500 text-white border-none",
      titleClassName: "text-cyan-50",
      valueClassName: "text-white",
      descriptionClassName: "text-cyan-100",
      badgeClassName: "bg-white/20 text-white border-white/20 backdrop-blur-sm",
      value: formatMetricValue(displayMetrics.monthlyWorkingParty),
      description: "Active parties (Month)",
      badgeText: "Current Month",
    },
    {
      id: "monthlyPartyAverage",
      title: "Monthly Party Average",
      // Emerald gradient
      className: "bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 text-white border-none",
      titleClassName: "text-emerald-50",
      valueClassName: "text-white",
      descriptionClassName: "text-emerald-100",
      badgeClassName: "bg-white/20 text-white border-white/20 backdrop-blur-sm",
      value: displayMetrics.monthlyPartyAverage,
      description: "% of 900 Users",
      badgeText: "Utilization",
    },


    {
      id: "pendingOrdersTotal",
      title: "Parties Pending Order",
      // Sea Green gradient
      className: "bg-gradient-to-br from-teal-500 via-emerald-600 to-green-700 text-white border-none",
      titleClassName: "text-teal-50",
      valueClassName: "text-white",
      descriptionClassName: "text-teal-100",
      badgeClassName: "bg-white/20 text-white border-white/20 backdrop-blur-sm",
      value: formatMetricValue(displayMetrics.pendingOrdersTotal),
      description: "Parties with pending orders",
      badgeText: "Pending",
    },
    {
      id: "conversionRatio",
      title: "Conversion Ratio",
      // Pink to Rose gradient
      className: "bg-gradient-to-br from-pink-400 via-pink-500 to-rose-600 text-white border-none",
      titleClassName: "text-pink-50",
      valueClassName: "text-white",
      descriptionClassName: "text-pink-100",
      badgeClassName: "bg-white/20 text-white border-white/20 backdrop-blur-sm",
      value: displayMetrics.conversionRatio,
      description: "Pending % (of 900)",
      badgeText: "Ratio",
    },


  ]

  // Get all three item averages for the composite card
  const getItemAverages = () => {
    const summary: DashboardSummary = data?.summary || {}
    const saudaAvgList = summary.saudaAvg || []
    const salesAvgList = summary.salesAvg || []

    const items = ['PIPE', 'STRIPS', 'BILLET']
    return items.map(item => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const saudaAvg = saudaAvgList.find((x: any) => x.ITEM === item)?.AVERAGE || 0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const salesAvg = salesAvgList.find((x: any) => x.ITEM === item)?.AVERAGE || 0
      return {
        item: item === 'STRIPS' ? 'Strip' : item === 'BILLET' ? 'Billet' : 'Pipe',
        saudaAvg,
        salesAvg,
      }
    })
  }

  const itemAverages = getItemAverages()

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

  const COLORS = [
    "#2563eb", // Blue
    "#7c3aed", // Violet
    "#db2777", // Pink
    "#ea580c", // Orange
    "#059669", // Emerald
    "#0891b2", // Cyan
    "#4f46e5", // Indigo
    "#eab308", // Yellow
    "#dc2626", // Red
    "#16a34a", // Green
    "#94a3b8"  // Slate (for Others)
  ]

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

  const stateDistributionData = useMemo(() => {
    if (!filteredData) return [];
    const stateMap: Record<string, number> = {};
    filteredData.forEach(row => {
      // Handle multiple potential state field names from backend
      const stateName = (row.stateName || (row as any).state || (row as any).STATE || "").toString().trim();
      if (stateName) {
        stateMap[stateName] = (stateMap[stateName] || 0) + 1;
      }
    });
    return Object.entries(stateMap)
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredData]);

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
              <div class="kpi-card"><div class="kpi-label">Monthly Working Party</div><div class="kpi-value">${metrics.monthlyWorkingParty}</div></div>
              <div class="kpi-card"><div class="kpi-label">Monthly Party Average</div><div class="kpi-value">${metrics.monthlyPartyAverage}</div></div>
              <div class="kpi-card"><div class="kpi-label">Parties Pending Order</div><div class="kpi-value">${metrics.pendingOrdersTotal}</div></div>
              <div class="kpi-card"><div class="kpi-label">Conversion Ratio</div><div class="kpi-value alert">${metrics.conversionRatio}</div></div>
              <div class="kpi-card"><div class="kpi-label">Sauda Avg (${metrics.activeItemName})</div><div class="kpi-value">₹${metrics.saudaAvg}</div></div>
              <div class="kpi-card"><div class="kpi-label">Sales Avg (${metrics.activeItemName})</div><div class="kpi-value">₹${metrics.salesAvg}</div></div>
              <div class="kpi-card"><div class="kpi-label">Sauda Rate (2026)</div><div class="kpi-value">₹${metrics.saudaRate2026}</div></div>
              <div class="kpi-card"><div class="kpi-label">Monthly GD</div><div class="kpi-value">₹${metrics.monthlyGd}</div></div>
              <div class="kpi-card"><div class="kpi-label">Daily GD</div><div class="kpi-value">₹${metrics.dailyGd}</div></div>
            </div>
          </div>

          ${hasActiveFilters
          ? `
          <div class="section">
            <div class="section-title">Applied Filters</div>
            <div class="filters-section">
              ${selectedParty !== "All Parties" ? `<span class="filter-item">Party: ${selectedParty}</span>` : ""}
              ${selectedItem !== "All Items" ? `<span class="filter-item">Item: ${selectedItem}</span>` : ""}
              ${selectedState !== "All States" ? `<span class="filter-item">State: ${selectedState}</span>` : ""}
              ${selectedSales !== "All Salespersons" ? `<span class="filter-item">Sales: ${selectedSales}</span>` : ""}
              ${selectedMonth !== "All Months" ? `<span class="filter-item">Month: ${new Date(selectedMonth + "-01").toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>` : ""}
            </div>
          </div>
          `
          : ""
        }

          <div class="section">
            <div class="section-title">Top 10 Customers</div>
            ${top10Data.length > 0
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
            ${filteredData && filteredData.length > 0
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



  return (
    <div className="relative space-y-4 sm:space-y-6 p-2 sm:p-4 lg:p-6" ref={dashboardRef}>
      {loading && data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="flex flex-col items-center justify-center space-y-4 bg-white rounded-lg shadow-2xl p-8">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-gray-100 border-t-blue-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}></div>
              </div>
            </div>
            <div className="flex flex-col items-center space-y-2">
              <p className="text-lg font-semibold text-gray-700">Loading...</p>
              <p className="text-sm text-gray-500">Please wait</p>
            </div>
          </div>
        </div>
      )}

      {/* O2D Dashboard Content */}
      <div className="space-y-4 sm:space-y-6 animate-in fade-in-50 duration-200">
        <div className="flex items-center justify-between">
          <div>
            {lastUpdated && <p className="text-xs text-gray-500">Last updated: {lastUpdated.toLocaleTimeString()}</p>}
          </div>
        </div>

        {error && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Month Filter Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Select Month:</span>
          </div>
          <div className="flex-1 sm:w-[250px]">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="border-indigo-200 focus:border-indigo-400 focus:ring-indigo-400">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Months">All Months</SelectItem>
                {(() => {
                  const months = []
                  const startDate = new Date(2025, 3, 1) // April 2025
                  const currentDate = new Date()

                  for (let d = new Date(startDate); d <= currentDate; d.setMonth(d.getMonth() + 1)) {
                    const year = d.getFullYear()
                    const month = d.getMonth() + 1
                    const monthStr = month.toString().padStart(2, '0')
                    const value = `${year}-${monthStr}`
                    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                    months.push(<SelectItem key={value} value={value}>{label}</SelectItem>)
                  }

                  return months.reverse() // Show most recent first
                })()}
              </SelectContent>
            </Select>
          </div>
          {selectedMonth !== "All Months" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedMonth("All Months")}
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              Clear Month
            </Button>
          )}
        </div>

        {/* All Sauda Average & Sales Average - Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* All Sauda Average Card */}
          <Card className="border-l-4 border-l-purple-600 bg-gradient-to-br from-purple-100 via-violet-50 to-white shadow-lg">
            <CardHeader className="bg-gradient-to-r from-purple-100 via-violet-100 to-transparent">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-purple-800 font-bold">All Sauda Average</CardTitle>
                  <CardDescription className="text-purple-700/80">
                    Average rates for Pipe, Billet, and Strip
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="bg-purple-200 text-purple-800 border-purple-300 font-semibold">
                  All Items
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {itemAverages.map((itemData, index) => {
                  const gradients = [
                    'from-indigo-500 via-indigo-600 to-blue-600',
                    'from-red-500 via-orange-500 to-orange-600',
                    'from-teal-500 via-cyan-500 to-cyan-600'
                  ]
                  return (
                    <Card
                      key={`sauda-${itemData.item}`}
                      className={cn(
                        "border-2 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1",
                        `bg-gradient-to-br ${gradients[index]} text-white border-none`
                      )}
                    >
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-semibold text-white/90 flex items-center justify-between">
                          <span>{itemData.item}</span>
                          <Badge variant="secondary" className="bg-white/20 text-white border-white/20 backdrop-blur-sm text-xs">
                            Item
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-2">
                        <div className="space-y-1">
                          <p className="text-xs text-white/80 font-medium">Sauda Average</p>
                          <p className="text-3xl font-bold text-white">
                            ₹{formatMetricValue(itemData.saudaAvg)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Current Month Sales Average Card */}
          <Card className="border-l-4 border-l-orange-600 bg-gradient-to-br from-orange-100 via-amber-50 to-white shadow-lg">
            <CardHeader className="bg-gradient-to-r from-orange-100 via-amber-100 to-transparent">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-orange-800 font-bold">Current Month Sales Average</CardTitle>
                  <CardDescription className="text-orange-700/80">
                    Sales average rates for Pipe, Billet, and Strip
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="bg-orange-200 text-orange-800 border-orange-300 font-semibold">
                  All Items
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {itemAverages.map((itemData, index) => {
                  const colors = [
                    '#099438ff', // Pipe - Light Green
                    '#142b49ff', // Strip - Light Purple
                    '#E3227C'  // Billet - Light Pink
                  ]
                  return (
                    <Card
                      key={`sales-${itemData.item}`}
                      className="border-2 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 text-white border-none"
                      style={{ background: colors[index] }}
                    >
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-semibold text-white/90 flex items-center justify-between">
                          <span>{itemData.item}</span>
                          <Badge variant="secondary" className="bg-white/20 text-white border-white/20 backdrop-blur-sm text-xs">
                            Item
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-2">
                        <div className="space-y-1">
                          <p className="text-xs text-white/80 font-medium">Sales Average</p>
                          <p className="text-3xl font-bold text-white">
                            ₹{formatMetricValue(itemData.salesAvg)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
        {/* Summary Cards - New Layout */}
        <div className="space-y-4">
          {/* Row 1: Sauda Rate + GD Metrics - 2 Composite Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sauda Rate Composite Card */}
            <Card className="border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-50/50 to-white shadow-lg">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-transparent pb-4">
                <CardTitle className="text-purple-800 font-bold">Sauda Rate (2026)</CardTitle>
                <CardDescription className="text-purple-700/80">
                  Daily average trend
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                {/* Single Sauda Rate Card */}
                <Card className="bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-600 text-white border-none shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
                    <CardTitle className="text-sm font-bold text-purple-50">
                      Sauda Rate (2026)
                    </CardTitle>
                    <Badge variant="secondary" className="bg-white/20 text-white border-white/20 backdrop-blur-sm text-xs">
                      Trend
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                      ₹{formatMetricValue(displayMetrics.saudaRate2026)}
                    </div>
                    <p className="text-xs mt-1 font-medium text-purple-100">
                      Daily Avg Trend
                    </p>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>

            {/* GD Metrics Composite Card */}
            <Card className="border-l-4 border-l-green-500 bg-gradient-to-br from-green-50/50 to-white shadow-lg">
              <CardHeader className="bg-gradient-to-r from-green-50 to-transparent pb-4">
                <CardTitle className="text-green-800 font-bold">GD Metrics</CardTitle>
                <CardDescription className="text-green-700/80">
                  Gross dispatch statistics
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                {/* Inner cards in horizontal grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Monthly GD */}
                  <Card className="bg-gradient-to-br from-green-400 via-green-500 to-green-600 text-white border-none shadow-lg hover:shadow-xl transition-all duration-300">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
                      <CardTitle className="text-sm font-bold text-green-50">
                        Monthly GD
                      </CardTitle>
                      <Badge variant="secondary" className="bg-white/20 text-white border-white/20 backdrop-blur-sm text-xs">
                        GD
                      </Badge>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                        ₹{formatMetricValue(displayMetrics.monthlyGd)}
                      </div>
                      <p className="text-xs mt-1 font-medium text-green-100">
                        Gross Dispatch (Month)
                      </p>
                    </CardContent>
                  </Card>

                  {/* Daily GD */}
                  <Card className="bg-gradient-to-br from-orange-400 via-orange-500 to-amber-500 text-white border-none shadow-lg hover:shadow-xl transition-all duration-300">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
                      <CardTitle className="text-sm font-bold text-orange-50">
                        Daily GD
                      </CardTitle>
                      <Badge variant="secondary" className="bg-white/20 text-white border-white/20 backdrop-blur-sm text-xs">
                        GD
                      </Badge>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                        ₹{formatMetricValue(displayMetrics.dailyGd)}
                      </div>
                      <p className="text-xs mt-1 font-medium text-orange-100">
                        Gross Dispatch (Today)
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 2: Working Party & Pending Order - 2 Composite Cards with Horizontal Inner Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Working Party Composite Card */}
            <Card className="border-l-4 border-l-cyan-500 bg-gradient-to-br from-cyan-50/50 to-white shadow-lg">
              <CardHeader className="bg-gradient-to-r from-cyan-50 to-transparent pb-4">
                <CardTitle className="text-cyan-800 font-bold">Working Party Metrics</CardTitle>
                <CardDescription className="text-cyan-700/80">
                  Current month party statistics
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                {/* Inner cards in horizontal grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Monthly Working Party */}
                  <Card className="bg-gradient-to-br from-cyan-400 via-cyan-500 to-teal-500 text-white border-none shadow-lg hover:shadow-xl transition-all duration-300">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
                      <CardTitle className="text-sm font-bold text-cyan-50">
                        Monthly Working Party
                      </CardTitle>
                      <Badge variant="secondary" className="bg-white/20 text-white border-white/20 backdrop-blur-sm text-xs">
                        Current Month
                      </Badge>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                        {formatMetricValue(displayMetrics.monthlyWorkingParty)}
                      </div>
                      <p className="text-xs mt-1 font-medium text-cyan-100">
                        Active parties (Month)
                      </p>
                    </CardContent>
                  </Card>

                  {/* Monthly Party Average */}
                  <Card className="bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 text-white border-none shadow-lg hover:shadow-xl transition-all duration-300">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
                      <CardTitle className="text-sm font-bold text-emerald-50">
                        Monthly Party Average
                      </CardTitle>
                      <Badge variant="secondary" className="bg-white/20 text-white border-white/20 backdrop-blur-sm text-xs">
                        Utilization
                      </Badge>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                        {displayMetrics.monthlyPartyAverage}
                      </div>
                      <p className="text-xs mt-1 font-medium text-emerald-100">
                        % of 900 Users
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            {/* Pending Orders Composite Card */}
            <Card className="border-l-4 border-l-teal-500 bg-gradient-to-br from-teal-50/50 to-white shadow-lg">
              <CardHeader className="bg-gradient-to-r from-teal-50 to-transparent pb-4">
                <CardTitle className="text-teal-800 font-bold">Pending Order Metrics</CardTitle>
                <CardDescription className="text-teal-700/80">
                  Order conversion statistics
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                {/* Inner cards in horizontal grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Parties Pending Order */}
                  <Card className="bg-gradient-to-br from-teal-500 via-emerald-600 to-green-700 text-white border-none shadow-lg hover:shadow-xl transition-all duration-300">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
                      <CardTitle className="text-sm font-bold text-teal-50">
                        Parties Pending Order
                      </CardTitle>
                      <Badge variant="secondary" className="bg-white/20 text-white border-white/20 backdrop-blur-sm text-xs">
                        Pending
                      </Badge>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                        {formatMetricValue(displayMetrics.pendingOrdersTotal)}
                      </div>
                      <p className="text-xs mt-1 font-medium text-teal-100">
                        Parties with pending orders
                      </p>
                    </CardContent>
                  </Card>

                  {/* Conversion Ratio */}
                  <Card className="bg-gradient-to-br from-pink-400 via-pink-500 to-rose-600 text-white border-none shadow-lg hover:shadow-xl transition-all duration-300">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
                      <CardTitle className="text-sm font-bold text-pink-50">
                        Conversion Ratio
                      </CardTitle>
                      <Badge variant="secondary" className="bg-white/20 text-white border-white/20 backdrop-blur-sm text-xs">
                        Ratio
                      </Badge>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                        {displayMetrics.conversionRatio}
                      </div>
                      <p className="text-xs mt-1 font-medium text-pink-100">
                        Pending % (of 900)
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>



        <Card className="border-l-4 border-l-indigo-500 bg-gradient-to-br from-indigo-50/30 to-white">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-transparent">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-indigo-700">
                  <Filter className="h-4 w-4 text-indigo-600" />
                  Filters
                </CardTitle>
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
                    setSelectedMonth("All Months")
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
                {selectedMonth !== "All Months" && (
                  <Badge variant="secondary" className="flex items-center gap-1 bg-indigo-100 text-indigo-700 border-indigo-200">
                    Month: {new Date(selectedMonth + "-01").toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    <X className="h-3 w-3 cursor-pointer ignore-pdf" onClick={() => setSelectedMonth("All Months")} />
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>



        <Card className="w-full overflow-hidden border-none bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative group">
          {/* Decorative accent line */}
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 opacity-80 group-hover:opacity-100 transition-opacity"></div>

          <CardHeader className="p-4 sm:p-8 bg-white/5 backdrop-blur-sm border-b border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div className="space-y-1">
                <CardTitle className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <span className="w-3 h-8 bg-blue-500 rounded-full inline-block"></span>
                  Dispatch Distribution Analysis
                </CardTitle>
                <CardDescription className="text-sm font-medium text-blue-200/60 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse text-xs"></div>
                  Top Performing Customers by Volume • {filteredData?.length || 0} Total Records
                </CardDescription>
              </div>
              <Badge variant="outline" className="w-fit bg-blue-500/10 text-blue-300 border-blue-400/30 px-4 py-1.5 text-xs font-black uppercase tracking-[0.2em] rounded-full shadow-inner backdrop-blur-md">
                Live Data Stream
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-10 relative overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl -ml-32 -mb-32"></div>

            <div className="min-h-[450px] lg:h-[480px] w-full flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-12 relative z-10">
              {/* Chart Side */}
              <div className="w-full aspect-square max-w-[380px] lg:flex-1 lg:max-w-none lg:h-full relative flex items-center justify-center">
                <div className="absolute inset-0 bg-blue-500/5 rounded-full blur-2xl animate-pulse"></div>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius="60%"
                      outerRadius="90%"
                      paddingAngle={5}
                      dataKey="value"
                      stroke="rgba(255,255,255,0.05)"
                      strokeWidth={2}
                      animationBegin={100}
                      animationDuration={1800}
                      animationEasing="ease-out"
                    >
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.name === "Others" ? "#475569" : COLORS[index % COLORS.length]}
                          className="hover:saturate-150 transition-all cursor-pointer outline-none filter drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const datum = payload[0].payload;
                          const total = chartData.reduce((acc, curr) => acc + curr.value, 0);
                          const percentage = ((datum.value / total) * 100).toFixed(1);
                          return (
                            <div className="hidden lg:block bg-[#1e293b]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl ring-1 ring-white/10 min-w-[220px] animate-in zoom-in-95 duration-200">
                              <p className="font-black text-white border-b border-white/10 pb-3 mb-3 flex items-center gap-3">
                                <span className="w-3 h-3 rounded-full shadow-[0_0_10px_currentColor]" style={{ backgroundColor: datum.fill, color: datum.fill }}></span>
                                {datum.name}
                              </p>
                              <div className="space-y-2.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-slate-400">Total Dispatches</span>
                                  <span className="font-black text-white text-lg font-mono">{datum.value.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-slate-400">Market Share</span>
                                  <span className="font-black text-blue-400 text-lg font-mono">{percentage}%</span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Central Labels */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none -mt-2">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-[0.4em] mb-1">Portfolio</span>
                  <span className="text-4xl font-black text-white leading-none tracking-tight">
                    {chartData.reduce((acc, curr) => acc + curr.value, 0).toLocaleString()}
                  </span>
                  <span className="text-[10px] font-bold text-blue-400/60 uppercase tracking-widest mt-2">Dispatches</span>
                </div>
              </div>

              {/* Legend Side */}
              <div className="w-full lg:w-[350px] max-h-full overflow-y-auto no-scrollbar bg-white/5 backdrop-blur-md rounded-3xl p-4 sm:p-8 border border-white/10 flex flex-col gap-4 sm:gap-6 shadow-inner">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Ranking</h4>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Volume</h4>
                </div>
                <div className="space-y-4">
                  {chartData.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between group cursor-help transition-all duration-300 hover:translate-x-1">
                      <div className="flex items-center gap-4">
                        <div
                          className="w-3 h-3 rounded-full shadow-[0_0_15px_rgba(0,0,0,0.5)] group-hover:scale-125 transition-transform"
                          style={{ backgroundColor: item.name === "Others" ? "#475569" : COLORS[index % COLORS.length] }}
                        />
                        <span className="text-xs font-black text-slate-200 truncate max-w-[170px] group-hover:text-white transition-colors">
                          {item.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black text-slate-500 font-mono tracking-tighter w-8 text-right">
                          {((item.value / chartData.reduce((acc, curr) => acc + curr.value, 0)) * 100).toFixed(0)}%
                        </span>
                        <div className="bg-white/10 px-3 py-1 rounded-full border border-white/5 group-hover:bg-white/20 group-hover:border-white/30 transition-all">
                          <span className="text-[11px] font-black text-white font-mono leading-none">
                            {item.value}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>


        {/* Sale Performance State Wise Section */}
        <div className="w-full mb-10">
          <div className="flex items-center justify-between mb-8 px-1">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div className="space-y-0.5">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Sale Performance State Wise</h2>
                <div className="flex items-center gap-2">
                  <span className="flex w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Real-time Volume Analysis</p>
                </div>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
              <Badge variant="ghost" className="text-slate-600 font-bold text-[10px]">ALL STATES</Badge>
              <Badge className="bg-white text-indigo-600 border border-slate-200 shadow-sm font-black text-[10px]">
                {stateDistributionData.length} ACTIVE
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {stateDistributionData.map((item, index) => {
              const totalVolume = stateDistributionData.reduce((acc, curr) => acc + curr.count, 0);
              const percentage = totalVolume > 0 ? ((item.count / totalVolume) * 100).toFixed(1) : "0";

              const gradients = [
                "from-indigo-600 via-indigo-700 to-indigo-800 shadow-indigo-200/50", // Indigo
                "from-sky-500 via-sky-600 to-sky-700 shadow-sky-200/50", // Sky
                "from-emerald-600 via-emerald-700 to-emerald-800 shadow-emerald-200/50", // Emerald
                "from-amber-500 via-amber-600 to-amber-700 shadow-amber-200/50", // Amber
                "from-rose-500 via-rose-600 to-rose-700 shadow-rose-200/50", // Red/Rose
                "from-violet-600 via-violet-700 to-violet-800 shadow-violet-200/50", // Violet
                "from-cyan-600 via-cyan-700 to-cyan-800 shadow-cyan-200/50", // Cyan
                "from-fuchsia-600 via-fuchsia-700 to-fuchsia-800 shadow-fuchsia-200/50", // Pink/Fuchsia
                "from-teal-600 via-teal-700 to-teal-800 shadow-teal-200/50", // Teal
                "from-orange-500 via-orange-600 to-orange-700 shadow-orange-200/50", // Orange
              ];
              const gradient = gradients[index % gradients.length];

              return (
                <Card
                  key={item.state}
                  className={cn(
                    "group relative border-none transition-all duration-500 shadow-lg hover:shadow-2xl hover:-translate-y-2 overflow-hidden flex flex-col justify-between min-h-[170px] bg-gradient-to-br",
                    gradient
                  )}
                >
                  {/* Decorative Elements */}
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                    <Trophy className="w-16 h-16 text-white rotate-12" />
                  </div>

                  <CardHeader className="p-5 pb-0 relative z-10">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center justify-center min-w-7 h-7 px-2 rounded-lg bg-white/20 backdrop-blur-md border border-white/20 group-hover:bg-white/30 transition-all duration-300">
                        <span className="text-[10px] font-black text-white uppercase tracking-tighter">Rank #{index + 1}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md border border-white/20 flex items-center gap-1.5">
                          <span className="text-[11px] font-black text-white font-mono">{item.count.toLocaleString()}</span>
                          <span className="text-[8px] font-bold text-white/60 uppercase tracking-widest">Units</span>
                        </div>
                        <div className="w-14 h-1.5 bg-black/20 rounded-full mt-2 overflow-hidden border border-white/5">
                          <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${percentage}%` }}></div>
                        </div>
                      </div>
                    </div>
                    <CardTitle className="text-lg font-black text-white uppercase tracking-tighter mt-5 group-hover:tracking-normal transition-all truncate drop-shadow-sm">
                      {item.state}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="p-5 pt-3 flex items-end justify-between relative z-10">
                    <div className="space-y-0.5">
                      <span className="text-4xl font-black text-white tracking-widest leading-none block drop-shadow-md">
                        {percentage}%
                      </span>
                      <p className="text-[10px] font-black text-white/60 uppercase tracking-widest">Market Share</p>
                    </div>

                    {/* Visual Signal Element */}
                    <div className="flex items-end gap-1 h-10 px-2 py-1 rounded-lg bg-black/10 backdrop-blur-sm border border-white/5">
                      {[0.4, 0.7, 0.5, 0.9, 0.6].map((h, i) => (
                        <div
                          key={i}
                          className="w-1.5 bg-white rounded-full transition-all duration-700 group-hover:opacity-100"
                          style={{
                            height: `${h * 100}%`,
                            opacity: 0.2 + (i * 0.15)
                          }}
                        />
                      ))}
                    </div>
                  </CardContent>

                  {/* Premium Glass Effect Reflection */}
                  <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/10 via-white/5 to-transparent pointer-events-none opacity-50"></div>

                  {/* Subtle Grainy Overlay */}
                  <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }}></div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* <Card className="w-full overflow-hidden border-none bg-gradient-to-br from-[rgb(6,78,59)] via-[rgb(6,95,70)] to-[rgb(6,78,59)] shadow-2xl relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[rgb(52,211,153)] to-[rgb(45,212,191)] opacity-60"></div>
          <CardHeader className="p-6 bg-white/5 backdrop-blur-md border-b border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-emerald-400/20 rounded-xl border border-emerald-400/30">
                  <Database className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <CardTitle className="text-xl font-black text-white tracking-tight">Dispatch Audit Log</CardTitle>
                  <CardDescription className="text-xs font-bold text-white/60 uppercase tracking-widest mt-1">
                    Showing {filteredData?.length || 0} Records {hasActiveFilters ? "• Criteria Filtered" : "• Master View"}
                  </CardDescription>
                </div>
              </div>
              <Button variant="outline" className="bg-white/5 border-white/10 text-white text-[10px] font-black hover:bg-emerald-400/20 h-8 px-4 rounded-full transition-all border-emerald-500/20">
                Export Detailed Audit
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-[550px] custom-scrollbar">
              <Table>
                <TableHeader className="sticky top-0 z-20 bg-[rgb(6,95,70)] backdrop-blur-xl border-b border-white/10">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="text-[11px] font-black text-white uppercase py-4">No.</TableHead>
                    <TableHead className="text-[11px] font-black text-white uppercase py-4 min-w-[200px]">Party Details</TableHead>
                    <TableHead className="text-[11px] font-black text-white uppercase py-4">Item Analytics</TableHead>
                    <TableHead className="text-[11px] font-black text-white uppercase py-4">In Transit</TableHead>
                    <TableHead className="text-[11px] font-black text-white uppercase py-4">Out Stream</TableHead>
                    <TableHead className="text-[11px] font-black text-white uppercase py-4 min-w-[150px]">Reference IDs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!filteredData || filteredData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-24 text-white/40 font-black italic">
                        No records match the current filter criteria
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredData.map((row, index) => (
                      <TableRow
                        key={`${row.wslipno || row.orderVrno || index}-${index}`}
                        className="group/row border-b border-white/5 transition-all duration-300"
                      >
                        <TableCell className="py-4">
                          <span className="text-[10px] font-black text-white/70">
                            {(index + 1).toString().padStart(3, '0')}
                          </span>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-black text-white">
                              {row.partyName || "Anonymous Customer"}
                            </span>
                            <span className="text-[10px] font-bold text-white/40 flex items-center gap-1">
                              Partner Account
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-white/5 border-white/10 text-[9px] text-emerald-200 font-black px-2 py-0">
                              {row.itemName || "General Cargo"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <span className="text-[11px] font-bold text-white/70 font-mono">
                            {row.indate ? new Date(row.indate).toLocaleDateString() : "-"}
                          </span>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[11px] font-bold text-white font-mono">
                              {row.outdate ? new Date(row.outdate).toLocaleDateString() : "-"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex flex-wrap gap-1.5">
                            <span className="text-[10px] font-black text-white/50 bg-white/5 border border-white/10 px-2 py-0.5 rounded leading-none">
                              #O: {row.orderVrno || "N/A"}
                            </span>
                            <span className="text-[10px] font-black text-white/60 bg-white/5 border border-white/10 px-2 py-0.5 rounded leading-none">
                              #INV: {row.invoiceNo || "N/A"}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {filteredData && filteredData.length > 100 && (
              <div className="p-4 bg-white/5 border-t border-white/10 text-center">
                <span className="text-[11px] font-black text-white/50 uppercase tracking-widest">
                  Performance Restriction: Showing first 100 of {filteredData.length} total nodes
                </span>
              </div>
            )}
          </CardContent>
        </Card> */}
      </div >
    </div >
  )
}
