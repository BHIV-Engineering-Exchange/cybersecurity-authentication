//middleware/auth.js
const jwt = require("jsonwebtoken");
const User = require('../models/User');

const publicRoutes = [
  "/api/escalate",
  "/simulate-rbi-alert",
  "/health",
  "/test",
  "/api/test/features",
  "/api/test/evidence",
  "/api/test/investigations",
  "/api/flag"  // Allow flag endpoint for testing
];

module.exports = async (req, res, next) => {
  // Skip authentication for public routes
  if (publicRoutes.includes(req.path) || req.path.startsWith('/api/test/')) {
    console.log("🔓 Public route, skipping auth:", req.path);
    return next();
  }

  console.log("=== AUTH DEBUG ===");
  const authHeader = req.headers["authorization"];
  console.log("Authorization header:", authHeader);

  if (!authHeader) {
    console.log("❌ Missing Authorization header");
    return res.status(403).json({ message: "No authorization header" });
  }

  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    console.log("❌ Invalid Authorization format");
    return res.status(403).json({ message: "Invalid authorization format" });
  }

  try {
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      console.error("❌ JWT secret not defined in environment");
      return res.status(500).json({ message: "Server configuration error" });
    }

    // Verify JWT token (local format, not Supabase)
    const payload = jwt.verify(token, jwtSecret);

    console.log("✅ JWT verified:", {
      userId: payload.userId,
      role: payload.role
    });

    // Get full user details from database
    const user = await User.findById(payload.userId).select('-password');
    if (!user) {
      console.log("❌ User not found in database:", payload.userId);
      return res.status(403).json({ message: "User not found" });
    }

    // Attach user information to request
    req.user = {
      id: user._id,
      email: user.email,
      role: user.role,
      permissions: user.permissions || [],
      isActive: user.isActive !== false // default to true if not set
    };

    console.log("✅ User authenticated:", {
      email: req.user.email,
      role: req.user.role,
      permissions: req.user.permissions.length
    });

    next();
  } catch (err) {
    console.error("❌ JWT verification failed:", err.message);
    return res.status(403).json({ message: "Invalid token" });
  }
};
