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
      }
      else {
        socket.emit('startRequest', {});
      }
      self.powerButton.disabled(true);
    }
  };

  // Server event handlers.
  socket.on('boxStarted', function(data) {
    boxRunning = true;
    self.powerButton.label('Stop');
    self.powerButton.disabled(false);
  });
  socket.on('boxStopped', function(data) {
    boxRunning = false;
    self.powerButton.label('Start');
    self.powerButton.disabled(false);
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
