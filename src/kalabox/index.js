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

Kalabox.prototype.setDone = function(cb) {
  var self = this;
  self.done = true;
  cb(self);
}
