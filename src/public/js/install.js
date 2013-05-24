/**
 * @file
 * Front-end interaction for the installer routine.
 */

(function($, socket) {
  "use strict";

  // DOM elements:
  var $progressBar = $('.bar'),
      $statusMessage = $('.lead'),
      progress = 0;

  // Server event handlers:

  // When the installer sends a message, update the UI.
  socket.on('installer', function(data) {
    // If installer sent a completion percentage, update the progress bar.
    if (data.complete) {
      if (progress === 100) {
        $progressBar.css('width', '0%');
      }
      $progressBar.css('width', data.complete + '%');
      progress = data.complete;
    }
    // If installer sent a message, update the message text.
    if (data.message) {
      $statusMessage.text(data.message);
    }
  });
  // When the installer reports it has completed, send user to the dash.
  socket.on('installerComplete', function(data) {
    window.location.href = '/dash';
  });
  // On error, redirect to error page.
  socket.on('appError', function(data) {
    window.location.href = '/error';
  });
  socket.on('noInternet', function() {
    window.location.href = '/no-internet';
  });

})(jQuery, io.connect('http://localhost'));
