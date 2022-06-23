const Blog = require('../models/blog')
const User = require('../models/user')

const initialBlogs = [
  {
    title: 'Test Blog',
    author: 'Cody',
    url: 'https://www.google.com',
    likes: 2
  },
  {
    title: 'Test Blog 2',
    author: 'George',
    url: 'https://www.youtube.com',
    likes: 0
  },
]

const blogsInDb = async () => {
  const blogs = await Blog.find({})
  return blogs.map(blog => blog.toJSON())
}

const usersInDb = async () => {
  const users = await User.find({})
  return users.map(user => user.toJSON())
}

module.exports = { initialBlogs, blogsInDb, usersInDb }