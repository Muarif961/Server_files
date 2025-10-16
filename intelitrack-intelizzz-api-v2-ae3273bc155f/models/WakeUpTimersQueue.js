// grab the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// create a schema
var wakeupSchema = new Schema({
  deviceId: { type: String, required: true, unique: true },
  wakeupTimes: { type: Array },
  added: { type: Date, default: Date.now },
});

// the schema is useless so far
// we need to create a model using it
var WakeUpTimersQueue = mongoose.model('WakeUpTimersQueue', wakeupSchema);

// make this available to our users in our Node applications
module.exports = WakeUpTimersQueue;
