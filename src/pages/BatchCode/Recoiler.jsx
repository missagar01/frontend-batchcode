import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardPlus, History, RefreshCw, Save } from "lucide-react";
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

const MACHINE_OPTIONS = [
  "SRMPL01",
  "SRMPL02",
  "SRMPL03",
  "SRMPL04",
  "SRMPL05",
  "SRMPL06",
  "SRMPL07",
  "SRMPL08",
  "SRMPL09"
];

const SUPERVISOR_OPTIONS = [
  { value: "", label: "Select Supervisor", hindiLabel: "पर्यवेक्षक चुनें" },
  { value: "Ramdhan Verma", label: "Ramdhan Verma", hindiLabel: "रामधन वर्मा" },
  { value: "Vijay Raut", label: "Vijay Raut", hindiLabel: "विजय राउत" },
  { value: "Yogesh Choudhari", label: "Yogesh Choudhari", hindiLabel: "योगेश चौधरी" },
  { value: "Rajesh Lohar", label: "Rajesh Lohar", hindiLabel: "राजेश लोहार" },
  { value: "Kamal Sahu", label: "Kamal Sahu", hindiLabel: "कमल साहू" },
  { value: "Kamlesh Bisen", label: "Kamlesh Bisen", hindiLabel: "कमलेश बिसेन" },
  { value: "Ranjit Kumar", label: "Ranjit Kumar", hindiLabel: "रंजीत कुमार" },
  { value: "Karmalal Nishad", label: "Karmalal Nishad", hindiLabel: "कर्मलाल निषाद" },
  { value: "Suryakant Jena", label: "Suryakant Jena", hindiLabel: "सूर्यकांत जेना" },
  { value: "Hitesh Barman", label: "Hitesh Barman", hindiLabel: "हितेश बरमन" },
  { value: "Other", label: "Other", hindiLabel: "अन्य" }
];

const INCHARGE_OPTIONS = [
  { value: "", label: "Select Incharge", hindiLabel: "इंचार्ज चुनें" },
  { value: "Toman Lal Sahu", label: "Toman Lal Sahu", hindiLabel: "तोमन लाल साहू" },
  { value: "Ramdhan Verma", label: "Ramdhan Verma", hindiLabel: "रामधन वर्मा" },
  { value: "Ranjit Kumar", label: "Ranjit Kumar", hindiLabel: "रंजीत कुमार" },
  { value: "Other", label: "Other", hindiLabel: "अन्य" }
];

const CONTRACTOR_OPTIONS = [
  { value: "", label: "Select Contractor", hindiLabel: "ठेकेदार चुनें" },
  { value: "Dhananjay (CT)", label: "Dhananjay (CT)", hindiLabel: "धनंजय (सीटी)" },
  { value: "Mumtaz (MDM)", label: "Mumtaz (MDM)", hindiLabel: "मुमताज (एमडीएम)" },
  { value: "Birendra Kumar (BK)", label: "Birendra Kumar (BK)", hindiLabel: "बिरेंद्र कुमार (बीके)" },
  { value: "Sonu Kumar (SK)", label: "Sonu Kumar (SK)", hindiLabel: "सोनू कुमार (एसके)" }
];

