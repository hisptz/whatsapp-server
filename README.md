#WHATSAPP SERVER

## Introduction

This is an node application that with the help of [WPPConnect](https://wppconnect.io/) library, exposes the WhatsApp api through an express server.

## Prerequisites

To get started with the Whatsapp Server you will need to have the following installed:

- Node JS

## Configurations

The server is configured by supplying the environment variables as in the `.env.example` file. This can be done by creating `.env` file with the following configurations

```
PORT=<port_to_expose_whatsapp_api>
```

## Setup

The project can be set up by running the below command to install the project dependencies

- Using npm

```
npm install
```

- Using yarn

```
yarn install
```

## Development

To start the development server, use the following commands:

- Using npm

```
npm start
```

- Using yarn

```
yarn start
```

## Building

A production build can be generated using the below command:

- Using npm

```
npm run build
```

- Using yarn

```
yarn build
```

## Deploying the server

The whatsapp server can be started by running the below command

```
node app/index.js
```
