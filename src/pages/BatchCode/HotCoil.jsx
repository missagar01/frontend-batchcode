"use client"
import { useState, useEffect, useCallback, useMemo } from "react"
import { useLocation } from "react-router"
import { CheckCircle2, X, Search, History, ArrowLeft, Edit, Save, Camera, AlertCircle } from "lucide-react"
import * as batchcodeAPI from "../../api/batchcodeApi"
import { useAuth } from "../../context/AuthContext"

// Debounce hook for search optimization
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

function HotCoilPage() {
  const location = useLocation()
  const { user } = useAuth()
  const [pendingSMSData, setPendingSMSData] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [historyData, setHistoryData] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [userRole, setUserRole] = useState("")
  const [username, setUsername] = useState("")
  const [popupMessage, setPopupMessage] = useState("")
  const [popupType, setPopupType] = useState("")
  const [showPopup, setShowPopup] = useState(false)
  const [successUniqueCode, setSuccessUniqueCode] = useState("")
  const [prefillSMSCode, setPrefillSMSCode] = useState("")
  const [hasAutoOpened, setHasAutoOpened] = useState(false)

  // State for process form
  const [showProcessForm, setShowProcessForm] = useState(false)
  const [selectedRow, setSelectedRow] = useState(null)
  const [processFormData, setProcessFormData] = useState({
    submission_type: "Hot Coil",
    sms_short_code: "",
    size: "",
    mill_incharge: "",
    quality_supervisor: "",
    quality_supervisor_other: "",
    electrical_dc_operator: "",
    strand1_temperature: "",
    strand2_temperature: "",
    shift_supervisor: "",
    remarks: ""
  })
  const [imagePreview, setImagePreview] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [errors, setErrors] = useState({})

  const requiredFieldLabels = {
    submission_type: "Submission Type / सबमिशन प्रकार",
    sms_short_code: "SMS Short Code / एसएमएस शॉर्ट कोड",
    size: "Size / आकार",
    mill_incharge: "Mill Incharge / मिल इंचार्ज",
    quality_supervisor: "Quality Supervisor / गुणवत्ता पर्यवेक्षक",
    electrical_dc_operator: "Electrical DC Operator / इलेक्ट्रिकल डीसी ऑपरेटर",
    strand1_temperature: "Strand1 Temperature / स्ट्रैंड1 तापमान",
    strand2_temperature: "Strand2 Temperature / स्ट्रैंड2 तापमान",
    shift_supervisor: "Shift Supervisor / शिफ्ट पर्यवेक्षक"
  }

  // Debounced search term for better performance
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // Auto-hide popup only for warnings (not for success - user must click OK)
  useEffect(() => {
    if (showPopup && popupType === "warning") {
      const timer = setTimeout(() => {
        setShowPopup(false)
        setPopupMessage("")
        setPopupType("")
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [showPopup, popupType])

  const handleClosePopup = () => {
    setShowPopup(false)
    setPopupMessage("")
    setPopupType("")
    setSuccessUniqueCode("")
  }

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const codeFromQuery = params.get("sms_short_code") || params.get("smsCode") || params.get("code")

    if (codeFromQuery) {
      setPrefillSMSCode(codeFromQuery)
      setSearchTerm(codeFromQuery)
      setShowHistory(false)
      setHasAutoOpened(false)
    }
  }, [location.search])

  const showPopupMessage = (message, type) => {
    setPopupMessage(message)
    setPopupType(type)
    setShowPopup(true)
  }

  useEffect(() => {
    // Use AuthContext user data
    const role = user?.role || user?.userType || sessionStorage.getItem("role") || ""
    const user_name = user?.username || user?.user_name || sessionStorage.getItem("username") || ""
    setUserRole(role)
    setUsername(user_name)
  }, [user])

  // Fetch pending SMS data (SMS Register records that don't have Hot Coil entries)
  const fetchPendingSMSData = useCallback(async () => {
    try {
      setLoading(true)

      let smsData = [];
      let existingEntries = [];

      // Try to fetch SMS Register data - handle 500 errors silently
      try {
        const smsResponse = await batchcodeAPI.getSMSRegisterHistory().catch((err) => {
          // Silently handle 500 errors - don't log to console
          const status = err && typeof err === 'object' && 'response' in err
            ? (err).response?.status
            : null;
          // Only log non-500 errors
          if (status && status !== 500) {
            console.error("Error fetching SMS Register:", err);
          }
          return { data: [] }; // Return empty data on error
        });

        // Handle different response structures
        if (Array.isArray(smsResponse.data)) {
          smsData = smsResponse.data;
        } else if (smsResponse.data && Array.isArray(smsResponse.data.data)) {
          smsData = smsResponse.data.data;
        } else if (smsResponse.data && smsResponse.data.success && Array.isArray(smsResponse.data.data)) {
          smsData = smsResponse.data.data;
        }
      } catch (smsError) {
        // Silently handle SMS Register errors
        smsData = [];
      }

      // Try to fetch Hot Coil history - handle errors gracefully
      try {
        const hotCoilResponse = await batchcodeAPI.getHotCoilHistory().catch((err) => {
          const status = err && typeof err === 'object' && 'response' in err
            ? (err).response?.status
            : null;
          // Only log non-500 errors
          if (status && status !== 500) {
            console.error("Error fetching Hot Coil history:", err);
          }
          return { data: [] }; // Return empty data on error
        });

        // Handle different response structures for Hot Coil data
        if (Array.isArray(hotCoilResponse.data)) {
          existingEntries = hotCoilResponse.data;
        } else if (hotCoilResponse.data && Array.isArray(hotCoilResponse.data.data)) {
          existingEntries = hotCoilResponse.data.data;
        } else if (hotCoilResponse.data && hotCoilResponse.data.success && Array.isArray(hotCoilResponse.data.data)) {
          existingEntries = hotCoilResponse.data.data;
        }
      } catch (hotCoilError) {
        // Silently handle Hot Coil errors
        existingEntries = [];
      }

      // Get all SMS short codes that already have Hot Coil entries
      const processedShortCodes = new Set(
        existingEntries
          .map((hotCoilEntry) => hotCoilEntry.sms_short_code)
          .filter((code) => code) // Remove null/undefined
      )

      // Filter SMS data to only show records that don't have Hot Coil entries
      const pendingData = smsData.filter((smsRecord) => {
        // Generate short code for SMS record
        const smsShortCode = smsRecord.unique_code || generateShortCode(smsRecord)

        // Check if this SMS short code exists in Hot Coil entries
        const isProcessed = processedShortCodes.has(smsShortCode)

        return !isProcessed
      })

      setPendingSMSData(pendingData)
      setLoading(false)
    } catch (error) {
      // Final catch - only log non-500 errors
      const status = error && typeof error === 'object' && 'response' in error
        ? (error).response?.status
        : null;
      if (status && status !== 500) {
        console.error("Error in fetchPendingSMSData:", error);
      }
      setPendingSMSData([])
      setLoading(false)
    }
  }, [])

  // Fetch Hot Coil history data
  const fetchHistoryData = useCallback(async () => {
    try {
      setLoading(true)

      const response = await batchcodeAPI.getHotCoilHistory().catch((err) => {
        // Silently handle 500 errors - don't log to console
        const status = err && typeof err === 'object' && 'response' in err
          ? (err).response?.status
          : null;
        // Only log non-500 errors
        if (status && status !== 500) {
          console.error("Error fetching Hot Coil history:", err);
        }
        return { data: [] }; // Return empty data on error
      });

      let data = [];

      // Handle different response structures
      if (Array.isArray(response.data)) {
        data = response.data;
      } else if (response.data && Array.isArray(response.data.data)) {
        data = response.data.data;
      } else if (response.data && response.data.success && Array.isArray(response.data.data)) {
        data = response.data.data;
      } else if (response.data && typeof response.data === 'object') {
        // If it's a single object, wrap it in array
        data = [response.data];
      } else {
        data = [];
      }

      setHistoryData(data)
      setLoading(false)
    } catch (error) {
      // Final catch - only log non-500 errors
      const status = error && typeof error === 'object' && 'response' in error
        ? (error).response?.status
        : null;
      if (status && status !== 500) {
        console.error("Error in fetchHistoryData:", error);
      }
      setHistoryData([]) // Set empty array on error
      setLoading(false)
    }
  }, [])

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setSelectedFile(null)
    setImagePreview(null)
  }

  // Handle process button click for pending SMS records
  const handleProcessClick = useCallback((smsRecord) => {
    setSelectedRow(smsRecord)

    // Generate short code for SMS record
    const shortCode = smsRecord.unique_code || generateShortCode(smsRecord)

    // Pre-fill form with SMS data
    setProcessFormData({
      submission_type: "Hot Coil",
      sms_short_code: shortCode,
      size: "",
      mill_incharge: "",
      quality_supervisor: "",
      quality_supervisor_other: "",
      electrical_dc_operator: "",
      strand1_temperature: "",
      strand2_temperature: "",
      shift_supervisor: username || "",
      remarks: ""
    })
    setImagePreview(null)
    setSelectedFile(null)
    setShowProcessForm(true)
  }, [username])

  // Handle process form input changes
  const handleProcessFormChange = useCallback((field, value) => {
    setProcessFormData(prev => ({
      ...prev,
      [field]: value
    }))
    // Clear error when user interacts
    setErrors(prev => ({
      ...prev,
      [field]: "",
      quality_supervisor_other: field === "quality_supervisor" && value !== "Other" ? "" : prev.quality_supervisor_other
    }))
  }, [])

  // Form validation
  const validateForm = () => {
    const newErrors = {}
    const requiredFields = [
      'submission_type', 'sms_short_code', 'size', 'mill_incharge', 'quality_supervisor',
      'electrical_dc_operator', 'strand1_temperature', 'strand2_temperature', 'shift_supervisor'
    ]

    requiredFields.forEach(field => {
      if (!processFormData[field]) {
        newErrors[field] = `${requiredFieldLabels[field] || field} is required`
      }
    })

    // Handle "Other" quality supervisor
    if (processFormData.quality_supervisor === "Other" && !processFormData.quality_supervisor_other) {
      newErrors.quality_supervisor_other = "Please specify the quality supervisor name"
    }

    setErrors(newErrors)
    return {
      isValid: Object.keys(newErrors).length === 0,
      errors: newErrors
    }
  }

  const handleProcessSubmit = useCallback(async () => {
    const { isValid, errors: validationErrors } = validateForm()

    if (!isValid) {
      const firstErrorField = Object.keys(validationErrors)[0]
      const label = requiredFieldLabels[firstErrorField] || "Required fields"
      showPopupMessage(`Please fill: ${label}`, "warning")
      return
    }

    setIsSubmitting(true)
    try {
      // Prepare FormData according to API requirements
      const formData = new FormData()

      // Add all form fields to FormData
      formData.append('submission_type', processFormData.submission_type)
      formData.append('sms_short_code', processFormData.sms_short_code)
      formData.append('size', processFormData.size)
      formData.append('mill_incharge', processFormData.mill_incharge)
      formData.append('quality_supervisor', processFormData.quality_supervisor === "Other"
        ? processFormData.quality_supervisor_other
        : processFormData.quality_supervisor)
      formData.append('electrical_dc_operator', processFormData.electrical_dc_operator)
      formData.append('strand1_temperature', processFormData.strand1_temperature)
      formData.append('strand2_temperature', processFormData.strand2_temperature)
      formData.append('shift_supervisor', processFormData.shift_supervisor)
      if (processFormData.remarks) {
        formData.append('remarks', processFormData.remarks)
      }
      if (selectedFile) {
        formData.append('picture', selectedFile)
      }

      const response = await batchcodeAPI.submitHotCoil(formData)

      if (response.data.success) {
        // Extract unique_code from response - try multiple possible locations
        const uniqueCode = response.data.data?.unique_code
          || response.data?.data?.unique_code
          || response.data?.unique_code
          || processFormData.sms_short_code
          || ""
        setSuccessUniqueCode(uniqueCode)
        showPopupMessage("Hot Coil data submitted successfully! / हॉट कॉइल डेटा सफलतापूर्वक जमा किया गया!", "success")
        setShowProcessForm(false)

        // Refresh BOTH tabs data to ensure consistency
        await Promise.all([
          fetchHistoryData(),
          fetchPendingSMSData()
        ])
      }
    } catch (error) {
      console.error("Submission error details:", error.response?.data)
      showPopupMessage(
        error.response?.data?.message || "Submission failed. Check console for details. / सबमिशन विफल। विवरण के लिए कंसोल जांचें।",
        "warning"
      )
    } finally {
      setIsSubmitting(false)
    }
  }, [processFormData, fetchHistoryData, fetchPendingSMSData, selectedFile])

  // Close process form
  const handleCloseProcessForm = useCallback(() => {
    setShowProcessForm(false)
    setSelectedRow(null)
    setProcessFormData({
      submission_type: "Hot Coil",
      sms_short_code: "",
      size: "",
      mill_incharge: "",
      quality_supervisor: "",
      quality_supervisor_other: "",
      electrical_dc_operator: "",
      strand1_temperature: "",
      strand2_temperature: "",
      shift_supervisor: "",
      remarks: ""
    })
    setImagePreview(null)
    setSelectedFile(null)
  }, [])

  // Toggle between pending and history views
  const toggleView = useCallback(() => {
    setShowHistory(prev => !prev)
    setSearchTerm("") // Clear search when switching views
  }, [])

  // Fetch appropriate data when view changes
  useEffect(() => {
    if (showHistory) {
      fetchHistoryData()
    } else {
      fetchPendingSMSData()
    }

    // Auto-sync every 8 seconds (IPL style)
    const interval = setInterval(() => {
      if (showHistory) {
        fetchHistoryData()
      } else {
        fetchPendingSMSData()
      }
    }, 8000)

    return () => clearInterval(interval)
  }, [showHistory, fetchHistoryData, fetchPendingSMSData])

  useEffect(() => {
    if (!prefillSMSCode || hasAutoOpened || !pendingSMSData.length) return

    const match = pendingSMSData.find((record) => {
      const code = (record.unique_code || generateShortCode(record) || "").toString().toLowerCase()
      return code === prefillSMSCode.toLowerCase()
    })

    if (match) {
      handleProcessClick(match)
      setHasAutoOpened(true)
    }
  }, [prefillSMSCode, pendingSMSData, handleProcessClick, hasAutoOpened])

  const formatIndianDateTime = (dateString) => {
    if (!dateString) return 'N/A';

    try {
      const date = new Date(dateString);

      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }

      // Format to DD-MM-YYYY HH:MM:SS with proper padding
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      const hour = date.getHours().toString().padStart(2, '0');
      const minute = date.getMinutes().toString().padStart(2, '0');
      const second = date.getSeconds().toString().padStart(2, '0');

      return `${day}-${month}-${year} ${hour}:${minute}:${second}`;
    } catch (error) {
      console.error('Error formatting date:', error, 'Input:', dateString);
      return 'Invalid Date';
    }
  }

  // Function to generate short code if not present
  const generateShortCode = (recordData) => {
    if (recordData.unique_code) return recordData.unique_code;

    const date = recordData.createdAt ? recordData.createdAt.replace(/-/g, '').slice(0, 8) : '';
    const sequence = recordData.sequence_number || 'X';
    const laddleNum = recordData.laddle_number || '0';
    return `SMS${date}${sequence}${laddleNum}`;
  }

  // Filter data based on search term
  const filteredPendingData = useMemo(() => {
    if (!debouncedSearchTerm) return pendingSMSData;

    return pendingSMSData.filter(record => {
      const searchLower = debouncedSearchTerm.toLowerCase()
      return (
        String(record.unique_code || generateShortCode(record)).toLowerCase().includes(searchLower) ||
        formatIndianDateTime(record.createdAt).toLowerCase().includes(searchLower) ||
        String(record.sequence_number || '').toLowerCase().includes(searchLower) ||
        String(record.laddle_number || '').toLowerCase().includes(searchLower) ||
        String(record.furnace_number || '').toLowerCase().includes(searchLower) ||
        String(record.temperature || '').toLowerCase().includes(searchLower)
      )
    })
  }, [pendingSMSData, debouncedSearchTerm])

  const filteredHistoryData = useMemo(() => {
    if (!debouncedSearchTerm) return historyData;

    return historyData.filter(record => {
      const searchLower = debouncedSearchTerm.toLowerCase()
      return (
        String(record.sms_short_code || '').toLowerCase().includes(searchLower) ||
        String(record.size || '').toLowerCase().includes(searchLower) ||
        String(record.mill_incharge || '').toLowerCase().includes(searchLower) ||
        String(record.quality_supervisor || '').toLowerCase().includes(searchLower) ||
        String(record.electrical_dc_operator || '').toLowerCase().includes(searchLower) ||
        String(record.strand1_temperature || '').toLowerCase().includes(searchLower) ||
        String(record.strand2_temperature || '').toLowerCase().includes(searchLower) ||
        String(record.shift_supervisor || '').toLowerCase().includes(searchLower) ||
        String(record.remarks || '').toLowerCase().includes(searchLower)
      )
    })
  }, [historyData, debouncedSearchTerm])

  // Options for dropdowns
  const millInchargeOptions = [
    { value: "", label: "Select Mill Incharge", hindiLabel: "मिल इंचार्ज चुनें" },
    { value: "Lal Babu", label: "Lal Babu", hindiLabel: "लाल बाबू" },
    { value: "Bhola", label: "Bhola", hindiLabel: "भोला" },
    { value: "Paras Mani", label: "Paras Mani", hindiLabel: "पारस मणि" }
  ]

  const qualitySupervisorOptions = [
    { value: "", label: "Select Quality Supervisor", hindiLabel: "गुणवत्ता पर्यवेक्षक चुनें" },
    { value: "Durgesh Sahu", label: "Durgesh Sahu", hindiLabel: "दुर्गेश साहू" },
    { value: "Yashwant Sahu", label: "Yashwant Sahu", hindiLabel: "यशवंत साहू" },
    { value: "Toman Lal Sahu", label: "Toman Lal Sahu", hindiLabel: "तोमन लाल साहू" },
    { value: "Other", label: "Other", hindiLabel: "अन्य" }
  ]

  const electricalDCOperatorOptions = [
    { value: "", label: "Select Electrical DC Operator", hindiLabel: "इलेक्ट्रिकल डीसी ऑपरेटर चुनें" },
    { value: "Hari Tiwari", label: "Hari Tiwari", hindiLabel: "हरि तिवारी" },
    { value: "Dhirendra Tripathy", label: "Dhirendra Tripathy", hindiLabel: "धीरेंद्र त्रिपाठी" },
    { value: "Dhimendra Rahandale", label: "Dhimendra Rahandale", hindiLabel: "धीमेंद्र रहंडाले" },
    { value: "Akhilesh Choudhary", label: "Akhilesh Choudhary", hindiLabel: "अखिलेश चौधरी" },
    { value: "Kanhai Kumar Thakur", label: "Kanhai Kumar Thakur", hindiLabel: "कन्हाई कुमार ठाकुर" },
    { value: "Shiv Vishwakarma", label: "Shiv Vishwakarma", hindiLabel: "शिव विश्वकर्मा" }
  ]

  const submissionTypeOptions = [
    { value: "Hot Coil", label: "Hot Coil" },
    { value: "Cold Billet", label: "Cold Billet" }
  ]

  return (
    <div className="flex flex-col h-screen max-h-screen bg-gray-50/30 overflow-hidden px-4 py-4 gap-4 box-sizing-border-box min-w-0">
      {/* Popup Modal - Portable Portal Mockup */}
      {showPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-[100] p-4 bg-black/40 backdrop-blur-sm">
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border-b-4 border-red-500 transform animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <div className="flex items-center justify-center mb-4">
                {popupType === "success" ? (
                  <div className="p-3 bg-green-100 rounded-full">
                    <CheckCircle2 className="h-10 w-10 text-green-500" />
                  </div>
                ) : (
                  <div className="p-3 bg-yellow-100 rounded-full">
                    <AlertCircle className="h-10 w-10 text-yellow-500" />
                  </div>
                )}
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold mb-2 text-gray-900">
                  {popupType === "success" ? "Submissions Success" : "Attention Required"}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">{popupMessage}</p>
                {popupType === "success" && successUniqueCode && (
                  <div className="mt-4 p-2 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <span className="text-xs text-gray-400 uppercase font-bold tracking-widest block mb-1">Generated ID</span>
                    <span className="text-lg font-black text-red-600 tracking-wider">#{successUniqueCode}</span>
                  </div>
                )}
              </div>
              <div className="mt-8">
                <button
                  onClick={handleClosePopup}
                  className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-all shadow-lg active:scale-95"
                >
                  Confirm & Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header Section - Shrink-0 prevents it from resizing */}
      <div className="flex-shrink-0 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col lg:flex-row justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 shadow-sm border border-red-100">
            {showHistory ? <History size={24} /> : <Edit size={24} />}
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 leading-none">
              {showHistory ? "Production History" : "Hot Coil Processing"}
            </h1>
            <p className="text-[10px] sm:text-xs text-gray-400 font-medium uppercase tracking-widest mt-1">
              Manufacturing Module / विनिर्माण मॉड्यूल
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search data..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-56 pl-10 pr-4 py-2 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-sm font-medium"
            />
          </div>

          <button
            onClick={toggleView}
            className={`flex items-center justify-center gap-2 px-5 py-2 rounded-xl font-bold text-sm transition-all active:scale-95 border-2 ${showHistory ? 'bg-white border-red-500 text-red-500' : 'bg-red-500 border-red-500 text-white shadow-lg'
              }`}
          >
            {showHistory ? <><ArrowLeft size={16} /> Pending Queue</> : <><History size={16} /> System History</>}
          </button>
        </div>
      </div>

      {/* Main Table Card - Flex-1 takes remaining height */}
      <div className="flex-1 min-h-0 bg-white rounded-2xl border border-gray-200 shadow-md flex flex-col overflow-hidden">
        {/* Card Header - Static */}
        <div className="flex-shrink-0 bg-gradient-to-r from-red-600 to-red-500 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-white font-bold tracking-wide uppercase text-sm sm:text-base">
              {showHistory ? "History Records" : "Work Queue"}
            </h2>
            <span className="bg-white/20 text-white text-[10px] font-black px-2 py-0.5 rounded-full border border-white/20">
              {showHistory ? historyData.length : pendingSMSData.length}
            </span>
          </div>
          <div className="flex items-center gap-2 bg-black/10 px-3 py-1 rounded-full border border-white/10">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            <span className="text-white text-[10px] font-bold uppercase tracking-widest">Live Sync</span>
          </div>
        </div>

        {/* Scrollable Area - Flex-1 and Overflow-Auto */}
        <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-gray-200 min-w-0">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center py-20 bg-gray-50/30">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-red-100 border-t-red-500 mb-4"></div>
              <p className="text-gray-400 font-bold text-xs uppercase tracking-widest animate-pulse">Retrieving Cloud Data...</p>
            </div>
          ) : (
            <div className="min-w-max"> {/* Container to prevent table collapse */}
              <table className="w-full border-separate border-spacing-0">
                <thead className="bg-gray-50/95 sticky top-0 z-10 backdrop-blur-md shadow-sm">
                  <tr>
                    {showHistory ? (
                      ["Date", "SMS Code", "Coil Code", "Size", "Mill Incharge", "Quality Sup.", "Electrical Op.", "S1 Temp", "S2 Temp", "Supervisor", "Image", "Created", "Remarks"].map((h, i) => (
                        <th key={i} className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-100">
                          {h}
                        </th>
                      ))
                    ) : (
                      ["Actions", "Batch Code", "Date", "Seq", "Laddle", "Furnace", "Temp"].map((h, i) => (
                        <th key={i} className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-100">
                          {h}
                        </th>
                      ))
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {showHistory ? (
                    filteredHistoryData.length > 0 ? (
                      filteredHistoryData.map((record, index) => (
                        <tr key={index} className="hover:bg-blue-50/30 transition-colors group">
                          <td className="px-4 py-3 text-xs text-gray-600 font-medium whitespace-nowrap">{formatIndianDateTime(record.sample_timestamp)}</td>
                          <td className="px-4 py-3 text-xs text-blue-600 font-bold">{record.sms_short_code}</td>
                          <td className="px-4 py-3 text-xs font-black text-gray-900">{record.unique_code}</td>
                          <td className="px-4 py-3 text-xs text-gray-700">{record.size}</td>
                          <td className="px-4 py-3 text-xs text-gray-600">{record.mill_incharge}</td>
                          <td className="px-4 py-3 text-xs text-gray-600">{record.quality_supervisor}</td>
                          <td className="px-4 py-3 text-xs text-gray-600">{record.electrical_dc_operator}</td>
                          <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-mono font-bold text-[10px]">{record.strand1_temperature}°C</span></td>
                          <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-mono font-bold text-[10px]">{record.strand2_temperature}°C</span></td>
                          <td className="px-4 py-3 text-xs text-gray-600 italic">{record.shift_supervisor}</td>
                          <td className="px-4 py-3 text-center">{record.picture ? <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center"><Camera size={14} className="text-gray-400" /></div> : <span className="text-[10px] text-gray-300">N/A</span>}</td>
                          <td className="px-4 py-3 text-[10px] text-gray-400 font-medium tabular-nums">{formatIndianDateTime(record.created_at)}</td>
                          <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate italic">{record.remarks}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={13} className="py-20 text-center text-gray-400 font-bold text-sm bg-gray-50/20">Empty History Log</td></tr>
                    )
                  ) : (
                    filteredPendingData.length > 0 ? (
                      filteredPendingData.map((record, index) => (
                        <tr key={index} className="hover:bg-red-50/20 transition-colors group border-l-2 border-transparent hover:border-red-500">
                          <td className="px-4 py-3">
                            <button onClick={() => handleProcessClick(record)} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-black uppercase tracking-tighter shadow-sm active:scale-95 transition-all">Process</button>
                          </td>
                          <td className="px-4 py-3 text-xs font-black text-gray-900">{record.unique_code || generateShortCode(record)}</td>
                          <td className="px-4 py-3 text-xs text-gray-500 tabular-nums">{formatIndianDateTime(record.sample_timestamp)}</td>
                          <td className="px-4 py-3 text-xs font-bold text-gray-700">{record.sequence_number}</td>
                          <td className="px-4 py-3 text-xs font-bold text-gray-700">{record.laddle_number}</td>
                          <td className="px-4 py-3 text-xs text-gray-600">{record.furnace_number}</td>
                          <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-100 font-black text-[10px]">{record.temperature}°C</span></td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={7} className="py-20 text-center text-green-500 font-bold text-sm bg-green-50/10">All batches processed!</td></tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Process Form Modal - Portal approach */}
      {showProcessForm && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[90] bg-black/50 backdrop-blur-md">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-100 animate-in fade-in zoom-in duration-300">
            <div className="shrink-0 bg-white border-b border-gray-100 p-5 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-gray-900 uppercase italic">Submit Coil Report</h3>
                <p className="text-[10px] text-gray-400 font-bold flex items-center gap-2 mt-1 uppercase">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  Processing SMS Batch: <span className="text-red-500">{processFormData.sms_short_code}</span>
                </p>
              </div>
              <button onClick={handleCloseProcessForm} className="p-2 hover:bg-gray-100 rounded-full transition-colors group">
                <X size={20} className="text-gray-400 group-hover:text-red-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">

                {/* Submission Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Submission Type / सबमिशन प्रकार <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={processFormData.submission_type}
                    onChange={(e) => handleProcessFormChange("submission_type", e.target.value)}
                    className={`w-full px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm transition-colors ${errors.submission_type ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'}`}
                  >
                    {submissionTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  {errors.submission_type && <p className="text-red-500 text-xs mt-1.5">{errors.submission_type}</p>}
                </div>

                {/* SMS Short Code (Auto-filled) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SMS Short Code / एसएमएस शॉर्ट कोड <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={processFormData.sms_short_code}
                    readOnly
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-md bg-gray-100 text-gray-600 text-sm font-bold"
                  />
                  <p className="text-xs text-gray-500 mt-1.5">Auto-filled from SMS Register</p>
                </div>

                {/* Size */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Size / आकार <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={processFormData.size}
                    onChange={(e) => handleProcessFormChange("size", e.target.value)}
                    className={`w-full px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm transition-colors ${errors.size ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'}`}
                    placeholder="e.g., 146x148x2.90"
                  />
                  {errors.size && <p className="text-red-500 text-xs mt-1.5">{errors.size}</p>}
                </div>

                {/* Mill Incharge */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mill Incharge / मिल इंचार्ज <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={processFormData.mill_incharge}
                    onChange={(e) => handleProcessFormChange("mill_incharge", e.target.value)}
                    className={`w-full px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm transition-colors ${errors.mill_incharge ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'}`}
                  >
                    {millInchargeOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  {errors.mill_incharge && <p className="text-red-500 text-xs mt-1.5">{errors.mill_incharge}</p>}
                </div>

                {/* Quality Supervisor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quality Supervisor / गुणवत्ता पर्यवेक्षक <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={processFormData.quality_supervisor}
                    onChange={(e) => handleProcessFormChange("quality_supervisor", e.target.value)}
                    className={`w-full px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm transition-colors ${errors.quality_supervisor ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'}`}
                  >
                    {qualitySupervisorOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  {errors.quality_supervisor && <p className="text-red-500 text-xs mt-1.5">{errors.quality_supervisor}</p>}
                </div>

                {/* Electrical DC Operator */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Electrical DC Operator / इलेक्ट्रिकल डीसी ऑपरेटर <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={processFormData.electrical_dc_operator}
                    onChange={(e) => handleProcessFormChange("electrical_dc_operator", e.target.value)}
                    className={`w-full px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm transition-colors ${errors.electrical_dc_operator ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'}`}
                  >
                    {electricalDCOperatorOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  {errors.electrical_dc_operator && <p className="text-red-500 text-xs mt-1.5">{errors.electrical_dc_operator}</p>}
                </div>

                {/* Quality Supervisor Other - conditional */}
                {processFormData.quality_supervisor === "Other" && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Specify Quality Supervisor / गुणवत्ता पर्यवेक्षक निर्दिष्ट करें <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={processFormData.quality_supervisor_other}
                      onChange={(e) => handleProcessFormChange("quality_supervisor_other", e.target.value)}
                      className={`w-full px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm transition-colors ${errors.quality_supervisor_other ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'}`}
                      placeholder="Enter quality supervisor name"
                    />
                    {errors.quality_supervisor_other && <p className="text-red-500 text-xs mt-1.5">{errors.quality_supervisor_other}</p>}
                  </div>
                )}

                {/* Strand1 Temperature */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Strand1 Temperature / स्ट्रैंड1 तापमान <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={processFormData.strand1_temperature}
                    onChange={(e) => handleProcessFormChange("strand1_temperature", e.target.value)}
                    className={`w-full px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm transition-colors ${errors.strand1_temperature ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'}`}
                    placeholder="e.g., 960"
                  />
                  {errors.strand1_temperature && <p className="text-red-500 text-xs mt-1.5">{errors.strand1_temperature}</p>}
                </div>

                {/* Strand2 Temperature */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Strand2 Temperature / स्ट्रैंड2 तापमान <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={processFormData.strand2_temperature}
                    onChange={(e) => handleProcessFormChange("strand2_temperature", e.target.value)}
                    className={`w-full px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm transition-colors ${errors.strand2_temperature ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'}`}
                    placeholder="e.g., Cold"
                  />
                  {errors.strand2_temperature && <p className="text-red-500 text-xs mt-1.5">{errors.strand2_temperature}</p>}
                </div>

                {/* Shift Supervisor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Shift Supervisor / शिफ्ट पर्यवेक्षक <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={processFormData.shift_supervisor}
                    onChange={(e) => handleProcessFormChange("shift_supervisor", e.target.value)}
                    className={`w-full px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm transition-colors ${errors.shift_supervisor ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'}`}
                    placeholder="Enter shift supervisor name"
                  />
                  {errors.shift_supervisor && <p className="text-red-500 text-xs mt-1.5">{errors.shift_supervisor}</p>}
                </div>

                {/* Remarks */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Remarks / टिप्पणियाँ
                  </label>
                  <textarea
                    value={processFormData.remarks}
                    onChange={(e) => handleProcessFormChange("remarks", e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm transition-colors hover:border-gray-400"
                    placeholder="Enter any remarks / कोई टिप्पणी दर्ज करें"
                  />
                </div>

                {/* Picture Upload */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Picture / तस्वीर अपलोड करें
                  </label>
                  <div
                    className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-red-400 transition-colors cursor-pointer"
                    onClick={() => document.getElementById('pic-up').click()}
                  >
                    <div className="space-y-1 text-center">
                      {imagePreview ? (
                        <div className="relative inline-block">
                          <img src={imagePreview} alt="Preview" className="max-h-48 rounded-lg shadow-sm" />
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeImage(); }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <Camera className="mx-auto h-12 w-12 text-gray-400" />
                          <div className="flex text-sm text-gray-600 justify-center">
                            <span className="relative cursor-pointer bg-white rounded-md font-medium text-red-600 hover:text-red-500">
                              Upload a file
                            </span>
                            <p className="pl-1">or drag and drop</p>
                          </div>
                          <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                        </>
                      )}
                    </div>
                  </div>
                  <input id="pic-up" type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
                </div>
              </div>
            </div>

            <div className="shrink-0 bg-gray-50/50 px-6 py-4 flex justify-end gap-3 border-t border-gray-100">
              <button
                onClick={handleCloseProcessForm}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100 text-sm font-bold"
              >
                Cancel / रद्द करें
              </button>
              <button
                onClick={handleProcessSubmit}
                disabled={isSubmitting}
                className="px-5 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-bold shadow-lg shadow-red-200 active:scale-95"
              >
                <Save className="h-4 w-4" />
                {isSubmitting ? "Submitting... / जमा किया जा रहा है..." : "Submit Data / डेटा जमा करें"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default HotCoilPage
