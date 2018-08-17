**PTree** aims to help building power supplies on electronics design. A first window is dedicated to build the tree itself by connecting sources and loads. The second window lists all components with their consumption on each power supplies. The third window is a graphical summary of all consumption on the design.


You can download PTree for Windows, Linux, macOS and find more informations on [smariel.github.io/PTree](https://smariel.github.io/PTree)


-----------------
# Install

PTree is based on [Electron](https://electronjs.org/). It is a web app packaged with Chromium and Node.js.

You will first need to install [nodejs](https://nodejs.org/), which includes npm.

Test the installation:

    $ npm --version
    $ 6.2.0

Then, using git and npm, install the PTree project and all its dependencies *locally*:

    $ git clone https://github.com/smariel/PTree
    $ cd PTree
    $ npm install

The project is ready. Launch PTree:

    $ npm start

# Compile SASS to CSS
The stylesheets are not directly wrotten in CSS but compiled with [Sass](http://sass-lang.com/). You can install it *globally* with npm.

    $ npm install -g npm-sass

You will find a script in the Sass folder to automatically compile sheets each time you save them.

Open a dedicated terminal and let the following command running while you are developping:

    $ ./sass/watch.sh

# Build and deploy

electron-packager is used to create binaries for all platforms. Install it *globally*:

    $ npm install -g electron-packager

package.json contains multiple scripts to easily build PTree. Just run:

    $ npm run build:xxx

Where "xxx" must be replaced by:

| xxx     | Platform                  |
| ------- | ------------------------- |
| mac     | macOS                     |
| mas     | macOS [Mac App Store](https://electron.atom.io/docs/tutorial/mac-app-store-submission-guide/)  |
| lin32   | Linux x86 32 bits         |
| lin64   | Linux x86 64 bits         |
| linArm7 | Linux ARMv7               |
| win32   | Windows 32 bits           |
| win64   | Windows 64 bits           |
| macos   | = mac + mas               |
| windows | = win32 + win64           |
| linux   | = lin32 + lin64 + linArm7 |
| 64      | = mac + win64 + lin64     |
| all     | = macos + windows + linux |

What the script do:
 - Package the app for the specifed platform into a folder
 - Set the icon to the binary
 - Copy the license, equations.pdf and a project example to the folder
 - Zip the folder

# Verifications
You can verify multiple items before deploying.

## Local dependencies
Maintain the dependencies up to date. ncu will check package.json:

    $ npm install -g ncu
    $ ncu
    $   bootstrap  <4.0.0  →  ^4.1.2
    $   fabric     <2.0.0  →  ^2.3.3

Bootstrap and fabric are deliberately keeped bellow a certain version.

To update a package:

    $ npm update <package name>@<version>

## Global dependencies
Maintain other programs, not listed in package.json, up to date :
 - node.js
 - npm
 - sass
 - electron-packager
 - ...

ncu can check those global packages:

     $ ncu -g
     $    All global packages are up-to-date :)

To update a global package:

    $ npm update -g <package name>@<version>

## Other programs
n can manage node.js versions

     $ npm install -g n
     $ sudo n lts

## NPM audit
Use npm to search for security problems in all dependencies:

    $ npm audit

## Chromium tips
Have a look to the Chromium console. Chromium and Electron may give good advices there.


# PTree diagram

Finally, a complete view of the objects imbrication can be found in /docs/synop.jpg
![synoptic](https://raw.githubusercontent.com/smariel/PTree/master/docs/synop.png)
