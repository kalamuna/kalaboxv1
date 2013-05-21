/**
 * @file
 * Establishes an error logging service for Kalabox using the Winston module.
 */

// Dependencies:
var winston = require('winston'),
    flow = require('nue').flow,
    as = require('nue').as,
    fs = require('fs'),
    exec = require('child_process').exec;

// "Constants":
var KALABOX_DIR = process.env.HOME + '/.kalabox/',
    LOG_FILE = KALABOX_DIR + 'kalabox.log';

// Create a new logger instance that writes to the console and log file.
exports = module.exports = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)(),
    new (winston.transports.File)({ filename: LOG_FILE })
  ]
});

/**
 * Initializes the logger, creating the log file if it doesn't exists.
 *
 * @param function callback
 *   Function to call once the initialization completes.
 */
exports.initialize = flow('initialize')(
  // Check if Kalabox directory exists.
  function initialize0(callback) {
    this.data.callback = callback;
    fs.exists(KALABOX_DIR, this.async(as(0)));
  },
  // If directory doesn't exist, create it.
  function initialize1(exists) {
    if (!exists) {
      exec('mkdir -p ' + KALABOX_DIR, this.async());
    }
    else {
      this.next();
    }
  },
  // Check if log file exists.
  function initialize2() {
    fs.exists(LOG_FILE, this.async(as(0)));
  },
  // If log file doesn't exist, create it.
  function initialize3(exists) {
    if (!exists) {
      fs.writeFile(LOG_FILE, '### Kalabox Log ###\n\n', this.async());
    }
    else {
      this.next();
    }
  },
  function initializeEnd() {
    if (this.err) {
      exports.error('Error initializing logging service: ' + this.err.message);
      this.err = null;
    }
    // Set logger to handle uncaught exceptions too.
    process.on('uncaughtException', function(err) {
      exports.error('Uncaught Exception\n' + '\nStack:\n' + err.stack);
    });
    this.data.callback();
    this.next();
  }
);
