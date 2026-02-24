"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import {
    Save, ArrowLeft, CheckCircle, AlertCircle, X, Eye, Edit, Trash2, Search,
    Calendar, Hash, ChevronDown, HardHat, Droplets, Shield, User, UserPlus,
    Send, Info, ClipboardEdit
} from "lucide-react"
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
        supervisor_name: "",
        dip_reading: ""
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
    const sampleDateInputRef = useRef(null)

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

    const fetchLaddleData = useCallback(async (isSilent = false) => {
        if (!isSilent) setLoading(true)
        try {
            const response = await batchcodeAPI.getLaddleChecklists()
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
            if (!isSilent) showPopupMessage("Error fetching ladle data! / लेडल डेटा प्राप्त करने में त्रुटि!", "warning")
        } finally {
            if (!isSilent) setLoading(false)
        }
    }, [])

    // Fetch ladle data when in list view
    useEffect(() => {
        if (viewMode === "list") {
            fetchLaddleData()
            // Auto-refresh every 10 seconds
            const interval = setInterval(() => {
                fetchLaddleData(true)
            }, 10000)
            return () => clearInterval(interval)
        }
    }, [viewMode, fetchLaddleData])

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

    const openSampleDatePicker = () => {
        const input = sampleDateInputRef.current
        if (!input) return

        input.focus()

        if (typeof input.showPicker === "function") {
            try {
                input.showPicker()
            } catch {
                // Some browsers only allow showPicker on strict click gestures.
                // Focusing the input still allows native date selection.
            }
        }
    }

    const handleSampleDateChange = (e) => {
        handleInputChange(e)
        // Native date picker usually closes automatically; blur ensures clean close behavior.
        if (typeof e.target.blur === "function") {
            e.target.blur()
        }
    }

    const formatIndianDateTime = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Invalid Date';
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear();
            const hour = date.getHours().toString().padStart(2, '0');
            const minute = date.getMinutes().toString().padStart(2, '0');
            const second = date.getSeconds().toString().padStart(2, '0');
            return `${day}-${month}-${year} ${hour}:${minute}:${second}`;
        } catch (error) {
            console.error('Error formatting date:', error);
            return 'Invalid Date';
        }
    }

    const generateUniqueCode = (recordData) => {
        if (recordData.unique_code) return recordData.unique_code;
        return `LAD-${recordData.id || Math.floor(Math.random() * 1000)}`;
    }

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
                    String(recordData.nfc_filling_nozzle === "Done" ? "Yes" : "No").toLowerCase().includes(searchLower) ||
                    String(recordData.dip_reading || '').toLowerCase().includes(searchLower)
                )
            })
            setFilteredLaddleData(filtered)
        }
    }, [searchTerm, laddleData])

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
        if (!formData.dip_reading.trim()) {
            newErrors.dip_reading = "Dip Reading is required"
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
                    supervisor_name: "",
                    dip_reading: ""
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
        <div className="min-h-screen bg-slate-50">
            {/* Popup Modal */}
            {showPopup && (
                <div className="fixed inset-0 flex items-center justify-center z-[100] px-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={handleClosePopup} />
                    <div className={`relative w-full max-w-sm transform transition-all duration-300 p-6 rounded-2xl shadow-2xl bg-white border-t-8 ${popupType === "success" ? 'border-green-500' : 'border-amber-500'}`}>
                        <button onClick={handleClosePopup} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        <div className="flex flex-col items-center text-center">
                            <div className={`p-4 rounded-full mb-4 ${popupType === "success" ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                                {popupType === "success" ? <CheckCircle size={32} /> : <AlertCircle size={32} />}
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">{popupType === "success" ? "Success" : "Warning"}</h3>
                            <p className="text-slate-600 text-sm mb-6">{popupMessage}</p>
                            {popupType === "success" && successUniqueCode && (
                                <div className="w-full bg-slate-50 rounded-xl p-3 mb-6">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Unique Code</p>
                                    <p className="text-lg font-mono font-bold text-slate-700">{successUniqueCode}</p>
                                </div>
                            )}
                            <button onClick={handleClosePopup} className={`w-full py-3 rounded-xl font-bold text-white transition-all active:scale-95 ${popupType === "success" ? 'bg-green-500 hover:bg-green-600' : 'bg-amber-500 hover:bg-amber-600'}`}>
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Header */}
            <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
                <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-red-600 rounded-xl shadow-lg shadow-red-200">
                                <ClipboardEdit className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-none">Laddle <span className="text-red-600">Form</span></h1>
                                <div className="flex items-center gap-2 mt-1">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{viewMode === "form" ? "New Entry" : "Historical Records"}</p>
                                    {viewMode === "list" && (
                                        <div className="flex items-center gap-1.5 py-0.5 px-2 bg-green-50 text-green-700 rounded-full border border-green-100 animate-pulse">
                                            <span className="w-1 h-1 rounded-full bg-green-500"></span>
                                            <span className="text-[9px] font-black uppercase tracking-tight">Live Sync</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {viewMode === "list" && (
                                <div className="relative flex-1 min-w-[200px]">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Search records..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all"
                                    />
                                    {searchTerm && <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><X size={14} /></button>}
                                </div>
                            )}
                            <button
                                onClick={toggleViewMode}
                                className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 whitespace-nowrap ${viewMode === "form" ? "bg-slate-900 text-white hover:bg-black" : "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-200"}`}
                            >
                                {viewMode === "form" ? <><Eye size={18} /><span>View Records</span></> : <><ArrowLeft size={18} /><span>Back to Form</span></>}
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                {viewMode === "form" ? (
                    <div className="max-w-full mx-auto">
                        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
                            {/* Section: Logistics */}
                            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200">
                                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                                    <span className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center text-sm">01</span>
                                    Logistics Information / लॉजिस्टिक्स जानकारी
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700 flex items-center gap-1">Laddle Number <span className="text-slate-400 font-normal">/ लेडल नंबर</span> <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <select
                                                name="laddle_number"
                                                value={formData.laddle_number}
                                                onChange={handleInputChange}
                                                className={`w-full appearance-none pl-10 pr-10 py-3 bg-slate-50 border-2 rounded-xl text-sm font-bold focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all ${errors.laddle_number ? 'border-red-200 bg-red-50' : 'border-slate-100'}`}
                                            >
                                                {laddleNumberOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label} {opt.hindiLabel && `- ${opt.hindiLabel}`}</option>)}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        </div>
                                        {errors.laddle_number && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.laddle_number}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700 flex items-center gap-1">Sample Date <span className="text-slate-400 font-normal">/ दिनांक</span> <span className="text-red-500">*</span></label>
                                        <div className="relative group" onClick={openSampleDatePicker}>
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-hover:text-red-500" size={18} />
                                            <input
                                                ref={sampleDateInputRef}
                                                type="date"
                                                name="sample_date"
                                                value={formData.sample_date}
                                                onChange={handleSampleDateChange}
                                                className={`w-full pl-10 pr-4 py-3 bg-slate-50 border-2 rounded-xl text-sm font-bold focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all ${errors.sample_date ? 'border-red-200 bg-red-50' : 'border-slate-100'}`}
                                            />
                                        </div>
                                        {errors.sample_date && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.sample_date}</p>}
                                    </div>
                                </div>
                            </div>

                            {/* Section: Maintenance Checklist */}
                            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200">
                                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                                    <span className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center text-sm">02</span>
                                    Maintenance Checklist / चेकलिस्ट
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                    {checklistItems.map((item) => (
                                        <div key={item.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
                                            <div>
                                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Checking Point</p>
                                                <p className="text-sm font-bold text-slate-800 leading-tight">{item.label}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{item.hindiLabel}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                {statusOptions.map((opt) => (
                                                    <button
                                                        key={opt.value}
                                                        type="button"
                                                        onClick={() => handleChecklistChange(item.id, opt.value)}
                                                        className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all border-2 ${formData[item.id] === opt.value
                                                            ? opt.value === 'Done' ? 'bg-green-500 border-green-500 text-white shadow-lg shadow-green-100' : 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-100'
                                                            : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                                                    >
                                                        {opt.label.toUpperCase()}
                                                    </button>
                                                ))}
                                            </div>
                                            {errors[item.id] && <p className="text-red-500 text-[10px] font-bold text-center mt-1">Required*</p>}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Section: Observables & Crew */}
                            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200">
                                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                                    <span className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center text-sm">03</span>
                                    Observations & Crew / टिप्पणियां एवं टीम
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">Plate Life <span className="text-slate-400 font-normal">/ लाइफ</span></label>
                                        <div className="relative">
                                            <select
                                                name="plate_life"
                                                value={formData.plate_life}
                                                onChange={handleInputChange}
                                                className="w-full appearance-none px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all"
                                            >
                                                {plateLifeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        </div>
                                    </div>
                                    {[
                                        { id: 'dip_reading', label: 'Dip Reading', h: 'डिप रीडिंग', icon: <Droplets size={18} /> },
                                        { id: 'timber_man_name', label: 'Timber Man', h: 'टिम्बर मेन', icon: <Shield size={18} /> },
                                        { id: 'laddle_man_name', label: 'Laddle Man', h: 'लेडल मेन', icon: <User size={18} /> },
                                        { id: 'laddle_foreman_name', label: 'Foreman', h: 'फोरमेन', icon: <UserPlus size={18} /> },
                                        { id: 'supervisor_name', label: 'Supervisor', h: 'सुपरवाइजर', icon: <HardHat size={18} /> }
                                    ].map(f => (
                                        <div key={f.id} className="space-y-2">
                                            <label className="text-sm font-bold text-slate-700">{f.label} <span className="text-slate-400 font-normal">/ {f.h}</span> <span className="text-red-500">*</span></label>
                                            <div className="relative group">
                                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-red-500">{f.icon}</div>
                                                <input
                                                    type="text"
                                                    name={f.id}
                                                    value={formData[f.id]}
                                                    onChange={handleInputChange}
                                                    placeholder={`Enter ${f.label.toLowerCase()}`}
                                                    className={`w-full pl-10 pr-4 py-3 bg-slate-50 border-2 rounded-xl text-sm font-bold focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all ${errors[f.id] ? 'border-red-200 bg-red-50' : 'border-slate-100'}`}
                                                />
                                            </div>
                                            {errors[f.id] && <p className="text-red-500 text-[10px] font-bold mt-1">{errors[f.id]}</p>}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Form Actions */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-4">
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Info size={14} className="text-red-500" /> Verify all check points before final submission
                                </p>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full sm:w-auto min-w-[200px] px-8 py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-slate-300 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {isSubmitting ? <><div className="w-4 h-4 border-2 border-slate-400 border-t-white rounded-full animate-spin"></div><span>Processing...</span></> : <><Save size={20} /><span>Save Report</span></>}
                                </button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        {loading ? (
                            <div className="py-32 flex flex-col items-center justify-center">
                                <div className="w-12 h-12 border-4 border-slate-100 border-t-red-600 rounded-full animate-spin"></div>
                                <p className="mt-4 text-xs font-black text-slate-400 uppercase tracking-widest">Loading Records...</p>
                            </div>
                        ) : filteredLaddleData.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[1000px]">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                            {[
                                                { t: 'ID', h: 'आईडी' },
                                                { t: 'Ladle No.', h: 'लेडल नंबर' },
                                                { t: 'Date', h: 'तारीख' },
                                                { t: 'Checklist Status', h: 'चेकलिस्ट विवरण' },
                                                { t: 'Plate Life', h: 'लाइफ' },
                                                { t: 'Dip Reading', h: 'डिप रीडिंग' },
                                                { t: 'Crew Details', h: 'टीम सदस्य' }
                                            ].map(col => (
                                                <th key={col.t} className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                    <div className="flex flex-col">
                                                        <span>{col.t}</span>
                                                        <span className="text-[9px] font-medium text-slate-400 italic normal-case tracking-normal">{col.h}</span>
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredLaddleData.map((d, i) => {
                                            const r = d.data || d;
                                            return (
                                                <tr key={r.id || i} className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="px-6 py-4 whitespace-nowrap"><span className="font-mono text-[11px] font-bold text-slate-400 group-hover:text-red-600 transition-colors">#{r.unique_code || '---'}</span></td>
                                                    <td className="px-6 py-4 whitespace-nowrap"><span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 font-black text-slate-700 text-sm">{r.laddle_number || '0'}</span></td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold text-slate-800">{formatIndianDateTime(r.sample_date)}</span>
                                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Verified</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-wrap gap-1.5 max-w-[300px]">
                                                            {checklistItems.slice(0, 3).map(item => (
                                                                <div key={item.id} className="px-2 py-1 rounded-lg bg-white border border-slate-200 flex items-center gap-1.5 shadow-sm">
                                                                    <div className={`w-1.5 h-1.5 rounded-full ${r[item.id] === 'Done' ? 'bg-green-500' : 'bg-red-600'}`}></div>
                                                                    <span className="text-[9px] font-black text-slate-500 whitespace-nowrap uppercase tracking-tighter">{item.label.split(' ')[0]}</span>
                                                                </div>
                                                            ))}
                                                            {checklistItems.length > 3 && <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">+{checklistItems.length - 3}</span>}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap"><span className="px-3 py-1 rounded-full bg-red-50 text-red-600 text-[10px] font-black border border-red-100">LIFE-{r.plate_life || '0'}</span></td>
                                                    <td className="px-6 py-4 whitespace-nowrap"><span className="text-sm font-black text-slate-700">{r.dip_reading || '---'}</span></td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col gap-0.5 min-w-[120px]">
                                                            <span className="text-[10px] font-bold text-slate-800 leading-tight">{r.supervisor_name || 'N/A'}</span>
                                                            <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest italic">Supervisor</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="py-32 flex flex-col items-center justify-center text-center px-6">
                                <div className="p-6 bg-slate-50 rounded-full mb-6"><Search size={48} className="text-slate-200" /></div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">No Records Found</h3>
                                <p className="text-slate-500 text-sm max-w-md mx-auto mb-8">We couldn't find any maintenance reports matching your current search criteria. Try a different search term or create a new entry.</p>
                                <button onClick={() => setViewMode("form")} className="flex items-center gap-2 px-8 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-200 transition-all"><Plus size={20} /><span>Create New Report</span></button>
                            </div>
                        )}
                    </div>
                )}
            </main>

            <footer className="w-full px-4 sm:px-6 lg:px-8 py-10 bg-white border-t border-slate-200 mt-12">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">&copy; 2026 STEEL ERP SYSTEM MODULE</p>
                    <div className="flex gap-6">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Privacy Policy</span>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Audit Trails</span>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LaddleFormPage;
