const _ = require('lodash');
const express = require('express');
const cron = require('node-cron');
const router = express.Router();
const WakeUpTimersQueue = require('../models/WakeUpTimersQueue');
const WakeUpAlarms = require('../models/AccountWakeUp');
const { checkOnlineStatuses } = require('../api/cmsV2Api');

router.get('/add', async (req, res) => {
  const { ids, timers = ['08:00'] } = req.query;
  if (!ids) {
    return res.send({ result: 1 });
  }
  let splitIds = ids.split(',');

  splitIds.map(async item => {
    await WakeUpTimersQueue.findOneAndUpdate(
      {
        deviceId: item
      },
      {
        wakeupTimes: timers.split(',')
      },
      {
        upsert: true,
        new: true
      }
    ).then(resp => console.log('Updated', resp));
  });
  return res.send({ result: 0, msg: req.query });
});

cron.schedule('*/10 * * * * *', async () => {
  await WakeUpTimersQueue.find({}).then(async resp => {
    // console.log('Device id from DB', resp);
    if (resp.length) {
      let ids = _.map(resp, 'deviceId');
      let statuses = await checkOnlineStatuses(ids.join(','));
      // console.log('statuses WakeUp Timer Queue per ids', ids, statuses);
      if (statuses.length) {
        statuses.map(async statusItem => {
          let index = _.findIndex(resp, { deviceId: statusItem.did });
          // console.log('Index data timer', resp[index].wakeupTimes);
          if (index > -1) {
            await WakeUpAlarms.findOneAndUpdate(
              {
                deviceId: resp[index].deviceId
              },
              {
                wakeupTimes: resp[index].wakeupTimes
              },
              {
                upsert: true,
                new: true
              }
            );
            await WakeUpTimersQueue.findOneAndDelete({
              deviceId: resp[index].deviceId
            });
          }
        });
      } else {
        console.log('no devices online!');
      }
    }
  });

  // console.log('running a task every minute');
});

module.exports = router;
