const blogsRouter = require('express').Router()
const Blog = require('../models/blog')
const { userExtractor } = require('../utils/middleware')

blogsRouter.get('/', async (request, response) => {
  const blogs = await Blog.find({}).populate('user', { username: 1, id: 1 })
  response.json(blogs)
})

blogsRouter.post('/', userExtractor, async (request, response) => {
  const body = request.body
  const user = request.user

  const blog = new Blog({
    title: body.title,
    content: body.content,
    likes: body.likes ? body.likes : 0,
    user: user._id,
    comments: [],
  })

  const savedBlog = await blog.save()
  user.blogs = user.blogs.concat(savedBlog._id)
  await user.save()

  response.json(savedBlog)
})

blogsRouter.delete('/:id', userExtractor, async (request, response) => {
  const user = request.user
  const blogToDelete = await Blog.findById(request.params.id)

  if (blogToDelete.user.toString() !== user.id.toString()) {
    response.status(401).json({ error: 'not authorized to delete this blog' }).end()
  } else {
    await Blog.findByIdAndRemove(request.params.id)
    response.status(204).end()
  }
})

blogsRouter.get('/:id', async (request, response) => {
  const blog = await Blog.findById(request.params.id).populate('user', { username: 1, id: 1 })
  response.json(blog)
})

blogsRouter.post('/:id/comments', async (request, response) => {
  const { comment } = request.body

  const updatedBlog = await Blog
    .findByIdAndUpdate(
      request.params.id,
      { $push: { 'comments': comment } },
      { safe: true, upsert: true, new: true },
    ).populate('user', { username: 1, id: 1 })

  response.json(updatedBlog)
})

blogsRouter.put('/:id', async (request, response) => {
  const { likes } = request.body

  const updatedBlog = await Blog
    .findByIdAndUpdate(
      request.params.id,
      { likes },
      { safe: true, upsert: true, new: true },
    )

  response.json(updatedBlog.populate('user', { username: 1, id: 1 }))
})

module.exports = blogsRouter