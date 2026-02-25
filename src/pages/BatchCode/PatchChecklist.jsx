import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ClipboardCheck, History, Save } from "lucide-react";
import * as batchcodeAPI from "../../api/batchcodeApi";
import {
  PageContainer,
  PageHeader,
  SectionCard,
  SearchField,
  ImagePreviewModal,
  StatusModal,
  ResponsiveDataTable,
  inputClass,
  selectClass,
  primaryButtonClass,
  secondaryButtonClass,
  labelClass
} from "../../components/batchcode/PagePrimitives";
import { formatDateTime, matchesSearch, normalizeApiRows, normalizeMediaUrl, valueOrDash } from "../../components/batchcode/dataUtils";

const furnaceOptions = ["", "F1", "F2", "F3", "F4", "F5", "F6", "F7"];
const crucibleOptions = ["", "1", "2"];
const partyOptions = ["", "RKPL", "S&B", "GURAVE", "Other"];
const materialOptions = ["", "Premix", "Non Premix"];

const REQUIRED_CHECKS = [
  { key: "fc_breaking_check", label: "FC Breaking" },
  { key: "lining_check", label: "Lining" },
  { key: "gld_check", label: "GLD" },
  { key: "premix_check", label: "Premix" },
  { key: "bottom_check", label: "Bottom" },
  { key: "full_check", label: "Full" },
  { key: "nali_top_dry_check", label: "Nali Top Dry" }
];

const OPTIONAL_NON_PREMIX_CHECKS = [
  { key: "weight_check", label: "Weight Check" },
  { key: "proper_weight_per_check", label: "Proper Weight %" },
  { key: "mix_check", label: "Mix Check" }
];

const INITIAL_FORM = {
  check_date: "",
  furnace_number: "",
  crucible_number: "",
  rm_party_name: "",
  rm_party_other: "",
  material_type: "",
  rm_bag_pic: null,
  patching_start_time: "",
  patching_end_time: "",
  fc_breaking_check: "",
  lining_check: "",
  gld_check: "",
  premix_check: "",
  bottom_check: "",
  full_check: "",
  nali_top_dry_check: "",
  weight_check: "",
  proper_weight_per_check: "",
  mix_check: "",
  checked_by: "",
  pprm_party: "",
  p_patching_life: ""
};

const countPositiveChecks = (row) =>
  REQUIRED_CHECKS.reduce((count, item) => {
    const value = String(row[item.key] ?? "").toLowerCase();
    return value === "yes" || value === "true" ? count + 1 : count;
  }, 0);

