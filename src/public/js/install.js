/**
 * @file
 * Front-end interaction for the installer routine.
 *
 * Copyright 2013 Kalamuna LLC
 */

var install = (function($, ko, socket) {
  "use strict";
  var self = {};

  // DOM elements:
  var $progressBar = $('.progress-bar'),
      $statusMessage = $('.lead'),
      $dependencyInstallModal = $('.dependency-install.modal'),
      $licenseModal = $('.license.modal'),
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
    $dependencyInstallModal.modal(options);
    $dependencyInstallModal.modal('show');
  });
  socket.on('noPermission', function() {
    window.location.href = '/permission-denied';
  });

  // Launch modal so the user can review the user license.
  socket.on('licenseReview', function(data) {
    var options = ({keyboard: 'false', show: 'false', backdrop: 'static'});
    $licenseModal.modal(options);
    $licenseModal.modal('show');
  });

  // Declare the permissionButton view.
  self.permissionGrantedButton = {
    // Send permission request data back to the backend.
    onClick: function() {
      socket.emit('permissionResponse', {'value': true});
      $dependencyInstallModal.modal('hide');
      $licenseModal.modal('hide');
    }
  };

  // Declare the permissionButton view.
  self.permissionDeniedButton = {
    // Send permission request data back to the backend.
    onClick: function() {
      socket.emit('permissionResponse', {'value': false});
      $dependencyInstallModal.modal('hide');
      $licenseModal.modal('hide');
    }
  };

  // If user's firewall has problematic setting, send user to notifications screen.
  socket.on('installer.firewallCheckFailed', function() {
    window.location.href = '/firewall-issue';
  });


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
