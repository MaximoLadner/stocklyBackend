const pool = require("../config/db");
const { adjuntarImagenes } = require("../services/archivos.service");

const SELECT_CON_CATEGORIA = `
  SELECT p.id, p.categoria_id, c.nombre AS categoria, p.nombre,
         p.descripcion, p.precio, p.stock, p.activo, p.creado_en
  FROM productos p
  LEFT JOIN categorias c ON c.id = p.categoria_id
`;

const ORDENES = {
  recientes: "p.creado_en DESC, p.id DESC",
  precio_asc: "p.precio ASC, p.id",
  precio_desc: "p.precio DESC, p.id",
  nombre: "p.nombre ASC, p.id",
};

function validarProducto({ nombre, precio, stock }) {
  if (!nombre || precio == null) return "nombre y precio son obligatorios";
  if (precio < 0) return "el precio no puede ser negativo";
  if (stock != null && stock < 0) return "el stock no puede ser negativo";
  return null;
}

function formatearProducto(p) {
  return { ...p, precio: Number(p.precio) };
}

async function conImagenes(productos) {
  try {
    return await adjuntarImagenes(productos);
  } catch (error) {
    console.error("No se pudieron adjuntar las imágenes:", error);
    return productos.map((p) => ({ ...p, imagen_url: null }));
  }
}

async function getProductos(req, res) {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 50);
  const offset = (page - 1) * limit;

  const condiciones = ["p.activo = TRUE"];
  const params = [];

  if (req.query.categoria_id) {
    const categoriaId = Number(req.query.categoria_id);
    if (!Number.isInteger(categoriaId)) {
      return res.status(400).json({ error: "categoria_id inválido" });
    }
    params.push(categoriaId);
    condiciones.push(`p.categoria_id = $${params.length}`);
  }

  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q) {
    params.push(`%${q}%`);
    condiciones.push(`p.nombre ILIKE $${params.length}`);
  }

  const where = `WHERE ${condiciones.join(" AND ")}`;
  const orderBy = ORDENES[req.query.orden] ?? ORDENES.recientes;

  try {
    const totalResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM productos p ${where}`,
      params
    );
    const total = totalResult.rows[0].total;

    const result = await pool.query(
      `${SELECT_CON_CATEGORIA} ${where}
       ORDER BY ${orderBy}
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    res.json({
      data: await conImagenes(result.rows.map(formatearProducto)),
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener productos" });
  }
}

async function getProductoById(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "id inválido" });
  }

  try {
    const result = await pool.query(
      `${SELECT_CON_CATEGORIA} WHERE p.id = $1 AND p.activo = TRUE`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    const [producto] = await conImagenes([formatearProducto(result.rows[0])]);
    res.json(producto);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener el producto" });
  }
}

async function createProducto(req, res) {
  const body = req.body ?? {};
  const errorValidacion = validarProducto(body);
  if (errorValidacion) {
    return res.status(400).json({ error: errorValidacion });
  }

  const { categoria_id, nombre, descripcion, precio, stock } = body;

  try {
    const result = await pool.query(
      `INSERT INTO productos (categoria_id, nombre, descripcion, precio, stock)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [categoria_id ?? null, nombre, descripcion ?? null, precio, stock ?? 0]
    );

    res.status(201).json(formatearProducto(result.rows[0]));
  } catch (error) {
    if (error.code === "23503") {
      return res.status(400).json({ error: "La categoría indicada no existe" });
    }
    console.error(error);
    res.status(500).json({ error: "Error al crear el producto" });
  }
}

async function updateProducto(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "id inválido" });
  }

  const body = req.body ?? {};
  const errorValidacion = validarProducto(body);
  if (errorValidacion) {
    return res.status(400).json({ error: errorValidacion });
  }

  const { categoria_id, nombre, descripcion, precio, stock } = body;

  try {
    const result = await pool.query(
      `UPDATE productos
       SET categoria_id = $1,
           nombre = $2,
           descripcion = $3,
           precio = $4,
           stock = $5
       WHERE id = $6 AND activo = TRUE
       RETURNING *`,
      [categoria_id ?? null, nombre, descripcion ?? null, precio, stock ?? 0, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    res.json(formatearProducto(result.rows[0]));
  } catch (error) {
    if (error.code === "23503") {
      return res.status(400).json({ error: "La categoría indicada no existe" });
    }
    console.error(error);
    res.status(500).json({ error: "Error al actualizar el producto" });
  }
}

async function deleteProducto(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "id inválido" });
  }

  try {
    const result = await pool.query(
      "UPDATE productos SET activo = FALSE WHERE id = $1 AND activo = TRUE",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al eliminar el producto" });
  }
}

module.exports = {
  getProductos,
  getProductoById,
  createProducto,
  updateProducto,
  deleteProducto,
};