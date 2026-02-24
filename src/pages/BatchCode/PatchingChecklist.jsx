import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Calendar, Clock, User, Clipboard, Hash, Box, Upload, X, Check, Save, Plus, ArrowLeft } from 'lucide-react'
import * as batchcodeAPI from '../../api/batchcodeApi'

const PatchingChecklist = () => {
    const [formData, setFormData] = useState({
        check_date: new Date().toISOString().split('T')[0],
        furnace_number: '',
        crucible_number: '',
        rm_party_name: '',
        rm_party_other: '',
        material_type: '',
        rm_bag_pic: null,
        patching_start_time: '',
        patching_end_time: '',
        fc_breaking_check: 'No',
        lining_check: 'No',
        gld_check: 'No',
        premix_check: 'No',
        bottom_check: 'No',
        full_check: 'No',
        nali_top_dry_check: 'No',
        weight_check: 'No',
        proper_weight_per_check: 'No',
        mix_check: 'No',
        checked_by: '',
        pprm_party: '',
        p_patching_life: ''
    })

    const [showForm, setShowForm] = useState(false)
    const [isSyncing, setIsSyncing] = useState(false)
    const [imgPreview, setImgPreview] = useState(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [message, setMessage] = useState({ text: '', type: '' })
    const [history, setHistory] = useState([])
    const fileInputRef = useRef(null)

    const fetchHistory = useCallback(async (isSilent = false) => {
        if (!isSilent) setIsSyncing(true)
        try {
            const response = await batchcodeAPI.getPatchingChecklists()
            if (response.data.success) {
                setHistory(response.data.data)
            }
        } catch (error) {
            console.error("Error fetching history:", error)
        } finally {
            if (!isSilent) setIsSyncing(false)
        }
    }, [])

    useEffect(() => {
        fetchHistory()
        // Auto-refresh every 10 seconds
        const interval = setInterval(() => {
            fetchHistory(true)
        }, 10000)
        return () => clearInterval(interval)
    }, [fetchHistory])

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (checked ? 'Yes' : 'No') : value
        }))
    }

    const handleFileChange = (e) => {
        const file = e.target.files[0]
        if (file) {
            setFormData(prev => ({ ...prev, rm_bag_pic: file }))
            const reader = new FileReader()
            reader.onloadend = () => setImgPreview(reader.result)
            reader.readAsDataURL(file)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsSubmitting(true)
        setMessage({ text: '', type: '' })

        try {
            const data = new FormData()
            Object.keys(formData).forEach(key => {
                if (key === 'rm_bag_pic' && formData[key]) {
                    data.append('picture', formData[key]) // API might expect 'picture' based on other modules
                } else if (key === 'rm_party_name' && formData[key] === 'Other') {
                    data.append(key, formData.rm_party_other)
                } else {
                    data.append(key, formData[key])
                }
            })

            const response = await batchcodeAPI.submitPatchingChecklist(data)
            if (response.data.success) {
                setMessage({ text: 'Patching checklist submitted successfully!', type: 'success' })

                // Reset ALL fields
                setFormData({
                    check_date: new Date().toISOString().split('T')[0],
                    furnace_number: '',
                    crucible_number: '',
                    rm_party_name: '',
                    rm_party_other: '',
                    material_type: '',
                    rm_bag_pic: null,
                    patching_start_time: '',
                    patching_end_time: '',
                    fc_breaking_check: 'No',
                    lining_check: 'No',
                    gld_check: 'No',
                    premix_check: 'No',
                    bottom_check: 'No',
                    full_check: 'No',
                    nali_top_dry_check: 'No',
                    weight_check: 'No',
                    proper_weight_per_check: 'No',
                    mix_check: 'No',
                    checked_by: '',
                    pprm_party: '',
                    p_patching_life: ''
                })
                setImgPreview(null)
                fetchHistory()

                // Optional: Back to table after short delay
                setTimeout(() => {
                    setShowForm(false)
                    setMessage({ text: '', type: '' })
                }, 2000)
            }
        } catch (error) {
            setMessage({ text: error.message || 'Error submitting form', type: 'error' })
        } finally {
            setIsSubmitting(false)
        }
    }

    const furnaceOptions = ['Furnace 1', 'Furnace 2', 'Furnace 3', 'Furnace 4', 'Furnace 5', 'Furnace 6', 'Furnace 7']
    const crucibleOptions = ['A', 'B']
    const partyOptions = ['Ram Prakash', 'RK Minerals', 'Jaju Impex', 'Other']
    const materialOptions = ['Premix', 'Non Premix']

    const checklistPoints = [
        { id: 'fc_breaking_check', label: 'FC Breaking Properly', hindi: '(FC तोड़ना ठीक से हुआ)' },
        { id: 'lining_check', label: 'Lining Check', hindi: '(लाइनिंग की जाँच)' },
        { id: 'gld_check', label: 'Check GLD', hindi: '(GLD की जाँच)' },
        { id: 'premix_check', label: 'Ramming Mass Proper Use Premix', hindi: '(रैमिंग मास प्रेमिक्स का उचित उपयोग)' },
        { id: 'bottom_check', label: 'Make bottom with Ramming Mass', hindi: '(रैमिंग मास से बॉटम बनाना)' },
        { id: 'full_check', label: 'Start patching with use proper tool', hindi: '(उचित उपकरण के साथ पैचिंग शुरू करें)' },
        { id: 'nali_top_dry_check', label: 'Make Nali top and dry properly', hindi: '(नाली टॉप बनाएं और ठीक से सुखाएं)' }
    ]

    const nonPremixPoints = [
        { id: 'weight_check', label: 'Weight Boric Acid', hindi: '(बोरिक एसिड का वजन)' },
        { id: 'proper_weight_per_check', label: 'Proper Weight % as per Instruction', hindi: '(निर्देशानुसार उचित वजन %)' },
        { id: 'mix_check', label: 'Proper mix in Ramming Mass + Boric Acid', hindi: '(रैमिंग मास + बोरिक एसिड में उचित मिश्रण)' }
    ]

    return (
        <div className="min-h-screen bg-gray-50 py-4 md:py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-full mx-auto space-y-6">

                {showForm ? (
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-300">
                        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 px-6 py-4 flex items-center justify-between">
                            <div>
                                <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-3">
                                    <Clipboard className="w-6 h-6" />
                                    New Patching Entry
                                </h1>
                                <p className="text-blue-100 text-xs opacity-90">नया पैचिंग एंट्री भरें</p>
                            </div>
                            <button
                                onClick={() => setShowForm(false)}
                                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all font-medium text-sm border border-white/20"
                            >
                                <ArrowLeft className="w-4 h-4" /> Back to List
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
                            {/* Basic Details Section */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label htmlFor="check_date" className="text-sm font-semibold text-gray-700 flex items-center gap-2 cursor-pointer">
                                        <Calendar className="w-4 h-4 text-blue-600" />
                                        Date (दिनांक) *
                                    </label>
                                    <input
                                        id="check_date"
                                        type="date"
                                        name="check_date"
                                        value={formData.check_date}
                                        onChange={handleInputChange}
                                        onClick={(e) => e.target.showPicker?.()}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none cursor-pointer"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                        <Hash className="w-4 h-4 text-blue-600" />
                                        Furnace Number (फर्नेंस नंबर) *
                                    </label>
                                    <select
                                        name="furnace_number"
                                        value={formData.furnace_number}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none bg-white"
                                        required
                                    >
                                        <option value="">Select Furnace</option>
                                        {furnaceOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                        <Box className="w-4 h-4 text-blue-600" />
                                        Crucible Number (क्रूसिबल नंबर) *
                                    </label>
                                    <div className="flex gap-2">
                                        {crucibleOptions.map(opt => (
                                            <button
                                                key={opt}
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, crucible_number: opt }))}
                                                className={`flex-1 py-3 px-4 rounded-lg border transition-all font-medium ${formData.crucible_number === opt
                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                                    : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                                                    }`}
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                        <User className="w-4 h-4 text-blue-600" />
                                        Ramming Mass Party (रैमिंग मास पार्टी) *
                                    </label>
                                    <select
                                        name="rm_party_name"
                                        value={formData.rm_party_name}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none bg-white"
                                        required
                                    >
                                        <option value="">Select Party</option>
                                        {partyOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                    {formData.rm_party_name === 'Other' && (
                                        <input
                                            type="text"
                                            name="rm_party_other"
                                            placeholder="Enter party name"
                                            value={formData.rm_party_other}
                                            onChange={handleInputChange}
                                            className="mt-2 w-full px-4 py-2 border-b-2 border-blue-400 focus:outline-none bg-transparent"
                                            required
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Material Type Section */}
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                <label className="text-sm font-semibold text-gray-700 block mb-4">
                                    Material Type (सामग्री का प्रकार) *
                                </label>
                                <div className="flex flex-wrap gap-4">
                                    {materialOptions.map(opt => (
                                        <label key={opt} className="flex items-center gap-3 cursor-pointer group">
                                            <div className="relative">
                                                <input
                                                    type="radio"
                                                    name="material_type"
                                                    value={opt}
                                                    checked={formData.material_type === opt}
                                                    onChange={handleInputChange}
                                                    className="sr-only"
                                                    required
                                                />
                                                <div className={`w-5 h-5 rounded-full border-2 transition-all ${formData.material_type === opt
                                                    ? 'border-blue-600 bg-blue-600 ring-2 ring-blue-100'
                                                    : 'border-gray-300 group-hover:border-blue-400'
                                                    }`}>
                                                    {formData.material_type === opt && (
                                                        <div className="absolute inset-0 m-auto w-2 h-2 rounded-full bg-white shadow-sm" />
                                                    )}
                                                </div>
                                            </div>
                                            <span className={`text-sm transition-colors ${formData.material_type === opt ? 'text-blue-700 font-bold' : 'text-gray-600'}`}>
                                                {opt}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Picture Upload Section */}
                            <div className="bg-white p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-blue-400 transition-colors">
                                <label className="text-sm font-semibold text-gray-700 block mb-3 flex items-center gap-2">
                                    <Upload className="w-4 h-4 text-blue-600" />
                                    Ramming Mass Bag Picture (रैमिंग मास बैग फोटो)
                                </label>
                                <div className="flex flex-col items-center">
                                    {imgPreview ? (
                                        <div className="relative w-full max-w-sm rounded-lg overflow-hidden border shadow-lg">
                                            <img src={imgPreview} alt="Preview" className="w-full h-48 object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => { setImgPreview(null); setFormData(p => ({ ...p, rm_bag_pic: null })) }}
                                                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current.click()}
                                            className="flex flex-col items-center gap-2 py-4"
                                        >
                                            <div className="p-3 bg-blue-50 rounded-full">
                                                <Upload className="w-6 h-6 text-blue-600" />
                                            </div>
                                            <span className="text-sm text-gray-500 font-medium">Click to upload photo</span>
                                        </button>
                                    )}
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        className="hidden"
                                        accept="image/*"
                                    />
                                </div>
                            </div>

                            {/* Timing Section */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label htmlFor="patching_start_time" className="text-sm font-semibold text-gray-700 flex items-center gap-2 cursor-pointer">
                                        <Clock className="w-4 h-4 text-blue-600" />
                                        Starting Time (शुरू होने का समय) *
                                    </label>
                                    <input
                                        id="patching_start_time"
                                        type="time"
                                        name="patching_start_time"
                                        value={formData.patching_start_time}
                                        onChange={handleInputChange}
                                        onClick={(e) => e.target.showPicker?.()}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all cursor-pointer"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="patching_end_time" className="text-sm font-semibold text-gray-700 flex items-center gap-2 cursor-pointer">
                                        <Clock className="w-4 h-4 text-blue-600" />
                                        Ending Time (समाप्त होने का समय) *
                                    </label>
                                    <input
                                        id="patching_end_time"
                                        type="time"
                                        name="patching_end_time"
                                        value={formData.patching_end_time}
                                        onChange={handleInputChange}
                                        onClick={(e) => e.target.showPicker?.()}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all cursor-pointer"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Checklist Points */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-gray-800 border-b pb-2 flex items-center gap-2 uppercase tracking-wide">
                                    <Check className="w-5 h-5 text-green-600" />
                                    Points to Check
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {checklistPoints.map(point => (
                                        <div key={point.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                            <p className="text-xs font-bold text-gray-500 mb-1 uppercase tracking-tighter">
                                                {point.label}
                                            </p>
                                            <p className="text-sm text-blue-800 font-medium mb-3">
                                                {point.hindi}
                                            </p>
                                            <div className="flex gap-2">
                                                {['Yes', 'No'].map(val => (
                                                    <button
                                                        key={val}
                                                        type="button"
                                                        onClick={() => setFormData(p => ({ ...p, [point.id]: val }))}
                                                        className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${formData[point.id] === val
                                                            ? (val === 'Yes' ? 'bg-green-600 text-white' : 'bg-red-600 text-white')
                                                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                                            }`}
                                                    >
                                                        {val === 'Yes' ? 'YES' : 'NO'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Non-Premix Specific Points */}
                            {formData.material_type === 'Non Premix' && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top duration-500">
                                    <h3 className="text-lg font-bold text-orange-700 border-b border-orange-200 pb-2 flex items-center gap-2 uppercase tracking-wide">
                                        <Box className="w-5 h-5" />
                                        Non-Premix Additional Data
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {nonPremixPoints.map(point => (
                                            <div key={point.id} className="bg-orange-50 p-4 rounded-xl border border-orange-200">
                                                <p className="text-xs font-bold text-orange-800 mb-1 uppercase">
                                                    {point.label}
                                                </p>
                                                <p className="text-sm text-gray-700 font-medium mb-3">
                                                    {point.hindi}
                                                </p>
                                                <div className="flex gap-2">
                                                    {['Yes', 'No'].map(val => (
                                                        <button
                                                            key={val}
                                                            type="button"
                                                            onClick={() => setFormData(p => ({ ...p, [point.id]: val }))}
                                                            className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${formData[point.id] === val
                                                                ? (val === 'Yes' ? 'bg-orange-600 text-white' : 'bg-red-600 text-white')
                                                                : 'bg-white text-orange-300 border border-orange-200'
                                                                }`}
                                                        >
                                                            {val === 'Yes' ? 'YES' : 'NO'}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* History Section Details */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Previous Party (पिछली पार्टी) *</label>
                                    <input
                                        type="text"
                                        name="pprm_party"
                                        value={formData.pprm_party}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Previous Life (पिछला जीवन) *</label>
                                    <input
                                        type="number"
                                        name="p_patching_life"
                                        value={formData.p_patching_life}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Checked By (जाँच की गई) *</label>
                                    <input
                                        type="text"
                                        name="checked_by"
                                        value={formData.checked_by}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                                        required
                                    />
                                </div>
                            </div>

                            {message.text && (
                                <div className={`p-4 rounded-lg flex items-center gap-2 font-medium ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {message.type === 'success' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                                    {message.text}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`w-full md:w-auto md:px-12 py-3 rounded-lg text-white font-bold text-base flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg active:scale-95 mx-auto ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900'
                                    }`}
                            >
                                {isSubmitting ? 'SUBMITTING...' : <><Save className="w-5 h-5" /> SUBMIT CHECKLIST</>}
                            </button>
                        </form>
                    </div>
                ) : (
                    /* History Table Section */
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200 animate-in fade-in slide-in-from-bottom duration-500">
                        <div className="bg-gray-800 px-6 py-4 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Clock className="w-5 h-5 text-blue-400" />
                                Patching Records (पैचिंग रिकॉर्ड्स)
                                <span className="flex h-2 w-2 relative ml-1">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                <span className="text-[10px] text-green-400 font-bold uppercase tracking-widest ml-1">Live</span>
                            </h2>
                            <button
                                onClick={() => setShowForm(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all font-bold shadow-lg shadow-blue-500/30 active:scale-95"
                            >
                                <Plus className="w-5 h-5" /> ADD NEW ENTRY
                            </button>
                        </div>
                        {history.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Date</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Furnace</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Party</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Status</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Checked By</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {history.map((record) => (
                                            <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                                    {new Date(record.check_date).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">
                                                    {record.furnace_number} - {record.crucible_number}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600 font-bold">
                                                    {record.rm_party_name}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${record.full_check === 'Yes' || record.full_check === true
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                        {record.material_type}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600 italic">
                                                    {record.checked_by}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-12 text-center">
                                <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Clipboard className="w-8 h-8 text-gray-400" />
                                </div>
                                <p className="text-gray-500 font-medium text-lg">No records found yet.</p>
                                <p className="text-gray-400 text-sm">Click 'Add New Entry' to record your first patching checklist.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

export default PatchingChecklist
