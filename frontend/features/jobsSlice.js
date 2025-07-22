import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// API base URL
const API_BASE_URL = 'http://localhost:8000/api/jobs';

// Async thunks for job API calls

// Match candidates to job
export const matchCandidatesToJob = createAsyncThunk(
    'jobs/matchCandidates',
    async ({ job_title, top_candidates = 5 }, { rejectWithValue }) => {
        try {
            const response = await fetch(`${API_BASE_URL}/match-candidates`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ job_title, top_candidates }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to match candidates');
            }

            const data = await response.json();
            return { job_title, results: data };
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Get available jobs
export const getAvailableJobs = createAsyncThunk(
    'jobs/getAvailableJobs',
    async (status = null, { rejectWithValue }) => {
        try {
            const url = status ? `${API_BASE_URL}/jobs?status=${status}` : `${API_BASE_URL}/jobs`;
            const response = await fetch(url);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to fetch jobs');
            }

            const data = await response.json();
            return data;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Search jobs
export const searchJobs = createAsyncThunk(
    'jobs/searchJobs',
    async ({ title, job_type, employment_type }, { rejectWithValue }) => {
        try {
            const params = new URLSearchParams();
            if (title) params.append('title', title);
            if (job_type) params.append('job_type', job_type);
            if (employment_type) params.append('employment_type', employment_type);

            const response = await fetch(`${API_BASE_URL}/jobs/search?${params.toString()}`);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to search jobs');
            }

            const data = await response.json();
            return data;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Get job by ID
export const getJobById = createAsyncThunk(
    'jobs/getJobById',
    async (jobId, { rejectWithValue }) => {
        try {
            const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to fetch job');
            }

            const data = await response.json();
            return data;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Get job statistics
export const getJobStatistics = createAsyncThunk(
    'jobs/getStatistics',
    async (_, { rejectWithValue }) => {
        try {
            const response = await fetch(`${API_BASE_URL}/statistics`);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to fetch statistics');
            }

            const data = await response.json();
            return data;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Quick match candidate to job
export const quickMatchCandidate = createAsyncThunk(
    'jobs/quickMatch',
    async ({ candidate_email, job_title }, { rejectWithValue }) => {
        try {
            const response = await fetch(`${API_BASE_URL}/quick-match?candidate_email=${candidate_email}&job_title=${job_title}`, {
                method: 'POST',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to quick match');
            }

            const data = await response.json();
            return data;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Send reach out email to candidate
export const sendReachOutEmail = createAsyncThunk(
    'jobs/sendReachOutEmail',
    async ({ candidate_email, candidate_name, job_title, match_score, matching_skills, candidate_summary }, { rejectWithValue }) => {
        try {
            const response = await fetch('http://localhost:8000/api/resume/send-reach-out-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    candidate_email,
                    candidate_name,
                    job_title,
                    match_score,
                    matching_skills,
                    candidate_summary
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to send reach out email');
            }

            const data = await response.json();
            return data;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Initial state
const initialState = {
    // Job matching
    matchResults: [],
    currentJobTitle: null,
    isMatching: false,
    matchError: null,

    // Job listing
    jobs: [],
    isLoadingJobs: false,
    jobsError: null,

    // Job search
    searchResults: [],
    isSearching: false,
    searchError: null,

    // Single job
    selectedJob: null,
    isLoadingJob: false,
    jobError: null,

    // Statistics
    statistics: null,
    isLoadingStats: false,
    statsError: null,

    // Quick match
    quickMatchResult: null,
    isQuickMatching: false,
    quickMatchError: null,

    // Reach out emails
    emailResults: [],
    isSendingEmail: false,
    emailError: null,
};

// Jobs slice
const jobsSlice = createSlice({
    name: 'jobs',
    initialState,
    reducers: {
        clearMatchResults: (state) => {
            state.matchResults = [];
            state.currentJobTitle = null;
            state.matchError = null;
        },
        clearSearchResults: (state) => {
            state.searchResults = [];
            state.searchError = null;
        },
        clearSelectedJob: (state) => {
            state.selectedJob = null;
            state.jobError = null;
        },
        clearQuickMatch: (state) => {
            state.quickMatchResult = null;
            state.quickMatchError = null;
        },
        clearEmailResults: (state) => {
            state.emailResults = [];
            state.emailError = null;
        },
        clearAllErrors: (state) => {
            state.matchError = null;
            state.jobsError = null;
            state.searchError = null;
            state.jobError = null;
            state.statsError = null;
            state.quickMatchError = null;
            state.emailError = null;
        },
    },
    extraReducers: (builder) => {
        // Match candidates to job
        builder
            .addCase(matchCandidatesToJob.pending, (state) => {
                state.isMatching = true;
                state.matchError = null;
            })
            .addCase(matchCandidatesToJob.fulfilled, (state, action) => {
                state.isMatching = false;
                state.matchResults = action.payload.results;
                state.currentJobTitle = action.payload.job_title;
                state.matchError = null;
            })
            .addCase(matchCandidatesToJob.rejected, (state, action) => {
                state.isMatching = false;
                state.matchError = action.payload;
            });

        // Get available jobs
        builder
            .addCase(getAvailableJobs.pending, (state) => {
                state.isLoadingJobs = true;
                state.jobsError = null;
            })
            .addCase(getAvailableJobs.fulfilled, (state, action) => {
                state.isLoadingJobs = false;
                state.jobs = action.payload;
                state.jobsError = null;
            })
            .addCase(getAvailableJobs.rejected, (state, action) => {
                state.isLoadingJobs = false;
                state.jobsError = action.payload;
            });

        // Search jobs
        builder
            .addCase(searchJobs.pending, (state) => {
                state.isSearching = true;
                state.searchError = null;
            })
            .addCase(searchJobs.fulfilled, (state, action) => {
                state.isSearching = false;
                state.searchResults = action.payload;
                state.searchError = null;
            })
            .addCase(searchJobs.rejected, (state, action) => {
                state.isSearching = false;
                state.searchError = action.payload;
            });

        // Get job by ID
        builder
            .addCase(getJobById.pending, (state) => {
                state.isLoadingJob = true;
                state.jobError = null;
            })
            .addCase(getJobById.fulfilled, (state, action) => {
                state.isLoadingJob = false;
                state.selectedJob = action.payload;
                state.jobError = null;
            })
            .addCase(getJobById.rejected, (state, action) => {
                state.isLoadingJob = false;
                state.jobError = action.payload;
            });

        // Get statistics
        builder
            .addCase(getJobStatistics.pending, (state) => {
                state.isLoadingStats = true;
                state.statsError = null;
            })
            .addCase(getJobStatistics.fulfilled, (state, action) => {
                state.isLoadingStats = false;
                state.statistics = action.payload;
                state.statsError = null;
            })
            .addCase(getJobStatistics.rejected, (state, action) => {
                state.isLoadingStats = false;
                state.statsError = action.payload;
            });

        // Quick match
        builder
            .addCase(quickMatchCandidate.pending, (state) => {
                state.isQuickMatching = true;
                state.quickMatchError = null;
            })
            .addCase(quickMatchCandidate.fulfilled, (state, action) => {
                state.isQuickMatching = false;
                state.quickMatchResult = action.payload;
                state.quickMatchError = null;
            })
            .addCase(quickMatchCandidate.rejected, (state, action) => {
                state.isQuickMatching = false;
                state.quickMatchError = action.payload;
            });

        // Send reach out email
        builder
            .addCase(sendReachOutEmail.pending, (state) => {
                state.isSendingEmail = true;
                state.emailError = null;
            })
            .addCase(sendReachOutEmail.fulfilled, (state, action) => {
                state.isSendingEmail = false;
                state.emailResults.push(action.payload);
                state.emailError = null;
            })
            .addCase(sendReachOutEmail.rejected, (state, action) => {
                state.isSendingEmail = false;
                state.emailError = action.payload;
            });
    },
});

// Export actions
export const {
    clearMatchResults,
    clearSearchResults,
    clearSelectedJob,
    clearQuickMatch,
    clearEmailResults,
    clearAllErrors,
} = jobsSlice.actions;

// Export reducer
export default jobsSlice.reducer;
