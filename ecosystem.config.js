module.exports = {
    apps: [{
      name: 'middleware',
      script: './index.js',
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_restarts: 5,
      restart_delay: 5000,
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      pid_file: './logs/pid.log',
      events: {
        'exit': 'gpio24.sh'
      }
    }]
  };
  