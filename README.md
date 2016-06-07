# demo-d3js-with-sparqlendpoint

1. enable opendirectory
    1.1. uncomment "odc.init.." in index.html (line 45) 
    1.2. comment "odc.init.." in index.html (line 48)
    1.3. uncomment "this.endpoint=.." in resources/javascript/opendirectory-chord.js (line 3)
    1.4. comment "this.endpoint=.." in resources/javascript/opendirectory-chord.js (line 5)
    1.5. uncomment "return encodeURIComponent.." in resources/javascript/opendirectory-chord.js (line 17)
    1.6. comment "return encodeURIComponent.." in resources/javascript/opendirectory-chord.js (line 20) 
    1.7. uncomment "var query=.." in resources/javascript/opendirectory-chord.js (line 193)
    1.8. comment "var query=.." in resources/javascript/opendirectory-chord.js (line 196)
    1.9. uncomment "url: this.endpoint+.." in resources/javascript/opendirectory-chord.js (line 222)
    1.10. comment "url: this.endpoint+.." in resources/javascript/opendirectory-chord.js (line 225)
2. enable dbpedia categories
    replace all "uncomment" by "comment" from point 1 where subpoint is uneven
    replace all "comment" by "uncomment" from point 1 where subpoint is even
