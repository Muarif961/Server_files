const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const axios = require('axios');
const cors = require('cors');
const qs = require('querystring');

const {
  MONGO_CONSTANTS: { dev_url, prod_url, database, db_url },
} = require('./constants');
const User = require('./models/User');

mongoose.Promise = global.Promise;
//connect to MongoDB
mongoose.connect(
  db_url,
  err => {
    if (err) {
      console.log(err);
      console.log('DB URL', db_url);
    }
    console.log('connected to mongoose');
  },
);

const api = require('./api');

// var index = require("./routes/index");
// var users = require("./routes/users");

var app = express();
app.use(cors());
// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

app.use('/api', api);

app.get('/testroute', (req, res) => {
  res.status(200).send({ result: 0, msg: 'success Route' });
});

app.post('/proxy', async (req, res) => {
  console.log(req.body);
  const { url, cookie, params } = req.body;
  if (!url || !cookie || !params) {
    return res.send({ result: 1, msg: 'no paramaters provided' });
  }
  let data = await proxyDataFetch(req.body);
  if (data.status === 200) {
    console.log(data.data);
    res.json(data.data);
  } else {
    res.json({ result: 1, msg: 'error', status: data.status });
  }
  console.log(data.data);
});

app.post('/proxyvehicles', async (req, res) => {
  const { cookie, begintime, endtime, vehiIdnos, currentPage } = req.body;

  let post_data = qs.stringify({
    begintime,
    endtime,
    json: JSON.stringify({
      vehiIdnos,
      typeIdno: '309,17',
      condiIdno: '0',
    }),
    toMap: 2,
    pagin: JSON.stringify({
      currentPage,
      pageRecords: 2000,
    }),
  });
  // console.log(post_data);
  let url =
    'https://server2.intelitrack.co.uk/808gps/StatisticalReports/StandardReportLoginAction_detail.action';
  let data = await proxyDataFetch({ url, cookie, params: post_data });
  // console.log(data.data);
  if (data.status === 200) {
    // console.log(data.data);
    res.json(data.data);
  } else {
    res.json({ result: 1, msg: 'error', status: data.status });
  }
});

app.post('/alternatelogin', async (req, res) => {
  console.log(req.body);
  const { url } = req.body;
  if (!url) {
    return res.send({ result: 1, msg: 'no paramaters provided' });
  }
  // let data = await proxyDataFetch(req.body);
  let data = await axios
    .get(url)
    .then(resp => resp)
    .catch(err => {
      return {
        result: 1,
      };
    });

  if (data.status === 200) {
    console.log(data.data);
    res.json(data.data);
  } else {
    res.json({ result: 1, msg: 'error', status: data.status });
  }
  console.log(data.data);
});

app.use(express.static(path.join(__dirname, 'build')));
app.get('*', function(req, res) {
  res.sendFile(path.join(__dirname + '/build/index.html'));
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler

app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;

function proxyDataFetch({ url, cookie, params = {} }) {
  console.log('url', url, 'cookie', cookie);
  return axios.post(url, params, {
    headers: {
      cookie: `JSESSIONID=${cookie}`,
    },
  });
}
