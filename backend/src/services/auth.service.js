import { User } from "../models/user.model.js";
import { Shop } from "../models/shop.model.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";

const toSlug = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const generateUniqueShopSlug = async (shopName) => {
  const base = toSlug(shopName) || `shop-${Date.now()}`;
  let slug = base;
  let i = 1;
  while (await Shop.exists({ slug })) {
    slug = `${base}-${i}`;
    i += 1;
  }
  return slug;
};

const registerUser = async ({
  fullName,
  username,
  email,
  password,
  shopName,
}) => {
  if (!fullName || !username || !email || !password || !shopName) {
    throw new ApiError(400, "All fields are required");
  }

  if (password.length < 6) {
    throw new ApiError(400, "Password must be at least 6 characters");
  }

  const existingUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existingUser) {
    throw new ApiError(409, "User with email or username already exists");
  }

  const slug = await generateUniqueShopSlug(shopName);
  const shop = await Shop.create({
    name: shopName.trim(),
    slug,
  });

  const user = await User.create({
    fullName: fullName.trim(),
    username: username.toLowerCase(),
    email,
    password,
    shopId: shop._id,
    role: "owner",
  });

  shop.owner = user._id;
  await shop.save({ validateBeforeSave: false });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken",
  );

  return createdUser;
};

const loginUser = async ({ email, username, password }) => {
  if ((!email && !username) || !password) {
    throw new ApiError(400, "Email/username and password are required");
  }

  const user = await User.findOne({
    $or: [{ email }, { username }],
  }).populate("shopId", "name slug");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid credentials");
  }

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  const loggedInUser = await User.findById(user._id)
    .select("-password -refreshToken")
    .populate("shopId", "name slug");

  return { user: loggedInUser, accessToken, refreshToken };
};

const logoutUser = async (userId) => {
  await User.findByIdAndUpdate(
    userId,
    { $unset: { refreshToken: 1 } },
    // { new: true },
    { returnDocument: "after" },
  );
};

const refreshAccessToken = async (incomingRefreshToken) => {
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Refresh token is required");
  }

  let decoded;
  try {
    decoded = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET,
    );
  } catch {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  const user = await User.findById(decoded._id);

  if (!user || user.refreshToken !== incomingRefreshToken) {
    throw new ApiError(401, "Invalid refresh token");
  }

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
};

export { registerUser, loginUser, logoutUser, refreshAccessToken };
