/**
 * Manages resources on the host machine.
 *
 * Copyright 2013 Kalamuna LLC
 */

// Dependencies:
var flow = require('nue').flow,
    as = require('nue').as,
    sudoRunner = require('./task-runner/sudo-runner'),
    config = require('../../config'),
    utils = require('./utils'),
    exec = require('child_process').exec;

// "Constants":
var HOSTS_TAG = ' # KALABOX SITE',
    VM_IP = config.get('VM_IP'),
    NODE_BIN = utils.escapeSpaces(process.execPath),
    HOSTS_SCRIPT = utils.escapeSpaces(config.root + '/scripts/hosts.js');

/**
 * Adds an entry to the host machine's /etc/hosts file pointing to the VM's IP.
 *
 * @param string url
 *   URL to add.
 * @param function callback
 *   Function to call when finished, sending error if one occured.
 */
exports.addHostsEntry = flow('addHostsEntry')(
  function addHostsEntry0(url, callback) {
    this.data.callback = callback;
    sudoRunner.runCommand(NODE_BIN, [HOSTS_SCRIPT, 'add', url, VM_IP], this.async());
  },
  function addHostsEntryEnd(response) {
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

/**
 * Removes an entry from the host machine's /etc/hosts file.
 *
 * @param string url
 *   URL to remove.
 * @param function callback
 *   Function to call when finished, sending error if one occured.
 */
exports.removeHostsEntry = flow('removeHostsEntry')(
  function removeHostsEntry0(url, callback) {
    this.data.callback = callback;
    sudoRunner.runCommand(NODE_BIN, [HOSTS_SCRIPT, 'remove', url, VM_IP], this.async());
  },
  function removeHostsEntryEnd(response) {
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
