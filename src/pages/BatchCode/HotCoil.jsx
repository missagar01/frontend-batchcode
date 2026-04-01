import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardPlus, History, RefreshCw, Save } from "lucide-react";
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
  sms_short_code: "",
  submission_type: "Hot Coil",
  size: "",
  mill_incharge: "",
  quality_supervisor: "",
  quality_supervisor_other: "",
  electrical_dc_operator: "",
  strand1_temperature: "",
  strand2_temperature: "",
  shift_supervisor: "",
  remarks: ""
};

const submissionTypeOptions = ["Hot Coil", "Cold Billet"];
const millInchargeOptions = ["", "Ravi Singh", "G Mohan Rao"];
const qualitySupervisorOptions = [
  "",
  "Birendra Kumar Singh",
  "Sandeep Gupta",
  "Jitendra Diwakar",
  "Rohan Kumar",
  "Lallu Kumar",
  "Dharmendra Kushwaha",
  "Ashish Parida",
  "Ajay Gupta",
  "Lekh Singh Patle",
  "Other"
];
const electricalOperatorOptions = ["", "Pankaj", "Anand", "Rahul", "Deepak", "Other"];

function HotCoil() {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [historyRows, setHistoryRows] = useState([]);
  const [smsRows, setSmsRows] = useState([]);
  const [viewMode, setViewMode] = useState("queue");
  const [showForm, setShowForm] = useState(false);
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

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }

    try {
      const [smsResponse, hotCoilResponse] = await Promise.all([
        batchcodeAPI.getSMSRegisterHistory(),
        batchcodeAPI.getHotCoilHistory()
      ]);

      setSmsRows(normalizeApiRows(smsResponse));
      setHistoryRows(normalizeApiRows(hotCoilResponse));
    } catch (error) {
      if (!silent) {
        setPopup({ open: true, type: "warning", message: "Failed to load hot coil data.", code: "" });
      }
      console.error("Failed to fetch hot coil data", error);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchData();
    const timer = setInterval(() => fetchData(true), 10000);
    return () => clearInterval(timer);
  }, [fetchData]);

  const pendingRows = useMemo(() => {
    const processed = new Set(
      historyRows
        .map((row) => String(row.unique_code || row.sms_short_code || "").trim())
        .filter(Boolean)
    );

    return smsRows.filter((row) => {
      const code = String(row.unique_code || "").trim();
      return code && !processed.has(code);
    });
  }, [historyRows, smsRows]);

  const filteredQueueRows = useMemo(
    () => pendingRows.filter((row) => matchesSearch(row, searchTerm)),
    [pendingRows, searchTerm]
  );

  const filteredHistoryRows = useMemo(
    () => historyRows.filter((row) => matchesSearch(row, searchTerm)),
    [historyRows, searchTerm]
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      quality_supervisor_other: name === "quality_supervisor" && value !== "Other" ? "" : prev.quality_supervisor_other
    }));
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

  const openFormForQueueRow = (row) => {
    const code = String(row.unique_code || row.sms_short_code || "");
    setFormData({ ...INITIAL_FORM, sms_short_code: code, submission_type: "Hot Coil" });
    setShowForm(true);
  };

  const validate = () => {
    if (!formData.sms_short_code.trim()) {
      setPopup({ open: true, type: "warning", message: "SMS short code is required.", code: "" });
      return false;
    }

    if (!formData.submission_type) {
      setPopup({ open: true, type: "warning", message: "Submission type is required.", code: "" });
      return false;
    }

    if (formData.quality_supervisor === "Other" && !formData.quality_supervisor_other.trim()) {
      setPopup({ open: true, type: "warning", message: "Specify quality supervisor name.", code: "" });
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
      payload.append("sms_short_code", formData.sms_short_code.trim());
      payload.append("submission_type", formData.submission_type);
      payload.append("size", formData.size);
      payload.append("mill_incharge", formData.mill_incharge);
      payload.append(
        "quality_supervisor",
        formData.quality_supervisor === "Other" ? formData.quality_supervisor_other : formData.quality_supervisor
      );
      payload.append("electrical_dc_operator", formData.electrical_dc_operator);
      payload.append("strand1_temperature", formData.strand1_temperature);
      payload.append("strand2_temperature", formData.strand2_temperature);
      payload.append("shift_supervisor", formData.shift_supervisor);
      payload.append("remarks", formData.remarks);

      if (selectedFile) {
        payload.append("picture", selectedFile);
      }

      const response = await batchcodeAPI.submitHotCoil(payload);
      if (!response?.data?.success) {
        throw new Error("Failed to submit hot coil entry");
      }

      const saved = response?.data?.data || {};
      setPopup({ open: true, type: "success", message: "Hot coil entry submitted.", code: saved.unique_code || "" });

      setFormData(INITIAL_FORM);
      setShowForm(false);
      clearImage();
      fetchData(true);
    } catch (error) {
      console.error("Failed to submit hot coil entry", error);
      setPopup({ open: true, type: "warning", message: "Failed to submit hot coil entry.", code: "" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const queueColumns = useMemo(
    () => [
      {
        label: "Action",
        render: (row) => (
          <button
            type="button"
            onClick={() => openFormForQueueRow(row)}
            className="h-8 rounded-md bg-red-600 px-3 text-xs font-medium text-white"
          >
            Start
          </button>
        )
      },
      { label: "SMS Code", render: (row) => `${valueOrDash(row.unique_code)}` },
      {
        label: "Sample",
        render: (row) =>
          `${valueOrDash(row.sequence_number)} / L${valueOrDash(row.laddle_number)} / ${valueOrDash(row.furnace_number)}`
      },
      { label: "Melter", key: "melter_name" },
      { label: "Temp", render: (row) => (row.temperature ? `${row.temperature} C` : "-") },
      { label: "Time", render: (row) => formatDateTime(row.sample_timestamp || row.created_at || row.createdAt) }
    ],
    []
  );

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

  const historyColumns = useMemo(
    () => [
      { label: "Time", render: (row) => formatDateTime(row.sample_timestamp || row.created_at || row.createdAt) },
      { label: "Code", render: (row) => `#${valueOrDash(row.unique_code || row.sms_short_code)}` },
      { label: "Type", key: "submission_type" },
      { label: "Size", key: "size" },
      {
        label: "Strands",
        render: (row) => `${valueOrDash(row.strand1_temperature)} / ${valueOrDash(row.strand2_temperature)}`
      },
      {
        label: "Team",
        render: (row) => `${valueOrDash(row.quality_supervisor)} / ${valueOrDash(row.mill_incharge)}`
      },
      { label: "Shift", key: "shift_supervisor" },
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
        title="Hot Coil Image"
        onClose={closeMediaPreview}
      />

      <PageContainer>
        <PageHeader
          title="Hot Coil"
          subtitle={viewMode === "queue" ? "Process pending SMS records" : "Submitted hot coil records"}
          icon={ClipboardPlus}
          actions={
            <>
              <SearchField
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder={viewMode === "queue" ? "Search pending records" : "Search history"}
              />

              <button
                type="button"
                onClick={() => setViewMode((prev) => (prev === "queue" ? "history" : "queue"))}
                className={secondaryButtonClass}
              >
                <History size={14} />
                {viewMode === "queue" ? "History" : "Pending"}
              </button>

              <button type="button" onClick={() => fetchData()} className={secondaryButtonClass}>
                <RefreshCw size={14} />
                Refresh
              </button>
            </>
          }
        />

        {viewMode === "queue" ? (
          <SectionCard>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900">Pending Queue</h2>
              <button
                type="button"
                onClick={() => {
                  setFormData(INITIAL_FORM);
                  setShowForm((prev) => !prev);
                }}
                className={secondaryButtonClass}
              >
                {showForm ? "Hide Form" : "Manual Entry"}
              </button>
            </div>

            <ResponsiveDataTable
              rows={filteredQueueRows}
              columns={queueColumns}
              getRowKey={(row, index) => row.id || row.unique_code || `hot-pending-${index}`}
              loading={loading}
              loadingMessage="Loading pending SMS records..."
              emptyMessage="No pending SMS records."
            />
          </SectionCard>
        ) : (
          <SectionCard>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">History</h2>
              <span className="text-xs text-slate-600">Total: {filteredHistoryRows.length}</span>
            </div>

            <ResponsiveDataTable
              rows={filteredHistoryRows}
              columns={historyColumns}
              getRowKey={(row, index) => row.id || row.unique_code || `hot-history-${index}`}
              loading={loading}
              loadingMessage="Loading hot coil history..."
              emptyMessage="No hot coil records found."
            />
          </SectionCard>
        )}

        {showForm ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <SectionCard>
              <h2 className="text-sm font-semibold text-slate-900">Hot Coil Form</h2>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className={labelClass}>SMS Short Code *</label>
                  <input
                    name="sms_short_code"
                    value={formData.sms_short_code}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Submission Type *</label>
                  <select
                    name="submission_type"
                    value={formData.submission_type}
                    onChange={handleChange}
                    className={selectClass}
                  >
                    {submissionTypeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Size</label>
                  <input name="size" value={formData.size} onChange={handleChange} className={inputClass} />
                </div>

                <div>
                  <label className={labelClass}>Mill Incharge</label>
                  <select
                    name="mill_incharge"
                    value={formData.mill_incharge}
                    onChange={handleChange}
                    className={selectClass}
                  >
                    {millInchargeOptions.map((option) => (
                      <option key={option || "blank"} value={option}>
                        {option || "Select"}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Quality Supervisor</label>
                  <select
                    name="quality_supervisor"
                    value={formData.quality_supervisor}
                    onChange={handleChange}
                    className={selectClass}
                  >
                    {qualitySupervisorOptions.map((option) => (
                      <option key={option || "blank"} value={option}>
                        {option || "Select"}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.quality_supervisor === "Other" ? (
                  <div>
                    <label className={labelClass}>Supervisor Name *</label>
                    <input
                      name="quality_supervisor_other"
                      value={formData.quality_supervisor_other}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </div>
                ) : null}

                <div>
                  <label className={labelClass}>Electrical DC Operator</label>
                  <select
                    name="electrical_dc_operator"
                    value={formData.electrical_dc_operator}
                    onChange={handleChange}
                    className={selectClass}
                  >
                    {electricalOperatorOptions.map((option) => (
                      <option key={option || "blank"} value={option}>
                        {option || "Select"}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Strand 1 Temperature</label>
                  <input
                    name="strand1_temperature"
                    value={formData.strand1_temperature}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Strand 2 Temperature</label>
                  <input
                    name="strand2_temperature"
                    value={formData.strand2_temperature}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Shift Supervisor</label>
                  <input
                    name="shift_supervisor"
                    value={formData.shift_supervisor}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>

                <div className="md:col-span-2 lg:col-span-3">
                  <label className={labelClass}>Remarks</label>
                  <textarea name="remarks" value={formData.remarks} onChange={handleChange} className={textareaClass} />
                </div>

                <div className="md:col-span-2 lg:col-span-3 space-y-2">
                  <label className={labelClass}>Picture</label>
                  {previewUrl ? (
                    <div className="space-y-2">
                      <img src={previewUrl} alt="Hot coil preview" className="w-full rounded-md border border-slate-200 object-cover max-h-52" />
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
        ) : null}
      </PageContainer>
    </>
  );
}

export default HotCoil;
