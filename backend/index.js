require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("./config/db");
const admin = require("./config/firebaseAdmin");
const PORT = process.env.PORT || 8080;

const app = express();

app.use(express.json());
const allowedOrigins = [
  "http://localhost:3000",
  "https://ai-cost-smart-saas-frontend.onrender.com",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

// ============================================================
// ─── MIDDLEWARE ──────────────────────────────────────────────
// ============================================================

// ─── Auth Middleware ──────────────────────────────────────────
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided." });

  jwt.verify(token, process.env.JWT_SECRET || "secret", (err, user) => {
    if (err)
      return res.status(403).json({ message: "Invalid or expired token." });
    req.user = user;
    next();
  });
};

// ─── Admin Middleware ──────────────────────────────────────────
const isAdmin = async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT role FROM users WHERE user_id = $1",
      [req.user.user_id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Pengguna tidak dijumpai." });
    }
    if (
      result.rows[0].role !== "admin" &&
      result.rows[0].role !== "super_admin"
    ) {
      return res
        .status(403)
        .json({ message: "Akses ditolak. Hanya untuk admin." });
    }
    next();
  } catch (err) {
    console.error("ADMIN MIDDLEWARE ERROR:", err);
    res.status(500).json({ message: "Server error." });
  }
};

// ─── Super Admin Middleware ────────────────────────────────────
const isSuperAdmin = async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT role FROM users WHERE user_id = $1",
      [req.user.user_id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Pengguna tidak dijumpai." });
    }
    if (result.rows[0].role !== "super_admin") {
      return res
        .status(403)
        .json({ message: "Akses ditolak. Hanya untuk Super Admin." });
    }
    next();
  } catch (err) {
    console.error("SUPER ADMIN MIDDLEWARE ERROR:", err);
    res.status(500).json({ message: "Server error." });
  }
};

// ─── Admin or Super Admin Middleware ──────────────────────────
const isAdminOrSuper = async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT role FROM users WHERE user_id = $1",
      [req.user.user_id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Pengguna tidak dijumpai." });
    }
    const role = result.rows[0].role;
    if (role !== "admin" && role !== "super_admin") {
      return res.status(403).json({
        message: "Akses ditolak. Hanya untuk Admin atau Super Admin.",
      });
    }
    next();
  } catch (err) {
    console.error("ADMIN MIDDLEWARE ERROR:", err);
    res.status(500).json({ message: "Server error." });
  }
};

// ============================================================
// ─── HELPERS ──────────────────────────────────────────────────
// ============================================================

const getBusinessId = async (req, res) => {
  const bizResult = await pool.query(
    "SELECT business_id FROM business WHERE user_id = $1",
    [req.user.user_id],
  );
  if (bizResult.rows.length === 0) {
    res.status(404).json({ message: "Tiada perniagaan dijumpai." });
    return null;
  }
  return bizResult.rows[0].business_id;
};

