/**
 * Manages controls and data for Kalabox configuration.
 *
 * Copyright 2013 Kalamuna LLC
 */

// Dependencies:
var socket = require('./socket'),
    sites = require('./sites');

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
    pantheonAuth.label("<i class=\"icon-spinner icon-spin icon-large\"></i>");
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
  label: ko.observable('<i class="icon-refresh"></i> Refresh'),
  disabled: ko.observable(false),
  onClick: function() {
    if (pantheonAuth.signedIn()) {
      socket.emit('pantheonRefreshRequest', {});
      refreshButton.label("<i class=\"icon-spinner icon-spin icon-large\"></i>");
      refreshButton.disabled(true);
    }
  }
};

// Server event handlers
socket.on('pantheonAuthFinished', function(data) {
  if (data.succeeded) {
    pantheonAuth.signedIn(true);
    sites.getSitesLists();
  }
  else {
    pantheonAuth.message('Unable to sign in. Please check your credentials.');
    pantheonAuth.messageError(true);
    pantheonAuth.label("Log In");
    pantheonAuth.disabled(false);
  }
});
socket.on('pantheonCloseFinished', function(data) {
  if (data.closed) {
    pantheonAuth.signedIn(false);
    sites.getSitesLists();
  }
});
socket.on('pantheonRefreshFinished', function(data) {
  if (data.refreshed) {
    sites.getSitesLists();
    refreshButton.label('<i class="icon-refresh"></i> Refresh');
    refreshButton.disabled(false);
  }
});
