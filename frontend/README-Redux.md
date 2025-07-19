# StaffPilot Redux Store Documentation

This document explains the Redux setup for the StaffPilot frontend application.

## Store Structure

The Redux store is organized into three main slices:

### 1. Resume Parser Slice (`resumeparserSlice.js`)

Handles all resume-related operations:

#### Actions:

- `uploadResume(file)` - Upload and parse a resume PDF
- `getResumeSummary()` - Get summary of all parsed resumes
- `sendNotification({ hrEmail, candidateName })` - Send HR notification
- `testEmail(recipientEmail)` - Send test email

#### State:

```javascript
{
  uploading: false,
  uploadError: null,
  lastUploadedResume: null,
  resumes: [],
  totalResumes: 0,
  fetchingResumes: false,
  resumesError: null,
  sendingNotification: false,
  notificationError: null,
  lastNotification: null,
  testingEmail: false,
  emailTestError: null,
  lastEmailTest: null,
}
```

### 2. Chat Slice (`chatSlice.js`)

Manages AI chat functionality:

#### Actions:

- `sendChatMessage(message)` - Send message to AI assistant
- `clearMemory()` - Clear conversation memory

#### State:

```javascript
{
  messages: [],
  isLoading: false,
  clearingMemory: false,
  error: null,
  memoryError: null,
  lastMessageTimestamp: null,
  conversationId: null,
}
```

### 3. Email Slice (`emailSlice.js`)

Handles email operations:

#### Actions:

- `getEmailLogs()` - Fetch email logs
- `sendDirectEmail({ recipientEmail, subject, body, reason })` - Send custom email
- `sendQuickEmail({ recipientEmail, emailType, additionalContext })` - Send templated email

#### State:

```javascript
{
  logs: [],
  fetchingLogs: false,
  logsError: null,
  sendingEmail: false,
  sendEmailError: null,
  lastSentEmail: null,
  emailTypes: [...],
  totalEmailsSent: 0,
  emailsToday: 0,
  lastEmailTimestamp: null,
}
```

## Usage Examples

### 1. Basic Component Setup

```javascript
import { useAppDispatch, useAppSelector } from "../hooks/redux";
import { uploadResume, getResumeSummary } from "../features/resumeparserSlice";

function MyComponent() {
  const dispatch = useAppDispatch();
  const { uploading, resumes, uploadError } = useAppSelector(
    (state) => state.resumeParser
  );

  const handleUpload = async (file) => {
    const result = await dispatch(uploadResume(file));
    if (uploadResume.fulfilled.match(result)) {
      console.log("Upload successful:", result.payload);
    }
  };

  return (
    <div>
      {uploading && <p>Uploading...</p>}
      {uploadError && <p>Error: {uploadError}</p>}
      {/* Your UI */}
    </div>
  );
}
```

### 2. Chat Integration

```javascript
import { sendChatMessage } from "../features/chatSlice";

function ChatComponent() {
  const dispatch = useAppDispatch();
  const { messages, isLoading } = useAppSelector((state) => state.chat);

  const sendMessage = async (message) => {
    await dispatch(sendChatMessage(message));
  };

  return (
    <div>
      {messages.map((msg) => (
        <div key={msg.id}>{msg.content}</div>
      ))}
      {/* Chat input */}
    </div>
  );
}
```

### 3. Email Operations

```javascript
import { sendQuickEmail, getEmailLogs } from "../features/emailSlice";

function EmailComponent() {
  const dispatch = useAppDispatch();
  const { sendingEmail, logs } = useAppSelector((state) => state.email);

  const sendSelectionEmail = async (candidateEmail) => {
    await dispatch(
      sendQuickEmail({
        recipientEmail: candidateEmail,
        emailType: "selection",
        additionalContext: "Selected for senior developer position",
      })
    );
  };

  return (
    <div>
      <button
        onClick={() => sendSelectionEmail("candidate@example.com")}
        disabled={sendingEmail}
      >
        Send Selection Email
      </button>
    </div>
  );
}
```

## API Endpoints Mapped

All Redux actions correspond to these backend API endpoints:

- `POST /api/resume/upload` → `uploadResume`
- `GET /api/resume/resume-summary` → `getResumeSummary`
- `POST /api/resume/chat` → `sendChatMessage`
- `POST /api/resume/clear-memory` → `clearMemory`
- `GET /api/resume/email-logs` → `getEmailLogs`
- `POST /api/resume/send-notification` → `sendNotification`
- `POST /api/resume/test-email` → `testEmail`

## Error Handling

All async actions include proper error handling:

```javascript
// Actions automatically handle three states:
// - pending: Loading state
// - fulfilled: Success state
// - rejected: Error state

const result = await dispatch(uploadResume(file));

if (uploadResume.fulfilled.match(result)) {
  // Success - access result.payload
} else if (uploadResume.rejected.match(result)) {
  // Error - access result.payload (error message)
}
```

## File Structure

```
frontend/
├── features/
│   ├── resumeparserSlice.js    # Resume operations
│   ├── chatSlice.js            # Chat functionality
│   └── emailSlice.js           # Email operations
├── store/
│   └── store.js                # Store configuration
├── hooks/
│   └── redux.js                # Typed hooks
├── utils/
│   └── api.js                  # API utilities
├── providers/
│   └── ReduxProvider.js        # Provider component
└── components/
    └── StaffPilotDashboard.js  # Example usage
```

## Setup Instructions

1. The Redux store is already configured in `layout.tsx`
2. Import the hooks in your components:
   ```javascript
   import { useAppDispatch, useAppSelector } from "../hooks/redux";
   ```
3. Dispatch actions and select state as needed
4. Handle loading and error states in your UI

## Email Types Available

The email slice supports these quick email types:

- `selection` - Selection for next round
- `rejection` - Application rejection
- `interview` - Interview scheduling
- `offer` - Job offer
- `followup` - Follow-up/status update
- `custom` - Custom email content
