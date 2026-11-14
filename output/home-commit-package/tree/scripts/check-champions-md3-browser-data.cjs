'use strict';
process.env.SCHEDINA_REPORT_DIR='output/reports/champions-md3-browser-data';
if(!process.argv.includes('--md3-interactive'))process.argv.push('--md3-only');
require('./check-schedina-loading.cjs');
