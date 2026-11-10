require('dotenv').config({ path: 'finance-tracker/client/.env' })

const express = require('express')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const cors = require('cors')
const mongoose = require('mongoose')
const app = express()
const {Server} = require("socket.io")
const http = require("http")
app.use(express.json())
app.use(cors())
 

const httpApp = http.createServer(app)
const socketCreate = new Server(httpApp,{
  cors :{
   origin: '*'
  }
})
socketCreate.use(async (socket,next)=>{
  const token = socket.handshake.auth.token
// check if its not the token
  try { const tokenn = jwt.verify(token, JWT_SECRET)
         const foundUser = await User.findOne({user:tokenn.user})
         if (!foundUser){
          next(new Error('user aint found'))
         } else {
                    socket.data.company = foundUser.company
                    socket.data.isAdmin = foundUser.isAdmin
          
          next()
          
         }

      
      }
 catch (err){
  next(new Error('invalid token'))
  }})
//we are already getting a jwt so verify it same one from cliet 
// show the person and or ppl 
// usse broadcast to tell everyone but the person
socketCreate.on('connection',(sock)=>{
  // everyone in a company joins the company room
  sock.join(`company:${sock.data.company}`)
  // only admins also join the admin room
  if (sock.data.isAdmin) sock.join(`admins:${sock.data.company}`)
})

// sockets create connection backend 
// sae a combined http and app give it to new instance of socket 
// when someone creates make them the admin and the person that has to approve all remeber pass
  // when someone creates and they use same email make them not admin but they can also make things 
const JWT_SECRET = process.env.JWT_SECRET || "fallback_math_secret_string"
//understand code
// Mongoose models (replace the in-memory arrays)
// user model for creating 
const User = mongoose.model('User', new mongoose.Schema({
  user: { type: String, required: true, unique: true },
  company: { type: String, required: true },
  pass: { type: String, required: true },
  expense: { type: Number, default: 0 },
  isAdmin:{type :Boolean, default: false }
}))

///  person creates after they already have login
const Transaction = mongoose.model('Transaction', new mongoose.Schema({
  user: String,
  company: String,
  description: String,
  amount: Number,
  category: String,
  status: { type: String, default: 'pending' },
  date: { type: Date, default: Date.now }
}))
// audit log: one line per action, only ever added to, never edited or deleted
const AuditLog = mongoose.model('AuditLog', new mongoose.Schema({
  user: String,
  company: String,
  action: String,
  expenseId: String,
  detail: String,
  date: { type: Date, default: Date.now }
}))

// db and jwt making and setup
async function startServer() {
  await mongoose.connect(process.env.Connect || 'mongodb://127.0.0.1:27017/expensetracker')
  console.log("Mongo connected")
  httpApp.listen(3000, () => {
    console.log('server run')
  })
}
startServer()

function authtoken(req, res, next) {
  const headerToken = req.headers.authorization
  if (!headerToken) return res.status(401).send('invalid token')

  const tokenArray = headerToken.split(' ')
  const tokenString = tokenArray[1]

  try {
    
     const decoded =   jwt.verify(tokenString, JWT_SECRET)
      req.user = decoded.user
      next()
  } catch {
      return res.status(401).send('invalid token')
  }
}
// home only for now 
// saves one audit line and hands it back (the websocket step will use the returned line)
async function logAction(user, company, action, expenseId, detail) {
  const entry =  await AuditLog.create({ user, company, action, expenseId: String(expenseId), detail })
  socketCreate.to(`admins:${company}`).emit('auditlog', entry)
  socketCreate.to(`company:${company}`).emit('expenseschanged')
  return entry
}
app.get('/', (req, res) => { res.send('yo') })

// create pass byt make sure validation and stufff
// create pass byt make sure validation and stufff
app.post('/createuser', async (req, res) => {
  try {
  const { user, pass, company } = req.body
  if (!user || !pass || !company) return res.status(400).json({ wow: 'Missing username, company or password' })
  if (typeof user !== 'string' || typeof pass !== 'string' || typeof company !== 'string') return res.status(400).json({ wow: 'Invalid input' })
  if (pass.length < 6) return res.status(400).json({ wow: 'Password must be at least 6 characters long' })
  if (user.toLowerCase() === pass.toLowerCase()) return res.status(400).json({ wow: 'Username and password cannot be the same' })
  if (!/\d/.test(pass)) return res.status(400).json({ wow: 'Password must contain at least one number' })
  if (company.length < 8 || !/\d/.test(company) || !/[a-zA-Z]/.test(company)) return res.status(400).json({ wow: 'Company name must be at least 8 characters with letters and a number' })
  console.log(`createuser route ${user}`)
  const exists = await User.findOne({ user })
  if (exists) return res.status(400).json({ wow: 'already exists' })

   // if pass doesnt exist add it  and create bcrypt pass also add user email
  const hashPass = await bcrypt.hash(pass, 10)
  const foundCompany = await User.findOne({company})
  // if not found company make admin = true 
  if(!foundCompany){
   await User.create({user:user,company:company,pass:hashPass,expense:0,isAdmin:true})
  } else {
    await User.create({user:user,company:company,pass:hashPass,expense:0,isAdmin:false})
  }
  res.send('success')
} catch(err){
  res.status(500).json({message:`something went wrong on our end with login ${err}`})
}

})
// login with same pass and credentials
app.post('/login', async (req, res) => {
   const { user, pass } = req.body
   if (typeof user !== 'string' || typeof pass !== 'string') return res.status(400).send('Invalid input')
   const foundUser = await User.findOne({ user })
   if (!foundUser) return res.status(400).send('User does not exist')

   const compareThem = await bcrypt.compare(pass, foundUser.pass)
   if (compareThem) {
     const token = jwt.sign({ user }, JWT_SECRET)
     res.send(token)
   } else {
     res.status(400).json({ wow: 'incorrect password' })
   }
})
// send user to track on page
app.get('/receiveuserforpage', authtoken, async (req, res) => {
 const foundUser = await User.findOne({ user: req.user })
 if (!foundUser) return res.status(404).send('User not found')
 
 res.json({ user: foundUser.user, expense: foundUser.expense,isAdmin:foundUser.isAdmin })

})

