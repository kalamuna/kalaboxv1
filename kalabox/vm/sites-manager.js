/**
 * Manages sites on the Kalabox virtual machine.
 *
 * Copyright 2013 Kalamuna LLC
 */

// Dependencies:
var flow = require('nue').flow,
    as = require('nue').as,
    exec = require('child_process').exec,
    http = require('http'),
    host = require('../utils/host'),
    config = require('../../config'),
    services = require('./services'),
    pantheonAuth = require('../utils/pantheon-auth'),
    logger = require('../../logger');

// "Constants":
var SITES_SOURCE = 'http://aliases.kala',
    KALASTACK_DIR = config.get('KALASTACK_DIR');

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
  function getSitesList2(end) {
    // Attempt to parse the site response.
    try {
      this.data.data = JSON.parse(this.data.data);
    }
    catch (error) {
      this.endWith(error);
    }
    this.next();
  },
  function getSitesListEnd() {
    if (this.err) {
      logger.warn('Error retrieving sites list: ' + this.err);
      this.err = null;
      this.data.callback(this.err);
    }
    else {
      this.data.callback(null, this.data.data);
    }
    this.next();
  }
);

/**
 * Pull down site from Pantheon
 *
 * @param object options
 *   Site parameters with site (required), files.
 * @param function callback
 *   Function to call with error if one occurs.
 */
