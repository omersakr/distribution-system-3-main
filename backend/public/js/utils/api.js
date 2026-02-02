/**
 * API Utilities
 * Common API-related functions used across the application
 */

/**
 * Get the API base URL
 * @returns {string} API base URL
 */
const API_BASE = (function () {
    if (window.__API_BASE__) return window.__API_BASE__;
    try {
        const origin = window.location.origin;
        if (!origin || origin === 'null') return 'http://localhost:5000/api';
        return origin.replace(/\/$/, '') + '/api';
    } catch (e) {
        return 'http://localhost:5000/api';
    }
})();

/**
 * Make an authenticated API request
 * @param {string} url - API endpoint URL
 * @param {object} options - Request options
 * @returns {Promise<Response>} Response object
 */
async function makeApiRequest(url, options = {}) {
    return await authManager.makeAuthenticatedRequest(url, options);
}

/**
 * Generic GET request
 * @param {string} endpoint - API endpoint
 * @returns {Promise<any>} Response data
 */
async function apiGet(endpoint) {
    const response = await makeApiRequest(`${API_BASE}${endpoint}`);
    if (!response.ok) {
        throw new Error(`فشل في تحميل البيانات من ${endpoint}`);
    }
    return response.json();
}

/**
 * Generic POST request
 * @param {string} endpoint - API endpoint
 * @param {object} data - Data to send
 * @returns {Promise<any>} Response data
 */
async function apiPost(endpoint, data) {
    const response = await makeApiRequest(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `فشل في إضافة البيانات إلى ${endpoint}`);
    }
    return response.json();
}

/**
 * Generic PUT request
 * @param {string} endpoint - API endpoint
 * @param {object} data - Data to send
 * @returns {Promise<any>} Response data
 */
async function apiPut(endpoint, data) {
    const response = await makeApiRequest(`${API_BASE}${endpoint}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `فشل في تحديث البيانات في ${endpoint}`);
    }
    return response.json();
}

/**
 * Generic DELETE request
 * @param {string} endpoint - API endpoint
 * @returns {Promise<any>} Response data
 */
async function apiDelete(endpoint) {
    const response = await makeApiRequest(`${API_BASE}${endpoint}`, {
        method: 'DELETE'
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `فشل في حذف البيانات من ${endpoint}`);
    }
    return response.json();
}

/**
 * Load projects/clients data
 * @returns {Promise<Array>} Projects data
 */
async function loadProjectsData() {
    try {
        const data = await apiGet('/clients');
        return data.clients || data.data || data || [];
    } catch (error) {
        console.error('Error loading projects:', error);
        return [];
    }
}

// Export functions for global use
window.API_BASE = API_BASE;
window.apiGet = apiGet;
window.apiPost = apiPost;
window.apiPut = apiPut;
window.apiDelete = apiDelete;
window.loadProjectsData = loadProjectsData;