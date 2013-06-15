/**
 * Tests for commands running against the Kalabox virtual machine.
 *
 * Make sure virtual machine is running before starting these tests.
 */

// Dependencies:
var connector = require('../src/kalabox/vm/connector');

describe('The VM connector', function() {

  // Test connecting to VM.
  it('can SSH into the Kalabox VM.', function() {
    var connection,
        error,
        runFinished = false;
    runs(function() {
      connector.getConnection(function(err, newConnection) {
        error = err;
        connection = newConnection;
        runFinished = true;
      });
    });
    waitsFor(function() {
      return runFinished;
    }, 'connection to be established.', 30000);
    runs(function() {
      expect(error).toBeNull();
      expect(typeof connection.exec).toBe('function');
    });
  });

  // Test running an arbitrary shell command on VM.
  it('can run a command on the VM.', function() {
    var response,
        error,
        runFinished = false;
    runs(function() {
      connector.runCommand('service nginx status', function(err, returned) {
        error = err;
        response = returned;
        runFinished = true;
      });
    });
    waitsFor(function() {
      return runFinished;
    }, 'command to finish.', 30000);
    runs(function() {
      expect(error).toBeNull();
      expect(typeof response).toBe('string');
      console.log('Response:\n' + response + '\n');
    });
  });

  connector.disconnect();

});
