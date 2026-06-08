require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("./config/db");
const admin = require("./config/firebaseAdmin");

const app = express();

app.use(express.json());
app.use(cors({ origin: "http://localhost:3000" }));

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
//
// CVP Formula (Single Product):
//   Variable costs  = ALL productions (bahan) total_cost
//                   + costs where behavior = 'variable'
//   Fixed costs     = costs where behavior = 'fixed'
//   Variable cost / unit = total_variable / units_produced  (from latest batch)
//   CM / unit       = selling_price - variable_cost_per_unit
//   Margin %        = (CM / unit / selling_price) * 100
// ----------------------
const recalcMargin = async (product_id) => {
  try {
    // 1. Get selling price
    const prodRes = await pool.query(
      "SELECT selling_price FROM products WHERE product_id = $1",
      [product_id],
    );
    if (prodRes.rows.length === 0) return;
    const sellingPrice = parseFloat(prodRes.rows[0].selling_price);
    if (sellingPrice <= 0) return;

    // 2. Get units_produced from the latest production batch
    //    Use MAX across all rows (all rows in same batch share the same value)
    const unitsRes = await pool.query(
      `SELECT COALESCE(MAX(units_produced), 0) AS units_produced
       FROM productions
       WHERE product_id = $1 AND units_produced > 0`,
      [product_id],
    );
    const unitsProduced = parseInt(unitsRes.rows[0].units_produced) || 0;
    if (unitsProduced <= 0) {
      // No batch data yet — reset margin to 0
      await pool.query(
        "UPDATE products SET margin_percentage = 0 WHERE product_id = $1",
        [product_id],
      );
      return;
    }

    // 3. Sum all bahan (productions) total_cost — always variable
    const bahanRes = await pool.query(
      "SELECT COALESCE(SUM(total_cost), 0) AS total FROM productions WHERE product_id = $1",
      [product_id],
    );
    const bahanTotal = parseFloat(bahanRes.rows[0].total);

    // 4. Sum variable costs from costs table
    const varCostRes = await pool.query(
      `SELECT COALESCE(SUM(total_cost), 0) AS total
       FROM costs
       WHERE product_id = $1 AND behavior = 'variable'`,
      [product_id],
    );
    const varCostTotal = parseFloat(varCostRes.rows[0].total);

    // 5. Sum fixed costs from costs table
    const fixedCostRes = await pool.query(
      `SELECT COALESCE(SUM(total_cost), 0) AS total
       FROM costs
       WHERE product_id = $1 AND behavior = 'fixed'`,
      [product_id],
    );
    // fixedCostTotal not needed for margin % but kept for completeness
    // const fixedCostTotal = parseFloat(fixedCostRes.rows[0].total);

    // 6. CVP calculation
    const totalVariableCost = bahanTotal + varCostTotal;
    const variableCostPerUnit = totalVariableCost / unitsProduced;
    const cmPerUnit = sellingPrice - variableCostPerUnit;
    const marginPct = (cmPerUnit / sellingPrice) * 100;

    // 7. Persist — round to 2 decimal places
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
// GOOGLE AUTH
// ----------------------
app.post("/auth/google", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: "No token provided." });

    const decoded = await admin.auth().verifyIdToken(token);
    const { email, name, uid } = decoded;

    let result = await pool.query(
      "SELECT * FROM users WHERE email = $1 OR google_uid = $2",
      [email, uid],
    );

    let user;

    if (result.rows.length === 0) {
      const newUser = await pool.query(
        `INSERT INTO users (name, email, password, role, provider, google_uid)
         VALUES ($1, $2, NULL, $3, $4, $5)
         RETURNING user_id, name, email, role, created_at`,
        [name, email, "user", "google", uid],
      );
      user = newUser.rows[0];
    } else {
      user = result.rows[0];
      if (!user.google_uid) {
        await pool.query(
          "UPDATE users SET google_uid = $1, provider = $2 WHERE user_id = $3",
          [uid, "both", user.user_id],
        );
        user.provider = "both";
      }
    }

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
      },
    });
  } catch (err) {
    console.error("GOOGLE AUTH ERROR:", err);
    res.status(401).json({ message: "Token Google tidak sah." });
  }
});

