'use strict';

// S3-triggered video compressor for exhibitor-uploaded ad videos. Deployed as its
// own standalone Lambda (adma-video-compress), separate from the app server, so
// this heavy/CPU-bound encoding work never runs on the small EC2 instances.
//
// Flow: client uploads the original video straight to its final public S3 key
// (server/routes/upload.js's existing video-ad-url presign, unchanged key
// convention) via the usual presigned-PUT. An S3 PutObject event on the
// video-ads/ prefix triggers this function, which re-encodes the file IN PLACE
// (same key) down to under MAX_VIDEO_BYTES if it's over, then tags the object
// with `processed: true` metadata. The frontend polls /api/upload/video-status
// (a HeadObject check for that flag) and only treats the upload as done once
// it sees it — so nothing ever shows/saves a URL pointing at a not-yet-compressed
// or still-huge original.
//
// Anti-loop guard: this function overwrites the same key S3 notified it about,
// which is itself a PutObject and would re-trigger the same notification. The
// `processed` metadata check at the top of processOne is what breaks that loop —
// the second (self-triggered) invocation sees the flag and no-ops immediately.

const { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { spawnSync } = require('child_process');
const fs = require('fs');
const { pipeline } = require('stream/promises');

const s3 = new S3Client({});
const BUCKET = 'adma-zw';
// Must match VideoUploadOrUrlField.jsx's MAX_VIDEO_MB — that's the ceiling this
// function is compressing down to, not an independent number.
const TARGET_BYTES = 20 * 1024 * 1024;
const FFMPEG = '/opt/bin/ffmpeg';
const FFPROBE = '/opt/bin/ffprobe';

exports.handler = async (event) => {
  for (const record of event.Records || []) {
    // S3 event keys are URL-encoded with '+' for spaces (not %20).
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
    console.log(`Processing s3://${BUCKET}/${key}`);
    await processOne(key);
  }
};

async function processOne(key) {
  const head = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
  if (head.Metadata && head.Metadata.processed === 'true') {
    console.log(`Already processed, skipping: ${key}`);
    return;
  }

  const localIn = '/tmp/in.mp4';
  const localOut = '/tmp/out.mp4';
  for (const p of [localIn, localOut]) { try { fs.rmSync(p, { force: true }); } catch { /* fine if it wasn't there */ } }

  const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  await pipeline(obj.Body, fs.createWriteStream(localIn));

  const sourceSize = fs.statSync(localIn).size;
  let finalPath = localIn;

  if (sourceSize > TARGET_BYTES) {
    const duration = getDuration(localIn);
    const audioBitrate = 96_000; // bits/sec — fixed, reasonable AAC bitrate regardless of length
    // 97% of the byte budget, leaving headroom for MP4 container/muxing overhead
    // so the encoded output doesn't land just over TARGET_BYTES.
    const targetTotalBits = TARGET_BYTES * 8 * 0.97;
    let videoBitrate = Math.floor(targetTotalBits / duration) - audioBitrate;
    // Floor so a very long video doesn't get squeezed into an unwatchable bitrate —
    // it'll end up over budget in that case, which is an honest tradeoff (better
    // than an unusable file) and something worth revisiting if it comes up.
    videoBitrate = Math.max(videoBitrate, 150_000);
    console.log(`Compressing ${key}: duration=${duration.toFixed(1)}s sourceSize=${sourceSize} targetVideoBitrate=${videoBitrate}`);

    const args = [
      '-y', '-i', localIn,
      '-c:v', 'libx264', '-b:v', String(videoBitrate),
      '-maxrate', String(Math.floor(videoBitrate * 1.2)), '-bufsize', String(videoBitrate * 2),
      // Cap width at 1280 (720p-ish), never upscale, preserve aspect ratio —
      // keeps quality reasonable at a low bitrate instead of encoding a huge
      // frame size that just looks worse per-bit.
      '-vf', "scale='min(1280,iw)':-2",
      '-preset', 'medium', '-profile:v', 'main', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', String(audioBitrate),
      '-movflags', '+faststart',
      localOut,
    ];
    const res = spawnSync(FFMPEG, args, { stdio: 'inherit', maxBuffer: 1024 * 1024 * 64 });
    if (res.status !== 0) throw new Error(`ffmpeg exited with status ${res.status}${res.error ? `: ${res.error.message}` : ''}`);
    finalPath = localOut;
  } else {
    console.log(`${key} already under budget (${sourceSize} bytes) — tagging as processed without re-encoding.`);
  }

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: fs.readFileSync(finalPath),
    ContentType: 'video/mp4',
    Metadata: { processed: 'true' },
  }));

  for (const p of [localIn, localOut]) { try { fs.rmSync(p, { force: true }); } catch { /* best-effort cleanup */ } }
}

function getDuration(path) {
  const res = spawnSync(FFPROBE, [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', path,
  ], { encoding: 'utf8' });
  const d = parseFloat(res.stdout.trim());
  if (!d || !isFinite(d) || d <= 0) throw new Error('Could not determine video duration via ffprobe');
  return d;
}
