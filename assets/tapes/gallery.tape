Output assets/tapes/gallery.gif
Set Shell bash
Set FontSize 14
Set Width 1100
Set Height 1560
Set Padding 24
Set Theme "Catppuccin Mocha"
Hide
Type "export PS1='$ ' CDPATH= && clear"
Enter
Show
Type "node dist/maidog.js --padding-y 2 glow -s dark -w 0 - < assets/gallery.md"
Enter
Sleep 2s
Screenshot assets/gallery.png
