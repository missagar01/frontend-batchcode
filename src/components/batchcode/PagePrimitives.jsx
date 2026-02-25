import { AlertCircle, CheckCircle2, Search } from "lucide-react";

export const pageContainerClass = "p-3 sm:p-4 md:p-6 max-w-screen-2xl mx-auto space-y-3";
export const cardClass = "bg-white shadow rounded-lg p-3 space-y-3";
export const labelClass = "block text-xs font-medium text-slate-600";
export const inputClass = "h-9 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100";
export const selectClass = `${inputClass} appearance-none bg-white`;
export const textareaClass = "w-full min-h-24 rounded-md border border-slate-300 p-3 text-sm text-slate-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 resize-y";
export const primaryButtonClass = "h-9 md:h-10 w-full sm:w-auto rounded-md bg-slate-900 px-3 text-xs md:text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2";
export const secondaryButtonClass = "h-9 md:h-10 rounded-md border border-slate-300 bg-white px-3 text-xs md:text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2";

const joinClass = (...parts) => parts.filter(Boolean).join(" ");
const isEmpty = (value) => value === null || value === undefined || value === "";

const getRenderedValue = (column, row, index) => {
  if (typeof column.render === "function") {
    return column.render(row, index);
  }

  if (!column.key) {
    return "-";
  }

  const value = row[column.key];
  return isEmpty(value) ? "-" : String(value);
};

export function PageContainer({ children }) {
  return <main className={pageContainerClass}>{children}</main>;
}

export function SectionCard({ children, className = "" }) {
  return <section className={joinClass(cardClass, className)}>{children}</section>;
}

export function PageHeader({ title, subtitle, icon: Icon, actions = null }) {
  return (
    <SectionCard>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2">
          {Icon ? (
            <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-md bg-red-600 text-white">
              <Icon size={14} />
            </span>
          ) : null}
          <div>
            <h1 className="text-base md:text-lg font-semibold text-slate-900">{title}</h1>
            {subtitle ? <p className="text-xs text-slate-600">{subtitle}</p> : null}
          </div>
        </div>
        {actions ? <div className="flex w-full sm:w-auto gap-2">{actions}</div> : null}
      </div>
    </SectionCard>
  );
}

export function SearchField({ value, onChange, placeholder = "Search" }) {
  return (
    <div className="relative flex-1 sm:w-64">
      <Search size={14} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-9 md:h-10 w-full rounded-md border border-slate-300 pl-8 pr-3 text-sm text-slate-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
      />
    </div>
  );
}

export function StatusModal({ open, type = "success", message = "", code = "", onClose }) {
  if (!open) {
    return null;
  }

  const success = type === "success";

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-900/40 p-3">
      <div className="w-full max-w-sm rounded-lg bg-white p-4 shadow-xl space-y-3">
        <div
          className={joinClass(
            "mx-auto flex h-10 w-10 items-center justify-center rounded-full",
            success ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
          )}
        >
          {success ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
        </div>
        <p className="text-center text-sm text-slate-700">{message}</p>
        {success && code ? (
          <p className="text-center text-xs text-slate-600">
            Entry ID: <span className="font-semibold text-red-600">#{code}</span>
          </p>
        ) : null}
        <button type="button" onClick={onClose} className="h-9 w-full rounded-md bg-red-600 text-xs text-white hover:bg-red-700">
          Close
        </button>
      </div>
    </div>
  );
}

export function ImagePreviewModal({
  open,
  imageUrl = "",
  title = "Image Preview",
  onClose
}) {
  if (!open || !imageUrl) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[1150] flex items-center justify-center bg-slate-900/70 p-2 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="w-full max-w-5xl rounded-lg bg-white shadow-xl max-h-[94dvh] overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 sm:px-4">
          <h3 className="text-sm md:text-base font-semibold text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="h-8 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
        <div className="flex h-[calc(94dvh-3rem)] items-center justify-center bg-slate-100 p-2 sm:p-3">
          <img
            src={imageUrl}
            alt={title}
            className="max-h-full w-full object-contain rounded-md"
          />
        </div>
      </div>
    </div>
  );
}

export function ResponsiveDataTable({
  rows,
  columns,
  getRowKey,
  loading = false,
  loadingMessage = "Loading records...",
  emptyMessage = "No records found."
}) {
  if (loading) {
    return <div className="py-6 text-center text-xs text-slate-600">{loadingMessage}</div>;
  }

  if (!rows.length) {
    return <div className="py-8 text-center text-sm text-slate-600">{emptyMessage}</div>;
  }

  return (
    <>
      <div className="space-y-2 md:hidden">
        {rows.map((row, index) => (
          <article key={getRowKey(row, index)} className="bg-white shadow rounded-lg p-3 text-xs space-y-1">
            {columns.map((column) => (
              <p key={`${column.label}-${index}`} className="text-slate-700 break-words">
                <span className="font-medium text-slate-600">{column.label}:</span>{" "}
                {getRenderedValue(column, row, index)}
              </p>
            ))}
          </article>
        ))}
      </div>

      <div className="hidden md:block">
        <table className="w-full table-auto text-xs md:text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              {columns.map((column) => (
                <th
                  key={column.label}
                  className={joinClass(
                    "px-2 md:px-3 py-1 md:py-2 text-left font-medium text-slate-600",
                    column.headerClassName
                  )}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={getRowKey(row, index)} className="border-b border-slate-100 align-top">
                {columns.map((column) => (
                  <td
                    key={`${column.label}-${index}`}
                    className={joinClass(
                      "px-2 md:px-3 py-1 md:py-2 text-slate-700 break-words",
                      column.cellClassName
                    )}
                  >
                    {getRenderedValue(column, row, index)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function formatCountLabel(count, noun) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}
