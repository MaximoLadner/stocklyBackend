const bcrypt = require("bcrypt");
const pool = require("../config/db");
const { ROLES, ROLES_VALIDOS } = require("../utils/roles");
const { BadRequestError, NotFoundError, ConflictError } = require("../utils/errors");


const COLUMNAS = "id, nombre, email, rol, activo, creado_en";

async function listar() {
  const result = await pool.query(`SELECT ${COLUMNAS} FROM usuarios ORDER BY id`);
  return result.rows;
}

async function obtener(id, actor) {
  
  if (actor.rol !== ROLES.ADMIN && actor.id !== id) {
    throw new NotFoundError("Usuario no encontrado");
  }

  const result = await pool.query(
    `SELECT ${COLUMNAS} FROM usuarios WHERE id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError("Usuario no encontrado");
  }
  return result.rows[0];
}

async function crear({ nombre, email, password, rol }) {
  if (
    typeof nombre !== "string" || typeof email !== "string" || typeof password !== "string" ||
    !nombre.trim() || !email.trim() || !password
  ) {
    throw new BadRequestError("nombre, email y password son obligatorios");
  }
  if (password.length < 8) {
    throw new BadRequestError("la contraseña debe tener al menos 8 caracteres");
  }

  const emailFinal = email.trim().toLowerCase();
  const nombreFinal = nombre.trim();

  const rolFinal = rol ?? ROLES.EMPLEADO;
  if (!ROLES_VALIDOS.includes(rolFinal)) {
    throw new BadRequestError(`rol inválido. Opciones: ${ROLES_VALIDOS.join(", ")}`);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const result = await pool.query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol)
       VALUES ($1, $2, $3, $4)
       RETURNING ${COLUMNAS}`,
      [nombreFinal, emailFinal, passwordHash, rolFinal]
    );
    return result.rows[0];
  } catch (error) {
    if (error.code === "23505") {
      throw new ConflictError("Ya existe un usuario con ese email");
    }
    throw error;
  }
}

async function actualizar(id, { nombre, rol, activo }, actor) {
  if (rol != null && !ROLES_VALIDOS.includes(rol)) {
    throw new BadRequestError(`rol inválido. Opciones: ${ROLES_VALIDOS.join(", ")}`);
  }
 
  if (id === actor.id && ((rol != null && rol !== actor.rol) || activo === false)) {
    throw new BadRequestError("No podés cambiar tu propio rol ni desactivarte");
  }

  const result = await pool.query(
    `UPDATE usuarios
     SET nombre = COALESCE($1, nombre),
         rol    = COALESCE($2, rol),
         activo = COALESCE($3, activo)
     WHERE id = $4
     RETURNING ${COLUMNAS}`,
    [nombre ?? null, rol ?? null, activo ?? null, id]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError("Usuario no encontrado");
  }
  return result.rows[0];
}

async function eliminar(id, actor) {
  
  if (id === actor.id) {
    throw new BadRequestError("No podés eliminarte a vos mismo");
  }

  let result;
  try {
    result = await pool.query("DELETE FROM usuarios WHERE id = $1", [id]);
  } catch (error) {
    
    if (error.code === "23503") {
      throw new ConflictError(
        "No se puede eliminar: tiene registros asociados. Desactivalo en su lugar."
      );
    }
    throw error;
  }

  if (result.rowCount === 0) {
    throw new NotFoundError("Usuario no encontrado");
  }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };