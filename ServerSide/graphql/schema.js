import { buildSchema } from "graphql";

export default buildSchema(`
  type Post {
    _id: ID!
    title: String!
    content: String!
    imageUrl: String!
    creator: User!
    createdAt: String!
    updatedAt: String!
  }

  type User {
    _id: ID!
    name: String!
    email: String!
    password: String
    status: String!
    posts: [Post!]!
  }

  type AuthData {
    token: String!
    userId: String!
  }

  type PostData {
    posts: [Post!]!
    totalPosts: Int!
  }

  input UserInputData {
    email: String!
    name: String!
    password: String!
  }

  input PostInputData {
    title: String!
    content: String!
    imageUrl: String!
  }

  type RootQuery {
    login(email: String!, password: String!): AuthData!
    getPosts(page: Int!): PostData!
    getPost(postId: ID!): Post!
    getUser: User!
  }

  type RootMutation {
    createUser(userInput: UserInputData!): User!
    createPost(postInput: PostInputData!): Post!
    updatePost(postInput: PostInputData!, id: ID!): Post!
    deletePost(id: ID!): Boolean
    updateStatus(newStatus: String!): User!
  }

  schema {
    query: RootQuery
    mutation: RootMutation
  }
`);
