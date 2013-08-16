/**
 * @file
 * Server controller for the Kalabox dashboard.
 *
 * Copyright 2013 Kalamuna LLC
 */

// Dependencies:
var box = require('./box'),
    exec = require('child_process').exec,
    config = require('../config'),
    drushUpload = require('./vm/drush-upload'),
    services = require('./vm/services'),
    logger = require('../logger'),
    sitesManager = require('./vm/sites-manager');

// "Constants":
var KALABOX_DIR = config.get('KALABOX_DIR'),
    KALASTACK_DIR = config.get('KALASTACK_DIR');

// Variables:
var socket;

// Client communication handlers:

function handleStartRequest(data) {
  console.log('Start request received.');
  box.startBox(function(error) {
    if (error && error.userCanceled) {
      if (socket) {
        socket.emit('boxStartCanceled');
      }
      return;
    }
    else if (error && error.vmError) {
      if (socket) {
        socket.emit('vmError');
      }
      logger.warn(error.message);
      return;
    }
    console.log('Box started');
    if (socket) {
      socket.emit('boxStarted');
    }
  });
}

function handleStopRequest(data) {
  console.log('Stop request received.');
  box.stopBox(function(error) {
    if (error && error.userCanceled) {
      if (socket) {
        socket.emit('boxStopCanceled');
      }
      return;
    }
    else if (error && error.vmError) {
      if (socket) {
        socket.emit('vmError');
      }
      logger.warn(error.message);
      return;
    }
    console.log('Box stopped');
    if (socket) {
      socket.emit('boxStopped');
    }
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

  var serviceURL = '';
  switch (data.requestType) {
    case 'phpMyAdminButton':
      serviceURL = 'http://php.kala';
      break;
    case 'webGrindButton':
      serviceURL = 'http://grind.kala';
      break;
    case 'startSiteButton':
      serviceURL = 'http://start.kala';
      break;
    case 'picardButton':
      serviceURL = 'http://www.youtube.com/watch?v=g3rFNbSKpEE';
      break;
  }
  handleUrlRequest({url: serviceURL});
}

function handleFoldersRequest(data) {
  // User should be able to open up their code even when the box is off
  exec('open .', {cwd: process.env.HOME + '/kalabox/www'});
}

function handleUrlRequest(data) {console.log('URL: ' + data.url);
  // Launch the url in the user's default browser.
  exec('osascript -e \'open location "' + data.url + '"\'');
}

function handleDrushUpload(data) {
  drushUpload.upload(data.content, function(error) {
    if (error) {
      logger.error('Unable to upload Drush aliases file: ' + error.message);
      return;
    }
    if (socket) {
      socket.emit('drushUploadComplete');
    }
  });
}

function handleSiteBuild(data) {
  sitesManager.buildSite(data, function(error) {
    var success = true;
    if (error) {
      logger.warn(error.message);
      success = false;
    }
    socket.emit('siteBuildFinished', {succeeded: success});
  });
}

function handleSiteRemove(data) {
  sitesManager.removeSite(data, function(error) {
    var success = true;
    if (error) {
      logger.warn(error.message);
      success = false;
    }
    socket.emit('siteRemoveFinished', {succeeded: success});
  });
}

function handleSiteRefresh(data) {
  sitesManager.refreshSite(data, function(error) {
    var success = true;
    if (error) {
      logger.warn(error.message);
      success = false;
    }
    socket.emit('siteRefreshFinished', {succeeded: success});
  });
}

// Module communication handlers:

function handleStart() {
  if (socket) {
    socket.emit('boxStarted');
  }
}

function handleStop() {
  if (socket) {
    socket.emit('boxStopped');
  }
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
    socket.on('urlRequest', handleUrlRequest);
    socket.on('siteBuildRequest', handleSiteBuild);
    socket.on('siteRemoveRequest', handleSiteRemove);
    socket.on('siteRefreshRequest', handleSiteRefresh);
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
