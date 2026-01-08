# Omtobe MVP v0.1: Deployment Guide

## Pre-Deployment Checklist

- [ ] All tests passing locally
- [ ] Environment variables configured
- [ ] Database migrations completed
- [ ] OAuth credentials obtained (HealthKit, Google Calendar)
- [ ] HTTPS certificate ready
- [ ] Monitoring/logging configured

---

## Environment Variables

### Backend (.env)

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost/omtobe_mvp

# HealthKit OAuth
HEALTHKIT_CLIENT_ID=your_healthkit_client_id
HEALTHKIT_CLIENT_SECRET=your_healthkit_client_secret
HEALTHKIT_REDIRECT_URI=https://your-domain.com/api/v1/auth/healthkit/callback

# Google Calendar OAuth
GOOGLE_CALENDAR_CLIENT_ID=your_google_client_id
GOOGLE_CALENDAR_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALENDAR_REDIRECT_URI=https://your-domain.com/api/v1/auth/google/callback

# JWT
JWT_SECRET=your_jwt_secret_key

# Environment
ENVIRONMENT=production
DEBUG=false
```

### Frontend (.env)

```bash
# API Configuration
VITE_API_BASE_URL=https://your-domain.com/api
VITE_API_TIMEOUT=10000

# Analytics (optional)
VITE_ANALYTICS_ENABLED=true
```

---

## Deployment Options

### Option 1: Vercel (Recommended)

Vercel provides seamless deployment for both frontend and backend with automatic scaling.

#### Step 1: Install Vercel CLI

```bash
npm i -g vercel
```

#### Step 2: Deploy

```bash
cd /path/to/omtobe_mvp
vercel deploy
```

#### Step 3: Configure Environment Variables

In Vercel dashboard:
1. Go to Settings → Environment Variables
2. Add all variables from `.env` file
3. Select which environments they apply to (Production, Preview, Development)

#### Step 4: Configure Domains

In Vercel dashboard:
1. Go to Settings → Domains
2. Add your custom domain or use auto-generated `omtobe.vercel.app`
3. Configure DNS records if using custom domain

#### Step 5: Monitor Deployment

```bash
# View deployment logs
vercel logs

# View live URL
vercel --prod
```

### Option 2: AWS Lambda + RDS

For more control and scalability.

#### Step 1: Create RDS Database

```bash
aws rds create-db-instance \
  --db-instance-identifier omtobe-mvp \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username admin \
  --master-user-password YOUR_PASSWORD \
  --allocated-storage 20
```

#### Step 2: Deploy Backend to Lambda

```bash
# Install serverless framework
npm i -g serverless

# Configure AWS credentials
aws configure

# Deploy
serverless deploy
```

#### Step 3: Deploy Frontend to S3 + CloudFront

```bash
# Build frontend
cd frontend
npm run build

# Upload to S3
aws s3 sync dist s3://omtobe-frontend/

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

### Option 3: Docker + Kubernetes

For enterprise deployments.

#### Step 1: Build Docker Images

```bash
# Backend
docker build -t omtobe-backend:latest ./backend

# Frontend
docker build -t omtobe-frontend:latest ./frontend
```

#### Step 2: Push to Container Registry

```bash
# Docker Hub
docker tag omtobe-backend:latest your-registry/omtobe-backend:latest
docker push your-registry/omtobe-backend:latest

docker tag omtobe-frontend:latest your-registry/omtobe-frontend:latest
docker push your-registry/omtobe-frontend:latest
```

#### Step 3: Deploy to Kubernetes

```bash
# Create namespace
kubectl create namespace omtobe

# Deploy backend
kubectl apply -f k8s/backend-deployment.yaml -n omtobe

# Deploy frontend
kubectl apply -f k8s/frontend-deployment.yaml -n omtobe

# Create ingress
kubectl apply -f k8s/ingress.yaml -n omtobe
```

---

## Database Setup

### PostgreSQL (Production)

```bash
# Create database
createdb omtobe_mvp

# Run migrations
cd backend
alembic upgrade head
```

### SQLite (Development)

```bash
# Automatic: SQLite database created on first run
# Located at: backend/omtobe_mvp.db
```

---

## OAuth Integration

### Apple HealthKit

