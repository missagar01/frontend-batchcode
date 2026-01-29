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
  path: "/?tab=o2d",
  subItems: [
    { name: "Orders", path: "/o2d/orders", pro: false },
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
  path: "/?tab=batchcode",
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
  path: "/?tab=lead-to-order",
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

  // Determine menu item color based on name - unified professional look
  const getMenuColor = () => {
    return {
      activeBg: "bg-blue-600",
      defaultBg: "bg-transparent",
      activeText: "text-white",
      hoverBg: "hover:bg-blue-50",
      text: "text-gray-600",
      iconColor: "text-gray-500",
      activeIconColor: "text-white",
      badgeBg: "bg-blue-100 text-blue-700"
    };
  };

  const renderMenuItems = (items: NavItem[]) => (
    <ul className="flex flex-col gap-1 px-3">
      {items.map((nav) => {
        const menuColor = getMenuColor();
        const isMainActive = nav.path && isActive(nav.path);

        // Check if any child is active to highlight parent subtly if needed
        const isChildActive = nav.subItems?.some(sub => isActive(sub.path));

        const baseClasses = `rounded-md transition-all duration-200 text-sm flex items-center gap-3 font-medium cursor-pointer select-none`;

        // Active Styles
        const activeClass = `${menuColor.activeBg} ${menuColor.activeText} shadow-sm`;

        // Inactive Styles (but parent of active child gets subtle highlight)
        const inactiveClass = isChildActive
          ? `bg-blue-50 text-blue-700`
          : `${menuColor.text} ${menuColor.defaultBg} ${menuColor.hoverBg}`;

        const linkTarget = nav.path ?? "#";
        const hasSubItems = nav.subItems && nav.subItems.length > 0;
        // Always expanded as requested
        const isExpandedState = true;

        return (
          <li key={nav.name} className="mb-1">
            {nav.path ? (
              <Link
                to={linkTarget}
                onClick={handleLinkClick}
                className={`${baseClasses} px-3 py-2.5 w-full ${isMainActive ? activeClass : inactiveClass}`}
              >
                <span
                  className={`menu-item-icon-size flex-shrink-0 ${isMainActive ? menuColor.activeIconColor : (isChildActive ? "text-blue-600" : menuColor.iconColor)}`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="flex-1 truncate">{nav.name}</span>
                )}
              </Link>
            ) : (
              <div
                className={`${baseClasses} px-3 py-2.5 w-full ${isChildActive ? "text-blue-700 bg-blue-50/50" : "text-gray-500 hover:text-gray-700"}`}
              >
                <div className="flex items-center gap-3 w-full overflow-hidden">
                  <span
                    className={`menu-item-icon-size flex-shrink-0 ${isChildActive ? "text-blue-600" : "text-gray-400"}`}
                  >
                    {nav.icon}
                  </span>
                  {(isExpanded || isHovered || isMobileOpen) && (
                    <span className="flex-1 font-semibold uppercase text-xs tracking-wider truncate">{nav.name}</span>
                  )}
                </div>
              </div>
            )}

            {/* Always show subitems if present and sidebar is open */}
            {hasSubItems && (isExpanded || isHovered || isMobileOpen) && (
              <ul className="mt-1 space-y-0.5 relative ml-5 pl-3 border-l-2 border-gray-100">
                {nav.subItems?.map((subItem) => {
                  const isSubActive = isActive(subItem.path);
                  return (
                    <li key={subItem.name}>
                      <Link
                        to={subItem.path}
                        onClick={handleLinkClick}
                        className={`flex items-center justify-between rounded-md px-3 py-2 text-[13px] font-medium transition-colors duration-200 ${isSubActive
                          ? "bg-blue-50 text-blue-700"
                          : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                          }`}
                      >
                        <span className="truncate">{subItem.name}</span>
                        {/* Badges */}
                        {(subItem.new || subItem.pro) && (
                          <span className="flex items-center gap-1 ml-2 text-[10px] font-bold uppercase transition-opacity">
                            {subItem.new && (
                              <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded shadow-sm">
                                NEW
                              </span>
                            )}
                            {subItem.pro && (
                              <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded shadow-sm">
                                PRO
                              </span>
                            )}
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
  );



  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white text-gray-700 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 shadow-lg
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
      <div
        className={`pt-6 pb-2 px-6 flex ${!isExpanded && !isHovered ? "justify-center" : "justify-start"
          }`}
      >
        <Link to="/" onClick={handleLinkClick}>
          <img
            src={logo}
            alt="SAGAR TMT & PIPES Logo"
            className="object-contain"
            style={{
              width: isExpanded || isHovered || isMobileOpen ? '150px' : '40px',
              height: isExpanded || isHovered || isMobileOpen ? 'auto' : '40px',
            }}
          />
        </Link>
      </div>
      <div className="flex flex-col flex-1 overflow-y-auto duration-300 ease-linear no-scrollbar py-4">
        <nav className="space-y-6">
          <div className="space-y-1">
            <div
              className={`px-6 mb-2 text-xs font-semibold tracking-wider text-gray-400 uppercase ${!isExpanded && !isHovered ? "text-center" : "text-left"}`}
            >
              {isExpanded || isHovered || isMobileOpen ? (
                "Main Menu"
              ) : (
                <HorizontaLDots className="mx-auto" />
              )}
            </div>
            {renderMenuItems(navItems)}
          </div>
        </nav>
      </div>

      {/* Logout Button */}
      <div className="mt-auto pb-4 pt-4 border-t border-gray-200">
        <button
          onClick={logout}
          className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors duration-200 text-red-600 hover:bg-red-50 ${isExpanded || isHovered || isMobileOpen
            ? "justify-start"
            : "justify-center"
            }`}
          title="Logout"
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {(isExpanded || isHovered || isMobileOpen) && (
            <span>Sign Out</span>
          )}
        </button>
      </div>
    </aside>
  );
};



export default AppSidebar;
