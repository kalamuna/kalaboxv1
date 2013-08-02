/**
 * @file
 * Establishes an error logging service for Kalabox using the Winston module.
 *
 * Copyright 2013 Kalamuna LLC
 */

// Dependencies:
var winston = require('winston'),
    flow = require('nue').flow,
    as = require('nue').as,
    fs = require('fs'),
    exec = require('child_process').exec,
    config = require('./config');

// "Constants":
var KALABOX_DIR = config.get('KALABOX_DIR'),
    LOG_FILE = KALABOX_DIR + 'kalabox.log';

// Create a new logger instance that writes to the console and log file.
exports = module.exports = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)(),
    new (winston.transports.File)({ filename: LOG_FILE })
  ]
});

// Connect to Socket.io so we can emit an error event.
var socket;
exports.on('logging', function(transport, level, msg, meta) {
  // Send message to frontend via event on error.
  if (level == 'error') {
    socket.emit('appError');
  }
});

/**
 * Initializes the logger, creating the log file if it doesn't exists.
 *
 * @param function callback
 *   Function to call once the initialization completes.
 * @param object io
 *   IO event emitter dependency.
 */
exports.initialize = flow('initialize')(
  function initialize0(callback, io) {
    this.data.callback = callback;
    // Configure Socket.io dependency.
    socket = io.sockets;
    // Check if Kalabox directory exists.
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

/**
 * Loads contents of the log file.
 *
 * @param function callback
 *   Function to call with the contents of the log file.
 */
exports.loadLog = flow('loadLog')(
  // Check if log file exists.
  function loadLog0(callback) {
    this.data.callback = callback;
    fs.exists(LOG_FILE, this.async(as(0)));
  },
  // Read in the file.
  function loadLog1(exists) {
    if (!exists) {
      this.end();
    }
    else {
      fs.readFile(LOG_FILE, this.async());
    }
  },
  // Return log contents.
  function loadLogEnd(contents) {
    if (this.err) {
      exports.error('Error loading log file: ' + this.err.message);
      this.err = null;
      this.next();
      this.data.callback();
      return;
    }
    if (contents) {
      this.data.callback(contents);
    }
  }
);
