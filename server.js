const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const MySchema = require('./exercise-track.js')
const cors = require('cors')

const mongoose = require('mongoose')
let dbOnline = false
let UserModel = undefined
mongoose.connect(process.env.MLAB_URI, {useMongoClient:true},function(err){
  if(!err) {
    UserModel = mongoose.model('UserModel', MySchema)
  }
})

function onCreateUser(err, doc, res){
  if(err){
    console.error(err)
    res.json({error:'User creation failed'})
  }
  else{
    res.json({username:doc.username, _id:doc._id})
  }
}

function createUser(username, done){
  if(username){
    let newUser = new UserModel({username, exercises:[]})
    newUser.save(done)
  }
}

function getUsers(userid=null, done){
  let finder = UserModel.find()
  if(userid){
    finder = UserModel.find({_id:userid})
  }
  finder.exec(function (err, docs){
    if(err) done(err)
    else if(docs && (docs.length||userid)) done(null, docs)
    else done({message:'User(s) not found'})
  })
}


app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.get('/api/exercise/users', function(req, res){
  getUsers(null, function (err, docs) {
    if(err){
      console.error(err)
      res.json({error:err.message || "Internal server error"})
    }
    else{
      res.json({users:docs.map(({_id, username})=>({_id, username}))})
    }
  })
})

app.post('/api/exercise/new-user', function(req, res){
  let {username=undefined} = req.body
  if(username){
    createUser(username, (err, doc)=>onCreateUser(err, doc, res))
  }
  else{
    res.json({error:'Invalid username'})
  }
})

app.get('/api/exercise/log', function(req, res){
  let {userId, to, from, limit} = req.query
  console.log(req.query, 'query')
  if(userId){
    if(to){
      to = new Date(to)
      if(!to.valueOf()){
        to = null
      }
    }
    if(from){
      from = new Date(from)
      if(!from.valueOf()){
        from = null
      }
    }
    getUsers(userId, function(err, docs){
      if(err) res.json({error:err.message||'Internal server error'})
      else{
        let exercises = docs[0].exercises||[]
        exercises
          .filter(ex=>{
          if(to){
            return to >= ex.date 
          }
          else{
            return true
          }
        })
        .filter(ex=>{
        if(from){
            return from <= ex.date 
          }
          else{
            return true
          }
        })
        if(limit){
          exercises = exercises.slice(0,limit)
        }
        res.json({exercises:
                  exercises
                  .map(
                    ({duration, description, date})=>
                    ({duration, description, date:`${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`}))
                 })
      }
    })
  }
  else{
    res.json({ error: 'userId is must' })
  }
})

app.post('/api/exercise/add', function(req, res){
  let {userId, date:_dateString=undefined, duration, description} = req.body
  if(userId && duration && description){
    getUsers(userId, function (err, userDocs){
      if(err){
        res.json({error:err.message || 'User search failed'})
      }
      else{
        let date = new Date() 
        if(_dateString){
          date = new Date(_dateString)
          if(!date){
            res.json({error:'Invalid date'})
            res.end()
          }
        }
        let exercises = userDocs[0].exercises || []
        userDocs[0].exercises = [...exercises, {duration, description, date}]
        userDocs[0].save((_err, {_id, username, exercises})=>{
          if(!_err){
            res.json({_id, username, exercises:exercises.map(({duration, description, date})=>({duration, description, date:`${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`}))})
          }
          else{
            res.json({error:_err.message || 'saving failed'})
          }
        })
      }
    })
  }
  else{
    res.json({error:'userId, description and duration are needed'})
  }
})

// app.post(
// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
