module.exports = {
  apps: [
    {
      name: "fraud-dashboard-api",
      script: "./server.js",
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 5050,
        MONGO_URI: "mongodb://localhost:27017/fraudDB", // replace in production
        BREVO_USER: "you@yourverifieddomain.com",
        BREVO_PASS: "your-brevo-password",
        BREVO_API_KEY: "your-brevo-api-key-here",
        ALERT_RECIPIENTS: "aryangupta3103@gmail.com",
        WEBHOOK_URL: "https://webhook.site/ac6befe4-6367-4bb2-8ae6-5eb2241f3e65"
      }
    }
  ]
};