function PatchChecklist() {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [showHistory, setShowHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [historyRows, setHistoryRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [popup, setPopup] = useState({ open: false, type: "success", message: "", code: "" });
  const [mediaPreview, setMediaPreview] = useState({ open: false, url: "" });
  const checkDateInputRef = useRef(null);
  const patchStartTimeInputRef = useRef(null);
  const patchEndTimeInputRef = useRef(null);

  const openNativePicker = useCallback((inputRef) => {
    const input = inputRef.current;
    if (!input) {
      return;
    }

    input.focus();

    if (typeof input.showPicker === "function") {
      try {
        input.showPicker();
      } catch {
        // Some browsers block programmatic picker calls in specific contexts.
      }
    }
  }, []);

  const closePopup = useCallback(() => {
    setPopup({ open: false, type: "success", message: "", code: "" });
  }, []);

  const openMediaPreview = useCallback((url) => {
    const safeUrl = normalizeMediaUrl(url);
    if (!safeUrl) {
      return;
    }
    setMediaPreview({ open: true, url: safeUrl });
  }, []);

  const closeMediaPreview = useCallback(() => {
    setMediaPreview({ open: false, url: "" });
  }, []);

  useEffect(() => {
    if (popup.open && popup.type === "warning") {
      const timer = setTimeout(() => closePopup(), 2000);
      return () => clearTimeout(timer);
    }
  }, [popup, closePopup]);

  useEffect(
    () => () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    },
    [previewUrl]
  );

  const fetchHistory = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }

    try {
      const response = await batchcodeAPI.getPatchingChecklists();
      setHistoryRows(normalizeApiRows(response));
    } catch (error) {
      if (!silent) {
        setPopup({ open: true, type: "warning", message: "Failed to load patch checklist history.", code: "" });
      }
      console.error("Failed to fetch patch checklist history", error);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!showHistory) {
      return undefined;
    }

    fetchHistory();
    const timer = setInterval(() => fetchHistory(true), 12000);
    return () => clearInterval(timer);
  }, [showHistory, fetchHistory]);

  const filteredRows = useMemo(
    () => historyRows.filter((row) => matchesSearch(row, searchTerm)),
    [historyRows, searchTerm]
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      rm_party_other: name === "rm_party_name" && value !== "Other" ? "" : prev.rm_party_other
    }));
  };

  const handlePickerValueChange = (event) => {
    handleChange(event);
    if (typeof event.target.blur === "function") {
      event.target.blur();
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl(URL.createObjectURL(file));
    setFormData((prev) => ({ ...prev, rm_bag_pic: file }));
  };

  const clearImage = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl("");
    setFormData((prev) => ({ ...prev, rm_bag_pic: null }));
  };

  const validate = () => {
    const requiredFields = [
      "furnace_number",
      "crucible_number",
      "rm_party_name",
      "material_type",
      "patching_start_time",
      "patching_end_time",
      "checked_by",
      "pprm_party",
      "p_patching_life"
    ];

    const missing = requiredFields.filter((field) => !String(formData[field] || "").trim());
    if (missing.length) {
      setPopup({ open: true, type: "warning", message: "Please fill all required fields.", code: "" });
      return false;
    }

    if (formData.rm_party_name === "Other" && !formData.rm_party_other.trim()) {
      setPopup({ open: true, type: "warning", message: "Specify Ramming Mass party.", code: "" });
      return false;
    }

    const missingChecks = REQUIRED_CHECKS.some((check) => !String(formData[check.key] || "").trim());
    if (missingChecks) {
      setPopup({ open: true, type: "warning", message: "Please complete all required checks.", code: "" });
      return false;
    }

    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = new FormData();

      Object.entries(formData).forEach(([key, value]) => {
        if (key === "rm_party_other" || key === "rm_bag_pic") {
          return;
        }

        if (key === "rm_party_name" && value === "Other") {
          payload.append("rm_party_name", formData.rm_party_other.trim());
          return;
        }

        payload.append(key, value ?? "");
      });

      if (formData.rm_bag_pic) {
        payload.append("picture", formData.rm_bag_pic);
      }

      const response = await batchcodeAPI.submitPatchingChecklist(payload);
      if (!response?.data?.success) {
        throw new Error("Failed to submit patch checklist");
      }

      const saved = response?.data?.data || {};
      setPopup({ open: true, type: "success", message: "Patch checklist submitted.", code: saved.unique_code || "" });

      setFormData(INITIAL_FORM);
      clearImage();
      if (showHistory) {
        fetchHistory(true);
      }
    } catch (error) {
      console.error("Failed to submit patch checklist", error);
      setPopup({ open: true, type: "warning", message: "Failed to submit patch checklist.", code: "" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const mediaCell = useCallback((url) => {
    const safeUrl = normalizeMediaUrl(url);
    return safeUrl ? (
      <button
        type="button"
        onClick={() => openMediaPreview(safeUrl)}
        className="inline-flex h-8 items-center rounded-md border border-red-300 bg-red-50 px-2 text-xs text-red-700"
      >
        View
      </button>
    ) : (
      "-"
    );
  }, [openMediaPreview]);

  const columns = useMemo(
    () => [
      { label: "Code", render: (row) => `#${valueOrDash(row.unique_code)}` },
      { label: "Date", render: (row) => formatDateTime(row.check_date || row.created_at) },
      {
        label: "Furnace",
        render: (row) => `${valueOrDash(row.furnace_number)} / C${valueOrDash(row.crucible_number)}`
      },
      {
        label: "Material",
        render: (row) => `${valueOrDash(row.rm_party_name)} / ${valueOrDash(row.material_type)}`
      },
      {
        label: "Checks",
        render: (row) => `${countPositiveChecks(row)}/${REQUIRED_CHECKS.length} Yes`
      },
      { label: "Checked By", key: "checked_by" },
      { label: "Media", render: (row) => mediaCell(row.rm_bag_pic) }
    ],
    [mediaCell]
  );

  return (
    <>
      <StatusModal
        open={popup.open}
        type={popup.type}
        message={popup.message}
        code={popup.code}
        onClose={closePopup}
      />
      <ImagePreviewModal
        open={mediaPreview.open}
        imageUrl={mediaPreview.url}
        title="Patch Checklist Image"
        onClose={closeMediaPreview}
      />

      <PageContainer>
        <PageHeader
          title="Patch Checklist"
          subtitle={showHistory ? "Submitted patch checklist records" : "Create a patch checklist entry"}
          icon={ClipboardCheck}
          actions={
            <>
              {showHistory ? (
                <SearchField
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Search patch checklist records"
                />
              ) : null}

              <button
                type="button"
                onClick={() => {
                  setShowHistory((prev) => !prev);
                  setSearchTerm("");
                }}
                className={`${secondaryButtonClass} ${showHistory ? "w-auto" : "w-full sm:w-auto"}`}
              >
                {showHistory ? <ArrowLeft size={14} /> : <History size={14} />}
                {showHistory ? "Back to Form" : "View History"}
              </button>
            </>
          }
        />

        {!showHistory ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <SectionCard>
              <h2 className="text-sm font-semibold text-slate-900">General Information</h2>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className={labelClass}>Check Date</label>
                  <input
                    ref={checkDateInputRef}
                    type="date"
                    name="check_date"
                    value={formData.check_date}
                    onChange={handlePickerValueChange}
                    onClick={() => openNativePicker(checkDateInputRef)}
                    onFocus={() => openNativePicker(checkDateInputRef)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Furnace *</label>
                  <select name="furnace_number" value={formData.furnace_number} onChange={handleChange} className={selectClass}>
                    {furnaceOptions.map((option) => (
                      <option key={option || "blank"} value={option}>
                        {option || "Select Furnace"}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Crucible *</label>
                  <select name="crucible_number" value={formData.crucible_number} onChange={handleChange} className={selectClass}>
                    {crucibleOptions.map((option) => (
                      <option key={option || "blank"} value={option}>
                        {option || "Select Crucible"}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Ramming Mass Party *</label>
                  <select name="rm_party_name" value={formData.rm_party_name} onChange={handleChange} className={selectClass}>
                    {partyOptions.map((option) => (
                      <option key={option || "blank"} value={option}>
                        {option || "Select Party"}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.rm_party_name === "Other" ? (
                  <div>
                    <label className={labelClass}>Party Name *</label>
                    <input
                      name="rm_party_other"
                      value={formData.rm_party_other}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </div>
                ) : null}

                <div>
                  <label className={labelClass}>Material Type *</label>
                  <select name="material_type" value={formData.material_type} onChange={handleChange} className={selectClass}>
                    {materialOptions.map((option) => (
                      <option key={option || "blank"} value={option}>
                        {option || "Select Material"}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Start Time *</label>
                  <input
                    ref={patchStartTimeInputRef}
                    type="time"
                    name="patching_start_time"
                    value={formData.patching_start_time}
                    onChange={handlePickerValueChange}
                    onClick={() => openNativePicker(patchStartTimeInputRef)}
                    onFocus={() => openNativePicker(patchStartTimeInputRef)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>End Time *</label>
                  <input
                    ref={patchEndTimeInputRef}
                    type="time"
                    name="patching_end_time"
                    value={formData.patching_end_time}
                    onChange={handlePickerValueChange}
                    onClick={() => openNativePicker(patchEndTimeInputRef)}
                    onFocus={() => openNativePicker(patchEndTimeInputRef)}
                    className={inputClass}
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard>
              <h2 className="text-sm font-semibold text-slate-900">Required Checks</h2>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                {REQUIRED_CHECKS.map((check) => (
                  <div key={check.key}>
                    <label className={labelClass}>{check.label} *</label>
                    <select name={check.key} value={formData[check.key]} onChange={handleChange} className={selectClass}>
                      <option value="">Select</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard>
              <h2 className="text-sm font-semibold text-slate-900">Non-Premix Additional Checks</h2>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                {OPTIONAL_NON_PREMIX_CHECKS.map((check) => (
                  <div key={check.key}>
                    <label className={labelClass}>{check.label}</label>
                    <select name={check.key} value={formData[check.key]} onChange={handleChange} className={selectClass}>
                      <option value="">Select</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard>
              <h2 className="text-sm font-semibold text-slate-900">Accountability and Image</h2>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className={labelClass}>Checked By *</label>
                  <input name="checked_by" value={formData.checked_by} onChange={handleChange} className={inputClass} />
                </div>

                <div>
                  <label className={labelClass}>Previous Party *</label>
                  <input name="pprm_party" value={formData.pprm_party} onChange={handleChange} className={inputClass} />
                </div>

                <div>
                  <label className={labelClass}>Previous Life *</label>
                  <input
                    type="number"
                    name="p_patching_life"
                    value={formData.p_patching_life}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>

                <div className="md:col-span-2 lg:col-span-3 space-y-2">
                  <label className={labelClass}>Ramming Bag Picture</label>
                  {previewUrl ? (
                    <div className="space-y-2">
                      <img src={previewUrl} alt="Patch preview" className="w-full rounded-md border border-slate-200 object-cover max-h-52" />
                      <button type="button" onClick={clearImage} className={secondaryButtonClass}>
                        Remove Image
                      </button>
                    </div>
                  ) : (
                    <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-600">
                      Upload image
                      <input type="file" accept="image/*" className="sr-only" onChange={handleFileChange} />
                    </label>
                  )}
                </div>
              </div>
            </SectionCard>

            <div className="flex justify-end">
              <button type="submit" disabled={isSubmitting} className={primaryButtonClass}>
                <Save size={14} />
                {isSubmitting ? "Submitting..." : "Submit Checklist"}
              </button>
            </div>
          </form>
        ) : (
          <SectionCard>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">History</h2>
              <span className="text-xs text-slate-600">Total: {filteredRows.length}</span>
            </div>

            <ResponsiveDataTable
              rows={filteredRows}
              columns={columns}
              getRowKey={(row, index) => row.id || row.unique_code || `patch-${index}`}
              loading={loading}
              loadingMessage="Loading patch checklist history..."
              emptyMessage="No patch checklist records found."
            />
          </SectionCard>
        )}
      </PageContainer>
    </>
  );
}

export default PatchChecklist;
