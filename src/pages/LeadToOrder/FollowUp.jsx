"use client"

import { useState, useEffect, useContext } from "react"
import { Link } from "react-router-dom"
import { SearchIcon, ArrowRightIcon } from "./Icons"
import { useAuth } from "../../context/AuthContext" // Import AuthContext
import { leadToOrderAPI } from "../../services/leadToOrderAPI"
import { Loader2 } from "lucide-react"
import NewFollowUp from "./NewFollowUp"

const slideIn = "animate-in slide-in-from-right duration-300"
const slideOut = "animate-out slide-out-to-right duration-300"
const fadeIn = "animate-in fade-in duration-300"
const fadeOut = "animate-out fade-out duration-300"

function FollowUp() {
  const { user: currentUser, user_access: userType, isAuthenticated } = useAuth() // Get user info and admin function
  const isAdmin = () => userType?.includes('all') || currentUser?.role === 'admin'
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("pending")
  const [pendingFollowUps, setPendingFollowUps] = useState([])
  const [historyFollowUps, setHistoryFollowUps] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterType, setFilterType] = useState("all")
  const [dateFilter, setDateFilter] = useState("all") // New state for date filter
  const [showPopup, setShowPopup] = useState(false)
  const [selectedFollowUp, setSelectedFollowUp] = useState(null)
  const [showFollowUpModal, setShowFollowUpModal] = useState(false)
  const [selectedLeadForFollowUp, setSelectedLeadForFollowUp] = useState(null)
  const [companyFilter, setCompanyFilter] = useState("all")
  const [personFilter, setPersonFilter] = useState("all")
  const [phoneFilter, setPhoneFilter] = useState("all")
  const [visibleColumns, setVisibleColumns] = useState({
    timestamp: true,
    leadNo: true,
    companyName: true,
    customerSay: true,
    status: true,
    enquiryStatus: true,
    receivedDate: true,
    state: true,
    projectName: true,
    salesType: true,
    productDate: true,
    projectValue: true,
    item1: true,
    qty1: true,
    item2: true,
    qty2: true,
    item3: true,
    qty3: true,
    item4: true,
    qty4: true,
    item5: true,
    qty5: true,
    nextAction: true,
    callDate: true,
    callTime: true,
    itemQty: true, // Add this line
  })
  const [showColumnDropdown, setShowColumnDropdown] = useState(false)

  // Helper function to determine priority based on lead source
  const determinePriority = (source) => {
    if (!source) return "Low"

    const sourceLower = source.toLowerCase()
    if (sourceLower.includes("indiamart")) return "High"
    if (sourceLower.includes("website")) return "Medium"
    return "Low"
  }

  const safeItemQtyParse = (itemQty) => {
    if (!itemQty) return [];
    if (typeof itemQty === 'object') return Array.isArray(itemQty) ? itemQty : [];
    try {
      const parsed = JSON.parse(itemQty);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Error parsing itemQty:", e);
      return [];
    }
  };

  // Helper function to format next call time
  const formatNextCallTime = (timeValue) => {
    if (!timeValue) return ""

    try {
      // Check if it's a Date(YYYY,MM,DD,HH,MM,SS) format
      if (typeof timeValue === "string" && timeValue.startsWith("Date(")) {
        // Extract hours and minutes from the Date string
        const timeString = timeValue.substring(5, timeValue.length - 1)
        const [year, month, day, hours, minutes, seconds] = timeString
          .split(",")
          .map((part) => Number.parseInt(part.trim()))

        // Convert to 12-hour format
        const formattedHours = hours % 12 || 12 // Convert to 12-hour format
        const period = hours >= 12 ? "PM" : "AM"

        // Pad minutes with leading zero if needed
        const formattedMinutes = minutes.toString().padStart(2, "0")

        return `${formattedHours}:${formattedMinutes} ${period}`
      }

      // If it's already in HH:MM:SS format
      if (typeof timeValue === "string" && /^\d{2}:\d{2}:\d{2}$/.test(timeValue)) {
        const [hours, minutes] = timeValue.split(":").map(Number)

        // Convert to 12-hour format
        const formattedHours = hours % 12 || 12
        const period = hours >= 12 ? "PM" : "AM"

        // Pad minutes with leading zero if needed
        const formattedMinutes = minutes.toString().padStart(2, "0")

        return `${formattedHours}:${formattedMinutes} ${period}`
      }

      // Fallback to original value if parsing fails
      return timeValue
    } catch (error) {
      console.error("Error formatting time:", error)
      return timeValue
    }
  }

  // Helper function to calculate next call date (3 days after created date)
  const calculateNextCallDate = (createdDate) => {
    if (!createdDate) return ""

    try {
      // Parse the date - assuming format is DD/MM/YYYY
      const parts = createdDate.split("/")
      if (parts.length !== 3) return ""

      const date = new Date(parts[2], parts[1] - 1, parts[0])
      date.setDate(date.getDate() + 3) // Add 3 days for next call

      // Format as YYYY-MM-DD for display
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
    } catch (error) {
      console.error("Error calculating next call date:", error)
      return ""
    }
  }

  // Helper function to format date to DD/MM/YYYY
  const formatDateToDDMMYYYY = (dateValue) => {
    if (!dateValue) return ""

    try {
      // Check if it's a Date object-like string (e.g. "Date(2025,3,22)")
      if (typeof dateValue === "string" && dateValue.startsWith("Date(")) {
        // Extract the parts from Date(YYYY,MM,DD) format
        const dateString = dateValue.substring(5, dateValue.length - 1)
        const [year, month, day] = dateString.split(",").map((part) => Number.parseInt(part.trim()))

        // JavaScript months are 0-indexed, but we need to display them as 1-indexed
        // Also ensure day and month are padded with leading zeros if needed
        return `${day.toString().padStart(2, "0")}/${(month + 1).toString().padStart(2, "0")}/${year}`
      }

      // Handle other date formats if needed
      const date = new Date(dateValue)
      if (!isNaN(date.getTime())) {
        return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()}`
      }

      // If it's already in the correct format, return as is
      return dateValue
    } catch (error) {
      console.error("Error formatting date:", error)
      return dateValue // Return the original value if formatting fails
    }
  }

  // Helper function to parse date from column CL and compare with today
  const getDateFromColumnCL = (dateValue) => {
    if (!dateValue) return null

    try {
      // Check if it's a Date object-like string (e.g. "Date(2025,4,27)")
      if (typeof dateValue === "string" && dateValue.startsWith("Date(")) {
        const dateString = dateValue.substring(5, dateValue.length - 1)
        const [year, month, day] = dateString.split(",").map((part) => Number.parseInt(part.trim()))
        // JavaScript months are 0-indexed
        return new Date(year, month, day)
      }

      // Try to parse as regular date
      const parsedDate = new Date(dateValue)
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate
      }

      return null
    } catch (error) {
      console.error("Error parsing date from column CL:", error)
      return null
    }
  }

  // Add this helper function after the other helper functions (around line 100)
  const formatItemQty = (itemQtyString) => {
    if (!itemQtyString) return ""

    try {
      const items = JSON.parse(itemQtyString)
      return items
        .filter(item => item.name && item.quantity && item.quantity !== "0")
        .map(item => `${item.name} : ${item.quantity}`)
        .join(", ")
    } catch (error) {
      console.error("Error parsing item quantity:", error)
      return itemQtyString // Return original string if parsing fails
    }
  }

  // Helper function to check date filter condition
  // Helper function to check date filter condition
  const checkDateFilter = (followUp, filterType) => {
    if (filterType === "all") return true

    if (activeTab === "pending") {
      // Get the text value from column CL (nextCallDate field)
      const columnCLValue = followUp.nextCallDate
      if (!columnCLValue) return false

      // Convert the column CL value to lowercase for comparison
      const columnCLText = String(columnCLValue).toLowerCase()

      // Match the filter type with the text in column CL
      switch (filterType) {
        case "today":
          return columnCLText.includes("today")
        case "overdue":
          return columnCLText.includes("overdue")
        case "upcoming":
          return columnCLText.includes("upcoming")
        default:
          return true
      }
    } else {
      // History tab filtering
      const nextCallDate = followUp.nextCallDate
      if (!nextCallDate) return false

      try {
        // Parse the date from DD/MM/YYYY format
        const [day, month, year] = nextCallDate.split("/")
        const followUpDate = new Date(year, month - 1, day)
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        switch (filterType) {
          case "today":
            return (
              followUpDate.getDate() === today.getDate() &&
              followUpDate.getMonth() === today.getMonth() &&
              followUpDate.getFullYear() === today.getFullYear()
            )
          case "older":
            return followUpDate < today
          default:
            return true
        }
      } catch (error) {
        console.error("Error parsing date:", error)
        return false
      }
    }
  }
  // Helper function to check if a call is overdue
  const isOverdue = (timestamp) => {
    if (!timestamp) return false
    try {
      const parts = timestamp.split("/")
      if (parts.length !== 3) return false
      const callDate = new Date(parts[2], parts[1] - 1, parts[0])
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return callDate < today
    } catch (e) {
      return false
    }
  }


  useEffect(() => {
    const fetchFollowUpData = async () => {
      try {
        setIsLoading(true);

        // Use centralized API service
        const [pendingResponse, historyResponse] = await Promise.allSettled([
          leadToOrderAPI.getPendingFollowups(),
          leadToOrderAPI.getHistoryFollowups()
        ]);

        // Handle pending response
        if (pendingResponse.status === 'fulfilled') {
          const pendingData = pendingResponse.value?.data;

          // Check if response is HTML
          if (typeof pendingData === 'string' && (pendingData.trim().startsWith('<!DOCTYPE') || pendingData.trim().startsWith('<html'))) {
            console.warn("Backend returned HTML instead of JSON for pending followups. Using empty data.");
            setPendingFollowUps([]);
          } else if (pendingData?.success && Array.isArray(pendingData.data)) {
            const pendingMapped = pendingData.data.map((row) => ({
              id: row.id,
              leadId: row.lead_no,
              companyName: row.company_name,
              personName: row.salesperson_name,
              phoneNumber: row.phone_number,
              leadSource: row.lead_source,
              location: row.location,
              customerSay: row.customer_say,
              enquiryStatus: row.enquiry_status,
              timestamp: formatDateToDDMMYYYY(row.planned),
              createdAt: formatDateToDDMMYYYY(row.created_at),
              nextCallDate: formatDateToDDMMYYYY(row.next_call_date),
              nextCallTime: row.next_call_time,
              priority: determinePriority(row.lead_source),
              assignedTo: row.sc_name,
              itemQty: row.item_qty
            }));
            setPendingFollowUps(pendingMapped);
          } else {
            setPendingFollowUps([]);
          }
        } else {
          console.warn("Error fetching pending followups:", pendingResponse.reason);
          setPendingFollowUps([]);
        }

        // Handle history response
        if (historyResponse.status === 'fulfilled') {
          const historyData = historyResponse.value?.data;

          // Check if response is HTML
          if (typeof historyData === 'string' && (historyData.trim().startsWith('<!DOCTYPE') || historyData.trim().startsWith('<html'))) {
            console.warn("Backend returned HTML instead of JSON for history followups. Using empty data.");
            setHistoryFollowUps([]);
          } else if (historyData?.success && Array.isArray(historyData.data)) {
            const historyMapped = historyData.data.map((row) => ({
              timestamp: formatDateToDDMMYYYY(row.created_at),
              leadNo: row.lead_no,
              companyName: row.company_name,
              customerSay: row.customer_say,
              status: row.status,
              enquiryReceivedStatus: row.enquiry_received_status,
              enquiryReceivedDate: formatDateToDDMMYYYY(row.enquiry_received_date),
              enquiryState: row.enquiry_approach,
              projectApproxValue: row.project_approx_value,
              itemQty: row.item_qty,
              totalQty: row.total_qty,
              nextAction: row.next_action,
              nextCallDate: formatDateToDDMMYYYY(row.next_call_date),
              nextCallTime: row.next_call_time,
              phoneNumber: row.phone_number,
              salesPersonName: row.salesperson_name,
              location: row.location,
              assignedTo: row.sc_name
            }));
            setHistoryFollowUps(historyMapped);
          } else {
            setHistoryFollowUps([]);
          }
        } else {
          console.warn("Error fetching history followups:", historyResponse.reason);
          setHistoryFollowUps([]);
        }

      } catch (error) {
        console.error("API Fetch Error:", error);
        setPendingFollowUps([]);
        setHistoryFollowUps([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (currentUser) {
      fetchFollowUpData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, userType, currentUser?.role]);

  // Add this function or modify the existing formatDateToDDMMYYYY function
  const formatPopupDate = (dateValue) => {
    if (!dateValue) return ""

    try {
      // Check if it's a Date object-like string (e.g. "Date(2025,4,3)")
      if (typeof dateValue === "string" && dateValue.startsWith("Date(")) {
        // Extract the parts from Date(YYYY,MM,DD) format
        const dateString = dateValue.substring(5, dateValue.length - 1)
        const [year, month, day] = dateString.split(",").map((part) => Number.parseInt(part.trim()))

        // JavaScript months are 0-indexed, but we need to display them as 1-indexed
        // Also ensure day and month are padded with leading zeros if needed
        return `${day.toString().padStart(2, "0")}/${(month + 1).toString().padStart(2, "0")}/${year}`
      }

      // If it's already in the correct format, return as is
      return dateValue
    } catch (error) {
      console.error("Error formatting popup date:", error)
      return dateValue // Return the original value if formatting fails
    }
  }

  // Filter function for search in both sections
  const filteredPendingFollowUps = pendingFollowUps.filter((followUp) => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch =
      searchTerm === "" ||
      (followUp.companyName && followUp.companyName.toLowerCase().includes(searchLower)) ||
      (followUp.leadId && followUp.leadId.toLowerCase().includes(searchLower)) ||
      (followUp.personName && followUp.personName.toLowerCase().includes(searchLower)) ||
      (followUp.phoneNumber && followUp.phoneNumber.toString().toLowerCase().includes(searchLower)) ||
      (followUp.leadSource && followUp.leadSource.toLowerCase().includes(searchLower)) ||
      (followUp.location && followUp.location.toLowerCase().includes(searchLower)) ||
      (followUp.customerSay && followUp.customerSay.toLowerCase().includes(searchLower)) ||
      (followUp.enquiryStatus && followUp.enquiryStatus.toLowerCase().includes(searchLower)) ||
      (followUp.assignedTo && followUp.assignedTo.toLowerCase().includes(searchLower))

    // Apply filter type for Column R
    const matchesFilterType = (() => {
      if (filterType === "first") {
        return followUp.enquiryStatus === "" || followUp.enquiryStatus === null
      } else if (filterType === "multi") {
        return followUp.enquiryStatus === "expected"
      } else {
        return true
      }
    })()

    // Apply date filter based on column CL
    const matchesDateFilter = checkDateFilter(followUp, dateFilter)

    // Apply company filter
    const matchesCompanyFilter = companyFilter === "all" || followUp.companyName === companyFilter

    // Apply person filter
    const matchesPersonFilter = personFilter === "all" || followUp.personName === personFilter

    // Apply phone filter
    const phoneToCompare = followUp.phoneNumber ? followUp.phoneNumber.toString().trim() : ""
    const matchesPhoneFilter = phoneFilter === "all" || phoneToCompare === phoneFilter.toString().trim()

    return (
      matchesSearch &&
      matchesFilterType &&
      matchesDateFilter &&
      matchesCompanyFilter &&
      matchesPersonFilter &&
      matchesPhoneFilter
    )
  })

  useEffect(() => {
    // Reset specific filters when switching tabs
    if (activeTab !== "pending") {
      setCompanyFilter("all")
      setPersonFilter("all")
      setPhoneFilter("all")
    }
  }, [activeTab])

  const filteredHistoryFollowUps = historyFollowUps.filter((followUp) => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch =
      searchTerm === "" ||
      (followUp.leadNo && followUp.leadNo.toString().toLowerCase().includes(searchLower)) ||
      (followUp.customerSay && followUp.customerSay.toLowerCase().includes(searchLower)) ||
      (followUp.status && followUp.status.toLowerCase().includes(searchLower)) ||
      (followUp.enquiryReceivedStatus && followUp.enquiryReceivedStatus.toLowerCase().includes(searchLower)) ||
      (followUp.enquiryReceivedDate && followUp.enquiryReceivedDate.toLowerCase().includes(searchLower)) ||
      (followUp.enquiryState && followUp.enquiryState.toLowerCase().includes(searchLower)) ||
      (followUp.projectName && followUp.projectName.toLowerCase().includes(searchLower)) ||
      (followUp.salesType && followUp.salesType.toLowerCase().includes(searchLower)) ||
      (followUp.requiredProductDate && followUp.requiredProductDate.toLowerCase().includes(searchLower)) ||
      (followUp.projectApproxValue && followUp.projectApproxValue.toString().toLowerCase().includes(searchLower)) ||
      (followUp.itemName1 && followUp.itemName1.toLowerCase().includes(searchLower)) ||
      (followUp.itemName2 && followUp.itemName2.toLowerCase().includes(searchLower)) ||
      (followUp.itemName3 && followUp.itemName3.toLowerCase().includes(searchLower)) ||
      (followUp.itemName4 && followUp.itemName4.toLowerCase().includes(searchLower)) ||
      (followUp.itemName5 && followUp.itemName5.toLowerCase().includes(searchLower)) ||
      (followUp.nextAction && followUp.nextAction.toLowerCase().includes(searchLower)) ||
      (followUp.nextCallDate && followUp.nextCallDate.toLowerCase().includes(searchLower)) ||
      (followUp.nextCallTime && followUp.nextCallTime.toLowerCase().includes(searchLower))

    // Apply filter type for history - check column E (enquiryReceivedStatus)
    const matchesFilterType = (() => {
      if (filterType === "first") {
        return (
          followUp.enquiryReceivedStatus === "" ||
          followUp.enquiryReceivedStatus === null ||
          followUp.enquiryReceivedStatus === "New"
        )
      } else if (filterType === "multi") {
        return followUp.enquiryReceivedStatus === "Expected" || followUp.enquiryReceivedStatus === "expected"
      } else {
        return true
      }
    })()

    // Apply date filter
    const matchesDateFilter = checkDateFilter(followUp, dateFilter)

    return matchesSearch && matchesFilterType && matchesDateFilter
  })

  // Add this function inside your FollowUp component
  const calculateDateFilterCounts = () => {
    const counts = {
      today: 0,
      overdue: 0,
      upcoming: 0,
      older: 0,
    }

    // Calculate counts for pending follow-ups
    pendingFollowUps.forEach((followUp) => {
      const columnCLValue = followUp.nextCallDate
      if (!columnCLValue) return

      const columnCLText = String(columnCLValue).toLowerCase()

      if (columnCLText.includes("today")) counts.today++
      if (columnCLText.includes("overdue")) counts.overdue++
      if (columnCLText.includes("upcoming")) counts.upcoming++
    })

    // Calculate counts for history follow-ups
    historyFollowUps.forEach((followUp) => {
      const nextCallDate = followUp.nextCallDate
      if (!nextCallDate) return

      try {
        const [day, month, year] = nextCallDate.split("/")
        const followUpDate = new Date(year, month - 1, day)
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        if (
          followUpDate.getDate() === today.getDate() &&
          followUpDate.getMonth() === today.getMonth() &&
          followUpDate.getFullYear() === today.getFullYear()
        ) {
          counts.today++
        } else if (followUpDate < today) {
          counts.older++
        }
      } catch (error) {
        console.error("Error parsing date:", error)
      }
    })

    return counts
  }

  const handleColumnToggle = (columnKey) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [columnKey]: !prev[columnKey],
    }))
  }

  const handleSelectAll = () => {
    const allSelected = Object.values(visibleColumns).every(Boolean)
    const newState = Object.fromEntries(Object.keys(visibleColumns).map((key) => [key, !allSelected]))
    setVisibleColumns(newState)
  }

  const columnOptions = [
    { key: "timestamp", label: "Timestamp" },
    { key: "leadNo", label: "Lead No." },
    { key: "companyName", label: "Company Name" },
    { key: "customerSay", label: "Customer Say" },
    { key: "status", label: "Status" },
    { key: "enquiryStatus", label: "Enquiry Status" },
    { key: "receivedDate", label: "Received Date" },
    { key: "state", label: "State" },
    { key: "projectName", label: "Project Name" },
    { key: "salesType", label: "Sales Type" },
    { key: "productDate", label: "Product Date" },
    { key: "projectValue", label: "Project Value" },
    { key: "item1", label: "Item 1" },
    { key: "qty1", label: "Qty 1" },
    { key: "item2", label: "Item 2" },
    { key: "qty2", label: "Qty 2" },
    { key: "item3", label: "Item 3" },
    { key: "qty3", label: "Qty 3" },
    { key: "item4", label: "Item 4" },
    { key: "qty4", label: "Qty 4" },
    { key: "item5", label: "Item 5" },
    { key: "qty5", label: "Qty 5" },
    { key: "nextAction", label: "Next Action" },
    { key: "callDate", label: "Call Date" },
    { key: "callTime", label: "Call Time" },
    { key: "itemQty", label: "Item/Qty" }, // Add this line
  ]


  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showColumnDropdown && !event.target.closest(".relative")) {
        setShowColumnDropdown(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showColumnDropdown])

  // Calculate counts for date filters
  const dateFilterCounts = (() => {
    const counts = { today: 0, overdue: 0, upcoming: 0 }

    pendingFollowUps.forEach(f => {
      if (isOverdue(f.timestamp)) counts.overdue++
      else if (f.timestamp === formatDateToDDMMYYYY(new Date())) counts.today++
      else counts.upcoming++
    })

    return counts
  })()

  // Keep sidebar hidden when modal is open
  useEffect(() => {
    if (showFollowUpModal) {
      document.body.style.overflow = 'hidden'
      const navContainer = document.getElementById('main-nav-container')
      if (navContainer) {
        navContainer.style.display = 'none'
      }
      const sidebar = document.querySelector('aside')
      if (sidebar) {
        sidebar.style.display = 'none'
      }
    } else {
      document.body.style.overflow = 'auto'
      const navContainer = document.getElementById('main-nav-container')
      if (navContainer) {
        navContainer.style.display = 'block'
      }
      const sidebar = document.querySelector('aside')
      if (sidebar) {
        sidebar.style.display = ''
      }
    }
  }, [showFollowUpModal])

  return (
    <div className="min-h-screen bg-slate-50/50 py-4 sm:py-6 lg:py-8 px-4 sm:px-6">
      {/* Header Section */}
      <div className="max-w-[1600px] mx-auto mb-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent tracking-tight">
              Follow-Up Manager
            </h1>
            <p className="text-slate-500 mt-1 font-medium text-sm sm:text-base flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {isLoading ? "Refreshing records..." : `${pendingFollowUps.length + historyFollowUps.length} active leads tracked`}
            </p>
            {isAdmin() && <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-2 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> Admin Access Enabled</p>}
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Search box refined */}
            <div className="relative flex-1 lg:flex-none lg:w-80 group">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                <SearchIcon className="h-4 w-4" />
              </div>
              <input
                type="text"
                placeholder="Search leads, companies..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium text-sm text-slate-700 shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Tab System refined */}
        <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-200">
          <div className="flex items-center">
            <button
              onClick={() => setActiveTab("pending")}
              className={`px-6 py-3 text-sm font-bold transition-all border-b-2 relative ${activeTab === "pending"
                ? "text-emerald-600 border-emerald-600 bg-emerald-50/50"
                : "text-slate-400 border-transparent hover:text-slate-600"
                }`}
            >
              Pending Calls
              {activeTab === "pending" && <span className="ml-2 px-2 py-0.5 bg-emerald-600 text-white text-[10px] rounded-full">{filteredPendingFollowUps.length}</span>}
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-6 py-3 text-sm font-bold transition-all border-b-2 relative ${activeTab === "history"
                ? "text-emerald-600 border-emerald-600 bg-emerald-50/50"
                : "text-slate-400 border-transparent hover:text-slate-600"
                }`}
            >
              Follow-up History
              {activeTab === "history" && <span className="ml-2 px-2 py-0.5 bg-emerald-600 text-white text-[10px] rounded-full">{filteredHistoryFollowUps.length}</span>}
            </button>
          </div>

          <div className="flex items-center gap-2 pb-2 mr-2">
            <button
              onClick={() => setShowColumnDropdown(!showColumnDropdown)}
              className="flex items-center gap-2 px-4 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" /></svg>
              Columns
            </button>
          </div>
        </div>

        {/* Filter Bar refined */}
        <div className="mt-6 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm relative z-30">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Enquiry Status</label>
              <select
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="first">New / First Calls</option>
                <option value="multi">Follow-up Expected</option>
              </select>
            </div>

            {/* Date Schedule Filter */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Call Schedule</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setDateFilter("all")}
                  className={`flex-1 px-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${dateFilter === "all" ? "bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-100" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                    }`}
                >
                  All
                </button>
                <button
                  onClick={() => setDateFilter("today")}
                  className={`flex-1 px-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${dateFilter === "today" ? "bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-100" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                    }`}
                >
                  Today ({dateFilterCounts.today})
                </button>
                <button
                  onClick={() => setDateFilter("overdue")}
                  className={`flex-1 px-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${dateFilter === "overdue" ? "bg-red-500 text-white border-red-500 shadow-lg shadow-red-100" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                    }`}
                >
                  Overdue ({dateFilterCounts.overdue})
                </button>
                <button
                  onClick={() => setDateFilter("upcoming")}
                  className={`flex-1 px-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${dateFilter === "upcoming" ? "bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-100" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                    }`}
                >
                  Future
                </button>
              </div>
            </div>

            {/* Entity Filters (Only for Pending) */}
            {activeTab === "pending" && (
              <>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">By Company</label>
                  <select
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    value={companyFilter}
                    onChange={(e) => setCompanyFilter(e.target.value)}
                  >
                    <option value="all">All Companies</option>
                    {[...new Set(pendingFollowUps.map((f) => f.companyName))].filter(Boolean).sort().map((company) => (
                      <option key={company} value={company}>{company}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">By Contact</label>
                  <select
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    value={personFilter}
                    onChange={(e) => setPersonFilter(e.target.value)}
                  >
                    <option value="all">All Persons</option>
                    {[...new Set(pendingFollowUps.map((f) => f.personName))].filter(Boolean).sort().map((person) => (
                      <option key={person} value={person}>{person}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Table Container refined */}
      <div className="max-w-[1600px] mx-auto bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden relative z-10 transition-all">
        <div className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 px-4">
              <div className="relative flex h-20 w-20">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-20"></span>
                <Loader2 className="h-10 w-10 text-emerald-600 absolute inset-0 m-auto animate-spin" />
              </div>
              <h3 className="text-xl font-black text-slate-800 mt-6 uppercase tracking-widest">Optimizing Workspace...</h3>
              <p className="text-slate-500 font-medium text-sm mt-2">Connecting to secure leads database</p>
            </div>
          ) : (
            <div className="relative">
              <div className="overflow-x-auto custom-scrollbar">
                {activeTab === "pending" ? (
                  <table className="w-full text-left border-collapse min-w-[1200px]">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-800">
                        <th className="sticky left-0 z-20 bg-slate-900 px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-800">Actions</th>
                        <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Lead No</th>
                        <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Call Date</th>
                        <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Company</th>
                        <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Contact</th>
                        <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Details</th>
                        <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredPendingFollowUps.length > 0 ? (
                        filteredPendingFollowUps.map((followUp, idx) => (
                          <tr key={idx} className="group hover:bg-emerald-50/30 transition-all duration-200">
                            <td className="sticky left-0 z-10 bg-white group-hover:bg-emerald-50/30 px-6 py-4 border-r border-slate-100 transition-colors">
                              <button
                                onClick={() => {
                                  setSelectedLeadForFollowUp(followUp.leadId)
                                  setShowFollowUpModal(true)
                                }}
                                className="px-4 py-2 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-lg shadow-emerald-200 hover:bg-emerald-700 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 whitespace-nowrap"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                Call Now
                              </button>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-xs font-black font-mono text-slate-700 bg-slate-100 px-2 py-1 rounded">{followUp.leadId}</span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="text-xs font-black text-slate-700">{followUp.timestamp}</span>
                                <span className={`text-[10px] font-bold ${isOverdue(followUp.timestamp) ? "text-red-500 animate-pulse" : "text-slate-400"}`}>
                                  {isOverdue(followUp.timestamp) ? "● Overdue" : "● Scheduled"}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="text-sm font-black text-slate-800">{followUp.companyName}</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{followUp.location}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-slate-700">{followUp.personName}</span>
                                <a href={`tel:${followUp.phoneNumber}`} className="text-xs font-black text-emerald-600 hover:underline">{followUp.phoneNumber}</a>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-xs text-slate-500 font-medium max-w-xs line-clamp-2 italic leading-relaxed">"{followUp.customerSay}"</p>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-indigo-100 shadow-sm">{followUp.leadSource}</span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="py-20 text-center">
                            <div className="flex flex-col items-center opacity-40">
                              <svg className="w-16 h-16 text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                              <p className="text-sm font-black uppercase tracking-widest text-slate-400">Database Empty</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full text-left border-collapse min-w-[2000px]">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-800">
                        <th className="sticky left-0 z-20 bg-slate-900 px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-800">Action</th>
                        {columnOptions.filter(col => visibleColumns[col.key]).map(col => (
                          <th key={col.key} className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">{col.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredHistoryFollowUps.length > 0 ? (
                        filteredHistoryFollowUps.map((followUp, idx) => (
                          <tr key={idx} className="group hover:bg-slate-50 transition-colors">
                            <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 px-6 py-4 border-r border-slate-100 transition-colors">
                              <button
                                onClick={() => {
                                  setSelectedFollowUp(followUp)
                                  setShowPopup(true)
                                }}
                                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                              >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                              </button>
                            </td>
                            {columnOptions.filter(col => visibleColumns[col.key]).map(col => (
                              <td key={col.key} className="px-6 py-4">
                                {col.key === 'status' ? (
                                  <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border ${followUp.status === 'Completed' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                    followUp.status === 'Pending' ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-red-50 text-red-700 border-red-100"
                                    }`}>
                                    {followUp.status}
                                  </span>
                                ) : col.key === 'itemQty' ? (
                                  <div className="flex flex-wrap gap-1">
                                    {safeItemQtyParse(followUp.itemQty).filter(i => i.name && i.quantity !== "0").slice(0, 2).map((i, k) => (
                                      <span key={k} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-bold rounded">{i.name} ({i.quantity})</span>
                                    ))}
                                    {safeItemQtyParse(followUp.itemQty).length > 2 && <span className="text-[9px] font-bold text-slate-400">+{safeItemQtyParse(followUp.itemQty).length - 2} more</span>}
                                  </div>
                                ) : (
                                  <span className="text-xs font-bold text-slate-700">{followUp[col.key === 'leadNo' ? 'leadNo' : col.key] || '-'}</span>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={columnOptions.filter(col => visibleColumns[col.key]).length + 1} className="py-20 text-center">
                            <p className="text-sm font-black uppercase tracking-widest text-slate-400">No History Records</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail Popups refined */}
      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col ${slideIn}`}>
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-teal-600 to-emerald-600 text-white">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight">Lead History Detail</h3>
                <p className="text-slate-100 text-xs font-bold font-mono mt-1 opacity-80">Reference: {selectedFollowUp?.leadNo}</p>
              </div>
              <button onClick={() => setShowPopup(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/50">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Company Name</p>
                  <p className="text-sm font-black text-slate-800">{selectedFollowUp?.companyName}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Contact Details</p>
                  <p className="text-sm font-bold text-emerald-600">{selectedFollowUp?.phoneNumber}</p>
                  <p className="text-xs text-slate-500 font-medium">{selectedFollowUp?.salesPersonName}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Location</p>
                  <p className="text-sm font-bold text-slate-700">{selectedFollowUp?.location}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Detailed Feedback</p>
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 italic text-sm text-slate-600 leading-relaxed font-medium">
                    "{selectedFollowUp?.customerSay}"
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Item Breakdown</p>
                  <div className="flex flex-wrap gap-2">
                    {safeItemQtyParse(selectedFollowUp?.itemQty).filter(i => i.name && i.quantity && i.quantity !== "0").map((item, idx) => (
                      <div key={idx} className="px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100 flex items-center gap-3">
                        <span className="text-xs font-black">{item.name}</span>
                        <span className="w-px h-3 bg-indigo-200"></span>
                        <span className="text-xs font-black bg-white px-2 py-0.5 rounded shadow-sm">{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 bg-white flex justify-end">
              <button onClick={() => setShowPopup(false)} className="px-8 py-2.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all">Close Viewer</button>
            </div>
          </div>
        </div>
      )}

      {/* New Follow-up Modal refined */}
      {showFollowUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center py-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[95vh] overflow-hidden flex flex-col ${slideIn} mx-4`}>
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-800 to-slate-900 text-white">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight">Process Lead Follow-up</h3>
                <p className="text-slate-400 text-xs font-bold font-mono mt-1 opacity-80">Enquiry: {selectedLeadForFollowUp?.leadId || selectedLeadForFollowUp}</p>
              </div>
              <button
                onClick={() => setShowFollowUpModal(false)}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <NewFollowUp
                leadData={selectedLeadForFollowUp}
                leadId={selectedLeadForFollowUp?.leadId || selectedLeadForFollowUp}
                onClose={() => {
                  setShowFollowUpModal(false)
                  window.location.reload()
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FollowUp
