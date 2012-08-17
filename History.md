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
