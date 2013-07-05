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
    flow = require('nue').flow,
    as = require('nue').as,
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
        that.data.callback(null, done);
      });
    }).on('end', this.async(as(0)));
  },
  function writeFile3(data) {
    this.data.file.end(this.async());
  },
  // Move the completed file download to a permenant path.
  function writeFile4(data) {
    exec('mv ' + this.data.destination + this.data.file_name + '.incomplete ' +
      this.data.destination + this.data.file_name, this.async());
  },
  function writeFileEnd() {
    if (this.err) {
      this.data.callback({message: this.err.message});
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
    exec('curl -L -o ' + this.data.kalastack_filename + ' ' + this.data.kalastack_url, {cwd: this.data.kalabox_dir}, this.async());
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
    exec('tar zxvf ' + this.data.kalastack_filename + ' -C ' + this.data.kalastackDir + ' --strip-components 1', {cwd: this.data.kalabox_dir}, this.async());
  },
  // Delete Kalastack tar.gz file.
  function downloadKalastack5(stdout, stderr) {
    exec('rm ' + this.data.kalastack_filename, {cwd: this.data.kalabox_dir}, this.async());
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
