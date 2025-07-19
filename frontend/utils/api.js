// API configuration and utilities

export const API_CONFIG = {
    BASE_URL: 'http://127.0.0.1:8000',
    ENDPOINTS: {
        RESUME: '/api/resume',
    },
    TIMEOUT: 30000, // 30 seconds
};

// API utility functions
export const apiUtils = {
    // Create FormData for file uploads
    createFormData: (file, additionalData = {}) => {
        const formData = new FormData();
        formData.append('file', file);

        Object.entries(additionalData).forEach(([key, value]) => {
            formData.append(key, value);
        });

        return formData;
    },

    // Handle API errors
    handleApiError: (error) => {
        if (error.response) {
            // Server responded with error status
            return error.response.data?.detail || error.response.statusText || 'Server error';
        } else if (error.request) {
            // Request was made but no response received
            return 'Network error - please check your connection';
        } else {
            // Something else happened
            return error.message || 'Unknown error occurred';
        }
    },

    // Create request headers
    createHeaders: (contentType = 'application/json') => {
        const headers = {
            'Content-Type': contentType,
        };

        // Add authentication token if available
        const token = localStorage.getItem('authToken');
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        return headers;
    },

    // Build URL with query parameters
    buildUrl: (baseUrl, params = {}) => {
        const url = new URL(baseUrl);
        Object.entries(params).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                url.searchParams.append(key, value);
            }
        });
        return url.toString();
    },

    // Format resume data for display
    formatResumeData: (resume) => {
        return {
            ...resume,
            formattedTimestamp: new Date(resume.timestamp).toLocaleString(),
            skillsCount: resume.skills?.length || 0,
            experienceCount: resume.work_experience?.length || 0,
            educationCount: resume.education?.length || 0,
            certificationsCount: resume.certifications?.length || 0,
        };
    },

    // Validate email format
    isValidEmail: (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    // File validation
    validateFile: (file, allowedTypes = ['application/pdf'], maxSizeMB = 10) => {
        const errors = [];

        if (!file) {
            errors.push('No file selected');
            return errors;
        }

        // Check file type
        if (!allowedTypes.includes(file.type)) {
            errors.push(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
        }

        // Check file size
        const maxSizeBytes = maxSizeMB * 1024 * 1024;
        if (file.size > maxSizeBytes) {
            errors.push(`File size too large. Maximum size: ${maxSizeMB}MB`);
        }

        return errors;
    },
};

// Export individual API endpoint builders
export const buildApiUrl = (endpoint, params = {}) => {
    const baseUrl = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.RESUME}${endpoint}`;
    return apiUtils.buildUrl(baseUrl, params);
};
