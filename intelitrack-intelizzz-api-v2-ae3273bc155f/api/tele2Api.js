const axios = require("axios");
const moment = require("moment");

const username = "devintelitrack";
const password = "Intelizzzdev123"//"Devintelizzz123";
const tele2Token = "03182236-cae9-47be-9858-436a88fd2ad0";
let searchSmsUrl = `https://tele2.jasperwireless.com/provision/api/v1/sims?_dc=1532090771568&page=1&limit=50&sort=monthToDateDataUsageMB&dir=DESC&search=%5B%7B%22property%22%3A%22oneBox%22%2C%22type%22%3A%22CONTAINS%22%2C%22value%22%3A%2289462038009000004849%22%2C%22id%22%3A%22oneBox%22%7D%5D`;

const authRequestTele2 = url => {
  let base64 = new Buffer(`${username}:${tele2Token}`).toString("base64");
  axios.defaults.headers.common["Authorization"] = `Basic ${base64}`;

  return axios.get(url);
};

const getSimByVehicleId = vehicleId => {
  let url = `https://server2.intelitrack.co.uk/808gps/openPhp/getVehicleSimById.php?id=${vehicleId}`;
  console.log("URL", url);
  return axios
    .get(url)
    .then(resp => resp.data)
    .catch(err => []);
};

const sendWakeUpTimers = async (vehicleId, timers) => {
  let sim = await getSimByVehicleId(vehicleId);
  if (sim.length > 0) {
    let { iccid, accountID } = await getIccidBySim(sim[0].simCard);
    console.log(iccid, accountID);
    let messageText = `WAKEUP,${timers.join(",").replace(/:/g, "")}#`;
    let messageId = await sendSmsMessageTele2(iccid, messageText);
    console.log(messageId);
    return messageId;
  } else {
    return false;
  }
};

const sendSecretTracker = async (vehicleId, messageText = "ZZ,1,10,60#") => {
  let sim = await getSimByVehicleId(vehicleId);
  console.log("Fetched SIM", sim);
  if (sim.length > 0) {
    // let { iccid, accountID } = await getIccidBySim(sim[0].simCard);
    let data = await getIccidBySim(sim[0].simCard);
    console.log("Fetched iccid", data);
    if (data) {
      let messageId = await sendSmsMessageTele2(data.iccid, messageText);
      console.log(messageId);
      return messageId;
    }
  } else {
    return false;
  }
};

function fetchSmsMessagesTele2(accountID, iccid) {
  let date =
    moment()
      .subtract({ day: 1 })
      .format()
      .split("T")[0] + "T00:00:00Z";
  let url = `https://restapi3.jasper.com/rws/api/v1/smsMessages?accountID=${accountID}&iccid=${iccid}&fromDate=${date}`;
  authRequestTele2(url)
    .then(resp => {
      let messages = resp.data.smsMsgIds;
      console.log(resp.data);
      if (messages.length) {
        getSmsDetails(messages[0]);
      } else {
        console.log("No Messages");
      }
    })
    .catch(err => console.log(err.message));
}

function getSmsDetails(smsId) {
  let url = `https://restapi3.jasper.com/rws/api/v1/smsMessages/${smsId}`;
  authRequestTele2(url)
    .then(resp => {
      console.log(resp.data);
    })
    .catch(err => console.log(err.message));
}

function sendSmsMessageTele2(iccid, messageText) {
  let url = `https://restapi3.jasper.com/rws/api/v1/devices/${iccid}/smsMessages`;
  let base64 = new Buffer(`${username}:${tele2Token}`).toString("base64");
  axios.defaults.headers.common["Authorization"] = `Basic ${base64}`;
  return axios
    .post(url, {
      messageText //: "WAKEUP,0800,1000,1300,1800#"
    })
    .then(resp => (resp.data.smsMessageId ? resp.data.smsMessageId : false))
    .catch(err => console.log(err));
}

async function cancelDeviceBySimId(simId) {
  console.log("calling Cancel sim", simId);
  const url = `https://tele2.jasperwireless.com/provision/api/v1/simDiagnostic/cancelLocation/${simId}?_dc=1518644649574`;
  console.log(url);
  axios.defaults.headers.common["Authorization"] = `Basic ${new Buffer(
    username + ":" + password
  ).toString("base64")}`;
  const request = await axios.get(url);
  // console.log(request.data);
  return request;
}

// async function cancelDeviceByIccid(iccid) {
//   const url = `http://62.69.69.196/808gps/openPhp/sendCancelLocation.php?iccid=${iccid}`;
//   let request = await axios.get(url);
//   return request;
// }

async function getIccidBySim(sim) {
  const url = `https://tele2.jasperwireless.com/provision/api/v1/sims?_dc=1518644291631&page=1&limit=150&sort=dateAdded&dir=DESC&search=[{"property":"msisdn","type":"CONTAINS",
  "value":${sim},"id":"msisdn"}]`;
  console.log(sim);
  axios.defaults.headers.common["Authorization"] = `Basic ${new Buffer(
    username + ":" + password
  ).toString("base64")}`;
  return axios
    .get(url)
    .then(resp => {
      console.log(resp.data);
      if (resp.status === 200) {
        return {
          iccid: resp.data.data[0].iccid,
          accountID: resp.data.data[0].acctId
        };
      } else {
        return null;
      }
    })
    .catch(err => null);
  // return request.status == 200
  //   ? {
  //       iccid: request.data.data[0].iccid,
  //       accountID: request.data.data[0].acctId
  //     }
  //   : null; //request.data.data[0].simId : null;
}

module.exports = {
  getSimByVehicleId,
  sendWakeUpTimers,
  sendSecretTracker
};
