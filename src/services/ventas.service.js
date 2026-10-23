const pool = require("../config/db");
const { ROLES } = require("../utils/roles");
const { BadRequestError, NotFoundError, ConflictError } = require("../utils/errors");

const MAX_ITEMS = 50;
const MAX_CANTIDAD = 1000;

function normalizarItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new BadRequestError("La venta debe tener al menos un producto");
  }
  if (items.length > MAX_ITEMS) {
    throw new BadRequestError(`Máximo ${MAX_ITEMS} productos por venta`);
  }

 
  const cantidades = new Map();
  for (const it of items) {
    const productoId = Number(it?.productoId);
    const cantidad = Number(it?.cantidad);
    if (!Number.isInteger(productoId) || productoId <= 0) {
      throw new BadRequestError("productoId inválido");
    }
    if (!Number.isInteger(cantidad) || cantidad <= 0 || cantidad > MAX_CANTIDAD) {
      throw new BadRequestError("cantidad inválida");
    }
    cantidades.set(productoId, (cantidades.get(productoId) ?? 0) + cantidad);
  }
  return cantidades;
}

async function crear(usuario, items) {
  const cantidades = normalizarItems(items);
  const ids = [...cantidades.keys()].sort((a, b) => a - b); 

  const client = await pool.connect();
  try {
    await client.query("BEGIN");


    const prods = await client.query(
      `SELECT id, nombre, precio, stock
         FROM productos
        WHERE id = ANY($1::int[]) AND activo = TRUE
        ORDER BY id
          FOR UPDATE`,
      [ids]
    );

    if (prods.rows.length !== ids.length) {
      const encontrados = new Set(prods.rows.map((p) => p.id));
      const faltante = ids.find((id) => !encontrados.has(id));
      throw new NotFoundError(`El producto ${faltante} no existe o ya no está disponible`);
    }

    let totalCentavos = 0;
    const lineas = prods.rows.map((p) => {
      const cantidad = cantidades.get(p.id);
      if (p.stock < cantidad) {
        throw new ConflictError(
          `Stock insuficiente de "${p.nombre}" (disponible: ${p.stock})`
        );
      }
      const precioCentavos = Math.round(Number(p.precio) * 100);
      totalCentavos += precioCentavos * cantidad;
      return { productoId: p.id, cantidad, precio: precioCentavos / 100 };
    });

    const venta = await client.query(
      `INSERT INTO ventas (usuario_id, total)
       VALUES ($1, $2)
       RETURNING id, usuario_id, fecha, total`,
      [usuario.id, totalCentavos / 100]
    );
    const ventaId = venta.rows[0].id;

    await client.query(
      `INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario)
       SELECT $1, * FROM unnest($2::int[], $3::int[], $4::numeric[])`,
      [
        ventaId,
        lineas.map((l) => l.productoId),
        lineas.map((l) => l.cantidad),
        lineas.map((l) => l.precio),
      ]
    );

    for (const l of lineas) {
      await client.query("UPDATE productos SET stock = stock - $1 WHERE id = $2", [
        l.cantidad,
        l.productoId,
      ]);
    }

    await client.query("COMMIT");

    return {
      ...venta.rows[0],
      total: Number(venta.rows[0].total),
      items: lineas.length,
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function listar(actor) {
  const esStaff = actor.rol === ROLES.ADMIN || actor.rol === ROLES.EMPLEADO;
  const result = await pool.query(
    `SELECT v.id, v.usuario_id, u.nombre AS usuario, v.fecha, v.total,
            COALESCE(SUM(d.cantidad), 0)::int AS unidades
       FROM ventas v
       JOIN usuarios u ON u.id = v.usuario_id
       LEFT JOIN detalle_ventas d ON d.venta_id = v.id
      ${esStaff ? "" : "WHERE v.usuario_id = $1"}
      GROUP BY v.id, u.nombre
      ORDER BY v.fecha DESC, v.id DESC`,
    esStaff ? [] : [actor.id]
  );
  return result.rows.map((v) => ({ ...v, total: Number(v.total) }));
}

async function obtener(id, actor) {
  const esStaff = actor.rol === ROLES.ADMIN || actor.rol === ROLES.EMPLEADO;

  const v = await pool.query(
    `SELECT v.id, v.usuario_id, u.nombre AS usuario, v.fecha, v.total
       FROM ventas v
       JOIN usuarios u ON u.id = v.usuario_id
      WHERE v.id = $1`,
    [id]
  );
  const venta = v.rows[0];

 
  if (!venta || (!esStaff && venta.usuario_id !== actor.id)) {
    throw new NotFoundError("Venta no encontrada");
  }

  const d = await pool.query(
    `SELECT d.producto_id, p.nombre, d.cantidad, d.precio_unitario,
            (d.cantidad * d.precio_unitario) AS subtotal
       FROM detalle_ventas d
       JOIN productos p ON p.id = d.producto_id
      WHERE d.venta_id = $1
      ORDER BY d.id`,
    [id]
  );

  return {
    ...venta,
    total: Number(venta.total),
    items: d.rows.map((i) => ({
      ...i,
      precio_unitario: Number(i.precio_unitario),
      subtotal: Number(i.subtotal),
    })),
  };
}

module.exports = { crear, listar, obtener };