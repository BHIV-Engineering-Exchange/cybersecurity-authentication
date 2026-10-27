const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async (req, res, next) => {
  console.log("=== 🔐 ADMIN ONLY CHECK ===");

  let user = req.user;

  // Fallback: Try to decode JWT manually if req.user is not set
  if (!user) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        user = jwt.verify(token, process.env.JWT_SECRET);
        req.user = user; // assign for future use
        console.log("ℹ️ Decoded user from token:", user.email || user.id);
      } catch (err) {
        console.log("❌ Invalid token:", err.message);
        return res.status(403).json({ error: "Admin access required" });
      }
    }
  }

  if (!user) {
    console.log("❌ No user found");
    return res.status(403).json({ error: "Admin access required" });
  }

  try {
    // Get full user details from database to check role and permissions
    const fullUser = await User.findById(user.id || user._id);
    
    if (!fullUser) {
      console.log("❌ User not found in database:", user.email || user.id);
      return res.status(403).json({ error: "Admin access required" });
    }

    if (!fullUser.isActive) {
      console.log("❌ User account is deactivated:", fullUser.email);
      return res.status(403).json({ error: "Account is deactivated" });
    }

    // Check if user has admin or superadmin role
    if (!['admin', 'superadmin'].includes(fullUser.role)) {
      console.log("❌ Admin access denied for user:", fullUser.email, "Role:", fullUser.role);
      return res.status(403).json({ 
        error: "Admin access required",
        userRole: fullUser.role,
        requiredRoles: ['admin', 'superadmin']
      });
    }

    console.log("✅ Admin access granted to:", fullUser.email, "Role:", fullUser.role);
    req.currentUser = fullUser; // Add full user object for downstream use
    next();
  } catch (error) {
    console.error("❌ Error checking admin access:", error);
    return res.status(500).json({ error: "Admin access verification failed" });
  }
};
