# Troubleshooting Guide - Social Media App Deployment

## Common Issues and Solutions

### 1. Connection Issues

#### Cannot connect to VPS
```bash
# Check if VPS is running
ping 137.184.175.9

# Check SSH service
ssh -v root@137.184.175.9
```

#### SSH connection refused
- Verify the VPS is running in Digital Ocean dashboard
- Check if SSH port (22) is open in firewall
- Try connecting from a different network

### 2. Node.js Issues

#### Node.js not found
```bash
# Reinstall Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

#### Permission denied errors
```bash
# Fix ownership
sudo chown -R appuser:appuser /home/appuser/social-media-app

# Fix permissions
chmod +x deploy.sh
chmod +x backup.sh
```

### 3. PM2 Issues

#### PM2 process not starting
```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs social-media-backend

# Restart process
pm2 restart social-media-backend

# Delete and restart
pm2 delete social-media-backend
pm2 start ecosystem.config.js
```

#### PM2 not found
```bash
# Install PM2 globally
npm install -g pm2

# Verify installation
pm2 --version
```

### 4. Nginx Issues

#### Nginx not starting
```bash
# Check Nginx status
sudo systemctl status nginx

# Check configuration
sudo nginx -t

# View error logs
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx
```

#### 502 Bad Gateway
```bash
# Check if backend is running
pm2 status

# Check backend logs
pm2 logs social-media-backend

# Check if port 5000 is listening
sudo netstat -tulpn | grep :5000

# Restart backend
pm2 restart social-media-backend
```

#### 404 Not Found
- Check if the site configuration is enabled
- Verify the domain name in Nginx configuration
- Check if the frontend build exists

### 5. SSL Certificate Issues

#### SSL certificate not working
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate
sudo certbot renew

# Check Nginx SSL configuration
sudo nginx -t
```

#### Certbot not found
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y
```

### 6. Database Issues

#### MongoDB connection failed
```bash
# Check environment variables
cat backend/.env | grep MONGODB_URI

# Test connection
node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));
"
```

#### Database not accessible
- Verify MongoDB Atlas IP whitelist includes your VPS IP
- Check if the connection string is correct
- Verify database user credentials

### 7. Build Issues

#### Frontend build fails
```bash
# Clear Next.js cache
cd frontend
rm -rf .next
npm run build

# Check for missing dependencies
npm install
```

#### Backend build fails
```bash
# Clear TypeScript cache
cd backend
rm -rf dist
npm run build

# Check TypeScript errors
npx tsc --noEmit
```

### 8. Environment Variable Issues

#### Missing environment variables
```bash
# Check backend environment
cat backend/.env

# Check frontend environment
cat frontend/.env.local

# Validate environment variables
cd backend
node -e "
require('dotenv').config();
const { validateEnvironmentVariables } = require('./src/config/env');
validateEnvironmentVariables();
"
```

### 9. File Permission Issues

#### Uploads directory not writable
```bash
# Create uploads directory
mkdir -p backend/uploads

# Set permissions
chmod 755 backend/uploads
chown appuser:appuser backend/uploads
```

#### Log files not writable
```bash
# Create logs directory
mkdir -p logs

# Set permissions
chmod 755 logs
chown appuser:appuser logs
```

### 10. Performance Issues

#### High memory usage
```bash
# Check memory usage
free -h

# Check PM2 memory usage
pm2 monit

# Restart processes
pm2 restart all
```

#### Slow response times
```bash
# Check Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Check backend logs
pm2 logs social-media-backend

# Monitor system resources
htop
```

### 11. Security Issues

#### Firewall not configured
```bash
# Check UFW status
sudo ufw status

# Configure firewall
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

#### SSL not working
```bash
# Check SSL configuration
sudo nginx -t

# Check certificate
sudo certbot certificates

# Force HTTPS redirect in Nginx
```

### 12. Backup Issues

#### Backup script fails
```bash
# Check backup script permissions
chmod +x backup.sh

# Run backup manually
./backup.sh

# Check backup directory
ls -la /home/appuser/backups
```

