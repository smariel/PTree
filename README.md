#PTree
## Description
PTree aims to help building power supplies on electronics design.
A first view is dedicated to build the tree itself by adding sources and loads.
The second view list all the component consumptions on each power supplies.
The third view is a graphical summary of all the consumptions on the design.
##
## Basic commands
Simple installation using git and npm:

    $ git clone https://github.com/smariel/PTree
    $ cd PTree
    $ npm install

Run the application:

    $ npm start

Package the application

    $ npm run pack:xxx

where "xxx" must be replaced by:

 - osx (OS X .app)
 - mas (OS X Mac App Store)
 - lin32 (Linux 32 bits)
 - lin64 (Linux 64 bits)
 - win32 (Windows 32 bits)
 - win64 (Windows 64 bits)
