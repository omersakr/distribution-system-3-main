/**
 * Formatting Utilities
 * Common formatting functions used across the application
 */

/**
 * Format currency in Egyptian Pounds
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount) {
    return Number(amount || 0).toLocaleString('ar-EG', {
        style: 'currency',
        currency: 'EGP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}

/**
 * Format date in Arabic locale
 * @param {string|Date} dateString - Date to format
 * @returns {string} Formatted date string
 */
function formatDate(dateString) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG');
}

/**
 * Format date with short month names
 * @param {string|Date} dateStr - Date to format
 * @returns {string} Formatted date string
 */
function formatDateShort(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Format date and time in Arabic locale
 * @param {string|Date} dateString - Date to format
 * @returns {string} Formatted date and time string
 */
function formatDateTime(dateString) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleString('ar-EG');
}

/**
 * Format quantity with decimal places
 * @param {number} qty - Quantity to format
 * @returns {string} Formatted quantity string
 */
function formatQuantity(qty) {
    return Number(qty || 0).toLocaleString('ar-EG', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    });
}

/**
 * Format number with Arabic locale
 * @param {number} num - Number to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted number string
 */
function formatNumber(num, decimals = 0) {
    return Number(num || 0).toLocaleString('ar-EG', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

/**
 * Parse Arabic date to ISO format for input fields
 * @param {string} arabicDate - Arabic formatted date
 * @returns {string} ISO date string (YYYY-MM-DD)
 */
function parseArabicDate(arabicDate) {
    // Handle different date formats
    if (!arabicDate || arabicDate === '—') return '';

    // If already in ISO format, return as is
    if (arabicDate.match(/^\d{4}-\d{2}-\d{2}/)) {
        return arabicDate.split('T')[0];
    }

    // Try to parse Arabic numerals and format
    try {
        // Convert Arabic numerals to English
        const englishDate = arabicDate
            .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
            .replace(/[‏]/g, ''); // Remove RTL marks

        // Parse different formats: DD/MM/YYYY or D/M/YYYY
        const parts = englishDate.split('/');
        if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            const year = parts[2];
            return `${year}-${month}-${day}`;
        }
    } catch (e) {
        console.warn('Could not parse Arabic date:', arabicDate);
    }

    return '';
}

/**
 * Get today's date in ISO format
 * @returns {string} Today's date in YYYY-MM-DD format
 */
function getTodayISO() {
    return new Date().toISOString().split('T')[0];
}

/**
 * Get current year
 * @returns {number} Current year
 */
function getCurrentYear() {
    return new Date().getFullYear();
}

// Export functions for global use
window.formatCurrency = formatCurrency;
window.formatDate = formatDate;
window.formatDateShort = formatDateShort;
window.formatDateTime = formatDateTime;
window.formatQuantity = formatQuantity;
window.formatNumber = formatNumber;
window.parseArabicDate = parseArabicDate;
window.getTodayISO = getTodayISO;
window.getCurrentYear = getCurrentYear;