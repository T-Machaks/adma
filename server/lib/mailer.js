// Microsoft Graph API mailer — sends email as NoReply@tyflex.co.zw
// Uses client-credentials OAuth flow (no SMTP, no basic auth required)
//
// Required env vars:
//   MAILER_TENANT_ID     — Azure AD tenant ID
//   MAILER_CLIENT_ID     — App registration Application (client) ID
//   MAILER_CLIENT_SECRET — App registration client secret value
//   MAILER_USER          — Mailbox to send from (NoReply@tyflex.co.zw)

const TENANT_ID     = process.env.MAILER_TENANT_ID;
const CLIENT_ID     = process.env.MAILER_CLIENT_ID;
const CLIENT_SECRET = process.env.MAILER_CLIENT_SECRET;
const SENDER        = process.env.MAILER_USER;

async function getToken() {
  const res = await fetch(
    `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'client_credentials',
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope:         'https://graph.microsoft.com/.default',
      }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(`Token error: ${data.error_description || data.error}`);
  return data.access_token;
}

export async function sendOtpEmail(toEmail, otp, override = null) {
  if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET || !SENDER) {
    throw new Error('Mailer not configured — set MAILER_TENANT_ID, MAILER_CLIENT_ID, MAILER_CLIENT_SECRET, MAILER_USER in server/.env');
  }

  const token = await getToken();

  const subject = override?.subject ?? 'Your MineCon verification code';
  const html    = override?.html ?? `
              <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
                <h2 style="margin:0 0 8px;color:#111">MineCon 2026</h2>
                <p style="margin:0 0 24px;color:#555">Use the code below to complete your login.</p>
                <div style="font-size:36px;font-weight:700;letter-spacing:0.15em;text-align:center;
                            padding:24px;background:#f4f4f5;border-radius:8px;color:#111">
                  ${otp}
                </div>
                <p style="margin:24px 0 0;font-size:13px;color:#888">
                  Expires in 10 minutes. If you didn't request this, you can safely ignore this email.
                </p>
              </div>
            `;

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(SENDER)}/sendMail`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          subject,
          body: { contentType: 'HTML', content: html },
          toRecipients: [{ emailAddress: { address: toEmail } }],
        },
        saveToSentItems: false,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Graph API error ${res.status}: ${err?.error?.message || res.statusText}`);
  }
}
