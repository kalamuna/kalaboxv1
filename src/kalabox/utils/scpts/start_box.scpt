on run argv
  tell app "Terminal"
    do script "cd " & item 1 of argv & " && vagrant up --no-provision"
  end tell
end run