#### Cron job not working
```bash
# Check cron jobs
crontab -l

# Check cron logs
sudo tail -f /var/log/cron

# Test cron job manually
./backup.sh
```

## Useful Commands

### System Monitoring
```bash
# Check system resources
htop
df -h
free -h

# Check running processes
ps aux | grep node
ps aux | grep nginx

# Check network connections
netstat -tulpn
```

### Log Monitoring
```bash
# PM2 logs
pm2 logs

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# System logs
sudo journalctl -u nginx
sudo journalctl -u ssh
```

### Application Management
```bash
# PM2 commands
pm2 status
pm2 restart all
pm2 reload all
pm2 delete all
pm2 save

# Nginx commands
sudo systemctl status nginx
sudo systemctl restart nginx
sudo nginx -t
```

## Emergency Procedures

### Complete Reset
```bash
# Stop all services
pm2 delete all
sudo systemctl stop nginx

# Clean up
rm -rf /home/appuser/social-media-app/node_modules
rm -rf /home/appuser/social-media-app/frontend/.next
rm -rf /home/appuser/social-media-app/backend/dist

# Reinstall and restart
cd /home/appuser/social-media-app
./deploy.sh
sudo systemctl start nginx
```

### Rollback to Previous Version
```bash
# Stop current version
pm2 delete all

# Restore from backup
cd /home/appuser/backups
tar -xzf app_$(date -d '1 day ago' +%Y%m%d_%H%M%S).tar.gz -C /home/appuser/social-media-app

# Restart
cd /home/appuser/social-media-app
./deploy.sh
```

## Getting Help

If you're still experiencing issues:

1. Check the logs for specific error messages
2. Verify all environment variables are set correctly
3. Ensure all dependencies are installed
4. Check if the VPS has enough resources
5. Verify network connectivity and firewall settings

For additional support, check:
- Digital Ocean documentation
- Node.js documentation
- PM2 documentation
- Nginx documentation 

# Troubleshooting Guide - File Upload Issues

## Problem: 413 Request Entity Too Large

### Symptoms
- Video uploads work on localhost but fail on production server
- Browser shows "413 Request Entity Too Large" error
- Request URL: `https://airwig.ca/api/posts`
- Status Code: 413

### Root Cause
The issue occurs because nginx has a default `client_max_body_size` limit (usually 1MB) that's much smaller than your application's configured limits (500MB for videos). When you access the site via HTTPS, the SSL server block needs the same configuration.

### Quick Fix

#### Step 1: Apply the Updated Configuration
```bash
# SSH into your server
ssh root@137.184.175.9

# Navigate to your project directory
cd /home/appuser/social-media-app

# Run the deployment script
sudo ./quick-deploy.sh
```

#### Step 2: Verify the Fix
1. Try uploading a video file from your website
2. Check that the request goes through without 413 errors
3. Monitor the upload progress in browser Network tab

### Manual Fix (if script doesn't work)

#### Step 1: Update Nginx Configuration
```bash
# SSH into your server
ssh root@137.184.175.9

# Backup current configuration
sudo cp /etc/nginx/sites-available/social-media-app /etc/nginx/sites-available/social-media-app.backup

# Edit the configuration
sudo nano /etc/nginx/sites-available/social-media-app
```

#### Step 2: Add Required Directives
Make sure your HTTPS server block includes:

```nginx
server {
    listen 443 ssl http2;
    server_name airwig.ca www.airwig.ca;

    # SSL configuration (Certbot managed)
    ssl_certificate /etc/letsencrypt/live/airwig.ca/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/airwig.ca/privkey.pem;

    # CRITICAL: Increase client body size for file uploads
    client_max_body_size 500M;

    # ... rest of your configuration

    location /api {
        proxy_pass http://localhost:5000;
        # ... other proxy settings
        
        # Increase timeout for large file uploads
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
```

#### Step 3: Apply Changes
```bash
# Test configuration
sudo nginx -t

# If test passes, reload nginx
sudo systemctl reload nginx
```

### Alternative Solutions

#### Option 1: Global Configuration
If you want to set the limit globally for all sites:

