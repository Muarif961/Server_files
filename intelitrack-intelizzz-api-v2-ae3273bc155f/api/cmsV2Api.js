const axios = require('axios');
const { CMSV2 } = require('../constants');
const qs = require('querystring');

const username = 'admin';
const password = 'admin1';

const postForm = (url, params) => {
  return axios
    .post(url, qs.stringify(params), {
      'Content-Type': 'application/x-www-form-urlencoded'
    })
    .then(resp => {
      return resp;
    });
};

const getToken = () => {
  return axios
    .get(CMSV2.getToken(username, password))
    .then(resp => {
      let str = resp.data.replace(/^\s*|\s*$/g, '');
      let json = JSON.parse(str);
      if (json.result === 0) {
        return json.jsession;
      } else {
        return false;
      }
    })
    .catch(err => false);
};

const checkOnlineStatuses = async ids => {
  let token = await getToken();
  if (token) {
    return axios
      .get(CMSV2.getDeviceOnlineStatuses(ids, token))
      .then(resp => {
        let str = resp.data.replace(/^\s*|\s*$/g, '');
        let json = JSON.parse(str);
        console.log('response devices online', json.result);
        if (json.result === 0) {
          return (json.devices || []).filter(item => item.online === 1);
        } else return [];
      })
      .catch(err => {
        console.log('error request', err);
        return [];
      });
  } else return [];
};

const setWakeUpTimers = async (devId, timers) => {
  let token = await getToken();
  if (token) {
    return axios
      .get(CMSV2.setWakeUpTimers(devId, timers, token))
      .then(resp => true)
      .catch(err => false);
  } else return false;
};

const activateSecretTracker = async devId => {
  let token = await getToken();
  if (token) {
    return axios
      .get(CMSV2.activateSecretTracker(devId, token))
      .then(resp => true)
      .catch(err => false);
  } else return false;
};

const allocateDeviceToAccountV2 = async (companyId = 2, vehId, deviceName) => {
  let objectData = {
    username,
    userpwd: password
  };
  return axios
    .post(CMSV2.loginAlternate, qs.stringify(objectData))
    .then(async resp => {
      let { token, id } = resp.data.data;

      let post_data = {
        keyname: vehId,
        token,
        userid: id
      };
      return await axios
        .post(CMSV2.searchDeviceById, qs.stringify(post_data))
        .then(async respSearch => {
          let { data, result } = respSearch.data;
          if (result === 1 && data) {
            let validateId = data.filter(
              item => item.dName === post_data.keyname
            );
            if (validateId.length === 1) {
              let allocate_post_data = {
                ...validateId[0],
                vCompanyID: companyId,
                vPlate: deviceName ? deviceName : validateId[0].vPlate,
                token,
                userid: 1
              };
              return await axios
                .post(
                  CMSV2.allocateDeviceToGroup,
                  qs.stringify(allocate_post_data),
                  {
                    'Content-Type': 'application/x-www-form-urlencoded'
                  }
                )
                .then(respAllocate => {
                  console.log(
                    'Vehicle added',
                    // allocate_post_data,
                    respAllocate.data
                  );
                  if (respAllocate.data.result === 1) {
                    return true;
                  }
                  return false;
                });
            } else {
              return false;
            }
          } else {
            return false;
          }
        });
    })
    .catch(err => false);
};

// setWakeUpTimers();

module.exports = {
  checkOnlineStatuses,
  setWakeUpTimers,
  activateSecretTracker,
  allocateDeviceToAccountV2
};
