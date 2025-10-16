const GNSS = { query: 'QueryGNSS', route: 'position' };
const LBS = { query: 'QueryLBS', route: 'position' };
const TRACK = { query: 'QueryTrackingMode', route: 'config' };
const BATTERY = { query: 'QueryBatteryLevel', route: 'config' };
const STATUS = { query: 'QueryDeviceStatus', route: 'config' };
const SIM = { query: 'QuerySIMData', route: 'config' };
const WAKEUP = { query: 'QueryWakeupTimes', route: 'config' };

module.exports = { GNSS, LBS, TRACK, BATTERY, STATUS, SIM, WAKEUP };