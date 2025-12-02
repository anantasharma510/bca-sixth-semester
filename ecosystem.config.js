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