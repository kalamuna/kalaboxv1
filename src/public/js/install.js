/**
 * @file
 * Front-end interaction for the installer routine.
 */

(function($, socket) {
  "use strict";

  // DOM elements:
  var $progressBar = $('.bar'),
      $statusMessage = $('.lead');

  // Server event handler.
  socket.on('installer', function(data) {
    if (data.complete) {
      $progressBar.css('width', data.complete + '%');
    }
    if (data.message) {
      $statusMessage.text(data.message);
    }
  });

})(jQuery, io.connect('http://localhost'));
