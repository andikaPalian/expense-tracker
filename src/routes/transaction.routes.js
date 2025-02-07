import express from "express";
import { addExpense, addIncome, deleteTransaction, listTransactions } from "../controllers/transaction.controller.js";
import auth from "../middlewares/auth.js";

const transactionRouter = express.Router();

transactionRouter.use(auth);
transactionRouter.post("/add-income", addIncome);
transactionRouter.post("/add-expense", addExpense);
transactionRouter.get("/", listTransactions);
transactionRouter.delete("/:transactionId", auth, deleteTransaction);

export default transactionRouter;