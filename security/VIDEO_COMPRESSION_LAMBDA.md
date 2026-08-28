# Video ad compression pipeline — DONE (2026-08-28)

A new piece of infrastructure outside the app's own EC2 pair, added to let exhibitors upload video ads up to 200MB without shipping oversized video to end users — see `server/lambda/video-compress.js`'s header comment for the full technical design.

- **Trigger:** S3 `ObjectCreated:Put`/`CompleteMultipartUpload` events on `s3://adma-zw/video-ads/*.mp4` (bucket notification configured on `adma-zw`, filtered to that prefix/suffix so it can't fire on unrelated uploads elsewhere in the bucket)
- **Function:** `adma-video-compress` (Lambda, `af-south-1`, Node.js 20.x, 3008MB memory, 300s timeout, 2048MB ephemeral storage)
- **Layer:** `adma-ffmpeg` — a static `ffmpeg`/`ffprobe` build (johnvansickle.com, the source cited in ffmpeg's own official docs) packaged and published as a custom Lambda Layer, since public prebuilt ffmpeg layers are generally only published in `us-east-1`/similar, not `af-south-1`
- **Execution role:** `adma-lambda-video-ads` — inline policy scoped to `s3:GetObject`/`PutObject`/`DeleteObject`/`ListBucket` on `arn:aws:s3:::adma-zw/video-ads/*` (+ bucket root for `ListBucket`) and CloudWatch Logs, nothing broader
- **Anti-loop guard:** the function overwrites the same S3 key it's triggered from, which is itself a `PutObject` and would otherwise re-trigger the same notification indefinitely — it checks a `processed: true` object-metadata flag via `HeadObject` at the very start and no-ops if already set. Verified: the self-triggered second invocation completes in ~60ms doing nothing.
- **Frontend contract:** `GET /api/upload/video-status?publicUrl=...` polls that same metadata flag (`server/lib/s3.js#getS3ObjectMetadata`) — `VideoUploadOrUrlField.jsx` doesn't treat an upload as finished, and never hands the URL to the caller, until it sees `processed: true`. A video is never shown/saved mid-compression.

## Validated before going live

- [x] Direct `aws lambda invoke` against a real 85MB test video (synthetic, generated with `ffmpeg -f lavfi`) — compressed to ~19.75MB in ~19s, landed under the 20MB target
- [x] Anti-loop guard — re-invoked against the already-processed test object, confirmed ~60ms no-op via the metadata check
- [x] Real end-to-end S3-trigger test (no manual invoke) — uploaded a 63.8MB test video via plain `aws s3 cp`, confirmed the Lambda fired automatically and produced a 19.02MB, correctly-tagged result with zero manual intervention

## Known gaps / not yet done

- No CloudWatch alarm on Lambda errors/throttles — a compression failure currently just leaves the frontend's poll timing out after ~2 minutes with a generic error, not surfaced anywhere for the platform operator to notice
- Layer/function were built and deployed by hand via the AWS CLI, not IaC (Terraform/CDK/CloudFormation) — same gap the rest of this infrastructure has (see `DISASTER_RECOVERY_PLAN.md`); if the Lambda or layer were deleted, rebuilding it means re-reading this doc and `server/lambda/video-compress.js`'s header, not re-running a template
- `MAX_VIDEO_MB`/target-size constants live independently in `VideoUploadOrUrlField.jsx` and `video-compress.js` — noted in both files' comments as needing to stay in sync, but nothing enforces that automatically

---
*Not part of the original 2026-08-04 CAIQ assessment — added afterward as new infrastructure. Documented here for the same reason everything else in `security/` is: so a future CAIQ update or audit has an accurate record of what exists and why.*