```bash
sudo nano /etc/nginx/nginx.conf
```

Add in the `http` block:
```nginx
http {
    client_max_body_size 500M;
    # ... other settings
}
```

#### Option 2: Increase Limit Further
If 500MB is not enough:
```nginx
client_max_body_size 1G;  # 1GB limit
```

### Verification Steps

#### 1. Check Nginx Configuration
```bash
# Test nginx configuration
sudo nginx -t

# Check if the directive is applied
sudo grep -r "client_max_body_size" /etc/nginx/
```

#### 2. Check Nginx Logs
```bash
# Monitor error logs
sudo tail -f /var/log/nginx/error.log

# Monitor access logs
sudo tail -f /var/log/nginx/access.log
```

#### 3. Test Upload
1. Open browser developer tools (F12)
2. Go to Network tab
3. Try uploading a video file
4. Check if the request succeeds (200 status) instead of 413

### Common Issues and Solutions

#### Issue 1: Configuration Not Applied
**Symptoms**: Still getting 413 errors after applying changes

**Solution**:
```bash
# Check if nginx is using the correct configuration
sudo nginx -T | grep client_max_body_size

# Restart nginx completely
sudo systemctl restart nginx
```

#### Issue 2: SSL Certificate Problems
**Symptoms**: Site not accessible or SSL errors

**Solution**:
```bash
# Check SSL certificate status
sudo certbot certificates

# Renew certificates if needed
sudo certbot renew

# Check SSL configuration
sudo nginx -t
```

#### Issue 3: Permission Issues
**Symptoms**: Nginx fails to start or reload

**Solution**:
```bash
# Check nginx status
sudo systemctl status nginx

# Check file permissions
sudo ls -la /etc/nginx/sites-available/
sudo ls -la /etc/nginx/sites-enabled/

# Fix permissions if needed
sudo chown -R root:root /etc/nginx/
sudo chmod 644 /etc/nginx/sites-available/social-media-app
```

### Backend Configuration Verification

Your backend is already configured correctly, but verify these settings:

#### 1. Express Body Parser (in `backend/src/index.ts`)
```typescript
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));
```

#### 2. Multer Configuration (in `backend/src/middleware/multer.ts`)
```typescript
export const uploadWithVideo = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit for videos
  },
});
```

### Performance Considerations

#### 1. Memory Usage
Large file uploads consume memory. Monitor your server:
```bash
# Check memory usage
free -h

# Monitor during upload
htop
```

#### 2. Disk Space
Ensure you have enough storage:
```bash
# Check disk usage
df -h

# Check uploads directory
du -sh /home/appuser/social-media-app/backend/uploads/
```

#### 3. Timeout Settings
Large files may take time to upload. The configuration includes:
- `proxy_connect_timeout 300s`
- `proxy_send_timeout 300s`
- `proxy_read_timeout 300s`

### Security Considerations

#### 1. File Type Validation
Your backend already validates file types:
```typescript
const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image and video files are allowed'));
  }
};
```

#### 2. Rate Limiting
Consider implementing rate limiting for uploads to prevent abuse.

### Monitoring and Maintenance

#### 1. Regular Checks
```bash
# Check nginx status
sudo systemctl status nginx

# Check logs for errors
sudo tail -f /var/log/nginx/error.log

# Monitor disk usage
df -h
```

#### 2. Backup Configuration
```bash
# Backup nginx configuration
sudo cp /etc/nginx/sites-available/social-media-app /home/appuser/nginx-backup-$(date +%Y%m%d).conf
```

### Getting Help

If you're still experiencing issues:

1. **Check logs**: `sudo tail -f /var/log/nginx/error.log`
2. **Test configuration**: `sudo nginx -t`
3. **Verify SSL**: `sudo certbot certificates`
4. **Check permissions**: `ls -la /etc/nginx/sites-available/`
5. **Monitor resources**: `htop` and `df -h`

### Summary

The 413 error is caused by nginx's default file size limits. The solution is to add `client_max_body_size 500M;` to your HTTPS server block in the nginx configuration. The updated configuration file and deployment script handle this automatically. 


testing
