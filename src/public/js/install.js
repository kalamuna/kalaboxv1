/**
 * @file
 * Front-end interaction for the installer routine.
 */

var install = (function($, ko, socket) {
  "use strict";
  var self = {};

  // DOM elements:
  var $progressBar = $('.bar'),
      $statusMessage = $('.lead'),
      $modal = $('.modal'),
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
  // Launch modal when we need permission to install a program.
  socket.on('getPermission', function(data) {
    $modal.modal('show');
  });
  socket.on('noPermission', function() {
    window.location.href = '/permission-denied';
  });

  // Declare the permissionButton view.
  self.permissionGrantedButton = {
    // Send permission request data back to the backend.
    onClick: function() {
      console.log('WE GOT CLICKED');
      socket.emit('permissionResponse', {'value': true});
      $modal.modal('hide');
    }
  };

  // Declare the permissionButton view.
  self.permissionDeniedButton = {
    // Send permission request data back to the backend.
    onClick: function() {
      console.log('WE GOT NO CLICKED');
      socket.emit('permissionResponse', {'value': false});
      $modal.modal('hide');
    }
  };


  // Return public interface.
  return {
    initialize: function() {
      // Knock-out magic
      ko.applyBindings(self);
    }
  };

})(jQuery, ko, io.connect('http://localhost'));


// Initialize dashboard when page finishes loading.
jQuery(function() {
  install.initialize();
});
