# Social Media App Deployment Guide - Digital Ocean VPS

## Prerequisites
- Digital Ocean VPS with Ubuntu 22.04 LTS
- Root access to the server (137.184.175.9)
- Domain name (optional but recommended)
- MongoDB Atlas account (for database)
- Cloudinary account (for image storage)
- Clerk account (for authentication)

## Server Setup

### 1. Connect to Your VPS
```bash
ssh root@137.184.175.9
```
zxz33@Rmy8%zp0Xwp#$H


### 2. Update System
```bash
apt update && apt upgrade -y
```

### 3. Install Required Software
```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Install PM2 for process management
npm install -g pm2

# Install Nginx
apt install nginx -y

# Install Certbot for SSL
apt install certbot python3-certbot-nginx -y

# Install Git
apt install git -y

# Install build tools
apt install build-essential -y
```

### 4. Create Application User
```bash
# Create user for the application
adduser appuser
passowrd test123
usermod -aG sudo appuser

# Switch to appuser
su - appuser
```

## Application Deployment

### 1. Clone Repository

Since your repository is private, you have several options:

#### Option A: Using SSH Keys (Recommended)
```bash
# Generate SSH key on your local machine (if you haven't already)
ssh-keygen -t ed25519 -C "your-email@example.com"

# Copy the public key to your GitHub account
cat ~/.ssh/id_ed25519.pub
# Add this key to GitHub: Settings > SSH and GPG keys > New SSH key

# On the VPS, switch to appuser and setup SSH
su - appuser
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Copy your private key to the VPS (from your local machine)
# scp ~/.ssh/id_ed25519 root@137.184.175.9:/home/appuser/.ssh/
# scp ~/.ssh/id_ed25519.pub root@137.184.175.9:/home/appuser/.ssh/

# Set proper permissions
chmod 600 ~/.ssh/id_ed25519
chmod 644 ~/.ssh/id_ed25519.pub

# Test SSH connection
ssh -T git@github.com

# Clone using SSH
cd /home/appuser
git clone git@github.com:yourusername/your-repo-name.git social-media-app
cd social-media-app
```

#### Option B: Using Personal Access Token
```bash
# Create a Personal Access Token on GitHub:
# Settings > Developer settings > Personal access tokens > Tokens (classic)
# Give it repo permissions

# Clone using HTTPS with token
cd /home/appuser
git clone https://your-token@github.com/yourusername/your-repo-name.git social-media-app
cd social-media-app
```

#### Option C: Using GitHub CLI
```bash
# Install GitHub CLI
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install gh

# Authenticate with GitHub
gh auth login

# Clone repository
cd /home/appuser
gh repo clone yourusername/your-repo-name social-media-app
cd social-media-app
```

#### Option D: Manual Upload (Alternative)
If you prefer not to use Git on the server:
```bash
# On your local machine, create a deployment package
tar -czf social-media-app.tar.gz social-media-app/

# Upload to VPS
scp social-media-app.tar.gz root@137.184.175.9:/home/appuser/

# On VPS, extract the package
cd /home/appuser
tar -xzf social-media-app.tar.gz
cd social-media-app
```

### 2. Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Create environment file
nano .env
```

Add the following environment variables to `.env`:
```env
# Clerk Configuration
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_ISSUER=https://your-app.clerk.accounts.dev
CLERK_WEBHOOK_SECRET=your_webhook_secret

# Database
MONGODB_URI=your_mongodb_atlas_connection_string

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Server Configuration
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Create uploads directory
mkdir uploads
```

### 3. Frontend Setup
```bash
cd ../frontend

# Install dependencies
npm install

# Create environment file
  nano .env.local
```

Add the following environment variables to `.env.local`:
```env
# Clerk Configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# API Configuration
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
NEXT_PUBLIC_SOCKET_URL=https://yourdomain.com

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name

# Stream Chat
NEXT_PUBLIC_STREAM_CHAT_API_KEY=your_stream_chat_api_key
STREAM_CHAT_SECRET=your_stream_chat_secret
```

### 4. Build Applications
```bash
# Build backend
cd ../backend
npm run build

