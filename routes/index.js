var express = require('express');
var router = express.Router();
var scraper = require("../scraper/scraper");

var news = scraper.newsLinks;

/* GET home page. */
router.get('/', function(req, res, next) {
	if (news.length < 1) {
		scraper.scrape();
		news.sort(function(a, b) {
			return a.date-getTime() - b.date-getTime();
		});
	}

	res.render('index', {news_list: news});
});

module.exports = router;
