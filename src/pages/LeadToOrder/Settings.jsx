"use client"

import { useEffect, useMemo, useState, useCallback } from "react";
import { PencilIcon, TrashBinIcon } from "../../icons";
import { useAuth } from "../../context/AuthContext";
import { leadToOrderAPI } from "../../services/leadToOrderAPI";

// System options
const SYSTEM_OPTIONS = [
  { value: "o2d", label: "O2D" },
  { value: "batchcode", label: "Batchcode" },
  { value: "lead-to-order", label: "Lead to Order" },
];

// Page routes organized by system
const PAGE_ROUTES = {
  "o2d": [
    { value: "/o2d/dashboard", label: "O2D Dashboard" },
    { value: "/o2d/orders", label: "Orders" },
    { value: "/o2d/gate-entry", label: "Gate Entry" },
    { value: "/o2d/first-weight", label: "First Weight" },
    { value: "/o2d/load-vehicle", label: "Load Vehicle" },
    { value: "/o2d/second-weight", label: "Second Weight" },
    { value: "/o2d/generate-invoice", label: "Generate Invoice" },
    { value: "/o2d/gate-out", label: "Gate Out Entry" },
    { value: "/o2d/payment", label: "Payment" },
    { value: "/o2d/process", label: "Pending Vehicles" },
    { value: "/o2d/complaint-details", label: "Complaint Details" },
    { value: "/o2d/party-feedback", label: "Party Feedback" },
    { value: "/o2d/permissions", label: "Permissions" },
  ],
  "batchcode": [
    { value: "/batchcode/dashboard", label: "Batchcode Dashboard" },
    { value: "/batchcode/hot-coil", label: "Hot Coil" },
    { value: "/batchcode/qc-lab", label: "QC Lab" },
    { value: "/batchcode/sms-register", label: "SMS Register" },
    { value: "/batchcode/recoiler", label: "Recoiler" },
    { value: "/batchcode/pipe-mill", label: "Pipe Mill" },
    { value: "/batchcode/laddel", label: "Laddel" },
    { value: "/batchcode/tundis", label: "Tundis" },
  ],
  "lead-to-order": [
    { value: "/lead-to-order/dashboard", label: "Lead to Order Dashboard" },
    { value: "/lead-to-order/leads", label: "Leads" },
    { value: "/lead-to-order/follow-up", label: "Follow Up" },
    { value: "/lead-to-order/follow-up/new", label: "New Follow Up" },
    { value: "/lead-to-order/call-tracker", label: "Call Tracker" },
    { value: "/lead-to-order/call-tracker/new", label: "New Call Tracker" },
    { value: "/lead-to-order/quotation", label: "Quotation" },
    { value: "/lead-to-order/settings", label: "Settings" },
  ],
};

const defaultForm = {
  user_name: "",
  password: "",
  email_id: "",
  number: "",
  department: "",
  role: "user",
  status: "active",
  user_access: "",
  page_access: "",
  system_access: "",
  remark: "",
  employee_id: "",
};

