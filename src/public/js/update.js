var update = (function($, ko, socket) {
  "use strict";

   // DOM elements:
  var $progressBar = $('.progress-bar'),
      $statusMessage = $('.lead'),
      $icono = $('#icoco'),
      progress = 0;

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
    // If installer sent an icon, update the icon text.
    if (data.icon && data.kalacolor) {
      $icono.removeClass();
      $icono.children().removeClass();
      $icono.addClass(data.kalacolor);
      $icono.children().addClass(data.icon);
      $icono.children().addClass('icon-massive');
    }
  });

  // Send user to dashboard when finished.
  socket.on('updatesComplete', function(data) {
    window.location.href = '/dash';
  });

})(jQuery, ko, io.connect('http://localhost'));
