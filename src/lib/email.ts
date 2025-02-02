import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export const sendVerificationEmail = async (email: string, token: string) => {
  try {
    await transporter.sendMail({
      from: `"${process.env.SMTP_FROM}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Verify your email address',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                margin: 0;
                padding: 0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                background-color: #f7fafc;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              }
              .header {
                background: linear-gradient(135deg, #6b46c1, #805ad5);
                padding: 40px 20px;
                text-align: center;
                color: #ffffff;
              }
              .header h1 {
                margin: 0;
                font-size: 28px;
                font-weight: 600;
              }
              .content {
                padding: 30px;
                color: #4a5568;
              }
              .content p {
              text-align: center;
                font-size: 16px;
                line-height: 1.5;
                margin: 0 0 20px;
              }
              .token {
                background-color: #f7fafc;
                padding: 20px;
                border-radius: 8px;
                text-align: center;
                margin: 20px 0;
                font-size: 24px;
                font-weight: 600;
                color: #2d3748;
                letter-spacing: 4px;
              }
              .button-container {
                text-align: center; /* Menengahkan tombol */
                margin: 20px 0;
              }
              .button {
                display: inline-block;
                padding: 12px 24px;
                background-color: #6b46c1;
                color: #ffffff; /* Warna teks putih */
                text-decoration: none;
                border-radius: 6px;
                font-size: 16px;
                font-weight: 500;
                transition: background-color 0.3s ease;
              }
              .button:hover {
                background-color: #805ad5; /* Efek hover */
              }
              .footer {
                text-align: center;
                padding: 20px;
                font-size: 14px;
                color: #718096;
                background-color: #f7fafc;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Verify Your Email Address</h1>
              </div>
              <div class="content">
                <p>Thank you for signing up! To complete your registration, please verify your email address by clicking the button below:</p>
                <div class="token">${token}</div>
                <div class="button-container">
                  <a href="${process.env.BASE_URL}/verify-email?token=${token}" class="button">Verify Email</a>
                </div>
                <p>If you did not request this, please ignore this email.</p>
              </div>
              <div class="footer">
                <p>This code will expire in 15 minutes.</p>
                <p>&copy; ${new Date().getFullYear()} Your Company. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error('SEND_VERIFICATION_EMAIL_ERROR', error);
    throw new Error('Failed to send verification email');
  }
};