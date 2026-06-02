import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { cookieOptions } from "../utils/cookieOptions.js";
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
} from "../services/auth.service.js";

const register = asyncHandler(async (req, res) => {
  const { fullName, username, email, password, shopName } = req.body;
  const user = await registerUser({
    fullName,
    username,
    email,
    password,
    shopName,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, user, "User registered successfully"));
});

const login = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;
  const { user, accessToken, refreshToken } = await loginUser({ email, username, password });

  const options = cookieOptions;

  return res
    .status(200)
    .cookie("accessToken", accessToken, { ...options, maxAge: 15 * 60 * 1000 })
    .cookie("refreshToken", refreshToken, {
      ...options,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })
    .json(new ApiResponse(200, { user, accessToken }, "Login successful"));
});

const logout = asyncHandler(async (req, res) => {
  await logoutUser(req.user._id);

  const options = cookieOptions;

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, null, "Logout successful"));
});

const refreshToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken;

  const { accessToken, refreshToken: newRefreshToken } =
    await refreshAccessToken(incomingRefreshToken);

  const options = cookieOptions;

  return res
    .status(200)
    .cookie("accessToken", accessToken, { ...options, maxAge: 15 * 60 * 1000 })
    .cookie("refreshToken", newRefreshToken, {
      ...options,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })
    .json(
      new ApiResponse(
        200,
        { accessToken },
        "Access token refreshed successfully",
      ),
    );
});

export { register, login, logout, refreshToken };
