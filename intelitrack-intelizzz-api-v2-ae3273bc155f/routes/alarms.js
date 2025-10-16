const _ = require('lodash');
var express = require('express');
var router = express.Router();
const WakeUpAlarms = require('../models/AccountWakeUp');
const { sendWakeUpTimers, sendSecretTracker } = require('../api/tele2Api');

router.post('/addalarms', async (req, res) => {
  const { deviceIds, wakeupTimes = [] } = req.body;
  if (!deviceIds.length) {
    return res.send({ result: 1, msg: 'no Ids specified' });
  }
  let truth = false;

  for (let i = 0; i < deviceIds.length; i++) {
    let deviceId = deviceIds[i];
    console.log('Device ID', deviceId);
    // let msgId = await sendWakeUpTimers(deviceId, wakeupTimes);
    // console.log('message id', msgId);
    // if (msgId) {
    WakeUpAlarms.update(
      { deviceId },
      {
        deviceId,
        wakeupTimes
      },
      { upsert: true, setDefaultsOnInsert: true },
      (err, raw) => {
        console.log('err', err, 'raw ', raw);
        if (err) {
          truth = true;
        }
      }
    );
    // }
  }
  if (truth) {
    return res.send({ err, result: 1 });
  }
  res.status(200).send({ result: 0 });
});

router.get('/getdevicealarms', async (req, res) => {
  const { id } = req.query;
  if (id) {
    let alarms = await WakeUpAlarms.find({ deviceId: id }, []);
    // alarms.length > 0
    //   ?
    res.json({
      deviceId: id,
      wakeupTimes:
        alarms.length > 0
          ? alarms[0].wakeupTimes.length > 0
            ? alarms[0].wakeupTimes
            : ['08:00']
          : ['08:00']
    });
    // : res.json({});
  } else {
    res.send({ result: 1, msg: 'no Id specified' });
  }
});

router.get('/getbatchalarms', async (req, res) => {
  const { ids } = req.query;
  if (ids && ids.split(',').length) {
    let idsArr = ids.split(',');
    let alarms = await WakeUpAlarms.find({ deviceId: { $in: idsArr } }, []);

    alarms = alarms.map(alarm => {
      if (alarm.wakeupTimes.length === 0) {
        alarm.wakeupTimes = ['08:00'];
      }
      return {
        wakeupTimes: alarm.wakeupTimes,
        deviceId: alarm.deviceId
      };
    });
    console.log('alarms', alarms);
    return res.json({
      data: [...alarms]
    });
  } else {
    res.send({ result: 1, msg: 'no Ids specified', data: [] });
  }
});

router.get('/activatetracker', async (req, res) => {
  const { id, messageText } = req.query;
  let messageId = (await sendSecretTracker(id, messageText)) || null;
  res.send({ result: 0, messageId });
});

module.exports = router;
