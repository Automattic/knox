
test:
	@./support/expresso/bin/expresso test/*.test.js \
		--timeout 4000 \
		--serial \
		-I lib

.PHONY: test