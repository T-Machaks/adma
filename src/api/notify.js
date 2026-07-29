// Fire-and-forget notification helpers — never throw, never block UI
async function post(path, body) {
  return fetch(`/api/notifications/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => {});
}

export function notifyMeeting(meeting, action) {
  post('meeting', { meeting, action });
}

export function notifyAnnouncement(announcement) {
  post('announcement', { announcement });
}

export function notifyEnquiry(enquiry) {
  post('enquiry', { enquiry });
}

export function notifyEnquiryReply(enquiry, reply, exhibitorName) {
  post('enquiry-reply', { enquiry, reply, exhibitorName });
}

export function notifyJobApplication(application) {
  post('job-application', { application });
}
