#!/bin/sh

cd ~/.kalabox/kalastack-2.x
osascript -e "do shell script \"sudo echo 'Preparing to run vagrant up...'\" with administrator privileges"
vagrant up kalabox --provision-with=shell,puppet_server
