import { configureStore } from '@reduxjs/toolkit';
import resumeParserReducer from '../features/resumeparserSlice';
import chatReducer from '../features/chatSlice';
import emailReducer from '../features/emailSlice';
import jobsReducer from '../features/jobsSlice';

export const store = configureStore({
    reducer: {
        resumeParser: resumeParserReducer,
        chat: chatReducer,
        email: emailReducer,
        jobs: jobsReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: ['persist/PERSIST'],
            },
        }),
});
