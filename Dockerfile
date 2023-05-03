FROM node:lts-alpine3.17
LABEL authors="HISP Tanzania"

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /whatsapp

COPY app /whatsapp/app/
COPY package.json /whatsapp/
COPY yarn.lock /whatsapp/

RUN apk add chromium && \
    yarn install --prod


ENTRYPOINT ["node", "app/index"]
