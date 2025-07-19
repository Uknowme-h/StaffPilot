import smtplib
import json
import os
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from dotenv import load_dotenv

load_dotenv()

class EmailService:
    def __init__(self):
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.sender_email = os.getenv("SENDER_EMAIL")
        self.sender_password = os.getenv("SENDER_PASSWORD")  # Use App Password for Gmail
        
    def send_professional_email(self, recipient_email, subject, body, candidate_name="Candidate"):
        """Send a professional email with custom subject and body"""
        
        message = MIMEMultipart()
        message["From"] = f"StaffPilot HR Team <{self.sender_email}>"
        message["To"] = recipient_email
        message["Subject"] = subject
        message["Reply-To"] = self.sender_email
        
        # Clean up the body text and ensure StaffPilot branding
        clean_body = body.strip()
        
        # Add StaffPilot footer if not already present
        if "StaffPilot HR Team" not in clean_body and "Best regards," not in clean_body:
            clean_body += f"""

Best regards,
StaffPilot HR Team
{self.sender_email}
www.staffpilot.com
"""
        
        # Attach the body
        message.attach(MIMEText(clean_body, "plain"))
        
        try:
            # Connect to server and send email
            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            server.starttls()
            server.login(self.sender_email, self.sender_password)
            text = message.as_string()
            server.sendmail(self.sender_email, recipient_email, text)
            server.quit()
            
            # Log the email
            self._log_email(recipient_email, subject, "SUCCESS")
            return True
            
        except Exception as e:
            self._log_email(recipient_email, subject, f"FAILED: {str(e)}")
            print(f"Failed to send email: {e}")
            return False
    
    def send_bulk_email(self, recipients, subject, body, job_title=None):
        """Send emails to multiple recipients (bulk email)"""
        results = []
        successful_sends = 0
        failed_sends = 0
        
        for recipient in recipients:
            # Personalize the email body for each candidate
            if isinstance(recipient, dict):
                email = recipient.get('email')
                name = recipient.get('name', 'Candidate')
                match_score = recipient.get('match_score', '')
            else:
                email = recipient
                name = 'Candidate'
                match_score = ''
            
            # Personalize body
            personalized_body = body.replace('[Candidate Name]', name)
            if job_title:
                personalized_body = personalized_body.replace('[Job Title]', job_title)
            if match_score:
                personalized_body = personalized_body.replace('[Match Score]', f"{match_score}%")
            
            # Send individual email
            success = self.send_professional_email(email, subject, personalized_body, name)
            
            results.append({
                'email': email,
                'name': name,
                'status': 'SUCCESS' if success else 'FAILED'
            })
            
            if success:
                successful_sends += 1
            else:
                failed_sends += 1
        
        return {
            'total_sent': len(recipients),
            'successful': successful_sends,
            'failed': failed_sends,
            'results': results
        }

    def send_resume_notification(self, recipient_email, candidate_name, resume_data):
        """Send notification email when a new resume is parsed"""
        
        message = MIMEMultipart()
        message["From"] = f"StaffPilot HR Team <{self.sender_email}>"
        message["To"] = recipient_email
        message["Subject"] = f"StaffPilot - New Resume Parsed: {candidate_name}"
        message["Reply-To"] = self.sender_email
        
        # Email body
        body = f"""Dear HR Team,

A new resume has been processed in the StaffPilot system.
        
Candidate Details:
- Name: {resume_data.get('full_name', 'N/A')}
- Email: {resume_data.get('email', 'N/A')}
- Phone: {resume_data.get('phone_number', 'N/A')}
- Skills: {', '.join(resume_data.get('skills', []))}
        
Please log into the StaffPilot dashboard to review the full details and take further action.
        
Best regards,
StaffPilot HR Team
{self.sender_email}
www.staffpilot.com
        """
        
        message.attach(MIMEText(body, "plain"))
        
        try:
            # Connect to server and send email
            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            server.starttls()
            server.login(self.sender_email, self.sender_password)
            text = message.as_string()
            server.sendmail(self.sender_email, recipient_email, text)
            server.quit()
            
            # Log the email
            self._log_email(recipient_email, candidate_name, "SUCCESS")
            return True
            
        except Exception as e:
            self._log_email(recipient_email, candidate_name, f"FAILED: {str(e)}")
            print(f"Failed to send email: {e}")
            return False
    
    def _log_email(self, recipient, subject, status):
        """Log email sending attempts"""
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "recipient": recipient,
            "subject": subject,
            "status": status
        }
        
        # Load existing logs
        log_file = "email_logs.json"
        try:
            with open(log_file, 'r') as f:
                logs = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            logs = []
        
        # Add new log entry
        logs.append(log_entry)
        
        # Save updated logs
        with open(log_file, 'w') as f:
            json.dump(logs, f, indent=2)

# Usage example
def send_test_email():
    email_service = EmailService()
    
    # Test data
    test_resume_data = {
        "full_name": "John Doe",
        "email": "john@example.com",
        "phone_number": "123-456-7890",
        "skills": ["Python", "FastAPI", "Machine Learning"]
    }
    
    success = email_service.send_resume_notification(
        recipient_email="hr@yourcompany.com",
        candidate_name="John Doe",
        resume_data=test_resume_data
    )
    
    if success:
        print("Email sent successfully!")
    else:
        print("Failed to send email")

if __name__ == "__main__":
    send_test_email()
