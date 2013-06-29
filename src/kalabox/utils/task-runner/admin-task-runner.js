/**
 * @file
 * Executes tasks that require admin level authorization.
 * Designed to be run as a standalone node process with root permissions.
 */

// Dependencies:
var exec = require('child_process').exec,
    messenger = require('messenger');

// Messenger connections for communicating with task runner:
var commandReceiver = messenger.createListener(8556),
    managerConnection = messenger.createSpeaker(8555);

// When task runner requests an install, run the specified package.
commandReceiver.on('installPackage', function(message, data) {
  exec('installer -pkg "' + data.location + '" -target "' + data.targetVolume + '"', function(error, stdout, stderr) {
    var response = {};
    if (error) {
      response.error = error;
    }
    message.reply(response);
  });
});

// When task runner requests box start, run "vagrant up".
commandReceiver.on('startBox', function(message, data) {
  exec('sudo echo \'something something something complete\' && sudo -u "' + data.user + '" vagrant up --no-provision', {cwd: data.cwd}, function(error, stdout, stderr) {
    var response = {};
    if (error) {
      response.error = error;
    }
    message.reply(response);
  });
});

setTimeout(function() {
  managerConnection.send('adminProcessStarted', {});
}, 1000);
