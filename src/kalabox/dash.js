/**
 * @file
 * Server controller for the Kalabox dashboard.
 */

// Dependencies:
var box = require('./box');

// Variables:
var socket;

// Client communication handlers:

function handleStartRequest(data) {
  console.log('Start request received.');
  box.startBox(function() {
    console.log('Box started');
    socket.emit('boxStarted');
  });
}

function handleStopRequest(data) {
  console.log('Stop request received.');
  box.stopBox(function() {
    console.log('Box stopped');
    socket.emit('boxStopped');
  });
}

// Module communication handlers:

function handleStart() {
  socket.emit('boxStarted');
}

function handleStop() {
  socket.emit('boxStopped');
}

/**
 * Initializes the controller, binding to events from client and other modules.
 */
exports.initialize = function() {
  // Bind handlers for communication events coming from the client.
  io.sockets.on('connection', function (newSocket) {
    socket = newSocket;
    socket.on('startRequest', handleStartRequest);
    socket.on('stopRequest', handleStopRequest);
  });
  // Bind handlers for communication events coming from other modules.
  box.on('start', handleStart);
  box.on('stop', handleStop);
};
