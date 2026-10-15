# Security and privacy notes

- Passwords are hashed with Argon2. API access tokens are signed, expire after `ACCESS_TOKEN_MINUTES`, and are invalidated on logout by incrementing the user's token version. Register/login are limited per direct client IP in-process; this is a development control and is not distributed across multiple workers.
- The browser keeps its bearer token in `sessionStorage`, not a persistent local-storage key. This avoids retaining it across browser sessions but JavaScript can still read it; an XSS vulnerability could steal it. A production deployment should consider secure, HttpOnly, SameSite cookies with CSRF defenses and HTTPS.
- Every farm, scan, image, notification, and setting is resolved through the authenticated user. Never use an untrusted user ID from a request body to authorize access.
- Uploaded images are format/dimension/size validated, EXIF-oriented, normalized, saved under generated names, and served with private/no-store caching. No private upload path is exposed as a filesystem path.
- CORS origins, secret key, upload limit, model path, and weather key are environment-configured. Never commit `.env`, user images, databases, or weights.
- The development default signing key is not safe for production. Set `APP_ENV=production` and a random `SECRET_KEY` of at least 32 characters. Terminate TLS at a trusted proxy and limit access to uploaded files and database backups.
- In-memory weather caching and authentication rate limits are conveniences, not distributed controls. Production observability is not implemented; deploy behind a rate-limiting gateway before public exposure.
- This is a student/hackathon prototype, not a security-certified system. Review data retention, consent, threat model, backup encryption, and regional privacy obligations before real farmer data is used.