# Build frontend
cd ../frontend
npm run build
```

## PM2 Configuration

### 1. Create PM2 Ecosystem File
```bash
cd /home/appuser/social-media-app
nano ecosystem.config.js
```

Add the following configuration:
```javascript
module.exports = {
  apps: [
    {
      name: 'social-media-backend',
      cwd: '/home/appuser/social-media-app/backend',
      script: 'dist/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: '/home/appuser/logs/backend-error.log',
      out_file: '/home/appuser/logs/backend-out.log',
      log_file: '/home/appuser/logs/backend-combined.log',
      time: true
    }
  ]
};
```

### 2. Create Log Directory
```bash
mkdir -p /home/appuser/logs
```

### 3. Start Applications with PM2
```bash
# Start backend
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

## Nginx Configuration

### 1. Create Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/social-media-app
```

Add the following configuration:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Increase client body size for file uploads (500MB)
    client_max_body_size 500M;

    # Frontend
    location / {
        root /home/appuser/social-media-app/frontend/.next;
        try_files $uri $uri/ @frontend;
    }

    # Frontend fallback
    location @frontend {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeout for large file uploads
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    # Socket.IO
    location /socket.io {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Uploads
    location /uploads {
        alias /home/appuser/social-media-app/backend/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
```

### 2. Enable Site
```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/social-media-app /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## SSL Certificate

### 1. Install SSL Certificate
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 2. Auto-renewal
```bash
# Test auto-renewal
sudo certbot renew --dry-run
```

## Firewall Configuration

### 1. Configure UFW
```bash
# Allow SSH
sudo ufw allow ssh

# Allow HTTP and HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Enable firewall
sudo ufw enable
```

## Repository Updates and Deployment

### 1. Updating from Git Repository
```bash
# If using Git (Options A, B, or C above)
cd /home/appuser/social-media-app
git pull origin main

# Rebuild applications
cd backend
npm install
npm run build

cd ../frontend
npm install
npm run build

# Restart applications
pm2 restart all
```

### 2. Manual Update Process
```bash
# If using manual upload (Option D)
# On your local machine, create new package
tar -czf social-media-app-update.tar.gz social-media-app/

# Upload to VPS
scp social-media-app-update.tar.gz root@137.184.175.9:/home/appuser/

# On VPS, backup current version and extract new one
cd /home/appuser
mv social-media-app social-media-app-backup
tar -xzf social-media-app-update.tar.gz

# Rebuild and restart
cd social-media-app
cd backend && npm install && npm run build
cd ../frontend && npm install && npm run build
pm2 restart all
```

## Monitoring and Maintenance

### 1. PM2 Monitoring
```bash
# View logs
pm2 logs

# Monitor processes
pm2 monit

# Restart applications
pm2 restart all

# Update applications
pm2 reload all
```

### 2. System Monitoring
```bash
# Check system resources
htop

# Check disk usage
df -h

# Check memory usage
free -h

# Check Nginx status
sudo systemctl status nginx
```

## Backup Strategy

### 1. Database Backup
```bash
# Create backup script
nano /home/appuser/backup.sh
```

Add the following content:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/appuser/backups"
mkdir -p $BACKUP_DIR

# Backup MongoDB (if local)
# mongodump --out $BACKUP_DIR/mongodb_$DATE

# Backup application files
tar -czf $BACKUP_DIR/app_$DATE.tar.gz /home/appuser/social-media-app

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

### 2. Setup Cron Job
```bash
# Make script executable
chmod +x /home/appuser/backup.sh

