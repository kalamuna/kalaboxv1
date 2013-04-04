/**
 * Gives us info on the current state of the kalabox
 */

module.exports = Kalabox;

function hasVB() {
  return false;
}

function hasVagrant() {
  return false;
}

function hasBaseBox() {
  return false;
}

function hasProvisioner() {
  return false;
}

function isBoxed() {
  return false;
}

function Kalabox() {
  this.vagrant = hasVagrant();
  this.virtualbox = hasVB();
  this.basebox = hasBaseBox();
  this.provisioned = hasProvisioner();
  this.boxed = isBoxed()
}
