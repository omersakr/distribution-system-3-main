# Utilities Usage Guide

## Overview
The utilities have been extracted into separate files in the `js/utils/` folder to promote code reuse and maintainability. **COMPLETED**: The following files have been successfully updated to use the utilities:

### ✅ Updated Files:
- `backend/public/js/employees.js` - Employee management
- `backend/public/js/employee-details.js` - Employee details page
- `backend/public/js/expenses.js` - Expenses management
- `backend/public/js/dashboard.js` - Dashboard functionality
- `backend/public/js/clients.js` - Client management
- `backend/public/index.html` - Dashboard page (inline scripts)
- `backend/public/employees.html` - Employee creation form
- `backend/public/employee-details.html` - Employee details page
- `backend/public/expenses.html` - Expenses page
- `backend/public/clients.html` - Clients page

### 🔄 Remaining Files (Still have duplicate functions):
- `backend/public/js/clients-details.js`
- `backend/public/js/administration.js`
- `backend/public/js/administration-details.js`
- `backend/public/js/crusher-details.js`
- `backend/public/js/contractors.js`
- `backend/public/js/crushers.js`
- `backend/public/js/contractor-details.js`
- `backend/public/js/project-details.js`
- `backend/public/js/projects.js`
- `backend/public/js/supplier-details.js`
- `backend/public/js/suppliers.js`

## File Structure
```
backend/public/js/utils/
├── index.js          # Main entry point, loads all utilities
├── api.js            # API request utilities
├── formatters.js     # Formatting functions (currency, dates, etc.)
├── modals.js         # Modal management utilities
├── dom.js            # DOM manipulation utilities
└── validation.js     # Form validation utilities
```

## How to Include Utilities

### Method 1: Include All Utilities (Recommended)
Add this to your HTML head section:
```html
<script src="js/utils/index.js"></script>
```

### Method 2: Include Individual Utilities
```html
<script src="js/utils/formatters.js"></script>
<script src="js/utils/api.js"></script>
<script src="js/utils/modals.js"></script>
<script src="js/utils/dom.js"></script>
<script src="js/utils/validation.js"></script>
```

## Usage Examples

### 1. API Utilities
```javascript
// Instead of:
const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/clients`);
const data = await response.json();

// Use:
const data = await apiGet('/clients');

// For POST requests:
const newClient = await apiPost('/clients', { name: 'New Client', phone: '123456789' });

// For PUT requests:
const updatedClient = await apiPut('/clients/123', { name: 'Updated Name' });

// For DELETE requests:
await apiDelete('/clients/123');
```

### 2. Formatting Utilities
```javascript
// Currency formatting
const price = formatCurrency(1500); // "1,500 ج.م"

// Date formatting
const date = formatDate('2024-01-15'); // "15 يناير 2024"
const dateTime = formatDateTime('2024-01-15T10:30:00'); // "15/1/2024, 10:30:00 ص"

// Quantity formatting
const qty = formatQuantity(123.456); // "123.5"

// Parse Arabic date for input fields
const isoDate = parseArabicDate('15/1/2024'); // "2024-01-15"

// Get today's date
const today = getTodayISO(); // "2024-01-15"
```

### 3. Modal Utilities
```javascript
// Show modal
showModal('addClientModal');

// Close modal
closeModal('addClientModal');

// Show messages
showMessage('clientMessage', 'تم حفظ البيانات بنجاح', 'success');
showMessage('clientMessage', 'حدث خطأ في الحفظ', 'error');

// Confirmation dialogs
const confirmed = await showConfirmDialog('تأكيد الحذف', 'هل أنت متأكد؟');
if (confirmed) {
    // Delete item
}

// Success/Error messages
await showSuccessMessage('تم الحفظ', 'تم حفظ البيانات بنجاح');
await showErrorMessage('خطأ', 'فشل في حفظ البيانات');
```

### 4. DOM Utilities
```javascript
// Create elements
const button = createButton('حفظ', 'btn btn-primary', () => saveData());
const infoItem = createInfoItem('الاسم', 'أحمد محمد');
const emptyState = createEmptyState('📝', 'لا توجد بيانات', 'إضافة جديد', () => addNew());

// Populate select options
populateSelect('clientSelect', clients, 'اختر العميل');

// Get URL parameters
const clientId = getUrlParameter('id');

// Form utilities
setFormValues('editForm', { name: 'أحمد', phone: '123456789' });
const formData = getFormData('editForm');

// Show/hide elements
toggleElement('loadingDiv', true); // Show
toggleElement('loadingDiv', false); // Hide
```

### 5. Validation Utilities
```javascript
// Individual validations
const nameError = validateRequired(name, 'الاسم');
const emailError = validateEmail(email);
const phoneError = validatePhone(phone);
const amountError = validatePositiveNumber(amount, 'المبلغ');

// Form validation with rules
const validationRules = {
    name: [
        { type: 'required', message: 'الاسم' },
        { type: 'stringLength', min: 2, max: 50, message: 'الاسم' }
    ],
    email: [
        { type: 'email' }
    ],
    phone: [
        { type: 'phone' }
    ],
    amount: [
        { type: 'required', message: 'المبلغ' },
        { type: 'positiveNumber', message: 'المبلغ' }
    ]
};

const form = document.getElementById('clientForm');
const validation = validateForm(form, validationRules);

if (!validation.isValid) {
    displayFormErrors(form, validation.errors);
    return;
}
```

## Migration Example

### Before (employees.js):
```javascript
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

function formatCurrency(amount) {
    return Number(amount || 0).toLocaleString('ar-EG', {
        style: 'currency',
        currency: 'EGP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}

function formatDate(dateString) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG');
}

async function fetchEmployees() {
    const resp = await authManager.makeAuthenticatedRequest(`${API_BASE}/employees`);
    if (!resp.ok) throw new Error('تعذر تحميل الموظفين');
    const data = await resp.json();
    return data.employees || data;
}
```

### After (employees.js):
```javascript
// Utilities are loaded via utils/index.js - no need to redefine common functions

async function fetchEmployees() {
    const data = await apiGet('/employees');
    return data.employees || data;
}

// All formatting and API functions are now available globally
// formatCurrency(), formatDate(), apiGet(), etc.
```

## Benefits

1. **Code Reuse**: Common functions are centralized and reusable
2. **Maintainability**: Updates to utilities affect all files using them
3. **Consistency**: Same formatting and behavior across the application
4. **Smaller Files**: Individual page scripts are smaller and more focused
5. **Better Testing**: Utilities can be tested independently
6. **Performance**: Utilities are cached and shared across pages

## Implementation Status

### ✅ Completed Tasks:
1. ✅ Created comprehensive utility system with 5 modules
2. ✅ Updated 5 high-priority JavaScript files to use utilities
3. ✅ Updated 5 HTML files to include utility scripts
4. ✅ Removed duplicate function definitions from updated files
5. ✅ Tested all updated files for syntax errors
6. ✅ Verified API calls work with new utility functions

### 🔄 Next Steps (Optional):
1. Update remaining JavaScript files to use utilities
2. Remove duplicate function definitions from remaining files
3. Add more utilities as needed for common patterns
4. Consider creating page-specific utility modules for complex pages

## Testing Recommendations

After implementing utilities in remaining files:
1. Test all CRUD operations (Create, Read, Update, Delete)
2. Verify all formatting displays correctly
3. Check that all modals and forms work properly
4. Ensure error handling works as expected
5. Test on different browsers for compatibility