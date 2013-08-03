/**
 * Manages resources on the host machine
 *
 * Copyright 2013 Kalamuna LLC
 */

// Dependencies:
var flow = require('nue').flow,
    as = require('nue').as,
    sudoRunner = require('./task-runner/sudo-runner');

// "Constants":
var HOSTS_TAG = ' # KALABOX SITE',
    VM_IP;

exports.addHostsEntry = flow('addHostsEntry')(
  function addHostsEntry0(url, callback) {
    this.data.callback = callback;
    var entry = '"' + VM_IP + ' ' + url + HOSTS_TAG + '"';
    sudoRunner.runCommand('echo', [entry, '>>', '/etc/hosts'], this.async());
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
