import nodemailer from "nodemailer";

// Create transporter using MISEDA INSPECT SRL email configuration
const transporter = nodemailer.createTransporter({
  host: process.env.EMAIL_HOST!,
  port: 587, // Try port 587 instead of 465
  secure: false, // STARTTLS instead of SSL
  auth: {
    user: process.env.EMAIL_USER!,
    pass: process.env.EMAIL_PASS!,
  },
  tls: {
    // Do not fail on invalid certs
    rejectUnauthorized: false,
  },
});

// Verify connection configuration
transporter.verify((error: Error | null) => {
  if (error) {
    console.error("❌ Email transporter configuration error:", error);
    console.log(
      "⚠️  Email service will be disabled. Server continues running."
    );
  } else {
    console.log("✅ Email server is ready to send messages");
  }
});

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM!,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      headers: {
        "X-Entity-Ref-ID": `itp-notification-${Date.now()}`,
      },
    };

    const result = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully:", result.messageId);
    return true;
  } catch (error) {
    console.error("❌ Email sending error:", error);
    return false;
  }
};

export const sendVerificationEmail = async (
  email: string,
  name: string,
  verificationToken: string
): Promise<boolean> => {
  const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`;

  const html = `
    <!DOCTYPE html>
    <html lang="ro">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Activare cont ITP NOTIFICATION</title>
      </head>
      <body style="font-family: Arial, sans-serif; background-color: #ffffff; color: #222; line-height: 1.6; padding: 0; margin: 0;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; margin: 0 auto; padding: 24px;">
          <tr>
            <td>
              <p>Salut, ${name},</p>
              <p>Ai solicitat activarea contului în platforma <strong>ITP NOTIFICATION</strong> – sistemul MISEDA INSPECT SRL pentru notificarea expirării ITP.</p>
              <p>Te rugăm să confirmi adresa de email accesând link-ul de mai jos:</p>
              <p><a href="${verificationUrl}" style="color: #0b57d0;">${verificationUrl}</a></p>
              <p>Link-ul este valabil 24 de ore. Dacă nu ai inițiat această cerere, poți ignora e-mailul.</p>
              <p>Mulțumim,<br />Echipa MISEDA INSPECT SRL</p>
              <hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;" />
              <p style="font-size: 12px; color: #666;">Acest mesaj a fost trimis automat de ITP NOTIFICATION.<br />Nu răspunde la acest e-mail. Pentru suport contactează-ne la <a href="mailto:support@misedainspectsrl.ro">support@misedainspectsrl.ro</a>.</p>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const text = `Salut, ${name},

Ai solicitat activarea contului în platforma ITP NOTIFICATION – MISEDA INSPECT SRL.

Confirmă adresa de email accesând link-ul:
${verificationUrl}

Link-ul este valabil 24 de ore. Dacă nu ai inițiat această cerere, ignoră mesajul.

Mulțumim,
Echipa MISEDA INSPECT SRL`;

  return await sendEmail({
    to: email,
    subject: "Activează contul ITP NOTIFICATION",
    html,
    text,
  });
};

export const sendWelcomeEmail = async (
  email: string,
  name: string
): Promise<boolean> => {
  const html = `
    <!DOCTYPE html>
    <html lang="ro">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bun venit la ITP NOTIFICATION</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { padding: 30px 20px; }
            .feature { background: #f9f9f9; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #4CAF50; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; border-top: 1px solid #eee; }
            .logo { font-size: 24px; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🎉 Bun venit la ITP NOTIFICATION!</div>
                <p>MISEDA INSPECT SRL</p>
            </div>
            <div class="content">
                <h2>Felicitări, ${name}!</h2>
                <p>Contul dumneavoastră a fost activat cu succes. Acum puteți beneficia de toate serviciile noastre:</p>
                
                <div class="feature">
                    <strong>📅 Notificări ITP</strong><br>
                    Primiți notificări automate pentru expirarea ITP-ului vehiculului.
                </div>
                
                <div class="feature">
                    <strong>🚗 Gestionare vehicule</strong><br>
                    Adăugați și gestionați informațiile vehiculelor dumneavoastră.
                </div>
                
                <div class="feature">
                    <strong>📱 Alertele personalizate</strong><br>
                    Configurați alertele prin email sau SMS după preferințele dumneavoastră.
                </div>
                
                <p>Pentru orice întrebări sau asistență, nu ezitați să ne contactați.</p>
            </div>
            <div class="footer">
                <p><strong>MISEDA INSPECT SRL</strong><br>
                Servicii de inspecție tehnică periodikă<br>
                Email: noreply@misedainspectsrl.ro<br>
                Web: https://misedainspectsrl.ro</p>
            </div>
        </div>
    </body>
    </html>
  `;

  const text = `
    Felicitări, ${name}!
    
    Contul dumneavoastră ITP NOTIFICATION a fost activat cu succes.
    
    Serviciile disponibile:
    - Notificări ITP automate
    - Gestionare vehicule
    - Alerte personalizate prin email sau SMS
    
    MISEDA INSPECT SRL
    Email: noreply@misedainspectsrl.ro
    Web: https://misedainspectsrl.ro
  `;

  return await sendEmail({
    to: email,
    subject: "🎉 Bun venit la ITP NOTIFICATION - Contul activat!",
    html,
    text,
  });
};

export default transporter;