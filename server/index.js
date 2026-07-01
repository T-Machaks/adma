import 'dotenv/config';
import express from 'express';
import exhibitors from './routes/exhibitors.js';
import users from './routes/users.js';
import registrations from './routes/registrations.js';
import announcements from './routes/announcements.js';
import meetingRequests from './routes/meeting-requests.js';
import sponsors from './routes/sponsors.js';
import virtualEnquiries from './routes/virtual-enquiries.js';
import engagements from './routes/engagements.js';
import attendeeNotes from './routes/attendee-notes.js';
import adslots from './routes/adslots.js';
import appSettings from './routes/app-settings.js';
import upload from './routes/upload.js';
import guidePages from './routes/guide-pages.js';
import magazinePages from './routes/magazine-pages.js';
import chat from './routes/chat.js';
import auth from './routes/auth.js';
import exhibitorApplications from './routes/exhibitor-applications.js';
import notifications from './routes/notifications.js';
import sessions from './routes/sessions.js';

const app = express();
app.use(express.json({ limit: '2mb' }));

app.use('/api/exhibitors',        exhibitors);
app.use('/api/users',             users);
app.use('/api/registrations',     registrations);
app.use('/api/announcements',     announcements);
app.use('/api/meeting-requests',  meetingRequests);
app.use('/api/sponsors',          sponsors);
app.use('/api/virtual-enquiries', virtualEnquiries);
app.use('/api/engagements',       engagements);
app.use('/api/attendee-notes',    attendeeNotes);
app.use('/api/adslots',           adslots);
app.use('/api/app-settings',      appSettings);
app.use('/api/upload',            upload);
app.use('/api/guide-pages',       guidePages);
app.use('/api/magazine-pages',    magazinePages);
app.use('/api/chat',              chat);
app.use('/api/auth',                    auth);
app.use('/api/exhibitor-applications',  exhibitorApplications);
app.use('/api/notifications',           notifications);
app.use('/api/sessions',               sessions);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

const PORT = 3001;
app.listen(PORT, '127.0.0.1', () => {
  console.log(`ADMA Agri Show API running on http://127.0.0.1:${PORT}`);
});
