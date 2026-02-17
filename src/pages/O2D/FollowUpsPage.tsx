import React, { useEffect, useState, useMemo } from 'react';
import { Search, Calendar, Clock, User as UserIcon, LayoutGrid, List, PlayCircle, X, CheckCircle, AlertCircle } from 'lucide-react';
import { o2dAPI } from "../../services/o2dAPI";
import { useAuth } from "../../context/AuthContext";

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

interface FollowUpModalProps {
    isOpen: boolean;
    onClose: () => void;
    customer: any;
    followup?: any;
    onSuccess: () => void;
}

const FollowUpModal: React.FC<FollowUpModalProps> = ({ isOpen, onClose, customer, followup, onSuccess }) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        client_name: '',
        sales_person: '',
        date_of_calling: new Date().toISOString().split('T')[0],
        order_quantity: '',
        order_date: '',
        next_calling_date: '',
    });

    const [waitingForResponse, setWaitingForResponse] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setError(null);
            if (followup) {
                // Populate from existing followup
                setFormData({
                    client_name: followup.customerName || '',
                    sales_person: followup.salesPerson || '',
                    date_of_calling: followup.date ? new Date(followup.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    order_quantity: followup.quantity || '',
                    order_date: followup.orderDate ? new Date(followup.orderDate).toISOString().split('T')[0] : '',
                    next_calling_date: followup.nextCall ? new Date(followup.nextCall).toISOString().split('T')[0] : '',
                });
                setWaitingForResponse(followup.status === 'Waiting for Response');
            } else {
                // Default / New
                setFormData({
                    client_name: customer?.["Client Name"] || customer?.name || '',
                    sales_person: user?.user_name || user?.username || '',
                    date_of_calling: new Date().toISOString().split('T')[0],
                    order_quantity: '',
                    order_date: new Date().toISOString().split('T')[0],
                    next_calling_date: '',
                });
                setWaitingForResponse(false);
            }
        }
    }, [isOpen, followup, customer, user]);

    const handleSubmit = async (e: React.FormEvent) => {
        if (e) e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const actualOrder = parseFloat(formData.order_quantity) || 0;
            const isBooked = actualOrder > 0;

            const payload = {
                client_name: formData.client_name,
                sales_person: formData.sales_person,
                actual_order: actualOrder,
                actual_order_date: isBooked ? (formData.order_date || new Date().toISOString().split('T')[0]) : null,
                date_of_calling: formData.date_of_calling,
                next_calling_date: (!isBooked && !waitingForResponse && formData.next_calling_date) ? formData.next_calling_date : null
            };

            if (followup && followup.id) {
                await o2dAPI.updateFollowup(String(followup.id), payload);
            } else {
                await o2dAPI.createFollowup(payload);
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error("Follow-up error:", error);
            const errorMsg = error.response?.data?.message || error.message || 'Failed to save follow-up. Please try again.';
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4 overflow-hidden animate-in fade-in duration-200">
            <div
                className="bg-white w-full sm:w-[90%] md:w-[80%] lg:max-w-4xl max-h-[80vh] sm:max-h-[90vh] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-10 duration-300"
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 sticky top-0 z-20 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">
                            {followup ? "Edit Follow Up" : "New Follow Up"}
                        </h2>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded text-[10px] font-bold uppercase tracking-wider">
                                {followup ? `ID: #${followup.id}` : "NEW"}
                            </div>
                            <span className="text-gray-500 text-xs font-medium">
                                {followup ? "Update details below" : "Enter details interaction"}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400 hover:text-gray-700"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5 md:p-8 custom-scrollbar">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-red-700 animate-in fade-in slide-in-from-top-2">
                            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <h4 className="font-bold text-sm">Error Saving Follow-up</h4>
                                <p className="text-sm mt-1 opacity-90">{error}</p>
                            </div>
                        </div>
                    )}

                    <form id="followup-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">

                        {/* Left Column: Client Info */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
                                <UserIcon className="w-5 h-5 text-gray-400" />
                                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Client Information</h3>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Client Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.client_name}
                                        onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-800 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-gray-400"
                                        placeholder="Enter Client Name"
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Sales Person</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.sales_person}
                                            onChange={(e) => setFormData({ ...formData, sales_person: e.target.value })}
                                            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-800 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-gray-400"
                                            placeholder="Sales Rep"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Date of Calling</label>
                                        <input
                                            type="date"
                                            required
                                            value={formData.date_of_calling}
                                            onChange={(e) => setFormData({ ...formData, date_of_calling: e.target.value })}
                                            onClick={(e) => (e.target as any).showPicker?.()}
                                            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-800 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all cursor-pointer"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Interaction Details */}
                        <div className="space-y-6">

                            {/* Order Details */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
                                    <CheckCircle className="w-5 h-5 text-gray-400" />
                                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Order Status</h3>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Quantity</label>
                                        <input
                                            type="number"
                                            value={formData.order_quantity}
                                            onChange={(e) => setFormData({ ...formData, order_quantity: e.target.value })}
                                            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-800 font-medium focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all placeholder:text-gray-400"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Order Date</label>
                                        <input
                                            type="date"
                                            value={formData.order_date}
                                            onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                                            onClick={(e) => (e.target as any).showPicker?.()}
                                            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-800 font-medium focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all cursor-pointer"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Next Steps */}
                            <div className="space-y-4 pt-4">
                                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
                                    <Clock className="w-5 h-5 text-gray-400" />
                                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Follow Up</h3>
                                </div>

                                <div className="space-y-3">
                                    <div className={waitingForResponse ? 'opacity-50 pointer-events-none' : ''}>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Next Calling Date</label>
                                        <input
                                            type="date"
                                            value={formData.next_calling_date}
                                            onChange={(e) => setFormData({ ...formData, next_calling_date: e.target.value })}
                                            onClick={(e) => (e.target as any).showPicker?.()}
                                            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-800 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all cursor-pointer"
                                        />
                                    </div>

                                    <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={waitingForResponse}
                                            onChange={(e) => setWaitingForResponse(e.target.checked)}
                                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                        />
                                        <span className="ml-3 text-sm font-medium text-gray-700">Waiting for Response (No Date)</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                    </form>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row justify-end gap-3 sticky bottom-0 z-20 shrink-0 pb-6 sm:pb-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full sm:w-auto px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-100 transition-all text-sm mb-2 sm:mb-0"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="followup-form"
                        disabled={loading}
                        className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm hover:shadow transition-all text-sm flex justify-center items-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Saving...</span>
                            </>
                        ) : (
                            <span>Save Changes</span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

const FollowUpsPage: React.FC = () => {
    const { user } = useAuth();
    const [followups, setFollowups] = useState<FollowUp[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedFollowup, setSelectedFollowup] = useState<FollowUp | null>(null);

    const handleCalendarClick = async (followup: FollowUp) => {
        try {
            setLoading(true);
            const response = await o2dAPI.getFollowup(String(followup.id));
            if (response.data && response.data.data) {
                const f = response.data.data;
                const actualOrder = parseFloat(f.actual_order) || 0;
                const isBooked = actualOrder > 0;

                const enrichedFollowup: FollowUp = {
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

                setSelectedFollowup(enrichedFollowup);
                setIsModalOpen(true);
            }
        } catch (error) {
            console.error("Failed to fetch specific followup details", error);
        } finally {
            setLoading(false);
        }
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
            // console.log(allFollowups)
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

    const [visibleCount, setVisibleCount] = useState(100);

    // Reset visible count when search changes
    useEffect(() => {
        setVisibleCount(100);
    }, [search, user]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight + 100) {
            setVisibleCount(prev => Math.min(prev + 50, filteredFollowups.length));
        }
    };

    const visibleFollowups = useMemo(() => {
        return filteredFollowups.slice(0, visibleCount);
    }, [filteredFollowups, visibleCount]);

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
                        <div
                            className="overflow-auto flex-1 scrollbar-hide"
                            onScroll={handleScroll}
                        >
                            <table className="w-full text-left border-separate border-spacing-0 min-w-[800px] md:min-w-full">
                                <thead className="z-20">
                                    <tr className="uppercase text-[10px] md:text-xs font-black tracking-widest">
                                        <th className="sticky top-0 p-5 md:p-6 bg-gray-800 text-white first:rounded-tl-3xl z-30 text-center">Action</th>
                                        <th className="sticky top-0 p-5 md:p-6 bg-gray-800 text-white z-30">Date</th>
                                        <th className="sticky top-0 p-5 md:p-6 bg-gray-800 text-white z-30">Customer</th>
                                        <th className="sticky top-0 p-5 md:p-6 bg-gray-800 text-white z-30">Sales Person</th>
                                        <th className="sticky top-0 p-5 md:p-6 bg-gray-800 text-white text-center z-30">Status</th>
                                        <th className="sticky top-0 p-5 md:p-6 bg-gray-800 text-white z-30">Order Details</th>
                                        <th className="sticky top-0 p-5 md:p-6 bg-gray-800 text-white last:rounded-tr-3xl z-30">Next Call</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {visibleFollowups.length > 0 ? (
                                        visibleFollowups.map((f, index) => (
                                            <tr key={f.id || index} className="group hover:bg-blue-50/40 transition-all duration-200">
                                                <td className="p-5 md:p-6 text-center">
                                                    <button
                                                        onClick={() => handleCalendarClick(f)}
                                                        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all hover:scale-105 active:scale-95"
                                                        title="Edit Follow-up"
                                                    >
                                                        <PlayCircle className="w-4 h-4" />
                                                        Edit
                                                    </button>
                                                </td>
                                                <td className="p-5 md:p-6">
                                                    <div className="flex items-center gap-3 text-gray-700 font-bold text-sm">
                                                        <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-white transition-colors">
                                                            <Calendar className="w-4 h-4 text-blue-500" />
                                                        </div>
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
                                            <td colSpan={7} className="p-20 text-center">
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

            {/* Follow-up Modal - Now Inlined Here */}
            <FollowUpModal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                customer={selectedFollowup ? { name: selectedFollowup.customerName } : {}}
                followup={selectedFollowup}
                onSuccess={handleModalSuccess}
            />
        </div>
    );
};

export default FollowUpsPage;
