import { Router } from "express";
import {
  register,
  login,
  logout,
  refreshToken,
} from "../controller/auth.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh-token", refreshToken);
router.post("/logout", verifyJWT, logout);

export default router;
