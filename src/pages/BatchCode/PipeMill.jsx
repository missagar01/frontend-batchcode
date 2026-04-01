import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardPlus, History, RefreshCw, Save, X } from "lucide-react";
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

const MILL_OPTIONS = ["", "PIPE MILL 01", "PIPE MILL 02", "PIPE MILL 03", "PIPE MILL 04", "PIPE MILL 05"];
const MACHINE_OPTIONS = ["", "SRMPL01", "SRMPL02", "SRMPL03", "SRMPL04", "SRMPL05", "SRMPL06", "SRMPL07", "SRMPL08", "SRMPL09"];
const ITEM_OPTIONS = ["", "Square", "Round", "Rectangle"];
const SHIFT_OPTIONS = ["", "Day", "Night"];
const SIZE_OPTIONS = [
  "",
  "3/4\" (25OD)",
  "1 1/2\" (48OD)",
  "2\" (60OD)",
  "1 1/4\" (42OD)",
  "1\" (32OD)",
  "3/4\" (19X19)",
  "1\" (25X25)",
  "1 1/2\" (38X38)",
  "2\" (47X47)",
  "2 1/2\" (62X62)",
  "3\" (72X72)",
  "1 1/2\" (25X50)",
  "2\" (37X56)",
  "2\" (68X25)",
  "2 1/2\" (80X40)",
  "3\" (96X48)"
];
const FITTER_OPTIONS = [
  "",
  "Randhir Kumar",
  "Mukesh Kumar",
  "Sunil Sharma",
  "Satya Prakash",
  "Shivji Yadav",
  "Ratan Singh",
  "Radhey Shyam",
  "Chandan Singh",
  "Dinesh Thakur",
  "MD Guddu Ali",
  "Other"
];
const QUALITY_SUPERVISOR_OPTIONS = [
  "",
  "Birendra Kumar Singh",
  "Sandeep Gupta",
  "Jitendra Diwakar",
  "Rohan Kumar",
  "Lallu Kumar",
  "Dharmendra Kushwaha",
  "Ashish Parida",
  "Ajay Gupta",
  "Lekh Singh Patle"
];
const MILL_INCHARGE_OPTIONS = ["", "Ravi Singh", "G Mohan Rao"];
const FORMAN_OPTIONS = ["", "Hullash Paswan", "Montu Aanand Ghosh"];

const INITIAL_FORM = {
  recoiler_short_code: "",
  machine_number: "",
  mill_number: "",
  section: "",
  item_type: "",
  quality_supervisor: "",
  mill_incharge: "",
  forman_name: "",
  fitter_name: "",
  fitter_name_other: "",
  shift: "",
  size: "",
  thickness: "",
  remarks: ""
};

