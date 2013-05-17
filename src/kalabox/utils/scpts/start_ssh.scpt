on run argv
  tell app "Terminal"
    do script "cd " & item 1 of argv & " && vagrant ssh"
  end tell
end run
