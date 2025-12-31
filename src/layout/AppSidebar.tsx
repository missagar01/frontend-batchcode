import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { Link, useLocation } from "react-router";

// Assume these icons are imported from an icon library
import {
  BoxCubeIcon,
  ChevronDownIcon,
  HorizontaLDots,
  ListIcon,
  PieChartIcon,
  ArrowRightIcon,
  BoxIcon,
  DollarLineIcon,
  ShootingStarIcon,
} from "../icons";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../context/AuthContext";
import logo from "../assert/Logo.jpeg";
import { LogOut } from "lucide-react";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

// O2D items - shown in sidebar for all users
const o2dItems: NavItem[] = [
  {
    icon: <ListIcon />,
    name: "Orders",
    path: "/o2d/orders",
  },
  {
    icon: <ArrowRightIcon />,
    name: "Gate Entry",
    path: "/o2d/gate-entry",
  },
  {
    icon: <BoxIcon />,
    name: "First Weight",
    path: "/o2d/first-weight",
  },
  {
    icon: <BoxCubeIcon />,
    name: "Load Vehicle",
    path: "/o2d/load-vehicle",
  },
  {
    icon: <BoxIcon />,
    name: "Second Weight",
    path: "/o2d/second-weight",
  },
  {
    icon: <DollarLineIcon />,
    name: "Generate Invoice",
    path: "/o2d/generate-invoice",
  },
  {
    icon: <ArrowRightIcon />,
    name: "Gate Out Entry",
    path: "/o2d/gate-out",
  },
  {
    icon: <PieChartIcon />,
    name: "Pending Vehicles",
    path: "/o2d/process",
  },
  {
    icon: <DollarLineIcon />,
    name: "Payment",
    path: "/o2d/payment",
  },
  {
    icon: <ShootingStarIcon />,
    name: "Party Feedback",
    path: "/o2d/party-feedback",
  },
];

// Dashboard item - shows O2D dashboard by default
const dashboardItem: NavItem = {
  icon: <PieChartIcon />,
  name: "Dashboard",
  path: "/",
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

const leadToOrderBaseItem = {
  icon: <ListIcon />,
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

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const location = useLocation();
  const { logout, user } = useAuth();
  const isAdmin = useMemo(() => isAdminUser(user), [user]);

  const leadToOrderNavItem = useMemo(() => {
    // Filter subItems based on page_access
    const subItems = leadToOrderBaseSubItems.filter(subItem => 
      isPathAllowed(subItem.path, user, isAdmin)
    );
    
    // Add Settings if admin or if allowed in page_access
    if (isAdmin || isPathAllowed("/lead-to-order/settings", user, isAdmin)) {
      subItems.push({ name: "Settings", path: "/lead-to-order/settings", pro: false });
    }
    
    return {
      ...leadToOrderBaseItem,
      subItems,
    };
  }, [isAdmin, user]);

  // Filter O2D items based on access
  const filteredO2dItems = useMemo(() => {
    return o2dItems.filter(item => 
      item.path && isPathAllowed(item.path, user, isAdmin)
    );
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
    
    // Add filtered O2D items
    if (filteredO2dItems.length > 0) {
      items.push(...filteredO2dItems);
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
  }, [showDashboard, filteredO2dItems, filteredBatchCodeItem, leadToOrderNavItem, isAdmin, user]);

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main";
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {}
  );
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

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

  useEffect(() => {
    let submenuMatched = false;
    navItems.forEach((nav, index) => {
      if (nav.subItems) {
        // Check if any subItem path is active
        nav.subItems.forEach((subItem) => {
          if (isActive(subItem.path)) {
            setOpenSubmenu({
              type: "main",
              index,
            });
            submenuMatched = true;
          }
        });
      }
    });

    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [location, isActive, navItems]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index: number) => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === "main" &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { type: "main", index };
    });
  };

  const handleMainItemClick = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    handleSubmenuToggle(index);
  };

  // Determine menu item color based on name
