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

  // Server event handler.
  socket.on('installer', function(data) {
    if (data.complete) {
      if (progress === 100) {
        $progressBar.css('width', '0%');
      }
      $progressBar.css('width', data.complete + '%');
      progress = data.complete;
    }
    if (data.message) {
      $statusMessage.text(data.message);
    }
  });

})(jQuery, io.connect('http://localhost'));
