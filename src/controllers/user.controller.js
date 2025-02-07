import User from "../models/user.models.js";
import Transaction from "../models/transaction.models.js";
import validator from "validator";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const registerUser = async (req, res) => {
    try {
        const {name, email, password, balance} = req.body;
        if (!name?.trim() || !email?.trim() || !password?.trim()) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        if (typeof name !== "string" || typeof email !== "string" || typeof password !== "string" || typeof balance !== "number") {
            return res.status(400).json({
                message: "Invalid data type"
            });
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({
                message: "Invalid email address"
            });
        }

        const passwordReqex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordReqex.test(password)) {
            return res.status(400).json({
                message: "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character"
            });
        }

        const userExists = await User.findOne({
            email: email.toLowerCase().trim(),
        });
        if (userExists) {
            return res.status(400).json({
                message: "User already exists"
            });
        };

        const hashedPassword = await bcrypt.hash(password, 12);
        
        const user = new User({
            name,
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            balance: balance || 0,
        });
        await user.save();
        const userResponse = user.toObject();
        delete userResponse.password;
        
        res.status(201).json({
            message: "User register successfully",
            user: userResponse,
        });
    } catch (error) {
        console.error("Error during registration:", error);
        return res.status(500).json({
            message: "Internal server error",
            error: error.message || "An unexpected error occurred",
        });
    }
}

const loginUser = async (req, res) => {
    try {
        const {email, password} = req.body;
        if (!email?.trim() || !password?.trim()) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }
        
        if (!validator.isEmail(email)) {
            return res.status(400).json({
                message: "Invalid email address"
            });
        };

        const user = await User.findOne({
            email: email.toLowerCase().trim(),
        });
        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
            const token = jwt.sign({
                id: user._id,
            }, process.env.JWT_SECRET, {expiresIn: "1d"});
            user.password = undefined;
            return res.status(200).json({
                message: "Login successful",
                user: {
                    token,
                    user
                }
            });
        } else {
            return res.status(401).json({
                message: "Invalid credentials"
            });
        }
    } catch (error) {
        console.error("Error during login:", error);
        return res.status(500).json({
            message: "Internal server error",
            error: error.message || "An unexpected error occurred",
        });
    }
}

const userDashboard = async (req, res) => {
    try {
        const userId = req.user.userId;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const userResponse = user.toObject();
        delete userResponse.password;

        const transactions = await Transaction.find({user: userId}).sort({createdAt: -1}).limit(10);

        res.status(200).json({
            message: "User dashboard",
            dashboard: {
                user: userResponse,
                transactions: transactions.map(transaction => ({
                    id: transaction._id,
                    amount: transaction.amount,
                    description: transaction.description,
                    type: transaction.type,
                    createdAt: transaction.createdAt,
                }))
            }
        });
    } catch (error) {
        console.error("Error during getting user dashboard:", error);
        return res.status(500).json({
            message: "Internal server error",
            error: error.message || "An unexpected error occurred",
        });
    }
}

export {registerUser, loginUser, userDashboard};