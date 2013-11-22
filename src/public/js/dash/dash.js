/**
 * UI support for the Kalabox dashboard.
 *
 * Copyright 2013 Kalamuna LLC
 */

var self = {};

// Dependencies:
var socket = require('./socket'),
    modal = self.modal = require('./modal');
self.controls = require('./controls');
self.statusMonitor = require('./status-monitor');
self.configuration = require('./configuration');
self.sites = require('./sites');

// Templates:
var templates = [
  {name: 'new-site-form'},
  {name: 'site-build-complete'},
  {name: 'build-remote-site-form'},
  {name: 'site-build-failed'},
  {name: 'remove-site-confirmation'},
  {name: 'refresh-site-form'},
  {name: 'modal-notification'},
  {name: 'data-download-method'},
  {name: 'updates-available'}
];

// Server event handlers:

// On error, redirect to error page.
socket.on('appError', function(data) {
  window.location.href = '/error';
});

// On virtual machine error, show modal with message.
socket.on('vmError', function(data) {
  modal.showError({code: 'VM_ERROR'});
});

// When updates are available.
socket.on('updatesDetected', function(data) {
  modal.template('updates-available');
  modal.show();
});
self.runUpdates = function() {
  window.location.href = '/update';
};

/**
 * Loads and initializes resources, including the Knockout view model.
 */
exports.initialize = function() {
  // Load templates.
  var body = $('body');
  for (var i = 0, length = templates.length; i < length; i++) {
    // Create template holder for each template file.
    var template = templates[i],
    $contents = $('<script></script>');
    $contents.attr('type', 'text/html');
    $contents.attr('id', template.name);
    $contents.load('/templates/' + template.name + '.html');
    body.append($contents);
  }
  // Knockout magic.
  ko.applyBindings(self);
};