const generateId = async (table, idColumn, prefix) => {
  const result = await pool.query(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(${idColumn} FROM 4) AS INTEGER)), 0) + 1 AS next_num FROM ${table}`,
  );
  const num = result.rows[0].next_num;
  return `${prefix}${String(num).padStart(3, "0")}`;
};

const recalcMargin = async (product_id) => {
  try {
    const prodRes = await pool.query(
      "SELECT selling_price FROM products WHERE product_id = $1",
      [product_id],
    );
    if (prodRes.rows.length === 0) return;
    const sellingPrice = parseFloat(prodRes.rows[0].selling_price);
    if (sellingPrice <= 0) return;

    const unitsRes = await pool.query(
      `SELECT COALESCE(MAX(units_produced), 0) AS units_produced
       FROM productions
       WHERE product_id = $1 AND units_produced > 0`,
      [product_id],
    );
    const unitsProduced = parseInt(unitsRes.rows[0].units_produced) || 0;
    if (unitsProduced <= 0) {
      await pool.query(
        "UPDATE products SET margin_percentage = 0 WHERE product_id = $1",
        [product_id],
      );
      return;
    }

    const bahanRes = await pool.query(
      "SELECT COALESCE(SUM(total_cost), 0) AS total FROM productions WHERE product_id = $1",
      [product_id],
    );
    const bahanTotal = parseFloat(bahanRes.rows[0].total);

    const varCostRes = await pool.query(
      `SELECT COALESCE(SUM(total_cost), 0) AS total
       FROM costs
       WHERE product_id = $1 AND behavior = 'variable'`,
      [product_id],
    );
    const varCostTotal = parseFloat(varCostRes.rows[0].total);

    const totalVariableCost = bahanTotal + varCostTotal;
    const variableCostPerUnit = totalVariableCost / unitsProduced;
    const cmPerUnit = sellingPrice - variableCostPerUnit;
    const marginPct = (cmPerUnit / sellingPrice) * 100;

    await pool.query(
      "UPDATE products SET margin_percentage = $1 WHERE product_id = $2",
      [parseFloat(marginPct.toFixed(2)), product_id],
    );

    console.log(
      `[recalcMargin] product=${product_id} | units=${unitsProduced} | ` +
        `varCost/unit=${variableCostPerUnit.toFixed(4)} | CM/unit=${cmPerUnit.toFixed(4)} | margin=${marginPct.toFixed(2)}%`,
    );
  } catch (err) {
    console.error("RECALC MARGIN ERROR:", err);
  }
};

// ============================================================
// ─── USER AUTH ENDPOINTS ──────────────────────────────────────
// ============================================================

// ─── Google Auth ──────────────────────────────────────────────
app.post("/auth/google", async (req, res) => {
  const client = await pool.connect();
  try {
    const { token, inviteToken, businessId } = req.body;
    if (!token) return res.status(400).json({ message: "No token provided." });

    const decoded = await admin.auth().verifyIdToken(token);
    const { email, name, uid } = decoded;

    let role = "user";
    let business_id = null;

    if (inviteToken && businessId) {
      const inviteCheck = await client.query(
        `SELECT * FROM invites 
         WHERE token = $1 AND business_id = $2 AND used = false 
         AND expires_at > NOW()`,
        [inviteToken, businessId],
      );

      if (inviteCheck.rows.length === 0) {
        return res.status(400).json({
          message: "Pautan jemputan tidak sah atau sudah tamat tempoh.",
        });
      }

      await client.query("UPDATE invites SET used = true WHERE token = $1", [
        inviteToken,
      ]);

      role = "staff";
      business_id = businessId;
    }

    await client.query("BEGIN");

    const result = await client.query(
      "SELECT * FROM users WHERE LOWER(email) = LOWER($1) OR google_uid = $2",
      [email, uid],
    );

    let user;

    if (result.rows.length === 0) {
      const newUser = await client.query(
        `INSERT INTO users (name, email, password, role, provider, google_uid, business_id)
         VALUES ($1, $2, NULL, $3, $4, $5, $6)
         RETURNING user_id, name, email, role, created_at, provider, business_id`,
        [name, email, role, "google", uid, business_id],
      );
      user = newUser.rows[0];
    } else {
      user = result.rows[0];
      if (!user.google_uid) {
        await client.query(
          `UPDATE users 
           SET google_uid = $1, 
               provider = CASE 
                 WHEN provider = 'local' THEN 'both' 
                 ELSE provider 
               END,
               name = COALESCE($2, name),
               business_id = COALESCE($3, business_id)
           WHERE user_id = $4`,
          [uid, name, business_id || user.business_id, user.user_id],
        );
        user.google_uid = uid;
        user.provider = user.provider === "local" ? "both" : user.provider;
        user.name = name || user.name;
        user.business_id = business_id || user.business_id;
      }
    }

    await client.query("COMMIT");

    const jwtToken = jwt.sign(
      { user_id: user.user_id },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "1d" },
    );

    res.json({
      message: "Google login berjaya.",
      token: jwtToken,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
        provider: user.provider,
        business_id: user.business_id,
      },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("GOOGLE AUTH ERROR:", err);
    res.status(401).json({ message: "Token Google tidak sah." });
  } finally {
    client.release();
  }
});

// ─── Link Google Account ──────────────────────────────────────
app.post("/auth/link-google", authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: "No token provided." });

    const decoded = await admin.auth().verifyIdToken(token);
    const { email, name, uid } = decoded;

    const currentUserId = req.user.user_id;

    const uidCheck = await client.query(
      "SELECT user_id, email FROM users WHERE google_uid = $1 AND user_id != $2",
      [uid, currentUserId],
    );

    let googleUserId = null;
    let googleBusinessId = null;

    if (uidCheck.rows.length > 0) {
      const otherUser = uidCheck.rows[0];
      if (otherUser.email.toLowerCase() === email.toLowerCase()) {
        googleUserId = otherUser.user_id;
        const bizRes = await client.query(
          "SELECT business_id FROM business WHERE user_id = $1",
          [googleUserId],
        );
        if (bizRes.rows.length > 0) {
          googleBusinessId = bizRes.rows[0].business_id;
        }
      } else {
        return res.status(400).json({
          message: "Akaun Google ini sudah dipautkan dengan akaun lain.",
        });
      }
    }

    if (!googleUserId) {
      const googleUser = await client.query(
        `SELECT u.user_id, b.business_id 
         FROM users u 
         LEFT JOIN business b ON u.user_id = b.user_id 
         WHERE u.email = $1 
           AND u.provider = 'google' 
           AND u.user_id != $2`,
        [email, currentUserId],
      );
      if (googleUser.rows.length > 0) {
        googleUserId = googleUser.rows[0].user_id;
        googleBusinessId = googleUser.rows[0].business_id;
      }
    }

    await client.query("BEGIN");

    if (googleUserId) {
      const currentBusiness = await client.query(
        "SELECT business_id FROM business WHERE user_id = $1",
        [currentUserId],
      );

      if (currentBusiness.rows.length === 0 && googleBusinessId) {
        await client.query(
          "UPDATE business SET user_id = $1 WHERE business_id = $2",
          [currentUserId, googleBusinessId],
        );
      } else if (currentBusiness.rows.length > 0 && googleBusinessId) {
        const currentBizId = currentBusiness.rows[0].business_id;
        await client.query(
          "UPDATE products SET business_id = $1 WHERE business_id = $2",
          [currentBizId, googleBusinessId],
        );
        await client.query("DELETE FROM business WHERE business_id = $1", [
          googleBusinessId,
        ]);
      }
    }

    const currentCheck = await client.query(
      "SELECT google_uid FROM users WHERE user_id = $1",
      [currentUserId],
    );
    if (!currentCheck.rows[0].google_uid) {
      await client.query(
        `UPDATE users 
         SET google_uid = $1, 
             provider = CASE 
               WHEN provider = 'local' THEN 'both' 
               ELSE provider 
             END,
             name = COALESCE($2, name)
         WHERE user_id = $3`,
        [uid, name, currentUserId],
      );
    }

    if (googleUserId) {
      await client.query("DELETE FROM users WHERE user_id = $1", [
        googleUserId,
      ]);
    }

    await client.query("COMMIT");

    const updated = await client.query(
      "SELECT user_id, name, email, role, provider FROM users WHERE user_id = $1",
      [currentUserId],
    );

    res.json({
      message: "Akaun Google berjaya dipautkan dan digabungkan.",
      user: updated.rows[0],
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("LINK GOOGLE ERROR:", err);
    res.status(500).json({ message: "Server error." });
  } finally {
    client.release();
  }
});

// ─── Register ──────────────────────────────────────────────────
app.post("/register", async (req, res) => {
  const client = await pool.connect();
  try {
    const { name, email, password, inviteToken, businessId } = req.body;
    if (!name || !email || !password)
      return res
        .status(400)
        .json({ message: "Sila lengkapkan semua maklumat." });

    if (password.length < 6)
      return res
        .status(400)
        .json({ message: "Kata laluan mesti sekurang-kurangnya 6 aksara." });

    const userExists = await pool.query(
      "SELECT user_id FROM users WHERE email = $1",
      [email],
    );
    if (userExists.rows.length > 0)
      return res.status(400).json({ message: "E-mel sudah didaftarkan." });

    let role = "user";
    let business_id = null;

    if (inviteToken && businessId) {
      const inviteCheck = await client.query(
        `SELECT * FROM invites 
         WHERE token = $1 AND business_id = $2 AND used = false 
         AND expires_at > NOW()`,
        [inviteToken, businessId],
      );

      if (inviteCheck.rows.length === 0) {
        return res.status(400).json({
          message: "Pautan jemputan tidak sah atau sudah tamat tempoh.",
        });
      }

      await client.query("UPDATE invites SET used = true WHERE token = $1", [
        inviteToken,
      ]);

      role = "staff";
      business_id = businessId;
    }

    await client.query("BEGIN");

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await client.query(
      `INSERT INTO users (name, email, password, role, provider, business_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING user_id, name, email, role, created_at, business_id`,
      [name, email, hashedPassword, role, "local", business_id],
    );

    await client.query("COMMIT");

    res.status(201).json({
      message: "Akaun berjaya dicipta.",
      user: newUser.rows[0],
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("REGISTER ERROR:", err);
    res.status(500).json({ message: "Server error." });
  } finally {
    client.release();
  }
});

// ─── Login ─────────────────────────────────────────────────────
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res
        .status(400)
        .json({ message: "Sila masukkan e-mel dan kata laluan." });

    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    if (result.rows.length === 0)
      return res
        .status(400)
        .json({ message: "E-mel atau kata laluan tidak sah." });

    const user = result.rows[0];

    if (user.provider === "google" && !user.password) {
      return res.status(400).json({
        message:
          "Akaun ini didaftarkan melalui Google. Sila log masuk dengan Google.",
      });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res
        .status(400)
        .json({ message: "E-mel atau kata laluan tidak sah." });

    const token = jwt.sign(
      { user_id: user.user_id },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "1d" },
    );

    return res.json({
      message: "Log masuk berjaya.",
      token,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// ─── Get Current User ─────────────────────────────────────────
app.get("/me", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT user_id, name, email, role, created_at, contact, gender, provider FROM users WHERE user_id = $1",
      [req.user.user_id],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: "Pengguna tidak dijumpai." });
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error("GET ME ERROR:", err);
    res.status(500).json({ message: "Server error." });
  }
});

// ─── Update User Profile ──────────────────────────────────────
app.put("/me", authenticateToken, async (req, res) => {
  try {
    const { name, email, contact, gender } = req.body;
    const user_id = req.user.user_id;

    if (email) {
      const existing = await pool.query(
        "SELECT user_id FROM users WHERE email = $1 AND user_id != $2",
        [email, user_id],
      );
      if (existing.rows.length > 0) {
        return res.status(400).json({ message: "E-mel sudah digunakan." });
      }
    }

    let query = "UPDATE users SET ";
    const params = [];
    let idx = 1;

    if (name) {
      query += `name = $${idx}, `;
      params.push(name);
      idx++;
    }
    if (email) {
      query += `email = $${idx}, `;
      params.push(email);
      idx++;
    }
    if (contact !== undefined) {
      query += `contact = $${idx}, `;
      params.push(contact);
      idx++;
    }
    if (gender) {
      query += `gender = $${idx}, `;
      params.push(gender);
      idx++;
    }

    query = query.slice(0, -2);
    query += ` WHERE user_id = $${idx} RETURNING user_id, name, email, role, contact, gender, provider`;
    params.push(user_id);

    const result = await pool.query(query, params);
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error("UPDATE USER ERROR:", err);
    res.status(500).json({ message: "Server error." });
  }
});

// ─── Change Password ──────────────────────────────────────────
app.post("/change-password", authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user_id = req.user.user_id;

    const result = await pool.query(
      "SELECT password FROM users WHERE user_id = $1",
      [user_id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Pengguna tidak dijumpai." });
    }
    const user = result.rows[0];

    if (!user.password) {
      return res
        .status(400)
        .json({ message: "Akaun Google tidak mempunyai kata laluan." });
    }

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      return res.status(400).json({ message: "Kata laluan semasa tidak sah." });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE users SET password = $1 WHERE user_id = $2", [
      hashed,
      user_id,
    ]);

    res.json({ message: "Kata laluan berjaya ditukar." });
  } catch (err) {
    console.error("CHANGE PASSWORD ERROR:", err);
    res.status(500).json({ message: "Server error." });
  }
});

// ============================================================
// ─── BUSINESS ENDPOINTS ──────────────────────────────────────
// ============================================================

// ─── Get Business ─────────────────────────────────────────────
app.get("/business", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM business WHERE user_id = $1",
      [req.user.user_id],
    );
    res.json({ business: result.rows[0] || null });
  } catch (err) {
    console.error("GET BUSINESS ERROR:", err);
    res.status(500).json({ message: "Server error." });
  }
});

// ─── Register Business ────────────────────────────────────────
app.post("/business", authenticateToken, async (req, res) => {
  try {
    const { name, description, type } = req.body;
    if (!name || !description || !type)
      return res
        .status(400)
        .json({ message: "Sila lengkapkan semua maklumat." });

    if (!["home", "stall", "dropship"].includes(type))
      return res.status(400).json({ message: "Jenis perniagaan tidak sah." });

    const existing = await pool.query(
      "SELECT business_id FROM business WHERE user_id = $1",
      [req.user.user_id],
    );
    if (existing.rows.length > 0)
      return res
        .status(400)
        .json({ message: "Anda sudah mendaftarkan perniagaan." });

    const business_id = await generateId("business", "business_id", "bsi");

    const result = await pool.query(
      `INSERT INTO business (business_id, user_id, name, description, type)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [business_id, req.user.user_id, name, description, type],
    );

    res.status(201).json({
      message: "Perniagaan berjaya didaftarkan.",
      business: result.rows[0],
    });
  } catch (err) {
    console.error("REGISTER BUSINESS ERROR:", err);
    res.status(500).json({ message: "Server error." });
  }
});

