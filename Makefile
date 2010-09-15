
test:
	@./support/expresso/bin/expresso test/*.test.js \
		-I lib

.PHONY: test