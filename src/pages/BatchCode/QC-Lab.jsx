"use client"
import { useState, useEffect, useCallback, useMemo } from "react"
import { CheckCircle2, X, Search, History, ArrowLeft, Edit, Save, Camera, AlertCircle, FileText, Beaker } from "lucide-react"
// @ts-ignore - JSX component
import * as batchcodeAPI from "../../api/batchcodeApi";
import { API_BASE_URL } from "../../api/apiClient";

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

function QCLabDataPage() {
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
    const [showImagePopup, setShowImagePopup] = useState(false)
    const [selectedImage, setSelectedImage] = useState("")

    // State for process form
    const [showProcessForm, setShowProcessForm] = useState(false)
    const [selectedRow, setSelectedRow] = useState(null)
    const [processFormData, setProcessFormData] = useState({
        sms_batch_code: "",
        sampled_furnace_number: "",
        sampled_sequence: "",
        sampled_laddle_number: "",
        shift: "",
        final_c: "",
        final_mn: "",
        final_s: "",
        final_p: "",
        sample_tested_by: "",
        remarks: "",
        test_report_picture: null
    })

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

    const showPopupMessage = (message, type) => {
        setPopupMessage(message)
        setPopupType(type)
        setShowPopup(true)
    }

    useEffect(() => {
        const role = sessionStorage.getItem("role")
        const user = sessionStorage.getItem("username")
        setUserRole(role || "")
        setUsername(user || "")
    }, [])

    // Fetch pending SMS data (SMS Register records that don't have QC Lab tests)
    const fetchPendingSMSData = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            // console.log('🔄 Fetching pending SMS data...')

            // Fetch SMS Register data
            const smsResponse = await batchcodeAPI.getSMSRegisterHistory()
            let smsData = [];

            // Handle different response structures
            if (Array.isArray(smsResponse.data)) {
                smsData = smsResponse.data;
            } else if (smsResponse.data && Array.isArray(smsResponse.data.data)) {
                smsData = smsResponse.data.data;
            } else if (smsResponse.data && smsResponse.data.success && Array.isArray(smsResponse.data.data)) {
                smsData = smsResponse.data.data;
            } else {
                smsData = [];
            }

            // console.log('✅ SMS Data fetched:', smsData.length, 'records')

            // Fetch existing QC Lab tests to filter out already processed SMS records
            const qcResponse = await batchcodeAPI.getQCLabHistory()
            let existingTests = [];

            // Handle different response structures for QC Lab data
            if (Array.isArray(qcResponse.data)) {
                existingTests = qcResponse.data;
            } else if (qcResponse.data && Array.isArray(qcResponse.data.data)) {
                existingTests = qcResponse.data.data;
            } else if (qcResponse.data && qcResponse.data.success && Array.isArray(qcResponse.data.data)) {
                existingTests = qcResponse.data.data;
            }

            // console.log('QC Lab Tests fetched:', existingTests.length, 'records')

            // Get all SMS batch codes that already have QC Lab tests
            const processedBatchCodes = new Set(
                existingTests
                    .map(qcTest => qcTest.sms_batch_code)
                    .filter(code => code) // Remove null/undefined
            )

            // console.log('✅ Processed SMS Batch Codes:', Array.from(processedBatchCodes))

            // Filter SMS data to only show records that don't have QC Lab tests
            const pendingData = smsData.filter(smsRecord => {
                // Generate unique code for SMS record
                const smsBatchCode = smsRecord.unique_code || generateUniqueCode(smsRecord)

                // Check if this SMS batch code exists in QC Lab tests
                const isProcessed = processedBatchCodes.has(smsBatchCode)

                // console.log(`📋 SMS Record: ${smsBatchCode} - Processed: ${isProcessed}`)

                return !isProcessed
            })

            // console.log('✅ Final pending data:', pendingData.length, 'records')
            setPendingSMSData(pendingData)
            setLoading(false)

        } catch (error) {
            console.error("❌ Error fetching pending SMS data:", error)
            showPopupMessage("Error fetching pending SMS data! / लंबित एसएमएस डेटा प्राप्त करने में त्रुटि!", "warning")
            setPendingSMSData([])
            setLoading(false)
        }
    }, [])

    // Fetch QC Lab history data - FIXED VERSION
    const fetchHistoryData = useCallback(async () => {
        try {
            setLoading(true)
            // console.log('🔄 Fetching QC Lab history data...')

            const response = await batchcodeAPI.getQCLabHistory()
            // console.log('📦 Raw QC Lab API response:', response)
            // console.log('📊 Response data:', response.data)

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

            // console.log('✅ Processed QC Lab history data:', data)
            setHistoryData(data)
            setLoading(false)
        } catch (error) {
            console.error("❌ Error fetching QC Lab history:", error)
            console.error("🔧 Error details:", error.response?.data)
            showPopupMessage("Error fetching QC Lab history! / क्यूसी लैब इतिहास प्राप्त करने में त्रुटि!", "warning")
            setHistoryData([]) // Set empty array on error
            setLoading(false)
        }
    }, [])

    // Handle process button click for pending SMS records
    const handleProcessClick = useCallback((smsRecord) => {
        setSelectedRow(smsRecord)

        // Generate unique code for SMS record
        const uniqueCode = smsRecord.unique_code || generateUniqueCode(smsRecord)

        // Pre-fill form with SMS data
        setProcessFormData({
            sms_batch_code: uniqueCode,
            sampled_furnace_number: smsRecord.furnace_number || "",
            sampled_sequence: smsRecord.sequence_number || "",
            sampled_laddle_number: smsRecord.laddle_number?.toString() || "",
            shift: "",
            final_c: "",
            final_mn: "",
            final_s: "",
            final_p: "",
            sample_tested_by: username || "",
            remarks: "",
            test_report_picture: null
        })
        setShowProcessForm(true)
    }, [username])

    // Handle process form input changes
    const handleProcessFormChange = useCallback((field, value) => {
        setProcessFormData(prev => ({
            ...prev,
            [field]: value
        }))
    }, [])

    // Handle picture upload
    const handlePictureUpload = useCallback((e) => {
        const file = e.target.files[0]
        if (file) {
            setProcessFormData(prev => ({
                ...prev,
                test_report_picture: file
            }))
        }
    }, [])

    // const API_BASE_URL = 'http://localhost:3005';

    const handleViewImage = useCallback(async (imageUrl) => {
        if (!imageUrl) {
            // console.log('❌ No image URL provided');
            return;
        }

        let fullImageUrl = imageUrl;

        // Construct full URL
        if (!imageUrl.startsWith('http')) {
            const baseUrl = API_BASE_URL || '';
            fullImageUrl = imageUrl.startsWith('/')
                ? `${baseUrl}${imageUrl}`
                : `${baseUrl}/uploads/qc-report-pictures/${imageUrl}`;
        }

        // console.log('🖼️ Loading image from:', fullImageUrl);

        try {
            // Show loading state
            setSelectedImage("");
            setShowImagePopup(true);

            // Fetch image and convert to blob URL (bypasses CORS for display)
            const response = await fetch(fullImageUrl, {
                mode: 'cors',
                cache: 'no-cache'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);

            // console.log('✅ Image loaded as blob URL:', blobUrl);
            setSelectedImage(blobUrl);

        } catch (error) {
            console.error('❌ Error loading image:', error);
            showPopupMessage("Failed to load image / चित्र लोड करने में विफल", "warning");
            setShowImagePopup(false);
        }
    }, []);

    // Close image popup
    const handleCloseImagePopup = useCallback(() => {
        setShowImagePopup(false)
        setSelectedImage("")
    }, [])

    // Form validation
    const validateForm = () => {
        const requiredFields = [
            'sms_batch_code', 'sampled_furnace_number', 'sampled_sequence',
            'sampled_laddle_number', 'shift', 'final_c', 'final_mn',
            'final_s', 'final_p', 'sample_tested_by'
        ]

        for (let field of requiredFields) {
            if (!processFormData[field]) {
                showPopupMessage(`Please fill all required fields! / कृपया सभी आवश्यक फ़ील्ड्स भरें!`, "warning")
                return false
            }
        }
        return true
    }

    const handleProcessSubmit = useCallback(async () => {
        setIsSubmitting(true)
        try {
            const formData = new FormData()

            // Use EXACT field names from your working Postman request
            // Required fields - always append (validation will catch empty)
            formData.append('sms_batch_code', processFormData.sms_batch_code || '');
            formData.append('furnace_number', processFormData.sampled_furnace_number || '');
            formData.append('sequence_code', processFormData.sampled_sequence || '');
            formData.append('laddle_number', processFormData.sampled_laddle_number || '');
            formData.append('shift_type', processFormData.shift || '');
            formData.append('tested_by', processFormData.sample_tested_by || '');

            // Optional decimal fields - send empty string if not provided, backend will convert to null
            // Ensure numeric values are properly formatted for NUMERIC(10,4) database columns
            const formatDecimal = (value) => {
                if (!value || value === '' || value === null || value === undefined) return '';
                const num = parseFloat(value);
                if (isNaN(num)) return '';
                // Ensure value fits NUMERIC(10,4): max 999999.9999
                if (Math.abs(num) > 999999.9999) {
                    return (num > 0 ? 999999.9999 : -999999.9999).toString();
                }
                // Round to 4 decimal places
                return (Math.round(num * 10000) / 10000).toString();
            };

            formData.append('final_c', formatDecimal(processFormData.final_c));
            formData.append('final_mn', formatDecimal(processFormData.final_mn));
            formData.append('final_s', formatDecimal(processFormData.final_s));
            formData.append('final_p', formatDecimal(processFormData.final_p));

            // Optional fields
            if (processFormData.remarks) {
                formData.append('remarks', processFormData.remarks);
            }
            // Add sample_timestamp (optional, but helps with validation)
            if (processFormData.sample_timestamp) {
                formData.append('sample_timestamp', processFormData.sample_timestamp)
            }

            // Only append picture if it exists
            if (processFormData.test_report_picture) {
                formData.append('report_picture', processFormData.test_report_picture)
            }

            // console.log('🔍 FormData contents:');
            for (let [key, value] of formData.entries()) {
                // console.log(`${key}:`, value);
            }

            const response = await batchcodeAPI.submitQCLabTest(formData)

            if (response.data.success) {
                // Extract unique_code from response - try multiple possible locations
                const uniqueCode = response.data.data?.unique_code
                    || response.data?.data?.unique_code
                    || response.data?.unique_code
                    || processFormData.sms_batch_code
                    || ""
                setSuccessUniqueCode(uniqueCode)
                showPopupMessage("QC Lab test submitted successfully!", "success")
                setShowProcessForm(false)

                // Refresh BOTH tabs data to ensure consistency
                await Promise.all([
                    fetchHistoryData(),
                    fetchPendingSMSData()
                ])

                // console.log('✅ Both tabs refreshed after submission')
            }
        } catch (error) {
            console.error("Submission error details:", error.response?.data)
            const errorMessage = error.response?.data?.details?.formatted
                || error.response?.data?.message
                || error.response?.data?.details?.errors?.[0]?.message
                || "Submission failed. Please check all required fields are filled correctly.";
            showPopupMessage(errorMessage, "warning")
        } finally {
            setIsSubmitting(false)
        }
    }, [processFormData, fetchHistoryData, fetchPendingSMSData])

    // Close process form
    const handleCloseProcessForm = useCallback(() => {
        setShowProcessForm(false)
        setSelectedRow(null)
        setProcessFormData({
            sms_batch_code: "",
            sampled_furnace_number: "",
            sampled_sequence: "",
            sampled_laddle_number: "",
            shift: "",
            final_c: "",
            final_mn: "",
            final_s: "",
            final_p: "",
            sample_tested_by: "",
            remarks: "",
            test_report_picture: null
        })
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

        // Auto-refresh every 8 seconds (IPL style)
        const interval = setInterval(() => {
            if (showHistory) {
                fetchHistoryData()
            } else {
                fetchPendingSMSData()
            }
        }, 8000)

        return () => clearInterval(interval)
    }, [showHistory, fetchHistoryData, fetchPendingSMSData])

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
                String(record.unique_code || generateUniqueCode(record)).toLowerCase().includes(searchLower) ||
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
                String(record.sms_batch_code || '').toLowerCase().includes(searchLower) ||
                String(record.furnace_number || '').toLowerCase().includes(searchLower) ||
                String(record.sequence_code || '').toLowerCase().includes(searchLower) ||
                String(record.laddle_number || '').toLowerCase().includes(searchLower) ||
                String(record.shift_type || '').toLowerCase().includes(searchLower) ||
                String(record.final_c || '').toLowerCase().includes(searchLower) ||
                String(record.final_mn || '').toLowerCase().includes(searchLower) ||
                String(record.final_s || '').toLowerCase().includes(searchLower) ||
                String(record.final_p || '').toLowerCase().includes(searchLower) ||
                String(record.tested_by || '').toLowerCase().includes(searchLower)
            )
        })
    }, [historyData, debouncedSearchTerm])

    // Options for dropdowns
    const shiftOptions = [
        { value: "", label: "Select Shift", hindiLabel: "शिफ्ट चुनें" },
        { value: "Day", label: "Day", hindiLabel: "दिन" },
        { value: "Night", label: "Night", hindiLabel: "रात" }
    ]

    const testerOptions = [
        { value: "", label: "Select Tester", hindiLabel: "टेस्टर चुनें" },
        { value: "Komal Sahu", label: "Komal Sahu", hindiLabel: "कोमल साहू" },
        { value: "Sushil Bharti", label: "Sushil Bharti", hindiLabel: "सुशील भारती" },
        { value: "Sunil Verma", label: "Sunil Verma", hindiLabel: "सुनील वर्मा" },
        { value: "Suraj", label: "Suraj", hindiLabel: "सूरज" },
        { value: "Govind Sahu", label: "Govind Sahu", hindiLabel: "गोविंद साहू" },
        { value: "MD Mustaq", label: "MD Mustaq", hindiLabel: "एमडी मुस्ताक" },
        { value: "Devendra Chetan", label: "Devendra Chetan", hindiLabel: "देवेंद्र चेतन" },
        { value: "Vikash", label: "Vikash", hindiLabel: "विकास" },
        { value: "Chadrakant Sahu", label: "Chadrakant Sahu", hindiLabel: "चंद्रकांत साहू" }
    ]

    return (
        <div className="flex flex-col h-full w-full bg-slate-50/50 animate-in fade-in duration-500">
            {/* Popups (Z-indexed) */}
            {showPopup && (
                <div className="fixed inset-0 flex items-center justify-center z-[100] p-4 bg-black/20 backdrop-blur-sm">
                    <div className={`w-full max-w-sm p-6 rounded-2xl shadow-2xl transform transition-all border ${popupType === "success" ? 'bg-white border-green-100' : 'bg-white border-orange-100'
                        }`}>
                        <div className="flex flex-col items-center text-center">
                            <div className={`p-3 rounded-full mb-4 ${popupType === "success" ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                                }`}>
                                {popupType === "success" ? <CheckCircle2 size={32} /> : <AlertCircle size={32} />}
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-1">
                                {popupType === "success" ? "Operation Successful" : "Attention Required"}
                            </h3>
                            <p className="text-slate-500 text-sm mb-6">{popupMessage}</p>
                            {popupType === "success" && successUniqueCode && (
                                <div className="mb-6 px-4 py-2 bg-slate-50 rounded-lg border border-slate-100">
                                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Batch Code</span>
                                    <span className="font-mono font-bold text-green-700">{successUniqueCode}</span>
                                </div>
                            )}
                            <button
                                onClick={handleClosePopup}
                                className={`w-full py-3 rounded-xl font-bold text-white transition-all shadow-lg active:scale-95 ${popupType === "success" ? 'bg-green-600 hover:bg-green-700 shadow-green-200' : 'bg-orange-600 hover:bg-orange-700 shadow-orange-200'
                                    }`}
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header Area */}
            <div className="p-4 lg:p-6 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-gradient-to-tr from-rose-600 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200">
                            <Beaker className="text-white" size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                                QC Lab {showHistory ? <span className="text-rose-600">History</span> : <span className="text-sky-600">Testing</span>}
                            </h1>
                            <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                                <span className="flex items-center gap-1.5 py-0.5 px-2 bg-green-50 text-green-700 rounded-full border border-green-100">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                    Live Sync
                                </span>
                                Material Analysis Unit
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative flex-1 md:flex-none">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search by batch, laddle, or date..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full md:w-64 pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-4 focus:ring-rose-50 outline-none transition-all shadow-sm"
                            />
                        </div>
                        <button
                            onClick={toggleView}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 ${showHistory
                                ? 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                                : 'bg-slate-900 text-white hover:bg-slate-800'
                                }`}
                        >
                            {showHistory ? <><ArrowLeft size={16} /> Pending Queue</> : <><History size={16} /> View History</>}
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Table Container */}
            <div className="flex-1 px-4 lg:px-6 pb-6 min-h-0">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col overflow-hidden">
                    {/* Table Status Bar */}
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <span className={`flex h-2 w-2 rounded-full ${showHistory ? 'bg-rose-500' : 'bg-sky-500'}`}></span>
                            <span className="text-xs font-black text-slate-700 uppercase tracking-widest leading-none">
                                {showHistory ? "Analytic Repository" : "Sampling Pipeline"}
                            </span>
                        </div>
                        <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-500">
                            {showHistory ? filteredHistoryData.length : filteredPendingData.length} Records Found
                        </span>
                    </div>

                    {/* Table Content */}
                    <div className="flex-1 overflow-auto">
                        {loading ? (
                            <div className="h-full flex flex-col items-center justify-center bg-slate-50/20">
                                <div className="w-10 h-10 border-4 border-rose-600/10 border-t-rose-600 rounded-full animate-spin"></div>
                                <p className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Hydrating data...</p>
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur-md">
                                    <tr>
                                        {showHistory ? (
                                            <>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Timestamp</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Batch Code</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Sequence</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Details</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Elements (C/Mn/S/P)</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Tester</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Media</th>
                                            </>
                                        ) : (
                                            <>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Action</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Batch Code</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Sample Time</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Furnace Info</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Temperature</th>
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {showHistory ? (
                                        filteredHistoryData.length > 0 ? (
                                            filteredHistoryData.map((record, i) => (
                                                <tr key={i} className="group hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-xs font-bold text-slate-900">{formatIndianDateTime(record.created_at).split(' ')[0]}</div>
                                                        <div className="text-[10px] font-medium text-slate-400 uppercase">{formatIndianDateTime(record.created_at).split(' ')[1]}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="px-2 py-1 bg-rose-50 text-rose-600 rounded text-[10px] font-black uppercase tracking-tight">
                                                            {record.sms_batch_code}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-700 capitalize">
                                                        SEQ-{record.sequence_code}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-xs font-bold text-slate-700">Laddle: {record.laddle_number}</div>
                                                        <div className="text-[10px] font-medium text-slate-400 italic">{record.furnace_number}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center justify-center gap-2">
                                                            {[
                                                                { l: 'C', v: record.final_c },
                                                                { l: 'Mn', v: record.final_mn },
                                                                { l: 'S', v: record.final_s },
                                                                { l: 'P', v: record.final_p }
                                                            ].map(el => (
                                                                <div key={el.l} className="flex flex-col items-center bg-slate-50 px-2 py-1 rounded min-w-[45px] border border-slate-100">
                                                                    <span className="text-[9px] font-black text-slate-400 leading-none mb-1">{el.l}</span>
                                                                    <span className="text-xs font-mono font-bold text-slate-800 leading-none">{el.v}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold text-[10px]">
                                                                {record.tested_by?.charAt(0)}
                                                            </div>
                                                            <span className="text-xs font-bold text-slate-600 capitalize">{record.tested_by}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {record.report_picture && (
                                                            <button
                                                                onClick={() => handleViewImage(record.report_picture)}
                                                                className="flex items-center gap-2 text-rose-600 hover:text-rose-700 font-black text-[10px] uppercase transition-colors"
                                                            >
                                                                <Camera size={14} /> View Report
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr><td colSpan={7} className="py-20 text-center font-bold text-slate-300 uppercase text-xs tracking-[0.2em]">No history records available</td></tr>
                                        )
                                    ) : (
                                        filteredPendingData.length > 0 ? (
                                            filteredPendingData.map((record, i) => (
                                                <tr key={i} className="group hover:bg-sky-50/30 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <button
                                                            onClick={() => handleProcessClick(record)}
                                                            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2"
                                                        >
                                                            <Edit size={12} /> Start Test
                                                        </button>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="font-mono font-bold text-slate-900">
                                                            {record.unique_code || generateUniqueCode(record)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-500">
                                                        {formatIndianDateTime(record.sample_timestamp)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                                        <div className="text-sm font-black text-slate-700">{record.furnace_number}</div>
                                                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">SEQ: {record.sequence_number} • LAT: {record.laddle_number}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                                        <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full font-black text-xs">
                                                            {record.temperature}°C
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr><td colSpan={5} className="py-20 text-center font-bold text-slate-300 uppercase text-xs tracking-[0.2em]">Everything is up to date</td></tr>
                                        )
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {/* Entry Modal (Centered with Top Offset) */}
            {showProcessForm && (
                <div className="fixed inset-0 z-[101] flex items-start justify-center bg-slate-900/60 backdrop-blur-sm p-4 pt-4 sm:pt-10 overflow-y-auto animate-in fade-in duration-300">
                    <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 my-auto sm:my-0 mb-8">
                        {/* Modal Header */}
                        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-rose-600 text-white rounded-lg shadow-md">
                                    <Beaker size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">LABORATORY INPUT</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Test Protocol Entry</p>
                                </div>
                            </div>
                            <button onClick={handleCloseProcessForm} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                                <X size={20} className="text-slate-500" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
                            <form onSubmit={(e) => { e.preventDefault(); handleProcessSubmit(); }} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                                    {/* Row 1 */}
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold text-slate-700">SMS Batch Code / एसएमएस बैच कोड <span className="text-rose-500">*</span></label>
                                        <input
                                            type="text"
                                            readOnly
                                            value={processFormData.sms_batch_code}
                                            className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-900 outline-none cursor-not-allowed"
                                        />
                                        <p className="text-[10px] text-slate-400 font-medium">Auto-filled from SMS Register</p>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold text-slate-700">Sampled Furnace Number / नमूना भठ्ठी नंबर <span className="text-rose-500">*</span></label>
                                        <input
                                            type="text"
                                            readOnly
                                            value={processFormData.sampled_furnace_number}
                                            className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-900 outline-none cursor-not-allowed"
                                        />
                                    </div>

                                    {/* Row 2 */}
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold text-slate-700">Sampled Sequence / नमूना अनुक्रम <span className="text-rose-500">*</span></label>
                                        <input
                                            type="text"
                                            readOnly
                                            value={processFormData.sampled_sequence}
                                            className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-900 outline-none cursor-not-allowed"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold text-slate-700">Sampled Laddle Number / नमूना लेडल नंबर <span className="text-rose-500">*</span></label>
                                        <input
                                            type="text"
                                            readOnly
                                            value={processFormData.sampled_laddle_number}
                                            className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-900 outline-none cursor-not-allowed"
                                        />
                                    </div>

                                    {/* Row 3 */}
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold text-slate-700">Shift / शिफ्ट <span className="text-rose-500">*</span></label>
                                        <select
                                            value={processFormData.shift}
                                            onChange={(e) => handleProcessFormChange("shift", e.target.value)}
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all"
                                            required
                                        >
                                            {shiftOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold text-slate-700">Final C% / अंतिम सी% <span className="text-rose-500">*</span></label>
                                        <input
                                            type="number"
                                            step="0.0001"
                                            placeholder="Enter C%"
                                            value={processFormData.final_c}
                                            onChange={(e) => handleProcessFormChange("final_c", e.target.value)}
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg font-mono font-bold text-slate-900 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all"
                                            required
                                        />
                                    </div>

                                    {/* Row 4 */}
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold text-slate-700">Final MN% / अंतिम एमएन% <span className="text-rose-500">*</span></label>
                                        <input
                                            type="number"
                                            step="0.0001"
                                            placeholder="Enter MN%"
                                            value={processFormData.final_mn}
                                            onChange={(e) => handleProcessFormChange("final_mn", e.target.value)}
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg font-mono font-bold text-slate-900 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold text-slate-700">Final S% / अंतिम एस% <span className="text-rose-500">*</span></label>
                                        <input
                                            type="number"
                                            step="0.0001"
                                            placeholder="Enter S%"
                                            value={processFormData.final_s}
                                            onChange={(e) => handleProcessFormChange("final_s", e.target.value)}
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg font-mono font-bold text-slate-900 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all"
                                            required
                                        />
                                    </div>

                                    {/* Row 5 */}
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold text-slate-700">Final P% / अंतिम पी% <span className="text-rose-500">*</span></label>
                                        <input
                                            type="number"
                                            step="0.0001"
                                            placeholder="Enter P%"
                                            value={processFormData.final_p}
                                            onChange={(e) => handleProcessFormChange("final_p", e.target.value)}
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg font-mono font-bold text-slate-900 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold text-slate-700">Sample Tested by / नमूना परीक्षणकर्ता <span className="text-rose-500">*</span></label>
                                        <select
                                            value={processFormData.sample_tested_by}
                                            onChange={(e) => handleProcessFormChange("sample_tested_by", e.target.value)}
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all"
                                            required
                                        >
                                            {testerOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Row 6 - Picture */}
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-700">Test Report Picture / टेस्ट रिपोर्ट चित्र</label>
                                    <div className="flex items-center gap-4">
                                        <div className="relative flex-1">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handlePictureUpload}
                                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                            />
                                            <div className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg font-bold text-slate-500 flex items-center justify-between">
                                                <span>{processFormData.test_report_picture ? processFormData.test_report_picture.name : "Choose File No file chosen"}</span>
                                                <Camera size={18} className="text-slate-400" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Row 7 - Remarks */}
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-700">Remarks / टिप्पणियाँ</label>
                                    <textarea
                                        rows={3}
                                        value={processFormData.remarks}
                                        onChange={(e) => handleProcessFormChange("remarks", e.target.value)}
                                        placeholder="Enter any remarks / कोई टिप्पणी दर्ज करें"
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all resize-none"
                                    />
                                </div>
                            </form>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-center gap-6 flex-shrink-0">
                            <button
                                onClick={handleCloseProcessForm}
                                className="px-10 py-3 text-sm font-black uppercase tracking-widest text-slate-500 hover:text-slate-700 transition-colors"
                            >
                                DISCARD
                            </button>
                            <button
                                onClick={handleProcessSubmit}
                                disabled={isSubmitting}
                                className="px-16 py-3 bg-[#0f172a] text-white font-black text-sm uppercase tracking-widest rounded shadow-xl hover:bg-slate-800 transition-all disabled:opacity-50 active:scale-95"
                            >
                                {isSubmitting ? "PROCESSING..." : "COMMIT ANALYSIS"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Popup */}
            {showImagePopup && (
                <div className="fixed inset-0 z-[200] flex flex-col bg-slate-900/95 backdrop-blur-xl animate-in zoom-in duration-300">
                    <div className="h-16 flex items-center justify-between px-6 border-b border-white/10">
                        <span className="text-white text-[10px] font-black uppercase tracking-widest">Spectral Analysis Report</span>
                        <button onClick={handleCloseImagePopup} className="p-2 text-white/60 hover:text-white transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                    <div className="flex-1 flex items-center justify-center p-6">
                        {selectedImage ? (
                            <img src={selectedImage} alt="Report" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl border border-white/10" />
                        ) : (
                            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default QCLabDataPage