// ─── Update Business ──────────────────────────────────────────
app.put("/business", authenticateToken, async (req, res) => {
  try {
    const { name, description, type } = req.body;
    const user_id = req.user.user_id;

    const bizResult = await pool.query(
      "SELECT business_id FROM business WHERE user_id = $1",
      [user_id],
    );
    if (bizResult.rows.length === 0) {
      return res.status(404).json({ message: "Perniagaan tidak dijumpai." });
    }
    const business_id = bizResult.rows[0].business_id;

    let query = "UPDATE business SET ";
    const params = [];
    let idx = 1;

    if (name) {
      query += `name = $${idx}, `;
      params.push(name);
      idx++;
    }
    if (description) {
      query += `description = $${idx}, `;
      params.push(description);
      idx++;
    }
    if (type) {
      if (!["home", "stall", "dropship"].includes(type)) {
        return res.status(400).json({ message: "Jenis perniagaan tidak sah." });
      }
      query += `type = $${idx}, `;
      params.push(type);
      idx++;
    }

    query = query.slice(0, -2);
    query += ` WHERE business_id = $${idx} RETURNING *`;
    params.push(business_id);

    const result = await pool.query(query, params);
    res.json({ business: result.rows[0] });
  } catch (err) {
    console.error("UPDATE BUSINESS ERROR:", err);
    res.status(500).json({ message: "Server error." });
  }
});

// ─── Get Staff List ───────────────────────────────────────────
app.get("/business/staff", authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.user_id;

    const userCheck = await pool.query(
      "SELECT role FROM users WHERE user_id = $1",
      [user_id],
    );
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: "Pengguna tidak dijumpai." });
    }
    if (
      userCheck.rows[0].role !== "business_owner" &&
      userCheck.rows[0].role !== "admin"
    ) {
      return res.status(403).json({
        message: "Hanya pemilik perniagaan boleh melihat senarai staff.",
      });
    }

    const bizResult = await pool.query(
      "SELECT business_id FROM business WHERE user_id = $1",
      [user_id],
    );
    if (bizResult.rows.length === 0) {
      return res.status(404).json({ message: "Perniagaan tidak dijumpai." });
    }
    const business_id = bizResult.rows[0].business_id;

    const result = await pool.query(
      "SELECT user_id, name, email, role FROM users WHERE business_id = $1 AND role = 'staff' ORDER BY name ASC",
      [business_id],
    );

    res.json({ staff: result.rows });
  } catch (err) {
    console.error("GET STAFF ERROR:", err);
    res.status(500).json({ message: "Server error." });
  }
});

// ─── Generate Staff Invite ────────────────────────────────────
app.post("/business/generate-invite", authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.user_id;

    const userCheck = await pool.query(
      "SELECT role FROM users WHERE user_id = $1",
      [user_id],
    );
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: "Pengguna tidak dijumpai." });
    }
    if (
      userCheck.rows[0].role !== "business_owner" &&
      userCheck.rows[0].role !== "admin"
    ) {
      return res
        .status(403)
        .json({ message: "Hanya pemilik perniagaan boleh menjana pautan." });
    }

    const bizResult = await pool.query(
      "SELECT business_id FROM business WHERE user_id = $1",
      [user_id],
    );
    if (bizResult.rows.length === 0) {
      return res.status(404).json({ message: "Perniagaan tidak dijumpai." });
    }
    const business_id = bizResult.rows[0].business_id;

    const crypto = require("crypto");
    const token = crypto.randomBytes(32).toString("hex");

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invite_id = await generateId("invites", "invite_id", "inv");

    await pool.query(
      `INSERT INTO invites (invite_id, business_id, token, email, used, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [invite_id, business_id, token, null, false, expiresAt],
    );

    const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const inviteLink = `${baseUrl}/register?invite=${token}&business=${business_id}`;

    res.json({ inviteLink });
  } catch (err) {
    console.error("GENERATE INVITE ERROR:", err);
    res.status(500).json({ message: "Server error." });
  }
});

// ─── Get Existing Invite Link ─────────────────────────────────
app.get("/business/invite-link", authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.user_id;

    const userCheck = await pool.query(
      "SELECT role FROM users WHERE user_id = $1",
      [user_id],
    );
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: "Pengguna tidak dijumpai." });
    }
    if (
      userCheck.rows[0].role !== "business_owner" &&
      userCheck.rows[0].role !== "admin"
    ) {
      return res
        .status(403)
        .json({ message: "Hanya pemilik perniagaan boleh mengakses pautan." });
    }

    const bizResult = await pool.query(
      "SELECT business_id FROM business WHERE user_id = $1",
      [user_id],
    );
    if (bizResult.rows.length === 0) {
      return res.status(404).json({ message: "Perniagaan tidak dijumpai." });
    }
    const business_id = bizResult.rows[0].business_id;

    const result = await pool.query(
      `SELECT token, expires_at 
       FROM invites 
       WHERE business_id = $1 AND used = false AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [business_id],
    );

    if (result.rows.length === 0) {
      return res.json({ inviteLink: null });
    }

    const token = result.rows[0].token;
    const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const inviteLink = `${baseUrl}/register?invite=${token}&business=${business_id}`;

    res.json({ inviteLink });
  } catch (err) {
    console.error("GET INVITE LINK ERROR:", err);
    res.status(500).json({ message: "Server error." });
  }
});

// ─── Verify Invite Token ──────────────────────────────────────
app.get("/invites/verify", async (req, res) => {
  try {
    const { token, business } = req.query;
    if (!token || !business) {
      return res
        .status(400)
        .json({ message: "Token dan business diperlukan." });
    }

    const result = await pool.query(
      `SELECT * FROM invites 
       WHERE token = $1 AND business_id = $2 AND used = false 
       AND expires_at > NOW()`,
      [token, business],
    );

    if (result.rows.length === 0) {
      return res
        .status(400)
        .json({ message: "Pautan tidak sah atau sudah tamat tempoh." });
    }

    res.json({ valid: true, business_id: business });
  } catch (err) {
    console.error("VERIFY INVITE ERROR:", err);
    res.status(500).json({ message: "Server error." });
  }
});

