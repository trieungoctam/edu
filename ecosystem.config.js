/**
 * PM2 Configuration for HSU Chatbot
 * Production-ready process management configuration
 */

module.exports = {
  apps: [
    {
      name: 'hsu-chatbot',
      script: './src/server.js',
      instances: process.env.PM2_INSTANCES || 'max', // Use all CPU cores
      exec_mode: 'cluster',
      
      // Environment variables
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      
      env_production: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3000
      },
      
      // Logging configuration
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Process management
      max_memory_restart: '500M',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      
      // Monitoring
      monitoring: false,
      pmx: true,
      
      // Advanced features
      kill_timeout: 5000,
      listen_timeout: 3000,
      shutdown_with_message: true,
      
      // Auto restart on file changes (development only)
      watch: process.env.NODE_ENV === 'development' ? ['src'] : false,
      ignore_watch: ['node_modules', 'logs', '.git'],
      
      // Graceful shutdown
      kill_retry_time: 100,
      
      // Health check
      health_check_grace_period: 3000,
      
      // Cron restart (optional - restart daily at 3 AM)
      cron_restart: process.env.NODE_ENV === 'production' ? '0 3 * * *' : undefined,
      
      // Merge logs from all instances
      merge_logs: true,
      
      // Time zone
      time: true,
      
      // Source map support
      source_map_support: true,
      
      // Instance variables
      instance_var: 'INSTANCE_ID',
      
      // Interpreter options
      node_args: '--max-old-space-size=400',
      
      // Autorestart
      autorestart: true,
      
      // Error handling
      max_memory_restart: '500M',
      
      // Custom startup script
      pre_start: './scripts/pre-start.sh',
      post_start: './scripts/post-start.sh'
    }
  ],

  // Deployment configuration
  deploy: {
    production: {
      user: process.env.DEPLOY_USER || 'deploy',
      host: process.env.DEPLOY_HOST || 'localhost',
      ref: 'origin/main',
      repo: process.env.DEPLOY_REPO || 'git@github.com:username/hsu-chatbot.git',
      path: process.env.DEPLOY_PATH || '/var/www/hsu-chatbot',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      'ssh_options': 'StrictHostKeyChecking=no'
    },
    
    staging: {
      user: process.env.STAGING_USER || 'deploy',
      host: process.env.STAGING_HOST || 'localhost',
      ref: 'origin/develop',
      repo: process.env.DEPLOY_REPO || 'git@github.com:username/hsu-chatbot.git',
      path: process.env.STAGING_PATH || '/var/www/hsu-chatbot-staging',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env staging',
      'ssh_options': 'StrictHostKeyChecking=no'
    }
  }
};