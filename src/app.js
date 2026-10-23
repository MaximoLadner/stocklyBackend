const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const productosRoutes = require("./routes/productos.routes");
const categoriasRoutes = require("./routes/categorias.routes");
const authRoutes = require("./routes/auth.routes");
const usuariosRoutes = require("./routes/usuarios.routes");
const archivosRoutes = require("./routes/archivos.routes");

const errorHandler = require("./middlewares/errorHandler");

const ventasRoutes = require("./routes/ventas.routes");

const app = express();

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/productos", productosRoutes);
app.use("/api/categorias", categoriasRoutes);
app.use("/api/archivos", archivosRoutes);
app.use("/api/ventas", ventasRoutes);

app.use(errorHandler);

module.exports = app;