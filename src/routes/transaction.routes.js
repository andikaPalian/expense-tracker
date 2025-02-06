import express from "express";
import { addExpense, addIncome, listTransactions } from "../controllers/transaction.controller.js";
import auth from "../middlewares/auth.js";

const transactionRouter = express.Router();

transactionRouter.use(auth);
transactionRouter.post("/add-income", addIncome);
transactionRouter.post("/add-expense", addExpense);
transactionRouter.get("/", listTransactions);

export default transactionRouter;