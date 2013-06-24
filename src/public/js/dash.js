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

  // Drush alias upload handler and helper functions
  var drop = function(event) {
    event.preventDefault();
    var dt = event.dataTransfer;
    var files = dt.files;
    for (var i = 0; i<files.length; i++) {
        var file = files[i];
        readFile(file);
    }
  };

  function readStart(progressEvent) {
    console.log('readStart',progressEvent);
  }

  function readEnd(progressEvent) {
    console.log('readEnd',progressEvent,this);
    var fileReader = this;
    var fileContent = fileReader.result;
    var fileName = fileReader.file.name;
    // Note you can not retreive file path, for security reasons.
    // But you are not supposed to need it, you already have the content ;)
    console.log('readEnd:',fileName,fileContent);
//    if (boxRunning()) {
    socket.emit('drushUpload', {'name': fileName, 'content': fileContent});
 //   }


    var output = '<li>' + fileName + '</li>';
    document.getElementById('list').innerHTML = '<ul>' + output + '</ul>';
  }

  function readError(progressEvent) {
    console.log('readError',progressEvent);
    switch(progressEvent.target.error.code) {
        case progressEvent.target.error.NOT_FOUND_ERR:
            alert('File not found!');
            break;
        case progressEvent.target.error.NOT_READABLE_ERR:
            alert('File not readable!');
            break;
        case progressEvent.target.error.ABORT_ERR:
            break;
        default:
            alert('Unknow Read error.');
    }
  }

  function readFile(file) {
    var reader = new FileReader();
    reader.file = file; // We need it later (filename)
    reader.addEventListener('loadstart', readStart, false);
    reader.addEventListener('loadend', readEnd, false);
    reader.addEventListener('error', readError, false);
    reader.readAsBinaryString(file);
  }

  // Return public interface.
  return {
    initialize: function() {
      // Make the window accept drag-and-drop alias files
      window.addEventListener("drop", drop);
      // Knock-out magic
      ko.applyBindings(self);
    }
  };

})(jQuery, ko, io.connect('http://localhost'));






// Initialize dashboard when page finishes loading.
jQuery(function() {
  dash.initialize();
});
