const express = require("express");
const { authenticate, requireRole } = require("../middlewares/auth");
const { ROLES } = require("../utils/roles");
const {
  getProductos,
  getProductoById,
  createProducto,
  updateProducto,
  deleteProducto,
} = require("../controllers/productos.controller");

const router = express.Router();

const staff = requireRole(ROLES.ADMIN, ROLES.EMPLEADO);
const soloAdmin = requireRole(ROLES.ADMIN);

router.get("/", authenticate, getProductos);
router.get("/:id", authenticate, getProductoById);

router.post("/", authenticate, staff, createProducto);
router.put("/:id", authenticate, staff, updateProducto);
router.delete("/:id", authenticate, soloAdmin, deleteProducto);

module.exports = router;