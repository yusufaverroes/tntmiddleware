module.exports = {
    apps: [{
      name: 'your-nodejs-app',
      script: './your-nodejs-app.js',
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_restarts: 5,
      restart_delay: 1000,
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      pid_file: './logs/pid.log',
      events: {
        'exit': 'bash ./gpio_set_low.sh'
      }
    }]
  };
  