import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ClipboardPlus, History, Save } from "lucide-react";
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
  textareaClass,
  primaryButtonClass,
  secondaryButtonClass,
  labelClass
} from "../../components/batchcode/PagePrimitives";
import { formatDateTime, matchesSearch, normalizeApiRows, normalizeMediaUrl, valueOrDash } from "../../components/batchcode/dataUtils";

const INITIAL_FORM = {
  sequence_number: "",
  laddle_number: "",
  furnace_number: "",
  melter_name: "",
  temperature: "",
  shift_incharge: "",
  sms_head: "",
  remarks: ""
};

const sequenceOptions = ["", "A", "B", "C", "D", "E", "F", "G", "H"];
const laddleOptions = ["", ...Array.from({ length: 15 }, (_, index) => String(index + 1))];
const furnaceOptions = ["", "Furnace1", "Furnace2", "Furnace3", "Furnace4", "Furnace5", "Furnace6", "Furnace7"];
const shiftInchargeOptions = [
  "Akhilesh",
  "Prakash Kumar",
  "Hardhan Mandal",
  "Sukhan Vishwakarma",
  "Ashwani Verma",
  "Deepak Gupta",
  "Pramod Thakur",
  "Parsuram Jain",
  "Jaspal Kurrey"
];
const smsHeadOptions = ["", "V M Gupta", "Baldev Singh Saini"];

