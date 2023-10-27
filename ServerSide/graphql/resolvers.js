import bcrypt from "bcryptjs";
import validator from "validator";
import jwt from "jsonwebtoken";

import User from "../models/userModel.js";
import Post from "../models/postModel.js";
import { deleteImage } from "../utils/image.js";

export default {
  createUser: async function ({ userInput }, req) {
    const email = userInput.email,
      password = userInput.password,
      name = userInput.name;

    let errors = [];
    if (!validator.isEmail(email)) {
      errors.push({ message: "Email is invalid!" });
    }
    if (
      validator.isEmpty(password) ||
      !validator.isLength(password, { min: 5 })
    ) {
      errors.push({ message: "Password too short!" });
    }
    if (errors.length > 0) {
      const error = new Error("Invalid input data!");
      error.data = errors;
      error.code = 422;
      throw error;
    }

    const existingUser = await User.findOne({ email: email });
    if (existingUser) {
      const error = new Error("User already exists!");
      throw error;
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new User({
      email,
      password: hashedPassword,
      name,
    });
    const createdUser = await user.save();
    return { ...createdUser._doc, _id: createdUser._id.toString() };
  },
  login: async function ({ email, password }, req) {
    const user = await User.findOne({ email: email });
    if (!user) {
      const error = new Error("User not found!");
      error.code = 401;
      throw error;
    }
    const isEqual = await bcrypt.compare(password, user.password);
    if (!isEqual) {
      const error = new Error("Password is incorrect!");
      error.code = 401;
      throw error;
    }
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
      },
      "secret",
      {
        expiresIn: "1h",
      }
    );
    return { token, userId: user._id.toString() };
  },
  createPost: async function ({ postInput }, req) {
    if (!req.isAuth) {
      const error = new Error("Not authenticated!");
      error.code = 401;
      throw error;
    }

    const title = postInput.title,
      content = postInput.content,
      imageUrl = postInput.imageUrl;

    let errors = [];
    if (validator.isEmpty(title) || !validator.isLength(title, { min: 5 })) {
      errors.push({ message: "Title is invalid!" });
    }
    if (
      validator.isEmpty(content) ||
      !validator.isLength(content, { min: 5 })
    ) {
      errors.push({ message: "Content is invalid!" });
    }
    if (errors.length > 0) {
      const error = new Error("Invalid input data!");
      error.data = errors;
      error.code = 422;
      throw error;
    }
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("Invalid user!");
      error.code = 401;
      throw error;
    }

    const post = new Post({
      title,
      content,
      imageUrl,
      creator: user,
    });

    const createdPost = await post.save();
    user.posts.push(createdPost);
    await user.save();
    return {
      ...createdPost._doc,
      _id: createdPost._id.toString(),
      createdAt: createdPost.createdAt.toISOString(),
      updatedAt: createdPost.updatedAt.toISOString(),
    };
  },
  getPosts: async function ({ page }, req) {
    if (!req.isAuth) {
      const error = new Error("Not authenticated!");
      error.code = 401;
      throw error;
    }
    if (!page) page = 1;
    const perPage = 2;
    const totalPosts = await Post.find().countDocuments();
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .populate("creator");
    return {
      posts: posts.map((post) => ({
        ...post._doc,
        _id: post._id.toString(),
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
      })),
      totalPosts,
    };
  },
  getPost: async function ({ postId }, req) {
    if (!req.isAuth) {
      const error = new Error("Not authenticated!");
      error.code = 401;
      throw error;
    }
    const post = await Post.findById(postId).populate("creator");
    if (!post) {
      const error = new Error("No post found!");
      error.code = 404;
      throw error;
    }
    return {
      ...post._doc,
      _id: post._id.toString(),
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    };
  },
  updatePost: async function ({ id, postInput }, req) {
    if (!req.isAuth) {
      const error = new Error("Not authenticated!");
      error.code = 401;
      throw error;
    }

    const title = postInput.title,
      content = postInput.content,
      imageUrl = postInput.imageUrl;

    let errors = [];
    if (validator.isEmpty(title) || !validator.isLength(title, { min: 5 })) {
      errors.push({ message: "Title is invalid!" });
    }
    if (
      validator.isEmpty(content) ||
      !validator.isLength(content, { min: 5 })
    ) {
      errors.push({ message: "Content is invalid!" });
    }
    if (errors.length > 0) {
      const error = new Error("Invalid input data!");
      error.data = errors;
      error.code = 422;
      throw error;
    }

    const post = await Post.findById(id).populate("creator");
    if (!post) {
      const error = new Error("No post found!");
      error.code = 404;
      throw error;
    }
    if (post.creator._id.toString() !== req.userId.toString()) {
      const error = new Error("Not authorized!");
      error.code = 403;
      throw error;
    }
    post.title = title;
    post.content = content;
    if (postInput.imageUrl !== "undefined") {
      post.imageUrl = postInput.imageUrl;
    }
    const updatedPost = await post.save();
    return {
      ...updatedPost._doc,
      _id: updatedPost._id.toString(),
      createdAt: updatedPost.createdAt.toISOString(),
      updatedAt: updatedPost.updatedAt.toISOString(),
    };
  },
  deletePost: async function ({id}, req) {
    if (!req.isAuth) {
      const error = new Error("Not authenticated!");
      error.code = 401;
      throw error;
    }
    const post = await Post.findById(id);
    if (!post) {
      const error = new Error("No post found!");
      error.code = 404;
      throw error;
    }
    if (post.creator.toString() !== req.userId.toString()) {
      const error = new Error("Not authorized!");
      error.code = 403;
      throw error;
    }
    deleteImage(post.imageUrl);
    await Post.findByIdAndRemove(id);
    const user = await User.findById(req.userId);
    user.posts.pull(id);
    await user.save();
    return true;
  }
};
