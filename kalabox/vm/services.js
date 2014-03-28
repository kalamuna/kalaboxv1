/**
 * Monitors the statuses of services running on the Kalabox.
 *
 * Copyright 2013 Kalamuna LLC
 */

// Dependencies:
var connector = require('./connector'),
    flow = require('nue').flow,
    as = require('nue').as,
    exec = require('child_process').exec,
    config = require('../../config');

// "Constants":
var KALASTACK_DIR = config.get('KALASTACK_DIR'),
    NET_CHECK_HOST = '8.8.8.8'; // IP or hostname to ping as a test for Internet connection.

// Data objects:
var socket,
    statusChecker;

// Services to check:
var services = [
  {
    name: 'nginx',
    message: '* nginx is running',
    running: null
  },
  {
    name: 'mysql',
    message: 'mysql start/running',
    running: null
  }
];

/**
 * Begins checking of service statuses.
 */
exports.startChecking = function() {
  if (!statusChecker) {
    statusChecker = setInterval(checkAllServices, 20000);
  }
};

/**
 * Stops checking of service statuses.
 */
exports.stopChecking = function() {
  clearInterval(statusChecker);
  statusChecker = null;
};

/**
 * Initializes the module.
 */
exports.initialize = function(startChecking) {
  // Grab the socket.io connection when it's established.
  io.sockets.on('connection', function(newSocket) {
    socket = newSocket;
  });
  // If box is running, start checking statuses.
  if (startChecking) {
    exports.startChecking();
  }
};

/**
 * Checks if the box can access the Internet.
 *
 * @param function callback
 *   Function to call when check completes.
 */
exports.checkConnection = function(callback) {
  var command = 'ping -c 1 -q ' + NET_CHECK_HOST;
  exec('vagrant ssh -c \'' + command + '\'', {cwd: KALASTACK_DIR}, function(error) {
    if (error) {
      error = new Error('Box has no Internet connection.');
      error.code = 'NO_NET';
      callback(error);
    }
    else {
      callback(null);
    }
  });
};

/**
 * Runs the status check for every service, storing any state changes, as well as
 * emitting change events to notify the UI.
 */
var checkAllServices = flow('checkAllServices')(
  function checkAllServices0() {console.log('checking services...');
    // Check each service's status.
    this.asyncEach(1)(services, function(service, group) {
      checkService(service, group.async(as(0)));
    });
  },
  function checkAllServices1(statuses) {
    // Check all current statuses against the returned statuses.
    for (var i = 0, length = services.length; i < length; i++) {
      var service = services[i];
      var status = statuses[i];
      // If service's status has changed, notify the client and store the new status.
      if (service.running != status) {
        service.running = status;
        if (socket) {
          socket.emit('serviceStatusChanged', { name: service.name, running: status });
        }
      }
    }
    this.next();
  }
);

/**
 * Checks the state (running or not) of a particular service.
 *
 * @param object service
 *   Service object containing name and message properties.
 * @param function callback
 *   Callback to pass true or false to depending on whether service is running.
 */
var checkService = flow('checkService')(
  function checkService0(service, callback) {
    this.data.service = service;
    this.data.callback = callback;
    // Run service status command.
    connector.runCommand('service ' + service.name + ' status', this.async());
  },
  function checkService1(response) {
    if (this.err) {
      this.err = null;
      this.data.callback(false);
    }
    else {
      // Parse response to see if service is running.
      response = response.toString();
      this.data.callback(response.indexOf(this.data.service.message) !== -1);
    }
    this.next();
  }
);
