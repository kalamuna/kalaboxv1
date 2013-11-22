/**
 * @file
 * Functionality related to installing Kalabox.
 *
 * Copyright 2013 Kalamuna LLC
 */


// Requires
var fs = require('fs'),
    url = require('url'),
    http = require('http'),
    https = require('https'),
    exec = require('child_process').exec,
    spawn = require('child_process').spawn,
    flow = require('nue').flow,
    as = require('nue').as,
    logger = require('../../logger'),
    config = require('../../config'),
    sudoRunner = require('../utils/task-runner/sudo-runner'),
    utils = require('../utils/utils');

// "Constants":
var KALABOX_DIR = config.get('KALABOX_DIR'),
    KALABOX64_FILENAME = 'kalabox64.box',
    KALASTACK_DIR = config.get('KALASTACK_DIR'),
    MAX_SPINUP_ATTEMPTS = 3;

// State variables:
var vboxVersion,
    vagrantVersion,
    baseboxStatus;

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
exports.downloadFile = flow('writeFile')(
  // Check if there is already a file at the destination location
  function writeFile0(file_url, destination, callback) {
    // Get URL details from the full URL.
    var parsedUrl = url.parse(file_url);
    this.data.options = {
      host : parsedUrl.host,
      port : 80,
      path : parsedUrl.pathname
    };
    this.data.file_name = parsedUrl.pathname.split('/').pop();

    // Determine if we're downloading over http or https.
    this.data.httpInterface = http;
    if (parsedUrl.protocol == 'https:') {
      this.data.httpInterface = https;
      this.data.options.port = 443;
    }
    this.data.destination = destination;
    this.data.callback = callback;

    fs.exists(this.data.destination + this.data.file_name, this.async(as(0)));
  },
  // Create stream and start the download.
  function writeFile1(exists){
    if(exists){
      console.log('File already downloaded');
      this.end();
      return;
    }
    // Download as an "incomplete" file.
    this.data.file = fs.createWriteStream(this.data.destination + this.data.file_name + '.incomplete');
    this.data.httpInterface.get(this.data.options, this.async(as(0))).on('error', function(error) {
      this.data.callback(error, 100);
    });
  },
  // Report on the downloading progress
  function writeFile2(res) {
    var filesize = res.headers['content-length'];
    var downloaded = 0;
    var done = 0;
    var that = this;
    res.on('data', function(data) {
      that.data.file.write(data, function() {
        downloaded = downloaded + data.length;
        done = (downloaded / filesize) * 100;
        if (done < 100) {
          that.data.callback(null, done);
        }
      });
    }).on('end', this.async(as(0)));
  },
  function writeFile3(data) {
    this.data.file.end(this.async());
  },
  // Move the completed file download to a permenant path.
  function writeFile4(data) {
    fs.rename(this.data.destination + this.data.file_name + '.incomplete', this.data.destination + this.data.file_name, this.async());
  },
  function writeFileEnd() {
    if (this.err) {
      this.data.callback({message: this.err.message}, 100);
      this.err = null;
      return;
    }

    console.log(this.data.file_name + ' downloaded to ' + this.data.destination);
    this.data.callback(null, 100);
  }
);

