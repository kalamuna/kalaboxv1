on run argv
  tell app "Terminal"
    activate
    do script "cd " & item 1 of argv & " && vagrant ssh"
  end tell
end run