function SMSRegister() {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [historyRows, setHistoryRows] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [popup, setPopup] = useState({ open: false, type: "success", message: "", code: "" });
  const [mediaPreview, setMediaPreview] = useState({ open: false, url: "" });

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
    const username = sessionStorage.getItem("username") || "";
    if (username) {
      setFormData((prev) => ({ ...prev, shift_incharge: username }));
    }
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
      const response = await batchcodeAPI.getSMSRegisterHistory();
      setHistoryRows(normalizeApiRows(response));
    } catch (error) {
      if (!silent) {
        setPopup({ open: true, type: "warning", message: "Failed to load SMS history.", code: "" });
      }
      console.error("Failed to fetch SMS history", error);
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
    const timer = setInterval(() => fetchHistory(true), 10000);
    return () => clearInterval(timer);
  }, [showHistory, fetchHistory]);

  const filteredRows = useMemo(
    () => historyRows.filter((row) => matchesSearch(row, searchTerm)),
    [historyRows, searchTerm]
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
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

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const clearImage = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl("");
  };

  const validate = () => {
    const nextErrors = {};

    if (!formData.sequence_number) nextErrors.sequence_number = "Required";
    if (!formData.laddle_number) nextErrors.laddle_number = "Required";
    if (!formData.furnace_number) nextErrors.furnace_number = "Required";
    if (!formData.melter_name.trim()) nextErrors.melter_name = "Required";
    if (!formData.temperature) nextErrors.temperature = "Required";
    if (!formData.shift_incharge.trim()) nextErrors.shift_incharge = "Required";
    if (!formData.sms_head) nextErrors.sms_head = "Required";
    if (formData.temperature && Number(formData.temperature) <= 0) nextErrors.temperature = "Invalid";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validate()) {
      setPopup({ open: true, type: "warning", message: "Please fill all required fields.", code: "" });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = new FormData();
      Object.entries(formData).forEach(([key, value]) => payload.append(key, value));
      if (selectedFile) {
        payload.append("picture", selectedFile);
      }

      const response = await batchcodeAPI.submitSMSRegister(payload);
      if (!response?.data?.success) {
        throw new Error("Failed to submit SMS register");
      }

      const saved = response?.data?.data || {};
      setPopup({
        open: true,
        type: "success",
        message: "SMS register submitted.",
        code: saved.unique_code || ""
      });

      const username = sessionStorage.getItem("username") || "";
      setFormData({ ...INITIAL_FORM, shift_incharge: username });
      setErrors({});
      clearImage();

      if (showHistory) {
        fetchHistory(true);
      }
    } catch (error) {
      console.error("Failed to submit SMS register", error);
      setPopup({ open: true, type: "warning", message: "Failed to submit SMS register.", code: "" });
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
      { label: "Time", render: (row) => formatDateTime(row.sample_timestamp || row.created_at || row.createdAt) },
      { label: "Sequence", key: "sequence_number" },
      { label: "Furnace", key: "furnace_number" },
      { label: "Melter", key: "melter_name" },
      { label: "Shift", key: "shift_incharge" },
      { label: "Temp", render: (row) => (row.temperature ? `${row.temperature} C` : "-") },
      { label: "Media", render: (row) => mediaCell(row.picture) }
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
        title="SMS Register Image"
        onClose={closeMediaPreview}
      />

      <PageContainer>
        <PageHeader
          title="SMS Register"
          subtitle={showHistory ? "Submitted SMS records" : "Create a new SMS entry"}
          icon={ClipboardPlus}
          actions={
            <>
              {showHistory ? (
                <SearchField value={searchTerm} onChange={setSearchTerm} placeholder="Search SMS records" />
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
              <h2 className="text-sm font-semibold text-slate-900">Production Details</h2>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className={labelClass}>Sequence *</label>
                  <select
                    name="sequence_number"
                    value={formData.sequence_number}
                    onChange={handleChange}
                    className={`${selectClass} ${errors.sequence_number ? "border-rose-400" : ""}`}
                  >
                    {sequenceOptions.map((option) => (
                      <option key={option || "blank"} value={option}>
                        {option || "Select Sequence"}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Laddle Number *</label>
                  <select
                    name="laddle_number"
                    value={formData.laddle_number}
                    onChange={handleChange}
                    className={`${selectClass} ${errors.laddle_number ? "border-rose-400" : ""}`}
                  >
                    {laddleOptions.map((option) => (
                      <option key={option || "blank"} value={option}>
                        {option || "Select Laddle"}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Furnace *</label>
                  <select
                    name="furnace_number"
                    value={formData.furnace_number}
                    onChange={handleChange}
                    className={`${selectClass} ${errors.furnace_number ? "border-rose-400" : ""}`}
                  >
                    {furnaceOptions.map((option) => (
                      <option key={option || "blank"} value={option}>
                        {option || "Select Furnace"}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Melter Name *</label>
                  <input
                    name="melter_name"
                    value={formData.melter_name}
                    onChange={handleChange}
                    className={`${inputClass} ${errors.melter_name ? "border-rose-400" : ""}`}
                  />
                </div>

                <div>
                  <label className={labelClass}>Temperature *</label>
                  <input
                    type="number"
                    name="temperature"
                    value={formData.temperature}
                    onChange={handleChange}
                    className={`${inputClass} ${errors.temperature ? "border-rose-400" : ""}`}
                  />
                </div>

                <div>
                  <label className={labelClass}>Shift Incharge *</label>
                  <input
                    list="shift_incharge_list"
                    name="shift_incharge"
                    value={formData.shift_incharge}
                    onChange={handleChange}
                    className={`${inputClass} ${errors.shift_incharge ? "border-rose-400" : ""}`}
                  />
                  <datalist id="shift_incharge_list">
                    {shiftInchargeOptions.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className={labelClass}>SMS Head *</label>
                  <select
                    name="sms_head"
                    value={formData.sms_head}
                    onChange={handleChange}
                    className={`${selectClass} ${errors.sms_head ? "border-rose-400" : ""}`}
                  >
                    {smsHeadOptions.map((option) => (
                      <option key={option || "blank"} value={option}>
                        {option || "Select SMS Head"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </SectionCard>

            <SectionCard>
              <h2 className="text-sm font-semibold text-slate-900">Remarks and Image</h2>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Remarks</label>
                  <textarea
                    name="remarks"
                    value={formData.remarks}
                    onChange={handleChange}
                    className={textareaClass}
                  />
                </div>

                <div className="space-y-2">
                  <label className={labelClass}>Visual Evidence</label>
                  {previewUrl ? (
                    <div className="space-y-2">
                      <img src={previewUrl} alt="SMS preview" className="w-full rounded-md border border-slate-200 object-cover max-h-52" />
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
                {isSubmitting ? "Submitting..." : "Submit Entry"}
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
              getRowKey={(row, index) => row.id || row.unique_code || `sms-${index}`}
              loading={loading}
              loadingMessage="Loading SMS history..."
              emptyMessage="No SMS records found."
            />
          </SectionCard>
        )}
      </PageContainer>
    </>
  );
}

export default SMSRegister;
