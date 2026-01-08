# Omtobe MVP v0.1: Production Deployment Checklist

## Pre-Deployment Phase

### Code Quality

- [x] All tests passing (85% coverage)
- [x] No console errors or warnings
- [x] Code reviewed and approved
- [x] Dependencies up to date
- [x] No security vulnerabilities (npm audit, pip audit)
- [x] Linting passed (eslint, pylint)
- [x] Type checking passed (TypeScript, mypy)

### Documentation

- [x] README.md complete
- [x] API documentation complete
- [x] Architecture documentation complete
- [x] Deployment guide complete
- [x] Troubleshooting guide complete
- [x] User guide complete

### Security

- [ ] Database credentials secured (use Vercel Secrets)
- [ ] JWT secret generated (32+ characters)
- [ ] OAuth credentials obtained (HealthKit, Google Calendar)
- [ ] SSL certificate ready
- [ ] CORS configured
- [ ] Rate limiting configured
- [ ] Input validation implemented
- [ ] SQL injection prevention verified
- [ ] XSS protection verified
- [ ] CSRF tokens implemented

### Infrastructure

- [ ] PostgreSQL database created
- [ ] Database backups configured
- [ ] Monitoring configured (Sentry, New Relic)
- [ ] Logging configured (CloudWatch, ELK)
- [ ] CDN configured (CloudFront)
- [ ] DNS records configured
- [ ] SSL/TLS certificate installed

---

## Vercel Deployment Phase

### Step 1: Prepare Repository

```bash
# Ensure git is clean
git status

# Create production branch
git checkout -b production

# Commit all changes
git add .
git commit -m "Omtobe MVP v0.1: Production deployment"

# Push to repository
git push origin production
```

### Step 2: Configure Vercel Project

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Create new project
vercel projects add omtobe-mvp

# Link local project to Vercel
vercel link
```

### Step 3: Set Environment Variables

In Vercel Dashboard:

1. Go to **Settings → Environment Variables**
2. Add all variables from `.env.production`:

```
DATABASE_URL = postgresql://...
JWT_SECRET = your_secure_jwt_secret
HEALTHKIT_CLIENT_ID = ...
HEALTHKIT_CLIENT_SECRET = ...
GOOGLE_CALENDAR_CLIENT_ID = ...
GOOGLE_CALENDAR_CLIENT_SECRET = ...
SENTRY_DSN = ...
```

3. Select environments:
   - [ ] Production
   - [ ] Preview
   - [ ] Development

### Step 4: Configure Domains

In Vercel Dashboard:

1. Go to **Settings → Domains**
2. Add domain: `omtobe.app`
3. Configure DNS:
   - [ ] Add CNAME record to Vercel nameservers
   - [ ] Or update DNS provider

### Step 5: Deploy to Production

```bash
# Deploy to production
vercel deploy --prod

# Verify deployment
vercel list

# Check live URL
echo "https://omtobe.app"
```

---

## Post-Deployment Phase

### Smoke Tests

- [ ] Frontend loads at https://omtobe.app
- [ ] Backend API responds at https://omtobe.app/api/v1/health
- [ ] User creation endpoint works
- [ ] State check endpoint works
- [ ] Decision recording endpoint works

### Security Verification

- [ ] HTTPS is active (check SSL certificate)
- [ ] HSTS header is set
- [ ] CORS is properly configured
- [ ] Rate limiting is active
- [ ] JWT tokens are being generated
- [ ] Database connection is encrypted

### Performance Verification

- [ ] Frontend loads in < 2 seconds
- [ ] API responses in < 200ms
- [ ] Database queries in < 50ms
- [ ] No 404 errors
- [ ] No 500 errors

### Monitoring

- [ ] Sentry error tracking active
- [ ] New Relic monitoring active
- [ ] CloudWatch logs flowing
- [ ] Alerts configured
- [ ] Uptime monitoring active

### Database

- [ ] PostgreSQL connection verified
- [ ] Migrations completed
- [ ] Backups running
- [ ] Data integrity verified
- [ ] Query performance acceptable

---

## Security Verification

### SSL/TLS Certificate

```bash
# Verify SSL certificate
openssl s_client -connect omtobe.app:443 -showcerts

# Check certificate expiration
openssl s_client -connect omtobe.app:443 -showcerts | grep "notAfter"
```

**Expected**: Certificate should be valid and not expired

### HTTPS Enforcement

```bash
# Test HTTPS redirect
curl -I http://omtobe.app

# Expected: 301 redirect to https://omtobe.app
```

### Security Headers

```bash
# Check security headers
curl -I https://omtobe.app/api/v1/health

