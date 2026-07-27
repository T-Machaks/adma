import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { attachUser } from './lib/authMiddleware.js';
import exhibitors from './routes/exhibitors.js';
import users from './routes/users.js';
import registrations from './routes/registrations.js';
import announcements from './routes/announcements.js';
import meetingRequests from './routes/meeting-requests.js';
import partners from './routes/partners.js';
import virtualEnquiries from './routes/virtual-enquiries.js';
import engagements from './routes/engagements.js';
import attendeeNotes from './routes/attendee-notes.js';
import adslots from './routes/adslots.js';
import appSettings from './routes/app-settings.js';
import upload from './routes/upload.js';
import guidePages from './routes/guide-pages.js';
import magazinePages from './routes/magazine-pages.js';
import eventInfo from './routes/event-info.js';
import scheduleContent from './routes/schedule-content.js';
import chat from './routes/chat.js';
import auth from './routes/auth.js';
import exhibitorApplications from './routes/exhibitor-applications.js';
import notifications from './routes/notifications.js';
import sessions from './routes/sessions.js';
import boothMessages from './routes/booth-messages.js';
import jobListings from './routes/job-listings.js';
import jobApplications from './routes/job-applications.js';
import tenderListings from './routes/tender-listings.js';
import auctions from './routes/auctions.js';
import lots from './routes/lots.js';
import bids from './routes/bids.js';
import collaborations from './routes/collaborations.js';
import cspReport from './routes/csp-report.js';

const app = express();

// nginx is the only reverse proxy in front of this app (single hop, same host) — trust
// its X-Forwarded-For so rate limiting and IP logging see real client IPs, not just
// nginx's own loopback address for every request.
app.set('trust proxy', 1);

const ALLOWED_ORIGINS = [
  'https://admadigital.co.zw',
  'https://www.admadigital.co.zw',
  'https://adma.tyflex.co.zw',
  'http://localhost:5173',
];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(helmet({
  // Cross-origin isolation (COEP) isn't needed (no SharedArrayBuffer usage) and would
  // otherwise silently block loading exhibitor images/video from S3 and the YouTube/
  // Vimeo embeds, since those origins don't send a matching CORP header.
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https://adma-zw.s3.af-south-1.amazonaws.com', 'https://adma.s3.af-south-1.amazonaws.com'],
      mediaSrc: ["'self'", 'https://adma-zw.s3.af-south-1.amazonaws.com', 'https://adma.s3.af-south-1.amazonaws.com'],
      // www.google.com (not just accounts.google.com) hosts the Google Identity Services
      // iframe relay used by the Google login button — confirmed via a real Report-Only
      // violation, not guessed.
      frameSrc: ["'self'", 'https://www.youtube.com', 'https://player.vimeo.com', 'https://accounts.google.com', 'https://www.google.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      // 'unsafe-inline' for styles only — the app uses inline style={{...}} props and a
      // couple of inline <style> blocks (e.g. AdBannerCarousel's keyframes) extensively;
      // removing every one of those is a larger refactor, not part of this hardening pass.
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      scriptSrc: ["'self'", 'https://connect.facebook.net', 'https://accounts.google.com', 'https://apis.google.com'],
      // connect-src governs fetch()/XHR — including the service worker's own runtime-
      // caching fetches (public/sw.js) of S3 images/video and Google Fonts files, which
      // img-src/media-src/font-src DON'T cover (those only gate native <img>/<video>/
      // @font-face loads, not fetch() calls). Confirmed via real Report-Only violations —
      // this omission is the likely root cause of the original CSP rollout breaking
      // images/video.
      connectSrc: [
        "'self'",
        'https://accounts.google.com', 'https://www.googleapis.com',
        'https://login.microsoftonline.com', 'https://graph.microsoft.com',
        'https://graph.facebook.com', 'https://connect.facebook.net',
        'https://adma-zw.s3.af-south-1.amazonaws.com', 'https://adma.s3.af-south-1.amazonaws.com',
        'https://fonts.googleapis.com', 'https://fonts.gstatic.com',
      ],
      frameAncestors: ["'self'"],
    },
  },
}));

// Strict limiter on auth endpoints (login, OTP/TOTP verify, password reset, exhibitor
// login) — blunts brute-force/credential-stuffing on the routes that matter most.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again later.' },
});
app.use('/api/auth/', authLimiter);

// Lighter global limiter on everything else — high enough not to disrupt normal PWA
// polling (the service worker's 60s update check, react-query refetches) but blocks
// scripted abuse.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', globalLimiter);

app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(attachUser);

app.use('/api/exhibitors',        exhibitors);
app.use('/api/users',             users);
app.use('/api/registrations',     registrations);
app.use('/api/announcements',     announcements);
app.use('/api/meeting-requests',  meetingRequests);
app.use('/api/partners',          partners);
app.use('/api/virtual-enquiries', virtualEnquiries);
app.use('/api/engagements',       engagements);
app.use('/api/attendee-notes',    attendeeNotes);
app.use('/api/adslots',           adslots);
app.use('/api/app-settings',      appSettings);
app.use('/api/upload',            upload);
app.use('/api/guide-pages',       guidePages);
app.use('/api/magazine-pages',    magazinePages);
app.use('/api/event-info',        eventInfo);
app.use('/api/schedule-content',  scheduleContent);
app.use('/api/chat',              chat);
app.use('/api/auth',                    auth);
app.use('/api/exhibitor-applications',  exhibitorApplications);
app.use('/api/notifications',           notifications);
app.use('/api/sessions',               sessions);
app.use('/api/booth-messages',         boothMessages);
app.use('/api/job-listings',           jobListings);
app.use('/api/job-applications',       jobApplications);
app.use('/api/tender-listings',        tenderListings);
app.use('/api/auctions',               auctions);
app.use('/api/lots',                   lots);
app.use('/api/bids',                   bids);
app.use('/api/collaborations',         collaborations);
app.use('/api/csp-report',             cspReport);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

const PORT = 3001;
app.listen(PORT, '127.0.0.1', () => {
  console.log(`ADMA Digital API running on http://127.0.0.1:${PORT}`);
});
