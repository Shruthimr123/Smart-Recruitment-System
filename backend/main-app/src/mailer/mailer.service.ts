import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
  private transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'shruthimr2003@gmail.com',
      pass: 'ntdi ryme wmdk fmco',
    },
  });

  async sendToken(
    email: string,
    token: string,
    applicant_id: string,
    attempt_id: string,
  ) {
    const link = `http://localhost:5173/test/${token}/${applicant_id}/${attempt_id}`;

    try {
      await this.transporter.sendMail({
        from: process.env.MAIL_USER,
        to: email,
        subject:
          'Mirafra Technologies - Online Technical Assessment (MCQ + Coding)',
        html: `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <p>Dear Candidate,</p>

      <p>
        Greetings from <b>Mirafra Technologies</b>! <br/>
        You have been shortlisted to appear for the <b>Online Technical Assessment</b>,
        which consists of <b>MCQs</b> and <b>Coding Questions</b>.
      </p>

      <p>
        Please note: You are required to complete this test within the next
        <b>24 hours</b> from receiving this email.
      </p>

      <p style="margin: 20px 0; text-align: center;">
        <a href="${link}" target="_blank"
           style="background-color: #28a745; color: #fff; padding: 12px 24px;
                  text-decoration: none; border-radius: 6px; display: inline-block;
                  font-weight: bold;">
          Click Here to Start Your Test
        </a>
      </p>

      <p><b>Important Instructions:</b></p>
      <ul style="margin-left: 20px;">
        <li>Ensure you have a stable internet connection throughout the test.</li>
        <li>Attempt the test from a quiet and disturbance-free environment.</li>
        <li>Do not refresh or close the browser while taking the test.</li>
        <li>Your activity will be monitored by the proctoring system.</li>
      </ul>

      <p>
        Wishing you the best of luck!<br/>
        <br/>
        Regards,<br/>
        <b>Mirafra Technologies Recruitment Team</b>
      </p>
    </div>
  `,
      });
    } catch (err) {
    
      throw new Error('Failed to send test link email');
    }
  }

  async sendTestLink(
    email: string,
    candidateName: string,
    testLink: string,
  ) {
    try {
      await this.transporter.sendMail({
        from: process.env.MAIL_USER,
        to: email,
        subject: 'Mirafra Technologies - Online Technical Assessment (MCQ + Coding)',
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <p>Dear ${candidateName},</p>

            <p>
              Greetings from <b>Mirafra Technologies</b>! <br/>
              You have been shortlisted to appear for the <b>Online Technical Assessment</b>,
              which consists of <b>MCQs</b> and <b>Coding Questions</b>.
            </p>

            <p>
              Please note: You are required to complete this test within the next
              <b>24 hours</b> from receiving this email.
            </p>

            <p style="margin: 20px 0; text-align: center;">
              <a href="${testLink}" target="_blank"
                 style="background-color: #28a745; color: #fff; padding: 12px 24px;
                        text-decoration: none; border-radius: 6px; display: inline-block;
                        font-weight: bold;">
                Click Here to Start Your Test
              </a>
            </p>

            <p><b>Important Instructions:</b></p>
            <ul style="margin-left: 20px;">
              <li>Ensure you have a stable internet connection throughout the test.</li>
              <li>Attempt the test from a quiet and disturbance-free environment.</li>
              <li>Do not refresh or close the browser while taking the test.</li>
              <li>Your activity will be monitored by the proctoring system.</li>
              <li>Use a working webcam and microphone for proctoring.</li>
              <li>Sit in a well-lit environment with no strong backlight.</li>
            </ul>

            <p>
              Wishing you the best of luck!<br/>
              <br/>
              Regards,<br/>
              <b>Mirafra Technologies Recruitment Team</b>
            </p>
          </div>
        `,
      });
    } catch (err) {
    
      throw new Error('Failed to send test link email');
    }
  }

  async sendResetPasswordEmail(email: string, link: string) {
    try {
      await this.transporter.sendMail({
        from: process.env.MAIL_USER,
        to: email,
        subject: 'Reset Your Password',
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <p>Dear User,</p>
            <p>We received a request to reset your password. Please click the button below to set a new one:</p>
            <p style="margin: 20px 0; text-align: center;">
              <a href="${link}" target="_blank"
                 style="background-color: #007bff; color: #fff; padding: 12px 24px;
                        text-decoration: none; border-radius: 6px; display: inline-block;
                        font-weight: bold;">
                Reset Password
              </a>
            </p>
            <p>If you did not request a password reset, please ignore this email.</p>
            <p>Best regards,<br/><b>Support Team</b></p>
          </div>
        `,
      });
    } catch (err) {
      
      throw new Error('Failed to send reset password email');
    }
  }
}