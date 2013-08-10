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
    exec = require('child_process').exec;

// "Constants":
var HOSTS_TAG = ' # KALABOX SITE',
    VM_IP = config.get('VM_IP');

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
    this.data.entry = VM_IP + '  ' + url + HOSTS_TAG;
    // Gotta ghetto this for now
    sudoRunner.runCommand('echo', ['wiki wiki wild wild west'], this.async());
  },
  function addHostsEntry1(response) {
    // This should eventually use sudo-runner
    exec('sudo sh -c "echo \'' + this.data.entry + '\' >> /etc/hosts"', this.async());
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
    url = url.replace('.', '\\.');
    var sedString = "/" + url + HOSTS_TAG + "/d";
    sudoRunner.runCommand('sed', ['-i.bak', '-e', sedString, '/etc/hosts'], this.async());
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
