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
var socket;

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
      io.sockets.emit('installer', { complete: percentDone });
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
      io.sockets.emit('noPermission');
      this.endWith({message: "We don't have permission to install " + this.data.programName + ", aborting install."});
      return;
    } else {
      this.data.permissionGranted = true;
      this.next();
    }

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
  function installDMG0(fileUrl, destination, packageLocation, programName, callback) {
    this.data.fileUrl = fileUrl;
    this.data.destination = destination;
    this.data.fileName = fileUrl.pathname.split('/').pop();
    this.data.packageLocation = packageLocation;
    this.data.programName = programName;
    this.data.callback = callback;
    installPermission(programName, this.async(as(0)));
  },
  // Begin installation process.
  function installDMG1(permissionGranted) {
    if (permissionGranted == true) {
      var mkdir = 'mkdir -p ' + this.data.destination;
      var child = exec(mkdir, this.async());
    } else {
      this.endWith({message: 'Permission Denied! User likes their ' + this.data.programName + ' version too much to part ways with it. Re-run installer if you change your mind.'});
      return;
    }
  },
  // Start downloads.
  function installDMG2() {
    // Download DMG.
    sendMessage('Downloading ' + this.data.programName + '...');
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
    sendMessage('Mounting ' + this.data.programName + ' image...');
    exec('hdiutil attach ' + this.data.destination + this.data.fileName, this.async());
  },
  // Execute installer.
  function installDMG5(stdout, stderr) {
    console.log('DMG mounted.');
    sendMessage('Installing ' + this.data.programName + '...');
    taskManager.executeAdminTask('installPackage', {
      location: this.data.packageLocation,
      targetVolume: '/'
    }, this.async());
    // @todo Handle user cancelling or failing admin authentication.
  },
  // Unmount DMG after installation.
  function installDMG6(stdout, stderr) {
    console.log('Installed!');
    sendMessage('Installed! Ejecting image...');
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
    this.data.callback();
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
    }
  ),
  // Check installed versions against required versions.
  function install2(versions) {
    this.data.vboxInstalled = false;
    this.data.vagrantInstalled = false;
    var vboxVersion = versions[0];
    var vagrantVersion = versions[1];
    // Parse and compare VBox version string.
    if (vboxVersion !== false && typeof vboxVersion[0] === 'string') {
      vboxVersion = vboxVersion[0].match(/^(\d+\.\d+\.\d+)r\d*\s*$/);
      if (vboxVersion !== null) {
        vboxVersion = vboxVersion[1];
        // Make sure VBox version is greater than or equal to required.
        if (installUtils.compareVersions(vboxVersion, VBOX_VERSION) >= 0) {
          this.data.vboxInstalled = true;
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
        }
      }
    }
    console.log("VBox installed: " + this.data.vboxInstalled);
    console.log("Vagrant installed: " + this.data.vagrantInstalled);
    this.next();
  },
  // Download and install VBox.
  function install3() {
    if (!this.data.vboxInstalled) {
      installDMG(vboxUrlParsed, TEMP_DIR, vboxUrlParsed.packageLocation, 'VirtualBox', this.async());
    }
    else {
      this.next();
    }
  },
  // Download and install Vagrant.
  function install4() {
    console.log('VirtualBox Installed');
    if (!this.data.vagrantInstalled) {
      installDMG(vagrantUrlParsed, TEMP_DIR, vagrantUrlParsed.packageLocation, 'Vagrant', this.async());
    }
    else {
      this.next();
    }
  },
  // @todo Verify that VBox and Vagrant were installed successfully.
  // Create the .kalabox directory in home.
  function install5() {
    console.log('Vagrant installed.');
    exec('mkdir -p "' + KALABOX_DIR + '"', this.async());
  },
  // Download Kalabox image.
  function install6(stdout, stderr) {
    sendMessage('Downloading the Kalabox Ubuntu image...');
    downloadAndReport(KALABOX64_URL, KALABOX_DIR, this.async());
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
    sendMessage('Downloading Kalastack...');
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
    sudoRunner.runCommand('echo', ['something something something darkside!'], this.async(as(0)));
  },
  // Finish box build with "vagrant up".
  function install13(output) {
    exec('vagrant up', {cwd: KALASTACK_DIR}, this.async());
  },
  // Reinitialize the box module.
  function install14(stdout, stderr) {
    box.initialize(this.async());
  },
  function installEnd() {
    if (this.err) {
      if (this.err.message == 'No internet') {
        logger.error('Error during installation routine: ' + this.err.message);
      }
      this.err = null;
      this.next();
    }
    else {
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
