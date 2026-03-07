# Production Deployment Checklist

Follow these steps to migrate from local development to a hardened production environment.

## 1. Environment Preparation
- [ ] Create `.env.production` (Do NOT commit to git).
- [ ] Set `NODE_ENV=production`.
- [ ] Set `COOKIE_SECURE=true`.
- [ ] Generate a 64-character random string for `JWT_SECRET`.
- [ ] Set a strong password for Redis (`REDIS_PASSWORD`).
- [ ] Verify `PUBLIC_BASE_URL` is your production domain (e.g., `https://shriramya.com`).

## 2. Infrastructure Setup
- [ ] Provision SSL Certificates (Let's Encrypt / Certbot).
- [ ] Mount certs to `./certs` for Nginx.
- [ ] Use `docker-compose.production.yml` to launch.
- [ ] Verify DBs have NO public port mappings (No 27017 or 3306 on host).

## 3. WordPress & WooCommerce Hardening
- [ ] Force HTTPS in WP (`WP_HOME`, `WP_SITEURL`).
- [ ] Enable `WC_WEBHOOK_SECRET` in WooCommerce settings.
- [ ] Disable all unused plugins.
- [ ] Setup Webhooks pointing to `/api/v1/webhooks/woocommerce`.

## 4. Monitoring & Firewall
- [ ] Configure `fail2ban` if not using a cloud firewall like Cloudflare.
- [ ] Block all ports except `80` and `443` at the OS level (UFW).
- [ ] Enable Node.js production logging (e.g., Winston/Pino to file or ELK).

---
**Build Command**:
`docker-compose -f docker-compose.production.yml up --build -d`
