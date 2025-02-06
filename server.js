import express from "express";
import "dotenv/config";
import cors from "cors";
import connectDb from "./src/config/db.js";
import userRouter from "./src/routes/user.routes.js";
import transactionRouter from "./src/routes/transaction.routes.js";

const app = express();
const port = process.env.PORT;
connectDb();

app.use(cors());
app.use(express.json());

app.use("/api/user", userRouter);
app.use("/api/transaction", transactionRouter);

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
