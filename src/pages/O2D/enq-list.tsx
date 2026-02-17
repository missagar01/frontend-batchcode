import { useState, useEffect, useMemo } from "react";
import { Loader2, FileText, Calendar, User, Package, AlertCircle, Download, Filter, X } from "lucide-react";
import { o2dAPI } from "../../services/o2dAPI";
import { useAuth } from "../../context/AuthContext";
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import * as XLSX from "xlsx";

interface EnquiryRecord {
    id: number;
    item_type: string;
    size: string;
    thickness: number;
    enquiry_date: string;
    customer: string;
    quantity: number | null;
    sales_executive: string;
    created_at: string;
}

const EnqList = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [enquiries, setEnquiries] = useState<EnquiryRecord[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Filter States
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    useEffect(() => {
        if (user) {
            fetchEnquiries();
        }
    }, [user]);

    const fetchEnquiries = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await o2dAPI.getAllEnquiries();
            if (response.data.success) {
                let data = response.data.data;

                // Filter logic: If role is 'user', only show matched Sales Executive
                if (user?.role === 'user') {
                    const currentUserName = user.user_name || user.username || "";
                    data = data.filter((enq: EnquiryRecord) =>
                        enq.sales_executive?.trim().toLowerCase() === currentUserName.trim().toLowerCase()
                    );
                }

                setEnquiries(data);
            }
        } catch (err: any) {
            console.error("Error fetching enquiries:", err);
            setError(err.response?.data?.message || "Failed to fetch enquiries");
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        try {
            return format(new Date(dateString), "dd MMM yyyy");
        } catch {
            return dateString;
        }
    };

    // Filter Logic
    const filteredEnquiries = useMemo(() => {
        if (!startDate && !endDate) return enquiries;

        return enquiries.filter((enq) => {
            if (!enq.enquiry_date) return false;
            try {
                const enqDate = parseISO(enq.enquiry_date);
                const start = startDate ? startOfDay(parseISO(startDate)) : null;
                const end = endDate ? endOfDay(parseISO(endDate)) : null;

                if (start && end) {
                    return isWithinInterval(enqDate, { start, end });
                } else if (start) {
                    return enqDate >= start;
                } else if (end) {
                    return enqDate <= end;
                }
                return true;
            } catch (e) {
                return false;
            }
        });
    }, [enquiries, startDate, endDate]);


    // Download Handler
    const handleDownload = () => {
        if (filteredEnquiries.length === 0) return;

        const dataToExport = filteredEnquiries.map(enq => ({
            "ID": enq.id,
            "Date": formatDate(enq.enquiry_date),
            "Customer": enq.customer,
            "Item Type": enq.item_type,
            "Size": enq.size,
            "Thickness (mm)": enq.thickness,
            "Quantity (MT)": enq.quantity || 0,
            "Sales Executive": enq.sales_executive
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Enquiries");

        const fileName = `Enquiry_List_${startDate || 'All'}_to_${endDate || 'All'}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };

    const clearFilters = () => {
        setStartDate("");
        setEndDate("");
    };

    return (
        <div className="min-h-screen bg-slate-50/50 p-4 md:p-6 lg:p-8">
            <div className="max-w-[1600px] mx-auto space-y-6">

                {/* Header */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-6 space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-xl shadow-lg shadow-blue-500/20 shrink-0">
                                <FileText className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl md:text-2xl font-bold text-slate-900">Enquiry List</h1>
                                <p className="text-xs md:text-sm text-slate-500 mt-0.5">
                                    {user?.role === 'admin' ? 'All enquiries' : 'Your enquiries'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-8 md:text-right border-t md:border-t-0 border-slate-100 pt-4 md:pt-0">
                            <div className="text-right">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Count</p>
                                <p className="text-lg font-bold text-slate-600">{filteredEnquiries.length}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Quantity</p>
                                <p className="text-2xl md:text-3xl font-bold text-blue-600 flex items-baseline justify-end gap-1">
                                    {filteredEnquiries.reduce((sum, enq) => sum + (Number(enq.quantity) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                    <span className="text-sm text-slate-400 font-medium">MT</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Filters & Actions */}
                    <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between gap-4 pt-4 border-t border-slate-100">
                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <div className="relative w-full sm:w-auto hover:bg-slate-100/50 rounded-lg transition-colors group">
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        onClick={(e) => {
                                            try {
                                                (e.target as HTMLInputElement).showPicker();
                                            } catch (err) {
                                                console.debug("Date picker not supported directly via click", err);
                                            }
                                        }}
                                        className="w-full sm:w-40 pl-9 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer relative z-10"
                                    />
                                    <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors z-20 pointer-events-none" />
                                    <span className="absolute -top-2 left-2 px-1 bg-white text-[10px] font-bold text-slate-400 uppercase tracking-wider z-20">From</span>
                                </div>
                                <span className="text-slate-300 font-bold">-</span>
                                <div className="relative w-full sm:w-auto hover:bg-slate-100/50 rounded-lg transition-colors group">
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        onClick={(e) => {
                                            try {
                                                (e.target as HTMLInputElement).showPicker();
                                            } catch (err) {
                                                console.debug("Date picker not supported directly via click", err);
                                            }
                                        }}
                                        className="w-full sm:w-40 pl-9 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer relative z-10"
                                    />
                                    <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors z-20 pointer-events-none" />
                                    <span className="absolute -top-2 left-2 px-1 bg-white text-[10px] font-bold text-slate-400 uppercase tracking-wider z-20">To</span>
                                </div>
                            </div>

                            {(startDate || endDate) && (
                                <button
                                    onClick={clearFilters}
                                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                    title="Clear Dates"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            )}
                        </div>

                        <button
                            onClick={handleDownload}
                            disabled={filteredEnquiries.length === 0}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                        >
                            <Download className="w-4 h-4" />
                            <span>Export CSV</span>
                        </button>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-lg flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
                        <p className="text-rose-800 font-semibold">{error}</p>
                    </div>
                )}

                {/* Content Area */}
                <div className="bg-transparent lg:bg-white rounded-2xl shadow-none lg:shadow-sm lg:border border-slate-200 overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 lg:border-0">
                            <div className="text-center space-y-3">
                                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto" />
                                <p className="text-slate-600 font-medium">Loading enquiries...</p>
                            </div>
                        </div>
                    ) : filteredEnquiries.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 px-4 bg-white rounded-2xl border border-slate-200 lg:border-0">
                            <FileText className="w-16 h-16 text-slate-300 mb-4" />
                            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Enquiries Found</h3>
                            <p className="text-slate-500 text-center">
                                {startDate || endDate ? "No records match your date selection." : (user?.role === 'admin'
                                    ? 'No enquiries have been created yet.'
                                    : 'You haven\'t created any enquiries yet.')}
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Mobile/Tablet Card View (Visible < 1024px) */}
                            <div className="lg:hidden space-y-4">
                                {filteredEnquiries.map((enquiry) => (
                                    <div key={enquiry.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-700 font-bold text-xs">
                                                    #{enquiry.id}
                                                </span>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Date</span>
                                                    <span className="text-xs font-semibold text-slate-700">
                                                        {formatDate(enquiry.enquiry_date)}
                                                    </span>
                                                </div>
                                            </div>
                                            {enquiry.quantity && (
                                                <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg text-xs font-bold shadow-sm">
                                                    {enquiry.quantity} MT
                                                </span>
                                            )}
                                        </div>

                                        <div>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Customer</p>
                                            <p className="text-sm font-bold text-slate-900 line-clamp-2">{enquiry.customer}</p>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2 py-3 border-t border-b border-slate-50 bg-slate-50/50 rounded-lg px-2">
                                            <div className="text-center border-r border-slate-200 last:border-0">
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">Type</p>
                                                <span className="text-xs font-bold text-purple-700 block mt-0.5">
                                                    {enquiry.item_type}
                                                </span>
                                            </div>
                                            <div className="text-center border-r border-slate-200 last:border-0">
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">Size</p>
                                                <p className="text-xs font-bold text-slate-700 block mt-0.5">{enquiry.size}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">Thick</p>
                                                <p className="text-xs font-bold text-slate-700 block mt-0.5">{enquiry.thickness} mm</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-1">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-[10px] shadow-sm">
                                                    {enquiry.sales_executive?.charAt(0)?.toUpperCase() || 'N'}
                                                </div>
                                                <span className="text-xs font-semibold text-slate-600">
                                                    {enquiry.sales_executive || 'Unknown'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Desktop Table View (Visible >= 1024px) */}
                            <div className="hidden lg:block overflow-x-auto max-h-[70vh] overflow-y-auto custom-scrollbar">
                                <div className="relative">
                                    <table className="w-full border-collapse text-left">
                                        <thead className="sticky top-0 z-10 bg-gradient-to-r from-slate-50 to-slate-100 shadow-sm">
                                            <tr>
                                                <th className="px-6 py-4 text-xs font-extrabold text-slate-700 uppercase tracking-wider border-b-2 border-slate-200 whitespace-nowrap">
                                                    #ID
                                                </th>
                                                <th className="px-6 py-4 text-xs font-extrabold text-slate-700 uppercase tracking-wider border-b-2 border-slate-200 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="w-4 h-4 text-blue-500" />
                                                        Enquiry Date
                                                    </div>
                                                </th>
                                                <th className="px-6 py-4 text-xs font-extrabold text-slate-700 uppercase tracking-wider border-b-2 border-slate-200 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <User className="w-4 h-4 text-emerald-500" />
                                                        Customer
                                                    </div>
                                                </th>
                                                <th className="px-6 py-4 text-xs font-extrabold text-slate-700 uppercase tracking-wider border-b-2 border-slate-200 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <Package className="w-4 h-4 text-purple-500" />
                                                        Item Type
                                                    </div>
                                                </th>
                                                <th className="px-6 py-4 text-xs font-extrabold text-slate-700 uppercase tracking-wider border-b-2 border-slate-200 whitespace-nowrap">
                                                    Size
                                                </th>
                                                <th className="px-6 py-4 text-xs font-extrabold text-slate-700 uppercase tracking-wider border-b-2 border-slate-200 whitespace-nowrap">
                                                    Thickness (mm)
                                                </th>
                                                <th className="px-6 py-4 text-xs font-extrabold text-slate-700 uppercase tracking-wider border-b-2 border-slate-200 whitespace-nowrap">
                                                    Quantity (MT)
                                                </th>
                                                <th className="px-6 py-4 text-xs font-extrabold text-slate-700 uppercase tracking-wider border-b-2 border-slate-200 whitespace-nowrap">
                                                    Sales Executive
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-100">
                                            {filteredEnquiries.map((enquiry, index) => (
                                                <tr
                                                    key={enquiry.id}
                                                    className="hover:bg-blue-50/50 transition-colors group"
                                                >
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-slate-700 font-bold text-sm group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors">
                                                            {index + 1}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-semibold text-slate-900">
                                                                {formatDate(enquiry.enquiry_date)}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-sm font-semibold text-slate-900 max-w-xs truncate" title={enquiry.customer}>
                                                            {enquiry.customer}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
                                                            {enquiry.item_type}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="text-sm font-semibold text-slate-700">
                                                            {enquiry.size}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="inline-flex items-center px-3 py-1 rounded-lg bg-slate-100 text-slate-700 text-sm font-bold">
                                                            {enquiry.thickness} mm
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {enquiry.quantity ? (
                                                            <span className="inline-flex items-center px-3 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-sm font-bold">
                                                                {enquiry.quantity} MT
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-400 text-sm italic">N/A</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                                                                {enquiry.sales_executive?.charAt(0)?.toUpperCase() || 'N'}
                                                            </div>
                                                            <span className="text-sm font-semibold text-slate-700">
                                                                {enquiry.sales_executive || 'N/A'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EnqList;
