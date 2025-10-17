FROM node:12

WORKDIR /opt/intelizzz-api-alerts-history/

COPY ./ .

#RUN npm i

RUN npm install pm2 -g

COPY ./pm2.json .

EXPOSE 80

CMD ["pm2-runtime", "/opt/intelizzz-api-alerts-history/pm2.json"]

#CMD ["tail", "-f", "/dev/null"]