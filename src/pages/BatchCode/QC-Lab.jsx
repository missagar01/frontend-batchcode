"use client"
import { useState, useEffect, useCallback, useMemo } from "react"
import { CheckCircle2, X, Search, History, ArrowLeft, Edit, Save, Camera, AlertCircle } from "lucide-react"
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

                {/* Image Viewer Popup Modal */}
                {showImagePopup && (
                    <div className="fixed inset-0 flex items-center justify-center p-4 z-50 pointer-events-none">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden pointer-events-auto">
                            <div className="bg-red-500 text-white p-4 flex justify-between items-center">
                                <h3 className="text-lg font-semibold">Test Report Image / टेस्ट रिपोर्ट चित्र</h3>
                                <button
                                    onClick={handleCloseImagePopup}
                                    className="text-white hover:text-gray-200 transition-colors"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            <div className="p-4 flex items-center justify-center bg-gray-100 min-h-[400px] max-h-[70vh] overflow-auto">
                                {selectedImage ? (
                                    <img
                                        src={selectedImage}
                                        alt="Test Report"
                                        className="max-w-full max-h-full object-contain rounded-lg shadow-md"
                                        onError={(e) => {
                                            console.error('❌ Error displaying image:', selectedImage);
                                            // Show error state
                                            e.target.style.display = 'none';
                                        }}
                                        onLoad={() => console.log('✅ Image displayed successfully')}
                                    />
                                ) : (
                                    <div className="text-center text-gray-500">
                                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500 mb-4"></div>
                                        <p>Loading image... / चित्र लोड हो रहा है...</p>
                                    </div>
                                )}
                            </div>

                            {/* <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end items-center">
                                {/* <span className="text-sm text-gray-600">
                                    Click outside or press ESC to close / बंद करने के लिए बाहर क्लिक करें
                                </span>
                                <button
                                    onClick={handleCloseImagePopup}
                                    className=" px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                                >
                                    Close
                                </button>
                            </div> */}
                        </div>
                    </div>
                )}

                {/* Header Section */}
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div className="flex items-center gap-3 w-full">
                        <div className="flex-1 min-w-0">
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-red-500 truncate">
                                {showHistory ? "Lab Test History" : "QC Lab Test"}
                            </h1>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                        <div className="relative w-full sm:flex-1">
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

                        <button
                            onClick={toggleView}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors w-full sm:w-auto"
                        >
                            {showHistory ? (
                                <>
                                    <ArrowLeft className="h-4 w-4" />
                                    Back to Pending
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

                {/* Process Form */}
                {showProcessForm && (
                    <div className="mt-6">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-gray-200">
                            <div className="bg-red-500 text-white p-4 rounded-t-lg flex justify-between items-center">
                                <h3 className="text-lg font-semibold">Submit QC Lab Test Data</h3>
                                <button onClick={handleCloseProcessForm} className="text-white hover:text-gray-200">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* SMS Batch Code (Auto-filled from SMS Register) */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            SMS Batch Code / एसएमएस बैच कोड <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={processFormData.sms_batch_code}
                                            readOnly
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Auto-filled from SMS Register</p>
                                    </div>

                                    {/* Sampled Furnace Number (Auto-filled) */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Sampled Furnace Number / नमूना भट्ठी नंबर <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={processFormData.sampled_furnace_number}
                                            readOnly
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                                        />
                                    </div>

                                    {/* Sampled Sequence (Auto-filled) */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Sampled Sequence / नमूना अनुक्रम <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={processFormData.sampled_sequence}
                                            readOnly
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                                        />
                                    </div>

                                    {/* Sampled Laddle Number (Auto-filled) */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Sampled Laddle Number / नमूना लेडल नंबर <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={processFormData.sampled_laddle_number}
                                            readOnly
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                                        />
                                    </div>

                                    {/* Shift */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Shift / शिफ्ट <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={processFormData.shift}
                                            onChange={(e) => handleProcessFormChange("shift", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                                            required
                                        >
                                            {shiftOptions.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Final C% */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Final C% / अंतिम सी% <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={processFormData.final_c}
                                            onChange={(e) => handleProcessFormChange("final_c", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                                            placeholder="Enter C%"
                                            required
                                        />
                                    </div>

                                    {/* Final MN% */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Final MN% / अंतिम एमएन% <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={processFormData.final_mn}
                                            onChange={(e) => handleProcessFormChange("final_mn", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                                            placeholder="Enter MN%"
                                            required
                                        />
                                    </div>

                                    {/* Final S% */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Final S% / अंतिम एस% <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={processFormData.final_s}
                                            onChange={(e) => handleProcessFormChange("final_s", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                                            placeholder="Enter S%"
                                            required
                                        />
                                    </div>

                                    {/* Final P% */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Final P% / अंतिम पी% <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={processFormData.final_p}
                                            onChange={(e) => handleProcessFormChange("final_p", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                                            placeholder="Enter P%"
                                            required
                                        />
                                    </div>

                                    {/* Sample Tested by */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Sample Tested by / नमूना परीक्षणकर्ता <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={processFormData.sample_tested_by}
                                            onChange={(e) => handleProcessFormChange("sample_tested_by", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                                            required
                                        >
                                            {testerOptions.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Test Report Picture */}
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Test Report Picture / टेस्ट रिपोर्ट चित्र
                                        </label>
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handlePictureUpload}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                                            />
                                            {processFormData.test_report_picture && (
                                                <Camera className="h-5 w-5 text-green-500" />
                                            )}
                                        </div>
                                    </div>

                                    {/* Remarks */}
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Remarks / टिप्पणियाँ
                                        </label>
                                        <textarea
                                            value={processFormData.remarks}
                                            onChange={(e) => handleProcessFormChange("remarks", e.target.value)}
                                            rows={3}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                                            placeholder="Enter any remarks / कोई टिप्पणी दर्ज करें"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end space-x-3">
                                <button
                                    onClick={handleCloseProcessForm}
                                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100"
                                >
                                    Cancel / रद्द करें
                                </button>
                                <button
                                    onClick={handleProcessSubmit}
                                    disabled={isSubmitting}
                                    className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    <Save className="h-4 w-4" />
                                    {isSubmitting ? "Submitting... / जमा किया जा रहा है..." : "Submit Data / डेटा जमा करें"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="rounded-lg border border-gray-200 shadow-md bg-white overflow-hidden">
                    <div className="bg-gradient-to-r from-red-500 to-red-400 border-b border-red-200 p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <h2 className="text-white text-lg font-semibold">
                                    {showHistory ? "QC Lab Test Records" : "Pending for Lab Test"}
                                </h2>
                                <div className="relative flex items-center justify-center w-10 h-10">
                                    <div className="absolute inset-0 rounded-full bg-white/20 p-0.5">
                                        <div className="w-full h-full rounded-full bg-transparent flex items-center justify-center">
                                            <span className="text-white text-sm font-bold">
                                                {showHistory ? filteredHistoryData.length : filteredPendingData.length}
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
                            <p className="text-red-600">Loading data...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            {showHistory ? (
                                /* HISTORY VIEW - QC Lab Tests with SMS Batch Code */
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Date / तारीख
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                SMS Unique Code / SMS कोड
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Lab Test Code / लैब कोड
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Furnace Number / भट्ठी नंबर
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Sequence Code / अनुक्रम कोड
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Laddle Number / लेडल नंबर
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Shift Type / शिफ्ट प्रकार
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Final C% / अंतिम सी%
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Final MN% / अंतिम एमएन%
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Final S% / अंतिम एस%
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Final P% / अंतिम पी%
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Tested By / परीक्षणकर्ता
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Remarks / टिप्पणियाँ
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Test Report / टेस्ट रिपोर्ट
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredHistoryData.length > 0 ? (
                                            filteredHistoryData.map((record, index) => (
                                                <tr key={record.id || record._id || index} className="hover:bg-gray-50">
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {formatIndianDateTime(record.created_at || 'N/A')}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {record.sms_batch_code || 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {record.unique_code || 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {record.furnace_number || 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {record.sequence_code || 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {record.laddle_number || 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {record.shift_type || 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {record.final_c || 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {record.final_mn || 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {record.final_s || 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {record.final_p || 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {record.tested_by || 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-4 text-sm text-gray-900">
                                                        {record.remarks || '—'}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {record.report_picture ? (
                                                            <button
                                                                onClick={() => handleViewImage(record.report_picture)}
                                                                className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 transition-colors"
                                                            >
                                                                <Camera className="h-4 w-4" />
                                                                View
                                                            </button>
                                                        ) : (
                                                            <span className="text-gray-400">—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={12} className="px-4 py-8 text-center text-gray-500">
                                                    <div className="flex flex-col items-center justify-center">
                                                        <Search className="h-12 w-12 text-gray-300 mb-4" />
                                                        <p className="text-lg font-medium mb-2">
                                                            {searchTerm ? "No matching QC Lab tests found" : "No QC Lab tests found"}
                                                        </p>
                                                        <p className="text-sm mb-4">
                                                            {searchTerm ? "Try adjusting your search terms" : "Submit a test first to see records here"}
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
                                                            <button
                                                                onClick={fetchHistoryData}
                                                                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                                                            >
                                                                Refresh Data
                                                            </button>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            ) : (
                                /* PENDING VIEW - SMS Register Records */
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Action / कार्रवाई
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                SMS Batch Code / एसएमएस बैच कोड
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Date / तारीख
                                            </th>
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
                                                Temperature / तापमान
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredPendingData.length > 0 ? (
                                            filteredPendingData.map((record, index) => (
                                                <tr key={record.id || record._id || index} className="hover:bg-gray-50">
                                                    <td className="px-4 py-4 whitespace-nowrap">
                                                        <button
                                                            onClick={() => handleProcessClick(record)}
                                                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-sm flex items-center gap-1 transition-colors"
                                                        >
                                                            <Edit className="h-3 w-3" />
                                                            Lab Test
                                                        </button>
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {record.unique_code || generateUniqueCode(record) || 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {formatIndianDateTime(record.sample_timestamp) || 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {record.sequence_number || 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {record.laddle_number || 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {record.furnace_number || 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {record.temperature ? `${record.temperature}°C` : 'N/A'}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                                                    <div className="flex flex-col items-center justify-center">
                                                        <CheckCircle2 className="h-12 w-12 text-green-300 mb-4" />
                                                        <p className="text-lg font-medium mb-2">
                                                            {searchTerm ? "No matching pending SMS records found" : "No pending SMS records for testing"}
                                                        </p>
                                                        <p className="text-sm mb-4">
                                                            {searchTerm ? "Try adjusting your search terms" : "All SMS records have been processed for QC Lab testing"}
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
                                                            <button
                                                                onClick={fetchPendingSMSData}
                                                                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                                                            >
                                                                Refresh Data
                                                            </button>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
                </div>
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

export default QCLabDataPage
