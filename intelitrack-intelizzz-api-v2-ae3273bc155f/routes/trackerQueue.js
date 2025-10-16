const _ = require('lodash');
const moment = require('moment');
const express = require('express');
const cron = require('node-cron');
const router = express.Router();
const SecretTrackerQueue = require('../models/SecretTrackerQueue');
const {
  checkOnlineStatuses,
  activateSecretTracker
} = require('../api/cmsV2Api');

router.get('/add', async (req, res) => {
  const { id, trackerTime } = req.query;
  if (!id || !trackerTime) {
    return res.send({ result: 1 });
  }

  await SecretTrackerQueue.findOne({
    deviceId: id
  })
    .then(async resp => {
      if (!resp) {
        let respData = await SecretTrackerQueue.create({
          deviceId: id,
          trackerTime
        });
        return res.send({ result: 0, msg: respData });
      } else {
        let respData = await SecretTrackerQueue.update(
          {
            deviceId: id
          },
          { trackerTime }
        );
        return res.send({ result: 0, msg: respData });
      }
    })
    .catch(err => res.send({ result: 1 }));

  return;
});

router.get('/get', async (req, res) => {
  const { id } = req.query;

  await SecretTrackerQueue.findOne({
    deviceId: id
  })
    .then(resp => {
      if (resp) {
        console.log('resp data');
        return res.send({
          result: 0,
          ..._.pick(resp, ['deviceId', 'trackerTime'])
        });
      } else {
        return res.send({ result: 1 });
      }
    })
    .catch(err => {
      return res.send({
        result: 1
      });
    });
});

router.get('/getbatchtrackers', async (req, res) => {
  const { ids } = req.query;
  if (ids && ids.split(',').length) {
    let idsArr = ids.split(',');
    let alarms = await SecretTrackerQueue.find(
      { deviceId: { $in: idsArr } },
      []
    );

    alarms = alarms.map(alarm => {
      return {
        trackerTime: alarm.trackerTime,
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

cron.schedule('*/10 * * * * *', async () => {
  let deleteOldData = [];
  await SecretTrackerQueue.find({}).then(async resp => {
    console.log('Device ids from SecretTrackerQueue', resp);
    if (resp.length) {
      let shouldCheckStatus = resp.filter(record => {
        let difMin = moment(record.trackerTime).diff(moment(), 'minutes');
        // console.log(
        //   'Diff time tracker',
        //   moment(record.trackerTime).diff(moment(), 'minutes')
        // );
        if (difMin <= -55 && difMin > -60) {
          return record;
        }
        if (difMin < -62) {
          deleteOldData.push(record.deviceId);
        }
      });

      let ids = _.map(shouldCheckStatus, 'deviceId');

      let statuses = await checkOnlineStatuses(ids.join(','));
      console.log('SEcret tracker statuses', statuses);
      if (statuses.length) {
        for (let i = 0; i < statuses.length; i++) {
          await SecretTrackerQueue.findOneAndDelete({
            deviceId: statuses[i].did
          });
        }
      }

      if (deleteOldData.length) {
        for (let i = 0; i < deleteOldData.length; i++) {
          await SecretTrackerQueue.findOneAndDelete({
            deviceId: deleteOldData[i]
          });
        }
      }
    }
  });

  // console.log('running a task every minute Secret Tracker Queue');
});

module.exports = router;
