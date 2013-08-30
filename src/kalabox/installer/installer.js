/**
 * @file
 * Control flow for the Kalabox installer.
 *
 * Copyright 2013 Kalamuna LLC
 */

// Dependencies:
var flow = require('nue').flow,
    as = require('nue').as,
    parallel = require('nue').parallel,
    installUtils = require('./install-utils'),
    exec = require('child_process').exec,
    url = require('url'),
    fs = require('fs'),
    box = require('../box'),
    logger = require('../../logger'),
    config = require('../../config'),
    sudoRunner = require('../utils/task-runner/sudo-runner');

// "Constants":
var VBOX_URL = 'http://files.kalamuna.com/virtualbox-macosx-4.2.8.dmg',
    VBOX_VERSION = '4.2.8',
    TEMP_DIR = '/tmp/',
    VAGRANT_VERSION = config.get('VAGRANT_VERSION'),
    VAGRANT_URL = 'http://files.kalamuna.com/vagrant-macosx-' + VAGRANT_VERSION + '.dmg',
    VAGRANT_PLUGINS = config.get('VAGRANT_PLUGINS'),
    KALABOX_DIR = config.get('KALABOX_DIR'),
    KALABOX64_URL = 'http://files.kalamuna.com/kalabox64.box',
    KALABOX64_FILENAME = 'kalabox64.box',
    KALASTACK_DIR = config.get('KALASTACK_DIR'),
    KALASTACK_URL = config.get('KALASTACK_URL'),
    KALASTACK_FILENAME = 'kalastack.tar.gz',
    LICENSE_FILE = __dirname + '/../../LICENSE.txt';

// "Variables":
var socket,
    progressRunning = 0,
    progressFinal = 1600,
    progressWeight;

// Installer file info:
var vboxUrlParsed = url.parse(VBOX_URL);
vboxUrlParsed.packageLocation = '/Volumes/VirtualBox/VirtualBox.pkg';
var vagrantUrlParsed = url.parse(VAGRANT_URL);
vagrantUrlParsed.packageLocation = '/Volumes/Vagrant/Vagrant.pkg';

// Helper functions:
function downloadAndReport(url, destination, callback) {
  // Download file via the utils.
  installUtils.downloadFile(url, destination, function(error, percentDone) {
    if (percentDone < 100) {
      // Notify client of progress.
      installProgress = false;
      if (url.indexOf('dmg') !== -1) {
        installProgress = true;
      }
      sendProgress(percentDone, installProgress);
    }
    else {
      if (error) {
        installUtils.checkInternet(function(hasInternet) {
          if (!hasInternet) {
            error.message = 'No internet';
            io.sockets.emit('noInternet');
          }
          callback(error);
        });
      }
      else {
        callback(null);
      }
    }
  });
}

function sendMessage(message) {
  io.sockets.emit('installer', { message: message });
}

function sendIcon(icon, kalacolor) {
  io.sockets.emit('installer', { icon: icon, kalacolor: kalacolor});
}

function sendProgress(progress, install) {
  progressBump = progressWeight / 100;
  if (install) {
    realPercent = (progressRunning + ((((progress * progressBump) / progressFinal)) * 100) * .90);
  }
  else {
    realPercent = progressRunning + (((progress * progressBump) / progressFinal)) * 100;
  }
  io.sockets.emit('installer', { complete: realPercent });
}

function decreaseProgressFinal(progress) {
  progressFinal = progressFinal - progress;
}

/**
 * Get permission to install a specific program
 *
 * @param  string programName   Name of the program in text.
 */
var installPermission = flow('installPermission')(
  // Activate the permission request modal.
  function installPermission0(programName, callback) {
    this.data.programName = programName;
    this.data.callback = callback;
    io.sockets.emit('getPermission', { programName: this.data.programName});
    socket.on('permissionResponse', this.async(as(0)));
  },
  // If given permission, proceed. Otherwise, gracefully kill install.
  function installPermission1(permissionResponse) {
    if (permissionResponse.value !== true) {
      this.data.permissionGranted = permissionResponse.value;
    } else {
      this.data.permissionGranted = true;
    }

    this.next();

  },
  function installPermissionEnd() {
    if (this.err) {
      this.data.callback({ message: this.err.message });
      this.err = null;
    }
    this.data.callback(this.data.permissionGranted);
    this.next();
  }
);

