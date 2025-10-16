FROM node:12

WORKDIR /opt/bloodhound-fetcher/

COPY ./ .

#RUN npm i

RUN npm install pm2 -g

COPY ./pm2.json .

# EXPOSE 80

CMD ["pm2-runtime", "/opt/bloodhound-fetcher/pm2.json"]