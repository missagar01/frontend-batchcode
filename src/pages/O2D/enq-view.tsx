import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { o2dAPI } from "../../services/o2dAPI";

interface SizeMasterData {
    id: number;
    item_type: string;
    size: string;
    thickness: string;
}

const EnquiryView = () => {
    const [loading, setLoading] = useState(false);
    const [sizeMasterData, setSizeMasterData] = useState<SizeMasterData[]>([]);

    // Form state
    const [itemType, setItemType] = useState<string>("");
    const [size, setSize] = useState<string>("");
    const [thickness, setThickness] = useState<string>("");
    const [date, setDate] = useState<string>("");
    const [customer, setCustomer] = useState<string>("");
    const [quantity, setQuantity] = useState<string>("");

    // Message state
    const [message, setMessage] = useState<{
        type: 'success' | 'error' | null;
        text: string;
    }>({ type: null, text: '' });

    // Available options
    const [itemTypes, setItemTypes] = useState<string[]>([]);
    const [availableSizes, setAvailableSizes] = useState<string[]>([]);
    const [availableThicknesses, setAvailableThicknesses] = useState<string[]>([]);

    // Fetch size master data on component mount
    useEffect(() => {
        fetchSizeMasterData();
    }, []);

    const fetchSizeMasterData = async () => {
        setLoading(true);
        try {
            const response = await o2dAPI.getSizeMaster();

            if (response.data.success && response.data.data) {
                const data = response.data.data;
                setSizeMasterData(data);

                // Extract unique item types
                const uniqueItemTypes = Array.from(
                    new Set(data.map((item: SizeMasterData) => item.item_type.toLowerCase()))
                ) as string[];
                setItemTypes(uniqueItemTypes);
            }
        } catch (error) {
            console.error("Error fetching size master data:", error);
        } finally {
            setLoading(false);
        }
    };

    // Update available sizes when item type changes
    useEffect(() => {
        if (itemType) {
            const filteredData = sizeMasterData.filter(
                (item) => item.item_type.toLowerCase() === itemType.toLowerCase()
            );
            const uniqueSizes = Array.from(
                new Set(filteredData.map((item) => item.size))
            ) as string[];
            setAvailableSizes(uniqueSizes);

            // Reset dependent fields
            setSize("");
            setThickness("");
            setAvailableThicknesses([]);
        } else {
            setAvailableSizes([]);
            setSize("");
            setThickness("");
            setAvailableThicknesses([]);
        }
    }, [itemType, sizeMasterData]);

    // Update available thicknesses when size changes
    useEffect(() => {
        if (itemType && size) {
            const filteredData = sizeMasterData.filter(
                (item) => item.item_type.toLowerCase() === itemType.toLowerCase() && item.size === size
            );
            const uniqueThicknesses = Array.from(
                new Set(filteredData.map((item) => item.thickness))
            ) as string[];
            setAvailableThicknesses(uniqueThicknesses);

            // Auto-select if only one thickness available
            if (uniqueThicknesses.length === 1) {
                setThickness(uniqueThicknesses[0]);
            } else {
                setThickness("");
            }
        } else {
            setAvailableThicknesses([]);
            setThickness("");
        }
    }, [size, itemType, sizeMasterData]);

    const handleReset = () => {
        setItemType("");
        setSize("");
        setThickness("");
        setCustomer("");
        setQuantity("");
        setDate("");
        setAvailableSizes([]);
        setAvailableThicknesses([]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!itemType || !size || !thickness || !date || !customer) {
            setMessage({
                type: 'error',
                text: 'Please fill all required fields'
            });
            setTimeout(() => setMessage({ type: null, text: '' }), 5000);
            return;
        }

        const enquiryData = {
            item_type: itemType,
            size: size,
            thickness: thickness,
            enquiry_date: date,
            customer: customer,
            quantity: quantity || null
        };

        try {
            setLoading(true);
            setMessage({ type: null, text: '' }); // Clear any previous messages

            const response = await o2dAPI.createEnquiry(enquiryData);

            if (response.data.success) {
                setMessage({
                    type: 'success',
                    text: `Enquiry submitted successfully! Enquiry ID: ${response.data.data.id}`
                });

                // Reset form after successful submission
                setTimeout(() => {
                    handleReset();
                    setMessage({ type: null, text: '' });
                }, 3000);
            } else {
                setMessage({
                    type: 'error',
                    text: response.data.message || 'Failed to submit enquiry'
                });
                setTimeout(() => setMessage({ type: null, text: '' }), 5000);
            }
        } catch (error: any) {
            console.error("Error submitting enquiry:", error);
            setMessage({
                type: 'error',
                text: error.response?.data?.message || error.message || 'Failed to submit enquiry'
            });
            setTimeout(() => setMessage({ type: null, text: '' }), 5000);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">O2D Enquiry Form</h2>
                <p className="text-sm sm:text-base text-gray-600">Create a new enquiry for O2D items</p>
            </div>

            {/* Message Notification */}
            {message.type && (
                <div className={`rounded-lg p-4 flex items-start gap-3 animate-in slide-in-from-top-2 ${message.type === 'success'
                    ? 'bg-green-50 border-2 border-green-200'
                    : 'bg-red-50 border-2 border-red-200'
                    }`}>
                    {message.type === 'success' ? (
                        <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                    ) : (
                        <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                    )}
                    <div className="flex-1">
                        <p className={`font-semibold ${message.type === 'success' ? 'text-green-900' : 'text-red-900'
                            }`}>
                            {message.type === 'success' ? 'Success!' : 'Error!'}
                        </p>
                        <p className={`text-sm mt-1 ${message.type === 'success' ? 'text-green-700' : 'text-red-700'
                            }`}>
                            {message.text}
                        </p>
                    </div>
                    <button
                        onClick={() => setMessage({ type: null, text: '' })}
                        className={`flex-shrink-0 ${message.type === 'success' ? 'text-green-600 hover:text-green-800' : 'text-red-600 hover:text-red-800'
                            }`}
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-purple-600">
                    <h3 className="text-lg font-bold text-white">Enquiry Details</h3>
                    <p className="text-blue-100 text-sm mt-1">Fill in the form below to submit an enquiry</p>
                </div>

                <div className="p-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                            <span className="ml-3 text-lg text-gray-700">Loading data...</span>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Item Selection Section */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* Item Type */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Item Type <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={itemType}
                                        onChange={(e) => setItemType(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-white border-2 border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                        required
                                    >
                                        <option value="">Select Item Type</option>
                                        {itemTypes.map((type) => (
                                            <option key={type} value={type} className="capitalize">
                                                {type.charAt(0).toUpperCase() + type.slice(1)}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Size */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Size <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={size}
                                        onChange={(e) => setSize(e.target.value)}
                                        disabled={!itemType}
                                        className="w-full px-4 py-2.5 bg-white border-2 border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                                        required
                                    >
                                        <option value="">Select Size</option>
                                        {availableSizes.map((s) => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Thickness */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Thickness <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={thickness}
                                        onChange={(e) => setThickness(e.target.value)}
                                        disabled={!size}
                                        className="w-full px-4 py-2.5 bg-white border-2 border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                                        required
                                    >
                                        <option value="">Select Thickness</option>
                                        {availableThicknesses.map((t) => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Additional Details Section */}
                            <div className="border-t pt-6">
                                <h4 className="text-base font-semibold text-gray-800 mb-4">Additional Information</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {/* Date */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Date <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            placeholder="Select date"
                                            className="w-full px-4 py-2.5 bg-white border-2 border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                            style={{
                                                colorScheme: 'light'
                                            }}
                                            required
                                        />
                                    </div>

                                    {/* Customer */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Customer Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={customer}
                                            onChange={(e) => setCustomer(e.target.value)}
                                            placeholder="Enter customer name"
                                            className="w-full px-4 py-2.5 bg-white border-2 border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-400"
                                            required
                                        />
                                    </div>

                                    {/* Quantity */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Quantity
                                        </label>
                                        <input
                                            type="number"
                                            value={quantity}
                                            onChange={(e) => setQuantity(e.target.value)}
                                            placeholder="Enter quantity (optional)"
                                            min="0"
                                            step="0.01"
                                            className="w-full px-4 py-2.5 bg-white border-2 border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-400"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Summary Card */}
                            {itemType && size && thickness && (
                                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-6">
                                    <h3 className="font-bold text-lg mb-4 text-blue-900 flex items-center">
                                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        Enquiry Summary
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <div className="bg-white rounded-lg p-4 shadow-sm">
                                            <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">Item Type</span>
                                            <p className="text-base font-bold text-gray-900 capitalize">{itemType}</p>
                                        </div>
                                        <div className="bg-white rounded-lg p-4 shadow-sm">
                                            <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">Size</span>
                                            <p className="text-base font-bold text-gray-900">{size}</p>
                                        </div>
                                        <div className="bg-white rounded-lg p-4 shadow-sm">
                                            <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">Thickness</span>
                                            <p className="text-base font-bold text-gray-900">{thickness}</p>
                                        </div>
                                        <div className="bg-white rounded-lg p-4 shadow-sm">
                                            <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">Date</span>
                                            <p className="text-base font-bold text-gray-900">{date}</p>
                                        </div>
                                        <div className="bg-white rounded-lg p-4 shadow-sm">
                                            <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">Customer</span>
                                            <p className="text-base font-bold text-gray-900">{customer || '-'}</p>
                                        </div>
                                        <div className="bg-white rounded-lg p-4 shadow-sm">
                                            <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">Quantity</span>
                                            <p className="text-base font-bold text-gray-900">{quantity || '-'}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row gap-4 justify-end pt-4 border-t">
                                <button
                                    type="button"
                                    onClick={handleReset}
                                    disabled={loading}
                                    className="px-6 py-2.5 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Reset Form
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            Submitting...
                                        </>
                                    ) : (
                                        'Submit Enquiry'
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EnquiryView;