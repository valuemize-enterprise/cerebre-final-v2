# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| 1.x     | ✓         |

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Email your report to: **security@cerebre.media**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fix (optional)

We will acknowledge your report within 48 hours and aim to release a fix within 14 days for critical issues.

## Scope

In scope:
- Authentication and authorisation bypass
- SQL injection or data exfiltration
- File upload vulnerabilities
- Sensitive data exposure (API keys, user data)
- JWT vulnerabilities

Out of scope:
- Rate limiting thresholds
- Denial of service via legitimate API usage
- Issues in dependencies without a clear exploit path

## Security measures in this project

- Passwords hashed with bcrypt (cost factor 12)
- JWT tokens expire after 7 days; stored in `httpOnly`-equivalent cookie for middleware
- Per-user Redis rate limiting on AI and upload endpoints
- File type and size validation before S3 upload
- All database queries use parameterised statements (no string interpolation)
- `helmet()` sets security headers on all responses
- CORS restricted to configured `FRONTEND_URL`
- Admin routes protected by role check middleware
- `validate-env.js` prevents startup with missing secrets
