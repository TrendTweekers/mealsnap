# MealSnap Security Documentation

## Overview
This document outlines the security measures implemented in MealSnap.

## Security Features

### 1. Admin Authentication
- **Password Protection**: Admin pages (`/admin` and `/admin/waitlist`) are protected with password authentication
- **HTTP-only Cookies**: Admin session tokens are stored in HTTP-only cookies (not accessible via JavaScript)
- **Secure Cookies**: Cookies are marked as `secure` in production (HTTPS only)
- **Session Expiration**: Admin sessions expire after 24 hours
- **Environment Variable**: Password is stored in `ADMIN_PASSWORD` environment variable

**To set admin password:**
```bash
# In Vercel dashboard or .env.local
ADMIN_PASSWORD=your_secure_password_here
```

**Default password** (if not set): `mealsnap2024` - **CHANGE THIS IN PRODUCTION!**

### 2. API Route Protection

#### Admin Routes
- `/api/admin/waitlist` - Protected with cookie-based authentication
- `/api/admin/ingredients` - Protected with cookie-based authentication
- `/api/admin/auth` - Handles login/logout/check authentication

#### Public Routes
- `/api/scan-pantry` - Public (requires valid image)
- `/api/generate-recipes` - Public (requires valid ingredients)
- `/api/save-email` - Public (rate limited by input validation)
- `/api/track-ingredient` - Public (rate limited by input validation)

### 3. Input Validation & Sanitization

#### Image Upload (`/api/scan-pantry`)
- ✅ Request body size limit: **10MB**
- ✅ Base64 string length validation
- ✅ Image data size validation (100 bytes - 14MB)
- ✅ Type validation (must be string)

#### Recipe Generation (`/api/generate-recipes`)
- ✅ Request body size limit: **1MB**
- ✅ Array validation (must be array)
- ✅ Ingredient count limit: **100 max**
- ✅ Ingredient length limit: **100 characters max**
- ✅ Type validation for each ingredient

#### Email Capture (`/api/save-email`)
- ✅ Request body size limit: **10KB**
- ✅ Email format validation (regex)
- ✅ Email length limit: **254 characters max**
- ✅ Source validation: **50 characters max**
- ✅ User ID validation: **200 characters max**

#### Ingredient Tracking (`/api/track-ingredient`)
- ✅ Request body size limit: **10KB**
- ✅ Ingredient length limit: **100 characters max**
- ✅ Character sanitization (only letters, numbers, spaces, hyphens, apostrophes)
- ✅ User ID validation: **200 characters max**

### 4. Environment Variables Security

**Required:**
- `OPENAI_API_KEY` - For AI processing (never exposed to client)

**Optional:**
- `ADMIN_PASSWORD` - For admin authentication (default: `mealsnap2024`)
- `KV_REST_API_URL` - Vercel KV/Upstash URL
- `KV_REST_API_TOKEN` - Vercel KV/Upstash token
- `QSTASH_URL` - QStash URL (for background jobs)
- `QSTASH_TOKEN` - QStash authentication token

**⚠️ IMPORTANT:** Never commit `.env.local` to git. All environment variables should be set in Vercel dashboard for production.

### 5. API Key Security

- ✅ API keys are stored server-side only (never exposed to client)
- ✅ API keys are validated before use
- ✅ Graceful error handling if keys are missing

### 6. Rate Limiting Considerations

Currently, rate limiting is handled through:
- Input validation (size limits)
- Client-side image compression
- Request body size limits

**Recommended for production:**
- Add Vercel Edge Config rate limiting
- Add IP-based rate limiting for API routes
- Add per-user rate limiting using KV storage

### 7. CORS Configuration

- No explicit CORS headers set (Next.js defaults)
- API routes accept requests from any origin (appropriate for public API)
- Consider adding origin validation if needed

### 8. Data Storage Security

- ✅ Vercel KV (Upstash Redis) - Server-side only, encrypted at rest
- ✅ Email data expires after 1 year
- ✅ Ingredient tracking records expire after 90 days
- ✅ No sensitive data in localStorage (only user preferences)

### 9. Client-Side Security

- ✅ Image compression client-side (reduces attack surface)
- ✅ Input sanitization on frontend
- ✅ No API keys exposed in client code
- ✅ Environment variables prefixed with `NEXT_PUBLIC_` only for safe values

### 10. Security Headers

Consider adding these headers in `next.config.mjs` for production:
```js
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        {
          key: 'X-XSS-Protection',
          value: '1; mode=block',
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
      ],
    },
  ]
}
```

## Known Security Considerations

1. **Admin Password**: Uses simple password comparison (not hashed). For production, consider:
   - Using bcrypt or similar for password hashing
   - Implementing multi-factor authentication
   - Using a proper authentication service (Auth0, Clerk, etc.)

2. **Rate Limiting**: Currently limited by input validation. Consider implementing:
   - Per-IP rate limiting
   - Per-user rate limiting
   - Time-based rate limiting

3. **API Abuse**: No protection against:
   - Rapid repeated requests
   - Distributed denial of service (DDoS)
   - Bot traffic

4. **SQL Injection**: Not applicable (using KV storage, not SQL)

5. **XSS Protection**: 
   - ✅ React automatically escapes content
   - ✅ Input validation prevents malicious strings
   - Consider adding Content Security Policy (CSP) headers

## Recommended Security Improvements

1. ✅ **Implemented**: Admin password protection
2. ✅ **Implemented**: Input validation and size limits
3. ⚠️ **Recommended**: Add rate limiting middleware
4. ⚠️ **Recommended**: Add security headers
5. ⚠️ **Recommended**: Implement proper password hashing
6. ⚠️ **Recommended**: Add monitoring/alerting for suspicious activity
7. ⚠️ **Recommended**: Regular security audits
8. ⚠️ **Recommended**: Add CAPTCHA for public forms if abuse occurs

## Reporting Security Issues

If you discover a security vulnerability, please:
1. Do NOT create a public GitHub issue
2. Email: [your-security-email@example.com]
3. Include details about the vulnerability
4. Allow time for the issue to be addressed before disclosure

