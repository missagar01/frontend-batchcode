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

const SHIFT_OPTIONS = ["", "Day", "Night"];
const TESTER_OPTIONS = [
  "",
  "Komal Sahu",
  "Sushil Bharti",
  "Sunil Verma",
  "Suraj",
  "Govind Sahu",
  "MD Mustaq",
  "Devendra Chetan",
  "Vikash",
  "Chadrakant Sahu"
];

const INITIAL_FORM = {
  sms_batch_code: "",
  furnace_number: "",
  sequence_code: "",
  laddle_number: "",
  shift_type: "",
  tested_by: "",
  final_c: "",
  final_mn: "",
  final_s: "",
  final_p: "",
  remarks: "",
  sample_timestamp: ""
};

function QCLab() {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [historyRows, setHistoryRows] = useState([]);
  const [smsRows, setSmsRows] = useState([]);
  const [viewMode, setViewMode] = useState("queue");
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [queuePrefillLocked, setQueuePrefillLocked] = useState(false);
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
      const [smsResponse, qcResponse] = await Promise.all([
        batchcodeAPI.getSMSRegisterHistory(),
        batchcodeAPI.getQCLabHistory()
      ]);

      setSmsRows(normalizeApiRows(smsResponse));
      setHistoryRows(normalizeApiRows(qcResponse));
    } catch (error) {
      if (!silent) {
        setPopup({ open: true, type: "warning", message: "Failed to load QC Lab data.", code: "" });
      }
      console.error("Failed to fetch QC Lab data", error);
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
        .map((row) => String(row.sms_batch_code || "").trim())
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

  const openFormForQueueRow = (row) => {
    setFormData({
      ...INITIAL_FORM,
      sms_batch_code: String(row.unique_code || ""),
      furnace_number: row.furnace_number || "",
      sequence_code: row.sequence_number || "",
      laddle_number: row.laddle_number || "",
      sample_timestamp: row.sample_timestamp || row.created_at || row.createdAt || ""
    });
    setQueuePrefillLocked(true);
    setShowForm(true);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
    const required = [
      "sms_batch_code",
      "furnace_number",
      "sequence_code",
      "laddle_number",
      "shift_type",
      "tested_by",
      "final_c",
      "final_mn",
      "final_s",
      "final_p"
    ];

    const missing = required.filter((field) => !String(formData[field] || "").trim());
    if (missing.length) {
      setPopup({ open: true, type: "warning", message: "Please fill all required fields.", code: "" });
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
      payload.append("sms_batch_code", formData.sms_batch_code.trim());
      payload.append("furnace_number", formData.furnace_number);
      payload.append("sequence_code", formData.sequence_code);
      payload.append("laddle_number", formData.laddle_number);
      payload.append("shift_type", formData.shift_type);
      payload.append("tested_by", formData.tested_by);
      payload.append("final_c", formData.final_c);
      payload.append("final_mn", formData.final_mn);
      payload.append("final_s", formData.final_s);
      payload.append("final_p", formData.final_p);
      payload.append("remarks", formData.remarks);
      if (formData.sample_timestamp) {
        payload.append("sample_timestamp", formData.sample_timestamp);
      }

      if (selectedFile) {
        payload.append("report_picture", selectedFile);
      }

      const response = await batchcodeAPI.submitQCLabTest(payload);
      if (!response?.data?.success) {
        throw new Error("Failed to submit QC Lab entry");
      }

      const saved = response?.data?.data || {};
      setPopup({ open: true, type: "success", message: "QC Lab entry submitted.", code: saved.unique_code || "" });

      setFormData(INITIAL_FORM);
      setQueuePrefillLocked(false);
      setShowForm(false);
      clearImage();
      fetchData(true);
    } catch (error) {
      console.error("Failed to submit QC Lab entry", error);
      setPopup({ open: true, type: "warning", message: "Failed to submit QC Lab entry.", code: "" });
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
      { label: "SMS Batch", render: (row) => `#${valueOrDash(row.unique_code)}` },
      {
        label: "Sample",
        render: (row) =>
          `${valueOrDash(row.sequence_number)} / L${valueOrDash(row.laddle_number)} / ${valueOrDash(row.furnace_number)}`
      },
      { label: "Temp", render: (row) => (row.temperature ? `${row.temperature} C` : "-") },
      { label: "Melter", key: "melter_name" },
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
      { label: "QC Code", render: (row) => `#${valueOrDash(row.unique_code)}` },
      { label: "SMS Batch", key: "sms_batch_code" },
      {
        label: "Sample",
        render: (row) => `${valueOrDash(row.sequence_code)} / L${valueOrDash(row.laddle_number)} / ${valueOrDash(row.furnace_number)}`
      },
      {
        label: "Chemistry",
        render: (row) =>
          `C ${valueOrDash(row.final_c)} | Mn ${valueOrDash(row.final_mn)} | S ${valueOrDash(row.final_s)} | P ${valueOrDash(row.final_p)}`
      },
      { label: "Tester", key: "tested_by" },
      { label: "Media", render: (row) => mediaCell(row.report_picture) }
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
        title="QC Lab Report Image"
        onClose={closeMediaPreview}
      />

      <PageContainer>
        <PageHeader
          title="QC Lab"
          subtitle={viewMode === "queue" ? "Process pending SMS samples" : "Submitted QC Lab records"}
          icon={ClipboardPlus}
          actions={
            <>
              <SearchField
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder={viewMode === "queue" ? "Search pending samples" : "Search history"}
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
                  setQueuePrefillLocked(false);
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
              getRowKey={(row, index) => row.id || row.unique_code || `qc-pending-${index}`}
              loading={loading}
              loadingMessage="Loading pending SMS samples..."
              emptyMessage="No pending SMS samples."
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
              getRowKey={(row, index) => row.id || row.unique_code || `qc-history-${index}`}
              loading={loading}
              loadingMessage="Loading QC Lab history..."
              emptyMessage="No QC Lab records found."
            />
          </SectionCard>
        )}

        {showForm ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <SectionCard>
              <h2 className="text-sm font-semibold text-slate-900">QC Lab Form</h2>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className={labelClass}>SMS Batch Code *</label>
                  <input
                    name="sms_batch_code"
                    value={formData.sms_batch_code}
                    onChange={handleChange}
                    readOnly={queuePrefillLocked}
                    className={`${inputClass} ${queuePrefillLocked ? "bg-slate-100 text-slate-700" : ""}`}
                  />
                </div>

                <div>
                  <label className={labelClass}>Furnace *</label>
                  <input
                    name="furnace_number"
                    value={formData.furnace_number}
                    onChange={handleChange}
                    readOnly={queuePrefillLocked}
                    className={`${inputClass} ${queuePrefillLocked ? "bg-slate-100 text-slate-700" : ""}`}
                  />
                </div>

                <div>
                  <label className={labelClass}>Sequence *</label>
                  <input
                    name="sequence_code"
                    value={formData.sequence_code}
                    onChange={handleChange}
                    readOnly={queuePrefillLocked}
                    className={`${inputClass} ${queuePrefillLocked ? "bg-slate-100 text-slate-700" : ""}`}
                  />
                </div>

                <div>
                  <label className={labelClass}>Laddle *</label>
                  <input
                    name="laddle_number"
                    value={formData.laddle_number}
                    onChange={handleChange}
                    readOnly={queuePrefillLocked}
                    className={`${inputClass} ${queuePrefillLocked ? "bg-slate-100 text-slate-700" : ""}`}
                  />
                </div>

                <div>
                  <label className={labelClass}>Shift *</label>
                  <select name="shift_type" value={formData.shift_type} onChange={handleChange} className={selectClass}>
                    {SHIFT_OPTIONS.map((option) => (
                      <option key={option || "blank"} value={option}>
                        {option || "Select Shift"}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Tested By *</label>
                  <select name="tested_by" value={formData.tested_by} onChange={handleChange} className={selectClass}>
                    {TESTER_OPTIONS.map((option) => (
                      <option key={option || "blank"} value={option}>
                        {option || "Select Tester"}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Final C *</label>
                  <input type="number" step="0.0001" name="final_c" value={formData.final_c} onChange={handleChange} className={inputClass} />
                </div>

                <div>
                  <label className={labelClass}>Final Mn *</label>
                  <input
                    type="number"
                    step="0.0001"
                    name="final_mn"
                    value={formData.final_mn}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Final S *</label>
                  <input type="number" step="0.0001" name="final_s" value={formData.final_s} onChange={handleChange} className={inputClass} />
                </div>

                <div>
                  <label className={labelClass}>Final P *</label>
                  <input type="number" step="0.0001" name="final_p" value={formData.final_p} onChange={handleChange} className={inputClass} />
                </div>

                <div className="md:col-span-2 lg:col-span-3">
                  <label className={labelClass}>Remarks</label>
                  <textarea name="remarks" value={formData.remarks} onChange={handleChange} className={textareaClass} />
                </div>

                <div className="md:col-span-2 lg:col-span-3 space-y-2">
                  <label className={labelClass}>Report Picture</label>
                  {previewUrl ? (
                    <div className="space-y-2">
                      <img src={previewUrl} alt="QC report preview" className="w-full rounded-md border border-slate-200 object-cover max-h-52" />
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

export default QCLab;
