// Authentication utility for frontend
class AuthManager {
    constructor() {
        this.token = localStorage.getItem('authToken');
        this.user = this.getUserInfo();
        this.setupInterceptors();
    }

    getUserInfo() {
        const userInfo = localStorage.getItem('userInfo');
        return userInfo ? JSON.parse(userInfo) : null;
    }

    isAuthenticated() {
        return !!this.token && !!this.user;
    }

    hasRole(roles) {
        if (!this.user) return false;
        if (typeof roles === 'string') roles = [roles];
        return roles.includes(this.user.role);
    }

    canEditPrices() {
        return this.hasRole('manager');
    }

    canDeleteRecords() {
        return this.hasRole('manager');
    }

    canAccessRecycleBin() {
        return this.hasRole(['manager', 'accountant']);
    }

    canRestoreRecords() {
        return this.hasRole('manager');
    }

    canManageUsers() {
        return this.hasRole('system_maintenance');
    }

    canAccessFinancialData() {
        return this.hasRole(['manager', 'accountant']);
    }

    getAuthHeaders() {
        return this.token ? { 'Authorization': `Bearer ${this.token}` } : {};
    }

    async makeAuthenticatedRequest(url, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...this.getAuthHeaders(),
            ...options.headers
        };

        const response = await fetch(url, {
            ...options,
            headers
        });

        // Handle authentication errors
        if (response.status === 401) {
            this.logout();
            window.location.href = '/login.html';
            throw new Error('Authentication required');
        }

        if (response.status === 403) {
            throw new Error('Access denied - insufficient permissions');
        }

        return response;
    }

    async logout() {
        try {
            if (this.token) {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: this.getAuthHeaders()
                });
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('authToken');
            localStorage.removeItem('userInfo');
            this.token = null;
            this.user = null;
            window.location.href = '/login.html';
        }
    }

    setupInterceptors() {
        // Override fetch to automatically add auth headers
        const originalFetch = window.fetch;
        window.fetch = async (url, options = {}) => {
            // Only add auth headers to API requests
            if (url.includes('/api/') && !url.includes('/api/auth/login')) {
                options.headers = {
                    ...options.headers,
                    ...this.getAuthHeaders()
                };
            }

            const response = await originalFetch(url, options);

            // Handle global authentication errors
            if (response.status === 401 && !url.includes('/api/auth/login')) {
                this.logout();
                return response;
            }

            return response;
        };
    }

    // Check authentication on page load
    checkAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = '/login.html';
            return false;
        }
        return true;
    }

    // Update UI based on user role
    updateUIForRole() {
        if (!this.user) return;

        const userRole = this.user.role;
        
        // Hide/show elements based on role
        document.querySelectorAll('[data-role]').forEach(element => {
            const requiredRoles = element.dataset.role.split(',');
            if (requiredRoles.includes(userRole)) {
                element.style.display = '';
            } else {
                element.style.display = 'none';
            }
        });

        // Disable buttons based on permissions
        document.querySelectorAll('[data-permission]').forEach(element => {
            const permission = element.dataset.permission;
            let hasPermission = false;

            switch (permission) {
                case 'edit-prices':
                    hasPermission = this.canEditPrices();
                    break;
                case 'delete-records':
                    hasPermission = this.canDeleteRecords();
                    break;
                case 'manage-users':
                    hasPermission = this.canManageUsers();
                    break;
                case 'access-financial':
                    hasPermission = this.canAccessFinancialData();
                    break;
                default:
                    hasPermission = true;
            }

            if (!hasPermission) {
                element.disabled = true;
                element.style.opacity = '0.5';
                element.title = 'ليس لديك صلاحية لهذا الإجراء';
            }
        });

        // Update user info display
        const userInfoElements = document.querySelectorAll('.user-info');
        userInfoElements.forEach(element => {
            element.textContent = `${this.user.username} (${this.getRoleDisplayName(userRole)})`;
        });
    }

    getRoleDisplayName(role) {
        const roleNames = {
            'manager': 'المدير',
            'accountant': 'المحاسب',
            'system_maintenance': 'صيانة النظام'
        };
        return roleNames[role] || role;
    }
}

// Create global auth manager instance
const authManager = new AuthManager();

// Auto-check authentication on page load (except login page)
document.addEventListener('DOMContentLoaded', function() {
    if (!window.location.pathname.includes('login.html')) {
        if (authManager.checkAuth()) {
            authManager.updateUIForRole();
        }
    }
});

// Export for use in other scripts
window.authManager = authManager;