const defaults = {
    battery: {
        "category": "device",
        "query": {
        },
        "select": "name battery",
        "includeGroups": true,
        "name": "battery-life-report",
        "sortBy": [ "group", "battery" ]
    },
    batteryLessThan10: {
        "category": "device",
        "query": {
            "battery": "<=10"
        },
        "select": "name battery",
        "includeGroups": true,
        "name": "battery-level-less-than-10-percent-report",
        "sortBy": [ "group", "battery" ]
    },
    locations: {
        "category": "location",
        "query": {
        },
        "select": "gnss lbs",
        "includeGroups": true,
        "name": "locations-report",
        "sortBy": [ "group" ],
        "rangeName": "date"
    },
    tamperAlerts: {
        "category": "alerts",
        "query": {
            "tamperState": "==Tamper"
        },
        "select": "_id deviceId, tamperState dateTime latitude longitude location",
        "includeGroups": true,
        "name": "tamper-report",
        "sortBy": [ "deviceId", "group" ],
        "rangeName": "dateTime"
    },
    device: {
        "category": "device",
        "query": {
        },
        "select": "_id name group wakeupTimes wakeupDays battery operatingMode tamperState apn fwVersion model productionDate gnssstatus radioStatus serverAddress",
        "includeGroups": true,
        "name": "device-report",
        "sortBy": [ "group", "name" ]
    }
};

module.exports = defaults;