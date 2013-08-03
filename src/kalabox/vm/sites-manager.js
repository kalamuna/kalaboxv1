/**
 * Manages sites on the Kalabox virtual machine.
 *
 * Copyright 2013 Kalamuna LLC
 */

// Dependencies:
var flow = require('nue').flow,
    as = require('nue').as,
    connector = require('./connector'),
    http = require('http'),
    host = require('../utils/host');

// "Constants":
var SITES_SOURCE = 'http://aliases.kala';

/**
 * Gets the list of sites, both running and available to build.
 *
 * @param function callback
 *   Callback to call with error, if one occurs, and object containing 'builtSites' and 'unbuiltSites'
 */
exports.getSitesList = flow('getSitesList')(
  function getSitesList0(callback) {
    this.data.callback = callback;
    // Get sites list from the VM.
    var that = this;
    http.get(SITES_SOURCE, this.async(as(0))).on('error', function(error) {
      that.endWith(error);
    });
  },
  function getSitesList1(response) {
    var that = this;
    that.data.data = '';
    response.on('data', function(chunk) {
      that.data.data += chunk;
    }).on('end', this.async(as(0)));
  },
  function getSitesListEnd(end) {
    if (this.err) {
      this.data.callback(this.err);
      this.err = null;
    }
    else {
      this.data.callback(null, JSON.parse(this.data.data));
    }
    this.next();
  }
);

exports.buildSite = flow('buildSite')(
  function buildSite0(options, callback) {
    this.data.callback = callback;
    this.data.options = options;
    // Build command from site options.
    var command = 'drush build ';
    command += options.site;
    if (options.siteName) {
      command += ' --site-name="' + options.siteName + '"';
    }
    if (options.profile) {
      command += ' --profile="' + options.profile + '"';
    }
    if (options.files) {
      command += ' --files';
    }
    // Run command against VM.
    connector.runCommand(command, this.async());
  },
  function buildSite1(response) {
    // Add site entry to /etc/hosts.
    host.addHostsEntry(this.data.options.site, this.async());
  }
  function buildSiteEnd() {
    if (this.err) {
      this.data.callback(this.err);
      this.err = null;
    }
    else {
      this.data.callback();
    }
    this.next();
  }
);
