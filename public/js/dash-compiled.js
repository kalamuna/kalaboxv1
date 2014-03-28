;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * Manages controls and data for Kalabox configuration.
 *
 * Copyright 2013 Kalamuna LLC
 */

// Dependencies:
var socket = require('./socket'),
    sites = require('./sites'),
    modal = require('./modal'),
    statusMonitor = require('./status-monitor');

var pantheonAuth = exports.pantheonAuth = {
  label: ko.observable('Log In'),
  disabled: ko.observable(false),
  email: ko.observable(''),
  password: ko.observable(''),
  signedIn: ko.observable(false),
  message: ko.observable(''),
  messageError: ko.observable(false),
  onClick: function() {
    // Make sure email and password are filled out.
    if (this.email() === '' || this.password() === '') {
      this.message('Please fill out both username and password.');
      this.messageError(true);
      return;
    }
    // Transmit authentication request.
    socket.emit('pantheonAuthRequest', {
      email: this.email(),
      password: this.password(),
    });
    // Spin to show shit
    pantheonAuth.label("<i class=\"fa fa-spinner fa-spin\"></i>");
    pantheonAuth.disabled(true);
  },
};

var signOutButton = exports.signOutButton = {
  onClick: function() {
    if (pantheonAuth.signedIn()) {
      // Transmit closing request.
      socket.emit('pantheonCloseRequest', {});
    }
    pantheonAuth.label("Login");
    pantheonAuth.disabled(false);
  }
};

var refreshButton = exports.refreshButton = {
  label: ko.observable('<i class="fa fa-refresh"></i> Refresh'),
  disabled: ko.observable(false),
  onClick: function() {
    if (pantheonAuth.signedIn()) {
      socket.emit('pantheonRefreshRequest', {});
      refreshButton.label("<i class=\"fa fa-refresh fa-spin disabled\"> Refreshing...</i>");
      refreshButton.disabled(true);
    }
  }
};

