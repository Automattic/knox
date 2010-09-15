
test:
	@./support/expresso/bin/expresso test/*.test.js \
		--serial \
		-I lib

.PHONY: test