// File: services/emailService.js
const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = null;
        this.initPromise = this.initialize();
    }

    async initialize() {
        // Real Gmail (or other SMTP) when credentials exist — works in development too.
        // Otherwise fall back to Ethereal so the app runs without mail config.
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            this.useSMTP();
        } else {
            console.log('📧 EMAIL_USER/EMAIL_PASS not set — using Ethereal (messages do not reach real Gmail)');
            await this.useEthereal();
        }
    }

    async useEthereal() {
        try {
            // Create test account
            const testAccount = await nodemailer.createTestAccount();
            this.transporter = nodemailer.createTransport({
                host: 'smtp.ethereal.email',
                port: 587,
                secure: false,
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass
                }
            });
            console.log('📧 Using Ethereal email (test mode)');
            console.log(`   Preview URL: https://ethereal.email/login`);
        } catch (error) {
            console.error('Failed to create ethereal account:', error);
        }
    }

    useSMTP() {
        this.transporter = nodemailer.createTransport({
            service: process.env.EMAIL_SERVICE || 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
        console.log('📧 Using SMTP email service');
    }

    async ensureReady() {
        if (!this.transporter) {
            if (this.initPromise) {
                await this.initPromise;
            }
        }
        return Boolean(this.transporter);
    }

    generateEmailTemplate(title, content, buttonText, buttonLink) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${title}</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        margin: 0;
                        padding: 0;
                        background-color: #f5f5f5;
                    }
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                        background-color: #ffffff;
                        border-radius: 8px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    }
                    .header {
                        text-align: center;
                        padding: 20px 0;
                        border-bottom: 2px solid #4CAF50;
                    }
                    .header h1 {
                        color: #4CAF50;
                        margin: 0;
                        font-size: 24px;
                    }
                    .header p {
                        color: #666;
                        margin: 5px 0 0;
                    }
                    .content {
                        padding: 30px 20px;
                    }
                    .footer {
                        text-align: center;
                        padding: 20px;
                        font-size: 12px;
                        color: #666;
                        border-top: 1px solid #eee;
                    }
                    .button {
                        display: inline-block;
                        padding: 12px 24px;
                        background-color: #4CAF50;
                        color: white !important;
                        text-decoration: none;
                        border-radius: 4px;
                        margin: 20px 0;
                        font-weight: bold;
                    }
                    .alert {
                        background-color: #fff3e0;
                        border-left: 4px solid #ff9800;
                        padding: 12px;
                        margin: 20px 0;
                        border-radius: 4px;
                    }
                    .warning {
                        background-color: #ffebee;
                        border-left: 4px solid #f44336;
                        padding: 12px;
                        margin: 20px 0;
                        border-radius: 4px;
                    }
                    .success {
                        background-color: #e8f5e8;
                        border-left: 4px solid #4CAF50;
                        padding: 12px;
                        margin: 20px 0;
                        border-radius: 4px;
                    }
                    .info {
                        background-color: #e3f2fd;
                        border-left: 4px solid #2196F3;
                        padding: 12px;
                        margin: 20px 0;
                        border-radius: 4px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>SmartPark</h1>
                        <p>Intelligent Parking Solutions</p>
                    </div>
                    <div class="content">
                        <h2>${title}</h2>
                        <div>${content}</div>
                        ${buttonText && buttonLink ? `
                            <div style="text-align: center;">
                                <a href="${buttonLink}" class="button">${buttonText}</a>
                            </div>
                        ` : ''}
                    </div>
                    <div class="footer">
                        <p>&copy; ${new Date().getFullYear()} SmartPark. All rights reserved.</p>
                        <p>This is an automated message, please do not reply.</p>
                        <p style="font-size: 11px;">If you didn't request this notification, please ignore this email.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    async sendEmail(to, subject, text, html = null) {
        try {
            const ready = await this.ensureReady();
            if (!ready) {
                console.log('⚠️ Email service not initialized');
                return false;
            }

            const mailOptions = {
                from: `"SmartPark" <${process.env.EMAIL_USER || 'noreply@smartpark.com'}>`,
                to,
                subject,
                text,
                html: html || this.generateEmailTemplate(subject, text, null, null)
            };

            const info = await this.transporter.sendMail(mailOptions);
            
            // Log preview URL for ethereal
            if (info.messageId && info.previewUrl) {
                console.log(`📧 Email preview: ${info.previewUrl}`);
            }
            
            console.log(`📧 Email sent to ${to}: ${subject}`);
            return true;
        } catch (error) {
            console.error('❌ Email sending failed:', error.message);
            return false;
        }
    }

    async sendParkingAlert(to, userName, spotNumber, status) {
        const messages = {
            available: {
                subject: `Parking Spot #${spotNumber} is Now Available!`,
                text: `Hello ${userName},\n\nGood news! Parking spot #${spotNumber} is now available. Book it now before it's taken!\n\n- SmartPark Team`,
                alertClass: 'success'
            },
            occupied: {
                subject: `Parking Spot #${spotNumber} Has Been Occupied`,
                text: `Hello ${userName},\n\nParking spot #${spotNumber} has been occupied. You can check other available spots on the map.\n\n- SmartPark Team`,
                alertClass: 'info'
            }
        };

        const message = messages[status] || messages.available;
        
        const html = `
            <div class="${message.alertClass}">
                <strong>Parking Update</strong><br>
                Spot #${spotNumber} is now <strong>${status}</strong>
            </div>
            <p>Visit the SmartPark dashboard to view all available spots.</p>
        `;

        return await this.sendEmail(to, message.subject, message.text, 
            this.generateEmailTemplate(message.subject, html, 'View Parking', `${process.env.FRONTEND_URL}/parking`)
        );
    }

    async sendBookingReminder(to, userName, spotNumber, startTime, duration) {
        const startDate = new Date(startTime);
        const formattedTime = startDate.toLocaleString();
        
        const subject = `Reminder: Parking at Spot #${spotNumber}`;
        const text = `Hello ${userName},\n\nThis is a reminder that your parking reservation at spot #${spotNumber} starts at ${formattedTime} for ${duration} minutes.\n\nPlease arrive on time to secure your spot.\n\n- SmartPark Team`;
        
        const html = `
            <div class="info">
                <strong>Upcoming Parking Reservation</strong><br>
                Spot #${spotNumber}<br>
                Time: ${formattedTime}<br>
                Duration: ${duration} minutes
            </div>
            <p>Please arrive on time to secure your spot. You can view your QR code in the app.</p>
        `;
        
        return await this.sendEmail(to, subject, text,
            this.generateEmailTemplate(subject, html, 'View Reservation', `${process.env.FRONTEND_URL}/reservations`)
        );
    }

    async sendPaymentConfirmation(to, userName, amount, spotNumber, duration, receiptNumber) {
        const subject = `Payment Confirmed - Receipt #${receiptNumber}`;
        const text = `Hello ${userName},\n\nYour payment of $${amount} for parking at spot #${spotNumber} (${duration} minutes) has been confirmed.\n\nReceipt Number: ${receiptNumber}\n\nThank you for using SmartPark!`;
        
        const html = `
            <div class="success">
                <strong>Payment Successful!</strong><br>
                Amount: $${amount}<br>
                Spot: #${spotNumber}<br>
                Duration: ${duration} minutes<br>
                Receipt: ${receiptNumber}
            </div>
            <p>Your parking QR code is ready. Use it to enter the parking facility.</p>
        `;
        
        return await this.sendEmail(to, subject, text,
            this.generateEmailTemplate(subject, html, 'View QR Code', `${process.env.FRONTEND_URL}/reservations`)
        );
    }

    async sendExpiryWarning(to, userName, spotNumber, expiryTime) {
        const expiryDate = new Date(expiryTime);
        const formattedExpiry = expiryDate.toLocaleString();
        
        const subject = `⚠️ Parking Session Expiring Soon - Spot #${spotNumber}`;
        const text = `Hello ${userName},\n\nYour parking session at spot #${spotNumber} expires at ${formattedExpiry}. Please extend your booking or move your vehicle to avoid additional charges.\n\n- SmartPark Team`;
        
        const html = `
            <div class="warning">
                <strong>⚠️ Parking Session Expiring</strong><br>
                Spot #${spotNumber}<br>
                Expires at: ${formattedExpiry}
            </div>
            <p>Please extend your booking or move your vehicle to avoid additional charges.</p>
        `;
        
        return await this.sendEmail(to, subject, text,
            this.generateEmailTemplate(subject, html, 'Extend Booking', `${process.env.FRONTEND_URL}/reservations`)
        );
    }

    async sendOverstayNotification(to, userName, spotNumber, overstayMinutes, additionalCharge) {
        const subject = `Overstay Alert - Spot #${spotNumber}`;
        const text = `Hello ${userName},\n\nYour vehicle has overstayed at spot #${spotNumber} by ${overstayMinutes} minutes. Additional charges of $${additionalCharge} will be applied.\n\nPlease check your booking status.\n\n- SmartPark Team`;
        
        const html = `
            <div class="warning">
                <strong>⚠️ Overstay Alert</strong><br>
                Spot #${spotNumber}<br>
                Overstay: ${overstayMinutes} minutes<br>
                Additional Charge: $${additionalCharge}
            </div>
            <p>Please settle the additional charges to avoid further penalties.</p>
        `;
        
        return await this.sendEmail(to, subject, text,
            this.generateEmailTemplate(subject, html, 'View Details', `${process.env.FRONTEND_URL}/reservations`)
        );
    }

    async sendNoShowNotification(to, userName, spotNumber, date) {
        const formattedDate = new Date(date).toLocaleString();
        
        const subject = `No-Show Notice - Spot #${spotNumber}`;
        const text = `Hello ${userName},\n\nYou did not check in for your reservation at spot #${spotNumber} scheduled for ${formattedDate}. This spot has been released for other users.\n\nPlease make sure to cancel reservations you cannot make.\n\n- SmartPark Team`;
        
        const html = `
            <div class="alert">
                <strong>No-Show Notice</strong><br>
                Spot #${spotNumber}<br>
                Scheduled: ${formattedDate}
            </div>
            <p>This spot has been released for other users. Please cancel reservations you cannot make in the future.</p>
        `;
        
        return await this.sendEmail(to, subject, text,
            this.generateEmailTemplate(subject, html, 'View My Reservations', `${process.env.FRONTEND_URL}/reservations`)
        );
    }

    async sendReallocationNotification(to, userName, oldSpot, newSpot) {
        const subject = `Your Parking Spot Has Been Reallocated`;
        const text = `Hello ${userName},\n\nYour parking has been reallocated from spot #${oldSpot} to spot #${newSpot} due to maintenance or operational requirements.\n\nPlease use the new spot for your parking.\n\n- SmartPark Team`;
        
        const html = `
            <div class="info">
                <strong>Spot Reallocation</strong><br>
                Old Spot: #${oldSpot}<br>
                New Spot: #${newSpot}
            </div>
            <p>Please use the new spot for your parking. Your QR code has been updated.</p>
        `;
        
        return await this.sendEmail(to, subject, text,
            this.generateEmailTemplate(subject, html, 'View New QR Code', `${process.env.FRONTEND_URL}/reservations`)
        );
    }

    async sendPromotionalOffer(to, userName, discount, code, expiryDate) {
        const formattedExpiry = new Date(expiryDate).toLocaleDateString();
        
        const subject = `🎉 Special Offer: ${discount}% Off Your Next Parking!`;
        const text = `Hello ${userName},\n\nEnjoy ${discount}% off on your next parking with code: ${code}\n\nOffer expires: ${formattedExpiry}\n\nBook now and save!\n\n- SmartPark Team`;
        
        const html = `
            <div class="success">
                <strong>🎉 Special Offer Just for You!</strong><br>
                ${discount}% OFF your next parking<br>
                Code: <strong style="font-size: 20px;">${code}</strong><br>
                Expires: ${formattedExpiry}
            </div>
            <p>Book your parking now and enjoy the savings!</p>
        `;
        
        return await this.sendEmail(to, subject, text,
            this.generateEmailTemplate(subject, html, 'Book Now', `${process.env.FRONTEND_URL}/parking`)
        );
    }
}

module.exports = new EmailService();