0.9.2 / 2015-01-05
==================

 * Fix encoding of filenames with `+` or `?` characters in them. (hurrymaplelad)

0.9.1 / 2014-08-24
==================

 * Remove `Expect: 100-continue` headers from PUT and copy commands. We weren't using them correctly anyway.
 * Add `extraHeaders` option to `signedUrl`. (dweinstein)

0.9.0 / 2014-06-11
===================

 * Update dependencies: Knox will now no longer work on Node 0.8.
 * Fix files with `#` in their filename not working. (kristokaiv)
 * Fix a variety of intermittent double-callback bugs, e.g. both response and error, or two errors. If there are two errors, or an error on the request after the response is delivered, those are now swallowed. (willisblackburn, domenic)
 * Fix missing return value of `client.deleteFile`.

0.8.10 / 2014-05-11
===================

 * Fix mapping of `us-east-1` region to be `s3.amazonaws.com`, instead of `s3-us-east-1.amazonaws.com`. (coen-hyde)

0.8.9 / 2014-02-08
==================

 * Fix reported sporadic error with `client.list` getting null data by reporting it instead of crashing. (pauliusuza)

0.8.8 / 2013-11-27
==================

 * Fix double-encoding bug introduced in 0.8.7, where using `client.list` with a prefix containing special characters would fail. (colinmutter)

0.8.7 / 2013-11-21
==================

 * Fix handling of non-ASCII characters. (jbuck)

0.8.6 / 2013-07-31
==================

 * Fix normalization of `CommonPrefixes` to an array when doing a `client.list` operation. (mackyi)
 * Fix doing operations with spaces in filenames.
 * Throw when an invalid port is passed to the constructor.

0.8.5 / 2013-07-29
==================

 * Fix bucket name validation to allow short segments, e.g. in `buck.e.t`.

0.8.4 / 2013-07-13
==================

 * Add the ability to pass arbitrary destination options to `copyTo`. (kof)
 * Fix a regression where custom ports were not being used properly in the actual HTTP requests. (aslakhellesoy)
 * Re-emit errors from the underlying HTTP request when using `putFile`.

0.8.3 / 2013-06-09
==================

 * No longer modifies `options` objects passed to `knox.createClient`.

0.8.2 / 2013-05-20
==================

 * Fixed a potential issue where request listeners were not cleaned up properly if a callback threw an error. (spollack)

0.8.1 / 2013-05-19
==================

 * Fixed a regression introduced in 0.8.0 that, in certain cases that only some people were able to reproduce, caused 307 responses to every request.

