import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { o2dAPI } from "../../services/o2dAPI";
import { useAuth } from "../../context/AuthContext";

interface FollowUpModalProps {
    isOpen: boolean;
    onClose: () => void;
    customer: any;
    onSuccess: () => void;
}

const FollowUpModal: React.FC<FollowUpModalProps> = ({ isOpen, onClose, customer, onSuccess }) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        order_booked: 'true', // string 'true'/'false' for radio handling - default to Yes Booked
        order_quantity: '',
        order_date: new Date().toISOString().split('T')[0],
        next_calling_date: '',
        status: 'Order Booked' // Default status
    });

    const [waitingForResponse, setWaitingForResponse] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Reset form on open - default to Yes Booked
            setFormData({
                order_booked: 'true',
                order_quantity: '',
                order_date: new Date().toISOString().split('T')[0],
                next_calling_date: '',
                status: 'Order Booked'
            });
            setWaitingForResponse(false);
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        if (e) e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                client_name: customer?.["Client Name"] || customer?.name || "Unknown",
                sales_person: user?.user_name || user?.username || '',
                actual_order: formData.order_booked === 'true' ? parseFloat(formData.order_quantity) : 0,
                actual_order_date: formData.order_booked === 'true' ? formData.order_date : null,
                date_of_calling: new Date(),
                next_calling_date: (formData.order_booked === 'false' && !waitingForResponse) ? formData.next_calling_date : null
            };

            await o2dAPI.createFollowup(payload);
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Follow-up error:", error);
            alert('Failed to save follow-up');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
            <div
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            />

            <div
                className="relative bg-white border border-gray-100 rounded-t-[2.5rem] sm:rounded-[2rem] w-full max-w-lg overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col max-h-[92vh] animate-in slide-in-from-bottom duration-300"
            >
                {/* Header */}
                <div className="px-5 py-4 md:px-8 md:py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/90 backdrop-blur-md sticky top-0 z-20 shrink-0">
                    <div className="min-w-0 flex-1">
                        <h2 className="text-lg md:text-2xl font-black text-gray-800 truncate tracking-tight">
                            Follow Up: <span className="text-blue-600">{customer?.["Client Name"] || customer?.name}</span>
                        </h2>
                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mt-0.5">Interaction History</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 bg-white p-2.5 rounded-full shadow-sm hover:shadow-md transition-all active:scale-95 ml-4 shrink-0">
                        <X className="w-5 h-5 md:w-6 md:h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 md:p-8 space-y-6 md:space-y-8 overflow-y-auto flex-1 custom-scrollbar">
                    {/* Order Booked Question */}
                    <div className="space-y-3">
                        <label className="text-[10px] md:text-xs font-black text-gray-400 block uppercase tracking-widest">Is Order Booked?</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label className={`
                                flex items-center justify-center p-4 md:p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300
                                ${formData.order_booked === 'true'
                                    ? 'bg-green-50 border-green-500 text-green-700 shadow-xl shadow-green-100 scale-[1.02]'
                                    : 'bg-white border-gray-100 text-gray-400 hover:bg-gray-50 hover:border-gray-200'}
                            `}>
                                <input
                                    type="radio"
                                    name="order_booked"
                                    value="true"
                                    checked={formData.order_booked === 'true'}
                                    onChange={(e) => setFormData({ ...formData, order_booked: e.target.value })}
                                    className="hidden"
                                />
                                <CheckCircle className={`w-5 h-5 md:w-6 md:h-6 mr-3 ${formData.order_booked === 'true' ? 'fill-green-500 text-white' : 'text-gray-300'}`} />
                                <span className="font-black text-sm md:text-base">Yes, Booked</span>
                            </label>

                            <label className={`
                                flex items-center justify-center p-4 md:p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300
                                ${formData.order_booked === 'false'
                                    ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-xl shadow-blue-100 scale-[1.02]'
                                    : 'bg-white border-gray-100 text-gray-400 hover:bg-gray-50 hover:border-gray-200'}
                            `}>
                                <input
                                    type="radio"
                                    name="order_booked"
                                    value="false"
                                    checked={formData.order_booked === 'false'}
                                    onChange={(e) => {
                                        setFormData({ ...formData, order_booked: e.target.value });
                                        setWaitingForResponse(false);
                                    }}
                                    className="hidden"
                                />
                                <Clock className={`w-5 h-5 md:w-6 md:h-6 mr-3 ${formData.order_booked === 'false' ? 'fill-blue-500 text-white' : 'text-gray-300'}`} />
                                <span className="font-black text-sm md:text-base">No / Pending</span>
                            </label>
                        </div>
                    </div>

                    {/* CONDITIONAL: Order Booked = YES */}
                    {formData.order_booked === 'true' && (
                        <div
                            className="space-y-4 md:space-y-6 bg-green-50/20 p-5 md:p-6 rounded-[2rem] border border-green-100 animate-in fade-in zoom-in duration-300"
                        >
                            <div>
                                <label className="text-[10px] md:text-xs font-black text-green-700 mb-2 block uppercase tracking-widest">Order Quantity</label>
                                <input
                                    type="number"
                                    required
                                    value={formData.order_quantity}
                                    onChange={(e) => setFormData({ ...formData, order_quantity: e.target.value })}
                                    className="w-full bg-white border border-green-200 rounded-xl p-3 md:p-4 text-gray-800 focus:ring-4 focus:ring-green-500/10 focus:border-green-500 outline-none font-black text-sm transition-all"
                                    placeholder="Enter total quantity"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] md:text-xs font-black text-green-700 mb-2 block uppercase tracking-widest">Order Date</label>
                                <input
                                    type="date"
                                    required
                                    value={formData.order_date}
                                    onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                                    onClick={(e) => (e.target as any).showPicker?.()}
                                    className="w-full bg-white border border-green-200 rounded-xl p-3 md:p-4 text-gray-800 focus:ring-4 focus:ring-green-500/10 focus:border-green-500 outline-none font-bold text-sm transition-all cursor-pointer"
                                />
                            </div>
                        </div>
                    )}

                    {/* CONDITIONAL: Order Booked = NO */}
                    {formData.order_booked === 'false' && (
                        <div
                            className="space-y-6 animate-in fade-in zoom-in duration-300"
                        >
                            <div className="flex items-center space-x-3 md:space-x-4 p-4 md:p-5 bg-orange-50/50 border border-orange-100 rounded-2xl">
                                <AlertCircle className="w-5 h-5 md:w-6 md:h-6 text-orange-500 shrink-0" />
                                <span className="text-xs md:text-sm font-bold text-orange-800 leading-tight">Must schedule a future follow-up call with this client</span>
                            </div>

                            {!waitingForResponse && (
                                <div className="space-y-2">
                                    <label className="text-[10px] md:text-xs font-black text-gray-400 block uppercase tracking-widest">Next Calling Date</label>
                                    <input
                                        type="date"
                                        required={!waitingForResponse}
                                        value={formData.next_calling_date}
                                        onChange={(e) => setFormData({ ...formData, next_calling_date: e.target.value })}
                                        onClick={(e) => (e.target as any).showPicker?.()}
                                        className="w-full bg-gray-50/50 border border-gray-200 rounded-xl md:rounded-2xl p-3.5 md:p-4 text-gray-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold transition-all focus:bg-white text-sm cursor-pointer"
                                    />
                                </div>
                            )}

                            <label className="relative flex items-center cursor-pointer group w-fit py-2">
                                <input
                                    type="checkbox"
                                    id="waiting"
                                    checked={waitingForResponse}
                                    onChange={(e) => setWaitingForResponse(e.target.checked)}
                                    className="peer sr-only"
                                />
                                <div className="w-5 h-5 md:w-6 md:h-6 bg-gray-50 border-2 border-gray-200 rounded-lg peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-all flex items-center justify-center group-hover:border-blue-400">
                                    <CheckCircle className="w-3.5 h-3.5 md:w-4 md:h-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                                </div>
                                <span className="ml-3 text-xs md:text-sm font-black text-gray-400 peer-checked:text-blue-600 select-none transition-all uppercase tracking-widest">
                                    Waiting for Response
                                </span>
                            </label>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 md:p-8 bg-white border-t border-gray-100 shrink-0">
                    <button
                        type="button"
                        onClick={handleSubmit as any}
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 md:py-5 rounded-2xl md:rounded-[1.5rem] shadow-2xl shadow-blue-500/40 hover:-translate-y-1 transition-all flex justify-center items-center space-x-3 text-base md:text-xl active:scale-[0.98] disabled:grayscale disabled:opacity-50"
                    >
                        {loading ? (
                            <div className="flex items-center space-x-2">
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span className="uppercase tracking-widest text-xs">Submitting...</span>
                            </div>
                        ) : (
                            <span>Submit Follow Up</span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FollowUpModal;