app.get('/checktoken', authtoken, (req, res) => { res.send() })

// on page  expense update
app.post('/updateexpense', authtoken, async (req, res) => {
  const expenseAmount = Number(req.body.amount)
  const foundUser = await User.findOne({ user: req.user })
  if (!foundUser) return res.status(404).send('User not found')

  foundUser.expense += expenseAmount
  await foundUser.save()
  res.json({ success: true, updatedExpense: foundUser.expense })
})
 //receiving transaction stuff to put on page
app.post('/transactions', authtoken, async (req, res) => {
  try {
    const { description, amount, category } = req.body
    
    if (typeof description !== 'string' || !description.trim()) return res.status(400).json({ wow: 'Missing description' })
    if (!Number(amount) || Number(amount) <= 0) return res.status(400).json({ wow: 'Amount must be a positive number' })

    const foundUser = await User.findOne({ user: req.user })
    if (!foundUser) return res.status(404).send('User not found')

    const newTransaction = await Transaction.create({
      user: req.user,
      company: foundUser.company,
      description,
      amount: Number(amount),
      category,
      status: 'pending'
    })
    await logAction(req.user, foundUser.company, 'created', newTransaction._id, `${description} ($${Number(amount)})`)
    res.status(201).json({ success: true, transaction: newTransaction })
  } catch (err) {
    res.status(500).json({ wow: 'something went wrong adding the expense' })
  }
})
// admins only, and only their own company's log
app.get('/auditlog', authtoken, async (req, res) => {
  try {
    const foundUser = await User.findOne({ user: req.user })
    if (!foundUser) return res.status(404).send('User not found')
    if (!foundUser.isAdmin) return res.status(403).json({ wow: 'Admins only' })

    const entries = await AuditLog.find({ company: foundUser.company }).sort({ date: -1 }).limit(100)
    res.json(entries)
  } catch (err) {
    res.status(500).json({ wow: 'something went wrong loading the audit log' })
  }
})

app.get('/transactions', authtoken, async (req, res) => {
  try {
    const foundUser = await User.findOne({ user: req.user })
    if (!foundUser) return res.status(404).send('User not found')

    //  build the query
    // - admin: sees every expense in their company
    // (the placeholder below matches nothing, so no data leaks while you write it)
    const query = { company: foundUser.company }

    let results = await Transaction.find(query)
    if (req.query.category) results = results.filter(t => t.category === req.query.category)
    if (req.query.search) results = results.filter(t => t.description.toLowerCase().includes(req.query.search.toLowerCase()))
    res.json(results)
  } catch (err) {
    res.status(500).json({ wow: 'something went wrong loading expenses' })
  }
})

app.patch('/transactions/:id/status', authtoken, async (req, res) => {
  try {
    const foundUser = await User.findOne({ user: req.user })
    if (!foundUser) return res.status(404).send('User not found')

    // refuse the request unless ALL of these are true
    // 1. the new status (req.body.status) is exactly 'approved' or 'rejected'
    const { status } = req.body
    if (status !== 'approved' && status !== 'rejected') return res.status(400).json({ wow: 'Invalid status' })

    // 2. the id in the URL (req.params.id) is valid (look up mongoose.isValidObjectId)
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ wow: 'Invalid id' })

    // 3. the person asking is an admin
    if (!foundUser.isAdmin) return res.status(403).json({ wow: 'Admins only' })

    // 4. the expense exists AND belongs to the same company as the admin
    const found = await Transaction.findOne({ _id: req.params.id, company: foundUser.company })
    if (!found) return res.status(404).json({ wow: 'Expense not found' })

    // 5. the expense is not the admin's own
    if (found.user === req.user) return res.status(403).json({ wow: 'You cannot approve your own expense' })

    // then save the new status and send back the result
    found.status = status
    await found.save()
    
    await logAction(req.user, foundUser.company, status, found._id, `${found.description} ($${found.amount}) from ${found.user}`)

    res.json({ success: true, transaction: found })
  } catch (err) {
    res.status(500).json({ wow: 'something went wrong updating the expense' })
  }
})