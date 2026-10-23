require("dotenv").config();
const service = require("../services/usuarios.service");
const pool = require("../config/db");

async function main() {
  const [nombre, email, password] = process.argv.slice(2);
  if (!nombre || !email || !password) {
    console.error('Uso: node src/scripts/crearAdmin.js "Nombre" email password');
    process.exit(1);
  }
  const usuario = await service.crear({ nombre, email, password, rol: "admin" });
  console.log("Admin creado:", usuario);
  await pool.end();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});