// ============================================================
// ─── PRODUCT ENDPOINTS ────────────────────────────────────────
// ============================================================

// ─── Home Stats ───────────────────────────────────────────────
app.get("/home/stats", authenticateToken, async (req, res) => {
  try {
    const bizResult = await pool.query(
      "SELECT business_id FROM business WHERE user_id = $1",
      [req.user.user_id],
    );
    if (bizResult.rows.length === 0) return res.json({ hasBusiness: false });

    const business_id = bizResult.rows[0].business_id;

    const [kosResult, marginResult, productCountResult, latestProductsResult] =
      await Promise.all([
        pool.query(
          "SELECT COALESCE(SUM(total_cost), 0) as total FROM costs WHERE business_id = $1",
          [business_id],
        ),
        pool.query(
          "SELECT COALESCE(ROUND(AVG(margin_percentage)::numeric, 1), 0) as avg_margin FROM products WHERE business_id = $1",
          [business_id],
        ),
        pool.query(
          "SELECT COUNT(*) as count FROM products WHERE business_id = $1",
          [business_id],
        ),
        pool.query(
          "SELECT name, selling_price, margin_percentage FROM products WHERE business_id = $1 ORDER BY created_at DESC LIMIT 3",
          [business_id],
        ),
      ]);

    res.json({
      hasBusiness: true,
      business_id,
      totalKos: parseFloat(kosResult.rows[0].total),
      marginPurata: parseFloat(marginResult.rows[0].avg_margin),
      totalProducts: parseInt(productCountResult.rows[0].count),
      latestProducts: latestProductsResult.rows,
    });
  } catch (err) {
    console.error("HOME STATS ERROR:", err);
    res.status(500).json({ message: "Server error." });
  }
});

// ─── Get All Products ─────────────────────────────────────────
app.get("/products", authenticateToken, async (req, res) => {
  try {
    const business_id = await getBusinessId(req, res);
    if (!business_id) return;

    const result = await pool.query(
      "SELECT * FROM products WHERE business_id = $1 ORDER BY name ASC",
      [business_id],
    );
    res.json({ products: result.rows });
  } catch (err) {
    console.error("GET PRODUCTS ERROR:", err);
    res.status(500).json({ message: "Server error." });
  }
});

// ─── Add Product ──────────────────────────────────────────────
app.post("/products", authenticateToken, async (req, res) => {
  try {
    const { name, description, selling_price, image_url, sale_unit } = req.body;

    if (!name || !selling_price)
      return res
        .status(400)
        .json({ message: "Sila lengkapkan nama dan harga jual." });

    const bizResult = await pool.query(
      "SELECT business_id FROM business WHERE user_id = $1",
      [req.user.user_id],
    );
    if (bizResult.rows.length === 0)
      return res.status(404).json({ message: "Tiada perniagaan dijumpai." });

    const business_id = bizResult.rows[0].business_id;
    const product_id = await generateId("products", "product_id", "prd");

    const saleUnit = sale_unit || "unit";

    const result = await pool.query(
      `INSERT INTO products (product_id, business_id, name, description, selling_price, margin_percentage, image_url, sale_unit)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        product_id,
        business_id,
        name,
        description || null,
        parseFloat(selling_price),
        0,
        image_url || null,
        saleUnit,
      ],
    );

    res.status(201).json({ product: result.rows[0] });
  } catch (err) {
    console.error("ADD PRODUCT ERROR:", err);
    res.status(500).json({ message: "Server error." });
  }
});

// ─── Get Single Product ──────────────────────────────────────
app.get("/products/:product_id", authenticateToken, async (req, res) => {
  try {
    const { product_id } = req.params;
    const result = await pool.query(
      "SELECT * FROM products WHERE product_id = $1",
      [product_id],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: "Produk tidak dijumpai." });
    res.json({ product: result.rows[0] });
  } catch (err) {
    console.error("GET PRODUCT ERROR:", err);
    res.status(500).json({ message: "Server error." });
  }
});

// ─── Edit Product ─────────────────────────────────────────────
app.put("/products/:product_id", authenticateToken, async (req, res) => {
  try {
    const { product_id } = req.params;
    const { name, description, selling_price, image_url, sale_unit } = req.body;

    if (!selling_price || isNaN(parseFloat(selling_price)))
      return res
        .status(400)
        .json({ message: "Harga jual mesti nombor yang sah." });

    const saleUnit = sale_unit || "unit";

    const result = await pool.query(
      `UPDATE products
       SET name=$1, description=$2, selling_price=$3, image_url=$4, sale_unit=$5
       WHERE product_id=$6 RETURNING *`,
      [
        name,
        description || null,
        parseFloat(selling_price),
        image_url || null,
        saleUnit,
        product_id,
      ],
    );

    if (result.rows.length === 0)
      return res.status(404).json({ message: "Produk tidak dijumpai." });

    await recalcMargin(product_id);

    const updated = await pool.query(
      "SELECT * FROM products WHERE product_id = $1",
      [product_id],
    );

    res.json({ product: updated.rows[0] });
  } catch (err) {
    console.error("EDIT PRODUCT ERROR:", err);
    res.status(500).json({ message: "Server error." });
  }
});

// ─── Delete Product ───────────────────────────────────────────
app.delete("/products/:product_id", authenticateToken, async (req, res) => {
  try {
    const { product_id } = req.params;
    await pool.query("DELETE FROM productions WHERE product_id = $1", [
      product_id,
    ]);
    await pool.query("DELETE FROM costs WHERE product_id = $1", [product_id]);
    await pool.query("DELETE FROM products WHERE product_id = $1", [
      product_id,
    ]);
    res.json({ message: "Produk berjaya dipadam." });
  } catch (err) {
    console.error("DELETE PRODUCT ERROR:", err);
    res.status(500).json({ message: "Server error." });
  }
});

// ============================================================
// ─── COSTS ENDPOINTS ─────────────────────────────────────────
// ============================================================

// ─── Get Costs by Product ─────────────────────────────────────
app.get("/products/:product_id/costs", authenticateToken, async (req, res) => {
  try {
    const { product_id } = req.params;
    const result = await pool.query(
      "SELECT * FROM costs WHERE product_id = $1 ORDER BY created_at DESC",
      [product_id],
    );
    res.json({ costs: result.rows });
  } catch (err) {
    console.error("GET COSTS ERROR:", err);
    res.status(500).json({ message: "Server error." });
  }
});

// ─── Add Cost ──────────────────────────────────────────────────
app.post("/products/:product_id/costs", authenticateToken, async (req, res) => {
  try {
    const { product_id } = req.params;
    const { name, type, behavior, cost_per_unit, total_cost } = req.body;

    if (!name || !type || !behavior)
      return res
        .status(400)
        .json({ message: "Sila lengkapkan semua maklumat." });

    if (
      cost_per_unit == null ||
      isNaN(parseFloat(cost_per_unit)) ||
      total_cost == null ||
      isNaN(parseFloat(total_cost))
    )
      return res.status(400).json({
        message: "Kos per unit dan jumlah kos mesti nombor yang sah.",
      });

    if (!["tenaga", "indirect"].includes(type))
      return res.status(400).json({ message: "Jenis kos tidak sah." });

    const business_id = await getBusinessId(req, res);
    if (!business_id) return;

    const costs_id = await generateId("costs", "costs_id", "cst");

    const result = await pool.query(
      `INSERT INTO costs (costs_id, business_id, product_id, name, type, behavior, cost_per_unit, total_cost)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        costs_id,
        business_id,
        product_id,
        name,
        type,
        behavior,
        parseFloat(cost_per_unit),
        parseFloat(total_cost),
      ],
    );

    await recalcMargin(product_id);

    res.status(201).json({ cost: result.rows[0] });
  } catch (err) {
    console.error("ADD COST ERROR:", err);
    res.status(500).json({ message: "Server error." });
  }
});

