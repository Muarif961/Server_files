const Boom = require('@hapi/boom');
const kafka = require('kafka-node');
// const { Kafka } = require('kafkajs');
const Request = require('request-promise-native');

// Fire and forget URLS
const fafUrls = process.env.FAF_URLS;
const fafKeys = process.env.FAF_KEYS;

const KAFKA_TOPIC = process.env.KAFKA_TOPIC;

const KAFKA_URL = process.env.KAFKA_URL;

console.log('USING URL: ', KAFKA_URL.split(','), KAFKA_TOPIC);

// KAFKAJS Implementation
// const kafka = new Kafka({
//     clientId: 'disperse',
//     brokers: KAFKA_URL.split(',')
// });

// const producer = kafka.producer();

const HighLevelProducer = kafka.HighLevelProducer;
const KeyedMessage = kafka.KeyedMessage;
const client = new kafka.KafkaClient({ kafkaHost: KAFKA_URL, autoConnect: true });

const producer = new HighLevelProducer(client);

producer.on('ready', function(err, response) {
    if(err) console.log(err);
    if(response) console.log('Response: ', response);
    console.log(`[kafka-producer -> '${KAFKA_TOPIC}']: connection`);
});

producer.on('error', function(err) {
    console.log(err);
    console.log(`[kafka-producer -> '${KAFKA_TOPIC}']: connection`);
    // throw err;
});

const getNotification = async (ctx) => {
    let body = {};
    let params = {};

    if(ctx.request.body) {
        body = ctx.request.body;
    }

    if(ctx.params) {
        params = ctx.params;
    }

    // Proxy to Fire and Forget endpoint (if enabled in service config)
    if(fafUrls) {
        console.log('Sending Fire and Forget requests: ', fafUrls);

        const fafs = fafUrls.split(',');
        const keys = fafKeys.split(',');

        fafs.forEach((faf, fafIdx) => {
            const url = faf + '/api/notify/' + ctx.params.deviceId;
            const headers = {};
            if(keys && keys.length > 0) {
                headers['api-key'] = keys[fafIdx]
            }

            fireAndForget(url, 'GET', headers);
        });
    }

    const payload = [
        {
            topic: KAFKA_TOPIC,
            messages: [ ctx.params.deviceId ]
        }
    ];

    producer.send(payload, (err, data) => {
        if (err) {
            console.log(err);
            console.log(`[kafka-producer -> '${KAFKA_TOPIC}']: broker update failed for device ID ${ctx.params.deviceId}`);
        } else {
            console.log(`[kafka-producer -> '${KAFKA_TOPIC}']: broker update success for device ID ${ctx.params.deviceId}`);
        }
    });

    // KAFKAJS Implementation
    // try {
    //     // Producing
    //     await producer.connect();
    //     await producer.send({
    //         topic: KAFKA_TOPIC,
    //         messages: [ {
    //             value: ctx.params.deviceId
    //         } ],
    //     });
    // } catch (e) {
    //     if(e) console.log('Error: ', e);
    // }

    ctx.body = {
        status: 'success',
        message: 'Successful connection to the zzzAPI Disperse Service',
        body,
        params
    }
};

const fireAndForget = async (url, method, headers = {}, body) => {
    const options = {
        method,
        url,
        headers,
        json: true,
        timeout: 0
    };

    if(body) {
        options.body = body;
    }

    Request(options);
        // .then((response) => {
        //     // console.log(response);
        //     return response;
        // })
        // .catch((e) => {
        //     return e.error;
        // });
};

const testPost = async(ctx) => {
    const body = ctx.request.body;
    const headers = ctx.request.headers;
    console.log('HEADERS RECEIVED: ', JSON.stringify(headers, null, 2));
    console.log('BODY RECEIVED: ', JSON.stringify(body, null, 2));

    ctx.body = {success: true};
}

module.exports = { getNotification, testPost };