1. Go to [Apple Developer](https://developer.apple.com)
2. Create new app ID with HealthKit capability
3. Generate OAuth credentials
4. Add redirect URI: `https://your-domain.com/api/v1/auth/healthkit/callback`
5. Add credentials to environment variables

### Google Calendar

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project
3. Enable Google Calendar API
4. Create OAuth 2.0 credentials (Web application)
5. Add redirect URI: `https://your-domain.com/api/v1/auth/google/callback`
6. Add credentials to environment variables

---

## SSL/TLS Certificate

### Using Let's Encrypt (Vercel handles automatically)

If self-hosting:

```bash
# Using Certbot
sudo certbot certonly --standalone -d your-domain.com

# Copy certificates to your server
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem /path/to/certs/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem /path/to/certs/
```

---

## Monitoring & Logging

### Application Monitoring

```bash
# Using Sentry for error tracking
pip install sentry-sdk

# Configure in backend/main.py
import sentry_sdk
sentry_sdk.init(
    dsn="your_sentry_dsn",
    environment="production"
)
```

### Log Aggregation

```bash
# Using CloudWatch (AWS)
# Or ELK Stack (self-hosted)
# Or Datadog
```

### Performance Monitoring

```bash
# Using New Relic
pip install newrelic

# Configure in backend
NEW_RELIC_CONFIG_FILE=newrelic.ini newrelic-admin run-program python -m uvicorn main:app
```

---

## Health Checks

### Backend Health Check

```bash
curl https://your-domain.com/api/v1/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-09T15:30:00Z",
  "version": "0.1.0"
}
```

### Frontend Health Check

```bash
curl https://your-domain.com/
```

Expected: HTML page with Omtobe app

---

## Post-Deployment Testing

### Smoke Tests

```bash
# Test user creation
curl -X POST https://your-domain.com/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"user_id":"test","email":"test@example.com","timezone":"UTC"}'

# Test state check
curl -X POST https://your-domain.com/api/v1/state/check \
  -H "Content-Type: application/json" \
  -d '{"user_id":"test"}'

# Test decision recording
curl -X POST https://your-domain.com/api/v1/decisions \
  -H "Content-Type: application/json" \
  -d '{"user_id":"test","decision_type":"Proceed"}'
```

### Load Testing

```bash
# Using Apache Bench
ab -n 1000 -c 10 https://your-domain.com/

# Using wrk
wrk -t4 -c100 -d30s https://your-domain.com/
```

---

## Rollback Procedure

### Vercel Rollback

```bash
# View deployment history
vercel list

# Rollback to previous deployment
vercel rollback
```

### Manual Rollback

```bash
# Revert code to previous commit
git revert HEAD

# Re-deploy
vercel deploy --prod
```

---

## Scaling Considerations

### Database Scaling

- Use read replicas for high-traffic scenarios
- Implement caching (Redis) for frequently accessed data
- Monitor query performance

### API Scaling

- Implement rate limiting
- Use API gateway (AWS API Gateway, Kong)
- Auto-scale based on CPU/memory metrics

### Frontend Scaling

- Use CDN for static assets
- Implement service worker for offline support
- Optimize bundle size

---

## Security Checklist

- [ ] HTTPS enforced
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Input validation implemented
- [ ] SQL injection prevention (using ORM)
- [ ] XSS protection (React built-in)
- [ ] CSRF tokens implemented
- [ ] Secrets not committed to git
- [ ] Database backups configured
- [ ] Access logs monitored

---

## Maintenance

### Regular Tasks

- [ ] Monitor error rates
- [ ] Review performance metrics
- [ ] Update dependencies
- [ ] Backup database
- [ ] Review access logs
- [ ] Update SSL certificates

### Weekly

- [ ] Review user feedback
- [ ] Check system health
- [ ] Verify backups

### Monthly

- [ ] Security audit
- [ ] Performance review
- [ ] Dependency updates
- [ ] Database optimization

---

## Support & Troubleshooting

### Common Issues

**Issue**: Brake screen not displaying

**Solution**:
1. Check backend logs: `vercel logs`
2. Verify HRV data is being received
3. Check calendar event filtering
4. Verify state machine is on Day 3-5

**Issue**: API timeout errors

**Solution**:
1. Check backend performance
2. Increase timeout in frontend config
3. Optimize database queries
4. Scale backend resources

**Issue**: Database connection errors

**Solution**:
1. Verify DATABASE_URL is correct
2. Check database is running
3. Verify network connectivity
4. Check firewall rules

---

## Live Deployment URL

After deployment, your Omtobe MVP v0.1 will be available at:

```
https://omtobe.vercel.app
```

Or your custom domain:

```
https://your-custom-domain.com
```

---

## Next Steps

1. Monitor deployment for 24 hours
2. Gather user feedback
3. Iterate on design/functionality
4. Plan v0.2 features
5. Scale infrastructure as needed
