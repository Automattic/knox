#!/usr/bin/env bash

echo "{
  \"key\": \"$AWS_KEY\",
  \"secret\": \"$AWS_SECRET\",
  \"bucket\": \"test-knox-bucket\",
  \"bucket2\": \"test-knox-bucket2\",
  \"bucketUsWest2\": \"test-knox-bucket-oregon\"
}"
