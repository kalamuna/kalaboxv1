/**
 * @file
 * Tests for task running components.
 */

// Dependencies:
var sudoRunner = require('../kalabox/utils/task-runner/sudo-runner');

// Test the Sudo Runner.
describe('The Sudo Runner', function() {

  // Test running a command.
  it('can run a command', function() {
    var runFinished = false,
        output,
        error;
    runs(function() {
      sudoRunner.runCommand('echo', ['testy test test'], function(err, stdout) {
        error = err;
        runFinished = true;
        output = stdout;
      });
    });
    waitsFor(function() {
      return runFinished;
    }, 'command to finish.', 30000);
    runs(function() {
      expect(typeof output).toBe('string');
      expect(error).toBeNull();
      console.log('Response:\n' + output + '\n');
    });
  });

  it('can remove key from keychain', function() {
    var runFinished = false,
        error;
    runs(function() {
      sudoRunner.removeKey(function(err) {
        runFinished = true;
        error = err;
      });
    });
    waitsFor(function() {
      return runFinished;
    }, 'command to finish.', 30000);
    runs(function() {
      // Only checks that there was no error.
      // You should manually verify the key is no longer in keychain.
      expect(error).toBeUndefined();
    });
  });

});
