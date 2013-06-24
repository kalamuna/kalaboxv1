/**
 * @file
 * Handles transportation of Drush aliases from local maching into Kalabox.
 */

// Constants
var TMPDIR = '/tmp/';

// Requirements
var fs = require('fs'),
    flow = require('nue').flow,
    as = require('nue').as,
    exec = require('child_process').exec,
    Connection = require('ssh2');

exports.upload = flow('uploadDrushFile')(
  // Write file to local tmp directory
  function uploadDrushFile0(fileName, fileContent, callback) {
    this.data.fileName = fileName;
    this.data.fileContent = fileContent;
    this.data.callback = callback;
    console.log('MOTHER FUCKING TMP');
    fs.writeFile(TMPDIR + this.data.fileName, this.data.fileContent, this.async());
  },
  // Establish SSH connection
  function uploadDrushFile1() {
    var config = {'host': 'kala', 'username': 'vagrant', 'password': 'vagrant'};
    this.data.c = new Connection();
    this.data.c.connect(config);
    this.data.c.on('ready', this.async());
  },
  // Open SFTP through connection
  function uploadDrushFile2() {
    console.log('Connection :: ready');
    this.data.c.sftp(this.async());
  },
  // sft file over to Kalabox
  function uploadDrushFile3(sftp) {
    sftp.fastPut(TMPDIR + this.data.fileName, '/var/www/.drush', this.async());
  },
  function uploadDrushFileEnd() {
    if (this.err) {
      console.log('Unable to upload alias file');
      console.log(this.err.message);
      this.data.callback({message: this.err.message});
      this.err = null;
    }
    console.log('MOTHER FUCKING DONE');
    this.data.callback();
  }
);