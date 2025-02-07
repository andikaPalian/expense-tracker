import validator from "validator";
import Transaction from "../models/transaction.models.js";
import User from "../models/user.models.js";
import mongoose from "mongoose";

const addIncome = async (req, res) => {
    try {
        const userId = req.user.userId;
        const {amount, description} = req.body;
        if (!amount || !description) {
            return res.status(400).json({
                message: "Amount and description are required"
            });
        }

        if (!validator.isNumeric(amount.toString())) {
            return res.status(400).json({
                message: "Amount must be a number"
            });
        }

        if (amount < 0) {
            return res.status(400).json({
                message: "Amount must be positive number"
            });
        }

        const transaction = new Transaction({
            user: userId,
            amount,
            transaction_type: "income",
            description,
        });
        await transaction.save();

        await User.updateOne({
            _id: userId
        }, {
            $inc: {
                balance: amount
            }
        }, {
            runValidators: true,
        });
        res.status(201).json({
            message: "Income added successfully",
            transaction: {
                user: transaction.user,
                amount: transaction.amount,
                description: transaction.description,
                type: transaction.transaction_type,
            }
        });
    } catch (error) {
        console.error("Error during income addition:", error);
        return res.status(500).json({
            message: "Internal server error",
            error: error.message || "An unexpected error occurred",
        });
    }
}

const addExpense = async (req, res) => {
    try {
        const userId = req.user.userId;
        const {amount, description} = req.body;

        if (!amount || !description) {
            return res.status(400).json({
                message: "Amount and description are required"
            });
        }

        if (!validator.isNumeric(amount.toString())) {
            return res.status(400).json({
                message: "Amount must be a number"
            });
        }

        if (amount < 0) {
            return res.status(400).json({
                message: "Amount must be positive number"
            });
        }

        // if (amount > req.user.balance) {
        //     return res.status(400).json({
        //         message: "Insufficient balance"
        //     });
        // }

        const transaction = new Transaction({
            user: userId,
            amount,
            transaction_type: "expense",
            description,
        });
        await transaction.save();

        await User.updateOne({
            _id: userId
        }, {
            $inc: {
                balance: -amount
            }
        }, {
            runValidators: true
        });
        res.status(201).json({
            message: "Expense added successfully",
            transaction: {
                user: transaction.user,
                amount: transaction.amount,
                description: transaction.description,
                type: transaction.transaction_type,
            }
        });
    } catch (error) {
        console.error("Error during expense addition:", error);
        return res.status(500).json({
            message: "Internal server error",
            error: error.message || "An unexpected error occurred",
        });
    }
}

const listTransactions = async (req, res) => {
    try {
        const userId = req.user.userId;
        const {transaction_type, page = 1, limit = 10} = req.query;
        const pageNum = Number(page);
        const limitNum = Number(limit);
        const skip = (pageNum - 1) * limitNum;
        const query = {user: userId};

        const validTransactionTypes = ["income", "expense"];
        if (transaction_type) {
            if (!validTransactionTypes.includes(transaction_type)) {
                return res.status(400).json({
                    message: "Invalid transaction type"
                });
            }
            query.transaction_type = transaction_type;
        }

        // Menghitung total transaksi
        const totalTransactions = await Transaction.countDocuments(query);

        // Mengambil transaksi dengan pagination
        const transactions = await Transaction.find(query).skip(skip).limit(limitNum).sort({createdAt: -1});

        res.status(200).json({
            message: "Transactions retrieved successfully",
            transactions: {
                totalTransactions,
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalTransactions / parseInt(limit)),
                transactions: transactions.map(transaction => ({
                    amount: transaction.amount,
                    description: transaction.description,
                    type: transaction.transaction_type,
                    createdAt: transaction.createdAt,
                }))
            }
        })
    } catch (error) {
        console.error("Error during transaction retrieval:", error);
        return res.status(500).json({
            message: "Internal server error",
            error: error.message || "An unexpected error occurred",
        });
    }
}

const deleteTransaction = async (req, res) => {
    try {
        const {transactionId} = req.params;
        const userId = req.user.userId;

        if (!mongoose.Types.ObjectId.isValid(transactionId)) {
            return res.status(400).json({
                message: "Invalid transaction ID"
            });
        }

        const transaction = await Transaction.findOne({
            _id: transactionId
        });
        if (!transaction) {
            return res.status(404).json({
                message: "Transaction not found"
            });
        }

        if (transaction.transaction_type === "income") {
            await User.updateOne({
                _id: userId
            }, {
                $inc: {
                    balance: -transaction.amount
                }
            }, {
                runValidators: true
            });
        } else if (transaction.transaction_type === "expense") {
            await User.updateOne({
                _id: userId
            }, {
                $inc: {
                    balance: transaction.amount
                }
            }, {
                runValidators: true
            });
        }

        await Transaction.deleteOne({
            _id: transactionId,
        });

        res.status(200).json({
            message: "Transaction deleted successfully"
        });
    } catch (error) {
        console.error("Error during transaction deletion:", error);
        return res.status(500).json({
            message: "Internal server error",
            error: error.message || "An unexpected error occurred",
        });
    }
}

export {addIncome, addExpense, listTransactions, deleteTransaction};