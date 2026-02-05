export type UserAccess = {
    system_access?: string | null;
    page_access?: string | null;
    user_access?: string | null;
    role?: string;
    userType?: string;
};

export const PAGE_NAME_TO_ROUTE_MAP: Record<string, string> = {
    "Dashboard": "/",
    "Orders": "/o2d/orders",
    "Pending Vehicles": "/o2d/process",
    "Complaint Details": "/o2d/complaint-details",
    "Permissions": "/o2d/permissions",
    "Enquiry": "/o2d/enquiry",
    "Enquiry List": "/o2d/enquiry-list",
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
    "Customers": "/o2d/customers",
    "Follow Ups": "/o2d/follow-ups",
};

export const isAdminUser = (user: UserAccess | null | undefined): boolean => {
    const role = (user?.userType || user?.role || "").toString().toLowerCase();
    return role.includes("admin");
};

export const isPathAllowed = (
    path: string,
    user: UserAccess | null | undefined
): boolean => {
    // Admin can access everything
    if (isAdminUser(user)) {
        return true;
    }

    // If no user or no access defined, deny access
    if (!user || (!user.system_access && !user.page_access && !user.user_access)) {
        return false;
    }

    // Parse system_access and page_access (include user_access as fallback for page_access)
    const systemAccess = user.system_access
        ? user.system_access.split(",").map(s => s.trim().toLowerCase().replace(/\s+/g, "")).filter(Boolean)
        : [];

    const rawPageAccess = (user.page_access || user.user_access || "")
        .split(",")
        .map(p => p.trim())
        .filter(Boolean);

    // Convert page names to routes (case-insensitive)
    const pageRoutes = rawPageAccess.map(page => {
        if (page.startsWith("/")) return page;
        const matchedKey = Object.keys(PAGE_NAME_TO_ROUTE_MAP).find(
            key => key.toLowerCase() === page.toLowerCase()
        );
        return matchedKey ? PAGE_NAME_TO_ROUTE_MAP[matchedKey] : page;
    });

    // Normalize path for comparison
    const normalizedPath = path.split("?")[0].replace(/\/$/, "");
    // Root path handling
    const effectivePath = normalizedPath === "" ? "/" : normalizedPath;

    // Check specific page_access FIRST
    if (pageRoutes.length > 0) {
        const isMatched = pageRoutes.some(allowedPath => {
            let normalizedAllowed = allowedPath.trim().replace(/\/$/, "");
            if (normalizedAllowed === "") normalizedAllowed = "/";
            else if (!normalizedAllowed.startsWith("/")) normalizedAllowed = "/" + normalizedAllowed;

            return effectivePath === normalizedAllowed || effectivePath.startsWith(normalizedAllowed + "/");
        });

        if (isMatched) return true;

        // If we have a whitelist of pages, and the current path is a specific sub-page (not a system root),
        // we should deny access even if the whole system is technically allowed.
        const isSystemRoot = ["/", "/o2d", "/batchcode", "/lead-to-order"].includes(effectivePath);
        if (!isSystemRoot && !path.includes("?tab=")) {
            return false;
        }
    }

    // Determine system match
    let systemMatch = false;
    if (effectivePath === "/" || effectivePath.startsWith("/o2d") || path.includes("?tab=o2d")) {
        systemMatch = systemAccess.includes("o2d");
    } else if (effectivePath.startsWith("/batchcode") || path.includes("?tab=batchcode")) {
        systemMatch = systemAccess.includes("batchcode");
    } else if (effectivePath.startsWith("/lead-to-order") || path.includes("?tab=lead-to-order")) {
        systemMatch = systemAccess.includes("lead-to-order");
    }

    // Special case: if on root "/" and user has access to ANY sub-page, allow root
    if (effectivePath === "/" && (systemMatch || pageRoutes.length > 0)) {
        return true;
    }

    // If system matches and no explicit page_access override blocked it above, allow
    return systemMatch;
};

export const getDefaultAllowedPath = (user: UserAccess | null | undefined): string => {
    if (!user) return "/login";
    if (isAdminUser(user)) return "/";

    // 1. Check specific page access FIRST (more specific)
    const pageAccess = user.page_access
        ? user.page_access.split(",").map(p => p.trim()).filter(Boolean)
        : [];

    if (pageAccess.length > 0) {
        for (const pageName of pageAccess) {
            const route = pageName.startsWith("/") ? pageName : PAGE_NAME_TO_ROUTE_MAP[pageName];
            if (route && route !== "/") return route;
        }
    }

    // 2. Check system access priorities
    const systemAccess = user.system_access
        ? user.system_access.split(",").map(s => s.trim().toLowerCase().replace(/\s+/g, "")).filter(Boolean)
        : [];

    if (systemAccess.includes("o2d")) return "/?tab=o2d";
    if (systemAccess.includes("lead-to-order")) return "/?tab=lead-to-order";
    if (systemAccess.includes("batchcode")) return "/?tab=batchcode";

    // 3. Fallback to Dashboard if explicitly allowed or no other choice
    if (pageAccess.includes("Dashboard") || pageAccess.includes("/")) return "/";

    // Default fallback
    return "/";
};
