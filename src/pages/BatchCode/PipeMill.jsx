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
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div className="flex items-center gap-3 w-full">
                        <div className="flex-1 min-w-0">
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-red-500 truncate">
                                {showHistory ? "Pipe Mill History" : "Pipe Mill Processing"}
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

                {showProcessForm && (
                    <div className="mt-6">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-gray-200">
                            <div className="bg-red-500 text-white p-4 rounded-t-lg flex justify-between items-center">
                                <h3 className="text-lg font-semibold">Submit Pipe Mill Data</h3>
                                <button onClick={handleCloseProcessForm} className="text-white hover:text-gray-200">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Recoiler Short Code - NON EDITABLE */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Recoiler Short Code / रिकोइलर शॉर्ट कोड <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={processFormData.recoiler_short_code}
                                            readOnly
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Auto-filled from ReCoil record</p>
                                    </div>

                                    {/* Machine Number - NON EDITABLE (if you have this field) */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Machine Number / मशीन नंबर <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={selectedRow?.machine_number || "N/A"}
                                            readOnly
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Auto-filled from ReCoil record</p>
                                    </div>

                                    {/* Mill Number - EDITABLE */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Mill Number / मिल नंबर <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={processFormData.mill_number}
                                            onChange={(e) => handleProcessFormChange("mill_number", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
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
                                    {/* <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Section / सेक्शन
                                        </label>
                                        <input
                                            type="text"
                                            value={processFormData.section}
                                            onChange={(e) => handleProcessFormChange("section", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                                            placeholder="Enter section"
                                        />
                                    </div> */}

                                    {/* Item Type - EDITABLE */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Item Type / आइटम प्रकार <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={processFormData.item_type}
                                            onChange={(e) => handleProcessFormChange("item_type", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                                            required
                                        >
                                            <option value="">Select Item Type</option>
                                            <option value="Square">Square</option>
                                            <option value="Round">Round</option>
                                            <option value="Rectangle">Rectangle</option>
                                        </select>
                                    </div>

                                    {/* Size - EDITABLE */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Size / आकार <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={processFormData.size}
                                            onChange={(e) => handleProcessFormChange("size", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
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
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Thickness / मोटाई <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={processFormData.thickness}
                                            onChange={(e) => handleProcessFormChange("thickness", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                                            placeholder="e.g., 1.50mm"
                                            required
                                        />
                                    </div>

                                    {/* Shift - EDITABLE */}
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
                                            <option value="">Select Shift</option>
                                            <option value="Day">Day</option>
                                            <option value="Night">Night</option>
                                        </select>
                                    </div>

                                    {/* Fitter Name - EDITABLE */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Fitter Name / फिटर नाम <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={processFormData.fitter_name}
                                            onChange={(e) => handleProcessFormChange("fitter_name", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
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
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Specify Other Fitter Name / अन्य फिटर नाम निर्दिष्ट करें <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={processFormData.fitter_name_other}
                                                onChange={(e) => handleProcessFormChange("fitter_name_other", e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                                                placeholder="Enter fitter name"
                                                required
                                            />
                                        </div>
                                    )}

                                    {/* Quality Supervisor - EDITABLE */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Quality Supervisor / गुणवत्ता पर्यवेक्षक <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={processFormData.quality_supervisor}
                                            onChange={(e) => handleProcessFormChange("quality_supervisor", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
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
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Mill Incharge / मिल इंचार्ज <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={processFormData.mill_incharge}
                                            onChange={(e) => handleProcessFormChange("mill_incharge", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                                            required
                                        >
                                            <option value="">Select Mill Incharge</option>
                                            <option value="Ravi Singh">Ravi Singh</option>
                                            <option value="G Mohan Rao">G Mohan Rao</option>
                                        </select>
                                    </div>

                                    {/* Forman Name - EDITABLE */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Forman Name / फोरमैन नाम <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={processFormData.forman_name}
                                            onChange={(e) => handleProcessFormChange("forman_name", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                                            required
                                        >
                                            <option value="">Select Forman Name</option>
                                            <option value="Hullash Paswan">Hullash Paswan</option>
                                            <option value="Montu Aanand Ghosh">Montu Aanand Ghosh</option>
                                        </select>
                                    </div>

                                    {/* Picture - EDITABLE */}
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Picture / तस्वीर
                                        </label>
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handlePictureUpload}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                                            />
                                            {processFormData.picture && (
                                                <Camera className="h-5 w-5 text-green-500" />
                                            )}
                                        </div>
                                    </div>

                                    {/* Remarks - EDITABLE */}
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
                                    {showHistory ? "Pipe Mill Records" : "Pending for Pipe Mill Processing"}
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
                                /* HISTORY VIEW - Pipe Mill Records */
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Time / तारीख व समय
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Recoiler Code / रिकोइलर कोड
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Pipe MIll Code / पाइप मिल कोड
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Mill Number / मिल नंबर
                                            </th>
                                            {/* <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Section / सेक्शन
                                            </th> */}
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Item Type / आइटम प्रकार
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Size / आकार
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Thickness / मोटाई
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Shift / शिफ्ट
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Fitter Name / फिटर नाम
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Quality Supervisor / गुणवत्ता पर्यवेक्षक
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Mill Incharge / मिल इंचार्ज
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Forman Name / फोरमैन नाम
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Remarks
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Picture
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
                                                        {record.recoiler_short_code || 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {record.unique_code || 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {record.mill_number || 'N/A'}
                                                    </td>
                                                    {/* <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {record.section || 'N/A'}
                                                    </td> */}
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {record.item_type || 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {record.size || 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {record.thickness || 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {record.shift || 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {record.fitter_name || 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {record.quality_supervisor || 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {record.mill_incharge || 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {record.forman_name || 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {record.remarks || 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {record.picture ? (
                                                            <button
                                                                onClick={() => handleViewImage(record.picture)}
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
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Action / कार्रवाई
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Time / तारीख व समय
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                ReCoil Code / रीकॉइल कोड
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Size / आकार
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Supervisor / पर्यवेक्षक
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Incharge / इंचार्ज
                                            </th>
                                            {/* <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Contractor / ठेकेदार
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Welder Name / वेल्डर नाम
                                            </th> */}
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Machine No. / मशीन नंबर
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
                                                            Process
                                                        </button>
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {formatIndianDateTime(record.created_at || 'N/A')}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {record.unique_code || 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {record.size || 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {record.supervisor || 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {record.incharge || 'N/A'}
                                                    </td>
                                                    {/* <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {record.contractor || 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {record.welder_name || 'N/A'}
                                                    </td> */}
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {record.machine_number || 'N/A'}
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
            `}</style>
        </div>
    )
}

export default PipeMillPage
