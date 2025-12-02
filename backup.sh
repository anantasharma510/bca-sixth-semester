#!/bin/bash

# Backup script for Social Media App
# This script creates backups of the application and database

set -e

# Configuration
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/appuser/backups"
APP_DIR="/home/appuser/social-media-app"
RETENTION_DAYS=7

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

print_status "Starting backup process..."

# Backup application files (excluding node_modules and .next)
print_status "Backing up application files..."
tar -czf $BACKUP_DIR/app_$DATE.tar.gz \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='dist' \
    --exclude='uploads' \
    --exclude='*.log' \
    -C $APP_DIR .

print_status "Application backup completed: app_$DATE.tar.gz"

# Backup uploads directory separately
if [ -d "$APP_DIR/backend/uploads" ]; then
    print_status "Backing up uploads directory..."
    tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz -C $APP_DIR/backend uploads
    print_status "Uploads backup completed: uploads_$DATE.tar.gz"
fi

# Backup environment files
print_status "Backing up environment files..."
cp $APP_DIR/backend/.env $BACKUP_DIR/backend_env_$DATE.bak 2>/dev/null || print_warning "Backend .env file not found"
cp $APP_DIR/frontend/.env.local $BACKUP_DIR/frontend_env_$DATE.bak 2>/dev/null || print_warning "Frontend .env.local file not found"

# Backup PM2 configuration
print_status "Backing up PM2 configuration..."
pm2 save
cp ~/.pm2/dump.pm2 $BACKUP_DIR/pm2_config_$DATE.bak 2>/dev/null || print_warning "PM2 configuration not found"

# Create backup manifest
cat > $BACKUP_DIR/manifest_$DATE.txt << EOF
Backup created: $(date)
Application: Social Media App
Backup files:
- app_$DATE.tar.gz (Application files)
- uploads_$DATE.tar.gz (Uploads directory)
- backend_env_$DATE.bak (Backend environment)
- frontend_env_$DATE.bak (Frontend environment)
- pm2_config_$DATE.bak (PM2 configuration)
EOF

print_status "Backup manifest created: manifest_$DATE.txt"

# Clean up old backups
print_status "Cleaning up old backups (older than $RETENTION_DAYS days)..."
find $BACKUP_DIR -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "*.bak" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "manifest_*.txt" -mtime +$RETENTION_DAYS -delete

print_status "Backup process completed successfully! 🎉"
print_status "Backup location: $BACKUP_DIR"
print_status "Total backup size: $(du -sh $BACKUP_DIR | cut -f1)" 