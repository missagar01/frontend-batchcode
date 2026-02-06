import React, { useEffect, useState, useMemo } from 'react';
import { Search, Calendar, Clock, User as UserIcon, LayoutGrid, List } from 'lucide-react';
import { o2dAPI } from "../../services/o2dAPI";
import { useAuth } from "../../context/AuthContext";
import FollowUpModal from './FollowUpModal';

interface FollowUp {
    id: number;
    client_name: string;
    sales_person: string;
    actual_order: number;
    actual_order_date: string | null;
    date_of_calling: string;
    next_calling_date: string | null;
    status: string;
    isBooked: boolean;
    quantity: string | number;
    orderDate: string | null;
    nextCall: string | null;
    salesPerson: string;
    customerName: string;
    date: string;
}

const formatDate = (date: string | null | undefined) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return date;
    return d.toLocaleDateString();
};

const formatDateTime = (date: string | null | undefined) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return date;
    return d.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
};

const FollowUpsPage: React.FC = () => {
    const { user } = useAuth();
    const [followups, setFollowups] = useState<FollowUp[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedFollowup, setSelectedFollowup] = useState<FollowUp | null>(null);

    const handleCalendarClick = (followup: FollowUp) => {
        setSelectedFollowup(followup);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setSelectedFollowup(null);
    };

    const handleModalSuccess = () => {
        fetchFollowups();
    };

    const fetchFollowups = async () => {
        setLoading(true);
        try {
            const response = await o2dAPI.getFollowups();
            const allFollowups = response.data?.data || [];
            console.log(allFollowups)
            const enrichedFollowups: FollowUp[] = allFollowups.map((f: any) => {
                const actualOrder = parseFloat(f.actual_order) || 0;
                const isBooked = actualOrder > 0;

                return {
                    ...f,
                    date: f.date_of_calling,
                    isBooked,
                    quantity: isBooked ? actualOrder : "",
                    orderDate: isBooked ? f.actual_order_date : null,
                    status: isBooked ? 'Order Booked' : (!f.next_calling_date ? "Waiting for Response" : "Next Call Scheduled"),
                    nextCall: f.next_calling_date,
                    salesPerson: String(f.sales_person || 'Unknown').trim(),
                    customerName: f.client_name,
                    id: f.followup_id
                };
            });

            setFollowups(enrichedFollowups);
        } catch (error) {
            console.error("Failed to fetch followups", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFollowups();
    }, []);

    const filteredFollowups = useMemo(() => {
        const lower = search.toLowerCase();
        let result = [...followups];

        if (user?.role === 'Sales') {
            const myName = (user.user_name || user.username || '').toLowerCase();
            result = result.filter(f => f.salesPerson.toLowerCase() === myName);
        }

        if (lower) {
            result = result.filter(f =>
                (f.customerName?.toLowerCase().includes(lower)) ||
                (f.status?.toLowerCase().includes(lower)) ||
                (f.salesPerson?.toLowerCase().includes(lower))
            );
        }

        return result;
    }, [search, followups, user]);

    return (
        <div className="flex flex-col h-[calc(100vh-120px)] space-y-4 md:space-y-6">
            {/* Header Section - Sticky on top */}
            <div className="bg-gray-50/50 backdrop-blur-sm p-4 md:p-0 rounded-2xl space-y-4 sticky top-0 z-20">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl md:text-4xl font-black text-gray-800 tracking-tight">Follow-ups</h1>
                        <p className="text-gray-500 font-bold mt-1 text-sm md:text-base">
                            {user?.role === 'Admin' ? 'Team performance & interactions' : 'Your client follow-up history'}
                        </p>
                    </div>
                </div>

                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-blue-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search by Customer, Status, or Sales Person..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-2xl py-4 pl-12 pr-4 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm font-bold text-sm md:text-lg"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20 animate-pulse">
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-400 font-black uppercase tracking-widest text-xs">Loading Follow-ups...</p>
                </div>
            ) : (
                <div className="flex-1 min-h-0">
                    <div className="bg-white border border-gray-100 rounded-3xl shadow-2xl shadow-gray-200/50 overflow-hidden h-full flex flex-col">
                        <div className="overflow-auto flex-1 scrollbar-hide">
                            <table className="w-full text-left border-separate border-spacing-0 min-w-[800px] md:min-w-full">
                                <thead className="z-20">
                                    <tr className="uppercase text-[10px] md:text-xs font-black tracking-widest">
                                        <th className="sticky top-0 p-5 md:p-6 bg-gray-800 text-white first:rounded-tl-3xl z-30">Date</th>
                                        <th className="sticky top-0 p-5 md:p-6 bg-gray-800 text-white z-30">Customer</th>
                                        <th className="sticky top-0 p-5 md:p-6 bg-gray-800 text-white z-30">Sales Person</th>
                                        <th className="sticky top-0 p-5 md:p-6 bg-gray-800 text-white text-center z-30">Status</th>
                                        <th className="sticky top-0 p-5 md:p-6 bg-gray-800 text-white z-30">Order Details</th>
                                        <th className="sticky top-0 p-5 md:p-6 bg-gray-800 text-white last:rounded-tr-3xl z-30">Next Call</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredFollowups.length > 0 ? (
                                        filteredFollowups.map((f, index) => (
                                            <tr key={f.id || index} className="group hover:bg-blue-50/40 transition-all duration-200">
                                                <td className="p-5 md:p-6">
                                                    <div className="flex items-center gap-3 text-gray-700 font-bold text-sm">
                                                        <button
                                                            onClick={() => handleCalendarClick(f)}
                                                            className="p-2 bg-gray-100 rounded-lg group-hover:bg-white transition-all hover:bg-blue-100 hover:scale-110 cursor-pointer active:scale-95"
                                                            title="Open Follow-up Modal"
                                                        >
                                                            <Calendar className="w-4 h-4 text-blue-500" />
                                                        </button>
                                                        {formatDate(f.date)}
                                                    </div>
                                                </td>
                                                <td className="p-5 md:p-6 font-black text-gray-900 text-sm md:text-base tracking-tight">{f.customerName}</td>

                                                <td className="p-5 md:p-6">
                                                    <div className="flex items-center gap-2 font-bold text-gray-600 text-sm">
                                                        <UserIcon className="w-4 h-4 text-purple-500" />
                                                        {f.salesPerson}
                                                    </div>
                                                </td>

                                                <td className="p-5 md:p-6 text-center">
                                                    <span className={`
                                                        inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border-2
                                                        ${f.isBooked
                                                            ? 'bg-green-50 text-green-700 border-green-200 shadow-sm shadow-green-100'
                                                            : f.status === 'Waiting for Response'
                                                                ? 'bg-orange-50 text-orange-700 border-orange-200 shadow-sm shadow-orange-100'
                                                                : 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm shadow-blue-100'}
                                                    `}>
                                                        {f.status}
                                                    </span>
                                                </td>
                                                <td className="p-5 md:p-6">
                                                    {f.isBooked ? (
                                                        <div className="bg-green-50/50 p-2 rounded-xl border border-green-100/50 inline-block min-w-[120px]">
                                                            <div className="text-green-700 font-black text-sm">Qty: {f.quantity}</div>
                                                            {f.orderDate && (
                                                                <div className="text-[10px] text-green-600/80 font-bold uppercase tracking-tighter">
                                                                    {formatDate(f.orderDate)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-300 font-black">-</span>
                                                    )}
                                                </td>
                                                <td className="p-5 md:p-6">
                                                    {f.nextCall ? (
                                                        <div className="flex items-center gap-2 text-blue-600 font-black bg-blue-50/50 px-3 py-1.5 rounded-xl w-fit border border-blue-100/50 text-sm">
                                                            <Clock className="w-4 h-4" />
                                                            {formatDate(f.nextCall)}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-300 text-xs font-black uppercase tracking-widest italic">No Schedule</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={user?.role === 'Admin' ? 6 : 5} className="p-20 text-center">
                                                <div className="flex flex-col items-center">
                                                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                                        <Search className="w-10 h-10 text-gray-200" />
                                                    </div>
                                                    <p className="text-gray-400 font-black uppercase tracking-widest text-sm">No Match Found</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Follow-up Modal */}
            <FollowUpModal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                customer={selectedFollowup ? { "Client Name": selectedFollowup.customerName, name: selectedFollowup.customerName } : null}
                onSuccess={handleModalSuccess}
            />
        </div>
    );
};

export default FollowUpsPage;
