const { request } = require('express')
const express = require('express')
const { v4: uuid } = require('uuid')

const app = express()
app.use(express.json())

let customers = []

app.listen(3333, () => 'Running on 3333')

// Middleware
function verifyIfAccountExists(req, res, next) {
  const { cpf } = req.headers

  const customer = customers.find(customer => customer.cpf === cpf)

  if(!customer) {
    return res.status(400).json({ error: 'Customer not found' })
  }

  request.customer = customer

  return next()
}

function getBalance(statement) {
  return statement.reduce((acc, operation) => {
    if(operation.type === 'credit') {
      return acc + operation.amount
    } else if(operation.type === 'debit') {
      return acc - operation.amount
    }
  }, 0)
}

// Routes
// Create Account
app.post('/account', (req, res) => {
  const { cpf, name } = req.body

  const customerAlreadyExists = customers.some((customer) => customer.cpf === cpf)
  if(customerAlreadyExists) {
    return res.status(400).json({ message: 'Customer already exists' })
  }

  customers.push({
    cpf,
    name,
    id: uuid(),
    statement: []
  })

  return res.status(201).send()
})

// Update Account Info
app.put('/account', verifyIfAccountExists, (req, res) => {
  const { name } = req.body
  const { customer } = req

  customer.name = name

  return res.status(201).send()
})

// Get Account Info
app.get('/account', verifyIfAccountExists, (req, res)=>{
  const { customer } = req
  return res.json(customer)
})

// Delete Account
app.delete('/account', verifyIfAccountExists, (req, res) => {
  const { customer } = req
  
  customers.splice(customer, 1)
  
  return res.status(200).send()
})

// Get Account Balance
app.get('/balance', verifyIfAccountExists, (req, res) => {
  const { customer } = request
  const balance = getBalance(customer.statement)
  return res.json({ balance })
})

// Get Account Statement
app.get('/statement', verifyIfAccountExists, (req, res) => {
  return res.json(req.customer.statement)
})

// Get Account Statement By Date
app.get('/statement/date', verifyIfAccountExists, (req, res) => {
  const { customer } = request
  const { date } = req.query
  
  const dateFormat = new Date(date + " 00:00")
  const statements = customer.statement.filter((statement) => (
    statement.created_at.toDateString() === new Date(dateFormat).toDateString()
  ))

  return res.json(statements)
})

// Create Deposit
app.post('/deposit', verifyIfAccountExists, (req, res) => {
  const { description, amount } = req.body
  const { customer } = req

  const statementOperation = {
    description,
    amount,
    created_at: new Date(),
    type: 'credit'
  }
  customer.statement.push(statementOperation)

  return res.status(201).send();
})

// Create Withdraw
app.post('/withdraw', verifyIfAccountExists, (req, res) => {
  const { amount } = req.body
  const { customer } = req
  
  const balance = getBalance(customer.statement)
  if(balance < amount) {
    return res.status(400).json({ error: 'Insufficient funds!' })
  }

  const statementOperation = {
    amount,
    created_at: new Date(),
    type: 'debit'
  }
  customer.statement.push(statementOperation)
  
  return res.status(201).send()
})
