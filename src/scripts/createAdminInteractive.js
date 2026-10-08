import mongoose from "mongoose";
import dotenv from "dotenv";
import readline from "readline";
import User from "../models/User.model.js";
import { hashPassword } from "../utils/hashPassword.js";

// Load environment variables
dotenv.config();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const question = (query) => {
    return new Promise((resolve) => {
        rl.question(query, resolve);
    });
};

const createAdminInteractive = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected to MongoDB\n");

        // Get admin details from user input
        const name = await question("Enter admin name: ");
        const email = await question("Enter admin email: ");
        const password = await question("Enter admin password: ");

        // Validate inputs
        if (!name || !email || !password) {
            console.log("❌ All fields are required!");
            rl.close();
            process.exit(1);
        }

        // Check if admin already exists
        const existingAdmin = await User.findOne({ email });
        if (existingAdmin) {
            console.log("❌ User with this email already exists!");
            rl.close();
            process.exit(1);
        }

        // Hash the password
        const hashedPassword = await hashPassword(password);

        // Create admin user
        const admin = await User.create({
            name,
            email,
            password: hashedPassword,
            role: "admin",
        });

        console.log("\n✅ Admin user created successfully!");
        console.log("📧 Email:", admin.email);
        console.log("👤 Name:", admin.name);
        console.log("🔑 Role:", admin.role);
        console.log("\n⚠️  Please save your credentials securely!");

        rl.close();
        process.exit(0);
    } catch (error) {
        console.error("❌ Error creating admin:", error.message);
        rl.close();
        process.exit(1);
    }
};

createAdminInteractive();
