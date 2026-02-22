import { apiRequest, API_ENDPOINTS } from './apiClient';

export const submitHotCoil = (formData) => apiRequest(API_ENDPOINTS.BATCHCODE.HOT_COIL, {
    method: 'POST',
    body: formData
});

export const getHotCoilHistory = () => apiRequest(API_ENDPOINTS.BATCHCODE.HOT_COIL, {
    method: 'GET'
});

export const getHotCoilByUniqueCode = (uniqueCode) =>
    apiRequest(`${API_ENDPOINTS.BATCHCODE.HOT_COIL}/${uniqueCode}`, {
        method: 'GET'
    });

export const submitQCLabTest = (formData) => apiRequest(API_ENDPOINTS.BATCHCODE.QC_LAB, {
    method: 'POST',
    body: formData
});

export const getQCLabHistory = () => apiRequest(API_ENDPOINTS.BATCHCODE.QC_LAB, {
    method: 'GET'
});

export const getQCLabTestByUniqueCode = (uniqueCode) =>
    apiRequest(`${API_ENDPOINTS.BATCHCODE.QC_LAB}/${uniqueCode}`, {
        method: 'GET'
    });

export const submitSMSRegister = (formData) => apiRequest(API_ENDPOINTS.BATCHCODE.SMS_REGISTER, {
    method: 'POST',
    body: formData
});

export const getSMSRegisterHistory = () => apiRequest(API_ENDPOINTS.BATCHCODE.SMS_REGISTER, {
    method: 'GET'
});

export const submitReCoil = (data) => apiRequest(API_ENDPOINTS.BATCHCODE.RECOILER, {
    method: 'POST',
    body: data
});

export const getReCoilHistory = () => apiRequest(API_ENDPOINTS.BATCHCODE.RECOILER, {
    method: 'GET'
});

export const getReCoilByUniqueCode = (uniqueCode) =>
    apiRequest(`${API_ENDPOINTS.BATCHCODE.RECOILER}/${uniqueCode}`, {
        method: 'GET'
    });

export const submitPipeMill = (formData) => apiRequest(API_ENDPOINTS.BATCHCODE.PIPE_MILL, {
    method: 'POST',
    body: formData
});

export const getPipeMillHistory = () => apiRequest(API_ENDPOINTS.BATCHCODE.PIPE_MILL, {
    method: 'GET'
});

export const getPipeMillByUniqueCode = (uniqueCode) =>
    apiRequest(`${API_ENDPOINTS.BATCHCODE.PIPE_MILL}/${uniqueCode}`, {
        method: 'GET'
    });

export const submitLaddleChecklist = (data) => apiRequest(API_ENDPOINTS.BATCHCODE.LADDLE, {
    method: 'POST',
    body: data
});

export const getLaddleChecklists = () => apiRequest(API_ENDPOINTS.BATCHCODE.LADDLE, {
    method: 'GET'
});

export const getLaddleChecklistByUniqueCode = (uniqueCode) =>
    apiRequest(`${API_ENDPOINTS.BATCHCODE.LADDLE}/${uniqueCode}`, {
        method: 'GET'
    });

export const submitTundishChecklist = (data) => apiRequest(API_ENDPOINTS.BATCHCODE.TUNDISH, {
    method: 'POST',
    body: data
});

export const getTundishChecklists = () => apiRequest(API_ENDPOINTS.BATCHCODE.TUNDISH, {
    method: 'GET'
});

export const getTundishChecklistByUniqueCode = (uniqueCode) =>
    apiRequest(`${API_ENDPOINTS.BATCHCODE.TUNDISH}/${uniqueCode}`, {
        method: 'GET'
    });

export const getAdminOverview = (uniqueCode) => {
    const url = uniqueCode
        ? `${API_ENDPOINTS.BATCHCODE.ADMIN_OVERVIEW_BY_CODE}/${uniqueCode}`
        : API_ENDPOINTS.BATCHCODE.ADMIN_OVERVIEW;
    return apiRequest(url, { method: 'GET' });
};
