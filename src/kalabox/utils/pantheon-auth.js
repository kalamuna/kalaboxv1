/**
 * Functionality for storing, retrieving, and using user's Pantheon credentials.
 *
 * Copyright 2013 Kalamuna LLC
 */

// Dependencies:
var flow = require('nue').flow,
    as = require('nue').as,
    exec = require('child_process').exec,
    config = require('../../config');

// Variables:
var pantheonEmail = null,
    pantheonPassword = null;

// "CONSTANTS"
var KALASTACK_DIR = config.get('KALASTACK_DIR');

/**
 * Registers the user's Pantheon account email.
 *
 * @param string email
 *   A valid email address.
 */
exports.setEmail = function(email) {
  pantheonEmail = email;
};

/**
 * Registers the user's Pantheon account password.
 *
 * @param string password
 */
exports.setPassword = function(password) {
  pantheonPassword = password;
};

/**
 * Retrieves the user's registered email.
 *
 * @return string
 *   The user's email address, or null if one isn't registered.
 */
exports.getEmail = function() {
  return pantheonEmail;
};

/**
 * Signals the virtual machine to authenticate with Pantheon, passing it the username and password.
 * Will also pull down sites for rhe first time.
 *
 * @param function callback
 *   Function to call when complete, passing an error if one ocurred
 *   and a boolean result of the authentication.
 */
exports.authenticate = flow('authenticate')(
  function authenticate0(callback) {
    this.data.callback = callback;
    // Build command from site options.
    var command = 'KALABOX=on drush pauth ';
    command += pantheonEmail;
    if (pantheonPassword) {
      command += ' --password="' + pantheonPassword + '"';
    }
    // Run command against VM via Vagrant.
    exec('vagrant ssh -c \'' + command + '\'', {cwd: KALASTACK_DIR}, this.async());
  },
  function authenticate1() {
    refresh(this.async());
  },
  function authenticate2() {
    // Set gitconfig
    var command = 'KALABOX=on drush tset ';
    // Run command against VM via Vagrant.
    exec('vagrant ssh -c \'' + command + '\'', {cwd: KALASTACK_DIR}, this.async());
  },
  function authenticateEnd(stdout, stderr) {
    if (this.err) {
      this.data.callback(this.err);
      this.err = null;
    }
    else {
      this.data.callback(null, true);
    }
    this.next();
  }
);


/**
 * Signals the virtual machine to download aliases from Pantheon
 *
 * @param function callback
 *   Function to call when complete, passing an error if one ocurred
 */
var refresh = exports.refresh = flow('refresh')(
  function refresh0(callback) {
    this.data.callback = callback;
    // Build command
    var command = 'KALABOX=on drush ta';
    // Run command against VM via Vagrant.
    exec('vagrant ssh -c \'' + command + '\'', {cwd: KALASTACK_DIR}, this.async());
  },
  function refreshEnd(stdout, stderr) {
    if (this.err) {
      this.data.callback(this.err);
      this.err = null;
    }
    else {
      this.data.callback(null, true);
    }
    this.next();
  }
);

/**
 * Signals the virtual machine to authenticate with Pantheon, passing it the username and password.
 * Will also pull down sites for rhe first time.
 *
 * @param function callback
 *   Function to call when complete, passing an error if one ocurred
 *   and a boolean result of the authentication.
 */
exports.close = flow('close')(
  function close0() {
    this.data.callback = callback;
    // Remove aliases
    var command = 'rm /etc/drush/pantheon.aliases.drushrc.php';
    exec('vagrant ssh -c \'' + command + '\'', {cwd: KALASTACK_DIR}, this.async());
  },
  function close1() {
    // Delete keychain entry
    deleteCredentials(this.async());
  },
  /* @todo we should do these things but right now they cause some weird problems.
  function close0(callback) {
    this.data.callback = callback;

    // Logout of Pantheon
    var command = 'KALABOX=on drush plogout';
    exec('vagrant ssh -c \'' + command + '\'', {cwd: KALASTACK_DIR}, this.async());
  },
  function close1() {
    // Destroy our cached key
    var command = 'KALABOX=on drush php-eval "drush_cache_clear_all(\\"*\\", \\"terminatur\\", TRUE);"';
    exec('vagrant ssh -c \'' + command + '\'', {cwd: KALASTACK_DIR}, this.async());
  },
  */
  function closeEnd(stdout, stderr) {
    if (this.err) {
      this.data.callback(this.err);
      this.err = null;
    }
    else {
      this.data.callback(null, true);
    }
    this.next();
  }
);

/**
 * Stores the user's email and password in the keychain for later use.
 *
 * @param (optional) function callback
 *   Function to call when complete, passing an error if one ocurred.
 */
exports.storeCredentials = flow('storeCredentials')(
  function storeCredentials0(callback) {
    this.data.callback = callback || null;
    // Check if we already have Kalabox credentials stored.
    loadCredentials(this.async(as(0)));
  },
  function storeCredentials1(credentials) {
    // If so, delete them before proceeding.
    if (credentials) {
      deleteCredentials(this.async());
    }
    else {
      this.next();
    }
  },
  function storeCredentials2() {
    // Save new credentials.
    console.log("about to save to keychain" + pantheonEmail + pantheonPassword);
    exec('security add-generic-password -a "' + pantheonEmail + '" -s KalaboxPantheonAuth -w "' + pantheonPassword + '"', this.async());
  },
  function storeCredentialsEnd(stdout, stderr) {
    var error = null;
    if (this.err) {
      error = this.err;
      this.err = null;
    }
    if (this.data.callback) {
      this.data.callback(error);
    }
    this.next();
  }
);

/**
 * Loads the user's email and password from the keychain.
 *
 * @param function callback
 *   Function to call when complete, passing credentials if they were loaded, false if not.
 */
var loadCredentials = exports.loadCredentials = flow('loadCredentials')(
  function loadCredentials0(callback) {
    this.data.callback = callback;
    this.data.email = null;
    this.data.password = null;
    // Call on the keychain.
    exec('security find-generic-password -s KalaboxPantheonAuth -g', this.async({error: as(0), stdout: as(1), stderr: as(2)}));
  },
  function loadCredentials1(data) {
    // If no error, get password from cli output.
    if (!data.error && data.stderr) {
      var foundEmail = data.stdout.toString().match(/^\s+"acct"<blob>="(.+)"$/m);
      if (foundEmail && foundEmail[1]) {
        this.data.email = foundEmail[1];
      }
      var foundPass = data.stderr.toString().match(/^password: "(.+)"$/m);
      if (foundPass && foundPass[1]) {
        this.data.password = foundPass[1];
      }
    }
    this.next();
  },
  function loadCredentialsEnd() {
    if (this.err) {
      this.err = null;
    }
    var result = false;
    if (this.data.email && this.data.password) {
      result = {
        email: this.data.email,
        password: this.data.password
      };
    }
    this.data.callback(result);
    this.next();
  }
);

var deleteCredentials = flow('deleteCredentials')(
  function deleteCredentials0(callback) {
    this.data.callback = callback;
    exec('security delete-generic-password -s KalaboxPantheonAuth', this.async());
  },
  function deleteCredentialsEnd(stdout, stderr) {
    if (this.err) {
      throw new Error(this.err.message);
    }
    this.data.callback();
    this.next();
  }
);
