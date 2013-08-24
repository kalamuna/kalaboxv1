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
  // @todo Add error handling.
};

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
  {name: 'Standard Drupal', id: 'standard'}
];
var newSiteForm = exports.newSiteForm = {
  siteName: ko.observable(),
  site: ko.observable(),
  profile: ko.observable(),
  profiles: ko.observableArray(drupalProfiles),
  validationCriteria: [
    {
      name: 'new-site-id',
      rules: 'callback_check_site_id',
    },
    {
      name: 'new-site-name',
      display: 'Site Name',
      rules: 'required'
    }
  ],
  submit: function(errors, event) {
    event.preventDefault();
    // If validation failed, stop and display errors.
    if (errors.length > 0) {
      var errorString = '';

      for (var i = 0, errorLength = errors.length; i < errorLength; i++) {
          errorString += errors[i].message + '<br />';
      }

      $('<div class="alert alert-danger">' + errorString + '</div>').insertBefore('.modal-body');console.log('No!');
      return;
    }console.log('Yes!');
    // Send request and update the UI.
    socket.emit('siteBuildRequest', ko.toJS(this));
    newSiteButton.disabled(true);
    buildingInProgress(true);
    modal.close();
    // @todo Probably a better way to do this?
    $('#dashtabs a[href="#sites"]').tab('show');
  },
  onComplete: function(data) {
    // Reset form state.
    buildingInProgress(false);
    this.siteName('');
    this.site('');
    this.profile('');
    // If build successful...
    if (data.succeeded) {
      // Refresh sites list.
      getSitesLists();
      // Alert the user.
      modal.template('site-build-complete');
    }
    // If build unsuccessful...
    else {
      modal.template('site-build-failed');
    }
    modal.show();
    newSiteButton.disabled(false);
  },
  openForm: function() {
    // Load form into modal from template.
    modal.template('new-site-form');
    modal.show();
    newSiteForm.validateForm();
  },
  validateForm: function() {
    // Validate form before proceeding.
    var validator = new FormValidator('new-site-form', this.validationCriteria, this.submit.bind(this));
    validator.registerCallback('check_site_id', function(value) {
      console.log('THIS RAN');
      var patt = new RegExp('[0-9a-z-]*$');
      console.log(patt.test(value));
      return patt.test(value);
    }).setMessage('check_site_id', 'Please set a site URL that only has lowercase letters, numbers, and dashes.');
  }
};
newSiteForm.onComplete = newSiteForm.onComplete.bind(newSiteForm);
socket.on('siteBuildFinished', newSiteForm.onComplete);

/**
 * Build remote site form.
 */
var remoteSiteBuilder = exports.remoteSiteBuilder = {
  shouldDownloadFiles: ko.observable(false),
  selectedSite: null,
  onClick: function(site) {
    remoteSiteBuilder.selectedSite = site;
    // Ask if user wants to download files.
    modal.template('build-remote-site-form');
    remoteSiteBuilder.shouldDownloadFiles(false);
    modal.show();
  },
  onSubmit: function() {
    modal.close();
    var aliasName = this.selectedSite.aliasName;
    var remoteSite = {
      site: aliasName
    };
    this.selectedSite.building(true);
    if (this.shouldDownloadFiles()) {
      remoteSite.files = true;
      this.shouldDownloadFiles(false);
    }
    socket.emit('siteBuildRequest', remoteSite);
    newSiteButton.disabled(true);
    buildingInProgress(true);
  }
};

/**
 * Site remover.
 */
var remover = exports.remover = {
  selectedSite: null,
  confirmRemove: function(site) {
    remover.selectedSite = site;
    modal.template('remove-site-confirmation');
    modal.show();
  },
  remove: function() {
    remover.selectedSite.removing(true);
    modal.close();
    socket.emit('siteRemoveRequest', ko.toJS(remover.selectedSite));
  },
  removalComplete: function(data) {
    getSitesLists();
    // @todo Add error handling.
  }
};
remover.removalComplete = remover.removalComplete.bind(remover);
socket.on('siteRemoveFinished', remover.removalComplete);

/**
 * Site refresher.
 */
var refresher = exports.refresher = {
  selectedSite: null,
  refreshCode: ko.observable(false),
  refreshData: ko.observable(false),
  refreshFiles: ko.observable(false),
  startRefresh: function(site) {
    refresher.selectedSite = site;
    modal.template('refresh-site-form');
    refresher.refreshCode(false);
    refresher.refreshData(false);
    refresher.refreshFiles(false);
    modal.show();
  },
  refresh: function() {
    var site = refresher.selectedSite;
    site.refreshing(true);
    var refreshRequest = ko.toJS(refresher);
    delete refreshRequest.selectedSite;
    refreshRequest.alias = site.builtFrom;
    socket.emit('siteRefreshRequest', refreshRequest);
    modal.close();
  },
  refreshComplete: function(data) {
    refresher.selectedSite.refreshing(false);
    // @todo Add error handling.
  }
};
refresher.refreshComplete = refresher.refreshComplete.bind(refresher);
socket.on('siteRefreshFinished', refresher.refreshComplete);

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
