"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../../context/AuthContext"
import { leadToOrderAPI } from "../../services/leadToOrderAPI"
import { Loader2 } from "lucide-react"
import { ArrowRightIcon } from "./Icons"

const INITIAL_FORM_DATA = {
  receiverName: "",
  scName: "",
  source: "",
  companyName: "",
  phoneNumber: "",
  salespersonName: "",
  location: "",
  email: "",
  state: "",
  address: "",
  nob: "",
  notes: ""
}

function Leads() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState(INITIAL_FORM_DATA)
  const [receiverNames, setReceiverNames] = useState([])
  const [scNames, setScNames] = useState([])
  const [leadSources, setLeadSources] = useState([])
  const [companyOptions, setCompanyOptions] = useState([])
  const [companyDetailsMap, setCompanyDetailsMap] = useState({})
  const [nobOptions, setNobOptions] = useState([])
  const [stateOptions, setStateOptions] = useState([])
  const { user } = useAuth()
  const showNotification = (message, type) => {
    // Simple notification - can be enhanced with toast library
    alert(message)
  }

  // // Script URL
  // const scriptUrl = "https://script.google.com/macros/s/AKfycbyLTNpTAVKaVuGH_-GrVNxDOgXqbWiBYzdf8PQWWwIFhLiIz_1lT3qEQkl7BS1osfToGQ/exec"

  // Function to format date as dd/mm/yyyy
  const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  const fetchLeadDropdowns = async () => {
    try {
      // Use the centralized API service
      const response = await leadToOrderAPI.getLeadDropdowns();

      // Check if response data is HTML (string starting with <)
      if (typeof response.data === 'string') {
        const trimmed = response.data.trim();
        if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) {
          return; // Don't process HTML responses
        }
      }

      if (response?.data?.success && response?.data?.data) {
        const d = response.data.data;

        // Remove duplicates and filter out empty values to match original behavior
        const unique = (arr) => [...new Set(arr.filter(Boolean))];

        setReceiverNames(unique(d.receiverNames || []));
        setScNames(unique(d.scNames || []));
        setLeadSources(unique(d.leadSources || []));
        setStateOptions(unique(d.states || []));
        setNobOptions(unique(d.nob || []));

        // SAFE VERSION (NO CRASH)
        const companyList = d.companyList || {};

        setCompanyOptions(Object.keys(companyList));
        setCompanyDetailsMap(companyList);
      }
    } catch (error) {
      // Error fetching dropdowns - fallback to empty arrays
      setReceiverNames([]);
      setScNames([]);
      setLeadSources([]);
      setStateOptions([]);
      setNobOptions([]);
    }
  };



  // Fetch dropdown data when component mounts
  useEffect(() => {
    fetchLeadDropdowns();
    // Removed Google Sheets fetch - using backend API only
    // fetchDropdownData();
    // fetchCompanyData();
  }, []);


  // REMOVED: fetchDropdownData and fetchCompanyData - using backend API instead

  const handleChange = (e) => {
    const { id, value } = e.target
    setFormData(prevData => ({
      ...prevData,
      [id]: value
    }))

    // Auto-fill related fields if company is selected
    if (id === "companyName" && value) {
      const companyDetails = companyDetailsMap[value] || {};

      setFormData(prev => ({
        ...prev,
        companyName: value,
        phoneNumber: companyDetails.phoneNumber || "",
        salespersonName: companyDetails.salesPerson || "",
        location: companyDetails.location || "",
        email: companyDetails.email || ""
      }));
    }

  }

  // REMOVED: generateLeadNumber - lead number generation is handled by backend API

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        receiverName: formData.receiverName,
        scName: formData.scName,
        source: formData.source,
        companyName: formData.companyName,
        phoneNumber: formData.phoneNumber,
        salespersonName: formData.salespersonName,
        location: formData.location,
        email: formData.email,
        state: formData.state,
        address: formData.address,
        nob: formData.nob,
        notes: formData.notes,
      };

      // const response = await fetch("http://localhost:5050/api/leads", {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json",
      //   },
      //   body: JSON.stringify(payload),
      // });

      const response = await leadToOrderAPI.createLead(payload);
      const result = response.data;

      if (result.success) {
        const leadNumber = result.data?.leadNo;
        showNotification(
          `Lead created successfully with Lead Number: ${leadNumber}`,
          "success"
        );

        // Reset form
        setFormData(INITIAL_FORM_DATA);
      } else {
        showNotification(
          "Error creating lead: " + (result.message || "Unknown error"),
          "error"
        );
      }
    } catch (error) {
      showNotification("Error submitting form: " + error.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="min-h-screen bg-slate-50/50 py-6 sm:py-8 lg:py-12 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent tracking-tight">
              Lead Management
            </h1>
            <p className="text-slate-500 mt-1 font-medium text-sm sm:text-base">Quickly register and track new business leads</p>
          </div>
          <div className="bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider hidden sm:block">
            New Lead Form
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-blue-900/5 border border-slate-200 overflow-hidden transition-all">
          <div className="p-6 sm:p-8 border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              </span>
              Lead Information
            </h2>
            <p className="text-sm text-slate-500 mt-1 ml-10">Fill in all required fields to create a new lead reference.</p>
          </div>

          <form onSubmit={handleSubmit} className="divide-y divide-slate-100">
            <div className="p-6 sm:p-8 space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {/* Receiver Name */}
                <div className="space-y-2">
                  <label htmlFor="receiverName" className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">
                    Lead Receiver Name
                  </label>
                  <select
                    id="receiverName"
                    value={formData.receiverName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700"
                    required
                  >
                    <option value="">Select receiver</option>
                    {receiverNames.map((name, index) => (
                      <option key={index} value={name}>{name}</option>
                    ))}
                  </select>
                </div>

                {/* SC Name */}
                <div className="space-y-2">
                  <label htmlFor="scName" className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">
                    SC Name
                  </label>
                  <select
                    id="scName"
                    value={formData.scName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700"
                    required
                  >
                    <option value="">Select SC Name</option>
                    {scNames.map((name, index) => (
                      <option key={index} value={name}>{name}</option>
                    ))}
                  </select>
                </div>

                {/* Lead Source */}
                <div className="space-y-2">
                  <label htmlFor="source" className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">
                    Lead Source
                  </label>
                  <select
                    id="source"
                    value={formData.source}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700"
                    required
                  >
                    <option value="">Select source</option>
                    {leadSources.map((source, index) => (
                      <option key={index} value={source}>{source}</option>
                    ))}
                  </select>
                </div>

                {/* Company Name */}
                <div className="space-y-2">
                  <label htmlFor="companyName" className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">
                    Company Name
                  </label>
                  <div className="relative">
                    <input
                      list="companyOptions"
                      id="companyName"
                      value={formData.companyName}
                      onChange={handleChange}
                      placeholder="Type or select company..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-slate-900"
                      required
                    />
                    <datalist id="companyOptions">
                      {companyOptions.map((company, index) => (
                        <option key={index} value={company} />
                      ))}
                    </datalist>
                  </div>
                </div>

                {/* Phone Number */}
                <div className="space-y-2">
                  <label htmlFor="phoneNumber" className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">
                    Phone Number
                  </label>
                  <input
                    id="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700"
                    placeholder="Enter phone number"
                  />
                </div>

                {/* Contact Person */}
                <div className="space-y-2">
                  <label htmlFor="salespersonName" className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">
                    Contact Person
                  </label>
                  <input
                    id="salespersonName"
                    value={formData.salespersonName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700"
                    placeholder="Auto-fills from company"
                  />
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <label htmlFor="location" className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">
                    Location
                  </label>
                  <input
                    id="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700"
                    placeholder="Auto-fills from company"
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label htmlFor="email" className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700"
                    placeholder="Auto-fills from company"
                  />
                </div>

                {/* State */}
                <div className="space-y-2">
                  <label htmlFor="state" className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">
                    State
                  </label>
                  <select
                    id="state"
                    value={formData.state}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700"
                  >
                    <option value="">Select state</option>
                    {stateOptions.map((state, index) => (
                      <option key={index} value={state}>{state}</option>
                    ))}
                  </select>
                </div>

                {/* NOB */}
                <div className="space-y-2">
                  <label htmlFor="nob" className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">
                    Nature of Business (NOB)
                  </label>
                  <input
                    list="nob-options"
                    id="nob"
                    name="nob"
                    value={formData.nob}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700"
                    placeholder="Select or type NOB"
                  />
                  <datalist id="nob-options">
                    {nobOptions.map((option, index) => (
                      <option key={index} value={option} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 pt-4">
                {/* Address */}
                <div className="space-y-2">
                  <label htmlFor="address" className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">
                    Address
                  </label>
                  <textarea
                    id="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700 min-h-[100px]"
                    placeholder="Enter complete address details"
                    rows="3"
                  />
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <label htmlFor="notes" className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">
                    Additional Notes
                  </label>
                  <textarea
                    id="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700 min-h-[100px]"
                    placeholder="Any specific instructions or remarks"
                    rows="3"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8 bg-slate-50 flex flex-col sm:flex-row justify-end items-center gap-4">
              <button
                type="button"
                onClick={() => setFormData(INITIAL_FORM_DATA)}
                className="w-full sm:w-auto px-8 py-3 text-slate-500 font-bold hover:text-slate-700 transition-colors"
              >
                Reset Form
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-10 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black rounded-xl shadow-lg shadow-blue-200 transition-all transform active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <span>Save Lead</span>
                    <ArrowRightIcon className="w-4 h-4 ml-1" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Leads
