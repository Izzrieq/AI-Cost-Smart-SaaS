require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("./config/db");

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:3000",
  }),
);

// ----------------------
// REGISTER
// ----------------------
app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const userExists = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email],
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await pool.query(
      "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING *",
      [name, email, hashedPassword, "user"],
    );

    res.json({
      message: "User created",
      user: newUser.rows[0],
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ----------------------
// LOGIN
// ----------------------
app.post("/login", async (req, res) => {
  try {
    console.log("BODY:", req.body);

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Missing email/password" });
    }

    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    console.log("USER FOUND:", result.rows);

    if (result.rows.length === 0) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const user = result.rows[0];

    const match = await bcrypt.compare(password, user.password);

    console.log("PASSWORD MATCH:", match);

    if (!match) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { user_id: user.user_id },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "1d" },
    );

    return res.json({
      token,
      user: {
        user_id: user.user_id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(" LOGIN ERROR:", err); // VERY IMPORTANT
    return res.status(500).json({
      message: "Server crashed",
    });
  }
});

// ----------------------
app.listen(8080, () => {
  console.log("Server running on port 8080");
});
