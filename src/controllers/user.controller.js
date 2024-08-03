import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
const registerUser = asyncHandler(async (req, res) => {
    //Get user details from frontend/Postman
    // Validate- userName, email, fullName, password is not empty
    //Check if user already exist in DB
    //Check for images and check for avatar
    //Upload them to cloudinary
    // Get url from cloudinary and store it in db
    // Create a user object
    // Create a entry in db
    // Remove password and refresh token from response
    // Return response with 200 or error
    const { userName, email, fullName, password } = req.body;
    console.log(email);
    if (
        [userName, email, fullName, password].some(
            (field) => field?.trim() === ""
        )
    ) {
        throw new ApiError(400, "All fields are requried");
    }
    const existingUser = User.findOne({
        $or: [{ userName, email }],
    });

    if (existingUser)
        throw new ApiError(409, "Username or Email already exits");

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avtar Image is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(500, "Avtar Image not uploaded properly");
    }

    const user = await User.create({
        fullName,
        email,
        password,
        username: username.toLowerCase(),
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
    });

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if (!createdUser) {
        throw new ApiError(500, "User not created in database");
    }

    return res
        .status(201)
        .json(new ApiResponse(200, createdUser, "User Created Successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
    res.status(200).json({
        message: "User logged in",
    });
});
export { registerUser, loginUser };