exports.buildSite = flow('buildSite')(
  function buildSite0(options, callback) {
    this.data.callback = callback;
    this.data.options = options;
    // Check box's Internet connection.
    services.checkConnection(this.async(as(0)));
  },
  function buildSite1(error) {
    if (error) {
      this.endWith(error);
      return;
    }
    // Authenticate so we don't get a denial.
    pantheonAuth.authenticate(this.async());
  },
  function buildSite2() {
    // Build command from site options.
    var command = 'KALABOX=on drush pullsite ',
        options = this.data.options;
    command += options.site;
    if (options.files) {
      command += ' --files';
    }
    command += ' --db-backup-bucket=';
    if (options.dbDownload) {
      command += options.dbDownload;
    }
    else {
      command += 'latest';
    }
    // Run command against VM via Vagrant.
    exec('vagrant ssh -c \'' + command + '\'', {cwd: KALASTACK_DIR}, this.async());
  },
  function buildSite3() {
    // Add site entry to /etc/hosts.
    var siteId = this.data.options.site.split('.');
    siteId = siteId[0];
    host.addHostsEntry(siteId + ".kala", this.async());
  },
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


/**
 * Builds a site on the virtual machine.
 *
 * @param object options
 *   Site parameters with site (required), siteName and profile.
 * @param function callback
 *   Function to call with error if one occurs.
 */
exports.newSite = flow('newSite')(
  function newSite0(options, callback) {
    this.data.callback = callback;
    this.data.options = options;
    // Check box's Internet connection.
    services.checkConnection(this.async(as(0)));
  },
  function newSite1(error) {
    if (error) {
      this.endWith(error);
      return;
    }
    // Build command from site options.
    var command = 'KALABOX=on drush newsite ',
        options = this.data.options;
    command += options.site;
    if (options.siteName) {
      command += ' --site-name="' + options.siteName + '"';
    }
    if (options.profile) {
      command += ' --profile="' + options.profile + '"';
    }
    // Run command against VM via Vagrant.
    exec('vagrant ssh -c \'' + command + '\'', {cwd: KALASTACK_DIR}, this.async());
  },
  function newSite2(stdout, stderr) {
    // Add site entry to /etc/hosts.
    host.addHostsEntry(this.data.options.site + ".kala", this.async());
  },
  function newSiteEnd() {
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

/**
 * Removes a site from the virtual machine.
 *
 * @param object site
 *   Site object with aliasName (required) and builtFrom (for remote sites).
 * @param function callback
 *   Function to call with error if one occurs.
 */
exports.removeSite = flow('removeSite')(
  function removeSite0(site, callback) {
    this.data.callback = callback;
    this.data.site = site.uri;
    // Run command against VM via Vagrant.
    var alias = site.aliasName;

    exec('vagrant ssh -c \'KALABOX=on drush crush ' + alias + '\'', {cwd: KALASTACK_DIR}, this.async());
  },
  function removeSite1(stdout, stderr) {
    // Remove entry from /etc/hosts.
    host.removeHostsEntry(this.data.site, this.async());
  },
  function removeSiteEnd() {
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

/**
 * Refreshes a site on the virtual machine.
 *
 * @param object options
 *   Refresh parameters with alias (required), refreshCode, refreshData, and refreshFiles.
 * @param function callback
 *   Function to call with error if one occurs.
 */
exports.refreshSite = flow('refreshSite')(
  function refreshSite0(options, callback) {
    this.data.options = options;
    this.data.callback = callback;
    this.data.alias = options.alias;
    // Check box's Internet connection.
    services.checkConnection(this.async(as(0)));
  },
  function refreshSite1(error) {
    if (error) {
      this.endWith(error);
      return;
    }
    // Authenticate so we don't get a denial.
    pantheonAuth.authenticate(this.async());
  },
  function refreshSite2() {
    // Refresh code if requested.
    var options = this.data.options;
    if (options.refreshCode) {
      exec('vagrant ssh -c \'KALABOX=on drush pullcode ' + options.alias + '\'', {cwd: KALASTACK_DIR}, this.async());
    }
    else {
      this.next();
    }
  },
  function refreshSite3() {
    // Refresh database if requested.
    var command = 'KALABOX=on drush pulldata ';
    command += this.data.alias;
    command += ' --db-backup-bucket=';
    if (this.data.options.dbDownload) {
      command += this.data.options.dbDownload;
    }
    else {
      command += 'latest';
    }
    if (this.data.options.refreshData) {
      exec('vagrant ssh -c \'' + command + '\'', {cwd: KALASTACK_DIR}, this.async());
    }
    else {
      this.next();
    }
  },
  function refreshSite4() {
    // Refresh files if requested.
    if (this.data.options.refreshFiles) {
      exec('vagrant ssh -c \'KALABOX=on drush pullfiles ' + this.data.alias + '\'', {cwd: KALASTACK_DIR}, this.async());
    }
    else {
      this.next();
    }
  },
  function refreshSiteEnd() {
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

/**
 * Gets the list of database backups for a particular site.
 *
 * @param string siteId
 *   Site's Pantheon uuid.
 * @param function callback
 *   Function to call with error (if one occurs) and backup object.
 */
exports.getDbBackups = flow('getDbBackups')(
  function getDbBackups0(siteId, callback) {
    this.data.siteId = siteId;
    this.data.callback = callback;
    // Check box's Internet connection.
    services.checkConnection(this.async(as(0)));
  },
  function getDbBackups1(error) {
    if (error) {
      this.endWith(error);
      return;
    }
    // Authenticate so we don't get a denial.
    pantheonAuth.authenticate(this.async());
  },
  function getDbBackups2() {
    // Load list of database backups for the given site.
    var command = 'vagrant ssh -c \'drush pantheon-site-backups ';
    command += this.data.siteId + ' ' + 'dev --json\'';
    exec(command, {cwd: KALASTACK_DIR}, this.async());
  },
  function getDbBackupsEnd(stdout, stderr) {
    if (this.err) {
      this.data.callback(this.err);
      this.err = null;
    }
    else {
      // Filter out non-database backups.
      var backups = JSON.parse(stdout.toString().replace(/,$/, ''));
      var filteredBackups = [];
      for (var backup in backups) {
        if (!backups.hasOwnProperty(backup)) {
          continue;
        }
        if (backups[backup][2] == 'database') {
          filteredBackups.push(backups[backup]);
        }
      }
      this.data.callback(null, filteredBackups);
    }
    this.next();
  }
);
