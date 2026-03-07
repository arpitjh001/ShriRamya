#!/bin/sh
grep -q 'ALLOW_UNFILTERED_UPLOADS' /var/www/html/wp-config.php || sed -i "/^<?php/a define('ALLOW_UNFILTERED_UPLOADS', true);" /var/www/html/wp-config.php
echo "Done: ALLOW_UNFILTERED_UPLOADS enabled"
