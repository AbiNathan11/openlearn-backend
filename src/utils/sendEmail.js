import nodemailer from 'nodemailer';

const sendTokenEmail = async (email, token, name) => {
    // Create a transporter using your email service (Gmail is common)
    // NOTE: For Gmail, use an "App Password"
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const mailOptions = {
        from: '"OpenLearn Support" <no-reply@openlearn.com>',
        to: email,
        subject: 'Password Reset OTP - OpenLearn',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e1e1e1; border-radius: 10px; overflow: hidden;">
                <div style="background-color: #0081be; padding: 20px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0;">OpenLearn</h1>
                </div>
                <div style="padding: 40px 20px; text-align: center;">
                    <h2 style="color: #333;">Password Reset OTP</h2>
                    <p style="color: #666; font-size: 16px;">Hi ${name},</p>
                    <p style="color: #666; font-size: 16px;">We received a request to reset your password. Use the code below to proceed:</p>
                    <div style="margin: 30px auto; padding: 20px; background-color: #f4f4f4; border-radius: 5px; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #0081be; display: inline-block;">
                        ${token}
                    </div>
                    <p style="color: #999; font-size: 14px; margin-top: 30px;">This code will expire in 15 minutes.</p>
                </div>
                <div style="background-color: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #999;">
                    If you didn't request this, you can safely ignore this email.
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`[PASS_RESET] Email sent successfully to ${email}`);
        return true;
    } catch (error) {
        console.error(`[PASS_RESET_ERROR] Failed to send email to ${email}:`, error);
        return false;
    }
};

export default sendTokenEmail;
