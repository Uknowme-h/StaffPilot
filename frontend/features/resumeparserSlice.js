import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const API_BASE_URL = 'http://localhost:8000/api/resume';

// Async thunks for API calls

// Upload resume
export const uploadResume = createAsyncThunk(
    'resumeParser/uploadResume',
    async (file, { rejectWithValue }) => {
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${API_BASE_URL}/upload`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to upload resume');
            }

            const data = await response.json();
            return data;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Get resume summary
export const getResumeSummary = createAsyncThunk(
    'resumeParser/getResumeSummary',
    async (_, { rejectWithValue }) => {
        try {
            const response = await fetch(`${API_BASE_URL}/resume-summary`);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to fetch resume summary');
            }

            const data = await response.json();
            return data;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Send notification
export const sendNotification = createAsyncThunk(
    'resumeParser/sendNotification',
    async ({ hrEmail, candidateName }, { rejectWithValue }) => {
        try {
            const response = await fetch(`${API_BASE_URL}/send-notification`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    hr_email: hrEmail,
                    candidate_name: candidateName,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to send notification');
            }

            const data = await response.json();
            return data;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Test email
export const testEmail = createAsyncThunk(
    'resumeParser/testEmail',
    async (recipientEmail, { rejectWithValue }) => {
        try {
            const response = await fetch(`${API_BASE_URL}/test-email?recipient_email=${encodeURIComponent(recipientEmail)}`, {
                method: 'POST',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to send test email');
            }

            const data = await response.json();
            return data;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

const initialState = {
    // Upload state
    uploading: false,
    uploadError: null,
    lastUploadedResume: null,

    // Resume summary state
    resumes: [],
    totalResumes: 0,
    fetchingResumes: false,
    resumesError: null,

    // Notification state
    sendingNotification: false,
    notificationError: null,
    lastNotification: null,

    // Email test state
    testingEmail: false,
    emailTestError: null,
    lastEmailTest: null,
};

const resumeParserSlice = createSlice({
    name: 'resumeParser',
    initialState,
    reducers: {
        clearUploadError: (state) => {
            state.uploadError = null;
        },
        clearResumesError: (state) => {
            state.resumesError = null;
        },
        clearNotificationError: (state) => {
            state.notificationError = null;
        },
        clearEmailTestError: (state) => {
            state.emailTestError = null;
        },
        resetUploadState: (state) => {
            state.uploading = false;
            state.uploadError = null;
            state.lastUploadedResume = null;
        },
    },
    extraReducers: (builder) => {
        // Upload resume
        builder
            .addCase(uploadResume.pending, (state) => {
                state.uploading = true;
                state.uploadError = null;
            })
            .addCase(uploadResume.fulfilled, (state, action) => {
                state.uploading = false;
                state.lastUploadedResume = action.payload.parsed_resume;
            })
            .addCase(uploadResume.rejected, (state, action) => {
                state.uploading = false;
                state.uploadError = action.payload;
            })

            // Get resume summary
            .addCase(getResumeSummary.pending, (state) => {
                state.fetchingResumes = true;
                state.resumesError = null;
            })
            .addCase(getResumeSummary.fulfilled, (state, action) => {
                state.fetchingResumes = false;
                state.resumes = action.payload.resumes || [];
                state.totalResumes = action.payload.total_resumes || 0;
            })
            .addCase(getResumeSummary.rejected, (state, action) => {
                state.fetchingResumes = false;
                state.resumesError = action.payload;
            })

            // Send notification
            .addCase(sendNotification.pending, (state) => {
                state.sendingNotification = true;
                state.notificationError = null;
            })
            .addCase(sendNotification.fulfilled, (state, action) => {
                state.sendingNotification = false;
                state.lastNotification = action.payload;
            })
            .addCase(sendNotification.rejected, (state, action) => {
                state.sendingNotification = false;
                state.notificationError = action.payload;
            })

            // Test email
            .addCase(testEmail.pending, (state) => {
                state.testingEmail = true;
                state.emailTestError = null;
            })
            .addCase(testEmail.fulfilled, (state, action) => {
                state.testingEmail = false;
                state.lastEmailTest = action.payload;
            })
            .addCase(testEmail.rejected, (state, action) => {
                state.testingEmail = false;
                state.emailTestError = action.payload;
            });
    },
});

export const {
    clearUploadError,
    clearResumesError,
    clearNotificationError,
    clearEmailTestError,
    resetUploadState,
} = resumeParserSlice.actions;

export default resumeParserSlice.reducer;
