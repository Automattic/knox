
test:
	@./support/expresso/bin/expresso test/*.test.js \
		--timeout 8000 \
		--serial \
		-I lib

.PHONY: test