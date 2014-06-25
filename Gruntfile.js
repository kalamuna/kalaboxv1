'use strict';

module.exports = function (grunt) {
  // Show elapsed time at the end
  require('time-grunt')(grunt);
  // Load all grunt tasks
  require('load-grunt-tasks')(grunt);

  // Project configuration.
  grunt.initConfig({
    // jasmine node unit test
    jasmine_node: {
      options: {
        forceExit: true,
        match: '.',
        matchall: false,
        extensions: 'js',
        specNameMatcher: 'spec',
        jUnit: {
          report: true,
          savePath : "./report/jasmine/",
          useDotNotation: true,
          consolidate: true
        }
      },
      app: ['spec/']
    },
    // Jshint
    jshint: {
      options: {
        jshintrc: '.jshintrc',
        reporter: require('jshint-stylish')
      },
      gruntfile: {
        src: 'Gruntfile.js'
      },
      app: {
        src: ['kalabox/**/*.js', 'scripts/**/*.js',
        './*.js', '!Gruntfile.js']
      },
      specs: {
        src: ['test/**/*.js']
      }
    },
    // watch
    watch: {
      gruntfile: {
        files: '<%= jshint.gruntfile.src %>',
        tasks: ['jshint:gruntfile']
      },
      app: {
        files: '<%= jshint.app.src %>',
        tasks: ['jshint:lib', 'jasmine_node:app']
      },
      specs: {
        files: ['<%= jshint.specs.src %>'],
        tasks: ['jshint:specs', 'jasmine_node:app']
      }
    },
    nodewebkit: {
      app: {
        options: {
          build_dir: './build',
          mac: true,
          win: false
        },
        src: ['./**/*', '!./build']
      }
    },
    clean: {
      build: ['./build/releases']
    }
  });

  // Default task.
  grunt.registerTask('default', ['jshint','jasmine_node:app', 'clean:build', 'nodewebkit:app']);
  grunt.registerTask('build', 'Builds a packaged version of the app', ['clean:build','nodewebkit:app']);
};
