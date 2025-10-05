import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

const uploadOnCloudinary = async (filePath) => {
  // Configure Cloudinary with env variables
  cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET,
  });

  try {
    // Upload image or video
    const uploadResult = await cloudinary.uploader.upload(filePath, {
      resource_type: "auto", // auto-detect image/video
    });

    // Delete local file after upload
    fs.unlinkSync(filePath);

    // Return the full object
    return uploadResult;
  } catch (error) {
    // Delete local file even if upload fails
    fs.unlinkSync(filePath);
    console.error("Error uploading to Cloudinary:", error);
    throw error;
  }
};

export default uploadOnCloudinary;
