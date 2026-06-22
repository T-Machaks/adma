import { authenticator } from 'otplib';
import QRCode from 'qrcode';

const ISSUER = 'MineCon 2026';

export function generateSecret() {
  return authenticator.generateSecret();
}

export async function generateQrDataUrl(email, secret) {
  const uri = authenticator.keyuri(email, ISSUER, secret);
  return QRCode.toDataURL(uri);
}

export function verifyToken(secret, token) {
  return authenticator.verify({ token, secret });
}
