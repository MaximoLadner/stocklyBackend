const pool = require("../config/db");

async function getCategorias(req, res) {
  try {
    const result = await pool.query(
      "SELECT id, nombre, descripcion, activa FROM categorias WHERE activa = TRUE ORDER BY id"
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener categorías" });
  }
}

async function createCategoria(req, res) {
  const { nombre, descripcion } = req.body ?? {};

  if (!nombre) {
    return res.status(400).json({ error: "nombre es obligatorio" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO categorias (nombre, descripcion, activa)
       VALUES ($1, $2, TRUE)
       RETURNING *`,
      [nombre, descripcion ?? null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al crear la categoría" });
  }
}

async function deleteCategoria(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "id inválido" });
  }

  try {
    const result = await pool.query(
      "UPDATE categorias SET activa = FALSE WHERE id = $1 AND activa = TRUE",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Categoría no encontrada" });
    }
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al eliminar la categoría" });
  }
}

module.exports = { getCategorias, createCategoria, deleteCategoria };