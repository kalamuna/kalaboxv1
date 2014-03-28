/**
 * Small script for adding and removing entries from OS's hosts file.
 */

// Dependencies:
var hostile = require('hostile');

// "Constants":
var ALLOWED_OPS = ['add', 'remove'];

// Arguments:
var operation = process.argv[2],
    host = process.argv[3],
    ip = process.argv[4];

if (!operation || !host || !ip || (ALLOWED_OPS.indexOf(operation) === -1)) {
  console.error('Bad arguments.');
  process.exit(1);
}

if (operation == 'add') {
  hostile.set(ip, host, function(error) {
    if (error) {
      console.error(error);
      process.exit(1);
    }
  });
}
else if (operation == 'remove') {
  hostile.remove(ip, host, function(error) {
    if (error) {
      console.error(error);
      process.exit(1);
    }
  });
}
