const express = require("express");
const rateLimit = require("express-rate-limit");
const controller = require("../controllers/ventas.controller");
const { authenticate } = require("../middlewares/auth");

const router = express.Router();

const limitador = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(authenticate);

router.post("/", limitador, controller.crear);
router.get("/", controller.listar);
router.get("/:id", controller.obtener);

module.exports = router;