const WELDER_OPTIONS = [
  { value: "", label: "Select Welder Name", hindiLabel: "वेल्डर नाम चुनें" },
  { value: "Akhilesh", label: "Akhilesh", hindiLabel: "अखिलेश" },
  { value: "Jitendra", label: "Jitendra", hindiLabel: "जितेंद्र" },
  { value: "Chandan", label: "Chandan", hindiLabel: "चंदन" },
  { value: "Naresh", label: "Naresh", hindiLabel: "नरेश" },
  { value: "Arvind", label: "Arvind", hindiLabel: "अरविंद" },
  { value: "Pradeep", label: "Pradeep", hindiLabel: "प्रदीप" },
  { value: "Kaushal", label: "Kaushal", hindiLabel: "कौशल" },
  { value: "Birendra", label: "Birendra", hindiLabel: "बिरेंद्र" },
  { value: "Sonu", label: "Sonu", hindiLabel: "सोनू" },
  { value: "Amit", label: "Amit", hindiLabel: "अमित" },
  { value: "Dhananjay", label: "Dhananjay", hindiLabel: "धनंजय" },
  { value: "Sabbar Khan", label: "Sabbar Khan", hindiLabel: "सब्बर खान" },
  { value: "Saddam", label: "Saddam", hindiLabel: "सद्दाम" },
  { value: "Manoj", label: "Manoj", hindiLabel: "मनोज" },
  { value: "Govind", label: "Govind", hindiLabel: "गोविंद" },
  { value: "Nirmal", label: "Nirmal", hindiLabel: "निर्मल" },
  { value: "Badshah Khan", label: "Badshah Khan", hindiLabel: "बादशाह खान" },
  { value: "Ankit", label: "Ankit", hindiLabel: "अंकित" },
  { value: "Aanand", label: "Aanand", hindiLabel: "आनंद" },
  { value: "Other", label: "Other", hindiLabel: "अन्य" }
];

const MACHINE_NUMBER_OPTIONS = [
  { value: "", label: "Select Machine Number", hindiLabel: "मशीन नंबर चुनें" },
  { value: "SRMPL01", label: "SRMPL01", hindiLabel: "एसआरएमपीएल01" },
  { value: "SRMPL02", label: "SRMPL02", hindiLabel: "एसआरएमपीएल02" },
  { value: "SRMPL03", label: "SRMPL03", hindiLabel: "एसआरएमपीएल03" },
  { value: "SRMPL04", label: "SRMPL04", hindiLabel: "एसआरएमपीएल04" },
  { value: "SRMPL05", label: "SRMPL05", hindiLabel: "एसआरएमपीएल05" },
  { value: "SRMPL06", label: "SRMPL06", hindiLabel: "एसआरएमपीएल06" },
  { value: "SRMPL07", label: "SRMPL07", hindiLabel: "एसआरएमपीएल07" },
  { value: "SRMPL08", label: "SRMPL08", hindiLabel: "एसआरएमपीएल08" },
  { value: "SRMPL09", label: "SRMPL09", hindiLabel: "एसआरएमपीएल09" }
];

const SHIFT_OPTIONS = [
  { value: "", label: "Select Shift" },
  { value: "Day", label: "Day" },
  { value: "Night", label: "Night" },
  { value: "General", label: "General" }
];

const INITIAL_FORM = {
  hot_coiler_short_code: "",
  size: "",
  supervisor: "",
  supervisor_other: "",
  incharge: "",
  incharge_other: "",
  contractor: "",
  machine_number: "",
  welder_name: "",
  welder_name_other: "",
  shift: ""
};

const buildSelectOptions = (values, includeOther = true) => {
  const unique = Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
  const options = [{ value: "", label: "Select" }, ...unique.map((value) => ({ value, label: value }))];
  if (includeOther) {
    options.push({ value: "Other", label: "Other" });
  }
  return options;
};

const hasStaticOption = (options, value) =>
  options.some((option) => option.value === value);

