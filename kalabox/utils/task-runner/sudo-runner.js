/**
 * @file
 * Runs sudo commands with the necessary administrative password.
 *
 * Copyright 2013 Kalamuna LLC
 */

// Dependencies:
var exec = require('child_process').exec,
    spawn = require('child_process').spawn,
    flow = require('nue').flow,
    as = require('nue').as;

// "Constants":
var AUTH_RENEWAL_FREQUENCY = 180000;

// Variables:
var authRenewalInterval;

/**
 * Runs a command with sudo and the administrator password.
 *
 * @param string command
 *   The shell command to run.
 * @param array args
 *   Array of arguments to pass to the command.
 * @param function callback
 *   Callback function to which to pass output of command as a string.
 */
exports.runCommand = flow('runCommand')(
  function runCommand0(command, args, callback) {
    this.data.command = command;
    this.data.args = args;
    this.data.callback = callback;
    // Get password from keychain.
    exec('security find-generic-password -s Kalabox -g', this.async({error: as(0), stdout: as(1), stderr: as(2)}));
  },
  function runCommand1(data) {
    var password;
    // If no error, get password from cli output.
    if (!data.error && data.stderr) {
      var foundPass = data.stderr.toString().match(/^password: "(.+)"$/m);
      if (foundPass && foundPass[1]) {
        password = foundPass[1];
      }
    }
    // If no password found, get it from user.
    if (!password) {
      getPassword(this.async());
    }
    // If password, go to running the command.
    else {
      this.next(password);
    }
  },
  function runCommand2(password) {
    // Run command.
    var command = spawn('sudo', ['-S', this.data.command].concat(this.data.args));
    this.data.output = '';
    var that = this;
    command.stderr.on('data', function(data) {
      data = data.toString();
      // If command asking for password, enter it.
      if (data.indexOf('Password:') !== -1) {
        command.stdin.write(password + '\n');
      }
      else if (data.indexOf('Sorry, try again.') !== -1) {
        that.data.wrongPass = true;
      }
    });
    command.stdout.on('data', function(data) {
      // Record any output from the command.
      that.data.output += data.toString();
    });
    command.on('exit', this.async({code: as(0), signal: as(1)}));
  },
  function runCommand3() {
    // If user gave the wrong pass, start everything over.
    var that = this;
    if (this.data.wrongPass) {
      exports.removeKey(function(error) {
        if (error) {console.log('Error: ' + error);
          that.endWith(error);
          return;
        }
        exports.runCommand(that.data.command, that.data.args, that.data.callback);
      });
    }
    else {
      this.next();
    }
  },
  function runCommandEnd() {
    if (this.err) {
      this.data.callback(this.err);
      this.err = null;
    }
    else {
      this.data.callback(null, this.data.output);
    }
    this.next();
  }
);

/**
 * Removes the sudo key from the user's keychain.
 *
 * @param function callback
 *   Function to call when finished, sending error if one occured.
 */
exports.removeKey = flow('removeKey')(
  function removeKey0(callback) {
    this.data.callback = callback;
    exec('security delete-generic-password -s Kalabox', this.async());
  },
  function removeKeyEnd(stdout, stderr) {
    if (this.err && this.err.message.indexOf('The specified item could not be found in the keychain.') === -1) {
      this.data.callback({message: this.err.message});
    }
    else {
      this.data.callback();
    }
    this.err = null;
    this.next();
  }
);

/**
 * Start renewing sudo authentication on a regular interval.
 */
exports.startAuthRenewal = function() {
  authRenewalInterval = setInterval(renewSudoAuth, AUTH_RENEWAL_FREQUENCY);
};

/**
 * Halt periodic renewal of sudo authentication.
 */
exports.stopAuthRenewal = function() {
  clearInterval(authRenewalInterval);
};

/**
 * Renew sudo authentication so we aren't asked for a password.
 */
function renewSudoAuth() {
  exec('sudo -v');
}

/**
 * Gets password from the user, storing it in the keychain for later access.
 *
 * @param function callback
 *   Function to which to pass the retrieved password.
 */
var getPassword = flow('getPassword')(
  function getPassword0(callback) {
    this.data.callback = callback;
    this.data.password = '';
    // Get password from the user.
    exec('osascript sudo-pass.scpt', {cwd: __dirname}, this.async());
  },
  function getPassword1(stdout, stderr) {
    var password = stdout.toString().match(/text returned:(.+?), (?:button returned:OK, )?gave up:false/);
    if (password && password[1]) {
      password = password[1];
      this.data.password = password;
    }
    // Add password to keychain.
    exec('security add-generic-password -U -a "' + process.env.USER + '" -s Kalabox -w "' + this.data.password + '"', this.async());
  },
  function getPasswordEnd(stdout, stderr) {
    if (this.err) {
      this.data.callback(this.err);
      this.err = null;
    }
    else {
      this.data.callback(null, this.data.password);
    }
  }
);
