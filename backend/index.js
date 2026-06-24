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

// ----------------------
// AUTH MIDDLEWARE
// ----------------------
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

// ----------------------
// HELPER: get business_id for the current user
// ----------------------
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

// ----------------------
// HELPER: generate a globally unique sequential prefixed ID
// ----------------------
const generateId = async (table, idColumn, prefix) => {
  const result = await pool.query(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(${idColumn} FROM 4) AS INTEGER)), 0) + 1 AS next_num FROM ${table}`,
  );
  const num = result.rows[0].next_num;
  return `${prefix}${String(num).padStart(3, "0")}`;
};

// ----------------------
// HELPER: recalculate and persist margin_percentage for a product
// ----------------------
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

// ----------------------
// GOOGLE AUTH (with invite support)
// ----------------------
app.post("/auth/google", async (req, res) => {
  const client = await pool.connect();
  try {
    const { token, inviteToken, businessId } = req.body;
    if (!token) return res.status(400).json({ message: "No token provided." });

    const decoded = await admin.auth().verifyIdToken(token);
    const { email, name, uid } = decoded;

    let role = "user";
    let business_id = null;

    // ── VALIDATE INVITE IF PROVIDED ──
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

      // If user exists but no google_uid, link it
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

// ----------------------
// LINK GOOGLE ACCOUNT TO EXISTING USER (with MERGE)
// ----------------------
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

// ----------------------
// REGISTER (with invite support)
// ----------------------
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

    // ── VALIDATE INVITE IF PROVIDED ──
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

      // Mark invite as used
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

// ----------------------
// LOGIN
// ----------------------
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

// ----------------------
// GET CURRENT USER
// ----------------------
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

// ----------------------
// GET USER BUSINESS
// ----------------------
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

// ----------------------
// REGISTER BUSINESS
// ----------------------
app.post("/business", authenticateToken, async (req, res) => {
  try {
    const { name, description, type } = req.body;
    if (!name || !description || !type)
      return res
        .status(400)
        .json({ message: "Sila lengkapkan semua maklumat." });

    if (!["home", "stall"].includes(type))
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

// ----------------------
// HOME STATS
// ----------------------
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

// ----------------------
// GET ALL PRODUCTS
// ----------------------
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

// ----------------------
// ADD PRODUCT (with sale_unit)
// ----------------------
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

    // Use provided sale_unit or default to 'unit'
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

// ----------------------
// GET SINGLE PRODUCT
// ----------------------
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

// ----------------------
// EDIT PRODUCT (with sale_unit)
// ----------------------
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

// ----------------------
// DELETE PRODUCT
// ----------------------
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

// ----------------------
// GET COSTS BY PRODUCT
// ----------------------
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

// ----------------------
// ADD COST
// ----------------------
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

// ----------------------
// UPDATE COST
// ----------------------
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

// ----------------------
// DELETE COST
// ----------------------
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

// ----------------------
// GET PRODUCTIONS BY PRODUCT
// ----------------------
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

// ----------------------
// ADD PRODUCTION
// ----------------------
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
         (production_id, product_id, name, quantity, unit, cost_per_unit, total_cost, units_produced, batch_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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

// ----------------------
// UPDATE PRODUCTION
// ----------------------
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
           units_produced=$6, batch_date=$7
       WHERE production_id=$8
       RETURNING *`,
      [
        name ?? null,
        parseFloat(quantity),
        unit || "unit",
        parseFloat(cost_per_unit),
        parseFloat(total_cost),
        parsedUnits,
        batch_date || new Date().toISOString().split("T")[0],
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

// ----------------------
// DELETE PRODUCTION
// ----------------------
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

// ----------------------
// UPDATE USER PROFILE
// ----------------------
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

// ----------------------
// CHANGE PASSWORD
// ----------------------
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

// ─── GENERATE STAFF INVITE LINK ──────────────────────────────────────────
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

// ─── GET EXISTING INVITE LINK ──────────────────────────────────────────
app.get("/business/invite-link", authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.user_id;

    // Check if user is business owner
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

    // Get business_id
    const bizResult = await pool.query(
      "SELECT business_id FROM business WHERE user_id = $1",
      [user_id],
    );
    if (bizResult.rows.length === 0) {
      return res.status(404).json({ message: "Perniagaan tidak dijumpai." });
    }
    const business_id = bizResult.rows[0].business_id;

    // Get the most recent valid invite
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

// ─── VERIFY INVITE TOKEN ──────────────────────────────────────────────────
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

// ----------------------
// UPDATE BUSINESS
// ----------------------
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
      if (!["home", "stall"].includes(type)) {
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

// ─── GET STAFF LIST FOR BUSINESS ──────────────────────────────────────────
app.get("/business/staff", authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.user_id;

    // Check if user is business owner or admin
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

    // Get business_id
    const bizResult = await pool.query(
      "SELECT business_id FROM business WHERE user_id = $1",
      [user_id],
    );
    if (bizResult.rows.length === 0) {
      return res.status(404).json({ message: "Perniagaan tidak dijumpai." });
    }
    const business_id = bizResult.rows[0].business_id;

    // Get all staff users with this business_id
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

// ----------------------
// ROOT
// ----------------------
app.get("/", (req, res) => {
  res.send("Database connected and server is running!");
});

// ----------------------
// START SERVER
// ----------------------
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
