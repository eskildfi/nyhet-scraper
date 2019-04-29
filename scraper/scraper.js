const https = require("https");
const http = require("http");
const fs = require("fs");

var newsLinks = [];

var nrkPattern;
var vgPattern = /<div class=\"article-content\">\n.*?<a href=\"(.+?)\"/g;

function readPatterns() {
	var nrkUrls = "";
	var urls = fs.readFileSync("./scraper/urls.txt", "utf-8");
	urls = urls.split(/\r?\n/);
	for (var i=0; i<urls.length; i++) {
		if (urls[i].match(/(.*)nrk\.no\/(.*)/)) {
			urls[i].replace(/\//g, "\/");
			nrkUrls += "<a href=\"" + urls[i] + "(.+?)\"|";
		}
	}
	nrkUrls = nrkUrls.slice(0, nrkUrls.length-1);
	nrkPattern = new RegExp(nrkUrls, "g");
}

function scrape(callback) {
	if (nrkPattern === undefined) readPatterns();
	/*https.get("https://www.nrk.no/", res => {
		parseNrk(res);
	});*/
	https.get("https://www.vg.no/", res => {
		parseVG(res);
	});
	if (callback != undefined) callback(newsLinks);
}

function getInfoVg(url) {
	if (url.match(/https:\/\/www.vgtv\.no\/.*/)) {
		return;
	}
	var client = http;
	if (url.match(/https.*/)) client = https;
	client.get(url, res => {
		var text = "";

		res.on("data", chunk => {
			text += chunk;
		});

		res.on("end", () => {
			var titleReg = /<title>(.*?)<\/title>/;
			if (url.match(/https:\/\/www.vg.no.*/)) {
				//Matcher ikke alltid selv om umatchede sider har mønsteret???
				titleReg = /<title data-react-helmet=\".*\">(.+)<\/title>|data-test-tag=\"headline\">(.+)</;
			}
			else if (url.match(/https:\/\/www\.minmote.no.*/)) {
				titleReg = /<h1>(.+?)<\/h1>|<h1 class=\"article-title\">(.+?)<\/h1>/;
			}
			else if (url.match(/https:\/\/familieklubben.no.*|https:\/\/www.tek.no.*/)) {
				titleReg = /<meta property=\"og:title\" content=\"(.+?)\"/;
			}
			else if (url.match(/https:\/\/www.dinepenger.no.*|https:\/\/e24.no.*/)) {
				titleReg = /<meta name=\"title\" content=\"(.+?)\"/;
			}
			else if (url.match(/https:\/\/www.godt.no.*/)) {
				titleReg = /\"title\":\"(.+?)\"/;
			}

			var matches = text.match(titleReg);
			var title = "Title not found " + url;
			if (matches != null) {
				var title = matches[1].replace(/&aelig;/g, 'æ').replace(/&oslash;/g, 'ø').replace(/&aring;/g, 'å');
				title = "VG - " + title;
			}
			console.log(title);


		})
	});
}

function getInfoNrk(url) {
	https.get(url, res => {
		var text = "";

		res.on("data", chunk => {
			text += chunk;
		});

		res.on("end", () => {
			var reg = /<meta property=\"og:title\" content=\"(.+)\" \/>/;
			var matches = text.match(reg);
			var title = "No title found";
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
			newsLinks.sort(function (a,b) {
				if (a.date>b.date) return -1;
				if (b.date>a.date) return 1;
				return 0;
			});
		});
	});
}

function parseVG(res) {
	var text = "";

	res.on("data", chunk => {
		text += chunk;
	})

	res.on("end", () => {
		var m;
		while (m = vgPattern.exec(text)) {
			getInfoVg(m[1]);
		}
	})
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
			getInfoNrk(matchUrl);
		}
	});
}

module.exports = {newsLinks, scrape};
