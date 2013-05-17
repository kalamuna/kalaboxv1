/**
 * @file
 * Server controller for the Kalabox dashboard.
 */

// Dependencies:
var box = require('./box');

// Variables:
var socket;

// Communication handlers:

function handleStart(data) {
  console.log('Start request received.');
  box.startBox(function() {
    console.log('Box started');
    socket.emit('boxStarted');
  });
}

function handleStop(data) {
  console.log('Stop request received.');
  box.stopBox(function() {
    console.log('Box stopped');
    socket.emit('boxStopped');
  });
}

exports.initialize = function() {
  io.sockets.on('connection', function (newSocket) {
    socket = newSocket;
    // Register handlers for all client-sent io events.
    socket.on('startRequest', handleStart);
    socket.on('stopRequest', handleStop);
  });
};
