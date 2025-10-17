FROM node:12

WORKDIR /opt/intelizzz-api-fuse/

COPY ./ .

#RUN npm i

RUN npm install pm2 -g

COPY ./pm2.json .

EXPOSE 80

CMD ["pm2-runtime", "/opt/intelizzz-api-fuse/pm2.json"]