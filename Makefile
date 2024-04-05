default: build
build:
	docker build -t zl-project .
clean-build:
	docker build -t zl-project . --no-cache=true
run:
	docker run -d -p 80:80 zl-project
