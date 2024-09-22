import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

// const generateAccessAndRefreshToken = async (userId) => {
//     try {
//         const user = User.findById(userId);
//         const accessToken = user.generatedAccessToken();
//         const refreshToken = user.generateRefreshToken();

//         // Save refresh token in the database
//         user.refreshToken = refreshToken;
//         user.save({ validateBeforeSave: false });

//         return { refreshToken, accessToken };
//     } catch (error) {
//         throw new ApiError(500, "Unable to generate access and refresh token.");
//     }
// };
const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);

        if (!user) {
            throw new ApiError(404, "User not found");
        }

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        // Save refresh token in the database
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { refreshToken, accessToken };
    } catch (error) {
        console.error("Token generation error: ", error);
        throw new ApiError(500, "Unable to generate access and refresh token.");
    }
};
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
    const { username, email, fullName, password } = req.body;
    if (
        [username, email, fullName, password].some(
            (field) => field?.trim() === ""
        )
    ) {
        throw new ApiError(400, "All fields are requried");
    }
    const existingUser = await User.findOne({
        $or: [{ username, email }],
    });

    if (existingUser)
        throw new ApiError(409, "Username or Email already exits");

    const avatarLocalPath = req.files?.avatar[0]?.path;
    let coverImageLocalPath;
    if (
        req.files &&
        Array.isArray(req.files.coverImage) &&
        req.files.coverImage.length > 0
    ) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }
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
    //req body -> data
    //check username or email
    //Find the user
    //Check password
    //Generate access and refresh token
    //Send in secure cookies

    const { email, username, password } = req.body;

    if (!username && !email) {
        throw new ApiError(400, "Username or email is required");
    }

    const user = await User.findOne({
        $or: [{ username }, { email }],
    });

    if (!user) {
        throw new ApiError(400, "User not found");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials");
    }

    const { refreshToken, accessToken } = await generateAccessAndRefreshToken(
        user._id
    );

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken,
                },
                "User logged in sucessfully"
            )
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findOneAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined,
            },
        },
        {
            new: true,
        }
    );
    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken =
        req.cookies.refreshToken || req.body.refreshToken;
    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized access");
    }
    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        const user = await User.findById(decodedToken?._id);
        if (!user) {
            throw new ApiError(401, "Invalid refresh token");
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used");
        }

        const options = {
            httpOnly: true,
            secure: true,
        };

        const { accessToken, newRefreshToken } =
            await generateAccessAndRefreshToken(user._id);

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("newRefreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    {
                        accessToken: accessToken,
                        refreshToken: newRefreshToken,
                    },
                    "New refresh token generated"
                )
            );
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }
});
//Export
const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
        throw new ApiError(400, "All fields are required");
    }

    const user = User.findById(req.user?.id);
    if (!user) {
        throw new ApiError(404, "User not found");
    }
    const isOldPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if (!isOldPasswordCorrect) {
        throw new ApiError(401, "Incorrect old password");
    }
    if (newPassword !== confirmNewPassword) {
        throw new ApiError(
            400,
            "New password and confirm password do not match"
        );
    }
    user.password = newPassword;
    await user.save({ validateBeforeSave: false });
    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json(200, req.user, "Current user fetched");
});

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body;
    if (!fullName || !email) {
        throw new ApiError(400, "Full Name and Email are required");
    }
    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            fullName,
            email,
        },
        {
            new: true,
        }
    );
    if (!user) {
        throw new ApiError(404, "User not found");
    }
    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "Account details updated successfully")
        );
});
export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
};
