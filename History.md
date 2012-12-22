0.4.6 / 2012-12-22
==================

  * Fixed `signedUrl` to work without a leading slash in the filename, like all other Knox methods. (#129, @relistan)

0.4.5 / 2012-12-16
==================

  * Bucket names with periods are now allowed again, even with SSL. (#128)

0.4.4 / 2012-12-08
==================

  * Added an informative error when using bucket names with periods in them without first turning off SSL. (#125)
  * Fixed all requests when passing in `'Content-type'` or `'Content-MD5'` headers using any casing other than those exact ones, e.g. `'content-type'`. (#126)

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
