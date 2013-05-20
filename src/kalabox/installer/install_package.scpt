on run argv
  do shell script "installer -pkg '" & item 1 of argv & "' -target '" & item 2 of argv & "'" with administrator privileges
end run
