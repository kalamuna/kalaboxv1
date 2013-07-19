/**
 * @file
 * Calls handler for requested route.
 */

// Dependencies:
var installer = require('../kalabox/installer/installer'),
    box = require('../kalabox/box'),
    dash = require('../kalabox/dash'),
    logger = require('../logger');

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
  res.render('install', {
    title : 'Boot this Box!'
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




