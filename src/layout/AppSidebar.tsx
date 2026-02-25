import { useCallback, useMemo, type FC, type ReactNode } from "react";
import { Link, useLocation } from "react-router";
// Assume these icons are imported from an icon library
import {
  BoxCubeIcon,
  PieChartIcon,
} from "../icons";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../context/AuthContext";
import logo from "../assert/Logo.jpeg";
import { LogOut } from "lucide-react";
import { isAdminUser, isPathAllowed } from "../utils/accessControl";

type NavItem = {
  name: string;
  icon: ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

// Dashboard item - shows Dashboard by default
const dashboardItem: NavItem = {
  icon: <PieChartIcon />,
  name: "Dashboard",
  path: "/",
};

// BatchCode with submenu
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
    { name: "Patching Checklist", path: "/batchcode/patching-checklist", pro: false, new: true },
  ],
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

  const filteredBatchCodeItem = useMemo(() => {
    if (!isAdmin && !isPathAllowed("/batchcode", user) && !batchCodeItem.subItems?.some(s => isPathAllowed(s.path, user))) {
      return null;
    }

    const filteredSubItems = batchCodeItem.subItems?.filter(subItem =>
      isPathAllowed(subItem.path, user)
    ) || [];

    if (filteredSubItems.length === 0 && !isAdmin) return null;

    return {
      ...batchCodeItem,
      subItems: filteredSubItems,
    };
  }, [user, isAdmin]);

  const showDashboard = useMemo(() => {
    return isPathAllowed("/", user) || isPathAllowed("/dashboard", user);
  }, [user]);

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
          // If no tab param and path is root, check if it's the default
          if (!tabValue && !currentTab && basePath === "/") return true
        }
        return location.pathname === basePath && currentTab === tabValue
      }
      return location.pathname === path
    },
    [location.pathname, location.search]
  );

  const renderSection = (title: string, items: NavItem[]) => {
    if (items.length === 0) return null;

    return (
      <div className="mb-4">
        <div className="px-6 py-1 mb-1">
          <span className="xl:text-[12px] lg:text-[10px] text-[8px] font-black uppercase tracking-[0.25em] text-gray-500 opacity-80">{title}</span>
        </div>
        <ul className="space-y-1 px-3">
          {items.map((nav) => {
            const isMainActive = nav.path && isActive(nav.path);
            const iconClass = isMainActive ? "text-white" : "text-slate-500";

            const content = (
              <>
                <span className={`flex-shrink-0 drop-shadow-sm scale-90 ${iconClass}`}>
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="flex-1 truncate tracking-tight uppercase xl:text-[16px] lg:text-[14px] text-[10px] font-black">
                    {nav.name}
                  </span>
                )}
              </>
            );

            const commonClasses = `flex items-center gap-3 px-4 py-3 rounded-xl xl:text-[16px] lg:text-[14px] text-[12px] font-black transition-all duration-200 border
              ${isMainActive
                ? "bg-red-600 border-red-600 text-white shadow-md"
                : nav.path
                  ? "bg-white border-slate-200 text-slate-700 hover:bg-red-50 hover:border-red-200"
                  : "bg-white border-slate-200 text-slate-700 cursor-default"}`;

            return (
              <li key={nav.name}>
                {nav.path ? (
                  <Link
                    to={nav.path}
                    onClick={handleLinkClick}
                    className={commonClasses}
                  >
                    {content}
                  </Link>
                ) : (
                  <div className={commonClasses}>
                    {content}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  const renderBatchCodeSubItems = () => {
    const subItems = filteredBatchCodeItem?.subItems || [];

    if (!subItems.length || (!isExpanded && !isHovered && !isMobileOpen)) {
      return null;
    }

    return (
      <div className="mb-4">
        <ul className="space-y-1 px-3">
          {subItems.map((subItem) => {
            const isSubActive = isActive(subItem.path);
            return (
              <li key={subItem.name}>
                <Link
                  to={subItem.path}
                  onClick={handleLinkClick}
                  className={`flex items-center justify-between px-4 py-2 rounded-xl xl:text-[16px] lg:text-[14px] text-[12px] font-black transition-all duration-200 border
                    ${isSubActive
                      ? "bg-red-600 border-red-600 text-white shadow-md"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-red-50 hover:border-red-200"}`}
                >
                  <span className="truncate flex items-center gap-2">
                    {isSubActive ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-white shadow-sm"></span>
                    ) : (
                      <span className="w-1 h-1 rounded-full bg-slate-400"></span>
                    )}
                    {subItem.name}
                  </span>
                  {(subItem.new || subItem.pro) && (
                    <span className={`xl:text-[8px] lg:text-[7px] text-[6px] px-1.5 py-0.5 rounded-full uppercase font-black ${isSubActive ? "bg-white text-black" : "bg-slate-100 text-slate-700"}`}>
                      {subItem.new ? "NEW" : "PRO"}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  return (
    <>
      <aside
        className={`fixed left-0 flex flex-col bg-white text-gray-800 transition-all duration-300 ease-in-out z-[1000] border-r border-slate-200 shadow-2xl
          ${isMobileOpen
            ? "top-[72px] h-[calc(100dvh-72px)] w-[280px] translate-x-0"
            : "top-0 h-[100dvh] -translate-x-full xl:translate-x-0"}
          ${!isMobileOpen ? (isExpanded || isHovered ? "xl:w-[290px]" : "xl:w-[90px]") : ""}
        `}
        onMouseEnter={() => !isExpanded && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Brand Header */}
        <div
          className={`shrink-0 h-[72px] hidden xl:flex items-center shadow-sm relative z-10 transition-all duration-300
            ${(!isExpanded && !isHovered && !isMobileOpen) ? "justify-center px-0 bg-white" : "justify-center px-0 bg-[#EE1C23]"}`}
        >
          <Link to="/" onClick={handleLinkClick} className="flex items-center w-full h-full overflow-hidden group">
            <div className={`flex-shrink-0 transition-all duration-300 ease-in-out w-full
              ${(!isExpanded && !isHovered && !isMobileOpen) ? "h-10" : "h-full"}`}>
              <img
                src={logo}
                alt="SMRPL Logo"
                className={`w-full h-full transition-transform duration-300 group-hover:scale-105
                  ${(!isExpanded && !isHovered && !isMobileOpen) ? "object-contain" : "object-fill"}`}
              />
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <div className="flex flex-col flex-1 overflow-y-auto duration-300 no-scrollbar py-2">
          {showDashboard && renderSection("Main Navigation", [dashboardItem])}
          {renderBatchCodeSubItems()}
        </div>

        {/* Logout Section */}
        <div className="mt-auto shrink-0 pb-6 pt-4 px-5 border-t border-red-100">
          <button
            onClick={logout}
            className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm font-bold transition-all duration-300 rounded-xl
              ${isExpanded || isHovered || isMobileOpen
                ? "bg-gradient-to-r from-red-600 to-rose-500 text-white shadow-lg shadow-red-200 border border-red-400/20 hover:scale-[1.02] hover:shadow-red-300 active:scale-95"
                : "text-gray-400 hover:bg-red-50 hover:text-red-600 justify-center"
              }`}
            title="Logout"
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {(isExpanded || isHovered || isMobileOpen) && (
              <span className="truncate tracking-wide">SIGN OUT</span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};



export default AppSidebar;
