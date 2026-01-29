import { useCallback, useMemo, type FC, type ReactNode } from "react";
import { Link, useLocation } from "react-router";

// Assume these icons are imported from an icon library
import {
  BoxCubeIcon,
  HorizontaLDots,
  ListIcon,
  PieChartIcon,
  PlugInIcon,
} from "../icons";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../context/AuthContext";
import logo from "../assert/Logo.jpeg";
import { LogOut } from "lucide-react";

type NavItem = {
  name: string;
  icon: ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

// Dashboard item - shows O2D dashboard by default
const dashboardItem: NavItem = {
  icon: <PieChartIcon />,
  name: "Dashboard",
  path: "/",
};

// O2D with submenu - clicking main item goes to dashboard with o2d tab
const o2dItem: NavItem = {
  icon: <BoxCubeIcon />,
  name: "O2D",
  subItems: [
    { name: "Orders", path: "/o2d/orders", pro: false },
    { name: "Enquiry", path: "/o2d/enquiry", pro: false },
    { name: "First Weight", path: "/o2d/first-weight", pro: false },
    { name: "Load Vehicle", path: "/o2d/load-vehicle", pro: false },
    { name: "Second Weight", path: "/o2d/second-weight", pro: false },
    { name: "Generate Invoice", path: "/o2d/generate-invoice", pro: false },
    { name: "Pending Vehicles", path: "/o2d/process", pro: false },
  ],
};

// BatchCode with submenu - clicking main item goes to dashboard with batchcode tab
const batchCodeItem: NavItem = {
  icon: <BoxCubeIcon />,
  name: "BatchCode",
  subItems: [
    { name: "Laddel", path: "/batchcode/laddel", pro: false },
    { name: "Tundis", path: "/batchcode/tundis", pro: false },
    { name: "SMS Register", path: "/batchcode/sms-register", pro: false },
    { name: "Hot Coil", path: "/batchcode/hot-coil", pro: false },
    { name: "Recoiler", path: "/batchcode/recoiler", pro: false },
    { name: "Pipe Mill", path: "/batchcode/pipe-mill", pro: false },
    { name: "QC Lab", path: "/batchcode/qc-lab", pro: false },

  ],
};

const leadToOrderBaseItem: NavItem = {
  icon: <PlugInIcon />,
  name: "Lead to Order",
};

const leadToOrderBaseSubItems = [
  { name: "Leads", path: "/lead-to-order/leads", pro: false },
  { name: "Follow Up", path: "/lead-to-order/follow-up", pro: false },
  { name: "Call Tracker", path: "/lead-to-order/call-tracker", pro: false },
  { name: "Quotation", path: "/lead-to-order/quotation", pro: false },
];

const leadToOrderSettingsItem: NavItem = {
  icon: <BoxCubeIcon />,
  name: "Settings",
  path: "/lead-to-order/settings",
};

const isAdminUser = (user: { role?: string; userType?: string } | null | undefined) => {
  const role = (user?.userType || user?.role || "").toString().toLowerCase();
  return role.includes("admin");
};

// Helper function to check if a path is allowed based on system_access and page_access
const isPathAllowed = (
  path: string,
  user: { system_access?: string | null; page_access?: string | null; role?: string; userType?: string } | null | undefined,
  isAdmin: boolean
): boolean => {
  // Admin can access everything
  if (isAdmin) {
    return true;
  }

  // If no user or no access defined, deny access
  if (!user || (!user.system_access && !user.page_access)) {
    return false;
  }

  // Map of page names to routes for new page_access format
  const PAGE_NAME_TO_ROUTE_MAP: Record<string, string> = {
    "Dashboard": "/",
    "Orders": "/o2d/orders",
    "First Weight": "/o2d/first-weight",
    "Load Vehicle": "/o2d/load-vehicle",
    "Second Weight": "/o2d/second-weight",
    "Generate Invoice": "/o2d/generate-invoice",
    "Payment": "/o2d/payment",
    "Pending Vehicles": "/o2d/process",
    "Complaint Details": "/o2d/complaint-details",
    "Permissions": "/o2d/permissions",
    "Enquiry": "/o2d/enquiry",
    "Hot Coil": "/batchcode/hot-coil",
    "QC Lab": "/batchcode/qc-lab",
    "SMS Register": "/batchcode/sms-register",
    "Recoiler": "/batchcode/recoiler",
    "Pipe Mill": "/batchcode/pipe-mill",
    "Laddel": "/batchcode/laddel",
    "Tundis": "/batchcode/tundis",
    "Leads": "/lead-to-order/leads",
    "Follow Up": "/lead-to-order/follow-up",
    "Call Tracker": "/lead-to-order/call-tracker",
    "Quotation": "/lead-to-order/quotation",
  };

  // Parse system_access and page_access (comma-separated strings, handle spaces)
  const systemAccess = user.system_access
    ? user.system_access.split(",").map(s => s.trim().toLowerCase().replace(/\s+/g, "")).filter(Boolean)
    : [];
  const pageAccess = user.page_access
    ? user.page_access.split(",").map(p => p.trim()).filter(Boolean)
    : [];

  // Convert page names to routes if needed
  const pageRoutes = pageAccess.map(page => {
    // If it's already a route (starts with /), keep it
    if (page.startsWith("/")) {
      return page;
    }
    // Otherwise, convert page name to route
    return PAGE_NAME_TO_ROUTE_MAP[page] || page;
  });

  // Normalize path for comparison (remove query params and trailing slashes)
  const normalizedPath = path.split("?")[0].replace(/\/$/, "");

  // Determine which system this path belongs to
  let systemMatch = false;

  if (normalizedPath.startsWith("/o2d") || normalizedPath === "/" || path.includes("?tab=o2d")) {
    systemMatch = systemAccess.includes("o2d");
  } else if (normalizedPath.startsWith("/batchcode") || path.includes("?tab=batchcode")) {
    systemMatch = systemAccess.includes("batchcode");
  } else if (normalizedPath.startsWith("/lead-to-order") || path.includes("?tab=lead-to-order")) {
    systemMatch = systemAccess.includes("lead-to-order");
  }

  // If system doesn't match, deny access
  if (!systemMatch && systemAccess.length > 0) {
    return false;
  }

  // If no system_access but has page_access, check page_access directly
  if (systemAccess.length === 0 && pageRoutes.length > 0) {
    return pageRoutes.some(allowedPath => {
      const normalizedAllowed = allowedPath.trim().replace(/\/$/, "");
      // Exact match or path starts with allowed path
      return normalizedPath === normalizedAllowed || normalizedPath.startsWith(normalizedAllowed + "/");
    });
  }

  // Check if specific page is allowed
  if (pageRoutes.length > 0) {
    return pageRoutes.some(allowedPath => {
      const normalizedAllowed = allowedPath.trim().replace(/\/$/, "");
      // Exact match or path starts with allowed path
      return normalizedPath === normalizedAllowed || normalizedPath.startsWith(normalizedAllowed + "/");
    });
  }

  // If system matches but no specific page_access, allow all pages in that system
  return systemMatch;
};

const AppSidebar: FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered, toggleMobileSidebar } = useSidebar();
  const location = useLocation();
  const { logout, user } = useAuth();
  const isAdmin = useMemo(() => isAdminUser(user), [user]);

  const handleLinkClick = useCallback(() => {
    if (isMobileOpen) {
      toggleMobileSidebar();
    }
  }, [isMobileOpen, toggleMobileSidebar]);

  const leadToOrderNavItem = useMemo(() => {
    // Filter subItems based on page_access
    const subItems = leadToOrderBaseSubItems.filter(subItem =>
      isPathAllowed(subItem.path, user, isAdmin)
    );

    return {
      ...leadToOrderBaseItem,
      subItems,
    };
  }, [isAdmin, user]);

  // Filter O2D subItems based on access
  const filteredO2dItem = useMemo(() => {
    // Check if user has o2d system access or any o2d page access
    const systemAccess = user?.system_access
      ? user.system_access.split(",").map(s => s.trim().toLowerCase().replace(/\s+/g, "")).filter(Boolean)
      : [];
    const pageAccess = user?.page_access
      ? user.page_access.split(",").map(p => p.trim()).filter(Boolean)
      : [];

    const hasO2dSystem = systemAccess.includes("o2d");
    const hasO2dPages = pageAccess.some(p => p.startsWith("/o2d"));

    // If no o2d access at all, don't show
    if (!isAdmin && !hasO2dSystem && !hasO2dPages) {
      return null;
    }

    // Filter subItems based on page_access
    const filteredSubItems = o2dItem.subItems?.filter(subItem =>
      isPathAllowed(subItem.path, user, isAdmin)
    ) || [];

    // If no subItems are allowed, don't show the parent item
    if (filteredSubItems.length === 0 && !isAdmin) {
      return null;
    }

    return {
      ...o2dItem,
      subItems: filteredSubItems,
    };
  }, [user, isAdmin]);

  // Filter BatchCode subItems based on access
  const filteredBatchCodeItem = useMemo(() => {
    // Check if user has batchcode system access or any batchcode page access
    const systemAccess = user?.system_access
      ? user.system_access.split(",").map(s => s.trim().toLowerCase().replace(/\s+/g, "")).filter(Boolean)
      : [];
    const pageAccess = user?.page_access
      ? user.page_access.split(",").map(p => p.trim()).filter(Boolean)
      : [];

    const hasBatchcodeSystem = systemAccess.includes("batchcode");
    const hasBatchcodePages = pageAccess.some(p => p.startsWith("/batchcode"));

    // If no batchcode access at all, don't show
    if (!isAdmin && !hasBatchcodeSystem && !hasBatchcodePages) {
      return null;
    }

    // Filter subItems based on page_access
    const filteredSubItems = batchCodeItem.subItems?.filter(subItem =>
      isPathAllowed(subItem.path, user, isAdmin)
    ) || [];

    // If no subItems are allowed, don't show the parent item
    if (filteredSubItems.length === 0 && !isAdmin) {
      return null;
    }

    return {
      ...batchCodeItem,
      subItems: filteredSubItems,
    };
  }, [user, isAdmin]);

  // Check if dashboard should be shown - requires explicit page_access
  const showDashboard = useMemo(() => {
    // Admin can always see dashboard
    if (isAdmin) {
      return true;
    }

    // Check if user has explicit page_access for dashboard
    const pageAccess = user?.page_access
      ? user.page_access.split(",").map(p => p.trim()).filter(Boolean)
      : [];

    // Dashboard is accessible if user has "/" or "/dashboard" in page_access
    return pageAccess.some(path =>
      path === "/" ||
      path === "/dashboard" ||
      path === "/o2d/dashboard"
    );
  }, [user, isAdmin]);

  // Combine items in order: Dashboard (shows O2D), O2D items, BatchCode, Lead to Order
  const navItems: NavItem[] = useMemo(() => {
    const items: NavItem[] = [];

    // Add dashboard if O2D access is allowed
    if (showDashboard) {
      items.push(dashboardItem);
    }

    // Add O2D if allowed
    if (filteredO2dItem) {
      items.push(filteredO2dItem);
    }

    // Add BatchCode if allowed
    if (filteredBatchCodeItem) {
      items.push(filteredBatchCodeItem);
    }

    // Add Lead to Order if it has any allowed subItems
    if (leadToOrderNavItem.subItems && leadToOrderNavItem.subItems.length > 0) {
      items.push(leadToOrderNavItem);
    }

    // Add Settings only for admins (Settings page is admin-only)
    if (isAdmin) {
      items.push(leadToOrderSettingsItem);
    }

    return items;
  }, [showDashboard, filteredO2dItem, filteredBatchCodeItem, leadToOrderNavItem, isAdmin, user]);

  // Check if path is active - handle query params for dashboard tabs
  const isActive = useCallback(
    (path: string) => {
      if (path.includes("?tab=")) {
        const [basePath, queryParam] = path.split("?")
        const tabValue = queryParam?.split("=")[1]
        const currentTab = new URLSearchParams(location.search).get("tab")

        // If on root path and tab matches, it's active
        if (location.pathname === "/" || location.pathname === "/dashboard") {
          if (tabValue && currentTab === tabValue) return true
          // If no tab param and path is root, check if it's the default (o2d)
          if (!tabValue && !currentTab && basePath === "/") return true
        }
        return location.pathname === basePath && currentTab === tabValue
      }
      return location.pathname === path
    },
    [location.pathname, location.search]
  );

  // Helper to get color based on specific button name for unique look
  const getButtonColor = (name: string) => {
    const n = name.toLowerCase();

    // Main Section Parents & Dashboard
    if (n === "dashboard") return "#2563eb";
    if (n === "o2d") return "#06c082ff";
    if (n === "batchcode") return "#ef4444";
    if (n === "lead to order") return "#3b82f6";
    if (n === "settings") return "#475569";

    // O2D Sub-items
    if (n === "orders") return "#059669";
    if (n === "enquiry") return "#84cc16";
    if (n === "first weight") return "#0d9488";
    if (n === "load vehicle") return "#0891b2";
    if (n === "second weight") return "#0284c7";
    if (n === "generate invoice") return "#4f46e5";
    if (n === "pending vehicles") return "#7c3aed";

    // BatchCode Sub-items
    if (n === "laddel") return "#f43f5e";
    if (n === "tundis") return "#ec4899";
    if (n === "sms register") return "#f97316";
    if (n === "hot coil") return "#fbbf24";
    if (n === "recoiler") return "#eab308";
    if (n === "pipe mill") return "#d97706";
    if (n === "qc lab") return "#78350f";

    // Lead to Order Sub-items
    if (n === "leads") return "#1d4ed8";
    if (n === "follow up") return "#9333ea";
    if (n === "call tracker") return "#c026d3";
    if (n === "quotation") return "#dc2626";

    return "#3b82f6"; // Default Blue
  };

  const renderSection = (title: string, items: NavItem[]) => {
    if (items.length === 0) return null;

    return (
      <div className="mb-3">
        <div className="px-6 py-1 mb-0.5">
          <span className="lg:text-[9px] md:text-[8px] text-[7px] font-black uppercase tracking-[0.2em] text-gray-400 opacity-60 font-black">{title}</span>
        </div>
        <ul className="space-y-1 px-3">
          {items.map((nav) => {
            const isMainActive = nav.path && isActive(nav.path);
            const hasSubItems = nav.subItems && nav.subItems.length > 0;
            const btnColor = getButtonColor(nav.name);

            const content = (
              <>
                <span className="flex-shrink-0 text-white drop-shadow-sm scale-90">
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="flex-1 truncate tracking-tight uppercase lg:text-[11px] md:text-[10px] text-[8px]">{nav.name}</span>
                )}
              </>
            );

            const commonClasses = `flex items-center gap-3 px-4 py-2 rounded-xl lg:text-sm md:text-xs text-[10px] font-black transition-all duration-200 text-white
              ${isMainActive
                ? 'shadow-lg ring-2 ring-white/60 scale-[1.02] translate-x-0.5'
                : nav.path ? 'hover:brightness-105 hover:shadow-md' : 'cursor-default'}`;

            const commonStyles = {
              backgroundColor: btnColor,
              boxShadow: isMainActive ? `0 6px 12px -3px ${btnColor}80` : 'none',
            };

            return (
              <li key={nav.name}>
                {nav.path ? (
                  <Link
                    to={nav.path}
                    onClick={handleLinkClick}
                    className={commonClasses}
                    style={commonStyles}
                  >
                    {content}
                  </Link>
                ) : (
                  <div className={commonClasses} style={commonStyles}>
                    {content}
                  </div>
                )}

                {hasSubItems && (isExpanded || isHovered || isMobileOpen) && (
                  <ul className="mt-1 space-y-1 ml-1.5">
                    {nav.subItems?.map((subItem) => {
                      const isSubActive = isActive(subItem.path);
                      const subBtnColor = getButtonColor(subItem.name);
                      return (
                        <li key={subItem.name}>
                          <Link
                            to={subItem.path}
                            onClick={handleLinkClick}
                            className={`flex items-center justify-between px-4 py-1.5 rounded-xl lg:text-[12px] md:text-[11px] text-[9px] font-bold transition-all duration-200 text-white
                              ${isSubActive
                                ? 'ring-2 ring-white/50 shadow-md scale-[1.01]'
                                : 'opacity-90 hover:opacity-100 hover:brightness-105'}`}
                            style={{
                              backgroundColor: subBtnColor,
                            }}
                          >
                            <span className="truncate flex items-center gap-2">
                              {isSubActive ? (
                                <span className="w-1.5 h-1.5 rounded-full bg-white shadow-sm"></span>
                              ) : (
                                <span className="w-1 h-1 rounded-full bg-white/40"></span>
                              )}
                              {subItem.name}
                            </span>
                            {(subItem.new || subItem.pro) && (
                              <span className={`lg:text-[8px] md:text-[7px] text-[6px] px-1.5 py-0.5 rounded-full uppercase font-black ${isSubActive ? 'bg-white text-black' : 'bg-white/20 text-white'}`}>
                                {subItem.new ? 'NEW' : 'PRO'}
                              </span>
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={toggleMobileSidebar}
        />
      )}

      <aside
        className={`fixed top-16 lg:top-0 left-0 flex flex-col bg-white text-gray-800 transition-all duration-300 ease-in-out z-50 border-r border-gray-100 shadow-2xl
          h-[calc(100vh-4rem)] lg:h-screen
          ${isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
              ? "w-[290px]"
              : "w-[90px]"
          }
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0`}
        onMouseEnter={() => !isExpanded && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Brand Header */}
        <div
          className={`shrink-0 h-[70px] flex items-center border-b border-gray-100 shadow-sm relative z-10 ${(!isExpanded && !isHovered) ? "justify-center px-0" : "justify-start px-6"
            }`}
        >
          <Link to="/" onClick={handleLinkClick} className="flex items-center gap-3 w-full overflow-hidden group">
            <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-2xl shadow-[0_6px_16px_rgba(37,99,235,0.3)] group-hover:scale-105 transition-transform">
              S
            </div>
            {(isExpanded || isHovered || isMobileOpen) && (
              <div className="flex flex-col leading-tight">
                <span className="font-extrabold text-[#111827] text-xl tracking-tight">
                  SAGAR TMT
                </span>
                <span className="text-[10px] font-black text-blue-600 tracking-[0.2em] uppercase mt-0.5">
                  & PIPES LTD.
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* User Profile */}
        {(isExpanded || isHovered || isMobileOpen) && (
          <div className="mx-4 mt-6 mb-4 p-4 rounded-2xl bg-gray-50/80 border border-gray-100 flex items-center gap-4 group cursor-default shadow-sm hover:shadow-md transition-all">
            <div className="w-11 h-11 rounded-xl bg-white border-2 border-gray-100 flex items-center justify-center text-sm font-black text-blue-600 shadow-sm">
              <span className="uppercase">{user?.role?.slice(0, 2) || "AD"}</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[14px] font-bold text-[#111827] truncate">
                {user?.role || "Administrator"}
              </span>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">Active Now</span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex flex-col flex-1 overflow-y-auto duration-300 no-scrollbar py-2">
          {showDashboard && renderSection("Main Navigation", [dashboardItem])}
          {filteredO2dItem && renderSection("O2D Section", [filteredO2dItem])}
          {filteredBatchCodeItem && renderSection("BatchCode Section", [filteredBatchCodeItem])}
          {leadToOrderNavItem.subItems && leadToOrderNavItem.subItems.length > 0 &&
            renderSection("Lead to Order Section", [leadToOrderNavItem])
          }
          {isAdmin && renderSection("System Access", [leadToOrderSettingsItem])}
        </div>

        {/* Logout Section */}
        <div className="mt-auto shrink-0 pb-6 pt-4 px-5 border-t border-gray-100 bg-white">
          <button
            onClick={logout}
            className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm font-bold transition-all duration-300 rounded-xl
              ${isExpanded || isHovered || isMobileOpen
                ? "bg-red-50 text-red-600 hover:bg-red-600 hover:text-white shadow-sm hover:shadow-red-500/20"
                : "text-gray-400 hover:text-red-600 justify-center"
              }`}
            title="Logout"
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {(isExpanded || isHovered || isMobileOpen) && (
              <span className="truncate">Sign Out</span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};



export default AppSidebar;
