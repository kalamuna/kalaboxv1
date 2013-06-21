on run argv
  tell app "Terminal"
    do script "cd " & item 1 of argv & " && vagrant up"
  end tell
end run
