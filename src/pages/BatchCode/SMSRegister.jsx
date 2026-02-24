"use client"
import { useState, useEffect, useCallback, useMemo } from "react"
import { CheckCircle2, X, Search, History, ArrowLeft, Plus, Save, AlertCircle } from "lucide-react"
// @ts-ignore - JSX component
import * as batchcodeAPI from "../../api/batchcodeApi";

function SMSRegister() {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [successMessage, setSuccessMessage] = useState("")
    const [error, setError] = useState(null)
    const [pendingSMSData, setPendingSMSData] = useState([])
    const [showHistory, setShowHistory] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [loading, setLoading] = useState(false)
    const [userRole, setUserRole] = useState("")
    const [username, setUsername] = useState("")
    const [popupMessage, setPopupMessage] = useState("")
    const [popupType, setPopupType] = useState("") // "success" or "warning"
    const [showPopup, setShowPopup] = useState(false)
    const [successUniqueCode, setSuccessUniqueCode] = useState("")
    const [filteredHistoryData, setFilteredHistoryData] = useState([])
    const [errors, setErrors] = useState({})
    const maytapiConfig = useMemo(() => ({
        productId: import.meta.env.VITE_MAYTAPI_PRODUCT_ID,
        phoneId: import.meta.env.VITE_MAYTAPI_PHONE_ID,
        token: import.meta.env.VITE_MAYTAPI_TOKEN,
        groupId: import.meta.env.VITE_MAYTAPI_GROUP_ID
    }), [])

    // State for process form - ALWAYS VISIBLE like ladle form
    const [historyData, setHistoryData] = useState([])
    const requiredFieldLabels = {
        sequence_number: "Sequence Number / अनुक्रम संख्या",
        laddle_number: "Laddle Number / लेडल नंबर",
        furnace_number: "Furnace Number / भट्ठी नंबर",
        melter_name: "Melter Name / मेल्टर नाम",
        temperature: "Temperature / तापमान",
        shift_incharge: "Shift Incharge / शिफ्ट इंचार्ज",
        sms_head: "SMS Head / एसएमएस हेड"
    }

    const [formData, setFormData] = useState({
        sequence_number: "",
        laddle_number: "",
        sms_head: "",
        furnace_number: "",
        melter_name: "",
        remarks: "",
        shift_incharge: "",
        temperature: "",
        picture: null
    })
    const [imagePreview, setImagePreview] = useState(null)
    const [selectedFile, setSelectedFile] = useState(null)

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

    const showPopupMessage = useCallback((message, type) => {
        setPopupMessage(message)
        setPopupType(type)
        setShowPopup(true)
    }, [])

    // Fetch history data from Node backend
    const fetchHistoryData = useCallback(async (isSilent = false) => {
        try {
            if (!isSilent) setLoading(true)
            const response = await batchcodeAPI.getSMSRegisterHistory()

            // Handle different response structures like the ladle form
            let data = [];

            if (Array.isArray(response.data)) {
                data = response.data;
            } else if (response.data && Array.isArray(response.data.data)) {
                data = response.data.data;
            } else if (response.data && response.data.success && Array.isArray(response.data.data)) {
                data = response.data.data;
            } else if (response.data && response.data.data && typeof response.data.data === 'object') {
                data = Object.values(response.data.data);
            } else {
                data = [];
            }

            setHistoryData(data)
            setFilteredHistoryData(data)
        } catch (error) {
            console.error("Error fetching history data:", error)
            if (!isSilent) showPopupMessage("Error fetching SMS history data! / एसएमएस इतिहास डेटा प्राप्त करने में त्रुटि!", "warning")
        } finally {
            if (!isSilent) setLoading(false)
        }
    }, [])

    // Fetch history data when in history view
    useEffect(() => {
        if (showHistory) {
            fetchHistoryData()
            // Auto-refresh every 8 seconds (IPL style)
            const interval = setInterval(() => {
                fetchHistoryData(true)
            }, 8000)
            return () => clearInterval(interval)
        }
    }, [showHistory, fetchHistoryData])

    // Filter data when search term or historyData changes
    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredHistoryData(historyData)
        } else {
            const filtered = historyData.filter(record => {
                const searchLower = searchTerm.toLowerCase()

                // Search across all columns
                return (
                    // Search in sequence number
                    String(record.sequence_number || '').toLowerCase().includes(searchLower) ||

                    // Search in numeric fields
                    String(record.laddle_number || '').toLowerCase().includes(searchLower) ||
                    String(record.temperature || '').toLowerCase().includes(searchLower) ||

                    // Search in text fields
                    String(record.furnace_number || '').toLowerCase().includes(searchLower) ||
                    String(record.melter_name || '').toLowerCase().includes(searchLower) ||
                    String(record.shift_incharge || '').toLowerCase().includes(searchLower) ||
                    String(record.sms_head || '').toLowerCase().includes(searchLower) ||
                    String(record.remarks || '').toLowerCase().includes(searchLower) ||

                    // Search in date (both formatted and original)
                    formatIndianDateTime(record.createdAt).toLowerCase().includes(searchLower) ||
                    String(record.createdAt || '').toLowerCase().includes(searchLower) ||

                    // Search in unique code if exists
                    String(record.unique_code || generateUniqueCode(record) || '').toLowerCase().includes(searchLower)
                )
            })
            setFilteredHistoryData(filtered)
        }
    }, [searchTerm, historyData])


    // Get user info from session storage
    useEffect(() => {
        const role = sessionStorage.getItem("role")
        const user = sessionStorage.getItem("username")
        setUserRole(role || "")
        setUsername(user || "")

        // Set shift_incharge with username when component loads
        if (user) {
            setFormData(prev => ({
                ...prev,
                shift_incharge: user
            }))
        }
    }, [])

    const buildHotCoilLink = useCallback((code) => {
        const baseUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/dashboard/delegation`
        if (!code) return baseUrl
        return `${baseUrl}?sms_short_code=${encodeURIComponent(code)}`
    }, [])

    const sendWhatsAppNotification = useCallback(async (recordData) => {
        const { productId, phoneId, token, groupId } = maytapiConfig

        // Skip if config missing to avoid breaking normal submission
        if (!productId || !phoneId || !token || !groupId) {
            console.warn("Maytapi config missing; skipping WhatsApp notification.")
            return
        }

        const safeRecord = {
            ...recordData,
            createdAt: recordData.createdAt || new Date().toISOString()
        }

        const uniqueCode = safeRecord.unique_code || generateUniqueCode(safeRecord)
        const hotCoilLink = buildHotCoilLink(uniqueCode)

        const messageLines = [
            "New SMS Register submitted",
            `SMS Code: ${uniqueCode}`,
            `Sequence: ${safeRecord.sequence_number || ""}`,
            `Laddle No: ${safeRecord.laddle_number || ""}`,
            `Furnace: ${safeRecord.furnace_number || ""}`,
            `Melter Name: ${safeRecord.melter_name || ""}`,
            `Temperature: ${safeRecord.temperature ? `${safeRecord.temperature}°C` : ""}`,
            `Shift Incharge: ${safeRecord.shift_incharge || ""}`,
            `SMS Head: ${safeRecord.sms_head || ""}`,
            safeRecord.remarks ? `Remarks: ${safeRecord.remarks}` : null,
            `Hot Coil Link: ${hotCoilLink}`
        ].filter(Boolean)

        const response = await fetch(`https://api.maytapi.com/api/${productId}/${phoneId}/sendMessage`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-maytapi-key": token
            },
            body: JSON.stringify({
                to_number: groupId,
                type: "text",
                message: messageLines.join("\n")
            })
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`WhatsApp send failed: ${response.status} ${errorText}`)
        }
    }, [maytapiConfig, buildHotCoilLink])

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

    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ""
            }))
        }
    }

    // Form validation
    const validateForm = () => {
        const newErrors = {}

        // Required fields validation
        if (!formData.sequence_number) {
            newErrors.sequence_number = "Sequence number is required"
        }
        if (!formData.laddle_number) {
            newErrors.laddle_number = "Laddle number is required"
        }
        if (!formData.furnace_number) {
            newErrors.furnace_number = "Furnace number is required"
        }
        if (!formData.melter_name.trim()) {
            newErrors.melter_name = "Melter name is required"
        }
        if (!formData.temperature) {
            newErrors.temperature = "Temperature is required"
        }
        if (!formData.shift_incharge.trim()) {
            newErrors.shift_incharge = "Shift incharge is required"
        }
        if (!formData.sms_head) {
            newErrors.sms_head = "SMS head is required"
        }

        // Validate temperature is a positive number
        if (formData.temperature && (isNaN(formData.temperature) || parseInt(formData.temperature) <= 0)) {
            newErrors.temperature = "Temperature must be a valid positive number"
        }

        setErrors(newErrors)
        const errorKeys = Object.keys(newErrors)
        if (errorKeys.length > 0) {
            const firstErrorField = errorKeys[0]
            requestAnimationFrame(() => {
                const fieldEl = document.querySelector(`[name="${firstErrorField}"]`)
                if (fieldEl && typeof fieldEl.focus === "function") {
                    fieldEl.focus()
                }
            })
        }

        return {
            isValid: errorKeys.length === 0,
            newErrors
        }
    }

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault()

        // Validate all fields
        const { isValid, newErrors } = validateForm()
        if (!isValid) {
            const missingFields = Object.keys(newErrors)
                .map((field) => requiredFieldLabels[field] || field)
                .join(", ")

            showPopupMessage(
                `Please fill required fields: ${missingFields}`,
                "warning"
            )
            return
        }

        setIsSubmitting(true)
        try {
            // Prepare data with FormData for file upload
            const formDataToSend = new FormData()
            formDataToSend.append('sequence_number', formData.sequence_number)
            formDataToSend.append('laddle_number', formData.laddle_number)
            formDataToSend.append('sms_head', formData.sms_head)
            formDataToSend.append('furnace_number', formData.furnace_number)
            formDataToSend.append('melter_name', formData.melter_name.trim())
            formDataToSend.append('remarks', formData.remarks)
            formDataToSend.append('shift_incharge', formData.shift_incharge)
            formDataToSend.append('temperature', formData.temperature)

            if (selectedFile) {
                formDataToSend.append('picture', selectedFile)
            }

            console.log("Submitting SMS Report FormData:", Object.fromEntries(formDataToSend.entries()))

            const response = await batchcodeAPI.submitSMSRegister(formDataToSend)
            console.log("Server Response:", response.data)

            if (response.data && response.data.success) {
                const apiRecord = response.data.data || {}

                // Get the final values combining form state and API response
                const finalData = {
                    ...formData,
                    ...apiRecord,
                    unique_code: apiRecord.unique_code || "",
                    remarks: apiRecord.remarks || formData.remarks || "",
                    shift_incharge: apiRecord.shift_incharge || formData.shift_incharge || "",
                    sms_head: apiRecord.sms_head || formData.sms_head || "",
                    melter_name: apiRecord.melter_name || formData.melter_name || "",
                    createdAt: apiRecord.createdAt || apiRecord.sample_timestamp || new Date().toISOString()
                }

                // Send notification
                sendWhatsAppNotification(finalData).catch((err) => {
                    console.error("WhatsApp Error:", err)
                    showPopupMessage("Saved, but WhatsApp failed.", "warning")
                })

                // Set unique code and show success
                const uniqueCodeToShow = finalData.unique_code || generateUniqueCode(finalData)
                setSuccessUniqueCode(uniqueCodeToShow)
                showPopupMessage("Report submitted successfully!", "success")

                // RESET FORM
                setFormData({
                    sequence_number: "",
                    laddle_number: "",
                    sms_head: "",
                    furnace_number: "",
                    melter_name: "",
                    remarks: "",
                    shift_incharge: username || "",
                    temperature: "",
                    picture: null
                })
                setSelectedFile(null)
                setImagePreview(null)
                setErrors({})

                if (showHistory) fetchHistoryData()
            } else {
                throw new Error("Failed to submit")
            }
        } catch (error) {
            console.error("Error submitting SMS report:", error)
            const validationErrors = error?.response?.data?.details?.errors
            if (Array.isArray(validationErrors) && validationErrors.length > 0) {
                const validationMessage = validationErrors
                    .map((item) => item?.message || `${item?.field || "field"} is invalid`)
                    .join(", ")
                showPopupMessage(`Validation failed: ${validationMessage}`, "warning")
            } else {
                showPopupMessage("Error submitting SMS report. Please try again. / एसएमएस रिपोर्ट सबमिट करने में त्रुटि, कृपया पुनः प्रयास करें!", "warning")
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    // Toggle between form and history views
    const toggleView = () => {
        setShowHistory(prev => !prev) // Simply toggle the boolean value
        setSearchTerm("") // Clear search when switching views
    }

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

    // Function to generate unique code if not present
    const generateUniqueCode = (recordData) => {
        if (recordData.unique_code) return recordData.unique_code;

        // Generate a unique code based on data
        const date = recordData.createdAt ? recordData.createdAt.replace(/-/g, '').slice(0, 8) : '';
        const sequence = recordData.sequence_number || 'X';
        const laddleNum = recordData.laddle_number || '0';
        return `SMS${date}${sequence}${laddleNum}`;
    }

    // Function to format time in HH:MM format
    const formatTime = (dateString) => {
        if (!dateString) return '';

        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '';

            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            return `${hours}:${minutes}`;
        } catch (error) {
            console.error('Error formatting time:', error);
            return '';
        }
    }

    // Options for dropdowns
    const sequenceOptions = [
        { value: "", label: "Select Sequence Number", hindiLabel: "अनुक्रम संख्या चुनें" },
        { value: "A", label: "A", hindiLabel: "A" },
        { value: "B", label: "B", hindiLabel: "B" },
        { value: "C", label: "C", hindiLabel: "C" },
        { value: "D", label: "D", hindiLabel: "D" },
        { value: "E", label: "E", hindiLabel: "E" },
        { value: "F", label: "F", hindiLabel: "F" },
        { value: "G", label: "G", hindiLabel: "G" },
        { value: "H", label: "H", hindiLabel: "H" }
    ]

    const laddleNumberOptions = [
        { value: "", label: "Select Laddle Number", hindiLabel: "लेडल नंबर चुनें" },
        { value: "1", label: "1", hindiLabel: "1" },
        { value: "2", label: "2", hindiLabel: "2" },
        { value: "3", label: "3", hindiLabel: "3" },
        { value: "4", label: "4", hindiLabel: "4" },
        { value: "5", label: "5", hindiLabel: "5" },
        { value: "6", label: "6", hindiLabel: "6" },
        { value: "7", label: "7", hindiLabel: "7" },
        { value: "8", label: "8", hindiLabel: "8" },
        { value: "9", label: "9", hindiLabel: "9" },
        { value: "10", label: "10", hindiLabel: "10" },
        { value: "11", label: "11", hindiLabel: "11" },
        { value: "12", label: "12", hindiLabel: "12" },
        { value: "13", label: "13", hindiLabel: "13" },
        { value: "14", label: "14", hindiLabel: "14" },
        { value: "15", label: "15", hindiLabel: "15" }
    ]

    const furnaceOptions = [
        { value: "", label: "Select Furnace Number", hindiLabel: "भट्ठी नंबर चुनें" },
        { value: "Furnace1", label: "Furnace1", hindiLabel: "भट्ठी1" },
        { value: "Furnace2", label: "Furnace2", hindiLabel: "भट्ठी2" },
        { value: "Furnace3", label: "Furnace3", hindiLabel: "भट्ठी3" },
        { value: "Furnace4", label: "Furnace4", hindiLabel: "भट्ठी4" },
        { value: "Furnace5", label: "Furnace5", hindiLabel: "भट्ठी5" },
        { value: "Furnace6", label: "Furnace6", hindiLabel: "भट्ठी6" },
        { value: "Furnace7", label: "Furnace7", hindiLabel: "भट्ठी7" }
    ]

    const shiftInchargeOptions = [
        { value: "", label: "Select Shift Incharge", hindiLabel: "शिफ्ट इंचार्ज चुनें" },
        { value: "Akhilesh", label: "Akhilesh", hindiLabel: "अखिलेश" },
        { value: "Prakash Kumar", label: "Prakash Kumar", hindiLabel: "प्रकाश कुमार" },
        { value: "Hardhan Mandal", label: "Hardhan Mandal", hindiLabel: "हरधन मंडल" },
        { value: "Sukhan Vishwakarma", label: "Sukhan Vishwakarma", hindiLabel: "सुखन विश्वकर्मा" },
        { value: "Ashwani Verma", label: "Ashwani Verma", hindiLabel: "अश्वनी वर्मा" },
        { value: "Deepak Gupta", label: "Deepak Gupta", hindiLabel: "दीपक गुप्ता" },
        { value: "Pramod Thakur", label: "Pramod Thakur", hindiLabel: "प्रमोद ठाकुर" },
        { value: "Parsuram Jain", label: "Parsuram Jain", hindiLabel: "परशुराम जैन" },
        { value: "Jaspal Kurrey", label: "Jaspal Kurrey", hindiLabel: "जसपाल कुर्रे" }
    ]

    const smsHeadOptions = [
        { value: "", label: "Select SMS Head", hindiLabel: "एसएमएस हेड चुनें" },
        { value: "V M Gupta", label: "V M Gupta", hindiLabel: "वी एम गुप्ता" },
        { value: "Baldev Singh Saini", label: "Baldev Singh Saini", hindiLabel: "बलदेव सिंह सैनी" }
    ]

    return (
        <div className="batchcode-page">
            <div className="space-y-6">
                {/* Popup Modal */}
                {showPopup && (
                    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
                        <div
                            className={`relative mx-4 p-6 rounded-lg shadow-2xl max-w-sm w-full transform transition-all duration-300 pointer-events-auto ${popupType === "success"
                                ? 'bg-green-50 border-2 border-green-400'
                                : 'bg-yellow-50 border-2 border-yellow-400'
                                }`}
                        >
                            <div className="flex items-center justify-center mb-4">
                                {popupType === "success" ? (
                                    <CheckCircle2 className="h-12 w-12 text-green-500" />
                                ) : (
                                    <AlertCircle className="h-12 w-12 text-yellow-500" />
                                )}
                            </div>
                            <div className="text-center">
                                <h3 className={`text-lg font-semibold mb-2 ${popupType === "success" ? 'text-green-800' : 'text-yellow-800'
                                    }`}>
                                    {popupType === "success" ? "Success!" : "Warning!"}
                                </h3>
                                <p className={popupType === "success" ? 'text-green-700' : 'text-yellow-700'}>
                                    {popupMessage}
                                </p>
                                {popupType === "success" && successUniqueCode && (
                                    <p className="mt-2 text-green-700 font-semibold">
                                        Unique Code: <span className="font-bold">{successUniqueCode}</span>
                                    </p>
                                )}
                            </div>
                            {/* Progress bar for auto-dismiss - only for warnings */}
                            {popupType === "warning" && (
                                <div className="mt-4 w-full bg-gray-200 rounded-full h-1">
                                    <div
                                        className="h-1 rounded-full bg-yellow-500"
                                        style={{
                                            animation: 'shrink 2s linear forwards'
                                        }}
                                    />
                                </div>
                            )}
                            {/* OK Button */}
                            <div className="mt-4 flex justify-center">
                                <button
                                    onClick={handleClosePopup}
                                    className={`px-6 py-2 rounded-md font-medium transition-colors ${popupType === "success"
                                        ? 'bg-green-500 hover:bg-green-600 text-white'
                                        : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                                        }`}
                                >
                                    OK
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Header Section */}
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="flex-1 min-w-0 flex items-center gap-4">
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-red-500 truncate">
                                {showHistory ? "SMS Report History" : "Create SMS Report"}
                            </h1>
                            <div className="hidden sm:flex items-center gap-1.5 py-1 px-3 bg-red-50 text-red-600 rounded-full border border-red-100 shadow-sm animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                <span className="text-[10px] font-black uppercase tracking-widest">Live Sync</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                        {showHistory && (
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search across all columns..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm("")}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                        )}

                        <button
                            onClick={toggleView}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors w-full sm:w-auto"
                        >
                            {showHistory ? (
                                <>
                                    <ArrowLeft className="h-4 w-4" />
                                    Back to Form
                                </>
                            ) : (
                                <>
                                    <History className="h-4 w-4" />
                                    View History
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {showHistory ? (
                    /* HISTORY VIEW */
                    <div className="rounded-lg border border-gray-200 shadow-md bg-white overflow-hidden">
                        <div className="bg-gradient-to-r from-red-500 to-red-400 border-b border-red-200 p-4">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-white text-lg font-semibold">SMS Report Records</h2>
                                    <div className="relative flex items-center justify-center w-10 h-10">
                                        <div className="absolute inset-0 rounded-full bg-white/20 p-0.5">
                                            <div className="w-full h-full rounded-full bg-transparent flex items-center justify-center">
                                                <span className="text-white text-sm font-bold">
                                                    {filteredHistoryData.length}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {loading ? (
                            <div className="text-center py-10">
                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500 mb-4"></div>
                                <p className="text-red-600">Loading SMS history data...</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Unique Code / यूनिक कोड
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Date & Time / तारीख & समय
                                            </th>
                                            {/* <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Time / समय
                                            </th> */}
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Sequence / अनुक्रम
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Laddle No. / लेडल नंबर
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Furnace / भट्ठी
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Melter Name / मेल्टर नाम
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Temperature / तापमान
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Shift Incharge / शिफ्ट इंचार्ज
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                SMS Head / एसएमएस हेड
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Remarks / टिप्पणियाँ
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredHistoryData.length > 0 ? (
                                            filteredHistoryData.map((item, index) => (
                                                <tr key={item.id || item._id || index} className="hover:bg-gray-50">
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {item.unique_code || generateUniqueCode(item) || 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {formatIndianDateTime(item.sample_timestamp) || 'N/A'}
                                                    </td>
                                                    {/* <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {formatTime(item.createdAt) || 'N/A'}
                                                    </td> */}
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {item.sequence_number || 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {item.laddle_number || 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {item.furnace_number || 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {item.melter_name || 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {item.temperature || 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {item.shift_incharge || 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {item.sms_head || 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-4 text-sm text-gray-900">
                                                        {item.remarks || '—'}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                                                    <div className="flex flex-col items-center justify-center">
                                                        <Search className="h-12 w-12 text-gray-300 mb-4" />
                                                        <p className="text-lg font-medium mb-2">
                                                            {searchTerm ? "No matching SMS reports found" : "No SMS reports found"}
                                                        </p>
                                                        <p className="text-sm mb-4">
                                                            {searchTerm ? "Try adjusting your search terms" : "Submit a report first to see records here"}
                                                        </p>
                                                        <div className="flex gap-2">
                                                            {searchTerm && (
                                                                <button
                                                                    onClick={() => setSearchTerm("")}
                                                                    className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                                                                >
                                                                    Clear Search
                                                                </button>
                                                            )}
                                                            {/* <button
                                                                onClick={fetchHistoryData}
                                                                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                                                            >
                                                                Refresh Data
                                                            </button>
                                                            <button
                                                                onClick={() => setShowHistory(false)}
                                                                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                                                            >
                                                                Create New Report
                                                            </button> */}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                ) : (
                    /* FORM VIEW - ALWAYS VISIBLE like ladle page */
                    <div className="rounded-lg border border-gray-200 shadow-md bg-white overflow-hidden">
                        <div className="bg-gradient-to-r from-red-500 to-red-400 border-b border-red-200 p-4">
                            <h2 className="text-white text-lg font-semibold">SMS Report Information</h2>
                        </div>

                        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                                {/* Sequence Number */}
                                <div>
                                    <label htmlFor="sequence_number" className="block text-sm font-medium text-gray-700 mb-2">
                                        Sequence Number / अनुक्रम संख्या <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        id="sequence_number"
                                        name="sequence_number"
                                        value={formData.sequence_number}
                                        onChange={handleInputChange}
                                        className={`w-full px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm transition-colors ${errors.sequence_number ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                                            }`}
                                    >
                                        {sequenceOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.sequence_number && (
                                        <p className="text-red-500 text-xs mt-1.5">{errors.sequence_number}</p>
                                    )}
                                </div>

                                {/* Laddle Number */}
                                <div>
                                    <label htmlFor="laddle_number" className="block text-sm font-medium text-gray-700 mb-2">
                                        Laddle Number / लेडल नंबर <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        id="laddle_number"
                                        name="laddle_number"
                                        value={formData.laddle_number}
                                        onChange={handleInputChange}
                                        className={`w-full px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm transition-colors ${errors.laddle_number ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                                            }`}
                                    >
                                        {laddleNumberOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.laddle_number && (
                                        <p className="text-red-500 text-xs mt-1.5">{errors.laddle_number}</p>
                                    )}
                                </div>

                                {/* Furnace Number */}
                                <div>
                                    <label htmlFor="furnace_number" className="block text-sm font-medium text-gray-700 mb-2">
                                        Furnace Number / भट्ठी नंबर <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        id="furnace_number"
                                        name="furnace_number"
                                        value={formData.furnace_number}
                                        onChange={handleInputChange}
                                        className={`w-full px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm transition-colors ${errors.furnace_number ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                                            }`}
                                    >
                                        {furnaceOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.furnace_number && (
                                        <p className="text-red-500 text-xs mt-1.5">{errors.furnace_number}</p>
                                    )}
                                </div>

                                {/* Melter Name */}
                                <div>
                                    <label htmlFor="melter_name" className="block text-sm font-medium text-gray-700 mb-2">
                                        Melter Name / मेल्टर नाम <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="melter_name"
                                        name="melter_name"
                                        value={formData.melter_name}
                                        onChange={handleInputChange}
                                        className={`w-full px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm transition-colors ${errors.melter_name ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                                            }`}
                                        placeholder="Enter melter name"
                                    />
                                    {errors.melter_name && (
                                        <p className="text-red-500 text-xs mt-1.5">{errors.melter_name}</p>
                                    )}
                                </div>

                                {/* Temperature - Full width to start new row for Shift Incharge & SMS Head */}
                                <div className="sm:col-span-2">
                                    <label htmlFor="temperature" className="block text-sm font-medium text-gray-700 mb-2">
                                        Temperature / तापमान (°C) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        id="temperature"
                                        name="temperature"
                                        value={formData.temperature}
                                        onChange={handleInputChange}
                                        className={`w-full px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm transition-colors ${errors.temperature ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                                            }`}
                                        placeholder="Enter temperature"
                                    />
                                    {errors.temperature && (
                                        <p className="text-red-500 text-xs mt-1.5">{errors.temperature}</p>
                                    )}
                                </div>

                                {/* Shift Incharge - Now grouped with SMS Head */}
                                <div>
                                    <label htmlFor="shift_incharge" className="block text-sm font-medium text-gray-700 mb-2">
                                        Shift Incharge / शिफ्ट इंचार्ज <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        list="shift_incharge_list"
                                        type="text"
                                        id="shift_incharge"
                                        name="shift_incharge"
                                        value={formData.shift_incharge}
                                        onChange={handleInputChange}
                                        className={`w-full px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm transition-colors ${errors.shift_incharge ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                                            }`}
                                        placeholder="Type or select shift incharge"
                                    />
                                    <datalist id="shift_incharge_list">
                                        {shiftInchargeOptions.filter(opt => opt.value !== "").map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </datalist>
                                    {errors.shift_incharge && (
                                        <p className="text-red-500 text-xs mt-1.5">{errors.shift_incharge}</p>
                                    )}
                                </div>

                                {/* SMS Head */}
                                <div>
                                    <label htmlFor="sms_head" className="block text-sm font-medium text-gray-700 mb-2">
                                        SMS Head / एसएमएस हेड <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        id="sms_head"
                                        name="sms_head"
                                        value={formData.sms_head}
                                        onChange={handleInputChange}
                                        className={`w-full px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm transition-colors ${errors.sms_head ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                                            }`}
                                    >
                                        {smsHeadOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.sms_head && (
                                        <p className="text-red-500 text-xs mt-1.5">{errors.sms_head}</p>
                                    )}
                                </div>

                                {/* Remarks - Full width */}
                                <div className="md:col-span-2">
                                    <label htmlFor="remarks" className="block text-sm font-medium text-gray-700 mb-2">
                                        Remarks / टिप्पणियाँ
                                    </label>
                                    <textarea
                                        id="remarks"
                                        name="remarks"
                                        value={formData.remarks}
                                        onChange={handleInputChange}
                                        rows={3}
                                        className="w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-base sm:text-sm"
                                        placeholder="Enter any remarks or notes / कोई टिप्पणी या नोट दर्ज करें"
                                    />
                                </div>

                                {/* Picture Upload - Full width */}
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Upload Picture / तस्वीर अपलोड करें
                                    </label>
                                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-red-400 transition-colors">
                                        <div className="space-y-1 text-center">
                                            {imagePreview ? (
                                                <div className="relative inline-block">
                                                    <img
                                                        src={imagePreview}
                                                        alt="Preview"
                                                        className="max-h-48 rounded-lg shadow-sm"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={removeImage}
                                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <Plus className="mx-auto h-12 w-12 text-gray-400" />
                                                    <div className="flex text-sm text-gray-600">
                                                        <label
                                                            htmlFor="picture"
                                                            className="relative cursor-pointer bg-white rounded-md font-medium text-red-600 hover:text-red-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-red-500"
                                                        >
                                                            <span>Upload a file</span>
                                                            <input
                                                                id="picture"
                                                                name="picture"
                                                                type="file"
                                                                className="sr-only"
                                                                accept="image/*"
                                                                onChange={handleFileChange}
                                                            />
                                                        </label>
                                                        <p className="pl-1">or drag and drop</p>
                                                    </div>
                                                    <p className="text-xs text-gray-500">
                                                        PNG, JPG, GIF up to 5MB
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div className="flex justify-end pt-6 border-t border-gray-200">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex items-center justify-center w-full sm:w-auto px-6 py-4 sm:py-3 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-base sm:text-sm"
                                >
                                    <Save className="mr-2 h-5 w-5" />
                                    {isSubmitting ? "Submitting..." : "Submit SMS Report"}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>

            {/* Add CSS for progress bar animation */}
            <style>{`
                @keyframes shrink {
                    from { width: 100%; }
                    to { width: 0%; }
                }
            `}</style>
        </div>
    )
}

export default SMSRegister
