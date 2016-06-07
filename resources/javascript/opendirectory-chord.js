OpenDirectoryChord = function(){
    /* opendirectory */
	//this.endpoint="http://sparql.turnguard.com/sparql?default-graph-uri="+encodeURIComponent("http://vocabulary.turnguard.com/opendirectory"),
    /* dbpedia categories */
    this.endpoint="http://dbpedia.org/sparql?default-graph-uri="+encodeURIComponent("http://dbpedia.org"),
	this.width=1024,
	this.height=768,
	this.rx=this.width/2,
	this.ry=this.height/2,
	this.rotate=0,
	this.cluster = d3.layout.cluster().size([360, this.ry - 80]).sort(function(a, b) { return d3.ascending(a.key, b.key); }),
	this.bundle = d3.layout.bundle(),
	this.line = d3.svg.line.radial().interpolate("bundle").tension(.85).radius(function(d) { return d.y; }).angle(function(d) { return d.x / 180 * Math.PI; }),
	this.getQuery = function(sScheme){

        /* opendirectory (see queries.txt) */
		//return encodeURIComponent("SELECT DISTINCT ?concept ?conceptLabel ?broader ?broaderLabel ?scheme ?schemeLabel WHERE { ?concept skos:inScheme ?scheme . OPTIONAL { ?concept skos:broader ?broader . ?broader skos:prefLabel ?broaderLabel FILTER(lang(?broaderLabel)='en') } . ?concept skos:prefLabel ?conceptLabel FILTER(lang(?conceptLabel)='en')  FILTER(?scheme = <<scheme>>) ?scheme dct:title ?schemeLabel FILTER(lang(?schemeLabel)='en') } LIMIT 500".replace("<scheme>",sScheme));    

        /* dbpedia categories (see queries.txt) */
        return encodeURIComponent("SELECT DISTINCT ?concept ?conceptLabel ?broader ?broaderLabel ?scheme ?schemeLabel WHERE { ?concept skos:broader+ ?scheme . OPTIONAL { ?concept skos:broader ?broader . ?broader skos:prefLabel ?broaderLabel FILTER(lang(?broaderLabel)='en') } . ?concept skos:prefLabel ?conceptLabel FILTER(lang(?conceptLabel)='en') FILTER(?scheme = <<scheme>>) ?scheme skos:prefLabel ?schemeLabel  FILTER(lang(?schemeLabel)='en') } LIMIT 500".replace("<scheme>",sScheme));

	}
};

