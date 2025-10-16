// grab the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// create a schema
var wakeupSchema = new Schema({
  deviceId: { type: String, required: true, unique: true },
  wakeupTimes: { type: Array },
});

// the schema is useless so far
// we need to create a model using it
var WakeUpAlarms = mongoose.model('WakeUpAlarms', wakeupSchema);

// make this available to our users in our Node applications
module.exports = WakeUpAlarms;
