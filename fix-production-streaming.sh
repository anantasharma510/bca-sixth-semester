#!/bin/bash

# Production Streaming Fix Script
# This script fixes the live streaming issues on production (airwig.ca)

set -e  # Exit on any error

echo "🚀 Starting Production Streaming Fix..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if we're on the VPS
if [[ ! -d "/home/appuser/airwig/social-media-app-main" ]]; then
    print_error "This script should be run on the production VPS"
    exit 1
fi

cd /home/appuser/airwig/social-media-app-main

print_step "1. Stopping all PM2 processes..."
pm2 stop all || true

print_step "2. Backing up current environment files..."
cp frontend/.env.local frontend/.env.local.backup || print_warning "No frontend .env.local found"
cp backend/.env backend/.env.backup || print_warning "No backend .env found"

print_step "3. Checking and fixing environment variables..."

# Check frontend environment
print_status "Checking frontend environment variables..."
if [[ -f "frontend/.env.local" ]]; then
    # Remove quotes from AGORA_APP_ID if present
    sed -i 's/NEXT_PUBLIC_AGORA_APP_ID="c9566a2bf24941dcb82d39fea282a290"/NEXT_PUBLIC_AGORA_APP_ID=c9566a2bf24941dcb82d39fea282a290/' frontend/.env.local
    sed -i "s/NEXT_PUBLIC_AGORA_APP_ID='c9566a2bf24941dcb82d39fea282a290'/NEXT_PUBLIC_AGORA_APP_ID=c9566a2bf24941dcb82d39fea282a290/" frontend/.env.local
    
    # Ensure production URLs
    if ! grep -q "NEXT_PUBLIC_API_URL=https://airwig.ca/api" frontend/.env.local; then
        print_warning "Setting production API URL..."
        sed -i 's|NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=https://airwig.ca/api|' frontend/.env.local
    fi
    
    if ! grep -q "NEXT_PUBLIC_SOCKET_URL=https://airwig.ca" frontend/.env.local; then
        print_warning "Setting production Socket URL..."
        echo "NEXT_PUBLIC_SOCKET_URL=https://airwig.ca" >> frontend/.env.local
    fi
else
    print_error "Frontend .env.local not found!"
    exit 1
fi

# Check backend environment
print_status "Checking backend environment variables..."
if [[ -f "backend/.env" ]]; then
    # Ensure production settings
    if ! grep -q "NODE_ENV=production" backend/.env; then
        echo "NODE_ENV=production" >> backend/.env
    fi
    
    if ! grep -q "FRONTEND_URL=https://airwig.ca" backend/.env; then
        sed -i 's|FRONTEND_URL=.*|FRONTEND_URL=https://airwig.ca|' backend/.env
    fi
    
    if ! grep -q "ALLOWED_ORIGINS=https://airwig.ca" backend/.env; then
        sed -i 's|ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=https://airwig.ca,https://www.airwig.ca|' backend/.env
    fi
else
    print_error "Backend .env not found!"
    exit 1
fi

print_step "4. Cleaning and rebuilding frontend..."
cd frontend
rm -rf .next node_modules/.cache
export NODE_ENV=production
npm ci --only=production
npm run build

print_step "5. Cleaning and rebuilding backend..."
cd ../backend
rm -rf dist node_modules/.cache
npm ci --only=production
npm run build

print_step "6. Updating Nginx configuration for WebRTC..."
# Check if nginx config has WebRTC headers
if ! sudo grep -q "Permissions-Policy" /etc/nginx/sites-available/social-media-app; then
    print_warning "Adding WebRTC headers to Nginx..."
    sudo bash -c 'cat >> /etc/nginx/sites-available/social-media-app << EOF

    # WebRTC and WebSocket headers
    add_header Permissions-Policy "camera=*, microphone=*, display-capture=*" always;
    add_header Cross-Origin-Embedder-Policy "credentialless" always;
    add_header Cross-Origin-Opener-Policy "same-origin" always;
EOF'
fi

# Test nginx config
sudo nginx -t || {
    print_error "Nginx configuration test failed!"
    exit 1
}

sudo systemctl reload nginx

print_step "7. Starting services..."
cd /home/appuser/airwig/social-media-app-main

# Start PM2 services
pm2 start ecosystem.config.js

# Wait for services to start
sleep 10

print_step "8. Checking service status..."
pm2 status

print_step "9. Testing endpoints..."
print_status "Testing backend health..."
curl -f https://airwig.ca/api/health || print_warning "Backend health check failed"

print_status "Testing frontend..."
curl -f https://airwig.ca/ > /dev/null || print_warning "Frontend health check failed"

print_step "10. Monitoring logs..."
print_status "Recent backend logs:"
pm2 logs social-media-backend --lines 10 --nostream

print_status "Recent frontend logs:"
pm2 logs social-media-frontend --lines 10 --nostream

print_step "✅ Production streaming fix completed!"
echo ""
print_status "🎯 Next steps:"
echo "1. Test live streaming by going to https://airwig.ca/live"
echo "2. Create a test stream and verify camera/screen sharing works"
echo "3. Test with multiple users (host + viewer)"
echo ""
print_status "📋 If you still have issues:"
echo "1. Check logs: pm2 logs --lines 50"
echo "2. Check browser console on https://airwig.ca"
echo "3. Verify Agora App ID and Certificate are correct"
echo ""
print_status "🔧 Debug commands:"
echo "pm2 logs social-media-backend | grep -i agora"
echo "pm2 logs social-media-frontend | grep -i error"
echo "curl -v https://airwig.ca/api/live-streams"
