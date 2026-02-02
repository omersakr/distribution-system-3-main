/**
 * DOM Utilities
 * Common DOM manipulation functions used across the application
 */

/**
 * Create an element with class and content
 * @param {string} tag - HTML tag name
 * @param {string|Array} className - CSS class name(s)
 * @param {string} content - Text content
 * @returns {HTMLElement} Created element
 */
function createElement(tag, className = '', content = '') {
    const element = document.createElement(tag);

    if (className) {
        if (Array.isArray(className)) {
            element.classList.add(...className);
        } else {
            element.className = className;
        }
    }

    if (content) {
        element.textContent = content;
    }

    return element;
}

/**
 * Create a button element with common properties
 * @param {string} text - Button text
 * @param {string} className - CSS classes
 * @param {Function} onClick - Click handler
 * @returns {HTMLButtonElement} Created button
 */
function createButton(text, className = 'btn', onClick = null) {
    const button = createElement('button', className, text);
    button.type = 'button';

    if (onClick) {
        button.addEventListener('click', onClick);
    }

    return button;
}

/**
 * Create an info item div (label + value)
 * @param {string} label - Label text
 * @param {string} value - Value text
 * @param {string} valueClass - Additional CSS class for value
 * @returns {HTMLElement} Created info item
 */
function createInfoItem(label, value, valueClass = '') {
    const item = createElement('div', 'info-item');

    const labelSpan = createElement('span', 'info-label', label + ':');
    const valueSpan = createElement('span', `info-value ${valueClass}`, value);

    item.appendChild(labelSpan);
    item.appendChild(valueSpan);

    return item;
}

/**
 * Create an empty state message
 * @param {string} icon - Emoji or icon
 * @param {string} message - Empty state message
 * @param {string} buttonText - Optional button text
 * @param {Function} buttonClick - Optional button click handler
 * @returns {HTMLElement} Created empty state element
 */
function createEmptyState(icon, message, buttonText = null, buttonClick = null) {
    const container = createElement('div', 'empty-state');

    const iconDiv = createElement('div', 'empty-icon', icon);
    const messageDiv = createElement('div', 'empty-text', message);

    container.appendChild(iconDiv);
    container.appendChild(messageDiv);

    if (buttonText && buttonClick) {
        const button = createButton(buttonText, 'btn btn-primary', buttonClick);
        container.appendChild(button);
    }

    return container;
}

/**
 * Create a loading state element
 * @param {string} message - Loading message
 * @returns {HTMLElement} Created loading element
 */
function createLoadingState(message = 'جاري التحميل...') {
    return createElement('div', 'loading', message);
}

/**
 * Create an error state element
 * @param {string} message - Error message
 * @param {Function} retryCallback - Optional retry callback
 * @returns {HTMLElement} Created error element
 */
function createErrorState(message, retryCallback = null) {
    const container = createElement('div', 'error');

    const title = createElement('h3', '', 'خطأ في التحميل');
    const text = createElement('p', '', message);

    container.appendChild(title);
    container.appendChild(text);

    if (retryCallback) {
        const retryButton = createButton('إعادة المحاولة', 'btn btn-primary', retryCallback);
        container.appendChild(retryButton);
    }

    return container;
}

/**
 * Populate a select element with options
 * @param {string|HTMLSelectElement} selectId - Select element ID or element
 * @param {Array} options - Array of option objects {value, text}
 * @param {string} defaultText - Default option text
 * @param {string} defaultValue - Default option value
 */
function populateSelect(selectId, options, defaultText = 'اختر...', defaultValue = '') {
    const select = typeof selectId === 'string' ? document.getElementById(selectId) : selectId;
    if (!select) return;

    select.innerHTML = '';

    // Add default option
    if (defaultText) {
        const defaultOption = createElement('option', '', defaultText);
        defaultOption.value = defaultValue;
        select.appendChild(defaultOption);
    }

    // Add options
    options.forEach(option => {
        const optionElement = createElement('option', '', option.text || option.name);
        optionElement.value = option.value || option.id;
        select.appendChild(optionElement);
    });
}

/**
 * Get URL parameter value
 * @param {string} param - Parameter name
 * @returns {string|null} Parameter value or null
 */
function getUrlParameter(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

/**
 * Set form field values from object
 * @param {string|HTMLFormElement} formId - Form ID or form element
 * @param {object} data - Data object with field values
 */
function setFormValues(formId, data) {
    const form = typeof formId === 'string' ? document.getElementById(formId) : formId;
    if (!form) return;

    Object.keys(data).forEach(key => {
        const field = form.querySelector(`[name="${key}"]`);
        if (field) {
            if (field.type === 'checkbox') {
                field.checked = Boolean(data[key]);
            } else if (field.type === 'radio') {
                const radioButton = form.querySelector(`[name="${key}"][value="${data[key]}"]`);
                if (radioButton) radioButton.checked = true;
            } else {
                field.value = data[key] || '';
            }
        }
    });
}

/**
 * Get form data as object
 * @param {string|HTMLFormElement} formId - Form ID or form element
 * @returns {object} Form data object
 */
function getFormData(formId) {
    const form = typeof formId === 'string' ? document.getElementById(formId) : formId;
    if (!form) return {};

    const formData = new FormData(form);
    const data = {};

    for (const [key, value] of formData.entries()) {
        data[key] = value;
    }

    return data;
}

/**
 * Show/hide element
 * @param {string|HTMLElement} elementId - Element ID or element
 * @param {boolean} show - Whether to show or hide
 */
function toggleElement(elementId, show) {
    const element = typeof elementId === 'string' ? document.getElementById(elementId) : elementId;
    if (element) {
        element.style.display = show ? 'block' : 'none';
    }
}

/**
 * Add loading class to element
 * @param {string|HTMLElement} elementId - Element ID or element
 */
function showLoading(elementId) {
    const element = typeof elementId === 'string' ? document.getElementById(elementId) : elementId;
    if (element) {
        element.classList.add('loading');
        element.innerHTML = '<div class="loading">جاري التحميل...</div>';
    }
}

/**
 * Remove loading class from element
 * @param {string|HTMLElement} elementId - Element ID or element
 */
function hideLoading(elementId) {
    const element = typeof elementId === 'string' ? document.getElementById(elementId) : elementId;
    if (element) {
        element.classList.remove('loading');
    }
}

// Export functions for global use
window.createElement = createElement;
window.createButton = createButton;
window.createInfoItem = createInfoItem;
window.createEmptyState = createEmptyState;
window.createLoadingState = createLoadingState;
window.createErrorState = createErrorState;
window.populateSelect = populateSelect;
window.getUrlParameter = getUrlParameter;
window.setFormValues = setFormValues;
window.getFormData = getFormData;
window.toggleElement = toggleElement;
window.showLoading = showLoading;
window.hideLoading = hideLoading;