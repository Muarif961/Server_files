# Intelizzz Devices Microservice

## Description

This project is a Node.js-based microservice responsible for managing all device-related operations within the Intelizzz ecosystem. It handles device registration, activation, data retrieval, and various other functionalities related to device management.

## How it Works

The service is built with Koa.js and exposes a set of API endpoints to manage devices. It interacts with a MongoDB database to store and retrieve device information.

## Asynchronous Communication

This microservice uses Kafka for asynchronous communication. It has both a producer and a consumer.

### Producer

The Kafka producer is used to send messages when a CSV file with device installation data is uploaded via the `/uploader/installs` endpoint. Each row in the CSV file is sent as a separate message to the `KAFKA_TOPIC`.

### Consumer

The Kafka consumer listens for messages on the `KAFKA_TOPIC`. It handles different types of messages, including:

*   `processInstall`: When a `processInstall` message is received, the consumer processes the installation data and updates the corresponding device information in the database.
*   `alert`: When an `alert` message is received, the consumer updates the device's alert status in the database.
*   `device`: When a `device` message is received (on device "wake up"), the consumer updates the device's status, including battery level, operating mode, and other technical parameters.

## Configuration

The project is configured using environment variables.

### Environment Variables

*   `MONGO_HOST`: The hostname of the MongoDB server.
*   `MONGO_PORT`: The port number of the MongoDB server.
*   `MONGO_DB`: The name of the MongoDB database.
*   `PORT`: The port for the service to run on.
*   `KAFKA_TOPIC`: The Kafka topic to produce to and consume from.
*   `KAFKA_GROUP`: The Kafka consumer group.
*   `KAFKA_URL`: The connection URL for the Kafka instance.

## Endpoints

The following endpoints are available:

*   `GET /locator`: Get locator devices.
*   `GET /found`: Get found devices.
*   `POST /verify`: Verify a locator code.
*   `POST /addlocator`: Add a device to the locator bucket.
*   `PUT /locatoroperatingmode/:jwtdata`: Set the operating mode for a locator device.
*   `GET /:accountId`: Get all devices for an account.
*   `POST /groupsort/:accountId`: Get devices sorted by group.
*   `GET /config/:accountId`: Get config devices for an account.
*   `PUT /activate/:jwtdata`: Activate a device.
*   `GET /count/:accountId`: Get the device count for an account.
*   `GET /data/:deviceId`: Get data for a specific device.
*   `GET /pending/:deviceId`: Get pending data for a device.
*   `PUT /assign/:jwtdata`: Assign a device.
*   `PUT /update/:jwtdata`: Update a device.
*   `PUT /tamper/:jwtdata`: Set the tamper state for a device.
*   `PUT /clearalert/:jwtdata`: Clear an alert for a device.
*   `PUT /favourite/:jwtdata`: Set a device as a favourite.
*   `PUT /operatingmode/:jwtdata`: Set the operating mode for a device.
*   `PUT /group/:jwtdata`: Assign a device to a group.
*   `PUT /wakeuptimes/:jwtdata`: Update the wakeup times for a device.
*   `PUT /wakeupdays/:jwtdata`: Update the wakeup days for a device.
*   `POST /byid`: Get devices by their IDs.
*   `PUT /recoverycode/:jwtdata`: Get a recovery code for a device.
*   `PUT /clearrecoverycode/:jwtdata`: Clear the recovery code for a device.
*   `PUT /reset/:jwtdata`: Reset devices.
*   `GET /installationhistory/:jwtdata`: Get the installation history for devices.
*   `PUT /selectall/wakeuptimes/:jwtdata`: Update wakeup times for all selected devices.
*   `PUT /selectall/operatingmode/:jwtdata`: Set operating mode for all selected devices.
*   `PUT /selectall/tamper/:jwtdata`: Set tamper state for all selected devices.
*   `PUT /groupunset/:jwtdata`: Unset a group from a device.
*   `PUT /cleargroup`: Clear a group from all devices (internal call).
*   `POST /addcertificate/:jwtdata`: Add a certificate for a device.
*   `GET /certificate/:deviceId/:jwtdata`: Download a certificate for a device.
*   `GET /certificates/:jwtdata`: Get all certificates.
*   `DELETE /certificates/:jwtdata`: Delete certificates.
*   `GET /notes/:jwtdata`: Get notes for a device.
*   `PUT /installer/install/:jwtdata`: Install a device.
*   `PUT /installer/image`: Add a device image.
*   `PUT /note/:jwtdata`: Add a device note.
*   `PUT /installer/uninstall/:jwtdata`: Uninstall a device.
*   `GET /installer/getvindata/:jwtdata`: Get VIN data for a vehicle.
*   `GET /installer/getinstalldata/:jwtdata`: Get installer QR data.
*   `PUT /uploader/stockdata/:jwtdata`: Upload stock data.
*   `PUT /uploader/installs/:jwtdata`: Upload device installs.
*   `PUT /tags/:jwtdata`: Update tags for a device.
*   `PUT /tags/count/:jwtdata`: Get the count of devices with a specific tag.
*   `GET /filters/count/:jwtdata`: Get the count of devices matching a filter.
*   `PUT /stolen/:jwtdata`: Add a device to the locator.
*   `PUT /thresholdbyid/:jwtdata`: Update the threshold for a device by ID.
*   `PUT /conf/add`: Assign conference devices.
*   `GET /health`: Returns a 200 OK response if the service is running.
