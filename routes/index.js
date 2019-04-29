var express = require('express');
var router = express.Router();
var scraper = require("../scraper/scraper");

var news = scraper.newsLinks;

/* GET home page. */
router.get('/', function(req, res, next) {
	if (news.length < 1) {
		scraper.scrape();

	}

	res.render('index', {news_list: news});
});

module.exports = router;
