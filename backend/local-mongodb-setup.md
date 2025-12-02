# Local MongoDB Setup Guide

## Install MongoDB Locally

### Windows:
1. Download MongoDB Community Server from: https://www.mongodb.com/try/download/community
2. Install it with default settings
3. Start MongoDB service

### Your .env would then use:
```env
MONGODB_URI=mongodb://localhost:27017/social-media-app
```

## OR Use MongoDB Docker (Easier):
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

Then use:
```env
MONGODB_URI=mongodb://localhost:27017/social-media-app
```
