"use client"

import { useState, useEffect, useRef } from "react"
import api, { API_ENDPOINTS } from "../../config/api"

const CallTrackerForm = ({ onClose = () => window.history.back() }) => {
  const [leadSources, setLeadSources] = useState([])
  const [enquiryApproachOptions, setEnquiryApproachOptions] = useState([])
  const [receiverOptions, setReceiverOptions] = useState([])
  const [scNames, setScNames] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [itemNameOptions, setItemNameOptions] = useState([])
  const [companyOptions, setCompanyOptions] = useState([]);
  const [locationOptions, setLocationOptions] = useState([]);
  // const [companyLocationMap, setCompanyLocationMap] = useState({}); // 👈 mapping ke liye
  const [manualCompany, setManualCompany] = useState(""); // manual input ke liye
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const locationDropdownRef = useRef(null);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [directCompanyDetails, setDirectCompanyDetails] = useState({});
  const companyDropdownRef = useRef(null);
  const [formData, setFormData] = useState({
    scName: "",
    leadSource: "",
    companyName: "",
    phoneNumber: "",
    salesPersonName: "",
    location: "",
    emailAddress: "",
    enquiryReceiverName: "",
    enquiryDate: "",
    enquiryApproach: ""
  })

  const [items, setItems] = useState([{ id: "1", name: "", quantity: "" }])

  // Fetch dropdown data when component mounts
  useEffect(() => {
    fetchDropdownData()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target)) {
        setShowLocationDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (companyDropdownRef.current && !companyDropdownRef.current.contains(event.target)) {
        setShowCompanyDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const filteredCompanies = companyOptions.filter(company =>
    company.toLowerCase().includes(formData.companyName.toLowerCase())
  );

  const addNewLocationToSheet = async (locationName) => {
    try {
      // Prepare row data for DROPDOWN sheet - location goes in column 55 (index 54)
      const rowData = Array(55).fill(""); // Create empty array for 55 columns
      rowData[54] = locationName.trim(); // Set location in column 55 (index 54)

      const scriptUrl = "https://script.google.com/macros/s/AKfycbyLTNpTAVKaVuGH_-GrVNxDOgXqbWiBYzdf8PQWWwIFhLiIz_1lT3qEQkl7BS1osfToGQ/exec"

      const params = {
        sheetName: "DROPDOWN",
        action: "insert",
        rowData: JSON.stringify(rowData)
      }

      const urlParams = new URLSearchParams()
      for (const key in params) {
        urlParams.append(key, params[key])
      }

      const response = await fetch(scriptUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: urlParams
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || "Failed to add location")
      }

      await fetchDropdownData(); // Refresh the dropdown options
      return true;
    } catch (error) {
      console.error("Error adding location:", error);
      alert(`Failed to add location: ${error.message}`);
      return false;
    }
  };

  const handleAddNewLocation = async () => {
    if (formData.location && formData.location.trim() !== "" &&
      !locationOptions.includes(formData.location.trim())) {
      setIsAddingLocation(true);
      const success = await addNewLocationToSheet(formData.location.trim());
      if (success) {
        // Refresh location options and keep the selected value
        await fetchDropdownData();
        setFormData(prev => ({ ...prev, location: formData.location.trim() }));
        alert(`Location "${formData.location.trim()}" added successfully!`);
      }
      setIsAddingLocation(false);
    }
  };

  // Function to fetch dropdown data from DROPDOWN sheet
  const fetchDropdownData = async () => {
    try {
      // const res = await fetch("http://localhost:3006/api/lead-to-order/enquiry-to-order/dropdowns");
      // const res = await fetch(`${baseURL}/api/lead-to-order/enquiry-to-order/dropdowns`);
      const res = await api.get(API_ENDPOINTS.LEAD_TO_ORDER.ENQUIRY_TO_ORDER.DROPDOWNS);
      const json = res.data;

      if (!json.success) return;

      const data = json.data;

      setLeadSources(data.leadSources);
      setEnquiryApproachOptions(data.enquiryApproaches);
      setScNames(data.scNames);
      setReceiverOptions(data.receiverNames);
      setCompanyOptions(data.directCompanyNames);

      setItemNameOptions(data.itemNames);

      // ⭐ ADD THIS LINE HERE
      setDirectCompanyDetails(data.directCompanyDetails);
      setLocationOptions(data.locations);

    } catch (error) {
      console.error("Dropdown fetch error:", error);
    }
  };






  // Function to handle adding a new item
  const addItem = () => {
    const newId = (items.length + 1).toString()
    setItems([...items, { id: newId, name: "", quantity: "" }])
  }

  // Function to handle removing an item
  const removeItem = (id) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id))
    }
  }

  // Function to update an item
  const updateItem = (id, field, value) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }


  const formatDateToDDMMYYYY = (dateValue) => {
    if (!dateValue) return ""

    try {
      const date = new Date(dateValue)
      if (!isNaN(date.getTime())) {
        return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()}`
      }
      return dateValue
    } catch (error) {
      console.error("Error formatting date:", error)
      return dateValue // Return the original value if formatting fails
    }
  }

  // Function to handle form submission
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        scName: formData.scName,
        leadSource: formData.leadSource,
        companyName: formData.companyName,
        phoneNumber: formData.phoneNumber,
        salesPersonName: formData.salesPersonName,
        location: formData.location,
        emailAddress: formData.emailAddress,
        enquiryReceiverName: formData.enquiryReceiverName,
        enquiryDate: formData.enquiryDate,
        enquiryApproach: formData.enquiryApproach,
        items
      };

      const res = await api.post(API_ENDPOINTS.LEAD_TO_ORDER.ENQUIRY_TO_ORDER.SUBMIT, payload);

      const json = res.data;

      if (json.success) {
        alert("Saved Successfully!");
        onClose();
      } else {
        alert("Error: " + json.error);
      }

    } catch (error) {
      alert("Submit failed: " + error.message);
    }

    setIsSubmitting(false);
  };


  return (
    <div className="w-full bg-white">
      {/* Header for when it's not in a modal or needs its own header */}
      <div className="p-4 sm:p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
            </span>
            New Call Entry
          </h2>
          <p className="text-sm text-slate-500 mt-1 font-medium">Record and track new customer enquiries</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 h-10 w-10 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all sm:hidden"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="p-4 sm:p-8 space-y-10">
        {/* Core Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* SC Name */}
          <div className="space-y-2">
            <label htmlFor="scName" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
              SC Name <span className="text-red-500">*</span>
            </label>
            <select
              id="scName"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-slate-700 hover:bg-white"
              value={formData.scName}
              onChange={(e) => setFormData({ ...formData, scName: e.target.value })}
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
            <label htmlFor="leadSource" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
              Lead Source <span className="text-red-500">*</span>
            </label>
            <select
              id="leadSource"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-slate-700 hover:bg-white"
              value={formData.leadSource}
              onChange={(e) => setFormData({ ...formData, leadSource: e.target.value })}
              required
            >
              <option value="">Select source</option>
              {leadSources.map((source, index) => (
                <option key={index} value={source}>{source}</option>
              ))}
            </select>
          </div>

          {/* Company Name */}
          <div className="space-y-2 relative" ref={companyDropdownRef}>
            <label htmlFor="companyName" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
              Company Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="companyName"
                type="text"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-900 hover:bg-white"
                value={formData.companyName}
                onChange={(e) => {
                  const selectedCompany = e.target.value;
                  const details = directCompanyDetails[selectedCompany] || {};
                  setFormData({
                    ...formData,
                    companyName: selectedCompany,
                    phoneNumber: details.phone || "",
                    salesPersonName: details.contactPerson || "",
                    location: details.billingAddress || "",
                  });
                  setShowCompanyDropdown(true);
                }}
                onFocus={() => setShowCompanyDropdown(true)}
                placeholder="Type or select company"
                required
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
              {showCompanyDropdown && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[250px] overflow-y-auto custom-scrollbar">
                  {filteredCompanies.map((company, index) => (
                    <div
                      key={index}
                      onClick={() => {
                        const details = directCompanyDetails[company] || {};
                        setFormData({
                          ...formData,
                          companyName: company,
                          phoneNumber: details.phone || "",
                          salesPersonName: details.contactPerson || "",
                          location: details.billingAddress || "",
                        });
                        setShowCompanyDropdown(false);
                      }}
                      className="px-4 py-3 hover:bg-indigo-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors"
                    >
                      <div className="font-bold text-slate-900 text-sm">{company}</div>
                      <div className="text-[10px] text-slate-400 font-medium tracking-wider uppercase mt-0.5">Existing Client</div>
                    </div>
                  ))}
                  {filteredCompanies.length === 0 && (
                    <div className="px-4 py-6 text-center text-slate-400 text-xs italic bg-slate-50">No matches found</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Phone Number */}
          <div className="space-y-2">
            <label htmlFor="phoneNumber" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              id="phoneNumber"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-slate-700"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              placeholder="e.g. +91 98765 43210"
              required
            />
          </div>

          {/* Contact Person */}
          <div className="space-y-2">
            <label htmlFor="salesPersonName" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
              Contact Person <span className="text-red-500">*</span>
            </label>
            <input
              id="salesPersonName"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-slate-700"
              value={formData.salesPersonName}
              onChange={(e) => setFormData({ ...formData, salesPersonName: e.target.value })}
              placeholder="Full name"
              required
            />
          </div>

          {/* Location */}
          <div className="space-y-2 relative" ref={locationDropdownRef}>
            <label htmlFor="location" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
              Location <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="location"
                type="text"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-slate-700"
                value={formData.location}
                onChange={(e) => {
                  setFormData({ ...formData, location: e.target.value });
                  setShowLocationDropdown(true);
                }}
                onFocus={() => setShowLocationDropdown(true)}
                placeholder="City/Region"
                required
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              {showLocationDropdown && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[250px] overflow-y-auto custom-scrollbar">
                  {locationOptions.filter(loc => loc.toLowerCase().includes(formData.location.toLowerCase())).map((loc, index) => (
                    <div
                      key={index}
                      onClick={() => {
                        setFormData({ ...formData, location: loc });
                        setShowLocationDropdown(false);
                      }}
                      className="px-4 py-3 hover:bg-indigo-50 cursor-pointer border-b border-slate-50 last:border-0 text-sm font-medium text-slate-700"
                    >
                      {loc}
                    </div>
                  ))}
                  {formData.location && !locationOptions.includes(formData.location) && (
                    <button
                      type="button"
                      onClick={handleAddNewLocation}
                      className="w-full px-4 py-3 text-left hover:bg-blue-50 cursor-pointer border-t border-slate-100 text-blue-600 flex items-center gap-2 group transition-colors"
                    >
                      <span className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all text-sm font-bold">+</span>
                      <div>
                        <div className="text-sm font-bold">Add "{formData.location.trim()}"</div>
                        <div className="text-[10px] text-blue-500 font-medium tracking-wider uppercase">New Location Entry</div>
                      </div>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label htmlFor="emailAddress" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
              Email Address
            </label>
            <input
              id="emailAddress"
              type="email"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-slate-700"
              value={formData.emailAddress}
              onChange={(e) => setFormData({ ...formData, emailAddress: e.target.value })}
              placeholder="customer@email.com"
            />
          </div>

          {/* Receiver Name */}
          <div className="space-y-2">
            <label htmlFor="enquiryReceiverName" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
              Receiver Name
            </label>
            <select
              id="enquiryReceiverName"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-slate-700"
              value={formData.enquiryReceiverName}
              onChange={(e) => setFormData({ ...formData, enquiryReceiverName: e.target.value })}
            >
              <option value="">Select receiver</option>
              {receiverOptions.map((receiver, index) => (
                <option key={index} value={receiver}>{receiver}</option>
              ))}
            </select>
          </div>

          {/* Enquiry Date */}
          <div className="space-y-2">
            <label htmlFor="enquiryDate" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
              Enquiry Date <span className="text-red-500">*</span>
            </label>
            <input
              id="enquiryDate"
              type="date"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-indigo-900"
              value={formData.enquiryDate}
              onChange={(e) => setFormData({ ...formData, enquiryDate: e.target.value })}
              required
            />
          </div>

          {/* Enquiry Approach */}
          <div className="space-y-2 lg:col-span-1">
            <label htmlFor="enquiryApproach" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
              Enquiry Approach <span className="text-red-500">*</span>
            </label>
            <select
              id="enquiryApproach"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-slate-700"
              value={formData.enquiryApproach}
              onChange={(e) => setFormData({ ...formData, enquiryApproach: e.target.value })}
              required
            >
              <option value="">Select approach</option>
              {enquiryApproachOptions.map((approach, index) => (
                <option key={index} value={approach}>{approach}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Items Section */}
        <div className="p-6 sm:p-8 bg-slate-50 rounded-2xl border border-slate-200 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h4 className="font-black text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-indigo-100 flex items-center justify-center text-indigo-600 text-[10px]">📦</span>
                Requirement Details
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">List the items and quantities requested</p>
            </div>
            <button
              type="button"
              onClick={addItem}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-widest rounded-lg shadow-lg shadow-indigo-200 transition-all transform active:scale-95 flex items-center gap-2"
            >
              <span>+</span>
              <span>Add Another Item</span>
            </button>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start p-4 bg-white rounded-xl border border-slate-200 shadow-sm relative group animate-in slide-in-from-right duration-200" style={{ animationDelay: `${index * 50}ms` }}>
                <div className="md:col-span-1 flex items-center justify-center pt-3">
                  <span className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-xs font-black text-slate-400">
                    {index + 1}
                  </span>
                </div>
                <div className="md:col-span-6 space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Item Description</label>
                  <div className="relative">
                    <input
                      list={`itemNameList-${item.id}`}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-lg focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-slate-700"
                      value={item.name}
                      onChange={(e) => updateItem(item.id, "name", e.target.value)}
                      placeholder="e.g. MS Pipe 40mm"
                      required
                    />
                    <datalist id={`itemNameList-${item.id}`}>
                      {itemNameOptions.map((itemName, idx) => (
                        <option key={idx} value={itemName} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="md:col-span-4 space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Quantity</label>
                  <input
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-lg focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-indigo-600"
                    placeholder="e.g. 500 Meters"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, "quantity", e.target.value)}
                    required
                  />
                </div>

                <div className="md:col-span-1 flex items-center justify-center pt-5">
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    disabled={items.length === 1}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-30 disabled:hover:bg-transparent"
                    title="Remove item"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pb-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-8 py-3 text-slate-500 font-bold hover:text-slate-800 transition-colors"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-12 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-black uppercase tracking-widest rounded-xl shadow-xl shadow-indigo-200 transition-all transform active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>Save Entry</span>
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CallTrackerForm
