#!/bin/sh

# ------------------------------------------------------------------------------
# PowerTree
# Copyright (c) 2016 Sylvain MARIEL
# MIT License
# ------------------------------------------------------------------------------

# Script de lancement d'environement de dev
# À placer à la racine du dosser de dev
# Avant de lancer, faire un "CHMOD 744 start_dev.sh"
# Puis ouvrir avec le terminal

# Ouverture de MAMP, peut importe sa position
#open -a MAMP

# Ouverture de Sequel Pro, peut importe sa position
#open -a Sequel\ Pro

# Ouverture de la console pour voir les logs PHP et Apache
#open -a Console

# CD dans le répertoire d'exécution du script
cd $(dirname $0)

# Ouerture de atom positionné dans le repertoire du script
atom ./

# CD dans le sous-répertoire CSS
#cd css
# auto compilation du SCSS ou SASS
#sass --watch style.scss:style.css

# Ouverture de la page web en cours de dev
#open http://localhost/PowerTree

# Ouverture de l’appli Electron
npm start