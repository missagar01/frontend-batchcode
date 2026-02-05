"use client"

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { AlertCircle, Filter, Loader2, RefreshCw, X, Trophy, Database, User, Percent } from "lucide-react"
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
import { Input } from "./ui/input"
import { endOfMonth, startOfMonth, parseISO } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Calendar } from "./ui/calendar"
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
  monthlyStats?: Array<{ SALES_PERSON: string; MONTHLY_WORKING_PARTY: number; MONTHLY_PARTY_AVERAGE: string }>
  monthlyWorkingParty?: number // Keep optional for safety
  monthlyPartyAverage?: string // Keep optional for safety
  pendingStats?: Array<{ SALES_PERSON: string; TOTAL: number; CONVERSION_RATIO: string }>
  pendingOrdersTotal?: number
  conversionRatio?: string
  gdStats?: Array<{ SALES_PERSON: string; MONTHLY_GD: number; DAILY_GD: number; MONTHLY_QTY: number; DAILY_QTY: number }>
  monthlyGd?: number
  dailyGd?: number
  saudaAvg?: Array<{ ITEM: string; AVERAGE: number }>
  allSaudaAvg?: Array<{ SALES_PERSON: string; ITEM: string; AVERAGE: number }>
  salesAvg?: Array<{ SALES_PERSON: string; ITEM: string; AVERAGE: number }>
  saudaRate2026?: number
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

