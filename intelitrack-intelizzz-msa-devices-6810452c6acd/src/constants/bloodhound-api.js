const GNSS = { query: 'QueryGNSS', route: 'position' };
const LBS = { query: 'QueryLBS', route: 'position' };
const TRACK = { query: 'QueryTrackingMode', route: 'config' };
const BATTERY = { query: 'QueryBatteryLevel', route: 'config' };
const STATUS = { query: 'QueryDeviceStatus', route: 'config' };
const SIM = { query: 'QuerySIMData', route: 'config' };
const WAKEUPS = { query: 'QueryWakeupTimes', route: 'config' };
const SET_WAKEUPS = { query: 'SetWakeupTimes', route: 'config' };
const SET_TAMPER = { query: 'SetTamperState', route: 'config' };
const SET_OPER_MODE = { query: 'SetOperatingMode', route: 'config' };
const SET_TRACK_MODE = { query: 'StartTrackingMode', route: 'config' };
const SET_GNSS_QUALITY = { query: 'SetGNSSPrecision', route: 'config'};
const SET_GNSS_TIMEOUT = { query: 'SetGNSSTimeout', route: 'config'};
const SET_MESSAGE_TIMEOUT = { query: 'SetMessageTimeout', route: 'config'};
const SET_RADIO_TIMEOUT = { query: 'SetRadioTimeout', route: 'config'};

module.exports = { GNSS, LBS, TRACK, BATTERY, STATUS, SIM, WAKEUPS, SET_WAKEUPS, SET_TAMPER, SET_OPER_MODE, SET_TRACK_MODE, SET_GNSS_QUALITY, SET_GNSS_TIMEOUT, SET_MESSAGE_TIMEOUT, SET_RADIO_TIMEOUT };
