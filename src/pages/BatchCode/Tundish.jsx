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

const TUNDISH_CHECKS = [
  { key: "nozzle_plate_check", label: "Nozzle Plate Check" },
  { key: "well_block_check", label: "Well Block Check" },
  { key: "board_proper_set", label: "Board Proper Set" },
  { key: "board_sand_filling", label: "Board Sand Filling" },
  { key: "refractory_slag_cleaning", label: "Refractory Slag Cleaning" }
];

const HANDOVER_CHECKS = [
  { key: "handover_proper_check", label: "Proper Handover Check" },
  { key: "handover_nozzle_installed", label: "Nozzle Installed" },
  { key: "handover_masala_inserted", label: "Masala Inserted" }
];

const INITIAL_FORM = {
  tundish_number: "",
  nozzle_plate_check: "Done",
  well_block_check: "Done",
  board_proper_set: "Done",
  board_sand_filling: "Done",
  refractory_slag_cleaning: "Done",
  tundish_mession_name: "",
  handover_proper_check: "Yes",
  handover_nozzle_installed: "Yes",
  handover_masala_inserted: "Yes",
  stand1_mould_operator: "",
  stand2_mould_operator: "",
  timber_man_name: "",
  laddle_operator_name: "",
  shift_incharge_name: "",
  forman_name: "",
  sample_date: "",
  sample_time: ""
};

const countDone = (row, list, doneValue) =>
  list.reduce((count, item) => (String(row[item.key] || "").toLowerCase() === doneValue ? count + 1 : count), 0);

