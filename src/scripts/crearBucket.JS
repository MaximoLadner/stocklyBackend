
const { CreateBucketCommand, HeadBucketCommand } = require("@aws-sdk/client-s3");
const { s3, BUCKET } = require("../config/s3");

(async () => {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
    console.log(`✅ El bucket "${BUCKET}" ya existe`);
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: BUCKET }));
    console.log(`✅ Bucket "${BUCKET}" creado (privado)`);
  }
  process.exit(0);
})().catch((err) => {
  console.error("❌ No se pudo crear el bucket:", err.message);
  process.exit(1);
});