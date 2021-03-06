console.log("server side JS is working");

//requirements
var express = require('express');
var app=express();
var path=require('path');
var bodyParser= require('body-parser');
var mongoose = require('mongoose');
var request = require('request');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);


//load secrets
require('dotenv').load();

//configuration
app.set('view engine', 'ejs');
app.use('/static', express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));

//set sessions to save to database to preserve login on refresh 
app.use(session({
	saveUninitialized: true,
	resave: true,
	secret:'SuperSecreteCookie',
	store: new MongoStore({mongooseConnection: mongoose.connection}),
	//session expiration in 2 days
	ttl: 2 * 24 * 60 * 60,
	//cookie: {maxAge: 6000000}
}));

var db = require('./models/index.js');
request.debug=true;

//api
var requestOptions={};
//set api access variables
var partnerId=process.env.partnerId;
var key=process.env.key;


//connection to glassdoor api 
var glassDoorUrl = 'http://api.glassdoor.com/api/api.htm?v=1'+ //address to glassdors API
'&format=json'+ //format is JSON 
'&t.p=' + partnerId + //Partner ID used for access to glassdoor
'&t.k='+ key +// key used for access to glassdoor
'&action=employers'+//looking at employers
'&q='+  //query  filled in by user, set variable here
'&userip='+ // leave blank for now
'&useragent=Mozilla/%2F4.0';


//pull data in from api
var JSONbody = '';
var queryInput='';
app.post('/searches', function (req, res){
	console.log(req.body);
	queryInput= req.body.queryInput;
	var queryStringObj = {
		q: req.body.queryInput,
		api_key: process.env.key
	};
	var requestOptions = {
		url: glassDoorUrl,
		methood:'GET',
		qs:queryStringObj
	};
	request.get(requestOptions, function (error, apiResponse, body){
		JSONbody = JSON.parse(body);
		console.log(JSONbody);
		res.redirect('/results');
	
	});
	
});

//set rout for results page
app.get('/results', function (req, res){
	db.User.findOne({_id: req.session.userId}, function(err, user){
		console.log(user);
		if(err) console.log(err);
	// searches.find({searches: searches}, function(err, searches){
	// 		if (err) console.log(err);	
	res.render('results', {JSONbody: JSONbody, queryInput:queryInput});
	});
	// });
});





//set up where to render home page
app.get('/', function(req, res){
	res.render('index');
});

//set up where to render company create form
app.get('/company_create', function(req, res){
	res.render('company_create');
});


//company show route
app.get('/companies/:id', function (req, res){
	//db.Company.find({user:req.session.userId}, function(err, company){
	db.Company.findById(req.params.id, function (err, company){
		console.log(req.params.id);
		res.render('company', {company: company});
	});
});

//set up where to render all business profiles
app.get('/businesses', function(req, res){
	db.Company.find({user:req.session.userId}, function(err, companies){
		if (err) console.log(err);
		res.render('businesses', {companies: companies});
	});
});

//set up where to render signup form
app.get('/signup', function(req, res){
	res.render('signup');
});

//set up where to render users form
app.get('/users', function (req, res){
	res.render('users');
});

//set up where profiles render to
app.get('/profile', function (req, res){
	db.User.findOne({_id: req.session.userId}, function(err, user){
		console.log(user);
		if(err) console.log(err);
		db.Company.find({user: req.session.userId}, function(err, companies){
			if (err) console.log(err);	
			res.render('profile', {user: user, companies: companies});
		});
	});
});

//set up current user rout
app.get('/currentUser', function (req, res){
	res.json({user: req.session.user});
});

//login rout
app.get('/login', function (req, res){
	res.render('login');
});

//logout rout
app.get('/logout', function (req, res){
	req.session.userId =null;
	req.session.user = null;
	res.json({msg: "user has been logged out"});
});


//ability to delete company profiles
app.delete('/companies/:_id', function(req, res){
	console.log ("the entire " + req.params._id + " has been seclected to be delted");
	db.Company.find({
		_id: req.params._id
	})
	.remove(function(err, company){
		console.log("company deleted");
		res.json("That company is gone");
	});
});


//create post rout for new company added by user
app.post('/companies', function(req, res){
	req.body.user = req.session.user._id;
	db.Company.create(req.body, function(err, company){
		if (err){
			console.log(err);
		}
	res.json(company);
	});
});

//create a post rout for new users
app.post('/users', function (req, res) {
	//db.User.create(req.body, function(err, user){
	var user = req.body;
	console.log(user);
	db.User.createSecure(user.name, user.email, user.password, function(err, user){
		// if(err){
		// 	console.log(err);
		// }
	req.session.userId = user._id;
	req.session.user = user;
	res.json({users:users, msg: 'user created'});
	});
		
});

//crate a post rout for login
app.post('/login', function (req, res){
	var user = req.body;
	db.User.authenticate(user.email, user.password, function (err, user){
		if (err){
			console.log("there was an error:" + err);
		}else{
		req.session.userId= user._id;
		req.session.user= user;
		console.log(user);
		res.json(user);
	}
	});
});

//create a rout to change company profile information
app.put('/companies/:id', function(req, res){
	//req.body.user = req.session.user._id;
	console.log(req.body);
	db.Company.findOneAndUpdate({_id: req.params.id}, req.body, function (err, company){
		if (err){
			console.log(err);
		}
		res.send(company);
	});
});


//set preview on localy first
// app.listen(3000, function(){
// 	console.log("listening on port 3000");
// });

app.listen(process.env.PORT || 3000);

