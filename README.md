rethinkdb-jtmpl-demo
====================

1. Install RethinkDB http://rethinkdb.com/docs/install/
2. Download Wikipedia Titles https://dumps.wikimedia.org/enwiki/latest/enwiki-latest-all-titles-in-ns0.gz
3. Import data `rethinkdb import -f EXTRACTED_FILE --table wiki.titles --format csv --separator '\t'`
4. Install dependencies `npm i`
5. Run server `npm start`
