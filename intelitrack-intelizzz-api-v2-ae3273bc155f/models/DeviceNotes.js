// grab the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// create a schema
var deviceNoteSchema = new Schema({
  deviceId: { type: String, required: true, unique: true },
  notes: {
    type: Array,
    required: true,
    default: {
      text: { type: String },
      timestamp: { type: Date },
      imageUrls: { type: Array },
    },
  },
});

// the schema is useless so far
// we need to create a model using it
var DeviceNotes = mongoose.model('DeviceNotes', deviceNoteSchema);

// make this available to our users in our Node applications
module.exports = DeviceNotes;
