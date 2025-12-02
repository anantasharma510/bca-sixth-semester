#!/bin/bash

# Quick deployment script to fix file upload issues
# This script applies the updated nginx configuration

echo "🔧 Quick deployment script for fixing file upload issues"
echo "========================================================"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ This script must be run as root (use sudo)"
    exit 1
fi

# Check if nginx is installed
if ! command -v nginx &> /dev/null; then
    echo "❌ Nginx is not installed. Please install nginx first."
    exit 1
fi

# Check if the site configuration exists
if [ ! -f "/etc/nginx/sites-available/social-media-app" ]; then
    echo "❌ Site configuration not found at /etc/nginx/sites-available/social-media-app"
    echo "📝 Creating new site configuration..."
    
    # Create the sites-available directory if it doesn't exist
    mkdir -p /etc/nginx/sites-available
fi

# Backup current nginx configuration
echo "📦 Backing up current nginx configuration..."
if [ -f "/etc/nginx/sites-available/social-media-app" ]; then
    cp /etc/nginx/sites-available/social-media-app /etc/nginx/sites-available/social-media-app.backup.$(date +%Y%m%d_%H%M%S)
    echo "✅ Backup created"
else
    echo "ℹ️  No existing configuration to backup"
fi

# Copy the updated nginx configuration
echo "📝 Applying updated nginx configuration..."
cp nginx.conf /etc/nginx/sites-available/social-media-app

# Check if the site is enabled
if [ ! -L "/etc/nginx/sites-enabled/social-media-app" ]; then
    echo "🔗 Enabling site configuration..."
    ln -s /etc/nginx/sites-available/social-media-app /etc/nginx/sites-enabled/
fi

# Remove default site if it exists
if [ -L "/etc/nginx/sites-enabled/default" ]; then
    echo "🗑️  Removing default nginx site..."
    rm /etc/nginx/sites-enabled/default
fi

# Test nginx configuration
echo "🧪 Testing nginx configuration..."
if nginx -t; then
    echo "✅ Nginx configuration test passed"
    
    # Check if SSL certificates exist
    if [ -f "/etc/letsencrypt/live/airwig.ca/fullchain.pem" ]; then
        echo "🔒 SSL certificates found"
    else
        echo "⚠️  SSL certificates not found. You may need to run:"
        echo "   sudo certbot --nginx -d airwig.ca -d www.airwig.ca"
    fi
    
    # Reload nginx
    echo "🔄 Reloading nginx..."
    systemctl reload nginx
    
    if [ $? -eq 0 ]; then
        echo "✅ Nginx reloaded successfully"
        echo ""
        echo "🎉 File upload fix applied successfully!"
        echo "📋 Changes made:"
        echo "   - Added client_max_body_size 500M for HTTPS"
        echo "   - Added proxy timeout settings for large uploads"
        echo "   - Configured HTTP to HTTPS redirect"
        echo "   - Added SSL configuration"
        echo ""
        echo "🔍 To verify the fix:"
        echo "   1. Try uploading a video file from your website"
        echo "   2. Check nginx logs: sudo tail -f /var/log/nginx/error.log"
        echo "   3. Monitor upload progress in browser Network tab"
        echo ""
        echo "📊 Current nginx status:"
        systemctl status nginx --no-pager -l
        echo ""
        echo "🌐 Test your site:"
        echo "   https://airwig.ca"
        echo ""
        echo "🔧 If you still have issues:"
        echo "   1. Check nginx error logs: sudo tail -f /var/log/nginx/error.log"
        echo "   2. Check nginx access logs: sudo tail -f /var/log/nginx/access.log"
        echo "   3. Verify SSL certificates: sudo certbot certificates"
        echo "   4. Restart nginx if needed: sudo systemctl restart nginx"
    else
        echo "❌ Failed to reload nginx"
        echo "🔍 Check nginx error logs: sudo tail -f /var/log/nginx/error.log"
        exit 1
    fi
else
    echo "❌ Nginx configuration test failed"
    echo "🔍 Check the configuration file for syntax errors"
    echo "📄 Configuration file: /etc/nginx/sites-available/social-media-app"
    exit 1
fi

echo ""
echo "🚀 Deployment complete!" 