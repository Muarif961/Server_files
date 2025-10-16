# Intelizzz API V2

## Up and Running

To get up and running locally, first ensure you have a local instance of MongoDB running. The easiest way of doing this is to pull a docker instance. You can do this by running the following commands in a terminal:

```bash
docker pull mongo:4.0.4

docker run -d -p 27017-27019:27017-27019 --name mongodb mongo:4.0.4
```

The above commands create and spin-up a MongoDB running on you localhost that the API can connect to.

## Deployment Instructions

Deployment uses CaptainDuckDuck (will need to update this to CapRover at some point as CDD is deprecated). To deploy the API, you will need to install CaptainDuckDuck CLI:

```bash
npm install -g captainduckduck
```

You will then need to login to the Captain root server using supplied credentials (not included as part of this README for obvious security reasons).

To deploy the API, you need to run the following NPM command:

```bash
npm run deploy
```

This will create a deploy.tar file that has been added to .gitignore and should never be pushed to the repo.

Once you have the deploy.tar file, you can deploy this with the following command, replacing _app-name_ with the actual name of the application to be deployed (you can get a list of the applications from the server):

```bash
captainduckduck deploy -a app-name
```

_**NOTE**: In the environment ensure you set the **MONGO_DB_URL** variable to the MongoDB instance the API will be connecting to. Otherwise, it will attempt to connect to localhost._
