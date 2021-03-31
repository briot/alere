#!/bin/bash
# Run backend tests
#
# Example: ./runtest.sh  alere.views.test_mean.PlotTestCase.test_mean

testnames=${1:-alere}
./env/bin/python3 ./backend/manage.py test --parallel --verbosity=2 ${testnames}
