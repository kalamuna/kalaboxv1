/**
 * @file
 * Unit tests for the Kalabox object.
 */

// Dependencies:
var box = require('../kalabox/box');

// "Constants":
var BOX_INSTALLED = false; // Set this to true or false depending on if you have Kalabox installed or not.

describe('The Box object', function() {

  // Test installed check.
  it('can check if the Kalabox is installed and ready', function() {
    var initialized = false;

    runs(function() {
      box.initialize(function() {
        initialized = true;
      });
    });

    waitsFor(function() {
      return initialized;
    }, 'The Box should initialize.', 4000);

    runs(function() {
      var installed = box.isInstalled();
      console.log('Kalabox installed: ' + installed);
      expect(installed).toEqual(BOX_INSTALLED);
    });

  });

});
