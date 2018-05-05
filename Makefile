start:
	npx serve

pretty:
	npx prettier --write 'app/**/*.js' 'demos/*.js' 'css/*.css' 'lib/{Class,code-dump,Utils}.js'
