#!/bin/bash

# Social Media App Deployment Script
# Run this script on your Digital Ocean VPS

set -e  # Exit on any error

echo "🚀 Starting Social Media App Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root. Please run as appuser."
   exit 1
fi

# Check if we're in the right directory
if [ ! -f "ecosystem.config.js" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_status "Installing dependencies..."

# Install backend dependencies
cd backend
npm install
print_status "Backend dependencies installed"

# Install frontend dependencies
cd ../frontend
npm install
print_status "Frontend dependencies installed"

# Build applications
print_status "Building applications..."

# Build backend
cd ../backend
npm run build
print_status "Backend built successfully"

# Build frontend
cd ../frontend
npm run build
print_status "Frontend built successfully"

# Create logs directory
cd ..
mkdir -p logs
print_status "Logs directory created"

# Create uploads directory
mkdir -p backend/uploads
print_status "Uploads directory created"

# Start/restart PM2 processes
print_status "Starting PM2 processes..."
pm2 delete social-media-backend 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
print_status "PM2 processes started and saved"

# Check PM2 status
print_status "PM2 Status:"
pm2 status

print_status "Deployment completed successfully! 🎉"
print_status "Your application should now be running on port 5000"
print_status "Check PM2 logs with: pm2 logs"
print_status "Monitor with: pm2 monit" 