const Settings = () => {
  const { user } = useAuth();
  const isAdmin = useMemo(() => {
    const role = user?.role || user?.userType || "";
    return typeof role === "string" && role.toLowerCase().includes("admin");
  }, [user]);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formMode, setFormMode] = useState("create"); // "create" | "edit"
  const [formData, setFormData] = useState(() => ({ ...defaultForm }));
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [departments, setDepartments] = useState([]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await leadToOrderAPI.listUsers();
      if (response.data?.success) {
        setUsers(response.data.data || []);
      } else {
        setMessage({ type: "error", text: response.data?.message || "Unable to load users" });
      }
    } catch (error) {
      console.error("Load users error:", error);
      setMessage({ type: "error", text: "Unable to fetch users from server" });
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await leadToOrderAPI.getDepartments();
      if (response.data?.success) {
        setDepartments(response.data.data || []);
      }
    } catch (error) {
      console.error("Load departments error:", error);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
      loadDepartments();
    }
  }, [isAdmin]);

  const resetForm = () => {
    setFormMode("create");
    setSelectedUserId(null);
    setFormData({ ...defaultForm });
    setShowModal(false);
    setMessage(null);
  };

  const handleEdit = (userRecord) => {
    if (!userRecord) return;
    setFormMode("edit");
    setSelectedUserId(userRecord.id);
    
    // Parse system_access and page_access if they're comma-separated strings
    const systemAccess = userRecord.system_access || "";
    const pageAccess = userRecord.page_access || "";
    
    setFormData({
      user_name: userRecord.user_name || "",
      password: "",
      email_id: userRecord.email_id || "",
      number: userRecord.number || "",
      department: userRecord.department || "",
      role: userRecord.role || "user",
      status: userRecord.status || "active",
      user_access: userRecord.user_access || "",
      page_access: pageAccess,
      system_access: systemAccess,
      remark: userRecord.remark || "",
      employee_id: userRecord.employee_id || "",
    });
    setShowModal(true);
    setMessage(null);
  };

  const handleCreateClick = () => {
    setFormMode("create");
    setSelectedUserId(null);
    setFormData({ ...defaultForm });
    setMessage(null);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("This will permanently delete the user. Continue?")) {
      return;
    }
    try {
      setProcessing(true);
      await leadToOrderAPI.deleteUserRecord(id);
      setMessage({ type: "success", text: "User deleted successfully" });
      await loadUsers();
      if (selectedUserId === id) {
        resetForm();
      }
    } catch (error) {
      console.error("Delete user error:", error);
      setMessage({ type: "error", text: "Unable to delete user" });
    } finally {
      setProcessing(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isAdmin) {
      return;
    }

    // Handle system_access and page_access - convert arrays to comma-separated strings
    const systemAccess = Array.isArray(formData.system_access) 
      ? formData.system_access.join(",") 
      : formData.system_access || null;
    
    const pageAccess = Array.isArray(formData.page_access)
      ? formData.page_access.join(",")
      : formData.page_access || null;

    const payload = {
      ...formData,
      user_name: formData.user_name.trim(),
      number: formData.number || null,
      email_id: formData.email_id || null,
      department: formData.department || (formMode === "create" ? "" : null),
      user_access: formData.user_access || null,
      page_access: pageAccess,
      system_access: systemAccess,
      remark: formData.remark || null,
      employee_id: formData.employee_id || null,
    };

    if (formMode === "edit" && !payload.password) {
      delete payload.password;
    }

    if (formMode === "create" && !payload.password) {
      setMessage({ type: "error", text: "Password is required for new users" });
      return;
    }

    if (formMode === "create" && !payload.department) {
      setMessage({ type: "error", text: "Department is required" });
      return;
    }

    try {
      setProcessing(true);
      if (formMode === "create") {
        await leadToOrderAPI.createUserRecord(payload);
        setMessage({ type: "success", text: "User created successfully" });
      } else if (selectedUserId) {
        await leadToOrderAPI.updateUserRecord(selectedUserId, payload);
        setMessage({ type: "success", text: "User updated successfully" });
      }
      await loadUsers();
      resetForm();
      setShowModal(false);
    } catch (error) {
      console.error("Submit user error:", error);
      setMessage({
        type: "error",
        text: error?.response?.data?.message || "Unable to save user",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleChange = useCallback((event) => {
    const { name, value } = event.target;
    setFormData((prev) => {
      const newData = {
        ...prev,
        [name]: value,
      };
      // If system_access changes, reset page_access to only show relevant pages
      if (name === "system_access") {
        newData.page_access = "";
      }
      return newData;
    });
  }, []);

  const handleSystemAccessChange = useCallback((systemValue, checked) => {
    setFormData((prev) => {
      const currentSystems = prev.system_access ? prev.system_access.split(",").map(s => s.trim()).filter(Boolean) : [];
      let newSystems;
      if (checked) {
        newSystems = [...currentSystems, systemValue];
      } else {
        newSystems = currentSystems.filter(s => s !== systemValue);
      }
      return {
        ...prev,
        system_access: newSystems.join(","),
        page_access: "", // Reset page access when system changes
      };
    });
  }, []);

  const handlePageAccessChange = useCallback((pageValue, checked) => {
    setFormData((prev) => {
      const currentPages = prev.page_access ? prev.page_access.split(",").map(p => p.trim()).filter(Boolean) : [];
      let newPages;
      if (checked) {
        newPages = [...currentPages, pageValue];
      } else {
        newPages = currentPages.filter(p => p !== pageValue);
      }
      return {
        ...prev,
        page_access: newPages.join(","),
      };
    });
  }, []);


  // Get available pages based on selected system access
  const getAvailablePages = useMemo(() => {
    if (!formData.system_access) {
      return [];
    }
    const systems = formData.system_access.split(",").map(s => s.trim()).filter(Boolean);
    const availablePages = [];
    systems.forEach(system => {
      if (PAGE_ROUTES[system]) {
        availablePages.push(...PAGE_ROUTES[system]);
      }
    });
    return availablePages;
  }, [formData.system_access]);

  // Get selected page values as array
  const getSelectedPages = useMemo(() => {
    if (!formData.page_access) return [];
    return formData.page_access.split(",").map(p => p.trim()).filter(Boolean);
  }, [formData.page_access]);

  // Get selected system values as array
  const getSelectedSystems = useMemo(() => {
    if (!formData.system_access) return [];
    return formData.system_access.split(",").map(s => s.trim()).filter(Boolean);
  }, [formData.system_access]);

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto mt-12 rounded-lg border border-red-100 bg-red-50 p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-red-700">Admin Access Required</h1>
        <p className="mt-2 text-sm text-red-600">
          Only users with the admin role can manage users. If you believe this is an issue, ask an administrator to adjust your permissions.
        </p>
      </div>
    );
  }

  // Memoized form values to prevent unnecessary re-renders
  const selectedSystems = getSelectedSystems;
  const selectedPages = getSelectedPages;
  const availablePages = getAvailablePages;

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) {
      return users;
    }
    const query = searchQuery.toLowerCase().trim();
    return users.filter((user) =>
      user.user_name?.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  return (
    <div className="w-full space-y-4 sm:space-y-6 py-4 sm:py-6 md:py-8 px-4 sm:px-6 bg-transparent">
      {/* Header Section */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">Settings</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">Manage Lead-to-Order users and their access rights.</p>
          </div>
          <button
            type="button"
            onClick={handleCreateClick}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-sky-500 px-4 py-2 text-xs sm:text-sm font-semibold uppercase tracking-wide text-white shadow-lg shadow-emerald-200 transition hover:brightness-110"
          >
            <span>+</span> Create New User
          </button>
        </div>
      </section>

      {/* Users Table Section */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
          <div>
            <p className="text-base sm:text-lg font-semibold text-slate-900">Existing users</p>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {filteredUsers.length} of {users.length} user{users.length === 1 ? "" : "s"} protected by Role: Admin only.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:flex-initial sm:w-64">
              <input
                type="text"
                placeholder="Search by username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 pl-9 text-sm focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label="Clear search"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 w-fit">
              {loading ? "Refreshing..." : "Up to date"}
            </span>
          </div>
        </div>

        <div className="mt-4 sm:mt-5 -mx-4 sm:mx-0">
          <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
            <div className="inline-block min-w-full align-middle">
              <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
                <table className="min-w-full text-left text-xs sm:text-sm text-slate-600">
                  <thead className="sticky top-0 z-10 bg-white border-b-2 border-slate-300 shadow-sm">
                    <tr className="text-[10px] sm:text-xs uppercase tracking-wide text-slate-600">
                      <th className="px-2 sm:px-3 py-3 font-bold bg-white whitespace-nowrap min-w-[120px]">Username</th>
                      <th className="px-2 sm:px-3 py-3 font-bold bg-white hidden sm:table-cell whitespace-nowrap min-w-[80px]">Role</th>
                      <th className="px-2 sm:px-3 py-3 font-bold bg-white whitespace-nowrap min-w-[100px]">Status</th>
                      <th className="px-2 sm:px-3 py-3 font-bold bg-white hidden md:table-cell whitespace-nowrap min-w-[150px]">Access</th>
                      <th className="px-2 sm:px-3 py-3 font-bold bg-white hidden lg:table-cell whitespace-nowrap min-w-[200px]">Page / System</th>
                      <th className="px-2 sm:px-3 py-3 font-bold bg-white hidden xl:table-cell whitespace-nowrap min-w-[120px]">Created</th>
                      <th className="px-2 sm:px-3 py-3 font-bold bg-white text-right whitespace-nowrap min-w-[100px]">Actions</th>
                    </tr>
                  </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="px-2 sm:px-3 py-6 text-center text-xs uppercase text-slate-400">
                        Loading users...
                      </td>
                    </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-2 sm:px-3 py-6 text-center text-xs text-slate-400">
                      {searchQuery ? `No users found matching "${searchQuery}"` : "No users found."}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((userEntry) => (
                      <tr key={userEntry.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer">
                      <td className="px-2 sm:px-3 py-3 font-semibold text-slate-900 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="truncate max-w-[120px]">{userEntry.user_name}</span>
                          <span className="text-[10px] text-slate-500 sm:hidden">{userEntry.role || "user"}</span>
                        </div>
                      </td>
                      <td className="px-2 sm:px-3 py-3 uppercase text-xs tracking-wide text-slate-500 hidden sm:table-cell whitespace-nowrap">
                        {userEntry.role || "user"}
                      </td>
                      <td className="px-2 sm:px-3 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-semibold ${
                            userEntry.status === "active"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {userEntry.status || "active"}
                        </span>
                      </td>
                      <td className="px-2 sm:px-3 py-3 text-xs hidden md:table-cell whitespace-nowrap">
                        <div className="truncate max-w-[150px]">{userEntry.user_access || "—"}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{userEntry.department || ""}</div>
                      </td>
                      <td className="px-2 sm:px-3 py-3 text-xs leading-tight hidden lg:table-cell whitespace-nowrap">
                        <div className="truncate max-w-[200px]">{userEntry.page_access || "No page access"}</div>
                        <div className="truncate text-[10px] text-slate-400 max-w-[200px]">{userEntry.system_access || "No system access"}</div>
                      </td>
                      <td className="px-2 sm:px-3 py-3 text-[10px] sm:text-xs text-slate-400 hidden xl:table-cell whitespace-nowrap">
                        {userEntry.created_at
                          ? new Date(userEntry.created_at).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="px-2 sm:px-3 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1 sm:gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(userEntry);
                            }}
                            className="rounded-lg border border-slate-200 bg-white p-1.5 sm:p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-900 hover:bg-slate-50 flex-shrink-0"
                            aria-label="Edit user"
                          >
                            <PencilIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(userEntry.id);
                            }}
                            className="rounded-lg border border-slate-200 bg-white p-1.5 sm:p-2 text-slate-500 transition hover:border-red-300 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
                            aria-label="Delete user"
                          >
                            <TrashBinIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    ))
                  )}
                </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modal for Create/Edit Form */}
      {showModal && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto pointer-events-none" 
          aria-labelledby="modal-title" 
          role="dialog" 
          aria-modal="true"
        >
          <div className="flex items-start justify-center min-h-screen pt-8 sm:pt-12 md:pt-16 px-4 pb-8 text-center pointer-events-none">
            {/* Modal panel - no background overlay, dashboard visible behind */}
            <div 
              className="relative inline-block align-top bg-white rounded-xl text-left overflow-hidden shadow-2xl transform transition-all w-full sm:max-w-5xl mx-4 mt-8 sm:mt-12 pointer-events-auto border-2 border-slate-300"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white px-4 pt-6 pb-6 sm:p-8">
                <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-slate-300">
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                    {formMode === "create" ? "Create New User" : "Edit User"}
                  </h3>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-slate-500 hover:text-slate-700 transition p-2 rounded-full hover:bg-slate-100"
                    aria-label="Close modal"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {message && (
                  <div
                    className={`mb-4 rounded-md px-4 py-2 text-sm ${
                      message.type === "error"
                        ? "bg-red-50 text-red-800 border border-red-200"
                        : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    }`}
                  >
                    {message.text}
                  </div>
                )}

                <div className="max-h-[65vh] overflow-y-auto pr-2 mt-4">
                  <form className="grid gap-4 grid-cols-1" onSubmit={handleSubmit}>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Username
                      </label>
                      <input
                        name="user_name"
                        value={formData.user_name}
                        onChange={handleChange}
                        placeholder="e.g. johndoe"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Password
                      </label>
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder={formMode === "create" ? "Enter password" : "Leave empty to keep existing"}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                        autoComplete="new-password"
                        {...(formMode === "create" ? { required: true } : {})}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Role
                      </label>
                      <select
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Status
                      </label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Email
                      </label>
                      <input
                        type="email"
                        name="email_id"
                        value={formData.email_id}
                        onChange={handleChange}
                        placeholder="admin@example.com"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Mobile / Number
                      </label>
                      <input
                        name="number"
                        value={formData.number}
                        onChange={handleChange}
                        placeholder="+91 ..."
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Department
                      </label>
                      <select
                        name="department"
                        value={formData.department}
                        onChange={handleChange}
                        required={formMode === "create"}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      >
                        <option value="">Select Department</option>
                        {departments.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        System Access
                      </label>
                      <div className="rounded-lg border border-slate-200 p-3 space-y-2 bg-slate-50">
                        {SYSTEM_OPTIONS.map((option) => {
                          const isChecked = selectedSystems.includes(option.value);
                          return (
                            <label key={option.value} className="flex items-center gap-2 cursor-pointer hover:bg-white p-2 rounded transition-colors">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => handleSystemAccessChange(option.value, e.target.checked)}
                                className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-2 focus:ring-emerald-500"
                              />
                              <span className="text-sm text-slate-700">{option.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Page Access
                      </label>
                      <div className={`rounded-lg border border-slate-200 p-3 space-y-2 max-h-[300px] overflow-y-auto ${!formData.system_access ? 'bg-slate-100 opacity-60' : 'bg-slate-50'}`}>
                        {availablePages.length > 0 ? (
                          availablePages.map((page) => {
                            const isChecked = selectedPages.includes(page.value);
                            return (
                              <label key={page.value} className={`flex items-center gap-2 cursor-pointer hover:bg-white p-2 rounded transition-colors ${!formData.system_access ? 'cursor-not-allowed' : ''}`}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => handlePageAccessChange(page.value, e.target.checked)}
                                  disabled={!formData.system_access}
                                  className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                                />
                                <span className={`text-sm ${!formData.system_access ? 'text-slate-400' : 'text-slate-700'}`}>{page.label}</span>
                              </label>
                            );
                          })
                        ) : (
                          <p className="text-sm text-slate-400 text-center py-4">Select System Access first</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Remark
                      </label>
                      <textarea
                        name="remark"
                        value={formData.remark}
                        onChange={handleChange}
                        rows={2}
                        placeholder="Additional notes"
                        className="h-16 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Employee ID
                      </label>
                      <input
                        name="employee_id"
                        value={formData.employee_id}
                        onChange={handleChange}
                        placeholder="EMP1001"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                    <div className="flex items-end justify-end gap-2">
                      {formMode === "edit" && (
                        <button
                          type="button"
                          onClick={resetForm}
                          className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                        >
                          Cancel edit
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={processing}
                        className="flex items-center justify-center gap-1 rounded-full bg-gradient-to-r from-emerald-500 to-sky-500 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-lg shadow-emerald-200 transition hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {formMode === "create" ? "Create user" : "Update user"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
