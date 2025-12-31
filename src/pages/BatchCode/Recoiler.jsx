"use client"
import { useState, useEffect, useCallback, useMemo } from "react"
import { CheckCircle2, X, Search, History, ArrowLeft, Edit, Save, AlertCircle } from "lucide-react"
// @ts-ignore - JSX component
import { batchcodeAPI } from "../../services/batchcodeAPI";

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

function ReCoilPage() {
    const [pendingHotCoilData, setPendingHotCoilData] = useState([])
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

    // State for process form
    const [showProcessForm, setShowProcessForm] = useState(false)
    const [selectedRow, setSelectedRow] = useState(null)
    const [processFormData, setProcessFormData] = useState({
        unique_code: "",
        size: "",
        supervisor: "",
        supervisor_other: "",
        incharge: "",
        incharge_other: "",
        contractor: "",
        welder_name: "",
        welder_name_other: "",
        machine_number: ""
    })

    // Debounced search term for better performance
    const debouncedSearchTerm = useDebounce(searchTerm, 300)

    // Auto-hide popup after 2 seconds
    useEffect(() => {
        if (showPopup) {
            const timer = setTimeout(() => {
                setShowPopup(false)
                setPopupMessage("")
                setPopupType("")
            }, 2000)

            return () => clearTimeout(timer)
        }
    }, [showPopup])

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

    // Fetch pending Hot Coil data (Hot Coil records that don't have ReCoil entries)
    const fetchPendingHotCoilData = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            ////console.log('🔄 Fetching pending Hot Coil data for ReCoil...')

            // Fetch Hot Coil data
            const hotCoilResponse = await batchcodeAPI.getHotCoilHistory()
            let hotCoilData = [];

            // Handle different response structures
            if (Array.isArray(hotCoilResponse.data)) {
                hotCoilData = hotCoilResponse.data;
            } else if (hotCoilResponse.data && Array.isArray(hotCoilResponse.data.data)) {
                hotCoilData = hotCoilResponse.data.data;
            } else if (hotCoilResponse.data && hotCoilResponse.data.success && Array.isArray(hotCoilResponse.data.data)) {
                hotCoilData = hotCoilResponse.data.data;
            } else {
                hotCoilData = [];
            }

            //console.log('✅ Hot Coil Data fetched:', hotCoilData.length, 'records')

            // Fetch existing ReCoil entries to filter out already processed Hot Coil records
            const reCoilResponse = await batchcodeAPI.getReCoilHistory()
            let existingEntries = [];

            // Handle different response structures for ReCoil data
            if (Array.isArray(reCoilResponse.data)) {
                existingEntries = reCoilResponse.data;
            } else if (reCoilResponse.data && Array.isArray(reCoilResponse.data.data)) {
                existingEntries = reCoilResponse.data.data;
            } else if (reCoilResponse.data && reCoilResponse.data.success && Array.isArray(reCoilResponse.data.data)) {
                existingEntries = reCoilResponse.data.data;
            }

            //console.log('ReCoil Entries fetched:', existingEntries.length, 'records')

            // Get all Hot Coil short codes that already have ReCoil entries
            const processedShortCodes = new Set(
                existingEntries
                    .map(reCoilEntry => reCoilEntry.hot_coiler_short_code)
                    .filter(code => code) // Remove null/undefined
            )

            //console.log('✅ Processed Hot Coil Short Codes:', Array.from(processedShortCodes))

            // Filter Hot Coil data to only show records that don't have ReCoil entries
            const pendingData = hotCoilData.filter(hotCoilRecord => {
                const hotCoilShortCode = hotCoilRecord.unique_code

                // Check if this Hot Coil short code exists in ReCoil entries
                const isProcessed = processedShortCodes.has(hotCoilShortCode)

                //console.log(`📋 Hot Coil Record: ${hotCoilShortCode} - Processed: ${isProcessed}`)

                return !isProcessed
            })

            //console.log('✅ Final pending data:', pendingData.length, 'records')
            setPendingHotCoilData(pendingData)
            setLoading(false)

        } catch (error) {
            console.error("❌ Error fetching pending Hot Coil data:", error)
            showPopupMessage("Error fetching pending Hot Coil data! / लंबित हॉट कॉइल डेटा प्राप्त करने में त्रुटि!", "warning")
            setPendingHotCoilData([])
            setLoading(false)
        }
    }, [])

    // Fetch ReCoil history data
    const fetchHistoryData = useCallback(async () => {
        try {
            setLoading(true)
            //console.log('🔄 Fetching ReCoil history data...')

            const response = await batchcodeAPI.getReCoilHistory()
            //console.log('📦 Raw ReCoil API response:', response)
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

            //console.log('✅ Processed ReCoil history data:', data)
            setHistoryData(data)
            setLoading(false)
        } catch (error) {
            console.error("❌ Error fetching ReCoil history:", error)
            console.error("🔧 Error details:", error.response?.data)
            showPopupMessage("Error fetching ReCoil history! / रीकॉइल इतिहास प्राप्त करने में त्रुटि!", "warning")
            setHistoryData([]) // Set empty array on error
            setLoading(false)
        }
    }, [])

    // Handle process button click for pending Hot Coil records
    const handleProcessClick = useCallback((hotCoilRecord) => {
        setSelectedRow(hotCoilRecord)

        // Generate short code for Hot Coil record
        const shortCode = hotCoilRecord.unique_code

        // Pre-fill form with Hot Coil data
        setProcessFormData({
            unique_code: shortCode,
            size: hotCoilRecord.size || "",
            supervisor: "",
            supervisor_other: "",
            incharge: "",
            incharge_other: "",
            contractor: "",
            welder_name: "",
            welder_name_other: "",
            machine_number: ""
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

    // Form validation
    const validateForm = () => {
        const requiredFields = [
            'unique_code', 'size', 'supervisor', 'incharge',
            'contractor', 'welder_name', 'machine_number'
        ]

        for (let field of requiredFields) {
            if (!processFormData[field]) {
                showPopupMessage(`Please fill all required fields! / कृपया सभी आवश्यक फ़ील्ड्स भरें!`, "warning")
                return false
            }
        }

        // Handle "Other" fields
        if (processFormData.supervisor === "Other" && !processFormData.supervisor_other) {
            showPopupMessage("Please specify the supervisor name! / कृपया पर्यवेक्षक का नाम निर्दिष्ट करें!", "warning")
            return false
        }
        if (processFormData.incharge === "Other" && !processFormData.incharge_other) {
            showPopupMessage("Please specify the incharge name! / कृपया इंचार्ज का नाम निर्दिष्ट करें!", "warning")
            return false
        }
        if (processFormData.welder_name === "Other" && !processFormData.welder_name_other) {
            showPopupMessage("Please specify the welder name! / कृपया वेल्डर का नाम निर्दिष्ट करें!", "warning")
            return false
        }

        return true
    }

    const handleProcessSubmit = useCallback(async () => {
        if (!validateForm()) {
            return
        }

        setIsSubmitting(true)
        try {
            // Prepare submission data according to backend validation schema
            // Backend expects: sample_timestamp (auto-generated), hot_coiler_short_code, size, supervisor, incharge, contractor, machine_number, welder_name
            const submissionData = {
                hot_coiler_short_code: processFormData.unique_code, // Backend expects hot_coiler_short_code, not unique_code
                size: processFormData.size || null,
                supervisor: processFormData.supervisor === "Other"
                    ? processFormData.supervisor_other
                    : processFormData.supervisor,
                incharge: processFormData.incharge === "Other"
                    ? processFormData.incharge_other
                    : processFormData.incharge || null,
                contractor: processFormData.contractor || null,
                welder_name: processFormData.welder_name === "Other"
                    ? processFormData.welder_name_other
                    : processFormData.welder_name || null,
                machine_number: processFormData.machine_number // Can be string or array - backend will handle it
                // sample_timestamp will be auto-generated by backend if not provided
            }

            ////console.log('🔍 Submission data:', submissionData)

            const response = await batchcodeAPI.submitReCoil(submissionData)

            if (response.data.success) {
                showPopupMessage("ReCoil data submitted successfully! / रीकॉइल डेटा सफलतापूर्वक जमा किया गया!", "success")
                setShowProcessForm(false)

                // Refresh BOTH tabs data to ensure consistency
                await Promise.all([
                    fetchHistoryData(),
                    fetchPendingHotCoilData()
                ])

                ////console.log('✅ Both tabs refreshed after submission')
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
    }, [processFormData, fetchHistoryData, fetchPendingHotCoilData])

    // Close process form
    const handleCloseProcessForm = useCallback(() => {
        setShowProcessForm(false)
        setSelectedRow(null)
        setProcessFormData({
            unique_code: "",
            size: "",
            supervisor: "",
            supervisor_other: "",
            incharge: "",
            incharge_other: "",
            contractor: "",
            welder_name: "",
            welder_name_other: "",
            machine_number: ""
        })
    }, [])

    // Toggle between pending and history views
    const toggleView = useCallback(() => {
        setShowHistory(prev => !prev)
        setSearchTerm("") // Clear search when switching views
    }, [])

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

    // Fetch appropriate data when view changes
    useEffect(() => {
        if (showHistory) {
            fetchHistoryData()
        } else {
            fetchPendingHotCoilData()
        }
    }, [showHistory, fetchHistoryData, fetchPendingHotCoilData])

    // Function to generate short code if not present
    const generateShortCode = (recordData) => {
        if (recordData.sms_short_code) return recordData.sms_short_code;
        if (recordData.unique_code) return recordData.unique_code;

        // Fallback generation
        const date = recordData.createdAt ? new Date(recordData.createdAt).toISOString().slice(0, 10).replace(/-/g, '') : '';
        return `HC${date}`;
    }

    // Filter data based on search term
    const filteredPendingData = useMemo(() => {
        if (!debouncedSearchTerm) return pendingHotCoilData;

        return pendingHotCoilData.filter(record => {
            const searchLower = debouncedSearchTerm.toLowerCase()
            return (
                formatIndianDateTime(record.createdAt).toLowerCase().includes(searchLower) ||
                String(record.unique_code).toLowerCase().includes(searchLower) ||
                String(record.size || '').toLowerCase().includes(searchLower) ||
                String(record.mill_incharge || '').toLowerCase().includes(searchLower) ||
                String(record.quality_supervisor || '').toLowerCase().includes(searchLower)
            )
        })
    }, [pendingHotCoilData, debouncedSearchTerm])

    const filteredHistoryData = useMemo(() => {
        if (!debouncedSearchTerm) return historyData;

        return historyData.filter(record => {
            const searchLower = debouncedSearchTerm.toLowerCase()
            return (
                String(record.unique_code || '').toLowerCase().includes(searchLower) ||
                formatIndianDateTime(record.createdAt).toLowerCase().includes(searchLower) ||
                String(record.size || '').toLowerCase().includes(searchLower) ||
                String(record.supervisor || '').toLowerCase().includes(searchLower) ||
                String(record.incharge || '').toLowerCase().includes(searchLower) ||
                String(record.contractor || '').toLowerCase().includes(searchLower) ||
                String(record.welder_name || '').toLowerCase().includes(searchLower) ||
                String(record.machine_number || '').toLowerCase().includes(searchLower)
            )
        })
    }, [historyData, debouncedSearchTerm])

    // Options for dropdowns
    const supervisorOptions = [
        { value: "", label: "Select Supervisor", hindiLabel: "पर्यवेक्षक चुनें" },
        { value: "Ramdhan Verma", label: "Ramdhan Verma", hindiLabel: "रामधन वर्मा" },
        { value: "Vijay Raut", label: "Vijay Raut", hindiLabel: "विजय राउत" },
        { value: "Yogesh Choudhari", label: "Yogesh Choudhari", hindiLabel: "योगेश चौधरी" },
        { value: "Rajesh Lohar", label: "Rajesh Lohar", hindiLabel: "राजेश लोहार" },
        { value: "Kamal Sahu", label: "Kamal Sahu", hindiLabel: "कमल साहू" },
        { value: "Kamlesh Bisen", label: "Kamlesh Bisen", hindiLabel: "कमलेश बिसेन" },
        { value: "Ranjit Kumar", label: "Ranjit Kumar", hindiLabel: "रंजीत कुमार" },
        { value: "Karmalal Nishad", label: "Karmalal Nishad", hindiLabel: "कर्मलाल निषाद" },
        { value: "Suryakant Jena", label: "Suryakant Jena", hindiLabel: "सूर्यकांत जेना" },
        { value: "Hitesh Barman", label: "Hitesh Barman", hindiLabel: "हितेश बरमन" },
        { value: "Other", label: "Other", hindiLabel: "अन्य" }
    ]

    const inchargeOptions = [
        { value: "", label: "Select Incharge", hindiLabel: "इंचार्ज चुनें" },
        { value: "Toman Lal Sahu", label: "Toman Lal Sahu", hindiLabel: "तोमन लाल साहू" },
        { value: "Ramdhan Verma", label: "Ramdhan Verma", hindiLabel: "रामधन वर्मा" },
        { value: "Ranjit Kumar", label: "Ranjit Kumar", hindiLabel: "रंजीत कुमार" },
        { value: "Other", label: "Other", hindiLabel: "अन्य" }
    ]

    const contractorOptions = [
        { value: "", label: "Select Contractor", hindiLabel: "ठेकेदार चुनें" },
        { value: "Dhananjay (CT)", label: "Dhananjay (CT)", hindiLabel: "धनंजय (सीटी)" },
        { value: "Mumtaz (MDM)", label: "Mumtaz (MDM)", hindiLabel: "मुमताज (एमडीएम)" },
        { value: "Birendra Kumar (BK)", label: "Birendra Kumar (BK)", hindiLabel: "बिरेंद्र कुमार (बीके)" },
        { value: "Sonu Kumar (SK)", label: "Sonu Kumar (SK)", hindiLabel: "सोनू कुमार (एसके)" }
    ]

    const welderNameOptions = [
        { value: "", label: "Select Welder Name", hindiLabel: "वेल्डर नाम चुनें" },
        { value: "Akhilesh", label: "Akhilesh", hindiLabel: "अखिलेश" },
        { value: "Jitendra", label: "Jitendra", hindiLabel: "जितेंद्र" },
        { value: "Chandan", label: "Chandan", hindiLabel: "चंदन" },
        { value: "Naresh", label: "Naresh", hindiLabel: "नरेश" },
        { value: "Arvind", label: "Arvind", hindiLabel: "अरविंद" },
        { value: "Pradeep", label: "Pradeep", hindiLabel: "प्रदीप" },
        { value: "Kaushal", label: "Kaushal", hindiLabel: "कौशल" },
        { value: "Birendra", label: "Birendra", hindiLabel: "बिरेंद्र" },
        { value: "Sonu", label: "Sonu", hindiLabel: "सोनू" },
        { value: "Amit", label: "Amit", hindiLabel: "अमित" },
        { value: "Dhananjay", label: "Dhananjay", hindiLabel: "धनंजय" },
        { value: "Sabbar Khan", label: "Sabbar Khan", hindiLabel: "सब्बर खान" },
        { value: "Saddam", label: "Saddam", hindiLabel: "सद्दाम" },
        { value: "Manoj", label: "Manoj", hindiLabel: "मनोज" },
        { value: "Govind", label: "Govind", hindiLabel: "गोविंद" },
        { value: "Nirmal", label: "Nirmal", hindiLabel: "निर्मल" },
        { value: "Badshah Khan", label: "Badshah Khan", hindiLabel: "बादशाह खान" },
        { value: "Ankit", label: "Ankit", hindiLabel: "अंकित" },
        { value: "Aanand", label: "Aanand", hindiLabel: "आनंद" },
        { value: "Other", label: "Other", hindiLabel: "अन्य" }
    ]

    const machineNumberOptions = [
        { value: "", label: "Select Machine Number", hindiLabel: "मशीन नंबर चुनें" },
        { value: "SRMPL01", label: "SRMPL01", hindiLabel: "एसआरएमपीएल01" },
        { value: "SRMPL02", label: "SRMPL02", hindiLabel: "एसआरएमपीएल02" },
        { value: "SRMPL03", label: "SRMPL03", hindiLabel: "एसआरएमपीएल03" },
        { value: "SRMPL04", label: "SRMPL04", hindiLabel: "एसआरएमपीएल04" },
        { value: "SRMPL05", label: "SRMPL05", hindiLabel: "एसआरएमपीएल05" },
        { value: "SRMPL06", label: "SRMPL06", hindiLabel: "एसआरएमपीएल06" },
        { value: "SRMPL07", label: "SRMPL07", hindiLabel: "एसआरएमपीएल07" },
        { value: "SRMPL08", label: "SRMPL08", hindiLabel: "एसआरएमपीएल08" },
        { value: "SRMPL09", label: "SRMPL09", hindiLabel: "एसआरएमपीएल09" }
    ]

    return (
        <div>
            <div className="space-y-6">
                {/* Popup Modal */}
                {showPopup && (
                    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
                        <div className={`relative mx-4 p-6 rounded-lg shadow-2xl max-w-sm w-full transform transition-all duration-300 ${popupType === "success"
                            ? 'bg-green-50 border-2 border-green-400'
                            : 'bg-yellow-50 border-2 border-yellow-400'
                            }`}>
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
                            </div>
                            {/* Progress bar for auto-dismiss */}
                            <div className="mt-4 w-full bg-gray-200 rounded-full h-1">
                                <div
                                    className={`h-1 rounded-full ${popupType === "success" ? 'bg-green-500' : 'bg-yellow-500'
                                        }`}
                                    style={{
                                        animation: 'shrink 2s linear forwards'
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Header Section */}
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div className="flex items-center gap-3 w-full">
                        <div className="flex-1 min-w-0">
                            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-red-500 truncate">
                                {showHistory ? "ReCoil History" : "ReCoil Processing"}
                            </h1>
                        </div>
                    </div>

                    <div className="flex flex-col-2 sm:flex-row gap-2 w-full md:w-auto">
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

                {/* Process Form Modal */}
                {showProcessForm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                            <div className="bg-red-500 text-white p-4 rounded-t-lg flex justify-between items-center">
                                <h3 className="text-lg font-semibold">Submit ReCoil Data</h3>
                                <button onClick={handleCloseProcessForm} className="text-white hover:text-gray-200">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Hot Coiler Short Code (Auto-filled from Hot Coil) */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Hot Coil Code / हॉट कॉइलर कोड <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={processFormData.unique_code}
                                            readOnly
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Auto-filled from Hot Coil</p>
                                    </div>

                                    {/* Size (Auto-filled from Hot Coil) */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Size / आकार <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={processFormData.size}
                                            readOnly
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                                        />
                                    </div>

                                    {/* Supervisor */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Supervisor / पर्यवेक्षक <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={processFormData.supervisor}
                                            onChange={(e) => handleProcessFormChange("supervisor", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                                            required
                                        >
                                            {supervisorOptions.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Supervisor Other */}
                                    {processFormData.supervisor === "Other" && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Specify Other Supervisor / अन्य पर्यवेक्षक निर्दिष्ट करें <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={processFormData.supervisor_other}
                                                onChange={(e) => handleProcessFormChange("supervisor_other", e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                                                placeholder="Enter supervisor name"
                                                required
                                            />
                                        </div>
                                    )}

                                    {/* Incharge */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Incharge / इंचार्ज <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={processFormData.incharge}
                                            onChange={(e) => handleProcessFormChange("incharge", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                                            required
                                        >
                                            {inchargeOptions.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Incharge Other */}
                                    {processFormData.incharge === "Other" && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Specify Other Incharge / अन्य इंचार्ज निर्दिष्ट करें <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={processFormData.incharge_other}
                                                onChange={(e) => handleProcessFormChange("incharge_other", e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                                                placeholder="Enter incharge name"
                                                required
                                            />
                                        </div>
                                    )}

                                    {/* Contractor */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Contractor / ठेकेदार <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={processFormData.contractor}
                                            onChange={(e) => handleProcessFormChange("contractor", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                                            required
                                        >
                                            {contractorOptions.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Welder Name */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Welder Name / वेल्डर नाम <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={processFormData.welder_name}
                                            onChange={(e) => handleProcessFormChange("welder_name", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                                            required
                                        >
                                            {welderNameOptions.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Welder Name Other */}
                                    {processFormData.welder_name === "Other" && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Specify Other Welder Name / अन्य वेल्डर नाम निर्दिष्ट करें <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={processFormData.welder_name_other}
                                                onChange={(e) => handleProcessFormChange("welder_name_other", e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                                                placeholder="Enter welder name"
                                                required
                                            />
                                        </div>
                                    )}

                                    {/* Machine Number */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Machine Number / मशीन नंबर <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={processFormData.machine_number}
                                            onChange={(e) => handleProcessFormChange("machine_number", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                                            required
                                        >
                                            {machineNumberOptions.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
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
                                    {showHistory ? "ReCoil Records" : "Pending for ReCoil Processing"}
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
                                /* HISTORY VIEW - ReCoil Records */
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Time / तारीख व समय
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Hot Coiler Code / हॉट कॉइल कोड
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Recoiler Code / रिकोइलर कोड
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
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Contractor / ठेकेदार
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Welder Name / वेल्डर नाम
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Machine No. / मशीन नंबर
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
                                                        {record.hot_coiler_short_code || 'N/A'}
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
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {record.contractor || 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {record.welder_name || 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {record.machine_number || 'N/A'}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                                                    <div className="flex flex-col items-center justify-center">
                                                        <Search className="h-12 w-12 text-gray-300 mb-4" />
                                                        <p className="text-lg font-medium mb-2">
                                                            {searchTerm ? "No matching ReCoil records found" : "No ReCoil records found"}
                                                        </p>
                                                        <p className="text-sm mb-4">
                                                            {searchTerm ? "Try adjusting your search terms" : "Submit a ReCoil entry first to see records here"}
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
                                /* PENDING VIEW - Hot Coil Records */
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
                                                Hot Coil Code / हॉट कॉइल कोड
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Size / आकार
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Mill Incharge / मिल इंचार्ज
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Quality Supervisor / गुणवत्ता पर्यवेक्षक
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
                                                        {record.mill_incharge || 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {record.quality_supervisor || 'N/A'}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                                    <div className="flex flex-col items-center justify-center">
                                                        <CheckCircle2 className="h-12 w-12 text-green-300 mb-4" />
                                                        <p className="text-lg font-medium mb-2">
                                                            {searchTerm ? "No matching pending Hot Coil records found" : "No pending Hot Coil records for ReCoil processing"}
                                                        </p>
                                                        <p className="text-sm mb-4">
                                                            {searchTerm ? "Try adjusting your search terms" : "All Hot Coil records have been processed for ReCoil"}
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
                                                                onClick={fetchPendingHotCoilData}
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

export default ReCoilPage