// ─── Update Cost ──────────────────────────────────────────────
app.put("/costs/:costs_id", authenticateToken, async (req, res) => {
  try {
    const { costs_id } = req.params;
    const { name, behavior, cost_per_unit, total_cost } = req.body;

    if (isNaN(parseFloat(cost_per_unit)) || isNaN(parseFloat(total_cost)))
      return res.status(400).json({
        message: "Kos per unit dan jumlah kos mesti nombor yang sah.",
      });

    const result = await pool.query(
      `UPDATE costs SET name=$1, behavior=$2, cost_per_unit=$3, total_cost=$4
       WHERE costs_id=$5 RETURNING *`,
      [
        name,
        behavior,
        parseFloat(cost_per_unit),
        parseFloat(total_cost),
        costs_id,
      ],
    );

    if (result.rows.length === 0)
      return res.status(404).json({ message: "Kos tidak dijumpai." });

    await recalcMargin(result.rows[0].product_id);

    res.json({ cost: result.rows[0] });
  } catch (err) {
    console.error("UPDATE COST ERROR:", err);
    res.status(500).json({ message: "Server error." });
  }
});

// ─── Delete Cost ──────────────────────────────────────────────
app.delete("/costs/:costs_id", authenticateToken, async (req, res) => {
  try {
    const { costs_id } = req.params;

    const existing = await pool.query(
      "SELECT product_id FROM costs WHERE costs_id = $1",
      [costs_id],
    );

    await pool.query("DELETE FROM costs WHERE costs_id = $1", [costs_id]);

    if (existing.rows.length > 0) {
      await recalcMargin(existing.rows[0].product_id);
    }

    res.json({ message: "Kos berjaya dipadam." });
  } catch (err) {
    console.error("DELETE COST ERROR:", err);
    res.status(500).json({ message: "Server error." });
  }
});

// ============================================================
// ─── PRODUCTIONS ENDPOINTS ────────────────────────────────────
// ============================================================

// ─── Get Productions by Product ──────────────────────────────
app.get(
  "/products/:product_id/productions",
  authenticateToken,
  async (req, res) => {
    try {
      const { product_id } = req.params;
      const result = await pool.query(
        "SELECT * FROM productions WHERE product_id = $1 ORDER BY created_at DESC",
        [product_id],
      );
      res.json({ productions: result.rows });
    } catch (err) {
      console.error("GET PRODUCTIONS ERROR:", err);
      res.status(500).json({ message: "Server error." });
    }
  },
);

