import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Menu, X, Search, Bell, LogOut } from "lucide-react";
import { useSidebar } from "../context/SidebarContext";
import NotificationDropdown from "../components/header/NotificationDropdown";
import UserDropdown from "../components/header/UserDropdown";
import logo from "../assert/Logo.jpeg";
import { useAuth } from "../context/AuthContext";

const AppHeader: React.FC = () => {
  const [isApplicationMenuOpen, setApplicationMenuOpen] = useState(false);
  const [showHeaderGlow, setShowHeaderGlow] = useState(true);

  const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();
  const { user, logout } = useAuth();

  const handleToggle = () => {
    if (window.innerWidth >= 1280) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
  };

  const toggleApplicationMenu = () => {
    setApplicationMenuOpen(!isApplicationMenuOpen);
  };

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setApplicationMenuOpen(false);
      }
    };

    if (isApplicationMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isApplicationMenuOpen]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowHeaderGlow(false);
    }, 30000);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <header className="relative sticky top-0 flex w-full h-[72px] bg-white border-slate-200 z-[1010] dark:border-slate-700 dark:bg-slate-900 lg:border-b shadow-sm">
      {showHeaderGlow && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-amber-300 via-orange-500 to-red-500 opacity-90 animate-pulse" />
      )}
      <div className="flex flex-row items-center justify-between grow xl:px-6 h-full relative" ref={headerRef}>
        {/* Left Side: Sidebar Toggle */}
        <div className="flex items-center gap-2 h-full px-3 xl:px-0">
          <button
            className="flex items-center justify-center w-10 h-10 text-slate-700 bg-white border border-slate-200 rounded-xl z-[1001] dark:border-slate-700 dark:text-slate-300 xl:h-11 xl:w-11 hover:bg-slate-50 hover:shadow-sm transition-all duration-200 active:scale-95"
            onClick={handleToggle}
            aria-label="Toggle Sidebar"
          >
            {isMobileOpen ? (
              <X className="w-6 h-6 text-red-600" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Center Logo: Mobile/Tablet Only */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 xl:hidden">
          <Link to="/">
            <img
              src={logo}
              alt="SAGAR TMT & PIPES Logo"
              className="h-10 w-auto object-contain"
            />
          </Link>
        </div>

        {/* Right Side: Options/Search */}
        <div className="flex items-center gap-2 px-3 xl:px-0">
          <button
            onClick={toggleApplicationMenu}
            className={`flex items-center justify-center w-10 h-10 rounded-lg z-[1001] transition-colors xl:hidden ${isApplicationMenuOpen ? "bg-slate-100 text-blue-600 shadow-sm" : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
          >
            {isApplicationMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M5.99902 10.4951C6.82745 10.4951 7.49902 11.1667 7.49902 11.9951V12.0051C7.49902 12.8335 6.82745 13.5051 5.99902 13.5051C5.1706 13.5051 4.49902 12.8335 4.49902 12.0051V11.9951C4.49902 11.1667 5.1706 10.4951 5.99902 10.4951ZM17.999 10.4951C18.8275 10.4951 19.499 11.1667 19.499 11.9951V12.0051C19.499 12.8335 18.8275 13.5051 17.999 13.5051C17.1706 13.5051 16.499 12.8335 16.499 12.0051V11.9951C16.499 11.1667 17.1706 10.4951 17.999 10.4951ZM13.499 11.9951C13.499 11.1667 12.8275 10.4951 11.999 10.4951C11.1706 10.4951 10.499 11.1667 10.499 11.9951V12.0051C10.499 12.8335 11.1706 13.5051 11.999 13.5051C12.8275 13.5051 13.499 12.8335 13.499 12.0051V11.9951Z"
                  fill="currentColor"
                />
              </svg>
            )}
          </button>

          <div className="hidden xl:block">
            <div className="flex items-center gap-4">
              <form className="relative mr-2">
                <span className="absolute -translate-y-1/2 pointer-events-none left-4 top-1/2">
                  <Menu className="w-5 h-5 text-slate-400" />
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search..."
                  className="dark:bg-slate-800 h-11 w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-12 pr-14 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-hidden focus:ring-3 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 xl:w-[300px]"
                />
                <button className="absolute right-2.5 top-1/2 inline-flex -translate-y-1/2 items-center gap-0.5 rounded-lg border border-slate-300 bg-slate-50 px-[7px] py-[4.5px] text-xs text-slate-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300">
                  <span> ⌘ </span>
                  <span> K </span>
                </button>
              </form>
              <div className="flex items-center gap-3">
                <NotificationDropdown />
                <UserDropdown />
              </div>
            </div>
          </div>
        </div>

        {/* Simplified Mobile/Tablet Dropdown */}
        {isApplicationMenuOpen && (
          <div className="xl:hidden absolute top-[72px] right-2 w-[240px] bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 mt-2 z-[1050] animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col gap-1">
              <div className="px-2 py-2 border-b border-slate-100 mb-2">
                <p className="text-sm font-bold text-slate-900 capitalize">{user?.username || 'User'}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email_id || user?.user_name || 'No email provided'}</p>
              </div>
              <Link
                to="/profile"
                className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
                onClick={() => setApplicationMenuOpen(false)}
              >
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                  <Search className="w-4 h-4" />
                </div>
                Go to Profile
              </Link>
              <button
                onClick={() => {
                  logout(); // Call logout directly
                  setApplicationMenuOpen(false);
                }}
                className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-red-600 rounded-xl hover:bg-red-50 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
                  <LogOut className="w-4 h-4" />
                </div>
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default AppHeader;
