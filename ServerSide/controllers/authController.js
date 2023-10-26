import { validationResult } from "express-validator";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import User from "../models/userModel.js";

export const putSignup = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed!");
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }
    const email = req.body.email,
      name = req.body.name,
      password = req.body.password;

    try {
      const hashedPassword = await bcrypt.hash(password, 12);
      const user = new User({
        email,
        name,
        password: hashedPassword,
      });
      const userSaveResult = await user.save();
      res.status(201).json({
        message: "User created!",
        userId: userSaveResult._id,
      });
    } catch (err) {
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    }
  },
  postLogin = async (req, res, next) => {
    const email = req.body.email,
      password = req.body.password;
    try {
      const user = await User.findOne({ email: email });
      if (!user) {
        const error = new Error("Couldn't find a user!");
        error.statusCode = 401;
        throw error;
      }
      const isEqual = await bcrypt.compare(password, user.password);
      if (!isEqual) {
        const error = new Error("Wrong password!");
        error.statusCode = 401;
        throw error;
      }
      const token = jwt.sign(
        {
          email: user.email,
          userId: user._id.toString(),
        },
        "secret",
        { expiresIn: "1h" }
      );
      res.status(200).json({
        token,
        userId: user._id.toString(),
      });
    } catch (err) {
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    }
  };
