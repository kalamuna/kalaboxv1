on run argv
  tell app "Terminal"
    do script "cd " & item 1 of argv & " && vagrant up --provision-with=puppet_server"
  end tell
end run