/**
 * Downloads and installs a DMG file.
 *
 * @param object fileUrl
 *   URL object from url.parse().
 * @param string destination
 *   Directory to store downloaded DMGs, with trailing /.
 * @param string packageLocation
 *   Location of the installer package in the mounted DMG.
 * @param string programName
 *   Name of the software being installed.
 * @param function callback
 *   Callback to invoke on completion.
 */
var installDMG = flow('installDMG')(
  // Ask for permission to download.
  function installDMG0(fileUrl, destination, packageLocation, programName, validVersion, callback) {
    this.data.fileUrl = fileUrl;
    this.data.destination = destination;
    this.data.fileName = fileUrl.pathname.split('/').pop();
    this.data.packageLocation = packageLocation;
    this.data.programName = programName;
    this.data.validVersion = validVersion;
    this.data.callback = callback;
    if (this.data.validVersion === true) {
      this.next(true);
    } else {
      installPermission(programName, this.async(as(0)));
    }
  },
  // Begin installation process.
  function installDMG1(permissionGranted) {
    if (permissionGranted === true) {
      var mkdir = 'mkdir -p ' + this.data.destination;
      var child = exec(mkdir, this.async());
    } else {
      io.sockets.emit('noPermission');
      return;
    }
  },
  // Start downloads.
  function installDMG2() {
    // Download DMG.
    sendMessage('Downloading Stuff...');
    sendIcon('icon-download', 'kalagreen');
    downloadAndReport(this.data.fileUrl.href, this.data.destination, this.async());
  },
  // Confirm download succeeded.
  function installDMG3() {
    fs.exists(this.data.destination + this.data.fileName, this.async(as(0)));
  },
  // Mount disk image.
  function installDMG4(exists) {
    if (!exists) {
      this.endWith({message: 'Software DMG does not exist!'});
      return;
    }
    console.log('Software downloaded!');
    sendMessage('Configuring Things...');
    sendIcon('icon-cog', 'kalablue');
    exec('hdiutil attach ' + this.data.destination + this.data.fileName, this.async());
  },
  // Execute installer.
  function installDMG5(stdout, stderr) {
    console.log('DMG mounted.');
    sendMessage('Configuring Things...');
    sendIcon('icon-cog', 'kalablue');
    sudoRunner.runCommand('installer', ['-pkg', this.data.packageLocation, '-target', '/'], this.async());
  },
  // Unmount DMG after installation.
  function installDMG6(stdout, stderr) {
    console.log('Installed!');
    sendMessage('Configuring Things...');
    sendIcon('icon-cog', 'kalablue');
    var mountPoint = this.data.packageLocation.split('/');
    mountPoint.pop();
    mountPoint = mountPoint.join('/');
    exec('hdiutil detach ' + mountPoint, this.async());
  },
  function installDMGEnd(stdout, stderr) {
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
 * Route handler that installs Kalabox.
 */
var install = flow('installKalabox')(
  // Get asking for the user's password out of the way.
  function installGetPassword() {
    sudoRunner.runCommand('echo', ['We needs the passwordz...'], this.async());
  },
  // Check if VBox and Vagrant are installed.
  parallel('installGetVersions')(
    function install0() {
      installUtils.checkVBox(this.async(as(0)));
    },
    function install1() {
      installUtils.checkVagrant(this.async(as(0)));
    },
    function install2() {
      installUtils.checkbaseBox(this.async(as(0)));
    }
  ),
  // Check installed results against required versions.
  function install2(results) {
    this.data.vboxInstalled = false;
    this.data.vagrantInstalled = false;
    this.data.baseboxExists = false;
    this.data.vboxValidVersion = true;
    this.data.vagrantValidVersion = true;
    var vboxVersion = results[0];
    var vagrantVersion = results[1];
    var baseboxStatus = results[2];
    this.data.baseboxExists = baseboxStatus[0];
    // Parse and compare VBox version string.
    if (vboxVersion !== false && typeof vboxVersion[0] === 'string') {
      vboxVersion = vboxVersion[0].match(/^(\d+\.\d+\.\d+)r\d*\s*$/);
      if (vboxVersion !== null) {
        vboxVersion = vboxVersion[1];
        // Make sure VBox version is greater than or equal to required.
        if (installUtils.compareVersions(vboxVersion, VBOX_VERSION) >= 0) {
          this.data.vboxInstalled = true;
        } else {
          this.data.vboxValidVersion = false;
        }
      }
    }
    // Parse and compare Vagrant version string.
    if (vagrantVersion !== false && typeof vagrantVersion[0] === 'string') {
      vagrantVersion = vagrantVersion[0].match(/^Vagrant version (\d+\.\d+\.\d+)\s*$/);
      if (vagrantVersion !== null) {
        vagrantVersion = vagrantVersion[1];
        // Make sure Vagrant version equals required.
        if (installUtils.compareVersions(vagrantVersion, VAGRANT_VERSION) === 0) {
          this.data.vagrantInstalled = true;
        } else {
          this.data.vagrantValidVersion = false;
        }
      }
    }
    this.next();
  },
  // Download and install VBox.
  function install3() {
    // Set the amount this step should contribute to total install progress
    progressWeight = 300;

    if (!this.data.vboxInstalled) {
      installDMG(vboxUrlParsed, TEMP_DIR, vboxUrlParsed.packageLocation, 'VirtualBox', this.data.vboxValidVersion, this.async());
    }
    else {
      // If this step is already done we shouldnt reflect it in the installer
      decreaseProgressFinal(progressWeight);
      this.next();
    }
  },
  // Download and install Vagrant.
  function install4() {
    // Virtual Box not previously installed
    if (!this.data.vboxInstalled) {
      // Update the running progress when the intall is complete
      progressRunning = progressRunning + ((progressWeight / progressFinal) * 100);
      sendProgress(progressRunning);
    }

    // Set the amount this step should contribute to total install progress
    progressWeight = 100;
    // Start Vagrant Install
    if (!this.data.vagrantInstalled) {
      installDMG(vagrantUrlParsed, TEMP_DIR, vagrantUrlParsed.packageLocation, 'Vagrant', this.data.vagrantValidVersion, this.async());
    }
    else {
      // If this step is already done we shouldnt reflect it in the installer
      decreaseProgressFinal(progressWeight);
      this.next();
    }
  },
  // @todo Verify that VBox and Vagrant were installed successfully.
  // Create the .kalabox directory in home.
  function install5() {
    // Vagrant not previously installed
    if (!this.data.vagrantInstalled) {
      // Update the running progress when the intall is complete
      progressRunning = progressRunning + ((progressWeight / progressFinal) * 100);
      sendProgress(progressRunning);
    }
    // Create Kalabox dir
    exec('mkdir -p "' + KALABOX_DIR + '"', this.async());
  },
  // Download Kalabox image.
  function install6(stdout, stderr) {
    // Set the amount this step should contribute to total install progress
    progressWeight = 1000;
    if (!this.data.baseboxExists) {
      sendMessage('Downloading Stuff...');
      sendIcon('icon-download', 'kalagreen');
      downloadAndReport(KALABOX64_URL, KALABOX_DIR, this.async());
    }
    else {
      decreaseProgressFinal(progressWeight);
      this.next();
    }
  },
  // Verify Kalabox was downloaded.
  function install7() {
    fs.exists(KALABOX_DIR + KALABOX64_FILENAME, this.async(as(0)));
  },
  // Download Kalastack archive from GitHub if download made it.
  function install8(exists) {
    if (!exists) {
      this.endWith({message: 'Failed to download Kalabox image.'});
      return;
    }
    else if (exists && !this.data.baseboxExists) {
      // Update total progress after box is DLed but only if box wasnt previously DLed
      progressRunning = progressRunning + ((progressWeight / progressFinal) * 100);
    }
    sendMessage('Downloading Stuff...');
    sendIcon('icon-download', 'kalagreen');
    installUtils.downloadKalastack(KALABOX_DIR, KALASTACK_FILENAME, KALASTACK_URL, KALASTACK_DIR, this.async());
  },
  // Download Vagrant plugins.
  function install9() {
    sendMessage('Kalaboxing...');
    sendIcon('icon-kalabox', 'kalaclear');
    // Set the amount this step should contribute to total install progress
    progressWeight = 200;
    if (typeof VAGRANT_PLUGINS.length === 'undefined' || VAGRANT_PLUGINS.length < 1) {
      this.next();
    }
    else {
      this.asyncEach(1)(VAGRANT_PLUGINS, function(plugin, group) {
        exec('vagrant plugin install ' + plugin, {cwd: KALASTACK_DIR}, group.async());
      });
    }
  },
  // Check to make sure a kalabox isn't already in Vagrant.
  function install10() {
    // Increment final "step" to 10%
    sendProgress(10);
    exec('vagrant box list', this.async());
  },
  // Start box build from Kalabox image if necessary.
  function install11(stdout, stderr) {
    var response = stdout.toString();
    if (response.indexOf('kalabox (virtualbox)') !== -1) {
      this.next();
    } else {
      exec('vagrant box add kalabox "' + KALABOX_DIR + KALABOX64_FILENAME + '"', {cwd: KALASTACK_DIR}, this.async());
    }
  },
  // Run a sudo command to get authentication.
  function install12(stdout, stderr) {
    // Increment final "step" to 40%
    sendProgress(40);
    sudoRunner.runCommand('echo', ['something something something darkside!'], this.async());
  },
  // Finish box build with "vagrant up".
  function install13(output) {
    // Show this step as 70% complete
    sendProgress(70);
    exec('vagrant up', {cwd: KALASTACK_DIR}, this.async());
  },
  // Reinitialize the box module.
  function install14(stdout, stderr) {
    // Bump up the progress of this step to 100%
    sendProgress(100);
    box.initialize(this.async());
  },
  function installEnd() {
    if (this.err) {
      var userCanceled = (this.err.message.indexOf('User canceled') !== -1);
      if (this.err.message != 'No internet' && !userCanceled) {
        logger.error('Error during installation routine: ' + this.err.message);
      }
      if (userCanceled) {
        io.sockets.emit('noPermission');
      }
      this.err = null;
      this.next();
    }
    else {
      io.sockets.emit('installerComplete');
      this.next();
    }
  }
);

/**
 * Loads the license agreement.
 * @todo Could we combine this with the logic loading the error
 * log?
 *
 * @param function callback
 *   Function to call with the contents of the log file.
 */
exports.loadLicense = flow('loadLicense')(
  // Check if LICENSE.txt exists.
  function loadLicense0(callback) {
    this.data.callback = callback;
    fs.exists(LICENSE_FILE, this.async(as(0)));
  },
  // Read in the file.
  function loadLicense1(exists) {
    if (!exists) {
      this.end();
    }
    else {
      fs.readFile(LICENSE_FILE, this.async());
    }
  },
  // Return log contents.
  function loadLicenseEnd(contents) {
    if (this.err) {
      exports.error('Error loading log file: ' + this.err.message);
      this.err = null;
      this.next();
      this.data.callback();
      return;
    }
    if (contents) {
      this.data.callback(contents);
    }
  }
);


// Flow for getting user's sign off on the license.
// @todo: Perhaps combine this with the Vagrant/Vbox upload logic
// to reduce code duplication.
var getUserLicenseAcceptance = flow('getUserLicenseAcceptance')(
  // Activate the license review modal.
  function getUserLicenseAcceptance0(callback) {
    this.data.callback = callback;
    io.sockets.emit('licenseReview');
    socket.on('permissionResponse', this.async(as(0)));
  },
  // If given permission, proceed. Otherwise, gracefully kill install.
  function getUserLicenseAcceptance1(permissionResponse) {
    if (permissionResponse.value !== true) {
      this.data.permissionGranted = permissionResponse.value;
    } else {
      this.data.permissionGranted = true;
    }

    this.next();

  },
  function getUserLicenseAcceptanceEnd() {
    if (this.err) {
      this.data.callback({ message: this.err.message });
      this.err = null;
    }
    this.data.callback(this.data.permissionGranted);
    this.next();
  }
);

/**
 * Initializes the controller, binding to events from client and other modules.
 */
exports.initialize = function() {
  // Bind handlers for communication events coming from the client.
  io.sockets.on('connection', function (newSocket) {
    socket = newSocket;
    // Before we start install, have the user accept the license agreement.
    getUserLicenseAcceptance(function(userAccepted) {
      if (userAccepted) {
        install();
      } else {
        io.sockets.emit('noPermission');
        return;
      }
    });
  });
};
