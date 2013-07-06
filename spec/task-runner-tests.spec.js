/**
 * @file
 * Tests for task running components.
 */

// Dependencies:
var sudoRunner = require('../src/kalabox/utils/task-runner/sudo-runner');

// Test the Sudo Runner.
describe('The Sudo Runner', function() {

  // Test running a command.
  it('can run a command', function() {
    var runFinished = false,
        output;
    runs(function() {
      sudoRunner.runCommand('echo', ['testy test test'], function(stdout) {
        runFinished = true;
        output = stdout;
      });
    });
    waitsFor(function() {
      return runFinished;
    }, 'command to finish.', 30000);
    runs(function() {
      expect(typeof output).toBe('string');
      console.log('Response:\n' + output + '\n');
    });
  });

});
