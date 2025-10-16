const express = require('express');
const router = express.Router();
const userRoutes = require('../routes/users');
const alarmRoutes = require('../routes/alarms');
const noteRoutes = require('../routes/notes');
const adminRoute = require('../routes/accountCreate');
const wakeUpQueue = require('../routes/wakeupQueue');
const trackerQueue = require('../routes/trackerQueue');
const emailRoute = require('../routes/email');
// middleware to use for all requests
// router.use(function(req, res, next) {
//   // do logging
//   console.log("Something is happening.");
//   next(); // make sure we go to the next routes and don't stop here
// });

router.use('/user', userRoutes);
router.use('/alarms', alarmRoutes);
router.use('/notes', noteRoutes);
router.use('/admin', adminRoute);
router.use('/wakeupqueue', wakeUpQueue);
router.use('/trackerqueue', trackerQueue);
router.use('/email', emailRoute);
module.exports = router;
