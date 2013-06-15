/**
 * Manages the SSH connection to the Kalabox virtual machine.
 */

// Dependencies:
var SSH2 = require('ssh2'),
    flow = require('nue').flow,
    as = require('nue').as;

// Data objects:
var sshConnection,
    currentCallback;

/**
 * Retrieves an SSH connection to the Kalabox, creating it if necessary.
 *
 * @param function callback
 *   Callback function to call with error or connection object (callback(error, connection)).
 */
exports.getConnection = function(callback) {
  currentCallback = callback;
  // If we have an existing connection, return it.
  if (sshConnection) {
    callback(null, sshConnection);
    return;
  }
  // Otherwise, connect to the VM.
  sshConnection = new SSH2();
  sshConnection.on('ready', onReady);
  sshConnection.on('error', onError);
  sshConnection.on('end', onClose);
  sshConnection.on('close', onClose);
  sshConnection.connect({
    host: 'kala',
    port: 22,
    username: 'vagrant',
    password: 'vagrant'
  });
};

/**
 * Ends the SSH connection to the virtual machine.
 */
exports.disconnect = function() {
  if (sshConnection) {
    sshConnection.end();
  }
};

/**
 * Sends connection object to caller once connection is established.
 */
function onReady() {
  currentCallback(null, sshConnection);
}

/**
 * Sends error object to caller when one occurs.
 */
function onError(error) {
  currentCallback(error, null);
}

/**
 * Nulls out the connection object when the connection is closed.
 */
function onClose() {
  sshConnection = null;
}

/**
 * Runs a shell command on the VM and sends the results.
 *
 * @param string command
 *   The command to run.
 * @param function callback
 *   Callback function to call with error or command result (callback(error, result)).
 */
exports.runCommand = flow('runCommand')(
  function runCommand0(command, callback) {
    this.data.command = command;
    this.data.callback = callback;
    exports.getConnection(this.async());
  },
  function runCommand1(connection) {
    // Strangely, sshConnection is set to an array with the
    // connection object as its first element.
    connection = connection[0];
    // Execute command and get the response from the stream object.
    this.data.response = '';
    var that = this;
    connection.exec(this.data.command, function(error, stream) {
      if (error) {
        that.endWith(error);
        return;
      }
      stream.on('data', function(data, type) {
        if (type === 'stderr') {
          that.endWith({message: data.toString()});
          return;
        }
        that.data.response += data.toString();
      });
      stream.on('close', that.async(as(0)));
    });
  },
  // Send result or error to the client.
  function runCommandEnd(code) {
    if (this.err) {
      this.data.callback({message: this.err.message}, null);
      this.err = null;
    }
    else {
      this.data.callback(null, this.data.response);
    }
    this.next();
  }
);
