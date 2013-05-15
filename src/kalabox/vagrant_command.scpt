on run argv
  tell app "Terminal"
    do script "cd " & item 1 of argv & " && vagrant up kalabox --provision-with=shell,puppet_server"
  end tell
end run
