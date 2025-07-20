"use client";
import { useState, useRef, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { sendChatMessage, clearMemory } from "../../features/chatSlice";
import { uploadResume } from "../../features/resumeparserSlice";
import ReactMarkdown from "react-markdown";
import JobsDashboard from "../components/JobsDashboard";

type Message = {
  id: number;
  sender: "user" | "bot";
  text: string;
  fileName?: string;
  timestamp: string;
  action?: string;
  table_data?: {
    type: string;
    headers: string[];
    rows: any[];
  };
  suggested_prompts?: string[];
};

export default function ChatPage() {
  const dispatch = useAppDispatch();

  // Redux state
  const chat = useAppSelector((state: any) => state.chat);
  const resumeParser = useAppSelector((state: any) => state.resumeParser);

  // Local state
  const [currentView, setCurrentView] = useState<"chat" | "jobs">("chat");
  const [input, setInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Table Component
  const TableComponent = ({ tableData }: { tableData: any }) => {
    return (
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {tableData.headers.map((header: string, index: number) => (
                <th
                  key={index}
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
            {tableData.rows.map((row: any, index: number) => (
              <tr
                key={index}
                className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {Object.values(row).map((cell: any, cellIndex: number) => (
                  <td
                    key={cellIndex}
                    className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-600"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Suggested Prompts Component
  const SuggestedPrompts = ({ prompts }: { prompts: string[] }) => {
    const handlePromptClick = (prompt: string) => {
      setInput(prompt);
    };

    return (
      <div className="mt-3">
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
          💡 Suggested actions:
        </p>
        <div className="flex flex-wrap gap-2">
          {prompts.map((prompt, index) => (
            <button
              key={index}
              onClick={() => handlePromptClick(prompt)}
              className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors border border-blue-200 dark:border-blue-700"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Initial welcome message
  const [localMessages, setLocalMessages] = useState<Message[]>([
    {
      id: 0,
      sender: "bot",
      text: `Hello! I'm your **StaffPilot AI assistant**. Here's what I can help you with:

📄 **Resume Management:**
• Upload PDF resumes for parsing
• Ask questions about candidates
• View candidate details and summaries

🎯 **Job Matching:**
• "Match candidates for [job title]" - Find suitable candidates
• "List jobs" - See all available positions  
• "Job statistics" - View hiring analytics

📧 **Email Automation:**
• "Email candidate@email.com about [reason]" - Send AI-generated emails
• Automatic email templates for interviews, offers, rejections

**Try these commands:**
• "Match candidates for Customer Service Manager"
• "List available jobs" 
• "Show job statistics"

How can I help you today?`,
      timestamp: new Date().toISOString(),
    },
  ]);

  // Combine local messages with Redux chat messages and normalize format
  const allMessages = [
    ...localMessages,
    ...chat.messages.map((msg: any) => ({
      id: msg.id,
      sender: msg.type === "user" ? "user" : "bot",
      text: msg.content,
      timestamp: msg.timestamp,
      action: msg.action,
      table_data: msg.table_data,
      suggested_prompts: msg.suggested_prompts,
    })),
  ];

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages]);

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    try {
      // Add upload message
      const uploadMessage: Message = {
        id: Date.now(),
        sender: "user",
        text: `Uploading resume: ${file.name}`,
        fileName: file.name,
        timestamp: new Date().toISOString(),
      };
      setLocalMessages((prev) => [...prev, uploadMessage]);

      // Upload the file
      const result = await dispatch(uploadResume(file) as any);

      if (uploadResume.fulfilled.match(result)) {
        const parsedResume = result.payload.parsed_resume;

        // Add success message with parsed data
        const successMessage: Message = {
          id: Date.now() + 1,
          sender: "bot",
          text: `✅ Resume uploaded and parsed successfully!
          
📋 **Candidate Details:**
• **Name:** ${parsedResume.full_name || "Unknown"}
• **Email:** ${parsedResume.email || "Not provided"}
• **Phone:** ${parsedResume.phone_number || "Not provided"}
• **Skills:** ${parsedResume.skills?.join(", ") || "None listed"}
• **Experience:** ${parsedResume.work_experience?.length || 0} positions
• **Education:** ${parsedResume.education?.length || 0} qualifications

You can now ask me questions about this candidate or send emails to them!`,
          timestamp: new Date().toISOString(),
          action: "resume_uploaded",
        };
        setLocalMessages((prev) => [...prev, successMessage]);
      } else {
        // Add error message
        const errorMessage: Message = {
          id: Date.now() + 1,
          sender: "bot",
          text: `❌ Failed to upload resume: ${
            result.payload || "Unknown error"
          }`,
          timestamp: new Date().toISOString(),
        };
        setLocalMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error("Upload error:", error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    // Handle file upload if file is selected
    if (selectedFile) {
      await handleFileUpload(selectedFile);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }

    // Handle text message if input is provided
    if (input.trim()) {
      try {
        const result = await dispatch(sendChatMessage(input.trim()) as any);

        // Check if the message was sent successfully and handle the response
        if (sendChatMessage.fulfilled.match(result)) {
          // The Redux slice should handle adding the messages to the store
          // But we can also add any additional local handling here if needed
          console.log("Chat response received:", result.payload);
        } else if (sendChatMessage.rejected.match(result)) {
          // Handle error case
          const errorMessage: Message = {
            id: Date.now(),
            sender: "bot",
            text: `❌ Chat Error: ${
              result.payload || "Failed to send message"
            }`,
            timestamp: new Date().toISOString(),
          };
          setLocalMessages((prev) => [...prev, errorMessage]);
        }

        setInput("");
      } catch (error) {
        console.error("Chat error:", error);
        const errorMessage: Message = {
          id: Date.now(),
          sender: "bot",
          text: `❌ Network Error: ${error}`,
          timestamp: new Date().toISOString(),
        };
        setLocalMessages((prev) => [...prev, errorMessage]);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Validate file type (only PDF)
      if (file.type !== "application/pdf") {
        alert("Please select a PDF file only.");
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert("File size too large. Maximum size is 10MB.");
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  const clearConversation = async () => {
    try {
      await dispatch(clearMemory() as any);
      setLocalMessages([
        {
          id: Date.now(),
          sender: "bot",
          text: "Conversation memory cleared. How can I help you today?",
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error("Clear memory error:", error);
    }
  };

  // If jobs view is selected, render the JobsDashboard
  if (currentView === "jobs") {
    return <JobsDashboard />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="p-4 border-b border-gray-200 dark:border-gray-700 text-xl font-bold text-center bg-white dark:bg-gray-800 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <span>StaffPilot</span>
          <nav className="flex space-x-2">
            <button
              onClick={() => setCurrentView("chat")}
              className={`px-3 py-1 rounded text-sm ${
                currentView === "chat"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500"
              }`}
            >
              💬 Chat
            </button>
            <button
              onClick={() => setCurrentView("jobs")}
              className={`px-3 py-1 rounded text-sm ${
                currentView === "jobs"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500"
              }`}
            >
              💼 Jobs
            </button>
          </nav>
        </div>
        <button
          onClick={clearConversation}
          disabled={chat.clearingMemory}
          className="text-sm bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 disabled:opacity-50"
        >
          {chat.clearingMemory ? "Clearing..." : "Clear Chat"}
        </button>
      </header>
      <main className="flex-1 overflow-y-auto px-2 py-4 sm:px-0 flex flex-col items-center pb-24">
        <div className="w-full max-w-xl flex flex-col gap-4">
          {allMessages.map((msg: Message, i: number) => (
            <div
              key={msg.id || i}
              className={`flex ${
                msg.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`px-4 py-2 rounded-lg max-w-[80%] text-sm shadow ${
                  msg.sender === "user"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 dark:bg-gray-700 dark:text-gray-100"
                }`}
              >
                {msg.sender === "bot" ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => (
                          <p className="mb-2 last:mb-0">{children}</p>
                        ),
                        ul: ({ children }) => (
                          <ul className="list-disc list-inside mb-2">
                            {children}
                          </ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="list-decimal list-inside mb-2">
                            {children}
                          </ol>
                        ),
                        li: ({ children }) => (
                          <li className="mb-1">{children}</li>
                        ),
                        strong: ({ children }) => (
                          <strong className="font-semibold">{children}</strong>
                        ),
                        em: ({ children }) => (
                          <em className="italic">{children}</em>
                        ),
                        code: ({ children }) => (
                          <code className="bg-gray-300 dark:bg-gray-600 px-1 py-0.5 rounded text-xs font-mono">
                            {children}
                          </code>
                        ),
                        pre: ({ children }) => (
                          <pre className="bg-gray-300 dark:bg-gray-600 p-2 rounded overflow-x-auto text-xs font-mono mb-2">
                            {children}
                          </pre>
                        ),
                        h1: ({ children }) => (
                          <h1 className="text-lg font-bold mb-2">{children}</h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="text-base font-bold mb-2">
                            {children}
                          </h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="text-sm font-bold mb-1">{children}</h3>
                        ),
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-4 border-gray-400 pl-3 italic mb-2">
                            {children}
                          </blockquote>
                        ),
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                )}

                {/* Render table data if available */}
                {msg.table_data && (
                  <TableComponent tableData={msg.table_data} />
                )}

                {/* Render suggested prompts if available */}
                {msg.suggested_prompts && msg.suggested_prompts.length > 0 && (
                  <SuggestedPrompts prompts={msg.suggested_prompts} />
                )}

                {msg.fileName && (
                  <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                    📎 {msg.fileName}
                  </div>
                )}
                {msg.action && (
                  <div className="mt-1 text-xs text-green-600 dark:text-green-400">
                    ⚡ Action: {msg.action}
                  </div>
                )}
                <div className="mt-1 text-xs opacity-50">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}

          {/* Loading indicators */}
          {resumeParser.uploading && (
            <div className="flex justify-start">
              <div className="bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-lg text-sm">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  Uploading and parsing resume...
                </div>
              </div>
            </div>
          )}

          {chat.isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-lg text-sm">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  AI is thinking...
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Error messages */}
      {resumeParser.uploadError && (
        <div className="fixed bottom-24 left-0 right-0 w-full max-w-4xl mx-auto px-4 py-2 bg-red-100 border border-red-400 text-red-700 rounded">
          Upload Error: {resumeParser.uploadError}
        </div>
      )}

      {chat.error && (
        <div className="fixed bottom-24 left-0 right-0 w-full max-w-4xl mx-auto px-4 py-2 bg-red-100 border border-red-400 text-red-700 rounded">
          Chat Error: {chat.error}
        </div>
      )}

      <form
        onSubmit={sendMessage}
        className="fixed bottom-0 left-0 right-0 w-full max-w-4xl mx-auto p-4 flex gap-2 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700"
      >
        <button
          type="button"
          onClick={handleFileButtonClick}
          className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          title="Upload PDF resume"
        >
          📄
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf"
          onChange={handleFileChange}
        />
        <input
          className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-900 dark:text-white"
          type="text"
          placeholder="Try: 'Match candidates for Manager', 'List jobs', 'Email john@email.com about interview'..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={chat.isLoading || resumeParser.uploading}
        />
        <button
          type="submit"
          disabled={
            (!input.trim() && !selectedFile) ||
            chat.isLoading ||
            resumeParser.uploading
          }
          className="bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {chat.isLoading || resumeParser.uploading ? "Processing..." : "Send"}
        </button>
      </form>
      {selectedFile && (
        <div className="fixed bottom-20 left-0 right-0 w-full max-w-4xl mx-auto px-4 pb-2 text-sm text-gray-700 dark:text-gray-200 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded">
          <div className="flex items-center justify-between">
            <span>📎 Ready to upload: {selectedFile.name}</span>
            <button
              onClick={() => setSelectedFile(null)}
              className="text-red-500 hover:text-red-700 ml-2"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
