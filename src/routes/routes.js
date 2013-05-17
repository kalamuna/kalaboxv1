/**
 * @file
 * Calls handler for requested route.
 */

// Dependencies:
var installer = require('../kalabox/installer/installer'),
    box = require('../kalabox/box'),
    dash = require('../kalabox/dash');

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
  installer.install();
};

exports.dash = function(req, res) {
  res.render('dash', {
    title : 'Kalabox'
  });
  dash.initialize();
};
