import React from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "../context/AuthContext";

interface RouteGuardProps {
  children: React.ReactNode;
  requiredSystem?: string;
  requiredPage?: string;
}

// Helper function to check if a path is allowed based on system_access and page_access
const isPathAllowed = (
  path: string,
  user: { system_access?: string | null; page_access?: string | null; role?: string; userType?: string } | null | undefined
): boolean => {
  // Check if user is admin
  const role = (user?.userType || user?.role || "").toString().toLowerCase();
  const isAdmin = role.includes("admin");
  
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

  // If no system_access but has page_access, check page_access directly
  if (systemAccess.length === 0 && pageAccess.length > 0) {
    return pageAccess.some(allowedPath => {
      const normalizedAllowed = allowedPath.trim().replace(/\/$/, "");
      // Exact match or path starts with allowed path
      return normalizedPath === normalizedAllowed || normalizedPath.startsWith(normalizedAllowed + "/");
    });
  }

  // If system doesn't match and system_access is defined, deny access
  if (!systemMatch && systemAccess.length > 0) {
    return false;
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

const RouteGuard: React.FC<RouteGuardProps> = ({ children, requiredSystem, requiredPage }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Check if user has access to this route
  const hasAccess = isPathAllowed(location.pathname + location.search, user);

  if (!hasAccess) {
    // Redirect to dashboard or show access denied
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default RouteGuard;

