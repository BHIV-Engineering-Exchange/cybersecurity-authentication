// services/alertService.js
const axios = require("axios");
const { Kafka } = require("kafkajs");
const SibApiV3Sdk = require("sib-api-v3-sdk");
const Log = require("../models/Log");

// Load Brevo Email Setup
const brevoClient = SibApiV3Sdk.ApiClient.instance;
brevoClient.authentications["api-key"].apiKey = process.env.BREVO_API_KEY;
const brevoApi = new SibApiV3Sdk.TransactionalEmailsApi();

// Kafka configuration
const kafkaEnabled = process.env.KAFKA_ENABLED === "true";
let producer = null;
let consumer = null;
const inMemoryQueue = [];

// Kafka init
if (kafkaEnabled) {
  const kafka = new Kafka({
    clientId: "fraud-dashboard",
    brokers: [process.env.KAFKA_BROKER || "localhost:9092"],
  });

  producer = kafka.producer();
  consumer = kafka.consumer({ groupId: "fraud-dashboard-group" });

  (async () => {
    try {
      await producer.connect();
      await consumer.connect();
      await consumer.subscribe({ topic: "high-risk-alerts", fromBeginning: true });

      await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          const msg = message.value.toString();
          console.log(`💬 [Kafka Consumer] Received message: ${msg}`);
        },
      });

      console.log("✅ Kafka producer and consumer connected");
    } catch (err) {
      console.error("❌ [Kafka] Connection error:", err);
    }
  })();
} else {
  console.warn("⚠️ Kafka disabled — using in-memory fallback");
}

// ========== CORE ALERT PIPELINE ==========
async function alertPipeline(entityId, reportId) {
  const payload = {
    entityId,
    reportId,
    triggeredAt: new Date().toISOString(),
  };

  try {
    // Parallel alert tasks
    await Promise.all([
      sendWebhook(payload),
      sendBrevoEmail(entityId, reportId),
      Log.create({
        type: "high-risk-trigger",
        payload,
        createdAt: new Date(),
      }),
    ]);

    // Kafka or in-memory queue
    if (kafkaEnabled && producer) {
      await producer.send({
        topic: "high-risk-alerts",
        messages: [{ value: JSON.stringify(payload) }],
      });
      console.log("📤 [Kafka] Alert published");
    } else {
      inMemoryQueue.push(payload);
      console.log(`📥 [In-Memory] Alert queued. Queue length: ${inMemoryQueue.length}`);
    }

    console.log(`✅ [AlertPipeline] Completed for wallet ${entityId}`);
  } catch (err) {
    console.error("❌ [AlertPipeline] Failed:", err);
  }
}

// ========== IN-MEMORY QUEUE CONSUMER ==========
setInterval(() => {
  if (!kafkaEnabled && inMemoryQueue.length > 0) {
    const payload = inMemoryQueue.shift();
    console.log("💬 [In-Memory Consumer] Processed message:", payload);
  }
}, 5050);

// ========== SEND WEBHOOK ==========
async function sendWebhook(payload) {
  const webhookUrl = process.env.WEBHOOK_URL;
  if (!webhookUrl) {
    return console.warn("[Webhook] Skipped — no WEBHOOK_URL set.");
  }

  try {
    await axios.post(webhookUrl, {
      event: "High-Risk Flagged",
      data: payload
    });
    console.log("[Webhook] Sent successfully");
  } catch (err) {
    console.error("[Webhook] Failed:", err.message);
  }
}

// ========== SEND BREVO EMAIL ==========
async function sendBrevoEmail(entityId, reportId) {
  const recipient = process.env.ALERT_RECIPIENT_EMAIL;
  const sender = process.env.ALERT_SENDER_EMAIL;

  if (!recipient || !sender) {
    return console.warn("[Brevo] Missing ALERT_RECIPIENT_EMAIL or ALERT_SENDER_EMAIL");
  }

  const email = {
    to: [{ email: recipient }],
    sender: { email: sender, name: "Fraud Dashboard" },
    subject: "🚨 High-Risk Wallet Alert",
    htmlContent: `
      <h2>High-Risk Wallet Detected</h2>
      <p><strong>Wallet:</strong> ${entityId}</p>
      <p><strong>Report ID:</strong> ${reportId}</p>
      <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
    `,
  };

  try {
    await brevoApi.sendTransacEmail(email);
    console.log("[Brevo] Email sent successfully");
  } catch (err) {
    console.error("[Brevo] Failed to send email:", err.message);
  }
}

module.exports = { alertPipeline };
