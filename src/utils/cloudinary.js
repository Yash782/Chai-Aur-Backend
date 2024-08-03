import { v2 } from "cloudinary";
import { response } from "express";
import fs from "fs";
import cloudinary from "cloudinary";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECERT,
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;
        // Else upload file on cloudinary
        const response = await cloudinary.v2.uploader.upload(localFilePath, {
            resource_type: "auto",
        });
        //File uploaded sucessfully
        console.log("File is uploaded on cloudinary", response.url);
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath);
        return null;
    }
};

export { uploadOnCloudinary };
