#!/bin/sh

filename=${1:-}

cp backend/alere/migrations/000[2-9]*.py .
rm -rf alere_db.sqlite3 backend/alere/migrations/*
./env/bin/python3 backend/manage.py makemigrations alere
mv 000[2-9]*.py backend/alere/migrations
./env/bin/python3 backend/manage.py migrate

if [ x"$filename" != x ]; then
   ./env/bin/python3 backend/manage.py import_kmy "$filename"
   ./env/bin/python3 backend/manage.py shell < manu/custom_kmy_kinds.py
fi
