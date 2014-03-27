/**
 * Manages controls and data for Kalabox configuration.
 *
 * Copyright 2013 Kalamuna LLC
 */

// Dependencies:
var socket = require('./socket'),
    sites = require('./sites'),
    modal = require('./modal'),
    statusMonitor = require('./status-monitor');

var pantheonAuth = exports.pantheonAuth = {
  label: ko.observable('Log In'),
  disabled: ko.observable(false),
  email: ko.observable(''),
  password: ko.observable(''),
  signedIn: ko.observable(false),
  message: ko.observable(''),
  messageError: ko.observable(false),
  onClick: function() {
    // Make sure email and password are filled out.
    if (this.email() === '' || this.password() === '') {
      this.message('Please fill out both username and password.');
      this.messageError(true);
      return;
    }
    // Transmit authentication request.
    socket.emit('pantheonAuthRequest', {
      email: this.email(),
      password: this.password(),
    });
    // Spin to show shit
    pantheonAuth.label("<i class=\"fa fa-spinner fa-spin\"></i>");
    pantheonAuth.disabled(true);
  },
};

var signOutButton = exports.signOutButton = {
  onClick: function() {
    if (pantheonAuth.signedIn()) {
      // Transmit closing request.
      socket.emit('pantheonCloseRequest', {});
    }
    pantheonAuth.label("Login");
    pantheonAuth.disabled(false);
  }
};

var refreshButton = exports.refreshButton = {
  label: ko.observable('<i class="fa fa-refresh"></i> Refresh'),
  disabled: ko.observable(false),
  onClick: function() {
    if (pantheonAuth.signedIn()) {
      socket.emit('pantheonRefreshRequest', {});
      refreshButton.label("<i class=\"fa fa-refresh fa-spin disabled\"> Refreshing...</i>");
      refreshButton.disabled(true);
    }
  }
};

// Server event handlers
socket.on('pantheonAuthFinished', function(data) {
  if (data.succeeded) {
    pantheonAuth.signedIn(true);
    if (statusMonitor.boxRunning()) {
      sites.getSitesLists();
    }
  }
  else {
    modal.showError(data.error);
    pantheonAuth.label("Log In");
    pantheonAuth.disabled(false);
  }
});
socket.on('pantheonCloseFinished', function(data) {
  if (data.closed) {
    pantheonAuth.signedIn(false);
    if (statusMonitor.boxRunning()) {
      sites.getSitesLists();
    }
  }
});
socket.on('pantheonRefreshFinished', function(data) {
  if (data.refreshed) {
    if (statusMonitor.boxRunning()) {
      sites.getSitesLists();
    }
  }
  else {
    modal.showError(data.error);
  }
  refreshButton.label('<i class="fa fa-refresh"></i> Refresh');
  refreshButton.disabled(false);
});
