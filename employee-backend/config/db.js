import mongoose from "mongoose";

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing from environment variables");
    }

    mongoose.set("bufferCommands", false);

    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 20000
    });
    console.log("MongoDB Connected");
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
  }
};

export default connectDB;
