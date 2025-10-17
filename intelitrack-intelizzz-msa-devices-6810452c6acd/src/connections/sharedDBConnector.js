const mongoose = require('../connections/mongoose');
const LogActionModel = require('shared-database/src/models/log-action.model');
const LogAction = LogActionModel.connect(mongoose);

module.exports = {
    LogAction
}
