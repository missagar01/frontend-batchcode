import { useState, useEffect } from "react";
import { Loader2, FileText, Calendar, User, Package, AlertCircle } from "lucide-react";
import { o2dAPI } from "../../services/o2dAPI";
import { useAuth } from "../../context/AuthContext";
import { format } from "date-fns";

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

    useEffect(() => {
        fetchEnquiries();
    }, []);

    const fetchEnquiries = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await o2dAPI.getAllEnquiries();
            if (response.data.success) {
                setEnquiries(response.data.data);
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 p-4 md:p-8">
            <div className="max-w-[1600px] mx-auto space-y-6">

                {/* Header */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-xl shadow-lg shadow-blue-500/20">
                                <FileText className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900">Enquiry List</h1>
                                <p className="text-sm text-slate-500 mt-0.5">
                                    {user?.role === 'admin' ? 'All enquiries' : 'Your enquiries'}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-slate-500">Total Enquiries</p>
                            <p className="text-3xl font-bold text-blue-600">{enquiries.length}</p>
                        </div>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-lg flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
                        <p className="text-rose-800 font-semibold">{error}</p>
                    </div>
                )}

                {/* Table Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="text-center space-y-3">
                                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto" />
                                <p className="text-slate-600 font-medium">Loading enquiries...</p>
                            </div>
                        </div>
                    ) : enquiries.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 px-4">
                            <FileText className="w-16 h-16 text-slate-300 mb-4" />
                            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Enquiries Found</h3>
                            <p className="text-slate-500 text-center">
                                {user?.role === 'admin'
                                    ? 'No enquiries have been created yet.'
                                    : 'You haven\'t created any enquiries yet.'}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto max-h-[70vh] overflow-y-auto custom-scrollbar">
                            {/* Fixed Header Table */}
                            <div className="relative">
                                <table className="w-full border-collapse">
                                    <thead className="sticky top-0 z-10 bg-gradient-to-r from-slate-50 to-slate-100 shadow-sm">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-xs font-extrabold text-slate-700 uppercase tracking-wider border-b-2 border-slate-200 whitespace-nowrap">
                                                #ID
                                            </th>
                                            <th className="px-6 py-4 text-left text-xs font-extrabold text-slate-700 uppercase tracking-wider border-b-2 border-slate-200 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4 text-blue-500" />
                                                    Enquiry Date
                                                </div>
                                            </th>
                                            <th className="px-6 py-4 text-left text-xs font-extrabold text-slate-700 uppercase tracking-wider border-b-2 border-slate-200 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <User className="w-4 h-4 text-emerald-500" />
                                                    Customer
                                                </div>
                                            </th>
                                            <th className="px-6 py-4 text-left text-xs font-extrabold text-slate-700 uppercase tracking-wider border-b-2 border-slate-200 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <Package className="w-4 h-4 text-purple-500" />
                                                    Item Type
                                                </div>
                                            </th>
                                            <th className="px-6 py-4 text-left text-xs font-extrabold text-slate-700 uppercase tracking-wider border-b-2 border-slate-200 whitespace-nowrap">
                                                Size
                                            </th>
                                            <th className="px-6 py-4 text-left text-xs font-extrabold text-slate-700 uppercase tracking-wider border-b-2 border-slate-200 whitespace-nowrap">
                                                Thickness (mm)
                                            </th>
                                            <th className="px-6 py-4 text-left text-xs font-extrabold text-slate-700 uppercase tracking-wider border-b-2 border-slate-200 whitespace-nowrap">
                                                Quantity (MT)
                                            </th>
                                            <th className="px-6 py-4 text-left text-xs font-extrabold text-slate-700 uppercase tracking-wider border-b-2 border-slate-200 whitespace-nowrap">
                                                Sales Executive
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-100">
                                        {enquiries.map((enquiry, index) => (
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
                    )}
                </div>
            </div>
        </div>
    );
};

export default EnqList;
