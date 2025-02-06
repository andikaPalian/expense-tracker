import jwt from "jsonwebtoken";
import User from "../models/user.models.js";

const auth = async (req, res, next) => {
    try {
        let token;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer")) {
            token = authHeader.split(" ")[1];
            jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
                if (err) {
                    return res.status(403).json({
                        message: "User is not authorized"
                    });
                }
                const user = await User.findById(decoded.user?.id || decoded.id);
                if (!user) {
                    return res.status(404).json({
                        message: "User not found"
                    });
                }
                req.user = {
                    userId: user._id,
                    name: user.name,
                    email: user.email,
                    balance: user.balance,
                }
                next();
            });
        } else {
            return res.status(403).json({
                message: "Token is missing or not provided"
            });
        }
    } catch (error) {
        console.error("Error during authentication:", error);
        return res.status(500).json({
            message: "Internal server error",
            error: error.message || "An unexpected error occurred",
        });
    }
}

export default auth;