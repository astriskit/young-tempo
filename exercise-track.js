let {Schema} = require('mongoose')
let ExerciseSchema = new Schema({
    description:{required:true, type:String},
    duration:{required:true, type:Number},
    date:Date
  })
let ExerciseTrackerSchema = new Schema({
  username:{type:String, required:true},
  exercises:[ExerciseSchema]
})

module.exports = ExerciseTrackerSchema