# Add to crontab
crontab -e
```

Add the following line:
```
0 2 * * * /home/appuser/backup.sh
```

## Troubleshooting

### Common Issues:

1. **Port already in use**: Check if another process is using the port
   ```bash
   sudo netstat -tulpn | grep :5000
   ```

2. **Permission denied**: Check file permissions
   ```bash
   sudo chown -R appuser:appuser /home/appuser/social-media-app
   ```

3. **Nginx 502 error**: Check if backend is running
   ```bash
   pm2 status
   pm2 logs social-media-backend
   ```

4. **SSL issues**: Check certificate status
   ```bash
   sudo certbot certificates
   ```

## File Upload Issues (413 Request Entity Too Large)

### Problem
You're getting a "413 Request Entity Too Large" error when uploading videos from your DigitalOcean VPS, while it works fine on localhost.

### Root Cause
The issue is that nginx has a default `client_max_body_size` limit (usually 1MB) that's much smaller than your application's configured limits (500MB for videos).

### Solution

#### 1. Update Nginx Configuration
Make sure your nginx configuration includes the `client_max_body_size` directive:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Increase client body size for file uploads (500MB)
    client_max_body_size 500M;
    
    # ... rest of your configuration
}
```

#### 2. Apply the Configuration
```bash
# Test nginx configuration
sudo nginx -t

# If test passes, reload nginx
sudo systemctl reload nginx

# Or restart nginx if needed
sudo systemctl restart nginx
```

#### 3. Verify Backend Configuration
Your backend is already configured correctly with:
- Express body parser limit: 500MB
- Multer file size limit: 500MB for videos

#### 4. Test the Fix
After applying the nginx configuration:
1. Try uploading a video file
2. Check the browser's Network tab to ensure the request goes through
3. Monitor nginx logs for any errors:
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

#### 5. Additional Considerations
- **Timeout Settings**: Large files may take time to upload, so the configuration includes increased timeout values
- **Memory Usage**: Monitor server memory usage during large uploads
- **Storage Space**: Ensure you have enough disk space for uploads

### Alternative Solutions

If you continue to have issues, you can also:

1. **Increase the limit further** (if needed):
   ```nginx
   client_max_body_size 1G;  # 1GB limit
   ```

2. **Add to http block** (affects all sites):
   ```bash
   sudo nano /etc/nginx/nginx.conf
   ```
   Add in the http block:
   ```nginx
   http {
       client_max_body_size 500M;
       # ... other settings
   }
   ```

3. **Check for proxy timeouts** in your nginx configuration:
   ```nginx
   location /api {
       proxy_pass http://localhost:5000;
       proxy_connect_timeout 300s;
       proxy_send_timeout 300s;
       proxy_read_timeout 300s;
       # ... other settings
   }
   ```

## Security Considerations

1. **Keep system updated**: Regularly update the system
2. **Use strong passwords**: Change default passwords
3. **Monitor logs**: Check logs regularly for suspicious activity
4. **Backup regularly**: Maintain regular backups
5. **Use firewall**: Keep UFW enabled and configured
6. **SSL/TLS**: Always use HTTPS in production

## Performance Optimization

1. **Enable Nginx caching**: Configure caching for static assets
2. **Use CDN**: Consider using a CDN for static assets
3. **Database optimization**: Optimize database queries and indexes
4. **Image optimization**: Compress images before upload
5. **Load balancing**: Consider load balancing for high traffic

## Deployment Commands Summary

```bash
# Initial setup
ssh root@137.184.175.9
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs nginx certbot python3-certbot-nginx git build-essential
npm install -g pm2

# Create user and setup
adduser appuser
usermod -aG sudo appuser
su - appuser

# Deploy application
cd /home/appuser
git clone <your-repo> social-media-app
cd social-media-app

# Setup backend
cd backend
npm install
# Create .env file with your configuration
npm run build

# Setup frontend
cd ../frontend
npm install
# Create .env.local file with your configuration
npm run build

# Start with PM2
cd ..
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Setup Nginx
sudo nano /etc/nginx/sites-available/social-media-app
sudo ln -s /etc/nginx/sites-available/social-media-app /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# Setup SSL
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Setup firewall
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

Remember to replace `yourdomain.com`, `your_clerk_secret_key`, `your_mongodb_uri`, etc. with your actual values. 