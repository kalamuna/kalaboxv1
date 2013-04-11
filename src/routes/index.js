/*
 * GET home page.
 */

exports.index = function(req, res) {
  res.render('index', {
    title : 'Kalabox',
  })
};

exports.start = function(req, res) {
  // Dependencies
  var fs = require('fs');
  var url = require('url');
  var http = require('http');
  var exec = require('child_process').exec;
  var spawn = require('child_process').spawn;

  // App variables
  var file_url = 'http://files.kalamuna.com/virtualbox-macosx-4.2.8.dmg';
  var DOWNLOAD_DIR = '/tmp/';

  // We will be downloading the files to a directory, so make sure it's there
  // This step is not required if you have manually created the directory
  var mkdir = 'mkdir -p ' + DOWNLOAD_DIR;
  var child = exec(mkdir, function(err, stdout, stderr) {
    if (err)
      throw err;
    else
      download_file_httpget(file_url);
  });

  // Function to download file using HTTP.get
  var download_file_httpget = function(file_url) {
    var options = {
      host : url.parse(file_url).host,
      port : 80,
      path : url.parse(file_url).pathname
    };

    var file_name = url.parse(file_url).pathname.split('/').pop();
    var file = fs.createWriteStream(DOWNLOAD_DIR + file_name);

    http.get(options, function(res) {
      var filesize = res.headers['content-length'];
      var downloaded = 0;
      var done = 0;
      res.on('data', function(data) {
       file.write(data); 
       downloaded = downloaded + data.length;
       done = (downloaded / filesize) * 100;
       io.sockets.emit('vbox', { complete: done });
      }).on('end', function() {
        file.end();
        console.log(file_name + ' downloaded to ' + DOWNLOAD_DIR);
      });
    });
  };

  res.render('start', {
    title : 'Boot this Box!',
  })
};

exports.dash = function(req, res) {
  res.render('dash', {
    title : 'Kalabox',
  })
};