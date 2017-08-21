#! /usr/bin/env python
from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from pyvirtualdisplay import Display
import argparse
import sys
import os
from urllib import parse
from functools import reduce

parser = argparse.ArgumentParser(description='Run a stopified program in-browser.')
parser.add_argument('filename', type=str)
parser.add_argument('browser', type=str)
group = parser.add_mutually_exclusive_group()
group.add_argument('-y', '--yield', dest='-y', type=int)
group.add_argument('-l', '--latency', dest='-l', type=int)
parser.add_argument('-s', '--stop', dest='--stop', type=int)
parser.add_argument('-e', '--env', dest='--env', type=str, default='browser')

args = vars(parser.parse_args(sys.argv[1:]))
params = reduce(lambda a,b: a + b, [[k,str(v)] for k,v in list(args.items())[2:] if v != None], [])
html_file = "file://" + os.path.abspath(args['filename']) + "#" + parse.quote_plus(str(params).replace(' ', '').replace('\'', '\"'))

display = Display(visible=0, size=(800, 600))
display.start()

# Create a new instance of the Firefox driver
try:
    if args['browser'] == "firefox":
        driver = webdriver.Firefox()
    else:
        args['browser'] = "chrome"
        driver = webdriver.Chrome()
    try:
        # go to the google home page
        driver.get(html_file)

        # Runner signals completion or failure by changing title to done
        WebDriverWait(driver, 300).until(EC.title_is("done"))

        # You should see "cheese! - Google Search"
        data = driver.find_element_by_id('data').get_attribute('value')

        print(data)
    finally:
        driver.quit()
finally:
    display.stop()
