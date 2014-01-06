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
    exec = require('child_process').exec,
    fs = require('fs'),
    _ = require('underscore');

// "Constants":
var VM_IP = config.get('VM_IP'),
    NODE_BIN = utils.escapeSpaces(process.execPath),
    HOSTS_SCRIPT = utils.escapeSpaces(config.root + '/scripts/hosts.js'),
    KALASTACK_DIR = config.get('KALASTACK_DIR'),
    SSH_EXPORTS = {
      SSH_ASKPASS: utils.escapeSpaces(config.root + '/vendor/mac-ssh-askpass/ssh-askpass'),
      DISPLAY: 'x11'
    };

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

/**
 * Gets the Kalabox ID for the virtual machine.
 *
 * @return string|bool
 *   Kalabox's ID, or false if unable to get it.
 */
var getKalaboxId = exports.getKalaboxId = function() {
  var idPath = KALASTACK_DIR + '.kalabox/uuid';
  try {
    return fs.readFileSync(idPath).toString();
  }
  catch (error) {
    return false;
  }
};

/**
 * Gets the VirtualBox ID for the virtual machine.
 *
 * @return string|bool
 *   VM's ID, or false if unable to get it.
 */
exports.getVBoxId = function() {
  var idPath = KALASTACK_DIR + '.vagrant/machines/default/virtualbox/id';
  try {
    return fs.readFileSync(idPath).toString();
  }
  catch (error) {
    return false;
  }
};

/**
 * Checks if a supplied ID matches the ID returned by VirtualBox.
 *
 * @param string id
 *   The ID to verify.
 * @param function callback
 *   Function to call with error if there's one, and true if ID is correct
 *   or the correct ID if it isn't.
 */
exports.verifyVBoxId = flow('verifyVBoxId')(
  function verifyVBoxId0(id, callback) {
    this.data.callback = callback;
    this.data.id = id;
    // Get Kalabox's UUID.
    this.data.uuid = getKalaboxId();
    // Retrieve the correct VirtualBox ID.
    exec('vboxmanage list vms', this.async({error: as(0), stdout: as(1), stderr: as(2)}));
  },
  function verifyVBoxId2(data) {
    var uuid = this.data.uuid.replace(/\./g, '\\.'),
        regex = new RegExp('^"' + uuid + '"\\s+\\{([a-zA-Z0-9-]+)\\}$', 'm'),
        stdout = data.stdout || '',
        output = stdout.toString(),
        matches = output.match(regex);
    if (matches && matches[1]) {
      this.next(matches[1]);
    }
    else {
      this.next('NO_ID');
    }
  },
  function verifyVBoxIdEnd(verifiedId) {
    if (this.err) {
      this.data.callback(this.err);
      this.err = null;
    }
    else {
      if (this.data.id == verifiedId) {
        this.data.callback(null, 'correct');
      }
      else {
        this.data.callback(null, verifiedId);
      }
    }
    this.next();
  }
);

/**
 * Overwrites the VirtualBox ID that Vagrant is using.
 *
 * @param string id
 *   The ID to write over the current one.
 */
exports.fixVBoxId = function(id) {
  fs.writeFileSync(KALASTACK_DIR + '.vagrant/machines/default/virtualbox/id', id);
};

/**
 * Gets environment variables with our SSH_ASKPASS script set.
 *
 * @return object
 *   Object with all environment variables plus our custom ssh-related ones.
 */
exports.getSSHEnv = function() {
  return _.extend({}, process.env, SSH_EXPORTS);
};
