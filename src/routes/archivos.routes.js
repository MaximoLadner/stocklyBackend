const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const { authenticate, requireRole } = require("../middlewares/auth");
const { ROLES } = require("../utils/roles");
const controller = require("../controllers/archivos.controller");

const limitador = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: true, legacyHeaders: false });

router.use(authenticate, requireRole(ROLES.ADMIN, ROLES.EMPLEADO));

router.post("/presign", limitador, controller.presign);
router.post("/confirm", controller.confirm);

module.exports = router;