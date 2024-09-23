# Code Readme

This code repository contains the working code for an ESP32-controlled car that moves according to on-board sensors and voice commands. It consists of 2 main folders, buggy and teledriveServer.

This backend NodeJS server lies in the TeledriveServer folder, and contains two main Node scripts: one for gathering data (server.js) and one for sending autonomous commands (serverrun.js). server.js takes in sensor data from the ESP32 over UDP to build a dataset that is used to train a neural network through Tensorflow JS. This file also hosts a static html file that enables keyboard commands to be sent back to the car for tele-operative driving.

serverrun.js also enables keyboard input for choosing the path of the buggy, which determines the corresponding model to use for a particular path. It then uses this model to predict what heading the buggy should have based on the incoming sensor data.

Finally, the buggy folder contains the code for controlling the car sensors, ESC, and steering servo. It first starts the calibration sequence for the car, then executes a few main tasks including sensor data collection, UDP communication, and collision detection. 
