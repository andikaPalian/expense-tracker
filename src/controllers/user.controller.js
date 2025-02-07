import User from "../models/user.models.js";
import Transaction from "../models/transaction.models.js";
import validator from "validator";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

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

        let transport = nodemailer.createTransport({
            host: process.env.MAILTRAP_HOST,
            port: process.env.MAILTRAP_PORT,
            auth: {
            user: process.env.MAILTRAP_USER,
            pass: process.env.MAILTRAP_PASS
            }
        });
        
        await transport.sendMail({
            from: "test@gmai.com",
            to: user.email,
            subject: "Welcome to Expense Tracker",
            text: "Thank you for registering with Expense Tracker. We are excited to have you on board!"
        });
        
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

const forgotPassword = async (req, res) => {
    try {
        const {email} = req.body;
        if (!email) {
            return res.status(400).json({
                message: "Email is required"
            });
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({
                message: "Invalid email address"
            });
        }

        const user = await User.findOne({
            email: email.toLowerCase().trim(),
        });
        if(!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const resetCode = Math.floor(100000 + Math.random() * 900000);
        const resetCodeExpiration = new Date(Date.now() + 3600000);

        const hashedResetCode = await bcrypt.hash(resetCode.toString(), 12);

        await User.updateOne({
            email: email.toLowerCase().trim(),
        }, {
            reset_code: hashedResetCode,
            reset_code_expiration: resetCodeExpiration,
        }, {
            runValidators: true,
        });

        let transport = nodemailer.createTransport({
            host: process.env.MAILTRAP_HOST,
            port: process.env.MAILTRAP_PORT,
            auth: {
                user: process.env.MAILTRAP_USER,
                pass: process.env.MAILTRAP_PASS
            }
        });
        
        try {
            await transport.sendMail({
                from: "Expense Tracker <no-reply@expense-tracker.com>",
                to: user.email,
                subject: "Reset Password",
                text: `Your reset code is ${resetCode}. Reset code will expire in 1 hour`,
                html: `<p>Your reset code is <b>${resetCode}</b>. Reset code will expire in 1 hour</p>`
            });
        } catch (error) {
            console.error("Error during sending email:", error);
            return res.status(500).json({
                message: "Failed to send email",
            });
        }

        res.status(200).json({
            message: "Reset code sent successfully"
        });
    } catch (error) {
        console.error("Error during forgot password:", error);
        return res.status(500).json({
            message: "Internal server error",
            error: error.message || "An unexpected error occurred",
        });
    }
}

const resetPassword = async (req, res) => {
    try {
        const {email, resetCode, newPassword} = req.body;
        if (!email) {
            return res.status(400).json({
                message: "Email is required"
            });
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({
                message: "Invalid email address"
            });
        }

        if (!resetCode) {
            return res.status(400).json({
                message: "Reset code is required"
            });
        }

        if (!newPassword) {
            return res.status(400).json({
                message: "Please provide a new password"
            });
        }

        const passwordReqex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordReqex.test(newPassword)) {
            return res.status(400).json({
                message: "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character"
            });
        }

        const user = await User.findOne({
            email: email.toLowerCase().trim(),
        });
        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const isResetCodeValid = await bcrypt.compare(resetCode, user.reset_code);
        if (!isResetCodeValid) {
            return res.status(400).json({
                message: "Invalid reset code"
            });
        }

        if (user.reset_code_expiration < new Date()) {
            return res.status(400).json({
                message: "Reset code has expired"
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12);

        await User.updateOne({
            email: email.toLowerCase().trim(),
        }, {
            password: hashedPassword,
            reset_code: null,
            reset_code_expiration: null,
        }, {
            runValidators: true,
        });

        let transport = nodemailer.createTransport({
            host: process.env.MAILTRAP_HOST,
            port: process.env.MAILTRAP_PORT,
            auth: {
                user: process.env.MAILTRAP_USER,
                pass: process.env.MAILTRAP_PASS
            }
        });
        
        try {
            await transport.sendMail({
                from: "Expense Tracker <no-reply@expense-tracker.com>",
                to: user.email,
                subject: "Password Reset Successful",
                text: "Your password has been reset successfully",
                html: `<p>Your password has been reset successfully</p>`
            });
        } catch (error) {
            console.error("Error during sending email:", error);
            return res.status(500).json({
                message: "Failed to send email",
            });
        }

        res.status(200).json({
            message: "Password reset successful"
        });
    } catch (error) {
        console.error("Error during reset password:", error);
        return res.status(500).json({
            message: "Internal server error",
            error: error.message || "An unexpected error occurred",
        });
    }
}

export {registerUser, loginUser, userDashboard, forgotPassword, resetPassword};