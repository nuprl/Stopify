import sphinx_bootstrap_theme
from recommonmark.parser import CommonMarkParser

source_parsers = {
    '.md': CommonMarkParser,
}

source_suffix = ['.rst', '.md']

# Specify the root of the documentation tree
master_doc = 'index'
project = u'Stopify User\'s Manual'
version = '0.6.0'
release = version

# Activate the docs theme
html_theme = 'sphinx_rtd_theme'
html_theme_path = sphinx_bootstrap_theme.get_html_theme_path()
html_theme_options = { }
html_sidebars = { '**': ['localtoc.html', 'searchbox.html'] }
