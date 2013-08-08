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
var buildingInProgress = exports.buildingInProgress = ko.observable(false),
    siteInProgress = exports.siteInProgress = ko.observable('');

/**
 * Loads the lists of running sites and available sites from the box.
 */
var getSitesLists = exports.getSitesLists = function() {
  var connection = $.getJSON('/sites-list');
  connection.done(function(data) {
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
  onSubmit: function() {
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
    siteInProgress('');
  },
  openForm: function() {
    // Load form into modal from template.
    modal.template('new-site-form');
    modal.show();
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
    modal.show();
  },
  onSubmit: function() {
    modal.close();
    var aliasName = this.selectedSite.aliasName;
    var remoteSite = {
      site: aliasName
    };
    siteInProgress(aliasName);
    if (this.shouldDownloadFiles()) {
      remoteSite.files = true;
      this.shouldDownloadFiles(false);
    }
    socket.emit('siteBuildRequest', remoteSite);
    newSiteButton.disabled(true);
    buildingInProgress(true);
  }
};

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
