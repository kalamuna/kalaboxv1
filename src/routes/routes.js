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
    sitesManager = require('../kalabox/vm/sites-manager');

exports.index = function(req, res) {
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
  installer.loadLicense(function(licenseText) {
    res.render('install', {
      title : 'Boot this Box!',
      licenseAgreement : licenseText,
    });
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

exports.firewallIssue = function(req, res) {
  res.render('firewall_issue', {
    title : 'Kalabox'
  });
};
