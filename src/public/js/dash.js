/**
 * @file
 * UI support for the Kalabox dashboard.
 */
var dash = (function($, ko, socket) {
  var self = {};

  // State variables:
  var boxRunning = false;

  // Start/stop button:
  self.powerButton = {
    label: ko.observable('Start'),
    disabled: ko.observable(false),
    onClick: function() {
      if (boxRunning) {
        socket.emit('stopRequest', {});
        self.sshButton.disabled(true);
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
      if (boxRunning) {
        socket.emit('sshRequest', {});
      }
    }
  };

  // Status displays:
  self.statusDisplays = ko.observableArray();
  function getDisplayStatus() {
    if (this.running()) {
      return 'Running';
    }
    return 'Stopped';
  }
  function getStopped() {
    return !this.running();
  }
  function addStatusDisplay(display) {
    display.running = ko.observable(false);
    display.message = ko.computed({read: getDisplayStatus, owner: display});
    display.stopped = ko.computed({read: getStopped, owner: display});
    self.statusDisplays.push(display);
  }
  var boxStatusDisplay = {
    name: 'Kalabox'
  };
  addStatusDisplay(boxStatusDisplay);

  // Server event handlers.
  socket.on('boxStarted', function(data) {
    boxRunning = true;
    self.powerButton.label('Stop');
    self.powerButton.disabled(false);
    boxStatusDisplay.running(true);
    self.sshButton.disabled(false);
  });
  socket.on('boxStopped', function(data) {
    boxRunning = false;
    self.powerButton.label('Start');
    self.powerButton.disabled(false);
    boxStatusDisplay.running(false);
    self.sshButton.disabled(true);
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
