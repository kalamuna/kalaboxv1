/**
 * Manages controls and data for Kalabox configuration.
 *
 * Copyright 2013 Kalamuna LLC
 */

// Dependencies:
var socket = require('./socket'),
    sites = require('./sites');

var pantheonAuth = exports.pantheonAuth = {
  email: ko.observable(''),
  password: ko.observable(''),
  saveCreds: ko.observable(false),
  signedIn: ko.observable(false),
  message: ko.observable(''),
  messageError: ko.observable(false),
  onSubmit: function() {
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
      saveCreds: this.saveCreds()
    });
  },
  onComplete: function(data) {
    if (data.succeeded) {
      this.signedIn(true);
      sites.getSitesLists();
    }
    else {
      this.message('Unable to sign in. Please check your credentials.');
      this.messageError(true);
    }
  }
};
socket.on('pantheonAuthFinished', pantheonAuth.onComplete.bind(pantheonAuth));