// ─── Add Production ───────────────────────────────────────────
app.post(
  "/products/:product_id/productions",
  authenticateToken,
  async (req, res) => {
    try {
      const { product_id } = req.params;
      const {
        name,
        quantity,
        unit,
        cost_per_unit,
        total_cost,
        units_produced,
        batch_date,
        purchase_price,
        purchase_qty,
        purchase_unit,
      } = req.body;

      if (!name)
        return res
          .status(400)
          .json({ message: "Sila lengkapkan semua maklumat." });

      if (
        quantity == null ||
        isNaN(parseFloat(quantity)) ||
        parseFloat(quantity) <= 0
      )
        return res
          .status(400)
          .json({ message: "Kuantiti mesti nombor positif." });

      if (
        cost_per_unit == null ||
        isNaN(parseFloat(cost_per_unit)) ||
        total_cost == null ||
        isNaN(parseFloat(total_cost))
      )
        return res.status(400).json({
          message: "Kos per unit dan jumlah kos mesti nombor yang sah.",
        });

      const parsedUnits = parseInt(units_produced);
      if (!units_produced || isNaN(parsedUnits) || parsedUnits <= 0)
        return res
          .status(400)
          .json({ message: "Bilangan unit dihasilkan mesti nombor positif." });

      const production_id = await generateId(
        "productions",
        "production_id",
        "pro",
      );

      const result = await pool.query(
        `INSERT INTO productions
       (production_id, product_id, name, quantity, unit, cost_per_unit, total_cost, units_produced, batch_date, purchase_price, purchase_qty, purchase_unit)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
        [
          production_id,
          product_id,
          name,
          parseFloat(quantity),
          unit || "unit",
          parseFloat(cost_per_unit),
          parseFloat(total_cost),
          parsedUnits,
          batch_date || new Date().toISOString().split("T")[0],
          parseFloat(purchase_price) || 0,
          parseFloat(purchase_qty) || 0,
          purchase_unit || "kg",
        ],
      );

      await recalcMargin(product_id);

      res.status(201).json({ production: result.rows[0] });
    } catch (err) {
      console.error("ADD PRODUCTION ERROR:", err);
      res.status(500).json({ message: "Server error." });
    }
  },
);

// ─── Update Production ────────────────────────────────────────
app.put("/productions/:production_id", authenticateToken, async (req, res) => {
  try {
    const { production_id } = req.params;
    const {
      name,
      quantity,
      unit,
      cost_per_unit,
      total_cost,
      units_produced,
      batch_date,
      purchase_price,
      purchase_qty,
      purchase_unit,
    } = req.body;

    if (isNaN(parseFloat(quantity)) || parseFloat(quantity) <= 0)
      return res
        .status(400)
        .json({ message: "Kuantiti mesti nombor positif." });

    if (isNaN(parseFloat(cost_per_unit)) || isNaN(parseFloat(total_cost)))
      return res.status(400).json({
        message: "Kos per unit dan jumlah kos mesti nombor yang sah.",
      });

    const parsedUnits = parseInt(units_produced);
    if (!units_produced || isNaN(parsedUnits) || parsedUnits <= 0)
      return res
        .status(400)
        .json({ message: "Bilangan unit dihasilkan mesti nombor positif." });

    const result = await pool.query(
      `UPDATE productions
       SET name=$1, quantity=$2, unit=$3, cost_per_unit=$4, total_cost=$5,
           units_produced=$6, batch_date=$7, purchase_price=$8, purchase_qty=$9, purchase_unit=$10
       WHERE production_id=$11
       RETURNING *`,
      [
        name ?? null,
        parseFloat(quantity),
        unit || "unit",
        parseFloat(cost_per_unit),
        parseFloat(total_cost),
        parsedUnits,
        batch_date || new Date().toISOString().split("T")[0],
        parseFloat(purchase_price) || 0,
        parseFloat(purchase_qty) || 0,
        purchase_unit || "kg",
        production_id,
      ],
    );

    if (result.rows.length === 0)
      return res.status(404).json({ message: "Bahan tidak dijumpai." });

    await recalcMargin(result.rows[0].product_id);

    res.json({ production: result.rows[0] });
  } catch (err) {
    console.error("UPDATE PRODUCTION ERROR:", err);
    res.status(500).json({ message: "Server error." });
  }
});

// ─── Delete Production ────────────────────────────────────────
app.delete(
  "/productions/:production_id",
  authenticateToken,
  async (req, res) => {
    try {
      const { production_id } = req.params;

      const existing = await pool.query(
        "SELECT product_id FROM productions WHERE production_id = $1",
        [production_id],
      );

      await pool.query("DELETE FROM productions WHERE production_id = $1", [
        production_id,
      ]);

      if (existing.rows.length > 0) {
        await recalcMargin(existing.rows[0].product_id);
      }

      res.json({ message: "Bahan berjaya dipadam." });
    } catch (err) {
      console.error("DELETE PRODUCTION ERROR:", err);
      res.status(500).json({ message: "Server error." });
    }
  },
);

// ============================================================
// ─── REPORT / FEEDBACK ENDPOINTS ─────────────────────────────
// ============================================================

// ─── Create Report (User) ─────────────────────────────────────
app.post("/reports", authenticateToken, async (req, res) => {
  try {
    const { type, title, description, priority } = req.body;
    const user_id = req.user.user_id;

    if (!type || !title || !description) {
      return res
        .status(400)
        .json({ message: "Sila lengkapkan semua maklumat." });
    }

    const validTypes = ["bug", "feedback", "feature", "other"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: "Jenis laporan tidak sah." });
    }

    const validPriorities = ["low", "medium", "high", "critical"];
    const priorityValue =
      priority && validPriorities.includes(priority) ? priority : "medium";

    const result = await pool.query(
      `INSERT INTO reports (user_id, type, title, description, priority, status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
       RETURNING *`,
      [user_id, type, title, description, priorityValue],
    );

    res.status(201).json({
      message: "Laporan berjaya dihantar. Terima kasih atas maklum balas anda!",
      report: result.rows[0],
    });
  } catch (err) {
    console.error("CREATE REPORT ERROR:", err);
    res.status(500).json({ message: "Server error." });
  }
});

// ============================================================
// ─── ADMIN ENDPOINTS ──────────────────────────────────────────
// ============================================================

// ─── Dashboard Stats (Admin & Super Admin) ───────────────────
app.get(
  "/admin/dashboard-stats",
  authenticateToken,
  isAdminOrSuper,
  async (req, res) => {
    try {
      const userStats = await pool.query(
        `SELECT role, COUNT(*) as count FROM users GROUP BY role`,
      );
      const productCount = await pool.query(
        "SELECT COUNT(*) as count FROM products",
      );
      const totalCost = await pool.query(
        "SELECT COALESCE(SUM(total_cost), 0) as total FROM costs",
      );
      const avgMargin = await pool.query(
        "SELECT COALESCE(ROUND(AVG(margin_percentage)::numeric, 1), 0) as avg_margin FROM products",
      );
      const bizCount = await pool.query(
        "SELECT COUNT(*) as count FROM business",
      );
      const recentUsers = await pool.query(
        "SELECT user_id, name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 5",
      );

      res.json({
        totalUsers: parseInt(
          userStats.rows.reduce((sum, r) => sum + parseInt(r.count), 0),
        ),
        usersByRole: userStats.rows,
        totalProducts: parseInt(productCount.rows[0].count),
        totalCost: parseFloat(totalCost.rows[0].total),
        avgMargin: parseFloat(avgMargin.rows[0].avg_margin),
        totalBusinesses: parseInt(bizCount.rows[0].count),
        recentUsers: recentUsers.rows,
      });
    } catch (err) {
      console.error("DASHBOARD STATS ERROR:", err);
      res.status(500).json({ message: "Server error." });
    }
  },
);

// ─── Daily Report (Admin & Super Admin) ──────────────────────
app.get(
  "/admin/daily-report",
  authenticateToken,
  isAdminOrSuper,
  async (req, res) => {
    try {
      const now = new Date();

      // ── Kira next reset pada 12:00 AM Malaysia time ──
      // UTC+8 = Malaysia time
      const malaysiaTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
      const nextReset = new Date(malaysiaTime);
      nextReset.setHours(24, 0, 0, 0); // next midnight Malaysia time

      // Convert balik ke UTC untuk kiraan
      const nextResetUTC = new Date(nextReset.getTime() - 8 * 60 * 60 * 1000);
      const msUntilReset = nextResetUTC.getTime() - now.getTime();

      // ── Count activities in last 24 hours ──
      const yesterday = new Date(now);
      yesterday.setHours(yesterday.getHours() - 24);

      const [bizResult, productResult, userResult, reportResult] =
        await Promise.all([
          pool.query(
            "SELECT COUNT(*) as count FROM business WHERE created_at >= $1",
            [yesterday],
          ),
          pool.query(
            "SELECT COUNT(*) as count FROM products WHERE created_at >= $1",
            [yesterday],
          ),
          pool.query(
            "SELECT COUNT(*) as count FROM users WHERE created_at >= $1",
            [yesterday],
          ),
          pool.query(
            "SELECT COUNT(*) as count FROM reports WHERE created_at >= $1",
            [yesterday],
          ),
        ]);

      const hoursUntilReset = Math.floor(msUntilReset / 3600000);
      const minutesUntilReset = Math.floor((msUntilReset % 3600000) / 60000);

      res.json({
        resetIn: `${hoursUntilReset}h ${minutesUntilReset}m`,
        resetInMs: msUntilReset,
        newBusinesses: parseInt(bizResult.rows[0].count),
        newProducts: parseInt(productResult.rows[0].count),
        newUsers: parseInt(userResult.rows[0].count),
        newReports: parseInt(reportResult.rows[0].count),
        totalActivities:
          parseInt(bizResult.rows[0].count) +
          parseInt(productResult.rows[0].count) +
          parseInt(userResult.rows[0].count) +
          parseInt(reportResult.rows[0].count),
      });
    } catch (err) {
      console.error("DAILY REPORT ERROR:", err);
      res.status(500).json({ message: "Server error." });
    }
  },
);

// ─── Activity Log (Admin & Super Admin) ──────────────────────
app.get(
  "/admin/activity",
  authenticateToken,
  isAdminOrSuper,
  async (req, res) => {
    try {
      const productResult = await pool.query(
        `SELECT p.name, p.selling_price, p.created_at, b.name as business_name
       FROM products p JOIN business b ON p.business_id = b.business_id
       ORDER BY p.created_at DESC LIMIT 5`,
      );

      const costResult = await pool.query(
        `SELECT c.name as cost_name, c.total_cost, c.created_at, b.name as business_name
       FROM costs c JOIN business b ON c.business_id = b.business_id
       ORDER BY c.created_at DESC LIMIT 5`,
      );

      const reportResult = await pool.query(
        `SELECT r.title, r.type, r.created_at, u.name as user_name
       FROM reports r LEFT JOIN users u ON r.user_id = u.user_id
       ORDER BY r.created_at DESC LIMIT 5`,
      );

      const activities = [];

      productResult.rows.forEach((p) => {
        activities.push({
          user: p.business_name || "Perniagaan",
          action: `Tambah produk "${p.name}" (RM ${parseFloat(p.selling_price).toFixed(2)})`,
          time: p.created_at,
          type: "product",
        });
      });

      costResult.rows.forEach((c) => {
        activities.push({
          user: c.business_name || "Perniagaan",
          action: `Tambah kos "${c.cost_name}" (RM ${parseFloat(c.total_cost).toFixed(2)})`,
          time: c.created_at,
          type: "cost",
        });
      });

      reportResult.rows.forEach((r) => {
        const typeLabel =
          r.type === "bug"
            ? "🐛 Bug"
            : r.type === "feature"
              ? "✨ Feature"
              : r.type === "feedback"
                ? "💬 Feedback"
                : "📝 Other";
        activities.push({
          user: r.user_name || "User",
          action: `${typeLabel}: "${r.title}"`,
          time: r.created_at,
          type: "report",
        });
      });

      activities.sort(
        (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
      );
      const recent = activities.slice(0, 10);

      res.json({ activities: recent });
    } catch (err) {
      console.error("GET ACTIVITY ERROR:", err);
      res.status(500).json({ message: "Server error." });
    }
  },
);

// ─── Report Counts (Admin & Super Admin) ─────────────────────
app.get(
  "/admin/reports/counts",
  authenticateToken,
  isAdminOrSuper,
  async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'reviewing' THEN 1 END) as reviewing,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed,
        COUNT(CASE WHEN priority = 'critical' AND status != 'closed' THEN 1 END) as critical
       FROM reports`,
      );
      res.json(result.rows[0]);
    } catch (err) {
      console.error("REPORT COUNTS ERROR:", err);
      res.status(500).json({ message: "Server error." });
    }
  },
);

// ─── Get All Reports (Admin & Super Admin) ───────────────────
app.get(
  "/admin/reports",
  authenticateToken,
  isAdminOrSuper,
  async (req, res) => {
    try {
      const { status, type, priority, limit = 50, offset = 0 } = req.query;

      let query = `
      SELECT r.*, u.name as user_name, u.email as user_email,
             (SELECT name FROM users WHERE user_id = r.resolved_by) as resolved_by_name
      FROM reports r
      LEFT JOIN users u ON r.user_id = u.user_id
      WHERE 1=1
    `;
      const params = [];
      let idx = 1;

      if (status) {
        query += ` AND r.status = $${idx}`;
        params.push(status);
        idx++;
      }
      if (type) {
        query += ` AND r.type = $${idx}`;
        params.push(type);
        idx++;
      }
      if (priority) {
        query += ` AND r.priority = $${idx}`;
        params.push(priority);
        idx++;
      }

      query += ` ORDER BY 
                CASE r.status 
                  WHEN 'pending' THEN 1 WHEN 'reviewing' THEN 2 
                  WHEN 'resolved' THEN 3 WHEN 'closed' THEN 4 
                END,
                CASE r.priority
                  WHEN 'critical' THEN 1 WHEN 'high' THEN 2
                  WHEN 'medium' THEN 3 WHEN 'low' THEN 4
                END,
                r.created_at DESC
              LIMIT $${idx} OFFSET $${idx + 1}`;
      params.push(parseInt(limit), parseInt(offset));

      const result = await pool.query(query, params);

      const countResult = await pool.query(
        `SELECT status, COUNT(*) as count FROM reports GROUP BY status`,
      );
      const priorityCountResult = await pool.query(
        `SELECT priority, COUNT(*) as count FROM reports WHERE status != 'closed' GROUP BY priority`,
      );

      res.json({
        reports: result.rows,
        counts: countResult.rows,
        priorityCounts: priorityCountResult.rows,
        total: result.rows.length,
      });
    } catch (err) {
      console.error("GET REPORTS ERROR:", err);
      res.status(500).json({ message: "Server error." });
    }
  },
);

// ─── Get Single Report (Admin & Super Admin) ─────────────────
app.get(
  "/admin/reports/:report_id",
  authenticateToken,
  isAdminOrSuper,
  async (req, res) => {
    try {
      const { report_id } = req.params;
      const result = await pool.query(
        `SELECT r.*, u.name as user_name, u.email as user_email
       FROM reports r LEFT JOIN users u ON r.user_id = u.user_id
       WHERE r.report_id = $1`,
        [report_id],
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Laporan tidak dijumpai." });
      }
      res.json({ report: result.rows[0] });
    } catch (err) {
      console.error("GET REPORT ERROR:", err);
      res.status(500).json({ message: "Server error." });
    }
  },
);

// ─── Update Report (Admin & Super Admin) ──────────────────────
app.put(
  "/admin/reports/:report_id",
  authenticateToken,
  isAdminOrSuper,
  async (req, res) => {
    try {
      const { report_id } = req.params;
      const { status, priority, resolution_note } = req.body;

      const validStatuses = ["pending", "reviewing", "resolved", "closed"];
      if (status && !validStatuses.includes(status)) {
        return res.status(400).json({ message: "Status tidak sah." });
      }
      const validPriorities = ["low", "medium", "high", "critical"];
      if (priority && !validPriorities.includes(priority)) {
        return res.status(400).json({ message: "Priority tidak sah." });
      }

      const checkResult = await pool.query(
        "SELECT * FROM reports WHERE report_id = $1",
        [report_id],
      );
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ message: "Laporan tidak dijumpai." });
      }

      let query = "UPDATE reports SET ";
      const updates = [];
      const params = [];
      let idx = 1;

      if (status) {
        updates.push(`status = $${idx}`);
        params.push(status);
        idx++;
        if (status === "resolved" || status === "closed") {
          updates.push(`resolved_at = NOW()`);
          updates.push(`resolved_by = $${idx}`);
          params.push(req.user.user_id);
          idx++;
        }
      }
      if (priority) {
        updates.push(`priority = $${idx}`);
        params.push(priority);
        idx++;
      }
      if (resolution_note) {
        updates.push(`resolution_note = $${idx}`);
        params.push(resolution_note);
        idx++;
      }

      updates.push(`updated_at = NOW()`);
      query += updates.join(", ");
      query += ` WHERE report_id = $${idx} RETURNING *`;
      params.push(report_id);

      const result = await pool.query(query, params);

      res.json({
        message: "Laporan berjaya dikemaskini.",
        report: result.rows[0],
      });
    } catch (err) {
      console.error("UPDATE REPORT ERROR:", err);
      res.status(500).json({ message: "Server error." });
    }
  },
);

