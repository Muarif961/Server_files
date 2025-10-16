// grab the things we need
var mongoose = require("mongoose");

var Schema = mongoose.Schema;

// create a schema
var userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  companyName: { type: String, required: true },
  address: String,
  country: String,
  zipcode: String,
  telephone: Number,
  device_ids: { type: Array, required: true },
  created_at: Date,
  updated_at: Date
});

userSchema.methods.dudify = function() {
  // add some stuff to the users name
  this.name = this.name + "-dude";

  return this.name;
};
// on every save, add the date
userSchema.pre("save", function(next) {
  // get the current date
  var currentDate = new Date();

  // change the updated_at field to current date
  this.updated_at = currentDate;

  // if created_at doesn't exist, add to that field
  if (!this.created_at) this.created_at = currentDate;

  next();
});

// the schema is useless so far
// we need to create a model using it
var User = mongoose.model("User", userSchema);

// make this available to our users in our Node applications
module.exports = User;
