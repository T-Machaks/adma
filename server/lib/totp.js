import { generateSecret as _generateSecret, generateURI, verify } from 'otplib';
import QRCode from 'qrcode';

const ISSUER = 'ADMA Digital';

export function generateSecret() {
  return _generateSecret();
}

export async function generateQrDataUrl(email, secret) {
  const uri = generateURI({ issuer: ISSUER, label: email, secret, type: 'totp' });
  return QRCode.toDataURL(uri);
}

export async function verifyToken(secret, token) {
  const result = await verify({ token, secret });
  return result.valid;
}
