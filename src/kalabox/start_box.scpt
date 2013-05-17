on run argv
  do shell script "sudo su " & item 1 of argv & " -c 'vagrant up --no-provision'" with administrator privileges
end run
