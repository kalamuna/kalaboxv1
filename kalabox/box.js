/**
 * @file
 * Defines a model and behavior for the user's Kalabox, storing state info.
 *
 * Copyright 2013 Kalamuna LLC
 */

// Dependencies:
var flow = require('nue').flow,
    as = require('nue').as,
    parallel = require('nue').parallel,
    fs = require('fs'),
    exec = require('child_process').exec,
    http = require('http'),
    EventEmitter = require('events').EventEmitter,
    config = require('../config'),
    sudoRunner = require('./utils/task-runner/sudo-runner'),
    connector = require('./vm/connector'),
    utils = require('./utils/utils'),
    host = require('./utils/host'),
    logger = require('../logger'),
    installUtils = require('./installer/install-utils');

// "Constants":
var KALABOX_DIR = config.get('KALABOX_DIR'),
    KALASTACK_DIR = config.get('KALASTACK_DIR'),
    VM_HALT_TIMEOUT = 180000; // 3 minutes.

// State data:
var installed = false,
    running = false;


// Variables:
var statusChecker, // Holds reference to interval running the status checker.
    appWindow; // Holds reference to the actual OS window.

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
    // Verify that Vagrant has the correct VirtualBox ID.
    var kalaboxId = host.getKalaboxId(),
        currentId = host.getVBoxId();
    if (kalaboxId && currentId) {
      host.verifyVBoxId(currentId, this.async());
    }
    else {
      this.next('NO_ID');
    }
  },
  function initialize1(result) {
    // Fix the VirtualBox ID Vagrant has if it's wrong.
    if (result != 'correct' && result != 'NO_ID') {
      host.fixVBoxId(result);
    }
    // Check if Kalabox is installed.
    checkInstalled(this.async(as(0)));
  },
  function initialize2(isInstalled) {
    installed = isInstalled;
    // Execute the status checker and set it to run periodically.
    if (isInstalled) {
      repeatStatusCheck();
      statusChecker = setInterval(repeatStatusCheck, 10000);
    }
    this.next();
  },
  // Get software versions for logging purposes.
  parallel('getSoftwareVersions')(
    function get0() {
      host.getMacVersion(this.async(as(0)));
    },
    function get1() {
      installUtils.checkVBox(this.async(as(0)));
    },
    function get2() {
      installUtils.checkVagrant(this.async(as(0)));
    }
  ),
  function initialize3(versions) {
    // Log box initialized and software versions.
    logger.info('Box initialized.');
    logger.info('Kalabox Version: ' + config.get('VERSION_STRING'));
    logger.info('Mac OS Version: ' + versions[0]);
    logger.info('VirtualBox Version: ' + versions[1]);
    logger.info('Vagrant Version: ' + versions[2]);
    this.next();
  },
  function initializeEnd() {
    if (this.err) {
      logger.error(this.err.message);
      throw this.err;
    }
    exports.emit('initialized');
    this.data.callback();
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
  function startBox0(callback) {
    this.data.callback = callback;
    // Halt status checking.
    clearInterval(statusChecker);
    // Get sudo access.
    sudoRunner.runCommand('echo', ['something something something complete!'], this.async());
  },
  function startBox1(output) {
    // Run "vagrant up" to start the Kalabox.
    exec('vagrant up', {cwd: KALASTACK_DIR}, this.async(as(0)));
  },
  function startBox2(error) {
    // Check for Vagrant error.
    if (error) {
      var vagrantError = new Error(error.message);
      vagrantError.vmError = true;
      this.endWith(vagrantError);
    }
    // Wait until box is ready before proceeding.
    var that = this;
    var checkingReady = setInterval(function() {
      checkStatus(function(ready) {
        if (ready) {
          clearInterval(checkingReady);
          that.next();
        }
      });
    }, 5000);
  },
  function startBoxEnd() {
    // Restart status checking.
    statusChecker = setInterval(repeatStatusCheck, 10000);
    if (this.err) {
      var error;
      if (this.err.message.indexOf('User canceled') !== -1) {
        error = new Error();
        error.userCanceled = true;
      }
      if (this.err.vmError) {
        error = this.err;
      }
      if (error) {
        this.data.callback(error);
        this.err = null;
      }
      else {
        logger.error(this.err.message);
        throw this.err;
      }
    }
    else {
      // Store running state and execute the callback.
      running = true;
      exports.emit('start');
      this.data.callback();
    }
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
  function stopBox0(callback) {
    this.data.callback = callback;
    // Get sudo access.
    sudoRunner.runCommand('echo', ['Do you believe in life after love?'], this.async());
  },
  function stopBox1(output) {
    // Run "vagrant halt" to power down the box.
    var callback = this.async(as(0));
    utils.timedRun(function(finishCallback) {
      exec('vagrant halt', {cwd: KALASTACK_DIR}, finishCallback);
    },
    VM_HALT_TIMEOUT,
    callback,
    function() {
      exec('vboxmanage controlvm ' + host.getVBoxId() + ' poweroff', {cwd: KALASTACK_DIR}, callback);
    });
  },
  function stopBoxEnd(vagrantError) {
    // Check for Vagrant error.
    if (vagrantError) {
      vagrantError.vmError = true;
      this.err = vagrantError;
    }
    if (this.err) {
      var error;
      if (this.err.message.indexOf('User canceled') !== -1) {
        error = new Error();
        error.userCanceled = true;
      }
      if (this.err.vmError) {
        error = this.err;
      }
      if (error) {
        this.data.callback(error);
        this.err = null;
      }
      else {
        logger.error(this.err.message);
        throw this.err;
      }
    }
    else {
      // Store running state and execute the callback.
      running = false;
      exports.emit('stop');
      this.data.callback();
    }
    this.next();
  }
);

/**
 * Runs cleanup tasks.
 *
 * @param function callback
 *   Function to call after cleanup completes.
 */
exports.cleanUp = flow('cleanUp')(
  function cleanUp0(callback) {
    this.data.callback = callback;
    // Shut down the VM if it's running.
    if (running) {
      exports.stopBox(this.async());
    }
    else {
      this.next();
    }
  },
  function cleanUp1() {
    // Remove the sudo key from the keychain.
    sudoRunner.removeKey(this.async());
  },
  function cleanUpEnd() {
    if (this.err) {
      if (this.err.message.indexOf('User canceled') !== -1) {
        this.err = null;
      }
      else {
        throw this.err;
      }
    }
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
    console.log(KALASTACK_DIR);
  },
  // Run "vagrant status" to verify box is good to go.
  function checkInstalled1(exists) {
    if (!exists) {
      this.end();
    }
    else {
      exec('vagrant status', {cwd: KALASTACK_DIR}, this.async());
    }
  },
  // Parse Vagrant output to make sure box is built.
  function checkInstalled2(stdout, stderr) {
    var response = stdout.toString();
    if ((response.indexOf('running (virtualbox)') !== -1) ||
        (response.indexOf('poweroff (virtualbox)') !== -1) ||
        (response.indexOf('aborted (virtualbox)') !== -1) ||
        (response.indexOf('saved (virtualbox)') !== -1)) {
      this.data.installed = true;
    }
    this.next();
  },
  function checkInstalledEnd() {
    if (this.err) {
      this.data.installed = false;
      this.err = null;
    }
    // Execute callback with the result.
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
  // Make sure Kalastack directory exists.
  function checkStatus0(callback) {
    this.data.callback = callback;
    this.data.isRunning = false;
    fs.exists(KALASTACK_DIR, this.async(as(0)));
  },
  // Run "vagrant status" to see if box is running.
  function checkStatus1(exists) {
    if (!exists) {
      this.end();
    }
    else {
      exec('vagrant status', {cwd: KALASTACK_DIR}, this.async());
    }
  },
  // Parse Vagrant output to determine if box is running.
  function checkStatus2(stdout, stderr) {
    var response = stdout.toString();
    if (response.indexOf('running (virtualbox)') !== -1) {
      this.data.isRunning = true;
    }
    this.next();
  },
  function checkStatusEnd() {
    if (this.err) {
      this.data.isRunning = false;
      this.err = null;
    }
    // Execute callback with the result.
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
  // If running status has changed, emit an event
  // based on whether the box has stopped or started.
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

/**
 * Determines if the box is ready by checking if the NFS shared directory has mounted.
 *
 * @param function callback
 *   Function to call with true if box is ready, false if not.
 */
var checkReady = flow('checkReady')(
  function checkReady0(callback) {
    this.data.callback = callback;
    connector.runCommand('mount', this.async());
  },
  function checkReadyEnd(response) {
    if (this.err) {
      this.err = null;
      this.data.callback(false);
    }
    else {
      // Parse response to see if mount exists.
      response = response.toString();
      var nfs_mount = '/kalabox/www on /var/www type nfs';
      this.data.callback(response.indexOf(nfs_mount) !== -1);
    }
    this.next();
  }
);
