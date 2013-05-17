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
    onClick: function() {
      socket.emit('startRequest', {});
    }
  };

  // Server event handler.
  socket.on('dashServer', function(data) {

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
