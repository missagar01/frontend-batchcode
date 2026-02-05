import { useState, useEffect, useRef } from "react";
import {
    Loader2,
    Plus,
    Trash2,
    User,
    Package,
    Save,
    RefreshCw,
    AlertCircle,
    CheckCircle2,
    Info,
    ChevronDown,
    Layers,
    Maximize,
    Box
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar as CalendarComponent } from "./ui/calendar";
import { Button } from "./ui/button";
import { CalendarIcon } from "lucide-react";
import { o2dAPI } from "../../services/o2dAPI";
import { cn } from "../../lib/utils";

interface SizeMasterData {
    id: number;
    item_type: string;
    size: string;
    thickness: string;
}

interface EnquiryItem {
    id: string;
    itemType: string;
    size: string;
    thickness: string;
    quantity: string;
}

const EnquiryView = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [sizeMasterData, setSizeMasterData] = useState<SizeMasterData[]>([]);
    const [crmUsers, setCrmUsers] = useState<any[]>([]);

    // Form state
    const [date, setDate] = useState<string>("");
    const [customer, setCustomer] = useState<string>("");
    const [salesExecutive, setSalesExecutive] = useState<string>("");
    const [items, setItems] = useState<EnquiryItem[]>([
        { id: Math.random().toString(36).substr(2, 9), itemType: "", size: "", thickness: "", quantity: "" }
    ]);

    const [message, setMessage] = useState<{
        type: 'success' | 'error' | null;
        text: string;
        errors?: string[];
    }>({ type: null, text: '' });

    const [itemTypes, setItemTypes] = useState<string[]>([]);

    const selectedDate = date ? new Date(date) : undefined;

    // Check if user is admin
    const isAdmin = user && user.role === 'admin';

    // Auto-populate sales executive with logged-in user's name (only for non-admin)
    useEffect(() => {
        if (user && user.username && !isAdmin) {
            setSalesExecutive(user.username);
        }
    }, [user, isAdmin]);

    // Fetch CRM users if admin
    useEffect(() => {
        const fetchCrmUsers = async () => {
            if (isAdmin) {
                try {
                    const response = await o2dAPI.getCrmUsers();
                    if (response.data?.success) {
                        setCrmUsers(response.data.data);
                    }
                } catch (error) {
                    console.error("Error fetching CRM users:", error);
                }
            }
        };
        fetchCrmUsers();
    }, [isAdmin]);

    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true);
            try {
                const response = await o2dAPI.getSizeMaster();
                if (response.data.success && response.data.data) {
                    const data = response.data.data;
                    setSizeMasterData(data);
                    const uniqueTypes = Array.from(new Set(data.map((item: any) => item.item_type))) as string[];
                    setItemTypes(uniqueTypes);
                }
            } catch (error) {
                setMessage({ type: 'error', text: 'Failed to load master data.' });
            } finally {
                setLoading(false);
            }
        };
        loadInitialData();
    }, []);

    const addItem = () => {
        setItems([...items, { id: Math.random().toString(36).substr(2, 9), itemType: "", size: "", thickness: "", quantity: "" }]);
    };

    const removeItem = (id: string) => {
        if (items.length === 1) return;
        setItems(items.filter(item => item.id !== id));
    };

    const updateItem = (id: string, field: keyof EnquiryItem, value: string) => {
        setItems(items.map(item => {
            if (item.id === id) {
                const updated = { ...item, [field]: value };
                if (field === 'itemType') { updated.size = ""; updated.thickness = ""; }
                else if (field === 'size') { updated.thickness = ""; }
                return updated;
            }
            return item;
        }));
    };

    const getAvailableSizes = (itemType: string) => {
        if (!itemType) return [];
        return Array.from(new Set(sizeMasterData.filter(i => i.item_type === itemType).map(i => i.size)));
    };

    const getAvailableThicknesses = (itemType: string, size: string) => {
        if (!itemType || !size) return [];
        return Array.from(new Set(sizeMasterData.filter(i => i.item_type === itemType && i.size === size).map(i => i.thickness)));
    };

    const handleReset = () => {
        setDate("");
        setCustomer("");
        // Re-populate sales executive with logged-in user's name after reset
        setSalesExecutive(user && user.username ? user.username : "");
        setItems([{ id: Math.random().toString(36).substr(2, 9), itemType: "", size: "", thickness: "", quantity: "" }]);
        setMessage({ type: null, text: '' });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage({ type: null, text: '' });

        if (!date || !customer) {
            setMessage({ type: 'error', text: 'Date and Customer are required.' });
            return;
        }
        if (items.some(i => !i.itemType || !i.size || !i.thickness)) {
            setMessage({ type: 'error', text: 'Please fill all item requirements.' });
            return;
        }

        const payload = items.map(item => ({
            item_type: item.itemType,
            size: item.size,
            thickness: item.thickness.replace(' mm', '').trim(),
            enquiry_date: date,
            customer: customer,
            sales_executive: salesExecutive,
            quantity: item.quantity && item.quantity.trim() !== "" ? parseFloat(item.quantity) : null
        }));

        setLoading(true);
        try {
            const response = await o2dAPI.createEnquiry(payload);
            if (response.data.success) {
                setMessage({ type: 'success', text: 'Enquiry submitted successfully!' });
                setTimeout(() => handleReset(), 2000);
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Submission failed.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] p-0 sm:p-4 md:p-8 font-sans text-slate-900">
            <div className="max-w-[1440px] mx-auto space-y-6 sm:space-y-8">

                {/* Main Form Card */}
                <div className="bg-white sm:border border-slate-200 sm:rounded-xl shadow-sm overflow-hidden">

                    {/* Header Section */}
                    <div className="bg-[#1e40af] px-4 py-4 sm:px-8 flex items-center justify-between border-b border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/10 p-2 rounded-lg">
                                <Package className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-white text-lg sm:text-xl font-bold tracking-tight">O2D Enquiry System</h1>
                                <p className="text-blue-100 text-[10px] uppercase font-bold tracking-widest mt-0.5 opacity-80">Syncronization Portal</p>
                            </div>
                        </div>
                        <button
                            onClick={handleReset}
                            className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all border border-white/10"
                        >
                            <RefreshCw className="w-4 h-4" />
                            <span>Reset Form</span>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-4 sm:p-8 space-y-10">

                        {/* Notification Banner */}
                        {message.type && (
                            <div className={cn(
                                "p-4 rounded-lg border-l-4 flex items-center gap-4 animate-in slide-in-from-top-2 duration-300",
                                message.type === 'success' ? "bg-emerald-50 text-emerald-800 border-emerald-500" : "bg-rose-50 text-rose-800 border-rose-500"
                            )}>
                                {message.type === 'success' ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> : <AlertCircle className="w-6 h-6 text-rose-500" />}
                                <p className="font-bold text-sm sm:text-base">{message.text}</p>
                            </div>
                        )}

                        {/* Top Identification Section (Date & Customer) */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-10 border-b border-slate-100">
                            <div className="space-y-2.5">
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                                    <CalendarIcon className="w-3.5 h-3.5 text-blue-500" /> Enquiry Date <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full justify-start text-left font-semibold px-5 py-6 bg-slate-50 border-slate-200 rounded-xl hover:bg-white hover:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all outline-none text-slate-700 shadow-sm h-auto",
                                                    !date && "text-slate-400"
                                                )}
                                            >
                                                <CalendarIcon className="mr-3 h-4 w-4 text-blue-500" />
                                                {date ? format(selectedDate!, "dd/MM/yyyy") : <span className="text-slate-400 font-semibold">Select Enquiry Date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 border border-slate-200 shadow-2xl rounded-2xl overflow-hidden z-[10001] bg-white opacity-100" align="start">
                                            <CalendarComponent
                                                mode="single"
                                                selected={selectedDate}
                                                onSelect={(d) => d && setDate(format(d, "yyyy-MM-dd"))}
                                                initialFocus
                                                className="bg-white"
                                            />
                                            <div className="flex items-center justify-between p-3 border-t border-slate-50 bg-slate-50/50">
                                                <button
                                                    type="button"
                                                    onClick={() => { setDate(""); }}
                                                    className="text-xs font-bold text-rose-500 hover:text-rose-600 px-3 py-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                                                >
                                                    Clear
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => { setDate(format(new Date(), "yyyy-MM-dd")); }}
                                                    className="text-xs font-bold text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                                                >
                                                    Today
                                                </button>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>
                            <div className="space-y-2.5">
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                                    <User className="w-3.5 h-3.5 text-blue-500" /> Customer / Company <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative group">
                                    <input
                                        value={customer}
                                        onChange={(e) => setCustomer(e.target.value)}
                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all outline-none font-semibold text-slate-700 shadow-sm"
                                        placeholder="Enter Customer Name"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2.5">
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                                    <User className="w-3.5 h-3.5 text-blue-500" /> Sales Executive
                                    {!isAdmin && user && user.username && (
                                        <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                                            Auto-filled
                                        </span>
                                    )}
                                </label>
                                <div className="relative group">
                                    {isAdmin ? (
                                        // Admin: Dropdown with CRM users
                                        <>
                                            <select
                                                value={salesExecutive}
                                                onChange={(e) => setSalesExecutive(e.target.value)}
                                                className="w-full appearance-none px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all outline-none font-semibold text-slate-700 shadow-sm"
                                                required
                                            >
                                                <option value="">Select CRM Executive</option>
                                                {crmUsers.map((crmUser) => (
                                                    <option key={crmUser.id} value={crmUser.user_name}>
                                                        {crmUser.user_name}
                                                    </option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                                        </>
                                    ) : (
                                        // Regular user: Read-only input with their name
                                        <input
                                            value={salesExecutive}
                                            onChange={(e) => setSalesExecutive(e.target.value)}
                                            readOnly
                                            className="w-full px-5 py-3.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/5 transition-all outline-none font-semibold shadow-sm bg-blue-50/50 border-blue-200 text-blue-700 cursor-not-allowed"
                                            placeholder="Enter Executive Name"
                                        />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Requirements List (Dynamic Row Section) */}
                        <div className="space-y-6">

                            <div className="space-y-4">
                                {items.map((item, index) => (
                                    <div key={item.id} className="group relative bg-white border border-slate-200 rounded-2xl p-6 lg:p-8 hover:border-blue-200 hover:shadow-xl hover:shadow-slate-200/50 transition-all">

                                        {/* Row Badge */}
                                        <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-800 text-white rounded-md flex items-center justify-center text-[10px] font-bold shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                            {index + 1}
                                        </div>

                                        {/* Desktop Grid Layout (Same as Identification Section) */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 items-end">

                                            {/* Item Type */}
                                            <div className="space-y-2">
                                                <label className="flex items-center gap-2 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pl-1">
                                                    <Layers className="w-3 h-3" /> Item Category
                                                </label>
                                                <div className="relative">
                                                    <select
                                                        value={item.itemType}
                                                        onChange={(e) => updateItem(item.id, 'itemType', e.target.value)}
                                                        className="w-full appearance-none px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none transition-all font-semibold text-slate-700 text-sm shadow-sm"
                                                        required
                                                    >
                                                        <option value="">Choose Type</option>
                                                        {itemTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                                    </select>
                                                    <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                                                </div>
                                            </div>

                                            {/* Size Spec */}
                                            <div className="space-y-2">
                                                <label className="flex items-center gap-2 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pl-1">
                                                    <Maximize className="w-3 h-3" /> Size Specification
                                                </label>
                                                <div className="relative">
                                                    <select
                                                        value={item.size}
                                                        onChange={(e) => updateItem(item.id, 'size', e.target.value)}
                                                        disabled={!item.itemType}
                                                        className="w-full appearance-none px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none transition-all font-semibold text-slate-700 text-sm shadow-sm disabled:opacity-50 disabled:bg-slate-100"
                                                        required
                                                    >
                                                        <option value="">Choose Size</option>
                                                        {getAvailableSizes(item.itemType).map(s => <option key={s} value={s}>{s}</option>)}
                                                    </select>
                                                    <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                                                </div>
                                            </div>

                                            {/* Thickness */}
                                            <div className="space-y-2">
                                                <label className="flex items-center gap-2 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pl-1">
                                                    <Box className="w-3 h-3" /> Thick (mm)
                                                </label>
                                                <div className="relative">
                                                    <select
                                                        value={item.thickness}
                                                        onChange={(e) => updateItem(item.id, 'thickness', e.target.value)}
                                                        disabled={!item.size}
                                                        className="w-full appearance-none px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none transition-all font-semibold text-slate-700 text-sm shadow-sm disabled:opacity-50 disabled:bg-slate-100"
                                                        required
                                                    >
                                                        <option value="">Pick Thickness</option>
                                                        {getAvailableThicknesses(item.itemType, item.size).map(t => <option key={t} value={t}>{t} mm</option>)}
                                                    </select>
                                                    <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                                                </div>
                                            </div>

                                            {/* Quantity + Remove Button */}
                                            <div className="space-y-2">
                                                <label className="flex items-center gap-2 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pl-1">
                                                    Quantity (Metric Ton)
                                                </label>
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="number"
                                                        value={item.quantity}
                                                        onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                                                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none transition-all font-semibold text-slate-700 text-sm shadow-sm"
                                                        placeholder="0.00 MT"
                                                        step="0.01"
                                                    />
                                                    {items.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeItem(item.id)}
                                                            className="p-3 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100"
                                                            title="Delete Item"
                                                        >
                                                            <Trash2 className="w-5 h-5 flex-shrink-0" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Centered Action Footer */}
                        <div className="flex flex-col sm:flex-row justify-center sm:justify-end items-center gap-4 mt-12 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                            <button
                                type="button"
                                onClick={addItem}
                                className="w-full sm:w-auto h-10 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shadow-blue-500/20"
                            >
                                <Plus className="w-4 h-4" /> Add New Item
                            </button>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full sm:w-auto h-10 px-6 min-w-[160px] bg-[#1e40af] text-white rounded-lg hover:bg-blue-800 font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-md shadow-blue-500/20 active:scale-95 group"
                            >
                                {loading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                )}
                                <span>{loading ? "Submitting..." : `Submit ${items.length} Items`}</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default EnquiryView;