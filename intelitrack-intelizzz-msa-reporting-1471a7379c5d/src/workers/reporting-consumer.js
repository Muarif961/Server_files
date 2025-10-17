require('../config/dotenv');
const async = require('async');
const DBConnection = require('../connections/mongoose');
const WakeHistory = require('../models/wakehistory.model');
const Device = require('../models/device.model');
const Alert = require('../models/alert.model');
const UserGroups = require('../models/user-group.model');
const User = require('../models/user.model');
const Groups = require('../models/group.model');
const Report = require('../models/report.model');

const logger = require('../utils/logger');
const queryGen = require('../utils/query-generator');
const alerter = require('../utils/alerter');
const Consumer = require('../consumer');

const dbs = {
    location: WakeHistory,
    device: Device,
    alerts: Alert
};

// Kafka Variables
const topic = process.env.KAFKA_REPORT_TOPIC;
const group = process.env.KAFKA_GROUP;
const kafkaHost = process.env.KAFKA_URL;
const baseUrl = process.env.BASE_URL;

logger.info(`Connecting to ${kafkaHost} with topic ${topic} under group ${group}.`);

const consumer = Consumer.create(topic, group, kafkaHost);
Consumer.run(consumer, async (payload) => {
    const data = JSON.parse(payload.value);

    logger.info('PAYLOAD ', payload.value);
    logger.info(`offset: ${payload.offset} : highWaterOffset: ${payload.highWaterOffset}`);

    // Get user data for sending email
    const userObj = await User.findOne({ accountId: data.accountId, _id: data.userId });

    // Is the user a parent?
        // YES -- get groups by account id
        // NO -- get groups by account id and user id
    const userGroups = !data.parent ? await UserGroups.find({ accountId: data.accountId, userId: data.userId }) : null;
    // Get the child user's group ids to be used in the query to ensure child user can only see data relating to groups they belong to
    const userGroupIds = userGroups ? userGroups.map(userGroup => userGroup.groupId) : null;

    // Get all groups belonging to account (to add the group names to the final report if required)
    const groups = data.includeGroups ? await Groups.find({ accountId: data.accountId }) : null;

    // If we want to include group data in the returned data
    const select = data.includeGroups ? data.select + ' groupId' : data.select;

    // Is user a child account with no groups?
    if((!userGroups || userGroups.length === 0) && !data.parent) {
        // YES -- email and end
    } else {
        // NO -- run query
        const query = queryGen(data.accountId, data.query);

        // If it's a child account, add query to only pull in reports for groups child has access to
        if(!data.parent) query.groupId = { $in: userGroupIds };

        const doc = await dbs[data.category].find(query, select);

        // Apply group names to data and sort?
        const report = groups ? doc.map(item => {
            const { groupId, _id, ...newItem } = item._doc;
            const groupName = (groups.find(group => group._id.toString() === groupId) || { name: '' }).name;
            return { [data.category + 'Id']: _id, group: groupName, ...newItem };
        }) : doc;

        const sortedReport = report.sort(fieldSorter(data.sortBy || []));

        // console.log(sortedReport);

        // Create the report
        await Report.updateOne({ _id: data.reportId}, { $set: { report: sortedReport, status: 1, url: `${baseUrl}/api/report/download/${data.reportId}:${data.accountId}:${data.userId}` }},(error, res) => {
            if(error) logger.error('Report Consumer Error => ', error);

            // logger.info(data);
            // Send email with {url}/api/download/report/mongoId:accountId:userId
            alerter.sendAlert('email', {
                from: '"Intelizzz Dev Account" <anthony@intelizzz.co.uk>',
                to: userObj.email,
                subject: 'Intelizzz Reporting',
                text: `Your report is ready to download. Visit the url ${baseUrl}/api/report/download/${data.reportId}:${data.accountId}:${data.userId}`,
                html: `<p>Your report is ready to download. Visit the url <a href="${baseUrl}/api/report/download/${data.reportId}:${data.accountId}:${data.userId}">${baseUrl}/api/report/download/${data.reportId}:${data.accountId}:${data.userId}</a></p>`
            });
        });
    }
});

const fieldSorter = (fields) => (a, b) => fields.map(o => {
    let dir = 1;
    if (o[0] === '-') { dir = -1; o=o.substring(1); }
    return a[o] > b[o] ? dir : a[o] < b[o] ? -(dir) : 0;
}).reduce((p, n) => p ? p : n, 0);

process.once('SIGINT', function () {
    async.each([consumer], function (consumer, callback) {
        consumer.close(true, callback);
    });
});