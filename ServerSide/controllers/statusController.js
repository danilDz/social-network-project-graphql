import User from "../models/userModel.js";

export const getStatus = async (req, res, next) => {
    try {
      const user = await User.findById(req.userId);
      if (!user) {
        const error = new Error("Couldn't find a user!");
        error.statusCode = 404;
        throw error;
      }
      res.status(200).json({
        status: user.status,
      });
    } catch (err) {
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    }
  },
  putStatus = async (req, res, next) => {
    const status = req.body.status;
    if (!status) {
      const error = new Error("Invalid status!");
      error.statusCode = 422;
      throw error;
    }
    try {
      const user = await User.findById(req.userId);
      if (!user) {
        const error = new Error("Couldn't find a user!");
        error.statusCode = 404;
        throw error;
      }
      user.status = status;
      await user.save();
      res.status(200).json({
        message: "Status successfully updated!",
      });
    } catch (err) {
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    }
  };