function DatePicker({
  date,
  setDate,
  label
}: {
  date: string;
  setDate: (date: string) => void;
  label: string
}) {
  const selectedDate = date ? new Date(date) : undefined;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal bg-white border-indigo-200 hover:bg-indigo-50/50 hover:border-indigo-300 transition-all",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-indigo-500" />
            {date ? format(selectedDate!, "PPP") : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(d) => d && setDate(format(d, "yyyy-MM-dd"))}
            initialFocus
            className="rounded-md border-none"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

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
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), "yyyy-MM"))

  // Custom Date Filters
  const [startDate, setStartDate] = useState<string>(
    format(startOfMonth(new Date()), "yyyy-MM-dd")
  )
  const [endDate, setEndDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  )

  const [enquiryReport, setEnquiryReport] = useState<any[]>([])
  const [loadingEnquiry, setLoadingEnquiry] = useState(false)

  const dashboardRef = useRef<HTMLDivElement | null>(null)

  // New Stats State
  const [totalCustomers, setTotalCustomers] = useState(0)
  const [followupStats, setFollowupStats] = useState({ totalFollowUps: 0, ordersBooked: 0 })
  const [salesPerformance, setSalesPerformance] = useState<any[]>([])
  const [dailySalesPerformance, setDailySalesPerformance] = useState<any[]>([]) // New state for daily stats
  const [deliveryStats, setDeliveryStats] = useState<{ monthly: any; daily: any } | null>(null)
  const [salespersonDeliveryStats, setSalespersonDeliveryStats] = useState<Record<string, any>>({})

  const fetchEnquiryReport = async () => {
    setLoadingEnquiry(true)
    try {
      const response = await o2dAPI.getCurrentMonthEnquiryReport(selectedMonth)
      if (response.data?.success) {
        setEnquiryReport(response.data.data)
      }
    } catch (err) {
      console.error("Error fetching enquiry report:", err)
    } finally {
      setLoadingEnquiry(false)
    }
  }

  const fetchAdditionalStats = async () => {
    // 1. Fetch Client Count (Independent of date filter)
    try {
      const countRes = await o2dAPI.getClientCount()
      if (countRes.data?.success) {
        setTotalCustomers(countRes.data.data)
      }
    } catch (err) {
      console.error("Error fetching client count:", err)
    }

    // 2. Fetch Sales/Followup Stats (Dependent on date range and salesperson)
    try {
      const params: any = {
        startDate,
        endDate
      }

      // Daily params (Today only)
      const today = format(new Date(), "yyyy-MM-dd");
      const dailyParams: any = {
        startDate: today,
        endDate: today
      };

      // Add salesPerson filter if selected
      if (selectedSales !== "All Salespersons") {
        params.salesPerson = selectedSales
        dailyParams.salesPerson = selectedSales;
      }

      const [statsRes, perfRes, dailyPerfRes, deliveryRes, salespersonStatsRes] = await Promise.all([
        o2dAPI.getFollowupStats(), // No params = Global Total
        o2dAPI.getSalesPerformance(params), // Respects filter (Selected Month)
        o2dAPI.getSalesPerformance(dailyParams), // Today's Stats
        o2dAPI.getDeliveryStats(params), // Respects filter (now includes salesPerson)
        o2dAPI.getSalespersonDeliveryStats({ startDate, endDate }) // Get all salesperson stats
      ])

      if (statsRes.data?.success) setFollowupStats(statsRes.data.data)
      if (perfRes.data?.success) setSalesPerformance(perfRes.data.data)
      if (dailyPerfRes.data?.success) setDailySalesPerformance(dailyPerfRes.data.data)
      if (deliveryRes.data?.success) {
        setDeliveryStats(deliveryRes.data.data);
      }
      if (salespersonStatsRes.data?.success) {
        setSalespersonDeliveryStats(salespersonStatsRes.data.data);
      }

    } catch (err) {
      console.error("Error fetching sales/followup stats:", err)
    }
  }

  // Update dates when selectedMonth changes
  useEffect(() => {
    if (selectedMonth === "All Months") {
      setStartDate("2024-01-01")
      setEndDate(format(new Date(), "yyyy-MM-dd"))
    } else if (selectedMonth !== "Custom Range") {
      const [year, month] = selectedMonth.split("-")
      const fromDate = new Date(parseInt(year), parseInt(month) - 1, 1)
      const toDate = endOfMonth(fromDate)
      setStartDate(format(fromDate, "yyyy-MM-dd"))
      setEndDate(format(toDate, "yyyy-MM-dd"))
    }
  }, [selectedMonth])

  useEffect(() => {
    // Fetch stats when dates or salesperson filter change
    fetchAdditionalStats()
  }, [startDate, endDate, selectedSales])

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

      if (selectedMonth === "All Months" || selectedMonth === "Custom Range") {
        params.fromDate = startDate
        params.toDate = endDate
      } else {
        const [year, month] = selectedMonth.split("-")
        const fromDate = new Date(parseInt(year), parseInt(month) - 1, 1)
        let toDate = new Date(parseInt(year), parseInt(month), 0)

        // If it's the current month (matching year & month), use today as toDate
        const now = new Date();
        if (parseInt(year) === now.getFullYear() && (parseInt(month) - 1) === now.getMonth()) {
          toDate = now;
        }

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

      // Also fetch enquiry report
      fetchEnquiryReport()
    } catch (err: unknown) {
      console.error("Error fetching dashboard:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to load dashboard data"
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [selectedSales, selectedMonth, startDate, endDate])

  useEffect(() => {
    // Reset filters on mount to ensure a clean slate
    setSelectedParty("All Parties");
    setSelectedItem("All Items");
    setSelectedSales("All Salespersons");
    setSelectedState("All States");
    setSelectedMonth(format(new Date(), "yyyy-MM"));
  }, []);

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

      if (selectedSales !== "All Salespersons" && salesName !== selectedSales) return false

      return true
    })
  }, [data?.rows, selectedSales])

  const hasActiveFilters =
    selectedSales !== "All Salespersons" ||
    selectedMonth !== format(new Date(), "yyyy-MM") ||
    startDate !== format(startOfMonth(new Date()), "yyyy-MM-dd") ||
    endDate !== format(new Date(), "yyyy-MM-dd")

  const calculateFilteredMetrics = () => {
    const rows = filteredData || []
    const summary: DashboardSummary = data?.summary || {}

    const saudaAvgList = summary.saudaAvg || [];
    const salesAvgList = summary.salesAvg || [];

    let targetItem = 'PIPE';
    // Item filtering is removed from UI, defaulting to PIPE average calculation
    // but preserving the logic structure in case it's needed later.


    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const saudaAvg = saudaAvgList.find((x: any) => x.ITEM === targetItem)?.AVERAGE || 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const salesAvg = salesAvgList.find((x: any) => x.ITEM === targetItem)?.AVERAGE || 0;

    // Calculate Dynamic Working Party Stats
    const monthlyStats = summary.monthlyStats || [];
    const relevantStats = selectedSales !== "All Salespersons"
      ? monthlyStats.filter((s: any) => s.SALES_PERSON === selectedSales)
      : monthlyStats;

    const calculatedWorkingParty = relevantStats.reduce((sum: number, stat: any) => sum + (stat.MONTHLY_WORKING_PARTY || 0), 0);
    const calculatedPartyAverage = Math.round((calculatedWorkingParty / 900) * 100) + '%';

    // Calculate Dynamic Pending Order Stats
    const pendingStats = summary.pendingStats || [];
    const relevantPendingStats = selectedSales !== "All Salespersons"
      ? pendingStats.filter((s: any) => s.SALES_PERSON === selectedSales)
      : pendingStats;

    const calculatedPendingTotal = relevantPendingStats.reduce((sum: number, stat: any) => sum + (stat.TOTAL || 0), 0);
    const calculatedConversionRatio = Math.round((calculatedPendingTotal / 900) * 100) + '%';

    // Calculate Dynamic GD Stats
    const gdStats = summary.gdStats || [];
    const relevantGdStats = selectedSales !== "All Salespersons"
      ? gdStats.filter((s: any) => s.SALES_PERSON === selectedSales)
      : gdStats;

    let totalMonthlySummary = 0;
    let totalMonthlyQty = 0;
    let totalDailySummary = 0;
    let totalDailyQty = 0;

    relevantGdStats.forEach((s: any) => {
      const monQty = s.MONTHLY_QTY || 0;
      const dayQty = s.DAILY_QTY || 0;

      // GD = Summary / Qty  => Summary = GD * Qty
      totalMonthlySummary += (s.MONTHLY_GD || 0) * monQty;
      totalMonthlyQty += monQty;

      totalDailySummary += (s.DAILY_GD || 0) * dayQty;
      totalDailyQty += dayQty;
    });

    const calculatedMonthlyGd = totalMonthlyQty ? Math.round(totalMonthlySummary / totalMonthlyQty) : 0;
    const calculatedDailyGd = totalDailyQty ? Math.round(totalDailySummary / totalDailyQty) : 0;

    return {
      monthlyWorkingParty: calculatedWorkingParty,
      monthlyPartyAverage: calculatedPartyAverage,
      pendingOrdersTotal: calculatedPendingTotal,
      conversionRatio: calculatedConversionRatio,
      saudaAvg,
      salesAvg,
      saudaRate2026: summary.saudaRate2026 ?? 0,
      monthlyGd: calculatedMonthlyGd,
      dailyGd: calculatedDailyGd,
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
      return value.toString()
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
    const saudaAvgList = summary.allSaudaAvg || []
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

    const entries = Object.entries(stateMap)
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => b.count - a.count);

    const totalCount = entries.reduce((acc, curr) => acc + curr.count, 0);
    if (totalCount === 0) return [];

    const result: { state: string; count: number }[] = [];
    let miscCount = 0;

    entries.forEach(entry => {
      const percentage = (entry.count / totalCount) * 100;
      if (percentage < 2) {
        miscCount += entry.count;
      } else {
        result.push(entry);
      }
    });

    if (miscCount > 0) {
      result.push({ state: "Miscellaneous", count: miscCount });
    }

    return result;
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



  // New Stats State (Moved to top)

  return (
    <div className="relative space-y-4 sm:space-y-8 p-2 sm:p-4 lg:p-8 bg-slate-50/50 min-h-screen" ref={dashboardRef}>
      {loading && data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="flex flex-col items-center justify-center space-y-4 bg-white rounded-lg shadow-2xl p-8">
            <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
            <p className="text-lg font-semibold text-gray-700">Loading...</p>
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

        {/* Filter Section moved to top */}
        <Card className="border-l-4 border-l-indigo-500 bg-gradient-to-br from-indigo-50/30 to-white shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-transparent pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-indigo-700 text-lg">
                  <Filter className="h-5 w-5 text-indigo-600" />
                  Dashboard Filters
                </CardTitle>
              </div>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedSales("All Salespersons")
                    setSelectedMonth(format(new Date(), "yyyy-MM"))
                    setStartDate(format(startOfMonth(new Date()), "yyyy-MM-dd"))
                    setEndDate(format(new Date(), "yyyy-MM-dd"))
                  }}
                  className="ignore-pdf bg-red-50 text-red-600 hover:bg-red-100 border-red-200 h-8"
                >
                  <X className="h-4 w-4 mr-2" />
                  Reset All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Salesperson Filter */}
              {/* <div className="space-y-2">
                <label className="text-sm font-semibold text-blue-700 flex items-center gap-2">
                  <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                  Salesperson
                </label>
                <Select value={selectedSales} onValueChange={setSelectedSales}>
                  <SelectTrigger className="bg-white border-blue-100 hover:border-blue-300 focus:ring-blue-400 transition-all">
                    <SelectValue placeholder="Select salesperson" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All Salespersons">All Salespersons</SelectItem>
                    {(data?.filters?.salesPersons || []).map((sales) => (
                      <SelectItem key={sales} value={sales}>{sales}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div> */}

              {/* Month Filter */}
              {/* <div className="space-y-2">
                <label className="text-sm font-semibold text-indigo-700 flex items-center gap-2">
                  <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
                  Select Month
                </label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="bg-white border-indigo-100 hover:border-indigo-300 focus:ring-indigo-400 transition-all">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All Months">All Months</SelectItem>
                    <SelectItem value="Custom Range">Custom Range</SelectItem>
                    {(() => {
                      const months = []
                      const startDate = new Date(2025, 3, 1) // April 2025
                      const currentDate = new Date()
                      for (let d = new Date(startDate); d <= currentDate; d.setMonth(d.getMonth() + 1)) {
                        const val = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`
                        const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                        months.push(<SelectItem key={val} value={val}>{label}</SelectItem>)
                      }
                      return months.reverse()
                    })()}
                  </SelectContent>
                </Select>
              </div> */}

              {/* Date Pickers */}
              <DatePicker
                label="From Date"
                date={startDate}
                setDate={(val) => {
                  setStartDate(val)
                  setSelectedMonth("Custom Range")
                }}
              />
              <DatePicker
                label="To Date"
                date={endDate}
                setDate={(val) => {
                  setEndDate(val)
                  setSelectedMonth("Custom Range")
                }}
              />
            </div>

            {hasActiveFilters && (
              <div className="mt-6 flex flex-wrap gap-2 pt-4 border-t border-indigo-50">
                {selectedSales !== "All Salespersons" && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
                    Sales: {selectedSales}
                  </Badge>
                )}
                {selectedMonth !== "All Months" && selectedMonth !== "Custom Range" && (
                  <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 border-indigo-200">
                    Month: {new Date(selectedMonth + "-01").toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </Badge>
                )}
                <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-slate-200">
                  Range: {format(new Date(startDate), "MMM d")} - {format(new Date(endDate), "MMM d, yyyy")}
                </Badge>
              </div>
            )}


          </CardContent>
        </Card>

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
                <CardTitle className="text-purple-800 font-bold">Sauda Rate And Late Delivery  Percent</CardTitle>
                <CardDescription className="text-purple-700/80">
                  Current month party And delivery Percent
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                {/* Horizontal Grid for Sauda Rate & Delivery Scores */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

                  {/* Monthly Delivery Score Card */}
                  <Card className="bg-gradient-to-br from-pink-500 via-rose-500 to-red-500 text-white border-none shadow-lg hover:shadow-xl transition-all duration-300">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
                      <CardTitle className="text-sm font-bold text-pink-50">
                        Monthly Late
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="text-4xl font-bold tracking-tight text-white mt-2">
                        {deliveryStats?.monthly?.score ?? '0%'}
                      </div>
                      <p className="text-xs mt-1 font-medium text-pink-100">
                        Late Percentage
                      </p>
                    </CardContent>
                  </Card>

                  {/* Daily Delivery Score Card */}
                  <Card className="bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-500 text-white border-none shadow-lg hover:shadow-xl transition-all duration-300">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
                      <div className="space-y-1">
                        <CardTitle className="text-sm font-bold text-indigo-50">
                          Daily Late
                        </CardTitle>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/10 w-fit">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
                          <span className="text-[10px] text-indigo-100 font-bold tracking-wider uppercase">
                            {deliveryStats?.daily?.date ? deliveryStats.daily.date : 'Today'}
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="text-4xl font-bold tracking-tight text-white mt-1">
                        {deliveryStats?.daily?.score ?? '0%'}
                      </div>
                      <p className="text-xs mt-1 font-medium text-indigo-100/80">
                        {deliveryStats?.daily?.period?.includes('Latest') ? 'Latest Data' : 'Daily Late Percentage'}
                      </p>
                    </CardContent>
                  </Card>
                </div>
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

        {/* All Sauda Section - Salesperson-wise Sauda Averages */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">All Sauda Average</h2>
              <p className="text-sm text-slate-500 font-medium">Sauda Average by Sales Executive & Item Type</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {(() => {
              const summary: DashboardSummary = data?.summary || {};
              const saudaAvgList = summary.allSaudaAvg || [];

              // Group by salesperson
              const salespersonData: Record<string, Array<{ ITEM: string; AVERAGE: number }>> = {};
              saudaAvgList.forEach((entry: any) => {
                const person = entry.SALES_PERSON || 'Unknown';
                if (!salespersonData[person]) {
                  salespersonData[person] = [];
                }
                salespersonData[person].push({
                  ITEM: entry.ITEM,
                  AVERAGE: entry.AVERAGE
                });
              });

              const salespersons = Object.keys(salespersonData).sort();
              const gradients = [
                'from-blue-500 via-blue-600 to-indigo-600',
                'from-purple-500 via-purple-600 to-pink-600',
                'from-green-500 via-emerald-600 to-teal-600',
                'from-orange-500 via-amber-600 to-yellow-600',
                'from-rose-500 via-pink-600 to-fuchsia-600',
                'from-cyan-500 via-cyan-600 to-sky-600',
                'from-violet-500 via-violet-600 to-purple-600',
                'from-lime-500 via-lime-600 to-green-600',
                'from-red-500 via-red-600 to-rose-600',
                'from-indigo-500 via-indigo-600 to-blue-600',
                'from-teal-500 via-teal-600 to-cyan-600',
                'from-yellow-500 via-yellow-600 to-amber-600',
                'from-pink-500 via-pink-600 to-rose-600',
                'from-emerald-500 via-emerald-600 to-green-600',
                'from-fuchsia-500 via-fuchsia-600 to-pink-600',
              ];

              if (salespersons.length === 0) {
                return (
                  <div className="col-span-full text-center py-12 text-slate-500">
                    <p className="text-sm font-semibold">No sauda data available</p>
                  </div>
                );
              }

              return salespersons.map((person, index) => {
                const items = salespersonData[person];

                return (
                  <Card
                    key={person}
                    className={cn(
                      "bg-gradient-to-br text-white border-none shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300",
                      gradients[index % gradients.length]
                    )}
                  >
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm font-bold text-white/90 uppercase tracking-wide">
                        {person}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2 space-y-2">
                      {items.map((item) => (
                        <div
                          key={item.ITEM}
                          className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20"
                        >
                          <p className="text-[10px] text-white/70 font-bold uppercase tracking-wider mb-1">
                            {item.ITEM}
                          </p>
                          <div className="text-2xl font-black text-white">
                            ₹{item.AVERAGE || '0'}
                          </div>
                          <p className="text-[9px] text-white/60 font-medium mt-0.5">
                            Average Rate
                          </p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              });
            })()}
          </div>
        </div>

        {/* Current Month Sales Average Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Current Month Sales Average</h2>
              <p className="text-sm text-slate-500 font-medium">Sales average rates for Pipe, Billet, and Strip by Sales Executive</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {(() => {
              const summary: DashboardSummary = data?.summary || {};
              const salesAvgList = summary.salesAvg || [];

              // Group by salesperson
              const salespersonData: Record<string, Array<{ ITEM: string; AVERAGE: number }>> = {};
              salesAvgList.forEach((entry: any) => {
                const person = entry.SALES_PERSON || 'Unknown';
                if (!salespersonData[person]) {
                  salespersonData[person] = [];
                }
                salespersonData[person].push({
                  ITEM: entry.ITEM,
                  AVERAGE: entry.AVERAGE
                });
              });

              const salespersons = Object.keys(salespersonData).sort();
              const gradients = [
                'from-slate-500 via-slate-600 to-gray-600',
                'from-amber-500 via-amber-600 to-orange-600',
                'from-sky-500 via-sky-600 to-blue-600',
                'from-fuchsia-500 via-fuchsia-600 to-purple-600',
                'from-emerald-500 via-emerald-600 to-teal-600',
                'from-red-500 via-red-600 to-pink-600',
                'from-indigo-500 via-indigo-600 to-violet-600',
                'from-lime-500 via-lime-600 to-emerald-600',
                'from-pink-500 via-pink-600 to-fuchsia-600',
                'from-cyan-500 via-cyan-600 to-teal-600',
                'from-yellow-500 via-yellow-600 to-orange-600',
                'from-purple-500 via-purple-600 to-indigo-600',
                'from-teal-500 via-teal-600 to-green-600',
                'from-rose-500 via-rose-600 to-red-600',
                'from-violet-500 via-violet-600 to-purple-600',
              ];

              if (salespersons.length === 0) {
                return (
                  <div className="col-span-full text-center py-12 text-slate-500">
                    <p className="text-sm font-semibold">No sales data available</p>
                  </div>
                );
              }

              return salespersons.map((person, index) => {
                const items = salespersonData[person];

                return (
                  <Card
                    key={person}
                    className={cn(
                      "bg-gradient-to-br text-white border-none shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300",
                      gradients[index % gradients.length]
                    )}
                  >
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm font-bold text-white/90 uppercase tracking-wide">
                        {person}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2 space-y-2">
                      {items.map((item) => (
                        <div
                          key={item.ITEM}
                          className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20"
                        >
                          <p className="text-[10px] text-white/70 font-bold uppercase tracking-wider mb-1">
                            {item.ITEM}
                          </p>
                          <div className="text-2xl font-black text-white">
                            ₹{item.AVERAGE || '0'}
                          </div>
                          <p className="text-[9px] text-white/60 font-medium mt-0.5">
                            Sales Average
                          </p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              });
            })()}
          </div>
        </div>

        {/* Monthly Working Party Metrics Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Monthly Working Party Metrics</h2>
              <p className="text-sm text-slate-500 font-medium">Active Parties and Participation Average by Sales Executive</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {(() => {
              const summary: DashboardSummary = data?.summary || {};
              // Fallback to empty array if undefined
              const monthlyStats = summary.monthlyStats || [];

              // Filter and Sort by sales person name
              const filteredStats = selectedSales !== "All Salespersons"
                ? monthlyStats.filter((s: any) => s.SALES_PERSON === selectedSales)
                : monthlyStats;

              const sortedStats = [...filteredStats].sort((a, b) =>
                (a.SALES_PERSON || '').localeCompare(b.SALES_PERSON || '')
              );

              // Unique gradients (15 unique defined earlier) without repeats
              const gradients = [
                'from-emerald-600 via-teal-600 to-cyan-600',
                'from-orange-500 via-amber-500 to-yellow-500',
                'from-purple-600 via-violet-600 to-indigo-600',
                'from-blue-600 via-cyan-600 to-sky-600',
                'from-rose-600 via-pink-600 to-fuchsia-600',
                'from-lime-600 via-green-600 to-emerald-600',
                'from-indigo-600 via-blue-600 to-azure-600',
                'from-red-600 via-orange-600 to-amber-600',
                'from-cyan-600 via-blue-600 to-indigo-600',
                'from-teal-600 via-emerald-600 to-green-600',
                'from-violet-600 via-purple-600 to-fuchsia-600',
                'from-fuchsia-600 via-pink-600 to-rose-600',
                'from-sky-600 via-blue-600 to-indigo-600',
                'from-amber-600 via-orange-600 to-red-600',
                'from-slate-600 via-gray-600 to-zinc-600',
              ];

              if (sortedStats.length === 0) {
                return (
                  <div className="col-span-full text-center py-12 text-slate-500">
                    <p className="text-sm font-semibold">No working party data available</p>
                  </div>
                );
              }

              return sortedStats.map((stat, index) => {
                const person = stat.SALES_PERSON || 'Unknown';
                return (
                  <Card
                    key={person}
                    className={cn(
                      "bg-gradient-to-br text-white border-none shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300",
                      gradients[index % gradients.length]
                    )}
                  >
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm font-bold text-white/90 uppercase tracking-wide">
                        {person}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2 space-y-2">
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                        <div className="flex justify-between items-end mb-1">
                          <p className="text-[10px] text-white/70 font-bold uppercase tracking-wider">
                            Working Parties
                          </p>
                          <User className="w-3 h-3 text-white/60" />
                        </div>
                        <div className="text-3xl font-black text-white">
                          {stat.MONTHLY_WORKING_PARTY || 0}
                        </div>
                      </div>

                      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                        <div className="flex justify-between items-end mb-1">
                          <p className="text-[10px] text-white/70 font-bold uppercase tracking-wider">
                            Participation
                          </p>
                          <Percent className="w-3 h-3 text-white/60" />
                        </div>
                        <div className="text-3xl font-black text-white">
                          {stat.MONTHLY_PARTY_AVERAGE || '0%'}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              });
            })()}
          </div>
        </div>

        {/* Pending Order Metrics Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Pending Order Metrics</h2>
              <p className="text-sm text-slate-500 font-medium">Pending Parties and Conversion Ratio by Sales Executive</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {(() => {
              const summary: DashboardSummary = data?.summary || {};
              const pendingStats = summary.pendingStats || [];

              // Filter and Sort by sales person name
              const filteredStats = selectedSales !== "All Salespersons"
                ? pendingStats.filter((s: any) => s.SALES_PERSON === selectedSales)
                : pendingStats;

              const sortedStats = [...filteredStats].sort((a, b) =>
                (a.SALES_PERSON || '').localeCompare(b.SALES_PERSON || '')
              );

              // Unique gradients (15 unique defined earlier)
              const gradients = [
                'from-teal-600 via-emerald-600 to-green-600',
                'from-pink-500 via-rose-500 to-red-500',
                'from-indigo-600 via-blue-600 to-cyan-600',
                'from-amber-500 via-orange-500 to-red-500',
                'from-violet-600 via-purple-600 to-fuchsia-600',
                'from-cyan-600 via-teal-600 to-emerald-600',
                'from-rose-600 via-fuchsia-600 to-purple-600',
                'from-lime-600 via-green-600 to-teal-600',
                'from-blue-600 via-indigo-600 to-violet-600',
                'from-orange-600 via-amber-600 to-yellow-600',
                'from-emerald-600 via-green-600 to-lime-600',
                'from-fuchsia-600 via-purple-600 to-indigo-600',
                'from-sky-600 via-blue-600 to-indigo-600',
                'from-red-600 via-rose-600 to-pink-600',
                'from-slate-600 via-zinc-600 to-neutral-600',
              ];

              if (sortedStats.length === 0) {
                return (
                  <div className="col-span-full text-center py-12 text-slate-500">
                    <p className="text-sm font-semibold">No pending order data available</p>
                  </div>
                );
              }

              return sortedStats.map((stat, index) => {
                const person = stat.SALES_PERSON || 'Unknown';
                return (
                  <Card
                    key={person}
                    className={cn(
                      "bg-gradient-to-br text-white border-none shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300",
                      gradients[index % gradients.length]
                    )}
                  >
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm font-bold text-white/90 uppercase tracking-wide">
                        {person}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2 space-y-2">
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                        <div className="flex justify-between items-end mb-1">
                          <p className="text-[10px] text-white/70 font-bold uppercase tracking-wider">
                            Pending Parties
                          </p>
                          <AlertCircle className="w-3 h-3 text-white/60" />
                        </div>
                        <div className="text-3xl font-black text-white">
                          {stat.TOTAL || 0}
                        </div>
                      </div>

                      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                        <div className="flex justify-between items-end mb-1">
                          <p className="text-[10px] text-white/70 font-bold uppercase tracking-wider">
                            Conversion Ratio
                          </p>
                          <Percent className="w-3 h-3 text-white/60" />
                        </div>
                        <div className="text-3xl font-black text-white">
                          {stat.CONVERSION_RATIO || '0%'}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              });
            })()}
          </div>
        </div>

        {/* Gauge Difference Metrics Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Gauge Difference Metrics</h2>
              <p className="text-sm text-slate-500 font-medium">Monthly and Daily Gauge Difference by Sales Person wise</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {(() => {
              const summary: DashboardSummary = data?.summary || {};
              const gdStats = summary.gdStats || [];

              // Filter and Sort by sales person name
              const filteredStats = selectedSales !== "All Salespersons"
                ? gdStats.filter((s: any) => s.SALES_PERSON === selectedSales)
                : gdStats;

              const sortedStats = [...filteredStats].sort((a, b) =>
                (a.SALES_PERSON || '').localeCompare(b.SALES_PERSON || '')
              );

              // Unique gradients
              const gradients = [
                'from-emerald-600 via-green-600 to-lime-600',
                'from-orange-600 via-amber-600 to-yellow-600',
                'from-cyan-600 via-blue-600 to-indigo-600',
                'from-rose-600 via-red-600 to-orange-600',
                'from-violet-600 via-purple-600 to-fuchsia-600',
                'from-teal-600 via-emerald-600 to-green-600',
                'from-pink-600 via-rose-600 to-red-600',
                'from-indigo-600 via-blue-600 to-sky-600',
                'from-fuchsia-600 via-pink-600 to-rose-600',
                'from-yellow-600 via-amber-600 to-orange-600',
                'from-lime-600 via-green-600 to-emerald-600',
                'from-blue-600 via-cyan-600 to-teal-600',
                'from-red-600 via-orange-600 to-amber-600',
                'from-purple-600 via-indigo-600 to-blue-600',
                'from-slate-600 via-gray-600 to-zinc-600',
              ];

              if (sortedStats.length === 0) {
                return (
                  <div className="col-span-full text-center py-12 text-slate-500">
                    <p className="text-sm font-semibold">No gauge difference data available</p>
                  </div>
                );
              }

              return sortedStats.map((stat, index) => {
                const person = stat.SALES_PERSON || 'Unknown';
                const monthlyGd = stat.MONTHLY_GD || 0;
                const dailyGd = stat.DAILY_GD || 0;

                return (
                  <Card
                    key={person}
                    className={cn(
                      "bg-gradient-to-br text-white border-none shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300",
                      gradients[index % gradients.length]
                    )}
                  >
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm font-bold text-white/90 uppercase tracking-wide">
                        {person}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2 space-y-2">
                      {/* Monthly GD */}
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                        <div className="flex justify-between items-end mb-1">
                          <p className="text-[10px] text-white/70 font-bold uppercase tracking-wider">
                            Monthly GD
                          </p>
                          <div className="text-[10px] text-white/60">₹</div>
                        </div>
                        <div className="text-3xl font-black text-white">
                          ₹{monthlyGd.toLocaleString("en-IN")}
                        </div>
                      </div>

                      {/* Daily GD */}
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                        <div className="flex justify-between items-end mb-1">
                          <p className="text-[10px] text-white/70 font-bold uppercase tracking-wider">
                            Daily GD
                          </p>
                          <div className="text-[10px] text-white/60">₹</div>
                        </div>
                        <div className="text-3xl font-black text-white">
                          ₹{dailyGd.toLocaleString("en-IN")}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              });
            })()}
          </div>
        </div>

        {/* Sale Performance Section (Monthly/Daily Late Percentage) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Sale Performance</h2>
              <p className="text-sm text-slate-500 font-medium">Monthly and Daily Late Delivery Percentages</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {(() => {
              const salespersons = ['AMIT PANDY', 'ANIL MISHRA', 'RAHUL SHARMA', 'TRIPATI RANA', 'SHEETAL PATEL'];
              const gradients = [
                'from-blue-600 via-blue-700 to-indigo-700',
                'from-purple-600 via-purple-700 to-pink-700',
                'from-green-600 via-emerald-700 to-teal-700',
                'from-orange-600 via-amber-700 to-yellow-700',
                'from-rose-600 via-pink-700 to-fuchsia-700'
              ];

              return salespersons.map((person, index) => {
                // Get real data from backend salespersonDeliveryStats
                const stats = salespersonDeliveryStats[person] || {
                  monthly: { score: '0%', total: 0, late: 0 },
                  daily: { score: '0%', total: 0, late: 0, date: 'No Data' }
                };

                return (
                  <Card
                    key={person}
                    className={cn(
                      "bg-gradient-to-br text-white border-none shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300",
                      gradients[index]
                    )}
                  >
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm font-bold text-white/90 uppercase tracking-wide">
                        {person}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2 space-y-3">
                      {/* Monthly Late */}
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                        <p className="text-[10px] text-white/70 font-bold uppercase tracking-wider mb-1">
                          Monthly Late
                        </p>
                        <div className="text-3xl font-black text-white">
                          {stats.monthly.score}
                        </div>
                        <p className="text-[9px] text-white/60 font-medium mt-0.5">
                          {stats.monthly.late} of {stats.monthly.total} deliveries
                        </p>
                      </div>

                      {/* Daily Late */}
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                        <p className="text-[10px] text-white/70 font-bold uppercase tracking-wider mb-1">
                          Daily Late
                        </p>
                        <div className="text-3xl font-black text-white">
                          {stats.daily.score}
                        </div>
                        <p className="text-[9px] text-white/60 font-medium mt-0.5">
                          {stats.daily.late} of {stats.daily.total} deliveries
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              });
            })()}
          </div>
        </div>

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
              <Badge variant="secondary" className="text-slate-600 font-bold text-[10px] bg-slate-100 hover:bg-slate-200 border-none">ALL STATES</Badge>
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
                        <span className="text-[10px] font-black text-white uppercase tracking-tighter">
                          {item.state === "Miscellaneous" ? "OTHER" : `Rank #${index + 1}`}
                        </span>
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


        {/* Current Month Enquiry Report Section */}
        <Card className="border-l-4 border-l-emerald-500 bg-white shadow-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-emerald-50 to-transparent border-b border-emerald-100 p-4 md:p-6">
            <div className="flex flex-col gap-4">
              {/* Top Row: Title & Month Selector */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-100 rounded-xl shadow-sm">
                    <Database className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg md:text-xl font-black text-slate-800 tracking-tight leading-tight">
                      {selectedMonth === "All Months"
                        ? "Overall Enquiry Report"
                        : `${format(new Date(selectedMonth + "-01"), "MMMM yyyy")} Enquiry Report`}
                    </CardTitle>
                    <CardDescription className="text-[11px] md:text-xs text-emerald-700/70 font-bold uppercase tracking-wider">
                      Aggregated enquiry volume by size and thickness
                    </CardDescription>
                  </div>
                </div>

                <div className="w-full sm:w-auto">
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-full sm:w-[160px] h-9 border-emerald-200 text-emerald-700 bg-white shadow-sm text-[11px] font-bold uppercase tracking-wider hover:bg-emerald-50 transition-colors">
                      <SelectValue placeholder="Select Month" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All Months">All Months</SelectItem>
                      {(() => {
                        const months = []
                        const startDate = new Date(2025, 3, 1)
                        const currentDate = new Date()
                        for (let d = new Date(startDate); d <= currentDate; d.setMonth(d.getMonth() + 1)) {
                          const year = d.getFullYear()
                          const monthStr = (d.getMonth() + 1).toString().padStart(2, '0')
                          const value = `${year}-${monthStr}`
                          const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                          months.push(<SelectItem key={value} value={value}>{label}</SelectItem>)
                        }
                        return months.reverse()
                      })()}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Bottom Row: Badges & Stats */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Badge className="bg-emerald-500 text-white border-none font-bold px-3 py-1.5 text-[10px] md:text-[11px] uppercase tracking-widest shadow-md">
                  {enquiryReport.length} ITEMS
                </Badge>

                {enquiryReport.length > 0 && (
                  <div className="flex items-center gap-3 bg-emerald-600 text-white px-4 py-1.5 rounded-full shadow-lg ml-0 sm:ml-auto">
                    <span className="text-[9px] font-black uppercase tracking-[0.15em] opacity-80">Total Volume</span>
                    <span className="text-sm md:text-base font-black font-mono">
                      {enquiryReport.reduce((acc, curr) => acc + Number(curr.total), 0).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="max-h-[650px] overflow-y-auto overflow-x-auto scrollbar-thin scrollbar-thumb-emerald-100 relative">
              <Table>
                <TableHeader className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-sm shadow-sm">
                  <TableRow className="hover:bg-transparent border-b-2 border-emerald-100">
                    <TableHead className="w-[60px] md:w-[80px] font-black text-slate-600 uppercase tracking-widest text-[11px] md:text-[13px] py-4 pl-6">S.No</TableHead>
                    <TableHead className="font-black text-slate-600 uppercase tracking-widest text-[11px] md:text-[13px] py-4">Item Type</TableHead>
                    <TableHead className="font-black text-slate-600 uppercase tracking-widest text-[11px] md:text-[13px] py-4">Size</TableHead>
                    <TableHead className="font-black text-slate-600 uppercase tracking-widest text-[11px] md:text-[13px] py-4 text-center">Thickness</TableHead>

                    <TableHead className="font-black text-slate-600 uppercase tracking-widest text-[11px] md:text-[13px] py-4 text-right pr-6">Quantity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingEnquiry ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-48 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <Loader2 className="h-10 w-10 text-emerald-500 animate-spin" />
                          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Fetching Report...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : enquiryReport.length > 0 ? (
                    enquiryReport.map((item, index) => {
                      const gradients = [
                        "linear-gradient(135deg, #00B4DB 0%, #0083B0 100%)",
                        "linear-gradient(135deg, #4776E6 0%, #8E54E9 100%)"
                      ];
                      const rowGradient = gradients[index % gradients.length];

                      return (
                        <TableRow
                          key={index}
                          style={{ background: rowGradient }}
                          className="border-b border-white/10 group transition-none"
                        >
                          <TableCell className="font-bold text-white/90 py-5 pl-6 text-xs">{index + 1}</TableCell>
                          <TableCell className="py-5">
                            <Badge variant="outline" className="font-black uppercase tracking-widest text-[11px] md:text-xs border-white/40 text-white bg-white/10 px-3 py-1">
                              {item.item_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-black text-white py-5 text-xs md:text-sm">{item.size}</TableCell>
                          <TableCell className="text-center py-5">
                            <span className="px-3 py-1.5 bg-white/95 border border-transparent rounded-lg font-mono font-bold text-slate-800 text-[11px] md:text-sm shadow-md inline-block">
                              {item.thickness}
                            </span>
                          </TableCell>

                          <TableCell className="text-right py-5 pr-6">
                            <span className="font-black text-base md:text-lg text-white font-mono tracking-tighter">
                              {Number(item.total).toLocaleString()}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-48 text-center">
                        <div className="flex flex-col items-center justify-center gap-3 py-10">
                          <div className="p-4 bg-slate-50 rounded-full">
                            <AlertCircle className="h-10 w-10 text-slate-300" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No Records Found</p>
                            <p className="text-[10px] text-slate-300 font-bold uppercase mt-1">Try selecting a different month</p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Top Value Cards Section - Wrapped in Scoresheet Card */}
        <Card className="w-full bg-white border-none shadow-lg overflow-hidden animate-in slide-in-from-top-4 duration-500">
          <CardHeader className="bg-white border-b border-slate-100 py-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-200">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /><path d="M8 14h.01" /><path d="M12 14h.01" /><path d="M16 14h.01" /><path d="M8 18h.01" /><path d="M12 18h.01" /><path d="M16 18h.01" /></svg>
              </div>
              <CardTitle className="text-xl font-black text-slate-800 tracking-tight">ScotSheet</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Total Customers Card */}
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
                  <div className="flex gap-1">
                    <div className="w-16 h-16 rounded-full border-4 border-white/40"></div>
                    <div className="w-16 h-16 rounded-full border-4 border-white/40 -ml-8"></div>
                  </div>
                </div>
                <CardHeader className="pb-2">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                  </div>
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-100">Total Customers</p>
                </CardHeader>
                <CardContent>
                  <div className="text-5xl font-black tracking-tighter">{totalCustomers.toLocaleString()}</div>
                </CardContent>
              </Card>

              {/* Total Follow-ups Card */}
              <Card className="bg-gradient-to-br from-purple-500 to-fuchsia-600 text-white border-none shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
                  <div className="w-32 h-32 rounded-full border-8 border-white/30 -mr-16 -mt-16"></div>
                </div>
                <CardHeader className="pb-2">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                  </div>
                  <p className="text-xs font-bold uppercase tracking-wider text-purple-100">Total Follow-ups</p>
                </CardHeader>
                <CardContent>
                  <div className="text-5xl font-black tracking-tighter">{followupStats.totalFollowUps.toLocaleString()}</div>
                </CardContent>
              </Card>

              {/* Orders Booked Card */}
              <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-none shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
                  <div className="w-32 h-32 rounded-full border-8 border-white/30 -mr-16 -mt-16"></div>
                </div>
                <CardHeader className="pb-2">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><polyline points="20 6 9 17 4 12" /></svg>
                  </div>
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-100">Orders Booked</p>
                </CardHeader>
                <CardContent>
                  <div className="text-5xl font-black tracking-tighter">{followupStats.ordersBooked.toLocaleString()}</div>
                </CardContent>
              </Card>
            </div>


            {/* Sales Performance Report Section */}
            <div className='w-full'>
              <Card className="border-none shadow-lg overflow-hidden bg-white">
                <CardHeader className="bg-white border-b border-slate-100 py-6">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-200">
                        <Filter className="w-5 h-5 text-white" />
                      </div>
                      <CardTitle className="text-xl font-black text-slate-800 tracking-tight">Monthly MeCA Score</CardTitle>
                    </div>
                    <div>
                      <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="w-[180px] bg-slate-50 border-slate-200 font-bold text-slate-700">
                          <SelectValue placeholder="Select Month" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="All Months">All Months</SelectItem>
                          {
                            // Dynamic Month List - Last 12 months + typical range
                            Array.from({ length: 18 }, (_, i) => {
                              const d = new Date();
                              d.setMonth(d.getMonth() - i + 1); // +1 to include maybe future month or current
                              return format(d, "yyyy-MM");
                            }).map(m => (
                              <SelectItem key={m} value={m}>
                                {new Date(m).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                              </SelectItem>
                            ))
                          }
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-white uppercase bg-blue-600 sticky top-0 z-10">
                        <tr>
                          <th scope="col" className="px-6 py-4 font-bold tracking-wider">Sales Person</th>
                          <th scope="col" className="px-6 py-4 font-bold tracking-wider text-center">No of Callings</th>
                          <th scope="col" className="px-6 py-4 font-bold tracking-wider text-center">Order Clients</th>
                          <th scope="col" className="px-6 py-4 font-bold tracking-wider text-center">Conversion Ratio</th>
                          <th scope="col" className="px-6 py-4 font-bold tracking-wider text-center">Total Rs Sale</th>
                          <th scope="col" className="px-6 py-4 font-bold tracking-wider text-center">Average Rs Sale</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {salesPerformance.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-8 text-center text-slate-400 font-medium">
                              <div className="flex flex-col items-center justify-center p-4">
                                <div className="text-lg">No data available</div>
                                <div className="text-sm mt-1">Try selecting a different date range</div>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          salesPerformance.map((row, idx) => {
                            const isTotalRow = row.salesPerson === 'Total';

                            const rowClass = isTotalRow
                              ? "bg-blue-50 font-bold border-t-2 border-blue-100" // Light blue summary row
                              : idx % 2 === 0 ? "bg-white" : "bg-slate-50/50";

                            // Generate avatar initials
                            const initials = row.salesPerson !== 'Total'
                              ? row.salesPerson.split(' ').map((n: any) => n[0]).join('').substring(0, 2).toUpperCase()
                              : 'Σ';

                            // Determine avatar color
                            const avatarColor = idx % 3 === 0 ? "bg-blue-500" : idx % 3 === 1 ? "bg-purple-500" : "bg-indigo-500";

                            return (
                              <tr key={idx} className={`${rowClass} hover:bg-blue-50/80 transition-colors`}>
                                <td className="px-6 py-4 font-medium flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full ${isTotalRow ? 'bg-blue-600' : avatarColor} flex items-center justify-center text-white text-xs font-bold shadow-sm`}>
                                    {initials}
                                  </div>
                                  {row.salesPerson}
                                </td>
                                <td className="px-6 py-4 text-center">{row.noOfCallings}</td>
                                <td className="px-6 py-4 text-center">{row.orderClients}</td>
                                <td className="px-6 py-4 text-center">
                                  <div className="flex flex-col items-center">
                                    <span className={`${isTotalRow ? 'text-blue-700' : 'text-slate-700'} font-bold`}>{row.conversionRatio}%</span>
                                    {!isTotalRow && <div className="w-12 h-1 bg-slate-200 rounded-full mt-1 overflow-hidden">
                                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(parseFloat(row.conversionRatio), 100)}%` }}></div>
                                    </div>}
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-center font-mono text-slate-700">
                                  {row.totalRsSale ? Number(row.totalRsSale).toLocaleString() : '0'}
                                </td>
                                <td className="px-6 py-4 text-center font-mono">
                                  <span className={`${parseFloat(row.avgRsSale) > 50 ? 'text-emerald-600 font-bold' : 'text-slate-600'}`}>
                                    {row.avgRsSale}
                                  </span>
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Daily Sales Performance Report Section */}
            <div className='w-full mt-8'>
              <Card className="border-none shadow-lg overflow-hidden bg-white">
                <CardHeader className="bg-white border-b border-slate-100 py-6">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-600 rounded-lg shadow-lg shadow-emerald-200">
                        <Filter className="w-5 h-5 text-white" />
                      </div>
                      <CardTitle className="text-xl font-black text-slate-800 tracking-tight">Daily MeCA Score</CardTitle>
                    </div>
                    <div className="bg-slate-100 px-4 py-2 rounded-lg font-bold text-slate-600 text-sm">
                      {format(new Date(), "dd MMMM yyyy")}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-white uppercase bg-emerald-600 sticky top-0 z-10">
                        <tr>
                          <th scope="col" className="px-6 py-4 font-bold tracking-wider">Sales Person</th>
                          <th scope="col" className="px-6 py-4 font-bold tracking-wider text-center">No of Callings</th>
                          <th scope="col" className="px-6 py-4 font-bold tracking-wider text-center">Order Clients</th>
                          <th scope="col" className="px-6 py-4 font-bold tracking-wider text-center">Conversion Ratio</th>
                          <th scope="col" className="px-6 py-4 font-bold tracking-wider text-center">Total Rs Sale</th>
                          <th scope="col" className="px-6 py-4 font-bold tracking-wider text-center">Average Rs Sale</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {dailySalesPerformance.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-8 text-center text-slate-400 font-medium">
                              <div className="flex flex-col items-center justify-center p-4">
                                <div className="text-lg">No data available for today</div>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          dailySalesPerformance.map((row, idx) => {
                            const isTotalRow = row.salesPerson === 'Total';

                            const rowClass = isTotalRow
                              ? "bg-emerald-50 font-bold border-t-2 border-emerald-100" // Light emerald summary row
                              : idx % 2 === 0 ? "bg-white" : "bg-slate-50/50";

                            // Generate avatar initials
                            const initials = row.salesPerson !== 'Total'
                              ? row.salesPerson.split(' ').map((n: any) => n[0]).join('').substring(0, 2).toUpperCase()
                              : 'Σ';

                            // Determine avatar color
                            const avatarColor = idx % 3 === 0 ? "bg-emerald-500" : idx % 3 === 1 ? "bg-teal-500" : "bg-green-500";

                            return (
                              <tr key={idx} className={`${rowClass} hover:bg-emerald-50/80 transition-colors`}>
                                <td className="px-6 py-4 font-medium flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full ${isTotalRow ? 'bg-emerald-600' : avatarColor} flex items-center justify-center text-white text-xs font-bold shadow-sm`}>
                                    {initials}
                                  </div>
                                  {row.salesPerson}
                                </td>
                                <td className="px-6 py-4 text-center">{row.noOfCallings}</td>
                                <td className="px-6 py-4 text-center">{row.orderClients}</td>
                                <td className="px-6 py-4 text-center">
                                  <div className="flex flex-col items-center">
                                    <span className={`${isTotalRow ? 'text-emerald-700' : 'text-slate-700'} font-bold`}>{row.conversionRatio}%</span>
                                    {!isTotalRow && <div className="w-12 h-1 bg-slate-200 rounded-full mt-1 overflow-hidden">
                                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(parseFloat(row.conversionRatio), 100)}%` }}></div>
                                    </div>}
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-center font-mono text-slate-700">
                                  {row.totalRsSale ? Number(row.totalRsSale).toLocaleString() : '0'}
                                </td>
                                <td className="px-6 py-4 text-center font-mono">
                                  <span className={`${parseFloat(row.avgRsSale) > 50 ? 'text-emerald-600 font-bold' : 'text-slate-600'}`}>
                                    {row.avgRsSale}
                                  </span>
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
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

      </div>
    </div>
  )
}