function PipeMill() {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [historyRows, setHistoryRows] = useState([]);
  const [recoilerRows, setRecoilerRows] = useState([]);
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

  const clearImage = useCallback(() => {
    setPreviewUrl((currentUrl) => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
      return "";
    });
    setSelectedFile(null);
  }, []);

  const closeFormModal = useCallback(() => {
    setShowForm(false);
  }, []);

  const openManualEntryForm = useCallback(() => {
    setFormData(INITIAL_FORM);
    setQueuePrefillLocked(false);
    clearImage();
    setShowForm(true);
  }, [clearImage]);

  const openFormForQueueRow = useCallback((row) => {
    clearImage();
    setFormData({
      ...INITIAL_FORM,
      recoiler_short_code: String(row.unique_code || row.recoiler_short_code || ""),
      machine_number: String(row.machine_number || ""),
      size: row.size || ""
    });
    setQueuePrefillLocked(true);
    setShowForm(true);
  }, [clearImage]);

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

  useEffect(() => {
    if (!showForm) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeFormModal();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showForm, closeFormModal]);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }

    try {
      const [recoilerResponse, pipeMillResponse] = await Promise.all([
        batchcodeAPI.getReCoilHistory(),
        batchcodeAPI.getPipeMillHistory()
      ]);

      setRecoilerRows(normalizeApiRows(recoilerResponse));
      setHistoryRows(normalizeApiRows(pipeMillResponse));
    } catch (error) {
      if (!silent) {
        setPopup({ open: true, type: "warning", message: "Failed to load pipe mill data.", code: "" });
      }
      console.error("Failed to fetch pipe mill data", error);
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

  const queueRows = useMemo(() => {
    const map = new Map();

    recoilerRows.forEach((row) => {
      const code = String(row.unique_code || "").trim();
      if (!code || map.has(code)) {
        return;
      }
      map.set(code, row);
    });

    return Array.from(map.values());
  }, [recoilerRows]);

  const filteredQueueRows = useMemo(
    () => queueRows.filter((row) => matchesSearch(row, searchTerm)),
    [queueRows, searchTerm]
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
      fitter_name_other: name === "fitter_name" && value !== "Other" ? "" : prev.fitter_name_other
    }));
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setSelectedFile(file);
    setPreviewUrl((currentUrl) => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
      return URL.createObjectURL(file);
    });
  };

  const validate = () => {
    const requiredFields = [
      "recoiler_short_code",
      "machine_number",
      "mill_number",
      "item_type",
      "quality_supervisor",
      "mill_incharge",
      "forman_name",
      "fitter_name",
      "shift",
      "size"
    ];

    const missing = requiredFields.filter((field) => !formData[field]);
    if (missing.length) {
      setPopup({ open: true, type: "warning", message: "Please fill all required fields.", code: "" });
      return false;
    }

    if (formData.fitter_name === "Other" && !formData.fitter_name_other.trim()) {
      setPopup({ open: true, type: "warning", message: "Specify fitter name.", code: "" });
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
        if (key === "fitter_name_other") {
          return;
        }

        if (key === "fitter_name" && value === "Other") {
          payload.append("fitter_name", formData.fitter_name_other.trim());
          return;
        }

        payload.append(key, value);
      });

      if (selectedFile) {
        payload.append("picture", selectedFile);
      }

      const response = await batchcodeAPI.submitPipeMill(payload);
      if (!response?.data?.success) {
        throw new Error("Failed to submit pipe mill entry");
      }

      const saved = response?.data?.data || {};
      setPopup({ open: true, type: "success", message: "Pipe mill entry submitted.", code: saved.unique_code || "" });

      setFormData(INITIAL_FORM);
      setQueuePrefillLocked(false);
      setShowForm(false);
      clearImage();
      fetchData(true);
    } catch (error) {
      console.error("Failed to submit pipe mill entry", error);
      setPopup({ open: true, type: "warning", message: "Failed to submit pipe mill entry.", code: "" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const queueColumns = useMemo(
    () => [
      {
        label: "Action",
        mobileRender: (row) => (
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium text-slate-600">Action:</span>
            <button
              type="button"
              onClick={() => openFormForQueueRow(row)}
              className="h-8 min-w-20 rounded-md bg-red-600 px-3 text-xs font-medium text-white"
            >
              Start
            </button>
          </div>
        ),
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
      { label: "Recoiler", render: (row) => `${valueOrDash(row.unique_code || row.recoiler_short_code)}` },
      { label: "Size", key: "size" },
      {
        label: "Team",
        render: (row) => `${valueOrDash(row.supervisor)} / ${valueOrDash(row.incharge)}`
      },
      { label: "Machine", key: "machine_number" },
      { label: "Time", render: (row) => formatDateTime(row.sample_timestamp || row.created_at || row.createdAt) }
    ],
    [openFormForQueueRow]
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
      { label: "Pipe Code", render: (row) => `#${valueOrDash(row.unique_code)}` },
      { label: "Recoiler", key: "recoiler_short_code" },
      {
        label: "Material",
        render: (row) =>
          `${valueOrDash(row.section)} / ${valueOrDash(row.item_type)} / ${valueOrDash(row.size)} / ${valueOrDash(row.thickness)}`
      },
      {
        label: "Team",
        render: (row) =>
          `${valueOrDash(row.quality_supervisor)} / ${valueOrDash(row.mill_incharge)} / ${valueOrDash(row.forman_name)}`
      },
      { label: "Shift/Fitter", render: (row) => `${valueOrDash(row.shift)} / ${valueOrDash(row.fitter_name)}` },
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
        title="Pipe Mill Image"
        onClose={closeMediaPreview}
      />
      {showForm ? (
        <div
          className="fixed inset-0 z-[1050] bg-slate-900/60 p-3 pt-16 sm:p-4"
          onClick={closeFormModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="pipe-mill-form-title"
        >
          <div className="flex h-full w-full items-start justify-center sm:items-center">
            <div
              className="flex max-h-[calc(100dvh-4.5rem)] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-xl sm:h-auto sm:max-h-[92dvh] sm:max-w-5xl sm:rounded-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-3 py-3 sm:px-4">
                  <div className="min-w-0">
                    <h2 id="pipe-mill-form-title" className="text-sm font-semibold text-slate-900 sm:text-base">
                      {queuePrefillLocked ? "Pipe Mill Entry" : "Manual Pipe Mill Entry"}
                    </h2>
                    <p className="mt-1 text-xs text-slate-600">
                      {queuePrefillLocked
                        ? `Recoiler #${valueOrDash(formData.recoiler_short_code)} ke liye details fill karein.`
                        : "Pipe mill entry submit karne ke liye details fill karein."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeFormModal}
                    className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                    aria-label="Close pipe mill form"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <div>
                      <label className={labelClass}>Recoiler Code *</label>
                      {queuePrefillLocked ? (
                        <input
                          name="recoiler_short_code"
                          value={formData.recoiler_short_code}
                          readOnly
                          className={`${inputClass} bg-slate-100 text-slate-700`}
                        />
                      ) : (
                        <input
                          name="recoiler_short_code"
                          value={formData.recoiler_short_code}
                          onChange={handleChange}
                          className={inputClass}
                        />
                      )}
                    </div>

                    <div>
                      <label className={labelClass}>Machine Number *</label>
                      {queuePrefillLocked ? (
                        <input
                          name="machine_number"
                          value={formData.machine_number}
                          readOnly
                          className={`${inputClass} bg-slate-100 text-slate-700`}
                        />
                      ) : (
                        <select
                          name="machine_number"
                          value={formData.machine_number}
                          onChange={handleChange}
                          className={selectClass}
                        >
                          {MACHINE_OPTIONS.map((option) => (
                            <option key={option || "blank"} value={option}>
                              {option || "Select Machine Number"}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div>
                      <label className={labelClass}>Mill Number *</label>
                      <select name="mill_number" value={formData.mill_number} onChange={handleChange} className={selectClass}>
                        {MILL_OPTIONS.map((option) => (
                          <option key={option || "blank"} value={option}>
                            {option || "Select Mill"}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={labelClass}>Section</label>
                      <input name="section" value={formData.section} onChange={handleChange} className={inputClass} />
                    </div>

                    <div>
                      <label className={labelClass}>Item Type *</label>
                      <select name="item_type" value={formData.item_type} onChange={handleChange} className={selectClass}>
                        {ITEM_OPTIONS.map((option) => (
                          <option key={option || "blank"} value={option}>
                            {option || "Select Item Type"}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={labelClass}>Size *</label>
                      <select name="size" value={formData.size} onChange={handleChange} className={selectClass}>
                        {SIZE_OPTIONS.map((option) => (
                          <option key={option || "blank"} value={option}>
                            {option || "Select Size"}
                          </option>
                        ))}
                        {formData.size && !SIZE_OPTIONS.includes(formData.size) ? (
                          <option value={formData.size}>{formData.size}</option>
                        ) : null}
                      </select>
                    </div>

                    <div>
                      <label className={labelClass}>Thickness</label>
                      <input name="thickness" value={formData.thickness} onChange={handleChange} className={inputClass} />
                    </div>

                    <div>
                      <label className={labelClass}>Shift *</label>
                      <select name="shift" value={formData.shift} onChange={handleChange} className={selectClass}>
                        {SHIFT_OPTIONS.map((option) => (
                          <option key={option || "blank"} value={option}>
                            {option || "Select Shift"}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={labelClass}>Fitter Name *</label>
                      <select name="fitter_name" value={formData.fitter_name} onChange={handleChange} className={selectClass}>
                        {FITTER_OPTIONS.map((option) => (
                          <option key={option || "blank"} value={option}>
                            {option || "Select Fitter"}
                          </option>
                        ))}
                      </select>
                    </div>

                    {formData.fitter_name === "Other" ? (
                      <div>
                        <label className={labelClass}>Specify Fitter *</label>
                        <input
                          name="fitter_name_other"
                          value={formData.fitter_name_other}
                          onChange={handleChange}
                          className={inputClass}
                        />
                      </div>
                    ) : null}

                    <div>
                      <label className={labelClass}>Quality Supervisor *</label>
                      <select
                        name="quality_supervisor"
                        value={formData.quality_supervisor}
                        onChange={handleChange}
                        className={selectClass}
                      >
                        {QUALITY_SUPERVISOR_OPTIONS.map((option) => (
                          <option key={option || "blank"} value={option}>
                            {option || "Select"}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={labelClass}>Mill Incharge *</label>
                      <select name="mill_incharge" value={formData.mill_incharge} onChange={handleChange} className={selectClass}>
                        {MILL_INCHARGE_OPTIONS.map((option) => (
                          <option key={option || "blank"} value={option}>
                            {option || "Select"}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={labelClass}>Forman *</label>
                      <select name="forman_name" value={formData.forman_name} onChange={handleChange} className={selectClass}>
                        {FORMAN_OPTIONS.map((option) => (
                          <option key={option || "blank"} value={option}>
                            {option || "Select"}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2 xl:col-span-3">
                      <label className={labelClass}>Remarks</label>
                      <textarea name="remarks" value={formData.remarks} onChange={handleChange} className={textareaClass} />
                    </div>

                    <div className="space-y-2 sm:col-span-2 xl:col-span-3">
                      <label className={labelClass}>Picture</label>
                      {previewUrl ? (
                        <div className="space-y-2">
                          <img
                            src={previewUrl}
                            alt="Pipe mill preview"
                            className="max-h-52 w-full rounded-md border border-slate-200 object-cover sm:max-h-64"
                          />
                          <button type="button" onClick={clearImage} className={`${secondaryButtonClass} w-full sm:w-auto`}>
                            Remove Image
                          </button>
                        </div>
                      ) : (
                        <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-xs text-slate-600">
                          Upload image
                          <span className="mt-1 text-[11px] text-slate-500">Tap to choose a photo from mobile or desktop.</span>
                          <input type="file" accept="image/*" className="sr-only" onChange={handleFileChange} />
                        </label>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-200 px-3 py-3 sm:px-4">
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button type="button" onClick={closeFormModal} className={`${secondaryButtonClass} w-full sm:w-auto`}>
                      Close
                    </button>
                    <button type="submit" disabled={isSubmitting} className={primaryButtonClass}>
                      <Save size={14} />
                      {isSubmitting ? "Submitting..." : "Submit Entry"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      <PageContainer>
        <PageHeader
          title="Pipe Mill"
          subtitle={viewMode === "queue" ? "Process pending recoiler records" : "Submitted pipe mill records"}
          icon={ClipboardPlus}
          actions={
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <SearchField
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder={viewMode === "queue" ? "Search pending records" : "Search history"}
              />

              <button
                type="button"
                onClick={() => setViewMode((prev) => (prev === "queue" ? "history" : "queue"))}
                className={`${secondaryButtonClass} w-full sm:w-auto`}
              >
                <History size={14} />
                {viewMode === "queue" ? "History" : "Pending"}
              </button>

              <button type="button" onClick={() => fetchData()} className={`${secondaryButtonClass} w-full sm:w-auto`}>
                <RefreshCw size={14} />
                Refresh
              </button>
            </div>
          }
        />

        {viewMode === "queue" ? (
          <SectionCard>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Pending Queue</h2>
              <button
                type="button"
                onClick={openManualEntryForm}
                className={`${secondaryButtonClass} w-full sm:w-auto`}
              >
                Manual Entry
              </button>
            </div>

            <ResponsiveDataTable
              rows={filteredQueueRows}
              columns={queueColumns}
              getRowKey={(row, index) => row.id || row.unique_code || `pipe-pending-${index}`}
              loading={loading}
              loadingMessage="Loading pending recoiler records..."
              emptyMessage="No pending recoiler records."
            />
          </SectionCard>
        ) : (
          <SectionCard>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-sm font-semibold text-slate-900">History</h2>
              <span className="text-xs text-slate-600">Total: {filteredHistoryRows.length}</span>
            </div>

            <ResponsiveDataTable
              rows={filteredHistoryRows}
              columns={historyColumns}
              getRowKey={(row, index) => row.id || row.unique_code || `pipe-history-${index}`}
              loading={loading}
              loadingMessage="Loading pipe mill history..."
              emptyMessage="No pipe mill records found."
            />
          </SectionCard>
        )}

      </PageContainer>
    </>
  );
}

export default PipeMill;
