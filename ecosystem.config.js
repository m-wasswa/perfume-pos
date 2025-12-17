module.exports = {
  apps: [{
    name: 'perfume-pos',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: '/var/www/perfume-pos',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 8547
    }
  }]
}
