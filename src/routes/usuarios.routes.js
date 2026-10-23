const express = require("express");
const controller = require("../controllers/usuarios.controller");
const { authenticate, requireRole } = require("../middlewares/auth");
const { ROLES } = require("../utils/roles");

const router = express.Router();

router.use(authenticate); 

router.get("/", requireRole(ROLES.ADMIN), controller.listar);
router.post("/", requireRole(ROLES.ADMIN), controller.crear);
router.get("/:id", controller.obtener); 
router.patch("/:id", requireRole(ROLES.ADMIN), controller.actualizar);
router.delete("/:id", requireRole(ROLES.ADMIN), controller.eliminar);

module.exports = router;