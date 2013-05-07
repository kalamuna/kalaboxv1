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
//var VBOX_URL = 'http://files.kalamuna.com/virtualbox-macosx-4.2.8.dmg';
var VBOX_URL = 'http://wills-drupal-practice.kala/virtualbox-macosx-4.2.8.dmg',
    VBOX_VERSION = '4.2.8',
    DOWNLOAD_DIR = '/tmp/',
    VAGRANT_URL = 'http://files.kalamuna.com/vagrant-macosx-1.1.2.dmg',
    VAGRANT_VERSION = '1.1.2';

// Helder variables:
var vboxUrlParsed = url.parse(VBOX_URL);
vboxUrlParsed.fileName = vboxUrlParsed.pathname.split('/').pop();

// Helper functions:
function downloadAndReport(url, callback) {
  // Download file via the utils.
  installUtils.downloadFile(url, DOWNLOAD_DIR, function(percentDone) {
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
 * Route handler that installs Kalabox.
 *
 * @param  object req
 *   Request object.
 * @param  object res
 *   Response object.
 */
exports.install = flow('install')(
  // Render and begin installation process.
  function install0() {
    // We will be downloading the files to a directory, so make sure it's there
    // This step is not required if you have manually created the directory.
    var mkdir = 'mkdir -p ' + DOWNLOAD_DIR;
    var child = exec(mkdir, this.async());
  },
  // @todo Check if dependent software are installed.
  // function installx() {}
  // Start downloads.
  function install1() {
    // Download vbox.
    downloadAndReport(VBOX_URL, this.async());
  },
  // Confirm download succeeded.
  function install2() {
    fs.exists(DOWNLOAD_DIR + vboxUrlParsed.fileName, this.async(as(0)));
  },
  function install3(exists) {
    if (!exists) {
      this.endWith({message: 'VBox DMG does not exist!'});
      return;
    }
    //exec('hdiutil attach ' + this.data.dmg, this.async());
    console.log('Vbox downloaded!');
  },
  /*function install4(stdout, stderr) {
    exec('sudo installer -pkg /Volumes/VirtualBox/VirtualBox.mpkg -target "/Volumes/Macintosh HD"', this.async());
  },
  function installVBox5(stdout, stderr) {

  },*/
  function installEnd() {
    if (this.err) {
      console.log(this.err.message);
      throw this.err;
    }
  }
);
