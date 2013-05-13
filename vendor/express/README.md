
These files were copied and modified from Express version 3.2.4 to make them work in Browserify.

Changes:

1. In `/router/index.js`, replace

```
require('connect').utils.parseUrl
```

with

```
require('url').parse
```

2. In `/utils.js`, remove

```
var mime = require('connect').mime
  , crc32 = require('buffer-crc32');
```
