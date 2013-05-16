/**
 * @file
 * Control flow for the Kalabox installer.
 */

// Dependencies:
var flow = require('nue').flow,
    as = require('nue').as,
    parallel = require('nue').parallel,
    installUtils = require('./utils/install-utils'),
    exec = require('child_process').exec,
    url = require('url'),
    fs = require('fs');

// "Constants":
var VBOX_URL = 'http://files.kalamuna.com/virtualbox-macosx-4.2.8.dmg';
    VBOX_VERSION = '4.2.8',
    TEMP_DIR = '/tmp/',
    VAGRANT_URL = 'http://files.kalamuna.com/vagrant-macosx-1.1.2.dmg',
    VAGRANT_VERSION = '1.1.2',
    KALABOX_DIR = process.env.HOME + '/.kalabox/',
    KALABOX64_URL = 'http://files.kalamuna.com/kalabox64.box',
    KALABOX64_FILENAME = 'kalabox64.box',
    KALASTACK_URL = 'https://codeload.github.com/kalamuna/kalastack/tar.gz/2.x',
    KALASTACK_FILENAME = 'kalastack.tar.gz';

// Installer file info:
var vboxUrlParsed = url.parse(VBOX_URL);
vboxUrlParsed.packageLocation = '/Volumes/VirtualBox/VirtualBox.pkg';
var vagrantUrlParsed = url.parse(VAGRANT_URL);
vagrantUrlParsed.packageLocation = '/Volumes/Vagrant/Vagrant.pkg';

// Helper functions:
function downloadAndReport(url, destination, callback) {
  // Download file via the utils.
  installUtils.downloadFile(url, destination, function(percentDone) {
    if (percentDone < 100) {
      // Notify client of progress.
      io.sockets.emit('installer', { complete: percentDone });
    }
    else {
      callback();
    }
  });
}

function sendMessage(message) {
  io.sockets.emit('installer', { message: message });
}

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
  // Begin installation process.
  function installDMG0(fileUrl, destination, packageLocation, programName, callback) {
    this.data.fileUrl = fileUrl;
    this.data.destination = destination;
    this.data.fileName = fileUrl.pathname.split('/').pop();
    this.data.packageLocation = packageLocation;
    this.data.programName = programName;
    this.data.callback = callback;
    // We will be downloading the files to a directory, so make sure it's there
    // This step is not required if you have manually created the directory.
    var mkdir = 'mkdir -p ' + destination;
    var child = exec(mkdir, this.async());
  },
  // Start downloads.
  function installDMG1() {
    // Download vbox.
    sendMessage('Downloading ' + this.data.programName + '...');
    downloadAndReport(this.data.fileUrl.href, this.data.destination, this.async());
  },
  // Confirm download succeeded.
  function installDMG2() {
    fs.exists(this.data.destination + this.data.fileName, this.async(as(0)));
  },
  // Mount disk image.
  function installDMG3(exists) {
    if (!exists) {
      this.endWith({message: 'Software DMG does not exist!'});
      return;
    }
    console.log('Software downloaded!');
    sendMessage('Mounting ' + this.data.programName + ' image...');
    exec('hdiutil attach ' + this.data.destination + this.data.fileName, this.async());
  },
  // Execute installer.
  function installDMG4(stdout, stderr) {
    console.log('DMG mounted.');
    sendMessage('Installing ' + this.data.programName + '...');
    exec('osascript ' + __dirname + '/install_command.scpt ' + '"' + this.data.packageLocation + '" "/"', this.async());
    // @todo Handle user cancelling or failing admin authentication.
  },
  // Unmount DMG after installation.
  function installDMG5(stdout, stderr) {
    console.log('Installed!');
    sendMessage('Installed! Ejecting image...');
    var mountPoint = this.data.packageLocation.split('/');
    mountPoint.pop();
    mountPoint = mountPoint.join('/');
    exec('hdiutil detach ' + mountPoint, this.async());
  },
  function installDMGEnd(stdout, stderr) {
    if (this.err) {
      console.log(this.err.message);
      throw this.err;
    }
    this.data.callback();
    this.next();
  }
);

/**
 * Route handler that installs Kalabox.
 */
exports.install = flow('installKalabox')(
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
    exec('mkdir -p ' + KALABOX_DIR, this.async());
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
    exec('curl -L -o ' + KALASTACK_FILENAME + ' ' + KALASTACK_URL, {cwd: KALABOX_DIR}, this.async());
  },
  // Verify Kalastack archive was downloaded.
  function install9(stdout, stderr) {
    fs.exists(KALABOX_DIR + KALASTACK_FILENAME, this.async(as(0)));
  },
  // Extract Kalastack from downloaded archive if download succeeded.
  function install10(exists) {
    if (!exists) {
      this.endWith({message: 'Failed to download Kalastack archive.'});
      return;
    }
    exec('tar zxvf ' + KALASTACK_FILENAME, {cwd: KALABOX_DIR}, this.async());
  },
  // @todo Delete Kalastack tar.gz file.
  // Start box build from Kalabox image.
  function install11(stdout, stderr) {
    console.log('Extracted Kalastack...');
    sendMessage('Building the box...');
    exec('vagrant box add kalabox ' + KALABOX_DIR + KALABOX64_FILENAME, {cwd: KALABOX_DIR + 'kalastack-2.x'}, this.async());
  },
  // Make sure the "vagrant up" shell script is executable.
  function install12(stdout, stderr) {
    exec('chmod +x ' + __dirname + '/vagrant_up.sh', this.async());
  },
  // Finish box build with "vagrant up".
  function install13(stdout, stderr) {
    console.log('Kalabox added');
    exec(__dirname + '/vagrant_up.sh', this.async());
  },
  function installEnd(stdout, stderr) {
    if (this.err) {
      console.log(this.err.message);
      throw this.err;
    }
    console.log('Box built!');
    sendMessage('Box built!');
    this.next();
  }
);
