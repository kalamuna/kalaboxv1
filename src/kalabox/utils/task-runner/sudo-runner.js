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
      getPassword(this.async(as(0)));
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
      // If command asking for password, enter it.
      if (data.toString().indexOf('Password:') !== -1) {
        command.stdin.write(password + '\n');
      }
    });
    command.stdout.on('data', function(data) {
      // Record any output from the command.
      that.data.output += data.toString();
    });
    command.on('exit', this.async({code: as(0), signal: as(1)}));
  },
  function runCommandEnd(data) {
    if (this.err) {
      console.log(this.err.message);
      throw this.err;
    }
    this.data.callback(this.data.output);
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
    // Get password from the user.
    exec('osascript sudo-pass.scpt', {cwd: __dirname}, this.async());
  },
  function getPassword1(stdout, stderr) {
    var password = stdout.toString().match(/text returned:(.+), button returned/);
    if (!password[1]) {
      this.endWith({message: 'Unable to retrieve password.'});
    }
    password = password[1];
    this.data.password = password;
    // Add password to keychain.
    exec('security add-generic-password -a "' + process.env.USER + '" -s Kalabox -w "' + password + '"', this.async());
  },
  function getPasswordEnd(stdout, stderr) {
    if (this.err) {
      console.log(this.err.message);
      throw this.err;
    }
    this.data.callback(this.data.password);
  }
);
