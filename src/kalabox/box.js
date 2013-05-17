/**
 * @file
 * Defines a model and behavior for the user's Kalabox, storing state info.
 */

// Dependencies:
var flow = require('nue').flow,
    as = require('nue').as,
    fs = require('fs'),
    exec = require('child_process').exec,
    http = require('http'),
    EventEmitter = require('events').EventEmitter;

// "Constants":
var KALABOX_DIR = process.env.HOME + '/.kalabox/',
    KALASTACK_DIR = KALABOX_DIR + 'kalastack-2.x',
    KALABOX_IP = '192.168.42.10';

// State data:
var installed = false,
    running = false;

// Variables:
var statusChecker;

// Make this module an instance of EventEmitter so we can emit events.
exports = module.exports = new EventEmitter();

/**** Public Methods: ****/

/**
 * Initializes box's state.
 *
 * @param callback
 *   Callback function to call when finished.
 */
exports.initialize = flow('initialize')(
  function initialize0(callback) {
    this.data.callback = callback;
    // Check if Kalabox is installed.
    checkInstalled(this.async(as(0)));
  },
  function initialize1(isInstalled) {
    installed = isInstalled;
    repeatStatusCheck();
    statusChecker = setInterval(repeatStatusCheck, 10000);
    this.next();
  },
  function initializeEnd() {
    if (this.err) {
      console.log(this.err.message);
      throw this.err;
    }
    this.data.callback();
    exports.emit('initialized');
    this.next();
  }
);

/**
 * Reports the installation status of Kalabox.
 *
 * @return bool
 *   True if installed, false if not.
 */
exports.isInstalled = function() {
  return installed;
};

/**
 * Reports the power status of Kalabox.
 *
 * @return bool
 *   True if running, false if not.
 */
exports.isRunning = function() {
  return running;
};

/**
 * Starts up the Kalabox.
 *
 * @param function callback
 *   Callback to call once the box has started.
 */
exports.startBox = flow('startBox')(
  // Run "vagrant up" to start the Kalabox.
  function startBox0(callback) {
    this.data.callback = callback;
    exec('osascript ' + __dirname + '/utils/scpts/start_box.scpt "' + KALASTACK_DIR + '"', this.async());
    //exec('vagrant up --no-provision', {cwd: KALASTACK_DIR}, this.async());
  },
  function startBoxEnd(stdout, stderr) {
    if (this.err) {
      console.log(this.err.message);
      throw this.err;
    }
    running = true;
    this.data.callback();
    this.next();
  }
);

/**
 * Stops the Kalabox.
 *
 * @param function callback
 *   Callback to call once the box has stopped.
 */
exports.stopBox = flow('stopBox')(
  // Run "vagrant halt" to power down the box.
  function stopBox0(callback) {
    this.data.callback = callback;
    exec('vagrant halt', {cwd: KALASTACK_DIR}, this.async());
  },
  function stopBoxEnd(stdout, stderr) {
    if (this.err) {
      console.log(this.err.message);
      throw this.err;
    }
    running = false;
    this.data.callback();
    this.next();
  }
);

/**** Private Helper Functions: ****/

/**
 * Checks if Kalabox is installed and ready to go.
 *
 * @param callback
 *   Called with true if it's installed, false if not.
 */
var checkInstalled = flow('checkInstalled')(
  function checkInstalled0(callback) {
    this.data.installed = false;
    this.data.callback = callback;
    // Check if Kalabox/Kalastack directories exist.
    fs.exists(KALASTACK_DIR, this.async(as(0)));
  },
  // Run "vagrant status" to verify box is good to go.
  function checkInstalled1(exists) {
    if (!exists) {
      this.end();
    }
    exec('vagrant status', {cwd: KALASTACK_DIR}, this.async());
  },
  // Parse Vagrant output to make sure box is built.
  function checkInstalled2(stdout, stderr) {
    var response = stdout.toString();
    if ((response.indexOf('running (virtualbox)') !== -1) ||
        (response.indexOf('poweroff (virtualbox)') !== -1)) {
      this.data.installed = true;
    }
    this.next();
  },
  function checkInstalledEnd() {
    if (this.err) {
      console.log(this.err.message);
      throw this.err;
    }
    this.data.callback(this.data.installed);
    this.next();
  }
);

/**
 * Checks if Kalabox is running.
 *
 * @param function callback
 *   Callback to call with true if box is running, false if not.
 */
var checkStatus = flow('checkStatus')(
  function checkStatus0(callback) {
    this.data.callback = callback;
    exec('vagrant status', {cwd: KALASTACK_DIR}, this.async());
  },
  function checkStatus1(stdout, stderr) {
    var response = stdout.toString();
    if (response.indexOf('running (virtualbox)') !== -1) {
      this.data.isRunning = true;
    }
    else {
      this.data.isRunning = false;
    }
    this.next();
  },
  function checkStatusEnd() {
    if (this.err) {
      console.log(this.err.message);
      throw this.err;
    }
    console.log('Box running: ' + this.data.isRunning);
    this.data.callback(this.data.isRunning);
    this.next();
  }
);

/**
 * Runs status check and stores the result.
 *
 * To be used with setTimeout or setInterval to schedule status checking.
 */
function repeatStatusCheck() {
  checkStatus(repeatStatusCheck.storeCheck);
}
repeatStatusCheck.storeCheck = function(isRunning) {
  if (running != isRunning) {
    running = isRunning;
    if (isRunning) {
      exports.emit('start');
    }
    else {
      exports.emit('stop');
    }
  }
};
