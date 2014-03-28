/**
 * @file
 * Update mechanism for Kalabox's dependencies.
 *
 * Copyright 2013 Kalamuna LLC
 */

// Dependencies:
var fs = require('fs'),
    exec = require('child_process').exec,
    request = require('request'),
    flow = require('nue').flow,
    as = require('nue').as,
    config = require('../config'),
    box = require('./box'),
    installUtils = require('./installer/install-utils'),
    logger = require('../logger'),
    removeDir = require('rimraf').sync;

// "Constants":
var UPDATE_URL = config.get('UPDATE_URL'),
    KALASTACK_BASE_URL = config.get('KALASTACK_BASE_URL'),
    KALASTACK_DIR = config.get('KALASTACK_DIR'),
    DEPENDENCIES = [
      'terminatur'
    ],
    KEEP_FILES = [
      '.kalabox',
      '.vagrant',
      'config.json'
    ];

// Variables:
var configFileContents = null,
    configuration = {},
    dependenciesUpdate = false,
    kalastackUpdate = false,
    socket;

/**
 * Checks the canonical online source for updates.
 */
exports.checkForUpdates = flow('checkForUpdates')(
  function checkForUpdates0(callback) {
    this.data.callback = callback;
    // Download the updates file.
    request(UPDATE_URL, this.async(as(2)));
  },
  function checkForUpdates1(body) {
    // Parse the updates and read in the current config.
    configFileContents = body;
    configuration = JSON.parse(body);
    var currentConfig = {};
    if (fs.existsSync(KALASTACK_DIR + 'config.json')) {
      currentConfig = JSON.parse(fs.readFileSync(KALASTACK_DIR + 'config.json'));
    }
    // Check the dependencies and Kalastack versions against the latest ones.
    DEPENDENCIES.forEach(function(dependency) {
      if (currentConfig[dependency + '_version'] != configuration[dependency + '_version']) {
        dependenciesUpdate = true;
        return false;
      }
    });
    if (currentConfig['kalastack_version'] != configuration['kalastack_version']) {
      kalastackUpdate = true;
    }
    this.next(dependenciesUpdate || kalastackUpdate);
  },
  function checkForUpdatesEnd(needsUpdate) {
    if (this.err) {
      logger.warn('Updates check failed: ' + this.err.message);
      this.err = null;
      this.data.callback(false);
    }
    else {
      this.data.callback(needsUpdate);
    }
    this.next();
  }
);

/**
 * Updates any out of date dependencies.
 */
exports.update = flow('update')(
  function update0(callback) {
    this.data.callback = callback;
    // Connect to the UI.
    io.sockets.on('connection', this.async(as(0)));
  },
  function update1(newSocket) {
    socket = newSocket;
    sendMessage('Updating Things...');
    sendIcon('icon-cog', 'kalablue');
    // Write the new configuration file.
    fs.writeFileSync(KALASTACK_DIR + 'config.json', configFileContents);
    // Halt the box.
    box.stopBox(this.async());
  },
  function update1() {
    // Refresh Kalastack if there's an update.
    if (kalastackUpdate) {
      refreshKalastack(this.async());
    }
    else {
      this.next();
    }
  },
  function update2() {
    // Provision and start the box.
    installUtils.spinupBox(this.async());
  },
  function updateEnd() {
    if (this.err) {
      if (this.data.callback) {
        this.data.callback(this.err);
      }
      this.err = null;
    }
    else if (this.data.callback) {
      this.data.callback();
    }
    socket.emit('updatesComplete');
    this.next();
  }
);

/**
 * Replaces the Kalastack source code on the host with that of the latest version.
 */
var refreshKalastack = flow('refreshKalastack')(
  function refreshKalastack0(callback) {
    this.data.callback = callback;
    // @todo switch to os.tmpdir() once we upgrade Node past 0.8.
    this.data.temp = process.env['TMPDIR'];
    // Delete the old Kalastack files.
    files = fs.readdirSync(KALASTACK_DIR);
    files.forEach(function(file) {
      if (KEEP_FILES.indexOf(file) !== -1) {
        return true;
      }
      var filePath = KALASTACK_DIR + file,
          fileInfo = fs.statSync(filePath);
      if (fileInfo.isDirectory()) {
        removeDir(filePath);
      }
      else {
        fs.unlinkSync(filePath);
      }
    });
    // Download the new Kalastack files.
    var kalastackRequest = request(KALASTACK_BASE_URL + configuration['kalastack_version']);
    kalastackRequest.on('end', this.async());
    kalastackRequest.pipe(fs.createWriteStream(this.data.temp + 'kalastack.tar.gz'));
  },
  function refreshKalastack1() {
    // Extract the new Kalastack files.
    var temp = this.data.temp;
    if (!fs.existsSync(temp + 'kalastack')) {
      fs.mkdirSync(temp + 'kalastack');
    }
    exec('tar zxvf ' + temp + 'kalastack.tar.gz -C ' + temp + 'kalastack --strip-components 1', this.async());
  },
  function refreshKalastack2() {
    // Move the new files into place.
    var temp = this.data.temp,
        newFiles = fs.readdirSync(temp + 'kalastack');
    newFiles.forEach(function(file) {
      var filePath = temp + 'kalastack/' + file;
      fs.renameSync(filePath, KALASTACK_DIR + file);
    });
    this.next();
  },
  function refreshKalastackEnd() {
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

/* UI Interaction Functions */

function sendMessage(message) {
  socket.emit('installer', { message: message });
}

function sendIcon(icon, kalacolor) {
  socket.emit('installer', { icon: icon, kalacolor: kalacolor});
}

function sendProgress(progress, install) {
  progressBump = progressWeight / 100;
  if (install) {
    realPercent = (progressRunning + ((((progress * progressBump) / progressFinal)) * 100) * .90);
  }
  else {
    realPercent = progressRunning + (((progress * progressBump) / progressFinal)) * 100;
  }
  socket.emit('installer', { complete: realPercent });
}
