/**
 * @file
 * Handles transportation of Drush aliases from local maching into Kalabox.
 *
 * Copyright 2013 Kalamuna LLC
 */

// Dependencies:
var fs = require('fs'),
    flow = require('nue').flow,
    as = require('nue').as,
    connector = require('./connector');

// "Constants":
var ALIAS_FILE = 'aliases.drushrc.php';

/**
 * Uploads Drush aliases file to the VM via SFTP.
 *
 * @param string fileContent
 *   Contents of the aliases file to write.
 * @param function callback
 *   Callback which will be passed error if one occurs.
 */
exports.upload = flow('uploadDrushFile')(
  // Write file to local tmp directory.
  function uploadDrushFile0(fileContent, callback) {
    this.data.callback = callback;
    this.data.fileContent = fileContent;
    connector.getConnection(this.async());
  },
  // Open SFTP through connection.
  function uploadDrushFile1(connection) {
    connection = connection[0];
    connection.sftp(this.async());
  },
  // SFTP file over to Kalabox.
  function uploadDrushFile2(sftp) {
    sftp = sftp[0];
    this.data.sftp = sftp;
    var stream = sftp.createWriteStream('/etc/drush/aliases/' + ALIAS_FILE);
    stream.write(this.data.fileContent, this.async());
  },
  function uploadDrushFileEnd() {
    if (this.err) {
      console.log('Unable to upload alias file');
      console.log(this.err.message);
      this.data.callback({message: this.err.message});
      this.err = null;
    }
    else {
      this.data.sftp.end();
      this.data.callback();
    }
    this.next();
  }
);
