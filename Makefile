start:
	python3 -m http.server 8080

pretty:
	npx prettier --write 'app/**/*.js' 'demos/*.js' 'css/*.css' 'lib/{Class,code-dump,Utils}.js'
