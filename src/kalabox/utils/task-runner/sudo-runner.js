/**
 * @file
 * Runs sudo commands with the necessary administrative password.
 */

// Dependencies:
var exec = require('child_process').exec,
    spawn = require('child_process').spawn,
    flow = require('nue').flow,
    as = require('nue').as;

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
    exec('security find-generic-password -s Kalabox -w', this.async({error: as(0), stdout: as(1)}));
  },
  function runCommand1(data) {
    // If no password found, get it from user.
    if (data.error) {
      getPassword(this.async());
    }
    // If password, go to running the command.
    else {
      this.next(data.stdout.toString());
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
    if (this.err) {
      this.data.callback({message: this.err.message});
      this.err = null;
    }
    else {
      this.data.callback();
    }
    this.next();
  }
);

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
    var password = stdout.toString().match(/text returned:(.+), button returned/);
    if (password && password[1]) {
      password = password[1];
      this.data.password = password;
    }
    // Add password to keychain.
    exec('security add-generic-password -a "' + process.env.USER + '" -s Kalabox -w "' + this.data.password + '"', this.async());
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
