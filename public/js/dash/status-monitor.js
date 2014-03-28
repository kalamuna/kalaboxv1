/**
 * Monitor to keep track of the box's status.
 *
 * Copyright 2013 Kalamuna LLC
 */

// Dependencies:
var socket = require('./socket');

// Box state variables:
var boxRunning = exports.boxRunning = ko.observable(false);
var boxStopped = exports.boxStopped = ko.computed(function() {
  return !boxRunning();
});

/**
 * Status displays.
 */
var statusDisplays = exports.statusDisplays = [];
var services = {};
var serviceDefinitions = [
  {name: 'box', title: 'Kalabox'},
  {name: 'nginx', title: 'Web Server'},
  {name: 'mysql', title: 'Database'}
];

/**
 * Get status for a given service (set as this value).
 *
 * @return string
 *   Status description to display on UI.
 */
function getDisplayStatus() {
  if (this.running()) {
    return 'Running';
  }
  return 'Stopped';
}

/**
 * Compute inverse of service's (this value's) running state.
 *
 * @return boolean
 *   True if service is off, false if on.
 */
function isNotRunning() {
  return !this.running();
}

// Create an object for each service we're tracking.
for (var i = 0, length = serviceDefinitions.length; i < length; i++) {
  var service = {
    title: serviceDefinitions[i].title,
    running: ko.observable(false)
  };
  service.message = ko.computed({read: getDisplayStatus, owner: service});
  service.notRunning = ko.computed({read: isNotRunning, owner: service});
  services[serviceDefinitions[i].name] = service;
}

// Add each service to the UI display.
for (var serviceName in services) {
  if (!services.hasOwnProperty(serviceName)) {
    continue;
  }
  statusDisplays.push(services[serviceName]);
}

// Server event handlers:

socket.on('serviceStatusChanged', function(data) {
  var service = data.name;
  if (services[service]) {
    services[service].running(data.running);
  }
});

socket.on('boxStarted', function(data) {
  boxRunning(true);
  // Mark all services as started.
  for (var i = 0, length = statusDisplays.length; i < length; i++) {
    statusDisplays[i].running(true);
  }
});

socket.on('boxStopped', function(data) {
  boxRunning(false);
  // Mark all services as stopped.
  for (var i = 0, length = statusDisplays.length; i < length; i++) {
    statusDisplays[i].running(false);
  }
});
