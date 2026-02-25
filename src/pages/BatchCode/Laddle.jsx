import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ClipboardCheck, History, Save } from "lucide-react";
import * as batchcodeAPI from "../../api/batchcodeApi";
import {
  PageContainer,
  PageHeader,
  SectionCard,
  SearchField,
  StatusModal,
  ResponsiveDataTable,
  inputClass,
  selectClass,
  primaryButtonClass,
  secondaryButtonClass,
  labelClass
} from "../../components/batchcode/PagePrimitives";
import { formatDateTime, matchesSearch, normalizeApiRows, valueOrDash } from "../../components/batchcode/dataUtils";

const CHECKLIST_FIELDS = [
  { key: "slag_cleaning_top", label: "Slag Cleaning Top" },
  { key: "slag_cleaning_bottom", label: "Slag Cleaning Bottom" },
  { key: "nozzle_proper_lancing", label: "Nozzle Lancing" },
  { key: "pursing_plug_cleaning", label: "Pursing Plug Cleaning" },
  { key: "sly_gate_check", label: "Sly Gate Check" },
  { key: "nozzle_check_cleaning", label: "Nozzle Check/Cleaning" },
  { key: "sly_gate_operate", label: "Sly Gate Operate" },
  { key: "nfc_proper_heat", label: "NFC Heat" },
  { key: "nfc_filling_nozzle", label: "NFC Filling" }
];

const INITIAL_FORM = {
  laddle_number: "",
  sample_date: "",
  plate_life: "",
  timber_man_name: "",
  laddle_man_name: "",
  laddle_foreman_name: "",
  supervisor_name: "",
  dip_reading: "",
  slag_cleaning_top: "Not Done",
  slag_cleaning_bottom: "Not Done",
  nozzle_proper_lancing: "Not Done",
  pursing_plug_cleaning: "Not Done",
  sly_gate_check: "Not Done",
  nozzle_check_cleaning: "Not Done",
  sly_gate_operate: "Not Done",
  nfc_proper_heat: "Not Done",
  nfc_filling_nozzle: "Not Done"
};

const getChecklistDoneCount = (row) =>
  CHECKLIST_FIELDS.reduce(
    (count, field) => (String(row[field.key] || "").toLowerCase() === "done" ? count + 1 : count),
    0
  );

