const bcrypt = require('bcrypt')
const usersRouter = require('express').Router()
const User = require('../models/user')
const { userExtractor } = require('../utils/middleware')
const jwt = require('jsonwebtoken')

usersRouter.get('/', async (request, response) => {
  const users = await User.find({}).populate('blogs', { content: 1, title: 1, })
  response.json(users)
})

usersRouter.post('/', async (request, response) => {
  const { username, password, avatar } = request.body
  const ip = request.header('x-forwarded-for')

  const existingUser = await User.findOne({ username })
  if (existingUser) {
    return response.status(400).json({ error: 'username must be unique' })
  }

  if (password.length < 3) {
    return response.status(400).json({ error: 'password must be longer than 3 characters' })
  }

  const saltRounds = 10
  const passwordHash = await bcrypt.hash(password, saltRounds)

  const user = new User({
    username,
    avatar,
    ip,
    passwordHash
  })

  const savedUser = await user.save()

  const userForToken = {
    username: savedUser.username,
    id: savedUser._id
  }

  const token = jwt.sign(userForToken, process.env.SECRET, { expiresIn: 60 * 60 })

  response.status(201).send({ token, username: savedUser.username, id: savedUser._id, avatar: savedUser.avatar })
})

usersRouter.get('/info', userExtractor, async (request, response) => {
  const user = request.user
  response.json(user)
})




module.exports = usersRouter