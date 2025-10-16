const _ = require('lodash');
var express = require('express');
var router = express.Router();
const DeviceNotes = require('../models/DeviceNotes');

router.post('/addnote', async (req, res) => {
  const { deviceId, note } = req.body;
  if (!deviceId) {
    return res.send({ result: 1, msg: 'No device ID provided' });
  }
  note.timestamp = new Date();
  let updateNote = await DeviceNotes.update(
    { deviceId },
    { $push: { notes: note } },
    { upsert: true, setDefaultsOnInsert: true }
  )
    .then(res => {
      return { result: 0, msg: 'Note updated' };
    })
    .catch(err => {
      return {
        err,
        result: 1
      };
    });

  return res.send({ ...updateNote });
});

router.get('/getnote', async (req, res) => {
  const { deviceId } = req.query;
  if (deviceId) {
    let noteResult = await DeviceNotes.findOne({ deviceId });
    if (!noteResult) {
      return res.send({ result: 1, msg: 'no device id provided' });
    }
    res.send({ result: 0, noteResult: noteResult.notes.reverse() });
  } else {
    res.send({ result: 1, msg: 'no device id provided' });
  }
});

module.exports = router;