0.8.0 / 2013-05-06
==================

 * Now allows path-style bucket access using `style` option, and automatically chooses it in a few cases:
   - DNS-uncompliant bucket names (in the US Standard region, where they are allowed)
   - When `secure` is not set to `false`, but the bucket name contains a period
 * More extensive validation of bucket names, with good error messages, as per [the Amazon documentation](http://docs.aws.amazon.com/AmazonS3/latest/dev/BucketRestrictions.html).

0.7.1 / 2013-05-01
==================

 * If using a custom port, reflect it in the `endpoint` property and in any URLs created using the client. (#168, @jbuck)
 * Fix requests using certain Amazon headers, like the conditional copy headers. (#174, @rrjamie)

0.7.0 / 2013-04-08
==================

 * Added real streams2 compatibility: Knox does not kick incoming streams into "old mode," nor does it return streams already kicked into "old mode." (#156, @superjoe30).
 * Fixed a rare bug where sometimes callbacks would be called twice, once with an error then with a failed response. (#159)
 * Made Node.js 0.8 a requirement in `package.json`; it seems like Knox did not work with Node.js 0.6 anyway.

0.6.0 / 2013-03-24
==================

 * Added a stopgap fix for Knox in Node.js 0.10 with streams2, although we do not yet expose a fully streams2-compatible interface. (#146, @pifantastic)
 * Fixed "socket hang up" errors (hopefully!) by disabling the default HTTPS agent. (#116, fix discovered by @kof)
 * Added the `domain` configuration option for easy use of other S3-compatible services. (#154, @clee)
 * Changed and enhanced `signedUrl`: its third parameter is now `options`, which can contain a `verb` string, a `contentType` string, and a `qs` object. In particular, the new `contentType` capability allows creating pre-signed URLs for PUTs. (#152)

0.5.5 / 2013-03-18
==================

 * Fixed `signedUrl` query-string extra-param support for parameters that contained Unicode characters. (#149)
 * Automatically include STS tokens, when a client is created with the `token` option, in URLs generated from `client.signedUrl`. (#147, @willwhite)

0.5.4 / 2013-02-27
==================

 * Fixed `signedUrl` query-string extra-param support for parameters that contained URL-encodable characters.
 * Added support for arbitrary verbs (not just `GET`) to `signedUrl`. (#144, @markdaws)

0.5.3 / 2013-02-15
==================

  * The `x-amz-security-token` header is no longer sent when the `token` option is undefined. (#143, @ianshward)

0.5.2 / 2013-02-05
==================

  * Fixed `signedUrl` query-string param support, as introduced in 0.4.7.
  * Added [debug](https://npmjs.org/package/debug) support.

0.5.0 / 2013-01-25
==================

  * Added `copyTo` and `copyFileTo` for copying files between buckets. (#16, @kof)

0.4.7 / 2013-01-17
==================

  * Fixed 403s when sending requests for files with any of `!'()*` in their name. (#135, @jeremycondon)
  * Added support for arbitrary extra parameters to `signedUrl`, e.g. for use in generating download URLs. (#133)

0.4.6 / 2012-12-22
==================

  * Fixed `signedUrl` to work without a leading slash in the filename, like all other Knox methods. (#129, @relistan)

0.4.5 / 2012-12-16
==================

  * Bucket names with periods are now allowed again, even with SSL. (#128)

0.4.4 / 2012-12-08
==================

  * Added an informative error when using bucket names with periods in them without first turning off SSL. (#125)
  * Fixed all requests when passing in `'Content-Type'` or `'Content-MD5'` headers using any casing other than those exact ones, e.g. `'content-type'`. (#126)

0.4.3 / 2012-12-05
==================

  * Fixed `list` always giving `IsTruncated` as `true`. (#124, @simonwex)

0.4.2 / 2012-11-24
==================

  * Fixed `deleteMultiple` when passed keys that start with leading slashes (like they do in the README example). (#121)
  * Fixed `list` not always returning an array for the `Contents` property.

0.4.1 / 2012-11-02
==================

  * Added `token` configuration option for temporary security tokens. (@corp186, #110)

0.4.0 / 2012-10-27
==================

  * Added `list` to list all the objects in a bucket. (@kof, #101)
  * Fixed tests in Node 0.6.x and in non-ET timezones. (@ianshward, #102)
  * Fixed `putStream`'s early-error logic to accept lowercase versions of `'Content-Length'` as well. (#96)
  * Added `agent` configuration option for configurable HTTP agents. (@ianshward, #111)

0.3.1 / 2012-09-22
==================

  * No longer specifying `'x-amz-acl'` header as `'public-read'` by default. (@shlevy, #91)
  * Made the port configurable with the new `port` option, and defaulting to insecure if the port is customized. (@pifantastic, #86)
  * Made `putStream` give an early and user-intelligible error when no `'Content-Length'` header is set, instead of letting Amazon return a cryptic 501 about `'Transfer-Encoding'`.

0.3.0 / 2012-08-17
==================

  * Added `putStream` "progress" event to go along with `putFile`'s. `putStream` now also returns a request object, just like `put`.
  * Added new `putBuffer` method as a higher-level way to PUT `Buffer`s.
  * When uploading text files using `putFile`, `charset=UTF-8` is now added to the `'Content-Type'` header. (@pifantastic, #83)
  * Fixed `signedUrl` method, which was last working in Knox 0.0.9. (@shawnburke, #81)

0.2.0 / 2012-08-16
==================

  * Added `putFile` "progress" event.

0.1.0 / 2012-08-02
==================

  * `putStream` now works with every type of stream, not just file streams, and actually streams the data using `pipe`, instead of buffering chunks into memory. Note that a `'Content-Length'` header is now required, if you weren't using one already. (#14 #32 #48 #57 #72)
  * `putFile` is now based on `putStream`, and thus no longer buffers the entire file into memory.
  * Added `copyFile` method as a higher-level version of existing `copy`.
  * Fixed signing logic for URLs with query parameters outside the Amazon whitelist. (Seth Purcell, #78)
  * Leading slashes are now optional again, after becoming mandatory in 0.0.10. (#77)
  * Lots of README updates for a more pleasant documentation experience.

0.0.11 / 2012-07-18
===================

  * Now using HTTPS by default, instead of HTTP. This can be disabled with the option `secure: false`.
  * Now using the [mime](https://github.com/broofa/node-mime) package as a dependency instead of bundling an outdated version of it. This should result in a much more complete registry of MIME types for auto-detection when using `putFile`.
  * Trying to use bucket names that are not all lowercase will give an early error instead of failing with `SignatureDoesNotMatch` upon attempting any operation. [See #44](https://github.com/LearnBoost/knox/issues/44#issuecomment-7074177) for more information.
  * Fixed capturing of HTTP request errors to forward to the callback function for all "higher-level API" methods (i.e. those accepting callbacks). (@shuzhang, #71)
  * Fixed README example to use `"image/jpeg"` instead of `"image/jpg"`. (@jedwood, #74)

0.0.10 / 2012-07-16
===================

  * Added `client.copy(sourceFilename, destFilename, headers)` method for copying files within a bucket.
  * Added `client.deleteMultiple(filenames, headers, cb)` method for [multi-object delete](http://docs.amazonwebservices.com/AmazonS3/latest/API/multiobjectdeleteapi.html).
  * Knox now passes through any Content-MD5 headers supplied to any of its methods, and automatically generates one for `putFile`. (@staer, #36)
  * Fixed a bug with error propagation in `putStream`. (@xmilliard, #48)
  * Fixed requests to querystring resources. (@richtera, #70)
  * Updated tests to use [Mocha](http://visionmedia.github.com/mocha/) instead of Expresso; now they can be run on Windows.

0.0.9 / 2011-06-20
==================

  * Fixed signedUrl signature, needs encodeURIComponent() not escape() to prevent SignatureDoesNotMatch errors on signatures containing plus signs.

0.0.8 / 2011-06-15
==================

  * Fixed bug introduced in refactor

0.0.7 / 2011-06-14
==================

  * Fixed resource canonicalization

0.0.6 / 2011-06-07
==================

  * Fixed; ignoring certain query params when preparing stringToSign. [Rajiv Navada]

0.0.4 / 2011-05-20
==================

  * Added `Client#https?(filename)`

0.0.3 / 2011-04-12
==================

  * 0.4.x support

0.0.2 / 2011-01-10
==================

  * Removed `util` require
  * Support for S3 presigned URLs

0.0.1 / 2010-12-12
==================

  * Initial release
