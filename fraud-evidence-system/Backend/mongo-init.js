// mongo-init.js
// mongo-init.js

db = db.getSiblingDB("frauddb");

db.createUser({
  user: "admin",
  pwd: "__ADMIN_PASSWORD__",
  roles: [
    {
      role: "readWrite",
      db: "frauddb"
    }
  ]
});

// Optional: Create a collection and insert a sample document
db.users.insertOne({
  email: "aryangupta3103@gmail.com",
  role: "admin",
  createdAt: new Date()
});

