/**
 * @file
 * Control flow for the Kalabox installer.
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
    taskManager = require('../utils/task-runner/task-manager'),
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
    KALASTACK_FILENAME = 'kalastack.tar.gz';

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

function sendProgress(progress, install) {
  progressBump = progressWeight / 100;
  if (install) {
    //realPercent = (progressRunning + (((progress * (progressWeight) / progressFinal) * 100) * .90);
    realPercent = (progressRunning + ((((progress * progressBump) / progressFinal)) * 100) * .90);
  }
  else {
    realPercent = progressRunning + (((progress * progressBump) / progressFinal)) * 100;
  }
  io.sockets.emit('installer', { complete: realPercent });
}

function fauxProgress() {
  fauxer = setInterval(repeatFauxProgress, 1000);
  up = 0;
  function repeatFauxProgress() {
    up = up + (1/20);
    console.log("vagup " + up);
    sendProgress(up, true);
    if (up > 90) {
      clearInterval(fauxer);
    }
  }
}

function decreaseProgressFinal(progress) {
  progressFinal = progressFinal - progress;
}

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
    exec('hdiutil attach ' + this.data.destination + this.data.fileName, this.async());
  },
  // Execute installer.
  function installDMG5(stdout, stderr) {
    console.log('DMG mounted.');
    sendMessage('Configuring Things...');
    taskManager.executeAdminTask('installPackage', {
      location: this.data.packageLocation,
      targetVolume: '/'
    }, this.async());
    // @todo Handle user cancelling or failing admin authentication.
  },
  // Unmount DMG after installation.
  function installDMG6(stdout, stderr) {
    console.log('Installed!');
    sendMessage('Configuring Things...');
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
    // Simple true/false if basebox exists
    if (baseboxStatus === "false") {
      this.data.baseboxExists = false;
    }
    else if (baseboxStatus === "true") {
      this.data.baseboxExists = true;
    }
    console.log("VBox installed: " + this.data.vboxInstalled);
    console.log("Vagrant installed: " + this.data.vagrantInstalled);
    console.log("Basebox exists: " + this.data.baseboxExists);
    this.next();
  },
  // Download and install VBox.
  function install3() {
    progressWeight = 300;
    if (!this.data.vboxInstalled) {
      console.log("Vbox not installed " + progressFinal);
      installDMG(vboxUrlParsed, TEMP_DIR, vboxUrlParsed.packageLocation, 'VirtualBox', this.data.vboxValidVersion, this.async());
    }
    else {
      decreaseProgressFinal(progressWeight);
      console.log("VBox already installed " + progressFinal);
      this.next();
    }
  },
  // Download and install Vagrant.
  function install4() {
    // Virtual Box not previously installed
    if (!this.data.vboxInstalled) {
      console.log('VirtualBox Installed');
      progressRunning = progressRunning + ((progressWeight / progressFinal) * 100);
      sendProgress(progressRunning);
    }
    progressWeight = 100;
    // Start Vagrant Install
    if (!this.data.vagrantInstalled) {
      console.log("Vagrant not already installed" + progressFinal);
      installDMG(vagrantUrlParsed, TEMP_DIR, vagrantUrlParsed.packageLocation, 'Vagrant', this.data.vagrantValidVersion, this.async());
    }
    else {
      decreaseProgressFinal(progressWeight);
      console.log("Vagrant already installed " + progressFinal);
      this.next();
    }
  },
  // @todo Verify that VBox and Vagrant were installed successfully.
  // Create the .kalabox directory in home.
  function install5() {
    // Vagrant not previously installed
    if (!this.data.vagrantInstalled) {
      progressRunning = progressRunning + ((progressWeight / progressFinal) * 100);
      sendProgress(progressRunning);
      console.log('Vagrant installed.');
    }
    // Create Kalabox dir
    exec('mkdir -p "' + KALABOX_DIR + '"', this.async());
  },
  // Download Kalabox image.
  function install6(stdout, stderr) {
    progressWeight = 1000;
    if (!this.data.baseboxExists) {
      sendMessage('Downloading Stuff...');
      downloadAndReport(KALABOX64_URL, KALABOX_DIR, this.async());
    }
    else {
      decreaseProgressFinal(progressWeight);
      console.log("Box already DLed " + progressFinal);
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
    console.log('Downloaded Kalabox image.');
    if (!this.data.baseboxExists) {
      progressRunning = progressRunning + ((progressWeight / progressFinal) * 100);
    }

    sendMessage('Downloading Stuff...');
    installUtils.downloadKalastack(KALABOX_DIR, KALASTACK_FILENAME, KALASTACK_URL, KALASTACK_DIR, this.async());
  },
  // Download Vagrant plugins.
  function install9() {
    console.log('Extracted Kalastack...');
    sendMessage('Building the box...');
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
    console.log('Kalabox added');
    sudoRunner.runCommand('echo', ['something something something darkside!'], this.async());
  },
  // Finish box build with "vagrant up".
  function install13(output) {
    // @todo make this abstract in the future
    progressWeight = 200;
    //fauxProgress();
    exec('vagrant up', {cwd: KALASTACK_DIR}, this.async());
  },
  // Reinitialize the box module.
  function install14(stdout, stderr) {
    //clearInterval(fauxer);
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
      progressRunning = progressRunning + ((progressWeight / progressFinal) * 100);
      sendProgress(progressRunning);
      console.log('Box built!');
      io.sockets.emit('installerComplete');
      this.next();
    }
  }
);

/**
 * Initializes the controller, binding to events from client and other modules.
 */
exports.initialize = function() {
  // Bind handlers for communication events coming from the client.
  io.sockets.on('connection', function (newSocket) {
    socket = newSocket;
    install();
  });
};