exports.downloadKalastack = flow('downloadKalastack')(
  function downloadKalastack0(kalabox_dir, kalastack_filename, kalastack_url, kalastackDir, callback) {
    this.data.kalastack_url = kalastack_url;
    this.data.kalabox_dir = kalabox_dir;
    this.data.kalastack_filename = kalastack_filename;
    this.data.kalastackDir = kalastackDir;
    this.data.callback = callback;

    fs.exists(kalastackDir, this.async(as(0)));
  },
  // See if Kalastack is already downloaded
  function downloadKalastack1(exists) {
    if (exists) {
      console.log('Kalastack already downloaded');
      this.end();
      return;
    }
    var file = utils.escapeSpaces(this.data.kalastack_filename);
    exec('curl -L -o ' + file + ' ' + this.data.kalastack_url, {cwd: this.data.kalabox_dir}, this.async());
  },
  // Verify Kalastack download
  function downloadKalastack2(stdout, stderr) {
    fs.exists(this.data.kalabox_dir + this.data.kalastack_filename, this.async(as(0)));
  },
  // Create Kalastack directory
  function downloadKalastack3(exists) {
    if (!exists) {
      this.endWith({message: 'Failed to download Kalastack archive.'});
      return;
    }
    fs.mkdir(this.data.kalastackDir, '0755', this.async());
  },
  // Untar Kalastack.
  function downloadKalastack4() {
    var file = utils.escapeSpaces(this.data.kalastack_filename),
        directory = utils.escapeSpaces(this.data.kalastackDir);
    exec('tar zxvf ' + file + ' -C ' + directory + ' --strip-components 1', {cwd: this.data.kalabox_dir}, this.async());
  },
  // Delete Kalastack tar.gz file.
  function downloadKalastack5(stdout, stderr) {
    var file = utils.escapeSpaces(this.data.kalastack_filename);
    exec('rm ' + file, {cwd: this.data.kalabox_dir}, this.async());
  },
  function downloadKalastackEnd(stdout, stderr) {
    if (this.err) {
      this.data.callback({message: this.err.message});
      this.err = null;
      return;
    }

    this.data.callback();
  }
);

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
 * Checks if the basebox exists.
 *
 * @param  function callback
 *   Callback to pass an output array with version if installed, or false if not.
 */
exports.checkbaseBox = function(callback) {
  if (baseboxStatus) {
    callback(baseboxStatus);
    return;
  }

  fs.exists(KALABOX_DIR + KALABOX64_FILENAME, callback);
};

/**
 * Check if we have access to the internet
 * @param  function callback
 *   Callback to pass an output true if Google resolves, or false if not.
 */
exports.checkInternet = function(callback) {
  require('dns').resolve('www.google.com', function(err) {
    if (err !== null) {
      callback(false);
    }
    else {
      callback(true);
    }
  });
};

/**
 * Checks if the host's firewall has a problematic setting.
 *
 * @param function callback
 *   Callback to call with true if firewall is okay, false if not, or null if check failed.
 */
exports.checkFirewall = flow('checkFirewall')(
  function checkFirewall0(callback) {
    this.data.callback = callback;
    exec('/usr/libexec/ApplicationFirewall/socketfilterfw --getblockall', this.async());
  },
  function checkFirewallEnd(stdout, stderr) {
    var firewallOk = null;
    if (this.err) {
      this.err = null;
    }
    else {
      // Parse output to see if block all connections is off.
      var response = stdout.toString();
      firewallOk = (response.indexOf('Block all DISABLED!') !== -1);
    }
    this.data.callback(firewallOk);
  }
);

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

/**
 * Initializes the virtual machine with Vagrant.
 *
 * If initialization fails, it will retry twice more.
 *
 * @param function callback
 *   Callback to call with error, if one occurs.
 * @param int (optional) attempts
 *   The current attempt this call represents.
 */
var spinupBox = exports.spinupBox = flow('spinupBox')(
  function spinupBox0(callback, attempts) {
    this.data.attempts = attempts || 0;
    this.data.callback = callback;
    // Attempt the spinup.
    sudoRunner.runCommand('echo', ['We needs the passwordz...'], this.async());
  },
  function spinupBox1() {
    sudoRunner.startAuthRenewal();
    exec('vagrant up --provision', {cwd: KALASTACK_DIR}, this.async(as(0)));
  },
  function spinupBox2(error) {
    var attempts = this.data.attempts + 1,
        that = this;
    sudoRunner.stopAuthRenewal();
    // If no error, continue on.
    if (!error) {
      this.next();
      return;
    }
    // Otherwise, remove failed box.
    exec('vagrant destroy -f', {cwd: KALASTACK_DIR}, function(destroyError) {
      // Error out if we've made the maximum number of attempts.
      if (attempts == MAX_SPINUP_ATTEMPTS) {
        that.endWith(new Error('Failed to spin up virtual machine after ' + attempts + ' attempts. Error was: ' + error.message));
        return;
      }
      // Otherwise, retry the spinup.
      setTimeout(spinupBox, 0, that.data.callback, attempts);
    });
  },
  function spinupBoxEnd() {
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
