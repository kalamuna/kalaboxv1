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
      $icono = $('#icoco'),
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
    // If installer sent an icon, update the icon text.
    if (data.icon && data.kalacolor) {
      $icono.removeClass();
      $icono.children().removeClass();
      $icono.addClass(data.kalacolor);
      $icono.children().addClass(data.icon);
      $icono.children().addClass('icon-massive');
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
    var options = ({keyboard: 'false', show: 'false', backdrop: 'static'});
    var title = '';
    var message = '';
    console.log(data);
    if (data.programName == 'VirtualBox') {
      title = "<h3>May We Install VirtualBox For You?</h3>";
      message = "<p>We noticed that your system uses an unsupported " +
      "version of VirtualBox and would like to upgrade it to. Doing so should " +
      "have no impact on your existing virtual boxes. May we proceed?</p>";
    } else {
      title = "<h3>May We Install Vagrant For You?</h3>";
      message = "<p>We noticed that your system uses an unsupported " +
      "version of Vagrant and would like to change it. Doing so should " +
      "have no impact on your Vagrant environments. May we proceed?</p>";
    }
    $('.modal .modal-header').prepend(title);
    $('.modal .modal-body').prepend(message);
    $modal.modal(options);
    $modal.modal('show');
  });
  socket.on('noPermission', function() {
    window.location.href = '/permission-denied';
  });

  // Declare the permissionButton view.
  self.permissionGrantedButton = {
    // Send permission request data back to the backend.
    onClick: function() {
      socket.emit('permissionResponse', {'value': true});
      $modal.modal('hide');
    }
  };

  // Declare the permissionButton view.
  self.permissionDeniedButton = {
    // Send permission request data back to the backend.
    onClick: function() {
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
