'use client';

import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import {
    uploadResume,
    getResumeSummary,
    sendNotification,
    testEmail,
    clearUploadError,
    resetUploadState,
} from '../features/resumeparserSlice';
import {
    sendChatMessage,
    clearMemory,
    clearMessages,
} from '../features/chatSlice';
import {
    getEmailLogs,
    sendQuickEmail,
} from '../features/emailSlice';

export default function StaffPilotDashboard() {
    const dispatch = useAppDispatch();

    // Redux state
    const resumeParser = useAppSelector((state) => state.resumeParser);
    const chat = useAppSelector((state) => state.chat);
    const email = useAppSelector((state) => state.email);

    // Local state
    const [selectedFile, setSelectedFile] = useState(null);
    const [chatMessage, setChatMessage] = useState('');
    const [hrEmail, setHrEmail] = useState('');
    const [testEmailAddress, setTestEmailAddress] = useState('');

    // Handlers
    const handleFileUpload = async () => {
        if (selectedFile) {
            const result = await dispatch(uploadResume(selectedFile));
            if (uploadResume.fulfilled.match(result)) {
                alert('Resume uploaded successfully!');
                dispatch(getResumeSummary()); // Refresh the resume list
            }
        }
    };

    const handleSendChat = async () => {
        if (chatMessage.trim()) {
            await dispatch(sendChatMessage(chatMessage));
            setChatMessage('');
        }
    };

    const handleSendNotification = async () => {
        if (hrEmail) {
            const result = await dispatch(sendNotification({
                hrEmail,
                candidateName: resumeParser.lastUploadedResume?.full_name
            }));
            if (sendNotification.fulfilled.match(result)) {
                alert('Notification sent successfully!');
            }
        }
    };

    const handleTestEmail = async () => {
        if (testEmailAddress) {
            const result = await dispatch(testEmail(testEmailAddress));
            if (testEmail.fulfilled.match(result)) {
                alert('Test email sent successfully!');
            }
        }
    };

    const handleQuickEmail = async (emailType, recipientEmail) => {
        const result = await dispatch(sendQuickEmail({
            recipientEmail,
            emailType,
            additionalContext: `Quick ${emailType} email sent from dashboard`
        }));
        if (sendQuickEmail.fulfilled.match(result)) {
            alert(`${emailType} email sent successfully!`);
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">StaffPilot Dashboard</h1>

            {/* Resume Upload Section */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">Upload Resume</h2>
                <div className="flex items-center gap-4">
                    <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => setSelectedFile(e.target.files[0])}
                        className="border rounded px-3 py-2"
                    />
                    <button
                        onClick={handleFileUpload}
                        disabled={!selectedFile || resumeParser.uploading}
                        className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
                    >
                        {resumeParser.uploading ? 'Uploading...' : 'Upload'}
                    </button>
                </div>
                {resumeParser.uploadError && (
                    <div className="text-red-500 mt-2">{resumeParser.uploadError}</div>
                )}
            </div>

            {/* Resume Summary Section */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Resume Summary</h2>
                    <button
                        onClick={() => dispatch(getResumeSummary())}
                        disabled={resumeParser.fetchingResumes}
                        className="bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50"
                    >
                        {resumeParser.fetchingResumes ? 'Loading...' : 'Refresh'}
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {resumeParser.resumes.map((resume, index) => (
                        <div key={index} className="border rounded p-4">
                            <h3 className="font-semibold">{resume.full_name}</h3>
                            <p className="text-sm text-gray-600">{resume.email}</p>
                            <p className="text-sm">Skills: {resume.skills_count}</p>
                            <p className="text-sm">Experience: {resume.experience_count}</p>
                            <div className="mt-2 flex gap-2">
                                {resume.email && (
                                    <>
                                        <button
                                            onClick={() => handleQuickEmail('selection', resume.email)}
                                            className="text-xs bg-green-500 text-white px-2 py-1 rounded"
                                        >
                                            Select
                                        </button>
                                        <button
                                            onClick={() => handleQuickEmail('rejection', resume.email)}
                                            className="text-xs bg-red-500 text-white px-2 py-1 rounded"
                                        >
                                            Reject
                                        </button>
                                        <button
                                            onClick={() => handleQuickEmail('interview', resume.email)}
                                            className="text-xs bg-blue-500 text-white px-2 py-1 rounded"
                                        >
                                            Interview
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Chat Section */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">AI Chat</h2>
                    <button
                        onClick={() => dispatch(clearMemory())}
                        className="bg-red-500 text-white px-4 py-2 rounded"
                    >
                        Clear Memory
                    </button>
                </div>
                <div className="max-h-96 overflow-y-auto mb-4 border rounded p-4">
                    {chat.messages.map((message) => (
                        <div
                            key={message.id}
                            className={`mb-2 p-2 rounded ${message.type === 'user'
                                    ? 'bg-blue-100 ml-8'
                                    : 'bg-gray-100 mr-8'
                                }`}
                        >
                            <div className="font-semibold">
                                {message.type === 'user' ? 'You' : 'AI Assistant'}
                            </div>
                            <div>{message.content}</div>
                            {message.action && (
                                <div className="text-sm text-green-600 mt-1">
                                    Action: {message.action}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendChat()}
                        placeholder="Ask about resumes or send emails..."
                        className="flex-1 border rounded px-3 py-2"
                    />
                    <button
                        onClick={handleSendChat}
                        disabled={chat.isLoading}
                        className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
                    >
                        {chat.isLoading ? 'Sending...' : 'Send'}
                    </button>
                </div>
            </div>

            {/* Email Management Section */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Email Management</h2>
                    <button
                        onClick={() => dispatch(getEmailLogs())}
                        disabled={email.fetchingLogs}
                        className="bg-purple-500 text-white px-4 py-2 rounded disabled:opacity-50"
                    >
                        {email.fetchingLogs ? 'Loading...' : 'Refresh Logs'}
                    </button>
                </div>

                {/* Email Statistics */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-blue-50 p-4 rounded">
                        <div className="text-2xl font-bold">{email.totalEmailsSent}</div>
                        <div className="text-sm text-gray-600">Total Emails</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded">
                        <div className="text-2xl font-bold">{email.emailsToday}</div>
                        <div className="text-sm text-gray-600">Today</div>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded">
                        <div className="text-2xl font-bold">{email.logs.length}</div>
                        <div className="text-sm text-gray-600">Logged</div>
                    </div>
                </div>

                {/* Test Email */}
                <div className="flex gap-2 mb-4">
                    <input
                        type="email"
                        value={testEmailAddress}
                        onChange={(e) => setTestEmailAddress(e.target.value)}
                        placeholder="Test email address"
                        className="flex-1 border rounded px-3 py-2"
                    />
                    <button
                        onClick={handleTestEmail}
                        disabled={email.sendingEmail}
                        className="bg-orange-500 text-white px-4 py-2 rounded disabled:opacity-50"
                    >
                        Test Email
                    </button>
                </div>

                {/* HR Notification */}
                <div className="flex gap-2">
                    <input
                        type="email"
                        value={hrEmail}
                        onChange={(e) => setHrEmail(e.target.value)}
                        placeholder="HR email for notifications"
                        className="flex-1 border rounded px-3 py-2"
                    />
                    <button
                        onClick={handleSendNotification}
                        disabled={resumeParser.sendingNotification}
                        className="bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50"
                    >
                        {resumeParser.sendingNotification ? 'Sending...' : 'Send Notification'}
                    </button>
                </div>
            </div>
        </div>
    );
}
