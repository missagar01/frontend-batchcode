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
    { name: "Gate Entry", path: "/o2d/gate-entry", pro: false },
    { name: "First Weight", path: "/o2d/first-weight", pro: false },
    { name: "Load Vehicle", path: "/o2d/load-vehicle", pro: false },
    { name: "Second Weight", path: "/o2d/second-weight", pro: false },
    { name: "Generate Invoice", path: "/o2d/generate-invoice", pro: false },
    { name: "Gate Out Entry", path: "/o2d/gate-out", pro: false },
    { name: "Pending Vehicles", path: "/o2d/process", pro: false },
    { name: "Payment", path: "/o2d/payment", pro: false },
    { name: "Party Feedback", path: "/o2d/party-feedback", pro: false },
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

  // Parse system_access and page_access (comma-separated strings, handle spaces)
  const systemAccess = user.system_access 
    ? user.system_access.split(",").map(s => s.trim().toLowerCase().replace(/\s+/g, "")).filter(Boolean)
    : [];
  const pageAccess = user.page_access
    ? user.page_access.split(",").map(p => p.trim()).filter(Boolean)
    : [];

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
  if (systemAccess.length === 0 && pageAccess.length > 0) {
    return pageAccess.some(allowedPath => {
      const normalizedAllowed = allowedPath.trim().replace(/\/$/, "");
      // Exact match or path starts with allowed path
      return normalizedPath === normalizedAllowed || normalizedPath.startsWith(normalizedAllowed + "/");
    });
  }

  // Check if specific page is allowed
  if (pageAccess.length > 0) {
    return pageAccess.some(allowedPath => {
      const normalizedAllowed = allowedPath.trim().replace(/\/$/, "");
      // Exact match or path starts with allowed path
      return normalizedPath === normalizedAllowed || normalizedPath.startsWith(normalizedAllowed + "/");
    });
  }

  // If system matches but no specific page_access, allow all pages in that system
  return systemMatch;
};

const AppSidebar: FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const location = useLocation();
  const { logout, user } = useAuth();
  const isAdmin = useMemo(() => isAdminUser(user), [user]);

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

  // Check if dashboard should be shown (O2D access)
  const showDashboard = useMemo(() => {
    return isPathAllowed("/", user, isAdmin);
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
    
    // Add Settings separately if admin or allowed
    if (isAdmin || isPathAllowed("/lead-to-order/settings", user, isAdmin)) {
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

  // Determine menu item color based on name
const getMenuColor = (name: string) => {
  if (name === "O2D") {
    return {
      activeBg: "bg-indigo-600",
      defaultBg: "bg-indigo-50",
      activeText: "text-white",
      hoverBg: "hover:bg-indigo-100",
      text: "text-gray-700",
      badgeBg: "bg-indigo-300 text-indigo-900"
    };
  }
  if (name === "BatchCode") {
    return {
      activeBg: "bg-blue-600",
      defaultBg: "bg-blue-50",
      activeText: "text-white",
      hoverBg: "hover:bg-blue-100",
      text: "text-gray-700",
      badgeBg: "bg-blue-300 text-blue-900"
    };
  }
  if (name === "Lead to Order") {
    return {
      activeBg: "bg-emerald-600",
      defaultBg: "bg-emerald-50",
      activeText: "text-white",
      hoverBg: "hover:bg-emerald-100",
      text: "text-gray-700",
      badgeBg: "bg-emerald-300 text-emerald-900"
    };
  }
  // Default for Dashboard
  return {
    activeBg: "bg-gray-800",
    defaultBg: "bg-gray-50",
    activeText: "text-white",
    hoverBg: "hover:bg-gray-100",
    text: "text-gray-700",
    badgeBg: "bg-gray-300 text-gray-900"
  };
};

  const renderMenuItems = (items: NavItem[]) => (
    <ul className="flex flex-col gap-1.5">
      {items.map((nav) => {
        const menuColor = getMenuColor(nav.name);
        const isMainActive =
          (nav.path && isActive(nav.path)) ||
          (nav.subItems &&
            nav.subItems.some((subItem) => isActive(subItem.path)));
        const baseClasses = `rounded-lg transition-all duration-200 text-sm flex items-center gap-3 font-medium`;
        const activeClass = `${menuColor.activeBg} ${menuColor.activeText} shadow-md`;
        const inactiveClass = `${menuColor.text} ${menuColor.defaultBg} ${menuColor.hoverBg}`;
        const linkTarget = nav.path ?? "#";

        return (
          <li key={nav.name}>
            {nav.path ? (
              <Link
                to={linkTarget}
                className={`${baseClasses} px-3 py-2 flex-1 ${
                  isMainActive ? activeClass : inactiveClass
                }`}
              >
                <span
                  className={`menu-item-icon-size ${
                    isMainActive ? menuColor.activeText : menuColor.text
                  }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="flex-1">{nav.name}</span>
                )}
              </Link>
            ) : (
              <div
                className={`${baseClasses} px-3 py-2 flex-1 justify-between ${
                  isMainActive ? activeClass : inactiveClass
                }`}
              >
                <span className="flex items-center gap-3">
                  <span
                    className={`menu-item-icon-size ${
                      isMainActive ? menuColor.activeText : menuColor.text
                    }`}
                  >
                    {nav.icon}
                  </span>
                  {(isExpanded || isHovered || isMobileOpen) && (
                    <span>{nav.name}</span>
                  )}
                </span>
              </div>
            )}
            {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
              <ul className="mt-2 space-y-1 ml-4 pl-4 border-l-2 border-gray-300">
                {nav.subItems.map((subItem) => {
                  const isSubActive = isActive(subItem.path);
                  return (
                    <li key={subItem.name}>
                      <Link
                        to={subItem.path}
                        className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors duration-200 ${
                          isSubActive
                            ? `${menuColor.activeBg} ${menuColor.activeText} shadow-sm`
                            : `${menuColor.text} hover:bg-gray-100 hover:text-gray-900`
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50"></span>
                          <span>{subItem.name}</span>
                        </span>
                        <span className="flex items-center gap-1 ml-2 text-xs font-semibold uppercase">
                          {subItem.new && (
                            <span className={`${menuColor.badgeBg} px-2 py-0.5 rounded-full text-xs`}>
                              new
                            </span>
                          )}
                          {subItem.pro && (
                            <span className={`${menuColor.badgeBg} px-2 py-0.5 rounded-full text-xs`}>
                              pro
                            </span>
                          )}
                        </span>
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
        ${
          isExpanded || isMobileOpen
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
        className={`py-8 flex ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link to="/">
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
      <div className="flex flex-col flex-1 overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="px-2 py-4 space-y-3">
            <div
              className={`mb-2 text-xs uppercase text-gray-500 flex items-center gap-2 ${
                !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
              }`}
            >
              {isExpanded || isHovered || isMobileOpen ? (
                "Menu"
              ) : (
                <HorizontaLDots className="text-gray-500" />
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
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 text-gray-700 hover:bg-gray-100 hover:text-gray-900 ${
            isExpanded || isHovered || isMobileOpen
              ? "justify-start"
              : "justify-center"
          }`}
          title="Logout"
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {(isExpanded || isHovered || isMobileOpen) && (
            <span>Logout</span>
          )}
        </button>
      </div>
    </aside>
  );
};



export default AppSidebar;
