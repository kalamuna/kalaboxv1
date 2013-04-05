/**
 * Gives us info on the current state of the kalabox
 */

exports.createBox = function() {
  return new Kalabox;
}

function Kalabox() {
  this.vbox = false;
  this.vagrant = false;
  this.basebox = false;
  this.provisioned = false;
  this.boxed = false;
  this.done = false;
}



exports.refreshBox = function(box, cb) {
  box.setVBox(cb);
  box.setVagrant(cb);
  box.setDone(cb);
}

Kalabox.prototype.setVBox = function(cb) {
  var self = this;
  var exec = require('child_process').exec

  vbox = exec('VBoxManage -v', function(error, stdout, stderr) {
    if (error !== null) {
      self.vbox = false;
    } else {
      self.vbox = true;
    }
    cb(self);
  });
}

Kalabox.prototype.setVagrant = function(cb) {
  var self = this;
  var exec = require('child_process').exec

  vagrant = exec('vagrant --version', function(error, stdout, stderr) {
    if (error !== null) {
      self.vagrant = false;
    } else {
      self.vagrant = true;
    }
    cb(self);
  });
}

Kalabox.prototype.setDone = function(cb) {
  var self = this;
  self.done = true;
  cb(self);
}