const express = require("express");
const { login, register, logout, me } = require("../controllers/auth.controller");
const { authenticate } = require("../middlewares/auth");

const router = express.Router();

router.post("/login", login);
router.post("/register", register);
router.post("/logout", logout);
router.get("/me", authenticate, me);

module.exports = router;