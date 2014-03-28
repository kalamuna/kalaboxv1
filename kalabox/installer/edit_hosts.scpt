on run argv
  do shell script "cat '" & item 1 of argv & "' >> /etc/hosts" with administrator privileges
end run