function Recoiler() {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [historyRows, setHistoryRows] = useState([]);
  const [hotCoilRows, setHotCoilRows] = useState([]);
  const [viewMode, setViewMode] = useState("queue");
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hotCoilCodeLocked, setHotCoilCodeLocked] = useState(false);
  const [popup, setPopup] = useState({ open: false, type: "success", message: "", code: "" });

  const closePopup = useCallback(() => {
    setPopup({ open: false, type: "success", message: "", code: "" });
  }, []);

  useEffect(() => {
    if (popup.open && popup.type === "warning") {
      const timer = setTimeout(() => closePopup(), 2000);
      return () => clearTimeout(timer);
    }
  }, [popup, closePopup]);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }

    try {
      const [hotCoilResponse, recoilerResponse] = await Promise.all([
        batchcodeAPI.getHotCoilHistory(),
        batchcodeAPI.getReCoilHistory()
      ]);

      setHotCoilRows(normalizeApiRows(hotCoilResponse));
      setHistoryRows(normalizeApiRows(recoilerResponse));
    } catch (error) {
      if (!silent) {
        setPopup({ open: true, type: "warning", message: "Failed to load recoiler data.", code: "" });
      }
      console.error("Failed to fetch recoiler data", error);
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

  const machineProgressByCode = useMemo(() => {
    const map = new Map();

    historyRows.forEach((row) => {
      const code = String(row.hot_coiler_short_code || "").trim();
      const machine = String(row.machine_number || "").trim();
      if (!code || !machine) {
        return;
      }

      if (!map.has(code)) {
        map.set(code, new Set());
      }

      map.get(code).add(machine);
    });

    return map;
  }, [historyRows]);

  const latestHotCoilRows = useMemo(() => {
    const map = new Map();

    hotCoilRows.forEach((row) => {
      const code = String(row.unique_code || row.sms_short_code || "").trim();
      if (!code || map.has(code)) {
        return;
      }
      map.set(code, row);
    });

    return Array.from(map.values());
  }, [hotCoilRows]);

  const pendingRows = useMemo(
    () =>
      latestHotCoilRows.filter((row) => {
        const code = String(row.unique_code || row.sms_short_code || "").trim();
        const processedCount = machineProgressByCode.get(code)?.size || 0;
        return code && processedCount < MACHINE_OPTIONS.length;
      }),
    [latestHotCoilRows, machineProgressByCode]
  );

  const filteredQueueRows = useMemo(
    () => pendingRows.filter((row) => matchesSearch(row, searchTerm)),
    [pendingRows, searchTerm]
  );

  const filteredHistoryRows = useMemo(
    () => historyRows.filter((row) => matchesSearch(row, searchTerm)),
    [historyRows, searchTerm]
  );

  const hotCoilCodeOptions = useMemo(() => {
    const hotCoilCodeValues = latestHotCoilRows.map((row) =>
      String(row.unique_code || row.sms_short_code || "").trim()
    );
    return buildSelectOptions(hotCoilCodeValues, false);
  }, [latestHotCoilRows]);

  const handleFieldChange = (field, value) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };

      if (field === "supervisor" && value !== "Other") {
        next.supervisor_other = "";
      }
      if (field === "incharge" && value !== "Other") {
        next.incharge_other = "";
      }
      if (field === "welder_name" && value !== "Other") {
        next.welder_name_other = "";
      }

      return next;
    });
  };

  const openFormForQueueRow = (row) => {
    const code = String(row.unique_code || row.sms_short_code || "");
    const queueSupervisor = String(row.quality_supervisor || "").trim();
    const queueIncharge = String(row.mill_incharge || "").trim();

    setFormData({
      ...INITIAL_FORM,
      hot_coiler_short_code: code,
      size: row.size || "",
      supervisor: hasStaticOption(SUPERVISOR_OPTIONS, queueSupervisor) ? queueSupervisor : queueSupervisor ? "Other" : "",
      supervisor_other: hasStaticOption(SUPERVISOR_OPTIONS, queueSupervisor) ? "" : queueSupervisor,
      incharge: hasStaticOption(INCHARGE_OPTIONS, queueIncharge) ? queueIncharge : queueIncharge ? "Other" : "",
      incharge_other: hasStaticOption(INCHARGE_OPTIONS, queueIncharge) ? "" : queueIncharge
    });
    setHotCoilCodeLocked(true);
    setShowForm(true);
  };

  const validate = () => {
    if (!formData.hot_coiler_short_code.trim()) {
      setPopup({ open: true, type: "warning", message: "Hot coil code is required.", code: "" });
      return false;
    }

    if (!formData.machine_number) {
      setPopup({ open: true, type: "warning", message: "Select machine number.", code: "" });
      return false;
    }

    if (formData.supervisor === "Other" && !formData.supervisor_other.trim()) {
      setPopup({ open: true, type: "warning", message: "Please specify supervisor name.", code: "" });
      return false;
    }

    if (formData.incharge === "Other" && !formData.incharge_other.trim()) {
      setPopup({ open: true, type: "warning", message: "Please specify incharge name.", code: "" });
      return false;
    }

    if (formData.welder_name === "Other" && !formData.welder_name_other.trim()) {
      setPopup({ open: true, type: "warning", message: "Please specify welder name.", code: "" });
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
      const supervisorValue =
        formData.supervisor === "Other" ? formData.supervisor_other.trim() : formData.supervisor || null;
      const inchargeValue =
        formData.incharge === "Other" ? formData.incharge_other.trim() : formData.incharge || null;
      const welderValue =
        formData.welder_name === "Other" ? formData.welder_name_other.trim() : formData.welder_name || null;

      const payload = {
        hot_coiler_short_code: formData.hot_coiler_short_code.trim(),
        size: formData.size || null,
        supervisor: supervisorValue,
        incharge: inchargeValue,
        contractor: formData.contractor || null,
        machine_number: [formData.machine_number],
        welder_name: welderValue,
        shift: formData.shift || null
      };

      const response = await batchcodeAPI.submitReCoil(payload);
      if (!response?.data?.success) {
        throw new Error("Failed to submit recoiler entry");
      }

      const saved = response?.data?.data;
      const firstRow = Array.isArray(saved) ? saved[0] : saved;

      setPopup({
        open: true,
        type: "success",
        message: "Recoiler entry submitted.",
        code: firstRow?.unique_code || ""
      });

      setFormData(INITIAL_FORM);
      setHotCoilCodeLocked(false);
      setShowForm(false);
      fetchData(true);
    } catch (error) {
      console.error("Failed to submit recoiler entry", error);
      setPopup({ open: true, type: "warning", message: "Failed to submit recoiler entry.", code: "" });
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
      { label: "Hot Coil", render: (row) => `#${valueOrDash(row.unique_code || row.sms_short_code)}` },
      { label: "Size", key: "size" },
      {
        label: "Team",
        render: (row) => `${valueOrDash(row.quality_supervisor)} / ${valueOrDash(row.mill_incharge)}`
      },
      {
        label: "Progress",
        render: (row) => {
          const code = String(row.unique_code || row.sms_short_code || "").trim();
          const count = machineProgressByCode.get(code)?.size || 0;
          return `${count}/${MACHINE_OPTIONS.length}`;
        }
      },
      { label: "Time", render: (row) => formatDateTime(row.sample_timestamp || row.created_at || row.createdAt) }
    ],
    [machineProgressByCode]
  );

  const historyColumns = useMemo(
    () => [
      { label: "Time", render: (row) => formatDateTime(row.sample_timestamp || row.created_at || row.createdAt) },
      { label: "Unique", render: (row) => `#${valueOrDash(row.unique_code)}` },
      { label: "Hot Coil", key: "hot_coiler_short_code" },
      { label: "Machine", key: "machine_number" },
      { label: "Shift", key: "shift" },
      {
        label: "Team",
        render: (row) => `${valueOrDash(row.supervisor)} / ${valueOrDash(row.incharge)} / ${valueOrDash(row.contractor)}`
      },
      { label: "Welder", key: "welder_name" }
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
          title="Recoiler"
          subtitle={viewMode === "queue" ? "Process pending hot coil records" : "Submitted recoiler records"}
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
                  setHotCoilCodeLocked(false);
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
              getRowKey={(row, index) => row.id || row.unique_code || `recoiler-pending-${index}`}
              loading={loading}
              loadingMessage="Loading pending hot coil records..."
              emptyMessage="No pending hot coil records."
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
              getRowKey={(row, index) => row.id || row.unique_code || `recoiler-history-${index}`}
              loading={loading}
              loadingMessage="Loading recoiler history..."
              emptyMessage="No recoiler records found."
            />
          </SectionCard>
        )}

        {showForm ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <SectionCard>
              <h2 className="text-sm font-semibold text-slate-900">Recoiler Form</h2>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className={labelClass}>Hot Coil Short Code *</label>
                  {hotCoilCodeLocked ? (
                    <input
                      name="hot_coiler_short_code"
                      value={formData.hot_coiler_short_code}
                      readOnly
                      className={`${inputClass} bg-slate-100 text-slate-700`}
                    />
                  ) : (
                    <select
                      name="hot_coiler_short_code"
                      value={formData.hot_coiler_short_code}
                      onChange={(event) => handleFieldChange("hot_coiler_short_code", event.target.value)}
                      className={selectClass}
                    >
                      <option value="">Select Hot Coil Code</option>
                      {hotCoilCodeOptions
                        .filter((option) => option.value)
                        .map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className={labelClass}>Size</label>
                  <input
                    name="size"
                    value={formData.size}
                    onChange={(event) => handleFieldChange("size", event.target.value)}
                    readOnly={hotCoilCodeLocked}
                    className={`${inputClass} ${hotCoilCodeLocked ? "bg-slate-100 text-slate-700" : ""}`}
                  />
                </div>

                <div>
                  <label className={labelClass}>Shift</label>
                  <select
                    name="shift"
                    value={formData.shift}
                    onChange={(event) => handleFieldChange("shift", event.target.value)}
                    className={selectClass}
                  >
                    {SHIFT_OPTIONS.map((option) => (
                      <option key={option.value || "shift-blank"} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Supervisor / पर्यवेक्षक *</label>
                  <select
                    name="supervisor"
                    value={formData.supervisor}
                    onChange={(event) => handleFieldChange("supervisor", event.target.value)}
                    className={selectClass}
                  >
                    {SUPERVISOR_OPTIONS.map((option) => (
                      <option key={`supervisor-${option.value || "blank"}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                {formData.supervisor === "Other" ? (
                  <div>
                    <label className={labelClass}>Supervisor Name *</label>
                    <input
                      name="supervisor_other"
                      value={formData.supervisor_other}
                      onChange={(event) => handleFieldChange("supervisor_other", event.target.value)}
                      className={inputClass}
                    />
                  </div>
                ) : null}

                <div>
                  <label className={labelClass}>Incharge / इंचार्ज *</label>
                  <select
                    name="incharge"
                    value={formData.incharge}
                    onChange={(event) => handleFieldChange("incharge", event.target.value)}
                    className={selectClass}
                  >
                    {INCHARGE_OPTIONS.map((option) => (
                      <option key={`incharge-${option.value || "blank"}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                {formData.incharge === "Other" ? (
                  <div>
                    <label className={labelClass}>Incharge Name *</label>
                    <input
                      name="incharge_other"
                      value={formData.incharge_other}
                      onChange={(event) => handleFieldChange("incharge_other", event.target.value)}
                      className={inputClass}
                    />
                  </div>
                ) : null}

                <div>
                  <label className={labelClass}>Contractor / ठेकेदार *</label>
                  <select
                    name="contractor"
                    value={formData.contractor}
                    onChange={(event) => handleFieldChange("contractor", event.target.value)}
                    className={selectClass}
                  >
                    {CONTRACTOR_OPTIONS.map((option) => (
                      <option key={`contractor-${option.value || "blank"}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Welder Name / वेल्डर नाम *</label>
                  <select
                    name="welder_name"
                    value={formData.welder_name}
                    onChange={(event) => handleFieldChange("welder_name", event.target.value)}
                    className={selectClass}
                  >
                    {WELDER_OPTIONS.map((option) => (
                      <option key={`welder-${option.value || "blank"}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                {formData.welder_name === "Other" ? (
                  <div>
                    <label className={labelClass}>Welder Name *</label>
                    <input
                      name="welder_name_other"
                      value={formData.welder_name_other}
                      onChange={(event) => handleFieldChange("welder_name_other", event.target.value)}
                      className={inputClass}
                    />
                  </div>
                ) : null}

                <div>
                  <label className={labelClass}>Machine Number / मशीन नंबर *</label>
                  <select
                    name="machine_number"
                    value={formData.machine_number}
                    onChange={(event) => handleFieldChange("machine_number", event.target.value)}
                    className={selectClass}
                  >
                    {MACHINE_NUMBER_OPTIONS.map((option) => (
                      <option key={`machine-${option.value || "blank"}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
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

export default Recoiler;
