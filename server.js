const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Conexión MySQL (XAMPP)
// Puedes sobreescribir con variables de entorno: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "horse_race_game_main",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Registrar usuario (máximo 4 usuarios)
app.post("/api/registro", async (req, res) => {
  const { nombre } = req.body;
  if (!nombre) {
    return res.status(400).json({ error: "Nombre requerido" });
  }

  try {
    const [rows] = await pool.query("SELECT COUNT(*) AS total FROM usuarios");
    const total = rows[0]?.total ?? 0;

    if (total >= 4) {
      return res
        .status(400)
        .json({ error: "Máximo de 4 usuarios registrados alcanzado" });
    }

    const [result] = await pool.query(
      "INSERT INTO usuarios (nombre, puntos, fecha_registro) VALUES (?, 1000, NOW())",
      [nombre]
    );

    res.json({ id: result.insertId, nombre, puntos: 1000 });
  } catch (err) {
    if (err && err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ error: "Nombre ya registrado" });
    }
    return res.status(500).json({ error: "Error al registrar usuario" });
  }
});

// Login sencillo por nombre
app.post("/api/login", async (req, res) => {
  const { nombre } = req.body;
  if (!nombre) {
    return res.status(400).json({ error: "Nombre requerido" });
  }

  try {
    const [rows] = await pool.query(
      "SELECT id, nombre, puntos FROM usuarios WHERE nombre = ?",
      [nombre]
    );
    const row = rows[0];
    if (!row) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json(row);
  } catch {
    return res.status(500).json({ error: "Error en base de datos" });
  }
});

// Crear partida
app.post("/api/partidas", async (req, res) => {
  try {
    const [result] = await pool.query("INSERT INTO partidas (fecha) VALUES (NOW())");
    res.json({ id: result.insertId });
  } catch {
    return res.status(500).json({ error: "Error al crear partida" });
  }
});

// Registrar apuesta
app.post("/api/apuestas", async (req, res) => {
  const { partida_id, usuario_id, caballo, monto } = req.body;
  if (!partida_id || !usuario_id || !caballo || !monto) {
    return res.status(400).json({ error: "Datos incompletos" });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [userRows] = await conn.query("SELECT puntos FROM usuarios WHERE id = ? FOR UPDATE", [
      usuario_id,
    ]);
    const user = userRows[0];
    if (!user) {
      await conn.rollback();
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    if (user.puntos < Number(monto)) {
      await conn.rollback();
      return res.status(400).json({ error: "Puntos insuficientes" });
    }

    const [betResult] = await conn.query(
      "INSERT INTO apuestas (partida_id, usuario_id, caballo, monto, fecha) VALUES (?, ?, ?, ?, NOW())",
      [partida_id, usuario_id, caballo, monto]
    );

    await conn.query("UPDATE usuarios SET puntos = puntos - ? WHERE id = ?", [
      monto,
      usuario_id,
    ]);

    const [newPointsRows] = await conn.query("SELECT puntos FROM usuarios WHERE id = ?", [
      usuario_id,
    ]);

    await conn.commit();

    res.json({
      id: betResult.insertId,
      partida_id,
      usuario_id,
      caballo,
      monto,
      puntos_restantes: newPointsRows[0].puntos,
    });
  } catch {
    try {
      await conn.rollback();
    } catch {}
    return res.status(500).json({ error: "Error al registrar la apuesta" });
  } finally {
    conn.release();
  }
});

// Finalizar partida y pagar apuestas (multiplicador x5)
app.post("/api/partidas/:id/finalizar", async (req, res) => {
  const partidaId = req.params.id;
  const { ganador_caballo } = req.body;
  if (!ganador_caballo) {
    return res.status(400).json({ error: "Caballo ganador requerido" });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query("UPDATE partidas SET ganador_caballo = ? WHERE id = ?", [
      ganador_caballo,
      partidaId,
    ]);

    const [bets] = await conn.query("SELECT * FROM apuestas WHERE partida_id = ? FOR UPDATE", [
      partidaId,
    ]);

    const multiplicador = 5;
    for (const ap of bets) {
      let resultado = "perdida";
      let pago = 0;
      if (ap.caballo === ganador_caballo) {
        resultado = "ganada";
        pago = ap.monto * multiplicador;
        await conn.query("UPDATE usuarios SET puntos = puntos + ? WHERE id = ?", [
          pago,
          ap.usuario_id,
        ]);
      }
      await conn.query("UPDATE apuestas SET resultado = ?, pago = ? WHERE id = ?", [
        resultado,
        pago,
        ap.id,
      ]);
    }

    await conn.commit();
    res.json({ mensaje: "Partida finalizada y apuestas pagadas" });
  } catch {
    try {
      await conn.rollback();
    } catch {}
    return res.status(500).json({ error: "Error al finalizar la partida" });
  } finally {
    conn.release();
  }
});

// Comprar puntos (paquetes de 1000 por 10000 COP)
app.post("/api/compras", async (req, res) => {
  const { usuario_id, paquetes } = req.body;
  if (!usuario_id || !paquetes || paquetes <= 0) {
    return res.status(400).json({ error: "Datos de compra inválidos" });
  }

  const puntos = paquetes * 1000;
  const monto = paquetes * 10000;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      "INSERT INTO compras_puntos (usuario_id, puntos, monto, fecha) VALUES (?, ?, ?, NOW())",
      [usuario_id, puntos, monto]
    );

    await conn.query("UPDATE usuarios SET puntos = puntos + ? WHERE id = ?", [
      puntos,
      usuario_id,
    ]);

    const [rows] = await conn.query("SELECT puntos FROM usuarios WHERE id = ?", [usuario_id]);
    await conn.commit();

    res.json({
      id_compra: result.insertId,
      usuario_id,
      puntos_comprados: puntos,
      monto_pagado: monto,
      puntos_actuales: rows[0]?.puntos ?? null,
    });
  } catch {
    try {
      await conn.rollback();
    } catch {}
    return res.status(500).json({ error: "Error al procesar compra" });
  } finally {
    conn.release();
  }
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});

