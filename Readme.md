# StaffPilot 🚀

An AI-powered staffing solution that automates resume parsing, candidate matching, and email communication for recruitment agencies.

## 🌟 Features

- **AI Resume Parsing**: Extract and structure resume data using advanced NLP
- **Smart Job Matching**: Match candidates to job requirements with AI scoring
- **Automated Email Communication**: Generate and send personalized recruitment emails
- **Interactive Chat Interface**: Chat with AI about candidates and job requirements
- **Real-time Dashboard**: View matched candidates and manage recruitment pipeline
- **Professional Email Templates**: Automated reach-out emails with company branding

## 🛠️ Tech Stack

### Frontend

- **Next.js 15** with TypeScript
- **React 19** with Redux Toolkit for state management
- **Tailwind CSS** for modern UI styling
- **React Markdown** for rich text rendering

### Backend

- **FastAPI** with Python 3.12
- **LangChain** for AI orchestration
- **Azure OpenAI** for intelligent processing
- **SMTP** integration for email delivery
- **PDF processing** for resume parsing

## 📋 Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.11+
- **Azure OpenAI** account and API keys
- **Gmail account** with App Password (for email sending)

## 🔑 Required API Keys

Create a `.env` file in the `backend` directory with the following variables:

```env
# Azure OpenAI Configuration
AZURE_OPENAI_ENDPOINT=your_azure_openai_endpoint
AZURE_OPENAI_API_KEY=your_azure_openai_api_key
AZURE_API_VERSION=2024-02-15-preview

# Email Configuration (Gmail)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SENDER_EMAIL=your_gmail_address@gmail.com
SENDER_PASSWORD=your_gmail_app_password

# Optional: Google API (currently commented out)
# GOOGLE_API_KEY=your_google_api_key
```

### 🔐 Setting up Gmail App Password

1. Enable 2-factor authentication on your Gmail account
2. Go to [Google Account Settings](https://myaccount.google.com/security)
3. Navigate to "2-Step Verification" → "App passwords"
4. Generate a new app password for "Mail"
5. Use this 16-character password as `SENDER_PASSWORD`

### 🔑 Azure OpenAI Setup

1. Create an Azure OpenAI resource in Azure Portal
2. Deploy a GPT-4 model (recommended: `gpt-4` or `gpt-4-turbo`)
3. Get your endpoint URL and API key from the Azure portal
4. Note your deployment name and API version

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Uknowme-h/StaffPilot.git
cd StaffPilot
```

### 2. Backend Setup

```bash
cd backend
pip install -r requirements.txt
```

Create `.env` file with your API keys (see above section).

### 3. Frontend Setup

```bash
cd frontend
npm install
```

## 🏃‍♂️ Running the Application

### Start Backend Server

```bash
cd backend
python main.py
```

Backend will run on `http://localhost:8000`

### Start Frontend Development Server

```bash
cd frontend
npm run dev
```

Frontend will run on `http://localhost:3000`

## 📖 How to Use

### 1. Resume Parsing & Chat

- Navigate to the **Chat** section
- Upload PDF resumes or ask questions about candidates
- The AI will parse resumes and extract key information

### 2. Job Matching

- Switch to the **Jobs** tab
- Create job descriptions with requirements
- View AI-matched candidates with compatibility scores
- Send personalized reach-out emails to candidates

### 3. Email Communication

- Use the "Send Reach Out Email" button for matched candidates
- AI generates personalized emails based on job requirements
- Track sent emails in the system logs

## 🎯 Core Capabilities

### For Staffing Companies:

- **Automated Screening**: Reduce manual resume review time by 80%
- **Smart Matching**: AI-powered candidate-job compatibility scoring
- **Personalized Outreach**: Generate tailored emails for each candidate
- **Centralized Dashboard**: Manage entire recruitment pipeline in one place
- **Professional Branding**: Consistent company branding in all communications

### AI Features:

- Resume parsing and data extraction
- Job requirement analysis
- Candidate-job matching algorithms
- Natural language chat interface
- Automated email generation

## 📁 Project Structure

```
StaffPilot/
├── backend/
│   ├── main.py                 # FastAPI application entry point
│   ├── requirements.txt        # Python dependencies
│   ├── routes/
│   │   ├── resume.py          # Resume parsing and email routes
│   │   └── jobs.py            # Job management routes
│   ├── utils/
│   │   ├── extract_text.py    # PDF text extraction
│   │   └── email_service.py   # SMTP email service
│   └── chains/
│       └── parse_resume.py    # LangChain resume parsing logic
├── frontend/
│   ├── package.json           # Node.js dependencies
│   ├── src/app/
│   │   ├── page.tsx          # Main application page
│   │   └── components/       # React components
│   └── features/
│       └── resumeparserSlice.js # Redux state management
└── README.md
```

## 🔧 API Endpoints

- `GET /` - Health check
- `POST /api/resume/upload` - Upload and parse resume
- `POST /api/resume/chat` - Chat with AI about resumes
- `POST /api/resume/send-reach-out-email` - Send recruitment emails
- `POST /api/jobs/create` - Create job descriptions
- `POST /api/jobs/match-candidates` - Match candidates to jobs

## 🐛 Troubleshooting

### Common Issues:

1. **Email sending fails**: Check Gmail App Password and SMTP settings
2. **Azure OpenAI errors**: Verify API keys and model deployment
3. **PDF parsing issues**: Ensure uploaded files are valid PDFs
4. **CORS errors**: Check backend URL configuration in frontend

### Environment Variables:

Make sure all required environment variables are set in the `.env` file.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support and questions:

- Create an issue on GitHub
- Contact: [your-email@example.com]

---

**StaffPilot** - Revolutionizing recruitment with AI-powered automation 🚀
