/**
 * Accepts file from HTML5 drag-and-drop, then uploads it to the box as a Drush alias file.
 *
 * Copyright 2013 Kalamuna LLC
 */

// Dependencies:
var socket = require('./socket'),
    sites = require('./sites');

// Bindings to error and success alerts:
exports.configError = ko.observable('');
exports.configSuccess = ko.observable('');

/**
 * Handles a file drag-and-drop event.
 *
 * @param object event
 *   The browser-provided event object.
 */
exports.handleAliasUpload = function(event) {
  event.preventDefault();
  var files = event.dataTransfer.files;
  // Don't upload if there's more than one file.
  if (files.length > 1) {
    exports.configError('Please upload only one file at a time.');
    return;
  }
  // Read in the file.
  var file = files[0];
  var reader = new FileReader();
  reader.addEventListener('loadend', sendAliasUpload, false);
  reader.addEventListener('error', readError, false);
  reader.readAsBinaryString(file);
};

/**
 * Transmits file contents to the backend.
 */
function sendAliasUpload(progressEvent) {
  var fileReader = this;
  var fileContent = fileReader.result;
  socket.emit('drushUpload', {'content': fileContent});
}

/**
 * Alerts user that there was an error reading the file provided.
 */
function readError(progressEvent) {
  exports.configError('Unable to read the file provided.');
}

// When upload completes, notify the user and refresh the sites list.
socket.on('drushUploadComplete', function() {
  exports.configSuccess('Drush aliases uploaded successfully!');
  sites.getSitesLists();
});
