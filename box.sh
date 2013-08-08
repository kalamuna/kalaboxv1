#!/bin/bash

browserify src/public/js/dash/main.js -o src/public/js/dash-compiled.js
bin/node --harmony src/app
