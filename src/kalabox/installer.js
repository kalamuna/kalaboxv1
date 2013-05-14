/**
 * @file
 * Control flow for the Kalabox installer.
 */

// Dependencies:
var flow = require('nue').flow,
    as = require('nue').as,
    installUtils = require('./utils/install-utils'),
    exec = require('child_process').exec,
    url = require('url'),
    fs = require('fs');

// "Constants":
var VBOX_URL = 'http://files.kalamuna.com/virtualbox-macosx-4.2.8.dmg';
    VBOX_VERSION = '4.2.8',
    DOWNLOAD_DIR = '/tmp/',
    VAGRANT_URL = 'http://files.kalamuna.com/vagrant-macosx-1.1.2.dmg',
    VAGRANT_VERSION = '1.1.2';

// Installer file info:
var vboxUrlParsed = url.parse(VBOX_URL);
vboxUrlParsed.packageLocation = '/Volumes/VirtualBox/VirtualBox.mpkg';
var vagrantUrlParsed = url.parse(VAGRANT_URL);
vagrantUrlParsed.packageLocation = '/Volumes/Vagrant/Vagrant.pkg';

// Helper functions:
function downloadAndReport(url, destination, callback) {
  // Download file via the utils.
  installUtils.downloadFile(url, destination, function(percentDone) {
    if (percentDone < 100) {
      // Notify client of progress.
      io.sockets.emit('vbox', { complete: percentDone });
    }
    else {
      callback();
    }
  });
}

/**
 * Downloads and installs a DMG file.
 *
 * @param  object fileUrl
 *   URL object from url.parse().
 * @param  string destination
 *   Directory to store downloaded DMGs, with trailing /.
 * @param  string packageLocation
 *   Location of the installer package in the mounted DMG.
 */
var installDMG = flow('installDMG')(
  // Begin installation process.
  function install0(fileUrl, destination, packageLocation) {
    this.data.fileUrl = fileUrl;
    this.data.destination = destination;
    this.data.fileName = fileUrl.pathname.split('/').pop();
    this.data.packageLocation = packageLocation;
    // We will be downloading the files to a directory, so make sure it's there
    // This step is not required if you have manually created the directory.
    var mkdir = 'mkdir -p ' + destination;
    var child = exec(mkdir, this.async());
  },
  // Start downloads.
  function install1() {
    // Download vbox.
    downloadAndReport(this.data.fileUrl.href, this.data.destination, this.async());
  },
  // Confirm download succeeded.
  function install2() {
    fs.exists(this.data.destination + this.data.fileName, this.async(as(0)));
  },
  // Mount disk image.
  function install3(exists) {
    if (!exists) {
      this.endWith({message: 'Software DMG does not exist!'});
      return;
    }
    console.log('Software downloaded!');
    exec('hdiutil attach ' + this.data.destination + this.data.fileName, this.async());
  },
  // Execute installer.
  function install4(stdout, stderr) {
    console.log('DMG mounted.');
    exec('osascript ' + __dirname + '/install_command.scpt ' + '"' + this.data.packageLocation + '" "/"', this.async());
  },
  // Unmount DMG after installation.
  function installVBox5(stdout, stderr) {
    console.log('Installed!');
    var mountPoint = this.data.packageLocation.split('/');
    mountPoint.pop();
    mountPoint = mountPoint.join('/');
    exec('hdiutil detach ' + mountPoint, this.async());
  },
  function installEnd(stdout, stderr) {
    if (this.err) {
      console.log(this.err.message);
      throw this.err;
    }
  }
);

/**
 * Route handler that installs Kalabox.
 */
exports.install = function() {
  // @todo Check if VBox and Vagrant are installed.
  // Download and install Vagrant.
  installDMG(vagrantUrlParsed, DOWNLOAD_DIR, vagrantUrlParsed.packageLocation);
};
