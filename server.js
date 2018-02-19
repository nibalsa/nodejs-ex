//  OpenShift sample Node application
var express = require('express'),
    app     = express(),
    morgan  = require('morgan');
    path = require("path");
    ejs = require("ejs");
    bodyParser = require("body-parser");
    methodOverride = require("method-override");


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

  var mongodb = require('mongodb');
  if (mongodb == null) return;

  mongodb.connect(mongoURL, function(err, conn) {
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

app.use(express.static(path.join(__dirname, 'assets')));
app.use(express.static(path.join(__dirname, 'html')));
app.use(express.static(path.join(__dirname, 'js')));
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

var contact = mongoose.model("contact", contactSchema);

//ROUTES GOES HERE !!!//

//ROOTS ROUTE - home page
app.get("/", function(req, res){
res.sendFile(path.join(__dirname+'/index.html'));
});



//INDEX - displays all the contacts that we have in the DB
app.get("/contacts", function(req,res){
    contact.find({}, function(err, allContacts){
       if(err){
           console.log(err)
       }else {
           res.render(path.join(__dirname+'/html/contacts.ejs'),{contacts:allContacts});

       };
    });
});

//CREATE - add new contacts to the DB
app.post("/contacts", function(req, res){
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



});


//FORM - displays a form to make new contact
app.get("/contacts/form", function(req, res){
   res.render(path.join(__dirname+'/html/contact-form.ejs'));
});

//SHOW - shows one particular contact
app.get("/contacts/:id", function(req, res){
    contact.findById(req.params.id, function(err, foundContact){
       if(err){
           console.log(err)
       } else {
           res.render(path.join(__dirname+'/html/show.ejs'), {contact: foundContact});

       }
    });
});


//EDIT - the info we had
app.get("/contacts/:id/edit", function(req, res){
   contact.findById(req.params.id, function(err, foundContact){
      if(err){
          res.redirect("/contacts");
      } else {
          res.render(path.join(__dirname+'/html/edit.ejs'), {contact: foundContact});
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