// ─── Delete Report (Admin & Super Admin) ──────────────────────
app.delete(
  "/admin/reports/:report_id",
  authenticateToken,
  isAdminOrSuper,
  async (req, res) => {
    try {
      const { report_id } = req.params;
      const result = await pool.query(
        "DELETE FROM reports WHERE report_id = $1 RETURNING *",
        [report_id],
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Laporan tidak dijumpai." });
      }
      res.json({ message: "Laporan berjaya dipadam." });
    } catch (err) {
      console.error("DELETE REPORT ERROR:", err);
      res.status(500).json({ message: "Server error." });
    }
  },
);

// ============================================================
// ─── SUPER ADMIN ONLY ENDPOINTS ──────────────────────────────
// ============================================================

// ─── Create Admin (Super Admin only) ──────────────────────────
app.post("/admin/create", authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const { name, email, password, role = "admin" } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Sila lengkapkan semua maklumat." });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Kata laluan mesti sekurang-kurangnya 6 aksara." });
    }

    const userExists = await pool.query(
      "SELECT user_id FROM users WHERE email = $1",
      [email],
    );
    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: "E-mel sudah didaftarkan." });
    }

    if (role !== "admin" && role !== "staff") {
      return res.status(400).json({ message: "Peranan tidak sah." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (name, email, password, role, provider)
       VALUES ($1, $2, $3, $4, 'local')
       RETURNING user_id, name, email, role, created_at`,
      [name, email, hashedPassword, role],
    );

    res.status(201).json({
      message: `Akaun ${role === "admin" ? "Admin" : "Staff"} berjaya dicipta.`,
      user: result.rows[0],
    });
  } catch (err) {
    console.error("CREATE ADMIN ERROR:", err);
    res.status(500).json({ message: "Server error." });
  }
});

// ─── Get All Admins (Super Admin only) ────────────────────────
app.get("/admin/admins", authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT user_id, name, email, role, provider, created_at 
       FROM users 
       WHERE role IN ('admin', 'super_admin')
       ORDER BY created_at DESC`,
    );
    res.json({ admins: result.rows });
  } catch (err) {
    console.error("GET ADMINS ERROR:", err);
    res.status(500).json({ message: "Server error." });
  }
});

// ─── Delete Admin (Super Admin only) ──────────────────────────
app.delete(
  "/admin/admins/:user_id",
  authenticateToken,
  isSuperAdmin,
  async (req, res) => {
    try {
      const { user_id } = req.params;

      if (user_id === req.user.user_id) {
        return res
          .status(400)
          .json({ message: "Anda tidak boleh memadam akaun sendiri." });
      }

      const checkResult = await pool.query(
        "SELECT role FROM users WHERE user_id = $1",
        [user_id],
      );
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ message: "Pengguna tidak dijumpai." });
      }
      if (checkResult.rows[0].role === "super_admin") {
        return res
          .status(403)
          .json({ message: "Tidak boleh memadam Super Admin." });
      }

      await pool.query("DELETE FROM users WHERE user_id = $1", [user_id]);

      res.json({ message: "Admin berjaya dipadam." });
    } catch (err) {
      console.error("DELETE ADMIN ERROR:", err);
      res.status(500).json({ message: "Server error." });
    }
  },
);

// ─── Update Admin (Super Admin only) ──────────────────────────
app.put(
  "/admin/admins/:user_id",
  authenticateToken,
  isSuperAdmin,
  async (req, res) => {
    try {
      const { user_id } = req.params;
      const { name, email, role } = req.body;

      const checkResult = await pool.query(
        "SELECT role FROM users WHERE user_id = $1",
        [user_id],
      );
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ message: "Pengguna tidak dijumpai." });
      }
      if (
        checkResult.rows[0].role === "super_admin" &&
        role !== "super_admin"
      ) {
        return res
          .status(403)
          .json({ message: "Tidak boleh menukar peranan Super Admin." });
      }

      let query = "UPDATE users SET ";
      const updates = [];
      const params = [];
      let idx = 1;

      if (name) {
        updates.push(`name = $${idx}`);
        params.push(name);
        idx++;
      }
      if (email) {
        updates.push(`email = $${idx}`);
        params.push(email);
        idx++;
      }
      if (role && checkResult.rows[0].role !== "super_admin") {
        updates.push(`role = $${idx}`);
        params.push(role);
        idx++;
      }

      if (updates.length === 0) {
        return res
          .status(400)
          .json({ message: "Tiada maklumat untuk dikemaskini." });
      }

      query += updates.join(", ");
      query += ` WHERE user_id = $${idx} RETURNING user_id, name, email, role`;
      params.push(user_id);

      const result = await pool.query(query, params);

      res.json({
        message: "Maklumat admin berjaya dikemaskini.",
        user: result.rows[0],
      });
    } catch (err) {
      console.error("UPDATE ADMIN ERROR:", err);
      res.status(500).json({ message: "Server error." });
    }
  },
);

