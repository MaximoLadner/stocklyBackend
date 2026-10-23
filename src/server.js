require("dotenv").config();
const app = require("./app");
const pool = require("./config/db");

const PORT = 3000;

if (!process.env.JWT_SECRET) {
  console.error("Falta JWT_SECRET en el .env");
  process.exit(1);
}

async function startServer() {
  try {
    await pool.query("SELECT 1");
    console.log("Conectado a PostgreSQL correctamente");
    app.listen(PORT, () => {
      console.log(`Stockly corriendo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("No se pudo iniciar Stockly.", error);
    process.exit(1);
  }
}

startServer();