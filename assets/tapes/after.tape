Output assets/tapes/after.gif
Set Shell bash
Set FontSize 15
Set Width 1100
Set Height 900
Set Padding 24
Set Theme "Catppuccin Mocha"
Hide
Type "export PS1='$ ' CDPATH= && clear"
Enter
Show
Type "node dist/maidog.js glow -s dark -w 0 - < assets/demo.md"
Enter
Sleep 2s
Screenshot assets/after.png