const getMenuColor = (name: string) => {
  if (name === "BatchCode") {
    return {
      activeBg: "bg-blue-600",
      defaultBg: "bg-blue-600/40",
      activeText: "text-white",
      hoverBg: "hover:bg-blue-500",
      text: "text-white",
      badgeBg: "bg-blue-300 text-blue-900"
    };
  }
  if (name === "Lead to Order") {
    return {
      activeBg: "bg-emerald-600",
      defaultBg: "bg-emerald-600/40",
      activeText: "text-white",
      hoverBg: "hover:bg-emerald-500",
      text: "text-white",
      badgeBg: "bg-emerald-300 text-emerald-900"
    };
  }
  // Default for Dashboard and O2D items
  return {
    activeBg: "bg-gray-800",
    defaultBg: "bg-transparent",
    activeText: "text-white",
    hoverBg: "hover:bg-gray-700/60",
    text: "text-white/80",
    badgeBg: "bg-gray-700 text-gray-200"
  };
};

  const renderMenuItems = (items: NavItem[]) => (
    <ul className="flex flex-col gap-1.5">
      {items.map((nav, index) => {
        const menuColor = getMenuColor(nav.name);
        const isMainActive =
          (nav.path && isActive(nav.path)) ||
          (nav.subItems &&
            nav.subItems.some((subItem) => isActive(subItem.path)));
        const baseClasses = `rounded-lg transition-all duration-200 text-sm flex items-center gap-3 font-medium`;
        const activeClass = `${menuColor.activeBg} ${menuColor.activeText} shadow-md`;
        const inactiveClass = `${menuColor.text} ${menuColor.defaultBg} ${menuColor.hoverBg}`;

        return (
          <li key={nav.name}>
            {nav.subItems ? (
              <div className="flex items-center w-full">
                {nav.path ? (
                  <div className="flex items-center w-full">
                    <Link
                      to={nav.path}
                      className={`${baseClasses} px-3 py-2 flex-1 ${
                        isMainActive ? activeClass : inactiveClass
                      }`}
                    >
                      <span
                        className={`menu-item-icon-size ${
                          isMainActive ? menuColor.activeText : "text-white/70"
                        }`}
                      >
                        {nav.icon}
                      </span>
                      {(isExpanded || isHovered || isMobileOpen) && (
                        <span className="flex-1">{nav.name}</span>
                      )}
                    </Link>
                    {(isExpanded || isHovered || isMobileOpen) && (
                      <button
                        onClick={(e) => handleMainItemClick(e, index)}
                        className={`ml-2 p-2 rounded-lg transition-colors ${
                          openSubmenu?.type === "main" && openSubmenu?.index === index
                            ? "bg-white/10"
                            : "hover:bg-white/5"
                        }`}
                        aria-label="Toggle submenu"
                      >
                        <ChevronDownIcon
                          className={`w-4 h-4 transition-transform duration-200 ${
                            openSubmenu?.type === "main" &&
                            openSubmenu?.index === index
                              ? "rotate-180 text-white"
                              : "text-white/70"
                          }`}
                        />
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={(e) => handleMainItemClick(e, index)}
                    className={`${baseClasses} px-3 py-2 justify-between w-full ${
                      isMainActive ? activeClass : inactiveClass
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={`menu-item-icon-size ${
                          isMainActive ? menuColor.activeText : "text-white/70"
                        }`}
                      >
                        {nav.icon}
                      </span>
                      {(isExpanded || isHovered || isMobileOpen) && (
                        <span>{nav.name}</span>
                      )}
                    </span>
                    {(isExpanded || isHovered || isMobileOpen) && (
                      <ChevronDownIcon
                        className={`w-4 h-4 transition-transform duration-200 ${
                          openSubmenu?.type === "main" &&
                          openSubmenu?.index === index
                            ? "rotate-180 text-white"
                            : "text-white/70"
                        }`}
                      />
                    )}
                  </button>
                )}
              </div>
            ) : (
              nav.path && (
                <Link
                  to={nav.path}
                  className={`${baseClasses} px-3 py-2.5 ${
                    isActive(nav.path) ? activeClass : inactiveClass
                  }`}
                >
                  <span
                    className={`menu-item-icon-size ${
                      isActive(nav.path) ? menuColor.activeText : "text-white/70"
                    }`}
                  >
                    {nav.icon}
                  </span>
                  {(isExpanded || isHovered || isMobileOpen) && (
                    <span>{nav.name}</span>
                  )}
                </Link>
              )
            )}
            {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
              <div
                ref={(el) => {
                  subMenuRefs.current[`main-${index}`] = el;
                }}
                className="overflow-hidden transition-all duration-300"
                style={{
                  height:
                    openSubmenu?.type === "main" && openSubmenu?.index === index
                      ? `${subMenuHeight[`main-${index}`]}px`
                      : "0px",
                }}
              >
                 <ul className="mt-2 space-y-1 ml-4 pl-4 border-l-2 border-white/10">
                   {nav.subItems.map((subItem) => {
                     const isSubActive = isActive(subItem.path);
                     return (
                       <li key={subItem.name}>
                         <Link
                           to={subItem.path}
                           className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors duration-200 ${
                             isSubActive
                               ? `${menuColor.activeBg} ${menuColor.activeText} shadow-sm`
                               : "text-white/60 hover:bg-white/5 hover:text-white/90"
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
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-[#1c242b] text-white h-screen transition-all duration-300 ease-in-out z-50 border-r border-[#181f26] shadow-[0_30px_60px_rgba(0,0,0,0.4)]
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
              className={`mb-2 text-xs uppercase text-gray-400 flex items-center gap-2 ${
                !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
              }`}
            >
              {isExpanded || isHovered || isMobileOpen ? (
                "Menu"
              ) : (
                <HorizontaLDots className="text-gray-400" />
              )}
            </div>
            {renderMenuItems(navItems)}
          </div>
        </nav>
      </div>
      
      {/* Logout Button */}
      <div className="mt-auto pb-4 pt-4 border-t border-white/10">
        <button
          onClick={logout}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 text-white/80 hover:bg-white/10 hover:text-white ${
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
