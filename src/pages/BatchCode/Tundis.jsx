"use client"
import { useState, useEffect } from "react"
import { Save, ArrowLeft, CheckCircle, AlertCircle, X, Eye, Edit, Trash2, Search } from "lucide-react"
// @ts-ignore - JSX component
import { batchcodeAPI } from "../../services/batchcodeAPI";

function TundishFormPage() {
    const [formData, setFormData] = useState({
        tundish_number: "",
        sample_date: "",
        sample_time: "",
        nozzle_plate_check: "",
        well_block_check: "",
        board_proper_set: "",
        board_sand_filling: "",
        refractory_slag_cleaning: "",
        tundish_mession_name: "",
        handover_proper_check: "",
        handover_nozzle_installed: "",
        handover_masala_inserted: "",
        stand1_mould_operator: "",
        stand2_mould_operator: "",
        timber_man_name: "",
        laddle_operator_name: "",
        shift_incharge_name: "",
        forman_name: ""
    })

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [popupMessage, setPopupMessage] = useState("")
    const [popupType, setPopupType] = useState("")
    const [showPopup, setShowPopup] = useState(false)
    const [successUniqueCode, setSuccessUniqueCode] = useState("")
    const [errors, setErrors] = useState({})
    const [tundishData, setTundishData] = useState([])
    const [loading, setLoading] = useState(false)
    const [viewMode, setViewMode] = useState("form") // "form" or "list"
    const [searchTerm, setSearchTerm] = useState("")
    const [filteredTundishData, setFilteredTundishData] = useState([])

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

    // Fetch tundish data when in list view
    useEffect(() => {
        if (viewMode === "list") {
            fetchTundishData()
        }
    }, [viewMode])

    // Filter data when search term or tundishData changes
    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredTundishData(tundishData)
        } else {
            const filtered = tundishData.filter(record => {
                const recordData = record.data || record
                const searchLower = searchTerm.toLowerCase()

                // Search across all columns
                return (
                    // Search in numeric fields
                    String(recordData.tundish_number || '').toLowerCase().includes(searchLower) ||

                    // Search in text fields
                    String(recordData.tundish_mession_name || '').toLowerCase().includes(searchLower) ||
                    String(recordData.stand1_mould_operator || '').toLowerCase().includes(searchLower) ||
                    String(recordData.stand2_mould_operator || '').toLowerCase().includes(searchLower) ||
                    String(recordData.timber_man_name || '').toLowerCase().includes(searchLower) ||
                    String(recordData.laddle_operator_name || '').toLowerCase().includes(searchLower) ||
                    String(recordData.shift_incharge_name || '').toLowerCase().includes(searchLower) ||
                    String(recordData.forman_name || '').toLowerCase().includes(searchLower) ||

                    // Search in unique code
                    String(recordData.unique_code || generateUniqueCode(recordData) || '').toLowerCase().includes(searchLower) ||

                    // Search in date (both formatted and original)
                    formatIndianDateTime(recordData.sample_date).toLowerCase().includes(searchLower) ||
                    String(recordData.sample_date || '').toLowerCase().includes(searchLower) ||

                    // Search in time
                    String(recordData.sample_time || '').toLowerCase().includes(searchLower) ||

                    // Search in tundish checklist status
                    String(recordData.nozzle_plate_check === "Done" ? "Yes" : "No").toLowerCase().includes(searchLower) ||
                    String(recordData.well_block_check === "Done" ? "Yes" : "No").toLowerCase().includes(searchLower) ||
                    String(recordData.board_proper_set === "Done" ? "Yes" : "No").toLowerCase().includes(searchLower) ||
                    String(recordData.board_sand_filling === "Done" ? "Yes" : "No").toLowerCase().includes(searchLower) ||
                    String(recordData.refractory_slag_cleaning === "Done" ? "Yes" : "No").toLowerCase().includes(searchLower) ||

                    // Search in handover checklist status
                    String(recordData.handover_proper_check === "Yes" ? "Yes" : "No").toLowerCase().includes(searchLower) ||
                    String(recordData.handover_nozzle_installed === "Yes" ? "Yes" : "No").toLowerCase().includes(searchLower) ||
                    String(recordData.handover_masala_inserted === "Yes" ? "Yes" : "No").toLowerCase().includes(searchLower)
                )
            })
            setFilteredTundishData(filtered)
        }
    }, [searchTerm, tundishData])

    const showPopupMessage = (message, type) => {
        setPopupMessage(message)
        setPopupType(type)
        setShowPopup(true)
    }

    const fetchTundishData = async () => {
        setLoading(true)
        try {
            const response = await batchcodeAPI.getTundishChecklists()

            // Handle different response structures
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

            setTundishData(data)

        } catch (error) {
            console.error("❌ Error fetching tundish data:", error)
            showPopupMessage("Error fetching tundish data! / टनडिस डेटा प्राप्त करने में त्रुटि!", "warning")
        } finally {
            setLoading(false)
        }
    }

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ""
            }))
        }
    }

    const handleChecklistChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }))
        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: ""
            }))
        }
    }

    const validateForm = () => {
        const newErrors = {}

        // Required fields validation - Date and Time are now optional
        if (!formData.tundish_number) {
            newErrors.tundish_number = "Tundish Number is required"
        }
        // Date and Time validation removed - they are now optional
        if (!formData.tundish_mession_name.trim()) {
            newErrors.tundish_mession_name = "Tundish Mession Name is required"
        }
        if (!formData.stand1_mould_operator.trim()) {
            newErrors.stand1_mould_operator = "Stand 1 Mould Operator Name is required"
        }
        if (!formData.stand2_mould_operator.trim()) {
            newErrors.stand2_mould_operator = "Stand 2 Mould Operator Name is required"
        }
        if (!formData.timber_man_name.trim()) {
            newErrors.timber_man_name = "Timber Man Name is required"
        }
        if (!formData.laddle_operator_name.trim()) {
            newErrors.laddle_operator_name = "Laddle Operator Name is required"
        }
        if (!formData.shift_incharge_name.trim()) {
            newErrors.shift_incharge_name = "Shift Incharge Name is required"
        }
        if (!formData.forman_name.trim()) {
            newErrors.forman_name = "Forman Name is required"
        }

        // Validate tundish checklist items
        const tundishChecklistFields = [
            'nozzle_plate_check', 'well_block_check', 'board_proper_set',
            'board_sand_filling', 'refractory_slag_cleaning'
        ]

        tundishChecklistFields.forEach(field => {
            if (!formData[field]) {
                newErrors[field] = "Please select a status"
            }
        })

        // Validate handover checklist
        const handoverFields = [
            'handover_proper_check', 'handover_nozzle_installed', 'handover_masala_inserted'
        ]

        handoverFields.forEach(field => {
            if (!formData[field]) {
                newErrors[field] = "Please select a status"
            }
        })

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!validateForm()) {
            showPopupMessage("कृपया सभी आवश्यक फ़ील्ड्स सही से भरें!", "warning")
            return
        }

        setIsSubmitting(true)

        try {
            // Prepare data for submission - convert tundish_number to number
            // Backend expects sample_timestamp (auto-generated if not provided)
            // Backend does NOT expect sample_date or sample_time - remove them
            const { sample_date, sample_time, ...restFormData } = formData;
            const submissionData = {
                ...restFormData,
                tundish_number: parseInt(formData.tundish_number)
                // sample_timestamp will be auto-generated by backend if not provided
                // Backend validation schema only expects: sample_timestamp, tundish_number, and checklist fields
            }

            const response = await batchcodeAPI.submitTundishChecklist(submissionData)

            if (response.data.success) {
                // Extract unique_code from response - try multiple possible locations
                const uniqueCode = response.data.data?.unique_code
                    || response.data?.data?.unique_code
                    || response.data?.unique_code
                    || (response.data.data && generateUniqueCode(response.data.data))
                    || generateUniqueCode(submissionData)
                    || ""
                setSuccessUniqueCode(uniqueCode)
                showPopupMessage("टनडिस फॉर्म सफलतापूर्वक सबमिट हो गया!", "success")

                // Reset form
                setFormData({
                    tundish_number: "",
                    sample_date: "",
                    sample_time: "",
                    nozzle_plate_check: "",
                    well_block_check: "",
                    board_proper_set: "",
                    board_sand_filling: "",
                    refractory_slag_cleaning: "",
                    tundish_mession_name: "",
                    handover_proper_check: "",
                    handover_nozzle_installed: "",
                    handover_masala_inserted: "",
                    stand1_mould_operator: "",
                    stand2_mould_operator: "",
                    timber_man_name: "",
                    laddle_operator_name: "",
                    shift_incharge_name: "",
                    forman_name: ""
                })
                setErrors({})

                // Refresh data if in list view
                if (viewMode === "list") {
                    fetchTundishData()
                }
            } else {
                throw new Error(response.data.message || "Failed to submit form")
            }
        } catch (error) {
            console.error("Error submitting form:", error)
            showPopupMessage("फॉर्म सबमिट करने में त्रुटि। कृपया पुनः प्रयास करें।", "warning")
        } finally {
            setIsSubmitting(false)
        }
    }

    const toggleViewMode = () => {
        setViewMode(prev => prev === "form" ? "list" : "form")
        setSearchTerm("") // Clear search when switching views
    }

    const getYesNoBadge = (status, type = "tundish") => {
        if (type === "tundish") {
            return status === "Done" ? (
                <span className="inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 w-12">
                    Yes
                </span>
            ) : (
                <span className="inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 w-12">
                    No
                </span>
            )
        } else {
            return status === "Yes" ? (
                <span className="inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 w-12">
                    Yes
                </span>
            ) : (
                <span className="inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 w-12">
                    No
                </span>
            )
        }
    }

    // Function to format date in Indian format (DD-MM-YYYY)
    const formatIndianDateTime = (dateString) => {
        if (!dateString) return 'N/A';

        try {
            const date = new Date(dateString);

            // Check if date is valid
            if (isNaN(date.getTime())) {
                return dateString;
            }

            // Format to DD-MM-YYYY
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear();
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            const seconds = date.getSeconds().toString().padStart(2, '0');

            return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
        } catch (error) {
            console.error('Error formatting date:', error);
            return dateString;
        }
    }

    // Function to generate unique code if not present+
    const generateUniqueCode = (recordData) => {
        if (recordData.unique_code) return recordData.unique_code;

        // Generate a unique code based on data
        const date = recordData.sample_date ? recordData.sample_date.replace(/-/g, '') : '';
        const tundishNum = recordData.tundish_number || '0';
        return `TUN${date}${tundishNum}`;
    }

    // Tundish Number options (1-6)
    const tundishNumberOptions = [
        { value: "", label: "Select Tundish Number", hindiLabel: "टनडिस नंबर चुनें" },
        { value: "1", label: "1" },
        { value: "2", label: "2" },
        { value: "3", label: "3" },
        { value: "4", label: "4" },
        { value: "5", label: "5" },
        { value: "6", label: "6" }
    ]

    // Tundish Checklist items
    const tundishChecklistItems = [
        {
            id: "nozzle_plate_check",
            label: "Tundish nozzle plate checking",
            hindiLabel: "टनडिस नोजल प्लेट चेक"
        },
        {
            id: "well_block_check",
            label: "Tundish well block checking",
            hindiLabel: "टनडिस वेल ब्लॉक चेक"
        },
        {
            id: "board_proper_set",
            label: "Tundish board proper set",
            hindiLabel: "टनडिस बोर्ड प्रॉपर सेटिंग"
        },
        {
            id: "board_sand_filling",
            label: "Tundish board sand proper filling",
            hindiLabel: "टनडिस बोर्ड में रेट अच्छे से भरी"
        },
        {
            id: "refractory_slag_cleaning",
            label: "If refractory tundish slag proper cleaning",
            hindiLabel: "अगर रिफ्रैक्टरी हुआ है टनडिस स्लैग अच्छे से साफ हुआ"
        }
    ]

    // Handover Checklist items
    const handoverChecklistItems = [
        {
            id: "handover_proper_check",
            label: "Tundish proper check/well block/board etc",
            hindiLabel: "टुंडिश/कुआं ब्लॉक/बोर्ड आदि की उचित जांच की गई"
        },
        {
            id: "handover_nozzle_installed",
            label: "Nozzle installed",
            hindiLabel: "नोजल स्थापित हो गया"
        },
        {
            id: "handover_masala_inserted",
            label: "Masala proper inserted in nozzle",
            hindiLabel: "नोजल में मसाला सही तरीके से डाला गया"
        }
    ]

    // Status options for tundish checklist - NO DEFAULT SELECTED
    const tundishStatusOptions = [
        { value: "", label: "Select Status", hindiLabel: "स्थिति चुनें" },
        { value: "Done", label: "Done", hindiLabel: "किया गया" },
        { value: "Not Done", label: "Not Done", hindiLabel: "नहीं किया" }
    ]

    // Status options for handover checklist - NO DEFAULT SELECTED
    const handoverStatusOptions = [
        { value: "", label: "Select Status", hindiLabel: "स्थिति चुनें" },
        { value: "Yes", label: "Yes", hindiLabel: "हाँ" },
        { value: "No", label: "No", hindiLabel: "नहीं" }
    ]

    return (
        <div>
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
                                    <CheckCircle className="h-12 w-12 text-green-500" />
                                ) : (
                                    <AlertCircle className="h-12 w-12 text-yellow-500" />
                                )}
                            </div>
                            <div className="text-center">
                                <h3 className={`text-lg font-semibold mb-2 ${popupType === "success" ? 'text-green-800' : 'text-yellow-800'
                                    }`}>
                                    {popupType === "success" ? "सफलता!" : "चेतावनी!"}
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

                {/* Header */}
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="flex-1 min-w-0">
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-red-500 truncate">
                                {viewMode === "form" ? "Create Tundish Form" : "Tundish Form Records"}
                            </h1>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                        {viewMode === "list" && (
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
                            onClick={toggleViewMode}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors w-full sm:w-auto"
                        >
                            {viewMode === "form" ? (
                                <>
                                    <Eye className="h-4 w-4" />
                                    View Records
                                </>
                            ) : (
                                <>
                                    <ArrowLeft className="h-4 w-4" />
                                    Back to Form
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {viewMode === "form" ? (
                    /* FORM VIEW */
                    <div className="rounded-lg border border-gray-200 shadow-md bg-white overflow-hidden">
                        <div className="bg-gradient-to-r from-red-500 to-red-400 border-b border-red-200 p-4">
                            <h2 className="text-white text-lg font-semibold">Tundish Information</h2>
                        </div>

                        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
                            {/* Tundish Number and Mession Name - Two columns on larger screens */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                                <div>
                                    <label htmlFor="tundish_number" className="block text-sm font-medium text-gray-700 mb-2">
                                        Tundish Number / टनडिस नंबर <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        id="tundish_number"
                                        name="tundish_number"
                                        value={formData.tundish_number}
                                        onChange={handleInputChange}
                                        className={`w-full px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm transition-colors ${errors.tundish_number ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                                            }`}
                                    >
                                        {tundishNumberOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.tundish_number && (
                                        <p className="text-red-500 text-xs mt-1.5">{errors.tundish_number}</p>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="tundish_mession_name" className="block text-sm font-medium text-gray-700 mb-2">
                                        Tundish Mession Name / टनडिस मेसन का नाम <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="tundish_mession_name"
                                        name="tundish_mession_name"
                                        value={formData.tundish_mession_name}
                                        onChange={handleInputChange}
                                        className={`w-full px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm transition-colors ${errors.tundish_mession_name ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                                            }`}
                                        placeholder="Enter tundish mession name"
                                    />
                                    {errors.tundish_mession_name && (
                                        <p className="text-red-500 text-xs mt-1.5">{errors.tundish_mession_name}</p>
                                    )}
                                </div>
                            </div>

                            {/* Tundish Checklist Section - Two columns on larger screens */}
                            <div className="border border-gray-200 rounded-lg p-4 md:p-6 bg-gray-50">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4 md:mb-6">
                                    Checklist for tundish / चेकलिस्ट <span className="text-red-500">*</span>
                                </h3>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                                    {tundishChecklistItems.map((item) => (
                                        <div key={item.id} className="p-4 border border-gray-200 rounded-lg hover:bg-white hover:shadow-sm transition-all bg-white">
                                            <div className="mb-3">
                                                <label className="block text-sm font-medium text-gray-700 break-words">
                                                    {item.label}
                                                </label>
                                                <p className="text-xs text-gray-500 mt-1 break-words">
                                                    {item.hindiLabel}
                                                </p>
                                            </div>
                                            <select
                                                value={formData[item.id]}
                                                onChange={(e) => handleChecklistChange(item.id, e.target.value)}
                                                className={`w-full px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm transition-colors ${errors[item.id] ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                                                    }`}
                                            >
                                                {tundishStatusOptions.map((option) => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label} - {option.hindiLabel}
                                                    </option>
                                                ))}
                                            </select>
                                            {errors[item.id] && (
                                                <p className="text-red-500 text-xs mt-1.5">{errors[item.id]}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Handover Checklist Section - Two columns on larger screens */}
                            <div className="border border-gray-200 rounded-lg p-4 md:p-6 bg-gray-50">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4 md:mb-6">
                                    Tundish send to / hand over to production <span className="text-red-500">*</span>
                                </h3>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                                    {handoverChecklistItems.map((item) => (
                                        <div key={item.id} className="p-4 border border-gray-200 rounded-lg hover:bg-white hover:shadow-sm transition-all bg-white">
                                            <div className="mb-3">
                                                <label className="block text-sm font-medium text-gray-700 break-words">
                                                    {item.label}
                                                </label>
                                                <p className="text-xs text-gray-500 mt-1 break-words">
                                                    {item.hindiLabel}
                                                </p>
                                            </div>
                                            <select
                                                value={formData[item.id]}
                                                onChange={(e) => handleChecklistChange(item.id, e.target.value)}
                                                className={`w-full px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm transition-colors ${errors[item.id] ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                                                    }`}
                                            >
                                                {handoverStatusOptions.map((option) => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label} - {option.hindiLabel}
                                                    </option>
                                                ))}
                                            </select>
                                            {errors[item.id] && (
                                                <p className="text-red-500 text-xs mt-1.5">{errors[item.id]}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Operator Names Section - Two columns on larger screens */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                <div>
                                    <label htmlFor="stand1_mould_operator" className="block text-sm font-medium text-gray-700 mb-2">
                                        Stand 1 Mould Operator Name / स्टैंड 1 मोल्ड ऑपरेटर का नाम <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="stand1_mould_operator"
                                        name="stand1_mould_operator"
                                        value={formData.stand1_mould_operator}
                                        onChange={handleInputChange}
                                        className={`w-full px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm transition-colors ${errors.stand1_mould_operator ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                                            }`}
                                        placeholder="Enter stand 1 operator name"
                                    />
                                    {errors.stand1_mould_operator && (
                                        <p className="text-red-500 text-xs mt-1.5">{errors.stand1_mould_operator}</p>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="stand2_mould_operator" className="block text-sm font-medium text-gray-700 mb-2">
                                        Stand 2 Mould Operator Name / स्टैंड 2 मोल्ड ऑपरेटर का नाम <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="stand2_mould_operator"
                                        name="stand2_mould_operator"
                                        value={formData.stand2_mould_operator}
                                        onChange={handleInputChange}
                                        className={`w-full px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm transition-colors ${errors.stand2_mould_operator ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                                            }`}
                                        placeholder="Enter stand 2 operator name"
                                    />
                                    {errors.stand2_mould_operator && (
                                        <p className="text-red-500 text-xs mt-1.5">{errors.stand2_mould_operator}</p>
                                    )}
                                </div>
                            </div>

                            {/* Additional Names Section - Two columns on larger screens */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                                <div>
                                    <label htmlFor="timber_man_name" className="block text-sm font-medium text-gray-700 mb-2">
                                        Timber Man Name / टिम्बर मेन का नाम <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="timber_man_name"
                                        name="timber_man_name"
                                        value={formData.timber_man_name}
                                        onChange={handleInputChange}
                                        className={`w-full px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm transition-colors ${errors.timber_man_name ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                                            }`}
                                        placeholder="Enter timber man name"
                                    />
                                    {errors.timber_man_name && (
                                        <p className="text-red-500 text-xs mt-1.5">{errors.timber_man_name}</p>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="laddle_operator_name" className="block text-sm font-medium text-gray-700 mb-2">
                                        Laddle Operator Name / लेडल ऑपरेटर का नाम <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="laddle_operator_name"
                                        name="laddle_operator_name"
                                        value={formData.laddle_operator_name}
                                        onChange={handleInputChange}
                                        className={`w-full px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm transition-colors ${errors.laddle_operator_name ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                                            }`}
                                        placeholder="Enter laddle operator name"
                                    />
                                    {errors.laddle_operator_name && (
                                        <p className="text-red-500 text-xs mt-1.5">{errors.laddle_operator_name}</p>
                                    )}
                                </div>
                            </div>

                            {/* Incharge & Foreman Section - Two columns on larger screens */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                                <div>
                                    <label htmlFor="shift_incharge_name" className="block text-sm font-medium text-gray-700 mb-2">
                                        Shift Incharge Name / शिफ्ट इंचार्ज का नाम <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="shift_incharge_name"
                                        name="shift_incharge_name"
                                        value={formData.shift_incharge_name}
                                        onChange={handleInputChange}
                                        className={`w-full px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm transition-colors ${errors.shift_incharge_name ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                                            }`}
                                        placeholder="Enter shift incharge name"
                                    />
                                    {errors.shift_incharge_name && (
                                        <p className="text-red-500 text-xs mt-1.5">{errors.shift_incharge_name}</p>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="forman_name" className="block text-sm font-medium text-gray-700 mb-2">
                                        Forman Name / फोरमेन का नाम <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="forman_name"
                                        name="forman_name"
                                        value={formData.forman_name}
                                        onChange={handleInputChange}
                                        className={`w-full px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm transition-colors ${errors.forman_name ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                                            }`}
                                        placeholder="Enter foreman name"
                                    />
                                    {errors.forman_name && (
                                        <p className="text-red-500 text-xs mt-1.5">{errors.forman_name}</p>
                                    )}
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
                                    {isSubmitting ? "Submitting..." : "Submit Tundish Form"}
                                </button>
                            </div>
                        </form>
                    </div>
                ) : (
                    /* LIST VIEW WITH SEARCH - HINDI COLUMN NAMES */
                    <div className="rounded-lg border border-gray-200 shadow-md bg-white overflow-hidden">
                        <div className="bg-gradient-to-r from-red-500 to-red-400 border-b border-red-200 p-4">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div>
                                    <h2 className="text-white text-lg font-semibold">Tundish Form Records</h2>
                                    <p className="text-white text-sm opacity-90">
                                        Total Records: {filteredTundishData.length} {searchTerm && `(Filtered from ${tundishData.length})`}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4">
                            {loading ? (
                                <div className="text-center py-8">
                                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500 mb-4"></div>
                                    <p className="text-gray-600">Loading tundish data...</p>
                                </div>
                            ) : filteredTundishData && filteredTundishData.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Unique Code<br />यूनिक कोड
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Tundish No.<br />टनडिस नंबर
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Date & Time<br />तारीख
                                                </th>
                                                {/* <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Time<br />समय
                                                </th> */}
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Nozzle Plate<br />नोजल प्लेट
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Well Block<br />वेल ब्लॉक
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Board Set<br />बोर्ड सेट
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Sand Filling<br />रेत भरना
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Slag Cleaning<br />स्लैग सफाई
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Tundish Check<br />टनडिस जांच
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Nozzle Installed<br />नोजल स्थापित
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Masala Inserted<br />मसाला डाला
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Tundish Mession<br />टनडिस मेसन
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Stand 1 Operator<br />स्टैंड 1 ऑपरेटर
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Stand 2 Operator<br />स्टैंड 2 ऑपरेटर
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Timber Man<br />टिम्बर मैन
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Laddle Operator<br />लेडल ऑपरेटर
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Shift Incharge<br />शिफ्ट इंचार्ज
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Foreman<br />फोरमैन
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {filteredTundishData.map((record, index) => {
                                                const recordData = record.data || record;

                                                return (
                                                    <tr key={recordData.id || recordData._id || index} className="hover:bg-gray-50">
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {recordData.unique_code || generateUniqueCode(recordData) || 'N/A'}
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                            {recordData.tundish_number || 'N/A'}
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {formatIndianDateTime(recordData.sample_timestamp) || 'N/A'}
                                                        </td>
                                                        {/* <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {recordData.sample_time || 'N/A'}
                                                        </td> */}
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {getYesNoBadge(recordData.nozzle_plate_check, "tundish")}
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {getYesNoBadge(recordData.well_block_check, "tundish")}
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {getYesNoBadge(recordData.board_proper_set, "tundish")}
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {getYesNoBadge(recordData.board_sand_filling, "tundish")}
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {getYesNoBadge(recordData.refractory_slag_cleaning, "tundish")}
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {getYesNoBadge(recordData.handover_proper_check, "handover")}
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {getYesNoBadge(recordData.handover_nozzle_installed, "handover")}
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {getYesNoBadge(recordData.handover_masala_inserted, "handover")}
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {recordData.tundish_mession_name || 'N/A'}
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {recordData.stand1_mould_operator || 'N/A'}
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {recordData.stand2_mould_operator || 'N/A'}
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {recordData.timber_man_name || 'N/A'}
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {recordData.laddle_operator_name || 'N/A'}
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {recordData.shift_incharge_name || 'N/A'}
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {recordData.forman_name || 'N/A'}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <div className="text-gray-500 mb-4">
                                        <p className="text-lg font-medium">
                                            {searchTerm ? "No matching records found" : "No tundish form records found"}
                                        </p>
                                        <p className="text-sm">
                                            {searchTerm ? "Try adjusting your search terms" : "Submit a form first to see records here"}
                                        </p>
                                    </div>
                                    <div className="flex gap-2 justify-center">
                                        {searchTerm && (
                                            <button
                                                onClick={() => setSearchTerm("")}
                                                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                                            >
                                                Clear Search
                                            </button>
                                        )}
                                        <button
                                            onClick={fetchTundishData}
                                            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                                        >
                                            Refresh Data
                                        </button>
                                        <button
                                            onClick={() => setViewMode("form")}
                                            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                                        >
                                            Create New Form
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Add CSS for progress bar animation */}
                <style>{`
                    @keyframes shrink {
                        from { width: 100%; }
                        to { width: 0%; }
                    }
                `}</style>
            </div>
        </div>
    )
}

export default TundishFormPage
