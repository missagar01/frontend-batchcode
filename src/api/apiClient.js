const isDevelopment = import.meta.env.DEV ||
    import.meta.env.MODE === 'development' ||
    (typeof window !== 'undefined' && (
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1'
    ));

const envBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();

const isS3Deployment = typeof window !== 'undefined' &&
    (window.location.hostname.includes('s3-website') ||
        window.location.hostname.includes('s3.amazonaws.com'));

export const API_BASE_URL = isS3Deployment ? envBaseUrl : (import.meta.env.PROD ? '' : (envBaseUrl || ''));

const buildHeaders = (token, headers, isFormData) => {
    const baseHeaders = {
        ...headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    if (!isFormData) {
        baseHeaders['Content-Type'] = 'application/json';
    }

    return baseHeaders;
};

export const apiRequest = async (path, options = {}) => {
    let { method = 'GET', body, token, headers } = options;

    if (!token && typeof window !== 'undefined') {
        token = sessionStorage.getItem('token') || localStorage.getItem('token');
    }

    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    const response = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers: buildHeaders(token, headers, isFormData),
        body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
    });

    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await response.json() : null;

    if (!response.ok) {
        if (response.status === 401) {
            if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
                sessionStorage.removeItem('token');
                localStorage.removeItem('token');
                localStorage.removeItem('currentUser');
                window.location.href = '/login';
            }
        }

        const message = data?.message || `Request failed with status ${response.status}`;
        const error = new Error(message);
        error.status = response.status;
        error.data = data;
        error.response = { data, status: response.status }; // Fallback for components still using axios error structure
        throw error;
    }

    // To seamlessly drop-in replace axios without changing everything in components,
    // we return an object containing data (as axios did) OR we could return data directly.
    // We'll return the object with `data` so `response.data` works exactly like before!
    return {
        data: data,
        status: response.status,
        headers: response.headers
    };
};

export const API_ENDPOINTS = {
    BATCHCODE: {
        BASE: '/api/batchcode',
        DASHBOARD: '/api/batchcode/dashboard',
        HOT_COIL: '/api/batchcode/hot-coil',
        QC_LAB: '/api/batchcode/qc-lab-samples',
        SMS_REGISTER: '/api/batchcode/sms-register',
        RECOILER: '/api/batchcode/re-coiler',
        PIPE_MILL: '/api/batchcode/pipe-mill',
        LADDLE: '/api/batchcode/laddle-checklist',
        TUNDISH: '/api/batchcode/tundish-checklist',
        PATCHING: '/api/batchcode/patching-checklist',
        ADMIN_OVERVIEW: '/api/batchcode/admin/overview',
        ADMIN_OVERVIEW_BY_CODE: '/api/batchcode/admin/overview',
    }
};
