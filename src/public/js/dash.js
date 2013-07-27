/**
 * @file
 * UI support for the Kalabox dashboard.
 */
var dash = (function($, ko, socket) {
  var self = {};

  // State variables:
  var boxRunning = ko.observable(false);
  var boxStopped = ko.computed(function() {
    return !boxRunning();
  });
  self.boxRunning = boxRunning;
  self.boxStopped = boxStopped;

  // Modal element:
  var $modal = $('#dash-modal');
  $modal.modal({show: false});
  $modal.$title = $modal.find('.modal-title');
  $modal.$body = $modal.find('.modal-body');

  // Start/stop button:
  self.powerButton = {
    label: ko.observable('Start'),
    disabled: ko.observable(false),
    onClick: function() {
      if (boxRunning()) {
        socket.emit('stopRequest', {});
        self.sshButton.disabled(true);
        self.foldersButton.disabled(true);
      }
      else {
        socket.emit('startRequest', {});
      }
      self.powerButton.disabled(true);
    }
  };

  // SSH button:
  self.sshButton = {
    disabled: ko.observable(true),
    onClick: function() {
      if (boxRunning()) {
        socket.emit('sshRequest', {});
      } else {
        self.toolsError('The box is not running. Fire this puppy up to gain shell access.');
      }
    }
  };

  // start.kala button
  self.startSiteButton = {
    disabled: ko.observable(true),
    onClick: function() {
      if (boxRunning()) {
        socket.emit('openServiceRequest', {'requestType': 'startSiteButton'});
      } else {
        self.toolsError('The box is not running. Fire this puppy up to see your site.');
      }
    }
  };

  // PHPMyAdmin button:
  self.phpMyAdminButton = {
    disabled: ko.observable(true),
    onClick: function() {
      if (boxRunning()) {
        socket.emit('openServiceRequest', {'requestType': 'phpMyAdminButton'});
      } else {
        self.toolsError('The box is not running. Fire this puppy up to use PHPMyAdmin.');
      }
    }
  };

  // WebGrind Button
  self.webGrindButton = {
    disabled: ko.observable(true),
    onClick: function() {
      if (boxRunning()) {
        socket.emit('openServiceRequest', {'requestType': 'webGrindButton'});
      } else {
        self.toolsError('The box is not running. Fire this puppy up to use WebGrind.');
      }
    }
  };

  // Shared Folders button:
  self.foldersButton = {
    disabled: ko.observable(true),
    onClick: function() {
      if (boxRunning()) {
        socket.emit('foldersRequest', {});
      } else {
        self.toolsError('The box is not running. Fire this puppy up to see your files.');
      }
    }
  };

    // Shared Folders button:
  self.helpButton = {
    disabled: ko.observable(false),
    onClick: function() {
      socket.emit('helpRequest', {});
    }
  };

  // Status displays:
  self.statusDisplays = [];
  var services = {};
  (function() {
    var serviceDefinitions = [
      {name: 'box', title: 'Kalabox'},
      {name: 'nginx', title: 'nginx'},
      {name: 'mysql', title: 'MySQL'}
    ];
    function getDisplayStatus() {
      if (this.running()) {
        return 'Running';
      }
      return 'Stopped';
    }
    function isNotRunning() {
      return !this.running();
    }
    for (var i = 0, length = serviceDefinitions.length; i < length; i++) {
      var service = {
        title: serviceDefinitions[i].title,
        running: ko.observable(false)
      };
      service.message = ko.computed({read: getDisplayStatus, owner: service});
      service.notRunning = ko.computed({read: isNotRunning, owner: service});
      services[serviceDefinitions[i].name] = service;
    }
    for (var serviceName in services) {
      if (!services.hasOwnProperty(serviceName)) {
        continue;
      }
      self.statusDisplays.push(services[serviceName]);
    }
  })();

  // Server event handlers.
  self.toolsError = ko.observable('');
  socket.on('boxStarted', function(data) {
    boxRunning(true);
    self.powerButton.label('Stop');
    self.powerButton.disabled(false);
    self.startSiteButton.disabled(false);
    self.sshButton.disabled(false);
    self.phpMyAdminButton.disabled(false);
    self.webGrindButton.disabled(false);
    self.foldersButton.disabled(false);
    // Mark all services as started.
    for (var i = 0, length = self.statusDisplays.length; i < length; i++) {
      self.statusDisplays[i].running(true);
    }
  });
  socket.on('boxStartCanceled', function(data) {
    self.powerButton.disabled(false);
  });
  socket.on('boxStopped', function(data) {
    boxRunning(false);
    self.powerButton.label('Start');
    self.powerButton.disabled(false);
    self.startSiteButton.disabled(true);
    self.sshButton.disabled(true);
    self.phpMyAdminButton.disabled(true);
    self.webGrindButton.disabled(true);
    self.foldersButton.disabled(true);
    // Mark all services as stopped.
    for (var i = 0, length = self.statusDisplays.length; i < length; i++) {
      self.statusDisplays[i].running(false);
    }
  });
  socket.on('boxStopCanceled', function(data) {
    self.powerButton.disabled(false);
    self.sshButton.disabled(false);
    self.foldersButton.disabled(false);
  });
  socket.on('serviceStatusChanged', function(data) {
    var service = data.name;
    if (services[service]) {
      services[service].running(data.running);
    }
  });
  // On error, redirect to error page.
  socket.on('appError', function(data) {
    window.location.href = '/error';
  });
  // On virtual machine error, show modal with message.
  socket.on('vmError', function(data) {
    self.powerButton.disabled(false);
    $modal.$title.text('Uh Oh!');
    $modal.$body.text(
      'Looks like the box wasn\'t quite ready. Please try again in a moment. ' +
      'If the problem persists, please let us know at errors@kalamuna.com.'
    );
    $modal.modal('show');
  });

  // Drush alias upload handler and helper functions:
  self.configError = ko.observable('');
  self.configSuccess = ko.observable('');
  function handleAliasUpload(event) {
    event.preventDefault();
    var files = event.dataTransfer.files;
    // Don't upload if there's more than one file.
    if (files.length > 1) {
      self.configError('Please upload only one file at a time.');
      return;
    }
    // Read in the file.
    var file = files[0];
    var reader = new FileReader();
    reader.addEventListener('loadend', sendAliasUpload, false);
    reader.addEventListener('error', readError, false);
    reader.readAsBinaryString(file);
  }

  function sendAliasUpload(progressEvent) {
    var fileReader = this;
    var fileContent = fileReader.result;
    socket.emit('drushUpload', {'content': fileContent});
  }

  function readError(progressEvent) {
    self.configError('Unable to read the file provided.');
  }

  socket.on('drushUploadComplete', function() {
    self.configSuccess('Drush aliases uploaded successfully!');
  });

  // Return public interface.
  return {
    initialize: function() {
      // Make the window accept drag-and-drop alias files.
      document.getElementById('alias-file-drop').addEventListener('drop', handleAliasUpload);
      // Knock-out magic
      ko.applyBindings(self);
    }
  };

})(jQuery, ko, io.connect('http://localhost'));

// Initialize dashboard when page finishes loading.
jQuery(function() {
  dash.initialize();
});
