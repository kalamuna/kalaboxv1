/**
 * @file
 * Calls handler for requested route.
 *
 * Copyright 2013 Kalamuna LLC
 */

// Dependencies:
var installer = require('../kalabox/installer/installer'),
    box = require('../kalabox/box'),
    dash = require('../kalabox/dash'),
    logger = require('../logger'),
    sitesManager = require('../kalabox/vm/sites-manager'),
    updater = require('../kalabox/updater');

exports.index = function(req, res) {
  console.log("stuff");
  if (box.isInstalled()) {
    exports.dash(req, res);
  }
  else {
    res.render('index', {
      title : 'Kalabox'
    });
  }
};

exports.install = function(req, res) {
  res.render('install', {
    title : 'Boot this Box',
    updating : false
  });
  installer.initialize();
};

exports.dash = function(req, res) {
  res.render('dash', {
    title : 'Kalabox'
  });
  dash.initialize();
};

exports.errorPage = function(req, res) {
  logger.loadLog(function(contents) {
    res.render('error', {
      title : 'Kalabox',
      logContents: contents
    });
  });
};

exports.noInternet = function(req, res) {
  res.render('no_internet', {
    title : 'Kalabox'
  });
};

exports.helpPage = function(req, res) {
  res.render('help_index', {
    title : 'Help'
  });
};

exports.noPermission = function(req, res) {
  res.render('permission_denied', {
    title : 'Kalabox'
  });
};

exports.sitesList = function(req, res) {
  sitesManager.getSitesList(function(error, sites) {
    if (error || !sites) {
      res.send(500, { error: 'Unable to load sites.' });
    }
    else {
      res.send(sites);
    }
  });
};

exports.siteDbBackups = function(req, res) {
  sitesManager.getDbBackups(req.params.id, function(error, backups) {
    if (error || !backups) {
      res.send(500, { error: 'Unable to load backups.' });
    }
    else {
      res.send(backups);
    }
  });
};

exports.firewallIssue = function(req, res) {
  res.render('firewall_issue', {
    title : 'Kalabox'
  });
};

exports.update = function(req, res) {
  res.render('install', {
    title : 'Updating',
    updating : true
  });
  updater.update();
};