function Tundish() {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [historyRows, setHistoryRows] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [popup, setPopup] = useState({ open: false, type: "success", message: "", code: "" });
  const sampleDateInputRef = useRef(null);
  const sampleTimeInputRef = useRef(null);

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
      const response = await batchcodeAPI.getTundishChecklists();
      setHistoryRows(normalizeApiRows(response));
    } catch (error) {
      if (!silent) {
        setPopup({ open: true, type: "warning", message: "Failed to load tundish history.", code: "" });
      }
      console.error("Failed to fetch tundish history", error);
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

  const handlePickerValueChange = (event) => {
    handleChange(event);
    if (typeof event.target.blur === "function") {
      event.target.blur();
    }
  };

  const validate = () => {
    const nextErrors = {};

    if (!formData.tundish_number) nextErrors.tundish_number = "Required";
    if (!formData.tundish_mession_name.trim()) nextErrors.tundish_mession_name = "Required";
    if (!formData.stand1_mould_operator.trim()) nextErrors.stand1_mould_operator = "Required";
    if (!formData.stand2_mould_operator.trim()) nextErrors.stand2_mould_operator = "Required";
    if (!formData.timber_man_name.trim()) nextErrors.timber_man_name = "Required";
    if (!formData.laddle_operator_name.trim()) nextErrors.laddle_operator_name = "Required";
    if (!formData.shift_incharge_name.trim()) nextErrors.shift_incharge_name = "Required";
    if (!formData.forman_name.trim()) nextErrors.forman_name = "Required";

    TUNDISH_CHECKS.forEach((item) => {
      if (!formData[item.key]) {
        nextErrors[item.key] = "Required";
      }
    });

    HANDOVER_CHECKS.forEach((item) => {
      if (!formData[item.key]) {
        nextErrors[item.key] = "Required";
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
      const sampleDate = String(formData.sample_date || "").trim();
      const sampleTime = String(formData.sample_time || "").trim();
      const fallbackDate = new Date().toISOString().slice(0, 10);
      const sampleTimestamp = sampleDate
        ? `${sampleDate}T${sampleTime || "00:00"}`
        : sampleTime
          ? `${fallbackDate}T${sampleTime}`
          : null;

      const payload = {
        tundish_number: Number(formData.tundish_number),
        nozzle_plate_check: formData.nozzle_plate_check,
        well_block_check: formData.well_block_check,
        board_proper_set: formData.board_proper_set,
        board_sand_filling: formData.board_sand_filling,
        refractory_slag_cleaning: formData.refractory_slag_cleaning,
        tundish_mession_name: formData.tundish_mession_name.trim(),
        handover_proper_check: formData.handover_proper_check,
        handover_nozzle_installed: formData.handover_nozzle_installed,
        handover_masala_inserted: formData.handover_masala_inserted,
        stand1_mould_operator: formData.stand1_mould_operator.trim(),
        stand2_mould_operator: formData.stand2_mould_operator.trim(),
        timber_man_name: formData.timber_man_name.trim(),
        laddle_operator_name: formData.laddle_operator_name.trim(),
        shift_incharge_name: formData.shift_incharge_name.trim(),
        forman_name: formData.forman_name.trim(),
        ...(sampleTimestamp ? { sample_timestamp: sampleTimestamp } : {})
      };

      const response = await batchcodeAPI.submitTundishChecklist(payload);
      if (!response?.data?.success) {
        throw new Error("Failed to submit tundish checklist");
      }

      const saved = response?.data?.data || {};
      setPopup({
        open: true,
        type: "success",
        message: "Tundish checklist submitted.",
        code: saved.unique_code || ""
      });
      setFormData(INITIAL_FORM);
      setErrors({});

      if (showHistory) {
        fetchHistory(true);
      }
    } catch (error) {
      console.error("Failed to submit tundish checklist", error);
      setPopup({ open: true, type: "warning", message: "Failed to submit checklist.", code: "" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = useMemo(
    () => [
      { label: "Code", render: (row) => `#${valueOrDash(row.unique_code)}` },
      {
        label: "Sample",
        render: (row) => formatDateTime(row.sample_timestamp || row.created_at || row.sample_date)
      },
      { label: "Tundish", key: "tundish_number" },
      {
        label: "Checklist",
        render: (row) => `${countDone(row, TUNDISH_CHECKS, "done")}/${TUNDISH_CHECKS.length} Done`
      },
      {
        label: "Handover",
        render: (row) => `${countDone(row, HANDOVER_CHECKS, "yes")}/${HANDOVER_CHECKS.length} Yes`
      },
      {
        label: "Operators",
        render: (row) => `${valueOrDash(row.stand1_mould_operator)} / ${valueOrDash(row.stand2_mould_operator)}`
      },
      {
        label: "Incharge",
        render: (row) => `${valueOrDash(row.shift_incharge_name)} / ${valueOrDash(row.forman_name)}`
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
          title="Tundish Checklist"
          subtitle={showHistory ? "Inspection history records" : "Create a new tundish entry"}
          icon={ClipboardCheck}
          actions={
            <>
              {showHistory ? (
                <SearchField
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Search tundish records"
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
                  <label className={labelClass}>Tundish Number *</label>
                  <select
                    name="tundish_number"
                    value={formData.tundish_number}
                    onChange={handleChange}
                    className={`${selectClass} ${errors.tundish_number ? "border-rose-400" : ""}`}
                  >
                    <option value="">Select Tundish</option>
                    {Array.from({ length: 6 }, (_, index) => String(index + 1)).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Sample Date</label>
                  <input
                    ref={sampleDateInputRef}
                    type="date"
                    name="sample_date"
                    value={formData.sample_date}
                    onChange={handlePickerValueChange}
                    onClick={() => openNativePicker(sampleDateInputRef)}
                    onFocus={() => openNativePicker(sampleDateInputRef)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Sample Time</label>
                  <input
                    ref={sampleTimeInputRef}
                    type="time"
                    name="sample_time"
                    value={formData.sample_time}
                    onChange={handlePickerValueChange}
                    onClick={() => openNativePicker(sampleTimeInputRef)}
                    onFocus={() => openNativePicker(sampleTimeInputRef)}
                    className={inputClass}
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard>
              <h2 className="text-sm font-semibold text-slate-900">Tundish Checks</h2>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                {TUNDISH_CHECKS.map((item) => (
                  <div key={item.key}>
                    <label className={labelClass}>{item.label} *</label>
                    <select
                      name={item.key}
                      value={formData[item.key]}
                      onChange={handleChange}
                      className={`${selectClass} ${errors[item.key] ? "border-rose-400" : ""}`}
                    >
                      <option value="Done">Done</option>
                      <option value="Not Done">Not Done</option>
                    </select>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard>
              <h2 className="text-sm font-semibold text-slate-900">Handover Checks</h2>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                {HANDOVER_CHECKS.map((item) => (
                  <div key={item.key}>
                    <label className={labelClass}>{item.label} *</label>
                    <select
                      name={item.key}
                      value={formData[item.key]}
                      onChange={handleChange}
                      className={`${selectClass} ${errors[item.key] ? "border-rose-400" : ""}`}
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard>
              <h2 className="text-sm font-semibold text-slate-900">Operators</h2>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className={labelClass}>Tundish Mession *</label>
                  <input
                    name="tundish_mession_name"
                    value={formData.tundish_mession_name}
                    onChange={handleChange}
                    className={`${inputClass} ${errors.tundish_mession_name ? "border-rose-400" : ""}`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Stand 1 Operator *</label>
                  <input
                    name="stand1_mould_operator"
                    value={formData.stand1_mould_operator}
                    onChange={handleChange}
                    className={`${inputClass} ${errors.stand1_mould_operator ? "border-rose-400" : ""}`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Stand 2 Operator *</label>
                  <input
                    name="stand2_mould_operator"
                    value={formData.stand2_mould_operator}
                    onChange={handleChange}
                    className={`${inputClass} ${errors.stand2_mould_operator ? "border-rose-400" : ""}`}
                  />
                </div>
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
                  <label className={labelClass}>Laddle Operator *</label>
                  <input
                    name="laddle_operator_name"
                    value={formData.laddle_operator_name}
                    onChange={handleChange}
                    className={`${inputClass} ${errors.laddle_operator_name ? "border-rose-400" : ""}`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Shift Incharge *</label>
                  <input
                    name="shift_incharge_name"
                    value={formData.shift_incharge_name}
                    onChange={handleChange}
                    className={`${inputClass} ${errors.shift_incharge_name ? "border-rose-400" : ""}`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Forman *</label>
                  <input
                    name="forman_name"
                    value={formData.forman_name}
                    onChange={handleChange}
                    className={`${inputClass} ${errors.forman_name ? "border-rose-400" : ""}`}
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
              getRowKey={(row, index) => row.id || row.unique_code || `tundish-${index}`}
              loading={loading}
              loadingMessage="Loading tundish history..."
              emptyMessage="No tundish records found."
            />
          </SectionCard>
        )}
      </PageContainer>
    </>
  );
}

export default Tundish;