OpenDirectoryChord.prototype = {
	init: function(sScheme){
		this.init_(this, sScheme);
	},
	init_: function(instance, sScheme){
			instance.div = d3.select("#visualization")
                            .insert("div", "h2")
                            .style("width", instance.width + "px")
                            .style("height", instance.width + "px")
                            .style("position", "absolute")
                            .style("-webkit-backface-visibility", "hidden");
			instance.svg = instance.div.append("svg:svg")
                            .attr("width", instance.width)
                            .attr("height", instance.width)
                            .append("svg:g")
                            .attr("transform", "translate(" + instance.rx + "," + instance.ry + ")");
			instance.svg.append("svg:path")
                .attr("class", "arc")
                .attr("d", d3.svg.arc().outerRadius(instance.ry - 120).innerRadius(0).startAngle(0).endAngle(2 * Math.PI))
                .on("mousedown",(function(){ instance.mousedown(instance); }));

    /* here the sparql query is simply issued against a virtuoso endpoint retrieving csv data. as soon as data is here it is transformed for this visualization using d3js methods */
    d3.csv(instance.endpoint+"&query=" + instance.getQuery(sScheme), function(error, data) {
			var nodes = instance.cluster.nodes(instance.createNodes(data));
			var links = instance.imports(nodes);
			var	splines = instance.bundle(links);

			var path = instance.svg.selectAll("path.link")
					.data(links)
				    .enter().append("svg:path")
					.attr("class", function(d) { return "link source-" + d.source.key + " target-" + d.target.key; })
					.attr("d", function(d, i) {   return instance.line(splines[i]); });

			instance.svg.selectAll("g.node")
					.data(nodes.filter(function(n) { return !n.children; }))
					.enter().append("svg:g")
					.attr("class", "node")
					.attr("id", function(d) { return "node-" + d.key; })
					.attr("transform", function(d) { return "rotate(" + (d.x - 90) + ")translate(" + d.y + ")"; })
					.append("svg:text")
					.attr("dx", function(d) { return d.x < 180 ? 8 : -8; })
					.attr("dy", ".31em")
					.attr("text-anchor", function(d) { return d.x < 180 ? "start" : "end"; })
					.attr("transform", function(d) { return d.x < 180 ? null : "rotate(180)"; })
					.text(function(d) { return d.name; })
					.on("click", (function(d){instance.click(d,instance)}))
		            .on("mouseout", (function(d){ instance.mouseout(d, instance); }))
					.on("mouseover", (function(d){ instance.mouseover(d, instance); }));

			d3.select(window)
					.on("mousemove", (function(){ instance.mousemove(instance); }))
					.on("mouseup",  (function(){ instance.mouseup(instance); }));

			instance.createSettings(sScheme);

		});
	},
	search: function(queryString){
		this.svg.selectAll("g.node")
			.attr("style",function(d){ return "font-weight:none;fill:#ffffff"; })
			.filter(function(d){ return queryString.trim()==""?false:(d.name.toLowerCase().indexOf(queryString.toLowerCase())!=-1);})
			.attr("style",function(d){ return "font-weight:bold;fill:#2ca02c"; });
	},
	createNodes: function(data){
      var map = { };

      function find(name,data) {
        var node = map[name];
        if (!node) {
          node = map[name] = data || {name: name, children: []};				
          if (name.length) {
						node.parent = find("");
						node.parent.children.push(node);
						node.key = CryptoJS.MD5(name).toString();
          }
        }
        return node;
      }

      data.forEach(function(d) {
				var conceptNode = find(d.conceptLabel, { "name":d.conceptLabel, "key":CryptoJS.MD5(d.conceptLabel).toString(), "uri":d.concept, "type":"concept", "imports":[] });
				var schemeNode = find(d.schemeLabel,{ "name":d.schemeLabel, "key":CryptoJS.MD5(d.schemeLabel).toString(), "uri":d.scheme,"imports":[] });
				conceptNode.imports.push(schemeNode.name);
				if(d.broader!==""){
					var broaderNode = find(d.broaderLabel,{ "name":d.broaderLabel, "key":CryptoJS.MD5(d.broaderLabel).toString(), "uri":d.broader,"type":"concept","imports":[] });
					conceptNode.imports.push(broaderNode.name);
				}
      });
      return map[""];
	},
  imports: function(nodes) {
    var map = {}, imports = [];
    nodes.forEach(function(d) {
      map[d.name] = d;
    });
    nodes.forEach(function(d) {
      if (d.imports) d.imports.forEach(function(i) {
        imports.push({source: map[d.name], target: map[i]});
      });
    });
    return imports;
  },
	mouse: function(e) {
		return [e.pageX - this.rx, e.pageY - this.ry];
	},
	mousedown:function(instance) {
		instance.m0 = instance.mouse(d3.event);
		d3.event.preventDefault();
	},
	mousemove:function(instance) {
		if (instance.m0) {
		  var m1 = instance.mouse(d3.event),
		      dm = Math.atan2(instance.cross(instance.m0, m1), instance.dot(instance.m0, m1)) * 180 / Math.PI;
		  instance.div.style("-webkit-transform", "translateY(" + (instance.ry - instance.rx) + "px)rotateZ(" + dm + "deg)translateY(" + (instance.rx - instance.ry) + "px)");
		}
	},
	mouseup: function(instance) {
		if (instance.m0) {
		  var m1 = instance.mouse(d3.event),
		      dm = Math.atan2(instance.cross(instance.m0, m1), instance.dot(instance.m0, m1)) * 180 / Math.PI;

		  instance.rotate += dm;
		  if (instance.rotate > 360) instance.rotate -= 360;
		  else if (instance.rotate < 0) instance.rotate += 360;
		  instance.m0 = null;

		  instance.div.style("-webkit-transform", null);

		  instance.svg
		  	.attr("transform", "translate(" + instance.rx + "," + instance.ry + ")rotate(" + instance.rotate + ")")
		    .selectAll("g.node text")
		    .attr("dx", function(d) { return (d.x + instance.rotate) % 360 < 180 ? 8 : -8; })
		    .attr("text-anchor", function(d) { return (d.x + instance.rotate) % 360 < 180 ? "start" : "end"; })
		    .attr("transform", function(d) { return (d.x + instance.rotate) % 360 < 180 ? null : "rotate(180)"; });
		}
	},
	mouseover: function(d, instance) {
		instance.svg.selectAll("path.link.target-" + d.key)
		    .classed("target", true)
		    .each(instance.updateNodes("source", true, instance));

		instance.svg.selectAll("path.link.source-" + d.key)
		    .classed("source", true)
		    .each(instance.updateNodes("target", true, instance));
	},
	mouseout: function(d, instance) {
		instance.svg.selectAll("path.link.source-" + d.key)
		    .classed("source", false)
		    .each(instance.updateNodes("target", false, instance));

		instance.svg.selectAll("path.link.target-" + d.key)
		    .classed("target", false)
		    .each(instance.updateNodes("source", false, instance));
	},
	updateNodes:function(name, value, instance) {
		return function(d) {
		  if (value) this.parentNode.appendChild(this);
		  instance.svg.select("#node-" + d[name].key).classed(name, value);
		};
	},
	cross:function(a, b) {
		return a[0] * b[1] - a[1] * b[0];
	},
	dot: function(a, b) {
		return a[0] * b[0] + a[1] * b[1];
	},
	click: function(d, instance){
        /* opendirectory */
		//var query = d.type=="concept"?("SELECT (IF(?p=skos:prefLabel,'a',IF(?p=skos:altLabel,'b',IF(?p=skos:definition,'c',IF(?p=skos:broader,'d',IF(?p=skos:narrower,'e',IF(?p=skos:related,'f',IF(?p=skos:subject,'g',IF(?p=dct:creator,'h',IF(?p=dct:date,'i','j'))))))))) AS ?order) (IF(?p=skos:prefLabel,'Preferred Label',IF(?p=skos:altLabel,'Alternative Label', IF(?p=skos:broader,'Broader', IF(?p=skos:narrower,'Narrower', IF(?p=skos:inScheme,'In Scheme', IF(?p=dct:date,'Created', IF(?p=dct:creator,'Creator', IF(?p=rdf:type,'Type', IF(?p=skos:definition,'Definition',IF(?p=owl:sameAs,'Same As',IF(?p=rdfs:seeAlso,'See Also',IF(?p=skos:exactMatch,'Exact Match',IF(?p=skos:subject,'Subject','Other'))))))))))))) AS ?key) (COALESCE(?value1,?value) AS ?value) WHERE { ?concept ?p ?value FILTER(?p IN (skos:prefLabel,skos:altLabel,skos:narrower,skos:broader,skos:subject,owl:sameAs,dct:date,skos:definition,dct:creator,skos:related)) FILTER(isURI(?value) || (isLiteral(?value) && lang(?value)='en') || datatype(?value)=xsd:dateTime). OPTIONAL { ?value skos:prefLabel|dct:title ?value1 FILTER(lang(?value1)='en')} FILTER(?concept=<<uri>>) } ORDER BY ?order ?value".replace("<uri>",d.uri)):("SELECT (IF(?p=dct:title,'a',IF(?p=skos:hasTopConcept,'b','c')) AS ?order) (IF(?p=dct:title,'Title',IF(?p=skos:hasTopConcept,'Top Concept', IF(?p=dct:date,'Created',IF(?p=dct:creator,'Creator','Other')))) AS ?key) (COALESCE(?value1,?value) AS ?value) WHERE { ?scheme ?p ?value FILTER(?p IN (dct:title,dct:date,dct:creator,skos:hasTopConcept)) FILTER(isURI(?value) || (isLiteral(?value) && lang(?value)='en') || datatype(?value)=xsd:dateTime). OPTIONAL { ?value skos:prefLabel|dct:title ?value1 FILTER(lang(?value1)='en')} FILTER(?scheme=<<uri>>) } ORDER BY ?order ?value".replace("<uri>",d.uri));

        /* dbpedia */
        var query = "SELECT * WHERE { <<uri>> skos:prefLabel ?value . BIND('Preferred Label' AS ?key)}".replace("<uri>",d.uri);

		$.ajax({
			url: instance.endpoint+"&query="+encodeURIComponent(query),
			headers:{
				"accept":"application/sparql-results+json"
			}
		}).done(function(data) {
			var currentKey="";
			var key = "";
			var text = "<strong><a href='"+d.uri+"' target='_blank'>"+d.uri+"</a></strong><br/><br/>";
			data.results.bindings.forEach(function(bindingSet){
				if(bindingSet.key.value!=key){
					key = bindingSet.key.value;
					text += "<label><strong>"+bindingSet.key.value+"</strong></label>: "+bindingSet.value.value+"<br/>";
				} else {
					text += "<label><strong>&nbsp;</strong></label>: "+bindingSet.value.value+"<br/>";				
				}

			});
			document.getElementById("info").innerHTML = text;
		});
	},
	createSettings: function(sScheme){
		$.ajax({
            /* opendirectory */
			//url: this.endpoint+"&query="+encodeURIComponent("SELECT DISTINCT ?scheme (str(?schemeLabel) AS ?schemeLabel) WHERE { ?scheme a skos:ConceptScheme; dct:title ?schemeLabel FILTER(lang(?schemeLabel)='en') . ?scheme skos:hasTopConcept ?topConcept } ORDER BY ?schemeLabel"),

            /* dbpedia */
            url: this.endpoint+"&query="+encodeURIComponent("SELECT * WHERE { ?scheme a skos:Concept FILTER(?scheme IN (<http://dbpedia.org/resource/Category:Data_analysis>,<http://dbpedia.org/resource/Category:Cloud_computing>,<http://dbpedia.org/resource/Category:Programming_languages>)) . ?scheme skos:prefLabel ?schemeLabel } LIMIT 10"),

			headers:{
				"accept":"application/sparql-results+json"
			}
		}).done(function(data) {

			var select = document.createElement("select");
					select.setAttribute("id","schemeChooser");	
					select.setAttribute("onchange","javascript:visRedraw(this.value)");				
			data.results.bindings.forEach(function(bindingSet){
				var option = document.createElement("option");
						if(bindingSet.scheme.value==sScheme){
							option.setAttribute("selected",true);
						}
						option.setAttribute("value",bindingSet.scheme.value);
						option.appendChild(document.createTextNode(bindingSet.schemeLabel.value));
						select.appendChild(option);
			});
			var label = document.createElement("label");
			    label.setAttribute("for", "schemeChooser");
			    label.appendChild(document.createTextNode("Choose Scheme: "));
			document.getElementById("schemeChooserContainer").appendChild(label);
			document.getElementById("schemeChooserContainer").appendChild(select);
			document.getElementById("schemeChooserContainer").appendChild(document.createElement("br"));
		});
	}	
}
