import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const API_BASE_URL = 'http://localhost:8000/api/resume';

// Async thunks for email API calls

// Get email logs
export const getEmailLogs = createAsyncThunk(
    'email/getLogs',
    async (_, { rejectWithValue }) => {
        try {
            const response = await fetch(`${API_BASE_URL}/email-logs`);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to fetch email logs');
            }

            const data = await response.json();
            return data;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Send email via chat (this could be used for direct email sending)
export const sendDirectEmail = createAsyncThunk(
    'email/sendDirect',
    async ({ recipientEmail, subject, body, reason }, { rejectWithValue }) => {
        try {
            // This uses the chat endpoint to send emails
            const message = `Email ${recipientEmail} about ${reason}. Subject: ${subject}. Content: ${body}`;

            const response = await fetch(`${API_BASE_URL}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to send email');
            }

            const data = await response.json();
            return data;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Send quick email for different purposes
export const sendQuickEmail = createAsyncThunk(
    'email/sendQuick',
    async ({ recipientEmail, emailType, additionalContext = '' }, { rejectWithValue }) => {
        try {
            let message = '';

            switch (emailType) {
                case 'selection':
                    message = `Email ${recipientEmail} about selection for next round interview. ${additionalContext}`;
                    break;
                case 'rejection':
                    message = `Email ${recipientEmail} about application rejection. ${additionalContext}`;
                    break;
                case 'interview':
                    message = `Email ${recipientEmail} about interview scheduling. ${additionalContext}`;
                    break;
                case 'offer':
                    message = `Email ${recipientEmail} about job offer. ${additionalContext}`;
                    break;
                case 'followup':
                    message = `Email ${recipientEmail} about follow-up status update. ${additionalContext}`;
                    break;
                default:
                    message = `Email ${recipientEmail} about general inquiry. ${additionalContext}`;
            }

            const response = await fetch(`${API_BASE_URL}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to send email');
            }

            const data = await response.json();
            return { ...data, emailType, recipientEmail };
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

const initialState = {
    // Email logs
    logs: [],
    fetchingLogs: false,
    logsError: null,

    // Email sending
    sendingEmail: false,
    sendEmailError: null,
    lastSentEmail: null,

    // Email templates/types
    emailTypes: [
        { value: 'selection', label: 'Selection for Next Round' },
        { value: 'rejection', label: 'Application Rejection' },
        { value: 'interview', label: 'Interview Scheduling' },
        { value: 'offer', label: 'Job Offer' },
        { value: 'followup', label: 'Follow-up/Status Update' },
        { value: 'custom', label: 'Custom Email' },
    ],

    // Email statistics
    totalEmailsSent: 0,
    emailsToday: 0,
    lastEmailTimestamp: null,
};

const emailSlice = createSlice({
    name: 'email',
    initialState,
    reducers: {
        clearLogsError: (state) => {
            state.logsError = null;
        },
        clearSendEmailError: (state) => {
            state.sendEmailError = null;
        },
        clearLastSentEmail: (state) => {
            state.lastSentEmail = null;
        },
        updateEmailStats: (state) => {
            state.totalEmailsSent = state.logs.length;

            // Calculate emails sent today
            const today = new Date().toDateString();
            state.emailsToday = state.logs.filter(log => {
                const logDate = new Date(log.timestamp).toDateString();
                return logDate === today;
            }).length;

            // Get last email timestamp
            if (state.logs.length > 0) {
                state.lastEmailTimestamp = state.logs[state.logs.length - 1].timestamp;
            }
        },
    },
    extraReducers: (builder) => {
        // Get email logs
        builder
            .addCase(getEmailLogs.pending, (state) => {
                state.fetchingLogs = true;
                state.logsError = null;
            })
            .addCase(getEmailLogs.fulfilled, (state, action) => {
                state.fetchingLogs = false;
                state.logs = action.payload.email_logs || [];

                // Update statistics
                emailSlice.caseReducers.updateEmailStats(state);
            })
            .addCase(getEmailLogs.rejected, (state, action) => {
                state.fetchingLogs = false;
                state.logsError = action.payload;
            })

            // Send direct email
            .addCase(sendDirectEmail.pending, (state) => {
                state.sendingEmail = true;
                state.sendEmailError = null;
            })
            .addCase(sendDirectEmail.fulfilled, (state, action) => {
                state.sendingEmail = false;
                state.lastSentEmail = action.payload;
            })
            .addCase(sendDirectEmail.rejected, (state, action) => {
                state.sendingEmail = false;
                state.sendEmailError = action.payload;
            })

            // Send quick email
            .addCase(sendQuickEmail.pending, (state) => {
                state.sendingEmail = true;
                state.sendEmailError = null;
            })
            .addCase(sendQuickEmail.fulfilled, (state, action) => {
                state.sendingEmail = false;
                state.lastSentEmail = action.payload;
            })
            .addCase(sendQuickEmail.rejected, (state, action) => {
                state.sendingEmail = false;
                state.sendEmailError = action.payload;
            });
    },
});

export const {
    clearLogsError,
    clearSendEmailError,
    clearLastSentEmail,
    updateEmailStats,
} = emailSlice.actions;

export default emailSlice.reducer;
