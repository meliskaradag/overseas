#!/bin/bash
# EC2 Deployment Script for Overseas Housing
# Run this script on your EC2 instance after initial setup

set -e

echo "🚀 Starting deployment..."

# Configuration
APP_DIR="/var/www/overseas"
REPO_URL="https://github.com/YOUR_USERNAME/overseas.git"
BRANCH="main"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Update system packages
echo -e "${YELLOW}Updating system packages...${NC}"
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x if not installed
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Installing Node.js...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

# Install PM2 globally if not installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}Installing PM2...${NC}"
    sudo npm install -g pm2
fi

# Install Nginx if not installed
if ! command -v nginx &> /dev/null; then
    echo -e "${YELLOW}Installing Nginx...${NC}"
    sudo apt install -y nginx
fi

# Create app directory
sudo mkdir -p $APP_DIR
sudo chown -R $USER:$USER $APP_DIR

# Clone or pull latest code
if [ -d "$APP_DIR/.git" ]; then
    echo -e "${YELLOW}Pulling latest changes...${NC}"
    cd $APP_DIR
    git pull origin $BRANCH
else
    echo -e "${YELLOW}Cloning repository...${NC}"
    git clone $REPO_URL $APP_DIR
    cd $APP_DIR
    git checkout $BRANCH
fi

# Backend setup
echo -e "${YELLOW}Setting up backend...${NC}"
cd $APP_DIR/backend
npm install --production

# Create logs directory
mkdir -p logs

# Copy environment file if it doesn't exist
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Please create .env file from .env.example${NC}"
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Edit /var/www/overseas/backend/.env with your actual values${NC}"
fi

# Frontend setup
echo -e "${YELLOW}Building frontend...${NC}"
cd $APP_DIR/frontend

# Create .env for frontend build
cat > .env << EOF
VITE_API_URL=https://your-domain.com/api
VITE_SOCKET_URL=https://your-domain.com
EOF

npm install
npm run build

# Setup Nginx
echo -e "${YELLOW}Configuring Nginx...${NC}"
sudo cp $APP_DIR/nginx.conf /etc/nginx/sites-available/overseas
sudo ln -sf /etc/nginx/sites-available/overseas /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# Start/Restart backend with PM2
echo -e "${YELLOW}Starting backend with PM2...${NC}"
cd $APP_DIR/backend
pm2 delete overseas-backend 2>/dev/null || true
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Edit /var/www/overseas/backend/.env with your database credentials"
echo "2. Edit /etc/nginx/sites-available/overseas with your domain name"
echo "3. Install SSL certificate with: sudo certbot --nginx -d your-domain.com"
echo "4. Restart services: pm2 restart all && sudo systemctl restart nginx"
