#!/bin/bash

echo "🔧 Fixing 413 Request Entity Too Large Error"
echo "============================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ This script needs to be run as root (use sudo)"
    exit 1
fi

echo "📋 Current nginx configuration test:"
nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx configuration is valid"
    
    echo "🔄 Reloading nginx configuration..."
    systemctl reload nginx
    
    if [ $? -eq 0 ]; then
        echo "✅ Nginx reloaded successfully"
    else
        echo "⚠️  Reload failed, trying restart..."
        systemctl restart nginx
        
        if [ $? -eq 0 ]; then
            echo "✅ Nginx restarted successfully"
        else
            echo "❌ Failed to restart nginx"
            exit 1
        fi
    fi
    
    echo "📊 Checking nginx status:"
    systemctl status nginx --no-pager -l
    
    echo "🔍 Verifying client_max_body_size setting:"
    nginx -T 2>/dev/null | grep client_max_body_size
    
    echo "✅ Fix completed! Try uploading your file again."
else
    echo "❌ Nginx configuration is invalid"
    exit 1
fi 