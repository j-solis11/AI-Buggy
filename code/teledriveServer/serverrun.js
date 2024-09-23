const express = require('express');
const bodyParser = require('body-parser');
const dgram = require('dgram');
const fs = require('fs');

const tf = require('@tensorflow/tfjs-node');
const shelljs = require('shelljs');
const tmp = require('tmp');
//const createModel = require('./model');

msgToEsp = Buffer.from('0');
const udpServer = dgram.createSocket('udp4');

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static('public'));

let esp_port;
let esp_addr;
let command = '-1';

let leftFlag = 0;
let rightFlag = 0;


//model functions
async function loadModel(modelPath) {
    const model = await tf.loadLayersModel(modelPath);
    return model;
}

/*
function prepareInputData(rawData) {
    const data = rawData.split(",");

    // Convert the 'sex' from categorical to numeric: F -> 0, M -> 1, I -> 2
    //const sexNumeric = data[0] === 'F' ? 0 : (data[0] === 'M' ? 1 : 2);

    // Parse the numerical features from the input string
    const features = data.slice(1, data.length - 1).map(value => parseFloat(value));

    // Combine the converted sex and other features into one array
    const convertedFeatures = [sexNumeric, ...features];

    //console.log("Converted features: ", convertedFeatures); // Debugging line to check features

    return tf.tensor2d([convertedFeatures]);
}
*/

async function predictAbaloneAge(modelPath, inputData) {
    const model = await loadModel(modelPath);
    //const inputTensor = prepareInputData(inputData);
    console.log(`${inputData}`);
    let processedArray = inputData.split(',').map(item => parseFloat(item));
    const prediction = model.predict(tf.tensor2d([processedArray]));
    return prediction.dataSync()[0]; // Since it's a single prediction
}

// Example usage
//const modelPath = 'file://trainedModel/model.json';
const leftModelPath = 'file://trainedModelLeft/model.json';
const rightModelPath = 'file://trainedModelRight/model.json';
//const inputData = '10,60.0,60.0,40.0';
let prediction = 0;

// take in line of csv and write to file
udpServer.on('message', (msg, rinfo) => {

    console.log(`Received UDP message from ${rinfo.address}:${rinfo.port}: ${msg}`);
    esp_port = rinfo.port;
    esp_addr = rinfo.address;

    fs.appendFile('driving_data.csv', msg, (err) => {
        if (err) throw err;
    });
    if (leftFlag == 1) {
        let inData = msg.toString();
        prediction = predictAbaloneAge(leftModelPath, inData)
            .then(prediction => {
                let intPrediction = parseInt(prediction);
                prediction = intPrediction.toString();
                let msgToEsp = ':' + Buffer.from(prediction);
                udpServer.send(msgToEsp, esp_port, esp_addr);
                console.log('Sending: ', msgToEsp);
                // Now you can use msgToEsp
            })
            .catch(error => {
                console.error("Error occurred while predicting the Abalone age:", error);
            });
    }
    else if (rightFlag == 1) {
        let inData = msg.toString();
        prediction = predictAbaloneAge(rightModelPath, inData)
            .then(prediction => {
                let intPrediction = parseInt(prediction);
                prediction = intPrediction.toString();
                let msgToEsp = ':' + Buffer.from(prediction);
                udpServer.send(msgToEsp, esp_port, esp_addr);
                console.log('Sending: ', msgToEsp);
                // Now you can use msgToEsp
            })
            .catch(error => {
                console.error("Error occurred while predicting the Abalone age:", error);
            });
    }

});

// receive prediction and send to esp over udp
app.post('/prediction', (req, res) => {
    prediction = req.body.key.toString();
    console.log('Received prediction:', prediction);
    res.status(200).send(`Received prediction: ${prediction}`);
    msgToEsp = Buffer.from(prediction);
    udpServer.send(msgToEsp, esp_port, esp_addr);
    console.log('Sent prediction: ', prediction);
});

udpServer.on('error', (err) => {
    console.error(`UDP server error:\n${err.stack}`);
    udpServer.close();
});

udpServer.on('listening', () => {
    const address = udpServer.address();
    console.log(`UDP server listening on ${address.address}:${address.port}`);
    esp_addr = address;
});

app.post('/keypress', (req, res) => {
    command = req.body.key.toString();
    if (command == '3') {
        leftFlag = 1;
    }
    else if (command == '4') {
        rightFlag = 1;
    }
    else if (command == '5') {
        leftFlag = 0;
        rightFlag = 0;
        console.log('Received keypress:', command);
        res.status(200).send(`Received keypress: ${command}`);
        msgToEsp = Buffer.from(command);
        udpServer.send(msgToEsp, esp_port, esp_addr);
        console.log('Sent command: ', command);
    }
    else { //left and right handled by model
        console.log('Received keypress:', command);
        res.status(200).send(`Received keypress: ${command}`);
        msgToEsp = Buffer.from(command);
        udpServer.send(msgToEsp, esp_port, esp_addr);
        console.log('Sent command: ', command);
    }
});

udpServer.bind(3333); // UDP port to listen on

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
    esp_port = port;
});