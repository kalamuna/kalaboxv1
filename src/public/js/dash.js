/**
 * @file
 * UI support for the Kalabox dashboard.
 *
 * Copyright 2013 Kalamuna LLC
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
  var modal = self.modal = {
    title: ko.observable(''),
    button: ko.observable(''),
    template: ko.observable('vagrant-error'),
    $window: $('#dash-modal'),
    show: function() {
      this.$window.modal('show');
    },
    close: function() {
      this.$window.modal('hide');
    }
  };
  modal.$window.modal({show: false});

  // Templates:
  var templates = [
    {name: 'new-site-form'},
    {name: 'site-build-complete'}
  ];

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
      self.powerButton.label("<i class=\"icon-spinner icon-spin icon-large\"></i>");
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

  self.serviceButton = {
    disabled: ko.observable(true),
    onClick: function(item, event) {
      var buttonType = $(event.target).attr('target');
      if (boxRunning()) {
        socket.emit('openServiceRequest', {'requestType': buttonType});
      } else {
        self.toolsError('The box is not running. Fire this puppy up to get started.');
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

  // Help button:
  self.helpButton = {
    disabled: ko.observable(false),
    onClick: function() {
      socket.emit('urlRequest', {url: 'http://localhost:51686/help'});
    }
  };

  // Sites lists:
  self.builtSites = ko.observableArray();
  self.unbuiltSites = ko.observableArray();

  function getSitesLists() {
    var connection = $.getJSON('/sites-list');
    connection.done(function(data) {
      self.builtSites(data.builtSites);
      self.unbuiltSites(data.unbuiltSites);
    });
    // @todo Add error handling.
  }

  self.openSite = function(site) {
    socket.emit('urlRequest', {url: 'http://' + site.uri});
  };

  // Status displays:
  self.statusDisplays = [];
  var services = {};
  (function() {
    var serviceDefinitions = [
      {name: 'box', title: 'Kalabox'},
      {name: 'nginx', title: 'Web Server'},
      {name: 'mysql', title: 'Database'}
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
    self.sshButton.disabled(false);
    self.foldersButton.disabled(false);
    self.serviceButton.disabled(false);
    // Mark all services as started.
    for (var i = 0, length = self.statusDisplays.length; i < length; i++) {
      self.statusDisplays[i].running(true);
    }
    // Load sites lists.
    getSitesLists();
  });
  socket.on('boxStartCanceled', function(data) {
    self.powerButton.disabled(false);
  });
  socket.on('boxStopped', function(data) {
    boxRunning(false);
    self.powerButton.label('Start');
    self.powerButton.disabled(false);
    self.sshButton.disabled(true);
    self.foldersButton.disabled(true);
    self.serviceButton.disabled(true);
    // Mark all services as stopped.
    for (var i = 0, length = self.statusDisplays.length; i < length; i++) {
      self.statusDisplays[i].running(false);
    }
    // Clear sites lists.
    self.builtSites.removeAll();
    self.unbuiltSites.removeAll();
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
    modal.title('Uh Oh!');
    modal.template('vagrant-error');
    modal.button('OK');
    modal.show();
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

  // New site form handler:
  var drupalProfiles = [
    {name: 'Panopoly', id: 'panopoly'},
    {name: 'Standard Drupal', id: 'standard'}
  ];
  var newSiteForm = self.newSiteForm = {
    siteName: ko.observable(),
    site: ko.observable(),
    profile: ko.observable(),
    profiles: ko.observableArray(drupalProfiles),
    building: ko.observable(false),
    onSubmit: function() {
      socket.emit('siteBuildRequest', ko.toJS(this));
      this.building(true);
      modal.close();
    },
    onComplete: function(data) {
      // Reset form state.
      this.building(false);
      this.siteName('');
      this.site('');
      this.profile('');
      // Refresh sites list.
      getSitesLists();
      // Alert the user.
      modal.title('Site Build Complete');
      modal.button('OK');
      modal.template('site-build-complete');
      modal.show();
    },
    openForm: function() {
      // Load form into modal from template.
      modal.title('Build a New Site');
      modal.button('Cancel');
      modal.template('new-site-form');
      modal.show();
    }
  };
  newSiteForm.onComplete = newSiteForm.onComplete.bind(newSiteForm);
  socket.on('siteBuildFinished', newSiteForm.onComplete);

  // Return public interface.
  return {
    initialize: function() {
      // Make the window accept drag-and-drop alias files.
      document.getElementById('alias-file-drop').addEventListener('drop', handleAliasUpload);
      // Load templates.
      var body = $('body');
      for (var i = 0, length = templates.length; i < length; i++) {
        // Create template holder for each template file.
        var template = templates[i],
            $contents = $('<script></script>');
        $contents.attr('type', 'text/html');
        $contents.attr('id', template.name);
        $contents.load('/templates/' + template.name + '.html');
        body.append($contents);
      }
      // Knock-out magic
      ko.applyBindings(self);
    }
  };

})(jQuery, ko, io.connect('http://localhost'));

// Initialize dashboard when page finishes loading.
jQuery(function() {
  dash.initialize();
});
