import dotenv from "dotenv";
dotenv.config();

import path, { dirname } from "path";
import { fileURLToPath } from "url";

import express from "express";
import bodyParser from "body-parser";
import multer from "multer";
import mongoose from "mongoose";
import { graphqlHTTP } from "express-graphql";

import schema from "./graphql/schema.js";
import resolvers from "./graphql/resolvers.js";
import isAuth from "./middleware/isAuth.js";
import { deleteImage } from "./utils/image.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    cb(null, new Date().toISOString() + "-" + file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

app.use(bodyParser.json());
app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).single("image")
);

app.use("/images", express.static(path.join(__dirname, "images")));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.use(isAuth);

app.put("/post-image", (req, res, next) => {
  if (!req.isAuth) {
    const error = new Error("Not authenticated!");
    error.code = 401;
    throw error;
  }
  if (!req.file) {
    return res.status(200).json({ message: "No file provided!" });
  }
  if (req.body.oldPath) {
    deleteImage(req.body.oldPath);
  }
  return res
    .status(201)
    .json({ message: "File stored!", filePath: req.file.path });
});

app.use(
  "/graphql",
  graphqlHTTP({
    schema: schema,
    rootValue: resolvers,
    graphiql: true,
    customFormatErrorFn(err) {
      if (!err.originalError) return err;
      const data = err.originalError.data,
        message = err.message || "An error occured!",
        code = err.originalError.code || 500;
      return {
        message,
        status: code,
        data,
      };
    },
  })
);

app.use((error, req, res, next) => {
  console.log(error);
  const status = error.statusCode || 500,
    message = error.message,
    data = error.data;
  res.status(status).json({
    message,
    data,
  });
});

mongoose
  .connect(process.env.MONGODB_CONNECTION_URI)
  .then((result) => {
    app.listen(process.env.PORT, () => {
      console.log("Server is running on port 8080!");
    });
  })
  .catch((err) => console.log(err));
