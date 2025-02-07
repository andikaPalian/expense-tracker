import express from "express";
import { forgotPassword, loginUser, registerUser, resetPassword, userDashboard } from "../controllers/user.controller.js";
import auth from "../middlewares/auth.js";

const userRouter = express.Router();

userRouter.post("/register", registerUser);
userRouter.post("/login", loginUser);
userRouter.get("/dashboard", auth, userDashboard);
userRouter.post("/forgot-password", forgotPassword);
userRouter.post("/reset-password", resetPassword);

export default userRouter;