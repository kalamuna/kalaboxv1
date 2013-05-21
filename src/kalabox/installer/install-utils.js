/**
 * @file
 * Functionality related to installing Kalabox.
 */


// Requires
var fs = require('fs'),
    url = require('url'),
    http = require('http'),
    https = require('https'),
    exec = require('child_process').exec,
    spawn = require('child_process').spawn,
    logger = require('../../logger');

// State variables:
var vboxVersion,
    vagrantVersion;

/**
 * Downloads a file from the Internet.
 *
 * @param  string file_url
 *   URL to download from.
 * @param  string destination
 *   Directory on the file system to save file to (ending with "/").
 * @param  function callback
 *   Callback to pass progress to.
 */
exports.downloadFile = function(file_url, destination, callback) {
  // Get URL details from the full URL.
  var parsedUrl = url.parse(file_url);
  var options = {
    host : parsedUrl.host,
    port : 80,
    path : parsedUrl.pathname
  };
  var file_name = parsedUrl.pathname.split('/').pop();

  // Determine if we're downloading over http or https.
  var httpInterface = http;
  if (parsedUrl.protocol == 'https:') {
    httpInterface = https;
    options.port = 443;
  }

  // Create stream and start the download.
  var file = fs.createWriteStream(destination + file_name);
  httpInterface.get(options, function(res) {
    var filesize = res.headers['content-length'];
    var downloaded = 0;
    var done = 0;
    res.on('data', function(data) {
      file.write(data, function() {
        downloaded = downloaded + data.length;
        done = (downloaded / filesize) * 100;
        callback(null, done);
      });
    }).on('end', function(data) {
      file.end(function() {
        console.log(file_name + ' downloaded to ' + destination);
        callback(null, 100);
      });
    });
  }).on('error', function(error) {
    callback(error, 100);
  });
};

/**
 * Checks if VirtualBox is installed.
 *
 * @param  function callback
 *   Callback to pass an output array with version if installed, or false if not.
 */
exports.checkVBox = function(callback) {
  if (vboxVersion) {
    return vboxVersion;
  }
  // e.g. "4.2.8r83876"
  exec('VBoxManage -v', function(error, stdout, stderr) {
    if (error !== null) {
      callback(false);
    }
    else {
      vboxVersion = stdout;
      callback(stdout);
    }
  });
};

/**
 * Checks if Vagrant is installed.
 *
 * @param  function callback
 *   Callback to pass an output array with version if installed, or false if not.
 */
exports.checkVagrant = function(callback) {
  if (vagrantVersion) {
    return vagrantVersion;
  }
  // e.g. "Vagrant version 1.0.3"
  exec('vagrant --version', function(error, stdout, stderr) {
    if (error !== null) {
      callback(false);
    }
    else {
      vagrantVersion = stdout;
      callback(stdout);
    }
  });
};

/**
 * Compares two version strings.
 *
 * Based on: http://jsfiddle.net/Xv9WL/16/
 * and http://jsfiddle.net/ripper234/Xv9WL/28/
 *
 * @param  string v1
 *   First version string.
 * @param  string v2
 *   Second version string.
 * @return int
 *   -1 if v1 < v2; 0 if v1 == v2; 1 if v1 > v2
 */
exports.compareVersions = function(v1, v2) {
  var v1parts = v1.split('.');
  var v2parts = v2.split('.');

  for (var i = 0; i < v1parts.length; ++i) {
    if (v2parts.length == i) {
      return 1;
    }
    if (v1parts[i] == v2parts[i]) {
      continue;
    }
    else if (v1parts[i] > v2parts[i]) {
      return 1;
    }
    else {
      return -1;
    }
  }

  if (v1parts.length != v2parts.length) {
    return -1;
  }

  return 0;
};
