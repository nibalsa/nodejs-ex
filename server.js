//  OpenShift sample Node application
var express = require('express'),
    app     = express(),
    morgan  = require('morgan');
    path = require("path");
    ejs = require("ejs");
    bodyParser = require("body-parser");
    methodOverride = require("method-override");
    mongoose = require("mongoose");
    expressValidator = require('express-validator');


Object.assign=require('object-assign')

app.engine('html', require('ejs').renderFile);
app.use(morgan('combined'))

var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
    ip   = process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0',
    mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL,
    mongoURLLabel = "";

if (mongoURL == null && process.env.DATABASE_SERVICE_NAME) {
  var mongoServiceName = process.env.DATABASE_SERVICE_NAME.toUpperCase(),
      mongoHost = process.env[mongoServiceName + '_SERVICE_HOST'],
      mongoPort = process.env[mongoServiceName + '_SERVICE_PORT'],
      mongoDatabase = process.env[mongoServiceName + '_DATABASE'],
      mongoPassword = process.env[mongoServiceName + '_PASSWORD']
      mongoUser = process.env[mongoServiceName + '_USER'];

  if (mongoHost && mongoPort && mongoDatabase) {
    mongoURLLabel = mongoURL = 'mongodb://';
    if (mongoUser && mongoPassword) {
      mongoURL += mongoUser + ':' + mongoPassword + '@';
    }
    // Provide UI label that excludes user id and pw
    mongoURLLabel += mongoHost + ':' + mongoPort + '/' + mongoDatabase;
    mongoURL += mongoHost + ':' +  mongoPort + '/' + mongoDatabase;

  }
}
var db = null,
    dbDetails = new Object();

var initDb = function(callback) {
  if (mongoURL == null) return;

  mongoose.connect(mongoURL, function(err, conn) {
    if (err) {
      callback(err);
      return;
    }

    db = conn;
    dbDetails.databaseName = db.databaseName;
    dbDetails.url = mongoURLLabel;
    dbDetails.type = 'MongoDB';

    console.log('Connected to MongoDB at: %s', mongoURL);
  });
};

app.use(function(req,res,next) {
    res.locals.errors = null;
    next();
});

// From - https://github.com/ctavan/express-validator
app.use(expressValidator({
  errorFormatter: function(param, msg, value) {
      var namespace = param.split('.')
      , root    = namespace.shift()
      , formParam = root;

    while(namespace.length) {
      formParam += '[' + namespace.shift() + ']';
    }
    return {
      param : formParam,
      msg   : msg,
      value : value
    };
  }
}));

app.use(express.static(path.join(__dirname, 'views/assets')));
app.use(express.static(path.join(__dirname, 'views/html')));
app.use(express.static(path.join(__dirname, 'views/js')));
app.use(methodOverride("_method"));
mongoose.promise = global.promise;
app.use(bodyParser.urlencoded({extended:true}));
mongoose.promise = global.promise;

var contactSchema = new mongoose.Schema({
   fName: String,
    email: String,
    phone: Number,
    comment: String
});

var contact = mongoose.model('contact', contactSchema);

app.get('/', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    var col = db.collection('counts');
    // Create a document with request IP and current time of request
    col.insert({ip: req.ip, date: Date.now()});
    col.count(function(err, count){
      if (err) {
        console.log('Error running count. Message:\n'+err);
      }
      res.render('index.html', { pageCountMessage : count, dbInfo: dbDetails });
    });
  } else {
    res.render('index.html', { pageCountMessage : null});
  }
});

//INDEX - displays all the contacts that we have in the DB
app.get("/contacts", function(req,res){
    contact.find({}, function(err, allContacts){
       if(err){
           console.log(err)
       }else {
           res.render(path.join(__dirname + '/views/html/contacts.ejs'),{contacts:allContacts});

       };
    });
});

//CREATE - add new contacts to the DB
app.post("/contacts", function(req, res){
  req.check('email')
    // Every validator method in the validator lib is available as a
    // method in the check() APIs.
    // You can customize per validator messages with .withMessage()
    .isEmail().withMessage('Must be an email')

    // Every sanitizer method in the validator lib is available as well!
    .trim()
    .normalizeEmail();

  // Check Input Field
  req.check('fName', 'First Name is required').notEmpty();
  req.check('phone', 'Phone number is required').notEmpty();
  req.check('comment', 'Comment is required').notEmpty();

  var errors = req.validationErrors();

  if(errors) {
    res.render(path.join(__dirname+'/html/contact-form.ejs'),{
        errors : errors
    });
  } else {
    var fName = req.body.fName;
    var email = req.body.email;
    var phone = req.body.phone;
    var comment = req.body.comment;
    var newContact = {fName:fName,email:email, phone:phone, comment:comment};
    contact.create(newContact, function(err, newlyAdded){
      if(err){
        console.log(err)
      } else {
        res.redirect("/contacts");
      }
    });
  }
});

//FORM - displays a form to make new contact
app.get("/contacts/form", function(req, res){
   res.render(path.join(__dirname + '/views/html/contact-form.ejs'));
});

//SHOW - shows one particular contact
app.get("/contacts/:id", function(req, res){
    contact.findById(req.params.id, function(err, foundContact){
       if(err){
           console.log(err)
       } else {
           res.render(path.join(__dirname + '/views/html/show.ejs'), {contact: foundContact});

       }
    });
});


//EDIT - the info we had
app.get("/contacts/:id/edit", function(req, res){
   contact.findById(req.params.id, function(err, foundContact){
      if(err){
          res.redirect("/contacts");
      } else {
          res.render(path.join(__dirname + '/views/html/edit.ejs'), {contact: foundContact});
      }
});


});

//UPDATE - the info we just edited
app.put("/contacts/:id", function(req, res){
   contact.findByIdAndUpdate(req.params.id, req.body.contact, function(err, updatedContact){
       if(err){
           res.redirect("/contacts");
       } else {
           res.redirect("/contacts/" + req.params.id);
       }
   });
});

//DELETE - a contact from the list
app.delete("/contacts/:id", function(req, res){
   contact.findByIdAndRemove(req.params.id, function(err){
      if(err){
          res.redirect("/contacts");
      } else {
          res.redirect("/contacts");
      }
   });

});

app.get('/pagecount', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    db.collection('counts').count(function(err, count ){
      res.send('{ pageCount: ' + count + '}');
    });
  } else {
    res.send('{ pageCount: -1 }');
  }
});


// error handling
app.use(function(err, req, res, next){
  console.error(err.stack);
  res.status(500).send('Something bad happened!');
});

initDb(function(err){
  console.log('Error connecting to Mongo. Message:\n'+err);
});

app.listen(port, ip);
console.log('Server running on http://%s:%s', ip, port);

module.exports = app ;
