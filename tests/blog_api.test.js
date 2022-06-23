const mongoose = require('mongoose')
const supertest = require('supertest')
const helper = require('./test_helper')
const app = require('../app')
const api = supertest(app)
const bcrypt = require('bcrypt')

const User = require('../models/user')
const Blog = require('../models/blog')


describe('blog functionality', () => {


  beforeEach(async () => {
    await Blog.deleteMany({})
    await User.deleteMany({})

    const passwordHash = await bcrypt.hash('password', 10)
    const user = new User({ username: 'root', passwordHash })
    await user.save()
    const userId = await User.findOne({ username: 'root' })

    const blogObjects = helper.initialBlogs
      .map(blog => new Blog(blog))

    const blogPromises = blogObjects.map(async blog => {
      blog.user = userId
      return blog.save()
    })
    await Promise.all(blogPromises)
  })

  test('all blogs are returned as json', async () => {
    await api.get('/api/blogs')
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const blogsAtEnd = await helper.blogsInDb()

    expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length)
  }, 10000)

  test('a valid blog can be added', async () => {

    const login = await api
      .post('/api/login')
      .send({ username: 'root', password: 'password' })
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const token = 'Bearer ' + login.body.token

    const newBlog = {
      title: 'new supertest blog',
      author: 'supertest',
      url: 'https://www.github.com',
      likes: 10
    }

    await api
      .post('/api/blogs')
      .set({ 'Authorization': token })
      .send(newBlog)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const blogsAtEnd = await helper.blogsInDb()
    expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length + 1)

    const titles = blogsAtEnd.map(b => b.title)

    expect(titles).toContain('new supertest blog')
  }, 10000)

  test('an invalid blog can\'t be added', async () => {
    const newBlog = {
      title: 'new supertest blog',
      author: 'supertest',
      url: 'https://www.github.com',
      likes: 10
    }

    await api
      .post('/api/blogs')
      .send(newBlog)
      .expect(401)
      .expect('Content-Type', /application\/json/)

    const blogsAtEnd = await helper.blogsInDb()
    expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length)

    expect(blogsAtEnd).not.toContainEqual(newBlog)
  })

  test('likes property defaults to zero if not specified', async () => {

    const login = await api
      .post('/api/login')
      .send({ username: 'root', password: 'password' })
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const token = 'Bearer ' + login.body.token

    const newBlog = {
      title: 'blog with no likes',
      author: 'no-one',
      url: 'https://www.cody.com',
    }

    const response = await api
      .post('/api/blogs')
      .set({ 'Authorization': token })
      .send(newBlog)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    expect(response.body.likes).toBeDefined()
  }, 10000)

  test('creating blog returns status 400 if url and title are missing', async () => {
    const login = await api
      .post('/api/login')
      .send({ username: 'root', password: 'password' })
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const token = 'Bearer ' + login.body.token

    const newBlog = {
      author: 'hash slinging slasher',
      likes: 6,
    }

    await api
      .post('/api/blogs')
      .set({ 'Authorization': token })
      .send(newBlog)
      .expect(400)
  })

  test('can delete a blog', async () => {

    const login = await api
      .post('/api/login')
      .send({ username: 'root', password: 'password' })
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const token = 'Bearer ' + login.body.token

    const initialBlogs = await helper.blogsInDb()
    const blogToDelete = initialBlogs[0]


    await api
      .delete(`/api/blogs/${blogToDelete.id}`)
      .set({ 'Authorization': token })
      .expect(204)

    const blogsAtEnd = await helper.blogsInDb()

    expect(blogsAtEnd).not.toContainEqual(blogToDelete)
  })

  test('can update a blog', async () => {
    const login = await api
      .post('/api/login')
      .send({ username: 'root', password: 'password' })
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const token = 'Bearer ' + login.body.token

    const initialBlogs = await helper.blogsInDb()
    const blogToUpdate = initialBlogs[0]

    await api
      .put(`/api/blogs/${blogToUpdate.id}`)
      .set({ 'Authorization': token })
      .send({ likes: 200 })

    const blogsAtEnd = await helper.blogsInDb()
    expect(blogsAtEnd[0].likes).not.toBe(blogToUpdate.likes)
  })
})

describe('account creation functionality', () => {
  beforeEach(async () => {
    await User.deleteMany({})

    const passwordHash = await bcrypt.hash('sekret', 10)
    const user = new User({ username: 'root', passwordHash })

    await user.save()
  })

  test('creation succeeds with a fresh username', async () => {
    const usersAtStart = await helper.usersInDb()

    const newUser = {
      username: 'fakeuser',
      name: 'not real',
      password: 'password'
    }

    await api
      .post('/api/users')
      .send(newUser)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    const usersAtEnd = await helper.usersInDb()

    expect(usersAtEnd).toHaveLength(usersAtStart.length + 1)

    const usernames = usersAtEnd.map(u => u.username)
    expect(usernames).toContain(newUser.username)
  })

  test('creation fails with proper statuscode and message if username already taken', async () => {
    const usersAtStart = await helper.usersInDb()

    const newUser = {
      username: 'root',
      password: 'password'
    }

    const result = await api
      .post('/api/users')
      .send(newUser)
      .expect(400)
      .expect('Content-Type', /application\/json/)

    expect(result.body.error).toContain('username must be unique')

    const usersAtEnd = await helper.usersInDb()
    expect(usersAtEnd).toEqual(usersAtStart)
  })

  test('username must be at least 3 characters', async () => {
    const newUser = {
      username: 'op',
      password: 'swordfish'
    }

    await api
      .post('/api/users')
      .send(newUser)
      .expect(400)
      .expect('Content-Type', /application\/json/)
  })

  test('password must be at least 3 characters', async () => {
    const newUser = {
      username: 'robot',
      password: 'pw'
    }

    await api
      .post('/api/users')
      .send(newUser)
      .expect(400)
      .expect('Content-Type', /application\/json/)
  })
})

afterAll(() => {
  mongoose.connection.close()
})