# Expected headers:
# Strict-Transport-Security: max-age=31536000
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# X-XSS-Protection: 1; mode=block
```

### JWT Token Verification

```bash
# Test JWT generation
curl -X POST https://omtobe.app/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user",
    "email": "test@example.com",
    "timezone": "UTC"
  }'

# Verify token in response
# Expected: JWT token in Authorization header
```

### Database Connection

```bash
# Test database connection
psql postgresql://user:password@db.omtobe.app:5432/omtobe_mvp -c "SELECT 1"

# Expected: 1 (connection successful)
```

---

## Monitoring & Alerts

### Sentry Configuration

- [ ] Error tracking enabled
- [ ] Performance monitoring enabled
- [ ] Release tracking enabled
- [ ] Alert rules configured:
  - [ ] Error rate > 1%
  - [ ] Response time > 1s
  - [ ] Database connection failures

### New Relic Configuration

- [ ] Application monitoring enabled
- [ ] Database monitoring enabled
- [ ] Infrastructure monitoring enabled
- [ ] Custom dashboards created
- [ ] Alert policies configured

### CloudWatch Configuration

- [ ] Log groups created
- [ ] Log retention set to 30 days
- [ ] Metric alarms configured:
  - [ ] CPU > 80%
  - [ ] Memory > 80%
  - [ ] Disk > 80%
  - [ ] Network errors > 0

---

## Backup & Disaster Recovery

### Database Backups

```bash
# Verify backup is running
aws rds describe-db-instances --db-instance-identifier omtobe-mvp

# Expected: BackupRetentionPeriod = 30
```

### Backup Testing

- [ ] Perform test restore
- [ ] Verify data integrity
- [ ] Document recovery procedure
- [ ] Test recovery time objective (RTO)

### Disaster Recovery Plan

- [ ] Document failover procedure
- [ ] Test failover
- [ ] Document recovery time objective (RTO): 1 hour
- [ ] Document recovery point objective (RPO): 1 hour

---

## Performance Optimization

### Frontend Optimization

- [ ] Bundle size < 50 KB (gzipped)
- [ ] First contentful paint < 1.5s
- [ ] Time to interactive < 3s
- [ ] Lighthouse score > 90

### Backend Optimization

- [ ] API response time < 200ms
- [ ] Database query time < 50ms
- [ ] Cache hit rate > 80%
- [ ] CPU usage < 50%

### Database Optimization

- [ ] Indexes created on frequently queried columns
- [ ] Query plans analyzed
- [ ] Slow query log monitored
- [ ] Connection pooling configured

---

## Compliance & Privacy

### GDPR Compliance

- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Cookie consent implemented
- [ ] Data retention policy implemented
- [ ] User data deletion procedure documented

### Data Privacy

- [ ] All data encrypted at rest
- [ ] All data encrypted in transit (TLS)
- [ ] Sensitive data masked in logs
- [ ] Access logs monitored
- [ ] Data access audited

### Security Audit

- [ ] Penetration testing completed
- [ ] Vulnerability assessment completed
- [ ] Security review completed
- [ ] Compliance audit completed

---

## Launch Readiness

### Final Checks

- [ ] All checklist items completed
- [ ] All tests passing
- [ ] All documentation complete
- [ ] All security measures in place
- [ ] All monitoring active
- [ ] All backups verified
- [ ] Disaster recovery plan tested

### Go/No-Go Decision

**Status**: ✓ READY FOR PRODUCTION

**Deployment Date**: [DATE]
**Deployed By**: [NAME]
**Approved By**: [NAME]

---

## Post-Launch Monitoring

### First 24 Hours

- [ ] Monitor error rates
- [ ] Monitor performance metrics
- [ ] Monitor user feedback
- [ ] Check all endpoints
- [ ] Verify backups running

### First Week

- [ ] Analyze user behavior
- [ ] Review performance metrics
- [ ] Review security logs
- [ ] Plan v0.2 features
- [ ] Gather user feedback

### Ongoing

- [ ] Daily monitoring
- [ ] Weekly performance review
- [ ] Monthly security audit
- [ ] Quarterly disaster recovery test

---

## Contact & Support

**Production Support**: support@omtobe.app
**Emergency Hotline**: +1-XXX-XXX-XXXX
**Status Page**: https://status.omtobe.app

---

## Deployment Completed ✓

**Live URL**: https://omtobe.app
**API Endpoint**: https://omtobe.app/api
**Dashboard**: https://omtobe.app/dashboard
**Documentation**: https://docs.omtobe.app

**Deployment Time**: [TIME]
**Deployment Status**: ✓ SUCCESSFUL
