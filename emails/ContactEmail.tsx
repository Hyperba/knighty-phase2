import * as React from 'react'

interface ContactEmailProps {
  name: string
  email: string
  projectType: string
  message: string
}

export const ContactEmail = ({
  name,
  email,
  projectType,
  message,
}: ContactEmailProps) => (
  <html>
    <head>
      <style>{`
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
          background-color: #f4f4f4;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background-color: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #0f0f0f, #000);
          padding: 40px 30px;
          text-align: center;
        }
        .header h1 {
          color: #ffffff;
          margin: 0;
          font-size: 28px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: -0.5px;
        }
        .content {
          padding: 40px 30px;
        }
        .field {
          margin-bottom: 24px;
        }
        .field-label {
          color: #666666;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          margin-bottom: 6px;
        }
        .field-value {
          color: #1a1a1a;
          font-size: 16px;
          line-height: 1.6;
          margin: 0;
        }
        .message-box {
          background-color: #f8f8f8;
          border-left: 4px solid #000000;
          padding: 20px;
          border-radius: 4px;
          margin-top: 8px;
        }
        .footer {
          background-color: #f8f8f8;
          padding: 24px 30px;
          text-align: center;
          border-top: 1px solid #e0e0e0;
        }
        .footer p {
          color: #888888;
          font-size: 13px;
          margin: 0;
        }
        .divider {
          height: 1px;
          background-color: #e0e0e0;
          margin: 24px 0;
        }
      `}</style>
    </head>
    <body>
      <div className="container">
        <div className="header">
          <h1>New Project Inquiry</h1>
        </div>
        
        <div className="content">
          <div className="field">
            <div className="field-label">Name</div>
            <p className="field-value">{name}</p>
          </div>

          <div className="field">
            <div className="field-label">Email</div>
            <p className="field-value">
              <a href={`mailto:${email}`} style={{ color: '#000000', textDecoration: 'none' }}>
                {email}
              </a>
            </p>
          </div>

          <div className="field">
            <div className="field-label">Project Type</div>
            <p className="field-value">{projectType}</p>
          </div>

          <div className="divider" />

          <div className="field">
            <div className="field-label">Message</div>
            <div className="message-box">
              <p className="field-value" style={{ whiteSpace: 'pre-wrap' }}>
                {message}
              </p>
            </div>
          </div>
        </div>

        <div className="footer">
          <p>This email was sent from the Knighty Builds contact form</p>
        </div>
      </div>
    </body>
  </html>
)
