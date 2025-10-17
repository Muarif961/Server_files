const moment = require('moment-timezone');
const Account = require('../models/account.model');
const Mongoose = require('mongoose');

/**
 * Converts installer times from a specified timezone to UTC and adds random offset
 * @param {Array} installerTimes - Array of time strings in HH:MM format (e.g., ["11:00", "15:30"])
 * @param {string} timezone - Timezone string (e.g., "America/Chicago")
 * @returns {Array} Array of UTC time strings with 0-30 minute random offset, padded to 4 elements with nulls
 */
const convertInstallerTimesToUTC = (installerTimes, timezone) => {
    if (!installerTimes || !Array.isArray(installerTimes) || !timezone) {
        return [null, null, null, null];
    }

    const convertedTimes = installerTimes.slice(0, 4).map(timeStr => {
        if (!timeStr || typeof timeStr !== 'string') {
            return null;
        }

        try {
            // Parse the time string (assuming HH:MM format)
            const [hours, minutes] = timeStr.split(':').map(num => parseInt(num, 10));
            
            if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
                return null;
            }

            // Create a moment object for today with the specified time in the given timezone
            const localTime = moment.tz(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`, 'HH:mm', timezone);
            
            // Convert to UTC
            const utcTime = localTime.utc();
            
            // Add random offset between 0 and 30 minutes
            const randomOffset = Math.floor(Math.random() * 31); // 0-30 minutes
            utcTime.add(randomOffset, 'minutes');
            
            // Return in HH:MM format
            return utcTime.format('HH:mm');
        } catch (error) {
            console.error(`Error converting time ${timeStr} from timezone ${timezone}:`, error);
            return null;
        }
    });

    // Pad to 4 elements with nulls
    while (convertedTimes.length < 4) {
        convertedTimes.push(null);
    }

    return convertedTimes;
};

/**
 * Gets installer times from account and converts them to UTC wake times
 * @param {string} accountId - The account ID string
 * @param {string} timezone - The timezone string from the request
 * @returns {Promise<Array|null>} Array of converted wake times or null if no installer times found
 */
const getAccountInstallerTimes = async (accountId, timezone) => {
    if (!accountId || !timezone) {
        return null;
    }

    try {
        // Convert string accountId to ObjectId for the query
        const account = await Account.findOne({ _id: new Mongoose.Types.ObjectId(accountId) });
        
        if (!account || !account.installerTimes || !Array.isArray(account.installerTimes)) {
            return null;
        }

        // Convert installer times to UTC wake times
        return convertInstallerTimesToUTC(account.installerTimes, timezone);
    } catch (error) {
        console.error(`Error fetching account installer times for account ${accountId}:`, error);
        return null;
    }
};

module.exports = {
    convertInstallerTimesToUTC,
    getAccountInstallerTimes
};