const _ = require('lodash');
const axios = require('axios');
var express = require('express');
var router = express.Router();
const qs = require('querystring');
const { allocateDeviceToAccountV2 } = require('../api/cmsV2Api');

let objData = {
  name: 'testKris2',
  abbreviation: 'testKris2',
  encryptPwd: 'e99a18c428cb38d5f260853678922e03',
  code: '',
  legal: 'testKris2Account',
  linkMan: '',
  linkPhone: '',
  validity: '',
  parentId: '',
  industryType: '1',
  businessLicenseNum: '',
  registeredCapital: '',
  address: 'testKris2,123,St.test',
  introduction: 'Test+Desktop+Account\ntestDesktop@testDesktop.com',
  remark: 'test+remark+from+testDesktop+Account',
};

// create account
router.post('/accountcreate', async (req, res) => {
  const { formData } = req.body;
  let token = await loginToAdminAcc();
  if (token) {
    let accResp = await createAccountApi(token, formData);
    console.log(accResp);
    res.json(accResp);
  } else {
    res.json();
  }
});

router.get('/validatedevice', async (req, res) => {
  const { deviceId } = req.query;
  let token = await loginToAdminAcc();
  if (token) {
    let url = `https://server2.intelitrack.co.uk/808gps/OperationManagement/StandardVehicleAction_loadVehicles.action?type=1&name=${deviceId}`; //`http://server2.intelitrack.co.uk/808gps/OperationManagement/StandardDeviceAction_loadDevices.action?type=1&name=Intelitrack&devIDNO=${deviceId}`;
    await axios
      .post(
        url,
        {},
        {
          headers: {
            cookie: `JSESSIONID=${token}`,
          },
        },
      )
      .then(resp => {
        if (resp.data.result === 0 && resp.data.infos !== null) {
          console.log(resp.data.infos);
          let infoData = resp.data.infos.filter(
            item => item.devList[0].name === deviceId,
          );
          res.json(infoData);
        } else {
          res.json([]);
        }
      });
  }
});

router.post('/movedevice', async (req, res) => {
  const { companyId, deviceIds = [], deviceName } = req.body.formData;
  let moveVehicleUrl = `https://server2.intelitrack.co.uk/808gps/OperationManagement/StandardVehicleAction_mergeVehicleNew.action`;
  let token = await loginToAdminAcc();
  let isSaved = true;
  console.log('device ids', deviceIds);
  for (let i = 0; i < deviceIds.length; i++) {
    let postData = await moveDeviceToVehicle(
      token,
      companyId,
      deviceIds[i],
      deviceName,
    );
    await axios
      .post(moveVehicleUrl, postData, {
        headers: {
          cookie: `JSESSIONID=${token}`,
        },
      })
      .then(resp => {
        if (resp.data.result !== 0) {
          isSaved = false;
        }
      });
    // console.log(postData);
  }
  res.send({ result: isSaved ? 0 : 1 });
});

const createAccountApi = (token, formData) => {
  const url =
    'https://server2.intelitrack.co.uk/808gps/OperationManagement/StandardCompanyAction_mergeCompany.action';
  let mergeData = { ...objData, ...formData };
  let post_data = qs.stringify({
    json: JSON.stringify({
      ...mergeData,
    }),
  });
  return axios
    .post(url, post_data, {
      headers: {
        cookie: `JSESSIONID=${token}`,
      },
    })
    .then(resp => {
      return resp.data;
    })
    .catch(err => false);
};

function loginToAdminAcc() {
  let username = 'admin';
  let password = 'abc123';
  let url = `https://server2.intelitrack.co.uk/808gps/LoginAction_loginMobile.action?userAccount=${username}&password=${password}`;
  return axios
    .get(url)
    .then(resp => {
      if (resp.status === 200 && resp.data.result === 0) {
        console.log(resp.data.JSESSIONID);
        return resp.data.JSESSIONID;
      } else {
        return false;
      }
    })
    .catch(() => false);
}

router.get('/allocatevehicle', async (req, res) => {
  const { companyId, deviceId, deviceName } = req.query;
  let result = await allocateDeviceToAccountV2(companyId, deviceId, deviceName); // tocompanyId = 2, vehId
  console.log('results', result);
  res.send(
    result
      ? { result: 1, msg: 'Vehicle added' }
      : { result: 2, msg: 'Vehicle not added' },
  );
});

module.exports = router;