// Server event handlers
socket.on('pantheonAuthFinished', function(data) {
  if (data.succeeded) {
    pantheonAuth.signedIn(true);
    if (statusMonitor.boxRunning()) {
      sites.getSitesLists();
    }
  }
  else {
    modal.showError(data.error);
    pantheonAuth.label("Log In");
    pantheonAuth.disabled(false);
  }
});
socket.on('pantheonCloseFinished', function(data) {
  if (data.closed) {
    pantheonAuth.signedIn(false);
    if (statusMonitor.boxRunning()) {
      sites.getSitesLists();
    }
  }
});
socket.on('pantheonRefreshFinished', function(data) {
  if (data.refreshed) {
    if (statusMonitor.boxRunning()) {
      sites.getSitesLists();
    }
  }
  else {
    modal.showError(data.error);
  }
  refreshButton.label('<i class="fa fa-refresh"></i> Refresh');
  refreshButton.disabled(false);
});

},{"./modal":6,"./sites":7,"./socket":8,"./status-monitor":9}],2:[function(require,module,exports){
/**
 * Main controls for interfacing with the Box.
 *
 * Copyright 2013 Kalamuna LLC
 */

// Dependencies:
var socket = require('./socket'),
    sites = require('./sites'),
    statusMonitor = require('./status-monitor');

// Components:
var toolsError = exports.toolsError = ko.observable('');

// Variables:
var powerButtonAction;

/**
 * Start/stop button.
 */
var powerButton = exports.powerButton = {
  label: ko.observable('Start'),
  disabled: ko.observable(false),
  onClick: function() {
    if (statusMonitor.boxRunning()) {
      socket.emit('stopRequest', {});
      sshButton.disabled(true);
      sites.sitesButton.visible(false);
      sites.newSiteButton.disabled(true);
      serviceButton.visible(false);
      powerButtonAction = 'Stop';
    }
    else {
      socket.emit('startRequest', {});
      powerButtonAction = 'Start';
    }
    powerButton.disabled(true);
    powerButton.label("<i class=\"fa fa-spinner fa-spin\"></i>");
  }
};

/**
 * SSH button.
 */
var sshButton = exports.sshButton = {
  disabled: ko.observable(true),
  onClick: function() {
    if (statusMonitor.boxRunning()) {
      socket.emit('sshRequest', {});
    } else {
      toolsError('The box is not running. Fire this puppy up to gain shell access.');
    }
  }
};

/**
 * Service button.
 */
var serviceButton = exports.serviceButton = {
  disabled: ko.observable(true),
  visible: ko.observable(false),
  onClick: function(item, event) {
    var buttonType = $(event.target).attr('target');
    if (statusMonitor.boxRunning()) {
      socket.emit('openServiceRequest', {'requestType': buttonType});
    } else {
      toolsError('The box is not running. Fire this puppy up to get started.');
    }
  }
};

/**
 * Shared Folders button.
 */
var foldersButton = exports.foldersButton = {
  disabled: ko.observable(false),
  onClick: function() {
    socket.emit('foldersRequest', {});
  }
};

/**
 * Help button.
 */
var helpButton = exports.helpButton = {
  disabled: ko.observable(false),
  onClick: function() {
    socket.emit('urlRequest', {url: 'https://kalamuna.atlassian.net/wiki/display/kalabox/Kalabox+Wiki'});
  }
};

// Server event handlers:

socket.on('boxStarted', function(data) {
  powerButton.label('Stop');
  powerButton.disabled(false);
  sshButton.disabled(false);
  serviceButton.disabled(false);
  serviceButton.visible(true);
});

socket.on('boxStopped', function(data) {
  powerButton.label('Start');
  powerButton.disabled(false);
  sshButton.disabled(true);
  serviceButton.disabled(true);
  serviceButton.visible(false);
});

socket.on('boxStopCanceled', function(data) {
  powerButton.label('Stop');
  powerButton.disabled(false);
  sshButton.disabled(false);
  sites.sitesButton.visible(true);
  sites.newSiteButton.disabled(false);
});

socket.on('boxStartCanceled', function(data) {
  powerButton.label('Start');
  powerButton.disabled(false);
});

socket.on('vmError', function(data) {
  powerButton.label(powerButtonAction);
  powerButton.disabled(false);
});

},{"./sites":7,"./socket":8,"./status-monitor":9}],3:[function(require,module,exports){
/**
 * UI support for the Kalabox dashboard.
 *
 * Copyright 2013 Kalamuna LLC
 */

var self = {};

// Dependencies:
var socket = require('./socket'),
    modal = self.modal = require('./modal');
self.controls = require('./controls');
self.statusMonitor = require('./status-monitor');
self.configuration = require('./configuration');
self.sites = require('./sites');

// Templates:
var templates = [
  {name: 'new-site-form'},
  {name: 'site-build-complete'},
  {name: 'build-remote-site-form'},
  {name: 'site-build-failed'},
  {name: 'remove-site-confirmation'},
  {name: 'refresh-site-form'},
  {name: 'modal-notification'},
  {name: 'data-download-method'},
  {name: 'updates-available'}
];

// Server event handlers:

// On error, redirect to error page.
socket.on('appError', function(data) {
  window.location.href = '/error';
});

// On virtual machine error, show modal with message.
socket.on('vmError', function(data) {
  modal.showError({code: 'VM_ERROR'});
});

// When updates are available.
socket.on('updatesDetected', function(data) {
  modal.template('updates-available');
  modal.show();
});
self.runUpdates = function() {
  window.location.href = '/update';
};

/**
 * Loads and initializes resources, including the Knockout view model.
 */
exports.initialize = function() {
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
  // Knockout magic.
  ko.applyBindings(self);
};

},{"./configuration":1,"./controls":2,"./modal":6,"./sites":7,"./socket":8,"./status-monitor":9}],4:[function(require,module,exports){
module.exports={
  "NO_NET": "The box is having trouble connecting to the Internet. Please check your connection. You may need to restart the box to reestablish the connection.",
  "PANTHEON_AUTH_FAILED": "Unable to sign in. Please check your credentials.",
  "SITES_LOAD_FAILED": "There's a problem with loading your sites list. Restarting the box may resolve it.",
  "VM_ERROR": "Looks like the box wasn't quite ready. Please try again in a moment. If the problem persists, please let us know at errors@kalamuna.com."
}

},{}],5:[function(require,module,exports){
/**
 * Front-end UI logic.
 *
 * Copyright 2013 Kalamuna LLC
 */

// Dependencies:
var dash = require('./dash');

// Initialize dashboard when page finishes loading.
$(function() {
  dash.initialize();
});

},{"./dash":3}],6:[function(require,module,exports){
/**
 * Wrapper for a Bootstrap modal element.
 *
 * Copyright 2013 Kalamuna LLC
 */

var errorMessages = require('./error-messages.json');

var modal = module.exports = {
  template: ko.observable(''),
  title: ko.observable(''),
  message: ko.observable(''),
  $window: $('#dash-modal'),
  show: function() {
    this.$window.modal('show');
  },
  close: function() {
    this.$window.modal('hide');
  },
  notify: function(title, message) {
    this.template('modal-notification');
    this.title(title);
    this.message(message);
    this.show();
  },
  showError: function(error) {
    var code = error.code,
        message = error.message;
    if (!code && !message) {
      return false;
    }
    var content = message || '';
    if (code && errorMessages[code]) {
      content = errorMessages[code];
    }
    this.notify('Error', content);
    return true;
  }
};
modal.$window.modal({show: false});

},{"./error-messages.json":4}],7:[function(require,module,exports){
/**
 * Controls for managing sites on the box.
 *
 * Copyright 2013 Kalamuna LLC
 */

// Dependencies:
var socket = require('./socket'),
    modal = require('./modal');

// Sites lists:
var builtSites = exports.builtSites = ko.observableArray(),
    unbuiltSites = exports.unbuiltSites = ko.observableArray();

// State variables:
var buildingInProgress = exports.buildingInProgress = ko.observable(false);

/**
 * Determines if the site is idle (not building, being removed, etc.).
 *
 * @return bool
 *   True or false depending on state.
 */
function isSiteIdle() {
  return !this.refreshing() && !this.removing();
}

/**
 * Determines if the site was built from a remote site.
 *
 * @return bool
 *   True or false depending on state.
 */
function isSiteRemote() {
  return typeof this.builtFrom == 'string';
}

/**
 * Adds members to site objects.
 *
 * @param object site
 *   The site to modify.
 */
function processSite(site) {
  site.building = ko.observable(false);
  site.removing = ko.observable(false);
  site.refreshing = ko.observable(false);
  site.isIdle = ko.computed({
    read: isSiteIdle,
    owner: site
  });
  site.isRemote = ko.computed({
    read: isSiteRemote,
    owner: site
  });
}

/**
 * Loads the lists of running sites and available sites from the box.
 */
var getSitesLists = exports.getSitesLists = function() {
  var connection = $.getJSON('/sites-list');
  connection.done(function(data) {
    data.builtSites.forEach(processSite);
    data.unbuiltSites.forEach(processSite);
    builtSites(data.builtSites);
    unbuiltSites(data.unbuiltSites);
  });
  connection.fail(function() {
    modal.showError({code: 'SITES_LOAD_FAILED'});
  });
  // @todo Add error handling.
};

/**
 * Retrieves a site's info from the aliases list.
 *
 * @param string type
 *   Whether to look for a 'built' site or an 'unbuilt' site.
 * @param string alias
 *   The alias specifying which site to retrieve.
 *
 * @return object
 *   A promise that will resolve with the site's info if lookup succeeds.
 */
function getSiteInfo(type, alias) {
  var result = new $.Deferred(),
      connection = $.getJSON('/sites-list');
  connection.done(function(data) {
    var sites = (type == 'built') ? data.builtSites : data.unbuiltSites;
    for (var i = 0, length = sites.length; i < length; i++) {
      if (sites[i].aliasName == alias) {
        result.resolve(sites[i]);
        return;
      }
    }
    result.reject();
  });
  connection.fail(function() {
    result.reject();
  });
  return result;
}

/**
 * Requests that backend open a site in user's default browser.
 *
 * @param object site
 *   The site with "uri" to open.
 */
var openSite = exports.openSite = function(site) {
  socket.emit('urlRequest', {url: 'http://' + site.uri});
};

/**
 * New site button.
 */
var newSiteButton = exports.newSiteButton = {
  disabled: ko.observable(true),
};

/**
 * My Sites button.
 */
var sitesButton = exports.sitesButton = {
  visible: ko.observable(false),
};

/**
 * New site form.
 */
// The Drupal profiles we're supporting:
var drupalProfiles = [
  {name: 'Panopoly', id: 'panopoly'},
  {name: 'Commerce Kickstart', id: 'commerce_kickstart'},
  {name: 'Open Atrium 2', id: 'openatrium'},
  {name: 'OpenideaL', id: 'idea'},
  {name: 'Open Outreach', id: 'openoutreach'},
  {name: 'OpenPublic', id: 'openpublic'},
  {name: 'OpenPublish', id: 'openpublish'},
  {name: 'Drupal Commons', id: 'commons'},
  {name: 'Standard Drupal 7', id: 'drupal7'}
];

var newSiteForm = exports.newSiteForm = {
  siteName: ko.observable(),
  site: ko.observable(),
  profile: ko.observable(),
  profiles: ko.observableArray(drupalProfiles),
  sitesInProgress: {},
  validationCriteria: [
    {
      name: 'new-site-name',
      display: 'Site Name',
      rules: 'required'
    },
    {
      name: 'new-site-id',
      display: 'URL Name',
      rules: 'required|callback_check_site_id',
    }
  ],
  errorMessages: ko.observable(''),
  siteIdRegex: /[^a-z0-9-]/,
  submit: function(errors, event) {
    event.preventDefault();
    // If validation failed, stop and display errors.
    if (errors.length > 0) {
      var errorString = '';
      for (var i = 0, errorLength = errors.length; i < errorLength; i++) {
        errorString += errors[i].message + '<br>';
      }
      this.errorMessages(errorString);
      return;
    }
    // Add new site to in progress.
    var name = this.site(),
        alias = name + '.kala';
    this.sitesInProgress[name] = {
      aliasName: alias,
      webRoot: '/var/www/' + name,
      uri: alias,
      name: this.siteName()
    };
    // Send request and update the UI.
    socket.emit('siteNewRequest', ko.toJS(this));
    newSiteButton.disabled(true);
    buildingInProgress(true);
    modal.close();
    // @todo Probably a better way to do this?
    $('#dashtabs a[href="#sites"]').tab('show');
    // Reset form state.
    this.siteName('');
    this.site('');
    this.profile('');
  },
  onComplete: function(data) {
    var site = data.site,
        siteObject = this.sitesInProgress[site];
    // Make sure this is a site we're tracking.
    if (!siteObject) {
      return;
    }
    // If build successful...
    if (data.succeeded) {
      // Add new site to the list.
      processSite(siteObject);
      siteObject.imgSrc = '/images/kalaboxv2-site.png';
      builtSites.unshift(siteObject);
      // Alert the user.
      modal.template('site-build-complete');
    }
    // If build unsuccessful...
    else {
      modal.showError(data.error);
    }
    delete this.sitesInProgress[site];
    modal.show();
    newSiteButton.disabled(false);
    buildingInProgress(false);
  },
  openForm: function() {
    // Load form into modal from template.
    modal.template('new-site-form');
    modal.show();
    newSiteForm.errorMessages('');
    newSiteForm.validateForm();
  },
  validateForm: function() {
    // Validate form before proceeding.
    var validator = new FormValidator('new-site-form', this.validationCriteria, this.submit.bind(this));
    validator.registerCallback('check_site_id', this.validateSiteId.bind(this))
      .setMessage('check_site_id', 'Please set a URL Name that only has lowercase letters, numbers, and dashes.');
  },
  validateSiteId: function(value) {
    return !this.siteIdRegex.test(value);
  }
};
socket.on('siteBuildFinished', newSiteForm.onComplete.bind(newSiteForm));

/**
 * Build remote site form.
 */
var remoteSiteBuilder = exports.remoteSiteBuilder = {
  shouldDownloadFiles: ko.observable(false),
  selectedSite: null,
  sitesInProgress: {},
  onClick: function(site) {
    remoteSiteBuilder.selectedSite = site;
    // Ask if user wants to download files.
    modal.template('build-remote-site-form');
    remoteSiteBuilder.resetDataMethod();
    remoteSiteBuilder.shouldDownloadFiles(false);
    modal.show();
  },
  onSubmit: function() {
    var selectedSite = this.selectedSite;
    var aliasName = selectedSite.aliasName;
    var remoteSite = {
      site: aliasName
    };
    selectedSite.building(true);
    if (this.shouldDownloadFiles()) {
      remoteSite.files = true;
      this.shouldDownloadFiles(false);
    }
    this.prepareDataRequest(remoteSite);
    // Add site to in progress.
    this.sitesInProgress[aliasName] = selectedSite;
    // Send request and update UI.
    socket.emit('siteBuildRequest', remoteSite);
    modal.close();
  },
  onComplete: function(data) {
    var site = data.site,
        siteObject = this.sitesInProgress[site];
    // Make sure this is a site we're tracking.
    if (!siteObject) {
      return;
    }
    // If build successful...
    if (data.succeeded) {
      // Add site to the built list and remove from unbuilt.
      unbuiltSites.remove(siteObject);
      siteObject.builtFrom = siteObject.aliasName;
      var boxName = siteObject.aliasName.split('.');
      boxName.pop();
      boxName = boxName.join('.');
      siteObject.aliasName = siteObject.uri = boxName + '.kala';
      siteObject.webRoot = '/var/www/' + boxName;
      getSiteInfo('built', siteObject.aliasName).done(function(info) {
        if (info.name) {
          siteObject.name = info.name;
        }
        if (info.imgSrc) {
          siteObject.imgSrc = info.imgSrc;
        }
        else {
          siteObject.imgSrc = '/images/kalaboxv2-site.png';
        }
        builtSites.unshift(siteObject);
      });
      // Alert the user.
      modal.template('site-build-complete');
    }
    // If build unsuccessful...
    else {
      modal.showError(data.error);
    }
    delete this.sitesInProgress[site];
    siteObject.building(false);
    modal.show();
  }
};
socket.on('siteBuildFinished', remoteSiteBuilder.onComplete.bind(remoteSiteBuilder));

/**
 * Site remover.
 */
var remover = exports.remover = {
  selectedSite: null,
  sitesInProgress: {},
  confirmRemove: function(site) {
    remover.selectedSite = site;
    modal.template('remove-site-confirmation');
    modal.show();
  },
  remove: function() {
    var selectedSite = remover.selectedSite;
    selectedSite.removing(true);
    remover.sitesInProgress[selectedSite.aliasName] = selectedSite;
    modal.close();
    socket.emit('siteRemoveRequest', ko.toJS(selectedSite));
  },
  removalComplete: function(data) {
    var site = data.site,
        siteObject = this.sitesInProgress[site];
    // Make sure this is a site we're tracking.
    if (!siteObject) {
      return;
    }
    // If removal successful...
    if (data.succeeded) {
      builtSites.remove(siteObject);
      // If site was remote, add it back to the unbuilt list.
      if (siteObject.builtFrom) {
        siteObject.aliasName = siteObject.builtFrom;
        siteObject.removing(false);
        unbuiltSites.push(siteObject);
      }
    }
    else {
      modal.showError(data.error);
    }
    delete this.sitesInProgress[site];
  }
};
socket.on('siteRemoveFinished', remover.removalComplete.bind(remover));

/**
 * Site refresher.
 */
var refresher = exports.refresher = {
  selectedSite: null,
  sitesInProgress: {},
  refreshCode: ko.observable(false),
  refreshData: ko.observable(false),
  refreshFiles: ko.observable(false),
  startRefresh: function(site) {
    refresher.selectedSite = site;
    modal.template('refresh-site-form');
    refresher.refreshCode(false);
    refresher.refreshData(false);
    refresher.refreshFiles(false);
    refresher.resetDataMethod();
    modal.show();
  },
  refresh: function() {
    var site = refresher.selectedSite;
    site.refreshing(true);
    var refreshRequest = {
      refreshCode: refresher.refreshCode(),
      refreshData: refresher.refreshData(),
      refreshFiles: refresher.refreshFiles(),
    };
    refreshRequest.alias = site.builtFrom;
    refresher.prepareDataRequest(refreshRequest);
    refresher.sitesInProgress[site.builtFrom] = site;
    socket.emit('siteRefreshRequest', refreshRequest);
    modal.close();
  },
  refreshComplete: function(data) {
    var site = data.site,
        siteObject = this.sitesInProgress[site];
    // Make sure this is a site we're tracking.
    if (!siteObject) {
      return;
    }
    // If refresh unsuccessful...
    if (data.error) {
      modal.showError(data.error);
    }
    siteObject.refreshing(false);
    delete this.sitesInProgress[site];
  }
};
socket.on('siteRefreshFinished', refresher.refreshComplete.bind(refresher));

/**
 * Data download chooser mixin.
 */
var dataDownload = {
  dataDownloadMethod: ko.observable(),
  selectedDbBackup: ko.observable(),
  dbBackupOptions: ko.observableArray(),
  dbOptionsVisible: ko.observable(),
  resetDataMethod: function() {
    this.dataDownloadMethod('latest');
    this.selectedDbBackup('');
    this.dbBackupOptions([{value: 'latest', display: 'Loading backups...'}]);
    this.dbOptionsVisible(false);
  },
  onDataMethodSelect: function() {
    var downloadMethod = this.dataDownloadMethod();
    if (downloadMethod == 'pick') {
      // Load backup list from Pantheon.
      var connection = $.getJSON('/site-db-backups/' + this.selectedSite.pantheonId);
      var self = this;
      this.dbOptionsVisible(true);
      connection.done(function(data) {
        var backups = [];
        for (var i = 0, length = data.length; i < length; i++) {
          backups.push({
            value: data[i][3],
            display: data[i][1]
          });
        }
        if (backups.length === 0) {
          backups.push({
            value: 'new',
            display: 'Sorry, you have no backups...'
          });
        }
        self.dbBackupOptions(backups);
      });
    }
    else {
      this.dbOptionsVisible(false);
    }
  },
  prepareDataRequest: function(request) {
    var dbDownloadMethod = this.dataDownloadMethod();
    if (dbDownloadMethod == 'pick') {
      request.dbDownload = this.selectedDbBackup();
    }
    else {
      request.dbDownload = dbDownloadMethod;
    }
  }
};
// Mix in to services that need it.
$.extend(refresher, dataDownload);
$.extend(remoteSiteBuilder, dataDownload);

// Server event handlers:

socket.on('boxStarted', function(data) {
  sitesButton.visible(true);
  newSiteButton.disabled(false);
  // Load sites lists.
  getSitesLists();
});

socket.on('boxStopped', function(data) {
  newSiteButton.disabled(true);
  sitesButton.visible(false);
  // Clear sites lists.
  builtSites.removeAll();
  unbuiltSites.removeAll();
});

},{"./modal":6,"./socket":8}],8:[function(require,module,exports){
/**
 * A tiny wrapper around Socket.io.
 *
 * Copyright 2013 Kalamuna LLC
 */

module.exports = io.connect('http://localhost:51686/');

},{}],9:[function(require,module,exports){
/**
 * Monitor to keep track of the box's status.
 *
 * Copyright 2013 Kalamuna LLC
 */

// Dependencies:
var socket = require('./socket');

// Box state variables:
var boxRunning = exports.boxRunning = ko.observable(false);
var boxStopped = exports.boxStopped = ko.computed(function() {
  return !boxRunning();
});

/**
 * Status displays.
 */
var statusDisplays = exports.statusDisplays = [];
var services = {};
var serviceDefinitions = [
  {name: 'box', title: 'Kalabox'},
  {name: 'nginx', title: 'Web Server'},
  {name: 'mysql', title: 'Database'}
];

/**
 * Get status for a given service (set as this value).
 *
 * @return string
 *   Status description to display on UI.
 */
function getDisplayStatus() {
  if (this.running()) {
    return 'Running';
  }
  return 'Stopped';
}

/**
 * Compute inverse of service's (this value's) running state.
 *
 * @return boolean
 *   True if service is off, false if on.
 */
function isNotRunning() {
  return !this.running();
}

// Create an object for each service we're tracking.
for (var i = 0, length = serviceDefinitions.length; i < length; i++) {
  var service = {
    title: serviceDefinitions[i].title,
    running: ko.observable(false)
  };
  service.message = ko.computed({read: getDisplayStatus, owner: service});
  service.notRunning = ko.computed({read: isNotRunning, owner: service});
  services[serviceDefinitions[i].name] = service;
}

// Add each service to the UI display.
for (var serviceName in services) {
  if (!services.hasOwnProperty(serviceName)) {
    continue;
  }
  statusDisplays.push(services[serviceName]);
}

// Server event handlers:

socket.on('serviceStatusChanged', function(data) {
  var service = data.name;
  if (services[service]) {
    services[service].running(data.running);
  }
});

socket.on('boxStarted', function(data) {
  boxRunning(true);
  // Mark all services as started.
  for (var i = 0, length = statusDisplays.length; i < length; i++) {
    statusDisplays[i].running(true);
  }
});

socket.on('boxStopped', function(data) {
  boxRunning(false);
  // Mark all services as stopped.
  for (var i = 0, length = statusDisplays.length; i < length; i++) {
    statusDisplays[i].running(false);
  }
});

},{"./socket":8}]},{},[5])
;