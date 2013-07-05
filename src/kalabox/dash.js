/**
 * @file
 * Server controller for the Kalabox dashboard.
 */

// Dependencies:
var box = require('./box'),
    exec = require('child_process').exec,
    config = require('../config'),
    drushUpload = require('./vm/drush-upload'),
    services = require('./vm/services'),
    logger = require('../logger');

// "Constants":
var KALABOX_DIR = config.get('KALABOX_DIR'),
    KALASTACK_DIR = config.get('KALASTACK_DIR');

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

function handleSSHRequest(data) {
  // If box not running, don't launch ssh.
  if (!box.isRunning()) {
    return;
  }
  // Launch ssh in a new Terminal window.
  exec('osascript ' + __dirname + '/utils/scpts/start_ssh.scpt "' + KALASTACK_DIR + '"');
}

function handleServiceRequest(data) {
  // If box not running, don't open a service.
  if (!box.isRunning()) {
    return;
  }

  console.log(data);
  var serviceURL = '';
  switch (data.requestType) {
    case 'phpMyAdminButton':
      serviceURL = 'php.kala';
      break;
    case 'webGrindButton':
      serviceURL = 'grind.kala';
      break;
    case 'startSiteButton':
      serviceURL = 'start.kala';
      break;
  }

  // Launch the service in a new Terminal window.
  exec('osascript -e \'open location "http://' + serviceURL + '"\'');
}

function handleFoldersRequest(data) {
  // If box not running, don't open folders.
  if (!box.isRunning()) {
    return;
  }
  exec('open .', {cwd: process.env.HOME + '/kalabox'});
}

function handleDrushUpload(data) {
  drushUpload.upload(data.content, function(error) {
    if (error) {
      logger.error('Unable to upload Drush aliases file: ' + error.message);
      return;
    }
    socket.emit('drushUploadComplete');
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
    socket.on('sshRequest', handleSSHRequest);
    socket.on('openServiceRequest', handleServiceRequest);
    socket.on('foldersRequest', handleFoldersRequest);
    socket.on('drushUpload', handleDrushUpload);
    // If box running, make sure UI knows about it.
    if (box.isRunning()) {
      handleStart();
    }
  });
  // Bind handlers for communication events coming from other modules.
  box.on('start', handleStart);
  box.on('stop', handleStop);
  // Start services monitor and bind it to box events.
  box.on('start', services.startChecking);
  box.on('stop', services.stopChecking);
  services.initialize(box.isRunning());
};
