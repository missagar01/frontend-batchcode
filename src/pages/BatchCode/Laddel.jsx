"use client"
import { useState, useEffect } from "react"
import { Save, ArrowLeft, CheckCircle, AlertCircle, X, Eye, Edit, Trash2, Search } from "lucide-react"
// @ts-ignore - JSX component
import * as batchcodeAPI from "../../api/batchcodeApi";

function LaddleFormPage() {

    const [formData, setFormData] = useState({
        laddle_number: "",
        sample_date: "",
        slag_cleaning_top: "Not Done",
        slag_cleaning_bottom: "Not Done",
        nozzle_proper_lancing: "Not Done",
        pursing_plug_cleaning: "Not Done",
        sly_gate_check: "Not Done",
        nozzle_check_cleaning: "Not Done",
        sly_gate_operate: "Not Done",
        nfc_proper_heat: "Not Done",
        nfc_filling_nozzle: "Not Done",
        plate_life: "",
        timber_man_name: "",
        laddle_man_name: "",
        laddle_foreman_name: "",
        supervisor_name: ""
    })

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [popupMessage, setPopupMessage] = useState("")
    const [popupType, setPopupType] = useState("") // "success" or "warning"
    const [showPopup, setShowPopup] = useState(false)
    const [successUniqueCode, setSuccessUniqueCode] = useState("")
    const [errors, setErrors] = useState({})
    const [laddleData, setLaddleData] = useState([])
    const [loading, setLoading] = useState(false)
    const [viewMode, setViewMode] = useState("form") // "form" or "list"
    const [searchTerm, setSearchTerm] = useState("")
    const [filteredLaddleData, setFilteredLaddleData] = useState([])

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

    // Fetch ladle data when in list view
    useEffect(() => {
        if (viewMode === "list") {
            fetchLaddleData()
        }
    }, [viewMode])

    // Filter data when search term or laddleData changes
    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredLaddleData(laddleData)
        } else {
            const filtered = laddleData.filter(record => {
                const recordData = record.data || record
                const searchLower = searchTerm.toLowerCase()

                // Search across all columns
                return (
                    // Search in numeric fields
                    String(recordData.laddle_number || '').toLowerCase().includes(searchLower) ||
                    String(recordData.plate_life || '').toLowerCase().includes(searchLower) ||

                    // Search in text fields
                    String(recordData.timber_man_name || '').toLowerCase().includes(searchLower) ||
                    String(recordData.laddle_man_name || '').toLowerCase().includes(searchLower) ||
                    String(recordData.laddle_foreman_name || '').toLowerCase().includes(searchLower) ||
                    String(recordData.supervisor_name || '').toLowerCase().includes(searchLower) ||

                    // Search in unique code
                    String(recordData.unique_code || generateUniqueCode(recordData) || '').toLowerCase().includes(searchLower) ||

                    // Search in date (both formatted and original)
                    formatIndianDateTime(recordData.sample_date).toLowerCase().includes(searchLower) ||
                    String(recordData.sample_date || '').toLowerCase().includes(searchLower) ||

                    // Search in status fields (Yes/No)
                    String(recordData.slag_cleaning_top === "Done" ? "Yes" : "No").toLowerCase().includes(searchLower) ||
                    String(recordData.slag_cleaning_bottom === "Done" ? "Yes" : "No").toLowerCase().includes(searchLower) ||
                    String(recordData.nozzle_proper_lancing === "Done" ? "Yes" : "No").toLowerCase().includes(searchLower) ||
                    String(recordData.pursing_plug_cleaning === "Done" ? "Yes" : "No").toLowerCase().includes(searchLower) ||
                    String(recordData.sly_gate_check === "Done" ? "Yes" : "No").toLowerCase().includes(searchLower) ||
                    String(recordData.nozzle_check_cleaning === "Done" ? "Yes" : "No").toLowerCase().includes(searchLower) ||
                    String(recordData.sly_gate_operate === "Done" ? "Yes" : "No").toLowerCase().includes(searchLower) ||
                    String(recordData.nfc_proper_heat === "Done" ? "Yes" : "No").toLowerCase().includes(searchLower) ||
                    String(recordData.nfc_filling_nozzle === "Done" ? "Yes" : "No").toLowerCase().includes(searchLower)
                )
            })
            setFilteredLaddleData(filtered)
        }
    }, [searchTerm, laddleData])

    const showPopupMessage = (message, type) => {
        setPopupMessage(message)
        setPopupType(type)
        setShowPopup(true)
    }

    const fetchLaddleData = async () => {
        setLoading(true)
        try {
            const response = await batchcodeAPI.getLaddleChecklists()

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

            setLaddleData(data)

        } catch (error) {
            console.error("❌ Error fetching ladle data:", error)
            showPopupMessage("Error fetching ladle data! / लेडल डेटा प्राप्त करने में त्रुटि!", "warning")
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
        // Clear error when user starts typing
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
        // Clear checklist error when user makes a selection
        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: ""
            }))
        }
    }

    const validateForm = () => {
        const newErrors = {}

        // Required fields validation
        if (!formData.laddle_number) {
            newErrors.laddle_number = "Laddle Number is required"
        }
        if (!formData.sample_date) {
            newErrors.sample_date = "Date is required"
        }
        if (!formData.plate_life) {
            newErrors.plate_life = "Plate life is required"
        }
        if (!formData.timber_man_name.trim()) {
            newErrors.timber_man_name = "Timber Man Name is required"
        }
        if (!formData.laddle_man_name.trim()) {
            newErrors.laddle_man_name = "Laddle Man Name is required"
        }
        if (!formData.laddle_foreman_name.trim()) {
            newErrors.laddle_foreman_name = "Laddle Foreman Name is required"
        }
        if (!formData.supervisor_name.trim()) {
            newErrors.supervisor_name = "Supervisor Name is required"
        }

        // Validate that all checklist items have values (both "Done" and "Not Done" are valid)
        const checklistFields = [
            'slag_cleaning_top', 'slag_cleaning_bottom', 'nozzle_proper_lancing',
            'pursing_plug_cleaning', 'sly_gate_check', 'nozzle_check_cleaning',
            'sly_gate_operate', 'nfc_proper_heat', 'nfc_filling_nozzle'
        ]

        checklistFields.forEach(field => {
            if (!formData[field]) {
                newErrors[field] = "Please select a status"
            }
            // Remove the "Not Done" check - both "Done" and "Not Done" are valid selections
        })

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        // Validate all fields
        if (!validateForm()) {
            showPopupMessage("Please fill all required fields correctly! / कृपया सभी आवश्यक फ़ील्ड्स सही से भरें!", "warning")
            return
        }

        setIsSubmitting(true)

        try {
            // Prepare data for submission - convert laddle_number and plate_life to numbers
            // Backend expects sample_timestamp (auto-generated if not provided) and sample_date
            const submissionData = {
                ...formData,
                laddle_number: parseInt(formData.laddle_number),
                plate_life: formData.plate_life ? parseInt(formData.plate_life) : null,
                // sample_timestamp will be auto-generated by backend if not provided
                // sample_date is already in formData
            }

            const response = await batchcodeAPI.submitLaddleChecklist(submissionData)

            if (response.data.success) {
                // Extract unique_code from response - try multiple possible locations
                const uniqueCode = response.data.data?.unique_code
                    || response.data?.data?.unique_code
                    || response.data?.unique_code
                    || (response.data.data && generateUniqueCode(response.data.data))
                    || generateUniqueCode(submissionData)
                    || ""
                setSuccessUniqueCode(uniqueCode)
                showPopupMessage("Laddle form submitted successfully! / लेडल फॉर्म सफलतापूर्वक सबमिट हो गया!", "success")

                // Reset form
                setFormData({
                    laddle_number: "",
                    sample_date: "",
                    slag_cleaning_top: "Not Done",
                    slag_cleaning_bottom: "Not Done",
                    nozzle_proper_lancing: "Not Done",
                    pursing_plug_cleaning: "Not Done",
                    sly_gate_check: "Not Done",
                    nozzle_check_cleaning: "Not Done",
                    sly_gate_operate: "Not Done",
                    nfc_proper_heat: "Not Done",
                    nfc_filling_nozzle: "Not Done",
                    plate_life: "",
                    timber_man_name: "",
                    laddle_man_name: "",
                    laddle_foreman_name: "",
                    supervisor_name: ""
                })
                setErrors({})

                // Refresh data if in list view
                if (viewMode === "list") {
                    fetchLaddleData()
                }
            } else {
                throw new Error(response.data.message || "Failed to submit form")
            }
        } catch (error) {
            console.error("Error submitting form:", error)
            showPopupMessage("Error submitting form. Please try again. / फॉर्म सबमिट करने में त्रुटि, कृपया पुनः प्रयास करें!", "warning")
        } finally {
            setIsSubmitting(false)
        }
    }

    const toggleViewMode = () => {
        setViewMode(prev => prev === "form" ? "list" : "form")
        setSearchTerm("") // Clear search when switching views
    }

    const getYesNoBadge = (status) => {
        return status === "Done" ? (
            <span className="inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 w-12">
                Yes
            </span>
        ) : (
            <span className="inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 w-12">
                No
            </span>
        )
    }

    // Function to format date in Indian format (DD-MM-YYYY)
    const formatIndianDateTime = (dateString) => {
        if (!dateString) return '';

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

            return `${day}-${month}-${year}`;
        } catch (error) {
            console.error('Error formatting date:', error);
            return dateString;
        }
    }

    // Function to generate unique code if not present
    const generateUniqueCode = (recordData) => {
        if (recordData.unique_code) return recordData.unique_code;

        // Generate a unique code based on data
        const date = recordData.sample_date ? recordData.sample_date.replace(/-/g, '') : '';
        const laddleNum = recordData.laddle_number || '0';
        return `LAD${date}${laddleNum}`;
    }

    const checklistItems = [
        {
            id: "slag_cleaning_top",
            label: "Slag cleaning in top area",
            hindiLabel: "लेडल के उपरी भाग का स्लैग साफ हो गया"
        },
        {
            id: "slag_cleaning_bottom",
            label: "Slag remove in bottom area",
            hindiLabel: "लेडल के निचे भाग का स्लैग साफ हो गया"
        },
        {
            id: "nozzle_proper_lancing",
            label: "Nozzle proper lancing",
            hindiLabel: "नोजल की उचित लैंसिंग की गई"
        },
        {
            id: "pursing_plug_cleaning",
            label: "Pursing plug proper cleaning",
            hindiLabel: "पर्सिंग प्लेग की उचित सफाई की गई"
        },
        {
            id: "sly_gate_check",
            label: "Sly gate plate/machine/frame proper check",
            hindiLabel: "स्लाइ गेट प्लेट/मशीन/फ्रेम की उचित जांच की गई"
        },
        {
            id: "nozzle_check_cleaning",
            label: "Nozzle check & cleaning",
            hindiLabel: "नोजल की जाँच और सफाई"
        },
        {
            id: "sly_gate_operate",
            label: "Sly gate operate 3 times with 80 pressure",
            hindiLabel: "क्या आपने 80 दबाव के साथ 3 बार स्ली गेट संचालित किया"
        },
        {
            id: "nfc_proper_heat",
            label: "NFC proper heat",
            hindiLabel: "NFC को अच्छे से गर्म किया गया"
        },
        {
            id: "nfc_filling_nozzle",
            label: "NFC proper filling in nozzle",
            hindiLabel: "क्या आपने नोजल में एनएफसी ठीक से भरा है"
        }
    ]

    // Laddle Number options for dropdown (1-8)
    const laddleNumberOptions = [
        { value: "", label: "Select Laddle Number", hindiLabel: "लेडल नंबर चुनें" },
        { value: "1", label: "1", hindiLabel: "1" },
        { value: "2", label: "2", hindiLabel: "2" },
        { value: "3", label: "3", hindiLabel: "3" },
        { value: "4", label: "4", hindiLabel: "4" },
        { value: "5", label: "5", hindiLabel: "5" },
        { value: "6", label: "6", hindiLabel: "6" },
        { value: "7", label: "7", hindiLabel: "7" },
        { value: "8", label: "8", hindiLabel: "8" }
    ]

    // Plate life options for dropdown
    const plateLifeOptions = [
        { value: "", label: "Select plate life", hindiLabel: "प्लेट की लाइफ चुनें" },
        { value: "1", label: "1", hindiLabel: "1" },
        { value: "2", label: "2", hindiLabel: "2" },
        { value: "3", label: "3", hindiLabel: "3" },
        { value: "4", label: "4", hindiLabel: "4" }
    ]

    // Status options for checklist items
    const statusOptions = [
        { value: "Done", label: "Done", hindiLabel: "किया गया" },
        { value: "Not Done", label: "Not Done", hindiLabel: "नहीं किया" }
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

                {/* Header */}
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="flex-1 min-w-0">
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-red-500 truncate">
                                {viewMode === "form" ? "Create Laddle Form" : "Laddle Form Records"}
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
                            <h2 className="text-white text-lg font-semibold">Laddle Information</h2>
                        </div>

                        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
                            {/* Laddle Number and Date Section - Two columns on larger screens */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
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

                                <div>
                                    <label htmlFor="sample_date" className="block text-sm font-medium text-gray-700 mb-2">
                                        Date / दिनांक <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        id="sample_date"
                                        name="sample_date"
                                        value={formData.sample_date}
                                        onChange={handleInputChange}
                                        min="2000-01-01"
                                        max="2100-12-31"
                                        className={`w-full px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm transition-colors ${errors.sample_date ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                                            }`}
                                        style={{ WebkitAppearance: 'none', appearance: 'none' }}
                                    />
                                    {errors.sample_date && (
                                        <p className="text-red-500 text-xs mt-1.5">{errors.sample_date}</p>
                                    )}
                                </div>
                            </div>

                            {/* Completion Checklist Section - Two columns on larger screens */}
                            <div className="border border-gray-200 rounded-lg p-4 md:p-6 bg-gray-50">
                                <div className="flex items-center justify-between mb-4 md:mb-6">
                                    <h3 className="text-lg font-semibold text-gray-800">
                                        Completion Checklist / लेडल बनाने का चेकलिस्ट <span className="text-red-500">*</span>
                                    </h3>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                                    {checklistItems.map((item) => (
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
                                                {statusOptions.map((option) => (
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

                            {/* Plate Life and Timber Man Name - Two columns on larger screens */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                                <div>
                                    <label htmlFor="plate_life" className="block text-sm font-medium text-gray-700 mb-2">
                                        Plate life / प्लेट की लाइफ कितनी है <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        id="plate_life"
                                        name="plate_life"
                                        value={formData.plate_life}
                                        onChange={handleInputChange}
                                        className={`w-full px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm transition-colors ${errors.plate_life ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                                            }`}
                                    >
                                        {plateLifeOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.plate_life && (
                                        <p className="text-red-500 text-xs mt-1.5">{errors.plate_life}</p>
                                    )}
                                </div>

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
                            </div>

                            {/* Checked By Section - Two columns on larger screens */}
                            <div className="border border-gray-200 rounded-lg p-4 md:p-6 bg-gray-50">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4 md:mb-6">
                                    Checked By - किस किस के द्वारा चेक किया गया <span className="text-red-500">*</span>
                                </h3>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                                    <div>
                                        <label htmlFor="laddle_man_name" className="block text-sm font-medium text-gray-700 mb-2">
                                            Laddle Man Name / लेडल मेन का नाम <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            id="laddle_man_name"
                                            name="laddle_man_name"
                                            value={formData.laddle_man_name}
                                            onChange={handleInputChange}
                                            className={`w-full px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm transition-colors ${errors.laddle_man_name ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                                                }`}
                                            placeholder="Enter laddle man name"
                                        />
                                        {errors.laddle_man_name && (
                                            <p className="text-red-500 text-xs mt-1.5">{errors.laddle_man_name}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label htmlFor="laddle_foreman_name" className="block text-sm font-medium text-gray-700 mb-2">
                                            Laddle Foreman Name / लेडल फोरमेन का नाम <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            id="laddle_foreman_name"
                                            name="laddle_foreman_name"
                                            value={formData.laddle_foreman_name}
                                            onChange={handleInputChange}
                                            className={`w-full px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm transition-colors ${errors.laddle_foreman_name ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                                                }`}
                                            placeholder="Enter laddle foreman name"
                                        />
                                        {errors.laddle_foreman_name && (
                                            <p className="text-red-500 text-xs mt-1.5">{errors.laddle_foreman_name}</p>
                                        )}
                                    </div>

                                    <div className="md:col-span-2">
                                        <label htmlFor="supervisor_name" className="block text-sm font-medium text-gray-700 mb-2">
                                            Supervisor Name (Controller) / सुपरवाइजर का नाम <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            id="supervisor_name"
                                            name="supervisor_name"
                                            value={formData.supervisor_name}
                                            onChange={handleInputChange}
                                            className={`w-full px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm transition-colors ${errors.supervisor_name ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                                                }`}
                                            placeholder="Enter supervisor name"
                                        />
                                        {errors.supervisor_name && (
                                            <p className="text-red-500 text-xs mt-1.5">{errors.supervisor_name}</p>
                                        )}
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
                                    {isSubmitting ? "Submitting..." : "Submit Laddle Form"}
                                </button>
                            </div>
                        </form>
                    </div>
                ) : (
                    /* LIST VIEW WITH SEARCH */
                    <div className="rounded-lg border border-gray-200 shadow-md bg-white overflow-hidden">
                        <div className="bg-gradient-to-r from-red-500 to-red-400 border-b border-red-200 p-4">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div>
                                    <h2 className="text-white text-lg font-semibold">Laddle Form Records</h2>
                                    <p className="text-white text-sm opacity-90">
                                        Total Records: {filteredLaddleData.length} {searchTerm && `(Filtered from ${laddleData.length})`}
                                    </p>
                                </div>

                                {/* Search Bar */}

                            </div>
                        </div>

                        <div className="p-4">
                            {loading ? (
                                <div className="text-center py-8">
                                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500 mb-4"></div>
                                    <p className="text-gray-600">Loading ladle data...</p>
                                </div>
                            ) : filteredLaddleData && filteredLaddleData.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Unique Code / यूनिक कोड
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Laddle No. / लेडल नंबर
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Date / तारीख
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Slag Top / लेडल के उपरी भाग का स्लैग साफ हो गया
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Slag Bottom / लेडल के निचे भाग का स्लैग साफ हो गया
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Nozzle Lancing / नोजल की उचित लैंसिंग की गई
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Pursing Plug / पर्सिंग प्लेग की उचित सफाई की गई
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Sly Gate Check / स्लाइ गेट प्लेट/मशीन/फ्रेम की उचित जांच की गई
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Nozzle Check / नोजल की जाँच और सफाई
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Sly Gate Operate / क्या आपने 80 दबाव के साथ 3 बार स्ली गेट संचालित किया
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    NFC Heat / NFC को अच्छे से गर्म किया गया
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    NFC Filling / क्या आपने नोजल में एनएफसी ठीक से भरा है
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Plate Life / प्लेट लाइफ
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Timber Man / टिम्बर मैन
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Laddle Man / लेडल मैन
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Laddle Foreman / लेडल फोरमैन
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Supervisor / सुपरवाइजर
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {filteredLaddleData.map((record, index) => {
                                                // Safe data access with fallbacks
                                                const recordData = record.data || record;

                                                return (
                                                    <tr key={recordData.id || recordData._id || index} className="hover:bg-gray-50">
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {recordData.unique_code || generateUniqueCode(recordData) || 'N/A'}
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                            {recordData.laddle_number || 'N/A'}
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {formatIndianDateTime(recordData.sample_date) || 'N/A'}
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {getYesNoBadge(recordData.slag_cleaning_top)}
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {getYesNoBadge(recordData.slag_cleaning_bottom)}
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {getYesNoBadge(recordData.nozzle_proper_lancing)}
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {getYesNoBadge(recordData.pursing_plug_cleaning)}
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {getYesNoBadge(recordData.sly_gate_check)}
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {getYesNoBadge(recordData.nozzle_check_cleaning)}
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {getYesNoBadge(recordData.sly_gate_operate)}
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {getYesNoBadge(recordData.nfc_proper_heat)}
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {getYesNoBadge(recordData.nfc_filling_nozzle)}
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {recordData.plate_life || 'N/A'}
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {recordData.timber_man_name || 'N/A'}
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {recordData.laddle_man_name || 'N/A'}
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {recordData.laddle_foreman_name || 'N/A'}
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {recordData.supervisor_name || 'N/A'}
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
                                            {searchTerm ? "No matching records found" : "No ladle form records found"}
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
                                            onClick={fetchLaddleData}
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

export default LaddleFormPage
