import express from "express";
import { pool } from "./db/pool.js";
import { authRouter } from "./routes/auth.js";

const app = express();
app.use(express.json());

app.use("/api/auth", authRouter);

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, db: true });
  } catch {
    res.status(503).json({ ok: false, db: false });
  }
});

const port = Number(process.env.PORT) || 3001;
app.listen(port, "0.0.0.0", () => {
  console.log(`PenguWave API listening on port ${port}`);
});
