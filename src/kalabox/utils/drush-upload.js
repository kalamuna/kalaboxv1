/**
 * @file
 * Handles transportation of Drush aliases from local maching into Kalabox.
 */

// Constants
var TMPDIR = '/tmp/',
    PANTHEON_FILENAME = 'pantheon.aliases.drushrc.php';

// Requirements
var fs = require('fs'),
    flow = require('nue').flow,
    as = require('nue').as,
    exec = require('child_process').exec;

var uploadDrushFile = flow('uploadDrushFile')(
  // Write file to local tmp directory
  function uploadDrushFile0(drushAliasTxt, callback) {
    this.data.drushAliasTxt = drushAliasTxt;
    this.data.callback = callback;
    fs.writeFile(TMPDIR + PANTHEON_FILENAME, drushAliasTxt, this.async());
  },
  // scp file over to Kalabox
  function uploadDrushFile1() {
    exec('scp ' + TMPDIR + PANTHEON_FILENAME + ' vagrant@kala:/');
  },
);

exports.upload = function(drushAliasTxt){
  console.log('Got here');
  fs.writeFile(TMPDIR + 'pantheon.aliases.drushrc.php', drushAliasTxt, function(err) {
    if(err) {
        console.log(err);
    } else {
        console.log("Pantheon Alias saved to tmp");
    }
  });

  // scp file over to Kalabox
  console.log('Done here');
};