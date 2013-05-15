/*
 * GET home page.
 */

var installer = require('../kalabox/installer');

exports.index = function(req, res) {
  res.render('index', {
    title : 'Kalabox'
  });
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
};
