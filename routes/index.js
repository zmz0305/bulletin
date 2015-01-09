var express = require('express');
var app = require('../app');
var router = express.Router();
var _ = require('underscore');

/* GET home page. */
// router.get('/', function(req, res) {
//   res.render('index', { title: 'Express' });
// });

//POST method to create a chat message


router.post("/test", function(req, res){
	res.send("aaaa");
});


module.exports = router;
