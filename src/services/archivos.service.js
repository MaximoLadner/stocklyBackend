const crypto = require("crypto");
const { PutObjectCommand, HeadObjectCommand, DeleteObjectCommand, GetObjectCommand} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const pool = require("../config/db");
const { s3, BUCKET } = require("../scripts/s3");
const { BadRequestError, NotFoundError, HttpError } = require("../utils/errors");


const TIPOS_PERMITIDOS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
 
};
const MAX_BYTES = 5 * 1024 * 1024;
const URL_TTL_SEG = 120;           
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;


async function solicitarSubida({ usuario, productoId, tipo, tamanio }) {
  if (typeof tipo !== "string" || !Number.isInteger(tamanio) || !Number.isInteger(productoId)) {
    throw new BadRequestError("Datos de archivo inválidos");
  }

  const ext = TIPOS_PERMITIDOS[tipo];
  if (!ext) throw new HttpError(415, "Tipo de archivo no permitido");
  if (tamanio <= 0 || tamanio > MAX_BYTES) {
    throw new HttpError(413, "El archivo supera el tamaño máximo (5 MB)");
  }

 
  const prod = await pool.query("SELECT id FROM productos WHERE id = $1", [productoId]);
  if (!prod.rows[0]) throw new NotFoundError("Producto no encontrado");

  const uploadId = crypto.randomUUID();
  const key = `productos/${productoId}/${crypto.randomUUID()}.${ext}`;

  await pool.query(
    `INSERT INTO archivos (id, usuario_id, producto_id, s3_key, tipo, tamanio, expira_en)
     VALUES ($1, $2, $3, $4, $5, $6, NOW() + ($7 || ' seconds')::interval)`,
    [uploadId, usuario.id, productoId, key, tipo, tamanio, String(URL_TTL_SEG * 2)]
  );

  const url = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: tipo,
      ContentLength: tamanio, 
    }),
    { expiresIn: URL_TTL_SEG }
  );

  return { uploadId, url, expiraEnSeg: URL_TTL_SEG, headers: { "Content-Type": tipo } };
}

async function confirmarSubida({ usuario, uploadId }) {
  if (typeof uploadId !== "string" || !UUID_RE.test(uploadId)) {
    throw new NotFoundError("Subida no encontrada");
  }

  const r = await pool.query(
    `SELECT id, producto_id, s3_key, tipo, tamanio
       FROM archivos
      WHERE id = $1 AND usuario_id = $2 AND estado = 'pendiente' AND expira_en > NOW()`,
    [uploadId, usuario.id]
  );
  const rec = r.rows[0];
  if (!rec) throw new NotFoundError("Subida no encontrada");

 
  let head;
  try {
    head = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: rec.s3_key }));
  } catch {
    throw new HttpError(422, "El archivo no fue subido");
  }
  if (head.ContentLength !== rec.tamanio || head.ContentType !== rec.tipo) {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: rec.s3_key }));
    await pool.query("DELETE FROM archivos WHERE id = $1", [rec.id]);
    throw new HttpError(422, "El archivo no coincide con lo declarado");
  }

 
  const upd = await pool.query(
    "UPDATE archivos SET estado = 'confirmado' WHERE id = $1 AND estado = 'pendiente' RETURNING id, producto_id",
    [rec.id]
  );
  if (!upd.rows[0]) throw new NotFoundError("Subida no encontrada");

  return { id: upd.rows[0].id, productoId: upd.rows[0].producto_id };
}


const VER_TTL_SEG = 2 * 60 * 60;


async function adjuntarImagenes(productos) {
  if (!productos.length) return productos;

  const ids = productos.map((p) => p.id);

  const r = await pool.query(
    `SELECT DISTINCT ON (producto_id) producto_id, s3_key
       FROM archivos
      WHERE producto_id = ANY($1::bigint[])
        AND estado = 'confirmado'
      ORDER BY producto_id, expira_en DESC`,
    [ids]
  );

  const urls = new Map();

  await Promise.all(
    r.rows.map(async (row) => {
      const url = await getSignedUrl(
        s3,
        new GetObjectCommand({
          Bucket: BUCKET,
          Key: row.s3_key,
        }),
        { expiresIn: VER_TTL_SEG }
      );

      urls.set(Number(row.producto_id), url);
    })
  );

  return productos.map((p) => ({
    ...p,
    imagen_url: urls.get(Number(p.id)) ?? null,
  }));
}


module.exports = { solicitarSubida, confirmarSubida, adjuntarImagenes  };