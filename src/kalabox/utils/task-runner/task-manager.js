/**
 * @file
 * Manages tasks run in other Node processes.
 */

// Dependencies:
var spawn = require('child_process').spawn,
    flow = require('nue').flow,
    as = require('nue').as,
    messenger = require('messenger');

// "Constants":
var ADMIN_PORT = 8556;

// State:
var adminProcessRunning = false;

// Messenger connections for communicating with separate processes:
var adminConnection = messenger.createSpeaker(ADMIN_PORT),
    receiver = messenger.createListener(8555);

// Processes:
var adminProcess;

/**
 * Executes a task with administrative privileges, prompting for a password if necessary.
 *
 * @param string task
 *   Name of the task to run.
 * @param object args
 *   Object with named properties for the executing command to use.
 * @param function callback
 *   Callback function to call. Will receive an error as a single argument if one occurs.
 */
exports.executeAdminTask = flow('executeAdminTask')(
  function executeAdminTask0(task, args, callback) {
    this.data.task = task;
    this.data.args = args;
    this.data.callback = callback;
    // Ensure the admin process has started.
    startAdminProcess(this.async());
  },
  function executeAdminTask1() {
    // Request that the admin task runner execute the given task.
    adminConnection.request(this.data.task, this.data.args, this.async(as(0)));
  },
  function executeAdminTaskEnd(data) {
    if (data && data.error) {
      this.err = data.error;
    }
    if (this.err) {
      // Delegate error handling to the callback.
      this.data.callback(this.err);
      this.err = null;
    }
    else {
      this.data.callback(null);
    }
    this.next();
  }
);

/**
 * Starts the Admin Task Runner, prompting the user for a password.
 */
function startAdminProcess(callback) {
  // If admin process is already running, skip startup routine.
  if (adminProcessRunning) {
    callback();
    return;
  }
  // Prompt the user for password to start the admin task runner.
  adminProcess = spawn('osascript', ['-e', 'do shell script "\'' + process.execPath + '\' admin-task-runner.js" with administrator privileges'], {cwd: __dirname});
  // When the Admin Task Runner reports it has started, signal the callback to continue.
  receiver.on('adminProcessStarted', function(message, data) {
    adminProcessRunning = true;
    callback();
  });
  // If the new process reports an error, notify the callback.
  adminProcess.stderr.on('data', function(data) {
    callback({message: data.toString()});
  });
  // When the new process exits, record the state change.
  adminProcess.on('exit', function(code, signal) {
    adminProcessRunning = false;
  });
}
