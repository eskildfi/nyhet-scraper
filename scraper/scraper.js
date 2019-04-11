const https = require("https");
const fs = require("fs");

var newsLinks = [];

var nrkPattern; 

function readPatterns() {
	var nrkUrls = "";
	var urls = fs.readFileSync("./scraper/urls.txt", "utf-8");
	urls = urls.split(/\r?\n/);
	for (var i=0; i<urls.length; i++) {
		if (urls[i].match(/(.*)nrk.no\/(.*)/)) {
			nrkUrls += "<a href=\"" + urls[i] + "(.+)\"|";
		}
	}
	nrkUrls = nrkUrls.slice(0, nrkUrls.length-1);
	nrkPattern = new RegExp(nrkUrls, "g");
}

function scrape() {
	if (nrkPattern === undefined) readPatterns();
	https.get("https://www.nrk.no/", res => {
		parseNrk(res);
	});
}

function getInfo(url) {
	https.get(url, res => {
		var text = "";

		res.on("data", chunk => {
			text += chunk;
		});

		res.on("end", () => {
			var reg = /<meta property=\"og:title\" content=\"(.+)\" \/>/;
			var matches = text.match(reg);
			var title = "No title found"
			if (matches != null && matches.length > 1) {
				//Lag metode for å erstatte alle html entities.
				var title = matches[1].replace(/&aelig;/g, 'æ').replace(/&oslash;/g, 'ø').replace(/&aring;/g, 'å');
				title = "NRK - " + title;
			}
			reg = /<time class=\"datetime-absolute\"\nitemprop=\"datePublished\"\ndatetime=\"(.+)\+.*\">/
			matches = text.match(reg);
			if (matches != null && matches.length > 1) {
				var m = matches[1].match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
				var date = new Date(m[1], m[2]-1, m[3], m[4], m[5], m[6]);
				//var date = matches[1];
			} else {
				//lol. Gjør at saker uten dato ikke blir tatt med.
				title = "No title found";
			}
			if (title != "No title found") {
				var news = {url: url, title: title, date: date};
				newsLinks.push(news);
			}
		});
	});
}

function parseNrk(res) {
	var text = "";

	res.on("data", chunk => {
		text += chunk;
	});
	
	res.on("end", () => {
		var nrkMatches = text.match(nrkPattern);
		for (var i=0; i<nrkMatches.length; i++) {
			//Fjerner <a href=" (9 char) fra begynnelsen og " fra slutten
			var matchUrl = nrkMatches[i].slice(9, nrkMatches[i].length-1);
			getInfo(matchUrl);
		}
	});
}

module.exports = {newsLinks, scrape};
