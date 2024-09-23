const express = require('express');
const bodyParser = require('body-parser');
const dgram = require('dgram');
const fs = require('fs');

msgToEsp = Buffer.from('0');
const udpServer = dgram.createSocket('udp4');

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static('public'));

let esp_port;
let esp_addr;
let command = '-1';

// take in line of csv and write to file
udpServer.on('message', (msg, rinfo) => {

    console.log(`Received UDP message from ${rinfo.address}:${rinfo.port}: ${msg}`);
    esp_port = rinfo.port;
    esp_addr = rinfo.address;

    fs.appendFile('driving_data.csv', msg, (err) => {
        if (err) throw err;
    });

    //send data to 'data'
    /*
    fetch('data', {
        method: 'POST', // Specify the method
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(msg) // Convert the JavaScript object to a JSON string
    })
    .then(response => response.text()) // Convert the response to text (since you send back a simple text response)
    .then(data => console.log(data)) // Log the response from the server
    .catch(error => console.error('Error:', error));
    */ 
});

// receive prediction and send to esp over udp
/*
app.post('/prediction', (req, res) => {
    prediction = req.body.key.toString();
    console.log('Received prediction:', prediction);
    res.status(200).send(`Received prediction: ${prediction}`);
    msgToEsp = Buffer.from(prediction);
    udpServer.send(msgToEsp, esp_port, esp_addr);
    console.log('Sent prediction: ', prediction);
});
*/

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
    console.log('Received keypress:', command);
    res.status(200).send(`Received keypress: ${command}`);
    msgToEsp = Buffer.from(command);
    udpServer.send(msgToEsp, esp_port, esp_addr);
    console.log('Sent command: ', command);
});

udpServer.bind(3333); // UDP port to listen on

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
    esp_port = port;
});