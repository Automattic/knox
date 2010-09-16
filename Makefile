
test:
	@./support/expresso/bin/expresso test/*.test.js \
		--timeout 8000 \
		--serial \
		-I lib

docs: index.html

index.html:
	dox \
		--title "Knox" \
		--desc "Light-weight Amazon S3 client for [NodeJS](http://nodejs.org)." \
		--ribbon "http://github.com/LearnBoost/knox" \
		--private \
		lib/knox/*.js > $@

docclean:
	rm -f index.html

.PHONY: test docs docclean