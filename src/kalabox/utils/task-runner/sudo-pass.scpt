set kalaicon to alias ((path to me as text) & ":..:..:..:..:app.icns")
tell application "SystemUIServer"
  activate
  set my_password to display dialog ¬
    "Please enter your administrator password:" with title ¬
    "Password" with icon kalaicon ¬
    default answer ¬
    "" buttons {"Cancel", "OK"} default button 2 ¬
    giving up after 295 ¬
    with hidden answer
end tell
