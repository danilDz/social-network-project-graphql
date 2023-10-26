import { validationResult } from "express-validator";

import Post from "../models/postModel.js";
import User from "../models/userModel.js";

import { deleteImage } from "../utils/image.js";
import socket from "../utils/socket.js";

export const getPosts = async (req, res, next) => {
    const page = req.query.page || 1,
      perPage = 2;
    try {
      const totalItems = await Post.find().countDocuments();
      const posts = await Post.find()
        .populate("creator")
        .sort({ createdAt: -1 })
        .skip((page - 1) * perPage)
        .limit(perPage);

      res.status(200).json({
        message: "Fetched posts successfully!",
        posts,
        totalItems,
      });
    } catch (err) {
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    }
  },
  getPost = async (req, res, next) => {
    const postId = req.params.postId;
    try {
      const post = await Post.findById(postId).populate("creator");
      if (!post) {
        const error = new Error("Couldn't find a post.");
        error.statusCode = 404;
        throw error;
      }
      res.status(200).json({
        message: "Post fetched!",
        post,
      });
    } catch (err) {
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    }
  },
  putPost = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed! Entered data is incorrect.");
      error.statusCode = 422;
      throw error;
    }

    const postId = req.params.postId,
      title = req.body.title,
      content = req.body.content;
    let imageUrl = req.body.image;
    if (req.file) imageUrl = req.file.path;
    if (!imageUrl) {
      const error = new Error("No file picked!");
      error.statusCode = 422;
      throw error;
    }

    try {
      const post = await Post.findById(postId).populate("creator");
      if (!post) {
        const error = new Error("Couldn't find a post.");
        error.statusCode = 404;
        throw error;
      }
      if (post.creator._id.toString() !== req.userId) {
        const error = new Error("Not authorized!");
        error.statusCode = 403;
        throw error;
      }
      if (imageUrl !== post.imageUrl) deleteImage(post.imageUrl);

      post.title = title;
      post.content = content;
      post.imageUrl = imageUrl;

      const result = await post.save();
      socket.getIO().emit("posts", { action: "update", postData: result });
      res.status(200).json({
        message: "Post updated!",
        post: result,
      });
    } catch (err) {
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    }
  },
  postPost = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed! Entered data is incorrect.");
      error.statusCode = 422;
      throw error;
    }

    if (!req.file) {
      const error = new Error("No image provided!");
      error.statusCode = 422;
      throw error;
    }

    const title = req.body.title,
      content = req.body.content,
      imageUrl = req.file.path;

    const post = new Post({
      title,
      content,
      creator: req.userId,
      imageUrl,
    });

    try {
      await post.save();
      const user = await User.findById(req.userId);
      user.posts.push(post);
      await user.save();
      socket.getIO().emit("posts", {
        action: "create",
        post: { ...post._doc, creator: { _id: req.userId, name: user.name } },
      });
      res.status(201).json({
        message: "Post was created successfully!",
        post: post,
        creator: {
          _id: user._id,
          name: user.name,
        },
      });
    } catch (err) {
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    }
  },
  deletePost = async (req, res, next) => {
    const postId = req.params.postId;

    try {
      const post = await Post.findById(postId);
      if (!post) {
        const error = new Error("Couldn't find a post.");
        error.statusCode = 404;
        throw error;
      }
      if (post.creator.toString() !== req.userId) {
        const error = new Error("Not authorized!");
        error.statusCode = 403;
        throw error;
      }
      deleteImage(post.imageUrl);
      await Post.findByIdAndRemove(postId);
      const user = await User.findById(req.userId);
      user.posts.pull(postId);
      await user.save();
      socket.getIO().emit("posts", {
        action: "delete",
        postId: postId,
      });
      res.status(200).json({
        message: "Post successfully deleted!",
      });
    } catch (err) {
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    }
  };