// ─── Get All Users (Super Admin only) ─────────────────────────
app.get("/admin/users", authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const { limit = 50, offset = 0, search = "" } = req.query;

    let query = `
      SELECT user_id, name, email, role, provider, created_at, business_id 
      FROM users WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (search) {
      query += ` AND (name ILIKE $${idx} OR email ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);
    const countResult = await pool.query("SELECT COUNT(*) as count FROM users");

    res.json({
      users: result.rows,
      total: parseInt(countResult.rows[0].count),
    });
  } catch (err) {
    console.error("GET USERS ERROR:", err);
    res.status(500).json({ message: "Server error." });
  }
});

// ─── Update User Role (Super Admin only) ──────────────────────
app.put(
  "/admin/users/:user_id/role",
  authenticateToken,
  isSuperAdmin,
  async (req, res) => {
    try {
      const { user_id } = req.params;
      const { role } = req.body;

      const validRoles = ["user", "staff", "business_owner", "admin"];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ message: "Peranan tidak sah." });
      }

      if (user_id === req.user.user_id && role !== "super_admin") {
        return res
          .status(400)
          .json({ message: "Anda tidak boleh menukar peranan sendiri." });
      }

      const checkResult = await pool.query(
        "SELECT role FROM users WHERE user_id = $1",
        [user_id],
      );
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ message: "Pengguna tidak dijumpai." });
      }
      if (checkResult.rows[0].role === "super_admin") {
        return res
          .status(403)
          .json({ message: "Tidak boleh menukar peranan Super Admin." });
      }

      const result = await pool.query(
        "UPDATE users SET role = $1 WHERE user_id = $2 RETURNING user_id, name, email, role",
        [role, user_id],
      );

      res.json({
        message: "Peranan pengguna berjaya dikemaskini.",
        user: result.rows[0],
      });
    } catch (err) {
      console.error("UPDATE USER ROLE ERROR:", err);
      res.status(500).json({ message: "Server error." });
    }
  },
);

// ─── Delete User (Super Admin only) ───────────────────────────
app.delete(
  "/admin/users/:user_id",
  authenticateToken,
  isSuperAdmin,
  async (req, res) => {
    try {
      const { user_id } = req.params;

      if (user_id === req.user.user_id) {
        return res
          .status(400)
          .json({ message: "Anda tidak boleh memadam akaun sendiri." });
      }

      const checkResult = await pool.query(
        "SELECT role FROM users WHERE user_id = $1",
        [user_id],
      );
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ message: "Pengguna tidak dijumpai." });
      }
      if (checkResult.rows[0].role === "super_admin") {
        return res
          .status(403)
          .json({ message: "Tidak boleh memadam Super Admin." });
      }

      await pool.query("DELETE FROM users WHERE user_id = $1", [user_id]);

      res.json({ message: "Pengguna berjaya dipadam." });
    } catch (err) {
      console.error("DELETE USER ERROR:", err);
      res.status(500).json({ message: "Server error." });
    }
  },
);

// ─── Get All Businesses (Super Admin only) ────────────────────
app.get(
  "/admin/businesses",
  authenticateToken,
  isSuperAdmin,
  async (req, res) => {
    try {
      const { limit = 50, offset = 0, search = "" } = req.query;

      let query = `
      SELECT b.*, u.name as owner_name, u.email as owner_email
      FROM business b
      LEFT JOIN users u ON b.user_id = u.user_id
      WHERE 1=1
    `;
      const params = [];
      let idx = 1;

      if (search) {
        query += ` AND (b.name ILIKE $${idx} OR u.name ILIKE $${idx})`;
        params.push(`%${search}%`);
        idx++;
      }

      query += ` ORDER BY b.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
      params.push(parseInt(limit), parseInt(offset));

      const result = await pool.query(query, params);
      const countResult = await pool.query(
        "SELECT COUNT(*) as count FROM business",
      );

      res.json({
        businesses: result.rows,
        total: parseInt(countResult.rows[0].count),
      });
    } catch (err) {
      console.error("GET BUSINESSES ERROR:", err);
      res.status(500).json({ message: "Server error." });
    }
  },
);

// ─── Delete Business (Super Admin only) ───────────────────────
app.delete(
  "/admin/businesses/:business_id",
  authenticateToken,
  isSuperAdmin,
  async (req, res) => {
    try {
      const { business_id } = req.params;

      const checkResult = await pool.query(
        "SELECT * FROM business WHERE business_id = $1",
        [business_id],
      );
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ message: "Perniagaan tidak dijumpai." });
      }

      await pool.query("DELETE FROM products WHERE business_id = $1", [
        business_id,
      ]);
      await pool.query("DELETE FROM business WHERE business_id = $1", [
        business_id,
      ]);

      res.json({ message: "Perniagaan berjaya dipadam." });
    } catch (err) {
      console.error("DELETE BUSINESS ERROR:", err);
      res.status(500).json({ message: "Server error." });
    }
  },
);

// ─── Get All Products (Super Admin only) ──────────────────────
app.get(
  "/admin/products",
  authenticateToken,
  isSuperAdmin,
  async (req, res) => {
    try {
      const { limit = 50, offset = 0, search = "" } = req.query;

      let query = `
      SELECT p.*, b.name as business_name, u.name as owner_name
      FROM products p
      JOIN business b ON p.business_id = b.business_id
      LEFT JOIN users u ON b.user_id = u.user_id
      WHERE 1=1
    `;
      const params = [];
      let idx = 1;

      if (search) {
        query += ` AND (p.name ILIKE $${idx} OR b.name ILIKE $${idx})`;
        params.push(`%${search}%`);
        idx++;
      }

      query += ` ORDER BY p.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
      params.push(parseInt(limit), parseInt(offset));

      const result = await pool.query(query, params);
      const countResult = await pool.query(
        "SELECT COUNT(*) as count FROM products",
      );

      res.json({
        products: result.rows,
        total: parseInt(countResult.rows[0].count),
      });
    } catch (err) {
      console.error("GET ADMIN PRODUCTS ERROR:", err);
      res.status(500).json({ message: "Server error." });
    }
  },
);

// ─── System Stats (Super Admin only) ──────────────────────────
app.get(
  "/admin/system-stats",
  authenticateToken,
  isSuperAdmin,
  async (req, res) => {
    try {
      const [users, businesses, products, costs, reports] = await Promise.all([
        pool.query("SELECT COUNT(*) as count FROM users"),
        pool.query("SELECT COUNT(*) as count FROM business"),
        pool.query("SELECT COUNT(*) as count FROM products"),
        pool.query("SELECT COALESCE(SUM(total_cost), 0) as total FROM costs"),
        pool.query("SELECT COUNT(*) as count FROM reports"),
      ]);

      res.json({
        totalUsers: parseInt(users.rows[0].count),
        totalBusinesses: parseInt(businesses.rows[0].count),
        totalProducts: parseInt(products.rows[0].count),
        totalCost: parseFloat(costs.rows[0].total),
        totalReports: parseInt(reports.rows[0].count),
      });
    } catch (err) {
      console.error("SYSTEM STATS ERROR:", err);
      res.status(500).json({ message: "Server error." });
    }
  },
);

// ============================================================
// ─── ROOT ──────────────────────────────────────────────────────
// ============================================================
app.get("/", (req, res) => {
  res.send("Database connected and server is running!");
});

// ============================================================
// ─── START SERVER ─────────────────────────────────────────────
// ============================================================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