// ----------------------
// REGISTER
// ----------------------
app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
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

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await pool.query(
      `INSERT INTO users (name, email, password, role, provider)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING user_id, name, email, role, created_at`,
      [name, email, hashedPassword, "user", "local"],
    );

    res
      .status(201)
      .json({ message: "Akaun berjaya dicipta.", user: newUser.rows[0] });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({ message: "Server error." });
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
      "SELECT user_id, name, email, role, created_at FROM users WHERE user_id = $1",
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
// ADD PRODUCT
// FIX: Use generateId() instead of COUNT(*) to avoid duplicate IDs after deletions
// ----------------------
app.post("/products", authenticateToken, async (req, res) => {
  try {
    const { name, description, selling_price, image_url } = req.body;

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

    // FIX: use generateId to avoid collision when products are deleted
    const product_id = await generateId("products", "product_id", "prd");

    const result = await pool.query(
      `INSERT INTO products (product_id, business_id, name, description, selling_price, margin_percentage, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        product_id,
        business_id,
        name,
        description || null,
        parseFloat(selling_price),
        0, // margin starts at 0 — recalculated automatically when costs are added
        image_url || null,
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
// EDIT PRODUCT
// FIX: margin_percentage is now optional — it will be recalculated automatically
// ----------------------
app.put("/products/:product_id", authenticateToken, async (req, res) => {
  try {
    const { product_id } = req.params;
    const { name, description, selling_price, image_url } = req.body;

    if (!selling_price || isNaN(parseFloat(selling_price)))
      return res
        .status(400)
        .json({ message: "Harga jual mesti nombor yang sah." });

    const result = await pool.query(
      `UPDATE products
       SET name=$1, description=$2, selling_price=$3, image_url=$4
       WHERE product_id=$5 RETURNING *`,
      [
        name,
        description || null,
        parseFloat(selling_price),
        image_url || null,
        product_id,
      ],
    );

    if (result.rows.length === 0)
      return res.status(404).json({ message: "Produk tidak dijumpai." });

    // Selling price changed — recalculate margin
    await recalcMargin(product_id);

    // Return product with freshly recalculated margin
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
// FIX: recalcMargin() called after insert
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
      return res
        .status(400)
        .json({
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

    // FIX: recalculate margin after adding a cost
    await recalcMargin(product_id);

    res.status(201).json({ cost: result.rows[0] });
  } catch (err) {
    console.error("ADD COST ERROR:", err);
    res.status(500).json({ message: "Server error." });
  }
});

// ----------------------
// UPDATE COST
// FIX: recalcMargin() called after update
// ----------------------
app.put("/costs/:costs_id", authenticateToken, async (req, res) => {
  try {
    const { costs_id } = req.params;
    const { name, behavior, cost_per_unit, total_cost } = req.body;

    if (isNaN(parseFloat(cost_per_unit)) || isNaN(parseFloat(total_cost)))
      return res
        .status(400)
        .json({
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

    // FIX: recalculate margin after updating a cost
    await recalcMargin(result.rows[0].product_id);

    res.json({ cost: result.rows[0] });
  } catch (err) {
    console.error("UPDATE COST ERROR:", err);
    res.status(500).json({ message: "Server error." });
  }
});

// ----------------------
// DELETE COST
// FIX: recalcMargin() called after delete
// ----------------------
app.delete("/costs/:costs_id", authenticateToken, async (req, res) => {
  try {
    const { costs_id } = req.params;

    // Fetch product_id before deleting so we can recalculate
    const existing = await pool.query(
      "SELECT product_id FROM costs WHERE costs_id = $1",
      [costs_id],
    );

    await pool.query("DELETE FROM costs WHERE costs_id = $1", [costs_id]);

    // FIX: recalculate margin after deleting a cost
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
// FIX: Now saves units_produced + batch_date, then recalcMargin()
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
        units_produced, // FIX: was completely ignored before
        batch_date, // FIX: was completely ignored before
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
        return res
          .status(400)
          .json({
            message: "Kos per unit dan jumlah kos mesti nombor yang sah.",
          });

      // FIX: validate units_produced
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

      // FIX: INSERT now includes units_produced and batch_date
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
          parsedUnits, // FIX
          batch_date || new Date().toISOString().split("T")[0], // FIX
        ],
      );

      // FIX: recalculate margin after adding a production row
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
// FIX: Now saves units_produced + batch_date, then recalcMargin()
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
      units_produced, // FIX: was completely ignored before
      batch_date, // FIX: was completely ignored before
    } = req.body;

    if (isNaN(parseFloat(quantity)) || parseFloat(quantity) <= 0)
      return res
        .status(400)
        .json({ message: "Kuantiti mesti nombor positif." });

    if (isNaN(parseFloat(cost_per_unit)) || isNaN(parseFloat(total_cost)))
      return res
        .status(400)
        .json({
          message: "Kos per unit dan jumlah kos mesti nombor yang sah.",
        });

    // FIX: validate units_produced
    const parsedUnits = parseInt(units_produced);
    if (!units_produced || isNaN(parsedUnits) || parsedUnits <= 0)
      return res
        .status(400)
        .json({ message: "Bilangan unit dihasilkan mesti nombor positif." });

    // FIX: UPDATE now includes units_produced and batch_date
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
        parsedUnits, // FIX
        batch_date || new Date().toISOString().split("T")[0], // FIX
        production_id,
      ],
    );

    if (result.rows.length === 0)
      return res.status(404).json({ message: "Bahan tidak dijumpai." });

    // FIX: recalculate margin after updating a production row
    await recalcMargin(result.rows[0].product_id);

    res.json({ production: result.rows[0] });
  } catch (err) {
    console.error("UPDATE PRODUCTION ERROR:", err);
    res.status(500).json({ message: "Server error." });
  }
});

// ----------------------
// DELETE PRODUCTION
// FIX: recalcMargin() called after delete
// ----------------------
app.delete(
  "/productions/:production_id",
  authenticateToken,
  async (req, res) => {
    try {
      const { production_id } = req.params;

      // Fetch product_id before deleting so we can recalculate
      const existing = await pool.query(
        "SELECT product_id FROM productions WHERE production_id = $1",
        [production_id],
      );

      await pool.query("DELETE FROM productions WHERE production_id = $1", [
        production_id,
      ]);

      // FIX: recalculate margin after deleting a production row
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
app.listen(8080, () => {
  console.log("Server running on port 8080");
});
