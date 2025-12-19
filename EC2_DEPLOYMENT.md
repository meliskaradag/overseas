# AWS EC2 Deployment Guide - Overseas Housing

## Prerequisites
- AWS Account
- Domain name (optional but recommended)
- Basic knowledge of SSH

---

## Step 1: Launch EC2 Instance

1. Go to AWS Console → EC2 → Launch Instance
2. Choose settings:
   - **Name**: `overseas-app`
   - **AMI**: Ubuntu Server 22.04 LTS
   - **Instance type**: `t2.micro` (free tier) or `t3.small` (production)
   - **Key pair**: Create or select existing
   - **Security Group**: Allow ports 22 (SSH), 80 (HTTP), 443 (HTTPS)

3. Launch and note the Public IP/DNS

---

## Step 2: Setup RDS PostgreSQL

1. Go to AWS Console → RDS → Create Database
2. Settings:
   - **Engine**: PostgreSQL 15
   - **Template**: Free tier
   - **DB Instance Identifier**: `overseas-db`
   - **Master username**: `postgres`
   - **Master password**: (save this!)
   - **Public access**: Yes (or use VPC peering)
   
3. In Security Group, allow port 5432 from EC2's security group
4. Note the **Endpoint** after creation

---

## Step 3: Connect to EC2

```bash
ssh -i your-key.pem ubuntu@your-ec2-public-dns
```

---

## Step 4: Initial Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y git curl nginx

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Certbot for SSL
sudo apt install -y certbot python3-certbot-nginx
```

---

## Step 5: Deploy Application

```bash
# Clone your repository
cd /var/www
sudo mkdir overseas
sudo chown $USER:$USER overseas
git clone https://github.com/YOUR_USERNAME/overseas.git overseas
cd overseas

# Or run the deployment script
chmod +x deploy.sh
./deploy.sh
```

---

## Step 6: Configure Environment Variables

```bash
# Backend .env
cd /var/www/overseas/backend
nano .env
```

Add:
```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@your-rds-endpoint.region.rds.amazonaws.com:5432/overseas_db
JWT_SECRET=your-generated-secret-key
NODE_ENV=production
PORT=4000
```

---

## Step 7: Configure Nginx

```bash
# Edit nginx config with your domain
sudo nano /etc/nginx/sites-available/overseas

# Replace 'your-domain.com' with your actual domain or EC2 public DNS

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

---

## Step 8: SSL Certificate (if using domain)

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

---

## Step 9: Start Application

```bash
cd /var/www/overseas/backend
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

---

## Useful Commands

```bash
# View logs
pm2 logs overseas-backend

# Restart backend
pm2 restart overseas-backend

# Monitor processes
pm2 monit

# Check Nginx status
sudo systemctl status nginx

# View Nginx logs
sudo tail -f /var/log/nginx/error.log
```

---

## Scaling (Multiple EC2 Instances)

For high availability:

1. **Create AMI** from configured instance
2. **Create Auto Scaling Group** with min 2 instances
3. **Create Application Load Balancer** (ALB)
4. **Enable Sticky Sessions** for Socket.io
5. **Use Redis** (ElastiCache) for Socket.io adapter:
   ```bash
   npm install @socket.io/redis-adapter redis
   ```

---

## Cost Estimation (Monthly)

| Service | Type | Est. Cost |
|---------|------|-----------|
| EC2 | t3.small | ~$15 |
| RDS | db.t3.micro | ~$15 |
| Data Transfer | 10GB | ~$1 |
| **Total** | | **~$31/month** |

*Free tier eligible for first 12 months*
