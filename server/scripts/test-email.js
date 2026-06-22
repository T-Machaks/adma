import 'dotenv/config';
import { sendOtpEmail } from '../lib/mailer.js';

console.log('Sending test OTP email via Microsoft Graph...');
await sendOtpEmail('tmachaks@gmail.com', '847293');
console.log('Done — check tmachaks@gmail.com');
