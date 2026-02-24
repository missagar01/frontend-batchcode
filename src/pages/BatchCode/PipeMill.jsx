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

function PipeMillPage() {
    const [pendingReCoilData, setPendingReCoilData] = useState([])
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
        recoiler_short_code: "",
        mill_number: "",
        section: "",
        item_type: "",
        size: "",
        thickness: "",
        shift: "",
        fitter_name: "",
        fitter_name_other: "",
        quality_supervisor: "",
        mill_incharge: "",
        forman_name: "",
        remarks: "",
        picture: null
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

    // Fetch pending ReCoil data (ReCoil records that don't have Pipe Mill entries)
    const fetchPendingReCoilData = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            //console.log('🔄 Fetching pending ReCoil data for Pipe Mill...')

            // Fetch ReCoil data
            const reCoilResponse = await batchcodeAPI.getReCoilHistory()
            let reCoilData = [];

            // Handle different response structures
            if (Array.isArray(reCoilResponse.data)) {
                reCoilData = reCoilResponse.data;
            } else if (reCoilResponse.data && Array.isArray(reCoilResponse.data.data)) {
                reCoilData = reCoilResponse.data.data;
            } else if (reCoilResponse.data && reCoilResponse.data.success && Array.isArray(reCoilResponse.data.data)) {
                reCoilData = reCoilResponse.data.data;
            } else {
                reCoilData = [];
            }

            //console.log('✅ ReCoil Data fetched:', reCoilData.length, 'records')

            // Fetch existing Pipe Mill entries to filter out already processed ReCoil records
            const pipeMillResponse = await batchcodeAPI.getPipeMillHistory()
            let existingEntries = [];

            // Handle different response structures for Pipe Mill data
            if (Array.isArray(pipeMillResponse.data)) {
                existingEntries = pipeMillResponse.data;
            } else if (pipeMillResponse.data && Array.isArray(pipeMillResponse.data.data)) {
                existingEntries = pipeMillResponse.data.data;
            } else if (pipeMillResponse.data && pipeMillResponse.data.success && Array.isArray(pipeMillResponse.data.data)) {
                existingEntries = pipeMillResponse.data.data;
            }

            //console.log('Pipe Mill Entries fetched:', existingEntries.length, 'records')

            // Get all ReCoil unique_codes that already have Pipe Mill entries
            // Match: ReCoil 'unique_code' = Pipe Mill 'recoiler_short_code'
            const processedUniqueCodes = new Set(
                existingEntries
                    .map(pipeMillEntry => pipeMillEntry.recoiler_short_code)
                    .filter(code => code && code.trim() !== "")
            )

            //console.log('✅ Processed ReCoil Unique Codes:', Array.from(processedUniqueCodes))

            // Filter ReCoil data to only show records that don't have Pipe Mill entries
            const pendingData = reCoilData.filter(reCoilRecord => {
                const reCoilUniqueCode = reCoilRecord.unique_code

                if (!reCoilUniqueCode) {
                    //console.log('⚠️ ReCoil record missing unique_code:', reCoilRecord)
                    return false
                }

                // Check if this ReCoil unique_code exists in Pipe Mill's recoiler_short_code
                const isProcessed = processedUniqueCodes.has(reCoilUniqueCode)

                //console.log(`📋 ReCoil Record: ${reCoilUniqueCode} - Processed: ${isProcessed}`)

                return !isProcessed
            })

            //console.log('✅ Final pending data:', pendingData.length, 'records')
            setPendingReCoilData(pendingData)
            setLoading(false)

        } catch (error) {
            console.error("❌ Error fetching pending ReCoil data:", error)
            showPopupMessage("Error fetching pending ReCoil data! / लंबित रीकॉइल डेटा प्राप्त करने में त्रुटि!", "warning")
            setPendingReCoilData([])
            setLoading(false)
        }
    }, [])

    // Fetch Pipe Mill history data
    const fetchHistoryData = useCallback(async () => {
        try {
            setLoading(true)
            //console.log('🔄 Fetching Pipe Mill history data...')

            const response = await batchcodeAPI.getPipeMillHistory()
            //console.log('📦 Raw Pipe Mill API response:', response)
            //console.log('📊 Response data:', response.data)

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

            //console.log('✅ Processed Pipe Mill history data:', data)
            setHistoryData(data)
            setLoading(false)
        } catch (error) {
            console.error("❌ Error fetching Pipe Mill history:", error)
            console.error("🔧 Error details:", error.response?.data)
            showPopupMessage("Error fetching Pipe Mill history! / पाइप मिल इतिहास प्राप्त करने में त्रुटि!", "warning")
            setHistoryData([])
            setLoading(false)
        }
    }, [])

    // Handle process button click for pending ReCoil records
    const handleProcessClick = useCallback((reCoilRecord) => {
        setSelectedRow(reCoilRecord)

        // Use unique_code from ReCoil record
        const shortCode = reCoilRecord.unique_code

        // Pre-fill form with ReCoil data
        setProcessFormData({
            recoiler_short_code: shortCode,
            mill_number: "",
            section: "",
            item_type: "",
            size: reCoilRecord.size || "",
            thickness: "",
            shift: "",
            fitter_name: "",
            fitter_name_other: "",
            quality_supervisor: "",
            mill_incharge: "",
            forman_name: "",
            remarks: "",
            picture: null
        })
        setShowProcessForm(true)
    }, [])

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
                picture: file
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
                : `${baseUrl}/uploads/pipe-mill-pictures/${imageUrl}`;
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
            'recoiler_short_code', 'mill_number', 'item_type', 'size', 'thickness',
            'shift', 'fitter_name', 'quality_supervisor', 'mill_incharge', 'forman_name'
        ]

        for (let field of requiredFields) {
            if (!processFormData[field]) {
                showPopupMessage(`Please fill all required fields! / कृपया सभी आवश्यक फ़ील्ड्स भरें!`, "warning")
                return false
            }
        }

        // Handle "Other" fitter name
        if (processFormData.fitter_name === "Other" && !processFormData.fitter_name_other) {
            showPopupMessage("Please specify the fitter name! / कृपया फिटर का नाम निर्दिष्ट करें!", "warning")
            return false
        }

        return true
    }

    // Handle process form submission
    const handleProcessSubmit = useCallback(async () => {
        if (!validateForm()) {
            return
        }

        setIsSubmitting(true)
        try {
            // Prepare form data
            const formData = new FormData()

            // Add all form fields
            Object.keys(processFormData).forEach(key => {
                if (key === 'picture') {
                    if (processFormData.picture) {
                        formData.append('picture', processFormData.picture)
                    }
                } else if (key === 'fitter_name_other' && processFormData.fitter_name !== 'Other') {
                    // Skip other field if not needed
                } else {
                    let value = processFormData[key]

                    // Handle "Other" fields
                    if (key === 'fitter_name' && value === 'Other' && processFormData.fitter_name_other) {
                        value = processFormData.fitter_name_other
                    }

                    if (value !== null && value !== undefined) {
                        formData.append(key, value)
                    }
                }
            })

            //console.log('🔍 Submitting Pipe Mill data for ReCoil:', processFormData.recoiler_short_code)

            const response = await batchcodeAPI.submitPipeMill(formData)

            if (response.data.success) {
                // Extract unique_code from response - try multiple possible locations
                const uniqueCode = response.data.data?.unique_code
                    || response.data?.data?.unique_code
                    || response.data?.unique_code
                    || processFormData.recoiler_short_code
                    || ""
                setSuccessUniqueCode(uniqueCode)
                showPopupMessage("Pipe Mill data submitted successfully! / पाइप मिल डेटा सफलतापूर्वक जमा किया गया!", "success")
                setShowProcessForm(false)

                // Refresh BOTH tabs data to ensure consistency
                await Promise.all([
                    fetchHistoryData(),
                    fetchPendingReCoilData()
                ])

                //console.log('✅ Both tabs refreshed after submission - record moved from Pending to History')
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
    }, [processFormData, fetchHistoryData, fetchPendingReCoilData])

    // Close process form
    const handleCloseProcessForm = useCallback(() => {
        setShowProcessForm(false)
        setSelectedRow(null)
        setProcessFormData({
            recoiler_short_code: "",
            mill_number: "",
            section: "",
            item_type: "",
            size: "",
            thickness: "",
            shift: "",
            fitter_name: "",
            fitter_name_other: "",
            quality_supervisor: "",
            mill_incharge: "",
            forman_name: "",
            remarks: "",
            picture: null
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
            fetchPendingReCoilData()
        }

        // Auto-refresh every 8 seconds
        const interval = setInterval(() => {
            if (showHistory) {
                fetchHistoryData()
            } else {
                fetchPendingReCoilData()
            }
        }, 8000)

        return () => clearInterval(interval)
    }, [showHistory, fetchHistoryData, fetchPendingReCoilData])

    // Filter data based on search term
    const filteredPendingData = useMemo(() => {
        if (!debouncedSearchTerm) return pendingReCoilData;

        return pendingReCoilData.filter(record => {
            const searchLower = debouncedSearchTerm.toLowerCase()
            return (
                formatIndianDateTime(record.createdAt).toLowerCase().includes(searchLower) ||
                String(record.unique_code || '').toLowerCase().includes(searchLower) ||
                String(record.size || '').toLowerCase().includes(searchLower) ||
                String(record.supervisor || '').toLowerCase().includes(searchLower) ||
                String(record.incharge || '').toLowerCase().includes(searchLower) ||
                String(record.contractor || '').toLowerCase().includes(searchLower) ||
                String(record.welder_name || '').toLowerCase().includes(searchLower) ||
                String(record.machine_number || '').toLowerCase().includes(searchLower)
            )
        })
    }, [pendingReCoilData, debouncedSearchTerm])

    const filteredHistoryData = useMemo(() => {
        if (!debouncedSearchTerm) return historyData;

        return historyData.filter(record => {
            const searchLower = debouncedSearchTerm.toLowerCase()
            return (
                formatIndianDateTime(record.createdAt).toLowerCase().includes(searchLower) ||
                String(record.recoiler_short_code || '').toLowerCase().includes(searchLower) ||
                String(record.mill_number || '').toLowerCase().includes(searchLower) ||
                String(record.section || '').toLowerCase().includes(searchLower) ||
                String(record.item_type || '').toLowerCase().includes(searchLower) ||
                String(record.size || '').toLowerCase().includes(searchLower) ||
                String(record.thickness || '').toLowerCase().includes(searchLower) ||
                String(record.shift || '').toLowerCase().includes(searchLower) ||
                String(record.fitter_name || '').toLowerCase().includes(searchLower) ||
                String(record.quality_supervisor || '').toLowerCase().includes(searchLower) ||
                String(record.mill_incharge || '').toLowerCase().includes(searchLower) ||
                String(record.forman_name || '').toLowerCase().includes(searchLower) ||
                String(record.remarks || '').toLowerCase().includes(searchLower)
            )
        })
    }, [historyData, debouncedSearchTerm])

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

    return (
        <div className="batchcode-page" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div className="space-y-4 sm:space-y-6" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
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
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-4 lg:p-6 mb-4 sm:mb-6 lg:mb-8 transform transition-all hover:shadow-md">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
                        <div className="flex items-center gap-3 sm:gap-4">
                            <div className="p-2 sm:p-3 bg-red-50 rounded-lg sm:rounded-xl">
                                <History className="h-6 w-6 sm:h-8 sm:w-8 text-red-500" />
                            </div>
                            <div>
                                <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">
                                    Pipe Mill <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-600 to-orange-500">
                                        {showHistory ? "History" : "Processing"}
                                    </span>
                                </h1>
                                <p className="text-gray-500 text-xs sm:text-sm mt-0.5 sm:mt-1 font-medium">
                                    Manage and track pipe manufacturing cycles efficiently
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center">
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-red-500 transition-colors" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search records..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full sm:w-56 lg:w-64 pl-9 pr-9 py-2 sm:py-2.5 bg-gray-50 border border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all text-sm font-medium"
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm("")}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>

                            <button
                                onClick={toggleView}
                                className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm shadow-lg shadow-red-200/50 transform active:scale-95 transition-all ${showHistory
                                    ? "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
                                    : "bg-gradient-to-r from-red-600 to-red-500 text-white hover:from-red-700 hover:to-red-600"
                                    }`}
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
                </div>

                {showProcessForm && (
                    <div className="mt-4 sm:mt-6 lg:mt-8">
                        <div className="bg-white rounded-2xl sm:rounded-3xl lg:rounded-[2.5rem] shadow-2xl w-full sm:w-[98%] lg:w-[96%] mx-auto max-h-[85vh] overflow-y-auto border border-gray-100 transform transition-all duration-500 custom-scrollbar">
                            {/* Form Header */}
                            <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white p-4 sm:p-6 md:p-8 flex justify-between items-center sticky top-0 z-30 shadow-lg backdrop-blur-md border-b border-white/10">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 sm:p-3 bg-red-600 rounded-xl sm:rounded-2xl shadow-lg shadow-red-600/30">
                                        <Edit className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-base sm:text-xl md:text-2xl font-black tracking-tight">Production Process Control</h3>
                                        <p className="text-gray-400 text-[9px] sm:text-[10px] md:text-xs font-bold uppercase tracking-[0.15em] sm:tracking-[0.2em] mt-0.5">Manufacturing Execution System</p>
                                    </div>
                                </div>
                                <button onClick={handleCloseProcessForm} className="p-2.5 bg-white/5 hover:bg-red-600/20 hover:text-red-400 rounded-2xl transition-all duration-300 border border-white/10 group">
                                    <X className="h-6 w-6 group-hover:rotate-90 transition-transform duration-300" />
                                </button>
                            </div>

                            <div className="p-4 sm:p-6 md:p-8 lg:p-12 space-y-6 sm:space-y-8 lg:space-y-10">
                                {/* Technical Info Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                                    {/* Recoiler Short Code - READONLY */}
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                                            Recoiler Code / कोड <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={processFormData.recoiler_short_code}
                                                readOnly
                                                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-gray-500 font-black cursor-not-allowed shadow-inner"
                                            />
                                        </div>
                                    </div>

                                    {/* Machine Number - READONLY */}
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                                            Machine Number / मशीन नंबर <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={selectedRow?.machine_number || "N/A"}
                                            readOnly
                                            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-gray-500 font-black cursor-not-allowed shadow-inner"
                                        />
                                    </div>

                                    {/* Mill Number - EDITABLE */}
                                    <div className="space-y-2 group">
                                        <label className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest px-1 group-focus-within:text-red-500 transition-colors">
                                            <div className="w-1.5 h-1.5 rounded-full bg-gray-300 group-focus-within:bg-red-500 transition-colors"></div>
                                            Mill Number / मिल नंबर <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={processFormData.mill_number}
                                            onChange={(e) => handleProcessFormChange("mill_number", e.target.value)}
                                            className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all font-bold text-gray-700 outline-none hover:border-red-200 shadow-sm"
                                            required
                                        >
                                            <option value="">Select Mill Number</option>
                                            <option value="PIPE MILL 01">PIPE MILL 01</option>
                                            <option value="PIPE MILL 02">PIPE MILL 02</option>
                                            <option value="PIPE MILL 03">PIPE MILL 03</option>
                                            <option value="PIPE MILL 04">PIPE MILL 04</option>
                                            <option value="PIPE MILL 05">PIPE MILL 05</option>
                                        </select>
                                    </div>

                                    {/* Section - EDITABLE */}
                                    <div className="space-y-2 group">
                                        <label className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest px-1 group-focus-within:text-red-500 transition-colors">
                                            <div className="w-1.5 h-1.5 rounded-full bg-gray-300 group-focus-within:bg-red-500 transition-colors"></div>
                                            Section / सेक्शन <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={processFormData.section}
                                            onChange={(e) => handleProcessFormChange("section", e.target.value)}
                                            className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all font-bold text-gray-700 outline-none hover:border-red-200 shadow-sm"
                                            placeholder="Enter section name"
                                            required
                                        />
                                    </div>

                                    {/* Item Type - EDITABLE */}
                                    <div className="space-y-2 group">
                                        <label className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest px-1 group-focus-within:text-red-500 transition-colors">
                                            <div className="w-1.5 h-1.5 rounded-full bg-gray-300 group-focus-within:bg-red-500 transition-colors"></div>
                                            Item Type / आइटम प्रकार <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={processFormData.item_type}
                                            onChange={(e) => handleProcessFormChange("item_type", e.target.value)}
                                            className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all font-bold text-gray-700 outline-none hover:border-red-200 shadow-sm"
                                            required
                                        >
                                            <option value="">Select Item Type</option>
                                            <option value="Square">Square</option>
                                            <option value="Round">Round</option>
                                            <option value="Rectangle">Rectangle</option>
                                        </select>
                                    </div>

                                    {/* Size - EDITABLE */}
                                    <div className="space-y-2 group">
                                        <label className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest px-1 group-focus-within:text-red-500 transition-colors">
                                            <div className="w-1.5 h-1.5 rounded-full bg-gray-300 group-focus-within:bg-red-500 transition-colors"></div>
                                            Size / आकार <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={processFormData.size}
                                            onChange={(e) => handleProcessFormChange("size", e.target.value)}
                                            className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all font-bold text-gray-700 outline-none hover:border-red-200 shadow-sm"
                                            required
                                        >
                                            <option value="">Select Size</option>
                                            <option value='3/4" (25OD)'>3/4" (25OD)</option>
                                            <option value='1 1/2" (48OD)'>1 1/2" (48OD)</option>
                                            <option value='2" (60OD)'>2" (60OD)</option>
                                            <option value='1 1/4" (42OD)'>1 1/4" (42OD)</option>
                                            <option value='1" (32OD)'>1" (32OD)</option>
                                            <option value='3/4" (19X19)'>3/4" (19X19)</option>
                                            <option value='1" (25X25)'>1" (25X25)</option>
                                            <option value='1 1/2" (38X38)'>1 1/2" (38X38)</option>
                                            <option value='2" (47X47)'>2" (47X47)</option>
                                            <option value='2 1/2" (62X62)'>2 1/2" (62X62)</option>
                                            <option value='3" (72X72)'>3" (72X72)</option>
                                            <option value='1 1/2" (25X50)'>1 1/2" (25X50)</option>
                                            <option value='2" (37X56)'>2" (37X56)</option>
                                            <option value='2" (68X25)'>2" (68X25)</option>
                                            <option value='2 1/2" (80X40)'>2 1/2" (80X40)</option>
                                            <option value='3" (96X48)'>3" (96X48)</option>
                                        </select>
                                    </div>

                                    {/* Thickness - EDITABLE */}
                                    <div className="space-y-2 group">
                                        <label className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest px-1 group-focus-within:text-red-500 transition-colors">
                                            <div className="w-1.5 h-1.5 rounded-full bg-gray-300 group-focus-within:bg-red-500 transition-colors"></div>
                                            Thickness / मोटाई <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={processFormData.thickness}
                                            onChange={(e) => handleProcessFormChange("thickness", e.target.value)}
                                            className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all font-bold text-gray-700 outline-none hover:border-red-200 shadow-sm"
                                            placeholder="e.g., 1.50mm"
                                            required
                                        />
                                    </div>

                                    {/* Shift - EDITABLE */}
                                    <div className="space-y-2 group">
                                        <label className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest px-1 group-focus-within:text-red-500 transition-colors">
                                            <div className="w-1.5 h-1.5 rounded-full bg-gray-300 group-focus-within:bg-red-500 transition-colors"></div>
                                            Shift / शिफ्ट <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={processFormData.shift}
                                            onChange={(e) => handleProcessFormChange("shift", e.target.value)}
                                            className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all font-bold text-gray-700 outline-none hover:border-red-200 shadow-sm"
                                            required
                                        >
                                            <option value="">Select Shift</option>
                                            <option value="Day">Day</option>
                                            <option value="Night">Night</option>
                                        </select>
                                    </div>

                                    {/* Fitter Name - EDITABLE */}
                                    <div className="space-y-2 group">
                                        <label className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest px-1 group-focus-within:text-red-500 transition-colors">
                                            <div className="w-1.5 h-1.5 rounded-full bg-gray-300 group-focus-within:bg-red-500 transition-colors"></div>
                                            Fitter Name / फिटर नाम <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={processFormData.fitter_name}
                                            onChange={(e) => handleProcessFormChange("fitter_name", e.target.value)}
                                            className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all font-bold text-gray-700 outline-none hover:border-red-200 shadow-sm"
                                            required
                                        >
                                            <option value="">Select Fitter Name</option>
                                            <option value="Randhir Kumar">Randhir Kumar</option>
                                            <option value="Mukesh Kumar">Mukesh Kumar</option>
                                            <option value="Sunil Sharma">Sunil Sharma</option>
                                            <option value="Satya Prakash">Satya Prakash</option>
                                            <option value="Shivji Yadav">Shivji Yadav</option>
                                            <option value="Ratan Singh">Ratan Singh</option>
                                            <option value="Radhey Shyam">Radhey Shyam</option>
                                            <option value="Chandan Singh">Chandan Singh</option>
                                            <option value="Dinesh Thakur">Dinesh Thakur</option>
                                            <option value="MD Guddu Ali">MD Guddu Ali</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>

                                    {/* Fitter Name Other - EDITABLE */}
                                    {processFormData.fitter_name === "Other" && (
                                        <div className="space-y-2 group animate-in zoom-in-95 duration-200">
                                            <label className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest px-1 group-focus-within:text-red-500 transition-colors">
                                                <div className="w-1.5 h-1.5 rounded-full bg-gray-300 group-focus-within:bg-red-500 transition-colors"></div>
                                                Specify Fitter / नाम निर्दिष्ट करें <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={processFormData.fitter_name_other}
                                                onChange={(e) => handleProcessFormChange("fitter_name_other", e.target.value)}
                                                className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all font-bold text-gray-700 outline-none hover:border-red-200 shadow-sm"
                                                placeholder="Enter fitter name"
                                                required
                                            />
                                        </div>
                                    )}

                                    {/* Quality Supervisor - EDITABLE */}
                                    <div className="space-y-2 group">
                                        <label className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest px-1 group-focus-within:text-red-500 transition-colors">
                                            <div className="w-1.5 h-1.5 rounded-full bg-gray-300 group-focus-within:bg-red-500 transition-colors"></div>
                                            Quality Supervisor <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={processFormData.quality_supervisor}
                                            onChange={(e) => handleProcessFormChange("quality_supervisor", e.target.value)}
                                            className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all font-bold text-gray-700 outline-none hover:border-red-200 shadow-sm"
                                            required
                                        >
                                            <option value="">Select Quality Supervisor</option>
                                            <option value="Birendra Kumar Singh">Birendra Kumar Singh</option>
                                            <option value="Sandeep Gupta">Sandeep Gupta</option>
                                            <option value="Jitendra Diwakar">Jitendra Diwakar</option>
                                            <option value="Rohan Kumar">Rohan Kumar</option>
                                            <option value="Lallu Kumar">Lallu Kumar</option>
                                            <option value="Dharmendra Kushwaha">Dharmendra Kushwaha</option>
                                            <option value="Ashish Parida">Ashish Parida</option>
                                            <option value="Ajay Gupta">Ajay Gupta</option>
                                            <option value="Lekh Singh Patle">Lekh Singh Patle</option>
                                        </select>
                                    </div>

                                    {/* Mill Incharge - EDITABLE */}
                                    <div className="space-y-2 group">
                                        <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 group-focus-within:text-red-500 transition-colors">
                                            <div className="w-1.5 h-1.5 rounded-full bg-gray-300 group-focus-within:bg-red-500 transition-colors"></div>
                                            Mill Incharge / मिल इंचार्ज <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={processFormData.mill_incharge}
                                            onChange={(e) => handleProcessFormChange("mill_incharge", e.target.value)}
                                            className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all font-bold text-gray-700 outline-none hover:border-red-200 shadow-sm"
                                            required
                                        >
                                            <option value="">Select Mill Incharge</option>
                                            <option value="Ravi Singh">Ravi Singh</option>
                                            <option value="G Mohan Rao">G Mohan Rao</option>
                                        </select>
                                    </div>

                                    {/* Forman Name - EDITABLE */}
                                    <div className="space-y-2 group">
                                        <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 group-focus-within:text-red-500 transition-colors">
                                            <div className="w-1.5 h-1.5 rounded-full bg-gray-300 group-focus-within:bg-red-500 transition-colors"></div>
                                            Forman Name / फोरमैन नाम <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={processFormData.forman_name}
                                            onChange={(e) => handleProcessFormChange("forman_name", e.target.value)}
                                            className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all font-bold text-gray-700 outline-none hover:border-red-200 shadow-sm"
                                            required
                                        >
                                            <option value="">Select Forman Name</option>
                                            <option value="Hullash Paswan">Hullash Paswan</option>
                                            <option value="Montu Aanand Ghosh">Montu Aanand Ghosh</option>
                                        </select>
                                    </div>

                                    {/* Picture - EDITABLE */}
                                    <div className="space-y-2 group">
                                        <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 group-focus-within:text-red-500 transition-colors">
                                            <div className="w-1.5 h-1.5 rounded-full bg-gray-300 group-focus-within:bg-red-500 transition-colors"></div>
                                            Media Evidence / तस्वीर
                                        </label>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handlePictureUpload}
                                                className="w-full px-5 py-3 border border-gray-200 rounded-2xl bg-gray-50 focus:outline-none focus:ring-4 focus:ring-red-500/10 cursor-pointer text-sm file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-red-50 file:text-red-700 hover:file:bg-red-100 transition-all font-medium text-gray-500"
                                            />
                                            {processFormData.picture && (
                                                <div className="p-2.5 bg-green-50 rounded-xl border border-green-100 animate-pulse">
                                                    <Camera className="h-5 w-5 text-green-500" />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Remarks - EDITABLE */}
                                    <div className="lg:col-span-2 space-y-2 group">
                                        <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 group-focus-within:text-red-500 transition-colors">
                                            <div className="w-1.5 h-1.5 rounded-full bg-gray-300 group-focus-within:bg-red-500 transition-colors"></div>
                                            Operational Remarks / टिप्पणियाँ
                                        </label>
                                        <textarea
                                            value={processFormData.remarks}
                                            onChange={(e) => handleProcessFormChange("remarks", e.target.value)}
                                            rows={1}
                                            className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all font-bold text-gray-700 outline-none hover:border-red-200 shadow-sm resize-none"
                                            placeholder="Add any specific manufacturing notes or observations..."
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Form Footer */}
                            <div className="bg-gray-50/50 backdrop-blur-sm p-4 sm:p-6 md:p-8 lg:p-12 border-t border-gray-100 flex flex-col sm:flex-row justify-end items-center gap-3 sm:gap-4">
                                <button
                                    onClick={handleCloseProcessForm}
                                    className="w-full sm:w-auto px-6 sm:px-10 py-3 sm:py-4 text-xs sm:text-sm font-black text-gray-500 border-2 border-gray-200 rounded-xl sm:rounded-2xl hover:bg-gray-100 hover:border-gray-300 transition-all duration-300 active:scale-95 tracking-wider sm:tracking-widest uppercase"
                                >
                                    Cancel Operations
                                </button>
                                <button
                                    onClick={handleProcessSubmit}
                                    disabled={isSubmitting}
                                    className="w-full sm:w-auto px-8 sm:px-12 py-3 sm:py-4 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl sm:rounded-2xl shadow-xl shadow-red-500/30 hover:shadow-red-500/50 hover:from-red-700 hover:to-red-600 font-black text-xs sm:text-sm transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 sm:gap-3 tracking-wider sm:tracking-widest uppercase"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            Finalizing Records...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="h-4 w-4" />
                                            Confirm Submission
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                <div className="bg-white rounded-xl sm:rounded-2xl lg:rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden transform transition-all" style={{ minWidth: 0 }}>
                    <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-gray-700 p-3 sm:p-4 lg:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="p-2 sm:p-2.5 bg-red-500 rounded-xl sm:rounded-2xl shadow-lg shadow-red-500/30">
                                    <History className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-white text-base sm:text-lg lg:text-xl font-bold tracking-tight">
                                        {showHistory ? "Manufacturing Log" : "Incoming Batches"}
                                    </h2>
                                    <p className="text-gray-400 text-[10px] sm:text-xs font-medium uppercase tracking-wider sm:tracking-widest mt-0.5">
                                        {showHistory ? "Complete production history" : "Waiting for mill processing"}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="hidden sm:flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-full border border-white/5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                                    <span className="text-white text-[9px] font-black uppercase tracking-widest">Live Sync</span>
                                </div>
                                <div className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 bg-white/5 rounded-xl sm:rounded-2xl border border-white/10 backdrop-blur-sm">
                                    <span className="text-white/60 text-[10px] sm:text-xs font-bold mr-2 sm:mr-3 uppercase tracking-tighter">Total Records</span>
                                    <span className="text-white text-sm sm:text-lg font-black font-mono">
                                        {showHistory ? filteredHistoryData.length : filteredPendingData.length}
                                    </span>
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
                        <div className="flex-1 min-h-0 overflow-auto custom-scrollbar" style={{ maxHeight: 'calc(100vh - 280px)', WebkitOverflowScrolling: 'touch' }}>
                            {showHistory ? (
                                /* HISTORY VIEW - Pipe Mill Records */
                                <table className="min-w-full divide-y divide-gray-100">
                                    <thead className="bg-gray-50/50">
                                        <tr>
                                            <th className="sticky left-0 z-10 bg-gray-50/80 backdrop-blur-md px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">
                                                Time / तारीख व समय
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Recoiler Code / रिकोइलर कोड
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Pipe MIll Code / पाइप मिल कोड
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                Mill Number / मिल नंबर
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                Section / सेक्शन
                                            </th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">
                                                Recoiler / रिकोइलर
                                            </th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">
                                                Pipe Mill / पाइप मिल
                                            </th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">
                                                Parameters / पैरामीटर्स
                                            </th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">
                                                Operations / ऑपरेशंस
                                            </th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">
                                                Logistics / रसद
                                            </th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">
                                                Evidence / साक्ष्य
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-50">
                                        {filteredHistoryData.length > 0 ? (
                                            filteredHistoryData.map((record, index) => (
                                                <tr key={record.id || record._id || index} className="hover:bg-gray-50/50 transition-colors group">
                                                    <td className="sticky left-0 z-10 bg-white group-hover:bg-gray-50/50 px-6 py-5 whitespace-nowrap">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold text-gray-900">{formatIndianDateTime(record.created_at).split(' ')[0]}</span>
                                                            <span className="text-xs font-medium text-gray-500">{formatIndianDateTime(record.created_at).split(' ')[1]}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <span className="px-3 py-1 bg-orange-50 text-orange-700 rounded-lg text-xs font-bold border border-orange-100 shadow-sm">
                                                            {record.recoiler_short_code || 'N/A'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-black text-red-600 tracking-tighter">{record.unique_code || 'N/A'}</span>
                                                            <span className="text-[10px] text-gray-400 font-bold uppercase">{record.mill_number}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <div className="flex flex-wrap gap-2">
                                                            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-[10px] font-bold uppercase">{record.section}</span>
                                                            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-[10px] font-bold uppercase">{record.item_type}</span>
                                                            <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded text-[10px] font-bold uppercase">{record.size}</span>
                                                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold uppercase">{record.thickness}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-2 h-2 rounded-full ${record.shift === 'Day' ? 'bg-yellow-400' : 'bg-indigo-400'}`}></div>
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-bold text-gray-800">{record.fitter_name}</span>
                                                                <span className="text-[10px] text-gray-500 font-medium uppercase tracking-tight">{record.shift} Shift</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-bold text-gray-400 w-4">S:</span>
                                                                <span className="text-xs text-gray-600 font-medium">{record.quality_supervisor}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-bold text-gray-400 w-4">I:</span>
                                                                <span className="text-xs text-gray-600 font-medium">{record.mill_incharge}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-bold text-gray-400 w-4">F:</span>
                                                                <span className="text-xs text-gray-600 font-medium">{record.forman_name}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        {record.picture ? (
                                                            <button
                                                                onClick={() => handleViewImage(record.picture)}
                                                                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:border-red-200 hover:text-red-600 hover:shadow-sm transition-all shadow-[0_2px_4px_rgba(0,0,0,0.02)]"
                                                            >
                                                                <Camera className="h-3.5 w-3.5" />
                                                                View Record
                                                            </button>
                                                        ) : (
                                                            <span className="px-3 py-1.5 bg-gray-50 rounded-lg text-[10px] font-bold text-gray-400 uppercase">No Media</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                                                    <div className="flex flex-col items-center justify-center">
                                                        <Search className="h-12 w-12 text-gray-300 mb-4" />
                                                        <p className="text-lg font-medium mb-2">
                                                            {searchTerm ? "No matching Pipe Mill records found" : "No Pipe Mill records found"}
                                                        </p>
                                                        <p className="text-sm mb-4">
                                                            {searchTerm ? "Try adjusting your search terms" : "Submit a Pipe Mill entry first to see records here"}
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
                                /* PENDING VIEW - ReCoil Records */
                                <table className="min-w-full divide-y divide-gray-100" style={{ tableLayout: 'auto' }}>
                                    <thead className="bg-gray-50/50">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">
                                                Batch Control / बैच नियंत्रण
                                            </th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">
                                                Arrival / आगमन
                                            </th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">
                                                Input Material / इनपुट सामग्री
                                            </th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">
                                                Personnel / कार्मिक
                                            </th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">
                                                Station / स्टेशन
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-50">
                                        {filteredPendingData.length > 0 ? (
                                            filteredPendingData.map((record, index) => (
                                                <tr key={record.id || record._id || index} className="hover:bg-red-50/30 transition-all group">
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <button
                                                            onClick={() => handleProcessClick(record)}
                                                            className="relative overflow-hidden group/btn px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-gray-200 hover:shadow-red-200 hover:bg-red-600 transition-all active:scale-95"
                                                        >
                                                            <div className="absolute inset-0 bg-red-500 translate-x-[-100%] group-hover/btn:translate-x-0 transition-transform duration-300"></div>
                                                            <Edit className="h-3.5 w-3.5 relative z-10" />
                                                            <span className="relative z-10">Start Processing</span>
                                                        </button>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold text-gray-900">{formatIndianDateTime(record.created_at).split(' ')[0]}</span>
                                                            <span className="text-xs font-medium text-gray-500">{formatIndianDateTime(record.created_at).split(' ')[1]}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <div className="flex flex-col gap-1">
                                                            <span className="px-3 py-1 bg-red-50 text-red-700 border border-red-100 rounded-lg text-sm font-black w-fit">{record.unique_code || 'N/A'}</span>
                                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Material: {record.size}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-bold text-gray-800">{record.supervisor}</span>
                                                            <span className="text-[10px] text-gray-500 font-medium uppercase tracking-tight">Lead: {record.incharge}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-black text-gray-500 group-hover:bg-red-100 group-hover:text-red-600 transition-colors">
                                                                #{record.machine_number}
                                                            </div>
                                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Recoiler Unit</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                                                    <div className="flex flex-col items-center justify-center">
                                                        <CheckCircle2 className="h-12 w-12 text-green-300 mb-4" />
                                                        <p className="text-lg font-medium mb-2">
                                                            {searchTerm ? "No matching pending ReCoil records found" : "No pending ReCoil records for Pipe Mill processing"}
                                                        </p>
                                                        <p className="text-sm mb-4">
                                                            {searchTerm ? "Try adjusting your search terms" : "All ReCoil records have been processed for Pipe Mill"}
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
                                                                onClick={fetchPendingReCoilData}
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
                .custom-scrollbar::-webkit-scrollbar {
                    height: 6px;
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e5e7eb;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #d1d5db;
                }
            `}</style>
        </div>
    )
}

export default PipeMillPage
