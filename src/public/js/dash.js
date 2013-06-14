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
      }
    }
  };

  // PHPMyAdmin button:
  self.phpMyAdminButton = {
    disabled: ko.observable(true),
    onClick: function() {
      if (boxRunning()) {
        socket.emit('openServiceRequest', {'requestType': 'phpMyAdminButton'});
      }
    }
  };

  // WebGrind Button
  self.webGrindButton = {
    disabled: ko.observable(true),
    onClick: function() {
      if (boxRunning()) {
        socket.emit('openServiceRequest', {'requestType': 'webGrindButton'});
      }
    }
  };

  // Shared Folders button:
  self.foldersButton = {
    disabled: ko.observable(true),
    onClick: function() {
      if (boxRunning()) {
        socket.emit('foldersRequest', {});
      }
    }
  };

  // Status displays:
  self.statusDisplays = ko.observableArray();
  function getDisplayStatus() {
    if (boxRunning()) {
      return 'Running';
    }
    return 'Stopped';
  }
  function addStatusDisplay(display) {
    display.message = ko.computed({read: getDisplayStatus, owner: display});
    self.statusDisplays.push(display);
  }
  var boxStatusDisplay = {
    name: 'Kalabox'
  };
  addStatusDisplay(boxStatusDisplay);

  // Server event handlers.
  socket.on('boxStarted', function(data) {
    boxRunning(true);
    self.powerButton.label('Stop');
    self.powerButton.disabled(false);
    self.sshButton.disabled(false);
    self.phpMyAdminButton.disabled(false);
    self.webGrindButton.disabled(false);
    self.foldersButton.disabled(false);
  });
  socket.on('boxStopped', function(data) {
    boxRunning(false);
    self.powerButton.label('Start');
    self.powerButton.disabled(false);
    self.sshButton.disabled(true);
    self.phpMyAdminButton.disabled(true);
    self.webGrindButton.disabled(true);
    self.foldersButton.disabled(true);
  });

  // Return public interface.
  return {
    initialize: function() {
      ko.applyBindings(self);
    }
  };

})(jQuery, ko, io.connect('http://localhost'));

// Initialize dashboard when page finishes loading.
jQuery(function() {
  dash.initialize();
});
