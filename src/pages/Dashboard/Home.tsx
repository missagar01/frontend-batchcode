import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { DashboardView } from "../O2D/dashboard-view";
import { useAuth } from "../../context/AuthContext";

export default function Home() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();
  const hasNavigated = useRef(false);

  useEffect(() => {
    // Wait for auth to load
    if (loading || !user) {
      return;
    }

    // Prevent multiple navigations
    if (hasNavigated.current) {
      return;
    }

    // If no tab parameter in URL, set default based on user's system_access
    const tabParam = searchParams.get("tab");
    
    if (!tabParam) {
      const isAdmin = (user?.role || user?.userType || "").toString().toLowerCase().includes("admin");
      
      // Admin sees O2D by default (no tab needed, already default in DashboardView)
      if (isAdmin) {
        hasNavigated.current = true;
        return;
      }
      
      // For regular users, check system_access to determine default tab
      const systemAccess = user?.system_access 
        ? user.system_access.split(",").map(s => s.trim().toLowerCase().replace(/\s+/g, "")).filter(Boolean)
        : [];
      
      // Priority: o2d > lead-to-order > batchcode
      if (systemAccess.includes("o2d")) {
        hasNavigated.current = true;
        navigate("/?tab=o2d", { replace: true });
      } else if (systemAccess.includes("lead-to-order")) {
        hasNavigated.current = true;
        navigate("/?tab=lead-to-order", { replace: true });
      } else if (systemAccess.includes("batchcode")) {
        hasNavigated.current = true;
        navigate("/?tab=batchcode", { replace: true });
      } else {
        hasNavigated.current = true;
      }
      // If no system_access, default to O2D (DashboardView already handles this)
    } else {
      hasNavigated.current = true;
    }
  }, [searchParams, user, loading, navigate]);

  return <DashboardView />;
}
