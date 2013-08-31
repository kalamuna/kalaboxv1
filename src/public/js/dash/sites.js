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
  {name: 'Standard Drupal', id: 'standard'}
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
    socket.emit('siteBuildRequest', ko.toJS(this));
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
      builtSites.unshift(siteObject);
      // Alert the user.
      modal.template('site-build-complete');
    }
    // If build unsuccessful...
    else {
      modal.template('site-build-failed');
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
    // Add site to in progress.
    this.sitesInProgress[aliasName] = selectedSite;
    // Send request and update UI.
    socket.emit('siteBuildRequest', remoteSite);
    newSiteButton.disabled(true);
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
      siteObject.building(false);
      getSiteInfo('built', siteObject.aliasName).done(function(info) {
        if (info.name) {
          siteObject.name = info.name;
        }
        builtSites.unshift(siteObject);
      });
      // Alert the user.
      modal.template('site-build-complete');
    }
    // If build unsuccessful...
    else {
      modal.template('site-build-failed');
    }
    delete this.sitesInProgress[site];
    modal.show();
    newSiteButton.disabled(false);
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
        unbuiltSites.push(siteObject);
      }
    }
    else {
      // @todo Add error handling.
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
    modal.show();
  },
  refresh: function() {
    var site = refresher.selectedSite;
    site.refreshing(true);
    var refreshRequest = ko.toJS(refresher);
    delete refreshRequest.selectedSite;
    refreshRequest.alias = site.builtFrom;
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
    // If refresh successful...
    if (data.succeeded) {
      siteObject.refreshing(false);
    }
    else {
      // @todo Add error handling.
    }
    delete this.sitesInProgress[site];
  }
};
socket.on('siteRefreshFinished', refresher.refreshComplete.bind(refresher));

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
