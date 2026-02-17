import React, { useEffect, useState, useMemo } from 'react';
import { Plus, Search, Edit2, Trash2, PhoneCall, MapPin, User, Building, Tag, Briefcase } from 'lucide-react';
import { o2dAPI } from "../../services/o2dAPI";
import { useAuth } from "../../context/AuthContext";
import CustomerModal from './CustomerModal';
import FollowUpModal from './FollowUpModal';

interface Customer {
    id: number;
    "Client Name": string;
    "City": string;
    "Contact Person": string;
    "Contact Details": string;
    "Sales Person": string | number | null;
    "Client Type": string;
    "Status": string;
    sales_person: string;
    sales_person_id: number | null;
}

interface MarketingUser {
    id: number;
    user_name: string;
}

const CustomersPage: React.FC = () => {
    const { user } = useAuth();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [marketingUsers, setMarketingUsers] = useState<MarketingUser[]>([]);
    const [salesPersonFilterId, setSalesPersonFilterId] = useState('');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Modal States
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
    const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

    const fetchData = async () => {
        setLoading(true);
        setError('');
        try {
            const [customersRes, marketingUsersRes] = await Promise.all([
                o2dAPI.getClients(),
                o2dAPI.getMarketingUsers()
            ]);

            // Handle Marketing Users
            if (marketingUsersRes.data && marketingUsersRes.data.success) {
                setMarketingUsers(marketingUsersRes.data.data || []);
            }

            // Handle Customers
            if (customersRes.data && customersRes.data.success) {
                const rawData = customersRes.data.data || [];
                const data: Customer[] = rawData.map((c: any) => ({
                    id: c.client_id,
                    "Client Name": c.client_name,
                    "City": c.city,
                    "Contact Person": c.contact_person,
                    "Contact Details": c.contact_details,
                    "Sales Person": c.sales_person_id,
                    "Client Type": c.client_type,
                    "Status": c.status,
                    sales_person: c.sales_person,
                    sales_person_id: c.sales_person_id
                }));

                data.sort((a, b) => {
                    const nameA = a["Client Name"]?.toLowerCase() || "";
                    const nameB = b["Client Name"]?.toLowerCase() || "";
                    return nameA.localeCompare(nameB);
                });

                setCustomers(data);
            } else {
                setError('Failed to load data. Please check connection.');
            }
        } catch (error) {
            console.error("Error fetching data", error);
            setError('Error fetching data. Check console.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredCustomers = useMemo(() => {
        const lower = search.toLowerCase();
        let filtered = [...customers];

        // Search Filter
        if (lower) {
            filtered = filtered.filter(c =>
                (c["Client Name"]?.toLowerCase().includes(lower)) ||
                (c["Contact Details"]?.toString()?.toLowerCase().includes(lower)) ||
                (c["Contact Person"]?.toLowerCase().includes(lower))
            );
        }

        // Sales Person Filter
        if (salesPersonFilterId) {
            filtered = filtered.filter(c => {
                // Return true if IDs match OR if the name matches the selected user's name
                const selectedUser = marketingUsers.find(u => String(u.id) === salesPersonFilterId);
                const selectedName = selectedUser?.user_name;

                const matchesId = String(c.sales_person_id) === salesPersonFilterId;
                const matchesName = selectedName && c.sales_person === selectedName;

                return matchesId || matchesName;
            });
        }

        return filtered;
    }, [search, salesPersonFilterId, customers, marketingUsers]);

    const [visibleCount, setVisibleCount] = useState(100);

    // Reset visible count when filters change
    useEffect(() => {
        setVisibleCount(100);
    }, [search, salesPersonFilterId]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight + 100) {
            setVisibleCount(prev => Math.min(prev + 50, filteredCustomers.length));
        }
    };

    const visibleCustomers = useMemo(() => {
        return filteredCustomers.slice(0, visibleCount);
    }, [filteredCustomers, visibleCount]);

    const handleDelete = async (id: number) => {
        if (window.confirm('Are you sure you want to delete this customer?')) {
            try {
                await o2dAPI.deleteClient(String(id));
                fetchData();
            } catch (error) {
                alert('Failed to delete');
            }
        }
    };

    const openEdit = (customer: Customer) => {
        setCustomerToEdit(customer);
        setIsCustomerModalOpen(true);
    };

    const openFollowUp = (customer: Customer) => {
        setSelectedCustomer(customer);
        setIsFollowUpModalOpen(true);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-120px)] space-y-4 md:space-y-8 p-4 md:p-0">
            <div className="shrink-0 space-y-4 md:space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-gray-800">Customers</h1>
                        <p className="text-gray-500 font-medium mt-1 text-sm md:text-base">Manage your client list</p>
                    </div>
                    <button
                        onClick={() => { setCustomerToEdit(null); setIsCustomerModalOpen(true); }}
                        className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center space-x-2 transition-all shadow-lg shadow-blue-500/30 hover:-translate-y-0.5 active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Add Customer</span>
                    </button>
                </div>

                <div className="flex flex-col lg:flex-row gap-4">
                    <div className="flex-1 relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search clients..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-xl py-3.5 md:py-4 pl-12 pr-4 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm font-medium text-sm md:text-base"
                        />
                    </div>

                    <div className="w-full lg:w-64">
                        <select
                            value={salesPersonFilterId}
                            onChange={(e) => setSalesPersonFilterId(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-xl py-3.5 md:py-4 px-4 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm font-medium appearance-none cursor-pointer text-sm md:text-base"
                        >
                            <option value="">All Sales Persons</option>
                            {marketingUsers.map(u => (
                                <option key={u.id} value={String(u.id)}>{u.user_name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div
                className="flex-1 overflow-y-auto min-h-0 pr-1 custom-scrollbar"
                onScroll={handleScroll}
            >
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : error ? (
                    <div className="text-center text-red-500 py-10 font-bold bg-red-50 rounded-xl border border-red-100">{error}</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 pb-4">
                        {visibleCustomers.map((customer, index) => (
                            <div key={customer.id || index} className="group relative transition-all duration-300 hover:-translate-y-1">
                                <div className="absolute -inset-[1.5px] bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 rounded-2xl opacity-100"></div>
                                <div className="relative bg-white rounded-2xl p-4 md:p-6 h-full flex flex-col transition-shadow duration-300 hover:shadow-2xl hover:shadow-blue-500/10">
                                    <div className={`absolute top-0 right-0 px-3 py-1 text-[10px] md:text-xs font-bold rounded-bl-xl uppercase tracking-tighter
                                         ${customer.Status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {customer.Status || 'Active'}
                                    </div>

                                    <div className="flex justify-between items-start mb-4 pr-12">
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-lg md:text-xl font-bold text-gray-800 truncate tracking-tight pr-2" title={customer["Client Name"]}>
                                                {customer["Client Name"] || "Unknown Client"}
                                            </h3>
                                            <div className="flex items-center text-gray-500 text-xs md:text-sm mt-1 font-medium">
                                                <MapPin className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1.5 text-blue-500 shrink-0" />
                                                <span className="truncate">{customer.City || "N/A"}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-1 space-y-2 md:space-y-3 text-xs md:text-sm text-gray-600 mb-6 bg-gray-50/80 p-3 md:p-4 rounded-xl border border-gray-100">
                                        <div className="flex items-center min-w-0">
                                            <User className="w-3.5 h-3.5 md:w-4 md:h-4 mr-3 text-blue-500 shrink-0" />
                                            <span className="font-semibold truncate">{customer["Contact Person"]}</span>
                                        </div>
                                        <div className="flex items-center min-w-0">
                                            <PhoneCall className="w-3.5 h-3.5 md:w-4 md:h-4 mr-3 text-purple-500 shrink-0" />
                                            <span className="font-medium tracking-wide truncate">{customer["Contact Details"]}</span>
                                        </div>
                                        <div className="flex items-center text-[10px] md:text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-1 rounded-lg w-fit mt-1">
                                            <Briefcase className="w-3 h-3 mr-1.5 shrink-0" />
                                            <span className="truncate">{customer.sales_person || "Unassigned"}</span>
                                        </div>
                                        {customer["Client Type"] && (
                                            <div className="flex items-center mt-1">
                                                <Tag className="w-3.5 h-3.5 md:w-4 md:h-4 mr-3 text-yellow-500 shrink-0" />
                                                <span className="font-bold px-2 py-0.5 bg-yellow-50 text-yellow-700 rounded-md text-[10px] border border-yellow-200 uppercase tracking-widest">{customer["Client Type"]}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 mt-auto">
                                        <button
                                            onClick={() => openFollowUp(customer)}
                                            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all shadow-md shadow-blue-200 active:scale-95"
                                        >
                                            Follow Up
                                        </button>
                                        <button
                                            onClick={() => openEdit(customer)}
                                            className="p-2.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors border border-gray-100 active:scale-90"
                                            title="Edit"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(customer.id)}
                                            className="p-2.5 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors border border-gray-100 active:scale-90"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {visibleCustomers.length === 0 && (
                            <div className="col-span-full flex flex-col items-center justify-center py-16 text-gray-400 bg-white border border-gray-100 rounded-3xl border-dashed">
                                <Search className="w-12 h-12 mb-4 opacity-20" />
                                <p className="text-lg font-medium">No customers found</p>
                                <p className="text-sm">Try adding a new customer or adjusting your search</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <CustomerModal
                isOpen={isCustomerModalOpen}
                onClose={() => setIsCustomerModalOpen(false)}
                customerToEdit={customerToEdit}
                onSuccess={fetchData}
            />

            <FollowUpModal
                isOpen={isFollowUpModalOpen}
                onClose={() => setIsFollowUpModalOpen(false)}
                customer={selectedCustomer}
                onSuccess={fetchData}
            />
        </div>
    );
};

export default CustomersPage;
