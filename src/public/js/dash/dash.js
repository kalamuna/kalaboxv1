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
self.aliasUploader = require('./alias-uploader');
self.sites = require('./sites');

// Templates:
var templates = [
  {name: 'new-site-form'},
  {name: 'site-build-complete'},
  {name: 'build-remote-site-form'},
  {name: 'site-build-failed'},
  {name: 'vagrant-error'},
  {name: 'site-operations'}
];

// Server event handlers:

// On error, redirect to error page.
socket.on('appError', function(data) {
  window.location.href = '/error';
});

// On virtual machine error, show modal with message.
socket.on('vmError', function(data) {
  modal.template('vagrant-error');
  modal.show();
});

/**
 * Loads and initializes resources, including the Knockout view model.
 */
exports.initialize = function() {
  // Make the window accept drag-and-drop alias files.
  document.getElementById('alias-file-drop').addEventListener('drop', self.aliasUploader.handleAliasUpload);
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
