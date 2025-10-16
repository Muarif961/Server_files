const express = require('express');
const router = express.Router();
const { sendEmail } = require('../api/emailService');

router.post('/tracker', async (req, res) => {
  const { email, vehId, lastLocation, wakeUp, deviceName, timezone } = req.body;
  console.log('sending email...');
  sendEmail(email, vehId, lastLocation, wakeUp, deviceName, timezone)
    .then(resp => {
      return res.send({
        result: 0
      });
    })
    .catch(err => {
      return res.send({
        result: 1
      });
    });
});

module.exports = router;
