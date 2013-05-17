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
  });
}

exports.initialize = function() {
  io.sockets.on('connection', function (newSocket) {
    socket = newSocket;
    // Register handlers for all client-sent io events.
    socket.on('startRequest', handleStart);
  });
};
