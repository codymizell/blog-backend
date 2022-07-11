const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const loginsRouter = require('express').Router()
const User = require('../models/user')


loginsRouter.post('/', async (request, response) => {
  const { username, password } = request.body

  const user = await User.findOne({ username })
  const passwordCorrect = user === null
    ? false
    : await bcrypt.compare(password, user.passwordHash)

  if (!(user && passwordCorrect)) {
    return response.status(401).json({ error: 'incorrect username or password' })
  }

  const userForToken = {
    username: user.username,
    id: user._id
  }

  const token = jwt.sign(userForToken, process.env.SECRET, { expiresIn: 60 * 60 })

  response
    .status(200)
    .send({ token, username: user.username, id: user._id, avatar: user.avatar })
})

module.exports = loginsRouter