function Laddle() {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [historyRows, setHistoryRows] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [popup, setPopup] = useState({ open: false, type: "success", message: "", code: "" });
  const sampleDateInputRef = useRef(null);

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
        // Browsers may block programmatic picker calls outside strict gestures.
      }
    }
  }, []);

  const closePopup = useCallback(() => {
    setPopup({ open: false, type: "success", message: "", code: "" });
  }, []);

  useEffect(() => {
    if (popup.open && popup.type === "warning") {
      const timer = setTimeout(() => closePopup(), 2000);
      return () => clearTimeout(timer);
    }
  }, [popup, closePopup]);

  const fetchHistory = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }

    try {
      const response = await batchcodeAPI.getLaddleChecklists();
      setHistoryRows(normalizeApiRows(response));
    } catch (error) {
      if (!silent) {
        setPopup({ open: true, type: "warning", message: "Failed to load laddle history.", code: "" });
      }
      console.error("Failed to fetch laddle history", error);
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
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleDateChange = (event) => {
    handleChange(event);
    if (typeof event.target.blur === "function") {
      event.target.blur();
    }
  };

  const validate = () => {
    const nextErrors = {};

    if (!formData.laddle_number) nextErrors.laddle_number = "Required";
    if (!formData.sample_date) nextErrors.sample_date = "Required";
    if (!formData.plate_life) nextErrors.plate_life = "Required";
    if (!formData.timber_man_name.trim()) nextErrors.timber_man_name = "Required";
    if (!formData.laddle_man_name.trim()) nextErrors.laddle_man_name = "Required";
    if (!formData.laddle_foreman_name.trim()) nextErrors.laddle_foreman_name = "Required";
    if (!formData.supervisor_name.trim()) nextErrors.supervisor_name = "Required";
    if (!formData.dip_reading.trim()) nextErrors.dip_reading = "Required";

    CHECKLIST_FIELDS.forEach((field) => {
      if (!formData[field.key]) {
        nextErrors[field.key] = "Required";
      }
    });

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
      const payload = {
        ...formData,
        laddle_number: Number(formData.laddle_number),
        plate_life: formData.plate_life ? Number(formData.plate_life) : null
      };

      const response = await batchcodeAPI.submitLaddleChecklist(payload);
      if (!response?.data?.success) {
        throw new Error("Failed to submit laddle checklist");
      }

      const saved = response?.data?.data || {};
      setPopup({
        open: true,
        type: "success",
        message: "Laddle checklist submitted.",
        code: saved.unique_code || ""
      });
      setFormData(INITIAL_FORM);
      setErrors({});

      if (showHistory) {
        fetchHistory(true);
      }
    } catch (error) {
      console.error("Failed to submit laddle checklist", error);
      setPopup({ open: true, type: "warning", message: "Failed to submit checklist.", code: "" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = useMemo(
    () => [
      { label: "Code", render: (row) => `#${valueOrDash(row.unique_code)}` },
      {
        label: "Date",
        render: (row) => formatDateTime(row.sample_date || row.sample_timestamp || row.created_at)
      },
      { label: "Laddle", key: "laddle_number" },
      { label: "Plate", key: "plate_life" },
      {
        label: "Operators",
        render: (row) => `${valueOrDash(row.timber_man_name)} / ${valueOrDash(row.laddle_man_name)}`
      },
      { label: "Supervisor", key: "supervisor_name" },
      {
        label: "Checks",
        render: (row) => `${getChecklistDoneCount(row)}/${CHECKLIST_FIELDS.length} Done`
      }
    ],
    []
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

      <PageContainer>
        <PageHeader
          title="Laddle Checklist"
          subtitle={showHistory ? "Inspection history records" : "Create a new checklist entry"}
          icon={ClipboardCheck}
          actions={
            <>
              {showHistory ? (
                <SearchField
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Search laddle records"
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
              <h2 className="text-sm font-semibold text-slate-900">Basic Details</h2>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className={labelClass}>Laddle Number *</label>
                  <select
                    name="laddle_number"
                    value={formData.laddle_number}
                    onChange={handleChange}
                    className={`${selectClass} ${errors.laddle_number ? "border-rose-400" : ""}`}
                  >
                    <option value="">Select Laddle</option>
                    {Array.from({ length: 8 }, (_, index) => String(index + 1)).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Sample Date *</label>
                  <input
                    ref={sampleDateInputRef}
                    type="date"
                    name="sample_date"
                    value={formData.sample_date}
                    onChange={handleDateChange}
                    onClick={() => openNativePicker(sampleDateInputRef)}
                    onFocus={() => openNativePicker(sampleDateInputRef)}
                    className={`${inputClass} ${errors.sample_date ? "border-rose-400" : ""}`}
                  />
                </div>

                <div>
                  <label className={labelClass}>Plate Life *</label>
                  <input
                    type="number"
                    name="plate_life"
                    value={formData.plate_life}
                    onChange={handleChange}
                    className={`${inputClass} ${errors.plate_life ? "border-rose-400" : ""}`}
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard>
              <h2 className="text-sm font-semibold text-slate-900">Checklist</h2>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                {CHECKLIST_FIELDS.map((field) => (
                  <div key={field.key}>
                    <label className={labelClass}>{field.label} *</label>
                    <select
                      name={field.key}
                      value={formData[field.key]}
                      onChange={handleChange}
                      className={`${selectClass} ${errors[field.key] ? "border-rose-400" : ""}`}
                    >
                      <option value="Done">Done</option>
                      <option value="Not Done">Not Done</option>
                    </select>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard>
              <h2 className="text-sm font-semibold text-slate-900">Team and Reading</h2>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className={labelClass}>Timber Man *</label>
                  <input
                    name="timber_man_name"
                    value={formData.timber_man_name}
                    onChange={handleChange}
                    className={`${inputClass} ${errors.timber_man_name ? "border-rose-400" : ""}`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Laddle Man *</label>
                  <input
                    name="laddle_man_name"
                    value={formData.laddle_man_name}
                    onChange={handleChange}
                    className={`${inputClass} ${errors.laddle_man_name ? "border-rose-400" : ""}`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Laddle Foreman *</label>
                  <input
                    name="laddle_foreman_name"
                    value={formData.laddle_foreman_name}
                    onChange={handleChange}
                    className={`${inputClass} ${errors.laddle_foreman_name ? "border-rose-400" : ""}`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Supervisor *</label>
                  <input
                    name="supervisor_name"
                    value={formData.supervisor_name}
                    onChange={handleChange}
                    className={`${inputClass} ${errors.supervisor_name ? "border-rose-400" : ""}`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Dip Reading *</label>
                  <input
                    name="dip_reading"
                    value={formData.dip_reading}
                    onChange={handleChange}
                    className={`${inputClass} ${errors.dip_reading ? "border-rose-400" : ""}`}
                  />
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
              getRowKey={(row, index) => row.id || row.unique_code || `laddle-${index}`}
              loading={loading}
              loadingMessage="Loading laddle history..."
              emptyMessage="No laddle records found."
            />
          </SectionCard>
        )}
      </PageContainer>
    </>
  );
}

export default Laddle;
