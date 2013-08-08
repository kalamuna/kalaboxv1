/**
 * Main controls for interfacing with the Box.
 *
 * Copyright 2013 Kalamuna LLC
 */

// Dependencies:
var socket = require('./socket'),
    sites = require('./sites'),
    statusMonitor = require('./status-monitor');

// Components:
var toolsError = exports.toolsError = ko.observable('');

/**
 * Start/stop button.
 */
var powerButton = exports.powerButton = {
  label: ko.observable('Start'),
  disabled: ko.observable(false),
  onClick: function() {
    if (statusMonitor.boxRunning()) {
      socket.emit('stopRequest', {});
      sshButton.disabled(true);
      sites.sitesButton.visible(false);
      sites.newSiteButton.disabled(true);
      serviceButton.visible(false);
    }
    else {
      socket.emit('startRequest', {});
    }
    powerButton.disabled(true);
    powerButton.label("<i class=\"icon-spinner icon-spin icon-large\"></i>");
  }
};

/**
 * SSH button.
 */
var sshButton = exports.sshButton = {
  disabled: ko.observable(true),
  onClick: function() {
    if (statusMonitor.boxRunning()) {
      socket.emit('sshRequest', {});
    } else {
      toolsError('The box is not running. Fire this puppy up to gain shell access.');
    }
  }
};

/**
 * Service button.
 */
var serviceButton = exports.serviceButton = {
  disabled: ko.observable(true),
  visible: ko.observable(false),
  onClick: function(item, event) {
    var buttonType = $(event.target).attr('target');
    if (statusMonitor.boxRunning()) {
      socket.emit('openServiceRequest', {'requestType': buttonType});
    } else {
      toolsError('The box is not running. Fire this puppy up to get started.');
    }
  }
};

/**
 * Shared Folders button.
 */
var foldersButton = exports.foldersButton = {
  disabled: ko.observable(false),
  onClick: function() {
    socket.emit('foldersRequest', {});
  }
};

/**
 * Help button.
 */
var helpButton = exports.helpButton = {
  disabled: ko.observable(false),
  onClick: function() {
    socket.emit('urlRequest', {url: 'http://localhost:51686/help'});
  }
};

// Server event handlers:

socket.on('boxStarted', function(data) {
  powerButton.label('Stop');
  powerButton.disabled(false);
  sshButton.disabled(false);
  serviceButton.disabled(false);
  serviceButton.visible(true);
});

socket.on('boxStopped', function(data) {
  powerButton.label('Start');
  powerButton.disabled(false);
  sshButton.disabled(true);
  serviceButton.disabled(true);
  serviceButton.visible(false);
});

socket.on('boxStopCanceled', function(data) {
  powerButton.disabled(false);
  sshButton.disabled(false);
  sites.sitesButton.visible(true);
  sites.newSiteButton.disabled(false);
});

socket.on('boxStartCanceled', function(data) {
  powerButton.disabled(false);
});

socket.on('vmError', function(data) {
  powerButton.disabled(false);
});
