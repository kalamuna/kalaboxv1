/**
 * @file
 * Unit tests for parts of the Kalabox installer.
 */

// Dependencies:
var installUtils = require('../src/kalabox/utils/install-utils');

describe('Kalabox Installer', function() {

  // Test install util to compare version strings.
  it('can compare version strings', function() {
    var comparisonResult = installUtils.compareVersions('1.1.1', '1.0.3');
    expect(comparisonResult).toEqual(1);
    comparisonResult = installUtils.compareVersions('0.1.1', '1.0.3');
    expect(comparisonResult).toEqual(-1);
    comparisonResult = installUtils.compareVersions('0.1.0', '0.1.0');
    expect(comparisonResult).toEqual(0);
  });

});
