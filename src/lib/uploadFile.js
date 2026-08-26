// Plain fetch() has no way to report upload progress (only download progress, via the
// response body stream) — XMLHttpRequest's upload.onprogress is the only browser-native
// way to get a real percentage for a PUT of a large file, so every direct-to-S3 upload
// across the app funnels through here instead of using fetch() directly.
//
// Resolves once S3 returns a 2xx; rejects with an Error carrying a message consistent
// with the old `fetch()` call sites' `S3 upload failed: ${status}` text, so existing
// catch/setError blocks don't need to change.
export function uploadFileToS3(uploadUrl, fileOrBlob, { contentType, onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    if (contentType) xhr.setRequestHeader('Content-Type', contentType);
    xhr.upload.onprogress = (e) => {
      if (onProgress && e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`S3 upload failed: ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error('S3 upload failed: network error'));
    xhr.send(fileOrBlob);
  });
}
