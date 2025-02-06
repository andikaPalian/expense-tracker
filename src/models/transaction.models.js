import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    transaction_type: {
        type: String,
        enum: ["income", "expense"],
        required: true,
    },
    description: {
        type: String,
        required: true,
    }
}, {
    timestamps: true,
});

const Transaction = mongoose.model("Transaction", transactionSchema);

export default Transaction;