import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const API_BASE_URL = 'http://localhost:8000/api/resume';

// Async thunks for chat API calls

// Send chat message
export const sendChatMessage = createAsyncThunk(
    'chat/sendMessage',
    async (message, { rejectWithValue }) => {
        try {
            const response = await fetch(`${API_BASE_URL}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Chat API Error:', errorData);
                throw new Error(JSON.stringify(errorData) || 'Failed to send message');
            }

            const data = await response.json();
            return data;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Clear conversation memory
export const clearMemory = createAsyncThunk(
    'chat/clearMemory',
    async (_, { rejectWithValue }) => {
        try {
            const response = await fetch(`${API_BASE_URL}/clear-memory`, {
                method: 'POST',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to clear memory');
            }

            const data = await response.json();
            return data;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

const initialState = {
    // Chat messages
    messages: [],

    // Loading states
    isLoading: false,
    clearingMemory: false,

    // Error states
    error: null,
    memoryError: null,

    // Chat metadata
    lastMessageTimestamp: null,
    conversationId: null,
};

const chatSlice = createSlice({
    name: 'chat',
    initialState,
    reducers: {
        addMessage: (state, action) => {
            state.messages.push({
                id: Date.now(),
                timestamp: new Date().toISOString(),
                ...action.payload,
            });
        },
        clearMessages: (state) => {
            state.messages = [];
        },
        clearError: (state) => {
            state.error = null;
        },
        clearMemoryError: (state) => {
            state.memoryError = null;
        },
        setTyping: (state, action) => {
            state.isTyping = action.payload;
        },
    },
    extraReducers: (builder) => {
        // Send chat message
        builder
            .addCase(sendChatMessage.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(sendChatMessage.fulfilled, (state, action) => {
                state.isLoading = false;

                // Add user message
                state.messages.push({
                    id: Date.now() - 1,
                    type: 'user',
                    content: action.payload.message,
                    timestamp: action.payload.timestamp,
                });

                // Add assistant response
                state.messages.push({
                    id: Date.now(),
                    type: 'assistant',
                    content: action.payload.response,
                    timestamp: action.payload.timestamp,
                    action: action.payload.action || null,
                    table_data: action.payload.table_data || null,
                    suggested_prompts: action.payload.suggested_prompts || null,
                });

                state.lastMessageTimestamp = action.payload.timestamp;
            })
            .addCase(sendChatMessage.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })

            // Clear memory
            .addCase(clearMemory.pending, (state) => {
                state.clearingMemory = true;
                state.memoryError = null;
            })
            .addCase(clearMemory.fulfilled, (state, action) => {
                state.clearingMemory = false;
                state.messages = []; // Clear local messages too
            })
            .addCase(clearMemory.rejected, (state, action) => {
                state.clearingMemory = false;
                state.memoryError = action.payload;
            });
    },
});

export const {
    addMessage,
    clearMessages,
    clearError,
    clearMemoryError,
    setTyping,
} = chatSlice.actions;

export default chatSlice.reducer;
