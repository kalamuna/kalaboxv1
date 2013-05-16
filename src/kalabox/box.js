/**
 * @file
 * Defines a model and behavior for the user's Kalabox, storing state info.
 */

// Dependencies:
var flow = require('nue').flow,
    as = require('nue').as,
    fs = require('fs'),
    exec = require('child_process').exec;

// "Constants":
var KALABOX_DIR = process.env.HOME + '/.kalabox/',
    KALASTACK_DIR = KALABOX_DIR + 'kalastack-2.x';

// State data:
var installed = false,
    running = false;

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
    this.next();
  },
  function initializeEnd() {
    this.data.callback();
  }
);

exports.isInstalled = function() {
  return installed;
};

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
    if ((response.indexOf('running (virtualbox)') !== -1) || (response.indexOf('poweroff (virtualbox)') !== -1)) {
      this.data.installed = true;
    }
    this.next();
  },
  function checkInstalledEnd() {
    this.data.callback(this.data.installed);
    this.next();
  }
);
