const express = require("express");
const { authenticate, requireRole } = require("../middlewares/auth");
const { ROLES } = require("../utils/roles");
const {
  getCategorias,
  createCategoria,
  deleteCategoria,
} = require("../controllers/categorias.controller");

const router = express.Router();

const staff = requireRole(ROLES.ADMIN, ROLES.EMPLEADO);
const soloAdmin = requireRole(ROLES.ADMIN);

router.get("/", authenticate, getCategorias);
router.post("/", authenticate, staff, createCategoria);
router.delete("/:id", authenticate, soloAdmin, deleteCategoria);

module.exports = router;