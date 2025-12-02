# CORS Configuration Guide

This document explains the CORS (Cross-Origin Resource Sharing) configuration for the social media app.

## Current Configuration

The backend server is configured to allow requests from the following origins:

### Development Environment
- `http://localhost:3000` (web frontend)
- All local network IPs (e.g., `http://192.168.101.6:5000`, `http://192.168.1.100:3000`)
- All localhost ports (for React Native development)
- Localtunnel URLs (e.g., `https://stupid-tools-stare.loca.lt`)

### Production Environment
- `https://your-production-domain.com` (replace with actual domain)

## Mobile App Configuration

For the mobile app (React Native/Expo), the following IPs are configured:

- `http://192.168.101.6:5000` (mobile app - Expo Go, current IP)
- `http://192.168.101.5:5000` (mobile app - Expo Go, previous IP)
- `http://192.168.101.10:5000` (mobile app - Expo Go, previous IP)

## How to Update IP Address

When your computer's IP address changes, update the following files:

1. **Backend**: `src/index.ts` - Update the `ALLOWED_ORIGINS` array
2. **Mobile App**: `app.config.ts` - Update the `apiUrl` in the `extra` section
3. **Mobile Services**: Update all API service files in `src/services/api/`
4. **Mobile Screens**: Update all screen files that use API calls
5. **Mobile Hooks**: Update `src/hooks/useSocket.ts`

## Environment Variables

You can also use environment variables to configure the API URL:

- `EXPO_PUBLIC_API_URL` - For the mobile app
- `FRONTEND_URL` - For the web frontend
- `ALLOWED_ORIGINS` - For the backend CORS configuration

## Testing

To test the CORS configuration:

1. Start the backend server
2. Start the mobile app
3. Check the browser console for CORS errors
4. Verify that API calls work from both web and mobile

## Troubleshooting

If you encounter CORS errors:

1. Check that the IP address is correct in all configuration files
2. Ensure the backend server is running on the correct port
3. Verify that the mobile app is using the correct API URL
4. Check the browser console for specific CORS error messages 