const _ = require('lodash');
var express = require('express');
var router = express.Router();
const User = require('../models/User');

router.get('/allusers', async (req, res) => {
  let users = await User.find({});
  res.json({ users });
});

router.get('/getuserinfo', async (req, res) => {
  const { email } = req.query;
  let user = await User.findOne({ email }, [
    'device_ids',
    'name',
    'email',
    'companyName',
    'address',
    'country',
    'zipcode',
    'telephone',
  ]);
  console.log('User', _.omit(user, 'password'));
  res.send({ user });
});

router.post('/createuser', (req, res) => {
  const userData = req.body;
  console.log('User data', userData);
  // create a new user called chris
  var user = new User({
    ...userData,
  });
  user.save(function(err) {
    if (err) {
      console.log(err);
      return res.send({ msg: err.message });
    }
    res.send({ msg: 'User saved successfully!' });
  });
});

router.post('/updateuser', async (req, res) => {
  const data = req.body;
  let { email } = data;
  if (!email) {
    return res.send({ result: 1, msg: 'No Email provided' });
  }
  let updateInfo = await User.findOneAndUpdate(
    { email },
    _.omit(data, 'email'),
  );
  console.log('Update', updateInfo);

  res.send(updateInfo);
});

module.exports = router;
